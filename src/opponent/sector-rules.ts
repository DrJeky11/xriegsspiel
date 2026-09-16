import { library, scenario, specification, reportText } from './content.ts';
import { scoreLedger } from '../../scenarios/scoring.ts';
import type { Ledger } from '../../scenarios/scoring.ts';
import { batchError, opposite, orderCost, orderKey, missionKey, describeOrder as describe } from './types.ts';
import type { Asset, Candidate, Game, Observation, Order, Side } from './types.ts';

export const ENGINE_VERSION = 'maritime-engine/1';
const sides: Side[] = ['blue', 'red'];
function event(game: Game, type: string, message: string, side: Side | null = null, order?: Order, audience: 'public' | Side = 'public') {
  game.events.push({ id: `r${game.round}-e${game.events.length + 1}`, round: game.round, type, message, side, audience, rule: `maritime-crisis-rules/1.0.0:${type}`, ...(order ? { order: structuredClone(order) } : {}) });
}
export function createGame(id: string, variant?: 'short-window/1'): Game {
  if (variant && (variant !== 'short-window/1' || id !== 'SPR-H01')) throw new Error('This training variant is supported only for Second Thomas Resupply.');
  const s = scenario(id), spec = specification(id);
  const game: Game = {
    schema: ENGINE_VERSION, scenarioId: id, scenarioVersion: s.version, rulesVersion: s.rulesVersion, ...(variant ? { variant } : {}),
    round: 1, assets: structuredClone(spec.roster), items: [], pressure: s.pressureTokens, delays: {},
    reports: { blue: [], red: [] }, proposals: [], metrics: Object.fromEntries(Object.keys(s.metrics).map(key => [key, 0])),
    custodyStreak: 0, lastWelfareRound: 0, events: [], finished: false,
  };
  for (const a of game.assets) for (const item of a.cargo) game.items.push({ id: item, kind: item === 'M1' ? 'medical' : 'supply', location: a.id, available: 1, completed: null });
  if (id === 'SEN-F01' || id.startsWith('BAB')) {
    for (let i = 1; i <= (id === 'BAB-F01' ? 2 : 4); i++) game.items.push({ id: `G${i}`, kind: 'survivor', location: id === 'BAB-F01' ? 'Distress' : 'Casualty', available: id === 'BAB-F01' ? 3 : 1, completed: null });
  }
  beginRound(game);
  return game;
}

function beginRound(game: Game) {
  const id = game.scenarioId, round = game.round, spec = specification(id);
  for (const a of game.assets) {
    a.ready = !['Exited', 'Holding custody'].includes(a.sector);
    if (game.variant === 'short-window/1' && a.kind === 'transport' && round < 3) a.ready = false;
    if (id === 'SPR-F01' && a.id === 'B2' && [3, 4].includes(round) || id === 'SEN-F01' && ['B2', 'R2'].includes(a.id) && round === 3 || id === 'HOR-H01' && a.id === 'B1' && round < 3 || id === 'HOR-F01' && a.id === 'B2' && [2, 3].includes(round) || id === 'BAB-H01' && a.id === 'B3' && round === 3) a.ready = false;
  }
  for (const side of sides) {
    const index = round === 1 ? 1 : round === spec.q2 ? 2 : 0;
    if (index) {
      const text = reportText(game, side, index), reportId = `${side === 'blue' ? 'B' : 'R'}-Q${index}`;
      game.reports[side].push({ id: reportId, claim: text.claim, received: round, truth: text.truth, verified: null });
      event(game, 'report', `${reportId}: ${text.claim}`, side, undefined, side);
    }
  }
  if (id === 'SEN-H01' && round === 1) for (const [index, label] of ['Time/location log', 'Japanese account', 'Trawler account'].entries()) {
    game.reports.blue.push({ id: `E${index + 1}`, claim: label, received: 1, truth: 'Account preserved; this is not a verdict on its allegations.', verified: null });
  }
  if (game.items.some(i => i.available === round && i.kind === 'survivor')) event(game, 'rescue', `${game.items.filter(i => i.available === round && i.kind === 'survivor').map(i => i.id).join(', ')} now available for rescue.`);
  event(game, 'round', `Round ${round}: 3 CP per side. ${game.assets.filter(a => !a.ready && !['Exited', 'Holding custody'].includes(a.sector)).map(a => `${a.id} unavailable.`).join(' ')} Orders remain sealed until both sides commit.`);
  refreshMetrics(game);
}
export function advanceRound(game: Game): Game {
  if (game.finished || game.round >= scenario(game.scenarioId).rounds) throw new Error('Exercise has ended.');
  const next = structuredClone(game); next.round++; beginRound(next); return next;
}

