import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CaptureStore, compact, digest } from './capture-store.ts';
import { createScenarioSession, validCommand } from './scenario-session.ts';
import type { ScenarioCommand, ScenarioState } from './scenario-session.ts';
import type { GeographicRules, Preview } from '../src/scenario/rules.ts';
import type { CaptureContext } from '../src/capture/types.ts';

export function createCapturedSession(rules: GeographicRules, store: CaptureStore, mapId: string) {
  function current(): ScenarioState {
    const active = store.active(mapId); if (!active) throw new Error('Map capture is unavailable.');
    return { revision: active.revision, exercise: store.exercise(active.run_id, active.revision), runId: active.run_id, runStatus:store.one('SELECT status FROM runs WHERE id=?',active.run_id)!.status, capture: 'durable' };
  }
  function withObservation(state: ScenarioState, context?: CaptureContext) {
    if (!context) return state;
    const observation = store.observe(state.runId!, state.revision, context);
    return { ...state, observationId: observation.id, participantId: observation.participantId, participantLabel: observation.participantLabel };
  }
  return {
    getState(context?: CaptureContext) { return context ? store.transaction(() => withObservation(current(), context)) : current(); },
    submit(value: unknown, context?: CaptureContext, legacy = false) {
      try {
        return store.transaction(() => {
          const state = current(), runId = state.runId!;
          const failure = (status: number, error: string, reasonCode: string) => ({ status, body: { error, reasonCode, state: withObservation(state, context), duplicate: false, resultId: null as string | null } });
          if (!validCommand(value)) {
            store.event(runId, 'request.malformed', null, null, state.revision, { reasonCode: 'request.malformed' }, legacy);
            return failure(400, 'Malformed geographic command.', 'request.malformed');
          }
          if (context && (typeof value.runId !== 'string' || typeof value.observationId !== 'string')) return failure(400, 'Refresh this exercise before submitting an order.', 'observation.required');
          const requestedRun = value.runId ?? runId;
          const knownRun = store.one('SELECT * FROM runs WHERE id=? AND map_id=?', requestedRun, mapId);
          if (!knownRun) return failure(409, 'This order belongs to another exercise.', 'run.unknown');
          const actor = store.participant(requestedRun, context, legacy);
          const fingerprint = digest(value);
          const prior = store.one('SELECT * FROM command_results WHERE run_id=? AND participant_id=? AND command_id=?', requestedRun, actor.id, value.id);
          if (prior) {
            if (prior.fingerprint !== fingerprint) return failure(409, 'This command ID belongs to a different request.', 'command.conflict');
            store.run('UPDATE command_results SET retries=retries+1 WHERE id=?', prior.id);
            return { status: prior.status as number, body: { error: prior.status === 200 ? undefined : prior.explanation as string,
              reasonCode: prior.reason_code as string, state: withObservation(state, context), duplicate: true, resultId: prior.id as string } };
          }
          const receivedAt = legacy ? null : new Date().toISOString();
          let status = 200, reasonCode = 'command.accepted', explanation = '', guidance: Preview | null = null;
          let next = state.exercise, nextRunId: string | null = null;
          const beforeHash = store.one('SELECT state_hash FROM checkpoints WHERE run_id=? AND revision=?', runId, state.revision)!.state_hash as string;
          const originalObservation = value.observationId ? store.one('SELECT * FROM observations WHERE id=? AND run_id=? AND participant_id=?', value.observationId, requestedRun, actor.id) : undefined;
          if (context && (!originalObservation || originalObservation.revision !== value.revision)) {
            status = 409; reasonCode = 'observation.mismatch'; explanation = 'The decision view does not match this participant and revision. Refresh and preview again.';
          } else if (requestedRun !== runId) {
            status = 409; reasonCode = 'run.replaced'; explanation = 'This exercise was archived. Review the current exercise before issuing an order.';
          } else if (value.revision !== state.revision) {
            status = 409; reasonCode = 'revision.stale'; explanation = 'Another screen changed this exercise. Review the refreshed state and preview again.';
          } else if(knownRun.status==='archived'&&value.operation.type==='action'){
            status=409;reasonCode='run.finished';explanation='This exercise is finished. Start a new exercise or import a checkpoint to continue as a new run.';
          } else {
            try {
              const op = value.operation;
              if (op.type === 'action') {
                guidance = rules.evaluate(state.exercise, op.action);
                if (!guidance.allowed) { status = 422; reasonCode = guidance.reasonCode ?? `${op.action.type}.restricted`; explanation = guidance.reason; }
                else { next = rules.apply(state.exercise, op.action); explanation = guidance.reason; }
              } else {
                next = op.type === 'new' ? rules.create(op.setup) : rules.import(op.save);
                if (next.manifest.mapId !== mapId) { status = 422; reasonCode = 'map.mismatch'; explanation = 'This save or setup belongs to another map. Open that map before restoring it.'; }
                else explanation = op.type === 'new' ? 'Previous exercise archived; a new exercise started.' : 'Save imported as a new exercise; inherited history is retained.';
              }
            } catch (error) { status = 422; reasonCode = value.operation.type === 'import' ? 'save.incompatible' : 'setup.invalid'; explanation = error instanceof Error ? error.message : 'Order rejected.'; }
          }
          const validationObservation = context ? store.observe(runId, state.revision, context) : null;
          let afterHash = beforeHash;
          const nextRevision = state.revision + 1;
          if (status === 200) {
            if (value.operation.type === 'action') afterHash = store.checkpoint(runId, nextRevision, next, receivedAt);
            else {
              const lineage=value.operation.type==='import'?value.operation.save.capture:undefined;
              const parent=lineage&&typeof lineage.runId==='string'&&Number.isSafeInteger(lineage.serviceRevision)
                ?store.one('SELECT run_id FROM checkpoints WHERE run_id=? AND revision=? AND state_hash=?',lineage.runId,lineage.serviceRevision,digest(compact(next)))?.run_id:undefined;
              nextRunId = store.startRun(next, nextRevision, { origin: legacy ? 'legacy' : value.operation.type === 'import' ? 'import' : 'live', parent, sourceHash: value.operation.type === 'import' ? digest(value.operation.save) : undefined, legacy });
              afterHash = store.one('SELECT state_hash FROM checkpoints WHERE run_id=? AND revision=?', nextRunId, nextRevision)!.state_hash;
              store.archive(runId, value.operation.type === 'new' ? 'new-exercise' : 'save-import', legacy);
            }
            store.run('UPDATE active_maps SET run_id=?,revision=? WHERE map_id=?', nextRunId ?? runId, nextRevision, mapId);
          }
          const resultId = randomUUID();
          store.run(`INSERT INTO command_results(id,run_id,participant_id,command_id,fingerprint,operation,received_at,committed_at,interface,status,reason_code,explanation,
            expected_revision,validated_revision,observation_id,validation_observation_id,before_hash,after_hash,next_run_id,source,guidance)
            VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, resultId, requestedRun, actor.id, value.id, fingerprint, JSON.stringify(value.operation), receivedAt,
            legacy ? null : new Date().toISOString(), context?.interface ?? (legacy ? 'unknown' : 'script'), status, reasonCode, explanation,
            value.revision, state.revision, originalObservation?.id ?? null, validationObservation?.id ?? null, beforeHash, afterHash, nextRunId, legacy ? 'legacy-unknown' : context ? 'human' : 'script', guidance ? JSON.stringify(guidance) : null);
          if(value.rationale?.trim()&&context)store.run('INSERT INTO annotations VALUES(?,?,?,?,?,?,?,?,?,?)',randomUUID(),requestedRun,resultId,actor.id,'intent',value.rationale.trim(),'exercise',receivedAt,'before-resolution',null);
          if (status === 200 && value.operation.type === 'action') store.event(runId, 'game.action', actor.id, resultId, nextRevision,
            { event: next.events.at(-1), beforeHash, afterHash, cost: guidance?.cost ?? null }, legacy);
          else store.event(requestedRun, status === 200 ? 'run.replaced' : 'command.rejected', actor.id, resultId, state.revision, { reasonCode, nextRunId }, legacy);
          return { status, body: { error: status === 200 ? undefined : explanation, reasonCode, state: withObservation(current(), context), duplicate: false, resultId } };
        });
      } catch (error) {
        console.error('Exercise transaction failed:', error instanceof Error ? error.message : 'storage failure');
        return { status: 503, body: { error: 'The exercise could not be saved. No order was committed. Retry the same request.', reasonCode: 'storage.unavailable', state: current(), duplicate: false, resultId: null } };
      }
    },
  };
}

/** Validate the original journal fully before importing it. Originals are never opened for writing. */
export function initializeCapture(rules: GeographicRules, store: CaptureStore, directory: string) {
  for (const mapId of rules.maps.keys()) {
    if (store.active(mapId)) continue;
    const path = join(directory, 'maps', `${mapId.replaceAll('/', '--')}.jsonl`);
    if (!existsSync(path)) {
      store.transaction(() => {
        const id = store.startRun(rules.create({ mapId, year: 2026, demo: false }), 0);
        store.run('INSERT INTO active_maps VALUES(?,?,0)', mapId, id);
      });
      continue;
    }
    const bytes = readFileSync(path, 'utf8'), sourceHash = digest(bytes);
    try {
      const expected = createScenarioSession(rules, path, mapId).getState();
      const records = bytes.split('\n').filter(Boolean).map(line => JSON.parse(line) as {command: ScenarioCommand; state: ScenarioState});
      store.transaction(() => {
        const id = store.startRun(rules.create({ mapId, year: 2026, demo: false }), 0, { origin: 'legacy', sourceHash, legacy: true });
        store.run('INSERT INTO active_maps VALUES(?,?,0)', mapId, id);
        const session = createCapturedSession(rules, store, mapId);
        for (const record of records) {
          const result = session.submit(record.command, undefined, true);
          if (result.status !== 200 || digest(result.body.state.exercise) !== digest(record.state.exercise)) throw new Error('Migration state differs from source journal.');
        }
        if (digest(session.getState().exercise) !== digest(expected.exercise)) throw new Error('Migration final state differs.');
        store.run("INSERT INTO migrations VALUES(?,?,?,?,'verified',?)", sourceHash, path, new Date().toISOString(), records.length, 'Exact replay and final state reconciled.');
      });
    } catch (error) {
      store.run("INSERT OR REPLACE INTO migrations VALUES(?,?,?,0,'quarantined',?)", sourceHash, path, new Date().toISOString(), String(error).slice(0,500));
      throw new Error(`Map journal needs recovery; original preserved at ${path}. ${String(error)}`);
    }
  }
  const legacyPath = join(directory, 'geographic-session.jsonl');
  if (existsSync(legacyPath)) {
    const bytes=readFileSync(legacyPath,'utf8'),sourceHash = digest(bytes);
    if (store.one('SELECT status FROM migrations WHERE source_hash=?', sourceHash)?.status !== 'verified') {
      try{
        const old = createScenarioSession(rules, legacyPath).getState();
        const records=bytes.split('\n').filter(Boolean).map(line=>JSON.parse(line) as {command:ScenarioCommand;state:ScenarioState});
        store.transaction(()=>{
          let exercise=rules.create(),runId=store.startRun(exercise,0,{origin:'legacy',sourceHash,legacy:true}),revision=0;
          for(const record of records){
            const op=record.command.operation,actor=store.participant(runId,undefined,true),resultId=randomUUID();
            const beforeHash=digest(compact(exercise)),afterHash=digest(compact(record.state.exercise));
            const nextId=op.type==='action'?null:store.startRun(record.state.exercise,record.state.revision,{origin:'legacy',sourceHash,legacy:true});
            if(nextId)store.archive(runId,op.type==='new'?'new-exercise':'save-import',true);
            else store.checkpoint(runId,record.state.revision,record.state.exercise,null);
            store.run(`INSERT INTO command_results(id,run_id,participant_id,command_id,fingerprint,operation,received_at,committed_at,interface,status,reason_code,explanation,expected_revision,validated_revision,before_hash,after_hash,next_run_id,source)
              VALUES(?,?,?,?,?,?,NULL,NULL,'unknown',200,'legacy.accepted',?,?,?,?,?,?,'legacy-unknown')`,resultId,runId,actor.id,record.command.id,digest(record.command),JSON.stringify(op),op.type==='action'?record.state.exercise.events.at(-1)!.explanation:'Legacy exercise boundary',record.command.revision,revision,beforeHash,afterHash,nextId);
            if(op.type==='action')store.event(runId,'game.action',actor.id,resultId,record.state.revision,{event:record.state.exercise.events.at(-1),beforeHash,afterHash,cost:null},true);
            else store.event(runId,'run.replaced',actor.id,resultId,revision,{nextRunId:nextId},true);
            runId=nextId??runId;exercise=record.state.exercise;revision=record.state.revision;
          }
          const mapId=old.exercise.manifest.mapId,mapPath=join(directory,'maps',`${mapId.replaceAll('/','--')}.jsonl`),active=store.active(mapId)!;
          if(!existsSync(mapPath)&&active.revision===0){store.archive(active.run_id,'legacy-restored');store.run('UPDATE active_maps SET run_id=?,revision=? WHERE map_id=?',runId,revision,mapId);}
          else store.archive(runId,'legacy-history-preserved',true);
          store.run("INSERT OR REPLACE INTO migrations VALUES(?,?,?,?,'verified',?)",sourceHash,legacyPath,new Date().toISOString(),records.length,'Every legacy run and transition archived; missing identity/time/view fields remain unknown.');
        });
      }catch(error){
        store.run("INSERT OR REPLACE INTO migrations VALUES(?,?,?,0,'quarantined',?)",sourceHash,legacyPath,new Date().toISOString(),String(error).slice(0,500));
        throw new Error(`Legacy geographic journal needs recovery; original preserved at ${legacyPath}. ${String(error)}`);
      }
    }
  }
}
