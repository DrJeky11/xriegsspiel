import './style.css';
import { initTerrainMenu, terrainMenuControls, terrainMenuHeading } from '../terrain-menu.ts';
import { REGIONS, buildMap, cellAt, exportMap, neighbors, TERRAIN_VERSION } from './terrain.ts';
import type { Geography, TerrainMap, Cell } from './terrain.ts';
import { TerrainTable, SURFACES } from './terrain-table.ts';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const app=document.getElementById('app')!;
document.body.classList.add('terrain-atlas');
app.innerHTML=`
<header><a class="brand" href="/">⌖ <span>XRiegsspiel</span></a><nav aria-label="Workspace"><a href="/">Exercise</a><a href="/pacific.html" aria-current="page">Pacific terrain</a><a href="/centcom.html">CENTCOM</a></nav><div class="immersive"><button id="mr" disabled>Enter MR</button><button id="vr" disabled>Enter VR ↗</button></div></header>
<main class="terrain-layout"><section class="workspace" aria-label="Pacific terrain workspace">
  <div class="map-heading"><div class="eyebrow">Terrain atlas / Western Pacific</div><h1 id="map-title">Palawan & the Spratlys</h1><p id="map-subtitle">Philippines · South China Sea</p></div>
  <div id="viewport"></div>
  <div class="map-tools" aria-label="Map controls"><button id="zoom-in" aria-label="Zoom in">+</button><button id="zoom-out" aria-label="Zoom out">−</button><button id="top-view">Top view</button><button id="reset-view">Reset</button></div>
  <div class="map-footer"><div class="legend">${Object.entries(SURFACES).map(([key,s])=>`<span><i style="--swatch:${s.color}"></i>${key==='coast'?'Coast':s.name}</span>`).join('')}</div><div class="attribution"><a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noreferrer">Natural Earth</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors · ODbL</a></div></div>
</section>${terrainMenuControls}<aside id="map-menu" class="terrain-menu" aria-label="Map menu" aria-hidden="true" inert>
  ${terrainMenuHeading}<div class="terrain-menu-content">
  <div class="eyebrow">01 / Area of study</div>
  <div class="regions">${REGIONS.map((r,i)=>`<button class="region" data-region="${i}" aria-pressed="${i===0}"><span class="region-number">0${i+1}</span><span><strong>${r.name}</strong><small>${r.subtitle}</small></span><span class="arrow">↗</span></button>`).join('')}</div>
  <div class="scale-switch" role="group" aria-label="Map scale"><button id="overview" aria-pressed="true">Regional</button><button id="focus" aria-pressed="false">Shoal focus</button></div>
  <div class="map-metrics"><div><strong id="hex-scale">—</strong><span>km between hex centers</span></div><div><strong id="hex-count">—</strong><span>terrain hexes</span></div></div>
  <section class="places"><div class="section-label"><span class="eyebrow">Reference locations</span><span id="place-count"></span></div><div id="places"></div></section>
  <section class="inspector"><div class="eyebrow">02 / Hex inspection</div><div id="selection"><h2>Select a hex</h2><p>Inspect land, water, reef, or lagoon. Reference locations select their containing hex.</p></div></section>
  <p id="status" role="status" aria-live="polite">Loading local geography…</p>
  <button id="export-map" class="export" disabled>Export terrain JSON <span>↓</span></button>
  <details><summary>Map sources & controls</summary><p>Click a hex to inspect. Right-drag rotates; wheel zooms; middle-drag pans. Touch: drag to pan, pinch to zoom. With the map focused, arrow keys and Q/E select six neighbors.</p><p>Quest: trigger inspects. Left stick moves the table; right stick changes height and rotation. The spatial panel switches regions and map scale.</p><p>Regional coastlines: Natural Earth 1:10 million. Focus geometry: OpenStreetMap. Hex spacing is local projected distance; each view has an independent grid.</p><p>Coast and reef colors indicate feature presence within a hex. Plate heights are symbolic; elevation, water depth, tides, and land cover are not modeled.</p><p>Names identify geographic features; sovereignty boundaries are not drawn. BRP Sierra Madre is a reference landmark.</p><a href="/terrain/pacific/README.md" target="_blank" rel="noreferrer">Download provenance & reuse terms ↓</a></details>
  <p class="footnote">Terrain preparation · ${TERRAIN_VERSION}<br>No pieces, movement rules, or deployments assigned.</p>
</div></aside></main>`;
let regionIndex=0,focused=false,map:TerrainMap|null=null,selected:Cell|null=null;
let data:{regional:Geography;shoal:Geography;senkaku:Geography}|null=null;
const cache=new Map<string,TerrainMap>();
const table=new TerrainTable($('viewport'),{select:inspect,nextRegion:()=>loadMap((regionIndex+1)%REGIONS.length,focused),toggleFocus:()=>loadMap(regionIndex,!focused),mode:active=>document.body.classList.toggle('xr-active',active)});
initTerrainMenu(visible=>table.setLabels(visible));

