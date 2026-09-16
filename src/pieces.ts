/** Original equipment-laboratory rules. Source performance figures never drive these rules. */
export type Force = 'red' | 'blue';
export type Terrain = 'plain' | 'road' | 'forest' | 'ridge' | 'water';
export interface Profile {
  id: string; label: string; layer: 'surface' | 'air' | 'subsurface' | 'inventory';
  movement: number; costs: Record<Terrain, number | null>; cargoSlots: number;
}
export interface PieceDefinition {
  id: string; equipmentId: string; name: string; rulesVersion: string; profileId: string;
  kind: 'part' | 'platform'; pieceScale: string; loadSlots: number;
  forceEvidence: { force: Force; basis: string; sourceId: string }[];
  eraEvidence: { raw: string; reportedYear: number | null; basis: string };
  eraStatus: string; definitionStatus: string; historicalServiceStatus: string;
  profileBasis: string; reviewFlag: string | null;
}
export interface PieceCatalog {
  version: string; equipmentVersion: string; rulesVersion: string; pieces: PieceDefinition[];
}
export interface PieceRules { version: string; purpose: string; scale: string; limits: string[]; profiles: Profile[] }
export interface LabBoard { width: number; height: number; cells: Terrain[] }
export interface Piece {
  id: string; definitionId: string; force: Force; cell: number | null;
  carrierId: string | null; movement: number;
}
export type LabAction = { type: 'move'; pieceId: string; to: number }
  | { type: 'load'; pieceId: string; carrierId: string }
  | { type: 'unload'; pieceId: string; to: number }
  | { type: 'hold'; pieceId: string }
  | { type: 'advance' };
export interface LabEvent { revision: number; action: LabAction; explanation: string }
export interface LabState {
  catalogVersion: string; rulesVersion: string; board: LabBoard; year: number;
  turn: number; revision: number; pieces: Piece[]; events: LabEvent[];
}
export interface Evaluation { allowed: boolean; reason: string; reasonCode?: string; cost: number; path: number[] }
/** Optional board policy; the shared evaluator still owns routes, budgets and cargo transfers. */
export interface BoardPolicy {
  neighbors(cell: number): number[];
  terrainReason(piece: Piece, cell: number): string | null;
  cost(piece: Piece, from: number, to: number): number | null;
  transferReason(piece: Piece, carrier: Piece, cell: number): string | null;
}
export type LabRecord = { type: 'deploy'; definitionId: string; force: Force; cell: number; id: string }
  | { type: 'action'; action: LabAction };
export interface LabJournal { catalogVersion: string; rulesVersion: string; board: LabBoard; year: number; records: LabRecord[] }

export function replayLaboratory(lab: PieceLab, journal: LabJournal) {
  if (journal.catalogVersion !== lab.catalog.version || journal.rulesVersion !== lab.rules.version) throw new Error('Journal version mismatch.');
  return journal.records.reduce((state, r) => r.type === 'deploy'
    ? lab.deploy(state, r.definitionId, r.force, r.cell, r.id) : lab.apply(state, r.action), lab.create(journal.board, journal.year));
}

export function validateCatalog(catalog: PieceCatalog, rules: PieceRules) {
  if (catalog.rulesVersion !== rules.version) throw new Error('Piece and rules versions differ.');
  const profiles = new Map<string, Profile>();
  for (const p of rules.profiles) {
    if (profiles.has(p.id) || !Number.isInteger(p.movement) || p.movement < 0 || !Number.isInteger(p.cargoSlots) || p.cargoSlots < 0) throw new Error(`Invalid profile: ${p.id}`);
    for (const t of ['plain', 'road', 'forest', 'ridge', 'water'] as const) if (p.costs[t] !== null && (!Number.isInteger(p.costs[t]) || p.costs[t]! <= 0)) throw new Error(`Invalid terrain cost: ${p.id}/${t}`);
    profiles.set(p.id, p);
  }
  const ids = new Set<string>();
  for (const p of catalog.pieces) {
    if (ids.has(p.id) || !profiles.has(p.profileId) || p.rulesVersion !== rules.version || !Number.isInteger(p.loadSlots) || p.loadSlots <= 0) throw new Error(`Invalid piece definition: ${p.id}`);
    if (!p.forceEvidence.length || p.forceEvidence.some(e => !['red', 'blue'].includes(e.force))) throw new Error(`Invalid force evidence: ${p.id}`);
    if ((p.kind === 'part') !== (profiles.get(p.profileId)!.layer === 'inventory')) throw new Error(`Part/profile mismatch: ${p.id}`);
    ids.add(p.id);
  }
}

