import { hexDistance } from '../pacific/terrain.ts';
import { vesselBoard, waterRoutes } from '../scenario/navigation.ts';
import type { TerrainMap } from '../pacific/terrain.ts';
import type { NavigationBoard, NavigationCell } from '../scenario/navigation.ts';
import type { Asset, Game, GeographicSetup, Observation } from './types.ts';
import { scenario, specification } from './content.ts';

const boards = new Map<string, NavigationBoard>();
const indexes = new Map<string, Map<string, NavigationCell>>();
const fields = new Map<string, Map<string, number>>();
export function installNavigation(board: NavigationBoard) {
  boards.set(board.mapId, board); indexes.set(board.mapId, new Map(board.cells.map(c => [c.id, c])));
  for (const key of fields.keys()) if (key.startsWith(board.mapId + ':')) fields.delete(key);
}
export function installOpponentMaps(maps: Map<string, TerrainMap>) { for (const map of maps.values()) installNavigation(vesselBoard(map)); }
export function hasNavigation(id: string) { return boards.has(id); }
export function navigation(id: string) { const board = boards.get(id); if (!board) throw new Error('The pinned scenario terrain is unavailable.'); return board; }
export function cellsFor(id: string) { navigation(id); return indexes.get(id)!; }
export function assertGeography(setup: GeographicSetup) {
  const board = navigation(setup.mapId);
  if (board.mapVersion !== setup.mapVersion || board.geographyVersion !== setup.geographyVersion || JSON.stringify(board.sourceHashes) !== JSON.stringify(setup.sourceHashes)) throw new Error('This exercise requires its original map and geography versions.');
}
export function distances(mapId: string, destinations: string[]): Map<string, number> {
  const key = mapId + ':' + [...destinations].sort().join('|');
  const cached = fields.get(key); if (cached) return cached;
  const cells = cellsFor(mapId), result = new Map<string, number>(), queue = destinations.filter(id => cells.has(id));
  for (const id of queue) result.set(id, 0);
  for (let i = 0; i < queue.length; i++) for (const n of cells.get(queue[i])!.neighbors) if (!result.has(n)) { result.set(n, result.get(queue[i])! + 1); queue.push(n); }
  // Goal and ship distance fields are bounded independently of the number of matches played.
  if (fields.size > 256) fields.delete(fields.keys().next().value!);
  fields.set(key, result); return result;
}
export function goal(setup: GeographicSetup, id: string) { const value = setup.goals.find(g => g.id === id); if (!value) throw new Error('Unknown geographic objective: ' + id); return value; }
export function atGoal(setup: GeographicSetup, asset: Asset, id: string) { return !!asset.tileId && goal(setup, id).tileIds.includes(asset.tileId); }
export function goalDistance(setup: GeographicSetup, tileId: string | null | undefined, id: string) { return tileId ? distances(setup.mapId, goal(setup, id).tileIds).get(tileId) ?? 999 : 999; }
export function separation(setup: GeographicSetup, a: string | null | undefined, b: string | null | undefined) {
  return a && b ? distances(setup.mapId, [a]).get(b) ?? 999 : 999;
}
export function geographicRoutes(state: Pick<Game | Observation, 'assets' | 'geography'>, asset: Asset) {
  const setup = state.geography!;
  return waterRoutes(cellsFor(setup.mapId), asset.tileId!, asset.movement ?? setup.movement, new Set(state.assets.filter(a => a.id !== asset.id && a.tileId).map(a => a.tileId!)));
}
export function tileLabel(mapId: string, tileId: string) {
  const cell = cellsFor(mapId).get(tileId); if (!cell) return tileId;
  // CENTCOM displays its native north-positive axial coordinates.
  const [q, r] = mapId.includes('/') ? [cell.q, cell.r] : [cell.q + cell.r, -cell.r];
  return `${q}, ${r}`;
}

