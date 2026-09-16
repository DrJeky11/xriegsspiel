import coastlines from './coastlines.json' with { type: 'json' };
import type { Bounds, LonLat, Region } from './regions.ts';

export const TERRAIN_SCHEMA = 'xriegsspiel/hex-terrain/1';
export const SOURCE = coastlines.source;
export type Hex = { q: number; r: number };
export type TerrainKind = 'water' | 'coastal-water' | 'coast' | 'land' | 'upland';
export interface Tile extends Hex {
  id: string;
  center: LonLat;
  xKm: number;
  yKm: number;
  terrain: TerrainKind;
  centerSurface: 'land' | 'water';
  landSamples: number;
  sampleCount: number;
  containsCoastline: boolean;
  relief: number;
  elevationM: null;
  depthM: null;
}
export interface TerrainMap {
  schema: string;
  region: Region;
  tiles: Tile[];
  byAxial: Map<string, Tile>;
  widthKm: number;
  heightKm: number;
}
const KM_PER_DEGREE = Math.PI * 6371.0088 / 180;
export const axialKey = ({ q, r }: Hex) => `${q},${r}`;
export function project([lon, lat]: LonLat, origin: LonLat): [number, number] {
  return [(lon - origin[0]) * KM_PER_DEGREE * Math.cos(origin[1] * Math.PI / 180), (lat - origin[1]) * KM_PER_DEGREE];
}
export function unproject([x, y]: readonly [number, number], origin: LonLat): LonLat {
  return [origin[0] + x / (KM_PER_DEGREE * Math.cos(origin[1] * Math.PI / 180)), origin[1] + y / KM_PER_DEGREE];
}
export function hexCenter({ q, r }: Hex, spacing: number): [number, number] {
  return [spacing * (q + r / 2), spacing * Math.sqrt(3) / 2 * r];
}
export function hexAt([x, y]: readonly [number, number], spacing: number): Hex {
  const r = y / (spacing * Math.sqrt(3) / 2), q = x / spacing - r / 2;
  let rx = Math.round(q), rz = Math.round(r), ry = Math.round(-q - r);
  const dx = Math.abs(rx - q), dz = Math.abs(rz - r), dy = Math.abs(ry + q + r);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy > dz) ry = -rx - rz;
  else rz = -rx - ry;
  return { q: rx || 0, r: rz || 0 };
}
export function neighbors({ q, r }: Hex): Hex[] {
  return [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]].map(([dq, dr]) => ({ q: q + dq, r: r + dr }));
}
export function hexDistance(a: Hex, b: Hex): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
}
export function hexCorners(hex: Hex, spacing: number): [number, number][] {
  const [x, y] = hexCenter(hex, spacing), radius = spacing / Math.sqrt(3);
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (30 + i * 60) * Math.PI / 180;
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  });
}
function inRing([x, y]: LonLat, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function boundsOf(ring: number[][]): Bounds {
  return [Math.min(...ring.map(p => p[0])), Math.min(...ring.map(p => p[1])), Math.max(...ring.map(p => p[0])), Math.max(...ring.map(p => p[1]))];
}
const indexedRings = new Map<string, { bounds: Bounds; ring: number[][] }[]>();
function ringsFor(region: Region) {
  if (!indexedRings.has(region.id)) indexedRings.set(region.id, coastlines.regions[region.id].map(ring => ({ bounds: boundsOf(ring), ring })));
  return indexedRings.get(region.id)!;
}
export function isLand(point: LonLat, region: Region): boolean {
  let land = false;
  for (const { bounds: [w, s, e, n], ring } of ringsFor(region)) {
    if (point[0] >= w && point[0] <= e && point[1] >= s && point[1] <= n && inRing(point, ring)) land = !land;
  }
  return land;
}
function reliefAt(point: readonly [number, number], region: Region): number {
  let relief = 0;
  for (const band of region.relief) {
    const a = project(band.start, region.origin), b = project(band.end, region.origin);
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)));
    const distance = Math.hypot(point[0] - a[0] - t * dx, point[1] - a[1] - t * dy);
    relief = Math.max(relief, Math.max(0, 1 - distance / band.widthKm) * band.strength);
  }
  return Math.round(relief * 1000) / 1000;
}
export function buildTerrain(region: Region): TerrainMap {
  const [w, s, e, n] = region.bounds;
  const [xmin, ymin] = project([w, s], region.origin), [xmax, ymax] = project([e, n], region.origin);
  const spacing = region.spacingKm;
  const tiles: Tile[] = [], byAxial = new Map<string, Tile>();
  // Mark hexes sampled along actual coastline segments. Densification below
  // half a radius also catches islands too small to hit the seven sample points.
  const coastHexes = new Set<string>();
  for (const { ring } of ringsFor(region)) for (let i = 1; i < ring.length; i++) {
    const a = project(ring[i - 1] as unknown as LonLat, region.origin), b = project(ring[i] as unknown as LonLat, region.origin);
    const steps = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (spacing / 5)));
    for (let j = 0; j <= steps; j++) coastHexes.add(axialKey(hexAt([a[0] + (b[0] - a[0]) * j / steps, a[1] + (b[1] - a[1]) * j / steps], spacing)));
  }
  for (let r = Math.floor(ymin / (spacing * Math.sqrt(3) / 2)); r <= Math.ceil(ymax / (spacing * Math.sqrt(3) / 2)); r++) {
    for (let q = Math.floor(xmin / spacing - r / 2); q <= Math.ceil(xmax / spacing - r / 2); q++) {
      const [xKm, yKm] = hexCenter({ q, r }, spacing), center = unproject([xKm, yKm], region.origin);
      if (center[0] < w || center[0] > e || center[1] < s || center[1] > n) continue;
      const land = isLand(center, region);
      const samples = [land, ...hexCorners({ q, r }, spacing).map(corner => isLand(unproject(corner, region.origin), region))];
      const landSamples = samples.filter(Boolean).length;
      const containsCoastline = coastHexes.has(axialKey({ q, r })) || (landSamples > 0 && landSamples < 7);
      const relief = land && !containsCoastline ? reliefAt([xKm, yKm], region) : 0;
      const tile: Tile = {
        id: `${region.id}/${region.version}/${spacing}km/${q},${r}`, q, r, center, xKm, yKm,
        terrain: containsCoastline ? 'coast' : land ? (relief >= .28 ? 'upland' : 'land') : 'water',
        centerSurface: land ? 'land' : 'water', landSamples, sampleCount: 7, containsCoastline,
        relief, elevationM: null, depthM: null,
      };
      tiles.push(tile); byAxial.set(axialKey(tile), tile);
    }
  }
  for (const tile of tiles) if (tile.terrain === 'water' && neighbors(tile).some(h => byAxial.get(axialKey(h))?.containsCoastline)) tile.terrain = 'coastal-water';
  return { schema: TERRAIN_SCHEMA, region, tiles, byAxial, widthKm: xmax - xmin, heightKm: ymax - ymin };
}
export function tileAt(map: TerrainMap, location: LonLat): Tile | undefined {
  return map.byAxial.get(axialKey(hexAt(project(location, map.region.origin), map.region.spacingKm)));
}
export function exportTerrain(map: TerrainMap) {
  return {
    schema: map.schema, region: map.region, source: SOURCE,
    projection: { type: 'local-equirectangular', earthRadiusKm: 6371.0088, origin: map.region.origin, north: '+y' },
    grid: { orientation: 'pointy-top', coordinates: 'axial-q-r', neighborCenterDistanceKm: map.region.spacingKm, circumradiusKm: map.region.spacingKm / Math.sqrt(3) },
    limitations: ['Generalized 1:10m coastlines, not navigation data.', 'Coast tiles contain both surfaces; no traversability is inferred.', 'Seven land samples are not an area fraction.', 'Relief is authored illustration, not measured elevation.', 'Depth, elevation, movement costs, sovereignty, and force deployments are not supplied.', 'Regional projected grids do not form a seamless global spherical grid.'],
    tiles: map.tiles.map(tile => ({ ...tile, neighborIds: neighbors(tile).map(hex => map.byAxial.get(axialKey(hex))?.id).filter((id): id is string => Boolean(id)) })),
  };
}