export function refreshMetrics(game: Game) {
  const m = game.metrics, id = game.scenarioId;
  for (const side of sides) {
    m[`${side}_ready`] = game.assets.filter(a => a.side === side && a.kind !== 'merchant' && a.ready).length;
    m[`${side}_reports`] = game.reports[side].filter(r => !r.shared && r.id.startsWith(side === 'blue' ? 'B-Q' : 'R-Q') && r.verified !== null).length;
  }
  const delivered = game.items.filter(i => i.kind === 'supply' && i.completed !== null).length;
  const exited = game.assets.filter(a => a.kind === 'merchant' && a.sector === 'Exited').length;
  const rescued = game.items.filter(i => i.kind === 'survivor' && i.completed !== null);
  if (id === 'SPR-H01') m.delivered = delivered;
  if (id === 'SPR-F01') { m.routine_delivered = delivered; m.medical_on_time = Number(game.items.some(i => i.kind === 'medical' && i.completed !== null && i.completed <= 5)); }
  if (id === 'SEN-H01') m.case_records = game.reports.blue.filter(r => r.id.startsWith('E') && r.verified !== null).length;
  if (id === 'SEN-F01' || id === 'BAB-H01') m.rescued = rescued.length;
  if (id.startsWith('HOR') || id.startsWith('BAB')) m.transited = exited;
  if (id === 'HOR-F01') m.priority_transited = Number(game.assets.find(a => a.id === 'T1')?.sector === 'Exited');
  if (id === 'BAB-F01') { m.aid_transited = Number(game.assets.find(a => a.id === 'T1')?.sector === 'Exited'); m.rescued_on_time = rescued.filter(i => i.completed! <= 6).length; }
}

function rawMissionActions(game: Game, side: Side, publicOnly = false): Order[] {
  const spec = specification(game.scenarioId), actions: Order[] = [];
  for (const a of game.assets.filter(a => a.side === side && a.ready && a.kind !== 'staff')) {
    for (const edge of spec.edges) {
      const target = edge[0] === a.sector ? edge[1] : edge[1] === a.sector ? edge[0] : null;
      if (!target) continue;
      if (a.kind === 'merchant' && target === 'Distress') continue;
      if (game.scenarioId === 'HOR-F01' && a.kind === 'merchant' && target === 'Exit' && !publicOnly && !game.reports.blue.some(r => r.id === 'B-Q1' && r.verified !== null)) continue;
      const supplies = a.cargo.filter(id => game.items.find(i => i.id === id)?.kind === 'supply');
      if (supplies.length) for (const subject of supplies) actions.push({ type: 'move', asset: a.id, target, subject });
      else actions.push({ type: 'move', asset: a.id, target });
    }
    if (a.sector === 'Outpost') for (const item of game.items.filter(i => i.location === a.id && i.completed === null && i.kind !== 'survivor')) actions.push({ type: 'deliver', asset: a.id, target: item.id });
    if (a.kind === 'transport') for (const donor of game.assets.filter(d => d.side === side && d.id !== a.id && d.kind === 'transport' && d.sector === a.sector && d.ready)) {
      if (a.cargo.length < a.capacity) for (const item of donor.cargo) actions.push({ type: 'transfer', asset: a.id, from: donor.id, target: item });
    }
    if (a.kind === 'rescue' && a.cargo.length < a.capacity) for (const item of game.items.filter(i => i.kind === 'survivor' && i.location === a.sector && i.available <= game.round && i.completed === null)) actions.push({ type: 'rescue', asset: a.id, target: item.id });
  }
  if (game.scenarioId === 'SEN-H01' && side === 'blue' && !game.metrics.handover && (publicOnly || game.metrics.case_records === 3)) actions.push({ type: 'handover' });
  return actions;
}
/** Potential targets depend only on public prerequisites; no enemy-private verification mask. */
export function challengeTargets(game: Game): Order[] {
  const seen = new Set<string>();
  return rawMissionActions(game, 'blue', true).filter(order => {
    const key = missionKey(order); if (seen.has(key)) return false; seen.add(key);
    if (order.type === 'handover') return (game.delays.handover ?? 0) < 2;
    if (!('asset' in order)) return false;
    const a = game.assets.find(a => a.id === order.asset)!;
    if (game.scenarioId.startsWith('SPR')) {
      if (a.kind !== 'transport' || !['move', 'deliver', 'transfer'].includes(order.type)) return false;
      const items = order.type === 'move' ? a.cargo : 'target' in order ? [order.target] : [];
      return items.length > 0 && items.every(id => game.items.some(i => i.id === id && i.kind === 'supply') && (game.delays[id] ?? 0) < 2);
    }
    if (a.kind !== 'merchant' || order.type !== 'move') return false;
    const target = specification(game.scenarioId).sectors[game.scenarioId === 'HOR-F01' ? 3 : 2];
    return order.target === target && (game.delays[a.id] ?? 0) < 2;
  });
}

