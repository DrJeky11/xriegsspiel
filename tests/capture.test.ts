import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { captureContext } from '../server/capture-http.ts';
import { createMapSessions } from '../server/map-sessions.ts';
import { createScenarioSession, loadGeographicRules } from '../server/scenario-session.ts';
import { CaptureStore, digest } from '../server/capture-store.ts';
import type { CaptureContext } from '../src/capture/types.ts';
import type { Operation, ScenarioCommand } from '../server/scenario-session.ts';
const rules = loadGeographicRules();
const mapId = 'taiwan-senkaku/focus';
function fixture() {
  const directory = mkdtempSync(join(tmpdir(), 'xr-capture-')), sessions = createMapSessions(rules,directory), store = sessions.capture;
  const context: CaptureContext = { principalId: store.join().principalId, interface: 'browser' };
  const second: CaptureContext = { principalId: store.join().principalId, interface: 'vr' };
  const session = sessions.get(mapId)!;
  const command = (operation: Operation, actor = context, id = crypto.randomUUID()): ScenarioCommand => {
    const view = session.getState(actor); return { id, runId: view.runId, observationId: view.observationId, revision: view.revision, operation };
  };
  return { directory,sessions,store,context,second,session,command, close(){ store.close(); rmSync(directory,{recursive:true,force:true}); } };
}
test('separate local databases preserve browser seats and private notes in a shared cookie jar',()=>{
  const a=fixture(),b=fixture(),cookies=new Map<string,string>();
  const visit=(store:CaptureStore)=>captureContext({headers:{cookie:[...cookies].map(([k,v])=>`${k}=${v}`).join('; ')}} as IncomingMessage,
    {setHeader(name:string,value:string){assert.equal(name,'Set-Cookie');const [pair]=value.split(';'),index=pair.indexOf('=');cookies.set(pair.slice(0,index),pair.slice(index+1));}} as unknown as ServerResponse,store);
  try{
    const legacy=a.store.join();cookies.set('xr-seat',legacy.token);
    const original=visit(a.store);assert.equal(original.principalId,legacy.principalId);
    const run=a.session.getState(original).runId!;
    a.store.annotate(run,original,{kind:'reflection',audience:'private',text:'Retain this seat across local servers.'});
    const alternate=visit(b.store);assert.notEqual(alternate.principalId,original.principalId);
    // An older server can still replace its legacy cookie while the new stores coexist.
    cookies.set('xr-seat',b.store.join().token);
    const returned=visit(a.store);assert.equal(returned.principalId,original.principalId);
    assert.equal(a.store.review(run,returned.principalId).annotations.length,1);
    assert.equal(visit(b.store).principalId,alternate.principalId);
    assert.equal(a.store.review(run,b.context.principalId).annotations.length,0);
  }finally{a.close();b.close();}
});
test('captured orders retain the original observation and result across retry, new run and restart', () => {
  const f=fixture(); try {
    const command=f.command({type:'action',action:{type:'advance'}}), runId=command.runId!;
    const first=f.session.submit(command,f.context); assert.equal(first.status,200);
    const reset=f.session.submit(f.command({type:'new',setup:{mapId,year:2026,demo:false}},f.second),f.second);assert.equal(reset.status,200);
    assert.notEqual(reset.body.state.runId,runId);
    const retry=f.session.submit(command,f.context); assert.equal(retry.body.duplicate,true);assert.equal(retry.body.resultId,first.body.resultId);
    const review=f.store.review(runId,f.context.principalId);assert.equal(review.run.status,'archived');
    assert.equal(review.commands.length,2);assert.equal(review.commands[0].observationId,command.observationId);assert.equal(review.commands[0].retries,1);
    assert.equal(review.participants.filter(p=>p.kind==='human').length,2);
    const reopened=createMapSessions(rules,f.directory);try {
      assert.deepEqual(reopened.get(mapId)!.getState(),f.session.getState());
      assert.equal(reopened.get(mapId)!.submit(command,f.context).body.resultId,first.body.resultId);
    }finally{reopened.capture.close();}
  }finally{f.close();}
});
test('a stale decision links drafting and validation views; a rejected request is counted once',()=>{
  const f=fixture();try{
    const stale=f.command({type:'action',action:{type:'advance'}});
    assert.equal(f.session.submit(f.command({type:'action',action:{type:'advance'}},f.second),f.second).status,200);
    const reject=f.session.submit(stale,f.context);assert.equal(reject.status,409);assert.equal(reject.body.reasonCode,'revision.stale');
    assert.equal(f.session.submit(stale,f.context).body.resultId,reject.body.resultId);
    const record=f.store.commands(stale.runId!).find(r=>r.id===reject.body.resultId)!;
    assert.equal(record.expectedRevision,0);assert.equal(record.validatedRevision,1);assert.notEqual(record.observationId,record.validationObservationId);
    const altered={...stale,operation:{type:'new',setup:{mapId,year:2026,demo:false}}};
    assert.equal(f.session.submit(altered,f.context).body.reasonCode,'command.conflict');
    assert.equal(f.store.commands(stale.runId!).length,2);
  }finally{f.close();}
});
test('failed essential event write rolls back the state, result, observations and run switch',()=>{
  const f=fixture();try{
    const cmd=f.command({type:'action',action:{type:'advance'}}),before=f.session.getState(),count=f.store.one('SELECT COUNT(*) n FROM observations')!.n;
    f.store.db.exec("CREATE TRIGGER capture_fault BEFORE INSERT ON events BEGIN SELECT RAISE(ABORT,'injected disk write failure'); END;");
    const result=f.session.submit(cmd,f.context);assert.equal(result.status,503);assert.equal(result.body.reasonCode,'storage.unavailable');
    assert.deepEqual(f.session.getState(),before);assert.equal(f.store.commands(cmd.runId!).length,0);assert.equal(f.store.one('SELECT COUNT(*) n FROM observations')!.n,count);
    const reset=f.command({type:'new',setup:{mapId,year:2026,demo:false}});assert.equal(f.session.submit(reset,f.context).status,503);assert.deepEqual(f.session.getState(),before);
    assert.equal(f.store.listRuns().length,6);
    f.store.db.exec('DROP TRIGGER capture_fault');assert.equal(f.session.submit(cmd,f.context).status,200);
  }finally{f.close();}
});
test('an observation from another participant cannot authorize a decision or presentation acknowledgment',()=>{
  const f=fixture();try{
    const cmd=f.command({type:'action',action:{type:'advance'}});
    assert.equal(f.session.submit(cmd,f.second).body.reasonCode,'observation.mismatch');assert.equal(f.session.getState().revision,0);
    assert.throws(()=>f.store.presented(cmd.observationId!,f.second,null),/does not belong/);
    f.store.delivered(cmd.observationId!);f.store.presented(cmd.observationId!,f.context,'2026-09-16T00:00:00Z');
    const observation=f.store.review(cmd.runId!,f.context.principalId).observations.find(o=>o.id===cmd.observationId)!;
    assert.ok(observation.issuedAt&&observation.deliveredAt&&observation.presentedAt);assert.equal(observation.clientTime,'2026-09-16T00:00:00Z');
  }finally{f.close();}
});
test('checkpoint reconstruction and portable export preserve cargo, movement, versions and initial setup',()=>{
  const f=fixture();try{
    const setup=f.session.submit(f.command({type:'new',setup:{mapId,year:2026,demo:true}}),f.context);assert.equal(setup.status,200);
    const runId=setup.body.state.runId!;
    for(const action of [{type:'load',pieceId:'B-01',carrierId:'B-02'},{type:'advance'}] as const){assert.equal(f.session.submit(f.command({type:'action',action}),f.context).status,200);}
    const review=f.store.review(runId,f.context.principalId);
    for(const cp of review.checkpoints) {
      const exercise=f.store.exercise(runId,cp.revision);assert.deepEqual(rules.import(rules.export(exercise)),exercise);
    }
    assert.equal(f.store.exercise(runId).pieces.find(p=>p.id==='B-01')!.carrierId,'B-02');
    const exported=f.store.exportRun(runId,f.context.principalId);assert.equal(exported.trainingPermission,'unspecified');assert.ok(exported.artifact.sources['src/scenario/rules.ts']);
    assert.equal(digest(exported.artifact),review.run.artifactHash);assert.ok(!JSON.stringify(exported).includes('token_hash'));
    assert.ok(Object.values(exported.states).every(state=>!('events' in state)));
  }finally{f.close();}
});
test('note audiences are enforced and retrospective explanation remains separate from original action',()=>{
  const f=fixture();try{
    const cmd=f.command({type:'action',action:{type:'advance'}}),result=f.session.submit(cmd,f.context),runId=cmd.runId!;
    const privateId=f.store.annotate(runId,f.context,{id:crypto.randomUUID(),kind:'reflection',text:'Private reflection',audience:'private',commandId:result.body.resultId!});
    f.store.annotate(runId,f.context,{kind:'assumption',text:'Shared assumption',audience:'exercise'});
    assert.equal(f.store.review(runId,f.context.principalId).annotations.length,2);
    assert.equal(f.store.review(runId,f.second.principalId).annotations.length,1);
    assert.ok(!JSON.stringify(f.store.exportRun(runId,f.second.principalId)).includes('Private reflection'));
    assert.equal(f.store.annotations(runId,f.context.principalId).find(a=>a.id===privateId)!.timing,'retrospective');
    assert.throws(()=>f.store.annotate(runId,f.second,{id:privateId,kind:'reflection',text:'Private reflection',audience:'private'}),/conflicts/);
  }finally{f.close();}
});
test('optional telemetry deduplicates, bounds input and cannot change gameplay',()=>{
  const f=fixture();try{
    const before=f.session.getState(),id=crypto.randomUUID(),batch=[{id,type:'cancel',data:{action:'move'}}];
    f.store.telemetry(before.runId!,f.context,batch);f.store.telemetry(before.runId!,f.context,batch);
    assert.equal(f.store.review(before.runId!,f.context.principalId).telemetry[0].count,1);
    assert.throws(()=>f.store.telemetry(before.runId!,f.context,Array(51).fill(batch[0])),/50/);
    assert.deepEqual(f.session.getState(),before);
  }finally{f.close();}
});
test('consistent backup restores active state and the full archived learning record',()=>{
  const f=fixture();try{
    const cmd=f.command({type:'action',action:{type:'advance'}});f.session.submit(cmd,f.context);
    f.store.annotate(cmd.runId!,f.context,{kind:'reflection',text:'Restore this evidence.',audience:'exercise'});
    const destination=join(f.directory,'backup.sqlite');f.store.backup(destination);
    const restored=new CaptureStore(destination,rules);try{
      assert.deepEqual(restored.exercise(cmd.runId!),f.session.getState().exercise);
      assert.deepEqual(restored.review(cmd.runId!,f.context.principalId),f.store.review(cmd.runId!,f.context.principalId));
    }finally{restored.close();}
    assert.throws(()=>f.store.backup(destination),/already exists/);
  }finally{f.close();}
});
test('map journal migration captures old run boundaries once and preserves the source bytes',()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-legacy-capture-'));try{
    const path=join(directory,'maps',mapId.replaceAll('/','--')+'.jsonl');mkdirSync(join(directory,'maps'));
    const old=createScenarioSession(rules,path,mapId);
    old.submit({id:'a',revision:0,operation:{type:'action',action:{type:'advance'}}});
    old.submit({id:'b',revision:1,operation:{type:'new',setup:{mapId,year:2026,demo:true}}});
    old.submit({id:'c',revision:2,operation:{type:'action',action:{type:'advance'}}});
    const source=readFileSync(path), sessions=createMapSessions(rules,directory);try{
      assert.deepEqual(sessions.get(mapId)!.getState().exercise,old.getState().exercise);
      const runs=sessions.capture.listRuns().filter(r=>r.mapId===mapId);assert.equal(runs.length,2);assert.equal(runs.filter(r=>r.status==='archived').length,1);
      assert.equal(runs[0].createdAt,null);assert.ok(runs.every(r=>r.quality.length>0));assert.deepEqual(readFileSync(path),source);
      const count=sessions.capture.one('SELECT COUNT(*) n FROM command_results')!.n;
      const again=createMapSessions(rules,directory);try{assert.equal(again.capture.one('SELECT COUNT(*) n FROM command_results')!.n,count);}finally{again.capture.close();}
    }finally{sessions.capture.close();}
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('corrupt legacy journal is quarantined without installing an incomplete active map',()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-bad-capture-'));try{
    mkdirSync(join(directory,'maps'));const path=join(directory,'maps',mapId.replaceAll('/','--')+'.jsonl');writeFileSync(path,'{"broken":true}\n');
    assert.throws(()=>createMapSessions(rules,directory),/needs recovery/);
    const db=new DatabaseSync(join(directory,'exercises.sqlite'));try{
      assert.equal(db.prepare('SELECT * FROM active_maps WHERE map_id=?').get(mapId),undefined);
      assert.equal(db.prepare('SELECT status FROM migrations').get()!.status,'quarantined');
    }finally{db.close();}
    assert.equal(readFileSync(path,'utf8'),'{"broken":true}\n');
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('corrupt historical geographic journals remain quarantined on subsequent startup',()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-bad-history-'));try{
    const path=join(directory,'geographic-session.jsonl');writeFileSync(path,'{"broken":true}\n');
    for(let attempt=0;attempt<2;attempt++)assert.throws(()=>createMapSessions(rules,directory),/needs recovery/);
    assert.equal(readFileSync(path,'utf8'),'{"broken":true}\n');
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('historical geographic map changes preserve every run and exact original source',()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-old-history-'));try{
    const path=join(directory,'geographic-session.jsonl'),old=createScenarioSession(rules,path);
    assert.equal(old.submit({id:'a',revision:0,operation:{type:'action',action:{type:'advance'}}}).status,200);
    assert.equal(old.submit({id:'b',revision:1,operation:{type:'new',setup:{mapId,year:2026,demo:true}}}).status,200);
    assert.equal(old.submit({id:'c',revision:2,operation:{type:'action',action:{type:'advance'}}}).status,200);
    const bytes=readFileSync(path),sessions=createMapSessions(rules,directory);try{
      assert.deepEqual(sessions.get(mapId)!.getState().exercise,old.getState().exercise);
      assert.equal(sessions.capture.listRuns().filter(r=>r.origin==='legacy').length,2);
      assert.equal(sessions.capture.one('SELECT COUNT(*) n FROM command_results')!.n,3);
      assert.deepEqual(readFileSync(path),bytes);
    }finally{sessions.capture.close();}
  }finally{rmSync(directory,{recursive:true,force:true});}
});
test('portable imports retain the verified source run, exact checkpoint and input hash',()=>{
  const f=fixture();try{
    f.session.submit(f.command({type:'action',action:{type:'advance'}}),f.context);
    const parent=f.session.getState(),save={...rules.export(parent.exercise),capture:{runId:parent.runId!,serviceRevision:parent.revision}};
    // Import after the parent has moved on: the recorded lineage must name the saved checkpoint.
    f.session.submit(f.command({type:'action',action:{type:'advance'}}),f.context);
    const imported=f.session.submit(f.command({type:'import',save}),f.context);assert.equal(imported.status,200);
    const exported=f.store.exportRun(imported.body.state.runId!,f.context.principalId);
    assert.equal(exported.review.run.parentRunId,parent.runId);assert.equal(exported.review.run.parentRevision,parent.revision);assert.equal(exported.review.run.sourceHash,digest(save));
    const forged={...save,capture:{...save.capture,serviceRevision:parent.revision+1}};
    const foreign=f.session.submit(f.command({type:'import',save:forged}),f.context);assert.equal(foreign.status,200);
    assert.equal(f.store.review(foreign.body.state.runId!,f.context.principalId).run.parentRunId,null);
    assert.equal(f.store.review(foreign.body.state.runId!,f.context.principalId).run.parentRevision,null);
  }finally{f.close();}
});
test('CLI restore includes committed WAL data and verifies the resulting standalone database',async()=>{
  const {execFileSync}=await import('node:child_process');
  const f=fixture();try{
    f.store.db.exec('PRAGMA wal_autocheckpoint=0; PRAGMA wal_checkpoint(TRUNCATE);');
    const cmd=f.command({type:'action',action:{type:'advance'}});assert.equal(f.session.submit(cmd,f.context).status,200);
    const expected=f.session.getState(),destination=join(f.directory,'restored');
    assert.ok(readFileSync(f.store.path+'-wal').length>0);
    const output=execFileSync(process.execPath,['scripts/capture-db.mjs','restore','--input='+f.store.path,'--data='+destination],{encoding:'utf8'});assert.equal(JSON.parse(output).restored,join(destination,'exercises.sqlite'));
    const restored=new CaptureStore(join(destination,'exercises.sqlite'));
    try{assert.deepEqual(restored.exercise(expected.runId!),expected.exercise);assert.equal(restored.commands(expected.runId!).length,1);}finally{restored.close();}
  }finally{f.close();}
});
test('assessment retries cannot silently change the recorded rubric version',()=>{
  const f=fixture();try{
    const runId=f.session.getState().runId!,note={id:crypto.randomUUID(),kind:'assessment' as const,text:'Explained the coordination tradeoff.',audience:'exercise' as const,rubric:'Coordination v1'};
    f.store.annotate(runId,f.context,note);assert.equal(f.store.annotate(runId,f.context,note),note.id);
    assert.throws(()=>f.store.annotate(runId,f.context,{...note,rubric:'Coordination v2'}),/conflicts/);
    assert.equal(f.store.annotations(runId,f.context.principalId)[0].rubric,'Coordination v1');
  }finally{f.close();}
});
