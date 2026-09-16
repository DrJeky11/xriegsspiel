import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from '../server/capture-store.ts';
import type { Operation, ScenarioState } from '../server/scenario-session.ts';

async function start(directory:string){
  const child=spawn(process.execPath,['server/main.ts','--production'],{env:{...process.env,PORT:'0',DATA_DIR:directory},stdio:['ignore','pipe','pipe']});
  const url=await new Promise<string>((resolve,reject)=>{
    let output='';const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('Verification service did not start. '+output));},15000);
    child.stdout.on('data',chunk=>{output+=chunk;const match=output.match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timer);resolve(match[0]);}});
    child.stderr.on('data',chunk=>{output+=chunk;});child.once('exit',code=>{clearTimeout(timer);reject(new Error(`Verification service exited (${code}): ${output}`));});
  });
  return {url,child,async stop(){if(child.exitCode!==null||child.signalCode)return;await new Promise<void>(resolve=>{child.once('exit',()=>resolve());child.kill('SIGKILL');});}};
}
test('HTTP clients record independent views; capture reports, private notes, exports and crash recovery agree',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-capture-http-'));let service=await start(directory);
  try{
    const joinSeat=async()=>{const response=await fetch(service.url+'/api/capture/join',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,200);return response.headers.get('set-cookie')!.split(';')[0];};
    const a=await joinSeat(),b=await joinSeat();assert.notEqual(a,b);const map='taiwan-senkaku/focus';
    const request=async(path:string,cookie=a,body?:unknown)=>{const response=await fetch(service.url+path,{method:body?'POST':'GET',headers:{Cookie:cookie,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});return {response,body:await response.json()};};
    const state=async(cookie=a)=>(await request('/api/maps/state?map='+map,cookie)).body as ScenarioState;
    const submit=async(operation:Operation,cookie=a,view?:ScenarioState)=>{const v=view??await state(cookie),command={id:crypto.randomUUID(),runId:v.runId,observationId:v.observationId,revision:v.revision,operation};return {...await request('/api/maps/command?map='+map,cookie,command),command};};
    const setup=await submit({type:'new',setup:{mapId:map,year:2026,demo:true}});assert.equal(setup.response.status,200);
    const va=await state(a),vb=await state(b),runId=va.runId!;assert.notEqual(va.observationId,vb.observationId);assert.notEqual(va.participantId,vb.participantId);
    assert.deepEqual(va.exercise,vb.exercise);const home=va.exercise.pieces.find(p=>p.id==='B-01')!.tileId!;
    await request('/api/capture/telemetry',a,{runId,events:[{id:crypto.randomUUID(),type:'ready',clientTime:new Date().toISOString()}]});
    await request('/api/capture/presented',a,{observationId:va.observationId,clientTime:new Date().toISOString()});
    const load=await submit({type:'action',action:{type:'load',pieceId:'B-01',carrierId:'B-02'}},a,va);assert.equal(load.response.status,200);
    const retry=await request('/api/maps/command?map='+map,a,load.command);assert.equal(retry.body.resultId,load.body.resultId);assert.equal(retry.body.duplicate,true);
    const stale=await submit({type:'action',action:{type:'advance'}},b,vb);assert.equal(stale.response.status,409);assert.equal(stale.body.reasonCode,'revision.stale');
    assert.equal((await submit({type:'action',action:{type:'unload',pieceId:'B-01',tileId:home}})).response.status,200);
    const advance=await submit({type:'action',action:{type:'advance'}});assert.equal(advance.response.status,200);
    const note=await request('/api/capture/note',a,{runId,commandId:load.body.resultId,kind:'reflection',audience:'private',text:'Private fixture rationale.'});assert.equal(note.response.status,201);
    await request('/api/capture/details',a,{runId,label:'Synthetic transport verification',objective:'Compare transport tradeoffs using recorded evidence.'});
    const own=await request('/api/capture/review?run='+runId,a),other=await request('/api/capture/review?run='+runId,b);
    assert.equal(own.body.annotations.length,1);assert.equal(other.body.annotations.length,0);
    const summary=(await request('/api/capture/reports?run='+runId)).body;
    assert.equal(summary.rows[0].submitted,4);assert.equal(summary.rows[0].accepted,3);assert.equal(summary.rows[0].rejected,1);assert.equal(summary.rows[0].retries,1);assert.equal(summary.rows[0].unknownViews,0);
    assert.equal(summary.rows[0].reasons['revision.stale'],1);assert.equal(summary.rows[0].turns[0].loads,1);assert.equal(summary.rows[0].turns[0].unloads,1);
    assert.notEqual(summary.rows[0].participants.find((p:any)=>p.id===va.participantId).firstOrderMs,null);
    const finishing=await state(),finish={mapId:map,runId,revision:finishing.revision};
    assert.equal((await request('/api/capture/finish',a,finish)).response.status,200);
    assert.equal((await request('/api/capture/finish',a,finish)).response.status,200);
    assert.equal((await state()).runStatus,'archived');
    const blocked=await submit({type:'action',action:{type:'advance'}});assert.equal(blocked.response.status,409);assert.equal(blocked.body.reasonCode,'run.finished');
    assert.deepEqual((await state()).exercise,finishing.exercise);
    await submit({type:'new',setup:{mapId:map,year:2026,demo:false}});
    const exported=(await request('/api/capture/export?run='+runId,b)).body;assert.ok(!JSON.stringify(exported).includes('Private fixture rationale'));
    const {artifactDigest,...payload}=exported;assert.equal(digest(payload),artifactDigest);
    for(const command of exported.review.commands){assert.ok(exported.states[command.beforeHash]);assert.ok(exported.states[command.afterHash]);}
    const beforeCrash=await state();await service.stop();service=await start(directory);
    const afterCrash=await state();assert.deepEqual(afterCrash.exercise,beforeCrash.exercise);assert.equal(afterCrash.runId,beforeCrash.runId);
    const retriedAfterCrash=await request('/api/maps/command?map='+map,a,load.command);assert.equal(retriedAfterCrash.body.resultId,load.body.resultId);assert.equal(retriedAfterCrash.body.duplicate,true);
    const csv=await fetch(service.url+'/api/capture/csv?run='+runId,{headers:{Cookie:a}});assert.equal(csv.status,200);assert.match(await csv.text(),/Synthetic|exercise-reports\/1/);
  }finally{await service.stop();rmSync(directory,{recursive:true,force:true});}
});
