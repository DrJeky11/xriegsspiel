import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
import { createGeographicGame as create, geographicLibrary, observe, resolveRound, advanceRound, legalCandidates, validateOrders, result } from '../src/opponent/rules.ts';
import { cellsFor, geographicRoutes, navigation, separation, goalDistance } from '../src/opponent/geography.ts';
import { baseline, decide } from '../src/opponent/policy.ts';
import { DIFFICULTIES } from '../src/opponent/geographic-policy.ts';
import { workerPlanner } from '../server/opponent-session.ts';
import { scenarioLayout } from '../src/opponent/layout.ts';
import { loadGeographicRules } from '../server/scenario-session.ts';
import { vesselTerrainReason } from '../src/scenario/navigation.ts';
import type { Candidate, Game, Order, Side } from '../src/opponent/types.ts';
ensureOpponentTerrain();
const resolve=(g:Game,blue:Order[]=[],red:Order[]=[])=>resolveRound(g,{blue,red});
const move=(g:Game,id:string)=>(legalCandidates(g,'blue').filter(c=>c.order.type==='move'&&c.order.asset===id));

test('all eight deployments and every candidate path use the original water graph and native rendering positions',()=>{
  const maps=loadGeographicRules().maps;
  for(const s of geographicLibrary.scenarios){
    const g=create(s.id),setup=g.geography!,board=navigation(s.mapId),water=cellsFor(s.mapId),map=maps.get(s.mapId)!;
    assert.equal(g.schema,'maritime-engine/2');assert.equal(g.scenarioVersion,'2.0.0');assert.equal(g.rulesVersion,'maritime-geographic-rules/1.0.0');
    assert.deepEqual(setup.sourceHashes,map.sources.map(s=>s.sha256).sort());
    assert.equal(new Set(g.assets.map(a=>a.tileId)).size,g.assets.length);
    assert.ok(g.assets.filter(a=>a.side==='red').every(a=>a.tileId&&water.has(a.tileId)));
    assert.ok(!g.assets.some(a=>a.kind==='staff'));
    const layout=scenarioLayout(map,observe(g,'blue'),null);
    for(const a of g.assets)assert.equal(layout.assetTiles.get(a.id),a.tileId);
    for(const goal of setup.goals){assert.ok(map.cells.some(c=>c.id===goal.anchor));assert.ok(goal.tileIds.length);assert.ok(goal.tileIds.every(t=>water.has(t)));}
    for(const side of ['blue','red'] as Side[])for(const c of legalCandidates(g,side))if(c.order.type==='move'){
      const a=g.assets.find(a=>a.id===(c.order as Extract<Order,{type:'move'}>).asset)!;
      assert.equal(c.path![0],a.tileId);assert.equal(c.path!.at(-1),c.order.target);assert.equal(c.movementCost,c.path!.length-1);assert.ok(c.movementCost!<=4);
      for(const [i,id]of c.path!.entries()){assert.ok(water.has(id));assert.equal(vesselTerrainReason(map.cells.find(c=>c.id===id)!),null);if(i)assert.ok(water.get(c.path![i-1])!.neighbors.includes(id));}
    }
    if(s.id.startsWith('SPR'))assert.equal(setup.goals.find(g=>g.id==='Outpost')!.anchor,board.landmarks.find(l=>/sierra/i.test(l.id+l.name))!.tileId);
  }
});

