/** Dispatch pinned saved games to their original rules; new UI matches use geographic rules. */
import * as sector from './sector-rules.ts';
import * as geographic from './geographic-rules.ts';
import type { Game, Observation, Order, Side } from './types.ts';
export { describeOrder as describe } from './types.ts';
export { createGame } from './sector-rules.ts';
export { createGame as createGeographicGame, library as geographicLibrary } from './geographic-rules.ts';
export const ENGINE_VERSION = geographic.ENGINE_VERSION;
const engine = (game: Game) => game.geography ? geographic : sector;
export const advanceRound = (game: Game) => engine(game).advanceRound(game);
export const resolveRound = (game: Game, orders: Record<Side, Order[]>) => engine(game).resolveRound(game, orders);
export const observe = (game: Game, side: Side) => engine(game).observe(game, side);
export const legalCandidates = (game: Game, side: Side) => engine(game).legalCandidates(game, side);
export function validateOrders(game: Game, side: Side, orders: unknown): asserts orders is Order[] { engine(game).validateOrders(game, side, orders); }
export const planningWorld = (observation: Observation) => (observation.geography ? geographic : sector).planningWorld(observation);
export const terminalLedger = (game: Game, refereeModified = false) => engine(game).terminalLedger(game, refereeModified);
export const result = (game: Game, refereeModified = false) => engine(game).result(game, refereeModified);
