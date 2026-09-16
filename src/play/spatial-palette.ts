import * as THREE from 'three';
import type { WebXRSpaceEventMap } from 'three/src/renderers/webxr/WebXRController.js';
import { makeMiniature } from './miniatures.ts';
import type { MiniatureKind } from './miniatures.ts';
import type { Force } from '../pieces.ts';
import { panelTargetAt } from './panel.ts';
import type { TablePanel } from './panel.ts';
import type { PieceLayer } from './piece-layer.ts';
export interface GrabSource {definitionId?:string;pieceId?:string}
export interface GrabSpec {name:string;model:MiniatureKind;force:Force;pieceId?:string}
export interface GrabBindings {
  begin:(source:GrabSource)=>GrabSpec|null;
  preview:(tileId:string|null)=>{allowed:boolean;reason:string};
  release:(tileId:string|null)=>void;
  cancel:()=>void;
  version:()=>string;
}
/** WebXR refreshes local poses before input events, but matrixWorld may still be from the previous frame. */
export function controllerRay(ray:THREE.Raycaster,controller:THREE.Group){
  controller.updateWorldMatrix(true,false);
  ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
  ray.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);
}
function textMesh(text:string,width:number,height:number) {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=100;
  const c=canvas.getContext('2d')!;c.fillStyle='#213e47';c.fillRect(0,0,768,100);c.fillStyle='#f4e7c7';c.font='bold 43px sans-serif';c.textAlign='center';c.fillText(text,384,66,720);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
}
/** Local presentation only: the handle moves the palette, never the map or game state. */
export class SpatialPalette {
  readonly root=new THREE.Group();
  private handle:THREE.Mesh;
  private hideButton:THREE.Mesh;
  private tab=textMesh('Units  +',.24,.075);
  private hidden=false;
  private mover:THREE.Object3D|null=null;
  private board:THREE.Group;
  readonly panel:THREE.Mesh;
  constructor(board:THREE.Group,panel:THREE.Mesh){
    this.board=board;this.panel=panel;
    panel.geometry.computeBoundingBox();const size=panel.geometry.boundingBox!.getSize(new THREE.Vector3());
    const height=.085,width=size.x;
    this.handle=textMesh('Hold SIDE GRIP to move menu',width-.10,height);this.hideButton=textMesh('−',.09,height);
    this.root.position.copy(panel.position);this.root.quaternion.copy(panel.quaternion);board.add(this.root);this.root.attach(panel);panel.position.set(0,0,0);panel.rotation.set(0,0,0);
    const top=size.y/2+height/2+.006;
    this.handle.position.set(-.05,top,.003);this.hideButton.position.set(width/2-.045,top,.003);this.tab.position.set(0,top,.003);this.tab.visible=false;
    this.root.add(this.handle,this.hideButton,this.tab);this.root.visible=false;
  }
  get hits(){return this.root.visible?(this.hidden?[this.tab]:[this.panel,this.handle,this.hideButton]):[];}
  get isHidden(){return this.hidden;}
  get moving(){return !!this.mover;}
  get moveController(){return this.mover;}
  setActive(active:boolean){if(!active)this.endMove();this.root.visible=active;this.panel.visible=!this.hidden;}
  toggle(){this.hidden=!this.hidden;this.panel.visible=!this.hidden;this.handle.visible=!this.hidden;this.hideButton.visible=!this.hidden;this.tab.visible=this.hidden;}
  click(hit:THREE.Intersection){if(hit.object===this.tab||hit.object===this.hideButton){this.toggle();return true;}return hit.object===this.handle;}
  canMove(hit?:THREE.Intersection){return !!hit&&(hit.object===this.handle||hit.object===this.tab||(hit.object===this.panel&&!!hit.uv&&hit.uv.y>=1-105/1280));}
  hover(hit?:THREE.Intersection){(this.handle.material as THREE.MeshBasicMaterial).color.set(this.canMove(hit)?'#ffe19b':'#ffffff');}
  beginMove(controller:THREE.Object3D,hit?:THREE.Intersection){if(this.mover||!this.canMove(hit))return false;controller.attach(this.root);this.mover=controller;return true;}
  endMove(controller?:THREE.Object3D){if(this.mover&&(!controller||controller===this.mover)){this.board.attach(this.root);this.mover=null;}}
}

