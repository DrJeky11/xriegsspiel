# Pacific terrain data

Geography package: `pacific-geography/0.1.0`. Retrieved **2026-09-16 UTC** (2026-09-15 America/New_York).

## Contents and attribution

- `regional-land.json`: Natural Earth 1:10 million land, from the **v5.1.2 repository tag**. The land layer's own download page lists **5.1.1**; repository and layer versions are different. Public domain. Clipped to 111–129° E, 6–29° N. Western Senkaku polygons wholly within 123.40–123.72° E, 25.68–25.96° N are omitted, then supplied by the separate OSM layer in the application. Eight generalized polygons were replaced; this avoids overlapping shifted/generalized outlines.
- `shoal-detail.json`: © OpenStreetMap contributors. **ODbL 1.0**. Second Thomas Shoal reef relation **8007968**, including outer rings and lagoon holes, plus the approximate footprint centroid of BRP Sierra Madre way **1002433862**. Does not convert reef or ship into land.
- `senkaku-detail.json`: © OpenStreetMap contributors. **ODbL 1.0**. Closed rings assembled from connected `natural=coastline` ways in the western-islands extract. Administrative and maritime claim boundaries are excluded.
- `sources/shoal-2026-09-16.osm.gz` and `sources/senkaku-2026-09-16.osm.gz`: saved original OSM API responses, losslessly compressed. Included so the imported database is available and rebuilding does not silently substitute live edits. Files contain ancillary OSM elements; the importer selects only the geometry described above.

The OSM-derived JSON databases and exported combined terrain databases are made available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). Credit **© OpenStreetMap contributors** and retain the source/license records when redistributing. Natural Earth data remains public domain. These data licenses do not apply to unrelated application code or equipment records.

[OpenStreetMap copyright and licensing](https://www.openstreetmap.org/copyright), §§OpenStreetMap licensing / How to credit OpenStreetMap. [Natural Earth terms](https://www.naturalearthdata.com/about/terms-of-use/), Terms of Use. Both consulted 2026-09-16 UTC.

## Source inputs and uncompressed SHA-256

| Source | Exact input URL | SHA-256 |
| --- | --- | --- |
| Natural Earth land | https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/ne_10m_land.geojson | `1ac90796408bc6ad6911d69448485d3c4dbf2190370080368a09976e1c9f7416` |
| Second Thomas OSM | https://api.openstreetmap.org/api/0.6/map?bbox=115.78,9.60,115.98,9.95 | `c00eb3941d176e18c148a4df70724b8cfba77215ff5ed850e92b86e10d870642` |
| Western Senkaku OSM | https://api.openstreetmap.org/api/0.6/map?bbox=123.40,25.68,123.72,25.96 | `f4d6725971177341fd3dcbc0e12a4ae085b0c38e0d90d899af1d036a53ebd69e` |

Source files record access dates, licenses, and hashes. No map-service calls are made at runtime. The source snapshot date is not a claim about the last physical survey date.

## Fidelity

Natural Earth's `10m` means **1:10 million**, not 10-meter accuracy. OSM is community mapped, not a surveyed navigational product. Reefs and small islands are exaggerated to their intersecting hexes; coastal hexes mix water and land. The lagoon follows mapped inner rings, but depth, tides, navigable entrances, roads, vegetation, and elevations are unknown. Ship position is an approximate label anchor derived from the mapped footprint, not a live location feed. Contemporary reclamation is incomplete in the regional basemap.

The application uses independently projected regional grids, not a globally seamless spherical hex lattice. Hexes carry geodetic centers for future cross-map integration. Names are geographic labels, without sovereignty boundaries or ownership assignments.
