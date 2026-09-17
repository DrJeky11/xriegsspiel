import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
import { createGeographicGame, observe, resolveRound, advanceRound } from '../src/opponent/rules.ts';
import { FEATURES, LESSONS, chooseHint, guideFeatures, lessonMask, modelScores, validModel } from '../src/sensei/guided-policy.ts';

const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i < 0 ? fallback : process.argv[i + 1]; };
const directory = arg('--data', 'output/guided-policy-v1/data');
const trained = arg('--training', 'output/guided-policy-v1/training');
const output = arg('--output', 'output/guided-policy-v1/evaluation');
mkdirSync(output, {recursive: true}); ensureOpponentTerrain();
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const jsonl = path => readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const sha = data => createHash('sha256').update(typeof data === 'string' ? data : JSON.stringify(data)).digest('hex');
const model = json(`${trained}/model.json`), manifest = json(`${directory}/manifest.json`);
assert.ok(validModel(model));
assert.equal(sha(readFileSync(`${directory}/manifest.json`, 'utf8')), model.provenance.manifestSHA256);
for (const [file, hash] of Object.entries(manifest.dataFiles)) assert.equal(sha(readFileSync(`${directory}/${file}`, 'utf8')), hash);
const test = jsonl(`${directory}/test.jsonl`), predictions = new Map(jsonl(`${trained}/test-predictions.jsonl`).map(r => [r.id, r]));
const episodes = jsonl(`${directory}/episodes.jsonl`), rowsByEpisode = new Map();
for (const row of test) { const rows = rowsByEpisode.get(row.episodeId) ?? []; rows.push(row); rowsByEpisode.set(row.episodeId, rows); }
let replayed = 0, evaluated = 0, agreed = 0, maxLogitError = 0;
const timings = [], examples = [];
for (const episode of episodes) {
  let game = createGeographicGame('SPR-H01', episode.variant === 'baseline' ? undefined : episode.variant);
  assert.equal(sha(game), episode.initialHash);
  const rows = rowsByEpisode.get(episode.id) ?? [];
  const check = (phase) => {
    for (const side of ['blue', 'red']) {
      const selected = rows.filter(r => r.round === game.round && r.side === side && (phase === 'planning' ? r.context.phase === 'planning' : r.context.phase !== 'planning'));
      if (!selected.length) continue;
      const o = observe(game, side);
      for (const row of selected) {
        assert.equal(sha(o), row.observationHash, `${row.id}: observation replay`);
        assert.deepEqual(guideFeatures(o, row.context), row.features, `${row.id}: features`);
        assert.deepEqual(lessonMask(o, row.context), row.mask, `${row.id}: mask`);
        const before = sha(o), started = performance.now(), decision = chooseHint(o, row.context, model);
        timings.push(performance.now() - started);
        assert.equal(sha(o), before, 'Tutor mutated the observation');
        assert.equal(decision.source, 'learned');
        const prediction = LESSONS.indexOf(decision.hint.id), python = predictions.get(row.id);
        assert.equal(prediction, python.prediction, 'Python / TypeScript inference mismatch');
        assert.ok(row.mask[prediction]);
        const scores = modelScores(row.features, model);
        for (let i=0;i<LESSONS.length;i++) if (row.mask[i]) maxLogitError=Math.max(maxLogitError,Math.abs(scores[i]-python.logits[i]));
        for (const id of decision.hint.eventIds) assert.ok(o.events.some(e=>e.id===id&&(e.audience==='public'||e.audience===side)));
        evaluated++; if (prediction === row.target) agreed++;
        examples.push({id:row.id, observationHash:row.observationHash, episodeId:episode.id, side, round:game.round,
          phase:row.context.phase, variant:episode.variant, context:row.context, features:Object.fromEntries(FEATURES.map((name,i)=>[name,row.features[i]])),
          hint:decision.hint, predicted:prediction, teacher:row.target, agreement:prediction===row.target,
          margin:decision.scores.length>1?decision.scores[0].score-decision.scores[1].score:null,
          objective:o.objectives[side], visibleEvents:o.events.filter(e=>e.round===game.round&&(e.audience==='public'||e.audience===side))});
      }
    }
  };
  for (const orders of episode.rounds) {
    check('planning'); game=resolveRound(game,orders); check('review');
    if (!game.finished) game=advanceRound(game);
  }
  assert.equal(sha(game),episode.finalHash);replayed++;
}
assert.equal(evaluated,test.length);assert.ok(maxLogitError<1e-8);
timings.sort((a,b)=>a-b);
const report={schema:'guided-policy-runtime-evaluation/1',modelVersion:model.version,modelSHA256:sha(readFileSync(`${trained}/model.json`,'utf8')),
  evaluatorSHA256:sha(readFileSync(new URL(import.meta.url),'utf8')),replayedEpisodes:replayed,testDecisions:evaluated,teacherAgreement:agreed/evaluated,
  pythonTypeScriptPredictionMatches:evaluated,maxLogitError,latencyMs:{p50:timings[Math.floor(timings.length*.5)],p95:timings[Math.floor(timings.length*.95)],max:timings.at(-1)},
  interpretation:'Synthetic proxy imitation and runtime parity only. Human educational evaluation pending.'};
writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n');
// 4 per predicted lesson, including disagreements and small-margin choices when available.
const review=LESSONS.flatMap((id,i)=>examples.filter(e=>e.predicted===i).sort((a,b)=>Number(a.agreement)-Number(b.agreement)||(a.margin??999)-(b.margin??999)||a.id.localeCompare(b.id)).slice(0,4));
writeFileSync(`${output}/review-examples.jsonl`,review.map(e=>JSON.stringify(e)).join('\n')+'\n');
const md=['# Guided-exercise policy: owner and instructor review','',
  `Model: \`${model.version}\`. ${review.length} selected synthetic examples, including disagreements and close choices. These are not a representative learning study.`, '',
  'Review independently before comparing scores. For each example rate factual accuracy (0–2), contextual usefulness (0–2), and clarity (0–2); mark hidden-information problems separately. Record a preferred topic or wording correction. Do not infer the learner’s thoughts from the synthetic context.', '',
  'The selection policy was trained against authored proxy priorities. Neither evaluator supplied those labels. The model selects a topic; rules and visible events supply the text.', '',
  '## Review form', '',
  ...review.flatMap((e,i)=>[`### ${i+1}. ${e.hint.title}`, '',
    `Evidence ID: \`${e.id}\` · ${e.side} · round ${e.round} · ${e.phase} · ${e.variant}.`, '',
    `**Objective:** ${e.objective}`, '',
    `**Synthetic context:** briefing ${e.context.briefRead?'read':'not yet read'}; ${e.context.draft.length} drafted orders; ${e.context.previewId?'a route preview selected':'no route preview'}; earlier hints: ${e.context.seen.join(', ')||'none'}.`, '',
    `Draft: \`${JSON.stringify(e.context.draft)}\`.`, '',
    `**Selected explanation:** ${e.hint.text}`, '', `**Question:** ${e.hint.question}`, '',
    `Rules: ${e.hint.ruleRefs.map(r=>'`'+r+'`').join(', ')}. Events: ${e.hint.eventIds.join(', ')||'none; this is a rule explanation/reflection prompt'}.`, '',
    'Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __', '',
    'Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __', '',
    '<details><summary>Authored proxy comparison (open after rating)</summary>', '',
    `Proxy topic: **${LESSONS[e.teacher]}**. Learned topic: **${LESSONS[e.predicted]}**. This is agreement with a synthetic label, not an expert score.`, '', '</details>', ''])];
writeFileSync(`${output}/review-packet.md`,md.join('\n')+'\n');
console.log(JSON.stringify({...report,reviewExamples:review.length,output},null,2));
