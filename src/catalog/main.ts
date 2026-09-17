import './style.css';
import { unitVisual } from '../play/miniatures.ts';
import { loadReferences, referenceFor, showReferenceImages, onReferenceChange } from '../play/references.ts';
import { referenceImageMarkup, referenceCardMarkup, refreshReferenceImages } from '../play/reference-card.ts';
import { PieceLab } from '../pieces.ts';
import type { PieceCatalog, PieceRules, Force } from '../pieces.ts';
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
  const requested=new URL(location.href).searchParams.get('piece');
  let selected=catalog.pieces.find(p=>p.id===requested)?.id??catalog.pieces.find(p=>p.name.startsWith('M1A2 Abrams'))!.id,page=0;
  document.getElementById('app')!.innerHTML=`
    <header><a class="brand" href="/">⌖ XRiegsspiel</a><span>Equipment library / 01</span><a href="${databaseUrl}" download="xriegsspiel-equipment.sqlite">Download database ↗</a></header>
    <main><section class="intro"><div><p class="eyebrow">Red / China &nbsp; · &nbsp; Blue / United States &nbsp; · &nbsp; 1980 onward</p><h1>Parts. Platforms. Possibilities.</h1><p>Inspect equipment evidence, then open a map to place pieces.</p></div><div class="total"><strong>${catalog.pieces.length.toLocaleString()}</strong><span>ODIN equipment records<br>Accessed 15 Sep 2026</span></div></section>
    <p class="notice">Source specifications and game rules are separate. Movement points and cargo slots are our test rules. Historical service dates, combat and detection are unverified or unmodeled.</p>
    <section class="filters" aria-label="Catalog filters">
      <label class="search">Search equipment<input id="search" type="search" placeholder="Name, variant or equipment family"></label>
      <label>Force<select id="force"><option value="blue">Blue · United States</option><option value="red">Red · China</option><option value="all">Both forces</option></select></label>
      <label>Domain<select id="domain"><option value="all">All domains</option><option value="land">Land</option><option value="air">Air</option><option value="sea">Sea</option></select></label>
      <label>Piece<select id="kind"><option value="all">All pieces</option><option value="platform">Platforms</option><option value="part">Equipment / parts</option></select></label>
      <label>Reference year<input id="year" type="number" min="1980" max="2026" value="2026"></label>
      <label>Evidence<select id="eligibility"><option value="all">All candidates</option><option value="eligible">Catalog eligible by year</option><option value="review">Needs review / later date</option></select></label>
    </section>
    <section class="library"><div class="results"><div class="results-head"><h2>Catalog</h2><span id="count" role="status"></span></div><div id="list"></div><div class="pager"><button id="prev">← Previous</button><span id="page"></span><button id="next">Next →</button></div></div><article id="details" aria-label="Equipment details"></article></section>
    <details class="sources"><summary>Sources, coverage and limitations</summary><p>Four ODIN CSV exports, merged by equipment identifier. A country's origin filter does not prove that its forces operated that variant. Pre-1980 equipment is retained for continued-service review; retirement dates are unknown.</p><ul>${sources.map(s=>`<li>${esc(s.id)}: ${s.rowCount} source records · ${esc(JSON.stringify(s.filter))} · ${esc(s.accessed)}</li>`).join('')}</ul><ul>${quality.global.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><ul>${rules.limits.map(q=>`<li>${esc(q)}</li>`).join('')}</ul><p>Component mentions can overlap section inspections. They are reference relationships, not automatic loadouts. Reviewed reference photographs cover a maritime pilot. Other records show stylized class miniatures. Photo credits and role sources accompany each reviewed card.</p></details>
    <footer>${esc(catalog.version)} · ${esc(rules.version)} · Equipment reference library. <a href="/pacific.html">Pacific workspace →</a> · <a href="/centcom.html">CENTCOM workspace →</a></footer></main>`;
  const value=(id:string)=>get<HTMLInputElement>(id).value;
  const force=():Force=>value('force')==='red'?'red':'blue';
  const year=()=>Number(value('year'));
  const displayForce=(p:PieceCatalog['pieces'][number]):Force=>value('force')==='all'?(p.forceEvidence.find(m=>lab.eligibility(p.id,m.force,year()).allowed)?.force??p.forceEvidence[0].force):force();
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
    const list=filtered(),pages=Math.max(1,Math.ceil(list.length/6)); page=Math.min(page,pages-1);
    get('count').textContent=`${list.length.toLocaleString()} matches`;
    get('page').textContent=`${page+1} / ${pages}`;
    get<HTMLButtonElement>('prev').disabled=page===0;get<HTMLButtonElement>('next').disabled=page===pages-1;
    showReferenceImages('library-list',list.slice(page*6,(page+1)*6).map(p=>({reference:referenceFor(p.equipmentId),size:'thumbnail'})));
    get('list').innerHTML=list.slice(page*6,(page+1)*6).map(p=>`<button class="entry ${p.id===selected?'selected':''}" aria-pressed="${p.id===selected}" data-entry="${p.id}">${referenceImageMarkup(p.equipmentId,unitVisual(p,equipment.get(p.equipmentId)).model,displayForce(p),'thumbnail')}<span class="reference-copy"><strong>${esc(p.name)}</strong><span>${esc(referenceFor(p.equipmentId)?.roleLabel??equipment.get(p.equipmentId)!.domain)} · ${p.kind} · ${p.eraEvidence.reportedYear??'date unknown'}</span><small>${eligible(p)?'Catalog eligible · service unverified':'Review needed for this year / force'}</small></span></button>`).join('')||'<p class="empty">No matching equipment. Try a broader search or another force.</p>';
    refreshReferenceImages(get('list'));
    get('list').querySelectorAll<HTMLButtonElement>('[data-entry]').forEach(b=>b.onclick=()=>{selected=b.dataset.entry!;renderList();renderDetails();});
  }
  function renderDetails() {
    const p=lab.definition(selected),e=equipment.get(p.equipmentId)!,profile=lab.profiles.get(p.profileId)!;
    const notes=quality.records.filter(n=>n.equipmentId===e.id),parts=components.components.filter(c=>c.equipmentId===e.id);
    const selectedForce=displayForce(p);
    const eligibility=lab.eligibility(p.id,selectedForce,year());
    get('details').innerHTML=`<p class="eyebrow">${esc(e.domain)} / ${esc(p.kind)}</p><h2>${esc(p.name)}</h2><p class="taxonomy">${esc(e.taxonomy.join(' / '))}</p>${referenceCardMarkup(p.equipmentId,unitVisual(p,e).model,selectedForce)}
      <div class="details-grid"><section><h3>ODIN reference</h3><dl><dt>Origin</dt><dd>${esc(e.origin||'Unknown')}</dd><dt>Reported introduction</dt><dd>${p.eraEvidence.reportedYear??'Unknown'}${p.eraEvidence.reportedYear!==null&&p.eraEvidence.reportedYear<1980?' · Continued service needs review':''}</dd><dt>Force evidence</dt><dd>${p.forceEvidence.map(m=>`${m.force==='red'?'Red · China':'Blue · US'} — ${m.basis==='odin-operator-filter'?'ODIN operator filter':'origin only; operator needs review'}`).map(esc).join('<br>')}</dd><dt>Historical service</dt><dd>Unverified. Introduction year is not a service interval.</dd></dl><a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">Read the ODIN entry ↗</a></section>
      <section><h3>Our playable definition</h3><dl><dt>Piece scale</dt><dd>${esc(p.pieceScale)}</dd><dt>Movement profile</dt><dd>${esc(profile.label)}</dd><dt>Movement per turn</dt><dd>${profile.movement} game points</dd><dt>Cargo capacity / cargo size</dt><dd>${profile.cargoSlots} slots / ${p.loadSlots} slots</dd></dl><p>Authored class rules. These values do not represent real speed, range or transport fit.</p></section></div>
      ${notes.map(n=>`<div class="notice"><strong>${esc(n.issue)}</strong><p>${esc(n.evidence)}</p><small>${esc(n.locator)}</small></div>`).join('')}
      <div class="place-row"><a class="primary" href="/pacific.html?piece=${encodeURIComponent(p.id)}&force=${selectedForce}">Use on Pacific →</a><a class="primary" href="/centcom.html?piece=${encodeURIComponent(p.id)}&force=${selectedForce}">Use on CENTCOM →</a></div><p>Map year, force and terrain eligibility are checked in the workspace.</p>
      <details><summary>Components & relationships (${parts.length})</summary>${parts.length?parts.map(c=>`<div class="component"><strong>${esc(c.name)}</strong><p>${esc(c.kind)} · ${c.relationship==='source-section-assertion'?'Section inspected':'Unreviewed field mention'}${c.parentComponentId?` · Child of ${esc(c.parentComponentId)}`:''}</p><small>${esc(c.locator)}</small>${Object.keys(c.fields).length?`<dl>${Object.entries(c.fields).map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v??'Unknown')}</dd>`).join('')}</dl>`:''}<p>${esc(c.note)}</p></div>`).join(''):'<p>No separately identified component mentions in this import. This does not mean the platform has no components.</p>'}</details>
      <details><summary>Source fields (${Object.keys(e.sourceFields).length}) & provenance</summary><p>Flat CSV fields; component context may be lost. Values below do not drive the game rules.</p><p>${e.sources.map(s=>`${esc(s.exportId)} · record ${s.recordNumber}`).join('<br>')}</p><div class="facts"><table><thead><tr><th>Source field</th><th>Reported value</th></tr></thead><tbody>${Object.entries(e.sourceFields).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${esc(v.value??`Unknown (source: ${v.raw})`)}</td></tr>`).join('')}</tbody></table></div></details>`;
    showReferenceImages('library-detail',[{reference:referenceFor(p.equipmentId),size:'detail'}]);refreshReferenceImages(get('details'));
  }
  for(const id of ['search','force','domain','kind','year','eligibility'])get(id).addEventListener('input',()=>{page=0;renderList();renderDetails();});
  get('prev').onclick=()=>{page--;renderList();};get('next').onclick=()=>{page++;renderList();};
  renderList();renderDetails();
  let contentReady=false;onReferenceChange(()=>{if(!contentReady){contentReady=true;renderList();renderDetails();}else refreshReferenceImages(document);});
  void loadReferences();
}
void main().catch(error=>{document.getElementById('app')!.textContent=`Equipment catalog unavailable: ${(error as Error).message}`;});
