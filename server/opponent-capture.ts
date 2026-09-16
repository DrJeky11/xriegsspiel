import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { CaptureStore, digest } from './capture-store.ts';
import type { OpponentCommand, RunView } from './opponent-session.ts';

/** Scenario data stays behind the scenario invitation boundary, including inside the shared database. */
export class OpponentCapture {
  private store:CaptureStore;
  readonly artifactHash:string;
  constructor(store:CaptureStore){
    this.store=store;
    const paths=[...readdirSync('src/opponent').filter(p=>p.endsWith('.ts')&&!['workspace.ts','layout.ts'].includes(p)).map(p=>'src/opponent/'+p),'src/scenario/navigation.ts','src/scenario/maps.ts','src/pacific/terrain.ts','src/centcom/terrain.ts','src/centcom/regions.ts','src/centcom/coastlines.json','public/terrain/pacific/regional-land.json','public/terrain/pacific/shoal-detail.json','public/terrain/pacific/senkaku-detail.json','scenarios/scoring.ts',...readdirSync('scenarios').filter(p=>p.endsWith('.json')).map(p=>'scenarios/'+p)];
    const artifact={schema:'opponent-artifact/1',sources:Object.fromEntries(paths.map(path=>[path,readFileSync(path,'utf8')]))};
    this.artifactHash=digest(artifact);store.run('INSERT OR IGNORE INTO opponent_artifacts VALUES(?,?)',this.artifactHash,JSON.stringify(artifact));
  }
  load(id:string){return this.store.one('SELECT data FROM opponent_states WHERE id=?',id)?.data as string|undefined;}
  persist(run:{id:string;branchId:string;revision:number},write?:()=>void,branch?:{id:string;branchId:string},expectedRevision?:number){
    this.store.transaction(()=>{
      const current=this.store.one('SELECT revision FROM opponent_states WHERE id=?',run.id);
      if(expectedRevision!==undefined&&current?.revision!==expectedRevision)throw new Error('Opponent database revision changed; reload the exercise.');
      if(branch){const prior=this.store.one('SELECT data FROM opponent_branches WHERE id=?',branch.branchId);if(prior&&prior.data!==JSON.stringify(branch))throw new Error('Archived scenario branch differs from its checkpoint.');this.store.run('INSERT OR IGNORE INTO opponent_branches VALUES(?,?,?)',branch.branchId,branch.id,JSON.stringify(branch));}
      this.store.run('INSERT INTO opponent_states VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,branch_id=excluded.branch_id,data=excluded.data',run.id,run.revision,run.branchId,JSON.stringify(run),this.artifactHash);
      write?.();
    });
  }
  observation(view:RunView,role:string){
    const data=JSON.stringify(view),id=digest({run:view.id,branch:view.branchId,role,data});
    this.store.run('INSERT OR IGNORE INTO opponent_views VALUES(?,?,?,?,?,?,?,NULL)',id,view.id,view.branchId,role,view.revision,data,new Date().toISOString());
    return id;
  }
  observationMatches(id:string|undefined,runId:string,role:string,revision:number){return !!id&&!!this.store.one('SELECT id FROM opponent_views WHERE id=? AND run_id=? AND role=? AND revision=?',id,runId,role,revision);}
  presented(id:string,runId:string,role:string){
    if(!this.store.one('SELECT id FROM opponent_views WHERE id=? AND run_id=? AND role=?',id,runId,role))throw new Error('Unknown historical scenario view.');
    this.store.run('UPDATE opponent_views SET presented_at=COALESCE(presented_at,?) WHERE id=?',new Date().toISOString(),id);
  }
  prior(runId:string,role:string,command:OpponentCommand){
    const row=this.store.one('SELECT * FROM opponent_decisions WHERE run_id=? AND role=? AND command_id=?',runId,role,command.id);
    if(row&&row.fingerprint!==digest(command))throw new Error('Command ID already belongs to a different request.');return row;
  }
  retry(id:string){this.store.run('UPDATE opponent_decisions SET retries=retries+1 WHERE id=?',id);}
  decision(before:RunView,role:string,command:OpponentCommand,status:'accepted'|'rejected',explanation:string,afterRevision:number,reasonCode:string,after?:RunView){
    const id=randomUUID();
    const observation=typeof command.observationId==='string'?this.store.one('SELECT id FROM opponent_views WHERE id=? AND run_id=? AND role=?',command.observationId,before.id,role):undefined;
    this.store.run('INSERT INTO opponent_decisions VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)',id,before.id,before.branchId,role,command.id,digest(command),JSON.stringify(command),command.revision,before.revision,status,reasonCode,explanation,observation?.id??null,JSON.stringify({schema:'scenario-decision-views/1',before,after:after??before}),afterRevision,new Date().toISOString());
    return id;
  }
  notes(runId:string,role:string,complete:boolean){return this.store.all('SELECT id,role,decision_id,kind,text,created_at FROM opponent_notes WHERE run_id=? AND (role=? OR ?=1) ORDER BY rowid',runId,role,complete?1:0);}
  note(runId:string,role:string,input:{id:string;decisionId?:string;kind:string;text:string}){
    if(!input||!/^[-a-f0-9]{36}$/.test(input.id)||!['reflection','assumption','assessment'].includes(input.kind)||typeof input.text!=='string'||!input.text.trim()||input.text.length>2000)throw new Error('Supply a valid note type and up to 2,000 characters.');
    if(input.decisionId&&!this.store.one('SELECT id FROM opponent_decisions WHERE id=? AND run_id=?',input.decisionId,runId))throw new Error('Unknown scenario decision.');
    const prior=this.store.one('SELECT * FROM opponent_notes WHERE id=?',input.id);
    if(prior){if(prior.run_id!==runId||prior.role!==role||prior.text!==input.text.trim()||prior.kind!==input.kind||prior.decision_id!==(input.decisionId??null))throw new Error('Note ID already used.');return input.id;}
    this.store.run('INSERT INTO opponent_notes VALUES(?,?,?,?,?,?,?)',input.id,runId,role,input.decisionId??null,input.kind,input.text.trim(),new Date().toISOString());return input.id;
  }
  learning(runId:string,role:string,complete:boolean){
    const rows=this.store.all('SELECT * FROM opponent_decisions WHERE run_id=? AND (role=? OR ?=1) ORDER BY rowid',runId,role,complete?1:0);
    const decisions=rows.map(row=>({id:row.id,branchId:row.branch_id,role:row.role,commandId:row.command_id,command:JSON.parse(row.command),expectedRevision:row.expected_revision,validatedRevision:row.validated_revision,status:row.status,reasonCode:row.reason_code,explanation:row.explanation,
      decisionView:row.observation_id?JSON.parse(this.store.one('SELECT data FROM opponent_views WHERE id=? AND run_id=? AND role=?',row.observation_id,runId,row.role)?.data??'null'):null,
      validationView:(JSON.parse(row.validation_view).before??JSON.parse(row.validation_view)) as RunView,
      resultView:(JSON.parse(row.validation_view).after??null) as RunView|null,resultRevision:row.result_revision,recordedAt:row.recorded_at,retries:row.retries}));
    const orders=decisions.filter(d=>d.command.operation.type==='orders'),rejected=orders.filter(d=>d.status==='rejected');
    const reasons:Record<string,number>={};for(const decision of rejected)reasons[decision.reasonCode]=(reasons[decision.reasonCode]??0)+1;
    const artifactHash=this.store.one('SELECT artifact_hash FROM opponent_states WHERE id=?',runId)?.artifact_hash;
    return {schema:'opponent-learning/1',metricVersion:'opponent-reports/1',scope:complete?'completed-exercise':'current-role-only',trainingPermission:'unspecified',decisions,notes:this.notes(runId,role,complete),
      archivedBranches:complete?this.store.all('SELECT data FROM opponent_branches WHERE run_id=?',runId).map(row=>{const b=JSON.parse(row.data);return {branchId:b.branchId,parent:b.parent,revision:b.revision,phase:b.phase,game:b.game,rounds:b.rounds,audit:b.audit,refereeModified:b.refereeModified};}):undefined,
      metrics:{submittedPlans:orders.length,acceptedPlans:orders.length-rejected.length,rejectedPlans:rejected.length,rejectionRate:orders.length?rejected.length/orders.length:null,retries:decisions.reduce((n,d)=>n+d.retries,0),missingDecisionViews:decisions.filter(d=>!d.decisionView).length,reasons},
      artifactHash,artifact:complete&&artifactHash?JSON.parse(this.store.one('SELECT data FROM opponent_artifacts WHERE hash=?',artifactHash)!.data):undefined};
  }
}