export class PieceLab {
  readonly definitions: Map<string, PieceDefinition>;
  readonly profiles: Map<string, Profile>;
  readonly catalog: PieceCatalog;
  readonly rules: PieceRules;
  policy?: BoardPolicy;
  constructor(catalog: PieceCatalog, rules: PieceRules, policy?: BoardPolicy) {
    this.policy = policy;
    this.catalog = catalog; this.rules = rules;
    validateCatalog(catalog, rules);
    this.definitions = new Map(catalog.pieces.map(p => [p.id, p]));
    this.profiles = new Map(rules.profiles.map(p => [p.id, p]));
  }
  definition(id: string) { const p = this.definitions.get(id); if (!p) throw new Error('Unknown piece definition.'); return p; }
  profile(piece: Pick<Piece, 'definitionId'>) { return this.profiles.get(this.definition(piece.definitionId).profileId)!; }
  create(board: LabBoard, year = 2026): LabState {
    if (!Number.isInteger(year) || year < 1980 || year > 2026) throw new Error('Laboratory year must be 1980–2026.');
    if (!Number.isInteger(board.width) || !Number.isInteger(board.height) || board.width <= 0 || board.height <= 0 || board.cells.length !== board.width * board.height || board.cells.some(c => !['plain', 'road', 'forest', 'ridge', 'water'].includes(c))) throw new Error('Invalid laboratory board.');
    return { catalogVersion: this.catalog.version, rulesVersion: this.rules.version, board: structuredClone(board), year, turn: 1, revision: 0, pieces: [], events: [] };
  }
  eligibility(definitionId: string, force: Force, year: number): { allowed: boolean; reason: string } {
    if (!Number.isInteger(year) || year < 1980 || year > 2026) return { allowed: false, reason: 'Laboratory year must be 1980–2026.' };
    const d = this.definition(definitionId);
    const evidence = d.forceEvidence.find(m => m.force === force);
    if (!evidence || evidence.basis !== 'odin-operator-filter') return { allowed: false, reason: 'Operator evidence needs review; origin alone does not assign a piece to this force.' };
    if (d.eraEvidence.reportedYear === null) return { allowed: false, reason: 'The source introduction date is unknown.' };
    if (d.eraEvidence.reportedYear > year) return { allowed: false, reason: `The source reports introduction in ${d.eraEvidence.reportedYear}, after this laboratory year.` };
    return { allowed: true, reason: 'Eligible for the equipment laboratory using ODIN operator and introduction claims. Historical service dates remain unverified.' };
  }
  deploy(state: LabState, definitionId: string, force: Force, cell: number, id: string): LabState {
    this.assertVersion(state);
    if (!id || state.pieces.some(p => p.id === id)) throw new Error('Piece instance IDs must be unique.');
    const eligible = this.eligibility(definitionId, force, state.year);
    if (!eligible.allowed) throw new Error(eligible.reason);
    const piece: Piece = { id, definitionId, force, cell, carrierId: null, movement: this.profiles.get(this.definition(definitionId).profileId)!.movement };
    const reason = this.occupancyReason(state, piece, cell);
    if (reason) throw new Error(reason);
    const next = structuredClone(state); next.pieces.push(piece); return next;
  }
  private assertVersion(state: LabState) {
    if (state.catalogVersion !== this.catalog.version || state.rulesVersion !== this.rules.version) throw new Error('Saved piece/rules version mismatch.');
  }
  private validCell(state: LabState, cell: number) { return Number.isInteger(cell) && cell >= 0 && cell < state.board.cells.length; }
  private neighbors(state: LabState, cell: number) {
    if (this.policy) return this.policy.neighbors(cell);
    const { width, height } = state.board, x = cell % width, y = Math.floor(cell / width);
    return [[x-1,y],[x+1,y],[x,y-1],[x,y+1]].filter(([a,b]) => a >= 0 && b >= 0 && a < width && b < height).map(([a,b]) => b * width + a);
  }
  occupancyReason(state: LabState, piece: Piece, cell: number): string | null {
    if (!this.validCell(state, cell)) return 'Unknown destination tile.';
    const profile = this.profile(piece);
    if (this.policy) {
      const reason = this.policy.terrainReason(piece, cell); if (reason) return reason;
    } else {
      if (profile.costs[state.board.cells[cell]] === null) return 'This profile cannot occupy this terrain.';
      if (profile.id === 'landing-craft' && state.board.cells[cell] !== 'water' && !this.neighbors(state, cell).some(n => state.board.cells[n] === 'water')) return 'Landing craft require water or a shoreline cell.';
    }
    // Inventory can share a ground cell; independently controlled platforms cannot share a layer.
    return profile.layer !== 'inventory' && state.pieces.some(p => p.id !== piece.id && p.carrierId === null && p.cell === cell && this.profile(p).layer === profile.layer) ? 'This tile already has a platform in the same layer.' : null;
  }
  reachable(state: LabState, pieceId: string): Map<number, { cost: number; path: number[] }> {
    this.assertVersion(state);
    const piece = state.pieces.find(p => p.id === pieceId);
    const found = new Map<number, { cost: number; path: number[] }>();
    if (!piece || piece.cell === null || piece.carrierId !== null) return found;
    const profile = this.profile(piece);
    found.set(piece.cell, { cost: 0, path: [piece.cell] });
    const pending = [piece.cell];
    while (pending.length) {
      pending.sort((a,b) => found.get(a)!.cost - found.get(b)!.cost || a-b);
      const current = pending.shift()!, route = found.get(current)!;
      for (const next of this.neighbors(state, current)) {
        if (this.occupancyReason(state, piece, next)) continue;
        const step = this.policy ? this.policy.cost(piece, current, next) : profile.costs[state.board.cells[next]];
        if (step === null) continue;
        const cost = route.cost + step;
        if (cost > piece.movement || cost >= (found.get(next)?.cost ?? Infinity)) continue;
        found.set(next, { cost, path: [...route.path, next] }); pending.push(next);
      }
    }
    return found;
  }
  cargoUsed(state: LabState, carrierId: string) { return state.pieces.filter(p => p.carrierId === carrierId).reduce((n,p) => n + this.definition(p.definitionId).loadSlots, 0); }
  evaluate(state: LabState, action: LabAction): Evaluation {
    this.assertVersion(state);
    const no = (reason: string, reasonCode: string): Evaluation => ({ allowed: false, reason, reasonCode, cost: 0, path: [] });
    const yes = (reason: string, cost = 0, path: number[] = []): Evaluation => ({ allowed: true, reason, cost, path });
    if (action.type === 'advance') return yes('Advance the laboratory turn and restore movement budgets. Inventories remain unchanged.');
    const piece = state.pieces.find(p => p.id === action.pieceId);
    if (!piece) return no('Unknown piece instance.', 'piece.unknown');
    if (action.type === 'move') {
      if (piece.carrierId !== null) return no('This item is carried; move its carrier or unload it.', 'piece.carried');
      if (action.to === piece.cell) return no('The piece is already here.', 'destination.unchanged');
      const reason = this.occupancyReason(state, piece, action.to); if (reason) return no(`No legal route: ${reason}`, 'destination.unavailable');
      const route = this.reachable(state, piece.id).get(action.to);
      return route ? yes(`Move for ${route.cost} points; ${piece.movement-route.cost} remain.`, route.cost, route.path) : no('No legal route within this piece’s remaining movement budget.', 'movement.unreachable');
    }
    if (action.type === 'hold') return yes('Hold position and spend the remaining movement budget.', piece.movement);
    if (action.type === 'load') {
      const carrier = state.pieces.find(p => p.id === action.carrierId);
      if (!carrier || carrier.id === piece.id || carrier.carrierId !== null || carrier.cell === null) return no('Choose an independently deployed carrier.', 'carrier.invalid');
      if (piece.carrierId !== null || piece.cell === null) return no('The item is already carried.', 'piece.carried');
      if (piece.force !== carrier.force) return no('The laboratory transfers equipment within the same force.', 'cargo.force-mismatch');
      if (this.cargoUsed(state, piece.id)) return no('Unload this carrier before transporting it. Nested cargo is unsupported.', 'cargo.nested');
      const cp = this.profile(carrier), def = this.definition(piece.definitionId);
      if (cp.cargoSlots === 0) return no('This profile has no cargo capacity.', 'cargo.unsupported');
      // Vehicle transport belongs to maritime transport profiles. Other carriers handle parts/towed equipment.
      if (def.kind === 'platform' && this.profile(piece).id !== 'towed' && !['sea-transport','landing-craft'].includes(cp.id)) return no('This laboratory carrier accepts equipment items and towed equipment only.', 'cargo.class-mismatch');
      if (def.kind === 'platform' && ['air','subsurface'].includes(this.profile(piece).layer)) return no('Aircraft and submarines are not cargo in this laboratory.', 'cargo.class-mismatch');
      if (def.kind === 'platform' && ['surface-vessel','sea-transport','landing-craft'].includes(this.profile(piece).id)) return no('Vessels are not cargo in this laboratory.', 'cargo.class-mismatch');
      if (this.cargoUsed(state, carrier.id) + def.loadSlots > cp.cargoSlots) return no('There are not enough free cargo slots.', 'cargo.capacity');
      if (carrier.movement < 1) return no('The carrier needs one movement point for loading.', 'cargo.movement-budget');
      if (piece.cell !== carrier.cell && !this.neighbors(state, carrier.cell).includes(piece.cell)) return no('Move the carrier beside the item before loading.', 'cargo.distance');
      const reason = this.policy?.transferReason(piece, carrier, piece.cell); if (reason) return no(reason, 'cargo.transfer-terrain');
      return yes(`Load ${def.loadSlots} slots; carrier spends 1 point.`, 1);
    }
    if (action.type === 'unload') {
      const carrier = state.pieces.find(p => p.id === piece.carrierId);
      if (!carrier || carrier.cell === null) return no('This item has no deployed carrier.', 'carrier.invalid');
      if (carrier.movement < 1) return no('The carrier needs one movement point for unloading.', 'cargo.movement-budget');
      if (action.to !== carrier.cell && !this.neighbors(state, carrier.cell).includes(action.to)) return no('Choose the carrier’s cell or an adjacent cell.', 'cargo.distance');
      const occupancy = this.occupancyReason(state, piece, action.to); if (occupancy) return no(occupancy, 'destination.unavailable');
      const reason = this.policy?.transferReason(piece, carrier, action.to); if (reason) return no(reason, 'cargo.transfer-terrain');
      return yes('Unload the item; carrier spends 1 point. The item can move next turn.', 1);
    }
    return no('Unsupported laboratory action.', 'action.unsupported');
  }
  apply(state: LabState, action: LabAction): LabState {
    const result = this.evaluate(state, action);
    if (!result.allowed) throw new Error(result.reason);
    const next = structuredClone(state);
    if (action.type === 'advance') { next.turn++; next.pieces.forEach(p => { p.movement = p.carrierId ? 0 : this.profile(p).movement; }); }
    else {
      const piece = next.pieces.find(p => p.id === action.pieceId)!;
      if (action.type === 'move') { piece.cell = action.to; piece.movement -= result.cost; }
      if (action.type === 'hold') piece.movement = 0;
      if (action.type === 'load') {
        const carrier = next.pieces.find(p => p.id === action.carrierId)!;
        carrier.movement -= result.cost; piece.cell = null; piece.carrierId = carrier.id; piece.movement = 0;
      }
      if (action.type === 'unload') {
        const carrier = next.pieces.find(p => p.id === piece.carrierId)!;
        carrier.movement -= result.cost; piece.carrierId = null; piece.cell = action.to; piece.movement = 0;
      }
    }
    next.revision++;
    next.events.push({ revision: next.revision, action: structuredClone(action), explanation: result.reason });
    return next;
  }
}
