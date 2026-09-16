import { matches } from '../../scenarios/scoring.ts';
import { batchError, opposite, orderCost, orderKey, missionKey } from './types.ts';
import type { Candidate, Difficulty, Game, Observation, Order, PolicyDecision, Side } from './types.ts';
import { legalCandidates, observe, planningWorld, resolveRound } from './sector-rules.ts';

export const POLICY_VERSION = 'maritime-planner/1.0.0';
export const DIFFICULTIES: Record<Difficulty, { label: string; description: string; plans: number; replies: number; transitions: number; depth: number }> = {
  novice: { label: 'Novice', description: 'Immediate priorities with seeded variation; no forward simulation.', plans: 1, replies: 0, transitions: 0, depth: 0 },
  standard: { label: 'Standard', description: 'Coordinates an entire round against an expected opposing plan.', plans: 24, replies: 1, transitions: 24, depth: 1 },
  advanced: { label: 'Advanced', description: 'Looks up to three rounds ahead against several plausible opposing responses.', plans: 24, replies: 3, transitions: 256, depth: 3 },
};
export function randomGenerator(seed: number) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let x = value; x = Math.imul(x ^ x >>> 15, x | 1); x ^= x + Math.imul(x ^ x >>> 7, x | 61); return ((x ^ x >>> 14) >>> 0) / 4294967296; };
}
function distance(o: Observation, start: string, end: string) {
  const queue: [string, number][] = [[start, 0]], seen = new Set<string>();
  while (queue.length) { const [at, d] = queue.shift()!; if (at === end) return d; if (seen.has(at)) continue; seen.add(at); for (const [a, b] of o.edges) if (a === at) queue.push([b, d + 1]); else if (b === at) queue.push([a, d + 1]); }
  return 20;
}
function exitSector(o: Observation) { return o.sectors[o.scenario.id === 'HOR-F01' ? 3 : 2]; }
function missionProgress(game: Game, side: Side, o: Observation): number {
  const m = game.metrics, id = game.scenarioId, blue = side === 'blue';
  let score = 0;
  if (id.startsWith('SPR')) {
    const count = m.delivered ?? m.routine_delivered;
    score += (blue ? count : 4 - count) * 130;
    for (const a of game.assets.filter(a => a.kind === 'transport')) score += (blue ? 1 : -1) * a.cargo.length * (2 - distance(o, a.sector, 'Outpost')) * 32;
    if (id === 'SPR-F01') {
      score += m.medical_on_time * 240;
      const medical = game.assets.find(a => a.id === 'B3')!;
      if (!m.medical_on_time && blue) score += (2 - distance(o, medical.sector, 'Outpost')) * (game.round >= 4 ? 130 : 75);
    }
  } else if (id === 'SEN-H01') {
    score += blue ? m.case_records * 70 + m.handover * 200 + m.released * 20 : m.released * 300 + m.statement_filed * 100;
    score += game.proposals.filter(p => !p.accepted).length * 12;
  } else if (id === 'SEN-F01') {
    score += m.rescued * 130;
    const coordinate = m.coordination === (blue ? 1 : 2) ? 150 : m.coordination === 3 ? 120 : m.coordination ? 0 : 0;
    score += coordinate;
    for (const a of game.assets.filter(a => a.kind === 'rescue' && a.side === side && a.cargo.length < a.capacity)) score += (2 - distance(o, a.sector, 'Casualty')) * 30;
    score += game.proposals.filter(p => p.side === side && !p.accepted && (p.id === `${side}_lead` || p.id === 'joint_lead')).length * 12;
  } else {
    score += (blue ? m.transited : (id === 'HOR-H01' ? 1 : id === 'HOR-F01' ? 5 : id === 'BAB-H01' ? 2 : 4) - m.transited) * 130;
    for (const a of game.assets.filter(a => a.kind === 'merchant' && a.sector !== 'Exited' && a.sector !== 'Holding custody')) score += (blue ? 1 : -1) * (o.sectors.length - distance(o, a.sector, exitSector(o))) * 28;
    if (id === 'HOR-H01') score += m.welfare_checks * 100 + (blue ? m.on_time * 35 : m.detained * 350 + game.custodyStreak * 55);
    if (id === 'HOR-F01') score += m.welfare_complete * 280 + (blue ? 1 : -1) * m.priority_transited * 60;
    if (id.startsWith('BAB')) {
      const count = m.rescued ?? m.rescued_on_time;
      score += count * 150;
      if (id === 'BAB-H01') score += m.standdown * (blue ? 15 : 120);
      if (id === 'BAB-F01') score += m.aid_transited * (blue ? 50 : -50);
      // Bound approach credit per remaining group, below the value of completing its rescue.
      // Crediting every boat and removing that credit on the final rescue rewarded indefinite waiting.
      if (blue) for (const group of game.items.filter(i => i.kind === 'survivor' && i.completed === null)) {
        const available = game.assets.filter(a => a.kind === 'rescue' && a.cargo.length < a.capacity);
        const nearest = Math.min(4, ...available.map(a => distance(o, a.sector, group.location)));
        score += Math.max(0, 3 - nearest) * 25;
      }
    }
  }
  score += (m[`${side}_reports`] ?? 0) * 8;
  // Test the remaining schedule, not just this round's immediate gain. A last-minute
  // passage must not consume the round in which a rescue boat has to depart.
  const rescueRequirement = id === 'BAB-F01' ? 2 : id === 'BAB-H01' || id === 'SEN-F01' ? 3 : 0;
  if (rescueRequirement) {
    const deadline = id === 'BAB-F01' ? 6 : o.scenario.rounds;
    const completed = game.items.filter(i => i.kind === 'survivor' && i.completed !== null && i.completed <= deadline).length;
    const remaining = game.items.filter(i => i.kind === 'survivor' && i.completed === null);
    if (completed < rescueRequirement) {
      if (!remaining.length) score -= 3000;
      else {
      const slots = game.assets.filter(a => a.kind === 'rescue').flatMap(a => Array.from({ length: a.capacity - a.cargo.length }, (_, i) => game.round + distance(o, a.sector, remaining[0].location) + i + 1)).sort((a, b) => a - b);
      if (slots[rescueRequirement - completed - 1] === undefined || slots[rescueRequirement - completed - 1] > deadline) score -= 3000;
      }
    }
  }
  if (id === 'SPR-F01' && !m.medical_on_time) {
    const a = game.assets.find(a => a.cargo.includes('M1'));
    if (!a || game.round + distance(o, a.sector, 'Outpost') + 1 > 5) score -= 3000;
  }
  if (id === 'HOR-F01' && !m.welfare_complete && game.round >= 4) score -= 3000;
  if (side === 'red') score += game.pressure * Math.max(0, (o.scenario.rounds - game.round) * 2);
  if (game.finished) {
    const shared = !o.scenario.sharedRequirement || matches(o.scenario.sharedRequirement, m);
    if (!shared) score -= 2000;
    else if (matches(o.scenario.missions[side], m)) score += 2000;
    else if (matches(o.scenario.missions[opposite(side)], m)) score -= 1500;
  }
  return score;
}
function actionUtility(o: Observation, candidate: Candidate, style = 0): number {
  const order = candidate.order, id = o.scenario.id;
  switch (order.type) {
    case 'move': {
      const a = o.assets.find(a => a.id === order.asset)!;
      let target = exitSector(o), priority = 40;
      if (a.kind === 'transport') { target = 'Outpost'; priority = 42 + a.cargo.length * 8; if (!a.cargo.length) return -40; }
      if (a.kind === 'rescue') {
        if (a.cargo.includes('M1')) { target = 'Outpost'; priority = 80; }
        else {
          const groups = o.items.filter(i => i.kind === 'survivor' && i.completed === null);
          if (!groups.length || a.cargo.length >= a.capacity) return -30;
          target = groups[0].location; priority = 66;
        }
      }
      return (distance(o, a.sector, target) - distance(o, order.target, target)) * priority + (a.id === 'T1' ? 6 : 0) + (style === 2 ? a.id.charCodeAt(1) % 3 * 5 : 0);
    }
    case 'deliver': return order.target === 'M1' ? 180 : 100;
    case 'rescue': return 140 - Number(order.target.slice(1)) * 0.1;
    case 'transfer': return -8;
    case 'verify': return order.target.startsWith('E') ? 80 : id === 'HOR-F01' && order.target === 'B-Q1' ? 120 : 10;
    case 'share': return 1;
    case 'welfare': return id === 'HOR-F01' ? 150 : id === 'HOR-H01' ? 85 : 1;
    case 'handover': return 140;
    case 'statement': return 100;
    case 'propose': return order.target === 'joint_lead' ? 38 : order.target === `${o.side}_lead` ? 40 : order.target === 'release_after_record' ? 36 : order.target === 'release_now' ? 35 : order.target === 'noninterference' ? 60 : 5;
    case 'accept': return order.target === `${opposite(o.side)}_lead` ? -25 : order.target === 'joint_lead' ? 100 : 90;
    case 'assure': return style === 1 ? 60 * order.effort : 24 * order.effort;
    case 'challenge': {
      const action = JSON.parse(order.target) as Order;
      const mission = 'asset' in action ? o.assets.find(a => a.id === action.asset) : undefined;
      return 24 * order.effort + (action.type === 'deliver' || action.type === 'handover' ? 18 : 0) + (mission?.id === 'T1' ? 8 : 0) + (o.round / o.scenario.rounds) * 14;
    }
    case 'hold': return 0;
  }
}
function planUtility(o: Observation, orders: Order[], style = 0) {
  let value = orders.reduce((n, order) => n + actionUtility(o, { order } as Candidate, style), 0);
  for (const order of orders) if (order.type === 'assure' && !orders.some(other => missionKey(other) === order.target)) value -= 200;
  // Competing for the same rescue group wastes action even though both orders are individually legal.
  return value;
}
function plans(o: Observation, limit: number, style = 0): Order[][] {
  const ranked = o.candidates.filter(c => c.order.type !== 'hold').sort((a, b) => actionUtility(o, b, style) - actionUtility(o, a, style) || a.id.localeCompare(b.id));
  // Retain choices across assets and staff functions, rather than allowing one asset to fill the shortlist.
  const counts = new Map<string, number>();
  const choices = ranked.filter(c => { const key = c.group, n = counts.get(key) ?? 0; if (n >= (key === 'challenge' ? 12 : key === 'assure' ? 10 : 6)) return false; counts.set(key, n + 1); return true; }).slice(0, 30);
  let beam: { orders: Order[]; value: number; next: number }[] = [{ orders: [], value: 0, next: 0 }];
  const all = [...beam];
  for (let depth = 0; depth < 3; depth++) {
    const next: typeof beam = [];
    for (const p of beam) for (let i = p.next; i < choices.length; i++) {
      const orders = [...p.orders, choices[i].order]; if (batchError(orders)) continue;
      next.push({ orders, value: planUtility(o, orders, style), next: i + 1 });
    }
    next.sort((a, b) => b.value - a.value || JSON.stringify(a.orders).localeCompare(JSON.stringify(b.orders)));
    beam = next.slice(0, Math.max(64, limit * 2)); all.push(...beam);
  }
  all.sort((a, b) => b.value - a.value || JSON.stringify(a.orders).localeCompare(JSON.stringify(b.orders)));
  // Always offer conserving pressure/effort as an alternative to immediate spending.
  const result = all.slice(0, Math.max(1, limit - 1)).map(p => p.orders);
  result.push([]); return result;
}
export function baseline(o: Observation, kind: 'hold' | 'random' | 'greedy' | 'cautious' | 'deadline', seed = 1): Order[] {
  if (kind === 'hold') return [];
  if (kind === 'greedy' || kind === 'cautious' || kind === 'deadline') return plans(o, 4, kind === 'cautious' ? 1 : kind === 'deadline' ? 2 : 0)[0];
  const rng = randomGenerator(seed), candidates = o.candidates.map(c => ({ c, rank: rng() })).sort((a, b) => a.rank - b.rank);
  const selected: Order[] = [];
  for (const { c } of candidates) if (!batchError([...selected, c.order])) selected.push(c.order);
  return selected;
}

