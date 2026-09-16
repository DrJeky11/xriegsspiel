import './style.css';
import { PieceLab, replayLaboratory } from '../pieces.ts';
import type { PieceCatalog, PieceRules, Force, LabAction, LabBoard, LabJournal } from '../pieces.ts';
import equipmentUrl from '../../catalog/equipment.json?url';
import piecesUrl from '../../catalog/pieces.json?url';
import rulesUrl from '../../catalog/rules.json?url';
import componentsUrl from '../../catalog/components.json?url';
import qualityUrl from '../../catalog/quality-notes.json?url';
import sourcesUrl from '../../catalog/sources.json?url';
import databaseUrl from '../../catalog/equipment.sqlite?url';

interface Equipment {
  id: string; name: string; sourceUrl: string; origin: string; domain: string; taxonomy: string[];
  sourceFields: Record<string,{raw:string;value:string|null}>;
  sources: { exportId:string;recordNumber:number }[];
}
interface Component { id:string;equipmentId:string;name:string;kind:string;locator:string;reviewStatus:string;relationship:string;parentComponentId:string|null;quantity:number|null;fields:Record<string,string|null>;note:string }
interface Quality { global:string[];records:{equipmentId:string;issue:string;evidence:string;locator:string;status:string}[] }
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const get = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
const json = async <T>(url:string):Promise<T> => { const r = await fetch(url); if(!r.ok) throw new Error(`Catalog file could not load (${r.status}).`); return r.json(); };

