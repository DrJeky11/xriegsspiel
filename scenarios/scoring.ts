/** Offline referee-ledger scoring only. Does not simulate or authenticate events. */
export type Predicate = { all: Predicate[] } | { any: Predicate[] } | {
  metric: string; op: 'eq' | 'gte' | 'lte'; value?: number; otherMetric?: string;
};
export interface Metric { min: number; max: number; description: string }
export interface ScoreRow { label: string; metric: string; points: number; invert?: boolean; lookup?: number[] }
export interface Scenario {
  id: string; title: string; version: string; type: 'historical' | 'fictional';
  region: string; mapId: string; eventDate: string | null; status: string;
  rulesVersion: string; rounds: number; commandPointsPerSide: number; pressureTokens: number;
  readinessRoster: { blue: number; red: number }; actors: { blue: string; red: string };
  brief: string; sourceIds: string[]; metrics: Record<string, Metric>;
  scorecards: Record<'blue' | 'red', ScoreRow[]>;
  missions: Record<'blue' | 'red', Predicate>;
  sharedRequirement: Predicate | null; constraints: Predicate[];
}
export interface Library { schema: string; version: string; sourceRegister: string; rulesDocument: string; scenarios: Scenario[] }
export interface Ledger {
  schema: string; scenarioId: string; scenarioVersion: string; rulesVersion: string;
  status: 'completed' | 'aborted' | 'pending'; completedRounds: number;
  refereeModified: boolean; metrics?: Record<string, number>; provenance?: string;
}
const sides = ['blue', 'red'] as const;
const maps: Record<string, string[]> = {
  spratlys: ['palawan-spratlys/focus', 'palawan-spratlys/overview'],
  senkakus: ['taiwan-senkaku/focus', 'taiwan-senkaku/overview'],
  hormuz: ['hormuz'], 'bab-al-mandeb': ['bab-al-mandeb'],
};
function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function nonempty(value: unknown): value is string { return typeof value === 'string' && value.trim().length > 0; }

function validatePredicate(p: Predicate, metrics: Record<string, Metric>): void {
  check(record(p), 'Predicate must be an object');
  if ('all' in p || 'any' in p) {
    const key = 'all' in p ? 'all' : 'any';
    check(Object.keys(p).length === 1, 'Compound predicate has extra fields');
    const children = key === 'all' ? (p as { all: Predicate[] }).all : (p as { any: Predicate[] }).any;
    check(Array.isArray(children) && children.length > 0, 'Predicate group must be nonempty');
    children.forEach(child => validatePredicate(child, metrics));
    return;
  }
  check(Object.hasOwn(metrics, p.metric), `Unknown predicate metric ${p.metric}`);
  check(['eq', 'gte', 'lte'].includes(p.op), 'Unknown predicate operator');
  check(Object.keys(p).every(k => ['metric', 'op', 'value', 'otherMetric'].includes(k)), 'Unexpected predicate field');
  check(Object.hasOwn(p, 'value') !== Object.hasOwn(p, 'otherMetric'), 'Predicate needs exactly one comparison value');
  if (p.otherMetric !== undefined) check(Object.hasOwn(metrics, p.otherMetric), 'Unknown comparison metric');
  else {
    const m = metrics[p.metric];
    check(Number.isInteger(p.value) && p.value! >= m.min && p.value! <= m.max, 'Predicate value outside metric bounds');
  }
}

export function matches(p: Predicate, values: Record<string, number>): boolean {
  if ('all' in p) return p.all.every(child => matches(child, values));
  if ('any' in p) return p.any.some(child => matches(child, values));
  const left = values[p.metric], right = p.otherMetric === undefined ? p.value! : values[p.otherMetric];
  return p.op === 'eq' ? left === right : p.op === 'gte' ? left >= right : left <= right;
}

