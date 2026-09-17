import './workspace.css';
import { loading } from '../loading.ts';
import { CaptureClient } from '../capture/client.ts';
import type { WebXRManager } from 'three';
import { initOpponentWorkspace } from '../opponent/workspace.ts';
import { unitVisual, UNIT_GROUPS, miniatureThumbnail } from './miniatures.ts';
import type { Domain, UnitVisual } from './miniatures.ts';
import { GrabTransaction } from './grab-transaction.ts';
import type { GrabBindings } from './spatial-palette.ts';
import { GeographicRules, DEMO, symbol } from '../scenario/rules.ts';
import type { Action, Preview, Setup } from '../scenario/rules.ts';
import { neighbors } from '../pacific/terrain.ts';
import { scenarioMaps } from '../scenario/maps.ts';
import type { Geography, Cell, TerrainMap } from '../pacific/terrain.ts';
import { SURFACES } from '../pacific/terrain-table.ts';
import type { TablePanel, PanelButton } from './panel.ts';
import { editSearch, panelTargets, drawPanel } from './panel.ts';
import type { TablePiece } from './piece-layer.ts';
import type { PieceCatalog, PieceRules, Force } from '../pieces.ts';
import type { ScenarioState, ScenarioCommand, Operation } from '../../server/scenario-session.ts';
import piecesUrl from '../../catalog/pieces.json?url';
import rulesUrl from '../../catalog/rules.json?url';
import equipmentUrl from '../../catalog/equipment.json?url';
import review from '../scenario/variant-review.json';

export interface WorkspaceOptions {
  mapId: string; mapIds: string[];
  view: { renderer: { domElement: HTMLCanvasElement; xr?: WebXRManager }; stats: object; readonly inputDiagnostics:object; setGrabBindings:(bindings:GrabBindings)=>void; cancelGrab:()=>void; setScenarioPieces:(pieces:TablePiece[],reachable:string[],path:string[],select:(id:string)=>void)=>void; setScenarioPanel:(panel:TablePanel)=>void; reset:()=>void; exit:()=>Promise<void>; scale:(factor:number)=>void };
  showMap:(id:string)=>void; selectTile:(id:string)=>void; focusTile:(id:string)=>void;
  coordinates:(id:string)=>{q:number;r:number}|undefined; tileAt:(q:number,r:number)=>string|undefined;
  openMenu:()=>void; terrainActions:()=>PanelButton[];
}
export interface PlayWorkspace { openMap:(id:string)=>Promise<void>; chooseTile:(id:string)=>void; readonly canSwitch:boolean }

