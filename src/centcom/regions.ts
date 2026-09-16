export type LonLat = readonly [number, number];
export type Bounds = readonly [number, number, number, number];
export interface Landmark {
  name: string;
  location: LonLat;
  kind: 'place' | 'island' | 'water' | 'region';
  note: string;
}
export interface ReliefBand { start: LonLat; end: LonLat; widthKm: number; strength: number }
export interface Region {
  id: 'hormuz' | 'bab-al-mandeb';
  version: string;
  title: string;
  subtitle: string;
  bounds: Bounds;
  origin: LonLat;
  spacingKm: number;
  focus: LonLat;
  landmarks: Landmark[];
  relief: ReliefBand[];
}

// Region extents, grid spacing, label anchors, and relief bands are authored map
// choices. Coastlines are sourced separately; labels are not harbor entrances.
export const REGIONS: Region[] = [
  {
    id: 'hormuz', version: '0.1.0', title: 'Strait of Hormuz',
    subtitle: 'Persian Gulf / Gulf of Oman',
    bounds: [54.6, 24.4, 58.3, 27.8], origin: [56.45, 26.1], spacingKm: 5,
    focus: [56.48, 26.63],
    landmarks: [
      { name: 'Strait of Hormuz', location: [56.55, 26.6], kind: 'water', note: 'The passage between the Persian Gulf and Gulf of Oman.' },
      { name: 'Qeshm', location: [55.85, 26.78], kind: 'island', note: 'Elongated island along the northern approach.' },
      { name: 'Hormuz Island', location: [56.47, 27.06], kind: 'island', note: 'Island east of Qeshm, near Bandar Abbas.' },
      { name: 'Larak', location: [56.36, 26.86], kind: 'island', note: 'Island south of Hormuz Island.' },
      { name: 'Bandar Abbas', location: [56.28, 27.18], kind: 'place', note: 'Geographic reference only; port facilities and capacity are not modeled.' },
      { name: 'Khasab', location: [56.25, 26.18], kind: 'place', note: 'Geographic reference on the Musandam peninsula.' },
      { name: 'Fujairah', location: [56.34, 25.13], kind: 'place', note: 'Geographic reference on the Gulf of Oman coast.' },
      { name: 'Musandam', location: [56.22, 25.83], kind: 'region', note: 'Peninsula forming the southern shore of the strait.' },
      { name: 'IRAN', location: [57.35, 27.48], kind: 'region', note: 'Orientation label; national and maritime boundaries are not drawn.' },
      { name: 'UAE', location: [55.18, 24.9], kind: 'region', note: 'Orientation label; national and maritime boundaries are not drawn.' },
      { name: 'Persian Gulf', location: [55.15, 26.23], kind: 'water', note: 'Western approach.' },
      { name: 'Gulf of Oman', location: [57.48, 25.25], kind: 'water', note: 'Eastern approach.' },
    ],
    relief: [
      { start: [55.97, 24.4], end: [56.25, 26.35], widthKm: 19, strength: .9 },
      { start: [54.8, 27.3], end: [57.9, 27.65], widthKm: 33, strength: 1 },
    ],
  },
  {
    id: 'bab-al-mandeb', version: '0.1.0', title: 'Bab al-Mandeb',
    subtitle: 'Southern Red Sea / Gulf of Aden',
    bounds: [41.8, 10.9, 45.3, 14.1], origin: [43.55, 12.5], spacingKm: 3,
    focus: [43.4, 12.57],
    landmarks: [
      { name: 'Bab al-Mandeb', location: [43.34, 12.56], kind: 'water', note: 'The passage connecting the Red Sea and Gulf of Aden.' },
      { name: 'Mayyun / Perim', location: [43.42, 12.657], kind: 'island', note: 'Small island dividing the strait. Mixed coastal hexes retain sub-tile land.' },
      { name: 'Ras Menheli', location: [43.48, 12.69], kind: 'place', note: 'Geographic reference on the Arabian shore of the strait.' },
      { name: 'Assab', location: [42.74, 13.01], kind: 'place', note: 'Geographic reference on the western Red Sea coast.' },
      { name: 'Obock', location: [43.29, 11.96], kind: 'place', note: 'Geographic reference near the Gulf of Tadjoura.' },
      { name: 'Djibouti', location: [43.15, 11.59], kind: 'place', note: 'Geographic reference only; port facilities and capacity are not modeled.' },
      { name: 'Aden', location: [45.03, 12.79], kind: 'place', note: 'Geographic reference on the Gulf of Aden coast.' },
      { name: 'YEMEN', location: [44.25, 13.67], kind: 'region', note: 'Orientation label; national and maritime boundaries are not drawn.' },
      { name: 'ERITREA', location: [42.04, 13.55], kind: 'region', note: 'Orientation label; national and maritime boundaries are not drawn.' },
      { name: 'DJIBOUTI', location: [42.26, 11.48], kind: 'region', note: 'Orientation label; national and maritime boundaries are not drawn.' },
      { name: 'Red Sea', location: [42.78, 13.63], kind: 'water', note: 'Northern approach.' },
      { name: 'Gulf of Aden', location: [44.3, 11.76], kind: 'water', note: 'Southern and eastern approaches.' },
    ],
    relief: [
      { start: [43.72, 12.98], end: [44.2, 14.1], widthKm: 33, strength: 1 },
      { start: [41.85, 13.15], end: [42.65, 11.6], widthKm: 24, strength: .8 },
      { start: [43.85, 13.22], end: [45.25, 13.32], widthKm: 22, strength: .6 },
    ],
  },
];
