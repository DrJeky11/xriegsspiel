/** Geographic terrain only. No unit mobility, combat, or ownership assumptions. */
export const TERRAIN_VERSION = 'pacific-terrain/0.1.0';
export type LonLat = [number, number];
export type Polygon = LonLat[][];
export interface Source { url: string; license: string; sha256: string; accessed: string }
export interface Geography {
  version: string; land: Polygon[]; reefs: Polygon[]; lagoons: Polygon[]; sources: Source[];
  landmarks: { id: string; name: string; position: LonLat; source: string }[];
}
export type Surface = 'ocean' | 'coast' | 'land' | 'reef' | 'lagoon';
export interface Landmark {
  id: string; name: string; short: string; position: LonLat; kind: 'island' | 'reef' | 'ship' | 'place';
  note: string; source: string; focusOnly?: boolean;
}
export interface Region {
  id: string; name: string; subtitle: string; focusName: string;
  overview: View; focus: View; landmarks: Landmark[];
}
export interface View { id: 'overview' | 'focus'; center: LonLat; widthKm: number; heightKm: number; hexKm: number }
export interface Hex { q: number; r: number }
export interface Cell extends Hex {
  id: string; x: number; z: number; center: LonLat; terrain: Surface; containsLand: boolean; containsReef: boolean;
  landmarkIds: string[]; elevationM: null; depthM: null;
}
export interface TerrainMap {
  id: string; version: string; region: Region; view: View; cells: Cell[]; byKey: Map<string, Cell>;
  landmarks: Landmark[]; sources: Source[]; geographyVersion: string;
}
const AMTI = 'https://amti.csis.org/';
const NE = 'https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/';
const ISHIGAKI = 'https://www.senkaku-islands.jp/basic-info/';
export const REGIONS: Region[] = [
  {
    id: 'palawan-spratlys', name: 'Palawan & the Spratlys', subtitle: 'Philippines · South China Sea', focusName: 'Second Thomas Shoal',
    overview: { id: 'overview', center: [117.8, 11.0], widthKm: 960, heightKm: 690, hexKm: 18 },
    focus: { id: 'focus', center: [115.866, 9.735], widthKm: 36, heightKm: 28, hexKm: .75 },
    landmarks: [
      { id: 'second-thomas', name: 'Second Thomas Shoal / Ayungin', short: 'SECOND THOMAS', position: [115+51/60+51/3600, 9+43/60+57/3600], kind: 'reef', note: 'Submerged reef. BRP Sierra Madre is a separate ship landmark on the reef.', source: AMTI+'second-thomas-shoal/' },
      { id: 'mischief', name: 'Mischief Reef', short: 'MISCHIEF REEF', position: [115+32/60, 9.9], kind: 'reef', note: 'Reference point only; current reclamation and infrastructure are not modeled.', source: AMTI+'mischief-reef/' },
      { id: 'palawan', name: 'Palawan', short: 'PALAWAN', position: [118.65, 9.95], kind: 'island', note: 'Approximate label anchor on the generalized landmass.', source: NE },
      { id: 'panay', name: 'Panay', short: 'PANAY', position: [122.15, 11.15], kind: 'island', note: 'Approximate label anchor on the generalized landmass.', source: NE },
      { id: 'mindoro', name: 'Mindoro', short: 'MINDORO', position: [121.02, 12.92], kind: 'island', note: 'Approximate label anchor on the generalized landmass.', source: NE },
      { id: 'busuanga', name: 'Busuanga', short: 'BUSUANGA', position: [120.0, 12.15], kind: 'island', note: 'Approximate label anchor; small islands may share a coastal hex.', source: NE },
    ],
  },
  {
    id: 'taiwan-senkaku', name: 'Taiwan & the Senkakus', subtitle: 'Taiwan Strait · East China Sea', focusName: 'Western Senkaku Islands',
    overview: { id: 'overview', center: [122.2, 24.75], widthKm: 920, heightKm: 740, hexKm: 18 },
    focus: { id: 'focus', center: [123.56, 25.82], widthKm: 40, heightKm: 34, hexKm: .75 },
    landmarks: [
      { id: 'taiwan', name: 'Taiwan', short: 'TAIWAN', position: [120.96, 23.75], kind: 'island', note: 'Approximate label anchor. The land layer does not encode elevation or land cover.', source: NE },
      { id: 'uotsuri', name: 'Uotsuri / Diaoyu', short: 'UOTSURI / DIAOYU', position: [123.4747,25.7440], kind: 'island', note: 'Western Senkaku / Diaoyu / Diaoyutai group. Label anchor on the OSM island polygon.', source: 'https://www.openstreetmap.org/relation/1270194' },
      { id: 'kuba', name: 'Kuba / Huangwei', short: 'KUBA / HUANGWEI', position: [123.682807,25.9238794], kind: 'island', note: 'OSM island label point; the outline is assembled from OSM coastline ways.', source: 'https://www.openstreetmap.org/node/1918155252' },
      { id: 'taisho', name: 'Taisho / Chiwei', short: 'TAISHO / CHIWEI', position: [124+33/60,25+55/60], kind: 'island', note: 'Eastern island of the group. Outside the western-islands focus extent.', source: ISHIGAKI },
      { id: 'ishigaki', name: 'Ishigaki', short: 'ISHIGAKI', position: [124.17,24.42], kind: 'island', note: 'Approximate label anchor in the Yaeyama Islands.', source: NE },
      { id: 'yonaguni', name: 'Yonaguni', short: 'YONAGUNI', position: [122.98,24.46], kind: 'island', note: 'Approximate label anchor; the island is smaller than an overview hex.', source: NE },
      { id: 'miyako', name: 'Miyako', short: 'MIYAKO', position: [125.3,24.78], kind: 'island', note: 'Approximate label anchor in the southern Ryukyu chain.', source: NE },
    ],
  },
];