/** Authored starting positions on the existing water graph, never fabricated navigation channels. */
export function geographicSetup(id: string): { setup: GeographicSetup; positions: Record<string, string> } {
  const s = scenario(id), board = navigation(s.mapId), cells = cellsFor(s.mapId), spec = specification(id);
  let component: NavigationCell[] = [];
  const unseen = new Set(cells.keys());
  while (unseen.size) {
    const connected = [...distances(s.mapId, [unseen.values().next().value!]).keys()];
    for (const key of connected) unseen.delete(key);
    if (connected.length > component.length) component = connected.map(key => cells.get(key)!);
  }
  const nearest = (q: number, r: number) => [...component].sort((a,b) => hexDistance(a,{q,r})-hexDistance(b,{q,r}) || a.id.localeCompare(b.id))[0];
  const landmark = board.landmarks.find(l => /sierra/i.test(l.id + l.name)) ?? board.landmarks.find(l => l.id === 'uotsuri');
  const center = nearest(landmark?.q ?? 0, landmark?.r ?? 0);
  const chooseAt = (origin: NavigationCell, distance: number, dx: number, dz: number) => {
    const field = distances(s.mapId, [origin.id]);
    return [...component].filter(c => field.get(c.id) === distance).sort((a,b) => ((b.x-origin.x)*dx+(b.z-origin.z)*dz)-((a.x-origin.x)*dx+(a.z-origin.z)*dz) || a.id.localeCompare(b.id))[0] ?? origin;
  };
  const anchors = new Map<string, NavigationCell>();
  if (id.startsWith('SPR')) { anchors.set('Outpost', center); anchors.set('Approach', chooseAt(center,3,1,0)); anchors.set('Staging', chooseAt(center,7,1,0)); }
  else if (id === 'SEN-H01') { anchors.set('Incident',center); anchors.set('Review',chooseAt(center,7,-1,0)); anchors.set('Exit',chooseAt(center,10,-1,0)); }
  else if (id === 'SEN-F01') { anchors.set('Casualty',center); anchors.set('East Staging',chooseAt(center,6,1,0)); anchors.set('West Staging',chooseAt(center,6,-1,0)); }
  else if (id.startsWith('HOR')) {
    anchors.set('Gate', center); anchors.set(id==='HOR-H01'?'Eastern Approach':'Holding',chooseAt(center,5,1,.3));
    anchors.set(id==='HOR-H01'?'Western Exit':'Exit',chooseAt(center,5,-1,-.3));
    if (id==='HOR-F01') anchors.set('Approach',chooseAt(center,2,1,.3));
  } else {
    anchors.set(id==='BAB-H01'?'Casualty':'Gate',center); anchors.set('Southern Staging',chooseAt(center,5,0,1)); anchors.set('Northern Exit',chooseAt(center,5,0,-1));
    if(id==='BAB-F01')anchors.set('Distress',chooseAt(center,3,1,0));
  }
  const goals = spec.sectors.map(name => {
    const anchor = anchors.get(name)!;
    const candidates = component.filter(c => hexDistance(c, anchor)<=1).sort((a,b)=>a.id.localeCompare(b.id));
    return {id:name,label:id.startsWith('SPR')&&name==='Outpost'?'Sierra Madre transfer area':name,tileIds:candidates.map(c=>c.id),anchor:id.startsWith('SPR')&&name==='Outpost'&&landmark?landmark.tileId:anchor.id};
  });
  const setup: GeographicSetup = {version:'maritime-geography/1',mapId:board.mapId,mapVersion:board.mapVersion,geographyVersion:board.geographyVersion,sourceHashes:[...board.sourceHashes],goals,movement:4,patrolMovement:4,interceptRange:1};
  const positions: Record<string,string> = {}, used = new Set<string>();
  for (const a of spec.roster) {
    let anchor = anchors.get(a.sector) ?? center;
    if(a.kind==='staff')anchor=chooseAt(center,3,a.id==='R1'?1:-1,a.id==='R1'?-1:1);
    const ordered = [...component].sort((x,y) => hexDistance(x,anchor)-hexDistance(y,anchor) || x.id.localeCompare(y.id));
    const cell = ordered.find(c=>!used.has(c.id))!; positions[a.id]=cell.id; used.add(cell.id);
  }
  return {setup,positions};
}
