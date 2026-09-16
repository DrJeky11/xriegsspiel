import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {miniatureGeometry,unitVisual,UNIT_GROUPS} from '../src/play/miniatures.ts';
import type {MiniatureKind} from '../src/play/miniatures.ts';
import {PieceLayer} from '../src/play/piece-layer.ts';
import {GrabTransaction} from '../src/play/grab-transaction.ts';
import {loadGeographicRules,createScenarioSession} from '../server/scenario-session.ts';
import {panelTargets,panelTargetAt,activatePanel} from '../src/play/panel.ts';
import type {TablePanel} from '../src/play/panel.ts';
const rules=loadGeographicRules();
const hit=(object:THREE.Object3D):THREE.Intersection=>({object,distance:0,point:new THREE.Vector3()});
test('all catalog records have a browse group without changing catalog identity or rules',()=>{
 const equipment=JSON.parse(readFileSync('catalog/equipment.json','utf8')).equipment;
 const before=JSON.stringify(rules.catalog),facts=new Map(equipment.map((e:any)=>[e.id,e]));
 for(const d of rules.catalog.pieces){const v=unitVisual(d,facts.get(d.equipmentId) as any);assert.ok(UNIT_GROUPS[v.domain].includes(v.group));if(d.kind==='part')assert.equal(v.group,'Equipment');}
 assert.equal(JSON.stringify(rules.catalog),before);
 assert.equal(unitVisual({name:'Example',kind:'platform',profileId:'air-transport'},{domain:'air',taxonomy:['Rotary Wing Aircraft']}).model,'helicopter');
});
test('miniatures are finite, shared single-mesh geometry with a force-colored base',()=>{
 for(const kind of ['tank','apc','wheeled','engineer','launcher','truck','gun','radar','robot','helicopter','jet','transport','drone','ship','carrier','landing','submarine','equipment'] as MiniatureKind[]){
  const g=miniatureGeometry(kind,'blue');assert.equal(g,miniatureGeometry(kind,'blue'));assert.ok(g.attributes.position.count<10000);assert.ok(Array.from(g.attributes.position.array).every(Number.isFinite));assert.equal(g.attributes.color.count,g.attributes.position.count);
  assert.ok(g.boundingBox!.min.y>=-.001);assert.ok(g.boundingBox!.max.y<1);assert.notDeepEqual(g.attributes.color.array,miniatureGeometry(kind,'red').attributes.color.array);
 }
});
test('native terrain height and board-local distances determine a drop target',()=>{
 const layer=new PieceLayer();layer.configure([{id:'high',x:1,z:2,y:.12},{id:'low',x:1.2,z:2,y:.01}],.09);
 assert.equal(layer.nearest(new THREE.Vector3(1,.16,2),.13)?.id,'high');
 assert.equal(layer.nearest(new THREE.Vector3(1,.5,2),.13),null);
 assert.equal(layer.nearest(new THREE.Vector3(0,.15,2),.13),null);
 assert.equal(layer.nearest(new THREE.Vector3(1.084,.16,2),.13),null); // Inside the bounding circle, outside the native hex.
 assert.equal(layer.nearest(new THREE.Vector3(1,-.1,2),.13),null);
});
test('grab and release deploys and moves once on every map; invalid previews never mutate state',()=>{
 const aircraft=rules.catalog.pieces.find(p=>p.profileId==='rotary-wing'&&rules.eligibility(p.id,'blue',2026).allowed)!;
 for(const mapId of rules.maps.keys()){
  const session=createScenarioSession(rules,undefined,mapId),grab=new GrabTransaction(),initial=session.getState(),tile=rules.map(mapId).cells[0];
  const deploy={type:'deploy' as const,id:'held',definitionId:aircraft.id,force:'blue' as const,tileId:''};
  assert.equal(grab.begin(initial,deploy),true);assert.equal(grab.preview(rules,initial,null).allowed,false);assert.deepEqual(session.getState(),initial);
  const drop=grab.take(rules,initial,tile.id);assert.ok(drop.action);assert.equal(grab.take(rules,initial,tile.id).action,null);
  assert.equal(session.submit({id:'place',revision:0,operation:{type:'action',action:drop.action}}).status,200);
  const placed=session.getState(),target=[...rules.reachable(placed.exercise,'held')].find(([,r])=>r.cost===1)![0];
  grab.begin(placed,{type:'move',pieceId:'held',tileId:''});assert.equal(grab.preview(rules,placed,target).allowed,true);assert.deepEqual(session.getState(),placed);
  const move=grab.take(rules,placed,target);assert.equal(session.submit({id:'move',revision:1,operation:{type:'action',action:move.action}}).status,200);assert.equal(session.getState().exercise.pieces[0].movement,7);
 }
});
test('changed revisions/maps and cancelled or invalid releases cannot commit a held action',()=>{
 const session=createScenarioSession(rules,undefined,'hormuz'),state=session.getState(),grab=new GrabTransaction();
 const plane=rules.catalog.pieces.find(p=>p.profileId==='rotary-wing'&&rules.eligibility(p.id,'blue',2026).allowed)!;
 const action={type:'deploy' as const,id:'held',definitionId:plane.id,force:'blue' as const,tileId:''},tile=rules.map('hormuz').cells[0].id;
 for(const next of [{...state,revision:1},createScenarioSession(rules,undefined,'bab-al-mandeb').getState()]){grab.begin(state,action);assert.equal(grab.take(rules,next,tile).action,null);}
 grab.begin(state,action);grab.cancel();assert.equal(grab.take(rules,state,tile).action,null);
 grab.begin(state,action);assert.equal(grab.take(rules,state,'unknown').action,null);assert.deepEqual(session.getState(),state);
});
test('six image tiles, tabs, role filters and footer have distinct ray targets and preserve grab identity',()=>{
 let chosen='';const b=(label:string)=>({label,run:()=>{chosen=label;}});
 const panel:TablePanel={title:'Units',lines:[],buttons:Array.from({length:6},(_,i)=>b('Footer '+i)),catalog:{toolbar:[b('Force'),b('Search')],tabs:[b('Ground'),b('Air'),b('Sea')],groups:Array.from({length:8},(_,i)=>b('Group '+i)),cards:Array.from({length:6},(_,i)=>({...b('Unit '+i),model:'tank',force:'blue',available:true,grab:{definitionId:'record-'+i}}))}};
 const targets=panelTargets(panel);assert.equal(targets.length,25);
 for(const t of targets){assert.ok(t.x>=0&&t.y>=0&&t.x+t.width<=1024&&t.y+t.height<=1280);const u=(t.x+t.width/2)/1024,v=1-(t.y+t.height/2)/1280;assert.equal(panelTargetAt(panel,u,v)?.label,t.label);activatePanel(panel,u,v);assert.equal(chosen,t.label);for(const other of targets.filter(o=>o!==t))assert.ok(t.x+t.width<=other.x||other.x+other.width<=t.x||t.y+t.height<=other.y||other.y+other.height<=t.y);}
 assert.deepEqual(targets.filter(t=>t.grab).map(t=>t.grab?.definitionId),Array.from({length:6},(_,i)=>'record-'+i));
});