const KM_PER_DEGREE = Math.PI * 6371.0088 / 180;
export const keyOf = ({q,r}: Hex) => `${q},${r}`;
export const DIRECTIONS: readonly Hex[] = [{q:1,r:0},{q:0,r:1},{q:-1,r:1},{q:-1,r:0},{q:0,r:-1},{q:1,r:-1}];
export const hexDistance = (a: Hex, b: Hex) => (Math.abs(a.q-b.q)+Math.abs(a.r-b.r)+Math.abs(a.q+a.r-b.q-b.r))/2;
export const hexCenter = ({q,r}: Hex, spacing: number) => ({x: spacing*(q+r/2), z: spacing*Math.sqrt(3)/2*r});
export function project(point: LonLat, origin: LonLat) {
  return { x: (point[0]-origin[0])*KM_PER_DEGREE*Math.cos(origin[1]*Math.PI/180), z: (origin[1]-point[1])*KM_PER_DEGREE };
}
export function unproject(x: number, z: number, origin: LonLat): LonLat {
  return [origin[0]+x/(KM_PER_DEGREE*Math.cos(origin[1]*Math.PI/180)), origin[1]-z/KM_PER_DEGREE];
}
export function worldToHex(x: number, z: number, spacing: number): Hex {
  const r = z/(spacing*Math.sqrt(3)/2), q = x/spacing-r/2, s = -q-r;
  let rq = Math.round(q), rr = Math.round(r); const rs = Math.round(s);
  const dq = Math.abs(rq-q), dr = Math.abs(rr-r), ds = Math.abs(rs-s);
  if (dq > dr && dq > ds) rq = -rr-rs;
  else if (dr > ds) rr = -rq-rs;
  return { q: rq || 0, r: rr || 0 };
}
export function cellAt(map: TerrainMap, point: LonLat) {
  const {x,z} = project(point,map.view.center);
  return map.byKey.get(keyOf(worldToHex(x,z,map.view.hexKm)));
}
export function neighbors(map: TerrainMap, cell: Hex) {
  return DIRECTIONS.map(d=>map.byKey.get(keyOf({q:cell.q+d.q,r:cell.r+d.r}))).filter((c): c is Cell => !!c);
}
export function pointInRing([x,y]: LonLat, ring: LonLat[]) {
  let inside = false;
  for (let i=0,j=ring.length-1; i<ring.length; j=i++) {
    const a=ring[i], b=ring[j];
    if ((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
function ringsCross(a: LonLat[], b: LonLat[]) {
  const side=(p:LonLat,q:LonLat,r:LonLat)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
  for(let i=0;i<a.length-1;i++)for(let j=0;j<b.length;j++){
    const p=a[i],q=a[i+1],r=b[j],s=b[(j+1)%b.length];
    if(side(p,q,r)*side(p,q,s)<0&&side(r,s,p)*side(r,s,q)<0)return true;
  }
  return false;
}
export const pointInPolygon = (p: LonLat, polygon: Polygon) => pointInRing(p,polygon[0]) && !polygon.slice(1).some(h=>pointInRing(p,h));
function indexed(polygons: Polygon[]) {
  return polygons.map(p=>({polygon:p, minX:Math.min(...p[0].map(v=>v[0])),maxX:Math.max(...p[0].map(v=>v[0])),minY:Math.min(...p[0].map(v=>v[1])),maxY:Math.max(...p[0].map(v=>v[1]))}));
}
export function buildMap(region: Region, view: View, geography: Geography, supplements: Geography[] = []): TerrainMap {
  const land=indexed([...geography.land,...supplements.flatMap(g=>g.land)]), reefs=indexed([...geography.reefs,...supplements.flatMap(g=>g.reefs)]), lagoons=indexed([...geography.lagoons,...supplements.flatMap(g=>g.lagoons)]);
  const radius=view.hexKm/Math.sqrt(3);
  const cells: Cell[]=[]; const byKey=new Map<string,Cell>();
  const halfRows=Math.ceil(view.heightKm/(view.hexKm*Math.sqrt(3)));
  const halfCols=Math.ceil(view.widthKm/(2*view.hexKm))+halfRows;
  const id=`${region.id}/${view.id}`;
  for (let r=-halfRows; r<=halfRows; r++) for (let q=-halfCols; q<=halfCols; q++) {
    const {x,z}=hexCenter({q,r},view.hexKm);
    // Include only whole hexes. No partial cells beyond the authored extent.
    if (Math.abs(x)+view.hexKm/2>view.widthKm/2 || Math.abs(z)+radius>view.heightKm/2) continue;
    const center=unproject(x,z,view.center);
    const vertices=Array.from({length:6},(_,i)=>unproject(x+radius*Math.cos((30+60*i)*Math.PI/180),z+radius*Math.sin((30+60*i)*Math.PI/180),view.center));
    const minX=Math.min(...vertices.map(p=>p[0])),maxX=Math.max(...vertices.map(p=>p[0])),minY=Math.min(...vertices.map(p=>p[1])),maxY=Math.max(...vertices.map(p=>p[1]));
    const candidates=(polys:ReturnType<typeof indexed>)=>polys.filter(p=>p.maxX>=minX&&p.minX<=maxX&&p.maxY>=minY&&p.minY<=maxY);
    const lp=candidates(land), rp=candidates(reefs), gp=candidates(lagoons);
    const has=(point:LonLat, polys:typeof lp)=>polys.some(p=>pointInPolygon(point,p.polygon));
    const hits=(polys:typeof lp)=>[center,...vertices].some(p=>has(p,polys)) || polys.some(p=>p.polygon[0].some(v=>v[0]>=minX&&v[0]<=maxX&&v[1]>=minY&&v[1]<=maxY&&pointInRing(v,vertices)) || p.polygon.some(ring=>ringsCross(ring,vertices))); 
    const containsLand=hits(lp),containsReef=hits(rp);
    const allLand=[center,...vertices].every(p=>has(p,lp));
    const terrain:Surface=allLand?'land':containsLand?'coast':containsReef?'reef':has(center,gp)?'lagoon':'ocean';
    const cell:Cell={id:`${TERRAIN_VERSION}:${id}:${q},${r}`,q,r,x,z,center,terrain,containsLand,containsReef,landmarkIds:[],elevationM:null,depthM:null};
    cells.push(cell); byKey.set(keyOf(cell),cell);
  }
  const extra=[geography,...supplements].flatMap(g=>g.landmarks).map(l=>({...l,short:l.name.toUpperCase(),kind:'ship' as const,note:'Approximate ship footprint centroid from OpenStreetMap. A landmark, not a playable unit or a land tile.'}));
  const landmarks=[...region.landmarks.filter(l=>!l.focusOnly||view.id==='focus'),...extra].filter((l,i,a)=>a.findIndex(o=>o.id===l.id)===i).filter(l=>{
    const p=project(l.position,view.center); return byKey.has(keyOf(worldToHex(p.x,p.z,view.hexKm)));
  });
  const sources=[...geography.sources,...supplements.flatMap(g=>g.sources)].filter((s,i,a)=>a.findIndex(o=>o.sha256===s.sha256)===i);
  const map:TerrainMap={id,version:TERRAIN_VERSION,region,view,cells,byKey,landmarks,sources,geographyVersion:geography.version};
  for (const l of landmarks) cellAt(map,l.position)?.landmarkIds.push(l.id);
  return map;
}
export function exportMap(map: TerrainMap) {
  return {
    schema:'xriegsspiel-terrain/1',version:map.version,id:map.id,geographyVersion:map.geographyVersion,
    projection:{type:'local-equirectangular',origin:map.view.center,earthRadiusKm:6371.0088},
    grid:{orientation:'pointy',coordinates:'axial',rDirection:'south',hexCenterSpacingKm:map.view.hexKm,widthKm:map.view.widthKm,heightKm:map.view.heightKm},
    attribution:'Made with Natural Earth. © OpenStreetMap contributors.',license:'ODbL-1.0',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/',
    limitations:['Generalized geography; not a navigational chart.','Coast and reef hexes record feature presence, not full tile coverage.','No elevation, bathymetry, trafficability, ownership, or unit movement rules.','Independent local grids; not a continuous global spherical tessellation.'],
    sources:map.sources,landmarks:map.landmarks,cells:map.cells.map(c=>({...c,neighbors:neighbors(map,c).map(n=>n.id)})),
  };
}
