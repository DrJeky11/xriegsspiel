import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { WebXRController } from 'three/src/renderers/webxr/WebXRController.js';
import { SpatialPalette, MiniatureGrabber, controllerRay } from '../src/play/spatial-palette.ts';
import type { GrabSource } from '../src/play/spatial-palette.ts';
import { PieceLayer } from '../src/play/piece-layer.ts';
import { panelTargets } from '../src/play/panel.ts';
import type { TablePanel } from '../src/play/panel.ts';

// Real Three.js raycasts, transforms and WebXR event dispatch; canvas text is stubbed.
function fixture(run:(f:ReturnType<typeof setup>)=>void,centcom=false){
  const old=Object.getOwnPropertyDescriptor(globalThis,'document');
  Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:()=>({width:0,height:0,getContext:()=>({fillRect(){},fillText(){},measureText:(s:string)=>({width:s.length*15})})})}});
  try{run(setup(centcom));}finally{if(old)Object.defineProperty(globalThis,'document',old);else delete (globalThis as any).document;}
}
function setup(centcom:boolean){
  const scene=new THREE.Scene(),board=new THREE.Group(),xr=new WebXRController(),other=new WebXRController();
  const controller=xr.getTargetRaySpace(),grip=xr.getGripSpace(),otherGrip=other.getGripSpace();
  controller.matrixAutoUpdate=grip.matrixAutoUpdate=otherGrip.matrixAutoUpdate=true;
  controller.visible=grip.visible=true;scene.add(board,controller,grip,other.getTargetRaySpace(),otherGrip);
  board.position.set(.3,.7,-1);board.scale.setScalar(centcom?.8:.65);board.rotation.y=.35;
  const width=centcom?.43:.64,height=centcom?.516:.8;
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));
  panel.position.set(1.2,.32,0);if(centcom)panel.rotation.x=-Math.PI/3;else panel.rotation.y=-.3;board.add(panel);
  const palette=new SpatialPalette(board,panel);palette.setActive(true);
  const layer=new PieceLayer();board.add(layer.pieces,layer.routes);layer.configure([{id:'hex',x:0,y:.025,z:0}],.10);
  layer.set([{id:'P',tileId:'hex',force:'blue',symbol:'',name:'Tank',model:'tank',selected:false,cargo:0,layer:'surface'}],[],[],()=>{});
  const table:TablePanel={title:'Units',lines:[],buttons:[],catalog:{toolbar:[],tabs:[],groups:[],cards:[{label:'Tank',model:'tank',force:'blue',available:true,grab:{definitionId:'tank'},run(){}}]}};
  const grabber=new MiniatureGrabber(scene,board,layer,palette,()=>table),ray=new THREE.Raycaster();
  const begun:GrabSource[]=[],released:(string|null)[]=[],cancelled:number[]=[];
  grabber.bindings={begin:source=>{begun.push(source);return{name:'Tank',model:'tank',force:'blue',pieceId:source.pieceId};},preview:tile=>({allowed:tile==='hex',reason:tile?'Valid':'No destination'}),release:tile=>released.push(tile),cancel:()=>cancelled.push(1),version:()=> 'map:0'};
  const rayHit=()=>{board.updateWorldMatrix(true,true);palette.root.updateWorldMatrix(true,true);controllerRay(ray,controller);return ray.intersectObjects([...palette.hits,...layer.pieceHits.filter(p=>p.visible)],false)[0];};
  grabber.bindController(controller,grip,rayHit);grabber.bindController(other.getTargetRaySpace(),otherGrip,()=>undefined);
  const card=panelTargets(table).find(t=>t.grab)!,u=(card.x+card.width/2)/1024,v=1-(card.y+card.height/2)/1280;
  const cardPoint=()=>panel.localToWorld(new THREE.Vector3((u-.5)*width,(v-.5)*height,0));
  const at=(world:THREE.Vector3)=>{grip.quaternion.identity();grip.position.copy(world).add(new THREE.Vector3(0,0,.07));};
  const drop=(height=.06)=>at(board.localToWorld(new THREE.Vector3(0,height,0)));
  return{scene,board,xr,other,controller,grip,panel,palette,layer,table,grabber,begun,released,cancelled,cardPoint,at,drop,width,height};
}

test('squeeze picks up a nearby palette tile with the ray pointing away, then releases exactly once',()=>{
  for(const centcom of [false,true])fixture(f=>{
    f.at(f.cardPoint());f.controller.position.set(4,4,4);f.controller.rotation.y=Math.PI/2;
    f.xr.dispatchEvent({type:'squeezestart'});assert.deepEqual(f.begun,[{definitionId:'tank'}]);assert.equal(f.grabber.holding,true);
    f.other.dispatchEvent({type:'squeezeend'});assert.equal(f.grabber.holding,true);
    f.drop();f.xr.dispatchEvent({type:'squeezeend'});f.xr.dispatchEvent({type:'squeezeend'});
    assert.deepEqual(f.released,['hex']);assert.equal(f.grabber.diagnostics.squeezeStarts,1);
  },centcom);
});

