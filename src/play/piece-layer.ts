import * as THREE from 'three';
export interface TablePiece { id:string; tileId:string; force:'red'|'blue'; symbol:string; selected:boolean; cargo:number; layer:string }
export interface VisualCell { id:string; x:number; z:number; y:number }
/** Tokens and route overlays in the original terrain renderer's local coordinates. */
export class PieceLayer {
  readonly pieces=new THREE.Group();
  readonly routes=new THREE.Group();
  pieceHits:THREE.Mesh[]=[];
  select:((id:string)=>void)|null=null;
  private cells=new Map<string,VisualCell>();
  private radius=.02;
  private current: [TablePiece[],string[],string[],(id:string)=>void]=[[],[],[],()=>{}];
  configure(cells:VisualCell[],radius:number) { this.cells=new Map(cells.map(c=>[c.id,c]));this.radius=radius;this.set(...this.current); }
  private disposeGroup(group:THREE.Group) {
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if('map' in m&&m.map instanceof THREE.Texture)textures.add(m.map);}}});
    group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  set(pieces:TablePiece[],reachable:string[],path:string[],select:(id:string)=>void) {
    this.current=[pieces,reachable,path,select];
    this.disposeGroup(this.pieces);this.disposeGroup(this.routes);this.pieceHits=[];this.select=select;
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
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;const c=canvas.getContext('2d')!;
      c.fillStyle=p.force==='blue'?'#346c8a':'#995b51';c.strokeStyle=p.selected?'#fff0ac':'#f5f0db';c.lineWidth=p.selected?15:7;
      c.beginPath();if(p.force==='blue')c.roundRect(12,12,232,232,27);else{c.moveTo(128,5);c.lineTo(251,128);c.lineTo(128,251);c.lineTo(5,128);c.closePath();}c.fill();c.stroke();
      // Original silhouettes, drawn as geometry rather than platform-dependent emoji.
      c.fillStyle='#fff9e9';c.strokeStyle='#fff9e9';c.lineWidth=7;c.lineJoin='round';
      if(p.symbol==='✈') {
        c.beginPath();c.moveTo(128,32);c.lineTo(140,75);c.lineTo(198,105);c.lineTo(198,117);c.lineTo(140,102);c.lineTo(137,127);c.lineTo(157,138);c.lineTo(99,138);c.lineTo(119,127);c.lineTo(116,102);c.lineTo(58,117);c.lineTo(58,105);c.lineTo(116,75);c.closePath();c.fill();
      } else if(p.symbol==='⚓') {
        c.beginPath();c.moveTo(55,102);c.lineTo(203,102);c.lineTo(177,136);c.lineTo(77,136);c.closePath();c.fill();c.fillRect(95,70,62,26);c.fillRect(120,35,8,35);c.fillRect(128,45,37,8);
      } else if(p.symbol==='▰') {
        c.beginPath();c.roundRect(62,81,135,52,16);c.stroke();c.fillRect(83,87,86,31);c.fillRect(106,66,39,29);c.fillRect(123,42,8,30);
      } else {c.strokeRect(85,48,88,88);c.beginPath();c.moveTo(85,48);c.lineTo(173,136);c.moveTo(173,48);c.lineTo(85,136);c.stroke();}
      c.textAlign='center';
      c.font='bold 35px sans-serif';c.fillText(p.id.length>10?`${p.force==='blue'?'B':'R'}·${p.id.slice(-5)}`:p.id,128,172,178);
      if(p.cargo){c.font='bold 29px sans-serif';c.fillText(`CARGO ${p.cargo}`,128,210);}
      const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
      const size=Math.max(this.radius*1.7,.032);
      const mesh=new THREE.Mesh(new THREE.PlaneGeometry(size,size),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide}));
      const offset=p.layer==='air'?-size*.65:p.layer==='inventory'?size*.65:0;
      mesh.rotation.x=-Math.PI/2;mesh.position.set(cell.x+offset,cell.y+.035+(p.layer==='air'?.025:0),cell.z+offset);mesh.renderOrder=p.selected?10:p.layer==='surface'?9:8;
      mesh.userData.pieceId=p.id;this.pieces.add(mesh);this.pieceHits.push(mesh);
    }

  }
}
