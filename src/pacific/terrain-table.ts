import * as THREE from 'three';
import { SpatialPalette, MiniatureGrabber } from '../play/spatial-palette.ts';
import type { GrabBindings } from '../play/spatial-palette.ts';
import { PieceLayer } from '../play/piece-layer.ts';
import type { TablePiece } from '../play/piece-layer.ts';
import { drawPanel, activatePanel, panelTargetAt } from '../play/panel.ts';
import type { TablePanel } from '../play/panel.ts';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { project, keyOf } from './terrain.ts';
import type { TerrainMap, Cell, Surface } from './terrain.ts';

export const SURFACES: Record<Surface,{name:string;color:string;note:string}> = {
  ocean:{name:'Open water',color:'#244c5b',note:'Water in the land/reef dataset. Depth and under-keel clearance are unknown.'},
  coast:{name:'Coast / small island',color:'#8f9c81',note:'Land and water share this hex. A coastal hex is not entirely traversable land.'},
  land:{name:'Land',color:'#77876a',note:'Land at the center and sampled corners. Elevation, vegetation, and roads are not modeled.'},
  reef:{name:'Reef',color:'#6bad9d',note:'Mapped reef intersects this hex. This is not dry land; tidal exposure and depth are unknown.'},
  lagoon:{name:'Lagoon',color:'#3d8584',note:'Interior water ring in the mapped reef. Depth and navigable passages are unknown.'},
};
interface Callbacks { select:(cell:Cell)=>void; nextRegion:()=>void; toggleFocus:()=>void; mode:(active:boolean)=>void }
export type { TablePiece } from '../play/piece-layer.ts';
export type { TablePanel } from '../play/panel.ts';
export class TerrainTable {
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(43,1,.01,40);
  renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
  controls:OrbitControls;
  board=new THREE.Group();
  terrain=new THREE.Group();
  labels=new THREE.Group();
  private pieceLayer=new PieceLayer();
  private palette:SpatialPalette;
  private grabber:MiniatureGrabber;
  private scenarioPanel:TablePanel|null=null;
  private guides=new THREE.Group();
  ray=new THREE.Raycaster();
  map:TerrainMap|null=null;
  selected:Cell|null=null;
  private tiles:THREE.InstancedMesh|null=null;
  private unit=.002;
  private radius=.02;
  private panelCanvas=document.createElement('canvas');
  private panelTexture:THREE.CanvasTexture;
  private panel:THREE.Mesh;
  private outline=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#f1d39c',depthTest:false}));
  private hover=new THREE.LineLoop(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:'#f1e9d4',transparent:true,opacity:.7,depthTest:false}));
  private controllers:THREE.Group[]=[];
  private sources=new Map<THREE.Group,XRInputSource>();
  private panelActions:(()=>void)[]=[];
  private recenter=false;
  private xrMode:'immersive-vr'|'immersive-ar'='immersive-vr';
  private lastTime=0;
  private labelsShown=true;
  private start={x:0,y:0};
  stats={frames:0,drawCalls:0,triangles:0,xrFrames:0,xrSessionStarts:0};
  constructor(private container:HTMLElement,private callbacks:Callbacks) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
    this.renderer.setClearColor('#102630');
    this.renderer.xr.enabled=true;
    this.renderer.xr.setReferenceSpaceType('local-floor');
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.domElement.tabIndex=0;
    this.renderer.domElement.setAttribute('aria-label','Hex terrain map. Click to inspect. Arrow keys move selection; Q and E select diagonal neighbors. Right drag rotates, wheel zooms.');
    container.append(this.renderer.domElement);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);
    this.controls.enableDamping=true; this.controls.minDistance=.2; this.controls.maxDistance=8;
    this.controls.maxPolarAngle=Math.PI/2.15;
    this.controls.mouseButtons={LEFT:null,MIDDLE:THREE.MOUSE.PAN,RIGHT:THREE.MOUSE.ROTATE};
    this.controls.touches={ONE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN};
    this.scene.add(new THREE.HemisphereLight('#e1f0e7','#203942',2.2));
    const sun=new THREE.DirectionalLight('#fff4cf',2.2);sun.position.set(-2,4,-1);this.scene.add(sun);
    this.scene.add(this.board);this.board.add(this.terrain,this.labels,this.guides,this.outline,this.hover,this.pieceLayer.pieces,this.pieceLayer.routes);
    this.outline.visible=false;this.hover.visible=false;
    this.panelCanvas.width=1024;this.panelCanvas.height=1280;
    this.panelTexture=new THREE.CanvasTexture(this.panelCanvas);this.panelTexture.colorSpace=THREE.SRGBColorSpace;
    this.panel=new THREE.Mesh(new THREE.PlaneGeometry(.64,.8),new THREE.MeshBasicMaterial({map:this.panelTexture,side:THREE.DoubleSide}));
    this.panel.position.set(1.52,.32,0);this.panel.rotation.y=-.3;this.panel.visible=false;this.board.add(this.panel);
    this.palette=new SpatialPalette(this.board,this.panel);this.grabber=new MiniatureGrabber(this.scene,this.board,this.pieceLayer,this.palette,()=>this.scenarioPanel);
    for(let i=0;i<2;i++) {
      const c=this.renderer.xr.getController(i),grip=this.renderer.xr.getControllerGrip(i);this.scene.add(grip);
      c.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3(0,0,-3)]),new THREE.LineBasicMaterial({color:'#eace91'})));
      this.scene.add(c);this.controllers.push(c);
      c.addEventListener('connected',e=>this.sources.set(c,e.data));
      c.addEventListener('disconnected',()=>{this.grabber.cancel();this.sources.delete(c);});
      c.addEventListener('squeezestart',()=>this.grabber.begin(c,grip,this.controllerHit(c)));
      c.addEventListener('squeezeend',()=>this.grabber.end(c,grip));
      c.addEventListener('select',()=>this.selectHit(this.controllerHit(c)));
    }
    this.renderer.xr.addEventListener('sessionstart',()=>{
      this.controls.enabled=false;this.palette.setActive(true);this.recenter=true;this.stats.xrSessionStarts++;
      this.renderer.setClearColor('#102630',this.xrMode==='immersive-ar'?0:1);callbacks.mode(true);
    });
    this.renderer.xr.addEventListener('sessionend',()=>{
      this.grabber.cancel();this.controls.enabled=true;this.palette.setActive(false);this.renderer.setClearColor('#102630',1);this.reset();this.resize();callbacks.mode(false);
    });
    this.renderer.domElement.addEventListener('pointerdown',e=>{this.start={x:e.clientX,y:e.clientY};});
    this.renderer.domElement.addEventListener('pointerup',e=>{
      if(e.button!==0||Math.hypot(e.clientX-this.start.x,e.clientY-this.start.y)>6)return;
      this.selectHit(this.pointerHit(e));
    });
    this.renderer.domElement.addEventListener('pointermove',e=>{
      const hit=this.pointerHit(e);this.pieceLayer.hover(hit?.object.userData.pieceId??null);const cell=hit?.instanceId!==undefined?this.map?.cells[hit.instanceId]:null;
      this.hover.visible=!!cell;if(cell)this.placeOutline(this.hover,cell);
      this.renderer.domElement.style.cursor=cell?'crosshair':'grab';
    });
    this.renderer.domElement.addEventListener('pointerleave',()=>{this.hover.visible=false;this.pieceLayer.hover(null);});
    this.renderer.domElement.addEventListener('keydown',e=>{
      const delta=({ArrowRight:[1,0],ArrowLeft:[-1,0],ArrowUp:[0,-1],ArrowDown:[0,1],q:[-1,1],e:[1,-1]} as Record<string,number[]>)[e.key];
      if(!delta||!this.map)return;e.preventDefault();
      const from=this.selected??this.map.byKey.get('0,0')!;
      const cell=this.map.byKey.get(keyOf({q:from.q+delta[0],r:from.r+delta[1]}));if(cell)this.callbacks.select(cell);
    });
    new ResizeObserver(()=>this.resize()).observe(container);
    this.reset();this.resize();this.renderer.setAnimationLoop((time,frame)=>this.animate(time,frame));
  }
  private disposeGroup(group:THREE.Group) {
    const geometries=new Set<THREE.BufferGeometry>();const materials=new Set<THREE.Material>();const textures=new Set<THREE.Texture>();
    group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();if(o instanceof THREE.Mesh||o instanceof THREE.Line){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);if('map' in m&&m.map instanceof THREE.Texture)textures.add(m.map);}}});
    group.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
  }
  setMap(map:TerrainMap) {
    this.disposeGroup(this.terrain);this.disposeGroup(this.labels);this.disposeGroup(this.guides);this.map=map;this.selected=null;this.outline.visible=false;this.hover.visible=false;
    this.unit=2.2/map.view.widthKm;this.radius=map.view.hexKm/Math.sqrt(3)*this.unit;
    const geometry=new THREE.CylinderGeometry(this.radius*.982,this.radius*.982,1,6,1);
    const material=new THREE.MeshStandardMaterial({roughness:.95});
    this.tiles=new THREE.InstancedMesh(geometry,material,map.cells.length);
    const matrix=new THREE.Matrix4(),rotation=new THREE.Quaternion(),color=new THREE.Color();
    for(let i=0;i<map.cells.length;i++) {
      const c=map.cells[i];const height=c.terrain==='land'?.030:c.terrain==='coast'?.017:c.terrain==='reef'?.012:.007;
      matrix.compose(new THREE.Vector3(c.x*this.unit,height/2,c.z*this.unit),rotation,new THREE.Vector3(1,height,1));
      this.tiles.setMatrixAt(i,matrix);color.set(SURFACES[c.terrain].color);
      // Subtle deterministic material variation, not bathymetry/elevation.
      color.multiplyScalar(.97+((Math.abs(c.q*17+c.r*29)%7)/100));this.tiles.setColorAt(i,color);
    }
    this.tiles.computeBoundingSphere();this.terrain.add(this.tiles);
    this.pieceLayer.configure(map.cells.map(c=>({id:c.id,x:c.x*this.unit,z:c.z*this.unit,y:c.terrain==='land'?.030:c.terrain==='coast'?.017:c.terrain==='reef'?.012:.007})),this.radius);
    const base=new THREE.Mesh(new THREE.BoxGeometry(2.24,.04,map.view.heightKm*this.unit+.02),new THREE.MeshStandardMaterial({color:'#112d36',roughness:1}));
    base.position.y=-.026;this.terrain.add(base);
    const points=Array.from({length:6},(_,i)=>new THREE.Vector3(this.radius*Math.cos((30+i*60)*Math.PI/180),0,this.radius*Math.sin((30+i*60)*Math.PI/180)));
    this.outline.geometry.dispose();this.outline.geometry=new THREE.BufferGeometry().setFromPoints(points);
    this.hover.geometry.dispose();this.hover.geometry=new THREE.BufferGeometry().setFromPoints(points);
    for(const landmark of map.landmarks) {
      // Nearby shoal/ship and small islands remain individually selectable in the inspector.
      if(map.view.id==='overview'&&['sierra-madre','kuba'].includes(landmark.id))continue;
      const p=project(landmark.position,map.view.center);
      const marker=new THREE.Mesh(new THREE.CylinderGeometry(.005,.005,.032,8),new THREE.MeshBasicMaterial({color:'#efd8a7'}));
      marker.position.set(p.x*this.unit,.035,p.z*this.unit);this.labels.add(marker);
      const offset=map.view.id==='overview'&&landmark.id==='mischief'?-.055:.047;
      this.label(landmark.short,p.x*this.unit,p.z*this.unit+offset,.058,'#f0e6cb');
    }
    const bottom=map.view.heightKm*this.unit/2;
    this.label('N  ↑',-.99,-bottom-.055,.06,'#c4d9d6',this.guides);
    const length=map.view.hexKm*5*this.unit;
    const scale=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.95,.044,bottom-.16),new THREE.Vector3(-.95+length,.044,bottom-.16)]),new THREE.LineBasicMaterial({color:'#a9c4c4'}));this.guides.add(scale);
    this.label(`${map.view.hexKm*5} km`,-.95+length/2,bottom-.105,.05,'#a9c4c4',this.guides);
    this.labels.visible=this.labelsShown;this.drawPanel();
  }
  private label(text:string,x:number,z:number,height:number,color:string,group=this.labels) {
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=80;
    const ctx=canvas.getContext('2d')!;ctx.font='500 44px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.lineWidth=8;ctx.strokeStyle='#16323c';ctx.strokeText(text,384,40);ctx.fillStyle=color;ctx.fillText(text,384,40);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(height*9.6,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthTest:false,side:THREE.DoubleSide}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,.060,z);mesh.renderOrder=3;group.add(mesh);
  }
  private placeOutline(mesh:THREE.LineLoop,cell:Cell) {mesh.position.set(cell.x*this.unit,.045,cell.z*this.unit);}
  select(cell:Cell) {this.selected=cell;this.outline.visible=true;this.placeOutline(this.outline,cell);this.drawPanel();}
  setLabels(visible:boolean) {this.labelsShown=visible;this.labels.visible=visible;}
  setScenarioPanel(panel:TablePanel) {this.scenarioPanel=panel;this.drawPanel();}
  private hoverPanel(hit?:THREE.Intersection){if(!this.scenarioPanel)return;const label=hit?.object===this.panel&&hit.uv?panelTargetAt(this.scenarioPanel,hit.uv.x,hit.uv.y)?.label:undefined;if(this.scenarioPanel.hovered!==label){this.scenarioPanel.hovered=label;this.drawPanel();}}
  setGrabBindings(bindings:GrabBindings){this.grabber.bindings=bindings;}
  cancelGrab(){this.grabber.cancel();}
  setScenarioPieces(pieces:TablePiece[],reachable:string[],path:string[],select:(id:string)=>void) {this.pieceLayer.set(pieces,reachable,path,select);}
  focusCell(cell:Cell) {
    if(this.renderer.xr.isPresenting)return;
    const target=this.board.localToWorld(new THREE.Vector3(cell.x*this.unit,0,cell.z*this.unit));
    const offset=this.camera.position.clone().sub(this.controls.target).normalize().multiplyScalar(.9);
    this.controls.target.copy(target);this.camera.position.copy(target).add(offset);this.controls.update();
  }
  private hits() {return [this.tiles,...this.palette.hits,...this.pieceLayer.pieceHits.filter(m=>m.visible)].filter((o):o is THREE.Mesh=>o!==null);}
  private pointerHit(e:PointerEvent) {
    const r=this.renderer.domElement.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);
    return this.ray.intersectObjects(this.hits(),false)[0];
  }
  private controllerHit(controller:THREE.Group) {
    this.ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);this.ray.ray.direction.set(0,0,-1).transformDirection(controller.matrixWorld);
    return this.ray.intersectObjects(this.hits(),false)[0];
  }
  private selectHit(hit?:THREE.Intersection) {
    if(!hit||this.grabber.holding||this.palette.moving)return;
    if(this.palette.click(hit))return;
    if(hit.object.userData.pieceId&&this.pieceLayer.select){this.pieceLayer.select(hit.object.userData.pieceId);return;}
    if(hit.object===this.panel&&hit.uv) {
      if(this.scenarioPanel){activatePanel(this.scenarioPanel,hit.uv.x,hit.uv.y);return;}
      const y=(1-hit.uv.y)*1280,start=this.scenarioPanel?480:475,spacing=this.scenarioPanel?94:104;const i=Math.floor((y-start)/spacing);
      if(i>=0&&i<this.panelActions.length&&((y-start)%spacing)<84)this.panelActions[i]();
    } else if(hit.instanceId!==undefined&&this.map) this.callbacks.select(this.map.cells[hit.instanceId]);
  }
  private drawPanel() {
    if(!this.map)return;const c=this.panelCanvas.getContext('2d')!;const map=this.map;
    if(this.scenarioPanel){drawPanel(this.panelCanvas,this.scenarioPanel);this.panelTexture.needsUpdate=true;return;}
    c.fillStyle='#142e37';c.fillRect(0,0,1024,1280);c.fillStyle='#eed5a4';c.font='bold 44px sans-serif';c.fillText('XRIEGSSPIEL / TERRAIN',42,68);
    c.fillStyle='#ebeee3';c.font='38px sans-serif';c.fillText(map.region.name,42,130);c.font='29px sans-serif';c.fillStyle='#a8c3c0';c.fillText(`${map.view.id==='focus'?map.region.focusName:'Regional overview'} · ${map.view.hexKm} km / hex`,42,185);
    c.fillStyle='#f1e5c9';c.font='38px sans-serif';c.fillText(this.selected?`HEX ${this.selected.q}, ${this.selected.r} · ${SURFACES[this.selected.terrain].name}`:'Point at a hex to inspect',42,270);
    c.font='28px sans-serif';c.fillStyle='#c1d3cc';
    if(this.selected) {
      c.fillText(`${this.selected.center[1].toFixed(4)}° N   ${this.selected.center[0].toFixed(4)}° E`,42,325);
      const names=map.landmarks.filter(l=>this.selected!.landmarkIds.includes(l.id)).map(l=>l.name).join(' / ');
      c.fillText(names||'Elevation / water depth: unknown',42,380,930);
    }
    c.font='24px sans-serif';c.fillText('Terrain inspection · No unit movement rules applied',42,432);
    const buttons=[['Switch Pacific region',this.callbacks.nextRegion],[map.view.id==='overview'?'Open island / shoal focus':'Return to regional overview',this.callbacks.toggleFocus],['Change table size',()=>this.scale(this.board.scale.x>1.15?.6:1.2)],['Recenter table',()=>this.reset()],['Exit immersive view',()=>void this.exit()]] as const;
    this.panelActions=buttons.map(b=>b[1]);buttons.forEach(([label],i)=>{c.fillStyle='#304d53';c.fillRect(38,475+i*104,948,88);c.fillStyle='#f1ead6';c.font='34px sans-serif';c.fillText(label,63,531+i*104);});
    c.fillStyle='#b1c6c2';c.font='24px sans-serif';
    c.fillText('Left stick: move · Right stick: height / rotation',42,1068);
    c.fillText('Generalized coastlines; relief is symbolic.',42,1120);
    c.fillText('Made with Natural Earth.',42,1170);
    c.fillText('© OpenStreetMap contributors · ODbL 1.0',42,1215);
    this.panelTexture.needsUpdate=true;
  }
  reset(top=false) {
    if(this.renderer.xr.isPresenting){this.recenter=true;return;}
    this.board.position.set(0,0,0);this.board.rotation.set(0,0,0);this.board.scale.setScalar(1);
    const aspect=this.container.clientWidth/Math.max(1,this.container.clientHeight);
    const distance=Math.max(top?3.15:2.92,1.27/(Math.tan(this.camera.fov*Math.PI/360)*aspect));
    this.camera.position.set(0,top?distance:distance*.876,top?.001:distance*.482);this.controls.target.set(0,0,0);this.controls.update();
  }
  scale(factor:number) {this.board.scale.setScalar(THREE.MathUtils.clamp(this.board.scale.x*factor,.4,1.7));}
  zoom(factor:number) {const offset=this.camera.position.clone().sub(this.controls.target).multiplyScalar(factor);if(offset.length()>=.2&&offset.length()<=8)this.camera.position.copy(this.controls.target).add(offset);this.controls.update();}
  async enter(mode:'immersive-vr'|'immersive-ar') {
    if(!navigator.xr)throw new Error('WebXR is unavailable in this browser.');this.xrMode=mode;
    const session=await navigator.xr.requestSession(mode,{requiredFeatures:['local-floor']});
    try{session.addEventListener('visibilitychange',()=>{if(session.visibilityState!=='visible')this.grabber.cancel();});await this.renderer.xr.setSession(session);}catch(error){await session.end();throw error;}
  }
  async exit() {await this.renderer.xr.getSession()?.end();}
  private resize() {if(this.renderer.xr.isPresenting)return;const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();}
  private animate(time:number,frame?:XRFrame) {
    const dt=this.lastTime?Math.min((time-this.lastTime)/1000,.05):0;this.lastTime=time;this.stats.frames++;
    if(this.renderer.xr.isPresenting&&frame) {
      this.stats.xrFrames++;
      if(this.recenter) {
        const space=this.renderer.xr.getReferenceSpace(),pose=space&&frame.getViewerPose(space);
        if(pose){const p=pose.transform.position,q=pose.transform.orientation;const f=new THREE.Vector3(0,0,-1).applyQuaternion(new THREE.Quaternion(q.x,q.y,q.z,q.w));f.y=0;f.normalize();this.board.position.set(p.x+f.x*1.2,p.y-.55,p.z+f.z*1.2);this.board.rotation.set(0,Math.atan2(-f.x,-f.z),0);this.board.scale.setScalar(.65);this.recenter=false;}
      }
      this.hover.visible=false;
      let hoveredPiece:string|null=null,hoveredPanel:THREE.Intersection|undefined;
      for(const controller of this.controllers) {
        const source=this.sources.get(controller);if(!source)continue;
        const hit=this.controllerHit(controller);if(hit?.object===this.panel)hoveredPanel=hit;hoveredPiece=hit?.object.userData.pieceId??hoveredPiece;if(hit?.instanceId!==undefined&&this.map){this.hover.visible=true;this.placeOutline(this.hover,this.map.cells[hit.instanceId]);}
        if(this.grabber.holding||this.palette.moving)continue;
        const axes=source.gamepad?.axes;if(!axes||axes.length<4)continue;
        const x=Math.abs(axes[2])>.2?axes[2]:0,y=Math.abs(axes[3])>.2?axes[3]:0;
        if(source.handedness==='left'){const v=new THREE.Vector3(x,0,y).applyAxisAngle(new THREE.Vector3(0,1,0),this.board.rotation.y);this.board.position.addScaledVector(v,dt*.4);}
        else {this.board.position.y=THREE.MathUtils.clamp(this.board.position.y-y*dt*.3,.2,1.6);this.board.rotation.y-=x*dt*.7;}
      }
      this.pieceLayer.hover(hoveredPiece);this.hoverPanel(hoveredPanel);
    } else this.controls.update();
    this.grabber.update();
    this.renderer.render(this.scene,this.camera);this.stats.drawCalls=this.renderer.info.render.calls;this.stats.triangles=this.renderer.info.render.triangles;
  }
}