export function validateLibrary(input: unknown): asserts input is Library {
  check(record(input), 'Library must be an object');
  check(input.schema === 'xriegsspiel-maritime-scenarios/1' && input.version === '1.0.0', 'Unsupported library version');
  check(Array.isArray(input.scenarios) && input.scenarios.length === 8, 'Library must contain eight scenarios');
  check(nonempty(input.sourceRegister) && nonempty(input.rulesDocument), 'Missing provenance documents');
  const ids = new Set<string>(), pairs = new Set<string>();
  for (const s of input.scenarios as Scenario[]) {
    check(record(s) && nonempty(s.id) && !ids.has(s.id), 'Missing or duplicate scenario ID');
    ids.add(s.id);
    check(s.version === '1.0.0' && s.rulesVersion === 'maritime-crisis-rules/1.0.0', 'Unsupported scenario/rules version');
    check(nonempty(s.title) && nonempty(s.brief) && s.status === 'authored-unplaytested', 'Missing scenario metadata');
    check(Object.hasOwn(maps, s.region) && maps[s.region].includes(s.mapId), `Invalid map for ${s.id}`);
    check(['historical', 'fictional'].includes(s.type), 'Invalid scenario type');
    const pair = `${s.region}/${s.type}`;
    check(!pairs.has(pair), 'Each region needs one historical and one fictional scenario');
    pairs.add(pair);
    check(s.type === 'fictional' ? s.eventDate === null : typeof s.eventDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.eventDate), 'Invalid event date');
    check(Number.isInteger(s.rounds) && s.rounds > 0 && s.commandPointsPerSide === 3, 'Invalid round configuration');
    check(Number.isInteger(s.pressureTokens) && s.pressureTokens >= 0, 'Invalid pressure allocation');
    check(Array.isArray(s.sourceIds) && s.sourceIds.length > 0 && s.sourceIds.every(id => /^SC\d{2}$/.test(id)), 'Missing source IDs');
    check(record(s.metrics) && record(s.scorecards) && record(s.missions), 'Missing scoring definitions');
    for (const [name, m] of Object.entries(s.metrics)) {
      check(/^[a-z][a-z0-9_]*$/.test(name) && record(m), 'Invalid metric definition');
      check(m.min === 0 && Number.isInteger(m.max) && m.max > 0 && nonempty(m.description), `Invalid metric bounds: ${name}`);
    }
    check(record(s.readinessRoster) && record(s.actors), 'Missing side definitions');
    for (const side of sides) {
      check(nonempty(s.actors[side]), 'Missing actor');
      check(s.metrics[`${side}_critical`]?.max === 1 && s.metrics[`${side}_incidents`]?.max === 4 && s.metrics[`${side}_reports`]?.max === 2, 'Invalid common metric bounds');
      check(s.metrics[`${side}_ready`]?.max === s.readinessRoster[side], 'Readiness denominator mismatch');
      const rows = s.scorecards[side];
      check(Array.isArray(rows) && rows.length > 0, 'Missing score rows');
      const labels = new Set<string>();
      for (const r of rows) {
        check(record(r) && nonempty(r.label) && !labels.has(r.label), 'Invalid or duplicate score label');
        labels.add(r.label);
        check(Object.hasOwn(s.metrics, r.metric), 'Score row uses unknown metric');
        check(Number.isFinite(r.points) && r.points > 0, 'Invalid score weight');
        check(r.invert === undefined || typeof r.invert === 'boolean', 'Invalid inverse flag');
        if (r.lookup !== undefined) {
          check(r.invert === undefined, 'Lookup cannot also invert');
          check(Array.isArray(r.lookup) && r.lookup.length === s.metrics[r.metric].max + 1, 'Lookup must cover every metric value');
          check(r.lookup.every(v => Number.isFinite(v) && v >= 0 && v <= r.points) && Math.max(...r.lookup) === r.points, 'Invalid lookup score bounds');
        }
      }
      check(rows.reduce((n, r) => n + r.points, 0) === 100, `${s.id} ${side} must have 100 maximum points`);
      validatePredicate(s.missions[side], s.metrics);
    }
    if (s.sharedRequirement !== null) validatePredicate(s.sharedRequirement, s.metrics);
    check(Array.isArray(s.constraints), 'Missing consistency constraints');
    s.constraints.forEach(p => validatePredicate(p, s.metrics));
  }
  check(pairs.size === 8, 'Incomplete regional coverage');
}

export function scoreLedger(library: Library, input: unknown) {
  validateLibrary(library);
  check(record(input) && input.schema === 'xriegsspiel-terminal-ledger/1', 'Unsupported ledger schema');
  const ledger = input as unknown as Ledger;
  const s = library.scenarios.find(s => s.id === ledger.scenarioId);
  check(s, 'Unknown scenario');
  check(ledger.scenarioVersion === s.version && ledger.rulesVersion === s.rulesVersion, 'Ledger version mismatch');
  check(['completed', 'aborted', 'pending'].includes(ledger.status), 'Invalid completion status');
  check(typeof ledger.refereeModified === 'boolean', 'Referee intervention status required');
  check(Number.isInteger(ledger.completedRounds) && ledger.completedRounds >= 0 && ledger.completedRounds <= s.rounds, 'Invalid completed-round count');
  const base = { scenarioId: s.id, scenarioVersion: s.version, rulesVersion: s.rulesVersion, refereeModified: ledger.refereeModified };
  if (ledger.status !== 'completed' || ledger.completedRounds !== s.rounds) {
    return { ...base, outcome: 'incomplete', scores: null, reason: 'No terminal score until all rounds and contests are complete.' };
  }
  check(record(ledger.metrics), 'Completed ledger requires metrics');
  const metrics = ledger.metrics;
  check(Object.keys(metrics).length === Object.keys(s.metrics).length && Object.keys(metrics).every(k => Object.hasOwn(s.metrics, k)), 'Unknown or missing ledger metrics');
  for (const [name, bounds] of Object.entries(s.metrics)) {
    const value = metrics[name];
    check(Number.isInteger(value) && value >= bounds.min && value <= bounds.max, `Metric outside integer bounds: ${name}`);
  }
  for (const p of s.constraints) check(matches(p, metrics), `Inconsistent terminal ledger: ${JSON.stringify(p)}`);
  const score = (side: 'blue' | 'red') => {
    const components = s.scorecards[side].map(r => {
      const fraction = metrics[r.metric] / s.metrics[r.metric].max;
      return { label: r.label, metric: r.metric, value: metrics[r.metric], points: r.lookup?.[metrics[r.metric]] ?? r.points * (r.invert ? 1 - fraction : fraction) };
    });
    return { total: Math.round(components.reduce((n, r) => n + r.points, 0) * 100) / 100, components };
  };
  const blue = matches(s.missions.blue, metrics), red = matches(s.missions.red, metrics);
  const shared = s.sharedRequirement === null || matches(s.sharedRequirement, metrics);
  let outcome: string, reason: string;
  if (metrics.blue_critical || metrics.red_critical) {
    outcome = metrics.blue_critical && metrics.red_critical ? 'double_failure' : metrics.blue_critical ? 'red_win' : 'blue_win';
    reason = 'Critical constraint breach takes precedence over mission predicates and score.';
  } else if (!shared) {
    outcome = 'shared_failure'; reason = 'Shared humanitarian requirement unmet.';
  } else {
    outcome = blue && red ? 'joint_success' : blue ? 'blue_win' : red ? 'red_win' : 'contested';
    reason = 'Scenario mission predicates determine outcome; secondary points do not override it.';
  }
  return { ...base, outcome, reason, scores: { blue: score('blue'), red: score('red') }, missionChecks: { blue, red, shared } };
}