async function main() {
  const [research,catalog,rules,components,quality,sources] = await Promise.all([
    json<{equipment:Equipment[]}>(equipmentUrl),json<PieceCatalog>(piecesUrl),json<PieceRules>(rulesUrl),
    json<{components:Component[]}>(componentsUrl),json<Quality>(qualityUrl),json<{id:string;rowCount:number;accessed:string;filter:unknown}[]>(sourcesUrl),
  ]);
  const lab = new PieceLab(catalog,rules), equipment = new Map(research.equipment.map(e=>[e.id,e]));
  const board: LabBoard = {width:9,height:6,cells:Array.from({length:54},(_,n)=> {
    const x=n%9,y=Math.floor(n/9);
    return x>=6?'water':y===2?'road':(x===2&&y>2)?'forest':(x===4&&y===4)?'ridge':'plain';
  })};
  let journal:LabJournal = {catalogVersion:catalog.version,rulesVersion:rules.version,board,year:2026,records:[]};
  let state = lab.create(board), selected = catalog.pieces.find(p=>p.name.startsWith('M1A2 Abrams'))!.id;
  let active:string|null=null, placement=false, draft:LabAction|null=null, page=0;
  let message='Choose an entry, then place it on a suitable tile. This is a local, full-information test board.';
  const cellName=(n:number)=>`${String.fromCharCode(65+n%board.width)}${Math.floor(n/board.width)+1}`;
  document.getElementById('app')!.innerHTML=`
    <header><a class="brand" href="/">⌖ XRiegsspiel</a><span>Equipment library / 01</span><a href="${databaseUrl}" download="xriegsspiel-equipment.sqlite">Download database ↗</a></header>
    <main><section class="intro"><div><p class="eyebrow">Red / China &nbsp; · &nbsp; Blue / United States &nbsp; · &nbsp; 1980 onward</p><h1>Parts. Platforms. Possibilities.</h1><p>Explore the equipment evidence and try individual pieces on a tabletop.</p></div><div class="total"><strong>${catalog.pieces.length.toLocaleString()}</strong><span>ODIN equipment records<br>Accessed 15 Sep 2026</span></div></section>
    <p class="notice">Source specifications and game rules are separate. Movement points and cargo slots are our test rules. Historical service dates, combat and detection are unverified or unmodeled.</p>
    <section class="filters" aria-label="Catalog filters">
      <label class="search">Search equipment<input id="search" type="search" placeholder="Name, variant or equipment family"></label>
      <label>Force<select id="force"><option value="blue">Blue · United States</option><option value="red">Red · China</option><option value="all">Both forces</option></select></label>
      <label>Domain<select id="domain"><option value="all">All domains</option><option value="land">Land</option><option value="air">Air</option><option value="sea">Sea</option></select></label>
      <label>Piece<select id="kind"><option value="all">All pieces</option><option value="platform">Platforms</option><option value="part">Equipment / parts</option></select></label>
      <label>Reference year<input id="year" type="number" min="1980" max="2026" value="2026"></label>
      <label>Evidence<select id="eligibility"><option value="all">All candidates</option><option value="eligible">Lab eligible by year</option><option value="review">Needs review / later date</option></select></label>
    </section>
    <section class="library"><div class="results"><div class="results-head"><h2>Catalog</h2><span id="count" role="status"></span></div><div id="list"></div><div class="pager"><button id="prev">← Previous</button><span id="page"></span><button id="next">Next →</button></div></div><article id="details" aria-label="Equipment details"></article></section>
    <section class="laboratory" aria-label="Piece laboratory"><div class="lab-heading"><div><p class="eyebrow">Original test rules · Fictional terrain</p><h2>Try a piece</h2><p id="lab-meta"></p></div><div class="toolbar"><button id="turn">Next turn</button><button id="export">Export board & journal</button><button id="clear">New empty board</button></div></div>
      <div class="lab-layout"><div><div id="board" aria-label="Laboratory tiles"></div><p class="legend">Tiles: plain · road ═ · forest ♣ · ridge △ · water ≋ &nbsp; / &nbsp; Outline = reachable</p></div><aside><label>Selected instance<select id="instance"><option value="">No pieces placed</option></select></label><div id="piece-status"></div><div id="actions"></div><p id="message" role="status" aria-live="polite"></p><div id="confirm"></div><details><summary>Action history</summary><ol id="events"></ol></details></aside></div>
    </section><details class="sources"><summary>Sources, coverage and limitations</summary><p>Four ODIN CSV exports, merged by equipment identifier. A country's origin filter does not prove that its forces operated that variant. Pre-1980 equipment is retained for continued-service review; retirement dates are unknown.</p><ul>${sources.map(s=>`<li>${esc(s.id)}: ${s.rowCount} source records · ${esc(JSON.stringify(s.filter))} · ${esc(s.accessed)}</li>`).join('')}</ul><ul>${quality.global.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><ul>${rules.limits.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><p>Component mentions can overlap section inspections. They are reference relationships, not automatic loadouts. Placeholder tokens use original lettering and force colors; no source artwork or 3D equipment models are included.</p></details>
    <footer>${esc(catalog.version)} · ${esc(rules.version)} · Browser equipment laboratory. <a href="/">Open the shared exercise →</a></footer></main>`;
  const value=(id:string)=>get<HTMLInputElement>(id).value;
  const force=():Force=>value('force')==='red'?'red':'blue';
  const year=()=>Number(value('year'));
  const eligible=(p:PieceCatalog['pieces'][number], y=year())=>value('force')==='all'
    ? p.forceEvidence.some(e=>lab.eligibility(p.id,e.force,y).allowed) : lab.eligibility(p.id,force(),y).allowed;
  function filtered() {
    const query=value('search').toLowerCase().trim();
    return catalog.pieces.filter(p=> {
      const e=equipment.get(p.equipmentId)!;
      return (!query||`${p.name} ${e.taxonomy.join(' ')}`.toLowerCase().includes(query))
        &&(value('force')==='all'||p.forceEvidence.some(m=>m.force===force()))
        &&(value('domain')==='all'||e.domain===value('domain'))
        &&(value('kind')==='all'||p.kind===value('kind'))
        &&(value('eligibility')==='all'||(value('eligibility')==='eligible')===eligible(p));
    }).sort((a,b)=>a.name.localeCompare(b.name, 'en', {numeric:true}));
  }
  function renderList() {
    const list=filtered(),pages=Math.max(1,Math.ceil(list.length/30)); page=Math.min(page,pages-1);
    get('count').textContent=`${list.length.toLocaleString()} matches`;
    get('page').textContent=`${page+1} / ${pages}`;
    get<HTMLButtonElement>('prev').disabled=page===0;get<HTMLButtonElement>('next').disabled=page===pages-1;
    get('list').innerHTML=list.slice(page*30,(page+1)*30).map(p=>`<button class="entry ${p.id===selected?'selected':''}" aria-pressed="${p.id===selected}" data-entry="${p.id}"><strong>${esc(p.name)}</strong><span>${esc(equipment.get(p.equipmentId)!.domain)} · ${p.kind} · ${p.eraEvidence.reportedYear??'date unknown'}</span><small>${eligible(p)?'Lab eligible · service unverified':'Review needed for this year / force'}</small></button>`).join('')||'<p class="empty">No matching equipment. Try a broader search or another force.</p>';
    get('list').querySelectorAll<HTMLButtonElement>('[data-entry]').forEach(b=>b.onclick=()=>{selected=b.dataset.entry!;placement=false;draft=null;renderList();renderDetails();renderLab();});
  }
  function renderDetails() {
    const p=lab.definition(selected),e=equipment.get(p.equipmentId)!,profile=lab.profiles.get(p.profileId)!;
    const notes=quality.records.filter(n=>n.equipmentId===e.id),parts=components.components.filter(c=>c.equipmentId===e.id);
    const selectedForce=value('force')==='all'?(p.forceEvidence.find(m=>lab.eligibility(p.id,m.force,state.year).allowed)?.force??p.forceEvidence[0].force):force();
    const eligibility=lab.eligibility(p.id,selectedForce,state.year);
    get('details').innerHTML=`<p class="eyebrow">${esc(e.domain)} / ${esc(p.kind)}</p><h2>${esc(p.name)}</h2><p class="taxonomy">${esc(e.taxonomy.join(' / '))}</p>
      <div class="details-grid"><section><h3>ODIN reference</h3><dl><dt>Origin</dt><dd>${esc(e.origin||'Unknown')}</dd><dt>Reported introduction</dt><dd>${p.eraEvidence.reportedYear??'Unknown'}${p.eraEvidence.reportedYear!==null&&p.eraEvidence.reportedYear<1980?' · Continued service needs review':''}</dd><dt>Force evidence</dt><dd>${p.forceEvidence.map(m=>`${m.force==='red'?'Red · China':'Blue · US'} — ${m.basis==='odin-operator-filter'?'ODIN operator filter':'origin only; operator needs review'}`).map(esc).join('<br>')}</dd><dt>Historical service</dt><dd>Unverified. Introduction year is not a service interval.</dd></dl><a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">Read the ODIN entry ↗</a></section>
      <section><h3>Our playable definition</h3><dl><dt>Piece scale</dt><dd>${esc(p.pieceScale)}</dd><dt>Movement profile</dt><dd>${esc(profile.label)}</dd><dt>Movement per turn</dt><dd>${profile.movement} game points</dd><dt>Cargo capacity / cargo size</dt><dd>${profile.cargoSlots} slots / ${p.loadSlots} slots</dd></dl><p>Authored class rules. These values do not represent real speed, range or transport fit.</p></section></div>
      ${notes.map(n=>`<div class="notice"><strong>${esc(n.issue)}</strong><p>${esc(n.evidence)}</p><small>${esc(n.locator)}</small></div>`).join('')}
      <div class="place-row"><button class="primary" id="place" ${eligibility.allowed?'':'disabled'}>Place ${selectedForce==='red'?'Red':'Blue'} piece on board ↓</button><span>Board year ${state.year}. ${esc(eligibility.reason)}</span></div>
      <details><summary>Components & relationships (${parts.length})</summary>${parts.length?parts.map(c=>`<div class="component"><strong>${esc(c.name)}</strong><p>${esc(c.kind)} · ${c.relationship==='source-section-assertion'?'Section inspected':'Unreviewed field mention'}${c.parentComponentId?` · Child of ${esc(c.parentComponentId)}`:''}</p><small>${esc(c.locator)}</small>${Object.keys(c.fields).length?`<dl>${Object.entries(c.fields).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v??'Unknown')}</dd>`).join('')}</dl>`:''}<p>${esc(c.note)}</p></div>`).join(''):'<p>No separately identified component mentions in this import. This does not mean the platform has no components.</p>'}</details>
      <details><summary>Source fields (${Object.keys(e.sourceFields).length}) & provenance</summary><p>Flat CSV fields; component context may be lost. Values below do not drive the game rules.</p><p>${e.sources.map(s=>`${esc(s.exportId)} · record ${s.recordNumber}`).join('<br>')}</p><div class="facts"><table><thead><tr><th>Source field</th><th>Reported value</th></tr></thead><tbody>${Object.entries(e.sourceFields).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v.value??`Unknown (source: ${v.raw})`)}</td></tr>`).join('')}</tbody></table></div></details>`;
    get('place').onclick=()=>{placement=true;draft=null;message=`Place ${p.name} as ${selectedForce} on a suitable tile. Placement uses board year ${state.year}.`;renderLab();get('board').scrollIntoView({behavior:'smooth',block:'center'});};
  }
  function renderLab() {
    get('lab-meta').textContent=`Year ${state.year} · Turn ${state.turn} · ${state.pieces.length} pieces · Local board; reload starts fresh.`;
    const current=state.pieces.find(p=>p.id===active);
    const reach=current?lab.reachable(state,current.id):new Map();
    get('board').innerHTML=board.cells.map((t,cell)=>{
      const occupants=state.pieces.filter(p=>p.cell===cell);
      return `<button class="tile ${t} ${reach.has(cell)?'reachable':''} ${current?.cell===cell?'active':''}" data-cell="${cell}" aria-label="${cellName(cell)} ${t}${occupants.length?' · '+occupants.map(p=>`${p.force} ${lab.definition(p.definitionId).name}`).join('; '):''}"><small>${cellName(cell)}</small><span class="terrain-symbol" aria-hidden="true">${({plain:'·',road:'═',forest:'♣',ridge:'△',water:'≋'})[t]}</span>${occupants.map(p=>`<span class="token ${p.force}">${p.force==='red'?'R':'B'}${state.pieces.indexOf(p)+1}</span>`).join('')}</button>`;
    }).join('');
    get('board').querySelectorAll<HTMLButtonElement>('[data-cell]').forEach(b=>b.onclick=()=>{
      const cell=Number(b.dataset.cell);
      if(placement) {
        const p=lab.definition(selected),f=value('force')==='all'?(p.forceEvidence.find(m=>lab.eligibility(p.id,m.force,state.year).allowed)?.force??p.forceEvidence[0].force):force();
        const record={type:'deploy' as const,definitionId:selected,force:f,cell,id:`unit-${crypto.randomUUID()}`};
        try { state=lab.deploy(state,selected,f,cell,record.id);journal.records.push(record);active=record.id;placement=false;message=`Placed at ${cellName(cell)}. Select an outlined tile to preview movement.`; } catch(e){message=(e as Error).message;}
      } else if(current?.carrierId) preview({type:'unload',pieceId:current.id,to:cell});
      else {
        const occupant=state.pieces.find(p=>p.cell===cell);
        if(occupant){active=occupant.id;draft=null;message='Piece selected. Use the instance list when several layers share a tile.';}
        else if(current) preview({type:'move',pieceId:current.id,to:cell});
        else message='Choose a piece from the catalog or select a placed token.';
      }
      renderLab();
    });
    get('instance').innerHTML='<option value="">Select a placed piece</option>'+state.pieces.map((p,i)=>`<option value="${p.id}" ${active===p.id?'selected':''}>${p.force==='red'?'R':'B'}${i+1} · ${esc(lab.definition(p.definitionId).name)}${p.carrierId?' (carried)':''}</option>`).join('');
    get('piece-status').innerHTML=current?`<h3>${esc(lab.definition(current.definitionId).name)}</h3><p>${current.movement} movement points · ${current.cell===null?'Carried':cellName(current.cell)}<br>Cargo: ${lab.cargoUsed(state,current.id)} / ${lab.profile(current).cargoSlots} slots</p>`:'<p>Place an equipment entry to see its movement and cargo rules.</p>';
    const carriers=current?state.pieces.filter(p=>p.id!==current.id&&lab.profile(p).cargoSlots>0):[];
    get('actions').innerHTML=current?`<button id="hold">Preview hold</button><label>Destination<select id="destination">${board.cells.map((t,c)=>`<option value="${c}">${cellName(c)} · ${t}</option>`).join('')}</select></label><button id="move">Preview ${current.carrierId?'unload':'move'}</button>${carriers.length&&current.carrierId===null?`<label>Load into<select id="carrier">${carriers.map(p=>`<option value="${p.id}">${esc(lab.definition(p.definitionId).name)} · ${p.cell===null?'carried':cellName(p.cell)}</option>`).join('')}</select></label><button id="load">Preview load</button>`:''}${current.carrierId?'<p>Select the carrier’s tile or an adjacent land tile to preview unloading.</p>':''}`:'';
    if(current){get('hold').onclick=()=>preview({type:'hold',pieceId:current.id});get('move').onclick=()=>preview({type:current.carrierId?'unload':'move',pieceId:current.id,to:Number(value('destination'))});}
    if(document.getElementById('load'))get('load').onclick=()=>preview({type:'load',pieceId:current!.id,carrierId:value('carrier')});
    get('message').textContent=message;
    get('confirm').innerHTML=draft?'<button class="primary" id="commit">Confirm action</button><button id="cancel">Cancel</button>':placement?'<button id="cancel-placement">Cancel placement</button>':'';
    if(draft){ get('commit').onclick=commit;get('cancel').onclick=()=>{draft=null;message='Preview cancelled.';renderLab();}; }
    if(placement&&!draft)get('cancel-placement').onclick=()=>{placement=false;message='Placement cancelled.';renderLab();};
    get('events').innerHTML=state.events.slice().reverse().map(e=>`<li>${esc(e.explanation)}</li>`).join('')||'<li>No committed actions yet.</li>';
  }
  function preview(action:LabAction){const result=lab.evaluate(state,action);draft=result.allowed?action:null;message=result.reason;renderLab();}
  function commit(){if(!draft)return;state=lab.apply(state,draft);journal.records.push({type:'action',action:draft});message=state.events.at(-1)!.explanation;draft=null;renderLab();}
  for(const id of ['search','force','domain','kind','year','eligibility'])get(id).addEventListener('input',()=>{page=0;placement=false;renderList();renderDetails();renderLab();});
  get('prev').onclick=()=>{page--;renderList();};get('next').onclick=()=>{page++;renderList();};
  get('instance').onchange=()=>{active=value('instance')||null;draft=null;placement=false;message='Piece selected. Preview an action before committing.';renderLab();};
  get('turn').onclick=()=>{placement=false;preview({type:'advance'});};
  get('clear').onclick=()=>{try{state=lab.create(board,year());journal={catalogVersion:catalog.version,rulesVersion:rules.version,board,year:year(),records:[]};active=null;draft=null;placement=false;message='New empty board created for the reference year.';renderDetails();renderLab();}catch(e){message=(e as Error).message;renderLab();}};
  get('export').onclick=()=>{
    const replay=replayLaboratory(lab,journal);
    if(JSON.stringify(replay)!==JSON.stringify(state))throw new Error('Journal verification failed.');
    const blob=new Blob([JSON.stringify({journal,state},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='equipment-laboratory.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
    message='Board and complete deployment/action journal exported; replay matched the current state.';renderLab();
  };
  renderList();renderDetails();renderLab();
}
void main().catch(error=>{document.getElementById('app')!.textContent=`Equipment catalog unavailable: ${(error as Error).message}`;});
