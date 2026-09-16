import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createOpponentSessions, workerPlanner } from '../server/opponent-session.ts';
import { decide } from '../src/opponent/policy.ts';
import type { OpponentOperation } from '../server/opponent-session.ts';
const planner = async (...args: Parameters<typeof decide>) => decide(...args);
test('durable sessions seal AI first, reject impersonation, retry once, resume, complete and export exact replay', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'xriegsspiel-opponent-'));
  try {
    let sessions = createOpponentSessions(dir, planner);
    const created = await sessions.create({ scenarioId: 'SPR-H01', difficulty: 'advanced', humanSide: 'blue', seed: 1 });
    const { playerToken, refereeToken } = created, id = created.state.id;
    let state = created.state, n = 0;
    const command = async (operation: OpponentOperation, token = playerToken) => {
      const c = { id: `c-${++n}`, revision: state.revision, operation };
      const response = await sessions.submit(id, token, c); state = response.state; return c;
    };
    assert.equal(state.sealed.red, true); assert.equal(state.ownOrders, null);
    assert.throws(() => sessions.get(id, 'invalid'));
    assert.equal(sessions.get(id, refereeToken, 'red').observation.side, 'blue');
    await assert.rejects(command({ type: 'orders', side: 'red', orders: [] }));
    await assert.rejects(command({ type: 'takeover', enabled: true }));
    const c = await command({ type: 'orders', side: 'blue', orders: [] });
    assert.equal((await sessions.submit(id, playerToken, c)).duplicate, true);
    assert.equal(state.phase, 'review'); assert.equal(state.result, null); assert.equal(state.review[0].decision, null);
    sessions = createOpponentSessions(dir, planner);
    assert.deepEqual(sessions.get(id, playerToken), state);
    while (String(state.phase) !== 'complete') {
      await command(state.phase === 'review' ? { type: 'next' } : { type: 'orders', side: 'blue', orders: [] });
    }
    const exported = sessions.export(id, playerToken);
    assert.equal(exported.rounds.length, 6); assert.notEqual(exported.result.outcome, 'incomplete');
    assert.ok(!JSON.stringify(exported).includes(playerToken)); assert.ok(!('credentials' in exported));
    sessions = createOpponentSessions(dir, planner); assert.equal(sessions.get(id, playerToken).phase, 'complete');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('contest freezes advancement, replay preserves branch lineage and takeover is explicit', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'xriegsspiel-opponent-'));
  try {
    const sessions = createOpponentSessions(dir, planner), created = await sessions.create({ scenarioId: 'SEN-H01', difficulty: 'standard', humanSide: 'blue' });
    let state = created.state, n = 0;
    const send = async (operation: OpponentOperation, referee = false) => { state = (await sessions.submit(state.id, referee ? created.refereeToken : created.playerToken, { id: `c-${++n}`, revision: state.revision, operation })).state; };
    await send({ type: 'orders', side: 'blue', orders: [] });
    await send({ type: 'contest', eventId: state.observation.events.at(-1)!.id, reason: 'Review this round.' });
    await assert.rejects(send({ type: 'next' }));
    const branch = state.branchId;
    await send({ type: 'ruling', disposition: 'replay', reason: 'Replay with human control of opposition.' }, true);
    assert.equal(state.parent, branch); assert.notEqual(state.branchId, branch); assert.equal(state.observation.round, 1);
    await send({ type: 'takeover', enabled: true }, true);
    assert.equal(state.sealed.red, false); assert.equal(state.refereeModified, true);
    await send({ type: 'orders', side: 'red', orders: [] }, true);
    await send({ type: 'orders', side: 'blue', orders: [] });
    assert.equal(state.phase, 'review');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('real policy worker returns a bounded decision', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'xriegsspiel-opponent-'));
  try {
    const sessions = createOpponentSessions(dir, workerPlanner);
    const created = await sessions.create({ scenarioId: 'SPR-H01', difficulty: 'advanced', humanSide: 'blue' });
    assert.equal(created.state.sealed.red, true);
    assert.equal(created.state.audit.length, 0, 'worker should finish without fallback');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
test('pause, stale commands and invalid AI outputs cannot bypass authoritative planning', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'xriegsspiel-opponent-'));
  try {
    const invalidPlanner: typeof planner = async (...args) => ({ ...decide(...args), orders: [{ type: 'move', asset: 'opposing-secret-unit', target: 'anywhere' }] });
    let sessions = createOpponentSessions(dir, invalidPlanner);
    const created = await sessions.create({ scenarioId: 'SPR-H01', variant: 'short-window/1', difficulty: 'novice', humanSide: 'blue' });
    const id = created.state.id, token = created.playerToken;
    assert.match(created.state.audit[0].message, /fallback/);
    const paused = await sessions.submit(id, token, { id: 'pause', revision: 0, operation: { type: 'pause', paused: true } });
    assert.equal(paused.state.paused, true);
    await assert.rejects(sessions.submit(id, token, { id: 'old', revision: 0, operation: { type: 'orders', side: 'blue', orders: [] } }), /changed/);
    await assert.rejects(sessions.submit(id, token, { id: 'paused', revision: 1, operation: { type: 'orders', side: 'blue', orders: [] } }), /paused/);
    sessions = createOpponentSessions(dir, planner);
    assert.equal(sessions.get(id, token).observation.variant, 'short-window/1');
    assert.equal(sessions.get(id, token).paused, true);
    await sessions.submit(id, token, { id: 'resume', revision: 1, operation: { type: 'pause', paused: false } });
    const competed = await Promise.allSettled(['a', 'b'].map(commandId => sessions.submit(id, token, { id: commandId, revision: 2, operation: { type: 'orders', side: 'blue', orders: [] } })));
    assert.equal(competed.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(sessions.get(id, token).revision, 3);
    assert.throws(() => sessions.export(id, token), /Complete/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
