import { performance } from 'node:perf_hooks';
import { writeFileSync } from 'node:fs';
import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
import { geographicLibrary as library, createGeographicGame as createGame } from '../src/opponent/rules.ts';
ensureOpponentTerrain();
import { advanceRound, observe, resolveRound, result, validateOrders } from '../src/opponent/rules.ts';
import { baseline, decide, POLICY_VERSION } from '../src/opponent/policy.ts';

const arg = name => { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; };
const seeds = Number(arg('--seeds') ?? 4);
if (!Number.isSafeInteger(seeds) || seeds < 1 || seeds > 100) throw new Error('Choose --seeds between 1 and 100.');
const rows = [], latencies = [], started = performance.now();
let decisions = 0;
for (const scenario of library.scenarios) for (const side of ['blue', 'red']) for (const difficulty of ['novice', 'standard', 'advanced']) {
  const row = { scenario: scenario.id, side, difficulty, matches: 0, missionSuccess: 0, jointSuccess: 0, sharedFailure: 0, averageScore: 0, outcomes: {} };
  for (const opponent of ['random', 'greedy', 'cautious', 'deadline']) for (let seed = 1; seed <= seeds; seed++) {
    let game = createGame(scenario.id, process.argv.includes('--short-window') && scenario.id === 'SPR-H01' ? 'short-window/1' : undefined);
    while (true) {
      const input = observe(game, side), t = performance.now();
      const decision = decide(input, difficulty, seed * 1009 + game.round);
      latencies.push(performance.now() - t); decisions++;
      validateOrders(game, side, decision.orders);
      const other = side === 'blue' ? 'red' : 'blue';
      const orders = { [side]: decision.orders, [other]: baseline(observe(game, other), opponent, seed * 2003 + game.round) };
      game = resolveRound(game, orders);
      if (game.finished) break;
      game = advanceRound(game);
    }
    const outcome = result(game); row.matches++; row.outcomes[outcome.outcome] = (row.outcomes[outcome.outcome] || 0) + 1;
    if (outcome.missionChecks?.shared && outcome.missionChecks[side]) row.missionSuccess++;
    if (outcome.outcome === 'joint_success') row.jointSuccess++;
    if (outcome.outcome === 'shared_failure') row.sharedFailure++;
    row.averageScore += outcome.scores[side].total;
  }
  row.averageScore = Number((row.averageScore / row.matches).toFixed(2)); rows.push(row);
}
latencies.sort((a, b) => a - b);
const report = {
  schema: 'xriegsspiel-policy-evaluation/1', policyVersion: POLICY_VERSION, date: new Date().toISOString(), node: process.version,
  protocol: `${seeds} paired policy seeds × four frozen baselines × eight scenarios × both sides × three difficulty levels. ${process.argv.includes('--short-window') ? 'SPR-H01 uses short-window/1; others use baseline.' : 'Baseline geographic scenarios v2 on the existing native water graphs.'} No held-out variant or human-learning claim.`,
  matches: rows.reduce((n, r) => n + r.matches, 0), decisions, elapsedMs: Math.round(performance.now() - started),
  latencyMs: { p50: latencies[Math.floor(latencies.length * .5)], p95: latencies[Math.floor(latencies.length * .95)], max: latencies.at(-1) }, rows,
};
if (arg('--output')) writeFileSync(arg('--output'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
