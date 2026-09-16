import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMapSessions } from '../server/map-sessions.ts';
import { createScenarioSession, loadGeographicRules } from '../server/scenario-session.ts';
const rules=loadGeographicRules();
const aircraft=rules.catalog.pieces.find(p=>p.profileId==='rotary-wing'&&rules.eligibility(p.id,'blue',2026).allowed)!;
function directory(){return mkdtempSync(join(tmpdir(),'xr-map-sessions-'));}
test('every map independently retains placement, movement, budget and history after restart',()=>{
  const dir=directory();try{
    const sessions=createMapSessions(rules,dir),expected=new Map();assert.equal(sessions.size,6);
    for(const [id,session] of sessions){
      assert.equal(session.getState().exercise.pieces.length,0);
      const map=rules.map(id),tile=map.cells[Math.floor(map.cells.length/2)];
      const place={id:'same-id-is-scoped-to-map',revision:0,operation:{type:'action',action:{type:'deploy',id:'plane',definitionId:aircraft.id,force:'blue',tileId:tile.id}}};
      assert.equal(session.submit(place).status,200);assert.equal(session.submit(place).body.duplicate,true);
      const destination=[...rules.reachable(session.getState().exercise,'plane')].find(([,route])=>route.cost===1)![0];
      assert.equal(session.submit({id:'move',revision:1,operation:{type:'action',action:{type:'move',pieceId:'plane',tileId:destination}}}).status,200);
      assert.equal(session.getState().exercise.pieces[0].movement,7);
      expected.set(id,session.getState());
    }
    const reopened=createMapSessions(rules,dir);
    for(const [id,session] of reopened)assert.deepEqual(session.getState(),expected.get(id));
    const hormuz=reopened.get('hormuz')!,before=reopened.get('bab-al-mandeb')!.getState();
    assert.equal(hormuz.submit({id:'reset',revision:2,operation:{type:'new',setup:{mapId:'hormuz',year:1980,demo:false}}}).status,200);
    assert.equal(hormuz.getState().exercise.pieces.length,0);assert.deepEqual(reopened.get('bab-al-mandeb')!.getState(),before);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('foreign-map setups, actions and imports cannot overwrite another map, even with matching revisions',()=>{
  const dir=directory();try{
    const sessions=createMapSessions(rules,dir),target=sessions.get('hormuz')!,before=target.getState();
    const foreign=rules.create({mapId:'bab-al-mandeb',year:2026,demo:true});
    for(const operation of [{type:'new',setup:foreign.setup},{type:'import',save:rules.export(foreign)},{type:'action',action:{type:'deploy',id:'foreign',definitionId:aircraft.id,force:'blue',tileId:rules.map('bab-al-mandeb').cells[0].id}}]){
      assert.equal(target.submit({id:JSON.stringify(operation).slice(0,80),revision:0,operation}).status,422);assert.deepEqual(target.getState(),before);
    }
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('existing geographic exercise migrates exactly once without modifying the original journal',()=>{
  const dir=directory();try{
    const path=join(dir,'geographic-session.jsonl'),legacy=createScenarioSession(rules,path);
    assert.equal(legacy.submit({id:'turn',revision:0,operation:{type:'action',action:{type:'advance'}}}).status,200);
    const bytes=readFileSync(path),expected=legacy.getState().exercise;
    const sessions=createMapSessions(rules,dir),migrated=sessions.get(expected.manifest.mapId)!;
    assert.deepEqual(migrated.getState().exercise,expected);assert.deepEqual(readFileSync(path),bytes);
    assert.equal(migrated.submit({id:'another-turn',revision:1,operation:{type:'action',action:{type:'advance'}}}).status,200);
    const reopened=createMapSessions(rules,dir).get(expected.manifest.mapId)!;
    assert.deepEqual(reopened.getState(),migrated.getState());assert.equal(reopened.getState().exercise.turn,3);assert.deepEqual(readFileSync(path),bytes);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
