import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GeographicRules, DEMO } from '../src/scenario/rules.ts';
import { createScenarioSession, loadGeographicRules } from '../server/scenario-session.ts';
import { neighbors, hexDistance } from '../src/pacific/terrain.ts';
import type { Cell, TerrainMap, Surface } from '../src/pacific/terrain.ts';
import type { Exercise, Action } from '../src/scenario/rules.ts';
const rules=loadGeographicRules();
const def=(profileId:string,force='blue')=>rules.catalog.pieces.find(p=>p.profileId===profileId&&rules.eligibility(p.id,force as 'blue',2026).allowed)!;
function fixture(surfaces:Surface[]) {
  const base=rules.map('taiwan-senkaku/focus');
  // A bounded axial strip exposes coast transitions with no alternate route.
  const cells:Cell[]=surfaces.map((terrain,q)=>({id:`test/${q}`,q,r:0,x:q,z:0,center:[q,0],terrain,containsLand:['land','coast'].includes(terrain),containsReef:terrain==='reef',landmarkIds:[],elevationM:null,depthM:null}));
  const map:TerrainMap={...base,id:'test',cells,byKey:new Map(cells.map(c=>[`${c.q},${c.r}`,c]))};
  const r=new GeographicRules(rules.catalog,rules.profiles,new Map([['test',map]]));
  return {r,create:()=>r.create({mapId:'test',year:2026,demo:false}),id:(n:number)=>`test/${n}`};
}
const deploy=(r:GeographicRules,s:Exercise,profileId:string,tileId:string,id:string,force:'blue'|'red'='blue')=>r.apply(s,{type:'deploy',definitionId:def(profileId,force).id,force,tileId,id});

