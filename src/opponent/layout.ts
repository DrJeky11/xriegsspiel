import type { TerrainMap, Cell } from '../pacific/terrain.ts';
import type { Observation } from './types.ts';
import type { TablePiece } from '../play/piece-layer.ts';

/** A labeled conceptual overlay. Placement never invents tracks, safe channels or hex movement rules. */
export function scenarioLayout(map: TerrainMap, observation: Observation, selected: string | null) {
  if (observation.geography) {
    const cells = new Map(map.cells.map(c => [c.id, c]));
    const anchors = new Map(observation.geography.goals.map(g => [g.id, cells.get(g.anchor)!]));
    const pieces: TablePiece[] = observation.geography.goals.filter(g=>g.id!=='Approach').map(g => ({ id: `sector:${g.id}`, tileId: g.anchor, force: 'blue', sideLabel: 'Objective area', symbol: '◇', name: g.id==='Outpost'?'Sierra Madre':g.label, areaTiles: g.tileIds, model: 'equipment', selected: false, cargo: 0, layer: 'surface', labelOnly: true }));
    const assetTiles = new Map<string, string>();
    for (const a of observation.assets.filter(a => a.tileId)) {
      assetTiles.set(a.id, a.tileId!);
      pieces.push({ id: a.id, tag: a.id, tileId: a.tileId!, force: a.side, sideLabel: observation.scenario.actors[a.side], symbol: a.id, name: `${a.name}${a.ready ? '' : ' · unavailable'}`, model: a.kind === 'rescue' ? 'landing' : 'ship', selected: a.id === selected, cargo: a.cargo.length, layer: 'surface' });
    }
    return { anchors, pieces, assetTiles };
  }
  const sectors = observation.sectors, anchors = new Map<string, Cell>(), occupied = new Set<string>();
  const xs = map.cells.map(c => c.x), zs = map.cells.map(c => c.z);
  const width = Math.max(...xs) - Math.min(...xs), depth = Math.max(...zs) - Math.min(...zs);
  const nearest = (x: number, z: number) => [...map.cells].filter(c => !occupied.has(c.id)).sort((a, b) => (a.x - x) ** 2 + (a.z - z) ** 2 - (b.x - x) ** 2 - (b.z - z) ** 2)[0];
  sectors.forEach((sector, i) => {
    let x = ((i / (sectors.length - 1)) - .5) * width * .52, z = depth * .12;
    if (observation.scenario.id === 'BAB-F01') { x = (Math.min(i, 2) - 1) * width * .25; z = i === 3 ? -depth * .2 : depth * .12; if (i === 3) x = 0; }
    if (sector === 'Outpost') {
      const landmark = map.landmarks.find(l => /sierra/i.test(l.id + l.name));
      if (landmark) { const cell = map.cells.find(c => c.landmarkIds.includes(landmark.id)); if (cell) { x = cell.x; z = cell.z; } }
    }
    const cell = nearest(x, z); occupied.add(cell.id); anchors.set(sector, cell);
  });
  const pieces: TablePiece[] = sectors.map(sector => ({ id: `sector:${sector}`, tileId: anchors.get(sector)!.id, force: 'blue', sideLabel: 'Abstract sector', symbol: '◇', name: sector, model: 'equipment', selected: false, cargo: 0, layer: 'surface', labelOnly: true }));
  const assetTiles = new Map<string, string>();
  for (const asset of observation.assets.filter(a => anchors.has(a.sector))) {
    const anchor = anchors.get(asset.sector)!;
    const cell = nearest(anchor.x, anchor.z + map.view.hexKm * 2);
    occupied.add(cell.id); assetTiles.set(asset.id, cell.id);
    pieces.push({ id: asset.id, tileId: cell.id, force: asset.side, sideLabel: observation.scenario.actors[asset.side], symbol: '⚓', name: `${asset.name} · ${asset.sector}${asset.ready ? '' : ' · unavailable'}`, model: asset.kind === 'rescue' ? 'landing' : 'ship', selected: asset.id === selected, cargo: asset.cargo.length, layer: 'surface' });
  }
  return { anchors, pieces, assetTiles };
}