export { describeOrder as describe } from './types.ts';
export function legalCandidates(game: Game, side: Side): Candidate[] {
  if (game.finished) return [];
  const spec = specification(game.scenarioId), orders = rawMissionActions(game, side);
  for (const r of game.reports[side]) {
    if (r.verified === null && !r.shared) orders.push({ type: 'verify', target: r.id });
    if (r.verified !== null && !r.shared && !game.reports[opposite(side)].some(other => other.id === r.id && other.shared)) orders.push({ type: 'share', target: r.id });
  }
  if (game.scenarioId === 'SEN-H01' && side === 'red' && game.round >= 2 && !game.metrics.statement_filed) orders.push({ type: 'statement' });
  if (game.scenarioId === 'SEN-H01' || game.scenarioId === 'HOR-H01' && game.metrics.welfare_checks < 2) orders.push({ type: 'welfare' });
  if (game.scenarioId === 'HOR-F01' && side === 'blue' && !game.metrics.welfare_complete) for (const a of game.assets.filter(a => a.side === side && a.kind === 'rescue' && a.ready && a.sector === 'Holding')) orders.push({ type: 'welfare', asset: a.id });
  const agreementOpen = game.scenarioId === 'BAB-H01' ? game.round >= 5 && !game.metrics.standdown : game.scenarioId === 'SEN-F01' ? !game.metrics.coordination : !game.metrics.released;
  if (agreementOpen) for (const target of spec.agreements) {
    if (!game.proposals.some(p => p.id === target && p.side === side)) orders.push({ type: 'propose', target });
    if (game.proposals.some(p => p.id === target && p.side !== side && p.round < game.round && !p.accepted) && (target !== 'release_after_record' || side === 'red' || game.metrics.case_records === 3)) orders.push({ type: 'accept', target });
  }
  const targets = challengeTargets(game);
  if (side === 'red') {
    for (const target of targets) for (const effort of [1, 2]) if (game.pressure >= effort) orders.push({ type: 'challenge', target: missionKey(target), effort });
  } else {
    for (const target of targets.filter(target => orders.some(o => orderKey(o) === orderKey(target)))) for (const effort of [1, 2]) {
      if (game.scenarioId === 'HOR-H01' && game.round < 3 && effort === 2) continue;
      orders.push({ type: 'assure', target: missionKey(target), effort });
    }
  }
  orders.push({ type: 'hold' });
  return orders.map(order => ({ id: orderKey(order), order, label: describe(order), cost: orderCost(order), ...('asset' in order && order.asset ? { asset: order.asset } : {}), group: 'asset' in order && order.asset ? order.asset : order.type === 'challenge' || order.type === 'assure' ? order.type : 'Staff' }));
}
export function validateOrders(game: Game, side: Side, value: unknown): asserts value is Order[] {
  if (!Array.isArray(value) || value.length > 3 || value.some(o => o === null || typeof o !== 'object' || Array.isArray(o))) throw new Error('Provide up to three structured orders.');
  if (game.finished) throw new Error('Exercise has ended.');
  const legal = new Set(legalCandidates(game, side).map(c => c.id));
  for (const o of value) if (!legal.has(orderKey(o))) throw new Error('Order is unavailable to this side at this decision point. Refresh the plan.');
  const error = batchError(value); if (error) throw new Error(error);
}

