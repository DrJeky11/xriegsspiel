import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureOpponentTerrain } from '../server/opponent-terrain.ts';
import { createGeographicGame as create, observe, resolveRound, advanceRound, geographicLibrary } from '../src/opponent/rules.ts';
import { availability, firstRoundGuide, missionBrief, missionProgress, planGuidance, roundSummary } from '../src/opponent/guidance.ts';
import { loadGeographicRules } from '../server/scenario-session.ts';
import { activeExerciseLocator } from '../src/opponent/layout.ts';
import type { RunView } from '../server/opponent-session.ts';
import type { Game, Order, Side } from '../src/opponent/types.ts';
ensureOpponentTerrain();
const reviewed = (before: Game, orders: Order[], after: Game, side: Side = 'blue') => ({
  observation: observe(after, side), review: [{round:before.round,observation:observe(before,side),orders:{blue:side==='blue'?orders:[],red:side==='red'?orders:[]},decision:null}],
} as RunView);

test('short-window guidance explains availability, role, cargo, deadline and later delivery without changing the view', () => {
  const o=observe(create('SPR-H01','short-window/1'),'blue'), copy=structuredClone(o);
  const pages=missionBrief(o,'Second Thomas Shoal within Palawan & the Spratlys');
  assert.match(pages.map(p=>p.text).join(' '), /B1.*S1, S2.*arrive in round 3/);
  assert.match(pages.map(p=>p.text).join(' '), /6 rounds total/);
  assert.match(pages.map(p=>p.text).join(' '), /later round to Deliver each manifest/);
  assert.match(planGuidance(o,[]).join(' '), /Can still act: B3, Staff/);
  assert.match(firstRoundGuide(o,[]).text,/B1\/B2 arrive in round 3/);
  assert.deepEqual(o,copy);
  let g=create('SPR-H01','short-window/1');
  for(let i=0;i<2;i++)g=advanceRound(resolveRound(g,{blue:[],red:[]}));
  const next=observe(g,'blue');assert.match(availability(next,next.assets[0]),/Ready/);
  assert.doesNotMatch(planGuidance(next,[]).join(' '),/arrive in round 3/);
});

test('baseline guidance retains round-one transports and explains action reservations and unused CP',()=>{
  const o=observe(create('SPR-H01'),'blue');
  assert.match(firstRoundGuide(o,[]).text,/Select B1 or B2/);
  const route=o.candidates.find(c=>c.order.type==='move'&&c.order.asset==='B1')!;
  const lines=planGuidance(o,[route.order]);assert.match(lines[0],/2 of 3 CP left/);assert.doesNotMatch(lines[1],/B1/);assert.match(lines[1],/B2/);
  assert.match(lines[1],/Unused CP expire/);
});

test('the narrated verify, B3 move and share sequence yields grounded summaries with zero deliveries',()=>{
  const g=create('SPR-H01','short-window/1'), o=observe(g,'blue');
  const move=o.candidates.find(c=>c.order.type==='move'&&c.order.asset==='B3')!.order;
  const orders:Order[]=[{type:'verify',target:'B-Q1'},move];
  const after=resolveRound(g,{blue:orders,red:[]});
  const first=roundSummary(reviewed(g,orders,after),1).lines.join(' ');
  assert.match(first,/spent 2\/3 CP; 1 unused CP/);assert.match(first,/B3: .*water hexes/);
  assert.match(first,/0 routine manifests delivered/);assert.match(first,/Sharing it requires a later action/);
  assert.doesNotMatch(first,/Ships deployed|Round 1: 3 CP/);
  const r2=advanceRound(after), share:Order[]=[{type:'share',target:'B-Q1'}];
  const r2after=resolveRound(r2,{blue:share,red:[]});
  const second=roundSummary(reviewed(r2,share,r2after),2).lines.join(' ');
  assert.match(second,/spent 1\/3 CP; 2 unused CP/);assert.match(second,/No movement was ordered/);assert.match(second,/does not move ships/);
});

