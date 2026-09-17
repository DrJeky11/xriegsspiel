import './workspace.css';
import { batchError, opposite, orderCost, orderKey, describeOrder } from './types.ts';
import type { Candidate, Difficulty, Order, Side } from './types.ts';
import type { Scenario } from '../../scenarios/scoring.ts';
import type { OpponentCommand, OpponentOperation, RunView } from '../../server/opponent-session.ts';
import type { TablePanel, PanelButton } from '../play/panel.ts';
import type { TablePiece } from '../play/piece-layer.ts';
import type { TerrainMap } from '../pacific/terrain.ts';
import { installNavigation, hasNavigation, tileLabel } from './geography.ts';
import { vesselBoard } from '../scenario/navigation.ts';
import type { GrabBindings } from '../play/spatial-palette.ts';
import { scenarioLayout } from './layout.ts';
import { guidedHint } from '../sensei/model.ts';
import { supportsGuide } from '../sensei/guided-policy.ts';
import type { GuideDecision, Lesson } from '../sensei/guided-policy.ts';

interface SavedRun { id: string; playerToken: string; refereeToken?: string; title: string; mapId: string }
interface Options {
  root: HTMLElement; map: (id: string) => TerrainMap; currentMap: () => string;
  switchMap: (id: string) => Promise<void>; selectTile: (id: string) => void; focusTile: (id: string) => void;
  setPieces: (pieces: TablePiece[], reachable: string[], path: string[], select: (id: string) => void) => void;
  setPanel: (panel: TablePanel) => void; show: () => void; hide: () => void; exitXR: () => Promise<void>;
}
type Brief = Scenario & { objectives: Record<Side, string>; guidance: string[] };
const storageKey = 'xriegsspiel-opponent-runs/1';
const levels: Difficulty[] = ['novice', 'standard', 'advanced'];
const title = (s: string) => s[0].toUpperCase() + s.slice(1);
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
const short = (s: string, max = 57) => s.length > max ? s.slice(0, max - 1) + '…' : s;
const wrap = (text: string) => text.match(/.{1,58}(?:\s|$)|.{1,58}/g) ?? [];

