import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PieceDefinition, Force } from '../pieces.ts';

export type MiniatureKind = 'tank'|'apc'|'wheeled'|'engineer'|'launcher'|'truck'|'gun'|'radar'|'robot'|'helicopter'|'jet'|'transport'|'drone'|'ship'|'carrier'|'landing'|'submarine'|'equipment';
export type Domain = 'ground'|'air'|'sea';
export interface UnitVisual { domain:Domain; group:string; model:MiniatureKind }
export interface Taxonomy { domain:string; taxonomy:string[] }
export const UNIT_GROUPS:Record<Domain,string[]> = {
  ground:['Armor','Artillery','Air defense','Recon & signals','Engineering','Logistics','Equipment'],
  air:['Combat aircraft','Helicopters','Drones','Transport & support','Equipment'],
  sea:['Surface ships','Submarines','Amphibious','Support vessels','Equipment'],
};
/** Presentation taxonomy only. Never changes mobility, force or era eligibility. */
export function unitVisual(piece:Pick<PieceDefinition,'kind'|'profileId'|'name'>, fact?:Taxonomy):UnitVisual {
  const text=(fact?.taxonomy.join(' ')??'').toLowerCase(), profile=piece.profileId;
  const domain:Domain=fact?.domain==='sea'?'sea':fact?.domain==='air'?'air':fact?.domain==='land'?'ground':/vessel|sea-|landing|submarine/.test(profile)?'sea':/wing|air-/.test(profile)?'air':'ground';
  if(piece.kind==='part')return {domain,group:'Equipment',model:'equipment'};
  if(domain==='air') {
    if(/rotary|helicopter/.test(text)||profile==='rotary-wing')return{domain,group:'Helicopters',model:'helicopter'};
    if(/unmanned|uav/.test(text))return{domain,group:'Drones',model:'drone'};
    if(/cargo|transport|early warning|tanker|reconnaissance/.test(text)||profile==='air-transport')return{domain,group:'Transport & support',model:'transport'};
    return{domain,group:'Combat aircraft',model:'jet'};
  }
  if(domain==='sea') {
    if(/submarine|underwater/.test(text)||profile==='submarine')return{domain,group:'Submarines',model:'submarine'};
    if(profile==='landing-craft')return{domain,group:'Amphibious',model:'landing'};
    if(/landing|amphibious/.test(text))return{domain,group:'Amphibious',model:'carrier'};
    if(/cargo|auxiliary|logistic|support|replenishment/.test(text)||profile==='sea-transport')return{domain,group:'Support vessels',model:'ship'};
    return{domain,group:'Surface ships',model:/aircraft carrier/.test(text)?'carrier':'ship'};
  }
  if(/air defense/.test(text))return{domain,group:'Air defense',model:/radar/.test(text)?'radar':'launcher'};
  if(/radar|sensor|electronic|communication|command and control/.test(text))return{domain,group:'Recon & signals',model:'radar'};
  if(/artillery|mortar/.test(text)||profile==='towed')return{domain,group:'Artillery',model:'gun'};
  if(/engineer|cbrn/.test(text))return{domain,group:'Engineering',model:'engineer'};
  if(/logistics|combat support/.test(text)||profile==='truck')return{domain,group:'Logistics',model:'truck'};
  if(profile==='ground-robot')return{domain,group:'Recon & signals',model:'robot'};
  if(/infantry vehicles/.test(text)||/amphibious|wheeled/.test(profile))return{domain,group:'Armor',model:/wheeled/.test(profile)?'wheeled':'apc'};
  if(/tanks/.test(text)||profile==='tracked')return{domain,group:'Armor',model:'tank'};
  return{domain,group:'Equipment',model:'equipment'};
}

