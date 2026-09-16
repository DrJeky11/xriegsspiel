import './style.css';
import { GeographicRules, DEMO, symbol } from './rules.ts';
import type { Exercise, Action, Preview, Setup } from './rules.ts';
import { neighbors } from '../pacific/terrain.ts';
import { scenarioMaps, DEFAULT_MAP } from './maps.ts';
import type { Geography, Cell, TerrainMap } from '../pacific/terrain.ts';
import { TerrainTable, SURFACES } from '../pacific/terrain-table.ts';
import type { TablePanel } from '../pacific/terrain-table.ts';
import type { PieceCatalog, PieceRules, Force } from '../pieces.ts';
import type { ScenarioState, ScenarioCommand, Operation } from '../../server/scenario-session.ts';
import piecesUrl from '../../catalog/pieces.json?url';
import rulesUrl from '../../catalog/rules.json?url';
import equipmentUrl from '../../catalog/equipment.json?url';
import review from './variant-review.json';

interface Equipment { id:string; name:string; sourceUrl:string; origin:string; domain:string; sourceFields:Record<string,{raw:string;value:string|null}> }
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const json=async<T>(url:string):Promise<T>=>{const response=await fetch(url);if(!response.ok)throw new Error(`Unable to load ${url} (${response.status}).`);return response.json();};
let rules:GeographicRules, table:TerrainTable, envelope:ScenarioState, map:TerrainMap;
let active:string|null=null, selectedTile:Cell|null=null, draft:Operation|null=null, draftPreview:Preview|null=null, draftRevision=0;
let definition=DEMO[0].definitionId as string, placement=false, online=false, busy=false, pendingCommand:ScenarioCommand|null=null;
let page=0, xrPage:'main'|'cargo'|'setup'|'table'|'evidence'='main', xrCargoPage=0;
let equipment=new Map<string,Equipment>();
let setup:Setup={mapId:DEFAULT_MAP,year:2026,demo:true};
let message='Loading geographic exercise…';
const state=()=>envelope.exercise;
const piece=()=>state().pieces.find(p=>p.id===active);
const short=(id:string)=>DEMO.find(d=>d.definitionId===id)?.label??rules.lab.definition(id).name.split(' ').slice(0,3).join(' ');
const locationName=(id:string|null)=>{const c=map.cells.find(c=>c.id===id);return c?`${c.q}, ${c.r}`:'Carried';};
const forceName=(force:Force)=>force==='red'?'Red / China':'Blue / United States';
const status=(text:string)=>{message=text;$('status').textContent=text;};