test('ship position controls interception; an alternative route avoids the committed patrol',()=>{
  const g=create('SPR-H01'),b=g.assets.find(a=>a.id==='B1')!,r=g.assets.find(a=>a.id==='R1')!;
  const challenge:Order={type:'challenge',asset:r.id,target:b.id,effort:1};
  const crosses=move(g,b.id).find(c=>c.path!.some(t=>separation(g.geography!,r.tileId,t)<=1))!;
  assert.ok(crosses);validateOrders(g,'red',[challenge]);
  const blocked=resolve(g,[crosses.order],[challenge]);assert.equal(blocked.delays.S1,1);assert.equal(blocked.delays.S2,1);assert.notEqual(blocked.assets.find(a=>a.id===b.id)!.tileId,(crosses.order as any).target);
  const bypass=move(g,b.id).find(c=>c.path!.every(t=>separation(g.geography!,r.tileId,t)>1))!;
  assert.ok(bypass);const clear=resolve(g,[bypass.order],[challenge]);assert.deepEqual(clear.delays,{});assert.equal(clear.assets.find(a=>a.id===b.id)!.tileId,(bypass.order as any).target);assert.equal(clear.pressure,g.pressure-1);
  const remote=structuredClone(g);remote.assets.find(a=>a.id===r.id)!.tileId=[...cellsFor(g.geography!.mapId).keys()].find(t=>separation(g.geography!,b.tileId,t)>6)!;
  assert.throws(()=>validateOrders(remote,'red',[challenge]));
  const redMove=legalCandidates(g,'red').find(c=>c.order.type==='move'&&c.order.asset===r.id)!;
  assert.throws(()=>validateOrders(g,'red',[challenge,redMove.order]));
});

test('adjacent escort protects a route; medical/rescue stay protected and repeated delays reach their cap',()=>{
  let g=create('SPR-H01');const r=g.assets.find(a=>a.id==='R1')!;
  const route=move(g,'B1').find(c=>c.path!.some(t=>separation(g.geography!,r.tileId,t)<=1))!;
  const challenge:Order={type:'challenge',asset:'R1',target:'B1',effort:1};
  const escort:Order={type:'assure',asset:'B3',target:'B1',effort:1};
  const protectedGame=resolve(g,[route.order,escort],[challenge]);assert.deepEqual(protectedGame.delays,{});assert.equal(protectedGame.assets[0].tileId,(route.order as any).target);
  for(let i=0;i<2;i++){const crossing=move(g,'B1').find(c=>c.path!.some(t=>separation(g.geography!,r.tileId,t)<=1))!;g=advanceRound(resolve(g,[crossing.order],[challenge]));}
  assert.equal(g.delays.S1,2);assert.ok(!legalCandidates(g,'red').some(c=>c.order.type==='challenge'&&c.order.target==='B1'));
  const medical=create('SPR-F01');assert.ok(!legalCandidates(medical,'red').some(c=>c.order.type==='challenge'&&c.order.target==='B3'));
});

test('Sierra Madre delivery requires its native offshore area and a later action; cargo identity survives transfer',()=>{
  let g=create('SPR-H01');assert.ok(!legalCandidates(g,'blue').some(c=>c.order.type==='deliver'));
  while(!legalCandidates(g,'blue').some(c=>c.order.type==='deliver')){
    const route=move(g,'B1').sort((a,b)=>goalDistance(g.geography!, (a.order as any).target,'Outpost')-goalDistance(g.geography!,(b.order as any).target,'Outpost'))[0];
    assert.ok(route);g=advanceRound(resolve(g,[route.order]));
  }
  const deliver=legalCandidates(g,'blue').find(c=>c.order.type==='deliver'&&c.order.target==='S1')!;
  const moved=move(g,'B1')[0];assert.throws(()=>validateOrders(g,'blue',[deliver.order,moved.order]));
  const after=resolve(g,[deliver.order]);assert.equal(after.metrics.delivered,1);assert.equal(after.items.find(i=>i.id==='S1')!.location,'Outpost');
  const transferGame=create('SPR-H01'),receiver=transferGame.assets.find(a=>a.id==='B2')!,donor=transferGame.assets[0];
  receiver.cargo=[];
  for(const item of transferGame.items.filter(i=>i.location===receiver.id)){item.completed=1;item.location='Outpost';}
  const occupied=new Set(transferGame.assets.map(a=>a.tileId));
  const water=cellsFor(transferGame.geography!.mapId);
  const center=[...water.values()].find(c=>c.neighbors.length===6&&!occupied.has(c.id)&&c.neighbors.every(t=>!occupied.has(t)))!;
  donor.tileId=center.id;receiver.tileId=center.neighbors[0];
  const patrolTile=center.neighbors.find(t=>t!==receiver.tileId&&water.get(t)!.neighbors.includes(receiver.tileId!))!;
  assert.ok(patrolTile);transferGame.assets.find(a=>a.id==='R1')!.tileId=patrolTile;
  const transfer:Order={type:'transfer',asset:receiver.id,from:donor.id,target:'S1'};
  const held=resolve(transferGame,[transfer],[{type:'challenge',asset:'R1',target:donor.id,effort:1}]);
  assert.equal(held.delays.S1,1);assert.equal(held.delays.S2,undefined);assert.equal(held.items.find(i=>i.id==='S1')!.location,donor.id);
  const sent=resolve(transferGame,[transfer]);assert.equal(sent.items.find(i=>i.id==='S1')!.location,receiver.id);assert.deepEqual(sent.assets.find(a=>a.id===receiver.id)!.cargo,['S1']);assert.deepEqual(sent.assets[0].cargo,['S2']);
});

