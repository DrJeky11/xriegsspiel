import './review.css';
import type { RunSummary, RunReview, CompactExercise, CapturedCommand } from './types.ts';
import type { TerrainMap } from '../pacific/terrain.ts';
import type { Action } from '../scenario/rules.ts';
import type { captureReports } from '../../server/capture-reports.ts';
type Report = ReturnType<typeof captureReports>;
type Content = {map:Omit<TerrainMap,'byKey'>;pieces:{id:string;name:string;profileId:string;loadSlots:number}[];profiles:{id:string;cargoSlots:number}[]};
const esc=(v:unknown)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const root=$('review-app');
root.innerHTML=`<header><a class="brand" href="/pacific.html">XRIEGSSPIEL<span>Exercise review</span></a><nav aria-label="Workspaces"><a href="/pacific.html">Pacific ↗</a><a href="/centcom.html">CENTCOM ↗</a><a href="/scenario-review.html">Scenario reviews ↗</a></nav></header>
<div class="shell"><aside class="library"><div class="library-head"><h2>Exercises</h2><button id="refresh">Refresh</button></div><label>Map<select id="map-filter"><option value="">All maps</option></select></label><div id="run-list" class="run-list" aria-label="Saved exercises"></div></aside>
<main><div class="work-head"><div><p class="eyebrow">Decision record</p><h1 id="run-title">Exercise archive</h1><p class="muted" id="run-subtitle">Loading the saved exercises…</p></div><div class="export-actions" id="exports"></div></div>
<div class="tabs" role="tablist" aria-label="Review modes"><button id="replay-tab" role="tab" aria-selected="true">Reconstruction</button><button id="reports-tab" role="tab" aria-selected="false">Trends & analysis</button></div>
<p id="notice" role="status" aria-live="polite"></p><div id="quality" class="quality" hidden></div><section id="replay-view"></section><section id="reports-view" class="reports" hidden></section>
<footer>Trusted local exercise archive. Player views and presentation acknowledgments describe available information, not what a learner noticed. Movement points and cargo slots are authored game units. Learning assessments remain separate from game outcomes.</footer></main></div>`;
let runs:RunSummary[]=[],review:RunReview|null=null,content:Content|null=null,selected=0,mode:'replay'|'reports'='replay',viewMode='decision',ticket=0,report:Report|null=null;
let current:CompactExercise|null=null,before:CompactExercise|null=null,after:CompactExercise|null=null,zoom=1,pan={x:0,y:0};
const stateCache=new Map<string,CompactExercise>();
let mapObserver:ResizeObserver|undefined;
const api=async<T>(url:string,init?:RequestInit):Promise<T>=>{const response=await fetch(url,init),data=await response.json();if(!response.ok)throw new Error(data.error??'Request failed.');return data;};
const post=<T>(route:string,body:unknown)=>api<T>('/api/capture/'+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
const notice=(message='')=>{$('notice').textContent=message;};
const date=(value:string|null)=>value?new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}):'Time not recorded';
const duration=(ms:number|null)=>ms===null?'Not recorded':ms<1000?`${Math.round(ms)} ms`:`${(ms/1000).toFixed(1)} s`;
const percent=(n:number|null)=>n===null?'—':`${(n*100).toFixed(1)}%`;
const op=(c:CapturedCommand)=>c.operation as {type:string;action?:Action};
const actionName=(c:CapturedCommand)=>{const operation=op(c);return operation.type==='action'?({advance:'Next turn',deploy:'Place piece',move:'Move',load:'Load cargo',unload:'Unload cargo',hold:'Hold'}[operation.action!.type]):operation.type==='new'?'New exercise':'Import save';};
const name=(id:string)=>content?.pieces.find(p=>p.id===id)?.name??id;
async function refresh(){
  const data=await api<{runs:RunSummary[]}>('/api/capture/runs');runs=data.runs;
  const selectedMap=$<HTMLSelectElement>('map-filter').value;
  $('map-filter').innerHTML='<option value="">All maps</option>'+[...new Set(runs.map(r=>r.mapId))].map(id=>`<option value="${esc(id)}">${esc(id.replaceAll('/',' · '))}</option>`).join('');$<HTMLSelectElement>('map-filter').value=selectedMap;
  list();
  const requested=new URL(location.href).searchParams.get('run');
  const initial=review?.run.id??(runs.some(r=>r.id===requested)?requested:null)??runs.find(r=>r.accepted+r.rejected>0)?.id??runs[0]?.id;
  if(initial)await openRun(initial);else $('replay-view').innerHTML='<div class="empty">No exercises have been recorded. Open Pacific or CENTCOM to begin.</div>';
}
function list(){
  const map=$<HTMLSelectElement>('map-filter').value,filtered=runs.filter(r=>!map||r.mapId===map);
  $('run-list').innerHTML=filtered.map(r=>`<button class="run-item" data-run="${r.id}" aria-current="${review?.run.id===r.id}"><strong>${esc(r.label)}</strong><small>${r.status==='active'?'Active':'Archived'} · ${r.accepted} accepted / ${r.rejected} rejected</small><span class="run-id">${r.id.slice(0,8)} · ${esc(r.origin)}</span></button>`).join('')||'<p class="empty">No exercises on this map.</p>';
  $('run-list').querySelectorAll<HTMLButtonElement>('[data-run]').forEach(button=>button.onclick=()=>void safely(()=>openRun(button.dataset.run!)));
}
async function safely(fn:()=>Promise<unknown>){try{notice();await fn();}catch(error){notice(error instanceof Error?error.message:String(error));}}
async function openRun(id:string){
  const turn=++ticket;notice('Loading exercise…');
  const [next,nextContent]=await Promise.all([api<RunReview>('/api/capture/review?run='+id),api<Content>('/api/capture/content?run='+id)]);
  if(turn!==ticket)return;
  review=next;content=nextContent;selected=Math.max(0,review.commands.length-1);zoom=1;pan={x:0,y:0};stateCache.clear();
  history.replaceState(null,'','/review.html?run='+id);list();$('run-title').textContent=review.run.label;
  $('run-subtitle').textContent=`${review.run.status==='active'?'Active exercise':'Archived exercise'} · ${review.run.mapId} · ${date(review.run.createdAt)}${review.run.objective?' · '+review.run.objective:''}`;
  $('exports').innerHTML=`<a href="/api/capture/export?run=${id}">Download archive</a><a href="/api/capture/export?run=${id}&format=jsonl">JSONL</a><a href="/api/capture/csv?run=${id}">CSV report</a>`;
  $('quality').hidden=!review.run.quality.length;$('quality').textContent=review.run.quality.join(' · ');
  renderReplay();await selectDecision(selected);notice();if(mode==='reports')await showReports();
}
function renderReplay(){
  if(!review)return;
  $('replay-view').innerHTML=`<div class="review-grid"><div class="map-area"><div class="map-tools"><label>Historical perspective<select id="perspective"><option value="decision">Decision view</option><option value="before">Validation state</option><option value="after">After resolution</option></select></label><button id="fit-map">Fit map</button></div><div class="map-frame"><canvas id="review-map" aria-label="Historical exercise board"></canvas><div class="map-legend"><span>Blue</span><span>Red</span></div></div><div class="map-caption"><span id="map-state"></span><span>Scroll to zoom · drag to pan</span></div><div class="timeline-controls"><button id="previous-decision" aria-label="Previous decision">←</button><input id="timeline" type="range" min="0" max="${Math.max(0,review.commands.length-1)}" value="${selected}" aria-label="Decision timeline"><button id="next-decision" aria-label="Next decision">→</button></div><div class="timeline-label"><span id="timeline-label"></span><span>${review.initialEvents.length} inherited/setup events</span></div><div id="decisions" class="decision-list" aria-label="Recorded decisions"></div></div><div id="inspector" class="inspector"></div></div>`;
  $<HTMLSelectElement>('perspective').value=viewMode;$('perspective').onchange=()=>{viewMode=$<HTMLSelectElement>('perspective').value;void safely(()=>selectDecision(selected));};
  $('fit-map').onclick=()=>{zoom=1;pan={x:0,y:0};drawMap();};$('previous-decision').onclick=()=>void safely(()=>selectDecision(selected-1));$('next-decision').onclick=()=>void safely(()=>selectDecision(selected+1));
  $('timeline').oninput=()=>void safely(()=>selectDecision(Number($<HTMLInputElement>('timeline').value)));
  const canvas=$<HTMLCanvasElement>('review-map');let drag:{x:number;y:number}|null=null;
  canvas.onwheel=e=>{e.preventDefault();zoom=Math.max(.6,Math.min(12,zoom*(e.deltaY>0?.88:1.12)));drawMap();};
  canvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(drag){pan.x+=e.clientX-drag.x;pan.y+=e.clientY-drag.y;drag={x:e.clientX,y:e.clientY};drawMap();}};canvas.onpointerup=()=>{drag=null;};canvas.onpointercancel=()=>{drag=null;};
  mapObserver?.disconnect();mapObserver=new ResizeObserver(()=>drawMap());mapObserver.observe(canvas);
}
async function checkpoint(hash:string){if(stateCache.has(hash))return stateCache.get(hash)!;const state=await api<CompactExercise>(`/api/capture/checkpoint?run=${review!.run.id}&hash=${hash}`);stateCache.set(hash,state);return state;}
let decisionTicket=0;
async function selectDecision(index:number){
  if(!review)return;const t=++decisionTicket,r=review;selected=Math.max(0,Math.min(index,r.commands.length-1));
  const command=r.commands[selected],initial=r.checkpoints[0];
  if(!command){current=before=after=await checkpoint(initial.stateHash);if(t!==decisionTicket||r!==review)return;
    $('inspector').innerHTML='<div><p class="eyebrow">Initial state</p><h2>Ready for decisions</h2><p class="muted">This exercise has no captured orders yet. Its initial board is preserved here.</p></div>'+notesForm()+detailsForm(r);bindNotes();
  }else{
    const observation=r.observations.find(o=>o.id===command.observationId);
    const [b,a,d]=await Promise.all([checkpoint(command.beforeHash),checkpoint(command.afterHash),observation?checkpoint(observation.stateHash):Promise.resolve(null)]);
    if(t!==decisionTicket||r!==review)return;before=b;after=a;current=viewMode==='after'?a:viewMode==='before'?b:d??b;
    const action=op(command).action,piece=action&&'pieceId'in action?b.pieces.find(p=>p.id===action.pieceId):action?.type==='deploy'?a.pieces.find(p=>p.id===action.id):null;
    const changes=a.pieces.filter(p=>JSON.stringify(b.pieces.find(x=>x.id===p.id))!==JSON.stringify(p)).map(p=>{const old=b.pieces.find(x=>x.id===p.id);return `<li><strong>${esc(name(p.definitionId))}</strong><br>${old?`${esc(old.carrierId?'Aboard '+old.carrierId:old.tileId)} → `:'Placed at '}${esc(p.carrierId?'Aboard '+p.carrierId:p.tileId)}<br>Movement ${old?old.movement+' → ':''}${p.movement} MP</li>`;}).join('');
    $('inspector').innerHTML=`<div class="fade-in"><p class="eyebrow">Decision ${selected+1} / ${r.commands.length}</p><h2>${esc(actionName(command))}</h2><p class="muted">${piece?esc(name(piece.definitionId)):esc(command.participantLabel)}</p><p class="decision-outcome ${command.status===200?'':'rejected'}"><strong>${command.status===200?'Accepted':'Rejected'}.</strong> ${esc(command.explanation)}</p><dl class="evidence"><dt>Participant</dt><dd>${esc(command.participantLabel)} · ${esc(command.source)}</dd><dt>Interface</dt><dd>${esc(command.interface)}</dd><dt>Recorded</dt><dd>${esc(date(command.committedAt))}</dd><dt>Decision view</dt><dd>${observation?'Revision '+observation.revision:'Unknown · legacy or scripted record'}</dd><dt>Presentation</dt><dd>${observation?.presentedAt?'Client acknowledged':observation?.deliveredAt?'Sent; presentation unconfirmed':'Unconfirmed'}</dd><dt>Validated at</dt><dd>Revision ${command.validatedRevision}</dd><dt>Retries</dt><dd>${command.retries} · one recorded decision</dd><dt>Resource cost</dt><dd>${command.guidance?command.guidance.cost+' MP':'Not recorded'}</dd><dt>Rule result</dt><dd>${esc(command.reasonCode)}</dd></dl>${changes?`<h3>Recorded changes</h3><ul class="changes">${changes}</ul>`:''}${b.turn!==a.turn?`<p class="muted">Turn ${b.turn} → ${a.turn}</p>`:''}${command.nextRunId?`<p><button class="table-link" id="follow-run">Open the resulting exercise ↗</button></p>`:''}</div>${notesForm()}${detailsForm(r)}`;
    if(command.nextRunId)$('follow-run').onclick=()=>void safely(()=>openRun(command.nextRunId!));bindNotes();
  }
    $('details-form').onsubmit=e=>{e.preventDefault();void safely(async()=>{await post('details',{runId:r.run.id,label:$<HTMLInputElement>('exercise-title').value,objective:$<HTMLTextAreaElement>('objective').value});await openRun(r.run.id);});};
  $<HTMLInputElement>('timeline').value=String(selected);$<HTMLButtonElement>('previous-decision').disabled=!r.commands.length||selected===0;$<HTMLButtonElement>('next-decision').disabled=!r.commands.length||selected===r.commands.length-1;
  $('timeline-label').textContent=r.commands.length?`Decision ${selected+1} of ${r.commands.length}`:'No orders recorded';
  $('decisions').innerHTML=r.commands.map((c,i)=>`<button data-decision="${i}" aria-current="${i===selected}">${i+1} · ${esc(actionName(c))}${c.status!==200?' ×':''}</button>`).join('');
  $('decisions').querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.onclick=()=>void safely(()=>selectDecision(Number(button.dataset.decision))));
  const selectedButton=$('decisions').querySelector<HTMLElement>('[aria-current=true]');if(selectedButton)$('decisions').scrollLeft=Math.max(0,selectedButton.offsetLeft-$('decisions').offsetLeft-80);
  const absent=command&&!command.observationId&&viewMode==='decision';$('map-state').textContent=`Turn ${current!.turn} · ${current!.pieces.length} pieces${absent?' · decision view unknown; showing validation state':''}`;
  drawMap();
}
function detailsForm(r:RunReview){return `<details class="run-details"><summary>Exercise title & learning objective</summary><form id="details-form"><label>Title<input id="exercise-title" maxlength="120" required value="${esc(r.run.label)}"></label><label>Learning objective<textarea id="objective" maxlength="1000">${esc(r.run.objective)}</textarea></label><button>Save exercise details</button></form></details>`;}
function notesForm(){
  const resultId=review?.commands[selected]?.id;const notes=review?.annotations.filter(a=>!a.commandId||a.commandId===resultId)??[];
  return `<section class="notes"><h3>Intent, reflection & assessment</h3>${notes.map(a=>`<article class="note"><small>${esc(a.kind)} · ${esc(a.authorLabel)} · ${esc(a.audience)}</small><p>${esc(a.text)}</p><small>${esc(a.timing)} · ${esc(date(a.createdAt))}${a.rubric?' · rubric: '+esc(a.rubric):''}</small></article>`).join('')||'<p class="muted">No explanation was recorded for this decision.</p>'}<form id="note-form" class="note-form"><div class="field-row"><label>Note type<select id="note-kind"><option value="reflection">Reflection</option><option value="assumption">Assumption</option><option value="assessment">Assessment</option></select></label><label>Audience<select id="note-audience"><option value="exercise">Exercise participants</option><option value="private">Only this participant</option></select></label></div><label id="rubric-label" hidden>Rubric / version<input id="note-rubric" maxlength="200" placeholder="e.g. Coordination rubric v1"></label><label>Note<textarea id="note-text" maxlength="2000" required placeholder="What did you expect? What would you keep or change?"></textarea></label><button class="primary" type="submit">Save note</button><small>Notes added to a resolved order are marked retrospective. Assessments are attributed statements, not automatic grades.</small></form></section>`;
}
function bindNotes(){
  $('note-kind').onchange=()=>{$('rubric-label').hidden=$<HTMLSelectElement>('note-kind').value!=='assessment';$<HTMLInputElement>('note-rubric').required=!$('rubric-label').hidden;};
  let noteId=crypto.randomUUID();$('note-form').onsubmit=e=>{e.preventDefault();const index=selected;void safely(async()=>{await post('note',{id:noteId,runId:review!.run.id,commandId:review!.commands[selected]?.id,kind:$<HTMLSelectElement>('note-kind').value,text:$<HTMLTextAreaElement>('note-text').value,audience:$<HTMLSelectElement>('note-audience').value,rubric:$<HTMLInputElement>('note-rubric').value});noteId=crypto.randomUUID();review=await api<RunReview>('/api/capture/review?run='+review!.run.id);await selectDecision(index);notice('Note saved.');});};
}
function drawMap(){
  const canvas=document.getElementById('review-map') as HTMLCanvasElement|null;if(!canvas||!content||!current)return;
  const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio,2);if(!rect.width||!rect.height)return;canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;
  const ctx=canvas.getContext('2d')!;ctx.scale(dpr,dpr);ctx.fillStyle='#dce8e5';ctx.fillRect(0,0,rect.width,rect.height);
  const cells=content.map.cells,minX=Math.min(...cells.map(c=>c.x)),maxX=Math.max(...cells.map(c=>c.x)),minZ=Math.min(...cells.map(c=>c.z)),maxZ=Math.max(...cells.map(c=>c.z));
  const fit=Math.min((rect.width-36)/(maxX-minX||1),(rect.height-38)/(maxZ-minZ||1)),scale=fit*zoom,cx=(minX+maxX)/2,cz=(minZ+maxZ)/2;
  const point=(c:{x:number;z:number})=>({x:rect.width/2+(c.x-cx)*scale+pan.x,y:rect.height/2+(c.z-cz)*scale+pan.y});
  const radius=content.map.view.hexKm/Math.sqrt(3)*scale;const colors:Record<string,string>={ocean:'#cbdeda',coast:'#afc2a8',land:'#879f83',reef:'#d4cba3',lagoon:'#a9cbc3'};
  for(const cell of cells){const p=point(cell);if(p.x< -radius||p.y< -radius||p.x>rect.width+radius||p.y>rect.height+radius)continue;ctx.beginPath();for(let i=0;i<6;i++){const angle=Math.PI/180*(60*i+30),x=p.x+radius*Math.cos(angle),y=p.y+radius*Math.sin(angle);i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fillStyle=colors[cell.terrain]??'#a6b9ad';ctx.fill();ctx.strokeStyle='#91afa333';ctx.lineWidth=.5;ctx.stroke();}
  const byId=new Map(cells.map(c=>[c.id,c])),command=review?.commands[selected],action=command?op(command).action:null;
  const highlighted=action&&'pieceId'in action?action.pieceId:action?.type==='deploy'?action.id:null;
  if(before&&after&&highlighted){const a=before.pieces.find(p=>p.id===highlighted),b=after.pieces.find(p=>p.id===highlighted),ca=byId.get(a?.tileId??''),cb=byId.get(b?.tileId??'');if(ca&&cb&&ca.id!==cb.id){const p=point(ca),q=point(cb);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.strokeStyle='#d69936';ctx.lineWidth=3;ctx.setLineDash([5,4]);ctx.stroke();ctx.setLineDash([]);}}
  for(const piece of current.pieces){if(!piece.tileId)continue;const cell=byId.get(piece.tileId);if(!cell)continue;const p=point(cell),r=Math.max(5,Math.min(12,radius*.65));ctx.beginPath();ctx.arc(p.x,p.y,r+2,0,Math.PI*2);ctx.fillStyle=piece.id===highlighted?'#e4b358':'#f6f5e9';ctx.fill();ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fillStyle=piece.force==='blue'?'#2b6483':'#a64c45';ctx.fill();ctx.fillStyle='white';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`600 ${Math.max(8,r)}px system-ui`;ctx.fillText(piece.force==='blue'?'B':'R',p.x,p.y+.5);if(piece.id===highlighted||zoom>2){const label=name(piece.definitionId);ctx.font='11px system-ui';const text=label.length>32?label.slice(0,30)+'…':label,w=ctx.measureText(text).width;ctx.fillStyle='#f9faf2ee';ctx.fillRect(p.x-w/2-5,p.y+r+5,w+10,19);ctx.fillStyle='#253f3c';ctx.fillText(text,p.x,p.y+r+15);}}
}
async function showReports(){
  const query=$<HTMLSelectElement>('map-filter').value;notice('Calculating reports…');report=await api<Report>('/api/capture/reports'+(query?'?map='+encodeURIComponent(query):''));notice();
  $('reports-view').innerHTML=`<p class="report-intro">${esc(report.definitions.denominator)} Comparison groups use matching map, content, build and actor-source conditions. Rates below describe exercises, not learning efficacy.</p><div class="report-section"><h2>Comparable exercise groups</h2><p>Archived and active runs are labeled individually below. Imported starting histories and runs without new decisions remain outside pooled rates.</p><div class="table-scroll"><table><thead><tr><th>Map / version group</th><th class="num">Runs</th><th class="num">Submitted</th><th class="num">Rejected</th><th class="num">Rejection rate</th></tr></thead><tbody>${report.groups.map(g=>`<tr><td>${esc(g.mapId)}<br><small>${g.key.slice(0,10)}</small></td><td class="num">${g.runs}</td><td class="num">${g.submitted}</td><td class="num">${g.rejected}</td><td class="num">${percent(g.rejectionRate)}</td></tr>`).join('')||'<tr><td colspan="5">No comparable newly recorded decisions yet.</td></tr>'}</tbody></table></div></div><div class="report-section"><h2>Exercise evidence</h2><div class="table-scroll"><table><thead><tr><th>Exercise</th><th>Status</th><th class="num">Submitted</th><th class="num">Retries</th><th>Comparison coverage</th></tr></thead><tbody>${report.rows.map(r=>`<tr><td><button class="table-link" data-report-run="${r.run.id}">${esc(r.run.label)}</button><br><small>${r.run.id.slice(0,8)}</small></td><td>${r.run.status}</td><td class="num">${r.submitted}</td><td class="num">${r.retries}</td><td>${r.eligible?'Included · '+r.compatibilityKey.slice(0,10):esc(r.exclusion)}<br><small>${r.unknownViews} missing decision views · ${r.droppedTelemetry} reported telemetry drops</small></td></tr>`).join('')}</tbody></table></div></div><div class="report-select"><label>Inspect one exercise<select id="report-run">${report.rows.map(r=>`<option value="${r.run.id}">${esc(r.run.label)} · ${r.run.id.slice(0,8)}</option>`).join('')}</select></label><a href="/api/capture/csv${query?'?map='+encodeURIComponent(query):''}">Download comparison CSV</a></div><div id="report-detail"></div>`;
  if(review&&report.rows.some(r=>r.run.id===review!.run.id))$<HTMLSelectElement>('report-run').value=review.run.id;
  $('report-run').onchange=renderReportDetail;$('reports-view').querySelectorAll<HTMLButtonElement>('[data-report-run]').forEach(button=>button.onclick=()=>{setMode('replay');void safely(()=>openRun(button.dataset.reportRun!));});renderReportDetail();
}
function renderReportDetail(){
  const r=report?.rows.find(r=>r.run.id===$<HTMLSelectElement>('report-run').value);if(!r){$('report-detail').innerHTML='';return;}
  const reasons=Object.entries(r.reasons),max=Math.max(1,...reasons.map(([,n])=>n));
  $('report-detail').innerHTML=`<section class="report-section"><h2>01 · Rule & interface friction</h2><div class="metric-strip"><div><strong>${r.submitted}</strong><small>Unique submitted orders</small></div><div><strong>${r.rejected}</strong><small>Rejected orders</small></div><div><strong>${percent(r.rejectionRate)}</strong><small>Rejection rate</small></div></div>${reasons.map(([code,n])=>`<div class="reason-row"><span>${esc(code)}</span><meter min="0" max="${max}" value="${n}"></meter><span>${n}</span></div>`).join('')||'<p>No rejected orders recorded.</p>'}<p>${r.eventCounts.restriction??0} displayed restrictions · ${r.eventCounts.cancel??0} cancelled previews · ${r.eventCounts.help??0} help openings · ${r.retries} retries. Client events may be incomplete.</p></section><section class="report-section"><h2>02 · Resource & transport choices</h2><p>${esc(report!.definitions.resources)}</p><div class="table-scroll"><table><thead><tr><th>Turn</th><th class="num">MP cost</th><th class="num">MP remaining</th><th class="num">Moves</th><th class="num">Loads / unloads</th><th class="num">Cargo slots used</th></tr></thead><tbody>${r.turns.map(t=>`<tr><td>${t.turn}</td><td class="num">${t.movementCost}</td><td class="num">${t.movementRemaining}</td><td class="num">${t.moves}</td><td class="num">${t.loads} / ${t.unloads}</td><td class="num">${t.usedSlots} / ${t.cargoSlots} · ${percent(t.utilization)}</td></tr>`).join('')}</tbody></table></div></section><section class="report-section"><h2>03 · Participation & pacing</h2><p>${esc(report!.definitions.pacing)} Intervals include unobserved pauses and do not measure thinking time.</p><div class="table-scroll"><table><thead><tr><th>Participant / interface</th><th class="num">Accepted / submitted</th><th class="num">First order</th><th class="num">Mean interval</th><th class="num">Disconnects</th></tr></thead><tbody>${r.participants.map(p=>`<tr><td>${esc(p.label)} · ${esc(p.kind)}<br><small>${esc(p.interfaces.join(', '))}</small></td><td class="num">${p.accepted} / ${p.submitted}</td><td class="num">${duration(p.firstOrderMs)}</td><td class="num">${duration(p.meanOrderIntervalMs)}</td><td class="num">${p.disconnects}</td></tr>`).join('')}</tbody></table></div><p>${r.assessments} shared assessments recorded. ${esc(report!.definitions.quality)}</p></section>`;
}
function setMode(next:typeof mode){mode=next;$('replay-tab').setAttribute('aria-selected',String(mode==='replay'));$('reports-tab').setAttribute('aria-selected',String(mode==='reports'));$('replay-view').hidden=mode!=='replay';$('reports-view').hidden=mode!=='reports';if(mode==='replay')drawMap();}
$('replay-tab').onclick=()=>setMode('replay');$('reports-tab').onclick=()=>{setMode('reports');void safely(showReports);};$('refresh').onclick=()=>void safely(refresh);
$('map-filter').onchange=()=>{list();if(mode==='reports')void safely(showReports);};
document.addEventListener('keydown',event=>{if(mode!=='replay'||(event.target as HTMLElement).matches('input,select,textarea'))return;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();void safely(()=>selectDecision(selected+(event.key==='ArrowLeft'?-1:1)));}});
void safely(async()=>{await post('join',{});await refresh();});