interface Equipment { id:string; name:string; sourceUrl:string; origin:string; domain:string; taxonomy:string[]; sourceFields:Record<string,{raw:string;value:string|null}> }
export async function initPlayableWorkspace(options:WorkspaceOptions):Promise<PlayWorkspace> {
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('play-'+id) as T;
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const json=async<T>(url:string):Promise<T>=>{const response=await fetch(url);if(!response.ok)throw new Error(`Unable to load ${url} (${response.status}).`);return response.json();};
let rules:GeographicRules, envelope:ScenarioState, map:TerrainMap;
const table=options.view;
const capture=new CaptureClient(()=>table.renderer.xr?.isPresenting?(table.renderer.xr.getSession()?.environmentBlendMode==='opaque'?'vr':'mr'):'browser');
let draftObservationId:string|undefined,draftRunId:string|undefined;
table.renderer.xr?.addEventListener('sessionstart',()=>{capture.event('xr-start');void capture.flush();});
table.renderer.xr?.addEventListener('sessionend',()=>{capture.event('xr-end');void capture.flush();});
let stream:EventSource|null=null,generation=0,ready=false;
const api=(action:string,mapId=map.id)=>`/api/maps/${action}?map=${encodeURIComponent(mapId)}`;
let active:string|null=null, selectedTile:Cell|null=null, draft:Operation|null=null, draftPreview:Preview|null=null, draftRevision=0;
let definition=DEMO[0].definitionId as string, placement=false, online=false, busy=false, pendingCommand:ScenarioCommand|null=null;
let page=0, xrPage:'main'|'cargo'|'setup'|'table'|'evidence'|'catalog'|'candidate'|'search'|'maps'|'terrain'|'filters'|'actions'|'roster'='catalog', xrCargoPage=0;
let equipment=new Map<string,Equipment>();
const visuals=new Map<string,UnitVisual>(),grab=new GrabTransaction();
let xrDomain:Domain='ground',xrGroup='All';
const visual=(id:string)=>visuals.get(id)!;
let setup:Setup={mapId:options.mapId,year:2026,demo:false};
let message='Loading geographic exercise…';
let opponent:Awaited<ReturnType<typeof initOpponentWorkspace>>|null=null;
let opponentMapSwitch=false;
const state=()=>envelope.exercise;
const piece=()=>state().pieces.find(p=>p.id===active);
const short=(id:string)=>DEMO.find(d=>d.definitionId===id)?.label??rules.lab.definition(id).name.split(' ').slice(0,3).join(' ');
const locationName=(id:string|null)=>{const c=id?options.coordinates(id):undefined;return c?`${c.q}, ${c.r}`:'Carried';};
const forceName=(force:Force)=>force==='red'?'Red / China':'Blue / United States';
const status=(text:string)=>{message=text;$('status').textContent=text;};


const original=document.querySelector<HTMLElement>('.terrain-menu-content')!;
original.id='terrain-controls';original.hidden=true;
const tabs=document.createElement('div');tabs.className='workspace-tabs';
tabs.innerHTML='<button id="play-pieces-tab" type="button" aria-pressed="true">Pieces & orders</button><button id="play-terrain-tab" type="button" aria-pressed="false">Terrain & regions</button><button id="play-opponent-tab" type="button" aria-pressed="false">Play against AI</button>';
original.before(tabs);
const root=document.createElement('section');root.className='terrain-menu-content play-controls';root.id='piece-workspace';original.before(root);
const opponentRoot=document.createElement('section');opponentRoot.className='terrain-menu-content opponent-controls';opponentRoot.hidden=true;original.before(opponentRoot);
root.innerHTML=`<fieldset id="play-controls" disabled>
  <p class="eyebrow">Map assembly · independent save</p><h2 id="play-title">Loading…</h2><p id="play-map-label" hidden></p><p id="play-scale-label" class="muted"></p>
  <label>Map<select id="play-map-select"></select></label><div class="play-meta"><span id="play-year-label">2026</span><span id="play-turn-label">Turn 1</span><button id="play-setup-open" type="button">New map assembly</button></div>
  <div class="play-tabs"><button id="play-roster-tab" aria-pressed="true">Forces <span id="play-roster-count"></span></button><button id="play-catalog-tab" aria-pressed="false">Add pieces</button></div>
  <section id="play-roster" aria-label="Placed pieces"></section>
  <section id="play-catalog" hidden aria-label="Catalog assembly">
    <label>Assign to<select id="play-force"><option value="blue">Blue / United States</option><option value="red">Red / China</option></select></label>
    <label>Search equipment<input id="play-search" type="search" placeholder="Name or variant"></label>
    <label>Show<select id="play-eligible"><option value="eligible">Eligible for this year</option><option value="all">All records</option></select></label>
    <p id="play-result-count" class="muted"></p><div id="play-results"></div><div class="play-pager"><button id="play-previous">← Previous</button><button id="play-next">Next →</button></div>
  </section>
  <section class="play-inspector" aria-label="Piece inspector"><div class="play-inspector-head"><p class="eyebrow">Selection & orders</p><button id="play-clear">Clear</button></div><div id="play-details"></div><div id="play-orders"></div><div id="play-preview" aria-label="Order preview"></div></section>
  <label>Intent for the next order <span class="muted">· optional, shared</span><input id="play-intent" maxlength="1000" placeholder="What are you trying to achieve?"></label>
  <div class="play-commit"><button id="play-confirm" disabled>Confirm order</button><button id="play-cancel" disabled>Cancel</button></div>
  <details><summary>Hex destination & keyboard</summary><form id="play-coordinates"><label>q<input id="play-q" type="number" value="0" required></label><label>r<input id="play-r" type="number" value="0" required></label><button>Preview / inspect hex</button></form><p>Map arrows and Q/E select neighbors. Enter confirms; Escape cancels.</p></details>
  <details><summary>Quest controller controls · v2</summary><p>Use either controller. The index-finger trigger selects buttons. Hold the side grip button under your middle finger to pick up a unit: bring the controller close to a tile or miniature, or point its ray at one. Keep holding, lower it over the board until the preview turns green, then release the side grip.</p><p>To move the menu, hold the side grip on its top handle or title, move your controller, then release. Trigger − to hide it or Units + to reopen it. Bare-hand grabbing is not enabled.</p></details>
  <button id="play-advance" class="full">Preview next turn</button>
  <button id="play-finish" class="full">Finish exercise & review</button>
  <div class="play-save"><button id="play-export">Export save</button><button id="play-import-open">Import save</button><input type="file" id="play-import" accept="application/json,.json" hidden></div>
  <details><summary>Committed history <span id="play-history-count"></span></summary><ol id="play-history"></ol></details>
  <details><summary>Rules & model limits</summary><div id="play-rules-copy"></div></details>
  <p><a href="/review.html" id="play-review">Exercise review & reports ↗</a> · <a href="/scenario-review.html">Scenario learning records ↗</a></p><p id="play-capture" class="muted">Connecting to the exercise database…</p>
  <p><a href="/catalog.html">Full equipment evidence & database ↗</a></p>
</fieldset><p id="play-status" role="status" aria-live="polite">Loading pieces…</p><p id="play-connection" class="muted">Connecting…</p><button id="play-retry" hidden>Retry loading map</button>
<dialog id="play-setup-dialog"><form id="play-setup-form"><p class="eyebrow">This map only</p><h2>New map assembly</h2><p>Replaces this map's pieces and progress. Other maps are kept. This run remains in the exercise archive.</p><label>Scenario year<input id="play-year" type="number" min="1980" max="2026" value="2026" required></label><label class="play-checkbox"><input id="play-demo" type="checkbox"> Add a demonstration roster where eligible</label><div class="play-dialog-actions"><button type="button" id="play-setup-close">Cancel</button><button>Preview new map assembly</button></div></form></dialog>`;
const bar=document.createElement('div');bar.className='play-command-bar';bar.hidden=true;
bar.innerHTML='<p id="play-quick-status"></p><div><button id="play-quick-inspect">Pieces & orders</button><button id="play-quick-confirm" disabled>Confirm</button><button id="play-quick-cancel">Cancel</button></div>';
document.querySelector('.terrain-layout')!.append(bar);
const context = document.createElement('div'); context.className='play-context';
context.innerHTML='<p id="play-context-label"></p><button id="play-return-ai" hidden>Return to active exercise</button>';
document.querySelector('.map-heading')!.append(context);
function renderContext() {
  const run = opponent?.context;
  const name = map ? (map.view.id === 'focus' ? map.region.focusName : map.region.name) : 'Loading';
  $('context-label').textContent = run?.active ? `AI scenario · ${run.title} · Round ${run.round} · run ${run.id.slice(0,8)}` : opponent?.active ? `AI scenario setup · ${name}` : `Map assembly · ${name}${envelope?.runId ? ' · save ' + envelope.runId.slice(0,8) : ''}${run ? ` | AI saved: ${run.title} · ${run.mapName} · Round ${run.round}` : ''}`;
  $('return-ai').hidden = !run || run.active;
  $<HTMLButtonElement>('return-ai').disabled = busy || !!pendingCommand || !!opponent?.busy || !ready;
}
$('return-ai').onclick=()=>{if(ready&&!busy&&!pendingCommand){table.cancelGrab();void opponent?.activate();}};
function menuTab(pieces:boolean) {if(opponent?.busy)return;table.cancelGrab();opponent?.deactivate();opponentRoot.hidden=true;root.hidden=!pieces;original.hidden=pieces;$('pieces-tab').setAttribute('aria-pressed',String(pieces));$('terrain-tab').setAttribute('aria-pressed',String(!pieces));$('opponent-tab').setAttribute('aria-pressed','false');if(ready)render();}
function showPieces(){menuTab(true);options.openMenu();}
$('pieces-tab').onclick=()=>menuTab(true);$('terrain-tab').onclick=()=>menuTab(false);
$('opponent-tab').onclick=()=>{if(busy||pendingCommand)return;table.cancelGrab();opponent?.activate();};
$('retry').onclick=()=>void openMap(map.id);
$('quick-inspect').onclick=showPieces;$('quick-confirm').onclick=()=>void commit();$('quick-cancel').onclick=cancel;

function switchTab(catalog:boolean) {
  $('catalog').hidden=!catalog;$('roster').hidden=catalog;
  $('catalog-tab').setAttribute('aria-pressed',String(catalog));$('roster-tab').setAttribute('aria-pressed',String(!catalog));
  if(catalog)renderCatalog();
}
function clearDraft() {draft=null;draftPreview=null;pendingCommand=null;}
function selectPiece(id:string) {
  if(busy||!ready)return;active=id;placement=false;clearDraft();xrPage='main';switchTab(false);
  const p=piece();selectedTile=map.cells.find(c=>c.id===(p?.tileId??state().pieces.find(c=>c.id===p?.carrierId)?.tileId))??null;
  if(selectedTile){options.selectTile(selectedTile.id);const coordinate=options.coordinates(selectedTile.id);if(coordinate){$<HTMLInputElement>('q').value=String(coordinate.q);$<HTMLInputElement>('r').value=String(coordinate.r);}}status('Legal destinations are marked. Choose a hex to preview movement; carried items preview unloading.');render();
}
function chooseCell(cell:Cell) {
  if(opponent?.active){opponent.chooseTile(cell.id);return;}
  if(busy||!ready)return;selectedTile=cell;options.selectTile(cell.id);const coordinate=options.coordinates(cell.id)!;$<HTMLInputElement>('q').value=String(coordinate.q);$<HTMLInputElement>('r').value=String(coordinate.r);
  if(grab.active){const result=grab.preview(rules,envelope,cell.id);status(result.reason);render();return;}
  if(placement)preview({type:'action',action:{type:'deploy',definitionId:definition,force:$<HTMLSelectElement>('force').value as Force,tileId:cell.id,id:`${$<HTMLSelectElement>('force').value==='blue'?'B':'R'}-${crypto.randomUUID().slice(0,8)}`}});
  else if(piece())preview({type:'action',action:{type:piece()!.carrierId?'unload':'move',pieceId:piece()!.id,tileId:cell.id}});
  else {status(`Hex ${locationName(cell.id)}: ${SURFACES[cell.terrain].note}`);render();}
}
function preview(operation:Operation) {
  if(busy||!ready)return;
  clearDraft();draft=operation;draftRevision=envelope.revision;draftObservationId=envelope.observationId;draftRunId=envelope.runId;
  try {
    if(operation.type==='action'&&envelope.runStatus==='archived')throw new Error('This exercise is finished. Open its review, or start a new exercise to continue.');
    if(operation.type==='action')draftPreview=rules.evaluate(state(),operation.action);
    else {
      const target=operation.type==='new'?rules.create(operation.setup):rules.import(operation.save);
      if(target.manifest.mapId!==map.id)throw new Error('This save belongs to another map. Open that map to import it.');
      draftPreview={allowed:true,cost:0,path:[],reason:`${operation.type==='new'?'Start':'Restore'} ${target.pieces.length} pieces on ${map.view.id==='focus'?map.region.focusName:map.region.name}, year ${target.year}, turn ${target.turn}. This replaces only this map's exercise; other maps are kept.`};
    }
  } catch(error) {draftPreview={allowed:false,cost:0,path:[],reason:error instanceof Error?error.message:'Invalid exercise.'};}
  capture.event(draftPreview.allowed?'preview':'restriction',{action:operation.type==='action'?operation.action.type:operation.type,reasonCode:draftPreview.reasonCode??null});
  status(draftPreview.reason);render();
}
async function commit() {
  if(busy||!ready||!draft||!draftPreview?.allowed)return;
  if(!online){status('Connection unavailable. Reconnect before committing; the draft has spent nothing.');return;}
  const command=pendingCommand??{id:crypto.randomUUID(),revision:draftRevision,operation:draft,runId:draftRunId,observationId:draftObservationId,rationale:$<HTMLInputElement>('intent').value.trim()||undefined};pendingCommand=command;busy=true;render();
  try {
    const response=await fetch(api('command'),{method:'POST',headers:capture.headers(),body:JSON.stringify(command)});
    const result=await response.json();
    if(result.state?.observationId)acceptState(result.state);
    if(!response.ok){if(response.status<500)clearDraft();throw new Error(result.error??'Order rejected.');}
    $<HTMLInputElement>('intent').value='';
    if(command.operation.type==='action'&&command.operation.action.type==='deploy'){active=command.operation.action.id;switchTab(false);}
    clearDraft();placement=false;xrPage=command.operation.type==='action'&&command.operation.action.type==='deploy'?'catalog':'main';status(`Saved · ${result.duplicate?'Request already applied': 'Order committed'} · revision ${envelope.revision}`);
  } catch(error) {
    status(`${error instanceof Error?error.message:'Connection failed.'} ${pendingCommand?'Retry uses the same command ID; no duplicate spending.':''}`);
  } finally {busy=false;render();}
}
function acceptState(next:ScenarioState) {
  if(next.exercise.manifest.mapId!==map.id)throw new Error('Received state for another map.');
  if(envelope&&next.revision<envelope.revision)return;
  const changed=envelope&&(next.revision!==envelope.revision||next.runStatus!==envelope.runStatus);
  rules.assertVersion(next.exercise);envelope=next;ready=true;
  capture.presented(next);$('capture').textContent=`${next.runStatus==='archived'?'Exercise finished · review available':'Database capture active'} · ${next.participantLabel??'Participant'} · run ${next.runId?.slice(0,8)??'unknown'}`;
  $<HTMLAnchorElement>('review').href='/review.html?run='+encodeURIComponent(next.runId??'');
  if(changed&&!busy){table.cancelGrab();clearDraft();placement=false;status('Shared state updated. Review the refreshed pieces before issuing an order.');}
  if(active&&!piece()){active=null;selectedTile=null;}
  if(active){const p=piece()!,tileId=p.tileId??state().pieces.find(c=>c.id===p.carrierId)?.tileId;selectedTile=map.cells.find(c=>c.id===tileId)??null;if(selectedTile)options.selectTile(selectedTile.id);}
  if(!$('catalog').hidden)renderCatalog();render();
}
async function openMap(id:string) {
  if(busy||pendingCommand||grab.active)return;
  opponent?.onMap(id);
  table.cancelGrab();
  $('retry').hidden=true;
  const ticket=++generation;stream?.close();stream=null;ready=false;online=false;clearDraft();active=null;selectedTile=null;placement=false;xrPage='catalog';
  envelope=undefined as unknown as ScenarioState;map=rules.map(id);setup={mapId:id,year:2026,demo:false};
  table.setScenarioPieces([],[],[],selectPiece);$<HTMLFieldSetElement>('controls').disabled=true;$<HTMLSelectElement>('map-select').value=id;bar.hidden=true;
  table.setScenarioPanel({title:'LOADING SAVED MAP',lines:[map.region.name,'Your other maps are kept.'],buttons:[]});status('Loading this map’s saved pieces…');
  try {
    const initial=await json<ScenarioState>(api('state',id));if(ticket!==generation)return;
    online=true;acceptState(initial);status('Each map saves independently. Add pieces or select a token to begin.');render();
    stream=new EventSource(api('events',id));
    stream.onopen=()=>{if(ticket===generation){online=true;capture.event('reconnect');render();}};
    stream.onerror=()=>{if(ticket===generation){online=false;capture.event('disconnect');table.cancelGrab();render();}};
    stream.onmessage=e=>{if(ticket!==generation)return;try{acceptState(JSON.parse(e.data));}catch(error){online=false;status(String(error));render();}};
  } catch(error){if(ticket!==generation)return;$('retry').hidden=false;status(String(error));table.setScenarioPanel({title:'MAP COULD NOT LOAD',lines:[String(error)],buttons:[{label:'Retry loading map',run:()=>void openMap(id)}]});}
}
function candidates() {
  const force=$<HTMLSelectElement>('force').value as Force,query=$<HTMLInputElement>('search').value.trim().toLowerCase(),eligible=$<HTMLSelectElement>('eligible').value;
  return rules.catalog.pieces.filter(p=>p.name.toLowerCase().includes(query)&&p.forceEvidence.some(e=>e.force===force)&&(eligible==='all'||rules.eligibility(p.id,force,state().year).allowed));
}
function chooseDefinition(id:string){if(busy||!ready)return;active=null;definition=id;placement=false;clearDraft();renderCatalog();render();}
function beginPlacement(){if(busy||!ready)return;const e=rules.eligibility(definition,$<HTMLSelectElement>('force').value as Force,state().year);if(!e.allowed){status(e.reason);render();return;}active=null;placement=true;clearDraft();xrPage='main';status('Placement active. Point at a hex, preview, then confirm.');render();}
function renderCatalog() {
  if(!rules)return;
  const force=$<HTMLSelectElement>('force').value as Force,list=candidates();
  page=Math.min(page,Math.max(0,Math.ceil(list.length/5)-1));
  $('result-count').textContent=`${list.length.toLocaleString()} records · year ${state().year} · page ${page+1}`;
  $('results').innerHTML=list.slice(page*5,page*5+5).map(p=>{const allowed=rules.eligibility(p.id,force,state().year).allowed;return `<button class="catalog-row ${p.id===definition?'selected':''}" data-definition="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.profileId)} · ${p.eraEvidence.reportedYear??'Date unknown'} ${allowed?'':'· REVIEW'}</small></button>`;}).join('');
  $('results').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>chooseDefinition(b.dataset.definition!));
  $<HTMLButtonElement>('previous').disabled=page===0;$<HTMLButtonElement>('next').disabled=(page+1)*5>=list.length;
}
function render() {
  renderContext();
  if(!ready||!envelope||!rules)return;
  if(opponent?.active){bar.hidden=true;opponent.render();return;}
  $<HTMLFieldSetElement>('controls').disabled=busy;
  const s=state(),p=piece(),d=rules.lab.definition(p?.definitionId??definition),profile=rules.lab.profiles.get(d.profileId)!,fact=equipment.get(d.equipmentId);
  $('title').textContent=map.view.id==='focus'?map.region.focusName:map.region.name;
  $('map-label').textContent=map.view.id==='focus'?map.region.focusName:map.region.name;
  $('scale-label').textContent=`${map.view.hexKm} km between hex centers · ${map.cells.length.toLocaleString()} hexes`;
  $('year-label').textContent=String(s.year);$('turn-label').textContent=`Turn ${s.turn}`;$('roster-count').textContent=String(s.pieces.length);
  $('connection').textContent=`${online?'● Connected · autosaved':'○ Reconnecting'} · revision ${envelope.revision}`;
  $('roster').innerHTML=s.pieces.map(p=>{const profile=rules.lab.profile(p),cargo=s.pieces.filter(c=>c.carrierId===p.id).length;return `<button class="roster-row ${p.id===active?'selected':''}" data-instance="${esc(p.id)}"><span class="token ${p.force}">${symbol(profile.id,profile.layer)}</span><span><strong>${esc(short(p.definitionId))}</strong><small>${esc(p.id)} · ${p.carrierId?`IN ${esc(p.carrierId)}`:`${locationName(p.tileId)} · ${p.movement} MP`}${cargo?` · ${cargo} cargo`:''}</small></span><span class="force-mark">${p.force==='blue'?'B':'R'}</span></button>`;}).join('')||'<p>No pieces placed. Open Add pieces to assemble a force.</p>';
  $('roster').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>selectPiece(b.dataset.instance!));
  const note=review.records.find(r=>r.definitionId===d.id);
  const inspected=!!p||!$('catalog').hidden;
  $('details').innerHTML=inspected?`<p class="force-label">${p?forceName(p.force):'Catalog candidate'} ${p?`· ${esc(p.id)}`:''}</p><h2>${esc(d.name)}</h2><p class="piece-location">${p?(p.carrierId?`Carried by ${esc(p.carrierId)}`:`Hex ${locationName(p.tileId)} · ${profile.layer} layer`):esc(rules.eligibility(d.id,$<HTMLSelectElement>('force').value as Force,s.year).reason)}</p><div class="values"><div><strong>${p?p.movement:profile.movement}<small> / ${profile.movement}</small></strong><span>Movement points</span></div><div><strong>${p?rules.cargoUsed(s,p.id):0}<small> / ${profile.cargoSlots}</small></strong><span>Cargo slots used</span></div></div><p class="authored">Authored game values · ${esc(profile.label)} · load size ${d.loadSlots} slots. ${profile.movement===0?'Transport required to relocate.':''}</p><details id="play-source-facts"><summary>Source evidence & variant review</summary><p><strong>ODIN source facts</strong><br>Reported introduction: ${esc(d.eraEvidence.raw)}<br>Origin: ${esc(fact?.origin??'Unknown')}<br>Operator evidence: ${esc(d.forceEvidence.map(e=>`${e.force}: ${e.basis}`).join('; '))}</p><p>${esc(note?.note??'Exact operator service interval and retirement have not been reviewed. Catalog classification is provisional.')}</p>${note?.sources.map(source=>`<p><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a> · ${esc(source.locator)}</p>`).join('')??''}<p>Source specifications never set movement or combat values. Raw ODIN fields can describe components and omit units.</p>${fact?`<a href="${esc(fact.sourceUrl)}" target="_blank" rel="noreferrer">ODIN equipment record ↗</a><dl class="facts">${Object.entries(fact.sourceFields).slice(0,8).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v.value??`Unknown (${v.raw})`)}</dd>`).join('')}</dl>`:''}<p><a href="/catalog.html">Open full equipment facts and components →</a></p></details>`:'<h2>Select a piece</h2><p>Choose a token or roster entry. Legal destinations and restrictions appear immediately.</p>';
  let legal:string[]=[];
  if(p){if(p.carrierId){const at=map.cells.find(c=>c.id===s.pieces.find(c=>c.id===p.carrierId)?.tileId);legal=at?[at,...neighbors(map,at)].filter(c=>rules.evaluate(s,{type:'unload',pieceId:p.id,tileId:c.id}).allowed).map(c=>c.id):[];}else legal=[...rules.reachable(s,p.id).keys()].filter(id=>id!==p.tileId);}
  const movementHelp=legal.length?(p?.carrierId?'Choose a marked hex beside the carrier to preview unloading.':'Choose a gold-ring hex to preview movement.'):(p?.carrierId?'No legal unloading destination: check carrier points, shoreline and occupied layers.':profile.movement===0?'This piece requires transport to relocate.':p?.movement===0?'No movement points remain. Advance the turn to refresh the budget.':'No legal destination within the budget and free layers. Ordinary ground cannot cross coast-to-coast edges.');
  const cargo=p?s.pieces.filter(c=>c.carrierId===p.id):[];
  $('orders').innerHTML=p?`<h3>Available actions</h3><p>${movementHelp} ${profile.layer==='air'?'Air is an abstract layer; no basing or endurance is modeled.':''}</p><button id="play-hold">Preview hold</button><button id="play-focus-piece">Focus piece</button>${cargo.length?`<p><strong>Cargo manifest</strong></p>${cargo.map(c=>`<button class="cargo-row" data-cargo="${esc(c.id)}">▧ ${esc(c.id)} · ${esc(short(c.definitionId))} → Unload</button>`).join('')}` : ''}${!p.carrierId?`<label>Load selected piece into<select id="play-carrier"><option value="">Choose carrier</option>${s.pieces.filter(c=>c.id!==p.id&&c.force===p.force&&rules.lab.profile(c).cargoSlots>0).map(c=>`<option value="${esc(c.id)}">${esc(c.id)} · ${esc(short(c.definitionId))}</option>`).join('')}</select></label><button id="play-load">Preview load</button>`:''}`:!$('catalog').hidden?`<button id="play-place" class="primary full">${placement?'Placement active · choose a hex':'Place an instance'}</button><p>Placement is validated before commitment. Repeat to add multiple instances.</p>`:'';
  $('focus-piece')?.addEventListener('click',()=>{if(selectedTile)options.focusTile(selectedTile.id);});
  $('hold')?.addEventListener('click',()=>preview({type:'action',action:{type:'hold',pieceId:active!}}));
  $('load')?.addEventListener('click',()=>preview({type:'action',action:{type:'load',pieceId:active!,carrierId:$<HTMLSelectElement>('carrier').value}}));
  $('orders').querySelectorAll<HTMLButtonElement>('[data-cargo]').forEach(b=>b.onclick=()=>selectPiece(b.dataset.cargo!));
  $('place')?.addEventListener('click',beginPlacement);
  $('preview').innerHTML=draftPreview?`<h3>${draftPreview.allowed?'Order preview':'Action blocked'}</h3><p>${esc(draftPreview.reason)}</p>${draftPreview.path.length>1?`<p>${draftPreview.path.length-1} hex steps · ${((draftPreview.path.length-1)*map.view.hexKm).toFixed(2)} projected km · ${draftPreview.cost} MP</p><p class="route">${draftPreview.path.map(id=>locationName(id)).join(' → ')}</p>`:''}<small>Previewing and cancelling spend nothing.</small>`:selectedTile?`<p>Hex ${locationName(selectedTile.id)} · ${SURFACES[selectedTile.terrain].name}<br>Depth / elevation: unknown</p>`:'';
  $<HTMLButtonElement>('confirm').disabled=busy||!draftPreview?.allowed;$<HTMLButtonElement>('cancel').disabled=busy||!draft;
  $('confirm').textContent=busy?'Saving…':pendingCommand?'Retry order':'Confirm order';
  $('history-count').textContent=String(s.events.length);$('history').innerHTML=s.events.slice(-30).reverse().map(e=>`<li><strong>${e.revision} · Turn ${e.turn} · ${esc(e.action.type)}</strong> ${esc('pieceId' in e.action?e.action.pieceId:e.action.type==='deploy'?e.action.id:'')}<p>${esc(e.explanation)}</p></li>`).join('');
  table.setScenarioPieces(s.pieces.filter(p=>p.tileId!==null).map<TablePiece>(p=>{const profile=rules.lab.profile(p);return{id:p.id,tileId:p.tileId!,force:p.force,symbol:symbol(profile.id,profile.layer),name:rules.lab.definition(p.definitionId).name,model:visual(p.definitionId).model,selected:p.id===active,cargo:s.pieces.filter(c=>c.carrierId===p.id).length,layer:profile.layer};}).concat(opponent?.contextPieces(map) ?? []),legal,draftPreview?.allowed?draftPreview.path:[],selectPiece);
  bar.hidden=!active&&!placement&&!draft;
  $('quick-status').textContent=draftPreview?.reason??(placement?'Place '+short(definition):p?short(p.definitionId)+' · '+p.movement+' MP · choose a gold-ring hex':'');
  $<HTMLButtonElement>('quick-confirm').disabled=busy||!draftPreview?.allowed;
  $<HTMLButtonElement>('quick-cancel').disabled=busy;
  renderXR();
}
let lastPanel:TablePanel|null=null,xrCatalogPage=0;
const panelPreview=new URL(location.href).searchParams.has('controller-preview')?document.createElement('section'):null;
if(panelPreview){panelPreview.className='controller-preview'+(new URL(location.href).searchParams.has('palette-review')?' palette-review':'');panelPreview.setAttribute('aria-label','Controller panel preview');(new URL(location.href).searchParams.has('palette-review')?document.body:root).append(panelPreview);}
function renderXR() {
  if(!ready)return;
  if(opponent?.active){opponent.render();return;}
  const p=piece(),profile=p?rules.lab.profile(p):null;
  const button=(label:string,run:()=>void,enabled=true):PanelButton=>({label,run,enabled:enabled&&!busy});
  const go=(page:typeof xrPage)=>{xrPage=page;renderXR();};
  const name=(id:string)=>{const m=rules.map(id);return m.view.id==='focus'?m.region.focusName:m.region.name;};
  const wrap=(text:string)=>text.match(/.{1,60}(?:\s|$)|.{1,60}/g)??[];
  const back=button('Back to units',()=>go('catalog'));
  let panel:TablePanel={title:'PIECES & ORDERS',lines:[name(map.id),`${state().year} · Turn ${state().turn} · ${state().pieces.length} pieces`,p?`${p.id} · ${forceName(p.force)}`:'Select a token or add a catalog piece',...(p?wrap(rules.lab.definition(p.definitionId).name).slice(0,2):[]),p?`${p.movement} MP · Cargo ${rules.cargoUsed(state(),p.id)} / ${profile!.cargoSlots}`:'Each map keeps its own progress',...wrap(message).slice(0,2)],buttons:[]};
  if(draft) {
    panel.title=draftPreview?.allowed?'ORDER PREVIEW':'ACTION BLOCKED';panel.lines=[name(map.id),...wrap(draftPreview?.reason??'').slice(0,5),draftPreview?.path.length?`${draftPreview.cost} MP · ${draftPreview.path.length-1} hex steps`:'Preview spends nothing'];
    panel.buttons=[button(pendingCommand?'Retry order':'Confirm order',()=>void commit(),!!draftPreview?.allowed&&online),button('Cancel preview',cancel)];
  } else if(placement) {
    panel.title='PLACE A PIECE';panel.lines=[name(map.id),...wrap(rules.lab.definition(definition).name).slice(0,3),forceName($<HTMLSelectElement>('force').value as Force),'Point at a map hex and pull the trigger.','Review the placement, then confirm.',...wrap(message).slice(0,1)];panel.buttons=[button('Cancel placement',cancel)];
  } else if(xrPage==='search') {
    panel.title='SEARCH EQUIPMENT';panel.lines=[`Search ${xrDomain} units by name`,`Search: ${$<HTMLInputElement>('search').value || '(empty)'}`,'Point at a letter and pull the trigger.','Choose Done to browse matching pieces.'];
    panel.keyboard={value:$<HTMLInputElement>('search').value,key:key=>{if(busy)return;$<HTMLInputElement>('search').value=editSearch($<HTMLInputElement>('search').value,key);page=0;renderCatalog();renderXR();},done:()=>{xrCatalogPage=0;xrGroup='All';go('catalog');}};
  } else if(xrPage==='filters') {
    panel.title='CATALOG FILTERS';panel.lines=[forceName($<HTMLSelectElement>('force').value as Force),`Year ${state().year}`,`Search: ${$<HTMLInputElement>('search').value||'All names'}`,$<HTMLSelectElement>('eligible').value==='all'?'Showing all records, including unavailable':'Showing eligible records only'];
    panel.buttons=[button('Search with keyboard',()=>go('search')),button('Switch Red / Blue',()=>{$<HTMLSelectElement>('force').value=$<HTMLSelectElement>('force').value==='blue'?'red':'blue';page=0;xrCatalogPage=0;renderCatalog();renderXR();}),button('Toggle eligible / all records',()=>{$<HTMLSelectElement>('eligible').value=$<HTMLSelectElement>('eligible').value==='all'?'eligible':'all';page=0;xrCatalogPage=0;renderCatalog();renderXR();}),button('Clear search',()=>{$<HTMLInputElement>('search').value='';page=0;xrCatalogPage=0;renderCatalog();renderXR();}),button('Browse results',()=>go('catalog')),back];
  } else if(xrPage==='catalog'||xrPage==='roster') {
    const roster=xrPage==='roster',force=$<HTMLSelectElement>('force').value as Force;
    const list=roster?state().pieces.filter(p=>p.force===force).map(p=>({definition:rules.lab.definition(p.definitionId),instance:p})):candidates().filter(d=>visual(d.id).domain===xrDomain&&(xrGroup==='All'?d.kind==='platform'&&visual(d.id).group!=='Equipment':visual(d.id).group===xrGroup)).sort((a,b)=>a.name.localeCompare(b.name)).map(d=>({definition:d,instance:null}));
    xrCatalogPage=Math.max(0,Math.min(xrCatalogPage,Math.ceil(list.length/6)-1));
    panel.title=roster?'MAP ASSEMBLY / ON MAP':'MAP ASSEMBLY / UNITS';panel.lines=[`${forceName(force)} · ${state().year} · ${list.length} ${roster?'pieces':'choices'} · ${xrCatalogPage+1}/${Math.max(1,Math.ceil(list.length/6))}`,`${name(map.id)} · Turn ${state().turn} · independent save`];
    const resetBrowse=()=>{xrCatalogPage=0;renderXR();};
    panel.catalog={
      toolbar:[button(force==='blue'?'United States ▾':'China ▾',()=>{$<HTMLSelectElement>('force').value=force==='blue'?'red':'blue';renderCatalog();resetBrowse();}),button('Search: '+($<HTMLInputElement>('search').value||'unit name'),()=>go('search'))],
      tabs:(['ground','air','sea'] as Domain[]).map(domain=>({...button(domain[0].toUpperCase()+domain.slice(1),()=>{xrDomain=domain;xrGroup='All';xrPage='catalog';resetBrowse();}),selected:!roster&&domain===xrDomain})),
      groups:roster?[]:['All',...UNIT_GROUPS[xrDomain]].map(group=>({...button(group,()=>{xrGroup=group;resetBrowse();}),selected:group===xrGroup})),
      cards:list.slice(xrCatalogPage*6,xrCatalogPage*6+6).map(({definition:d,instance})=>{
        const eligible=rules.eligibility(d.id,instance?.force??force,state().year).allowed;
        return {...button((instance?instance.id+' · ':'')+d.name,()=>{if(instance){selectPiece(instance.id);return;}xrPage='candidate';chooseDefinition(d.id);}),model:visual(d.id).model,force:instance?.force??force,available:eligible,grab:eligible?(instance?{pieceId:instance.id}:{definitionId:d.id}):undefined};
      }),
    };
    panel.buttons=[button('← Previous',()=>{xrCatalogPage--;renderXR();},xrCatalogPage>0),button('Next →',()=>{xrCatalogPage++;renderXR();},(xrCatalogPage+1)*6<list.length),button(roster?'Add units':'On map',()=>{xrCatalogPage=0;go(roster?'catalog':'roster');}),button('Settings',()=>go('main')),button('Clear search',()=>{$<HTMLInputElement>('search').value='';xrGroup='All';resetBrowse();}),button($<HTMLSelectElement>('eligible').value==='all'?'Show eligible':'Show all records',()=>{$<HTMLSelectElement>('eligible').value=$<HTMLSelectElement>('eligible').value==='all'?'eligible':'all';resetBrowse();})];
  } else if(xrPage==='candidate') {
    const d=rules.lab.definition(definition),pr=rules.lab.profiles.get(d.profileId)!,eligible=rules.eligibility(d.id,$<HTMLSelectElement>('force').value as Force,state().year);
    panel.title='UNIT DETAILS';panel.lines=[...wrap(d.name).slice(0,3),forceName($<HTMLSelectElement>('force').value as Force),`${pr.movement} MP · Stylized ${visual(d.id).model} model`,`Cargo ${pr.cargoSlots} slots · Load size ${d.loadSlots}`,...wrap(eligible.reason).slice(0,2)];
    panel.buttons=[{...button('Hold SIDE GRIP here to pick up',()=>{status('Use the side button under your middle finger. Hold, lower to green, then release.');renderXR();},eligible.allowed),grab:eligible.allowed?{definitionId:d.id}:undefined},button('Place with pointer',beginPlacement,eligible.allowed),button('Source evidence',()=>go('evidence')),button('Back to catalog',()=>go('catalog'))];
  } else if(xrPage==='maps') {
    panel.title='MAP ASSEMBLIES';panel.lines=[name(map.id),opponent?.context?`AI saved: ${opponent.context.mapName}`:'Each map has independent saved pieces.','Regions in this workspace open inside VR/MR.','The other workspace opens after exiting immersion.'];
    panel.buttons=options.mapIds.map(id=>button(name(id),()=>{if(id===map.id){go('main');return;}options.showMap(id);}));
    const other=map.id.includes('/')?'CENTCOM':'Pacific';
    panel.buttons.push(button('Terrain controls',()=>go('terrain')),button(`Open ${other} workspace`,()=>{void table.exit().then(()=>location.assign(other==='Pacific'?'/pacific.html':'/centcom.html'));}),back);
  } else if(xrPage==='terrain') {
    panel.title='TERRAIN CONTROLS';panel.lines=[name(map.id),'Display changes keep game positions and budgets.','Relief is illustrative; elevation and depth unknown.'];panel.buttons=[...options.terrainActions().map(b=>({...b,enabled:!busy})),back];
  } else if(xrPage==='setup') {
    panel.title='NEW MAP ASSEMBLY';panel.lines=[name(map.id),`Year ${setup.year}`,setup.demo?'Demonstration roster where eligible':'Empty exercise','Replaces this map’s pieces and progress.','Your other maps are kept.','Export this run in the browser to keep a portable copy.'];
    const year=(delta:number)=>{setup.year=Math.max(1980,Math.min(2026,setup.year+delta));renderXR();};
    panel.buttons=[button('Earlier year −1',()=>year(-1)),button('Later year +1',()=>year(1)),button('Earlier decade −10',()=>year(-10)),button('Later decade +10',()=>year(10)),button('Toggle demonstration roster',()=>{setup.demo=!setup.demo;renderXR();}),button('Preview new map assembly',()=>preview({type:'new',setup:structuredClone(setup)})),back];
  } else if(xrPage==='table') {
    panel.title='TABLE & EXERCISE';panel.buttons=[button('Smaller table',()=>table.scale(.8)),button('Larger table',()=>table.scale(1.25)),button('Recenter table',()=>table.reset()),button('New map assembly',()=>{setup={mapId:map.id,year:state().year,demo:false};go('setup');}),back,button('Exit VR / MR',()=>void table.exit())];
  } else if(xrPage==='actions') {
    panel.title='PIECE ACTIONS';panel.buttons=[button('Preview hold',()=>p&&preview({type:'action',action:{type:'hold',pieceId:p.id}}),!!p),button('Preview next turn',()=>preview({type:'action',action:{type:'advance'}})),button('Source evidence',()=>go('evidence')),button('Clear selection',()=>{active=null;selectedTile=null;status('Selection cleared.');go('main');render();}),back];
  } else if(xrPage==='evidence') {
    const d=rules.lab.definition(p?.definitionId??definition),note=review.records.find(r=>r.definitionId===d.id);
    panel.title='SOURCE EVIDENCE';panel.lines=[`ODIN introduction: ${d.eraEvidence.raw}`,...wrap(note?.note??'Historical service dates and classification remain provisional. Detailed source records are in the equipment library.').slice(0,5),'Movement and cargo rules are separately authored.'];panel.buttons=[button('Back',()=>go(p?'main':'candidate'))];
  } else if(xrPage==='cargo'&&p) {
    const actions:{label:string;action?:Action;id?:string}[]=state().pieces.filter(c=>c.carrierId===p.id).map(c=>({label:`Unload ${short(c.definitionId)} / ${c.id}`,id:c.id}));
    if(profile!.cargoSlots)for(const c of state().pieces.filter(c=>c.force===p.force&&c.id!==p.id&&!c.carrierId))actions.push({label:`Load ${short(c.definitionId)} / ${c.id}`,action:{type:'load',pieceId:c.id,carrierId:p.id}});
    else if(!p.carrierId)for(const c of state().pieces.filter(c=>c.force===p.force&&rules.lab.profile(c).cargoSlots>0&&!c.carrierId))actions.push({label:`Load into ${short(c.definitionId)} / ${c.id}`,action:{type:'load',pieceId:p.id,carrierId:c.id}});
    panel.title='CARGO / PREVIEW TRANSFER';panel.buttons=actions.slice(xrCargoPage*4,xrCargoPage*4+4).map(a=>button(a.label,()=>a.id?selectPiece(a.id):preview({type:'action',action:a.action!})));
    if(actions.length>4)panel.buttons.push(button('More cargo choices',()=>{xrCargoPage=(xrCargoPage+1)%Math.ceil(actions.length/4);renderXR();}));panel.buttons.push(back);
  } else {
    panel.title=p?'SELECTED UNIT':'TABLE SETTINGS';
    if(!p)panel.lines=[name(map.id),`${state().year} · Turn ${state().turn}`,'The unit palette is beside the table.','Grip its top handle to move it; − hides it.'];
    panel.buttons=[button('Unit palette',()=>{xrCatalogPage=0;go('catalog');}),...(p?[button('Cargo / load / unload',()=>{xrCargoPage=0;go('cargo');}),button('More unit actions',()=>go('actions'))]:[]),button('Preview next turn',()=>preview({type:'action',action:{type:'advance'}})),button('Maps & terrain',()=>go('maps')),button('Table & exercise',()=>go('table')),button(opponent?.context?'Return to active exercise':'Play against AI',()=>void opponent?.activate())];
  }
  presentPanel(panel);
}
function presentPanel(panel:TablePanel) {
  lastPanel=panel;table.setScenarioPanel(panel);
  if(panelPreview){
    if(!new URL(location.href).searchParams.has('palette-review')) (opponentRoot.hidden?root:opponentRoot).append(panelPreview);
    panelPreview.innerHTML=`<h3>Controller panel preview</h3><strong>${esc(panel.title)}</strong><p>${panel.lines.map(esc).join('<br>')}</p>`;
    const surface=document.createElement('div');surface.className='spatial-preview-surface';panelPreview.append(surface);const canvas=document.createElement('canvas');drawPanel(canvas,panel);surface.append(canvas);
    for(const target of panelTargets(panel)){const b=document.createElement('button');b.textContent=target.label;b.setAttribute('aria-label',target.label);b.disabled=target.enabled===false;b.onclick=target.run;b.style.cssText=`left:${target.x/10.24}%;top:${target.y/12.8}%;width:${target.width/10.24}%;height:${target.height/12.8}%`;if(target.selected)b.setAttribute('aria-pressed','true');
      const card=panel.catalog?.cards.find(c=>c.run===target.run);if(card){const img=document.createElement('img');img.src=miniatureThumbnail(card.model,card.force).toDataURL();img.alt='';b.prepend(img);}surface.append(b);
      if(target.grab){const grip=document.createElement('button');grip.textContent='Pick up '+target.label;grip.onclick=()=>{grabBindings.begin(target.grab!);};panelPreview.append(grip);}
    }
    if(opponent?.active&&opponent.diagnostics.selected){const pickup=document.createElement('button');pickup.textContent='Grip selected AI ship';pickup.onclick=()=>grabBindings.begin({pieceId:opponent!.diagnostics.selected!});panelPreview.append(pickup);if(opponent.diagnostics.held){const drop=document.createElement('button');drop.textContent='Release at previewed route';drop.onclick=()=>{const c=opponent!.diagnostics.movePreview;grabBindings.release(c?.order.type==='move'?c.order.target:null);};panelPreview.append(drop);}}
    if(grab.active){const release=document.createElement('button');release.textContent='Release over chosen hex';release.onclick=()=>grabBindings.release(selectedTile?.id??null);panelPreview.append(release);}
  }
}

const grabBindings:GrabBindings={
  version:()=>opponent?.active?opponent.grabBindings.version():ready?map.id+':'+envelope.revision:'loading',
  begin:source=>{
    if(opponent?.active)return opponent.grabBindings.begin(source);
    if(!ready||busy||pendingCommand||grab.active||!online||envelope.runStatus==='archived')return null;
    let id=source.definitionId,instance=source.pieceId?state().pieces.find(p=>p.id===source.pieceId):undefined;
    if(source.pieceId&&!instance)return null;if(instance)id=instance.definitionId;if(!id||!rules.lab.definitions.has(id))return null;
    const d=rules.lab.definition(id),force=instance?.force??$<HTMLSelectElement>('force').value as Force;
    if(!rules.eligibility(id,force,state().year).allowed){status('This unit is unavailable for the selected force/year.');render();return null;}
    if(instance)selectPiece(instance.id);else{chooseDefinition(id);active=null;}
    const action=instance?{type:instance.carrierId?'unload' as const:'move' as const,pieceId:instance.id,tileId:''}:{type:'deploy' as const,id:`${force==='blue'?'B':'R'}-${crypto.randomUUID().slice(0,8)}`,definitionId:id,force,tileId:''};
    if(!grab.begin(envelope,action))return null;status('Holding '+d.name+'. Release over a valid hex to place.');render();
    return{name:d.name,model:visual(id).model,force,pieceId:instance?.id};
  },
  preview:tileId=>opponent?.active?opponent.grabBindings.preview(tileId):!ready||!online?{allowed:false,reason:'Connection unavailable; release to cancel.'}:grab.preview(rules,envelope,tileId),
  release:tileId=>{
    if(opponent?.active){opponent.grabBindings.release(tileId);return;}
    if(!grab.active)return;
    if(!ready||!online||busy){grab.cancel();status('Placement cancelled. The saved pieces are unchanged.');render();return;}
    const result=grab.take(rules,envelope,tileId);
    if(result.action){preview({type:'action',action:result.action});void commit();}
    else{capture.event('restriction',{action:'drop',reasonCode:result.preview.reasonCode??'drop.invalid'});clearDraft();status(result.preview.reason+' Returned without spending.');render();}
  },
  cancel:()=>{if(opponent?.active){opponent.grabBindings.cancel();return;}capture.event('cancel',{action:'pickup'});grab.cancel();if(ready){status('Pickup cancelled. No changes were saved.');render();}},
};

function cancel() {if(busy||!ready)return;if(draft||grab.active)capture.event('cancel',{action:draft?.type==='action'?draft.action.type:'preview'});table.cancelGrab();grab.cancel();clearDraft();placement=false;status('Preview cancelled. No movement or cargo was spent.');render();}
  const [catalog,profiles,research,regional,shoal,senkaku]=await Promise.all([loading.measure('Piece catalog',()=>json<PieceCatalog>(piecesUrl)),loading.measure('Movement profiles',()=>json<PieceRules>(rulesUrl)),loading.measure('Equipment reference',()=>json<{equipment:Equipment[]}>(equipmentUrl)),loading.measure('Scenario geography',()=>json<Geography>('/terrain/pacific/regional-land.json')),json<Geography>('/terrain/pacific/shoal-detail.json'),json<Geography>('/terrain/pacific/senkaku-detail.json')]);
  rules=await loading.measure('Build six rules maps',()=>new GeographicRules(catalog,profiles,scenarioMaps({regional,shoal,senkaku})));equipment=new Map(research.equipment.map(e=>[e.id,e]));
  await loading.measure('Classify miniatures',()=>{for(const d of catalog.pieces)visuals.set(d.id,unitVisual(d,equipment.get(d.equipmentId)));});
  table.setGrabBindings(grabBindings);
  const mapName=(id:string)=>{const m=rules.map(id);return m.view.id==='focus'?m.region.focusName:m.region.name;};
  $('map-select').innerHTML=options.mapIds.map(id=>`<option value="${id}">${esc(mapName(id))}</option>`).join('');
  $('map-select').onchange=()=>{if(busy||pendingCommand){$<HTMLSelectElement>('map-select').value=map.id;status('Resolve the pending order before switching maps.');return;}options.showMap($<HTMLSelectElement>('map-select').value);};
  $('rules-copy').innerHTML='<p>A turn is an untimed planning opportunity. Orders resolve immediately; next turn restores authored movement points. No minutes, fuel, combat, detection or hidden information.</p><p>Six neighbors; axial distance = (|Δq| + |Δr| + |Δq+Δr|) / 2. Each step spans the displayed projected map spacing, not a fixed travel time.</p><p>Ground uses land/coast, with profile plain cost. Adjacent coast-to-coast travel is blocked unless amphibious (3 MP). Open-water amphibious travel costs 3. Vessels use ocean at 1 MP; landing craft may enter coast at 2. Reefs/lagoon are blocked for all surface/subsurface profiles; air crosses any hex at 1 MP. Elevation/depth remain unknown.</p><p>One platform per surface, air or subsurface layer per hex, regardless of force. Equipment items may share land/coast; carried items have no map position. Loading/unloading costs the carrier 1 MP, requires same force and capacity; no nested cargo. Vessels exchange at adjacent coast; air transport at the same land/coast hex. Unloaded items move next turn. Slots do not represent weight or verified fit.</p><p>Assembly stays open during play; placement creates a fresh piece. This is a trusted cooperative assembly exercise, without opposing-player permissions.</p>';
  $('setup-open').onclick=()=>{setup={...state().setup};$<HTMLInputElement>('year').value=String(state().year);$<HTMLInputElement>('demo').checked=false;$<HTMLDialogElement>('setup-dialog').showModal();};
  $('setup-close').onclick=()=>$<HTMLDialogElement>('setup-dialog').close();
  $('setup-form').onsubmit=e=>{e.preventDefault();setup={mapId:map.id,year:Number($<HTMLInputElement>('year').value),demo:$<HTMLInputElement>('demo').checked};$<HTMLDialogElement>('setup-dialog').close();preview({type:'new',setup:structuredClone(setup)});};
  $('roster-tab').onclick=()=>{switchTab(false);render();};$('catalog-tab').onclick=()=>{switchTab(true);active=null;clearDraft();render();};
  for(const id of ['search','force','eligible'])$(id).addEventListener('input',()=>{page=0;placement=false;clearDraft();renderCatalog();render();});
  $('previous').onclick=()=>{page--;renderCatalog();};$('next').onclick=()=>{page++;renderCatalog();};
  $('confirm').onclick=()=>void commit();$('cancel').onclick=cancel;$('clear').onclick=()=>{if(busy||!ready)return;active=null;clearDraft();placement=false;status('Selection cleared. Choose a piece or add one from the catalog.');render();};
  $('advance').onclick=()=>preview({type:'action',action:{type:'advance'}});
  $('finish').onclick=()=>{if(busy||pendingCommand||!ready)return;void (async()=>{busy=true;render();try{await capture.flush();const response=await fetch('/api/capture/finish',{method:'POST',headers:capture.headers(),body:JSON.stringify({mapId:map.id,runId:envelope.runId,revision:envelope.revision})});const result=await response.json();if(!response.ok)throw new Error(result.error);await table.exit();location.assign('/review.html?run='+encodeURIComponent(envelope.runId!));}catch(error){status(String(error));}finally{busy=false;render();}})();};
  $('coordinates').onsubmit=e=>{e.preventDefault();const q=Number($<HTMLInputElement>('q').value),r=Number($<HTMLInputElement>('r').value),tileId=options.tileAt(q,r),cell=map.cells.find(c=>c.id===tileId);if(cell)chooseCell(cell);else{clearDraft();status('No hex exists at those coordinates in this map.');render();}};
  $('export').onclick=()=>{try{const save={...rules.export(state()),capture:{runId:envelope.runId!,serviceRevision:envelope.revision}},url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`xriegsspiel-${state().manifest.mapId.replaceAll('/','-')}-${state().year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Save exported after exact journal replay verification.');}catch(e){status(String(e));}};
  $('import-open').onclick=()=>$<HTMLInputElement>('import').click();$('import').onchange=()=>{const input=$<HTMLInputElement>('import'),file=input.files?.[0];input.value='';if(!file)return;if(busy||!ready)return;clearDraft();if(file.size>8_000_000){status('Save exceeds the 8 MB import limit.');render();return;}void file.text().then(text=>{preview({type:'import',save:JSON.parse(text)});}).catch(()=>{status('Unable to read this JSON save.');render();});};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();if(e.key==='Enter'&&e.target===table.renderer.domElement){e.preventDefault();void commit();}});
  Object.defineProperty(window,'__playableTerrain',{value:{get diagnostics(){return{state:structuredClone(envelope),mapId:map.id,selected:active,selectedTile:selectedTile?.id,preview:draftPreview?structuredClone(draftPreview):null,placement,ready,interactionBuild:'controller-grab-2',input:table.inputDiagnostics,controllerPanel:lastPanel?{title:lastPanel.title,lines:lastPanel.lines,buttons:panelTargets(lastPanel).map(b=>({label:b.label,enabled:b.enabled!==false}))}:null,...table.stats};}}});
  root.querySelectorAll('details').forEach(detail=>detail.addEventListener('toggle',()=>{if(detail.open&&/Rules|controls/.test(detail.querySelector('summary')?.textContent??''))capture.event('help');}));
  await loading.measure('Join exercise database',()=>capture.join());
  await loading.measure('Restore map assembly',async()=>{await openMap(options.mapId);if(!ready)throw new Error(message);});
  opponent=await loading.measure('AI catalog / saved scenario',()=>initOpponentWorkspace({
    root:opponentRoot,map:id=>rules.map(id),currentMap:()=>map.id,contextChanged:renderContext,
    switchMap:async id=>{opponentMapSwitch=true;try{options.showMap(id);}finally{opponentMapSwitch=false;}await openMap(id);},selectTile:options.selectTile,focusTile:options.focusTile,
    setPieces:(...args)=>table.setScenarioPieces(...args),setPanel:presentPanel,exitXR:()=>table.exit(),
    show:()=>{table.cancelGrab();clearDraft();placement=false;bar.hidden=true;root.hidden=true;original.hidden=true;opponentRoot.hidden=false;$('pieces-tab').setAttribute('aria-pressed','false');$('terrain-tab').setAttribute('aria-pressed','false');$('opponent-tab').setAttribute('aria-pressed','true');options.openMenu();},
    hide:()=>menuTab(true),
  }));
  Object.defineProperty(window,'__opponent',{value:{get diagnostics(){return opponent?.diagnostics;}}});
  if(opponent.active)opponent.render();
  renderContext();
  await loading.finish();
  const requested=new URL(location.href).searchParams.get('piece');
  const requestedForce=new URL(location.href).searchParams.get('force');
  if(requestedForce==='red'||requestedForce==='blue')$<HTMLSelectElement>('force').value=requestedForce;
  if(ready&&requested&&rules.catalog.pieces.some(p=>p.id===requested)){switchTab(true);chooseDefinition(requested);showPieces();}
  return {openMap,chooseTile:(id:string)=>{if(!ready)return;const cell=map.cells.find(c=>c.id===id);if(cell)chooseCell(cell);},get canSwitch(){return !busy&&!pendingCommand&&!grab.active&&(!opponent?.busy||opponentMapSwitch);}};
}
