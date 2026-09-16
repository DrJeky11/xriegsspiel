import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { REGIONS,buildMap,cellAt,exportMap,hexCenter,hexDistance,keyOf,neighbors,pointInPolygon,project,unproject,worldToHex } from '../src/pacific/terrain.ts';
import type { Geography, TerrainMap } from '../src/pacific/terrain.ts';
const read=(name:string)=>JSON.parse(readFileSync(new URL(`../public/terrain/pacific/${name}.json`,import.meta.url),'utf8')) as Geography;
const regional=read('regional-land'),shoal=read('shoal-detail'),senkaku=read('senkaku-detail');
const maps:TerrainMap[]=REGIONS.flatMap((r,i)=>[buildMap(r,r.overview,regional,[i===0?shoal:senkaku]),buildMap(r,r.focus,i===0?shoal:senkaku)]);

test('Pacific hex coordinates round trip in negative quadrants and preserve six equal-length neighbors',()=>{
  for(const spacing of [.75,18]) for(let q=-20;q<=20;q++)for(let r=-20;r<=20;r++) {
    const c={q,r},p=hexCenter(c,spacing);
    assert.deepEqual(worldToHex(p.x,p.z,spacing),c);
    const ll=unproject(p.x,p.z,[122,24]),back=project(ll,[122,24]);
    assert.ok(Math.abs(back.x-p.x)<1e-9&&Math.abs(back.z-p.z)<1e-9);
  }
  for(const map of maps){const center=map.byKey.get('0,0')!;assert.equal(neighbors(map,center).length,6);for(const n of neighbors(map,center)){assert.equal(hexDistance(center,n),1);assert.ok(Math.abs(Math.hypot(n.x-center.x,n.z-center.z)-map.view.hexKm)<1e-9);}}
});

test('Every terrain grid is connected, bounded, uniquely identified, and has reciprocal adjacency',()=>{
  const ids=new Set<string>();
  for(const map of maps){
    assert.ok(map.cells.length>1000&&map.cells.length<4000);
    const visited=new Set<string>(),pending=[map.cells[0]];
    while(pending.length){const c=pending.pop()!;if(visited.has(c.id))continue;visited.add(c.id);pending.push(...neighbors(map,c).filter(n=>!visited.has(n.id)));}
    assert.equal(visited.size,map.cells.length);
    for(const c of map.cells){
      assert.ok(!ids.has(c.id));ids.add(c.id);
      assert.ok(Math.abs(c.x)+map.view.hexKm/2<=map.view.widthKm/2);
      assert.ok(Math.abs(c.z)+map.view.hexKm/Math.sqrt(3)<=map.view.heightKm/2);
      assert.equal(map.byKey.get(keyOf(c)),c);
      assert.equal(cellAt(map,c.center),c);
      for(const n of neighbors(map,c))assert.ok(neighbors(map,n).includes(c));
    }
    assert.equal(cellAt(map,[0,0]),undefined);
  }
});

test('Reef holes remain lagoon water; Sierra Madre remains a ship landmark with no fabricated land',()=>{
  const map=maps[1];assert.ok(map.cells.some(c=>c.terrain==='reef'));assert.ok(map.cells.some(c=>c.terrain==='lagoon'));
  assert.ok(map.cells.every(c=>!c.containsLand));
  const reefCenter=cellAt(map,[115.866,9.75])!;assert.equal(reefCenter.terrain,'lagoon');
  const ship=map.landmarks.find(l=>l.id==='sierra-madre')!;assert.equal(ship.kind,'ship');assert.equal(cellAt(map,ship.position)!.terrain,'reef');
  assert.equal(pointInPolygon([0,0],[[[-2,-2],[2,-2],[2,2],[-2,2],[-2,-2]],[[-1,-1],[-1,1],[1,1],[1,-1],[-1,-1]]]),false);
});

test('Reference islands survive both regional and focus hex sampling',()=>{
  for(const map of maps.filter(m=>m.region.id==='taiwan-senkaku')){
    for(const id of ['uotsuri','kuba']){const l=map.landmarks.find(l=>l.id===id)!;assert.ok(cellAt(map,l.position)!.containsLand,`${map.id}/${id}`);}
  }
  const palawan=maps[0].landmarks.find(l=>l.id==='palawan')!;assert.ok(cellAt(maps[0],palawan.position)!.containsLand);
  assert.equal(cellAt(maps[2],[120.96,23.75])!.terrain,'land');
  assert.ok(!maps[3].landmarks.some(l=>l.id==='taisho'));
});

test('Thin land crossing a hex edge is detected even with no sampled interior point',()=>{
  const empty:Geography={version:'test',land:[[[[-.0035,-.01],[-.0034,-.01],[-.0034,.01],[-.0035,.01],[-.0035,-.01]]]],reefs:[],lagoons:[],landmarks:[],sources:[]};
  const view={...REGIONS[0].focus,center:[0,0] as [number,number],widthKm:5,heightKm:5,hexKm:1};
  const map=buildMap(REGIONS[0],view,empty);
  assert.ok(map.byKey.get('0,0')!.containsLand);
});

test('Terrain exports are deterministic, independent of units, and retain source licenses and unknown values',()=>{
  for(const map of maps){
    const output=exportMap(map);const copy=JSON.parse(JSON.stringify(output));
    assert.equal(copy.cells.length,map.cells.length);assert.equal(copy.grid.hexCenterSpacingKm,map.view.hexKm);
    assert.equal(copy.license,'ODbL-1.0');assert.ok(copy.sources.some((s:{license:string})=>s.license==='ODbL-1.0'));
    assert.ok(copy.sources.every((s:{sha256:string})=>/^[0-9a-f]{64}$/.test(s.sha256)));
    assert.ok(copy.cells.every((c:{depthM:null;elevationM:null})=>c.depthM===null&&c.elevationM===null));
    assert.ok(!('units' in copy));assert.ok(!('movementCost' in copy.cells[0]));
    for(const c of copy.cells){assert.ok(c.neighbors.length<=6);assert.ok(c.neighbors.every((id:string)=>map.cells.some(t=>t.id===id)));}
  }
  assert.deepEqual(exportMap(buildMap(REGIONS[0],REGIONS[0].focus,shoal)),exportMap(maps[1]));
});
