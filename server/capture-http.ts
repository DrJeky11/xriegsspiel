import type { IncomingMessage, ServerResponse } from 'node:http';
import { digest, type CaptureStore } from './capture-store.ts';
import type { CaptureContext, InterfaceMode } from '../src/capture/types.ts';
import { queryCapture } from './capture-query.ts';
const modes = new Set(['browser','vr','mr','script','unknown']);
export function captureContext(req:IncomingMessage,res:ServerResponse,store:CaptureStore):CaptureContext {
  // Cookies share a host across ports. Keep independent local databases from
  // replacing one another's seat, while retaining valid legacy/restored seats.
  const name='xr-seat-'+digest(store.path).slice(0,16);
  const cookies=new Map((req.headers.cookie??'').split(';').map(s=>{const [key,...value]=s.trim().split('=');return [key,value.join('=')];}));
  let token=cookies.get(name),principalId=store.authenticate(token);
  if(!principalId){
    for(const [key,value] of cookies){
      if(key!=='xr-seat'&&!/^xr-seat-[a-f0-9]{16}$/.test(key))continue;
      const existing=store.authenticate(value);if(existing){token=value;principalId=existing;break;}
    }
    if(!principalId){const joined=store.join();principalId=joined.principalId;token=joined.token;}
    res.setHeader('Set-Cookie',`${name}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=2592000`);
  }
  const mode=String(req.headers['x-xr-interface']??'browser');
  return {principalId,interface:(modes.has(mode)?mode:'unknown') as InterfaceMode};
}
export async function readCaptureJson(req:IncomingMessage,max=64000){let body='';for await(const chunk of req){body+=chunk;if(body.length>max)throw new Error('Capture request is too large.');}return JSON.parse(body);}
function send(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));}
function download(res:ServerResponse,name:string,type:string,body:string){res.writeHead(200,{'Content-Type':type,'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'no-store'});res.end(body);}
export async function handleCapture(req:IncomingMessage,res:ServerResponse,url:URL,store:CaptureStore,notifyMap:(mapId:string)=>void=()=>{}){
  if(!url.pathname.startsWith('/api/capture/'))return false;
  if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`){send(res,403,{error:'Origin rejected.'});return true;}
  try{
    const context=captureContext(req,res,store),route=url.pathname.slice('/api/capture/'.length),runId=url.searchParams.get('run')??'';
    if(req.method==='GET'){
      if(route==='runs'){send(res,200,{runs:store.listRuns(),capture:'durable',scope:'Trusted local exercise participants share this archive. Private notes remain author-only.'});return true;}
      if(route==='review'){send(res,200,store.review(runId,context.principalId));return true;}
      if(route==='state'){
        const revision=url.searchParams.has('revision')?Number(url.searchParams.get('revision')):undefined;
        if(revision!==undefined&&(!Number.isSafeInteger(revision)||revision<0))throw new Error('Invalid checkpoint.');
        send(res,200,store.exercise(runId,revision));return true;
      }
      if(route==='checkpoint'){
        const hash=url.searchParams.get('hash')??'';
        const allowed=store.one('SELECT 1 FROM checkpoints WHERE run_id=? AND state_hash=? UNION SELECT 1 FROM command_results WHERE run_id=? AND (before_hash=? OR after_hash=?) LIMIT 1',runId,hash,runId,hash,hash);
        if(!allowed)throw new Error('Checkpoint does not belong to this exercise.');send(res,200,store.state(hash));return true;
      }
      if(route==='content'){
        const run=store.one('SELECT * FROM runs WHERE id=?',runId);if(!run)throw new Error('Unknown exercise.');
        const artifact=JSON.parse(store.one('SELECT data FROM artifacts WHERE hash=?',run.artifact_hash)!.data);
        send(res,200,{map:artifact.maps.find((m:{id:string})=>m.id===run.map_id),pieces:artifact.catalog.pieces.map((p:{id:string;name:string;profileId:string;loadSlots:number})=>({id:p.id,name:p.name,profileId:p.profileId,loadSlots:p.loadSlots})),profiles:artifact.profiles.profiles});return true;
      }
      if(route==='reports'||route==='csv'){
        const filter={mapId:url.searchParams.get('map')??undefined,runIds:url.searchParams.getAll('run'),includeLegacy:url.searchParams.get('legacy')==='true'};
        const result=await queryCapture(store.path,{type:route==='csv'?'csv':'reports',filter});
        if(route==='csv')download(res,'xriegsspiel-exercise-report.csv','text/csv; charset=utf-8',result);else send(res,200,result);return true;
      }
      if(route==='export'){
        const result=await queryCapture(store.path,{type:'export',runId,principalId:context.principalId});
        if(url.searchParams.get('format')==='jsonl'){
          const lines=[{type:'manifest',schema:result.schema,run:result.review.run,purpose:result.purpose,trainingPermission:result.trainingPermission,artifactDigest:result.artifactDigest,exportedAt:result.exportedAt,participants:result.review.participants,checkpoints:result.review.checkpoints},
            {type:'content',artifact:result.artifact},...Object.entries(result.states).map(([hash,state])=>({type:'state',hash,state})),
            ...result.review.commands.map((record:unknown)=>({type:'command',record})),...result.review.observations.map((record:unknown)=>({type:'observation',record})),
            ...result.review.annotations.map((record:unknown)=>({type:'annotation',record})),{type:'initial-history',events:result.review.initialEvents},...result.events.map((record:unknown)=>({type:'event',record})),...result.telemetry.map((record:unknown)=>({type:'telemetry',record}))];
          download(res,`exercise-${runId}.jsonl`,'application/x-ndjson',lines.map(v=>JSON.stringify(v)).join('\n')+'\n');
        }else download(res,`exercise-${runId}.json`,'application/json',JSON.stringify(result));return true;
      }
    }
    if(req.method==='POST'){
      const input=await readCaptureJson(req);
      if(route==='join'){send(res,200,{joined:true});return true;}
      if(route==='presented'){store.presented(input.observationId,context,typeof input.clientTime==='string'?input.clientTime:null);send(res,200,{recorded:true});return true;}
      if(route==='telemetry'){store.telemetry(input.runId,context,input.events);send(res,200,{recorded:true});return true;}
      if(route==='note'){const id=store.annotate(input.runId,context,input);send(res,201,{id});return true;}
      if(route==='finish'){
        if(typeof input.mapId!=='string'||typeof input.runId!=='string'||!Number.isSafeInteger(input.revision))throw new Error('Supply the current map, run and revision.');
        store.transaction(()=>{const active=store.active(input.mapId);if(!active||active.run_id!==input.runId||active.revision!==input.revision)throw new Error('The exercise changed. Refresh before finishing it.');
          const row=store.one('SELECT status FROM runs WHERE id=?',input.runId)!;if(row.status==='archived')return;
          const actor=store.participant(input.runId,context);store.archive(input.runId,'finished-by-participant');store.event(input.runId,'run.finished',actor.id,null,input.revision,{reason:'finished-by-participant'});});
        send(res,200,{archived:true,runId:input.runId});notifyMap(input.mapId);return true;
      }
      if(route==='details'){
        if(typeof input.runId!=='string'||typeof input.label!=='string'||!input.label.trim()||input.label.length>120||typeof input.objective!=='string'||input.objective.length>1000)throw new Error('Supply an exercise title and a short learning objective.');
        store.transaction(()=>{if(!store.one('SELECT id FROM runs WHERE id=?',input.runId))throw new Error('Unknown exercise.');
          const actor=store.participant(input.runId,context);store.run('UPDATE runs SET label=?,objective=? WHERE id=?',input.label.trim(),input.objective.trim(),input.runId);
          store.event(input.runId,'exercise.details',actor.id,null,null,{label:input.label.trim(),objective:input.objective.trim()});});send(res,200,{saved:true});return true;
      }
    }
    send(res,404,{error:'Unknown capture endpoint.'});
  }catch(error){send(res,400,{error:error instanceof Error?error.message:'Capture request failed.'});}
  return true;
}