$('app').innerHTML=`
<header><a class="brand" href="/">⌖ XRiegsspiel</a><nav aria-label="Workspaces"><a href="/scenario.html" aria-current="page">Geographic tabletop</a><a href="/catalog.html">Catalog</a><a href="/pacific.html">Pacific</a><a href="/centcom.html">CENTCOM</a><a href="/">Island exercise</a></nav><div class="xr"><button id="vr" disabled>Enter VR</button><button id="mr" disabled>Enter MR</button></div></header>
<main><aside class="roster-pane" aria-label="Scenario and forces">
  <p class="eyebrow">Geographic exercise / 01</p><h1 id="title">Western Senkaku</h1><p class="brief">Authored training setup. Positions are not claims about actual deployments.</p>
  <div class="meta"><span id="year-label">2026</span><span id="turn-label">Turn 1</span></div>
  <button id="setup-open" class="full">Map & year / New exercise</button>
  <div class="tabs"><button id="roster-tab" aria-pressed="true">Forces <span id="roster-count"></span></button><button id="catalog-tab" aria-pressed="false">Add pieces</button></div>
  <section id="roster" aria-label="Placed pieces"></section>
  <section id="catalog" hidden aria-label="Catalog assembly">
    <label>Assign to<select id="force"><option value="blue">Blue / United States</option><option value="red">Red / China</option></select></label>
    <label>Search all 1,607 records<input id="search" type="search" placeholder="Name or variant"></label>
    <label>Show<select id="eligible"><option value="eligible">Eligible for scenario year</option><option value="all">All records, including unknowns</option></select></label>
    <p id="result-count" class="muted"></p><div id="results"></div><div class="pager"><button id="previous">← Previous</button><button id="next">Next →</button></div>
  </section>
  <div class="save-tools"><button id="export">Export save ↓</button><button id="import-open">Import save ↑</button><input type="file" id="import" accept="application/json,.json" hidden></div>
  <p class="muted" id="connection">Connecting…</p>
</aside>
<section class="workspace" aria-label="Geographic tabletop">
  <div id="viewport"></div><div class="map-label"><span id="map-label"></span><small id="scale-label"></small></div>
  <div class="view-tools"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="focus-piece">Focus piece</button><button id="fit">Fit map</button><button id="top">Top view</button><button id="labels" aria-pressed="false">Place labels</button></div>
  <div class="map-legend"><span>□ Blue · ◇ Red</span><span>▰ Ground · ⚓ Sea · ✈ Air · ▧ Item</span><span>Gold rings: legal destinations · Line: draft route</span></div>
  <div class="attribution"><a href="https://www.naturalearthdata.com/">Natural Earth</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors · ODbL</a></div>
</section>
<aside class="inspector" aria-label="Piece inspector">
  <div class="inspector-head"><p class="eyebrow">Selection & orders</p><button id="clear">Clear</button></div>
  <div id="details"><h2>Select a piece</h2></div>
  <section id="orders" aria-label="Available actions"></section>
  <div id="preview" aria-label="Order preview"></div>
  <p id="status" role="status" aria-live="polite">Loading geographic exercise…</p>
  <div id="commit-bar"><button id="confirm" class="primary" disabled>Confirm order</button><button id="cancel" disabled>Cancel</button></div>
  <details><summary>Hex destination & keyboard</summary><form id="coordinates"><label>q<input id="q" type="number" value="0" required></label><label>r<input id="r" type="number" value="0" required></label><button>Preview / inspect hex</button></form><p>Choose a roster entry using Tab + Enter. Focus the map; arrows and Q/E select six neighbors. Enter confirms; Escape cancels. Right-drag rotates, middle-drag pans, wheel zooms.</p></details>
  <button id="advance" class="full">Preview next turn</button>
  <details><summary>Committed history <span id="history-count"></span></summary><ol id="history"></ol></details>
  <details><summary>Rules & model limits</summary><div id="rules-copy"></div></details>
</aside></main>
<dialog id="setup-dialog"><form id="setup-form"><p class="eyebrow">Exercise setup</p><h2>Choose a map & year</h2><p>Preview a new exercise. Export the current exercise if you want to return to it later; previous runs also remain in the server journal.</p><label>Geographic map<select id="map"></select></label><label>Scenario year<input id="year" type="number" min="1980" max="2026" value="2026" required></label><label class="checkbox"><input id="demo" type="checkbox" checked> Add the authored demonstration roster where eligible and terrain supports it</label><p class="muted">One piece represents one platform or equipment item. Force assignments and dates are provisional evidence, not a historical order of battle.</p><div class="dialog-actions"><button type="button" id="setup-close">Cancel</button><button class="primary">Preview new exercise</button></div></form></dialog>`;

