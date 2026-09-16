/** Read-only research probe: real rules, in-memory fixtures, no live session or learning. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpus, totalmem } from 'node:os';
import { performance } from 'node:perf_hooks';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { loadGeographicRules, createScenarioSession } from '../server/scenario-session.ts';
import { neighbors } from '../src/pacific/terrain.ts';

const rules = loadGeographicRules();
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const round = value => Math.round(value * 1000) / 1000;

// Full-information enumeration for this probe only. This is NOT a role projection.
// Excludes setup/advance and redundant zero-budget holds, which remain legal in the engine.
function candidates(state, force) {
  const actions = [], map = rules.map(state.manifest.mapId);
  const tiles = new Map(map.cells.map(c => [c.id, c]));
  const own = state.pieces.filter(p => p.force === force);
  for (const piece of own) {
    for (const [tileId] of rules.reachable(state, piece.id)) {
      if (tileId !== piece.tileId) actions.push({ type: 'move', pieceId: piece.id, tileId });
    }
    if (piece.movement > 0) actions.push({ type: 'hold', pieceId: piece.id });
    if (piece.carrierId) {
      const carrier = own.find(p => p.id === piece.carrierId), tile = tiles.get(carrier?.tileId);
      if (tile) for (const destination of [tile, ...neighbors(map, tile)]) {
        const action = { type: 'unload', pieceId: piece.id, tileId: destination.id };
        if (rules.evaluate(state, action).allowed) actions.push(action);
      }
    } else {
      for (const carrier of own) {
        const action = { type: 'load', pieceId: piece.id, carrierId: carrier.id };
        if (rules.evaluate(state, action).allowed) actions.push(action);
      }
    }
  }
  return actions;
}

function measure(work, repeats) {
  for (let i = 0; i < 3; i++) work(i); // Warm the same code path; excluded from samples.
  const ms = [];
  for (let i = 0; i < repeats; i++) {
    const start = performance.now(); work(i); ms.push(performance.now() - start);
  }
  ms.sort((a, b) => a - b);
  return { samples: repeats, medianMs: round(ms[Math.floor(repeats / 2)]),
    p95Ms: round(ms[Math.ceil(repeats * .95) - 1]),
    meanMs: round(ms.reduce((a, b) => a + b, 0) / repeats) };
}

const maps = [];
for (const map of rules.maps.values()) {
  const state = rules.create({ mapId: map.id, year: 2026, demo: true });
  const before = hash(state), sides = {};
  for (const force of ['red', 'blue']) {
    const actions = candidates(state, force);
    for (const action of actions) {
      assert.equal(rules.evaluate(state, action).allowed, true, JSON.stringify(action));
      assert.equal(state.pieces.find(p => p.id === action.pieceId).force, force);
    }
    sides[force] = { pieces: state.pieces.filter(p => p.force === force).length,
      candidates: actions.length,
      byType: Object.fromEntries(['move', 'load', 'unload', 'hold'].map(type =>
        [type, actions.filter(a => a.type === type).length])) };
  }
  assert.equal(hash(state), before);
  assert.deepEqual(rules.import(rules.export(state)), state);
  maps.push({ id: map.id, tiles: map.cells.length, sides });
}

const initial = rules.create(), originalHash = hash(initial);
const actions = candidates(initial, 'red');
const moves = actions.filter(a => a.type === 'move');
assert.ok(moves.length > 0);
// Deterministic evenly spaced root moves; these are independent one-step branches, not games.
const sampleMoves = Array.from({ length: Math.min(24, moves.length) }, (_, i) =>
  moves[Math.floor(i * moves.length / Math.min(24, moves.length))]);
const timings = [{ history: initial.events.length, state: initial }];
let longer = initial;
for (let i = 0; i < 128; i++) longer = rules.apply(longer, { type: 'advance' });
timings.push({ history: longer.events.length, state: longer });
const performanceSamples = timings.map(({ history, state }) => ({
  historyEvents: history,
  enumerateRed: measure(() => candidates(state, 'red'), 20),
  applyOneMoveIncludingValidationAndHistoryCopy: measure(i => {
    const next = rules.apply(state, sampleMoves[i % sampleMoves.length]);
    assert.equal(next.revision, state.revision + 1);
  }, 48),
}));
assert.equal(hash(initial), originalHash);

// Exercise a transport chain and current command semantics through the actual session handler.
const session = createScenarioSession(rules); // No journal path: never reads/writes data/.
const decisions = [];
const commit = action => {
  const state = session.getState();
  const command = { id: `probe-${decisions.length}`, revision: state.revision,
    operation: { type: 'action', action } };
  const result = session.submit(command);
  assert.equal(result.status, 200);
  assert.equal(session.submit(command).body.duplicate, true);
  assert.equal(session.submit({ ...command, id: command.id + '-stale' }).status, 409);
  decisions.push(command);
};
const load = actions.find(a => a.type === 'load');
assert.ok(load, 'Default Red demonstration should support loading.');
commit(load);
commit({ type: 'advance' }); // Privileged runner operation in a future competitive session.
const unload = candidates(session.getState().exercise, 'red').find(a => a.type === 'unload');
assert.ok(unload, 'Loaded Red piece should be unloadable at its starting shore.');
commit(unload);
const move = candidates(session.getState().exercise, 'red').find(a => a.type === 'move');
assert.ok(move); commit(move);
// This intentional acceptance records the MISSING actor/side authorization, not a passing boundary.
commit({ type: 'hold', pieceId: 'B-03' });
const final = session.getState().exercise;
assert.deepEqual(rules.import(rules.export(final)), final);
assert.deepEqual(final.pieces.map(p => p.id).sort(), initial.pieces.map(p => p.id).sort());

console.log(JSON.stringify({
  schema: 'xriegsspiel-opponent-probe/1', measuredAt: new Date().toISOString(),
  baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  probeSha256: createHash('sha256').update(readFileSync(new URL(import.meta.url))).digest('hex'),
  host: { node: process.version, platform: process.platform, arch: process.arch,
    cpu: cpus()[0]?.model ?? 'unknown', logicalCpus: cpus().length, memoryGiB: totalmem() / 2 ** 30 },
  manifest: initial.manifest, maps, performanceSamples,
  smoke: { acceptedCommands: decisions.length, duplicateAndStaleChecks: true,
    transportAndIdentityChecks: true, exactReplay: true,
    acceptsBlueCommandWithoutActor: true, initialHash: originalHash, finalHash: hash(final), decisions },
  limits: ['Full-information small demonstrations only; no competitive objective, agent or training.',
    'Counts omit setup, advance and redundant zero-budget holds; not complete game-tree sizes.',
    'Timing is a warm single-process microbenchmark, not episode throughput or a Quest/network test.',
    'No disk journal, policy inference, observation filter, 200-piece workload or concurrent users measured.'],
}, null, 2));
