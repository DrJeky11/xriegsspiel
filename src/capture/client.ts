import type { ScenarioState } from '../../server/scenario-session.ts';
import type { InterfaceMode } from './types.ts';

type Telemetry={id:string;type:string;clientTime:string;data:Record<string,unknown>};
/** Bounded semantic telemetry. Its availability never determines whether an order commits. */
export class CaptureClient {
  private queue:{runId:string;mode:InterfaceMode;event:Telemetry}[]=[];
  private dropped=new Map<string,{mode:InterfaceMode;count:number;pending?:Telemetry}>();
  private flushing=false;
  private presentedId='';
  private readyRuns=new Set<string>();
  private activeRun='';
  private mode:()=>InterfaceMode;
  constructor(mode:()=>InterfaceMode){this.mode=mode;setInterval(()=>void this.flush(),4000);window.addEventListener('pagehide',()=>void this.flush());}
  headers(){return {'Content-Type':'application/json','x-xr-interface':this.mode()};}
  async join(){const response=await fetch('/api/capture/join',{method:'POST',headers:this.headers(),body:'{}'});if(!response.ok)throw new Error('Unable to join exercise capture.');}
  presented(state:ScenarioState){
    this.activeRun=state.runId??'';
    if(state.observationId&&state.observationId!==this.presentedId){this.presentedId=state.observationId;
      void fetch('/api/capture/presented',{method:'POST',headers:this.headers(),body:JSON.stringify({observationId:state.observationId,clientTime:new Date().toISOString()})}).catch(()=>{});
    }
    if(this.activeRun&&!this.readyRuns.has(this.activeRun)){this.readyRuns.add(this.activeRun);this.event('ready');void this.flush();}
  }
  event(type:string,data:Record<string,unknown>={}){
    if(!this.activeRun)return;
    if(this.queue.length>=150){const removed=this.queue.shift()!,loss=this.dropped.get(removed.runId)??{mode:removed.mode,count:0};loss.count++;this.dropped.set(removed.runId,loss);}
    this.queue.push({runId:this.activeRun,mode:this.mode(),event:{id:crypto.randomUUID(),type,clientTime:new Date().toISOString(),data}});
  }
  async flush(){
    if(this.flushing||(!this.queue.length&&!this.dropped.size))return;this.flushing=true;
    const lossRun=this.dropped.keys().next().value as string|undefined;
    const first=lossRun?{runId:lossRun,mode:this.dropped.get(lossRun)!.mode}:this.queue[0];
    const selected=this.queue.filter(x=>x.runId===first.runId&&x.mode===first.mode).slice(0,49),loss=this.dropped.get(first.runId);
    const events=selected.map(x=>x.event);
    if(loss){loss.pending??={id:crypto.randomUUID(),type:'dropped',clientTime:new Date().toISOString(),data:{count:loss.count}};events.push(loss.pending);}
    try{
      const response=await fetch('/api/capture/telemetry',{method:'POST',keepalive:true,headers:{'Content-Type':'application/json','x-xr-interface':first.mode},body:JSON.stringify({runId:first.runId,events})});
      if(response.ok){const ids=new Set(selected.map(x=>x.event.id));this.queue=this.queue.filter(x=>!ids.has(x.event.id));if(loss){loss.count-=Number(loss.pending!.data.count);loss.pending=undefined;if(!loss.count)this.dropped.delete(first.runId);}}
    }catch{}finally{this.flushing=false;}
  }
}