const models=new Map<string,THREE.BufferGeometry>();
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,metalness:.12,flatShading:true});
const paint='#adb7a2',dark='#263b41',glass='#526f7a',light='#e6d9b6';
/** Original low-poly class miniatures, not dimensionally accurate equipment models. One draw call each. */
export function miniatureGeometry(kind:MiniatureKind,force:Force):THREE.BufferGeometry {
  const key=kind+force,cached=models.get(key);if(cached)return cached;
  const parts:THREE.BufferGeometry[]=[];
  const part=(g:THREE.BufferGeometry,x:number,y:number,z:number,color=paint,rotation:THREE.Euler=new THREE.Euler())=>{
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(rotation),new THREE.Vector3(1,1,1));
    const geometry=g.index?g.toNonIndexed():g;geometry.applyMatrix4(matrix);geometry.deleteAttribute('uv');
    const c=new THREE.Color(color),colors=new Float32Array(geometry.attributes.position.count*3);
    for(let i=0;i<colors.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}
    geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));parts.push(geometry);if(geometry!==g)g.dispose();
  };
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,color=paint,rx=0,ry=0,rz=0)=>part(new THREE.BoxGeometry(w,h,d),x,y,z,color,new THREE.Euler(rx,ry,rz));
  const cylinder=(a:number,b:number,h:number,x:number,y:number,z:number,color=paint,rx=0,rz=0)=>part(new THREE.CylinderGeometry(a,b,h,8),x,y,z,color,new THREE.Euler(rx,0,rz));
  const hull=(w:number,h:number,d:number,y:number,color=paint)=>{const g=new THREE.SphereGeometry(1,12,6);g.scale(w/2,h/2,d/2);part(g,0,y,0,color);};
  cylinder(.53,.56,.07,0,.035,0,force==='blue'?'#337ca1':'#b05d54');
  const wheels=(count=3)=>{for(const x of [-.24,.24])for(let i=0;i<count;i++)cylinder(.075,.075,.05,x,.17,-.26+i*.52/(count-1),dark,0,Math.PI/2);};
  if(['tank','apc','wheeled','engineer','launcher','robot','gun','truck','radar'].includes(kind)) {
    if(kind==='tank'||kind==='apc'||kind==='robot') {
      box(.49,.13,.68,0,.20,0);for(const x of [-.245,.245])box(.13,.15,.76,x,.16,0,dark);
      if(kind==='tank'){box(.35,.15,.34,0,.33,-.06);cylinder(.026,.035,.48,0,.34,-.39,paint,Math.PI/2);box(.12,.035,.11,.06,.42,.04,light);}
      else if(kind==='apc'){box(.4,.20,.53,0,.32,.05);box(.23,.08,.25,0,.46,-.10);cylinder(.018,.022,.27,0,.47,-.30,paint,Math.PI/2);}
      else {box(.27,.13,.30,0,.32,0);cylinder(.025,.025,.26,0,.49,0);box(.16,.09,.09,0,.62,0,glass);}
    } else {
      wheels(kind==='gun'?2:3);box(.43,.10,.73,0,.22,0);
      if(kind==='wheeled'){box(.43,.21,.63,0,.37,0);box(.32,.09,.015,0,.41,-.325,glass);box(.18,.07,.18,0,.51,-.02);}
      if(kind==='engineer'){box(.34,.25,.29,0,.40,.20,glass);box(.055,.09,.53,-.18,.4,-.09,paint,-.6);box(.055,.09,.53,.18,.4,-.09,paint,-.6);box(.50,.19,.17,0,.19,-.38,dark);}
      if(kind==='launcher'){box(.39,.22,.20,0,.38,-.25);for(const x of [-.13,.13]){box(.09,.10,.5,x,.48,.1,paint,-.45);box(.09,.10,.5,x,.60,.1,paint,-.45);}}
      if(kind==='truck'){box(.43,.30,.25,0,.39,-.23);box(.32,.12,.015,0,.43,-.365,glass);box(.43,.26,.43,0,.37,.14);}
      if(kind==='radar'){box(.4,.22,.38,0,.36,.1);cylinder(.025,.025,.25,0,.53,.05);box(.46,.32,.04,0,.72,.05,glass,0,-.35);}
      if(kind==='gun'){box(.28,.13,.25,0,.31,.06);cylinder(.025,.04,.71,0,.47,-.2,paint,Math.PI/3);box(.035,.05,.43,-.16,.17,.23,dark,0,-.35);box(.035,.05,.43,.16,.17,.23,dark,0,.35);}
    }
  } else if(['jet','transport','drone','helicopter'].includes(kind)) {
    cylinder(.017,.024,.33,0,.22,0,glass);hull(.19,.16,.79,.49);
    if(kind==='helicopter'){
      box(.24,.13,.27,0,.48,-.12,glass);box(.055,.045,.4,0,.49,.43);box(.27,.025,.09,0,.52,.53);cylinder(.025,.025,.13,0,.62,0,dark);
      box(1.02,.018,.055,0,.69,0,dark,0,.35);box(.055,.018,1.02,0,.69,0,dark,0,.35);
      for(const x of [-.16,.16]){box(.025,.025,.42,x,.32,-.04,dark);box(.018,.12,.025,x,.39,-.10,dark);}
    } else {
      const span=kind==='jet'?.83:1.02;box(span,.025,.17,0,.48,.025,paint,0,kind==='jet'?.12:0);box(.37,.02,.13,0,.5,.31);box(.025,.17,.12,0,.58,.31);box(.10,.07,.19,0,.56,-.20,glass);
      if(kind==='transport')for(const x of [-.34,.34])cylinder(.045,.045,.20,x,.44,.0,dark,Math.PI/2);
      if(kind==='drone'){box(.10,.12,.10,0,.39,-.13,glass);box(.27,.016,.025,0,.49,.45,dark);}
    }
  } else if(kind==='submarine') {
    hull(.32,.24,.93,.23,dark);box(.11,.17,.20,0,.39,-.03);box(.52,.025,.10,0,.23,.29);cylinder(.012,.012,.12,.03,.52,-.03,dark);
  } else if(kind==='landing') {
    box(.47,.12,.87,0,.17,0);box(.35,.015,.57,0,.24,-.06,dark);for(const x of [-.22,.22])box(.055,.12,.78,x,.28,0);box(.20,.18,.18,.12,.33,.31);box(.38,.025,.18,0,.15,-.48,paint,-.25);
  } else if(kind==='carrier') {
    hull(.41,.16,.95,.17);box(.46,.04,.88,0,.26,0);box(.095,.19,.28,.17,.375,.12);box(.017,.007,.61,-.03,.285,-.04,light);box(.18,.016,.035,-.12,.30,-.20,glass);
  } else if(kind==='ship') {
    hull(.31,.20,1.0,.2);box(.24,.06,.63,0,.30,.06);box(.18,.17,.20,0,.41,.02);box(.12,.10,.14,0,.535,.02);cylinder(.018,.02,.22,0,.68,.04,dark);box(.19,.025,.025,0,.73,.04,dark);cylinder(.075,.08,.08,0,.35,-.28);box(.023,.023,.15,0,.38,-.38,dark);
  } else {
    // Explicit equipment crate for records without a reviewed platform silhouette.
    box(.48,.34,.42,0,.26,0);for(const z of [-.14,.14])box(.50,.025,.025,0,.44,z,dark);box(.17,.10,.01,0,.30,-.216,light);
  }
  const merged=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());merged.computeBoundingBox();merged.computeBoundingSphere();models.set(key,merged);return merged;
}
export function makeMiniature(kind:MiniatureKind,force:Force) {const mesh=new THREE.Mesh(miniatureGeometry(kind,force),material);mesh.userData.sharedMiniature=true;return mesh;}

let thumbnailRenderer:THREE.WebGLRenderer|undefined;
const thumbnails=new Map<string,HTMLCanvasElement>();
/** Bounded cache: one thumbnail per class/force, never one renderer per catalog record. */
export function miniatureThumbnail(kind:MiniatureKind,force:Force):HTMLCanvasElement {
  const key=kind+force;if(thumbnails.has(key))return thumbnails.get(key)!;
  thumbnailRenderer??=new THREE.WebGLRenderer({alpha:true,antialias:true});thumbnailRenderer.setSize(256,192,false);thumbnailRenderer.setClearColor(0,0);thumbnailRenderer.outputColorSpace=THREE.SRGBColorSpace;
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,256/192,.1,20);camera.position.set(1.3,1.4,-1.8);camera.lookAt(0,.25,0);
  scene.add(new THREE.HemisphereLight('#fff8de','#496574',2.7));const sun=new THREE.DirectionalLight('#ffffff',3);sun.position.set(-2,4,-2);scene.add(sun,makeMiniature(kind,force));thumbnailRenderer.render(scene,camera);
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;canvas.getContext('2d')!.drawImage(thumbnailRenderer.domElement,0,0);thumbnails.set(key,canvas);return canvas;
}
