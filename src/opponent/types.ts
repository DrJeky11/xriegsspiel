import type { Scenario } from '../../scenarios/scoring.ts';

export type Side = 'blue' | 'red';
export type Difficulty = 'novice' | 'standard' | 'advanced';
export const opposite = (side: Side): Side => side === 'blue' ? 'red' : 'blue';
export interface Asset {
  id: string; side: Side; name: string; sector: string; kind: 'transport' | 'rescue' | 'merchant' | 'staff' | 'patrol';
  capacity: number; cargo: string[]; ready: boolean;
  tileId?: string | null;
  movement?: number;
}
export interface Item { id: string; kind: 'supply' | 'medical' | 'survivor'; location: string; available: number; completed: number | null }
export interface Report { id: string; claim: string; received: number; truth: string | null; verified: number | null; shared?: boolean }
export interface Proposal { id: string; side: Side; round: number; accepted: boolean }
export type Order =
  | { type: 'move'; asset: string; target: string; subject?: string }
  | { type: 'deliver' | 'rescue'; asset: string; target: string }
  | { type: 'transfer'; asset: string; target: string; from: string }
  | { type: 'verify' | 'share' | 'propose' | 'accept'; target: string }
  | { type: 'assure' | 'challenge'; target: string; effort: number; asset?: string }
  | { type: 'welfare'; asset?: string }
  | { type: 'handover' | 'statement' | 'hold'; asset?: string };
export interface Candidate { id: string; order: Order; label: string; cost: number; asset?: string; group: string; path?: string[]; movementCost?: number; warning?: string }
export interface GeographicSetup {
  version: 'maritime-geography/1'; mapId: string; mapVersion: string; geographyVersion: string; sourceHashes: string[];
  goals: { id: string; label: string; tileIds: string[]; anchor: string }[];
  movement: number; patrolMovement: number; interceptRange: number;
}
export interface GameEvent {
  id: string; round: number; side: Side | null; audience: 'public' | Side;
  type: string; message: string; rule: string; order?: Order;
}
export interface Game {
  schema: 'maritime-engine/1' | 'maritime-engine/2'; scenarioId: string; scenarioVersion: string; rulesVersion: string;
  geography?: GeographicSetup;
  variant?: 'short-window/1';
  round: number; assets: Asset[]; items: Item[]; pressure: number; delays: Record<string, number>;
  reports: Record<Side, Report[]>; proposals: Proposal[]; metrics: Record<string, number>;
  custodyStreak: number; lastWelfareRound: number; events: GameEvent[]; finished: boolean;
}
export interface Observation {
  schema: 'maritime-observation/1'; side: Side; scenario: Scenario; round: number;
  variant?: 'short-window/1';
  sectors: string[]; edges: [string, string][]; objectives: Record<Side, string>; guidance: string[];
  geography?: GeographicSetup;
  assets: Asset[]; items: Item[]; pressure: number; delays: Record<string, number>;
  reports: Report[]; proposals: Proposal[]; metrics: Record<string, number>;
  custodyStreak: number; lastWelfareRound: number; events: GameEvent[]; candidates: Candidate[]; finished: boolean;
}
export interface PolicyDecision {
  version: string; difficulty: Difficulty; orders: Order[]; reason: string;
  considered: number; transitions: number; value: number; seed: number;
  alternatives: { orders: Order[]; value: number }[]; fallback?: string;
}
export const orderKey = (order: Order) => JSON.stringify(Object.fromEntries(Object.entries(order).sort(([a], [b]) => a.localeCompare(b))));
/** Challenge a vessel's movement, not a renamable order or the choice of lead manifest. */
export const missionKey = (order: Order) => {
  if (order.type !== 'move') return orderKey(order);
  return orderKey({ type: order.type, asset: order.asset, target: order.target });
};
export const orderCost = (order: Order) => order.type === 'hold' ? 0 : order.type === 'assure' || order.type === 'challenge' ? order.effort : 1;
export function describeOrder(order: Order): string {
  switch (order.type) {
    case 'move': return `${order.asset} → ${order.target}${order.subject ? ` · subject ${order.subject}` : ''}`;
    case 'deliver': return `${order.asset}: deliver ${order.target} to Outpost`;
    case 'transfer': return `${order.asset}: receive ${order.target} from ${order.from}`;
    case 'rescue': return `${order.asset}: rescue ${order.target}`;
    case 'assure': case 'challenge': {
      let target = order.target; try { const parsed = JSON.parse(target); if (['move', 'deliver', 'transfer', 'handover'].includes(parsed.type)) target = describeOrder(parsed); } catch { /* Validation rejects malformed targets. */ }
      return `${order.asset ? order.asset + ': ' : ''}${order.type === 'assure' ? (order.asset ? 'Escort' : 'Assure') : (order.asset ? 'Intercept' : 'Challenge')} ${target} · ${order.effort} CP`;
    }
    case 'verify': return `Verify ${order.target}`;
    case 'share': return `Share verified ${order.target}`;
    case 'propose': return `Propose ${order.target.replaceAll('_', ' ')}`;
    case 'accept': return `Accept ${order.target.replaceAll('_', ' ')}`;
    case 'welfare': return order.asset ? `${order.asset}: welfare intervention at Holding` : 'Crew welfare check';
    case 'statement': return 'File statement of position';
    case 'handover': return 'Handover preserved case to investigator';
    case 'hold': return 'Hold remaining effort';
  }
}

/** Public order-batch constraints, used by UI, engine and policies. */
export function batchError(orders: Order[]): string | null {
  if (orders.length > 3) return 'At most three orders may be sealed per round.';
  if (orders.reduce((sum, order) => sum + orderCost(order), 0) > 3) return 'This plan exceeds three command points.';
  const used = new Set<string>(), unique = new Set<string>(), subjects = new Set<string>();
  for (const order of orders) {
    if (unique.has(orderKey(order))) return 'The same order cannot appear twice.';
    unique.add(orderKey(order));
    if ('asset' in order && order.asset) {
      if (used.has(order.asset)) return `${order.asset} already has an action this round.`;
      used.add(order.asset);
    }
    if (['challenge', 'handover', 'statement', 'welfare'].includes(order.type)) {
      if (subjects.has(order.type)) return `Only one ${order.type} order is allowed per round.`;
      subjects.add(order.type);
    }
    if ('target' in order && ['deliver', 'transfer', 'rescue', 'assure', 'propose', 'accept'].includes(order.type)) {
      const key = `${['deliver', 'transfer', 'rescue'].includes(order.type) ? 'item' : order.type}:${order.target}`;
      if (subjects.has(key)) return 'This subject already has an order of that kind.';
      subjects.add(key);
    }
  }
  return null;
}