test('conflicting simultaneous destinations stop one ship and reject duplicate friendly reservations',()=>{
  const g=create('SPR-H01'),water=cellsFor(g.geography!.mapId),occupied=new Set(g.assets.map(a=>a.tileId));
  const center=[...water.values()].find(c=>c.neighbors.filter(n=>!occupied.has(n)).length>=4&&!occupied.has(c.id))!;
  const b=g.assets.find(a=>a.id==='B1')!,r=g.assets.find(a=>a.id==='R1')!,b2=g.assets.find(a=>a.id==='B2')!;
  b.tileId=center.neighbors[0];r.tileId=center.neighbors[1];b2.tileId=center.neighbors[2];
  const blue:Order={type:'move',asset:'B1',target:center.id},red:Order={type:'move',asset:'R1',target:center.id};
  assert.throws(()=>validateOrders(g,'blue',[blue,{...blue,asset:'B2'}]));
  const odd=resolve(g,[blue],[red]);assert.equal(odd.assets.find(a=>a.id==='B1')!.tileId,center.id);assert.equal(odd.assets.find(a=>a.id==='R1')!.tileId,r.tileId);
  g.round=2;const even=resolve(g,[blue],[red]);assert.equal(even.assets.find(a=>a.id==='R1')!.tileId,center.id);assert.equal(even.assets.find(a=>a.id==='B1')!.tileId,b.tileId);
  assert.equal(new Set(even.assets.map(a=>a.tileId)).size,even.assets.length);
});

test('private records do not alter the opposing geographic observation or seeded plan',()=>{
  const g=create('SEN-H01'),other=structuredClone(g);other.reports.blue[0].truth='Unobserved';other.reports.blue[0].verified=1;other.metrics.case_records=1;
  assert.deepEqual(observe(g,'red'),observe(other,'red'));
  assert.deepEqual(decide(observe(g,'red'),'advanced',11),decide(observe(other,'red'),'advanced',11));
});

test('geographic policies finish and replay all eight scenarios in both roles at all difficulties',()=>{
  for(const s of geographicLibrary.scenarios)for(const side of ['blue','red'] as Side[])for(const difficulty of ['novice','standard','advanced'] as const){
    let g=create(s.id),replay=create(s.id);const enemy=side==='blue'?'red':'blue';
    while(true){const p=decide(observe(g,side),difficulty,17+g.round);assert.ok(p.transitions<=DIFFICULTIES[difficulty].transitions);
      const orders={blue:[] as Order[],red:[] as Order[]};orders[side]=p.orders;orders[enemy]=baseline(observe(g,enemy),'deadline',g.round);
      g=resolveRound(g,orders);replay=resolveRound(replay,orders);assert.deepEqual(g,replay);
      const positions=g.assets.filter(a=>a.tileId).map(a=>a.tileId);assert.equal(new Set(positions).size,positions.length);assert.ok(g.pressure>=0);
      if(g.finished)break;g=advanceRound(g);replay=advanceRound(replay);
    }
    assert.notEqual(result(g).outcome,'incomplete');
  }
});

test('worker receives only public navigation plus its observation and returns bounded legal geographic decisions',async()=>{
  for(const id of ['SPR-H01','BAB-H01','HOR-F01']){
    const g=create(id),p=await workerPlanner(observe(g,'red'),'advanced',42);
    assert.equal(p.fallback,undefined);validateOrders(g,'red',p.orders);assert.equal(p.version,'geographic-planner/1.0.0');
  }
});