/** One deterministic joint step. All prerequisites are checked against the start of the round. */
export function resolveRound(before: Game, orders: Record<Side, Order[]>): Game {
  for (const side of sides) validateOrders(before, side, orders[side]);
  const game = structuredClone(before), id = game.scenarioId;
  const challenge = orders.red.find((o): o is Extract<Order, { type: 'challenge' | 'assure' }> => o.type === 'challenge');
  const delayed = new Set<string>();
  let departureAttempted = false, departureDelayed = false;
  if (challenge) {
    game.pressure -= challenge.effort;
    const attempted = orders.blue.find(o => missionKey(o) === challenge.target);
    const assurance = orders.blue.find(o => o.type === 'assure' && o.target === challenge.target);
    const effort = assurance && 'effort' in assurance ? assurance.effort : 0;
    if (attempted && challenge.effort > effort) {
      delayed.add(missionKey(attempted));
      const a = 'asset' in attempted ? before.assets.find(a => a.id === attempted.asset) : undefined;
      const subjects = attempted.type === 'handover' ? ['handover'] : a?.kind === 'merchant' ? [a.id] : attempted.type === 'move' ? a!.cargo : 'target' in attempted ? [attempted.target] : [];
      for (const subject of subjects) game.delays[subject] = (game.delays[subject] ?? 0) + 1;
      event(game, 'challenge', `${describe(challenge)} delayed the action. Assurance ${effort}; subject delays ${subjects.map(s => `${s} ${game.delays[s]}/2`).join(', ')}.`, 'red', challenge);
    } else event(game, 'challenge', `${describe(challenge)} spent pressure; ${attempted ? 'assurance protected the action' : 'the named action was not attempted'}.`, 'red', challenge);
  }
  const priority: Side[] = game.round % 2 ? ['blue', 'red'] : ['red', 'blue'];
  // Resource handling precedes movement. Eligibility still comes from the round-start snapshot.
  const sequence = priority.flatMap(side => orders[side].map(order => ({ side, order }))).sort((a, b) => Number(a.order.type === 'move') - Number(b.order.type === 'move'));
  for (const { side, order } of sequence) {
    if (order.type === 'challenge') continue;
    const a = 'asset' in order ? game.assets.find(a => a.id === order.asset) : undefined;
    if (id === 'HOR-H01' && order.type === 'move' && order.asset === 'T1' && order.target === 'Western Exit') { departureAttempted = true; departureDelayed = delayed.has(missionKey(order)); }
    if (delayed.has(missionKey(order))) { event(game, 'delay', `${describe(order)} delayed; its CP and asset action were spent.`, side, order); continue; }
    switch (order.type) {
      case 'move': {
        const exit = specification(id).sectors[id === 'HOR-F01' ? 3 : 2];
        a!.sector = a!.kind === 'merchant' && order.target === exit ? 'Exited' : order.target;
        if (id === 'HOR-H01' && a!.sector === 'Exited') game.metrics.on_time = Number(game.round <= 4);
        break;
      }
      case 'deliver': case 'rescue': {
        const item = game.items.find(i => i.id === order.target)!;
        if (item.completed !== null) { event(game, 'rescue', `${order.target} already recovered this round; ${order.asset} retains capacity. CP/action spent.`, side, order); continue; }
        item.completed = game.round;
        if (order.type === 'deliver') { a!.cargo = a!.cargo.filter(i => i !== item.id); item.location = 'Outpost'; }
        else { item.location = a!.id; a!.cargo.push(item.id); }
        break;
      }
      case 'transfer': {
        const donor = game.assets.find(a => a.id === order.from)!, item = game.items.find(i => i.id === order.target)!;
        donor.cargo = donor.cargo.filter(i => i !== item.id); a!.cargo.push(item.id); item.location = a!.id; break;
      }
      case 'verify': {
        const report = game.reports[side].find(r => r.id === order.target)!;
        report.verified = game.round;
        event(game, 'verify', `${report.id}: ${report.truth}`, side, order, side); continue;
      }
      case 'share': {
        const record = before.reports[side].find(r => r.id === order.target)!;
        game.reports[opposite(side)].push({ ...structuredClone(record), shared: true, received: game.round });
        event(game, 'share', `${side} shared ${record.id}: ${record.truth}`, side, order); break;
      }
      case 'welfare':
        if (id === 'HOR-H01' && game.lastWelfareRound !== game.round) { game.metrics.welfare_checks = Math.min(2, game.metrics.welfare_checks + 1); game.lastWelfareRound = game.round; }
        if (id === 'HOR-F01' && game.round <= 4) game.metrics.welfare_complete = 1;
        break;
      case 'statement': game.metrics.statement_filed = 1; break;
      case 'handover': game.metrics.handover = 1; break;
      case 'propose': game.proposals.push({ id: order.target, side, round: game.round, accepted: false }); break;
      case 'accept': {
        const proposal = game.proposals.find(p => p.id === order.target && p.side !== side && p.round < game.round)!;
        if (order.target === 'release_after_record' && before.metrics.case_records !== 3) { event(game, 'agreement', 'Conditional acceptance did not complete: the prior-round record requirement was not established.', side, order); continue; }
        if (id === 'SEN-F01' && game.metrics.coordination) { event(game, 'agreement', 'A coordination agreement already became binding in the published alternating-side resolution priority.', side, order); continue; }
        proposal.accepted = true;
        if (id === 'SEN-H01') game.metrics.released = 1;
        if (id === 'SEN-F01') game.metrics.coordination = order.target === 'blue_lead' ? 1 : order.target === 'red_lead' ? 2 : 3;
        if (id === 'BAB-H01') game.metrics.standdown = 1;
        break;
      }
      case 'assure': case 'hold': break;
    }
    event(game, order.type, describe(order), side, order);
  }
  if (id === 'HOR-H01') {
    game.custodyStreak = departureAttempted && departureDelayed ? before.custodyStreak + 1 : 0;
    if (game.custodyStreak >= 2) { game.metrics.detained = 1; game.assets.find(a => a.id === 'T1')!.sector = 'Holding custody'; event(game, 'custody', 'Two consecutive departure delays: T1 enters the authored holding state.'); }
  }
  game.finished = game.round === scenario(id).rounds;
  refreshMetrics(game);
  event(game, 'resolution', `Round ${game.round} resolved. Blue spent ${orders.blue.reduce((n, o) => n + orderCost(o), 0)} CP; Red spent ${orders.red.reduce((n, o) => n + orderCost(o), 0)} CP. Remaining pressure: ${game.pressure}.`);
  return game;
}

