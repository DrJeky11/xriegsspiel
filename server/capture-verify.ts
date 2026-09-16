import type { CaptureStore } from './capture-store.ts';
import { compact, digest } from './capture-store.ts';
import { GeographicRules } from '../src/scenario/rules.ts';
import type { TerrainMap } from '../src/pacific/terrain.ts';
import { keyOf } from '../src/pacific/terrain.ts';
import { readFileSync } from 'node:fs';

/** Include sealed scenario state and referee branches in backup/recovery checks. */
export async function verifyOpponentCapture(store:CaptureStore) {
  if(Number(store.one('PRAGMA user_version')?.user_version)<2)return [];
  const runs=store.all('SELECT * FROM opponent_states');
  if(!runs.length)return [];
  // A map archive must remain verifiable without loading an unrelated scenario engine.
  const {verifyOpponentReplay}=await import('./opponent-session.ts');
  return runs.map(row=>{
    const artifact=store.one('SELECT data FROM opponent_artifacts WHERE hash=?',row.artifact_hash)?.data;
    if(!artifact||digest(artifact)!==row.artifact_hash)throw new Error('Scenario content hash mismatch.');
    const run=JSON.parse(row.data);if(run.schema!=='opponent-run/1'||run.id!==row.id||run.branchId!==row.branch_id||run.revision!==row.revision)throw new Error('Scenario identity or revision differs.');
    verifyOpponentReplay(run);
    const branches=store.all('SELECT * FROM opponent_branches WHERE run_id=?',row.id);
    for(const branch of branches){const state=JSON.parse(branch.data);if(state.id!==row.id||state.branchId!==branch.id)throw new Error('Archived scenario branch identity differs.');verifyOpponentReplay(state);}
    for(const decision of store.all('SELECT * FROM opponent_decisions WHERE run_id=?',row.id))if(digest(decision.command)!==decision.fingerprint)throw new Error('Scenario command fingerprint differs.');
    for(const view of store.all('SELECT * FROM opponent_views WHERE run_id=?',row.id))if(digest({run:row.id,branch:view.branch_id,role:view.role,data:view.data})!==view.id)throw new Error('Historical scenario view hash differs.');
    return {runId:row.id,rounds:run.rounds.length,branches:branches.length,verified:true};
  });
}

/** Verify every stored transition against pinned data and the compatible executable rules. */
export function verifyCaptureRun(store:CaptureStore,runId:string) {
  const run=store.one('SELECT * FROM runs WHERE id=?',runId);if(!run)throw new Error('Unknown exercise.');
  const raw=store.one('SELECT data FROM artifacts WHERE hash=?',run.artifact_hash)?.data;
  if(!raw||digest(raw)!==run.artifact_hash)throw new Error('Pinned content hash mismatch.');
  const artifact=JSON.parse(raw);
  // A source edit may leave the versioned mechanics unchanged. Prove compatibility by exact
  // transition replay below rather than accepting a version string or rejecting a comment edit.
  const sourceMatches=['src/scenario/rules.ts','src/pieces.ts','src/pacific/terrain.ts'].every(path=>artifact.sources[path]===readFileSync(path,'utf8'));
  const maps=new Map<string,TerrainMap>(artifact.maps.map((m:Omit<TerrainMap,'byKey'>)=>[m.id,{...m,byKey:new Map(m.cells.map(c=>[keyOf(c),c]))}]));
  const rules=new GeographicRules(artifact.catalog,artifact.profiles,maps);
  const checkpoints=store.all('SELECT * FROM checkpoints WHERE run_id=? ORDER BY revision',runId);
  let state=store.exercise(runId,run.initial_revision);rules.import({schema:'xriegsspiel-geographic-save/1',exercise:state});
  const actions=store.all("SELECT * FROM events WHERE run_id=? AND kind='game.action' ORDER BY revision",runId);
  if(checkpoints.length!==actions.length+1)throw new Error('Checkpoint/event counts do not reconcile.');
  for(let i=0;i<actions.length;i++){
    const record=JSON.parse(actions[i].payload),cp=checkpoints[i+1];
    const command=store.one('SELECT * FROM command_results WHERE id=?',actions[i].result_id);
    if(!command||command.status!==200||command.run_id!==runId||command.before_hash!==record.beforeHash||command.after_hash!==record.afterHash||digest(JSON.parse(command.operation).action)!==digest(record.event.action))throw new Error('Command result and game event do not reconcile.');
    if(cp.revision!==actions[i].revision||cp.revision!==checkpoints[i].revision+1||record.beforeHash!==checkpoints[i].state_hash)throw new Error('Captured transition sequence is inconsistent.');
    state=rules.apply(state,record.event.action);
    if(digest(compact(state))!==cp.state_hash||record.afterHash!==cp.state_hash||digest(state.events.at(-1))!==digest(record.event))throw new Error('Captured transition does not reproduce its checkpoint.');
    store.state(cp.state_hash);
  }
  if(digest(store.exercise(runId))!==digest(state))throw new Error('Captured final state differs from replay.');
  return {runId,checkpoints:checkpoints.length,actions:actions.length,verified:true,sourceMatches};
}
