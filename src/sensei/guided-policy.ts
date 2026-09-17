import { batchError, orderCost, orderKey } from '../opponent/types.ts';
import type { Candidate, Observation, Order } from '../opponent/types.ts';

export const GUIDE_SCHEMA = 'guided-exercise-features/1';
export const LESSONS = ['mission', 'sequence', 'preview', 'budget', 'delivery', 'reports', 'results', 'reflection'] as const;
export type Lesson = typeof LESSONS[number];
export interface GuideContext {
  phase: 'planning' | 'review' | 'complete';
  mode: 'practice' | 'assessment';
  requested: boolean;
  briefRead: boolean;
  draft: Order[];
  previewId?: string;
  /** Only hints actually presented in this local teaching session. */
  seen: Lesson[];
}
export const FEATURES = [
  'planning', 'review', 'complete', 'blue', 'round', 'spent', 'draftCount',
  'preview', 'previewWarning', 'draftMoves', 'draftDeliveries', 'draftReports',
  'deliveryAvailable', 'ownSupply', 'delivered', 'unready', 'unverified', 'verified',
  'interrupted', 'deliveredThisRound', 'verifiedThisRound', 'sharedThisRound',
  'briefRead', 'hintsSeen', ...LESSONS.map(id => `seen:${id}`), ...LESSONS.map(id => `last:${id}`),
];
export interface GuideModel {
  schema: 'guided-exercise-mlp/1'; version: string; features: string[]; lessons: string[];
  featureSchema: string; scenarioId: string; scenarioVersion: string; rulesVersion: string;
  weights: { w1: number[][]; b1: number[]; w2: number[][]; b2: number[] };
  provenance: Record<string, unknown>;
}
export interface Hint {
  id: Lesson; title: string; text: string; ruleRefs: string[]; eventIds: string[];
  question: string;
}
export interface GuideDecision {
  hint: Hint | null;
  source: 'learned' | 'fallback' | 'disabled';
  modelVersion: string | null;
  reason: string;
  scores: { lesson: Lesson; score: number }[];
}
const unit = (n: number, scale = 1) => Math.max(0, Math.min(1, n / scale));
const rules = 'maritime-geographic-rules/1.0.0';
export function supportsGuide(o: Observation) {
  return o.schema === 'maritime-observation/1' && o.scenario.id === 'SPR-H01' &&
    o.scenario.version === '2.0.0' && o.scenario.rulesVersion === rules &&
    o.geography?.version === 'maritime-geography/1' && o.geography.mapId === 'palawan-spratlys/focus' &&
    (!o.variant || o.variant === 'short-window/1');
}
function publicEvents(o: Observation, round = o.round) {
  return o.events.filter(e => e.round === round && (e.audience === 'public' || e.audience === o.side));
}
function usable(o: Observation, c: GuideContext, candidate: Candidate) {
  return !batchError([...c.draft, candidate.order]) && !(candidate.order.type === 'move' &&
    c.draft.some(d => d.type === 'move' && d.target === (candidate.order as Extract<Order, {type: 'move'}>).target));
}
export function guideFeatures(o: Observation, c: GuideContext): number[] {
  const preview = o.candidates.find(a => a.id === c.previewId && a.order.type === 'move' && usable(o, c, a));
  const events = publicEvents(o, c.phase === 'planning' ? Math.max(1, o.round - 1) : o.round);
  const own = o.assets.filter(a => a.side === o.side);
  const reports = o.reports;
  return [
    Number(c.phase === 'planning'), Number(c.phase === 'review'), Number(c.phase === 'complete'), Number(o.side === 'blue'), unit(o.round, 6),
    unit(c.draft.reduce((n, d) => n + orderCost(d), 0), 3), unit(c.draft.length, 3), Number(!!preview), Number(!!preview?.warning),
    unit(c.draft.filter(d => d.type === 'move').length, 3), unit(c.draft.filter(d => d.type === 'deliver').length, 3),
    unit(c.draft.filter(d => d.type === 'verify' || d.type === 'share').length, 3),
    Number(o.candidates.some(a => a.order.type === 'deliver' && usable(o, c, a))),
    unit(own.flatMap(a => a.cargo).filter(id => o.items.some(i => i.id === id && i.kind === 'supply')).length, 4),
    unit(o.items.filter(i => i.kind === 'supply' && i.completed !== null).length, 4),
    unit(own.filter(a => !a.ready).length, 3), unit(reports.filter(r => r.verified === null).length, 4),
    unit(reports.filter(r => r.verified !== null).length, 4),
    Number(events.some(e => e.side === o.side && e.type === 'move' && e.message.includes('route interrupted'))),
    Number(events.some(e => e.type === 'deliver')), Number(events.some(e => e.side === o.side && e.type === 'verify')),
    Number(events.some(e => e.side === o.side && e.type === 'share')), Number(c.briefRead), unit(c.seen.length, 8),
    ...LESSONS.map(id => unit(c.seen.filter(x => x === id).length, 3)), ...LESSONS.map(id => Number(c.seen.at(-1) === id)),
  ];
}
/** Applicability is enforced separately from the learned ranking. */
export function lessonMask(o: Observation, c: GuideContext): boolean[] {
  const planning = c.phase === 'planning';
  const preview = planning && o.candidates.some(a => a.id === c.previewId && a.order.type === 'move' && usable(o, c, a));
  return [true, planning, preview, planning, o.side === 'blue' && o.items.some(i => i.kind === 'supply'),
    o.reports.length > 0, !planning && publicEvents(o).length > 0, !planning];
}
/** Text comes from pinned rules and permitted evidence, never generated model prose. */
export function lessonText(id: Lesson, o: Observation, c: GuideContext): Hint {
  const events = publicEvents(o);
  const base = { id, ruleRefs: [rules], eventIds: [] as string[] };
  switch (id) {
    case 'mission': return { ...base, title: 'Keep the objective in view', text: `${o.objectives[o.side]} This exercise has ${o.scenario.rounds} rounds. Map assembly and this AI exercise keep separate saved pieces.`, question: 'How would you describe your objective in one sentence?' };
    case 'sequence': return { ...base, title: 'Draft, seal, then review', text: 'Select an action, add it to your plan, then review and seal. Both sides resolve together. A draft spends nothing until it is committed. Legal previews do not guarantee an uninterrupted outcome.', question: 'Which step commits your orders?' };
    case 'preview': {
      const route = o.candidates.find(a => a.id === c.previewId);
      return { ...base, title: 'A route preview is a draft', text: `This preview has not moved a ship. Add it to the plan before sealing. ${route?.warning ?? 'Movement resolves after both sides commit; occupied hexes can stop a route.'}`, question: 'What still needs to happen before this movement resolves?' };
    }
    case 'budget': {
      const spent = c.draft.reduce((n, d) => n + orderCost(d), 0);
      return { ...base, title: 'Check this round’s action budget', text: `Your draft uses ${spent} of 3 command points and ${c.draft.length} of 3 orders. Each ship acts once per round. Unused command points expire when the round resolves.`, question: 'Do your drafted orders leave the actions you intended to reserve?' };
    }
    case 'delivery': {
      const delivered = o.items.filter(i => i.kind === 'supply' && i.completed !== null).length;
      return { ...base, title: 'Arrival and delivery are separate', text: `${delivered} routine manifests have been delivered. Movement into the marked transfer area and delivering a manifest require separate ship actions in different rounds. Deliver uses 1 command point. Report actions do not deliver cargo.`, question: 'Which recorded action changes the delivered-manifest count?' };
    }
    case 'reports': return { ...base, title: 'Distinguish reports from verified information', text: `Your view contains ${o.reports.length} reports; ${o.reports.filter(r => r.verified !== null).length} are verified. Verify checks a report. Sharing requires prior-round verification and a separate action. Neither action moves ships.`, question: 'Which information is verified, and which remains a claim?' };
    case 'results': {
      const own = events.filter(e => e.side === o.side && e.order).slice(0, 2);
      return { ...base, title: 'Connect an order to its recorded effect', text: own.length ? own.map(e => `${e.id}: ${e.message}`).join(' ') : 'No action effect for your side is recorded in this round’s visible events. Inspect the round summary before attributing an outcome to an order.', eventIds: own.map(e => e.id), ruleRefs: [...new Set(own.length ? own.map(e => e.rule) : [rules])], question: 'What happened compared with what you expected?' };
    }
    case 'reflection': return { ...base, title: 'Reflect before the next attempt', text: 'Revisit one decision using the information available at that time. Separate the outcome from your reasoning. An alternative is an idea to test, not a proven better answer.', question: 'Which assumption would you keep or change, and what evidence supports that choice?' };
  }
}
export function validModel(model: GuideModel): boolean {
  if (!model || model.schema !== 'guided-exercise-mlp/1' || model.featureSchema !== GUIDE_SCHEMA || model.scenarioId !== 'SPR-H01' ||
      model.scenarioVersion !== '2.0.0' || model.rulesVersion !== rules || JSON.stringify(model.features) !== JSON.stringify(FEATURES) ||
      JSON.stringify(model.lessons) !== JSON.stringify(LESSONS) || !model.weights) return false;
  const {w1, b1, w2, b2} = model.weights;
  const vector = (a: unknown, n: number): a is number[] => Array.isArray(a) && a.length === n && a.every(x => typeof x === 'number' && Number.isFinite(x));
  return Array.isArray(b1) && b1.length > 0 && b1.length <= 256 && vector(b1, b1.length) && vector(b2, LESSONS.length) &&
    Array.isArray(w1) && w1.length === FEATURES.length && w1.every(r => vector(r, b1.length)) &&
    Array.isArray(w2) && w2.length === b1.length && w2.every(r => vector(r, LESSONS.length));
}
export function modelScores(features: number[], model: GuideModel): number[] {
  const {w1, b1, w2, b2} = model.weights;
  const hidden = b1.map((bias, j) => Math.tanh(features.reduce((v, x, i) => v + x * w1[i][j], bias)));
  return b2.map((bias, j) => hidden.reduce((v, x, i) => v + x * w2[i][j], bias));
}
export function chooseHint(o: Observation, c: GuideContext, model?: GuideModel): GuideDecision {
  const disabled = (reason: string): GuideDecision => ({hint: null, source: 'disabled', modelVersion: null, reason, scores: []});
  if (!c.requested || c.mode !== 'practice') return disabled('Hints require an explicit request in practice mode.');
  if (!supportsGuide(o)) return disabled('This pilot supports geographic Second Thomas Resupply 2.0.0 only.');
  if (!['planning', 'review', 'complete'].includes(c.phase) || !Array.isArray(c.seen) || c.seen.some(id => !LESSONS.includes(id))) return disabled('Unsupported guidance context.');
  if (batchError(c.draft) || c.draft.some(d => !o.candidates.some(a => a.id === orderKey(d)))) return disabled('Refresh the draft before requesting a hint.');
  const mask = lessonMask(o, c), features = guideFeatures(o, c);
  if (features.some(x => !Number.isFinite(x))) return disabled('Incomplete guidance features.');
  if (!model || !validModel(model)) {
    const id: Lesson = !c.briefRead ? 'mission' : c.phase === 'planning' ? 'sequence' : 'reflection';
    return {hint: lessonText(id, o, c), source: 'fallback', modelVersion: null, reason: 'Model unavailable or incompatible; using a rules-based reminder.', scores: []};
  }
  const scores = modelScores(features, model).map((score, i) => ({lesson: LESSONS[i], score, available: mask[i]})).filter(x => x.available).sort((a, b) => b.score - a.score || LESSONS.indexOf(a.lesson) - LESSONS.indexOf(b.lesson));
  if (!scores.length || scores.some(x => !Number.isFinite(x.score))) return chooseHint(o, c);
  return {hint: lessonText(scores[0].lesson, o, c), source: 'learned', modelVersion: model.version, reason: 'Learned ranking of applicable teaching reminders; text is grounded in rules and visible events. Instructor evaluation pending.', scores: scores.map(({lesson, score}) => ({lesson, score}))};
}
