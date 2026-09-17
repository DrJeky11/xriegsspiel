import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
import { createGeographicGame as create, observe, resolveRound, advanceRound } from '../src/opponent/rules.ts';
import { baseline } from '../src/opponent/policy.ts';
import { chooseHint, guideFeatures, lessonMask, supportsGuide, validModel, LESSONS } from '../src/sensei/guided-policy.ts';
import type { GuideContext } from '../src/sensei/guided-policy.ts';
import { guidedModel, guidedHint } from '../src/sensei/model.ts';

ensureOpponentTerrain();
const context = (extra: Partial<GuideContext> = {}): GuideContext => ({phase:'planning', mode:'practice', requested:true, briefRead:true, draft:[], seen:[], ...extra});

test('portable trained checkpoint matches the recorded training and runtime evaluation artifacts', () => {
  const report = JSON.parse(readFileSync('docs/training/guided-policy-v1-training.json', 'utf8'));
  const evaluation = JSON.parse(readFileSync('docs/training/guided-policy-v1-evaluation.json', 'utf8'));
  const hash = createHash('sha256').update(readFileSync('src/sensei/models/guided-spr-h01.v1.json')).digest('hex');
  assert.ok(validModel(guidedModel)); assert.equal(hash, report.modelSHA256); assert.equal(hash, evaluation.modelSHA256);
  assert.equal(evaluation.testDecisions, evaluation.pythonTypeScriptPredictionMatches);
  assert.ok(report.test.accuracy > report.test.majorityApplicableBaseline);
  assert.equal(report.humanEvaluationStatus, 'pending');
});

test('hint policy only runs on requested practice in its supported versioned exercise', () => {
  const o=observe(create('SPR-H01'),'blue');
  assert.equal(guidedHint(o,context()).source,'learned');
  assert.equal(guidedHint(o,context({requested:false})).source,'disabled');
  assert.equal(guidedHint(o,context({mode:'assessment'})).hint,null);
  assert.equal(supportsGuide(observe(create('SPR-F01'),'blue')),false);
  const changed=structuredClone(o);changed.scenario.version='99';
  assert.equal(guidedHint(changed,context()).hint,null);
  assert.equal(guidedHint(o,context({draft:[{type:'move',asset:'R1',target:'not-a-hex'}]})).source,'disabled');
});

test('model selection and text are unchanged by opposing secrets and unverified truth', () => {
  const game=create('SPR-H01'), changed=structuredClone(game);
  for(const report of changed.reports.red) {report.truth='OPPONENT PRIVATE TRUTH';report.claim='OPPONENT PRIVATE CLAIM';}
  for(const report of changed.reports.blue.filter(r=>r.verified===null)) report.truth='UNVERIFIED TRUTH';
  changed.events.push({id:'secret',round:1,side:'red',audience:'red',type:'verify',message:'SECRET EVENT',rule:'secret'});
  const a=observe(game,'blue'),b=observe(changed,'blue'),c=context();
  assert.deepEqual(guideFeatures(a,c),guideFeatures(b,c));
  assert.deepEqual(guidedHint(a,c),guidedHint(b,c));
  assert.doesNotMatch(JSON.stringify(guidedHint(b,c)),/PRIVATE|SECRET|UNVERIFIED TRUTH/);
});

test('runtime masks, finite predictions and pure observations hold over complete games in both variants and roles', () => {
  for(const variant of [undefined,'short-window/1'] as const) {
    let game=create('SPR-H01',variant);
    while(true) {
      const joint={blue:baseline(observe(game,'blue'),'greedy',game.round),red:baseline(observe(game,'red'),'random',game.round)};
      for(const phase of ['planning','review'] as const) {
        if(phase==='review')game=resolveRound(game,joint);
        for(const side of ['blue','red'] as const) {
          const o=observe(game,side),before=structuredClone(o), c=context({phase,seen:['mission','sequence'],previewId:o.candidates.find(a=>a.order.type==='move')?.id});
          const decision=guidedHint(o,c),mask=lessonMask(o,c);
          assert.equal(decision.source,'learned');assert.ok(mask[LESSONS.indexOf(decision.hint!.id)]);
          assert.ok(decision.scores.every(s=>Number.isFinite(s.score)));
          assert.deepEqual(o,before);
          for(const id of decision.hint!.eventIds)assert.ok(o.events.some(e=>e.id===id&&(e.audience==='public'||e.audience===side)));
          if(side==='red')assert.notEqual(decision.hint!.id,'delivery');
        }
      }
      if(game.finished)break;game=advanceRound(game);
    }
  }
});

test('corrupt model artifacts fall back to factual rules guidance without issuing an order', () => {
  const o=observe(create('SPR-H01'),'blue');
  for(const damage of ['nan','shape','schema'] as const) {
    const model=structuredClone(guidedModel);
    if(damage==='nan')model.weights.w1[0][0]=NaN;
    if(damage==='shape')model.weights.w2=[];
    if(damage==='schema')model.featureSchema='unknown';
    assert.equal(validModel(model),false);
    const decision=chooseHint(o,context({briefRead:false}),model);
    assert.equal(decision.source,'fallback');assert.equal(decision.hint?.id,'mission');
    assert.equal('orders' in decision,false);
  }
});

test('review samples contain explicit synthetic provenance and evidence rather than hidden state', () => {
  const rows=readFileSync('docs/training/guided-policy-v1-review.jsonl','utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.equal(rows.length,32);
  for(const row of rows) {
    assert.match(row.episodeId,/^synthetic-/);
    for(const event of row.visibleEvents) assert.ok(event.audience==='public'||event.audience===row.side);
    assert.ok(row.hint.ruleRefs.length);assert.equal('trainingPermission' in row,false);
    // Public packet contains neither an opposing commitment nor a referee truth card.
    assert.equal('opponentOrders' in row,false);assert.equal('truth' in row,false);
  }
});
