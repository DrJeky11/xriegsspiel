import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initialState, evaluate, applyAction, routes, costOf, MAP, DEPOT, isEnded } from '../src/game.ts';
import type { Action, State } from '../src/game.ts';
import { createSession } from '../server/session.ts';

test('routes obey terrain costs, adjacency, occupancy, and budget', () => {
  const state = initialState();
  for (const unit of state.units) for (const [destination, route] of routes(state, unit.id)) {
    assert.equal(route.cost, route.path.slice(1).reduce((sum, id) => sum + costOf(id), 0));
    assert.ok(route.cost <= unit.ap);
    assert.equal(route.path.at(-1), destination);
    for (let i = 1; i < route.path.length; i++) {
      const a = MAP[route.path[i - 1]], b = MAP[route.path[i]];
      assert.equal(Math.abs(a.x - b.x) + Math.abs(a.z - b.z), 1);
      assert.ok(!state.units.some(other => other.id !== unit.id && other.cell === b.id));
    }
  }
  assert.equal(evaluate(state, { type: 'move', unitId: 'atlas', to: 0 }).allowed, false);
  assert.equal(evaluate(state, { type: 'move', unitId: 'atlas', to: 29 }).allowed, false);
});
test('a preview does not mutate state; spending the last point prevents delivery', () => {
  const state = initialState(); state.units[0].ap = 3;
  const before = structuredClone(state);
  const [to, route] = [...routes(state, 'atlas')].find(([, r]) => r.cost === 3)!;
  assert.match(evaluate(state, { type: 'move', unitId: 'atlas', to }).reason, /No points remain/);
  assert.deepEqual(state, before);
  const next = applyAction(state, { type: 'move', unitId: 'atlas', to });
  assert.equal(next.units[0].ap, 3 - route.cost);
  assert.equal(evaluate(next, { type: 'deliver', unitId: 'atlas' }).allowed, false);
});
const supply = (state: State) => state.depot + state.units.reduce((n, u) => n + u.cargo, 0) + state.objectives.reduce((n, o) => n + o.received, 0);
test('delivery and loading conserve supply and respect capacity and location', () => {
  let state = initialState();
  assert.equal(evaluate(state, { type: 'deliver', unitId: 'atlas' }).allowed, false);
  assert.equal(evaluate(state, { type: 'load', unitId: 'atlas' }).allowed, false);
  state.units[0].cell = state.objectives[0].cell;
  state = applyAction(state, { type: 'deliver', unitId: 'atlas' });
  assert.equal(state.objectives[0].received, 2); assert.equal(state.units[0].cargo, 0); assert.equal(supply(state), 8);
  state.units[0].cell = DEPOT;
  state = applyAction(state, { type: 'load', unitId: 'atlas' });
  assert.equal(state.depot, 0); assert.equal(state.units[0].cargo, 2); assert.equal(supply(state), 8);
});
test('round boundary refreshes movement, preserves cargo, and ends after five rounds', () => {
  let state = initialState(); state.units[0].ap = 0;
  state = applyAction(state, { type: 'advance' }); assert.equal(state.units[0].ap, 4); assert.equal(supply(state), 8);
  for (let i = 0; i < 4; i++) state = applyAction(state, { type: 'advance' });
  assert.ok(isEnded(state)); assert.equal(evaluate(state, { type: 'advance' }).allowed, false);
  assert.ok(!isEnded(applyAction(state, { type: 'reset' })));
});
test('shared authority rejects stale commands and duplicate IDs with different payloads', () => {
  const session = createSession();
  const command = { id: 'a', revision: 0, action: { type: 'move', unitId: 'atlas', to: 27 } as Action };
  assert.equal(session.submit(command).status, 200);
  const state = session.getState();
  assert.equal(session.submit(command).body.duplicate, true); assert.deepEqual(session.getState(), state);
  assert.equal(session.submit({ ...command, id: 'b' }).status, 409);
  assert.equal(session.submit({ ...command, action: { type: 'advance' } }).status, 409);
  assert.equal(session.submit({ id: 'bad', revision: 1, action: { type: 'teleport' } }).status, 400);
});
test('journal restores accepted state and duplicate protection after restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'xriegsspiel-'));
  try {
    const journal = join(dir, 'session.jsonl'), session = createSession(journal);
    const command = { id: 'saved', revision: 0, action: { type: 'advance' } as Action };
    session.submit(command); const restored = createSession(journal);
    assert.deepEqual(restored.getState(), session.getState()); assert.equal(restored.submit(command).body.duplicate, true);
  } finally { rmSync(dir, { recursive: true }); }
});

test('an attainable five-round plan supplies both outposts using every shared supply', () => {
  let state = initialState();
  const actions: Action[] = [
    { type: 'move', unitId: 'beacon', to: 13 },
    { type: 'move', unitId: 'atlas', to: 32 },
    { type: 'move', unitId: 'cedar', to: 31 },
    { type: 'advance' },
    { type: 'deliver', unitId: 'beacon' },
    { type: 'move', unitId: 'beacon', to: 11 },
    { type: 'move', unitId: 'atlas', to: 34 },
    { type: 'deliver', unitId: 'atlas' },
    { type: 'move', unitId: 'atlas', to: 33 },
    { type: 'move', unitId: 'cedar', to: 13 },
    { type: 'deliver', unitId: 'cedar' },
    { type: 'move', unitId: 'cedar', to: 22 },
    { type: 'advance' },
    { type: 'move', unitId: 'beacon', to: 28 },
    { type: 'load', unitId: 'beacon' },
    { type: 'advance' },
    { type: 'move', unitId: 'beacon', to: 32 },
    { type: 'advance' },
    { type: 'move', unitId: 'beacon', to: 34 },
    { type: 'deliver', unitId: 'beacon' },
  ];
  // Atlas must clear the road before Beacon's final crossing.
  actions.splice(13, 0, { type: 'move', unitId: 'atlas', to: 42 });
  for (const action of actions) {
    assert.ok(evaluate(state, action).allowed, JSON.stringify(action) + ': ' + evaluate(state, action).reason);
    state = applyAction(state, action);
    assert.equal(supply(state), 8);
    assert.ok(state.units.every(u => u.ap >= 0 && u.cargo >= 0 && u.cargo <= u.capacity));
  }
  assert.equal(state.round, 5);
  assert.ok(state.objectives.every(o => o.received === o.need));
  assert.ok(isEnded(state));
  let replay = initialState();
  for (const event of state.events) replay = applyAction(replay, event.action);
  assert.deepEqual(replay, state);
});
