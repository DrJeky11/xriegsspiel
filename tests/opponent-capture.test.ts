import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CaptureStore } from '../server/capture-store.ts';
import { loadGeographicRules } from '../server/scenario-session.ts';
import { createOpponentSessions } from '../server/opponent-session.ts';
import { decide } from '../src/opponent/policy.ts';
import type { OpponentCommand, OpponentOperation } from '../server/opponent-session.ts';
const planner=async(...args:Parameters<typeof decide>)=>decide(...args);
const rules=loadGeographicRules();
test('opposed games commit to the exercise database with historical role views, notes and exact restart/export',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-opponent-capture-')),store=new CaptureStore(join(directory,'exercises.sqlite'),rules);
  try{
    let sessions=createOpponentSessions(directory,planner,store);
    const created=await sessions.create({scenarioId:'SPR-H01',difficulty:'novice',humanSide:'blue',seed:1});let state=created.state;
    assert.ok(state.observationId);assert.equal(state.capture,'durable');assert.equal(existsSync(join(directory,'opponents',state.id+'.json')),false);
    const send=async(operation:OpponentOperation,token=created.playerToken)=>{const command:OpponentCommand={id:crypto.randomUUID(),revision:state.revision,observationId:state.observationId,operation};const result=await sessions.submit(state.id,token,command);state=result.state;return command;};
    const invalid:OpponentCommand={id:crypto.randomUUID(),revision:state.revision,observationId:state.observationId,operation:{type:'orders',side:'red',orders:[]}};
    await assert.rejects(sessions.submit(state.id,created.playerToken,invalid));await assert.rejects(sessions.submit(state.id,created.playerToken,invalid));
    const command=await send({type:'orders',side:'blue',orders:[]});assert.equal((await sessions.submit(state.id,created.playerToken,command)).duplicate,true);
    let learning=sessions.learning(state.id,created.playerToken).learning;assert.equal(learning.decisions.length,2);assert.equal(learning.metrics.rejectedPlans,1);assert.equal(learning.metrics.retries,2);
    assert.equal(learning.decisions[1].decisionView.observation.side,'blue');assert.equal(learning.decisions[1].decisionView.ownOrders,null);assert.equal(learning.artifact,undefined);
    sessions.annotate(state.id,created.playerToken,{id:crypto.randomUUID(),decisionId:learning.decisions[1].id,kind:'reflection',text:'Preserve effort for the next round.'});
    assert.equal(sessions.learning(state.id,created.refereeToken).learning.notes.length,0);
    while(String(state.phase)!=='complete')await send(state.phase==='review'?{type:'next'}:{type:'orders',side:'blue',orders:[]});
    const exported=sessions.export(state.id,created.playerToken);assert.ok(exported.learning?.artifact.sources['src/opponent/rules.ts']);assert.equal(exported.learning?.notes.length,1);assert.equal(exported.learning?.trainingPermission,'unspecified');
    sessions=createOpponentSessions(directory,planner,store);assert.deepEqual(sessions.get(state.id,created.playerToken),state);
    const file=join(directory,'backup.sqlite');store.backup(file);const restored=new CaptureStore(file,rules);
    try{const resumed=createOpponentSessions(directory,planner,restored);assert.deepEqual(resumed.export(state.id,created.playerToken),exported);}finally{restored.close();}
    assert.throws(()=>sessions.learning(state.id,'invalid'),/invitation/);
  }finally{store.close();rmSync(directory,{recursive:true,force:true});}
});
test('scenario event-write failure rolls back authoritative state and allows the identical request to retry',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-opponent-fault-')),store=new CaptureStore(join(directory,'exercises.sqlite'),rules);
  try{
    const sessions=createOpponentSessions(directory,planner,store),created=await sessions.create({scenarioId:'SPR-H01',difficulty:'novice',humanSide:'blue',seed:1});
    const command:OpponentCommand={id:crypto.randomUUID(),revision:0,observationId:created.state.observationId,operation:{type:'orders',side:'blue',orders:[]}};
    store.db.exec("CREATE TRIGGER scenario_fault BEFORE INSERT ON opponent_decisions BEGIN SELECT RAISE(ABORT,'injected scenario write failure'); END;");
    await assert.rejects(sessions.submit(created.state.id,created.playerToken,command),/Retry the same/);
    assert.deepEqual(sessions.get(created.state.id,created.playerToken),created.state);assert.equal(store.one('SELECT COUNT(*) n FROM opponent_decisions')!.n,0);
    store.db.exec('DROP TRIGGER scenario_fault');assert.equal((await sessions.submit(created.state.id,created.playerToken,command)).state.revision,1);
  }finally{store.close();rmSync(directory,{recursive:true,force:true});}
});
test('foreign role views cannot enter player learning records, and replay branches survive verification',async()=>{
  const directory=mkdtempSync(join(tmpdir(),'xr-opponent-roles-')),store=new CaptureStore(join(directory,'exercises.sqlite'),rules);
  try{
    const sessions=createOpponentSessions(directory,planner,store),created=await sessions.create({scenarioId:'SEN-H01',difficulty:'novice',humanSide:'blue',seed:1});let state=created.state;
    const send=async(operation:OpponentOperation,referee=false)=>{const token=referee?created.refereeToken:created.playerToken,view=sessions.get(state.id,token);state=(await sessions.submit(state.id,token,{id:crypto.randomUUID(),revision:view.revision,observationId:view.observationId,operation})).state;};
    await send({type:'takeover',enabled:true},true);
    const secret=sessions.get(state.id,created.refereeToken,'red');
    await assert.rejects(sessions.submit(state.id,created.playerToken,{id:crypto.randomUUID(),revision:state.revision,observationId:secret.observationId,operation:{type:'orders',side:'blue',orders:[]}}),/decision view/);
    const rejected=sessions.learning(state.id,created.playerToken).learning.decisions.at(-1)!;assert.equal(rejected.decisionView,null);assert.equal(rejected.validationView.observation.side,'blue');
    await send({type:'orders',side:'red',orders:[]},true);await send({type:'orders',side:'blue',orders:[]});
    await send({type:'contest',eventId:state.observation.events.at(-1)!.id,reason:'Check the result.'});
    const branch=state.branchId;await send({type:'ruling',disposition:'replay',reason:'Try another approach.'},true);
    assert.equal(state.parent,branch);assert.equal(store.one('SELECT COUNT(*) n FROM opponent_branches')!.n,1);
    const {verifyOpponentCapture}=await import('../server/capture-verify.ts');assert.equal((await verifyOpponentCapture(store))[0].branches,1);
    assert.equal(sessions.learning(state.id,created.playerToken).learning.archivedBranches,undefined);
    store.run('UPDATE opponent_artifacts SET data=?','{}');await assert.rejects(verifyOpponentCapture(store),/hash mismatch/);
  }finally{store.close();rmSync(directory,{recursive:true,force:true});}
});
