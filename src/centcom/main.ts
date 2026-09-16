import './style.css';
import { initPlayableWorkspace } from '../play/workspace.ts';
import type { PlayWorkspace } from '../play/workspace.ts';
import { initTerrainMenu, terrainMenuControls, terrainMenuHeading } from '../terrain-menu.ts';
import { REGIONS } from './regions.ts';
import { axialKey, buildTerrain, exportTerrain, neighbors, SOURCE, tileAt } from './terrain.ts';
import type { TerrainMap, Tile } from './terrain.ts';
import { COLORS, TerrainView } from './view.ts';

const names = { water: 'Open water', 'coastal-water': 'Coastal water', coast: 'Mixed coast', land: 'Land', upland: 'Upland study' };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.body.classList.add('terrain-atlas');
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar"><a class="brand" href="/">⌖ <span>XRiegsspiel</span></a>
    <nav aria-label="Workspaces"><a href="/catalog.html">Equipment</a><a href="/pacific.html">Pacific terrain</a><a class="current" href="/centcom.html" aria-current="page">CENTCOM</a></nav>
    <div class="immersive"><button id="enter-mr" disabled>Enter MR</button><button id="enter-vr" disabled>Enter VR ↗</button></div>
  </header>
  <main class="terrain-layout">
    <section class="map-workspace" aria-label="Regional terrain">
      <div class="map-heading"><div><p class="eyebrow">CENTCOM / Map workspace</p><h1 id="title">Strait of Hormuz</h1><p id="subtitle">Persian Gulf / Gulf of Oman</p></div></div>
      <div id="viewport"></div>
      <div class="north" aria-label="North direction"><b id="north-arrow">↑</b><span>N</span></div>
      <div class="view-tools" aria-label="Map view"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="plan" aria-pressed="false">Plan view</button><button id="reset">Fit region</button></div>
      <div class="map-footer"><div class="legend">${Object.entries(names).map(([key, name]) => `<span><i style="--swatch:${COLORS[key as keyof typeof COLORS]}"></i>${name}</span>`).join('')}</div><div class="attribution"><a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/" target="_blank" rel="noreferrer">Natural Earth · Public domain</a><span id="spacing" class="map-spacing"></span></div></div>
    </section>
    ${terrainMenuControls}
    <aside id="map-menu" class="terrain-menu" aria-label="Map menu" aria-hidden="true" inert>
      ${terrainMenuHeading}<div class="terrain-menu-content">
      <section><div class="section-heading"><p class="eyebrow">Area of study</p><span class="map-number" id="map-number">01 / 02</span></div><div class="region-tabs" role="group" aria-label="Terrain region">${REGIONS.map((r, i) => `<button data-region="${r.id}" aria-pressed="${i === 0}"><span>0${i + 1}</span>${r.title}</button>`).join('')}</div></section>
      <section><p class="eyebrow">Explore the region</p><label for="landmark">Go to a place</label><select id="landmark"></select><p id="place-note" class="muted">Choose a reference point or select a hex on the map.</p></section>
      <section class="inspection" aria-live="polite"><div class="section-heading"><p class="eyebrow">Selected hex</p><span class="mono" id="hex-coordinate">—</span></div><h2 id="terrain-name">Select a tile</h2><p id="coordinates" class="mono muted"></p><dl id="tile-details"></dl><p class="tile-note" id="tile-note">Inspect the coastline, land, and approaches.</p></section>
      <section><p class="eyebrow">Map layers</p><div class="toggles"><label><input id="coastline" type="checkbox" checked>Source coastline</label><label><input id="relief" type="checkbox" checked>Illustrative relief</label></div><p class="muted">Relief shows authored terrain bands. It is not measured elevation. Coastal water indicates adjacency, not depth.</p></section>
      <details><summary>Coordinates & data</summary><p>Drag to pan, right-drag to orbit, and scroll to zoom.</p><p>Pointy-top hexes use axial coordinates. Use q and r to select a tile without pointing.</p><form id="hex-form"><label for="q">q</label><input id="q" type="number" step="1" required value="0"><label for="r">r</label><input id="r" type="number" step="1" required value="0"><button type="submit">Inspect</button></form><button id="export">Export terrain JSON ↓</button><p class="muted">Exports geographic centers, six-neighbor coordinates, terrain classes, provenance, and limitations. Movement rules are supplied by the scenario.</p></details>
      <p id="status" class="status" role="status">Loading regional terrain…</p>
      <footer><span id="tile-count"></span><br>Natural Earth ${SOURCE.version} · Public domain<br><a href="https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/" target="_blank" rel="noreferrer">Coastline source ↗</a><p>Generalized geography for scenario development. Elevation and depth are unknown. Forces are authored exercise placements; territorial claims are not drawn.</p></footer>
    </div></aside>
  </main>`;

const maps = new Map<string, TerrainMap>();
let map!: TerrainMap;
let view: TerrainView;
let flat = false;
let selection: Tile | null = null;
let play:PlayWorkspace|undefined;
const menu = initTerrainMenu(visible => view?.setLabels(visible));
function select(tile: Tile) {
  selection = tile; view.select(tile);
  ($('landmark') as HTMLSelectElement).value = '';
  $('place-note').textContent = 'Choose a reference point or select a hex on the map.';
  $('hex-coordinate').textContent = `q ${tile.q} / r ${tile.r}`;
  $('terrain-name').textContent = names[tile.terrain];
  $('coordinates').textContent = `${tile.center[1].toFixed(3)}° N  /  ${tile.center[0].toFixed(3)}° E`;
  $('tile-details').innerHTML = `<div><dt>Center surface</dt><dd>${tile.centerSurface}</dd></div><div><dt>Adjacent hexes</dt><dd>${neighbors(tile).filter(h => map.byAxial.has(axialKey(h))).length} / 6</dd></div><div><dt>Elevation / depth</dt><dd>Unknown</dd></div>`;
  $('tile-note').textContent = tile.terrain === 'coast' ? 'Mixed land and water. The coastline crosses this hex; crossing permissions need scenario rules.' : tile.terrain === 'coastal-water' ? 'Water next to a coastal hex. This classification does not establish depth or navigability.' : tile.terrain === 'upland' ? 'Land with an authored relief band. Height is illustrative and supplies no measured elevation or movement cost.' : 'Terrain classification only. Movement and action rules belong to the scenario.';
  $('q')!.setAttribute('value', String(tile.q)); $('r')!.setAttribute('value', String(tile.r));
  ($('q') as HTMLInputElement).value = String(tile.q); ($('r') as HTMLInputElement).value = String(tile.r);
  $('status').textContent = `Selected hex ${tile.q}, ${tile.r}.`;
}
function loadRegion(id: string) {
  if(play&&!play.canSwitch)return;
  const region = REGIONS.find(r => r.id === id) || REGIONS[0];
  if (!maps.has(region.id)) maps.set(region.id, buildTerrain(region));
  map = maps.get(region.id)!; selection = null;
  view.load(map);
  view.setLabels(menu.labelsVisible);
  view.setCoastline(($('coastline') as HTMLInputElement).checked);
  $('title').textContent = region.title; $('subtitle').textContent = region.subtitle;
  $('map-number').textContent = `0${REGIONS.indexOf(region) + 1} / 02`;
  $('spacing').textContent = `${region.spacingKm} km between hex centers`;
  $('tile-count').textContent = `${map.tiles.length.toLocaleString()} hexes · terrain ${region.version}`;
  $('landmark').innerHTML = '<option value="">Select a place…</option>' + region.landmarks.map((place, i) => `<option value="${i}">${place.name}</option>`).join('');
  $('place-note').textContent = 'Choose a reference point or select a hex on the map.';
  document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.region === region.id)));
  const url = new URL(location.href); url.searchParams.set('region', region.id); history.replaceState(null, '', url);
  document.title = `XRiegsspiel · ${region.title} terrain`;
  const focus = tileAt(map, region.focus); if (focus) select(focus);
  $('status').textContent = `${region.title} loaded. Select a hex to inspect it.`;
  void play?.openMap(region.id);
}

try {
  view = new TerrainView($('viewport'), tile=>{select(tile);play?.chooseTile(tile.id);}, active => document.body.classList.toggle('xr-active', active), () => loadRegion(map.region.id === 'hormuz' ? 'bab-al-mandeb' : 'hormuz'));
  loadRegion(new URL(location.href).searchParams.get('region') || 'hormuz');
  document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(button => button.onclick = () => loadRegion(button.dataset.region!));
  $('landmark').onchange = () => {
    const value = ($('landmark') as HTMLSelectElement).value; if (value === '') return;
    const landmark = map.region.landmarks[Number(value)];
    view.focus(landmark);
    // onSelect clears the dropdown so pointer inspection cannot leave a stale place.
    ($('landmark') as HTMLSelectElement).value = value;
    $('place-note').textContent = landmark.note;
  };
  $('reset').onclick = () => view.reset();
  $('zoom-in').onclick = () => view.zoom(1.25); $('zoom-out').onclick = () => view.zoom(.8);
  $('plan').onclick = () => { flat = !flat; view.setFlat(flat); $('plan').setAttribute('aria-pressed', String(flat)); $('plan').textContent = flat ? 'Table view' : 'Plan view'; };
  $('coastline').onchange = () => view.setCoastline(($('coastline') as HTMLInputElement).checked);
  $('relief').onchange = () => {
    view.setRelief(($('relief') as HTMLInputElement).checked);
    view.setLabels(menu.labelsVisible); view.setCoastline(($('coastline') as HTMLInputElement).checked);
  };
  $('hex-form').onsubmit = event => {
    event.preventDefault();
    const q = Number(($('q') as HTMLInputElement).value), r = Number(($('r') as HTMLInputElement).value);
    const tile = map.byAxial.get(axialKey({ q, r }));
    if (tile) select(tile); else $('status').textContent = `Hex ${q}, ${r} is outside this regional map.`;
  };
  $('export').onclick = () => {
    const blob = new Blob([JSON.stringify(exportTerrain(map), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = `${map.region.id}-hex-terrain-${map.region.version}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); $('status').textContent = 'Terrain JSON exported.';
  };
  for (const [id, mode] of [['enter-vr', 'immersive-vr'], ['enter-mr', 'immersive-ar']] as const) {
    const button = $(id) as HTMLButtonElement;
    void navigator.xr?.isSessionSupported(mode).then(supported => { button.disabled = !supported; }).catch(() => {});
    button.onclick = async () => { try { await view.enter(mode); } catch (error) { $('status').textContent = error instanceof Error ? error.message : 'Unable to enter immersive view.'; } };
  }
  void initPlayableWorkspace({
    mapId:map.region.id,mapIds:REGIONS.map(r=>r.id),
    view:{renderer:view.renderer,stats:view.stats,get inputDiagnostics(){return view.inputDiagnostics;},setGrabBindings:b=>view.setGrabBindings(b),cancelGrab:()=>view.cancelGrab(),setScenarioPieces:(...args)=>view.setScenarioPieces(...args),setScenarioPanel:p=>view.setScenarioPanel(p),reset:()=>view.reset(),exit:()=>view.exit(),scale:f=>view.zoom(f)},
    showMap:loadRegion,selectTile:id=>{const tile=map.tiles.find(t=>t.id===id);if(tile)select(tile);},
    focusTile:id=>{const tile=map.tiles.find(t=>t.id===id);if(tile)view.focusTile(tile);},
    coordinates:id=>map.tiles.find(t=>t.id===id),tileAt:(q,r)=>map.byAxial.get(axialKey({q,r}))?.id,openMenu:()=>menu.setOpen(true),
    terrainActions:()=>[{label:menu.labelsVisible?'Hide place labels':'Show place labels',run:()=>{$('map-labels').click();}},{label:'Toggle source coastline',run:()=>{$('coastline').click();}},{label:'Toggle illustrative relief',run:()=>{$('relief').click();}}],
  }).then(workspace=>{play=workspace;}).catch(error=>{$('status').textContent=String(error);});
  Object.defineProperty(window, '__centcomTerrain', { value: {
    get diagnostics() { return { region: map.region.id, tileCount: map.tiles.length, selected: selection?.id, ...view.stats }; },
  } });
} catch (error) {
  $('status').textContent = `Terrain could not load: ${error instanceof Error ? error.message : String(error)}`;
  $('viewport').innerHTML = '<p class="load-error">The terrain view requires WebGL. Enable hardware acceleration or try another browser.</p>';
  console.error(error);
}
