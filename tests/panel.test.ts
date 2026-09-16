import test from 'node:test';
import assert from 'node:assert/strict';
import { panelTargets, activatePanel, editSearch } from '../src/play/panel.ts';
import type { TablePanel } from '../src/play/panel.ts';
test('controller keyboard searches an exact catalog name, edits text, and returns through Done',()=>{
  let value='',done=false;
  const panel:TablePanel={title:'Search',lines:[],buttons:[],keyboard:{value,key:key=>{value=editSearch(value,key);},done:()=>{done=true;}}};
  const targets=panelTargets(panel);
  for(const key of ['L','C','M','Space','8','Backspace','Space','Clear','M','1','A','2']){
    const t=targets.find(t=>t.label===key)!;
    assert.ok(t);assert.equal(activatePanel(panel,(t.x+t.width/2)/1024,1-(t.y+t.height/2)/1280),true);
  }
  assert.equal(value,'M1A2');const t=targets.find(t=>t.label==='Done / show results')!;
  activatePanel(panel,(t.x+20)/1024,1-(t.y+20)/1280);assert.equal(done,true);
});
test('panel ray targets respect disabled actions, gutters and all seven rows',()=>{
  const called:number[]=[];
  const panel:TablePanel={title:'Actions',lines:[],buttons:Array.from({length:7},(_,i)=>({label:`Action ${i}`,enabled:i!==2,run:()=>called.push(i)}))};
  const targets=panelTargets(panel);assert.equal(targets.length,7);
  for(const [i,t] of targets.entries()){
    assert.equal(activatePanel(panel,(t.x+t.width/2)/1024,1-(t.y+t.height/2)/1280),i!==2);
    assert.equal(activatePanel(panel,0,1-(t.y+30)/1280),false);
    assert.equal(activatePanel(panel,.5,1-(t.y+t.height+4)/1280),false);
  }
  assert.deepEqual(called,[0,1,3,4,5,6]);
});