export function decide(o: Observation, difficulty: Difficulty, seed: number): PolicyDecision {
  if (!Object.hasOwn(DIFFICULTIES, difficulty)) throw new Error('Unknown difficulty.');
  const limits = DIFFICULTIES[difficulty], rng = randomGenerator(seed);
  if (difficulty === 'novice') {
    const candidates = o.candidates.filter(c => c.order.type !== 'hold').map(c => ({ c, value: actionUtility(o, c) + (rng() - 0.5) * 95 })).sort((a, b) => b.value - a.value);
    const orders: Order[] = [];
    for (const { c, value } of candidates) if (value > 0 && !batchError([...orders, c.order])) {
      const action = c.order;
      if (action.type === 'assure' && !orders.some(order => missionKey(order) === action.target)) continue;
      orders.push(c.order);
    }
    return { version: POLICY_VERSION, difficulty, orders, seed, reason: 'Selected immediate mission priorities with seeded variation; did not simulate opposing responses.', considered: candidates.length, transitions: 0, value: planUtility(o, orders), alternatives: [] };
  }
  const world = planningWorld(o), enemy = opposite(o.side);
  // A declared belief about an unseen prerequisite, never the actual private record.
  // Assume an opposing staff may have used earlier rounds to prepare its mission.
  if (o.side === 'red' && o.round > 1 && o.scenario.id === 'HOR-F01') world.reports.blue = [{ id: 'B-Q1', claim: 'Hypothetical prior navigation verification', truth: null, verified: 1, received: 1 }];
  if (o.side === 'red' && o.round > 1 && o.scenario.id === 'SEN-H01') {
    world.reports.blue = ['E1', 'E2', 'E3'].map(id => ({ id, claim: 'Hypothetical prior evidence preservation', truth: null, verified: 1, received: 1 }));
    world.metrics.case_records = 3;
  }
  const enemyView = observe(world, enemy);
  const replies = [baseline(enemyView, 'greedy', seed), baseline(enemyView, 'cautious', seed), baseline(enemyView, 'deadline', seed), baseline(enemyView, 'random', seed + 1)].slice(0, limits.replies);
  // Policy never receives the actual opponent commitment. These are explicit public-state predictions.
  const proposals = plans(o, limits.plans), evaluated: { orders: Order[]; value: number }[] = [];
  let transitions = 0;
  for (const orders of proposals) {
    const values: number[] = [];
    for (const reply of replies) {
      if (transitions >= limits.transitions) break;
      const joint = { blue: o.side === 'blue' ? orders : reply, red: o.side === 'red' ? orders : reply };
      try {
        transitions++; let next = resolveRound(world, joint);
        const immediate = missionProgress(next, o.side, o);
        for (let depth = 1; depth < limits.depth && !next.finished && transitions < limits.transitions; depth++) {
          // Forecast only already observed objects/reports. Do not inject the referee's future cards.
          next = structuredClone(next); next.round++; next.events = [];
          const ownFuture = baseline(observe(next, o.side), 'deadline', seed + depth);
          const enemyFuture = baseline(observe(next, enemy), values.length === 1 ? 'cautious' : 'greedy', seed + depth);
          transitions++; next = resolveRound(next, { blue: o.side === 'blue' ? ownFuture : enemyFuture, red: o.side === 'red' ? ownFuture : enemyFuture });
        }
        // Preserve the feasibility penalty at the current decision even when an imperfect
        // continuation policy fails later. The horizon estimate is an explicit approximation.
        values.push(limits.depth === 1 ? immediate : immediate * .55 + missionProgress(next, o.side, o) * .45);
      } catch { /* A predicted private prerequisite is unknown; never consult the true world to repair it. */ }
    }
    if (values.length) {
      const mean = values.reduce((n, v) => n + v, 0) / values.length;
      const value = mean * (difficulty === 'advanced' ? .7 : 1) + Math.min(...values) * (difficulty === 'advanced' ? .3 : 0) + planUtility(o, orders) * .012;
      evaluated.push({ orders, value });
    }
  }
  evaluated.sort((a, b) => b.value - a.value || JSON.stringify(a.orders).localeCompare(JSON.stringify(b.orders)));
  const best = evaluated[0] ?? { orders: baseline(o, 'greedy', seed), value: 0 };
  return { version: POLICY_VERSION, difficulty, orders: best.orders, seed, reason: `Compared ${evaluated.length} complete plans against ${replies.length} predicted opposing ${replies.length === 1 ? 'plan' : 'plans'}, up to ${limits.depth} rounds ahead. Used only this side’s observation and declared public-state predictions, without future injects or actual opposing orders. Prioritized mission progress and shared obligations.`, considered: evaluated.length, transitions, value: best.value, alternatives: evaluated.slice(1, 4) };
}