function switchTab(catalog:boolean) {
  $('catalog').hidden=!catalog;$('roster').hidden=catalog;
  $('catalog-tab').setAttribute('aria-pressed',String(catalog));$('roster-tab').setAttribute('aria-pressed',String(!catalog));
  if(catalog)renderCatalog();
}
function clearDraft() {draft=null;draftPreview=null;pendingCommand=null;}
function selectPiece(id:string) {
  if(busy)return;active=id;placement=false;clearDraft();xrPage='main';
  const p=piece();selectedTile=map.cells.find(c=>c.id===(p?.tileId??state().pieces.find(c=>c.id===p?.carrierId)?.tileId))??null;
  if(selectedTile)table.select(selectedTile);status('Legal destinations are marked. Choose a hex to preview movement; carried items preview unloading.');render();
}
function chooseCell(cell:Cell) {
  if(busy)return;selectedTile=cell;table.select(cell);$<HTMLInputElement>('q').value=String(cell.q);$<HTMLInputElement>('r').value=String(cell.r);
  if(placement)preview({type:'action',action:{type:'deploy',definitionId:definition,force:$<HTMLSelectElement>('force').value as Force,tileId:cell.id,id:`${$<HTMLSelectElement>('force').value==='blue'?'B':'R'}-${crypto.randomUUID().slice(0,8)}`}});
  else if(piece())preview({type:'action',action:{type:piece()!.carrierId?'unload':'move',pieceId:piece()!.id,tileId:cell.id}});
  else {status(`Hex ${cell.q}, ${cell.r}: ${SURFACES[cell.terrain].note}`);render();}
}
function preview(operation:Operation) {
  if(busy)return;
  clearDraft();draft=operation;draftRevision=envelope.revision;
  try {
    if(operation.type==='action')draftPreview=rules.evaluate(state(),operation.action);
    else {
      const target=operation.type==='new'?rules.create(operation.setup):rules.import(operation.save);
      draftPreview={allowed:true,cost:0,path:[],reason:`${operation.type==='new'?'Start':'Restore'} ${target.pieces.length} pieces on ${rules.map(target.manifest.mapId).region.name}, year ${target.year}, turn ${target.turn}. This replaces the active geographic exercise.`};
    }
  } catch(error) {draftPreview={allowed:false,cost:0,path:[],reason:error instanceof Error?error.message:'Invalid exercise.'};}
  status(draftPreview.reason);render();
}
async function commit() {
  if(busy||!draft||!draftPreview?.allowed)return;
  if(!online){status('Connection unavailable. Reconnect before committing; the draft has spent nothing.');return;}
  const command=pendingCommand??{id:crypto.randomUUID(),revision:draftRevision,operation:draft};pendingCommand=command;busy=true;render();
  try {
    const response=await fetch('/api/scenario/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)});
    const result=await response.json();
    if(result.state)acceptState(result.state);
    if(!response.ok){clearDraft();throw new Error(result.error??'Order rejected.');}
    clearDraft();placement=false;status(`Saved · ${result.duplicate?'Request already applied': 'Order committed'} · revision ${envelope.revision}`);
  } catch(error) {
    status(`${error instanceof Error?error.message:'Connection failed.'} ${pendingCommand?'Retry uses the same command ID; no duplicate spending.':''}`);
  } finally {busy=false;render();}
}
function acceptState(next:ScenarioState) {
  if(envelope&&next.revision<envelope.revision)return;
  const changed=envelope&&next.revision!==envelope.revision;
  rules.assertVersion(next.exercise);
  const mapChanged=!map||map.id!==next.exercise.manifest.mapId;
  envelope=next;
  if(mapChanged){map=rules.map(state().manifest.mapId);table.setMap(map);table.setLabels(false);table.reset();selectedTile=null;}
  if(changed&&!busy){clearDraft();placement=false;status('Shared state updated. Previews were cleared; review before issuing another order.');}
  if(active&&!piece())active=null;
  if(!$('catalog').hidden)renderCatalog();render();
}
function renderCatalog() {
  if(!rules)return;
  const force=$<HTMLSelectElement>('force').value as Force,query=$<HTMLInputElement>('search').value.toLowerCase(),eligible=$<HTMLSelectElement>('eligible').value;
  const list=rules.catalog.pieces.filter(p=>p.name.toLowerCase().includes(query)&&(eligible==='all'||rules.eligibility(p.id,force,state().year).allowed));
  page=Math.min(page,Math.max(0,Math.ceil(list.length/8)-1));
  $('result-count').textContent=`${list.length.toLocaleString()} records · year ${state().year} · page ${page+1}`;
  $('results').innerHTML=list.slice(page*8,page*8+8).map(p=>{const allowed=rules.eligibility(p.id,force,state().year).allowed;return `<button class="catalog-row ${p.id===definition?'selected':''}" data-definition="${p.id}"><strong>${esc(p.name)}</strong><small>${esc(p.profileId)} · ${p.eraEvidence.reportedYear??'Date unknown'} ${allowed?'':'· REVIEW'}</small></button>`;}).join('');
  $('results').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{active=null;definition=b.dataset.definition!;placement=false;clearDraft();renderCatalog();render();});
  $<HTMLButtonElement>('previous').disabled=page===0;$<HTMLButtonElement>('next').disabled=(page+1)*8>=list.length;
}
function render() {
  if(!envelope||!rules)return;
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
  $('details').innerHTML=inspected?`<p class="force-label">${p?forceName(p.force):'Catalog candidate'} ${p?`· ${esc(p.id)}`:''}</p><h2>${esc(d.name)}</h2><p class="piece-location">${p?(p.carrierId?`Carried by ${esc(p.carrierId)}`:`Hex ${locationName(p.tileId)} · ${profile.layer} layer`):esc(rules.eligibility(d.id,$<HTMLSelectElement>('force').value as Force,s.year).reason)}</p><div class="values"><div><strong>${p?p.movement:profile.movement}<small> / ${profile.movement}</small></strong><span>Movement points</span></div><div><strong>${p?rules.cargoUsed(s,p.id):0}<small> / ${profile.cargoSlots}</small></strong><span>Cargo slots used</span></div></div><p class="authored">Authored game values · ${esc(profile.label)} · load size ${d.loadSlots} slots. ${profile.movement===0?'Transport required to relocate.':''}</p><details id="source-facts"><summary>Source evidence & variant review</summary><p><strong>ODIN source facts</strong><br>Reported introduction: ${esc(d.eraEvidence.raw)}<br>Origin: ${esc(fact?.origin??'Unknown')}<br>Operator evidence: ${esc(d.forceEvidence.map(e=>`${e.force}: ${e.basis}`).join('; '))}</p><p>${esc(note?.note??'Exact operator service interval and retirement have not been reviewed. Catalog classification is provisional.')}</p>${note?.sources.map(source=>`<p><a href="${esc(source.url)}" target="_blank" rel="noreferrer">${esc(source.label)} ↗</a> · ${esc(source.locator)}</p>`).join('')??''}<p>Source specifications never set movement or combat values. Raw ODIN fields can describe components and omit units.</p>${fact?`<a href="${esc(fact.sourceUrl)}" target="_blank" rel="noreferrer">ODIN equipment record ↗</a><dl class="facts">${Object.entries(fact.sourceFields).slice(0,8).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v.value??`Unknown (${v.raw})`)}</dd>`).join('')}</dl>`:''}<p><a href="/catalog.html">Open full equipment facts and components →</a></p></details>`:'<h2>Select a piece</h2><p>Choose a token or roster entry. Legal destinations and restrictions appear immediately.</p>';
  let legal:string[]=[];
  if(p){if(p.carrierId){const at=map.cells.find(c=>c.id===s.pieces.find(c=>c.id===p.carrierId)?.tileId);legal=at?[at,...neighbors(map,at)].filter(c=>rules.evaluate(s,{type:'unload',pieceId:p.id,tileId:c.id}).allowed).map(c=>c.id):[];}else legal=[...rules.reachable(s,p.id).keys()].filter(id=>id!==p.tileId);}
  const movementHelp=legal.length?(p?.carrierId?'Choose a marked hex beside the carrier to preview unloading.':'Choose a gold-ring hex to preview movement.'):(p?.carrierId?'No legal unloading destination: check carrier points, shoreline and occupied layers.':profile.movement===0?'This piece requires transport to relocate.':p?.movement===0?'No movement points remain. Advance the turn to refresh the budget.':'No legal destination within the budget and free layers. Ordinary ground cannot cross coast-to-coast edges.');
  const cargo=p?s.pieces.filter(c=>c.carrierId===p.id):[];
  $('orders').innerHTML=p?`<h3>Available actions</h3><p>${movementHelp} ${profile.layer==='air'?'Air is an abstract layer; no basing or endurance is modeled.':''}</p><button id="hold">Preview hold</button>${cargo.length?`<p><strong>Cargo manifest</strong></p>${cargo.map(c=>`<button class="cargo-row" data-cargo="${esc(c.id)}">▧ ${esc(c.id)} · ${esc(short(c.definitionId))} → Unload</button>`).join('')}` : ''}${!p.carrierId?`<label>Load selected piece into<select id="carrier"><option value="">Choose carrier</option>${s.pieces.filter(c=>c.id!==p.id&&c.force===p.force&&rules.lab.profile(c).cargoSlots>0).map(c=>`<option value="${esc(c.id)}">${esc(c.id)} · ${esc(short(c.definitionId))}</option>`).join('')}</select></label><button id="load">Preview load</button>`:''}`:!$('catalog').hidden?`<button id="place" class="primary full">${placement?'Placement active · choose a hex':'Place an instance'}</button><p>Placement is validated before commitment. Repeat to add multiple instances.</p>`:'';
  $('hold')?.addEventListener('click',()=>preview({type:'action',action:{type:'hold',pieceId:active!}}));
  $('load')?.addEventListener('click',()=>preview({type:'action',action:{type:'load',pieceId:active!,carrierId:$<HTMLSelectElement>('carrier').value}}));
  $('orders').querySelectorAll<HTMLButtonElement>('[data-cargo]').forEach(b=>b.onclick=()=>selectPiece(b.dataset.cargo!));
  $('place')?.addEventListener('click',()=>{const e=rules.eligibility(d.id,$<HTMLSelectElement>('force').value as Force,s.year);if(!e.allowed){status(e.reason);return;}placement=true;clearDraft();status('Placement active. Choose a map hex or enter q/r, then confirm the new instance.');render();});
  $('preview').innerHTML=draftPreview?`<h3>${draftPreview.allowed?'Order preview':'Action blocked'}</h3><p>${esc(draftPreview.reason)}</p>${draftPreview.path.length>1?`<p>${draftPreview.path.length-1} hex steps · ${((draftPreview.path.length-1)*map.view.hexKm).toFixed(2)} projected km · ${draftPreview.cost} MP</p><p class="route">${draftPreview.path.map(id=>locationName(id)).join(' → ')}</p>`:''}<small>Previewing and cancelling spend nothing.</small>`:selectedTile?`<p>Hex ${selectedTile.q}, ${selectedTile.r} · ${SURFACES[selectedTile.terrain].name}<br>Depth / elevation: unknown</p>`:'';
  $<HTMLButtonElement>('confirm').disabled=busy||!draftPreview?.allowed;$<HTMLButtonElement>('cancel').disabled=busy||!draft;
  $('confirm').textContent=busy?'Saving…':pendingCommand?'Retry order':'Confirm order';
  $('history-count').textContent=String(s.events.length);$('history').innerHTML=s.events.slice(-30).reverse().map(e=>`<li><strong>${e.revision} · Turn ${e.turn} · ${esc(e.action.type)}</strong> ${esc('pieceId' in e.action?e.action.pieceId:e.action.type==='deploy'?e.action.id:'')}<p>${esc(e.explanation)}</p></li>`).join('');
  table.setScenarioPieces(s.pieces.filter(p=>p.tileId!==null).map(p=>{const profile=rules.lab.profile(p);return{id:p.id,tileId:p.tileId!,force:p.force,symbol:symbol(profile.id,profile.layer),selected:p.id===active,cargo:s.pieces.filter(c=>c.carrierId===p.id).length,layer:profile.layer};}),legal,draftPreview?.allowed?draftPreview.path:[],selectPiece);
  renderXR();
}
function renderXR() {
  const p=piece(),profile=p?rules.lab.profile(p):null;
  let panel:TablePanel={title:'XRIEGSSPIEL / GEOGRAPHIC',lines:[`${map.region.name} · ${state().year} · Turn ${state().turn}`,p?`${p.id} / ${forceName(p.force)}`:'Choose a token with the controller trigger',p?rules.lab.definition(p.definitionId).name:'Full information · Shared cooperative control',p?`${p.movement} MP remain · Cargo ${rules.cargoUsed(state(),p.id)} / ${profile!.cargoSlots}`:'Setup, select, preview, confirm',p?.carrierId?`Carried by ${p.carrierId} · choose an unload hex`:'Gold rings = legal destinations',message.slice(0,80),message.slice(80,160),message.slice(160,240)],buttons:[]};
  const button=(label:string,run:()=>void)=>({label,run});
  if(draft){panel.title=draftPreview?.allowed?'ORDER PREVIEW':'ACTION BLOCKED';panel.buttons=[...(draftPreview?.allowed?[button(busy?'Saving…':'Confirm order',()=>void commit())]:[]),button('Cancel preview',cancel)];}
  else if(xrPage==='setup') {
    panel.title='NEW EXERCISE SETUP';panel.lines=[rules.map(setup.mapId).region.name,setup.mapId,`Year ${setup.year}`,setup.demo?'Authored demonstration roster':'Empty exercise','Creates a new active geographic exercise.','Export first on browser to keep a portable save.','Catalog search is available in the browser.'];
    panel.buttons=[button('Next map',()=>{const ids=[...rules.maps.keys()];setup.mapId=ids[(ids.indexOf(setup.mapId)+1)%ids.length];renderXR();}),button('Earlier year −1',()=>{setup.year=Math.max(1980,setup.year-1);renderXR();}),button('Later year +1',()=>{setup.year=Math.min(2026,setup.year+1);renderXR();}),button('Toggle demonstration roster',()=>{setup.demo=!setup.demo;renderXR();}),button('Preview new exercise',()=>preview({type:'new',setup:structuredClone(setup)})),button('Back',()=>{xrPage='main';renderXR();})];
  } else if(xrPage==='table') {
    panel.title='TABLE & EXERCISE';panel.buttons=[button('Smaller table',()=>table.scale(.8)),button('Larger table',()=>table.scale(1.25)),button('Recenter table',()=>table.reset()),button('New exercise setup',()=>{xrPage='setup';renderXR();}),button('Back to selection',()=>{xrPage='main';renderXR();}),button('Exit immersive view',()=>void table.exit())];
  } else if(xrPage==='evidence') {
    const note=review.records.find(r=>r.definitionId===p?.definitionId),d=p?rules.lab.definition(p.definitionId):null;
    const text=note?.note??'Historical service dates and classification remain provisional. Review detailed source records in the browser catalog.';
    panel.title='SOURCE EVIDENCE';panel.lines=[d?`ODIN introduction: ${d.eraEvidence.raw}`:'Select a piece to inspect its source',...text.match(/.{1,65}(?:\s|$)/g)??[], 'Game movement / cargo are separately authored.'];panel.buttons=[button('Back',()=>{xrPage='main';renderXR();})];
  } else if(xrPage==='cargo'&&p) {
    const actions:{label:string;action?:Action;id?:string}[]=state().pieces.filter(c=>c.carrierId===p.id).map(c=>({label:`Unload ${c.id} / ${short(c.definitionId)}`,id:c.id}));
    if(profile!.cargoSlots)for(const c of state().pieces.filter(c=>c.force===p.force&&c.id!==p.id&&!c.carrierId))actions.push({label:`Load ${c.id} into ${p.id}`,action:{type:'load',pieceId:c.id,carrierId:p.id}});
    else if(!p.carrierId)for(const c of state().pieces.filter(c=>c.force===p.force&&rules.lab.profile(c).cargoSlots>0&&!c.carrierId))actions.push({label:`Load ${p.id} into ${c.id}`,action:{type:'load',pieceId:p.id,carrierId:c.id}});
    panel.title='TRANSPORT / SELECT A PREVIEW';panel.buttons=actions.slice(xrCargoPage*4,xrCargoPage*4+4).map(a=>button(a.label,()=>a.id?selectPiece(a.id):preview({type:'action',action:a.action!})));
    if(actions.length>4)panel.buttons.push(button('More cargo choices',()=>{xrCargoPage=(xrCargoPage+1)%Math.ceil(actions.length/4);renderXR();}));
    panel.buttons.push(button('Back',()=>{xrPage='main';renderXR();}));
  } else panel.buttons=[button('Select next piece',()=>{const pieces=state().pieces;if(pieces.length)selectPiece(pieces[(pieces.findIndex(p=>p.id===active)+1)%pieces.length].id);}),button('Cargo / load / unload',()=>{xrPage='cargo';xrCargoPage=0;renderXR();}),button('Preview hold',()=>p&&preview({type:'action',action:{type:'hold',pieceId:p.id}})),button('Preview next turn',()=>preview({type:'action',action:{type:'advance'}})),button('Source evidence',()=>{xrPage='evidence';renderXR();}),button('Table & setup',()=>{xrPage='table';renderXR();})];
  table.setScenarioPanel(panel);
}
function cancel() {if(busy)return;clearDraft();placement=false;status('Preview cancelled. No movement or cargo was spent.');render();}
async function start() {
  const [catalog,profiles,research,regional,shoal,senkaku,initial]=await Promise.all([json<PieceCatalog>(piecesUrl),json<PieceRules>(rulesUrl),json<{equipment:Equipment[]}>(equipmentUrl),json<Geography>('/terrain/pacific/regional-land.json'),json<Geography>('/terrain/pacific/shoal-detail.json'),json<Geography>('/terrain/pacific/senkaku-detail.json'),json<ScenarioState>('/api/scenario/state')]);
  rules=new GeographicRules(catalog,profiles,scenarioMaps({regional,shoal,senkaku}));equipment=new Map(research.equipment.map(e=>[e.id,e]));
  table=new TerrainTable($('viewport'),{select:chooseCell,nextRegion:()=>{},toggleFocus:()=>{},mode:active=>document.body.classList.toggle('xr-active',active)});
  $('map').innerHTML=[...rules.maps.values()].map(m=>`<option value="${m.id}">${esc(m.view.id==='focus'?m.region.focusName:m.region.name)} · ${m.view.hexKm} km hexes</option>`).join('');
  online=true;acceptState(initial);status('Choose a piece to see legal destinations. Orders save automatically; export a portable copy to reopen another time.');
  const stream=new EventSource('/api/scenario/events');stream.onopen=()=>{online=true;render();};stream.onerror=()=>{online=false;render();};stream.onmessage=e=>{try{acceptState(JSON.parse(e.data));}catch(error){online=false;status(error instanceof Error?error.message:'State mismatch.');}};
  $('rules-copy').innerHTML='<p>A turn is an untimed planning opportunity. Orders resolve immediately; next turn restores authored movement points. No minutes, fuel, combat, detection or hidden information.</p><p>Six neighbors; axial distance = (|Δq| + |Δr| + |Δq+Δr|) / 2. Each step spans the displayed projected map spacing, not a fixed travel time.</p><p>Ground uses land/coast, with profile plain cost. Adjacent coast-to-coast travel is blocked unless amphibious (3 MP). Open-water amphibious travel costs 3. Vessels use ocean at 1 MP; landing craft may enter coast at 2. Reefs/lagoon are blocked for all surface/subsurface profiles; air crosses any hex at 1 MP. Elevation/depth remain unknown.</p><p>One platform per surface, air or subsurface layer per hex, regardless of force. Equipment items may share land/coast; carried items have no map position. Loading/unloading costs the carrier 1 MP, requires same force and capacity; no nested cargo. Vessels exchange at adjacent coast; air transport at the same land/coast hex. Unloaded items move next turn. Slots do not represent weight or verified fit.</p><p>Assembly stays open during play; placement creates a fresh piece. This is a trusted cooperative assembly exercise, without opposing-player permissions.</p>';
  for(const [id,mode] of [['vr','immersive-vr'],['mr','immersive-ar']] as const){$(id).onclick=()=>void table.enter(mode).catch(e=>status(e.message));navigator.xr?.isSessionSupported(mode).then(s=>{$<HTMLButtonElement>(id).disabled=!s;}).catch(()=>{});}
  $('setup-open').onclick=()=>{setup={...state().setup};$<HTMLSelectElement>('map').value=setup.mapId;$<HTMLInputElement>('year').value=String(setup.year);$<HTMLInputElement>('demo').checked=setup.demo;$<HTMLDialogElement>('setup-dialog').showModal();};
  $('setup-close').onclick=()=>$<HTMLDialogElement>('setup-dialog').close();
  $('setup-form').onsubmit=e=>{e.preventDefault();setup={mapId:$<HTMLSelectElement>('map').value,year:Number($<HTMLInputElement>('year').value),demo:$<HTMLInputElement>('demo').checked};$<HTMLDialogElement>('setup-dialog').close();preview({type:'new',setup:structuredClone(setup)});};
  $('roster-tab').onclick=()=>{switchTab(false);render();};$('catalog-tab').onclick=()=>{switchTab(true);active=null;clearDraft();render();};
  for(const id of ['search','force','eligible'])$(id).addEventListener('input',()=>{page=0;placement=false;clearDraft();renderCatalog();render();});
  $('previous').onclick=()=>{page--;renderCatalog();};$('next').onclick=()=>{page++;renderCatalog();};
  $('confirm').onclick=()=>void commit();$('cancel').onclick=cancel;$('clear').onclick=()=>{if(busy)return;active=null;clearDraft();placement=false;status('Selection cleared. Choose a piece or add one from the catalog.');render();};
  $('advance').onclick=()=>preview({type:'action',action:{type:'advance'}});
  $('coordinates').onsubmit=e=>{e.preventDefault();const q=Number($<HTMLInputElement>('q').value),r=Number($<HTMLInputElement>('r').value),cell=map.byKey.get(`${q},${r}`);if(cell)chooseCell(cell);else{clearDraft();status('No hex exists at those coordinates in this map.');render();}};
  $('zoom-in').onclick=()=>table.zoom(.8);$('zoom-out').onclick=()=>table.zoom(1.25);$('fit').onclick=()=>table.reset();$('top').onclick=()=>table.reset(true);$('focus-piece').onclick=()=>{if(selectedTile)table.focusCell(selectedTile);else status('Select a piece first to focus the view.');};
  $('labels').onclick=()=>{const visible=$('labels').getAttribute('aria-pressed')!=='true';$('labels').setAttribute('aria-pressed',String(visible));table.setLabels(visible);};
  $('export').onclick=()=>{try{const save=rules.export(state()),url=URL.createObjectURL(new Blob([JSON.stringify(save,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`xriegsspiel-${state().manifest.mapId.replaceAll('/','-')}-${state().year}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Save exported after exact journal replay verification.');}catch(e){status(String(e));}};
  $('import-open').onclick=()=>$<HTMLInputElement>('import').click();$('import').onchange=()=>{const input=$<HTMLInputElement>('import'),file=input.files?.[0];input.value='';if(!file)return;if(busy)return;clearDraft();if(file.size>8_000_000){status('Save exceeds the 8 MB import limit.');render();return;}void file.text().then(text=>{preview({type:'import',save:JSON.parse(text)});}).catch(()=>{status('Unable to read this JSON save.');render();});};
  document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();if(e.key==='Enter'&&e.target===table.renderer.domElement){e.preventDefault();void commit();}});
  Object.defineProperty(window,'__geographicScenario',{value:{get diagnostics(){return{state:structuredClone(envelope),mapId:map.id,selected:active,selectedTile:selectedTile?.id,preview:draftPreview?structuredClone(draftPreview):null,placement,...table.stats};}}});
  const first=state().pieces.find(p=>p.id==='B-02')??state().pieces.find(p=>p.tileId);
  if(first){selectPiece(first.id);if(selectedTile)table.focusCell(selectedTile);}else render();
}
void start().catch(error=>status(error instanceof Error?error.message:'Unable to start geographic exercise.'));