test('historical progress uses its own round and explanations cannot leak an opposing private event',()=>{
  const g=create('SPR-H01'), after=resolveRound(g,{blue:[],red:[]});
  const view=reviewed(g,[],after), next=observe(advanceRound(after),'blue');
  view.review.push({round:2,observation:next,orders:{blue:[],red:[]},decision:null});
  view.observation.items[0].completed=3;
  view.observation.events.push({id:'private',round:1,side:'red',audience:'red',type:'interception',message:'PRIVATE TEST',rule:'test'});
  const text=roundSummary(view,1).lines.join(' ');
  assert.match(text,/0 routine manifests delivered/);assert.doesNotMatch(text,/PRIVATE TEST/);
  assert.match(roundSummary(view,3).title,/not resolved/);
});

test('interrupted routes explain the recorded interception rather than claiming arrival',()=>{
  const g=create('SPR-H01'), o=observe(g,'blue');
  const route=o.candidates.find(c=>c.order.type==='move'&&c.order.asset==='B1'&&c.warning)!;
  // Pick the patrol adjacent to this route, using the actual resolver as evidence.
  const challenge=observe(g,'red').candidates.filter(c=>c.order.type==='challenge'&&c.order.target==='B1'&&c.cost===1);
  const after=challenge.map(c=>resolveRound(g,{blue:[route.order],red:[c.order]})).find(a=>a.events.some(e=>e.type==='interception'&&e.message.includes('intercepted')))!;
  assert.ok(after);
  const text=roundSummary(reviewed(g,[route.order],after),1).lines.join(' ');
  assert.match(text,/route interrupted/);assert.match(text,/intercepted B1/);assert.match(text,/0 routine manifests delivered/);
});

test('all eight scenarios and both roles receive their own objectives and explicit learning focus',()=>{
  for(const s of geographicLibrary.scenarios)for(const side of ['blue','red'] as Side[]){
    const o=observe(create(s.id),side),pages=missionBrief(o,s.mapId);
    assert.ok(pages[0].text.includes(o.objectives[side]));assert.ok(pages.some(p=>p.title==='Learning focus'));
    if(!s.id.startsWith('SPR'))assert.equal(missionProgress(o),o.objectives[side]);
  }
});

test('delivery summary counts only completed manifests and retains the remaining cargo',()=>{
  const g=create('SPR-H01');
  g.assets[0].tileId=g.geography!.goals.find(g=>g.id==='Outpost')!.tileIds.find(t=>!g.assets.some(a=>a.tileId===t))!;
  const order:Order={type:'deliver',asset:'B1',target:'S1'};
  const after=resolveRound(g,{blue:[order],red:[]});
  const text=roundSummary(reviewed(g,[order],after),1).lines.join(' ');
  assert.match(text,/1 routine manifests delivered this round/);
  assert.match(text,/Blue needs 3 by end of round 6/);
  assert.deepEqual(after.assets[0].cargo,['S2']);
});


test('regional locator is display-only, scoped to its own region and never duplicates ships',()=>{
  const maps=loadGeographicRules().maps, regional=maps.get('palawan-spratlys/overview')!, focus=maps.get('palawan-spratlys/focus')!;
  const before=JSON.stringify([regional,focus]);
  const markers=activeExerciseLocator(regional,focus);
  assert.equal(markers.length,1);assert.equal(markers[0].labelOnly,true);
  assert.ok(regional.cells.some(c=>c.id===markers[0].tileId));
  assert.ok(markers[0].areaTiles!.every(id=>regional.cells.some(c=>c.id===id)));
  assert.equal(activeExerciseLocator(focus,focus).length,0);
  assert.equal(activeExerciseLocator(maps.get('taiwan-senkaku/overview')!,focus).length,0);
  assert.equal(JSON.stringify([regional,focus]),before);
});
