import { PieceLab } from '../pieces.ts';
import type { Force, Piece, PieceCatalog, PieceRules, LabState, LabAction, Evaluation } from '../pieces.ts';
import { neighbors, hexDistance } from '../pacific/terrain.ts';
import type { TerrainMap } from '../pacific/terrain.ts';
import { DEFAULT_MAP } from './maps.ts';

export const SCENARIO_VERSION = 'geographic-tabletop/0.1.0';
export const RULES_VERSION = 'geographic-movement/0.1.0';
export const SAVE_SCHEMA = 'xriegsspiel-geographic-save/1';
export const MAX_PIECES = 200;
export interface Manifest {
  scenarioVersion: string; rulesVersion: string; catalogVersion: string; equipmentVersion: string;
  profileVersion: string; mapId: string; mapVersion: string; geographyVersion: string; sourceHashes: string[];
}
export interface ScenarioPiece extends Omit<Piece, 'cell'> { tileId: string | null }
export interface Setup { mapId: string; year: number; demo: boolean }
export type Action = { type: 'deploy'; definitionId: string; force: Force; tileId: string; id: string }
  | { type: 'move'; pieceId: string; tileId: string }
  | { type: 'unload'; pieceId: string; tileId: string }
  | { type: 'load'; pieceId: string; carrierId: string }
  | { type: 'hold'; pieceId: string } | { type: 'advance' };
