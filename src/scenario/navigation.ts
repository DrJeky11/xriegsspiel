import { neighbors } from '../pacific/terrain.ts';
import type { Cell, TerrainMap } from '../pacific/terrain.ts';

/** Shared surface-vessel policy. Source terrain remains unchanged. */
export function vesselTerrainReason(cell: Cell, landingCraft = false): string | null {
  if (cell.containsReef || cell.terrain === 'reef' || cell.terrain === 'lagoon') return 'Reef and lagoon surface travel is excluded: depth and passages are unknown. Air may overfly.';
  if (cell.terrain === 'ocean' || landingCraft && cell.terrain === 'coast') return null;
  return landingCraft ? 'Landing craft use ocean or mixed coast; inland land is excluded.' : 'This vessel uses open-water hexes only. Coast is mixed; clearance is unknown.';
}
export interface NavigationCell { id: string; q: number; r: number; x: number; z: number; neighbors: string[] }
export interface NavigationBoard {
  mapId: string; mapVersion: string; geographyVersion: string; sourceHashes: string[]; hexKm: number;
  cells: NavigationCell[]; landmarks: { id: string; name: string; tileId: string; q: number; r: number }[];
}
export function vesselBoard(map: TerrainMap): NavigationBoard {
  const water = new Set(map.cells.filter(c => !vesselTerrainReason(c)).map(c => c.id));
  return { mapId: map.id, mapVersion: map.version, geographyVersion: map.geographyVersion, sourceHashes: map.sources.map(s => s.sha256).sort(), hexKm: map.view.hexKm,
    cells: map.cells.filter(c => water.has(c.id)).map(c => ({ id: c.id, q: c.q, r: c.r, x: c.x, z: c.z, neighbors: neighbors(map, c).filter(n => water.has(n.id)).map(n => n.id).sort() })),
    landmarks: map.landmarks.flatMap(l => { const c = map.cells.find(c => c.landmarkIds.includes(l.id)); return c ? [{ id: l.id, name: l.name, tileId: c.id, q: c.q, r: c.r }] : []; }),
  };
}
export interface Route { cost: number; path: string[] }
export function waterRoutes(cells: Map<string, NavigationCell>, start: string, budget: number, occupied = new Set<string>()): Map<string, Route> {
  const routes = new Map<string, Route>([[start, { cost: 0, path: [start] }]]), queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const at = queue[index], route = routes.get(at)!; if (route.cost >= budget) continue;
    for (const next of cells.get(at)?.neighbors ?? []) {
      if (occupied.has(next) || routes.has(next)) continue;
      routes.set(next, { cost: route.cost + 1, path: [...route.path, next] }); queue.push(next);
    }
  }
  return routes;
}
