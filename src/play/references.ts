import referencesUrl from '../../catalog/references.json?url';
import { ReferenceImageCache } from './reference-cache.ts';
import type { ReferenceManifest, UnitReference } from './reference-types.ts';
export type { UnitReference } from './reference-types.ts';
const listeners=new Set<()=>void>();
let scheduled=false;
function notify(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;listeners.forEach(listener=>listener());});}
const disabled=()=>new URL(location.href).searchParams.get('reference-photos')==='off';
export const referenceImages=new ReferenceImageCache<HTMLImageElement>(async path=>{
  const img=new Image();img.decoding='async';img.fetchPriority='low';
  // A failed request or decode settles normally; it never holds up game input.
  try {
    await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Photo timed out')),15000);img.onload=()=>{clearTimeout(timer);resolve();};img.onerror=()=>{clearTimeout(timer);reject(new Error('Photo unavailable'));};img.src=path;});
    await img.decode();return img;
  }catch(error){img.src='';throw error;}
},img=>{img.src='';},notify);
let records=new Map<string,UnitReference>(),notice='',started:Promise<void>|undefined;
export function loadReferences(){
  return started??=fetch(referencesUrl,{cache:'no-cache'}).then(async r=>{
    if(!r.ok)throw new Error('Reference collection unavailable');
    const data=await r.json() as ReferenceManifest;
    records=new Map(data.records.filter(r=>r.reviewStatus==='reviewed').map(r=>[r.equipmentId,r]));notice=data.notice;notify();
  }).catch(()=>{ /* Optional presentation data; all units retain their miniature. */ });
}
export function referenceFor(equipmentId:string){return records.get(equipmentId);}
export function referenceNotice(){return notice;}
export function onReferenceChange(listener:()=>void){listeners.add(listener);return()=>listeners.delete(listener);}
export function showReferenceImages(view:string,items:{reference?:UnitReference;size:'thumbnail'|'detail'}[]){
  referenceImages.setVisible(view,disabled()?[]:items.flatMap(({reference,size})=>reference?[{path:reference.media[size].path,size}]:[]));
}
export function referencePhoto(ref:UnitReference|undefined,size:'thumbnail'|'detail') {
  return !disabled()&&ref?referenceImages.get(ref.media[size].path):undefined;
}
export function referencePhotoStatus(ref:UnitReference|undefined,size:'thumbnail'|'detail') {
  return disabled()?'disabled':ref?referenceImages.status(ref.media[size].path):undefined;
}
