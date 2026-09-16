import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureClient } from '../src/capture/client.ts';
import type { ScenarioState } from '../server/scenario-session.ts';

test('bounded telemetry retains stable loss IDs across uncertain retries and reports fully evicted runs',async t=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  Object.defineProperty(globalThis,'window',{configurable:true,value:{addEventListener(){}}});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');});
  t.mock.method(globalThis,'setInterval',()=>0 as unknown as ReturnType<typeof setInterval>);
  let success=true;const batches:{runId:string;events:{id:string;type:string;data:Record<string,number>}[]}[]=[];
  t.mock.method(globalThis,'fetch',async(_url:unknown,init:RequestInit)=>{batches.push(JSON.parse(String(init.body)));return {ok:success} as Response;});
  const client=new CaptureClient(()=>'browser'),settled=()=>new Promise(resolve=>setImmediate(resolve));
  client.presented({runId:'a'} as ScenarioState);await settled();
  for(let i=0;i<160;i++)client.event('preview');
  success=false;await client.flush();const loss=batches.at(-1)!.events.find(e=>e.type==='dropped')!;assert.equal(loss.data.count,10);
  for(let i=0;i<10;i++)client.event('preview');
  success=true;await client.flush();assert.equal(batches.at(-1)!.events.find(e=>e.type==='dropped')!.id,loss.id);
  await client.flush();const next=batches.at(-1)!.events.find(e=>e.type==='dropped')!;assert.equal(next.data.count,10);assert.notEqual(next.id,loss.id);
  while((batches.at(-1)?.events.length??0)>0){const count=batches.length;await client.flush();if(batches.length===count)break;}
  const second=new CaptureClient(()=>'browser');second.presented({runId:'old'} as ScenarioState);await settled();
  for(let i=0;i<150;i++)second.event('preview');
  success=false;second.presented({runId:'new'} as ScenarioState);await settled();
  for(let i=0;i<200;i++)second.event('preview');
  success=true;await second.flush();const evicted=batches.at(-1)!;assert.equal(evicted.runId,'old');assert.ok(evicted.events.every(e=>e.type==='dropped'));
  await second.flush();assert.equal(batches.at(-1)!.runId,'old');assert.equal(batches.at(-1)!.events[0].data.count,149);
});
