/** Adapt existing cartographic maps without replacing their IDs or classifications. */
import { buildMap, REGIONS, keyOf } from '../pacific/terrain.ts';
import type { Geography, TerrainMap, Cell } from '../pacific/terrain.ts';
import { buildTerrain, SOURCE } from '../centcom/terrain.ts';
import { REGIONS as CENTCOM } from '../centcom/regions.ts';

export const DEFAULT_MAP = 'taiwan-senkaku/focus';
export function scenarioMaps(geography: { regional: Geography; shoal: Geography; senkaku: Geography }) {
  const maps = new Map<string, TerrainMap>();
  for (const [i, region] of REGIONS.entries()) for (const view of [region.overview, region.focus]) {
    const detail = i === 0 ? geography.shoal : geography.senkaku;
    const map = buildMap(region, view, view.id === 'focus' ? detail : geography.regional, view.id === 'focus' ? [] : [detail]);
    maps.set(map.id, map);
  }
  for (const region of CENTCOM) {
    const original = buildTerrain(region);
    // CENTCOM's positive r points north; transform axial coordinates for the shared south-r renderer.
    const cells: Cell[] = original.tiles.map(t => ({
      id: t.id, q: t.q + t.r, r: -t.r, x: t.xKm, z: -t.yKm, center: [...t.center],
      terrain: t.terrain === 'coast' ? 'coast' : ['land', 'upland'].includes(t.terrain) ? 'land' : 'ocean',
      containsLand: ['land', 'upland', 'coast'].includes(t.terrain), containsReef: false,
      landmarkIds: [], elevationM: null, depthM: null,
    }));
    const view = { id: 'overview' as const, center: [...region.origin] as [number, number], widthKm: original.widthKm, heightKm: original.heightKm, hexKm: region.spacingKm };
    const map: TerrainMap = {
      id: region.id, version: `${original.schema}/${region.version}`, geographyVersion: SOURCE.archiveSha256,
      region: { id: region.id, name: region.title, subtitle: region.subtitle, focusName: region.title, overview: view, focus: { ...view, id: 'focus' }, landmarks: [] },
      view, cells, byKey: new Map(cells.map(c => [keyOf(c), c])), landmarks: [], sources: [],
    };
    maps.set(map.id, map);
  }
  return maps;
}
