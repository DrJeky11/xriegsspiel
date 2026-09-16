import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, resolveRound, advanceRound, observe, result, legalCandidates, validateOrders } from '../src/opponent/rules.ts';
import { DIFFICULTIES } from '../src/opponent/sector-policy.ts';
import { decide, baseline } from '../src/opponent/policy.ts';
import { library } from '../src/opponent/content.ts';
import { missionKey } from '../src/opponent/types.ts';
import type { Game, Order, Side } from '../src/opponent/types.ts';

const resolve = (game: Game, blue: Order[] = [], red: Order[] = []) => resolveRound(game, { blue, red });
test('all eight scenarios complete, score and replay with policies in both roles', () => {
  for (const s of library.scenarios) {
    let game = createGame(s.id), replay = createGame(s.id);
    while (true) {
      const orders = { blue: baseline(observe(game, 'blue'), 'greedy', game.round), red: decide(observe(game, 'red'), 'standard', game.round).orders };
      game = resolveRound(game, orders); replay = resolveRound(replay, orders);
      assert.deepEqual(game, replay);
      for (const a of game.assets) assert.ok(a.cargo.length <= a.capacity);
      assert.ok(game.pressure >= 0);
      if (game.finished) break;
      game = advanceRound(game); replay = advanceRound(replay);
    }
    assert.notEqual(result(game).outcome, 'incomplete', s.id);
    assert.equal(game.round, s.rounds);
    assert.ok(result(game).scores!.blue.total >= 0);
  }
});
test('start-of-round prerequisites, CP and asset ownership are enforced', () => {
  const game = createGame('SPR-H01');
  assert.throws(() => validateOrders(game, 'red', [{ type: 'move', asset: 'B1', target: 'Approach', subject: 'S1' }]));
  assert.throws(() => validateOrders(game, 'blue', [{ type: 'move', asset: 'B1', target: 'Approach', subject: 'S1' }, { type: 'deliver', asset: 'B1', target: 'S1' }]));
  assert.throws(() => validateOrders(game, 'blue', Array(4).fill({ type: 'hold' })));
  assert.throws(() => validateOrders(game, 'red', [{ type: 'challenge', target: 'invented', effort: 9 }]));
});
test('assurance ties protect; failed predictions spend pressure; persistent cargo caps cannot be reset', () => {
  const move: Order = { type: 'move', asset: 'B1', target: 'Approach', subject: 'S1' };
  const challenge: Order = { type: 'challenge', target: missionKey(move), effort: 2 };
  const assured = resolve(createGame('SPR-H01'), [move, { type: 'assure', target: missionKey(move), effort: 2 }], [challenge]);
  assert.equal(assured.assets[0].sector, 'Approach'); assert.equal(assured.pressure, 4);
  const wasted = resolve(createGame('SPR-H01'), [], [challenge]);
  assert.equal(wasted.pressure, 4); assert.deepEqual(wasted.delays, {});
  let game = createGame('SPR-H01');
  for (let i = 0; i < 2; i++) game = advanceRound(resolve(game, [move], [challenge]));
  assert.equal(game.delays.S1, 2); assert.equal(game.delays.S2, 2);
  assert.ok(!legalCandidates(game, 'red').some(c => c.order.type === 'challenge' && c.order.target === missionKey(move)));
  assert.equal(game.assets[0].sector, 'Staging');
});
test('medical movement and delivery cannot be challenged', () => {
  const game = createGame('SPR-F01');
  assert.ok(legalCandidates(game, 'blue').some(c => c.order.type === 'move' && c.order.asset === 'B3'));
  assert.ok(legalCandidates(game, 'red').every(c => c.order.type !== 'challenge' || !c.order.target.includes('B3')));
});
test('no same-round verification or same-round proposal acceptance', () => {
  let game = createGame('SEN-H01');
  game = resolve(game, ['E1', 'E2', 'E3'].map(target => ({ type: 'verify', target })), [{ type: 'propose', target: 'release_after_record' }]);
  assert.equal(game.metrics.case_records, 3); assert.equal(game.metrics.handover, 0);
  game = advanceRound(game);
  assert.ok(legalCandidates(game, 'blue').some(c => c.order.type === 'accept'));
  game = resolve(game, [{ type: 'accept', target: 'release_after_record' }, { type: 'handover' }], [{ type: 'statement' }]);
  assert.equal(game.metrics.released, 1); assert.equal(game.metrics.handover, 1);
});
test('simultaneous rescue credits each group once and applies published custody priority', () => {
  let game = createGame('SEN-F01');
  game = advanceRound(resolve(game, [{ type: 'move', asset: 'B1', target: 'Casualty' }], [{ type: 'move', asset: 'R1', target: 'Casualty' }]));
  game = resolve(game, [{ type: 'rescue', asset: 'B1', target: 'G1' }], [{ type: 'rescue', asset: 'R1', target: 'G1' }]);
  assert.equal(game.metrics.rescued, 1); assert.equal(game.items.find(i => i.id === 'G1')!.location, 'R1');
  assert.deepEqual(game.assets.find(a => a.id === 'B1')!.cargo, []);
});
test('private truth and records do not change opposing observations, guidance or seeded decisions', () => {
  const game = createGame('SEN-H01'), other = structuredClone(game);
  other.reports.blue[0].truth = 'A different secret truth';
  other.reports.blue.find(r => r.id === 'E1')!.verified = 1; other.metrics.case_records = 1;
  assert.deepEqual(observe(game, 'red'), observe(other, 'red'));
  assert.deepEqual(decide(observe(game, 'red'), 'advanced', 42), decide(observe(other, 'red'), 'advanced', 42));
  assert.equal(observe(game, 'blue').reports[0].truth, null);
});
test('all difficulty levels return legal bounded decisions, including either role', () => {
  for (const s of library.scenarios) for (const side of ['blue', 'red'] as Side[]) for (const difficulty of ['novice', 'standard', 'advanced'] as const) {
    const game = createGame(s.id), decision = decide(observe(game, side), difficulty, 42);
    validateOrders(game, side, decision.orders);
    assert.ok(decision.transitions <= DIFFICULTIES[difficulty].transitions);
    assert.deepEqual(decision, decide(observe(game, side), difficulty, 42));
  }
});
test('short-window is an explicit scenario variant with unchanged scoring and pressure', () => {
  let game = createGame('SPR-H01', 'short-window/1');
  assert.equal(game.pressure, createGame('SPR-H01').pressure);
  for (let round = 1; round <= 2; round++) {
    assert.ok(game.assets.filter(a => a.kind === 'transport').every(a => !a.ready));
    assert.ok(!legalCandidates(game, 'blue').some(c => c.asset === 'B1' || c.asset === 'B2'));
    game = advanceRound(resolve(game));
  }
  assert.ok(game.assets.filter(a => a.kind === 'transport').every(a => a.ready));
  assert.equal(observe(game, 'red').variant, 'short-window/1');
  assert.throws(() => createGame('HOR-H01', 'short-window/1'));
});
test('changing the lead cargo cannot evade a challenge to the same movement', () => {
  const move: Order = { type: 'move', asset: 'B1', target: 'Approach', subject: 'S2' };
  const challenge: Order = { type: 'challenge', target: missionKey({ ...move, subject: 'S1' }), effort: 1 };
  const game = resolve(createGame('SPR-H01'), [move], [challenge]);
  assert.equal(game.assets[0].sector, 'Staging');
  assert.deepEqual(game.delays, { S1: 1, S2: 1 });
});
test('Hormuz custody requires consecutive attempted departure delays and welfare counts distinct rounds', () => {
  const leave: Order = { type: 'move', asset: 'T1', target: 'Western Exit' };
  const challenge: Order = { type: 'challenge', target: missionKey(leave), effort: 1 };
  let game = advanceRound(resolve(createGame('HOR-H01'), [{ type: 'move', asset: 'T1', target: 'Gate' }, { type: 'welfare' }], [{ type: 'welfare' }]));
  assert.equal(game.metrics.welfare_checks, 1);
  game = advanceRound(resolve(game, [leave], [challenge]));
  assert.equal(game.custodyStreak, 1);
  const consecutive = resolve(game, [leave], [challenge]);
  assert.equal(consecutive.metrics.detained, 1);
  game = advanceRound(resolve(game, [{ type: 'welfare' }]));
  assert.equal(game.custodyStreak, 0); assert.equal(game.metrics.welfare_checks, 2);
  game = resolve(game, [leave], [challenge]);
  assert.equal(game.metrics.detained, 0); assert.equal(game.custodyStreak, 1);
});
test('exit verification and welfare deadlines use prior-round conditions', () => {
  let game = createGame('HOR-F01');
  game = advanceRound(resolve(game, [{ type: 'move', asset: 'T1', target: 'Approach' }]));
  game = advanceRound(resolve(game, [{ type: 'move', asset: 'T1', target: 'Gate' }]));
  const exit: Order = { type: 'move', asset: 'T1', target: 'Exit' };
  assert.throws(() => resolve(game, [{ type: 'verify', target: 'B-Q1' }, exit]));
  game = advanceRound(resolve(game, [{ type: 'verify', target: 'B-Q1' }]));
  const onTime = resolve(game, [exit, { type: 'welfare', asset: 'B1' }]);
  assert.equal(onTime.metrics.priority_transited, 1); assert.equal(onTime.metrics.welfare_complete, 1);
  game = advanceRound(resolve(game));
  assert.equal(resolve(game, [{ type: 'welfare', asset: 'B1' }]).metrics.welfare_complete, 0);
});
test('stronger planners finish the mandatory Mayday rescue rather than abandoning the last group', () => {
  for (const difficulty of ['standard', 'advanced'] as const) {
    let game = createGame('BAB-F01');
    while (true) {
      game = resolve(game, decide(observe(game, 'blue'), difficulty, game.round + 1009).orders, baseline(observe(game, 'red'), 'greedy', game.round));
      if (game.finished) break;
      game = advanceRound(game);
    }
    assert.equal(game.metrics.rescued_on_time, 2, difficulty);
    const outcome = result(game);
    assert.ok('missionChecks' in outcome); assert.equal(outcome.missionChecks.shared, true);
  }
});
