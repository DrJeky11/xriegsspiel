import { parentPort, workerData } from 'node:worker_threads';
import { CaptureStore } from './capture-store.ts';
import { captureReports, reportCsv } from './capture-reports.ts';
const store = new CaptureStore(workerData.path);
try {
  store.db.exec('BEGIN');
  const q=workerData.query;
  const result=q.type==='reports' ? captureReports(store,q.filter) : q.type==='csv' ? reportCsv(captureReports(store,q.filter)) : store.exportRun(q.runId,q.principalId);
  store.db.exec('COMMIT');parentPort!.postMessage({result});
}catch(error){parentPort!.postMessage({error:error instanceof Error?error.message:'Capture query failed.'});}
finally{store.close();}
