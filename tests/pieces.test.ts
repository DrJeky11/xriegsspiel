import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PieceLab, validateCatalog, replayLaboratory } from '../src/pieces.ts';
import type { PieceCatalog, PieceRules, LabBoard, LabAction, LabJournal } from '../src/pieces.ts';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../catalog/${name}.json`, import.meta.url), 'utf8'));
const catalog: PieceCatalog = read('pieces'), rules: PieceRules = read('rules');
const equipment = read('equipment').equipment as { id: string }[];
const lab = new PieceLab(catalog, rules);
const id = (raw: string) => `piece-${raw}`;
const tank = id('318957732468f616f5ad6c99ddeeaa0f');
const truck = id('3c4961032708c2085408131221d8974d');
const rifle = id('07b39d5ec0cf5104f02f94ee5eda4d9b');
const redRifle = id('425eca2874c3d094a8c468bbf3d0c916');
const landing = id('50a1c55ba8e3b58d837ecf278760ece6');
const redTank = id('b5fb02473e4ecb7afe98d40264f66a3f');
const board: LabBoard = { width: 5, height: 3, cells: ['road','road','road','plain','water', 'plain','forest','ridge','plain','water', 'plain','plain','plain','plain','water'] };

test('every imported equipment record has a valid definition and every eligible definition can deploy', () => {
  assert.equal(catalog.pieces.length, 1607);
  assert.deepEqual(new Set(catalog.pieces.map(p => p.equipmentId)), new Set(equipment.map(e => e.id)));
  const sample: LabBoard = { width: 2, height: 1, cells: ['plain','water'] };
  let count = 0, blocked = 0;
  for (const p of catalog.pieces) for (const m of p.forceEvidence) {
    const eligible = lab.eligibility(p.id, m.force, 2026);
    if (!eligible.allowed) { blocked++; continue; }
    const profile = lab.profiles.get(p.profileId)!;
    const cell = profile.costs.plain === null ? 1 : 0;
    const state = lab.deploy(lab.create(sample), p.id, m.force, cell, 'test');
    assert.equal(state.pieces[0].movement, profile.movement);
    count++;
  }
  assert.ok(count > 1400); assert.ok(blocked > 50);
});
test('origin-only, unknown dates and future variants cannot bypass lab eligibility', () => {
  assert.equal(lab.eligibility(tank,'blue',1991).allowed,false);
  assert.equal(lab.eligibility(tank,'blue',1992).allowed,true);
  assert.equal(lab.eligibility(tank,'red',2026).allowed,false);
  assert.equal(lab.eligibility(tank,'blue',NaN).allowed,false);
  const originOnly = catalog.pieces.find(p => p.forceEvidence.some(e => e.basis !== 'odin-operator-filter'))!;
  const membership = originOnly.forceEvidence.find(e => e.basis !== 'odin-operator-filter')!;
  assert.equal(lab.eligibility(originOnly.id,membership.force,2026).allowed,false);
  for (const p of catalog.pieces.filter(p => p.eraEvidence.reportedYear === null))
    assert.equal(lab.eligibility(p.id,p.forceEvidence[0].force,2026).allowed,false);
  assert.throws(() => lab.create(board,1979), /1980/);
});
test('routes obey costs, adjacency, occupied layers and budget; previews are pure', () => {
  let s = lab.deploy(lab.create(board),tank,'blue',0,'tank');
  s = lab.deploy(s,truck,'blue',2,'truck');
  const before = structuredClone(s);
  for (const [cell, route] of lab.reachable(s,'tank')) {
    assert.equal(route.cost, route.path.slice(1).reduce((sum,c) => sum + lab.profiles.get('tracked')!.costs[board.cells[c]]!,0));
    assert.ok(route.cost <= 4); assert.notEqual(cell,2);
    assert.notEqual(board.cells[cell],'water');
    for (let i=1;i<route.path.length;i++) {
      const a = route.path[i-1], b = route.path[i];
      assert.equal(Math.abs(a%5-b%5)+Math.abs(Math.floor(a/5)-Math.floor(b/5)),1);
    }
  }
  const action: LabAction = { type:'move',pieceId:'tank',to:6 };
  assert.equal(lab.evaluate(s,action).cost,3);
  assert.deepEqual(s,before);
  assert.equal(lab.apply(s,action).pieces[0].movement,1);
  assert.throws(() => lab.apply(s,{type:'move',pieceId:'tank',to:4}),/legal route/);
});
test('loading, moving and unloading conserve exact item identities and replay deterministically', () => {
  let initial = lab.deploy(lab.create(board),truck,'blue',0,'truck');
  initial = lab.deploy(initial,rifle,'blue',0,'rifle');
  const actions: LabAction[] = [
    {type:'load',pieceId:'rifle',carrierId:'truck'},
    {type:'move',pieceId:'truck',to:2},
    {type:'unload',pieceId:'rifle',to:3},
    {type:'advance'},
  ];
  let s = initial;
  for (const a of actions) {
    s = lab.apply(s,a);
    assert.deepEqual(s.pieces.map(p => p.id),['truck','rifle']);
    assert.ok(s.pieces.every(p => (p.cell === null) === (p.carrierId !== null)));
    assert.ok(s.pieces.every(p => p.movement >= 0));
  }
  assert.equal(s.pieces[1].cell,3); assert.equal(lab.cargoUsed(s,'truck'),0);
  let replay = initial;
  for (const event of s.events) replay = lab.apply(replay,event.action);
  assert.deepEqual(replay,s);
  assert.equal(initial.pieces[1].carrierId,null);
});
test('capacity, duplicate loading, force restrictions and carried movement are enforced', () => {
  let s = lab.deploy(lab.create(board),truck,'blue',0,'truck');
  s = lab.deploy(s,redRifle,'red',0,'red');
  assert.equal(lab.evaluate(s,{type:'load',pieceId:'red',carrierId:'truck'}).allowed,false);
  for(let i=0;i<9;i++) s = lab.deploy(s,rifle,'blue',0,`r${i}`);
  for(let i=0;i<8;i++) {
    s = lab.apply(s,{type:'advance'});
    s = lab.apply(s,{type:'load',pieceId:`r${i}`,carrierId:'truck'});
  }
  assert.equal(lab.cargoUsed(s,'truck'),8);
  assert.equal(lab.evaluate(s,{type:'load',pieceId:'r8',carrierId:'truck'}).allowed,false);
  assert.equal(lab.evaluate(s,{type:'load',pieceId:'r0',carrierId:'truck'}).allowed,false);
  assert.equal(lab.evaluate(s,{type:'move',pieceId:'r0',to:1}).allowed,false);
  assert.equal(lab.evaluate(s,{type:'unload',pieceId:'r0',to:4}).allowed,false);
});
test('landing craft stay at the shoreline and can deliver a ground platform', () => {
  let s = lab.deploy(lab.create(board),landing,'red',4,'craft');
  s = lab.deploy(s,redTank,'red',3,'tank');
  s = lab.apply(s,{type:'load',pieceId:'tank',carrierId:'craft'});
  assert.equal(lab.cargoUsed(s,'craft'),4);
  s = lab.apply(s,{type:'move',pieceId:'craft',to:9});
  s = lab.apply(s,{type:'unload',pieceId:'tank',to:8});
  assert.equal(s.pieces[1].movement,0);
  assert.equal(lab.reachable(s,'craft').has(7),false);
  assert.throws(() => lab.deploy(lab.create(board),landing,'red',0,'bad'), /terrain/);
});
test('catalog validation and saved versions reject incompatible or corrupt definitions', () => {
  const invalid = structuredClone(catalog); invalid.pieces[0].profileId = 'missing';
  assert.throws(() => validateCatalog(invalid,rules),/Invalid piece/);
  const s = lab.create(board); s.rulesVersion = 'future';
  assert.throws(() => lab.apply(s,{type:'advance'}),/version mismatch/);
});

test('a complete journal replays deployments interleaved with actions', () => {
  const journal:LabJournal = { catalogVersion:catalog.version,rulesVersion:rules.version,board,year:2026,records:[
    {type:'deploy',definitionId:truck,force:'blue',cell:0,id:'truck'},
    {type:'action',action:{type:'move',pieceId:'truck',to:1}},
    {type:'deploy',definitionId:rifle,force:'blue',cell:1,id:'rifle'},
    {type:'action',action:{type:'load',pieceId:'rifle',carrierId:'truck'}},
  ]};
  const state = replayLaboratory(lab,JSON.parse(JSON.stringify(journal)));
  assert.equal(state.pieces[0].cell,1); assert.equal(state.pieces[1].carrierId,'truck');
  assert.equal(state.pieces[0].movement,4);
  assert.deepEqual(replayLaboratory(lab,journal),state);
  assert.throws(()=>replayLaboratory(lab,{...journal,catalogVersion:'wrong'}),/version mismatch/);
});

test('engineering vehicles and EW aircraft are not loose inventory', () => {
  assert.equal(catalog.pieces.find(p=>p.name.startsWith('Bobcat S650'))!.kind,'platform');
  assert.equal(catalog.pieces.find(p=>p.name.startsWith('J-16D '))!.profileId,'fixed-wing');
});