test('palette hiding and grip reparenting preserve the board and release at the new world pose',async()=>{
 // Canvas drawing is stubbed; this checks Three.js transforms/visibility, not headset rendering.
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}});
 try{
  const {SpatialPalette}=await import('../src/play/spatial-palette.ts');
  const scene=new THREE.Scene(),board=new THREE.Group(),grip=new THREE.Group();scene.add(board,grip);board.position.set(1,.7,-1);board.scale.setScalar(.7);
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(.64,.8),new THREE.MeshBasicMaterial());panel.position.set(1,.3,0);board.add(panel);
  const palette=new SpatialPalette(board,panel);palette.setActive(true);assert.equal(palette.hits.length,3);palette.toggle();assert.equal(palette.hits.length,1);assert.equal(panel.visible,false);palette.click(hit(palette.hits[0]));assert.equal(panel.visible,true);
  scene.updateMatrixWorld(true);const before=palette.root.getWorldPosition(new THREE.Vector3()),boardBefore=board.matrixWorld.clone();
  assert.equal(palette.beginMove(grip,hit(palette.hits[1])),true);grip.position.x+=.25;scene.updateMatrixWorld(true);const moved=palette.root.getWorldPosition(new THREE.Vector3());assert.ok(Math.abs(moved.x-before.x-.25)<1e-8);assert.deepEqual(board.matrixWorld,boardBefore);
  palette.endMove(grip);assert.equal(palette.root.parent,board);assert.ok(palette.root.getWorldPosition(new THREE.Vector3()).distanceTo(moved)<1e-8);grip.position.x+=1;scene.updateMatrixWorld(true);assert.ok(palette.root.getWorldPosition(new THREE.Vector3()).distanceTo(moved)<1e-8);
 }finally{if(old)Object.defineProperty(globalThis,'document',old);else delete (globalThis as any).document;}
});

test('controller grip drop and cancellation restore the original mesh and invoke only one completion',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){}})})}});
 try{
  const {SpatialPalette,MiniatureGrabber}=await import('../src/play/spatial-palette.ts');
  const scene=new THREE.Scene(),board=new THREE.Group(),grip=new THREE.Group(),ray=new THREE.Group();scene.add(board,grip,ray);board.position.set(1,.7,-1);board.scale.setScalar(.7);
  const layer=new PieceLayer();board.add(layer.pieces,layer.routes);layer.configure([{id:'native',x:0,y:.025,z:0}],.10);
  layer.set([{id:'P',tileId:'native',force:'blue',symbol:'▰',name:'Unit',model:'tank',selected:false,cargo:0,layer:'surface'}],[],[],()=>{});
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(.64,.8),new THREE.MeshBasicMaterial());board.add(panel);const palette=new SpatialPalette(board,panel),grabber=new MiniatureGrabber(scene,board,layer,palette,()=>null);
  const released:(string|null)[]=[],cancelled:number[]=[];grabber.bindings={begin:()=>({name:'Unit',model:'tank',force:'blue',pieceId:'P'}),preview:tile=>({allowed:tile==='native',reason:'Place'}),release:tile=>released.push(tile),cancel:()=>cancelled.push(1),version:()=> 'map:1'};
  grip.position.copy(board.position).add(new THREE.Vector3(0,.06,.07));scene.updateMatrixWorld(true);
  grabber.begin(ray,grip,hit(layer.pieceHits[0]));assert.equal(layer.pieceHits[0].visible,false);grabber.update();grabber.end(ray,grip);grabber.end(ray,grip);assert.deepEqual(released,['native']);assert.equal(layer.pieceHits[0].visible,true);
  grabber.begin(ray,grip,hit(layer.pieceHits[0]));grabber.cancel();grabber.end(ray,grip);assert.equal(cancelled.length,1);assert.equal(released.length,1);assert.equal(layer.pieceHits[0].visible,true);
 }finally{if(old)Object.defineProperty(globalThis,'document',old);else delete (globalThis as any).document;}
});