test('ray pickup uses the fresh WebXR local pose even before a render updates matrixWorld',()=>fixture(f=>{
  f.grip.position.set(5,5,5);f.scene.updateMatrixWorld(true);const old=f.controller.matrixWorld.clone();
  const point=f.cardPoint();f.controller.position.copy(point).add(new THREE.Vector3(0,0,1));f.controller.quaternion.identity();
  // WebXR uses matrixAutoUpdate=false and updates matrix directly in its input event.
  f.controller.updateMatrix();f.controller.matrixAutoUpdate=false;
  assert.deepEqual(f.controller.matrixWorld,old);
  f.xr.dispatchEvent({type:'squeezestart'});assert.deepEqual(f.begun,[{definitionId:'tank'}]);
  f.drop();f.xr.dispatchEvent({type:'squeezeend'});assert.deepEqual(f.released,['hex']);
}));

test('close pickup of a placed piece hides it until drop, and high releases cancel',()=>fixture(f=>{
  const mesh=f.layer.pieceHits[0];f.at(mesh.getWorldPosition(new THREE.Vector3()));
  f.xr.dispatchEvent({type:'squeezestart'});assert.deepEqual(f.begun,[{pieceId:'P'}]);assert.equal(mesh.visible,false);
  f.drop(.5);f.grabber.update();f.xr.dispatchEvent({type:'squeezeend'});
  assert.deepEqual(f.released,[null]);assert.equal(mesh.visible,true);assert.equal(f.grabber.diagnostics.lastResult,'Drop cancelled');
}));

test('tracking loss during a hold or on release cancels without submitting a placement',()=>{
  for(const onRelease of [false,true])fixture(f=>{
    f.at(f.cardPoint());f.xr.dispatchEvent({type:'squeezestart'});f.drop();f.grip.visible=false;
    if(onRelease)f.xr.dispatchEvent({type:'squeezeend'});else f.grabber.update();
    assert.equal(f.grabber.holding,false);assert.deepEqual(f.cancelled,[1]);assert.deepEqual(f.released,[]);
  });
});

test('both panel sizes have attached handles, and the title can move the menu without touching the board',()=>{
  for(const centcom of [false,true])fixture(f=>{
    const handle=f.palette.hits[1];handle.geometry.computeBoundingBox();
    assert.ok(Math.abs(handle.position.y+handle.geometry.boundingBox!.min.y-f.height/2-.006)<1e-7);
    const world=f.panel.localToWorld(new THREE.Vector3(0,f.height*.475,0));f.at(world);f.scene.updateMatrixWorld(true);
    const before=f.palette.root.getWorldPosition(new THREE.Vector3()),boardBefore=f.board.matrixWorld.clone();
    f.xr.dispatchEvent({type:'squeezestart'});assert.equal(f.palette.moving,true);assert.equal(f.begun.length,0);
    f.grip.position.x+=.25;f.other.dispatchEvent({type:'squeezeend'});assert.equal(f.palette.moving,true);
    f.xr.dispatchEvent({type:'squeezeend'});assert.equal(f.palette.root.parent,f.board);assert.equal(f.palette.moving,false);
    assert.ok(Math.abs(f.palette.root.getWorldPosition(new THREE.Vector3()).x-before.x-.25)<1e-7);
    assert.deepEqual(f.board.matrixWorld,boardBefore);assert.deepEqual(f.released,[]);
    f.palette.toggle();const tab=f.palette.hits[0];f.at(tab.getWorldPosition(new THREE.Vector3()));
    f.xr.dispatchEvent({type:'squeezestart'});assert.equal(f.palette.moving,true);
    f.grip.visible=false;f.grabber.update();assert.equal(f.palette.root.parent,f.board);assert.equal(f.palette.moving,false);
  },centcom);
});

test('misses and disabled tiles give feedback without starting a draft; disconnect restores a held piece',()=>fixture(f=>{
  f.at(new THREE.Vector3(5,5,5));f.controller.position.set(5,5,5);f.xr.dispatchEvent({type:'squeezestart'});
  assert.equal(f.grabber.diagnostics.lastResult,'Nothing grabbed');assert.deepEqual(f.begun,[]);
  f.table.catalog!.cards[0].enabled=false;f.at(f.cardPoint());f.xr.dispatchEvent({type:'squeezestart'});assert.deepEqual(f.begun,[]);
  f.at(f.layer.pieceHits[0].getWorldPosition(new THREE.Vector3()));f.xr.dispatchEvent({type:'squeezestart'});
  f.xr.dispatchEvent({type:'disconnected'});assert.equal(f.layer.pieceHits[0].visible,true);assert.deepEqual(f.cancelled,[1]);assert.deepEqual(f.released,[]);
}));
