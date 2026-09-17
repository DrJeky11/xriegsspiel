import type { Asset, Observation, Order } from './types.ts';
import { batchError, describeOrder, orderCost, orderKey } from './types.ts';
import type { RunView } from '../../server/opponent-session.ts';

/** Presentation derived only from the player's permitted view. Never issues orders. */
export function availability(o: Observation, a: Asset): string {
  if (a.ready) return 'Ready · one action this round';
  if (a.sector === 'Exited') return 'Passage complete';
  if (a.sector === 'Holding custody') return 'In custody';
  if (o.variant === 'short-window/1' && a.kind === 'transport' && o.round < 3) return 'Unavailable · supply ships arrive in round 3';
  const returns = o.scenario.id === 'SPR-F01' ? 5 : o.scenario.id === 'HOR-H01' ? 3 : 4;
  return `Unavailable this round · returns in round ${returns}`;
}

export function missionProgress(o: Observation): string {
  if (o.scenario.id.startsWith('SPR')) {
    const delivered = o.items.filter(i => i.kind === 'supply' && i.completed !== null).length;
    return `${delivered} routine manifests delivered · Blue needs 3 by end of round ${o.scenario.rounds}${o.side === 'red' ? '; Red needs 1 or fewer' : ''}.`;
  }
  return o.objectives[o.side];
}

export function missionBrief(o: Observation, location: string): { title: string; text: string }[] {
  const supply = o.scenario.id.startsWith('SPR');
  return [
    { title: 'Your mission', text: `You control ${o.side.toUpperCase()} · ${o.scenario.actors[o.side]}. ${o.objectives[o.side]} ${o.scenario.rounds} rounds total.` },
    { title: 'Where you are', text: location },
    { title: 'Your ships & cargo', text: o.assets.filter(a => a.side === o.side).map(a => `${a.name}: ${a.cargo.length ? 'cargo ' + a.cargo.join(', ') : 'no cargo'}. ${availability(o, a)}.`).join(' ') },
    { title: 'How a round works', text: '3 command points (CP), up to 3 orders, one action per ship. A movement order costs 1 CP. Preview, add to your plan, then seal. Both sides resolve together. Unused CP expire.' },
    { title: supply ? 'Arrival is not delivery' : 'Mission actions', text: supply ? 'B1 and B2 carry routine supplies. Move into the marked Sierra Madre transfer area, then use a later round to Deliver each manifest: 1 CP and that ship’s action. B3 is a response launch. Verify and Share reports do not deliver cargo.' : 'Choose Mission actions for the selected ship, or Staff for reports and agreements. Eligibility uses the start of the round: moving or verifying cannot unlock another action in that same plan. Full rules explain the scenario’s specific requirements.' },
    { title: 'Learning focus', text: 'Practice allocating limited actions between mission progress, protection and information. After resolution, explain what changed and why. The game result is separate from learning assessment.' },
  ];
}

export function planGuidance(o: Observation, draft: Order[]): string[] {
  const used = draft.reduce((n, order) => n + orderCost(order), 0);
  const available = [...new Set(o.candidates.filter(c => c.order.type !== 'hold' && !batchError([...draft, c.order]) && !(c.order.type === 'move' && draft.some(d => d.type === 'move' && d.target === (c.order as Extract<Order, {type:'move'}>).target))).map(c => c.group))];
  const lines = [`${3 - used} of 3 CP left · ${draft.length} of 3 orders. Each ship acts once.`, available.length ? `Can still act: ${available.join(', ')}. Unused CP expire when you seal.` : 'No additional legal order fits this plan. Review before sealing.'];
  if (o.variant && o.round < 3) lines.push('Supply ships B1 and B2 arrive in round 3; six rounds total.');
  if (o.scenario.id.startsWith('SPR') && o.side === 'blue') {
    const delivery = o.candidates.find(c => c.order.type === 'deliver' && !batchError([...draft, c.order]));
    lines.push(delivery ? `Delivery available: ${delivery.label}.` : `${o.variant && o.round < 3 ? 'When supply ships arrive, move them' : 'Move supply ships'} toward Sierra Madre. Arrival requires a later Deliver action.`);
  }
  return lines;
}

export function firstRoundGuide(o: Observation, draft: Order[]): { title: string; text: string } {
  if (!draft.length) return { title: '1 · Choose your first action', text: o.scenario.id.startsWith('SPR') && o.side === 'blue' ? `${o.variant ? 'B1/B2 arrive in round 3. Select B3 to plan a supporting move, or Staff to verify a report.' : 'Select B1 or B2, then a highlighted water hex toward Sierra Madre to preview a route.'} The route is only a preview; add it to your plan when ready.` : 'Select one of your ready ships or the Staff action group. Preview a route or choose a mission action, then add it to your plan.' };
  return { title: '2 · Review, then seal', text: `${planGuidance(o, draft).join(' ')} Sealing submits your draft; both sides then resolve together. Read the round summary to see what your orders accomplished.` };
}

/** Historical summaries use the next recorded pre-round view, never today's metrics for an old round. */
export function roundSummary(view: RunView, round: number): { title: string; lines: string[] } {
  const record = view.review.find(r => r.round === round);
  if (!record) return { title: `Round ${round} · not resolved`, lines: ['No completed orders to summarize yet.'] };
  const before = record.observation;
  const after = view.review.find(r => r.round === round + 1)?.observation ?? view.observation;
  const orders = record.orders[before.side], spent = orders.reduce((n, o) => n + orderCost(o), 0);
  const events = view.observation.events.filter(e => e.round === round && (e.audience === 'public' || e.audience === before.side));
  const lines = [`${before.side.toUpperCase()} spent ${spent}/3 CP; ${3 - spent} unused CP expired.`, missionProgress(after)];
  if (!orders.some(o => o.type === 'move')) lines.push('No movement was ordered by your side.');
  for (const order of orders) {
    const matched = events.filter(e => e.order && orderKey(e.order) === orderKey(order));
    const outcome = [...new Set(matched.map(e => e.message))].join(' ');
    lines.push(outcome || `${describeOrder(order)}: no completion event. Check the recorded events for an interruption.`);
    if (order.type === 'verify') lines.push('Verification checks a report. Sharing it requires a later action.');
    if (order.type === 'share') lines.push('Sharing sends the verified report to the other side; it does not move ships.');
  }
  for (const e of events.filter(e => ['interception', 'traffic', 'exit', 'custody', 'agreement'].includes(e.type))) if (!lines.some(l => l.includes(e.message))) lines.push(e.message);
  if (before.scenario.id.startsWith('SPR')) {
    const count = (o: Observation) => o.items.filter(i => i.kind === 'supply' && i.completed !== null).length;
    const change = count(after) - count(before);
    lines.push(`${change} routine manifests delivered this round. ${change === 0 ? 'Movement and report actions do not deliver cargo; each manifest needs a Deliver action.' : 'Cargo and mission progress updated automatically.'}`);
  }
  const changes = Object.entries(after.metrics).filter(([k, v]) => v !== before.metrics[k]);
  if (changes.length) lines.push('Recorded changes: ' + changes.map(([k, v]) => `${k.replaceAll('_', ' ')} ${before.metrics[k]} → ${v}`).join('; ') + '.');
  return { title: `Round ${round} summary`, lines };
}
