# Pacific hex terrain workspace

**Implemented: 2026-09-16 UTC / 2026-09-15 America/New_York.** Owner requested geographic terrain near the Philippines/South China Sea around Sierra Madre and near Taiwan/Senkaku, represented with hexagonal tiles. This is terrain preparation, independent of the concurrently developed playable-piece database and CENTCOM terrain work.

Open [Pacific terrain](http://127.0.0.1:5173/pacific.html) after `npm run dev`, or after `npm run build` and `npm start`. The existing cooperative exercise links to this page. The page links back to the exercise and to CENTCOM. The original square-grid logistics exercise and its saved journal remain unchanged.

## Coverage and authored scale

| View | Center (longitude, latitude) | Extent | Neighbor-center spacing | Hexes |
| --- | --- | --- | --- | --- |
| Palawan & Spratlys | 117.8° E, 11° N | 960 × 690 km | 18 km | 2,257 |
| Second Thomas Shoal focus | 115.866° E, 9.735° N | 36 × 28 km | 0.75 km | 1,947 |
| Taiwan & Senkaku | 122.2° E, 24.75° N | 920 × 740 km | 18 km | 2,373 |
| Western Senkaku focus | 123.56° E, 25.82° N | 40 × 34 km | 0.75 km | 2,677 |

These extents and resolutions are implementation defaults, not owner-confirmed tactical scales. The optional scale question received no answer during implementation, so regional views with close-ups were used. Eastern Taisho/Chiwei is visible in the regional view; the close-up covers the western group around Uotsuri/Diaoyu and Kuba/Huangwei.

Pointy hexes use axial `(q,r)` coordinates, with positive `r` toward the south. A hex has up to six edge-sharing neighbors. Its circumradius is center spacing / √3. Grids include only whole cells within the authored extent. Local equirectangular projection uses the map center and a 6371.0088 km sphere; east-west scale is exact at the reference latitude in that approximation and varies away from it. Do not use tile counts as geodesic distances across large regions. The views do not yet form one seamless global lattice.

## Implemented behavior

- Shared corner controls and right sliding drawer, matching CENTCOM. **Menu** starts closed; click it to reveal the existing controls, and close with **×**, **Menu**, or **Escape**. The drawer overlays the map without resizing or resetting it. **Labels off/on** operates independently and starts off; region/focus switches retain the setting. North and scale guides remain visible. On narrow screens the buttons stay above the drawer, whose contents scroll internally. Hidden controls are inert, focus returns on close, and reduced-motion preferences disable the slide.
- Region and regional/focus switching, URL bookmarks, tile inspection, reference-location selection, six-neighbor navigation, mouse/touch controls, zoom, top view, reset, and label toggle.
- Browser keyboard path: Tab to the map; arrow keys and Q/E select six neighbors. Inspector buttons also select adjacent hexes.
- Quest/WebXR VR and MR entry when supported, controller-ray tile inspection, a readable spatial inspector, region/focus switching, table scaling/recentering, and exit. Left stick moves the board; right stick changes height/rotation. These controls are implemented but **not tested on the real headset in this task**.
- Instanced hex rendering: the terrain occupies one instanced draw submission; labels and markers are separate. Geometry/material/texture resources are disposed when switching maps. No dependency was added.
- Exported JSON includes schema/version, projection, grid scale, globally distinct map/version-prefixed tile IDs, geographic tile centers, six-neighbor IDs, landmarks, source hashes, licenses, and explicit unknown depth/elevation fields.
- No unit catalog imports, game commands, deployments, claims, movement permissions, or combat rules. A coastal hex may contain a tiny island and mostly water. Consumers must not interpret it as wholly passable land or wholly navigable water.

## Data and classification

`public/terrain/pacific/` contains 488 kB of derived JSON geometry and saved compressed OSM source responses. See its [data/provenance README](../public/terrain/pacific/README.md) for exact URLs, licenses, hashes, and changes.

Regional coastlines come from the Natural Earth v5.1.2 repository tag. Its land download page lists layer version 5.1.1. The 1:10 million scale is deliberately generalized. The western Senkaku subset is replaced with OSM geometry in **both** views so their island shapes remain consistent. Second Thomas reef geometry supplements the Philippines regional view and supplies the focus view. The coarse Natural Earth reefs layer was inspected but does not include Second Thomas; it was not shipped.

The importer uses Python's standard library only. It clips Natural Earth polygons, assembles connected OSM coastline ways into rings, and preserves reef relation holes. Missing nodes, incomplete reef relations, or open coastline chains fail loudly instead of inventing a closing coastline. Political/administrative relations are not used. To reproduce:

```sh
curl -L --fail https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson -o /tmp/pacific-ne-land.geojson
python3 scripts/import-pacific-terrain.py \
  --land /tmp/pacific-ne-land.geojson \
  --shoal public/terrain/pacific/sources/shoal-2026-09-16.osm.gz \
  --senkaku public/terrain/pacific/sources/senkaku-2026-09-16.osm.gz
```

Verify the input hash against the data README before accepting a changed asset. The shipped source snapshot is pinned; querying the live OSM URL again is a data update, not an exact rebuild.

A cell is `land` if the center and six corners sample land. `coast` means a land polygon intersects it; small polygons and thin edge crossings are retained. Reef intersection is checked separately and exposed as `containsReef`; lagoon classification uses mapped interior water rings. Terrain color precedence is land, coast, reef, lagoon, then ocean. These are cartographic classes, not area fractions or trafficability. The coarse classification can close small passages or exaggerate narrow reefs, so exact navigation and movement require a later rules/data layer.

Tile plate heights and subtle color variation are symbolic material styling. No measured elevation, vegetation, seafloor, sea state, currents, tides, or slope is fabricated. Each tile's `elevationM` and `depthM` is `null`.

## Location evidence

Sources accessed 2026-09-16 UTC:

- [AMTI: Second Thomas Shoal](https://amti.csis.org/second-thomas-shoal/), introductory description and GPS field: identifies the submerged reef and the grounded BRP Sierra Madre separately. The source's 9°43′57″ N, 115°51′51″ E is used for the **shoal reference point**, not the ship. No satellite imagery copied.
- [AMTI: Mischief Reef](https://amti.csis.org/mischief-reef/), GPS field: 9°54′ N, 115°32′ E. Used as a reference point; current infrastructure is not reproduced.
- [Ishigaki municipal digital museum](https://www.senkaku-islands.jp/basic-info/), island descriptions/position rows: approximate locations of Uotsuri, Kuba, and Taisho. Its ownership framing is not imported. Its whole-arcminute coordinates are too coarse for some detail labels, so Uotsuri uses an anchor on the [OSM island polygon](https://www.openstreetmap.org/relation/1270194), and Kuba uses [OSM node 1918155252](https://www.openstreetmap.org/node/1918155252). Taisho retains the rounded reference in the overview.
- [OSM Second Thomas relation 8007968](https://www.openstreetmap.org/relation/8007968): mapped reef rim, lagoon hole, and inner reef patches. [OSM Sierra Madre way 1002433862](https://www.openstreetmap.org/way/1002433862): averaged polygon vertices supply an approximate ship label at 115.8567369° E, 9.7909705° N. This is static source geometry, not a live tracking feed.
- [Natural Earth land](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/), About / Download sections; [reefs](https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-reefs/), About / Issues sections. Natural Earth documents generalization; its reefs layer derives from WDB2 and has definition limitations.

## Integration boundary

| File | Responsibility |
| --- | --- |
| `src/pacific/terrain.ts` | Versioned definitions, projection, hex math, source-based classification, neighbors, export contract |
| `src/pacific/terrain-table.ts` | Instanced Three.js rendering, local view transforms, ray selection, WebXR panel and placement |
| `src/pacific/main.ts`, `style.css`, `pacific.html` | Terrain workspace, bookmarks, loading, inspection, data export |
| `scripts/import-pacific-terrain.py` | Offline reproducible source conversion |
| `tests/pacific-terrain.test.ts` | Geometry, topology, known locations, reef/lagoon and export invariants |

Catalog integration should consume geographic centers, feature-presence flags, and stable tile IDs. Surface classes deliberately carry no default unit speed or movement cost. Keep future authoritative rule decisions independent of the local board transform.

## Verification record

- TypeScript check passed; production build includes all root HTML entry points.
- Six Pacific test cases passed: hex/projection round trips; connected bounded grids and reciprocal adjacency; reef holes/ship semantics; retained named islands; thin polygon crossings; deterministic licensed exports with unknown measurements. Existing exercise and concurrent terrain/catalog tests are separate suite coverage.
- Rebuilt all three JSON assets from the saved OSM gzip inputs and pinned Natural Earth input; all three compared byte-for-byte equal with the shipped assets.
- Browser inspection at 1440 × 1000 covered both regions and both focus maps, ship landmark inspection, map labels, and source display. Mobile inspection used 390 × 844; camera framing was corrected after detecting cropped map edges. The corrected view fits the full board; document width did not exceed the viewport.
- Final `npm test`: **25/25 passed**, including six Pacific cases. `npm run build` passed with index, Pacific, CENTCOM, and catalog entries. Vite retains the shared Three.js chunk-size warning (>500 kB); this is not a measured headset performance result.
- Production browser at port 5173: no console errors or warnings on final load; 1,947 shoal hexes rendered. The observed unselected shoal view used 13 draw calls / 46,820 triangles; no XR session occurred.
- Mouse picking, keyboard ArrowRight selection, region/focus switching, URL reload, top view, label toggle, reset, and ship-reference inspection worked. The downloaded Senkaku-focus JSON was parsed and checked: 2,677 cells, all neighbor IDs resolve, 0.75 km spacing, ODbL source/license, unknown depth values retained.
- Screenshots and browser evidence are in gitignored `output/playwright/pacific-*.png` and `.playwright-cli/`.
- No real-headset test, sustained Quest frame-rate measurement, navigational validation, or playable-piece integration is claimed.

## Shared menu verification — 2026-09-15 local

The owner-selected corner buttons and drawer were checked across all four Pacific views and both CENTCOM regions. Browser checks at 1280 × 720, 800 × 900, and 390 × 844 covered closed/open layout, independent labels, region/focus switching, drawer scrolling, Escape/focus restoration, and map/inspector keyboard selection. Mobile document width remained 390 px. Map canvas dimensions stayed unchanged when the drawer opened. Evidence: gitignored `output/playwright/menu-*.png`.

Terrain-only TypeScript checking and all **11 Pacific/CENTCOM tests** passed; `npm exec vite build` produced the updated pages. The initial full build and 27-test run passed, but later checks encountered concurrently changed code outside this update: `src/scenario/rules.ts:127` has a `LabAction` type error, and `tests/pieces.test.ts:65` expects a different route-error message (26/27 passing). Those files were not edited by the menu work. Real headset testing remains pending.

## Remaining work

Higher-fidelity terrain requires licensed/sourced elevation, land cover, bathymetry, tides, and current coastline/reclamation inputs with their own vintages. Physical navigability and movement permissions need explicit unit/rules models. A global hex index and cross-view remapping remain a later architecture decision. Real Quest selection comfort, label legibility, and performance must be tested using the existing hands-on checklist.
