// Original, deliberately abstract scenario. Rendering and room coordinates live elsewhere.
export const RULES = 'island-logistics/0.1.0';
export const SCENARIO = 'island-coordination/0.1.0';
export const WIDTH = 9;
export const HEIGHT = 7;
export type Terrain = 'water' | 'plain' | 'forest' | 'ridge' | 'road';
const layout = ['~~~...~~~', '~..f..r.~', '..ff..r..', '.ddddddd.', '..f..r...', '~...r...~', '~~.....~~'];
export const MAP = layout.flatMap((row, z) => [...row].map((value, x) => ({
  id: z * WIDTH + x, x, z, terrain: ({ '~': 'water', '.': 'plain', f: 'forest', r: 'ridge', d: 'road' } as Record<string, Terrain>)[value],
})));
export const DEPOT = 28;
export const costOf = (id: number) => ({ water: Infinity, plain: 1, road: 1, forest: 2, ridge: 3 })[MAP[id]?.terrain ?? 'water'];
export const cellName = (id: number) => MAP[id] ? `${String.fromCharCode(65 + MAP[id].x)}${MAP[id].z + 1}` : 'Outside map';
export interface Unit { id: string; name: string; cell: number; ap: number; cargo: number; capacity: number }
export interface Objective { id: string; name: string; cell: number; received: number; need: number }
export type Action = { type: 'move'; unitId: string; to: number } | { type: 'deliver'; unitId: string } | { type: 'load'; unitId: string } | { type: 'advance' } | { type: 'reset' };
export interface Command { id: string; revision: number; action: Action }
export interface Event { sequence: number; round: number; text: string; action: Action; beforeRevision: number }
export interface State { rules: string; scenario: string; revision: number; round: number; depot: number; units: Unit[]; objectives: Objective[]; events: Event[] }
export interface Preview { allowed: boolean; reason: string; cost: number; path: number[]; amount: number }
export function initialState(revision = 0): State {
  return { rules: RULES, scenario: SCENARIO, revision, round: 1, depot: 2,
    units: [
      { id: 'atlas', name: 'Atlas', cell: 28, ap: 4, cargo: 2, capacity: 2 },
      { id: 'beacon', name: 'Beacon', cell: 29, ap: 4, cargo: 2, capacity: 2 },
      { id: 'cedar', name: 'Cedar', cell: 37, ap: 4, cargo: 2, capacity: 2 },
    ],
    objectives: [ { id: 'north', name: 'North relay', cell: 13, received: 0, need: 4 }, { id: 'east', name: 'East harbor', cell: 34, received: 0, need: 4 } ], events: [] };
}
export function routes(state: State, unitId: string): Map<number, { cost: number; path: number[] }> {
  const unit = state.units.find(u => u.id === unitId);
  const found = new Map<number, { cost: number; path: number[] }>();
  if (!unit) return found;
  const pending = [unit.cell];
  found.set(unit.cell, { cost: 0, path: [unit.cell] });
  while (pending.length) {
    pending.sort((a, b) => found.get(a)!.cost - found.get(b)!.cost);
    const id = pending.shift()!;
    const current = found.get(id)!;
    const cell = MAP[id];
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const x = cell.x + dx, z = cell.z + dz;
      if (x < 0 || x >= WIDTH || z < 0 || z >= HEIGHT) continue;
      const next = z * WIDTH + x;
      if (state.units.some(u => u.id !== unitId && u.cell === next)) continue;
      const cost = current.cost + costOf(next);
      if (cost > unit.ap || cost >= (found.get(next)?.cost ?? Infinity)) continue;
      found.set(next, { cost, path: [...current.path, next] });
      pending.push(next);
    }
  }
  return found;
}
export function isComplete(state: State) { return state.objectives.every(o => o.received >= o.need); }
export function isEnded(state: State) { return state.round > 5 || isComplete(state); }
export function evaluate(state: State, action: Action): Preview {
  const no = (reason: string): Preview => ({ allowed: false, reason, cost: 0, path: [], amount: 0 });
  const yes = (reason: string, cost = 0, path: number[] = [], amount = 0): Preview => ({ allowed: true, reason, cost, path, amount });
  if (action.type === 'reset') return yes('Start a fresh exercise for everyone. The previous run remains in the server journal.');
  if (isEnded(state)) return no('Exercise finished. Review the decision log or start again.');
  if (action.type === 'advance') return yes(state.round === 5 ? 'Finish the exercise and review the unmet requests.' : 'Begin the next round. Every team recovers 4 movement points; cargo stays unchanged.');
  const unit = state.units.find(u => u.id === action.unitId);
  if (!unit) return no('Select a transport team.');
  if (action.type === 'move') {
    if (!Number.isInteger(action.to) || !MAP[action.to]) return no('That location is outside the board.');
    if (action.to === unit.cell) return no('The team is already here.');
    if (MAP[action.to].terrain === 'water') return no('Land transports cannot cross water.');
    if (state.units.some(u => u.id !== unit.id && u.cell === action.to)) return no('Another team occupies this location.');
    const route = routes(state, unit.id).get(action.to);
    if (!route) return no('No route within the remaining movement points. Forest costs 2; ridge costs 3.');
    const remaining = unit.ap - route.cost;
    return yes(`Move to ${cellName(action.to)} · ${route.cost} movement point${route.cost === 1 ? '' : 's'}. ${remaining === 0 ? 'No points remain to deliver this round.' : `${remaining} left; delivery costs 1.`}`, route.cost, route.path);
  }
  if (unit.ap < 1) return no('No movement points left. Advance the round to act again.');
  if (action.type === 'deliver') {
    const target = state.objectives.find(o => o.cell === unit.cell);
    if (!target) return no('Move onto North relay or East harbor to deliver.');
    if (target.received >= target.need) return no('This location already has all requested supplies.');
    if (!unit.cargo) return no('Cargo is empty. Reload at the depot.');
    const amount = Math.min(unit.cargo, target.need - target.received);
    return yes(`Deliver ${amount} supply to ${target.name}. Costs 1 movement point.`, 1, [], amount);
  }
  if (action.type === 'load') {
    if (unit.cell !== DEPOT) return no('Move onto the depot at B4 to load supplies.');
    if (unit.cargo >= unit.capacity) return no('Cargo is full (2 supply).');
    if (!state.depot) return no('The shared depot is empty.');
    const amount = Math.min(unit.capacity - unit.cargo, state.depot);
    return yes(`Load ${amount} supply from the shared depot. Costs 1 movement point.`, 1, [], amount);
  }
  return no('Unknown action.');
}
export function applyAction(state: State, action: Action): State {
  const preview = evaluate(state, action);
  if (!preview.allowed) throw new Error(preview.reason);
  const next = action.type === 'reset' ? initialState(state.revision) : structuredClone(state);
  let text = preview.reason;
  if ('unitId' in action) {
    const unit = next.units.find(u => u.id === action.unitId)!;
    if (action.type === 'move') { unit.cell = action.to; text = `${unit.name} moved to ${cellName(action.to)}; ${preview.cost} points spent.`; }
    if (action.type === 'deliver') {
      unit.cargo -= preview.amount;
      const objective = next.objectives.find(o => o.cell === unit.cell)!;
      objective.received += preview.amount;
      text = `${unit.name} delivered ${preview.amount} supply to ${objective.name}.`;
    }
    if (action.type === 'load') { unit.cargo += preview.amount; next.depot -= preview.amount; text = `${unit.name} loaded ${preview.amount} supply; depot now ${next.depot}.`; }
    unit.ap -= preview.cost;
  }
  if (action.type === 'advance') { next.round++; next.units.forEach(u => { u.ap = 4; }); text = next.round > 5 ? 'Exercise ended. Compare the requests fulfilled and discuss your allocation.' : `Round ${next.round} began. All teams restored to 4 movement points.`; }
  next.revision++;
  next.events.push({ sequence: next.revision, beforeRevision: state.revision, round: state.round, action: structuredClone(action), text });
  return next;
}
export function validCommand(value: unknown): value is Command {
  if (!value || typeof value !== 'object') return false;
  const v = value as Command;
  if (typeof v.id !== 'string' || v.id.length < 1 || v.id.length > 100 || !Number.isSafeInteger(v.revision) || !v.action) return false;
  const a = v.action;
  if (a.type === 'advance' || a.type === 'reset') return true;
  return ['move', 'load', 'deliver'].includes(a.type) && 'unitId' in a && typeof a.unitId === 'string' && (a.type !== 'move' || Number.isInteger(a.to));
}