/** Controller grip lifecycle shared by both original terrain renderers. */
export class MiniatureGrabber {
  bindings:GrabBindings|null=null;
  private active:{controller:THREE.Group;grip:THREE.Group;mesh:THREE.Mesh;snap:THREE.Mesh;tile:string|null;key:string}|null=null;
  private tipCanvas=document.createElement('canvas');
  private tipTexture:THREE.CanvasTexture;
  private tip:THREE.Sprite;
  private board:THREE.Group;
  private pieces:PieceLayer;
  private palette:SpatialPalette;
  private panel:()=>TablePanel|null;
  private feedback:{grip:THREE.Group;until:number}|null=null;
  private tipKey='';
  private squeezeStarts=0;
  private lastResult='No grip input yet';
  constructor(scene:THREE.Scene,board:THREE.Group,pieces:PieceLayer,palette:SpatialPalette,panel:()=>TablePanel|null){
    this.board=board;this.pieces=pieces;this.palette=palette;this.panel=panel;
    this.tipCanvas.width=768;this.tipCanvas.height=128;this.tipTexture=new THREE.CanvasTexture(this.tipCanvas);this.tipTexture.colorSpace=THREE.SRGBColorSpace;
    this.tip=new THREE.Sprite(new THREE.SpriteMaterial({map:this.tipTexture,depthTest:false}));this.tip.scale.set(.30,.05,1);this.tip.renderOrder=25;this.tip.visible=false;scene.add(this.tip);
  }
  get holding(){return !!this.active;}
  get diagnostics(){return{squeezeStarts:this.squeezeStarts,lastResult:this.lastResult,holding:this.holding,movingMenu:this.palette.moving};}
  bindController(controller:THREE.Group<WebXRSpaceEventMap>,grip:THREE.Group,hit:()=>THREE.Intersection|undefined){
    controller.addEventListener('squeezestart',()=>{this.squeezeStarts++;this.begin(controller,grip,hit());});
    controller.addEventListener('squeezeend',()=>this.end(controller,grip));
    controller.addEventListener('disconnected',()=>this.cancel());
  }
  /** Close controller contact wins over the ray; no precision pointing is needed within reach. */
  target(grip:THREE.Group,rayHit?:THREE.Intersection):THREE.Intersection|undefined {
    const point=grip.localToWorld(new THREE.Vector3(0,0,-.07));
    let closest:THREE.Intersection|undefined,best=.085;
    for(const object of [...this.palette.hits,...this.pieces.pieceHits.filter(p=>p.visible)]){
      object.updateWorldMatrix(true,false);if(!object.geometry.boundingBox)object.geometry.computeBoundingBox();
      const box=object.geometry.boundingBox!,local=object.worldToLocal(point.clone());
      const contact=object.localToWorld(box.clampPoint(local,new THREE.Vector3())),distance=point.distanceTo(contact);
      if(distance>=best)continue;
      const size=box.getSize(new THREE.Vector3());
      // Panel targets use the point projected onto their face, not an extended invisible edge.
      if(!object.userData.pieceId&&(local.x<box.min.x||local.x>box.max.x||local.y<box.min.y||local.y>box.max.y))continue;
      closest={object,distance,point:contact,uv:object.userData.pieceId?undefined:new THREE.Vector2((local.x-box.min.x)/size.x,(local.y-box.min.y)/size.y)};best=distance;
    }
    return closest??rayHit;
  }
  private showTip(title:string,detail:string,allowed:boolean){
    const key=title+'|'+detail+'|'+allowed;if(key!==this.tipKey){
      this.tipKey=key;const c=this.tipCanvas.getContext('2d')!;
      c.fillStyle=allowed?'#244e46':'#613d38';c.fillRect(0,0,768,128);c.fillStyle='#fff3d7';c.font='bold 32px sans-serif';c.textAlign='center';c.fillText(title,384,43,730);c.font='25px sans-serif';c.fillText(detail,384,89,730);this.tipTexture.needsUpdate=true;
    }
    this.tip.visible=true;
  }
  private feedbackAt(grip:THREE.Group,title:string,detail:string,allowed=false){
    this.lastResult=title;this.feedback={grip,until:performance.now()+2500};this.showTip(title,detail,allowed);
  }
  begin(controller:THREE.Group,grip:THREE.Group,hit?:THREE.Intersection){
    if(this.active||this.palette.moving)return;
    if(!controller.visible||!grip.visible){this.lastResult='Controller tracking unavailable';return;}
    hit=this.target(grip,hit);
    if(this.palette.beginMove(grip,hit)){this.feedbackAt(grip,'Moving menu','Move your controller; release SIDE GRIP to leave it.',true);return;}
    if(!hit||!this.bindings){this.feedbackAt(grip,'Nothing grabbed','Touch or point at a unit or the menu handle.');return;}
    const panel=this.panel();
    const target=hit.object===this.palette.panel&&hit.uv&&panel?panelTargetAt(panel,hit.uv.x,hit.uv.y):undefined;
    const source:GrabSource|undefined=hit.object.userData.pieceId?{pieceId:hit.object.userData.pieceId}:target?.enabled!==false?target?.grab:undefined;
    if(!source){this.feedbackAt(grip,'Nothing grabbed',target?'Use the trigger for details; grip an available unit.':'Touch or point at a unit or the menu handle.');return;}
    const spec=this.bindings.begin(source);if(!spec){this.feedbackAt(grip,'Pickup unavailable','Check the menu for eligibility or connection status.');return;}
    const mesh=makeMiniature(spec.model,spec.force);mesh.scale.setScalar(.065);mesh.position.set(0,0,-.07);grip.add(mesh);
    const snap=makeMiniature(spec.model,spec.force);snap.scale.setScalar(this.pieces.size);snap.material=snap.material.clone();(snap.material as THREE.MeshStandardMaterial).transparent=true;(snap.material as THREE.MeshStandardMaterial).opacity=.5;snap.visible=false;this.board.add(snap);
    this.feedback=null;this.lastResult='Holding '+spec.name;
    this.pieces.hold(spec.pieceId??null);this.active={controller,grip,mesh,snap,tile:null,key:''};this.update();
  }
  update(){
    if(this.palette.moveController&&!this.palette.moveController.visible){this.cancel();return;}
    const a=this.active;if(!a||!this.bindings){
      if(this.feedback&&(this.palette.moving||performance.now()<this.feedback.until)&&this.feedback.grip.visible){this.tip.position.copy(this.feedback.grip.localToWorld(new THREE.Vector3(0,.10,-.07)));}
      else{this.tip.visible=false;this.feedback=null;}return;
    }
    if(!a.controller.visible||!a.grip.visible){this.cancel();return;}
    a.grip.updateWorldMatrix(true,true);const world=a.mesh.getWorldPosition(new THREE.Vector3()),local=this.board.worldToLocal(world.clone());
    const worldScale=this.board.getWorldScale(new THREE.Vector3()).x;
    const cell=this.pieces.nearest(local,Infinity);a.tile=this.pieces.nearest(local,.13/worldScale)?.id??null;
    this.tip.position.copy(world).add(new THREE.Vector3(0,.09,0));
    const key=(a.tile??'')+'|'+(cell?.id??'')+'|'+this.bindings.version();if(key!==a.key){
      a.key=key;const result=this.bindings.preview(a.tile);
      this.showTip(result.allowed?'Release SIDE GRIP to place':cell&&!a.tile?'Lower the piece toward the board':'Cannot place here',cell&&!a.tile?'Keep holding until the preview turns green.':result.reason,result.allowed);
      a.snap.visible=!!cell;if(cell){a.snap.position.set(cell.x,cell.y+.007,cell.z);(a.snap.material as THREE.MeshStandardMaterial).color.set(result.allowed?'#bfffc7':'#f09383');}
    }
  }
  end(controller:THREE.Group,grip:THREE.Group){
    if(this.palette.moveController===grip){this.palette.endMove(grip);this.feedbackAt(grip,'Menu positioned','Hold SIDE GRIP on the handle to move it again.',true);}
    if(this.active?.controller!==controller)return;
    this.update();if(!this.active)return;
    const tile=this.active.tile,result=this.bindings?.preview(tile);this.clear();
    this.feedbackAt(grip,result?.allowed?'Placement submitted':'Drop cancelled',result?.reason??'No destination selected.',!!result?.allowed);this.bindings?.release(tile);
  }
  cancel(){this.palette.endMove();this.feedback=null;this.tip.visible=false;if(!this.active)return;this.lastResult='Pickup cancelled';this.clear();this.bindings?.cancel();}
  private clear(){const a=this.active;if(!a)return;a.mesh.removeFromParent();a.snap.removeFromParent();(a.snap.material as THREE.Material).dispose();this.active=null;this.tip.visible=false;this.pieces.hold(null);}
}
