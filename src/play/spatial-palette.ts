import * as THREE from 'three';
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
function textMesh(text:string,width:number,height:number) {
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=100;
  const c=canvas.getContext('2d')!;c.fillStyle='#213e47';c.fillRect(0,0,768,100);c.fillStyle='#f4e7c7';c.font='bold 43px sans-serif';c.textAlign='center';c.fillText(text,384,66,720);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));
}
/** Local presentation only: the handle moves the palette, never the map or game state. */
export class SpatialPalette {
  readonly root=new THREE.Group();
  private handle=textMesh('⠿  Grip to move',.52,.065);
  private hideButton=textMesh('−',.09,.065);
  private tab=textMesh('Units  +',.24,.075);
  private hidden=false;
  private mover:THREE.Object3D|null=null;
  private board:THREE.Group;
  readonly panel:THREE.Mesh;
  constructor(board:THREE.Group,panel:THREE.Mesh){
    this.board=board;this.panel=panel;
    this.root.position.copy(panel.position);this.root.quaternion.copy(panel.quaternion);board.add(this.root);this.root.attach(panel);panel.position.set(0,0,0);panel.rotation.set(0,0,0);
    this.handle.position.set(-.055,.447,.003);this.hideButton.position.set(.27,.447,.003);this.tab.position.set(0,.447,.003);this.tab.visible=false;
    this.root.add(this.handle,this.hideButton,this.tab);this.root.visible=false;
  }
  get hits(){return this.root.visible?(this.hidden?[this.tab]:[this.panel,this.handle,this.hideButton]):[];}
  get isHidden(){return this.hidden;}
  get moving(){return !!this.mover;}
  setActive(active:boolean){if(!active)this.endMove();this.root.visible=active;this.panel.visible=!this.hidden;}
  toggle(){this.hidden=!this.hidden;this.panel.visible=!this.hidden;this.handle.visible=!this.hidden;this.hideButton.visible=!this.hidden;this.tab.visible=this.hidden;}
  click(hit:THREE.Intersection){if(hit.object===this.tab||hit.object===this.hideButton){this.toggle();return true;}return hit.object===this.handle;}
  beginMove(controller:THREE.Object3D,hit?:THREE.Intersection){if(this.mover||hit?.object!==this.handle)return false;controller.attach(this.root);this.mover=controller;return true;}
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
  constructor(scene:THREE.Scene,board:THREE.Group,pieces:PieceLayer,palette:SpatialPalette,panel:()=>TablePanel|null){
    this.board=board;this.pieces=pieces;this.palette=palette;this.panel=panel;
    this.tipCanvas.width=768;this.tipCanvas.height=128;this.tipTexture=new THREE.CanvasTexture(this.tipCanvas);this.tipTexture.colorSpace=THREE.SRGBColorSpace;
    this.tip=new THREE.Sprite(new THREE.SpriteMaterial({map:this.tipTexture,depthTest:false}));this.tip.scale.set(.30,.05,1);this.tip.renderOrder=25;this.tip.visible=false;scene.add(this.tip);
  }
  get holding(){return !!this.active;}
  begin(controller:THREE.Group,grip:THREE.Group,hit?:THREE.Intersection){
    if(this.active||this.palette.moving)return;
    if(this.palette.beginMove(grip,hit))return;
    if(!hit||!this.bindings)return;
    const panel=this.panel();
    const source:GrabSource|undefined=hit.object.userData.pieceId?{pieceId:hit.object.userData.pieceId}:hit.object===this.palette.panel&&hit.uv&&panel?panelTargetAt(panel,hit.uv.x,hit.uv.y)?.grab:undefined;
    if(!source)return;
    const spec=this.bindings.begin(source);if(!spec)return;
    const mesh=makeMiniature(spec.model,spec.force);mesh.scale.setScalar(.065);mesh.position.set(0,0,-.07);grip.add(mesh);
    const snap=makeMiniature(spec.model,spec.force);snap.scale.setScalar(this.pieces.size);snap.material=snap.material.clone();(snap.material as THREE.MeshStandardMaterial).transparent=true;(snap.material as THREE.MeshStandardMaterial).opacity=.5;snap.visible=false;this.board.add(snap);
    this.pieces.hold(spec.pieceId??null);this.active={controller,grip,mesh,snap,tile:null,key:''};this.tip.visible=true;
  }
  update(){
    const a=this.active;if(!a||!this.bindings)return;
    a.grip.updateWorldMatrix(true,true);const world=a.mesh.getWorldPosition(new THREE.Vector3()),local=this.board.worldToLocal(world.clone());
    const worldScale=this.board.getWorldScale(new THREE.Vector3()).x;
    const cell=this.pieces.nearest(local,.13/worldScale);a.tile=cell?.id??null;
    this.tip.position.copy(world).add(new THREE.Vector3(0,.09,0));
    const key=(a.tile??'')+'|'+this.bindings.version();if(key!==a.key){
      a.key=key;const result=this.bindings.preview(a.tile);const c=this.tipCanvas.getContext('2d')!;
      c.fillStyle=result.allowed?'#244e46':'#613d38';c.fillRect(0,0,768,128);c.fillStyle='#fff3d7';c.font='bold 32px sans-serif';c.textAlign='center';c.fillText(result.allowed?'✓ Release to place':'× Cannot place here',384,43,730);c.font='25px sans-serif';c.fillText(result.reason,384,89,730);this.tipTexture.needsUpdate=true;
      a.snap.visible=!!cell;if(cell){a.snap.position.set(cell.x,cell.y+.007,cell.z);(a.snap.material as THREE.MeshStandardMaterial).color.set(result.allowed?'#bfffc7':'#f09383');}
    }
  }
  end(controller:THREE.Group,grip:THREE.Group){
    this.palette.endMove(grip);if(this.active?.controller!==controller)return;
    this.update();const tile=this.active.tile;this.clear();this.bindings?.release(tile);
  }
  cancel(){this.palette.endMove();if(!this.active)return;this.clear();this.bindings?.cancel();}
  private clear(){const a=this.active;if(!a)return;a.mesh.removeFromParent();a.snap.removeFromParent();(a.snap.material as THREE.Material).dispose();this.active=null;this.tip.visible=false;this.pieces.hold(null);}
}
