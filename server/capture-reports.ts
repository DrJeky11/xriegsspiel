import type { CaptureStore } from './capture-store.ts';
import { digest } from './capture-store.ts';
import type { CapturedCommand } from '../src/capture/types.ts';
import type { Action } from '../src/scenario/rules.ts';

export interface ReportFilter { mapId?: string; runIds?: string[]; includeLegacy?: boolean }
export function captureReports(store: CaptureStore, filter: ReportFilter = {}) {
  const selected = store.listRuns().filter(r => (!filter.mapId || r.mapId === filter.mapId) && (!filter.runIds?.length || filter.runIds.includes(r.id)));
  const rows = selected.map(run => {
    const all = store.commands(run.id);
    const decisions = all.filter(c => (c.operation as {type:string}).type === 'action');
    const live = decisions.filter(c=>c.source!=='legacy-unknown');
    const measured = filter.includeLegacy ? decisions : live;
    const accepted = measured.filter(c=>c.status===200), rejected = measured.filter(c=>c.status!==200);
    const reasons: Record<string,number> = {};
    for(const c of rejected) reasons[c.reasonCode]=(reasons[c.reasonCode]??0)+1;
    const telemetry=store.all('SELECT * FROM telemetry WHERE run_id=? ORDER BY rowid',run.id);
    const eventCounts:Record<string,number>={};const displayedRestrictions:Record<string,number>={};let dropped=0;
    for(const t of telemetry){eventCounts[t.type]=(eventCounts[t.type]??0)+1;const payload=JSON.parse(t.payload);if(t.type==='dropped')dropped+=payload.count??0;if(t.type==='restriction'){const code=payload.reasonCode??'unknown';displayedRestrictions[code]=(displayedRestrictions[code]??0)+1;}}
    const participants=store.all('SELECT id,label,kind FROM participants WHERE run_id=?',run.id).map(p=>{
      const submitted=measured.filter(c=>c.participantId===p.id), successful=submitted.filter(c=>c.status===200);
      const ready=telemetry.find(t=>t.participant_id===p.id&&t.type==='ready')?.server_time??null;
      const first=successful.find(c=>c.committedAt)?.committedAt??null;
      const firstOrderMs=ready&&first&&Date.parse(first)>=Date.parse(ready)?Date.parse(first)-Date.parse(ready):null;
      const intervals:number[]=[];
      for(let i=1;i<successful.length;i++){const a=successful[i-1].committedAt,b=successful[i].committedAt;if(a&&b)intervals.push(Date.parse(b)-Date.parse(a));}
      return {id:p.id as string,label:p.label as string,kind:p.kind as string,submitted:submitted.length,accepted:successful.length,firstOrderMs,
        meanOrderIntervalMs:intervals.length?intervals.reduce((a,b)=>a+b,0)/intervals.length:null,
        interfaces:[...new Set(submitted.map(c=>c.interface))],disconnects:telemetry.filter(t=>t.participant_id===p.id&&t.type==='disconnect').length};
    });
    const artifact=JSON.parse(store.one('SELECT data FROM artifacts WHERE hash=?',run.artifactHash)!.data);
    const definitions=new Map<string,{profileId:string;loadSlots:number}>(artifact.catalog.pieces.map((p:{id:string})=>[p.id,p]));
    const profiles=new Map<string,{cargoSlots:number}>(artifact.profiles.profiles.map((p:{id:string})=>[p.id,p]));
    const snapshots=new Map<number,{revision:number;turn:number;movementRemaining:number;cargoSlots:number;usedSlots:number;pieceCount:number}>();
    for(const checkpoint of store.all('SELECT * FROM checkpoints WHERE run_id=? ORDER BY revision',run.id)) {
      const state=store.state(checkpoint.state_hash);
      const deployed=state.pieces.filter(p=>!p.carrierId);
      snapshots.set(state.turn,{revision:checkpoint.revision,turn:state.turn,movementRemaining:deployed.reduce((n,p)=>n+p.movement,0),
        cargoSlots:deployed.reduce((n,p)=>n+(profiles.get(definitions.get(p.definitionId)?.profileId??'')?.cargoSlots??0),0),
        usedSlots:state.pieces.filter(p=>p.carrierId).reduce((n,p)=>n+(definitions.get(p.definitionId)?.loadSlots??0),0),pieceCount:state.pieces.length});
    }
    const turns=[...snapshots.values()].map(t=>{
      const commands=accepted.filter(c=>store.state(c.beforeHash).turn===t.turn);
      const count=(type:string)=>commands.filter(c=>(c.operation as {action:Action}).action.type===type).length;
      return {...t,movementCost:commands.reduce((n,c)=>n+(c.guidance?.cost??0),0),loads:count('load'),unloads:count('unload'),moves:count('move'),
        utilization:t.cargoSlots?t.usedSlots/t.cargoSlots:null};
    });
    const unknownViews=measured.filter(c=>!c.observationId).length;
    const presented=store.one('SELECT COUNT(*) n FROM observations WHERE run_id=? AND presented_at IS NOT NULL',run.id)!.n as number;
    const sources=[...new Set(measured.map(c=>c.source))].sort();
    const eligible=live.length>0&&run.origin==='live';
    const initial=store.one('SELECT state_hash FROM checkpoints WHERE run_id=? ORDER BY revision LIMIT 1',run.id)!.state_hash;
    return {run,compatibilityKey:digest({manifest:run.manifest,artifact:run.artifactHash,initial,objective:run.objective,status:run.status,sources}),sources,eligible,
      exclusion:eligible?null:!live.length?'No newly captured decisions':'Inherited or legacy starting history; shown separately',
      submitted:measured.length,accepted:accepted.length,rejected:rejected.length,rejectionRate:measured.length?rejected.length/measured.length:null,
      retries:measured.reduce((n,c)=>n+c.retries,0),legacyDecisions:decisions.length-live.length,reasons,displayedRestrictions,
      eventCounts,droppedTelemetry:dropped,unknownViews,presentedObservations:presented,participants,turns,
      decisionIds:measured.map(c=>c.id),assessments:store.one("SELECT COUNT(*) n FROM annotations WHERE run_id=? AND kind='assessment' AND audience='exercise'",run.id)!.n as number};
  });
  const groups=new Map<string,{key:string;mapId:string;runIds:string[];runs:number;submitted:number;rejected:number;accepted:number}>();
  for(const r of rows.filter(r=>r.eligible)){
    const g=groups.get(r.compatibilityKey)??{key:r.compatibilityKey,mapId:r.run.mapId,runIds:[],runs:0,submitted:0,rejected:0,accepted:0};
    g.runIds.push(r.run.id);g.runs++;g.submitted+=r.submitted;g.rejected+=r.rejected;g.accepted+=r.accepted;groups.set(g.key,g);
  }
  return {metricVersion:'exercise-reports/1',generatedAt:new Date().toISOString(),filter,rows,
    groups:[...groups.values()].map(g=>({...g,rejectionRate:g.submitted?g.rejected/g.submitted:null})),
    definitions:{denominator:'Unique submitted game-action commands. Retries and new/import operations are separate.',
      pacing:'Elapsed server time from receipt of the client ready event to the first accepted order. Missing or late ready events yield no timing.',
      intervals:'Wall time between accepted orders; includes unobserved pauses and is not measured thinking time.',
      resources:'Authored movement points and cargo slots at the last captured state of each turn; cargo transfers are not mission deliveries.',
      quality:'Client telemetry may be incomplete. No help event is not proof of no help. Run-scoped pseudonyms do not establish longitudinal learner identity.',
      grouping:'Map/content/build, initial state, stated objective, run status and actor-source conditions define comparison groups. Imported and legacy starting histories are excluded from pooled rates. Assistance use is shown per run; uncaptured help remains unknown.'}};
}
export function reportCsv(report: ReturnType<typeof captureReports>) {
  const escape=(v:unknown)=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+@-]/,"'$&")+'"';
  const header=['metric_version','run_id','map','status','origin','comparison_group','included_in_group','submitted','accepted','rejected','rejection_rate','retries','unknown_decision_views','dropped_telemetry'];
  return [header,...report.rows.map(r=>[report.metricVersion,r.run.id,r.run.mapId,r.run.status,r.run.origin,r.compatibilityKey,r.eligible,r.submitted,r.accepted,r.rejected,r.rejectionRate,r.retries,r.unknownViews,r.droppedTelemetry])].map(row=>row.map(escape).join(',')).join('\r\n')+'\r\n';
}