function inspect(cell:Cell) {
  if(!map)return;selected=cell;table.select(cell);
  const surface=SURFACES[cell.terrain];
  const places=map.landmarks.filter(l=>cell.landmarkIds.includes(l.id));
  $('selection').innerHTML=`<div class="selected-title"><h2>${surface.name}</h2><span class="hex-id">${cell.q}, ${cell.r}</span></div><dl><div><dt>Latitude</dt><dd>${cell.center[1].toFixed(4)}° N</dd></div><div><dt>Longitude</dt><dd>${cell.center[0].toFixed(4)}° E</dd></div><div><dt>Elevation / depth</dt><dd>Unknown</dd></div></dl><p>${surface.note}</p>${places.map(l=>`<div class="place-detail"><strong>${l.name}</strong><p>${l.note}</p><a href="${l.source}" target="_blank" rel="noreferrer">Location source ↗</a></div>`).join('')}<div class="neighbor-label">Adjacent hexes</div><div class="neighbors">${neighbors(map,cell).map(n=>`<button data-hex="${n.q},${n.r}" aria-label="Inspect adjacent hex ${n.q}, ${n.r}">${n.q},${n.r}</button>`).join('')}</div>`;
  $('selection').querySelectorAll<HTMLButtonElement>('[data-hex]').forEach(b=>b.onclick=()=>{const c=map!.byKey.get(b.dataset.hex!);if(c)inspect(c);});
  $('status').textContent=`Hex ${cell.q}, ${cell.r} · ${surface.name}`;
  document.querySelectorAll<HTMLButtonElement>('[data-place]').forEach(b=>b.classList.toggle('selected',cell.landmarkIds.includes(b.dataset.place!)));
}
function loadMap(index:number,focus:boolean) {
  if(!data)return;regionIndex=index;focused=focus;const region=REGIONS[index];const key=`${index}/${focus}`;
  map=cache.get(key)??buildMap(region,focus?region.focus:region.overview,focus?(index===0?data.shoal:data.senkaku):data.regional,!focus?[index===0?data.shoal:data.senkaku]:[]);
  cache.set(key,map);selected=null;table.setMap(map);table.reset();
  $('map-title').textContent=focus?region.focusName:region.name;
  $('map-subtitle').textContent=focus?(index===0?'Reef rim, lagoon & BRP Sierra Madre':'Uotsuri / Diaoyu · Kuba / Huangwei'):region.subtitle;
  $('hex-scale').textContent=String(map.view.hexKm);$('hex-count').textContent=map.cells.length.toLocaleString();
  $('overview').setAttribute('aria-pressed',String(!focus));$('focus').setAttribute('aria-pressed',String(focus));$('focus').textContent=index===0?'Shoal focus':'Island focus';
  document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.region)===index)));
  $('places').innerHTML=map.landmarks.map(l=>`<button data-place="${l.id}"><span>${l.name}</span><small>${l.kind==='ship'?'LANDMARK':l.kind.toUpperCase()}</small></button>`).join('');
  $('place-count').textContent=String(map.landmarks.length).padStart(2,'0');
  $('places').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>{const l=map!.landmarks.find(l=>l.id===b.dataset.place)!;const c=cellAt(map!,l.position);if(c)inspect(c);});
  $('selection').innerHTML='<h2>Select a hex</h2><p>Inspect land, water, reef, or lagoon. Reference locations select their containing hex.</p>';
  $('status').textContent=focus?'Focus view · sourced geometry, unknown depth and elevation.':'Regional view · generalized coastline and reference locations.';
  $('export-map').removeAttribute('disabled');
  const url=new URL(location.href);url.searchParams.set('region',region.id);url.searchParams.set('scale',focus?'focus':'overview');history.replaceState(null,'',url);
}
document.querySelectorAll<HTMLButtonElement>('[data-region]').forEach(b=>b.onclick=()=>loadMap(Number(b.dataset.region),false));
$('overview').onclick=()=>loadMap(regionIndex,false);$('focus').onclick=()=>loadMap(regionIndex,true);
$('zoom-in').onclick=()=>table.zoom(.8);$('zoom-out').onclick=()=>table.zoom(1.25);$('top-view').onclick=()=>table.reset(true);$('reset-view').onclick=()=>table.reset();
$('export-map').onclick=()=>{
  if(!map)return;const blob=new Blob([JSON.stringify(exportMap(map),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`${map.region.id}-${map.view.id}-terrain.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('status').textContent='Terrain export prepared with hex neighbors, source references, and reuse terms.';
};
for(const [id,mode] of [['vr','immersive-vr'],['mr','immersive-ar']] as const) {
  $(''+id).onclick=()=>void table.enter(mode).catch(error=>{$('status').textContent=error instanceof Error?error.message:'Unable to start immersive view.';});
  navigator.xr?.isSessionSupported(mode).then(s=>{$<HTMLButtonElement>(id).disabled=!s;}).catch(()=>{});
}
async function start() {
  try {
    const fetchGeo=async(name:string):Promise<Geography>=>{const response=await fetch(`/terrain/pacific/${name}.json`);if(!response.ok)throw new Error(`Could not load ${name} (${response.status}).`);return response.json();};
    const [regional,shoal,senkaku]=await Promise.all([fetchGeo('regional-land'),fetchGeo('shoal-detail'),fetchGeo('senkaku-detail')]);data={regional,shoal,senkaku};
    const params=new URLSearchParams(location.search);const index=REGIONS.findIndex(r=>r.id===params.get('region'));
    loadMap(index<0?0:index,params.get('scale')==='focus');
  } catch(error) {$('status').textContent=error instanceof Error?error.message:'Could not load terrain.';}
}
void start();
// Read-only diagnostics for reproducible desktop and headset verification.
Object.defineProperty(window,'__pacificTerrain',{value:{get diagnostics(){return {version:TERRAIN_VERSION,mapId:map?.id,hexCount:map?.cells.length,hexKm:map?.view.hexKm,selected:selected?{q:selected.q,r:selected.r,terrain:selected.terrain}:null,...table.stats};}}});
