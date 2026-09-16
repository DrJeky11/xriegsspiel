import * as THREE from 'three';
import { makeMiniature } from './miniatures.ts';
import type { MiniatureKind } from './miniatures.ts';
export interface TablePiece { id:string; tileId:string; force:'red'|'blue'; symbol:string; name:string; model:MiniatureKind; selected:boolean; cargo:number; layer:string; sideLabel?:string; labelOnly?:boolean; areaTiles?:string[]; tag?:string }
export interface VisualCell { id:string; x:number; z:number; y:number }
/** Tokens and route overlays in the original terrain renderer's local coordinates. */
export class PieceLayer {
  readonly pieces=new THREE.Group();
  readonly routes=new THREE.Group();
  pieceHits:THREE.Mesh[]=[];
  select:((id:string)=>void)|null=null;
  private cells=new Map<string,VisualCell>();
  private radius=.02;
  private stamp='';
  private label:THREE.Sprite|null=null;
  private labelId:string|null=null;
  private sectorLabels:THREE.Sprite[]=[];
  private heldId:string|null=null;
  private models=new Map<string,THREE.Mesh>();
  private current: [TablePiece[],string[],string[],(id:string)=>void]=[[],[],[],()=>{}];
  configure(cells:VisualCell[],radius:number) { this.cells=new Map(cells.map(c=>[c.id,c]));this.radius=radius;this.stamp='';this.set(...this.current); }
  private disposeGroup(group:THREE.Group) {
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if('map' in m&&m.map instanceof THREE.Texture)textures.add(m.map);}}});
    group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  set(pieces:TablePiece[],reachable:string[],path:string[],select:(id:string)=>void) {
    this.current=[pieces,reachable,path,select];this.select=select;
    const stamp=JSON.stringify([pieces,reachable,path]);if(stamp===this.stamp)return;this.stamp=stamp;
    this.clearLabel();for(const s of this.sectorLabels){s.material.map?.dispose();s.material.dispose();}this.sectorLabels=[];this.pieces.clear();this.models.clear();this.disposeGroup(this.routes);this.pieceHits=[];
    const byId=this.cells;
    const highlights=reachable.map(id=>byId.get(id)).filter((c):c is VisualCell=>!!c);
    if(highlights.length) {
      const geometry=new THREE.RingGeometry(this.radius*.76,this.radius*.86,6);geometry.rotateX(-Math.PI/2);geometry.rotateY(Math.PI/6);
      const mesh=new THREE.InstancedMesh(geometry,new THREE.MeshBasicMaterial({color:'#e7d29a',transparent:true,opacity:.7,depthTest:false,side:THREE.DoubleSide}),highlights.length);
      highlights.forEach((c,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(c.x,c.y+.012,c.z)));mesh.renderOrder=4;this.routes.add(mesh);
    }
    const points=path.map(id=>byId.get(id)).filter((c):c is VisualCell=>!!c).map(c=>new THREE.Vector3(c.x,c.y+.026,c.z));
    if(points.length>1){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:'#fff0bd',depthTest:false}));line.renderOrder=7;this.routes.add(line);}
    for(const p of pieces) {
      const cell=byId.get(p.tileId);if(!cell)continue;
      if(p.areaTiles){
        const geometry=new THREE.RingGeometry(this.radius*.66,this.radius*.73,6);geometry.rotateX(-Math.PI/2);geometry.rotateY(Math.PI/6);
        const material=new THREE.MeshBasicMaterial({color:'#76d5bd',transparent:true,opacity:.85,depthTest:false,side:THREE.DoubleSide});
        for(const id of p.areaTiles){const c=byId.get(id);if(!c)continue;const ring=new THREE.Mesh(geometry,material);ring.position.set(c.x,c.y+.01,c.z);ring.renderOrder=3;this.routes.add(ring);}
      }
      if(p.labelOnly){
        const canvas=document.createElement('canvas');const c=canvas.getContext('2d')!;c.font='bold 38px sans-serif';canvas.width=Math.ceil(c.measureText(p.name).width)+48;canvas.height=96;
        c.fillStyle='#142e37';c.fillRect(0,0,canvas.width,96);c.strokeStyle='#d6c49e';c.lineWidth=4;c.strokeRect(2,2,canvas.width-4,92);c.fillStyle='#fff0ce';c.font='bold 38px sans-serif';c.textAlign='center';c.fillText(p.name,canvas.width/2,62,canvas.width-24);
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));
        const width=(p.areaTiles?Math.max(this.radius*3,.08):Math.max(this.radius*6,.16))*canvas.width/240;label.scale.set(width,width*96/canvas.width,1);label.position.set(cell.x,cell.y+.06,cell.z);label.renderOrder=12;this.pieces.add(label);this.sectorLabels.push(label);continue;
      }
      const size=Math.max(this.radius*1.6,.025),mesh=makeMiniature(p.model,p.force);
      const offset=p.layer==='air'?-size*.46:p.layer==='inventory'?size*.46:0;
      mesh.scale.setScalar(size);mesh.position.set(cell.x+offset,cell.y+.004+(p.layer==='air'?size*.8:0),cell.z+offset);
      mesh.userData.pieceId=p.id;mesh.visible=p.id!==this.heldId;this.pieces.add(mesh);this.models.set(p.id,mesh);this.pieceHits.push(mesh);
      if(p.tag){
        const canvas=document.createElement('canvas');canvas.width=128;canvas.height=64;const c=canvas.getContext('2d')!;
        c.fillStyle=p.force==='red'?'#702f32':'#204d6b';c.fillRect(0,0,128,64);c.fillStyle='#ffffff';c.font='bold 42px sans-serif';c.textAlign='center';c.fillText(p.tag,64,47);
        const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));label.scale.set(size,size*.5,1);label.position.copy(mesh.position).add(new THREE.Vector3(0,size*.65,0));label.renderOrder=13;this.pieces.add(label);this.sectorLabels.push(label);
      }
      if(p.selected){const ring=new THREE.Mesh(new THREE.RingGeometry(size*.55,size*.64,32),new THREE.MeshBasicMaterial({color:'#fff0ad',side:THREE.DoubleSide,depthTest:false}));ring.rotation.x=-Math.PI/2;ring.position.copy(mesh.position);ring.position.y+=.002;ring.renderOrder=10;this.routes.add(ring);}

    }
    this.hover(pieces.find(p=>p.selected&&!p.tag)?.id??null);
  }
  getCell(id:string){return this.cells.get(id);}
  get size(){return Math.max(this.radius*1.6,.025);}
  /** Snapping is local to the native board; a release high above or outside it is invalid. */
  nearest(point:THREE.Vector3,maxHeight:number):VisualCell|null {
    let nearest:VisualCell|null=null,best=this.radius*this.radius;
    for(const cell of this.cells.values()){const x=Math.abs(point.x-cell.x),z=Math.abs(point.z-cell.z);if(x>this.radius*Math.sqrt(3)/2||z>this.radius-x/Math.sqrt(3))continue;const distance=x*x+z*z;if(distance<best){best=distance;nearest=cell;}}
    return nearest&&point.y>=nearest.y-.06&&point.y<=nearest.y+maxHeight?nearest:null;
  }
  hold(id:string|null){this.heldId=id;for(const [key,mesh] of this.models)mesh.visible=key!==id;if(id)this.clearLabel();}
  private clearLabel(){if(this.label){this.label.material.map?.dispose();this.label.material.dispose();this.pieces.remove(this.label);}this.label=null;this.labelId=null;}
  hover(id:string|null){
    id=id??this.current[0].find(p=>p.selected)?.id??null;if(id===this.labelId)return;this.clearLabel();
    const p=this.current[0].find(p=>p.id===id),mesh=id?this.models.get(id):null;if(!p||!mesh||id===this.heldId)return;
    const canvas=document.createElement('canvas');canvas.width=768;const c=canvas.getContext('2d')!;c.font='bold 36px sans-serif';
    const words=p.name.split(/\s+/),lines:string[]=[];let line='';for(const word of words){if(c.measureText(line+' '+word).width>720){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);
    canvas.height=Math.min(4,lines.length)*42+70;c.fillStyle='#132b34';c.fillRect(0,0,768,canvas.height);c.fillStyle='#f4e9d0';c.font='bold 36px sans-serif';c.textAlign='center';
    lines.slice(0,4).forEach((text,i)=>c.fillText(text,384,44+i*42,730));c.font='28px sans-serif';c.fillStyle='#b9d7d7';c.fillText(`${p.id}  ·  ${p.sideLabel??(p.force==='blue'?'United States':'China')}${p.cargo?' · '+p.cargo+' cargo':''}`,384,canvas.height-20,730);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    this.label=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));const width=Math.max(this.size*5,.27);this.label.scale.set(width,width*canvas.height/768,1);this.label.center.set(.5,0);this.label.position.copy(mesh.position).y+=this.size*2;this.label.renderOrder=15;this.pieces.add(this.label);this.labelId=id;
  }
}
