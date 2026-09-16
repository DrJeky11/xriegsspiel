import { Worker } from 'node:worker_threads';
import type { ReportFilter } from './capture-reports.ts';
type Query={type:'reports'|'csv';filter:ReportFilter}|{type:'export';runId:string;principalId:string};
let running=0;
export function queryCapture(path:string,query:Query):Promise<any>{
  if(running>=4)return Promise.reject(new Error('Four archive queries are already running. Try again shortly.'));
  running++;
  return new Promise((resolve,reject)=>{
    const worker=new Worker(new URL('./capture-query-worker.ts',import.meta.url),{workerData:{path,query}});
    let settled=false;
    const finish=(error:Error|null,value?:unknown)=>{if(settled)return;settled=true;running--;clearTimeout(timer);void worker.terminate();error?reject(error):resolve(value);};
    const timer=setTimeout(()=>finish(new Error('Archive query exceeded 30 seconds. Narrow the exercise selection.')),30000);
    worker.once('message',m=>finish(m.error?new Error(m.error):null,m.result));worker.once('error',e=>finish(e));
    worker.once('exit',code=>{if(!settled)finish(new Error(`Archive worker exited before returning a result (${code}).`));});
  });
}