export function observe(game: Game, side: Side): Observation {
  const spec = specification(game.scenarioId), metrics = { ...game.metrics };
  delete metrics[`${opposite(side)}_reports`];
  if (side === 'red' && game.scenarioId === 'SEN-H01' && !metrics.handover) delete metrics.case_records;
  return {
    schema: 'maritime-observation/1', side, scenario: structuredClone(scenario(game.scenarioId)), round: game.round, ...(game.variant ? { variant: game.variant } : {}),
    sectors: spec.sectors, edges: spec.edges, objectives: spec.objectives, guidance: [...spec.guidance, ...(game.variant ? ['Short-window training variant v1: both supply transports become available in round 3. Six rounds, the same six pressure tokens, and unchanged victory thresholds. This is a separate scenario setting, not an AI advantage.'] : [])],
    assets: structuredClone(game.assets), items: structuredClone(game.items.filter(i => i.available <= game.round)), pressure: game.pressure,
    delays: { ...game.delays }, reports: game.reports[side].map(r => ({ ...r, truth: r.verified === null ? null : r.truth })),
    proposals: structuredClone(game.proposals), metrics, custodyStreak: game.custodyStreak, lastWelfareRound: game.lastWelfareRound,
    events: structuredClone(game.events.filter(e => e.audience === 'public' || e.audience === side)),
    candidates: legalCandidates(game, side), finished: game.finished,
  };
}

/** A policy's simulation starts from its observation, with unknown private facts left unknown. */
export function planningWorld(observation: Observation): Game {
  const metrics = Object.fromEntries(Object.keys(observation.scenario.metrics).map(k => [k, observation.metrics[k] ?? 0]));
  const own = observation.reports.map(r => ({ ...r, truth: r.truth ?? 'Unknown exercise report; verification creates a record.' }));
  return {
    schema: ENGINE_VERSION, scenarioId: observation.scenario.id, scenarioVersion: observation.scenario.version, rulesVersion: observation.scenario.rulesVersion, ...(observation.variant ? { variant: observation.variant } : {}),
    round: observation.round, assets: structuredClone(observation.assets), items: structuredClone(observation.items), pressure: observation.pressure,
    delays: { ...observation.delays }, reports: { blue: observation.side === 'blue' ? own : [], red: observation.side === 'red' ? own : [] },
    proposals: structuredClone(observation.proposals), metrics, custodyStreak: observation.custodyStreak, lastWelfareRound: observation.lastWelfareRound,
    events: [], finished: observation.finished,
  };
}
export function terminalLedger(game: Game, refereeModified = false): Ledger {
  return { schema: 'xriegsspiel-terminal-ledger/1', scenarioId: game.scenarioId, scenarioVersion: game.scenarioVersion, rulesVersion: game.rulesVersion, status: game.finished ? 'completed' : 'pending', completedRounds: game.finished ? game.round : game.round - 1, refereeModified, metrics: { ...game.metrics }, provenance: ENGINE_VERSION + (game.variant ? `; ${game.variant}` : '; baseline') };
}
export function result(game: Game, refereeModified = false) { return scoreLedger(library, terminalLedger(game, refereeModified)); }