export interface Event { revision: number; turn: number; action: Action; explanation: string }
export interface Exercise {
  manifest: Manifest; setup: Setup; year: number; turn: number; revision: number;
  pieces: ScenarioPiece[]; events: Event[];
}
export interface Preview extends Omit<Evaluation, 'path'> { path: string[] }
export interface Save { schema: string; exercise: Exercise }
// Authored demonstration, never an order of battle. Stable variants, individually identified instances.
export const DEMO = [
  { force: 'blue', definitionId: 'piece-318957732468f616f5ad6c99ddeeaa0f', label: 'M1A2', role: 'ground' },
  { force: 'blue', definitionId: 'piece-a233a164a7e4be4d8b13515744a6c4e3', label: 'LCM-8', role: 'sea' },
  { force: 'blue', definitionId: 'piece-55b3c2f25e937237b37628305ba31f9c', label: 'UH-60L', role: 'air' },
  { force: 'blue', definitionId: 'piece-5cbf63b6529babac54a1b1ae41463e0b', label: 'M2', role: 'item' },
  { force: 'red', definitionId: 'piece-b5fb02473e4ecb7afe98d40264f66a3f', label: 'ZTZ-96', role: 'ground' },
  { force: 'red', definitionId: 'piece-e28eda08341b5085d5d9cda38c500907', label: 'Type 072A', role: 'sea' },
  { force: 'red', definitionId: 'piece-665e08f1f03808795b6e98d30b9eac5d', label: 'Z-9', role: 'air' },
] as const;
const ships = new Set(['surface-vessel', 'sea-transport', 'landing-craft', 'submarine']);
const amphibious = (id: string) => id.startsWith('amphibious-');
export function symbol(profileId: string, layer: string) {
  return layer === 'inventory' ? '▧' : layer === 'air' ? '✈' : ships.has(profileId) ? '⚓' : '▰';
}
export function validAction(value: unknown): value is Action {
  if (!value || typeof value !== 'object') return false;
  const a = value as Record<string, unknown>;
  const str = (key: string) => typeof a[key] === 'string' && (a[key] as string).length > 0 && (a[key] as string).length <= 250;
  switch (a.type) {
    case 'advance': return true;
    case 'deploy': return str('definitionId') && str('id') && str('tileId') && ['red', 'blue'].includes(a.force as string);
    case 'move': case 'unload': return str('pieceId') && str('tileId');
    case 'load': return str('pieceId') && str('carrierId');
    case 'hold': return str('pieceId');
    default: return false;
  }
}
export class GeographicRules {
  readonly catalog: PieceCatalog;
  readonly profiles: PieceRules;
  readonly maps: Map<string, TerrainMap>;
  readonly lab: PieceLab;
  private adapters = new Map<string, { lab: PieceLab; index: Map<string, number> }>();
  constructor(catalog: PieceCatalog, profiles: PieceRules, maps: Map<string, TerrainMap>) {
    this.catalog = catalog; this.profiles = profiles; this.maps = maps; this.lab = new PieceLab(catalog, profiles);
  }
  map(id: string) { const m = this.maps.get(id); if (!m) throw new Error('Unknown geographic map.'); return m; }
  manifest(mapId: string): Manifest {
    const m = this.map(mapId);
    return { scenarioVersion: SCENARIO_VERSION, rulesVersion: RULES_VERSION, catalogVersion: this.catalog.version,
      equipmentVersion: this.catalog.equipmentVersion, profileVersion: this.profiles.version,
      mapId: m.id, mapVersion: m.version, geographyVersion: m.geographyVersion, sourceHashes: m.sources.map(s => s.sha256).sort() };
  }
  assertVersion(state: Exercise) {
    if (!state?.manifest || JSON.stringify(state.manifest) !== JSON.stringify(this.manifest(state.manifest.mapId))) throw new Error('Incompatible scenario, map, geography, catalog or rules version. Keep the save for its matching build.');
  }
  eligibility(id: string, force: Force, year: number) {
    const base = this.lab.eligibility(id, force, year);
    // Reviewed variant mismatch: ODIN's 1979 applies to UH-60A/family, not UH-60L production.
    if (base.allowed && id === DEMO[2].definitionId && year < 1989) return { allowed: false, reason: 'UH-60L variant review: production began in 1989; ODIN’s 1979 is a family/A-model date.' };
    return { ...base, reason: base.allowed ? 'Eligible using provisional operator/introduction evidence; exact service intervals and retirement remain unknown.' : base.reason };
  }
  private adapter(mapId: string) {
    const cached = this.adapters.get(mapId); if (cached) return cached;
    const map = this.map(mapId), index = new Map(map.cells.map((c, i) => [c.id, i]));
    const lab = new PieceLab(this.catalog, this.profiles);
    lab.policy = {
      neighbors: i => neighbors(map, map.cells[i]).map(c => index.get(c.id)!),
      terrainReason: (p, i) => {
        const cell = map.cells[i], profile = lab.profile(p);
        if (profile.layer === 'air') return null;
        if (cell.containsReef || cell.terrain === 'reef' || cell.terrain === 'lagoon') return 'Reef and lagoon surface travel is excluded: depth and passages are unknown. Air may overfly.';
        if (ships.has(profile.id)) {
          if (cell.terrain === 'ocean' || (profile.id === 'landing-craft' && cell.terrain === 'coast')) return null;
          return profile.id === 'landing-craft' ? 'Landing craft use ocean or mixed coast; inland land is excluded.' : 'This vessel uses open-water hexes only. Coast is mixed; clearance is unknown.';
        }
        if (cell.terrain === 'land' || cell.terrain === 'coast') return null;
        return amphibious(profile.id) ? null : 'Ground pieces require land or a mixed coast hex. Use a carrier to cross water.';
      },
      cost: (p, from, to) => {
        const profile = lab.profile(p), a = map.cells[from], b = map.cells[to];
        if (profile.layer === 'air') return 1;
        if (ships.has(profile.id)) return b.terrain === 'coast' ? 2 : 1;
        if (amphibious(profile.id) && (a.terrain === 'ocean' || b.terrain === 'ocean' || (a.terrain === 'coast' && b.terrain === 'coast'))) return 3;
        // A mixed hex is no evidence of a continuous land bridge between small islands.
        if (a.terrain === 'coast' && b.terrain === 'coast') return null;
        return profile.costs.plain;
      },
      transferReason: (_piece, carrier, itemCell) => {
        const cp = lab.profile(carrier), shore = map.cells[itemCell], at = map.cells[carrier.cell!];
        if (cp.layer === 'air') return carrier.cell === itemCell && ['land', 'coast'].includes(shore.terrain) ? null : 'Air loading/unloading requires the same land or coast hex; no airborne or adjacent-hex transfers.';
        if (ships.has(cp.id)) return shore.terrain === 'coast' ? null : 'Maritime loading/unloading requires a mixed coast hex beside the carrier (or its own coastal hex).';
        if (!['land', 'coast'].includes(at.terrain) || !['land', 'coast'].includes(shore.terrain)) return 'Ground cargo transfers require land/coast on both ends.';
        if (at.id !== shore.id && at.terrain === 'coast' && shore.terrain === 'coast') return 'Adjacent mixed coast hexes do not establish a land connection for cargo transfer.';
        return null;
      },
    };
    const result = { lab, index }; this.adapters.set(mapId, result); return result;
  }
  private labState(state: Exercise): LabState {
    const { index } = this.adapter(state.manifest.mapId), map = this.map(state.manifest.mapId);
    return { catalogVersion: this.catalog.version, rulesVersion: this.profiles.version, year: state.year,
      board: { width: map.cells.length, height: 1, cells: map.cells.map(c => c.terrain === 'ocean' ? 'water' : 'plain') },
      turn: state.turn, revision: state.revision, events: [],
      pieces: state.pieces.map(({ tileId, ...p }) => ({ ...p, cell: tileId === null ? null : index.get(tileId) ?? -1 })),
    };
  }
  private action(state: Exercise, action: Exclude<Action, { type: 'deploy' }>): LabAction {
    return action.type === 'move' || action.type === 'unload' ? { type: action.type, pieceId: action.pieceId, to: this.adapter(state.manifest.mapId).index.get(action.tileId) ?? -1 } : action;
  }
  create(setup: Setup = { mapId: DEFAULT_MAP, year: 2026, demo: true }): Exercise {
    if (!setup || typeof setup.demo !== 'boolean' || !Number.isInteger(setup.year) || setup.year < 1980 || setup.year > 2026) throw new Error('Choose a scenario year from 1980 through 2026.');
    let state: Exercise = { manifest: this.manifest(setup.mapId), setup: structuredClone(setup), year: setup.year, turn: 1, revision: 0, pieces: [], events: [] };
    if (!setup.demo) return state;
    const map = this.map(setup.mapId);
    // Deterministic coastal staging areas. No real deployment locations or sovereignty assertions.
    const coast = map.cells.filter(c => c.terrain === 'coast' && !c.containsReef && neighbors(map, c).some(n => n.terrain === 'ocean'));
    const uotsuri = map.cells.find(c => c.landmarkIds.includes('uotsuri'));
    const anchor = uotsuri ?? map.byKey.get('0,0') ?? map.cells[0];
    coast.sort((a, b) => hexDistance(a, anchor) - hexDistance(b, anchor) || a.id.localeCompare(b.id));
    const staging = [coast[0], coast.find(c => coast[0] && hexDistance(c, coast[0]) >= 4) ?? coast[1]];
    for (const [i, demo] of DEMO.entries()) {
      if (!this.eligibility(demo.definitionId, demo.force, setup.year).allowed) continue;
      const near = staging[demo.force === 'blue' ? 0 : 1];
      if (!near && demo.role !== 'air') continue;
      const ordered = [...map.cells].sort((a, b) => hexDistance(a, near ?? anchor) - hexDistance(b, near ?? anchor) || a.id.localeCompare(b.id));
      for (const tile of ordered) {
        if ((demo.role === 'ground' || demo.role === 'item') && tile.id !== near?.id) continue;
        if (demo.role === 'sea' && (tile.terrain !== 'ocean' || hexDistance(tile, near!) !== 1)) continue;
        const action: Action = { type: 'deploy', definitionId: demo.definitionId, force: demo.force, tileId: tile.id, id: `${demo.force === 'blue' ? 'B' : 'R'}-${String(i + 1).padStart(2, '0')}` };
        if (this.evaluate(state, action).allowed) { state = this.apply(state, action); break; }
      }
    }
    return state;
  }
  reachable(state: Exercise, pieceId: string) {
    this.assertVersion(state);
    const map = this.map(state.manifest.mapId), { lab } = this.adapter(map.id);
    return new Map([...lab.reachable(this.labState(state), pieceId)].map(([i, route]) => [map.cells[i].id, { cost: route.cost, path: route.path.map(n => map.cells[n].id) }]));
  }
  cargoUsed(state: Exercise, carrierId: string) { return this.lab.cargoUsed(this.labState(state), carrierId); }
  evaluate(state: Exercise, action: Action): Preview {
    this.assertVersion(state);
    if (!validAction(action)) return { allowed: false, reason: 'Malformed geographic action.', cost: 0, path: [] };
    const { lab, index } = this.adapter(state.manifest.mapId), current = this.labState(state), map = this.map(state.manifest.mapId);
    try {
      if (action.type === 'deploy') {
        if (state.pieces.length >= MAX_PIECES) throw new Error(`This tabletop supports at most ${MAX_PIECES} instances.`);
        const eligible = this.eligibility(action.definitionId, action.force, state.year); if (!eligible.allowed) throw new Error(eligible.reason);
        lab.deploy(current, action.definitionId, action.force, index.get(action.tileId) ?? -1, action.id);
        return { allowed: true, reason: 'Place one instance with a fresh authored movement budget. Assembly remains available during the exercise.', cost: 0, path: [action.tileId] };
      }
      const result = lab.evaluate(current, this.action(state, action));
      return { ...result, reason: action.type === 'advance' ? 'Start the next planning turn; refresh movement and retain every piece and cargo item. No fixed elapsed time is modeled.' : result.reason, path: result.path.map(i => map.cells[i].id) };
    } catch (error) { return { allowed: false, reason: error instanceof Error ? error.message : 'Action rejected.', cost: 0, path: [] }; }
  }
  apply(state: Exercise, action: Action): Exercise {
    const preview = this.evaluate(state, action); if (!preview.allowed) throw new Error(preview.reason);
    const { lab, index } = this.adapter(state.manifest.mapId), map = this.map(state.manifest.mapId), current = this.labState(state);
    const result = action.type === 'deploy' ? lab.deploy(current, action.definitionId, action.force, index.get(action.tileId)!, action.id) : lab.apply(current, this.action(state, action));
    return { ...structuredClone(state), turn: result.turn, revision: state.revision + 1,
      pieces: result.pieces.map(({ cell, ...p }) => ({ ...p, tileId: cell === null ? null : map.cells[cell].id })),
      events: [...state.events, { revision: state.revision + 1, turn: state.turn, action: structuredClone(action), explanation: preview.reason }],
    };
  }
  export(state: Exercise): Save { const save = { schema: SAVE_SCHEMA, exercise: structuredClone(state) }; this.import(save); return save; }
  import(value: unknown): Exercise {
    if (!value || typeof value !== 'object' || (value as Save).schema !== SAVE_SCHEMA) throw new Error('This is not a geographic exercise save.');
    const saved = (value as Save).exercise;
    this.assertVersion(saved);
    if (!saved.setup || saved.setup.mapId !== saved.manifest.mapId || saved.year !== saved.setup.year || !Array.isArray(saved.events) || saved.events.length > 20000) throw new Error('Invalid saved setup or history.');
    // Replay from an empty setup: demonstration placements are already explicit history events.
    let replay = this.create({ ...saved.setup, demo: false }); replay.setup = structuredClone(saved.setup);
    for (const event of saved.events) {
      if (!validAction(event?.action)) throw new Error('Malformed saved action.');
      replay = this.apply(replay, event.action);
    }
    if (JSON.stringify(replay) !== JSON.stringify(saved)) throw new Error('Saved state or history differs from deterministic journal replay. Import rejected.');
    return replay;
  }
}
