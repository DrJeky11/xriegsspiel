import assert from 'node:assert/strict';
import test from 'node:test';
import { REGIONS } from '../src/centcom/regions.ts';
import { axialKey, buildTerrain, exportTerrain, hexAt, hexCenter, hexCorners, hexDistance, isLand, neighbors, project, tileAt, unproject } from '../src/centcom/terrain.ts';
import type { TerrainMap, Tile } from '../src/centcom/terrain.ts';

const maps = REGIONS.map(buildTerrain);

test('pointy hex geometry has six reversible neighbors and correct distance and centers', () => {
  for (const q of [-20, -1, 0, 1, 20]) for (const r of [-20, -1, 0, 1, 20]) {
    const hex = { q, r }, center = hexCenter(hex, 5);
    assert.deepEqual(hexAt(center, 5), hex);
    const adjacent = neighbors(hex);
    assert.equal(new Set(adjacent.map(axialKey)).size, 6);
    for (const next of adjacent) {
      assert.equal(hexDistance(hex, next), 1);
      assert.ok(neighbors(next).some(h => axialKey(h) === axialKey(hex)));
      const p = hexCenter(next, 5);
      assert.ok(Math.abs(Math.hypot(p[0] - center[0], p[1] - center[1]) - 5) < 1e-10);
      const shared = hexCorners(hex, 5).filter(a => hexCorners(next, 5).some(b => Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-9));
      assert.equal(shared.length, 2, 'adjacent hexes share exactly one edge');
    }
  }
});

test('geographic projection preserves round trips and north/east orientation in both regions', () => {
  for (const region of REGIONS) for (const place of region.landmarks) {
    const point = project(place.location, region.origin), roundtrip = unproject(point, region.origin);
    assert.ok(Math.abs(roundtrip[0] - place.location[0]) < 1e-10);
    assert.ok(Math.abs(roundtrip[1] - place.location[1]) < 1e-10);
    assert.equal(Math.sign(point[0]), Math.sign(place.location[0] - region.origin[0]));
    assert.equal(Math.sign(point[1]), Math.sign(place.location[1] - region.origin[1]));
  }
});

test('regional maps have stable distinct IDs, bounded geography, and no fabricated measurements', () => {
  const ids = new Set<string>();
  for (const map of maps) {
    const [w, s, e, n] = map.region.bounds;
    assert.ok(map.tiles.length > 1000 && map.tiles.length < 20000);
    for (const tile of map.tiles) {
      assert.ok(!ids.has(tile.id)); ids.add(tile.id);
      assert.ok(tile.center[0] >= w && tile.center[0] <= e && tile.center[1] >= s && tile.center[1] <= n);
      assert.equal(tileAt(map, tile.center)?.id, tile.id);
      assert.equal(tile.elevationM, null); assert.equal(tile.depthM, null);
      assert.ok(tile.landSamples >= 0 && tile.landSamples <= 7);
      if (tile.terrain === 'water' || tile.terrain === 'coastal-water') assert.equal(tile.centerSurface, 'water');
      if (tile.terrain === 'coast') assert.ok(tile.containsCoastline);
    }
    assert.deepEqual(buildTerrain(map.region).tiles, map.tiles);
    const exported = JSON.parse(JSON.stringify(exportTerrain(map)));
    assert.equal(exported.tiles.length, map.tiles.length);
    assert.equal(exported.source.version, '5.1.1');
    assert.equal(exported.grid.neighborCenterDistanceKm, map.region.spacingKm);
    assert.ok(exported.tiles.every((tile: { neighborIds: string[] }) => tile.neighborIds.length >= 2 && tile.neighborIds.length <= 6));
  }
});

test('source land mask and mixed hexes retain Hormuz islands and Mayyun', () => {
  for (const map of maps) for (const place of map.region.landmarks.filter(p => p.kind === 'island')) {
    assert.ok(isLand(place.location, map.region), place.name);
    const tile = tileAt(map, place.location)!;
    assert.ok(tile.terrain === 'coast' || tile.centerSurface === 'land', place.name);
  }
  assert.equal(tileAt(maps[1], [43.42, 12.657])?.terrain, 'coast');
  assert.equal(isLand([56.25, 25.9], REGIONS[0]), true, 'Musandam land');
  assert.equal(isLand([57.5, 25.3], REGIONS[0]), false, 'Gulf of Oman water');
  assert.equal(isLand([44.15, 13.7], REGIONS[1]), true, 'Yemen land');
  assert.equal(isLand([44.2, 11.7], REGIONS[1]), false, 'Gulf of Aden water');
});

function waterConnected(map: TerrainMap, from: readonly [number, number], to: readonly [number, number]): boolean {
  const start = tileAt(map, from)!, end = tileAt(map, to)!;
  const isWater = (tile: Tile) => tile.terrain === 'water' || tile.terrain === 'coastal-water';
  assert.ok(isWater(start)); assert.ok(isWater(end));
  const visited = new Set<string>([start.id]), queue = [start];
  for (let head = 0; head < queue.length; head++) {
    if (queue[head].id === end.id) return true;
    for (const hex of neighbors(queue[head])) {
      const next = map.byAxial.get(axialKey(hex));
      if (next && isWater(next) && !visited.has(next.id)) { visited.add(next.id); queue.push(next); }
    }
  }
  return false;
}

test('hex sampling keeps both major straits open without relying on mixed coast tiles', () => {
  assert.ok(waterConnected(maps[0], [55.1, 26.2], [57.5, 25.2]), 'Persian Gulf to Gulf of Oman');
  assert.ok(waterConnected(maps[1], [42.8, 13.5], [44.3, 11.8]), 'Red Sea to Gulf of Aden');
});
