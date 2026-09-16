#!/usr/bin/env node
import { resolve, join } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import { CaptureStore } from '../server/capture-store.ts';
import { verifyCaptureRun, verifyOpponentCapture } from '../server/capture-verify.ts';
async function verifyDatabase(store){
  store.db.exec('BEGIN');
  try{
    if(store.one('PRAGMA integrity_check')?.integrity_check!=='ok'||store.all('PRAGMA foreign_key_check').length)throw new Error('Database integrity check failed.');
    const result={integrity:'ok',runs:store.listRuns().map(run=>verifyCaptureRun(store,run.id)),scenarios:await verifyOpponentCapture(store)};
    store.db.exec('COMMIT');return result;
  }catch(error){if(store.db.isTransaction)store.db.exec('ROLLBACK');throw error;}
}
const [command,...args]=process.argv.slice(2),options=Object.fromEntries(args.map(arg=>{const i=arg.indexOf('=');return[arg.slice(0,i).replace(/^--/,''),arg.slice(i+1)];}));
if(!['verify','backup','restore'].includes(command)){
  console.log('Usage: node scripts/capture-db.mjs verify --data=DIR\n       node scripts/capture-db.mjs backup --data=DIR --output=FILE\n       node scripts/capture-db.mjs restore --input=FILE --data=NEW_EMPTY_DIR');process.exitCode=1;
}else{
  const directory=resolve(options.data??process.env.DATA_DIR??'data'),path=join(directory,'exercises.sqlite');
  if(command==='restore'){
    if(!options.input)throw new Error('Supply --input=backup.sqlite');
    if(existsSync(directory))throw new Error('Restore requires a new directory, so it cannot overwrite a running exercise database.');
    const source=new CaptureStore(resolve(options.input));
    // Snapshot through SQLite: a valid input may still have committed pages in its WAL.
    try{mkdirSync(directory,{recursive:true});source.backup(path);}finally{source.close();}
    const restored=new CaptureStore(path);try{await verifyDatabase(restored);}finally{restored.close();}
    console.log(JSON.stringify({restored:path,next:'Start the server with DATA_DIR set to this directory.'}));
  }else{
    const store=new CaptureStore(path);
    try{
      if(command==='backup'){if(!options.output)throw new Error('Supply --output=backup.sqlite');console.log(JSON.stringify(store.backup(resolve(options.output))));}
      else{
        console.log(JSON.stringify(await verifyDatabase(store)));
      }
    }finally{store.close();}
  }
}
