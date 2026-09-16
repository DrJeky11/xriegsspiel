# Red and Blue equipment catalog

**2026-09-16 update:** the catalog now serves as the equipment reference and links records into the original Pacific/CENTCOM playable workspaces. The fictional browser test board was retired. Catalog data and pure piece rules are preserved; see [current controls](../docs/playable-terrain.md). Earlier laboratory UI instructions below are historical.
**Version 0.1.0 · 2026-09-15.** A source-backed database and executable equipment laboratory for XRiegsspiel. The owner requested Chinese Red and US Blue equipment for 1980 onward using Army ODIN / Worldwide Equipment Guide. Command's public documentation informs the design; its database, software and artwork are not included.

Open the [equipment browser](http://127.0.0.1:5173/catalog.html) with the local server running. Search by name, force, domain, piece type and reference year. Inspect source fields, components and original game rules; place pieces on the fictional board, preview/commit movement, load/unload items, advance turns and export a replayable journal.

## Geographic integration follow-up

The [geographic tabletop](http://127.0.0.1:5173/scenario.html) now uses this catalog on all six Pacific/CENTCOM maps, with authoritative commands, hex movement/transport, separate autosaving, and replay-verified save/import. Its [runbook](../docs/geographic-scenario.md) records a seven-variant evidence review and the UH-60L date restriction. The standalone laboratory behavior described below is retained.

## Contents

| Artifact / count | Meaning |
| --- | --- |
| [equipment.sqlite](equipment.sqlite) | Portable SQLite database: research, provenance, components, rule profiles and playable definitions |
| [equipment.json](equipment.json): **1,607** | Distinct ODIN records: 913 land, 557 air, 137 sea; **49,290** source fields |
| [pieces.json](pieces.json): **1,607** | 1,084 platform definitions and 523 equipment/item definitions, linked to source records and rules |
| **1,522** distinct eligible pieces in 2026 | 1,112 Red memberships and 459 Blue memberships; 49 pieces appear under both |
| [components.json](components.json): **1,073** | 1,066 unreviewed field mentions plus 7 inspected section assertions for M1A2 and ZTZ-96; these can overlap |
| [rules.json](rules.json): **16** profiles | Original movement, terrain, layer and cargo abstractions |
| [sources.json](sources.json) | Exact filters, export filenames, access dates, row counts, local paths and SHA-256 hashes |
| [coverage.json](coverage.json), [verification.json](verification.json) | Import coverage and integrity results |
| [quality-notes.json](quality-notes.json), [component-inspections.json](component-inspections.json) | Source discrepancies and section locators |

## Source coverage and eligibility

Four public CSV exports were downloaded through ODIN's ordinary interface on **2026-09-15**: China origin (922 records), China operator/proliferation (1,114), US operator/proliferation (459), US origin (396). Overlapping identifiers are merged. Original exports are retained in gitignored `data/odin/`; the manifest pins their hashes. Source record numbers count the header as record 1 and are not physical line numbers when cells contain newlines.

Origin alone does not assign equipment to a force. Operator-filter membership plus a known reported introduction year no later than the laboratory year permits testing. The researched laboratory period is 1980–2026. The 2026 set excludes 83 origin-only records and 2 unknown-date records; all remain searchable.

The import contains 1,265 reported introductions in 1980–2026, 340 pre-1980 candidates and 2 unknown dates. **Continued service of older systems is not established.** Introduction may describe a family, prototype or production milestone rather than exact variant service. There are no inferred retirement dates or current quantities. These are ODIN assertions, not a verified historical or current order of battle, and the catalog is bounded by the four exports.

## What is playable

The implementation default is one platform or one equipment item per piece. Later formations can compose them; the owner has not selected a permanent scenario echelon.

- Movement points and cargo slots are authored quantities, not kilometers, minutes, seats or kilograms. No source performance figure automatically drives a game rule.
- Ground, air, surface-water and underwater layers use explicit terrain/occupancy rules. Landing craft can enter plain cells directly beside water. Aircraft have no basing, takeoff or endurance model.
- Cargo tests conservation, not real loading dimensions, weight, towing or mounting compatibility. Classification is largely derived from title/taxonomy and remains provisional.
- Loading transfers the item off the map, preserves its identity and costs its carrier one point. Unloading costs one point and prevents the item moving until the next turn.
- Weapons, sensors, engines and ammunition are reference data. Combat, detection, electronic warfare, damage and repair effects are not implemented. Component mentions are not approved loadouts.
- Lab state pins catalog/rules versions. Exports include placements and committed actions; the browser replays the journal before downloading it.
- The browser lab has full information and local control. It has no multiplayer authority or server persistence; reload starts fresh. It does not submit orders to the shared exercise or geographic terrain workspaces.

Tokens use original lettering and force colors. Real equipment artwork/3D models, reviewed formations/scenarios and Quest integration remain future work.

## Component context and quality

ODIN's CSV flattens sections. Repeated names/types/ranges can lose their context; some numbers omit units. The inspected M1A2 Automotive section reports 66 km/h road speed and 426 km range, while Main Gun reports a separate 4,000 m range. Neither sets this lab's four-point tracked profile. The coaxial section contains conflicting caliber labels, preserved for review.

Automatic component mentions use explicit fields such as `engine name` and `navigation radar`, retaining parent equipment IDs, source keys and export provenance. Inspected assertions have section locators and optional parent-component links. M1A2 ammunition options are children of its main-gun record; repeated basic-load values are **not added together**. Component names are not automatically equated with standalone variants.

The public “Data Only” export was attempted without a completed download being observed. Only completed CSV exports underpin the bulk import. Most component relationships still need section review before a realistic model can use them. Notes/image fields and long text were omitted from generated source fields; other short source strings remain unverified.

## Rebuild and query

Python standard library only, tested with Python 3.14.6. Runtime tests used Node 26.0.0 and the project's existing packages; no dependencies were added.

```sh
python3 scripts/import-odin.py
python3 scripts/build-piece-definitions.py
python3 scripts/build-components.py
python3 scripts/build-catalog-db.py
python3 scripts/verify-catalog.py
npm test
npm run build
```

Import requires the four original CSVs at their manifest paths and verifies hashes/counts. Later build steps can run from the included canonical JSON. SQLite is replaced atomically after integrity checks.

```sql
SELECT name, force, profile_id FROM lab_eligible_2026 ORDER BY force, name;
SELECT e.name, c.name, c.locator, c.review_status
FROM component c JOIN equipment e ON e.id = c.equipment_id;
SELECT e.name, f.field, f.raw_value
FROM source_fact f JOIN equipment e ON e.id = f.equipment_id
WHERE e.name LIKE '%M1A2%';
```

The `parts`/`platforms` views retain raw import classifications. Use `piece_definition.kind` for refined laboratory definitions. `lab_eligible_2026` filters operator/introduction assertions; it is not historical certification. Metadata includes input hashes and rule assumptions.

## Verification

Verified on 2026-09-15:

- Source hashes/counts, unique identifiers, source-to-definition coverage, component references, SQLite integrity/foreign keys and canonical input hashes.
- A full rebuild produced byte-identical equipment, piece, component and coverage JSON plus SQLite. The downloaded browser journal was independently replayed in Node and matched its exported state.
- Nine catalog/runtime tests cover all eligible definitions, force/year exclusions, terrain and occupancy, preview purity, cargo conservation/capacity, shoreline behavior, version rejection, deployment/action replay and classification regressions.
- All 27 repository tests and production build/typecheck passed. Vite retains a warning about the shared Three.js chunk size.
- Browser checks: search, Red/year filtering, Blue/Red deployment, movement preview/commit, water rejection, item load/unload and JSON export. Replay matched state; a completed `equipment-laboratory.json` download was observed. No warning/error logs were returned during the tested flow. Desktop layout was visually inspected.

No Quest test, multiplayer catalog test, instructor validation, complete variant/service audit or independent performance validation occurred. The reusable database and laboratory are available; historically accurate scenarios require the outstanding evidence/model work above.
