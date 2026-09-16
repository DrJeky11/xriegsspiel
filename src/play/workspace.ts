import './workspace.css';
import { GeographicRules, DEMO, symbol } from '../scenario/rules.ts';
import type { Action, Preview, Setup } from '../scenario/rules.ts';
import { neighbors } from '../pacific/terrain.ts';
import { scenarioMaps } from '../scenario/maps.ts';
import type { Geography, Cell, TerrainMap } from '../pacific/terrain.ts';
import { SURFACES } from '../pacific/terrain-table.ts';
import type { TablePanel, PanelButton } from './panel.ts';
import { editSearch, panelTargets } from './panel.ts';
import type { TablePiece } from './piece-layer.ts';
import type { PieceCatalog, PieceRules, Force } from '../pieces.ts';
import type { ScenarioState, ScenarioCommand, Operation } from '../../server/scenario-session.ts';
import piecesUrl from '../../catalog/pieces.json?url';
import rulesUrl from '../../catalog/rules.json?url';
import equipmentUrl from '../../catalog/equipment.json?url';
import review from '../scenario/variant-review.json';

export interface WorkspaceOptions {
  mapId: string; mapIds: string[];
  view: { renderer: { domElement: HTMLCanvasElement }; stats: object; setScenarioPieces:(pieces:TablePiece[],reachable:string[],path:string[],select:(id:string)=>void)=>void; setScenarioPanel:(panel:TablePanel)=>void; reset:()=>void; exit:()=>Promise<void>; scale:(factor:number)=>void };
  showMap:(id:string)=>void; selectTile:(id:string)=>void; focusTile:(id:string)=>void;
  coordinates:(id:string)=>{q:number;r:number}|undefined; tileAt:(q:number,r:number)=>string|undefined;
  openMenu:()=>void; terrainActions:()=>PanelButton[];
}
export interface PlayWorkspace { openMap:(id:string)=>Promise<void>; chooseTile:(id:string)=>void; readonly canSwitch:boolean }

