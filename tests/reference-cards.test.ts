import test from 'node:test';
import assert from 'node:assert/strict';
import { ReferenceImageCache } from '../src/play/reference-cache.ts';
import { panelTargets, activatePanel } from '../src/play/panel.ts';
import type { TablePanel } from '../src/play/panel.ts';
const tick=()=>new Promise<void>(resolve=>setImmediate(resolve));
test('photo cache ignores stale completions, bounds decodes, and continues after corrupt files',async()=>{
  const pending=new Map<string,{resolve:(s:string)=>void;reject:()=>void}>(),disposed:string[]=[],loads:string[]=[];
  const cache=new ReferenceImageCache<string>(path=>{loads.push(path);return new Promise((resolve,reject)=>pending.set(path,{resolve,reject:()=>reject(new Error('corrupt'))}));},value=>disposed.push(value),()=>{});
  const request=(path:string)=>({path,size:'thumbnail' as const});
  cache.setVisible('panel',['old-a','old-b','old-c'].map(request));assert.equal(cache.stats.running,2);
  cache.setVisible('panel',['new-a','new-b'].map(request));
  pending.get('old-b')!.resolve('old-b');await tick();assert.equal(cache.get('old-b'),undefined);assert.ok(disposed.includes('old-b'));
  pending.get('old-a')!.resolve('old-a');await tick();assert.equal(loads.includes('old-c'),false);
  pending.get('new-a')!.reject();pending.get('new-b')!.resolve('new-b');await tick();
  assert.equal(cache.status('new-a'),'failed');assert.equal(cache.get('new-b'),'new-b');
  cache.setVisible('panel',['new-a','new-b'].map(request));assert.equal(loads.filter(x=>x==='new-a').length,1);
  cache.setVisible('panel',[]);assert.equal(cache.stats.retained,0);assert.ok(disposed.includes('new-b'));
});
test('combined browser and Quest demand retains at most twelve thumbnails and one selected detail',async()=>{
  const cache=new ReferenceImageCache<string>(async path=>path,()=>{},()=>{});
  cache.setVisible('browser',Array.from({length:10},(_,i)=>({path:'b'+i,size:'thumbnail'})));
  cache.setVisible('quest',Array.from({length:6},(_,i)=>({path:'q'+i,size:'thumbnail'})));
  cache.setVisible('selected',[{path:'detail-old',size:'detail'},{path:'detail',size:'detail'}]);
  await tick();assert.equal(cache.stats.wanted,13);assert.ok(cache.stats.retained<=13);assert.ok(cache.stats.running<=2);
  cache.setVisible('selected',[{path:'detail-new',size:'detail'}]);await tick();
  assert.equal(cache.get('detail-old'),undefined);assert.equal(cache.get('detail-new'),'detail-new');assert.ok(cache.stats.retained<=13);
});
test('reference detail buttons have matching nonoverlapping targets and preserve grip / disabled behavior',()=>{
  let called=0;
  const panel:TablePanel={title:'Unit reference',lines:[],reference:{name:'Zumwalt',origin:'United States',model:'ship',force:'blue',guidance:['5 MP'],eligibility:'Eligible'},buttons:Array.from({length:4},(_,i)=>({label:String(i),enabled:i!==1,grab:i===0?{definitionId:'piece-zumwalt'}:undefined,run:()=>called++}))};
  const targets=panelTargets(panel);assert.equal(targets.length,4);assert.equal(targets[0].grab?.definitionId,'piece-zumwalt');
  for(const t of targets){assert.ok(t.y>=1010&&t.y+t.height<1200);assert.equal(activatePanel(panel,(t.x+t.width/2)/1024,1-(t.y+t.height/2)/1280),t.enabled!==false);}
  assert.equal(called,3);assert.equal(activatePanel(panel,.5,1-1040/1280),false);
  assert.equal(activatePanel(panel,.3,1-600/1280),false);
});
