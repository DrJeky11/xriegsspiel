# CENTCOM hex terrain

Implemented **2026-09-15 local / 2026-09-16 UTC** for the owner's requested Strait of Hormuz and Bab al-Mandeb terrain scenarios. The owner confirmed hexagonal map tiles. Region bounds, spacing, reference labels, and illustrative relief below are implementation choices, not approved combat rules.

## Open and inspect

With `npm run dev`, open [CENTCOM terrain](http://127.0.0.1:5173/centcom.html). For the existing production service, run `npm run build` and use the same link. The original exercise inspector links to both CENTCOM and Pacific terrain. `centcom.html` and `pacific.html` are independent entry points discovered by the shared Vite configuration.

- Use the upper-right **Menu** button to open the right sliding drawer, which starts hidden. Switch between Hormuz and Bab al-Mandeb under **Area of study**. A `?region=bab-al-mandeb` URL restores that region. Close with **×**, **Menu**, or **Escape**; opening and closing the drawer never resizes or resets the map.
- Click a hex, select a named place, or enter axial **q / r** coordinates under **Coordinates & data**. The inspector separates tile-center surface from mixed coastal tiles.
- Drag to pan, right-drag to orbit, scroll or use +/− to zoom. **Plan view** looks vertically down; **Fit region** restores framing. Two-finger gestures pan/zoom on touchscreens.
- Toggle place labels independently with the corner **Labels off/on** button. Labels start off and retain their setting across region changes. Source coastline, illustrative relief, coordinates, and JSON export remain inside the drawer. Legend, north direction, spacing, and attribution stay on the map. On narrow screens the corner buttons sit above the drawer; its contents scroll internally. Hidden controls are inert, focus returns on close, and reduced-motion preferences disable the slide.
- Quest support uses the existing Three.js/WebXR approach: **Enter VR** or **Enter MR** when supported; trigger selects a hex. A spatial panel switches region, changes table size, recenters, and exits. Left stick moves the table; right stick changes height/rotation. Seated manual placement does not require hand tracking or room detection.

These maps are terrain workspaces, not new playable scenarios. They do not change the original square-grid exercise, its commands, or its journal. Equipment, ownership, deployment, movement costs, combat, and multiplayer selection synchronization are not added.

## Region packages

| Map | Extent (W, S, E, N) | Adjacent-center spacing | Hexes | Principal references |
| --- | --- | --- | --- | --- |
| Strait of Hormuz | 54.6°, 24.4°, 58.3°, 27.8° | 5 km | 6,395 | Qeshm, Hormuz Island, Larak, Musandam, Bandar Abbas, Khasab, Fujairah; Persian Gulf and Gulf of Oman |
| Bab al-Mandeb | 41.8°, 10.9°, 45.3°, 14.1° | 3 km | 17,331 | Mayyun/Perim, Ras Menheli, Assab, Obock, Djibouti, Aden; Red Sea and Gulf of Aden |

Both are version `0.1.0`, schema `xriegsspiel/hex-terrain/1`. IDs include region/version/spacing/q,r. Changing grid origin, spacing, classification, or source geometry requires a version change before using these as persisted scenario coordinates.

Regional local equirectangular projection uses a 6371.0088 km spherical radius and each region's documented origin. Longitude is scaled by the origin latitude's cosine. Hexes are pointy-top, axial q/r, with six neighbors. Spacing means projected center-to-center distance; it is not a hex side length or exact geodesic distance everywhere. North is +y in model coordinates and −z in the Three.js board.

These are separate projected regional grids, **not a seamless global spherical index**. A future worldwide board needs an explicit globe/projection and cross-region topology decision; this slice does not claim a globe can be tiled entirely with regular hexagons.

## Data and classification

- Natural Earth land polygons supply the geographic land mask. The importer clips polygon rings to padded regional bounds, preserves hole parity, and rounds coordinates to six decimal places. Precision of storage is not accuracy of the generalized source.
- Each hex samples its center plus six corners. Coastline segments are also densified at one fifth of center spacing and assigned to hexes, helping retain islands smaller than a tile. The original coastline can be drawn over the hex terrain.
- A **mixed coast** hex contains sampled coastline or a mixture of land/water samples. It is not declared navigable or impassable. `centerSurface` says what the source mask reports at the center. `landSamples / sampleCount` is a count, **not a land-area fraction**.
- **Coastal water** is a water hex adjacent to mixed coast. It does not mean shallow water. Open water is not a depth measurement either.
- **Upland study** uses hand-authored bands near the Musandam/Hajar, Iranian interior, Yemeni interior, and western Red Sea/Djibouti land areas. Display height and category threshold are illustrative. They do not establish slope, cover, traversability, line of sight, or measured elevation.
- `elevationM` and `depthM` are explicitly null. No bathymetric or elevation raster, harbor survey, road network, border, traffic lane, or order of battle was imported.
- Label anchors are approximate authored geographic references. They are not surveyed port locations or harbor entrances; some sit in mixed shoreline hexes because of source generalization.

Files: `src/centcom/regions.ts` defines map choices; `coastlines.json` stores provenance and clipped polygons; `terrain.ts` implements pure geometry/classification/export; `view.ts` renders instanced hexes and implements browser/XR input; `main.ts` and `style.css` implement the inspector. The JSON export includes per-tile neighbor IDs, geographic centers, classification, null measurements, source metadata, and limitations. Use the model without importing the renderer when integrating scenarios or the equipment catalog.

## Source register

Accessed **2026-09-16 UTC**. Source facts and authored presentation choices are separate.

1. [Natural Earth 1:10m land](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/), **Download land** and **About**: land polygons and major islands, dataset version **5.1.1**, derived from 1:10m coastline. This is a generalized regional basemap, not hydrographic chart coverage.
2. [Natural Earth terms of use](https://www.naturalearthdata.com/about/terms-of-use/), **Terms of Use**: dataset is public domain and redistribution/modification is permitted. Credits are retained in the interface, source JSON, and export.
3. [EIA: Bab el-Mandeb Strait](https://www.eia.gov/todayinenergy/detail.php?id=41073), published **2019-08-27**, opening map and geographic description; and [EIA World Oil Transit Chokepoints](https://www.eia.gov/international/content/analysis/special_topics/World_Oil_Transit_Chokepoints/), **Strait of Hormuz** and **Bab el-Mandeb** sections/maps. These informed geographic orientation and the connected-water checks. No trade volume, security event, or current operational status is encoded.

Exact archive: <https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip>. The internal `ne_10m_land.VERSION.txt` independently reports 5.1.1. Archive SHA-256: `e547d749445eaa0964aba76738090ec88f5e63c4585122170f98c67a7ea922dc`.

Reproduce the tracked 111,838-byte coastline subset with Python's standard library (tested on Python 3.14.6):

```sh
curl -L --fail https://naciscdn.org/naturalearth/10m/physical/ne_10m_land.zip -o /tmp/centcom-ne-land.zip
python3 scripts/import-centcom-terrain.py /tmp/centcom-ne-land.zip
```

The importer verifies the archive hash before writing. It produces 228 Hormuz rings / 4,443 vertices and 13 Bab al-Mandeb rings / 653 vertices. No network is required to build or display CENTCOM after checkout; its source data is bundled locally. No new dependencies were added.

Regeneration from the pinned archive was checked to be byte-for-byte identical to the bundled subset.

## Verification

Five automated terrain tests cover hex edge sharing, six-neighbor symmetry, geographic round trips, bounded and deterministic IDs/classification, JSON serialization, null measurements, retained islands, and connected water paths through both major straits without crossing any mixed coast hex. This is a topology check, not a navigational route or proof every sub-tile channel is resolved.

Desktop browser checks exercised pointer selection, region switching, Qeshm/Mayyun references, layer toggles, plan view, valid/out-of-bounds keyboard coordinates, and JSON download. Screenshots are under gitignored `output/playwright/centcom-*`.

The production build and the full available **25-test** suite passed at this task's verification point (5 CENTCOM, 6 Pacific, 7 original exercise, 7 unit-lab tests). Vite retains the shared Three.js/OrbitControls chunk warning above 500 kB. Production pages loaded on the existing port 5173 service. Desktop 1440 × 1000 and mobile 390 × 844 were visually inspected; mobile document width was exactly 390 px, with no horizontal overflow or browser page errors in that run. A downloaded Hormuz export was parsed independently: all 6,395 tiles were present, all neighbor references resolved, and depth/elevation remained null. Observed desktop render diagnostics were 14 draw calls, 153,994 Hormuz triangles / 416,458 Bab al-Mandeb triangles, and zero XR frames. These are geometry/runtime observations, not a sustained performance benchmark.

Real Quest input, passthrough, seated comfort, label readability, and sustained headset performance remain unverified. An instanced renderer and desktop screenshots do not establish Quest performance. Before a scenario uses these maps for movement, decide how mixed coastal hexes and sub-tile islands/channels affect the selected rules, and replace illustrative relief with sourced elevation if elevation affects adjudication.

### Shared menu verification — 2026-09-15 local

The common corner buttons and drawer were checked on desktop, tablet, and phone layouts, including both CENTCOM regions, place selection, label retention after layer changes, coordinate inspection, and internal scrolling to the export control. Export activation displayed its success status; the browser tool did not capture the download event in this run. The production bundle, terrain-only TypeScript check, and all 11 terrain tests passed. See the [shared verification record](pacific-terrain.md#shared-menu-verification--2026-09-15-local) for the later full-project failures in concurrently changed scenario/piece code. No real headset test was performed.
