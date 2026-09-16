import './style.css';
import { Tabletop } from './tabletop.ts';
import type { SpatialButton } from './tabletop.ts';
import { MAP, DEPOT, RULES, SCENARIO, initialState, evaluate, cellName, isEnded, isComplete, routes } from './game.ts';
import type { State, Action, Command } from './game.ts';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><span class="brand-mark" aria-hidden="true">⌖</span><div><h1>XRiegsspiel</h1><div class="eyebrow">The shared planning table</div></div>
    <div class="session"><span class="connection"></span><span id="connection">Connecting</span><div class="eyebrow">Local cooperative exercise</div></div>
    <div class="header-actions"><button id="enter-mr" disabled>Enter MR</button><button id="enter-vr" class="accent" disabled>Enter VR ↗</button></div>
  </header>
  <main><section class="workspace" aria-label="Planning table">
    <div class="brief"><div><div class="eyebrow">Exercise 001 / Original scenario</div><h2>Island Coordination</h2><p>Supply two outposts in five rounds. Coordinate three transport teams and eight shared supplies.</p></div><div class="round"><div class="eyebrow">Planning round</div><strong id="round">01 / 05</strong><span>Discuss. Allocate. Move.</span></div></div>
    <div id="viewport" class="viewport"></div>
    <div class="map-legend"><span><i class="reachable"></i>Reachable</span><span><i></i>Land</span><span><i class="water"></i>Water</span></div>
    <div class="view-tools" aria-label="Table view"><button id="smaller" aria-label="Smaller table">−</button><button id="larger" aria-label="Larger table">+</button><button id="rotate" aria-label="Rotate table">↻</button><button id="recenter">Reset view</button></div>
    <div class="mission-strip" id="objectives"></div>
  </section><aside aria-label="Order inspector"><nav class="terrain-navigation" aria-label="Terrain workspaces"><a href="/scenario.html">Geographic tabletop ↗</a><a href="/pacific.html">Pacific terrain ↗</a><a href="/centcom.html">CENTCOM terrain ↗</a></nav><div class="eyebrow">Your transport teams</div><div id="units" class="units"></div><div id="inspector"></div>
    <p id="message" class="message" role="status" aria-live="polite">Connecting to the shared exercise…</p><button class="end-round" id="advance"><span>Next round</span><span>→</span></button>
    <section class="log"><div class="eyebrow">Decision log</div><ol id="log"></ol></section>
    <details><summary>Controls & original rules</summary><p>Click a team, then a highlighted tile. Preview the route and confirm the order. A draft changes no supplies or positions.</p><p>Four movement points per team per round. Land/road costs 1; forest 2; ridge 3. Water and occupied tiles block movement. Delivery and loading each cost 1. Each team carries 2 supply.</p><p>Deliver on E2 or H4. Reload at the depot B4. Each outpost requests 4 supply by the end of round 5. Supplies are conserved; no combat or strength losses are modeled.</p><p>Desktop: right-drag to orbit, Shift + right-drag to pan, wheel to zoom. Touch: two fingers to pan/zoom. Quest: trigger to select. Left stick moves the table; right stick adjusts height and rotation. Table size and reset are in the spatial panel.</p><label for="destination">Keyboard destination</label><select id="destination"><option value="">Select a team first</option></select><button id="preview-destination">Preview selected location</button><button id="reset-exercise">Restart exercise…</button><button id="export">Export decision log</button></details>
    <p class="footnote">Interaction prototype 0.1 · Fictional terrain and authored game values.<br>All connected screens share control and full information.</p>
  </aside></main>`;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let state: State = initialState(), selected: string | null = null, draft: Action | null = null;
let online = false, busy = false, message = 'Select a transport team to see where it can move.';
let uncertain: Command | null = null;
let xrActive = false;
let sizeStep = 0;
const escape = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const can = (action: Action) => online && !busy && !uncertain && evaluate(state, action).allowed;
const table = new Tabletop($('viewport'), { pick, buttons: spatialButtons, mode: active => { xrActive = active; document.body.classList.toggle('xr-active', active); if (!active) render(); } });

function pick(cell: number) {
  if (busy || uncertain) return;
  const unit = state.units.find(u => u.cell === cell);
  if (unit) { selected = unit.id; draft = null; message = `${unit.name} selected. Highlighted tiles are reachable with ${unit.ap} movement points.`; render(); return; }
  if (!selected) { message = 'Select Atlas, Beacon, or Cedar first.'; render(); return; }
  preview({ type: 'move', unitId: selected, to: cell });
}
function preview(action: Action) {
  if (busy || uncertain) return;
  const result = evaluate(state, action);
  draft = result.allowed ? action : null; message = result.reason; render();
}
function cancel() { if (busy || uncertain) return; draft = null; message = 'Preview cancelled. No movement points or supplies were spent.'; render(); }
function spatialButtons(): SpatialButton[] {
  const unit = state.units.find(u => u.id === selected);
  const service: Action = { type: unit?.cell === DEPOT ? 'load' : 'deliver', unitId: selected || '' };
  return [
    { label: uncertain ? 'Retry order confirmation' : draft ? 'Confirm order' : 'Select a destination on the table', enabled: online && !busy && Boolean(draft || uncertain), action: () => void commit() },
    { label: 'Cancel preview', enabled: Boolean(draft) && !busy && !uncertain, action: cancel },
    { label: unit?.cell === DEPOT ? 'Preview loading supplies' : 'Preview supply delivery', enabled: can(service), action: () => preview(service) },
    { label: isEnded(state) ? 'Restart exercise…' : state.round === 5 ? 'Finish exercise…' : 'Next round…', enabled: can({ type: isEnded(state) ? 'reset' : 'advance' }), action: () => preview({ type: isEnded(state) ? 'reset' : 'advance' }) },
    { label: 'Change table size', enabled: true, action: () => { sizeStep = (sizeStep + 1) % 3; table.board.scale.setScalar([.85, .65, 1.05][sizeStep]); } },
    { label: 'Recenter table in front of me', enabled: true, action: () => table.reset() },
    { label: 'Exit immersive view', enabled: true, action: () => void table.exit() },
  ];
}
async function commit() {
  if (busy || !online || (!draft && !uncertain)) return;
  const command = uncertain || { id: crypto.randomUUID(), revision: state.revision, action: draft! };
  uncertain = command; busy = true; message = 'Sending order…'; render();
  try {
    const response = await fetch('/api/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(command), signal: AbortSignal.timeout(6000) });
    const result = await response.json();
    if (result.state) state = result.state;
    uncertain = null; draft = null;
    message = result.error || (result.duplicate ? 'Order already recorded. No resources spent twice.' : state.events.at(-1)?.text || 'Order recorded.');
    if (isComplete(state)) message = 'Both outposts supplied. Review your routes and the decisions that made it possible.';
  } catch { message = 'Order confirmation was interrupted. Retry to check the same order safely.'; }
  finally { busy = false; render(); }
}
function render() {
  $('connection').textContent = online ? 'Connected · shared state' : 'Reconnecting…';
  document.querySelector('.connection')?.classList.toggle('offline', !online);
  $('round').textContent = `${String(Math.min(5, state.round)).padStart(2, '0')} / 05`;
  $('objectives').innerHTML = state.objectives.map(o => `<div class="mission-item"><div class="eyebrow">${cellName(o.cell)} / Supply request</div><strong>${o.name} <b>${o.received}/${o.need}</b></strong><div class="progress"><span style="width:${o.received / o.need * 100}%"></span></div></div>`).join('') + `<div class="mission-item"><div class="eyebrow">B4 / Shared depot</div><strong>${state.depot} supply available</strong><small>${state.units.reduce((n, u) => n + u.cargo, 0)} carried by transports</small></div>`;
  $('units').innerHTML = state.units.map(u => `<button data-unit="${u.id}" class="${selected === u.id ? 'selected' : ''}" aria-pressed="${selected === u.id}">${u.name}</button>`).join('');
  $('units').querySelectorAll<HTMLButtonElement>('button').forEach(button => { button.disabled = busy || !!uncertain; button.onclick = () => pick(state.units.find(u => u.id === button.dataset.unit)!.cell); });
  const unit = state.units.find(u => u.id === selected);
  const result = draft ? evaluate(state, draft) : null;
  if (unit) {
    const deliver = evaluate(state, { type: 'deliver', unitId: unit.id });
    const load = evaluate(state, { type: 'load', unitId: unit.id });
    $('inspector').innerHTML = `<div class="unit-title"><h3>${unit.name}</h3><span class="coordinate mono">${cellName(unit.cell)}</span></div><div class="unit-details"><div><strong>${unit.ap}<small>/4</small></strong><span>Movement points</span></div><div><strong>${unit.cargo}<small>/2</small></strong><span>Supply carried</span></div></div><div class="eyebrow">Available actions</div><div class="action-row"><button id="deliver" ${can({ type: 'deliver', unitId: unit.id }) ? '' : 'disabled'}>Deliver supply</button><button id="load" ${can({ type: 'load', unitId: unit.id }) ? '' : 'disabled'}>Load at depot</button></div><p class="guidance">${escape(deliver.allowed ? deliver.reason : unit.cell === DEPOT ? load.reason : deliver.reason)}</p>`;
    $('deliver').onclick = () => preview({ type: 'deliver', unitId: unit.id });
    $('load').onclick = () => preview({ type: 'load', unitId: unit.id });
  } else $('inspector').innerHTML = '<h3>Select a transport</h3><p class="guidance">Choose a piece on the table or a team above. Its legal movement area will appear immediately.</p>';
  if (draft && result) {
    const title = draft.type === 'move' ? `Move to ${cellName(draft.to)}` : draft.type === 'advance' ? 'Advance the exercise' : draft.type === 'reset' ? 'Restart for all screens' : draft.type === 'load' ? 'Load supplies' : 'Deliver supplies';
    $('inspector').insertAdjacentHTML('beforeend', `<section class="order"><div class="eyebrow">Order preview · not committed</div><h3>${title}</h3><p>${escape(result.reason)}</p>${'unitId' in draft && unit ? `<div class="cost"><span>Movement after order</span><strong>${unit.ap - result.cost} / 4</strong></div>` : ''}<div class="actions"><button class="primary" id="commit" ${!online || busy ? 'disabled' : ''}>${busy ? 'Sending…' : uncertain ? 'Retry confirmation' : 'Confirm order'}</button><button id="cancel" ${busy || uncertain ? 'disabled' : ''}>Cancel</button></div></section>`);
    $('commit').onclick = () => void commit(); $('cancel').onclick = cancel;
  } else if (uncertain) {
    $('inspector').insertAdjacentHTML('beforeend', '<button id="retry" class="primary">Retry order confirmation</button>'); $('retry').onclick = () => void commit();
  } else $('inspector').insertAdjacentHTML('beforeend', '<p class="empty-order">Select a highlighted destination to preview the route and its cost.</p>');
  $('message').textContent = !online ? 'Connection lost. Orders are paused while the server reconnects.' : message;
  const advance = $('advance') as HTMLButtonElement; advance.disabled = !online || busy || !!uncertain;
  advance.innerHTML = `<span>${isEnded(state) ? 'Exercise finished · restart…' : state.round === 5 ? 'Finish exercise…' : 'Next round…'}</span><span>→</span>`;
  $('log').innerHTML = state.events.length ? [...state.events].reverse().slice(0, 20).map(e => `<li><time>ROUND ${Math.min(e.round, 5)} · ORDER ${e.sequence}</time>${escape(e.text)}</li>`).join('') : '<li>Your committed decisions will appear here.</li>';
  const options = unit ? [...routes(state, unit.id)].filter(([id]) => id !== unit.cell).map(([id, route]) => `<option value="${id}">${cellName(id)} · ${MAP[id].terrain} · ${route.cost} points</option>`).join('') : '';
  const destination = $('destination') as HTMLSelectElement; const previous = destination.value;
  destination.innerHTML = '<option value="">Choose a reachable location</option>' + options; destination.value = previous;
  table.update({ state, selected, draft, message, online, busy });
}

const stream = new EventSource('/api/events');
stream.onmessage = event => {
  const next = JSON.parse(event.data) as State;
  if (next.revision !== state.revision && !busy && !uncertain) { draft = null; message = next.events.at(-1)?.text || 'Shared exercise refreshed.'; }
  state = next; online = true; render();
};
stream.onerror = () => { online = false; render(); };
$('advance').onclick = () => preview({ type: isEnded(state) ? 'reset' : 'advance' });
$('reset-exercise').onclick = () => preview({ type: 'reset' });
$('smaller').onclick = () => table.scale(.9); $('larger').onclick = () => table.scale(1.1); $('rotate').onclick = () => table.rotate(Math.PI / 8); $('recenter').onclick = () => table.reset();
$('preview-destination').onclick = () => { const value = ($('destination') as HTMLSelectElement).value; if (selected && value) preview({ type: 'move', unitId: selected, to: Number(value) }); };
$('export').onclick = () => {
  const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), scope: 'Shared full-information cooperative prototype', state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `xriegsspiel-round-${state.round}-revision-${state.revision}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
document.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
for (const [id, mode] of [['enter-vr', 'immersive-vr'], ['enter-mr', 'immersive-ar']] as const) {
  const button = $(id) as HTMLButtonElement;
  button.onclick = async () => { try { await table.enter(mode); } catch (error) { message = error instanceof Error ? error.message : 'Immersive session could not start.'; render(); } };
  if (navigator.xr) navigator.xr.isSessionSupported(mode).then(supported => { button.disabled = !supported; button.title = supported ? 'Open the spatial tabletop' : 'This immersive mode is unavailable'; }).catch(() => { button.title = 'Unable to query immersive support'; });
  else button.title = 'Open this address in Quest Browser for immersive mode.';
}
// Read-only diagnostics for desktop and connected-headset verification.
Object.defineProperty(window, '__xriegsspiel', { value: { get state() { return structuredClone(state); }, get diagnostics() { return { online, selected, draft, xrActive, secureContext: isSecureContext, rules: RULES, scenario: SCENARIO, ...table.stats, tokenPositions: table.tokenPositions }; } } });
render();