test('default demonstration contains both forces and three domains plus an identifiable cargo item',()=>{
  const s=rules.create();assert.equal(s.pieces.length,7);assert.equal(s.manifest.mapId,'taiwan-senkaku/focus');
  for(const force of ['blue','red']){const pieces=s.pieces.filter(p=>p.force===force);assert.ok(pieces.some(p=>rules.lab.profile(p).layer==='air'));assert.ok(pieces.some(p=>rules.lab.profile(p).id==='tracked'));assert.ok(pieces.some(p=>['sea-transport','landing-craft'].includes(rules.lab.profile(p).id)));}
  assert.deepEqual(rules.import(rules.export(s)),s);assert.ok(s.pieces.every(p=>p.tileId?.startsWith('pacific-terrain/')));
});
test('year, operator evidence and reviewed UH-60L date restrict assembly without rewriting catalog facts',()=>{
  assert.equal(rules.eligibility(DEMO[2].definitionId,'blue',1985).allowed,false);
  assert.match(rules.eligibility(DEMO[2].definitionId,'blue',1985).reason,/1989/);
  assert.equal(rules.lab.definition(DEMO[2].definitionId).eraEvidence.reportedYear,1979);
  assert.equal(rules.eligibility(DEMO[0].definitionId,'red',2026).allowed,false);
  const unknown=rules.catalog.pieces.find(p=>p.eraEvidence.reportedYear===null)!;assert.equal(rules.eligibility(unknown.id,unknown.forceEvidence[0].force,2026).allowed,false);
  assert.throws(()=>rules.create({mapId:'hormuz',year:1979,demo:false}),/1980/);
  const early=rules.create({mapId:'taiwan-senkaku/focus',year:1980,demo:true});assert.ok(early.pieces.length<7);assert.ok(early.pieces.every(p=>rules.eligibility(p.definitionId,p.force,1980).allowed));
});
test('geographic routes use six real neighbors, stable tile IDs, costs and remaining budgets',()=>{
  const s=rules.create(),p=s.pieces.find(p=>p.id==='B-03')!,map=rules.map(s.manifest.mapId),start=map.cells.find(c=>c.id===p.tileId)!;
  assert.equal(neighbors(map,start).length,6);
  const before=structuredClone(s),reachable=rules.reachable(s,p.id);
  assert.ok(reachable.size>6);
  for(const [tileId,route] of reachable){assert.ok(route.cost<=p.movement);assert.equal(route.cost,route.path.length-1);for(let i=1;i<route.path.length;i++){const a=map.cells.find(c=>c.id===route.path[i-1])!,b=map.cells.find(c=>c.id===route.path[i])!;assert.equal(hexDistance(a,b),1);}assert.equal(route.path.at(-1),tileId);}
  const destination=[...reachable].find(([,r])=>r.cost===8)![0];const action:Action={type:'move',pieceId:p.id,tileId:destination};
  assert.equal(rules.evaluate(s,action).cost,8);assert.deepEqual(s,before);
  const next=rules.apply(s,action);assert.equal(next.pieces.find(p=>p.id==='B-03')!.movement,0);assert.equal(next.pieces.find(p=>p.id==='B-03')!.tileId,destination);
  assert.equal(rules.evaluate(next,{type:'move',pieceId:p.id,tileId:p.tileId!}).allowed,false);
});
test('coast rules prevent an invented island bridge, allow land edges, and distinguish amphibious travel',()=>{
  const {r,create,id}=fixture(['land','coast','coast','ocean','reef','lagoon']);
  const s=deploy(r,create(),'tracked',id(0),'tank');
  assert.equal(r.evaluate(s,{type:'move',pieceId:'tank',tileId:id(1)}).allowed,true);
  assert.equal(r.evaluate(s,{type:'move',pieceId:'tank',tileId:id(2)}).allowed,false);
  assert.match(r.evaluate(s,{type:'move',pieceId:'tank',tileId:id(3)}).reason,/Ground/);
  let a=deploy(r,create(),'amphibious-wheeled',id(1),'amph');
  assert.equal(r.evaluate(a,{type:'move',pieceId:'amph',tileId:id(2)}).cost,3);
  assert.equal(r.evaluate(a,{type:'move',pieceId:'amph',tileId:id(3)}).cost,6);
  a=r.apply(a,{type:'move',pieceId:'amph',tileId:id(3)});assert.match(r.evaluate(a,{type:'move',pieceId:'amph',tileId:id(4)}).reason,/Reef/);
});
test('sea, subsurface, air and inventory layers obey reef, coast and occupancy rules',()=>{
  const {r,create,id}=fixture(['land','coast','ocean','reef','lagoon']);
  let s=deploy(r,create(),'surface-vessel',id(2),'ship');
  assert.throws(()=>deploy(r,s,'surface-vessel',id(2),'other'),/same layer/);
  assert.throws(()=>deploy(r,s,'surface-vessel',id(1),'coastship'),/clearance/);
  s=deploy(r,s,'submarine',id(2),'sub','red');s=deploy(r,s,'rotary-wing',id(2),'air');assert.equal(s.pieces.length,3);
  assert.match(r.evaluate(s,{type:'move',pieceId:'sub',tileId:id(3)}).reason,/Reef/);
  assert.equal(r.evaluate(s,{type:'move',pieceId:'air',tileId:id(4)}).allowed,true);
  let land=deploy(r,create(),'landing-craft',id(1),'craft');assert.equal(r.evaluate(land,{type:'move',pieceId:'craft',tileId:id(2)}).cost,1);assert.equal(r.evaluate(land,{type:'move',pieceId:'craft',tileId:id(0)}).allowed,false);
  land=deploy(r,land,'equipment',id(1),'item');land=deploy(r,land,'equipment',id(1),'item2');assert.equal(land.pieces.length,3);
  assert.throws(()=>deploy(r,land,'equipment',id(2),'wet'),/Ground/);
});
test('loading, carrier movement and unloading preserve exact identity, slots and turn restrictions',()=>{
  let s=rules.create();const before=s.pieces.map(p=>p.id).sort();
  const load:Action={type:'load',pieceId:'B-01',carrierId:'B-02'};
  const copy=structuredClone(s);assert.equal(rules.evaluate(s,load).allowed,true);assert.deepEqual(s,copy);
  s=rules.apply(s,load);assert.equal(s.pieces.find(p=>p.id==='B-01')!.tileId,null);assert.equal(rules.cargoUsed(s,'B-02'),4);
  assert.equal(rules.evaluate(s,load).allowed,false);
  assert.equal(rules.evaluate(s,{type:'move',pieceId:'B-01',tileId:copy.pieces[0].tileId!}).allowed,false);
  const map=rules.map(s.manifest.mapId),dest=[...rules.reachable(s,'B-02')].find(([id,r])=>r.cost===1&&map.cells.find(c=>c.id===id)!.terrain==='ocean')!;
  s=rules.apply(s,{type:'move',pieceId:'B-02',tileId:dest[0]});assert.equal(s.pieces.find(p=>p.id==='B-01')!.carrierId,'B-02');
  s=rules.apply(s,{type:'move',pieceId:'B-02',tileId:copy.pieces.find(p=>p.id==='B-02')!.tileId!});
  s=rules.apply(s,{type:'unload',pieceId:'B-01',tileId:copy.pieces[0].tileId!});
  assert.equal(s.pieces.find(p=>p.id==='B-01')!.movement,0);assert.equal(s.pieces.find(p=>p.id==='B-01')!.carrierId,null);assert.equal(rules.cargoUsed(s,'B-02'),0);assert.deepEqual(s.pieces.map(p=>p.id).sort(),before);
  s=rules.apply(s,{type:'advance'});assert.equal(s.pieces.find(p=>p.id==='B-01')!.movement,4);assert.deepEqual(rules.import(rules.export(s)),s);
});
test('capacity, cross-force, nested cargo and air transfer restrictions cannot be bypassed',()=>{
  const {r,create,id}=fixture(['coast','ocean','coast','land']);let s=deploy(r,create(),'landing-craft',id(1),'carrier');
  for(let i=0;i<3;i++){s=deploy(r,s,'tracked',id(0),`tank${i}`);s=r.apply(s,{type:'load',pieceId:`tank${i}`,carrierId:'carrier'});}
  s=deploy(r,s,'tracked',id(0),'fourth');assert.equal(r.cargoUsed(s,'carrier'),12);assert.match(r.evaluate(s,{type:'load',pieceId:'fourth',carrierId:'carrier'}).reason,/slots/);
  let air=deploy(r,create(),'air-transport',id(0),'airlift');air=deploy(r,air,'equipment',id(3),'item');assert.equal(r.evaluate(air,{type:'load',pieceId:'item',carrierId:'airlift'}).allowed,false);
  air=deploy(r,air,'equipment',id(0),'same');assert.equal(r.evaluate(air,{type:'load',pieceId:'same',carrierId:'airlift'}).allowed,true);
  const cross=rules.create();assert.match(rules.evaluate(cross,{type:'load',pieceId:'R-05',carrierId:'B-02'}).reason,/same force/);
  let nested=deploy(r,create(),'truck',id(0),'truck');nested=deploy(r,nested,'equipment',id(0),'crate');nested=r.apply(nested,{type:'load',pieceId:'crate',carrierId:'truck'});nested=deploy(r,nested,'landing-craft',id(1),'ship');assert.match(r.evaluate(nested,{type:'load',pieceId:'truck',carrierId:'ship'}).reason,/Nested/);
});
test('all geographic maps retain stable identities and reciprocal six-neighbor topology after adaptation',()=>{
  assert.equal(rules.maps.size,6);
  for(const map of rules.maps.values()){
    const s=rules.create({mapId:map.id,year:2026,demo:false});assert.deepEqual(rules.import(rules.export(s)),s);
    assert.equal(new Set(map.cells.map(c=>c.id)).size,map.cells.length);
    for(const c of map.cells){assert.equal(c.depthM,null);assert.equal(c.elevationM,null);for(const n of neighbors(map,c)){assert.equal(hexDistance(c,n),1);assert.ok(neighbors(map,n).includes(c));}}
    if(map.id==='hormuz')assert.ok(map.cells.every(c=>c.id.startsWith('hormuz/0.1.0/5km/')));
  }
});
test('save imports reject incompatible versions, forged positions, cargo, history, and foreign saves',()=>{
  const original=rules.export(rules.create());
  for(const key of ['scenarioVersion','rulesVersion','catalogVersion','equipmentVersion','profileVersion','mapVersion','geographyVersion'] as const){const save=structuredClone(original);save.exercise.manifest[key]='wrong';assert.throws(()=>rules.import(save),/Incompatible/);}
  const edits=[(s:Exercise)=>{s.pieces[0].tileId='not-a-tile';},(s:Exercise)=>{s.pieces[0].carrierId='B-02';},(s:Exercise)=>{s.pieces[0].movement=100;},(s:Exercise)=>{s.events[0].explanation='forged';},(s:Exercise)=>{s.turn=9;}];
  for(const edit of edits){const save=structuredClone(original);edit(save.exercise);assert.throws(()=>rules.import(save),/replay/);}
  assert.throws(()=>rules.import({schema:'lab'}),/not a geographic/);
});
test('independent durable journal replays restart, import and new-run commands with stale/duplicate protection',()=>{
  const dir=mkdtempSync(join(tmpdir(),'xr-geographic-')),path=join(dir,'journal.jsonl');
  try{
    const session=createScenarioSession(rules,path),initial=session.getState();
    const command={id:'move-once',revision:0,operation:{type:'action' as const,action:{type:'hold' as const,pieceId:'B-03'}}};
    assert.equal(session.submit(command).status,200);assert.equal(session.submit(command).body.duplicate,true);
    assert.equal(session.submit({...command,id:'stale'}).status,409);
    assert.equal(session.submit({...command,operation:{type:'action',action:{type:'advance'}}}).status,409);
    const snapshot=session.getState();const restarted=createScenarioSession(rules,path);assert.deepEqual(restarted.getState(),snapshot);assert.equal(restarted.submit(command).body.duplicate,true);
    const save=rules.export(snapshot.exercise);assert.equal(restarted.submit({id:'new',revision:1,operation:{type:'new',setup:{mapId:'hormuz',year:2000,demo:false}}}).status,200);
    assert.equal(restarted.submit({id:'restore',revision:2,operation:{type:'import',save}}).status,200);
    assert.deepEqual(restarted.getState().exercise,snapshot.exercise);assert.equal(restarted.getState().revision,3);
    assert.deepEqual(createScenarioSession(rules,path).getState(),restarted.getState());assert.notDeepEqual(initial,restarted.getState());
    assert.equal(restarted.submit({id:'bad',revision:3,operation:{type:'new'}}).status,400);
    const lines=readFileSync(path,'utf8').trim().split('\n');const record=JSON.parse(lines[0]);record.state.exercise.turn=77;lines[0]=JSON.stringify(record);writeFileSync(path,lines.join('\n')+'\n');assert.throws(()=>createScenarioSession(rules,path),/replay/);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