interface Equipment { id:string; name:string; sourceUrl:string; origin:string; domain:string; sourceFields:Record<string,{raw:string;value:string|null}> }
export async function initPlayableWorkspace(options:WorkspaceOptions):Promise<PlayWorkspace> {
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById('play-'+id) as T;
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const json=async<T>(url:string):Promise<T>=>{const response=await fetch(url);if(!response.ok)throw new Error(`Unable to load ${url} (${response.status}).`);return response.json();};
let rules:GeographicRules, envelope:ScenarioState, map:TerrainMap;
const table=options.view;
let stream:EventSource|null=null,generation=0,ready=false;
const api=(action:string,mapId=map.id)=>`/api/maps/${action}?map=${encodeURIComponent(mapId)}`;
let active:string|null=null, selectedTile:Cell|null=null, draft:Operation|null=null, draftPreview:Preview|null=null, draftRevision=0;
let definition=DEMO[0].definitionId as string, placement=false, online=false, busy=false, pendingCommand:ScenarioCommand|null=null;
let page=0, xrPage:'main'|'cargo'|'setup'|'table'|'evidence'|'catalog'|'candidate'|'search'|'maps'|'terrain'|'filters'|'actions'='main', xrCargoPage=0;
let equipment=new Map<string,Equipment>();
let setup:Setup={mapId:options.mapId,year:2026,demo:false};
let message='Loading geographic exercise…';
const state=()=>envelope.exercise;
const piece=()=>state().pieces.find(p=>p.id===active);
const short=(id:string)=>DEMO.find(d=>d.definitionId===id)?.label??rules.lab.definition(id).name.split(' ').slice(0,3).join(' ');
const locationName=(id:string|null)=>{const c=id?options.coordinates(id):undefined;return c?`${c.q}, ${c.r}`:'Carried';};
const forceName=(force:Force)=>force==='red'?'Red / China':'Blue / United States';
const status=(text:string)=>{message=text;$('status').textContent=text;};


const original=document.querySelector<HTMLElement>('.terrain-menu-content')!;
original.id='terrain-controls';original.hidden=true;
const tabs=document.createElement('div');tabs.className='workspace-tabs';
tabs.innerHTML='<button id="play-pieces-tab" type="button" aria-pressed="true">Pieces & orders</button><button id="play-terrain-tab" type="button" aria-pressed="false">Terrain & regions</button>';
original.before(tabs);
const root=document.createElement('section');root.className='terrain-menu-content play-controls';root.id='piece-workspace';original.before(root);
root.innerHTML=`<fieldset id="play-controls" disabled>
  <p class="eyebrow">Saved map exercise</p><h2 id="play-title">Loading…</h2><p id="play-map-label" hidden></p><p id="play-scale-label" class="muted"></p>
  <label>Map<select id="play-map-select"></select></label><div class="play-meta"><span id="play-year-label">2026</span><span id="play-turn-label">Turn 1</span><button id="play-setup-open" type="button">New exercise</button></div>
  <div class="play-tabs"><button id="play-roster-tab" aria-pressed="true">Forces <span id="play-roster-count"></span></button><button id="play-catalog-tab" aria-pressed="false">Add pieces</button></div>
  <section id="play-roster" aria-label="Placed pieces"></section>
  <section id="play-catalog" hidden aria-label="Catalog assembly">
    <label>Assign to<select id="play-force"><option value="blue">Blue / United States</option><option value="red">Red / China</option></select></label>
    <label>Search equipment<input id="play-search" type="search" placeholder="Name or variant"></label>
    <label>Show<select id="play-eligible"><option value="eligible">Eligible for this year</option><option value="all">All records</option></select></label>
    <p id="play-result-count" class="muted"></p><div id="play-results"></div><div class="play-pager"><button id="play-previous">← Previous</button><button id="play-next">Next →</button></div>
  </section>
  <section class="play-inspector" aria-label="Piece inspector"><div class="play-inspector-head"><p class="eyebrow">Selection & orders</p><button id="play-clear">Clear</button></div><div id="play-details"></div><div id="play-orders"></div><div id="play-preview" aria-label="Order preview"></div></section>
  <div class="play-commit"><button id="play-confirm" disabled>Confirm order</button><button id="play-cancel" disabled>Cancel</button></div>
  <details><summary>Hex destination & keyboard</summary><form id="play-coordinates"><label>q<input id="play-q" type="number" value="0" required></label><label>r<input id="play-r" type="number" value="0" required></label><button>Preview / inspect hex</button></form><p>Map arrows and Q/E select neighbors. Enter confirms; Escape cancels.</p></details>
  <button id="play-advance" class="full">Preview next turn</button>
  <div class="play-save"><button id="play-export">Export save</button><button id="play-import-open">Import save</button><input type="file" id="play-import" accept="application/json,.json" hidden></div>
  <details><summary>Committed history <span id="play-history-count"></span></summary><ol id="play-history"></ol></details>
  <details><summary>Rules & model limits</summary><div id="play-rules-copy"></div></details>
  <p><a href="/catalog.html">Full equipment evidence & database ↗</a></p>
</fieldset><p id="play-status" role="status" aria-live="polite">Loading pieces…</p><p id="play-connection" class="muted">Connecting…</p><button id="play-retry" hidden>Retry loading map</button>
<dialog id="play-setup-dialog"><form id="play-setup-form"><p class="eyebrow">This map only</p><h2>New exercise</h2><p>Replaces this map's pieces and progress. Other maps are kept. Export first if you want a portable copy of this run.</p><label>Scenario year<input id="play-year" type="number" min="1980" max="2026" value="2026" required></label><label class="play-checkbox"><input id="play-demo" type="checkbox"> Add a demonstration roster where eligible</label><div class="play-dialog-actions"><button type="button" id="play-setup-close">Cancel</button><button>Preview new exercise</button></div></form></dialog>`;
const bar=document.createElement('div');bar.className='play-command-bar';bar.hidden=true;
bar.innerHTML='<p id="play-quick-status"></p><div><button id="play-quick-inspect">Pieces & orders</button><button id="play-quick-confirm" disabled>Confirm</button><button id="play-quick-cancel">Cancel</button></div>';
document.querySelector('.terrain-layout')!.append(bar);
function menuTab(pieces:boolean) {root.hidden=!pieces;original.hidden=pieces;$('pieces-tab').setAttribute('aria-pressed',String(pieces));$('terrain-tab').setAttribute('aria-pressed',String(!pieces));}
function showPieces(){menuTab(true);options.openMenu();}
$('pieces-tab').onclick=()=>menuTab(true);$('terrain-tab').onclick=()=>menuTab(false);
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
  if(busy||!ready)return;selectedTile=cell;options.selectTile(cell.id);const coordinate=options.coordinates(cell.id)!;$<HTMLInputElement>('q').value=String(coordinate.q);$<HTMLInputElement>('r').value=String(coordinate.r);
  if(placement)preview({type:'action',action:{type:'deploy',definitionId:definition,force:$<HTMLSelectElement>('force').value as Force,tileId:cell.id,id:`${$<HTMLSelectElement>('force').value==='blue'?'B':'R'}-${crypto.randomUUID().slice(0,8)}`}});
  else if(piece())preview({type:'action',action:{type:piece()!.carrierId?'unload':'move',pieceId:piece()!.id,tileId:cell.id}});
  else {status(`Hex ${locationName(cell.id)}: ${SURFACES[cell.terrain].note}`);render();}
}
function preview(operation:Operation) {
  if(busy||!ready)return;
  clearDraft();draft=operation;draftRevision=envelope.revision;
  try {
    if(operation.type==='action')draftPreview=rules.evaluate(state(),operation.action);
    else {
      const target=operation.type==='new'?rules.create(operation.setup):rules.import(operation.save);
      if(target.manifest.mapId!==map.id)throw new Error('This save belongs to another map. Open that map to import it.');
      draftPreview={allowed:true,cost:0,path:[],reason:`${operation.type==='new'?'Start':'Restore'} ${target.pieces.length} pieces on ${map.view.id==='focus'?map.region.focusName:map.region.name}, year ${target.year}, turn ${target.turn}. This replaces only this map's exercise; other maps are kept.`};
    }
  } catch(error) {draftPreview={allowed:false,cost:0,path:[],reason:error instanceof Error?error.message:'Invalid exercise.'};}
  status(draftPreview.reason);render();
}
async function commit() {
  if(busy||!ready||!draft||!draftPreview?.allowed)return;
  if(!online){status('Connection unavailable. Reconnect before committing; the draft has spent nothing.');return;}
  const command=pendingCommand??{id:crypto.randomUUID(),revision:draftRevision,operation:draft};pendingCommand=command;busy=true;render();
  try {
    const response=await fetch(api('command'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
    const result=await response.json();
    if(result.state)acceptState(result.state);
    if(!response.ok){clearDraft();throw new Error(result.error??'Order rejected.');}
    if(command.operation.type==='action'&&command.operation.action.type==='deploy'){active=command.operation.action.id;switchTab(false);}
    clearDraft();placement=false;xrPage='main';status(`Saved · ${result.duplicate?'Request already applied': 'Order committed'} · revision ${envelope.revision}`);
  } catch(error) {
    status(`${error instanceof Error?error.message:'Connection failed.'} ${pendingCommand?'Retry uses the same command ID; no duplicate spending.':''}`);
  } finally {busy=false;render();}
}
function acceptState(next:ScenarioState) {
  if(next.exercise.manifest.mapId!==map.id)throw new Error('Received state for another map.');
  if(envelope&&next.revision<envelope.revision)return;
  const changed=envelope&&next.revision!==envelope.revision;
  rules.assertVersion(next.exercise);envelope=next;ready=true;
  if(changed&&!busy){clearDraft();placement=false;status('Shared state updated. Review the refreshed pieces before issuing an order.');}
  if(active&&!piece()){active=null;selectedTile=null;}
  if(active){const p=piece()!,tileId=p.tileId??state().pieces.find(c=>c.id===p.carrierId)?.tileId;selectedTile=map.cells.find(c=>c.id===tileId)??null;if(selectedTile)options.selectTile(selectedTile.id);}
  if(!$('catalog').hidden)renderCatalog();render();
}
async function openMap(id:string) {
  if(busy||pendingCommand)return;
  $('retry').hidden=true;
  const ticket=++generation;stream?.close();stream=null;ready=false;online=false;clearDraft();active=null;selectedTile=null;placement=false;xrPage='main';
  envelope=undefined as unknown as ScenarioState;map=rules.map(id);setup={mapId:id,year:2026,demo:false};
  table.setScenarioPieces([],[],[],selectPiece);$<HTMLFieldSetElement>('controls').disabled=true;$<HTMLSelectElement>('map-select').value=id;bar.hidden=true;
  table.setScenarioPanel({title:'LOADING SAVED MAP',lines:[map.region.name,'Your other maps are kept.'],buttons:[]});status('Loading this map’s saved pieces…');
  try {
    const initial=await json<ScenarioState>(api('state',id));if(ticket!==generation)return;
    online=true;acceptState(initial);status('Each map saves independently. Add pieces or select a token to begin.');render();
    stream=new EventSource(api('events',id));
    stream.onopen=()=>{if(ticket===generation){online=true;render();}};
    stream.onerror=()=>{if(ticket===generation){online=false;render();}};
    stream.onmessage=e=>{if(ticket!==generation)return;try{acceptState(JSON.parse(e.data));}catch(error){online=false;status(String(error));render();}};
  } catch(error){if(ticket!==generation)return;$('retry').hidden=false;status(String(error));table.setScenarioPanel({title:'MAP COULD NOT LOAD',lines:[String(error)],buttons:[{label:'Retry loading map',run:()=>void openMap(id)}]});}
}
function candidates() {
  const force=$<HTMLSelectElement>('force').value as Force,query=$<HTMLInputElement>('search').value.trim().toLowerCase(),eligible=$<HTMLSelectElement>('eligible').value;
  return rules.catalog.pieces.filter(p=>p.name.toLowerCase().includes(query)&&(eligible==='all'||rules.eligibility(p.id,force,state().year).allowed));
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
  if(!ready||!envelope||!rules)return;
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
  table.setScenarioPieces(s.pieces.filter(p=>p.tileId!==null).map(p=>{const profile=rules.lab.profile(p);return{id:p.id,tileId:p.tileId!,force:p.force,symbol:symbol(profile.id,profile.layer),selected:p.id===active,cargo:s.pieces.filter(c=>c.carrierId===p.id).length,layer:profile.layer};}),legal,draftPreview?.allowed?draftPreview.path:[],selectPiece);
  bar.hidden=!active&&!placement&&!draft;
  $('quick-status').textContent=draftPreview?.reason??(placement?'Place '+short(definition):p?short(p.definitionId)+' · '+p.movement+' MP · choose a gold-ring hex':'');
  $<HTMLButtonElement>('quick-confirm').disabled=busy||!draftPreview?.allowed;
  $<HTMLButtonElement>('quick-cancel').disabled=busy;
  renderXR();
}
let lastPanel:TablePanel|null=null,xrCatalogPage=0;
const panelPreview=new URL(location.href).searchParams.has('controller-preview')?document.createElement('section'):null;
if(panelPreview){panelPreview.className='controller-preview';panelPreview.setAttribute('aria-label','Controller panel preview');root.append(panelPreview);}
function renderXR() {
  if(!ready)return;
  const p=piece(),profile=p?rules.lab.profile(p):null;
  const button=(label:string,run:()=>void,enabled=true):PanelButton=>({label,run,enabled:enabled&&!busy});
  const go=(page:typeof xrPage)=>{xrPage=page;renderXR();};
  const name=(id:string)=>{const m=rules.map(id);return m.view.id==='focus'?m.region.focusName:m.region.name;};
  const wrap=(text:string)=>text.match(/.{1,60}(?:\s|$)|.{1,60}/g)??[];
  const back=button('Back to pieces',()=>go('main'));
  let panel:TablePanel={title:'PIECES & ORDERS',lines:[name(map.id),`${state().year} · Turn ${state().turn} · ${state().pieces.length} pieces`,p?`${p.id} · ${forceName(p.force)}`:'Select a token or add a catalog piece',...(p?wrap(rules.lab.definition(p.definitionId).name).slice(0,2):[]),p?`${p.movement} MP · Cargo ${rules.cargoUsed(state(),p.id)} / ${profile!.cargoSlots}`:'Each map keeps its own progress',...wrap(message).slice(0,2)],buttons:[]};
  if(draft) {
    panel.title=draftPreview?.allowed?'ORDER PREVIEW':'ACTION BLOCKED';panel.lines=[name(map.id),...wrap(draftPreview?.reason??'').slice(0,5),draftPreview?.path.length?`${draftPreview.cost} MP · ${draftPreview.path.length-1} hex steps`:'Preview spends nothing'];
    panel.buttons=[button(pendingCommand?'Retry order':'Confirm order',()=>void commit(),!!draftPreview?.allowed&&online),button('Cancel preview',cancel)];
  } else if(placement) {
    panel.title='PLACE A PIECE';panel.lines=[name(map.id),...wrap(rules.lab.definition(definition).name).slice(0,3),forceName($<HTMLSelectElement>('force').value as Force),'Point at a map hex and pull the trigger.','Review the placement, then confirm.',...wrap(message).slice(0,1)];panel.buttons=[button('Cancel placement',cancel)];
  } else if(xrPage==='search') {
    panel.title='SEARCH EQUIPMENT';panel.lines=['Search all catalog records',`Search: ${$<HTMLInputElement>('search').value || '(empty)'}`,'Point at a letter and pull the trigger.','Choose Done to browse matching pieces.'];
    panel.keyboard={value:$<HTMLInputElement>('search').value,key:key=>{if(busy)return;$<HTMLInputElement>('search').value=editSearch($<HTMLInputElement>('search').value,key);page=0;renderCatalog();renderXR();},done:()=>{xrCatalogPage=0;go('catalog');}};
  } else if(xrPage==='filters') {
    panel.title='CATALOG FILTERS';panel.lines=[forceName($<HTMLSelectElement>('force').value as Force),`Year ${state().year}`,`Search: ${$<HTMLInputElement>('search').value||'All names'}`,$<HTMLSelectElement>('eligible').value==='all'?'Showing all records, including unavailable':'Showing eligible records only'];
    panel.buttons=[button('Search with keyboard',()=>go('search')),button('Switch Red / Blue',()=>{$<HTMLSelectElement>('force').value=$<HTMLSelectElement>('force').value==='blue'?'red':'blue';page=0;xrCatalogPage=0;renderCatalog();renderXR();}),button('Toggle eligible / all records',()=>{$<HTMLSelectElement>('eligible').value=$<HTMLSelectElement>('eligible').value==='all'?'eligible':'all';page=0;xrCatalogPage=0;renderCatalog();renderXR();}),button('Clear search',()=>{$<HTMLInputElement>('search').value='';page=0;xrCatalogPage=0;renderCatalog();renderXR();}),button('Browse results',()=>go('catalog')),back];
  } else if(xrPage==='catalog') {
    const list=candidates();xrCatalogPage=Math.max(0,Math.min(xrCatalogPage,Math.ceil(list.length/3)-1));
    panel.title='ADD CATALOG PIECES';panel.lines=[forceName($<HTMLSelectElement>('force').value as Force),`${list.length} records · page ${xrCatalogPage+1} of ${Math.max(1,Math.ceil(list.length/3))}`,`Search: ${$<HTMLInputElement>('search').value||'All names'}`,'Select a record to inspect and place it.'];
    panel.buttons=list.slice(xrCatalogPage*3,xrCatalogPage*3+3).map(d=>button(d.name,()=>{xrPage='candidate';chooseDefinition(d.id);}));
    panel.buttons.push(button('Previous results',()=>{xrCatalogPage--;renderXR();},xrCatalogPage>0),button('Next results',()=>{xrCatalogPage++;renderXR();},(xrCatalogPage+1)*3<list.length),button('Search & filters',()=>go('filters')),back);
  } else if(xrPage==='candidate') {
    const d=rules.lab.definition(definition),pr=rules.lab.profiles.get(d.profileId)!,eligible=rules.eligibility(d.id,$<HTMLSelectElement>('force').value as Force,state().year);
    panel.title='CATALOG SELECTION';panel.lines=[...wrap(d.name).slice(0,3),forceName($<HTMLSelectElement>('force').value as Force),`${pr.movement} MP · ${pr.label}`,`Cargo ${pr.cargoSlots} slots · Load size ${d.loadSlots}`,...wrap(eligible.reason).slice(0,2)];
    panel.buttons=[button('Place this piece',beginPlacement,eligible.allowed),button('Source evidence',()=>go('evidence')),button('Back to catalog',()=>go('catalog'))];
  } else if(xrPage==='maps') {
    panel.title='MAPS & TERRAIN';panel.lines=[name(map.id),'Switching maps keeps their pieces and progress.','Regions in this workspace open inside VR/MR.','The other workspace opens after exiting immersion.'];
    panel.buttons=options.mapIds.map(id=>button(name(id),()=>{if(id===map.id){go('main');return;}options.showMap(id);}));
    const other=map.id.includes('/')?'CENTCOM':'Pacific';
    panel.buttons.push(button('Terrain controls',()=>go('terrain')),button(`Open ${other} workspace`,()=>{void table.exit().then(()=>location.assign(other==='Pacific'?'/pacific.html':'/centcom.html'));}),back);
  } else if(xrPage==='terrain') {
    panel.title='TERRAIN CONTROLS';panel.lines=[name(map.id),'Display changes keep game positions and budgets.','Relief is illustrative; elevation and depth unknown.'];panel.buttons=[...options.terrainActions().map(b=>({...b,enabled:!busy})),back];
  } else if(xrPage==='setup') {
    panel.title='NEW EXERCISE / THIS MAP';panel.lines=[name(map.id),`Year ${setup.year}`,setup.demo?'Demonstration roster where eligible':'Empty exercise','Replaces this map’s pieces and progress.','Your other maps are kept.','Export this run in the browser to keep a portable copy.'];
    const year=(delta:number)=>{setup.year=Math.max(1980,Math.min(2026,setup.year+delta));renderXR();};
    panel.buttons=[button('Earlier year −1',()=>year(-1)),button('Later year +1',()=>year(1)),button('Earlier decade −10',()=>year(-10)),button('Later decade +10',()=>year(10)),button('Toggle demonstration roster',()=>{setup.demo=!setup.demo;renderXR();}),button('Preview new exercise',()=>preview({type:'new',setup:structuredClone(setup)})),back];
  } else if(xrPage==='table') {
    panel.title='TABLE & EXERCISE';panel.buttons=[button('Smaller table',()=>table.scale(.8)),button('Larger table',()=>table.scale(1.25)),button('Recenter table',()=>table.reset()),button('New exercise on this map',()=>{setup={mapId:map.id,year:state().year,demo:false};go('setup');}),back,button('Exit VR / MR',()=>void table.exit())];
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
  } else panel.buttons=[button('Add pieces',()=>{switchTab(true);active=null;xrPage='catalog';render();}),button('Select next piece',()=>{const pieces=state().pieces;if(pieces.length)selectPiece(pieces[(pieces.findIndex(p=>p.id===active)+1)%pieces.length].id);},state().pieces.length>0),button('Cargo / load / unload',()=>{xrCargoPage=0;go('cargo');},!!p),button('Actions & next turn',()=>go('actions')),button('Maps & terrain',()=>go('maps')),button('Table & exercise',()=>go('table'))];
  lastPanel=panel;table.setScenarioPanel(panel);
  if(panelPreview){panelPreview.innerHTML=`<h3>Controller panel preview</h3><strong>${esc(panel.title)}</strong><p>${panel.lines.map(esc).join('<br>')}</p>`;for(const target of panelTargets(panel)){const b=document.createElement('button');b.textContent=target.label;b.disabled=target.enabled===false;b.onclick=target.run;panelPreview.append(b);}}
}

function cancel() {if(busy||!ready)return;clearDraft();placement=false;status('Preview cancelled. No movement or cargo was spent.');render();}
  const [catalog,profiles,research,regional,shoal,senkaku]=await Promise.all([json<PieceCatalog>(piecesUrl),json<PieceRules>(rulesUrl),json<{equipment:Equipment[]}>(equipmentUrl),json<Geography>('/terrain/pacific/regional-land.json'),json<Geography>('/terrain/pacific/shoal-detail.json'),json<Geography>('/terrain/pacific/senkaku-detail.json')]);
  rules=new GeographicRules(catalog,profiles,scenarioMaps({regional,shoal,senkaku}));equipment=new Map(research.equipment.map(e=>[e.id,e]));
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
  $('coordinates').onsubmit=e=>{e.preventDefault();const q=Number($<HTMLInputElement>('q').value),r=Number($<HTMLInputElement>('r').value),tileId=options.tileAt(q,r),cell=map.cells.find(c=>c.id===tileId);if(cell)chooseCell(cell);else{clearDraft();status('No hex exists at those coordinates in this map.');render();}};
  $('export').onclick=()=>{try{const save=rules.export(state()),url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`xriegsspiel-${state().manifest.mapId.replaceAll('/','-')}-${state().year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Save exported after exact journal replay verification.');}catch(e){status(String(e));}};
  $('import-open').onclick=()=>$<HTMLInputElement>('import').click();$('import').onchange=()=>{const input=$<HTMLInputElement>('import'),file=input.files?.[0];input.value='';if(!file)return;if(busy||!ready)return;clearDraft();if(file.size>8_000_000){status('Save exceeds the 8 MB import limit.');render();return;}void file.text().then(text=>{preview({type:'import',save:JSON.parse(text)});}).catch(()=>{status('Unable to read this JSON save.');render();});};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();if(e.key==='Enter'&&e.target===table.renderer.domElement){e.preventDefault();void commit();}});
  Object.defineProperty(window,'__playableTerrain',{value:{get diagnostics(){return{state:structuredClone(envelope),mapId:map.id,selected:active,selectedTile:selectedTile?.id,preview:draftPreview?structuredClone(draftPreview):null,placement,ready,controllerPanel:lastPanel?{title:lastPanel.title,lines:lastPanel.lines,buttons:panelTargets(lastPanel).map(b=>({label:b.label,enabled:b.enabled!==false}))}:null,...table.stats};}}});
  await openMap(options.mapId);
  const requested=new URL(location.href).searchParams.get('piece');
  const requestedForce=new URL(location.href).searchParams.get('force');
  if(requestedForce==='red'||requestedForce==='blue')$<HTMLSelectElement>('force').value=requestedForce;
  if(ready&&requested&&rules.catalog.pieces.some(p=>p.id===requested)){switchTab(true);chooseDefinition(requested);showPieces();}
  return {openMap,chooseTile:(id:string)=>{if(!ready)return;const cell=map.cells.find(c=>c.id===id);if(cell)chooseCell(cell);},get canSwitch(){return !busy&&!pendingCommand;}};
}
