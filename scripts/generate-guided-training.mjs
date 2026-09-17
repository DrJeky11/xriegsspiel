import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
import { createGeographicGame, observe, resolveRound, advanceRound } from '../src/opponent/rules.ts';
import { baseline, randomGenerator } from '../src/opponent/policy.ts';
import { FEATURES, GUIDE_SCHEMA, LESSONS, guideFeatures, lessonMask } from '../src/sensei/guided-policy.ts';
import { teachingScores, TEACHER_VERSION } from './training/guided-teacher.mjs';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const output = resolve(arg('--output', 'output/guided-policy-v1/data'));
const count = Number(arg('--episodes', '360'));
if (!Number.isSafeInteger(count) || count < 30 || count > 5000) throw new Error('Use 30–5000 episodes.');
mkdirSync(output, {recursive: true});
ensureOpponentTerrain();
const sha = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const sourcePaths = ['scripts/generate-guided-training.mjs', 'scripts/training/guided-teacher.mjs', 'src/sensei/guided-policy.ts',
  'src/opponent/types.ts', 'src/opponent/rules.ts', 'src/opponent/geographic-rules.ts', 'src/opponent/geographic-policy.ts', 'src/opponent/sector-rules.ts',
  'src/opponent/geography.ts', 'src/opponent/content.ts', 'scenarios/maritime-crises.v2.json', 'scenarios/scoring.ts',
  'server/opponent-terrain.ts', 'src/scenario/maps.ts', 'src/scenario/navigation.ts',
  'public/terrain/pacific/regional-land.json', 'public/terrain/pacific/shoal-detail.json', 'public/terrain/pacific/senkaku-detail.json'];