export async function initOpponentWorkspace(options: Options) {
  let active = false, busy = false, online = true, view: RunView | null = null, credentials: SavedRun | null = null;
  let saved: SavedRun[] = []; try { saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { /* Empty local library if storage is unavailable. */ }
  let scenarioId = 'SPR-H01', difficulty: Difficulty = 'standard', humanSide: Side = 'blue', asReferee = false, shortWindow = false;
  let reviewRound: number | null = null;
  const senseiPilot = new URL(location.href).searchParams.get('sensei') === 'pilot';
  let hintState: {key: string; decision: GuideDecision} | null = null;
  const hintHistory = new Map<string, Lesson[]>(), briefAcknowledged = new Set<string>();
  const hintLog: Record<string, unknown>[] = [];
  let movePreview: Candidate | null = null, held: string | null = null;
  let actionFilter: 'mission' | 'move' = 'move';
  let selected: string | null = null, group = 'Staff', draft: Order[] = [], confirm = false, pending: OpponentCommand | null = null;
  let message = 'Choose a scenario and the side you want to play.', xrPage: 'home' | 'actions' | 'plan' | 'brief' | 'review' | 'reports' | 'controls' | 'saved' | 'route' | 'sensei' = 'home', xrIndex = 0, fetchGeneration = 0;
  const root = options.root;
  const api = async <T>(path: string, body?: unknown, referee = asReferee): Promise<T> => {
    const query = credentials ? `?run=${credentials.id}&side=${view?.observation.side ?? humanSide}` : '';
    const response = await fetch(`/api/opponents/${path}${query}`, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(credentials ? { Authorization: `Bearer ${referee ? credentials.refereeToken || '' : credentials.playerToken}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Exercise request failed.'); return data;
  };
  const catalog = await api<Brief[]>('catalog');
  const matching = catalog.find(s => s.mapId === options.currentMap()); if (matching) scenarioId = matching.id;
  const brief = (): Brief => view ? { ...view.observation.scenario, objectives: view.observation.objectives, guidance: view.observation.guidance } : catalog.find(s => s.id === scenarioId)!;
  const persist = () => { try { localStorage.setItem(storageKey, JSON.stringify(saved)); } catch { message = 'Browser storage unavailable. Keep the invitation link to resume this run.'; } };
  const canOrder = () => !!view && online && !busy && !pending && !view.paused && !view.contest && view.phase === 'planning' && !view.sealed[view.observation.side] && (view.observation.side === view.humanSide || asReferee && view.takeover);
  const hintSession = () => `${view?.id}:${view?.observation.side}`;
  const canHint = () => senseiPilot && !!view && supportsGuide(view.observation) && online && !busy && !pending && !view.paused && !view.contest;
  const hintKey = () => JSON.stringify([view?.id, view?.revision, view?.observation.side, draft, movePreview?.id, briefAcknowledged.has(hintSession())]);
  const currentHint = () => hintState?.key === hintKey() ? hintState.decision.hint : null;
  function requestHint() {
    if (!view || !canHint()) return;
    const key=hintSession(), seen=hintHistory.get(key)??[];
    const context={phase:view.phase, mode:'practice' as const, requested:true, briefRead:briefAcknowledged.has(key),
      draft:view.phase==='planning'?structuredClone(draft):[], previewId:movePreview?.id, seen:[...seen]};
    const decision=guidedHint(view.observation,context);
    hintState={key:hintKey(),decision};
    if(decision.hint){
      hintHistory.set(key,[...seen,decision.hint.id].slice(-8));
      hintLog.push({id:crypto.randomUUID(),time:new Date().toISOString(),runId:view.id,observationId:view.observationId,
        revision:view.revision,side:view.observation.side,round:view.observation.round,context,decision});
      if(hintLog.length>200)hintLog.shift();
    }
    go('sensei');
  }
  function exportHints() {
    const blob=new Blob([JSON.stringify({schema:'guided-pilot-review/1',trainingPermission:'unspecified',
      scope:'Last 200 requested hints in this page session; not a complete assistance record.',records:hintLog},null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='guided-pilot-review.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const show = () => { active = true; options.show(); render(); };
  const hide = () => { active = false; options.hide(); };
  const status = (text: string) => { message = text; render(); };
  const pathFor = (mapId: string) => mapId.includes('/') ? `/pacific.html?region=${mapId.split('/')[0]}&scale=${mapId.endsWith('focus') ? 'focus' : 'overview'}` : `/centcom.html?region=${mapId}`;
  async function displayMap(mapId: string) {
    if (mapId.includes('/') !== options.currentMap().includes('/')) {
      await options.exitXR(); location.assign(`${pathFor(mapId)}&opponent=${credentials!.id}`); return;
    }
    if (options.currentMap() !== mapId) await options.switchMap(mapId);
  }
  function accept(next: RunView) {
    const firstView = !view;
    if (view && next.revision !== view.revision) { draft = []; confirm = false; reviewRound = null; movePreview = null; held = null; if (!busy) pending = null; }
    if (next.observation.geography && !hasNavigation(next.observation.geography.mapId)) installNavigation(vesselBoard(options.map(next.observation.geography.mapId)));
    view = next;if(next.observationId)void api('presented',{observationId:next.observationId}).catch(()=>{}); scenarioId = next.observation.scenario.id; humanSide = next.humanSide; difficulty = next.difficulty;
    if(firstView){selected=next.observation.assets.find(a=>a.side===next.observation.side&&a.ready&&a.tileId)?.id??null;group=selected??'Staff';}
    if (!next.observation.candidates.some(c => c.group === group)) group = next.observation.candidates[0]?.group ?? 'Staff';
    online = true;
  }
  async function refresh() {
    if (!credentials || busy) return;
    const ticket = ++fetchGeneration;
    try { const next = await api<RunView>('state'); if (ticket !== fetchGeneration) return; const changed = !view || next.revision !== view.revision || !online; accept(next); if (changed) render(); }
    catch (error) { if (ticket !== fetchGeneration) return; online = false; status(String(error)); }
  }
  async function resume(run: SavedRun) {
    if (busy) return; credentials = run; asReferee = false; view = null; draft = []; pending = null; confirm = false; busy = true; show();
    try { accept(await api<RunView>('state', undefined, false)); await displayMap(view!.observation.scenario.mapId); const first=view!.observation.assets.find(a=>a.id===selected);if(first?.tileId)options.focusTile(first.tileId); message = 'Exercise restored. Your saved map assembly remains separate.'; xrPage = 'home'; }
    catch (error) { message = String(error); } finally { busy = false; render(); }
  }
  async function start() {
    if (busy) return; busy = true; message = 'Preparing the opponent’s sealed plan…'; render();
    try {
      const created = await api<{ playerToken: string; refereeToken: string; state: RunView }>('create', { scenarioId, difficulty, humanSide, ...(scenarioId === 'SPR-H01' && shortWindow ? { variant: 'short-window/1' } : {}) });
      const s = catalog.find(s => s.id === scenarioId)!;
      credentials = { id: created.state.id, playerToken: created.playerToken, refereeToken: created.refereeToken, title: s.title, mapId: s.mapId };
      saved.unshift(credentials); persist(); asReferee = false; accept(created.state); draft = []; pending = null; confirm = false; selected = created.state.observation.assets.find(a=>a.side===humanSide&&a.ready&&a.tileId)?.id ?? null; group = selected ?? 'Staff'; movePreview = null; held = null;
      await displayMap(s.mapId); const first=view!.observation.assets.find(a=>a.id===selected); if(first?.tileId)options.focusTile(first.tileId); const url = new URL(location.href); url.searchParams.set('opponent', credentials.id); history.replaceState(null, '', url);
      message = 'Opponent ready. Build a plan using up to 3 CP, then seal your orders.'; xrPage = 'home';
    } catch (error) { message = String(error); } finally { busy = false; render(); }
  }
  async function send(operation: OpponentOperation) {
    if (!credentials || !view || busy) return;
    busy = true; confirm = false; fetchGeneration++; pending ??= { id: crypto.randomUUID(), revision: view.revision, operation,observationId:view.observationId }; render();
    try { const response = await api<{ state: RunView }>('command', pending); accept(response.state); pending = null; draft = []; message = view!.phase === 'review' ? 'Round resolved. Review events before opening the next round.' : 'Saved.'; xrPage = view!.phase === 'planning' ? 'home' : 'review'; }
    catch (error) { message = `${String(error)} Use Retry to resend the identical command, or Refresh to inspect the saved state.`; }
    finally { busy = false; render(); }
  }
  function add(c: Candidate) { if (!canOrder()) return; const error = draftError(c); if (error) return status(error); draft.push(c.order); movePreview = null; confirm = false; status(`${c.label} added to the plan. ${3 - draft.reduce((n, o) => n + orderCost(o), 0)} CP remain.`); }
  function choose(id: string) { if (id.startsWith('sector:')) return; selected = id; movePreview = null; const a = view?.observation.assets.find(a => a.id === id); group = a?.side === view?.observation.side ? id : 'Staff'; actionFilter=view?.observation.candidates.some(c=>c.group===group&&['deliver','rescue','handover'].includes(c.order.type))?'mission':'move'; xrPage = 'actions'; xrIndex = 0; render(); }
  function choices() { return view?.observation.candidates.filter(c => c.group === group && c.order.type !== 'hold' && (!view?.observation.geography || group==='Staff' || (actionFilter === 'move' ? c.order.type === 'move' : c.order.type !== 'move'))) ?? []; }
  function draftError(c: Candidate) { return batchError([...draft,c.order]) || (c.order.type === 'move' && draft.some(o=>o.type==='move'&&o.target===(c.order as Extract<Order,{type:'move'}>).target) ? 'Another ship reserves this destination.' : null); }
  function selectOrder(c: Candidate) { if(c.order.type==='move'&&view?.observation.geography) {selected=c.order.asset; movePreview=c; xrPage='route'; render();} else add(c); }
  function routeTo(id: string | null, asset = selected) { return view?.observation.candidates.find(c=>c.order.type==='move'&&c.order.asset===asset&&c.order.target===id); }
  function label(order: Order) { return order.type==='move'&&view?.observation.geography ? `${order.asset} → hex ${tileLabel(view.observation.geography.mapId,order.target)}` : describeOrder(order); }
  function button(label: string, run: () => void, enabled = true): PanelButton { return { label, run, enabled: enabled && !busy }; }
  function go(page: typeof xrPage) { xrPage = page; xrIndex = 0; render(); }
  async function invite() {
    if (!credentials) return;
    const link = `${location.origin}${pathFor(credentials.mapId)}&opponent=${credentials.id}#team=${encodeURIComponent(credentials.playerToken)}`;
    try { await navigator.clipboard.writeText(link); status('Team invitation copied. It permits orders for your side, without referee access.'); }
    catch { const input = root.querySelector<HTMLInputElement>('#op-invitation'); if (input) { input.hidden = false; input.value = link; input.select(); } }
  }
  async function exportRun() {
    try { const data = await api('export'); const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `xriegsspiel-${scenarioId}-${view!.branchId}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); status('Replay and decision record exported, including both sides’ completed-game observations.'); }
    catch (error) { status(String(error)); }
  }
  async function refereeMode() {
    if (!credentials?.refereeToken) return status('The exercise creator holds the referee key. Join from that browser to adjudicate.');
    asReferee = !asReferee; pending = null; await refresh(); render();
  }
  async function controlSide() {
    if (!view?.takeover || !asReferee) return;
    view.observation.side = opposite(view.observation.side); draft = []; confirm = false; pending = null; await refresh(); render();
  }
  function setup() { if(busy)return; view = null; credentials = null; draft = []; confirm = false; pending = null; asReferee = false; xrPage = 'home'; const url = new URL(location.href); url.searchParams.delete('opponent'); history.replaceState(null, '', url); message = 'Start another run; earlier exercises remain in Saved runs.'; render(); }

  function render() {
    if (!active) return;
    const o = view?.observation, s = brief(), groups = [...new Set(o?.candidates.filter(c => c.order.type !== 'hold').map(c => c.group) ?? [])];
    const used = draft.reduce((n, order) => n + orderCost(order), 0);
    const summary = view ? `${title(difficulty)} opponent · ${o!.side === 'blue' ? 'Blue' : 'Red'} player · Round ${o!.round}/${s.rounds}${o!.variant ? ' · Short window' : ''}` : 'Eight maritime exercises';
    const progress = o ? Object.entries(o.metrics).filter(([key]) => !/^(blue|red)_/.test(key)) : [];
    const roundToReview = reviewRound ?? o?.round;
    const record = view?.review.find(r => r.round === roundToReview);
    const hint=currentHint();
    root.innerHTML = `<p class="eyebrow">Play against AI</p><h2>${esc(view ? s.title : 'Choose your opposition')}</h2><p class="muted">${esc(summary)}</p><p id="op-status" role="status" aria-live="polite">${esc(message)}</p>
    ${view ? `<div class="op-metrics"><b>${3 - used} CP in draft</b><span>${o!.pressure}/${s.pressureTokens} pressure left</span><span>${view.phase === 'planning' ? 'Sealed planning' : view.phase === 'review' ? 'Result review' : 'Exercise complete'}${view.paused ? ' · PAUSED' : ''}</span></div><p><strong>Your mission</strong><br>${esc(o!.objectives[o!.side])}</p>
      ${view.result ? `<section class="op-result"><p class="eyebrow">${esc(view.result.outcome.replaceAll('_', ' '))}</p><h2>${view.result.scores?.blue.total} Blue / ${view.result.scores?.red.total} Red</h2><p>${esc(view.result.reason)}</p><p>Game outcome and diagnostic points are separate from learning assessment.</p></section>` : ''}
      <p class="op-progress">${progress.map(([key, value]) => `<span><b>${esc(title(key.replaceAll('_', ' ')))}</b> ${value}/${s.metrics[key].max}</span>`).join('')}</p>
      <details id="op-brief"><summary>Briefing, roles & rules</summary><p><b>Blue:</b> ${esc(s.actors.blue)}<br><b>Red:</b> ${esc(s.actors.red)}</p><p>${esc(o!.objectives[opposite(o!.side)])}</p><ul>${o!.guidance.map(g => `<li>${esc(g)}</li>`).join('')}</ul><p>Three CP and at most three orders per side each round. Each mobile asset acts once. Prerequisites use the start of the round. Orders are sealed; both sides resolve together. Medical and rescue actions are protected. Unused effort expires. Both sides’ decision records are disclosed after completion.</p><p>Original abstract exercise · scenario ${s.version} · ${s.rulesVersion}${o!.variant ? ' · variant ' + o!.variant : ''}. ${o!.geography ? 'Ships move on native water hexes. Movement points and objective areas are authored game rules.' : 'Legacy sector exercise: connections are abstract game moves.'}</p></details>
      ${selected&&o!.assets.find(a=>a.id===selected)?.tileId?'<button id="op-focus">Focus selected ship</button>':''}<div class="op-sectors">${o!.sectors.map(sector => `<button data-sector="${esc(sector)}">${esc(o!.geography?.goals.find(g=>g.id===sector)?.label??sector)}</button>`).join('<span>·</span>')}</div>
      <details><summary>Forces & cargo (${o!.assets.length})</summary><div class="op-roster">${o!.assets.map(a => `<button data-asset="${a.id}" aria-pressed="${selected === a.id}"><b class="${a.side}">${a.id}</b><span>${esc(a.kind)} · ${esc(o!.geography&&a.tileId ? 'hex '+tileLabel(s.mapId,a.tileId)+' · '+a.movement+' MP' : a.sector)}${a.ready ? '' : ' · unavailable'}<small>${a.cargo.length ? 'Cargo ' + a.cargo.join(', ') : 'No cargo'}</small></span></button>`).join('')}</div></details>
      ${view.phase === 'planning' ? `<section class="op-orders"><h3>Build this round’s plan</h3>${o!.geography ? `<p>Select your ship, then a highlighted water hex to preview its route. Red ships can intercept adjacent routes.</p><label>Orders<select id="op-filter"><option value="mission" ${actionFilter==='mission'?'selected':''}>Mission & staff actions</option><option value="move" ${actionFilter==='move'?'selected':''}>Movement destinations</option></select></label>` : ''}${movePreview ? `<p><b>Route preview</b><br>${esc(movePreview.label)} · 1 CP<br>${esc(movePreview.warning??'Water route; movement resolves after both sides seal.')}</p><button id="op-route-add">Add route to plan</button><button id="op-route-cancel">Cancel route</button>` : ''}<label>Unit or staff action<select id="op-group">${groups.map(g => `<option ${g === group ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select></label><label>Available order<select id="op-action">${choices().map((c, i) => `<option value="${i}" ${batchError([...draft, c.order]) ? 'disabled' : ''}>${esc(c.label)} · ${c.cost} CP</option>`).join('')}</select></label><button id="op-add" ${!canOrder() || !choices().some(c => !batchError([...draft, c.order])) ? 'disabled' : ''}>${o!.geography&&actionFilter==='move'&&group!=='Staff'?'Preview route':'Add order to plan'}</button><ol class="op-draft">${draft.map((order, i) => `<li>${esc(label(order))}<button data-remove="${i}" aria-label="Remove order ${i + 1}">Remove</button></li>`).join('') || '<li>No orders yet. Sealing an empty plan holds this round.</li>'}</ol><p>Opponent ${view.sealed[opposite(o!.side)] ? 'has sealed its plan' : 'awaiting orders'}. Your draft is local until sealed.</p><button id="op-seal" class="op-primary" ${!canOrder() ? 'disabled' : ''}>${confirm ? `Confirm and seal ${draft.length} orders` : `Review plan · ${used}/3 CP`}</button>${confirm ? '<button id="op-back">Keep planning</button>' : ''}${view.sealed[o!.side] ? '<p>Your orders are sealed; waiting for the other side.</p>' : ''}</section>` : ''}
      ${view.phase === 'review' ? `<button id="op-next" class="op-primary" ${busy || view.paused || view.contest ? 'disabled' : ''}>${o!.finished ? 'Finish review & score exercise' : 'Next round'}</button>` : ''}
      <details ${view.phase !== 'planning' ? 'open' : ''}><summary>Round events & decision review</summary><label>Review round<select id="op-review-round">${Array.from({length:o!.round},(_,i)=>`<option value="${i+1}" ${roundToReview===i+1?'selected':''}>Round ${i+1}</option>`).join('')}</select></label><ol class="op-events">${o!.events.filter(e => e.round === roundToReview).map(e => `<li><small>${esc(e.id)} · ${esc(e.side || 'Exercise')}</small>${esc(e.message)}</li>`).join('')}</ol>${record ? `<p><b>Your information before this decision</b><br>Pressure ${record.observation.pressure}; ${record.observation.reports.length} reports received; ${record.observation.candidates.length} legal individual choices.<br>${esc(record.observation.reports.map(r=>r.id+': '+(r.verified===null?'unverified':'verified')).join(' · '))}</p>` : ''}${view.result && record ? `<p><b>AI decision · round ${record.round}</b><br>${esc(record.decision?.reason ?? 'Human takeover')}<br>${record.decision ? `${record.decision.considered} plans / ${record.decision.transitions} simulated transitions${record.decision.fallback ? ' · ' + esc(record.decision.fallback) : ''}` : ''}</p><p><b>Selected orders</b><br>${esc(record.decision?.orders.map(label).join('; ') || 'Hold / human takeover')}</p>${record.decision?.alternatives.length ? `<details><summary>Alternatives the AI compared</summary>${record.decision.alternatives.map(a=>`<p>${esc(a.orders.map(label).join('; ')||'Hold')}<br>Authored utility estimate: ${a.value.toFixed(1)}</p>`).join('')}<p>These are planner estimates under its stated assumptions, not probabilities or proof of an optimal plan.</p></details>`:''}` : ''}</details>
      <details><summary>Reports (${o!.reports.length})</summary>${o!.reports.map(r => `<p><b>${esc(r.id)} · ${r.verified === null ? 'Unverified' : 'Verified'}</b><br>${esc(r.claim)}${r.truth ? '<br>' + esc(r.truth) : ''}</p>`).join('')}</details>
      ${view.phase === 'review' && !view.contest ? `<details><summary>Contest a result</summary><label>Event<select id="op-contest-event">${o!.events.filter(e => e.round === o!.round).map(e => `<option value="${e.id}">${esc(e.id + ' · ' + short(e.message, 65))}</option>`).join('')}</select></label><label>Reason<textarea id="op-reason" maxlength="1000"></textarea></label><button id="op-contest">Submit contest</button></details>` : ''}
      ${view.contest ? `<section class="op-contest"><h3>Advancement frozen</h3><p>${esc(view.contest.eventId)}: ${esc(view.contest.reason)}</p>${asReferee ? '<label>Referee ruling<textarea id="op-ruling" maxlength="1000"></textarea></label><button id="op-uphold">Uphold result</button><button id="op-replay">Replay round as a new branch</button>' : '<p>Use referee controls to record a ruling.</p>'}</section>` : ''}
      <div class="op-controls"><button id="op-pause">${view.paused ? 'Resume' : 'Pause'}</button><button id="op-refresh">Refresh</button>${pending ? '<button id="op-retry">Retry saved command</button>' : ''}<button id="op-invite">Copy team invitation</button><input id="op-invitation" readonly hidden>${view.phase === 'complete' ? '<button id="op-export">Export replay & decisions</button>' : ''}<button id="op-referee">${asReferee ? 'Leave referee controls' : 'Referee controls'}</button>${asReferee && view.phase === 'planning' ? `<button id="op-takeover">${view.takeover ? 'Restore AI control' : 'Take over AI side'}</button>${view.takeover ? '<button id="op-side">Switch controlled side</button>' : ''}` : ''}<button id="op-new">New scenario</button></div><p class="muted">${online ? 'Connected · saved' : 'Connection unavailable'} · revision ${view.revision}${view.refereeModified ? ' · Referee-modified teaching run' : ''}</p>
    ` : `<label>Scenario<select id="op-scenario">${catalog.map(c => `<option value="${c.id}" ${c.id === scenarioId ? 'selected' : ''}>${esc(c.id + ' · ' + c.title)}</option>`).join('')}</select></label><p>${esc(s.objectives[humanSide])}</p><label>Your side<select id="op-human"><option value="blue" ${humanSide === 'blue' ? 'selected' : ''}>Blue · ${esc(s.actors.blue)}</option><option value="red" ${humanSide === 'red' ? 'selected' : ''}>Red · ${esc(s.actors.red)}</option></select></label><label>AI difficulty<select id="op-difficulty">${levels.map(d => `<option ${d === difficulty ? 'selected' : ''}>${d}</option>`).join('')}</select></label>${scenarioId === 'SPR-H01' ? `<label>Scenario window<select id="op-window"><option value="baseline" ${!shortWindow?'selected':''}>Baseline · transports ready in round 1</option><option value="short" ${shortWindow?'selected':''}>Short window · transports ready in round 3</option></select></label><p class="muted">The short window gives less time to recover from delays. It is an explicit, versioned scenario variation, available at every AI difficulty.</p>`:''}<p class="muted">Novice: immediate choices. Standard: coordinated round planning. Advanced: up to three rounds of lookahead against several opposing responses. All use the same information and rules.</p><button id="op-start" class="op-primary" ${busy ? 'disabled' : ''}>Start exercise</button><p>New runs keep your saved map pieces and earlier exercises. Scenarios are original training abstractions; historical labels do not imply a reconstruction.</p>`}
      <details><summary>Saved runs (${saved.length})</summary>${saved.map((run, i) => `<button class="op-saved" data-saved="${i}">${esc(run.title)}<small>${run.id.slice(0, 8)}</small></button>`).join('')}</details><button id="op-leave">Return to map assembly</button>`;
    const el = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>(`#op-${id}`);
    const on = (id: string, fn: () => void) => { const e = el(id); if (e) (e as HTMLButtonElement).onclick = fn; };
    on('start', () => void start());
    if (senseiPilot && o && supportsGuide(o)) {
      const section=document.createElement('section');section.className='op-orders';
      section.innerHTML=`<h3>Sensei pilot · current round ${o.round}</h3><p>Optional practice hints for evaluation by you and your instructor.</p><button id="op-hint" ${canHint()?'':'disabled'}>Ask for a teaching hint</button><button id="op-hint-brief" ${briefAcknowledged.has(hintSession())?'disabled':''}>${briefAcknowledged.has(hintSession())?'Briefing acknowledged':'I have read my mission briefing'}</button>${hint?`<h3>${esc(hint.title)}</h3><p>${esc(hint.text)}</p><p><b>${esc(hint.question)}</b></p><details><summary>Evidence</summary><p>${esc(hint.ruleRefs.join(' · '))}${hint.eventIds.length?'<br>'+esc(hint.eventIds.join(' · ')):''}</p></details>`:''}${hintLog.length?'<button id="op-hint-export">Export hint review log</button>':''}`;
      root.querySelector('.op-orders')?.insertAdjacentElement('afterend',section)??root.appendChild(section);
      on('hint',requestHint);on('hint-brief',()=>{briefAcknowledged.add(hintSession());render();});on('hint-export',exportHints);
    }
    on('focus',()=>{const a=o?.assets.find(a=>a.id===selected);if(a?.tileId)options.focusTile(a.tileId);});
    on('route-add', () => movePreview && add(movePreview)); on('route-cancel', () => {movePreview=null; render();});
    const filter=el<HTMLSelectElement>('filter'); if(filter)filter.onchange=()=>{actionFilter=filter.value as typeof actionFilter; xrIndex=0;render();};
    for (const id of ['scenario', 'difficulty', 'human']) { const e = el<HTMLSelectElement>(id); if (e) e.onchange = () => { scenarioId = el<HTMLSelectElement>('scenario')!.value; difficulty = el<HTMLSelectElement>('difficulty')!.value as Difficulty; humanSide = el<HTMLSelectElement>('human')!.value as Side; render(); }; }
    const groupElement = el<HTMLSelectElement>('group'); if (groupElement) groupElement.onchange = () => { group = groupElement.value; selected=o?.assets.some(a=>a.id===group)?group:null; movePreview=null; actionFilter=o?.candidates.some(c=>c.group===group&&['deliver','rescue','handover'].includes(c.order.type))?'mission':'move'; xrIndex = 0; render(); };
    const windowElement = el<HTMLSelectElement>('window'); if(windowElement)windowElement.onchange=()=>{shortWindow=windowElement.value==='short';render();};
    const reviewElement=el<HTMLSelectElement>('review-round');if(reviewElement)reviewElement.onchange=()=>{reviewRound=Number(reviewElement.value);render();};
    on('add', () => { const candidate = choices()[Number(el<HTMLSelectElement>('action')!.value)]; if (candidate) selectOrder(candidate); });
    root.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(b => b.onclick = () => { draft.splice(Number(b.dataset.remove), 1); confirm = false; render(); });
    root.querySelectorAll<HTMLButtonElement>('[data-asset]').forEach(b => b.onclick = () => choose(b.dataset.asset!));
    root.querySelectorAll<HTMLButtonElement>('[data-saved]').forEach(b => b.onclick = () => void resume(saved[Number(b.dataset.saved)]));
    root.querySelectorAll<HTMLButtonElement>('[data-sector]').forEach(b => b.onclick = () => { const cell = scenarioLayout(options.map(s.mapId), o!, selected).anchors.get(b.dataset.sector!); if (cell) options.focusTile(cell.id); });
    on('seal', () => { if (confirm) void send({ type: 'orders', side: o!.side, orders: draft }); else { confirm = true; render(); } });
    on('back', () => { confirm = false; render(); });
    on('next', () => void send({ type: 'next' })); on('pause', () => void send({ type: 'pause', paused: !view!.paused }));
    on('refresh', () => { pending = null; void refresh(); }); on('retry', () => pending && void send(pending.operation));
    on('new', setup); on('leave', hide); on('invite', () => void invite()); on('export', () => void exportRun());
    on('referee', () => void refereeMode()); on('side', () => void controlSide());
    on('takeover', () => void send({ type: 'takeover', enabled: !view!.takeover }));
    on('contest', () => void send({ type: 'contest', eventId: el<HTMLSelectElement>('contest-event')!.value, reason: el<HTMLTextAreaElement>('reason')!.value }));
    on('uphold', () => void send({ type: 'ruling', disposition: 'uphold', reason: el<HTMLTextAreaElement>('ruling')!.value }));
    on('replay', () => void send({ type: 'ruling', disposition: 'replay', reason: el<HTMLTextAreaElement>('ruling')!.value }));
    if (view && options.currentMap() === s.mapId) {
      const layout = scenarioLayout(options.map(s.mapId), o!, selected);
      const reachable = o!.candidates.filter(c => c.order.type === 'move' && c.order.asset === selected).map(c => o!.geography ? (c.order as Extract<Order,{type:'move'}>).target : layout.anchors.get((c.order as Extract<Order, { type: 'move' }>).target)!.id);
      options.setPieces(layout.pieces, canOrder()?reachable:[], movePreview?.path ?? [], choose);
    } else options.setPieces([], [], [], () => {});
    renderPanel();
  }

  function renderPanel() {
    const o = view?.observation, s = brief(), used = draft.reduce((n, order) => n + orderCost(order), 0);
    let panel: TablePanel = { title: view ? short(s.title.toUpperCase(), 35) : 'PLAY AGAINST AI', helpLine: 'TRIGGER: select/preview · SIDE GRIP: pick up your ship', lines: [], buttons: [] };
    const back = button('Back to exercise', () => go('home'));
    if (!view) {
      const index = catalog.findIndex(s => s.id === scenarioId);
      panel.lines = [s.id + ' · ' + s.title, `You: ${humanSide} / AI: ${opposite(humanSide)}`, `Difficulty: ${title(difficulty)}`, ...wrap(s.objectives[humanSide]).slice(0, 3), short(message)];
      panel.buttons = [button('Next scenario →', () => { scenarioId = catalog[(index + 1) % catalog.length].id; render(); }), scenarioId==='SPR-H01'?button(shortWindow?'Window: Short (rounds 3–6)':'Window: Baseline (rounds 1–6)',()=>{shortWindow=!shortWindow;render();}):button('← Previous scenario', () => { scenarioId = catalog[(index + catalog.length - 1) % catalog.length].id; render(); }), button('Difficulty: ' + title(difficulty), () => { difficulty = levels[(levels.indexOf(difficulty) + 1) % 3]; render(); }), button('Switch player side', () => { humanSide = opposite(humanSide); render(); }), button('Start exercise', () => void start()), button('Saved runs', () => go('saved')), button('Map assembly', hide)];
      if (xrPage === 'saved') { panel.title = 'SAVED EXERCISES'; panel.lines = ['Each run retains its own scenario and progress.']; panel.buttons = [...saved.slice(xrIndex, xrIndex + 4).map(r => button(short(r.title), () => void resume(r))), button('More runs', () => { xrIndex = (xrIndex + 4) % Math.max(1, saved.length); render(); }), button('Back', () => go('home'))]; }
    } else if (xrPage === 'route' && movePreview) {
      panel.lines=[...wrap(movePreview.label),...wrap(movePreview.warning??'Water route. Add it to the plan, then seal when ready.')];
      panel.buttons=[button('Add route to plan',()=>{if(movePreview)add(movePreview);go('plan');},canOrder()),button('Cancel route',()=>{movePreview=null;go('actions');}),back];
    } else if (xrPage === 'actions') {
      const groups = [...new Set(o!.candidates.filter(c => c.order.type !== 'hold').map(c => c.group))];
      const list = choices(); xrIndex = Math.min(xrIndex, Math.max(0, list.length - 1));
      panel.lines = [`Round ${o!.round} · ${o!.side} · ${3 - used} CP left`, `Action group: ${group}`, 'Select an order to add it to your draft.', ...wrap(message).slice(0, 3)];
      panel.buttons = [...list.slice(xrIndex, xrIndex + 2).map(c => button(short(c.label), () => selectOrder(c), canOrder() && !batchError([...draft, c.order]))), button('More choices →', () => { xrIndex = (xrIndex + 2) % Math.max(1, list.length); render(); }), button('Next unit / staff group', () => { group = groups[(groups.indexOf(group) + 1) % groups.length] ?? 'Staff'; selected=o!.assets.some(a=>a.id===group)?group:null; movePreview=null; xrIndex = 0; render(); }), button(actionFilter==='mission'?'Show movement routes':'Show mission actions',()=>{actionFilter=actionFilter==='mission'?'move':'mission';xrIndex=0;render();}), button('Review drafted orders', () => go('plan')), back];
    } else if (xrPage === 'plan') {
      panel.lines = [`${used}/3 CP · ${draft.length}/3 orders`, ...draft.flatMap(order => wrap(label(order))).slice(0, 5), draft.length ? 'Sealing resolves after both sides commit.' : 'Empty plan: Hold this round.'];
      panel.buttons = [button(confirm ? 'Confirm & seal orders' : 'Review, then seal', () => { if (confirm) void send({ type: 'orders', side: o!.side, orders: draft }); else { confirm = true; render(); } }, canOrder()), ...draft.map((_, i) => button(`Remove order ${i + 1}`, () => { draft.splice(i, 1); confirm = false; render(); })), button('Choose more orders', () => go('actions')), back];
    } else if (xrPage === 'brief') {
      const lines = [`You: ${s.actors[o!.side]}`, ...wrap(o!.objectives[o!.side]), ...o!.guidance.flatMap(wrap), ...wrap('3 CP, at most 3 orders, one action per asset. Orders resolve from start-of-round prerequisites. Both sides’ decisions are revealed after completion.')];
      panel.lines = lines.slice(xrIndex, xrIndex + 7); panel.buttons = [button('More briefing', () => { xrIndex = (xrIndex + 7) % lines.length; render(); }), back];
    } else if (xrPage === 'reports') {
      const report = o!.reports[xrIndex % Math.max(1, o!.reports.length)]; panel.lines = report ? [report.id + (report.verified === null ? ' · UNVERIFIED' : ' · VERIFIED'), ...wrap(report.claim), ...wrap(report.truth ?? 'Choose Verify in Staff actions to check this report.')].slice(0, 7) : ['No reports received.'];
      panel.buttons = [button('Next report', () => { xrIndex++; render(); }), button('Staff actions', () => { group = 'Staff'; go('actions'); }), back];
    } else if (xrPage === 'review' || xrPage === 'home' && (view.phase === 'review' || view.phase === 'complete')) {
      const events = o!.events.filter(e => e.round === o!.round), current = events[xrIndex % Math.max(1, events.length)];
      panel.lines = view.result ? [title(view.result.outcome.replaceAll('_', ' ')), `Blue ${view.result.scores?.blue.total} / Red ${view.result.scores?.red.total}`, ...wrap(view.result.reason).slice(0, 3), 'Full replay export is available in the browser.'] : [`Round ${o!.round} results`, current?.id ?? '', ...wrap(current?.message ?? '').slice(0, 4), view.contest ? 'CONTEST OPEN · advancement frozen' : 'Review before continuing.'];
      panel.buttons = [button('Next event', () => { xrIndex++; render(); }), button(o!.finished ? 'Finish review & score' : 'Next round', () => void send({ type: 'next' }), view.phase === 'review' && !view.contest && !view.paused), button('Contest this event', () => current && void send({ type: 'contest', eventId: current.id, reason: 'Participant requests referee review of this event.' }), view.phase === 'review' && !view.contest), button('Reports', () => go('reports')), button('Exercise controls', () => go('controls')), button('New scenario', setup)];
      if (view.contest && asReferee) panel.buttons = [button('Uphold recorded result', () => void send({ type: 'ruling', disposition: 'uphold', reason: 'Referee reviewed the event and upheld the recorded result.' })), button('Replay disputed round', () => void send({ type: 'ruling', disposition: 'replay', reason: 'Referee requested a teaching replay; previous disclosures retained.' })), button('Exercise controls', () => go('controls'))];
    } else if (xrPage === 'sensei') {
      const hint=currentHint(),lines=hint?[...wrap(hint.title),...wrap(hint.text),...wrap(hint.question)]:['The exercise or draft changed. Ask for a fresh hint.'];
      const pages=Math.max(1,Math.ceil(lines.length/6));xrIndex=Math.min(xrIndex,pages-1);
      panel.title='SENSEI · PRACTICE PILOT';panel.lines=[`Current round ${o!.round} · ${xrIndex+1}/${pages}`,...lines.slice(xrIndex*6,xrIndex*6+6)];
      panel.buttons=[button('More explanation',()=>{xrIndex=(xrIndex+1)%pages;render();},pages>1),button('Another teaching hint',requestHint,canHint()),
        button('Mark briefing read',()=>{briefAcknowledged.add(hintSession());requestHint();},!briefAcknowledged.has(hintSession())),back];
    } else if (xrPage === 'controls') {
      panel.lines = [title(difficulty) + ' opponent', asReferee ? 'REFEREE CONTROLS' : 'Player controls', view.takeover ? 'Human controls the opposing side.' : 'AI controls the opposing side.', short(message)];
      panel.buttons = [button(view.paused ? 'Resume exercise' : 'Pause exercise', () => void send({ type: 'pause', paused: !view!.paused })), button(asReferee ? 'Leave referee controls' : 'Referee controls', () => void refereeMode(), !!credentials?.refereeToken), ...(asReferee ? [button(view.takeover ? 'Restore AI control' : 'Take over AI side', () => void send({ type: 'takeover', enabled: !view!.takeover }), view.phase === 'planning'), button('Switch controlled side', () => void controlSide(), view.takeover)] : []), button('New scenario', setup), button('Map assembly', hide), back];
    } else {
      panel.lines = [`Round ${o!.round}/${s.rounds} · ${title(difficulty)} AI`, `${o!.side.toUpperCase()} · ${s.actors[o!.side]}`, `${3 - used} CP remaining in draft · pressure ${o!.pressure}`, ...wrap(o!.objectives[o!.side]).slice(0, 3), short(message)];
      panel.buttons = [button('Choose unit / staff orders', () => go('actions'), canOrder()), button(`Review plan (${draft.length} orders)`, () => go('plan')), button('Briefing & rules', () => go('brief')), button('Reports', () => go('reports')), button('Exercise controls', () => go('controls')), button('Refresh saved state', () => { pending = null; void refresh(); }), button('Map assembly', hide)];
    }
    if (canHint() && xrPage !== 'sensei' && panel.buttons.length < 7) panel.buttons.push(button('Sensei teaching hint',requestHint));
    if (busy) panel.lines = ['Saving / preparing opponent…', ...panel.lines.slice(0, 6)];
    if (pending && !busy) panel.buttons = [button('Retry identical command', () => void send(pending!.operation)), button('Refresh saved state', () => { pending = null; void refresh(); }), ...panel.buttons.slice(0, 5)];
    options.setPanel(panel);
  }
  const grabBindings: GrabBindings = {
    version:()=>`${active}:${view?.id}:${view?.revision}:${online}:${canOrder()}`,
    begin:source=>{const a=view?.observation.assets.find(a=>a.id===source.pieceId);if(!canOrder()||!view?.observation.geography||!a||a.side!==view.observation.side||!a.ready||!view.observation.candidates.some(c=>c.order.type==='move'&&c.order.asset===a.id&&!draftError(c)))return null;held=a.id;choose(a.id);return {name:a.name,force:a.side,model:a.kind==='rescue'?'landing':'ship',pieceId:a.id};},
    preview:id=>{const c=routeTo(id,held);return canOrder()&&c&&!draftError(c)?{allowed:true,reason:c.label+' · release to draft'}:{allowed:false,reason:'Choose an unoccupied water hex within movement range.'};},
    release:id=>{const c=routeTo(id,held);held=null;if(c&&canOrder()&&!draftError(c)){add(c);go('plan');}else status('Route cancelled. No order was added.');},
    cancel:()=>{held=null;movePreview=null;render();},
  };
  const requested = new URL(location.href).searchParams.get('opponent');
  const invitation = new URLSearchParams(location.hash.slice(1)).get('team');
  if (requested && invitation) {
    const ownSaved = saved.find(r => r.id === requested && r.playerToken === invitation);
    credentials = { id: requested, playerToken: invitation, ...(ownSaved?.refereeToken ? { refereeToken: ownSaved.refereeToken } : {}), title: 'Joined exercise', mapId: options.currentMap() };
    try { const joined = await api<RunView>('state', undefined, false); credentials.title = joined.observation.scenario.title; credentials.mapId = joined.observation.scenario.mapId; saved = [credentials, ...saved.filter(r => r.id !== requested)]; persist(); const url = new URL(location.href); url.hash = ''; history.replaceState(null, '', url); } catch (error) { message = String(error); }
  }
  if (requested && saved.some(r => r.id === requested)) await resume(saved.find(r => r.id === requested)!);
  setInterval(() => { if (active && credentials) void refresh(); }, 2000);
  return {
    grabBindings,
    get active() { return active; }, get busy() { return busy || !!pending; }, activate: show, deactivate: () => { active = false; }, render,
    onMap(id: string) { if (active && view && view.observation.scenario.mapId !== id) hide(); },
    chooseTile(id: string) {
      if (!view) return;
      if(view.observation.geography){const c=routeTo(id);if(c&&canOrder()){if(draftError(c))status(draftError(c)!);else selectOrder(c);}return;}
      const layout = scenarioLayout(options.map(view.observation.scenario.mapId), view.observation, selected);
      const sector = [...layout.anchors].find(([, c]) => c.id === id)?.[0];
      const candidate = sector && view.observation.candidates.find(c => c.order.type === 'move' && c.order.asset === selected && c.order.target === sector && !batchError([...draft, c.order]));
      if (candidate) add(candidate);
    },
    get diagnostics() { return { active, busy, online, state: view, draft, selected, group, message, movePreview, held }; },
  };
}