const sourceHashes = Object.fromEntries(sourcePaths.map(path => [path, sha(readFileSync(path, 'utf8'))]));
const started = performance.now(), episodes = [], rows = [];
for (let index = 0; index < count; index++) {
  const seed = 190001 + index * 101, rng = randomGenerator(seed), variant = index % 3 === 0 ? 'short-window/1' : undefined;
  let game = createGeographicGame('SPR-H01', variant);
  const episode = {id: `synthetic-${seed}`, seed, variant: variant ?? 'baseline', initialHash: sha(game), rounds: [], group: '', split: '', finalHash: ''};
  const examples = [];
  const sample = (o, context, number) => {
    const features = guideFeatures(o, context), mask = lessonMask(o, context);
    const teacherScores = teachingScores(features, FEATURES, LESSONS, mask);
    const target = teacherScores.indexOf(Math.max(...teacherScores));
    examples.push({id: `${episode.id}:${o.round}:${o.side}:${context.phase}:${number}`, episodeId: episode.id,
      side: o.side, round: o.round, observationHash: sha(o), context, features, mask, teacherScores, target});
  };
  const seen = () => Array.from({length: Math.floor(rng() * 9)}, () => LESSONS[Math.floor(rng() * LESSONS.length)]);
  while (true) {
    const joint = {};
    for (const side of ['blue', 'red']) {
      const o = observe(game, side);
      // Vary complete legal trajectories; both roles and every prefix stay in one split.
      const kind = rng() < 0.45 ? 'random' : rng() < 0.8 ? 'greedy' : 'cautious';
      joint[side] = baseline(o, kind, seed + game.round * 13 + (side === 'red' ? 7 : 0));
      for (let j = 0; j < 4; j++) {
        const plan = baseline(o, j % 2 ? 'random' : 'greedy', seed + game.round * 97 + j);
        const draft = plan.slice(0, Math.floor(rng() * (plan.length + 1)));
        const moves = o.candidates.filter(c => c.order.type === 'move');
        const preview = j % 2 === 0 && moves.length ? moves[Math.floor(rng() * moves.length)] : undefined;
        sample(o, {phase: 'planning', mode: 'practice', requested: true, briefRead: rng() > 0.18,
          draft, ...(preview ? {previewId: preview.id} : {}), seen: seen()}, j);
      }
    }
    episode.rounds.push(joint);
    game = resolveRound(game, joint);
    for (const side of ['blue', 'red']) for (let j = 0; j < 2; j++) sample(observe(game, side), {
      phase: game.finished ? 'complete' : 'review', mode: 'practice', requested: true, briefRead: rng() > 0.05, draft: [], seen: seen(),
    }, j);
    if (game.finished) break;
    game = advanceRound(game);
  }
  episode.finalHash = sha(game);
  // Same first two joint rounds + initial variant denotes a common replay prefix.
  episode.group = sha({variant: episode.variant, prefix: episode.rounds.slice(0, 2)});
  const bucket = parseInt(episode.group.slice(0, 8), 16) % 100;
  episode.split = bucket < 70 ? 'train' : bucket < 85 ? 'validation' : 'test';
  rows.push(...examples.map(row => ({...row, group: episode.group, split: episode.split})));
  episodes.push(episode);
  if ((index + 1) % 60 === 0) console.log(`Generated ${index + 1}/${count} complete synthetic episodes`);
}
// Exclude exact feature/mask duplicates, including across splits. Train takes precedence.
// The held-out score must not be inflated by recurring initial boards and contexts.
const seenKeys = new Set(), retained = [], dropped = {train: 0, validation: 0, test: 0};
for (const split of ['train', 'validation', 'test']) for (const row of rows.filter(r => r.split === split)) {
  const key = sha({features: row.features, mask: row.mask});
  if (seenKeys.has(key)) { dropped[split]++; continue; }
  seenKeys.add(key); retained.push(row);
}
const dataFiles = {};
for (const split of ['train', 'validation', 'test']) {
  const body = retained.filter(r => r.split === split).map(r => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(`${output}/${split}.jsonl`, body); dataFiles[`${split}.jsonl`] = sha(body);
}
const replay = episodes.map(e => JSON.stringify(e)).join('\n') + '\n';
writeFileSync(`${output}/episodes.jsonl`, replay); dataFiles['episodes.jsonl'] = sha(replay);
const manifest = {
  schema: 'guided-exercise-dataset/1', createdAt: new Date().toISOString(), featureSchema: GUIDE_SCHEMA, features: FEATURES, lessons: LESSONS,
  scenarioId: 'SPR-H01', scenarioVersion: '2.0.0', rulesVersion: 'maritime-geographic-rules/1.0.0',
  source: 'Synthetic episodes only; no live database, participant notes, or human trajectories accessed.',
  teacherVersion: TEACHER_VERSION, labelStatus: 'Authored curriculum proxy; owner/instructor evaluation pending.',
  permission: 'Project-generated synthetic data for local policy training and evaluation.',
  splitMethod: 'SHA-256 of variant + first two joint rounds; both roles and all prefixes stay together. Exact feature/mask duplicates removed across splits, train first.',
  limits: 'Held-out trajectory-prefix groups within two fixed SPR-H01 variants; not unseen-map or human-learning validation. Learner hint histories and briefing flags are synthetic.',
  episodes: episodes.length, groups: new Set(episodes.map(e => e.group)).size, elapsedMs: Math.round(performance.now() - started),
  rows: Object.fromEntries(['train', 'validation', 'test'].map(split => [split, retained.filter(r => r.split === split).length])), duplicatesExcluded: dropped,
  classCounts: Object.fromEntries(['train', 'validation', 'test'].map(split => [split, Object.fromEntries(LESSONS.map((id, i) => [id, retained.filter(r => r.split === split && r.target === i).length]))])),
  sourceHashes, dataFiles, runtime: {node: process.version, platform: process.platform, arch: process.arch},
};
writeFileSync(`${output}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({output, ...manifest.rows, groups: manifest.groups, duplicatesExcluded: dropped, elapsedMs: manifest.elapsedMs}, null, 2));
