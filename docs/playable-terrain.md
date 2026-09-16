# Playable Pacific and CENTCOM workspaces

Implemented 2026-09-16 on `codex/playable-terrain-workspaces`. The original geographic workspaces are now the application: `/pacific.html` and `/centcom.html`. Source, datasets and the earlier trials are preserved in baseline commit `f25a7a7` on `main`.

## What changed

- Both native terrain renderers now host the same catalog selection, placement, movement, cargo and command UI. CENTCOM still draws its original water/coastal-water/coast/land/upland colors, source coastline, variable illustrative relief, and landmarks. Pacific still draws its original coastline-derived hexes, reef/lagoon distinctions and focus views. Terrain source files, tile IDs, map extents and terrain-generation algorithms were not replaced.
- Piece tokens and route overlays use each native renderer's tile positions and heights. CENTCOM's native q/r remain the displayed input coordinates; conversion to the movement policy's normalized axial coordinates stays internal. Movement categories do not overwrite source terrain classifications.
- **Menu → Pieces & orders** contains the roster, catalog, inspection and orders. **Terrain & regions** contains the original terrain controls. The map remains full width with the drawer closed. Selecting a piece displays legal destinations and a compact order bar; **Focus piece** helps target small tokens.
- The Island Coordination application and catalog's fictional test board are removed. The equipment library remains available for database download, source facts and components, with links into both playable workspaces. `/` and the retired `/scenario.html` URL redirect to Pacific.

## Browser controls

1. Open **Menu → Pieces & orders**. Choose a map using **Map**, or use the original region/focus controls under **Terrain & regions**. Each map restores its own saved exercise; selecting another map spends nothing and clears local previews.
2. Open **Add pieces**, choose Blue/United States or Red/China, search the existing catalog and select a record. **Place an instance** starts placement. Click a hex or enter its native q/r under **Hex destination & keyboard**. Review the result and confirm; invalid placement is rejected without changing the exercise.
3. Select a token or roster entry. Gold rings mark legal destinations. Click a destination or use the coordinate form to preview movement. Confirm or cancel. Map arrow keys and Q/E also select neighbors; Enter on the map confirms and Escape cancels.
4. For cargo, select an item and preview loading into a carrier. Select the carried item to preview unloading onto an eligible hex. Its identity persists, carrier movement/capacity is updated, and an unloaded item waits until next turn to move.
5. **New exercise** previews replacement of the current map only, with a year from 1980–2026 and an optional demonstration roster. New map sessions start empty in 2026. **Preview next turn** restores budgets after confirmation.
6. Accepted commands autosave. **Export save** creates a replay-verified portable JSON file. **Import save** validates it before replacement; open the matching map first. A save for another map is rejected rather than changing either map.

The existing authored movement, terrain, stacking, transport and era rules are unchanged; their detailed record is in [the original geographic runbook](geographic-scenario.md). Source capabilities are not converted into speeds, weapon effects or cargo weights. This consolidation adds no combat, detection, fog of war, opposing-player authority or accurate equipment/variant models. The later VR palette pass adds stylized 3D class miniatures, as described below.

## VR / MR controller controls

Updated on `codex/vr-miniature-palette` after the owner found the text menu too complicated in the headset. The visual direction is a calm matte palette beside the tabletop, recognizable miniature silhouettes, exact unit names and small force-colored bases. The board remains the primary workspace. Browsing, selected-unit actions and exercise settings have separate jobs.

- **Unit palette:** six miniature tiles per page. United States/China filters force eligibility; Ground/Air/Sea and role groups narrow the catalog. All shows whole units; Equipment is a separate group for parts and unmodeled records. Search uses the existing spatial keyboard and the selected domain. Tap a tile for the complete catalog name, eligibility and source evidence. Cards may wrap/ellipsize long source titles; their identity is never changed.
- **Pick up and set down:** point at a unit tile and hold the controller's **grip** (side button). A miniature appears by the controller. Carry it above the map; a translucent miniature marks the candidate hex. The feedback says whether the release is valid. **Release the grip to place**. Bring it within roughly 13 cm of the board surface; releasing high above or outside the map cancels. Picking up an existing map miniature uses the same interaction for movement. On map also offers visual selection of placed/carried instances.
- **Move the palette:** point at **Grip to move**, hold the grip, reposition it and release. This changes only its local spatial pose. **−** hides it; the remaining **Units +** tab reopens it. It stays beside the board during play and follows board repositioning; no physical anchor is required.
- **Selection feedback:** names appear on pointing/selection, the base retains Red/Blue identity, and legal destinations retain their existing gold rings. Tiles highlight under the controller ray. The ghost and release label provide feedback while a unit is held.
- **Pointer fallback:** tap a unit for details and choose Place with pointer, or select an existing map piece and point at a hex. Preview and confirm work as before. This preserves a seated path for users who cannot comfortably reach the board. Hand tracking is not implemented.
- **Cargo:** select a piece, then Cargo / load / unload. Carried items can be picked up from On map to unload through the same validated drop path. Loading remains an explicit cargo action; dropping onto a carrier does not implicitly load it.
- **Settings:** contains turn advancement, map/terrain controls, table sizing/recentering, new exercise and exit. Region switches in one workspace retain immersion and saved map progress. Opening the other workspace exits immersion before navigation.

The client treats a held piece as an uncommitted draft. A release validates the original map/revision and the current destination, then submits at most one command. Invalid drops, cancellation, controller disconnection, lost XR visibility, session end, lost connection and another participant's committed changes restore the original saved position. Board stick movement is suspended while a miniature or palette is held. Network-uncertain commits retain the existing explicit retry/idempotency behavior.

### Miniature artwork and rendering

The first set contains **18 original low-poly class miniatures**: tanks, tracked/wheeled armored vehicles, engineering vehicles, launchers, trucks, artillery, radar, ground robots, helicopters, jets, transport aircraft, drones, surface ships, flat-deck ships, landing craft, submarines and equipment crates. These are stylized class representations, **not accurate models of every named vehicle or variant**. The palette and unit details identify the class-art scope. Exact artwork remains a separate task.

Both maps show these same 3D miniatures on their original terrain heights. Catalog IDs, source names, source terrain, movement profiles and eligibility data are unchanged. Presentation grouping is independent of the movement model. Equipment components are still individual records; no implicit fitting, weapon effects or physical capacity simulation was added.

Each model merges its parts into one mesh with vertex colors. Geometry/materials are shared by class/force and the thumbnail cache is bounded to class/force combinations. The visual tile uses a render of the same miniature shown on the board. A separate thumbnail renderer is reused rather than allocating a WebGL context per catalog entry. Selected/hover labels and the held preview are local presentation.

Autosave applies in both modes. Portable file import/export remains on the browser menu. No room scan, physical anchoring or hand tracking is required.

## Run and persistence

```sh
npm run dev
# or
npm run build
npm start
```

Default host/port: `127.0.0.1:5173`. `PORT` and `DATA_DIR` can select another port and save directory. The feature verification service used `PORT=5175` and isolated `DATA_DIR=output/verification-data`; those test exercises are separate from the owner's saves.

For the local handoff on 2026-09-16, the verified feature worktree serves `http://127.0.0.1:5174` using the original repository's `data` directory. The original checkout remains available for other branch work. To restart this handoff service from the feature worktree, use `PORT=5174 DATA_DIR=/Users/fgq321/code_projects/xriegsspiel/data npm start` after building; stop any previous process using that port/save directory first.

```sh
npm run quest
QUEST_PATH=/centcom.html npm run quest
# For a service on another port:
PORT=5175 QUEST_PATH=/pacific.html npm run quest
```

`server/map-sessions.ts` creates six independent authorities using the existing replay-validating session implementation. Endpoints are `/api/maps/state`, `/api/maps/events` and `/api/maps/command`, each with a required `map` query parameter identifying an existing map. Subscribers receive only that map's state. Revisions and duplicate command IDs are scoped to a map; stale requests are rejected and exact retries apply once. Replacement setups/imports must match the session's map.

Journals are flushed before acknowledgment in `data/maps/<map-id>.jsonl`; `/` in map IDs becomes `--` in filenames. A single process may write a save directory. If the previous `data/geographic-session.jsonl` exists, it is replayed and its active exercise is imported once into the matching map's journal. Subsequent restarts replay that map's own journal. The old geographic journal and retired `data/session.jsonl` are left untouched. Other historical runs remain in the old journal; this UI does not provide an archive browser.

## Verification

- Production build and TypeScript checking passed. No dependencies were added or upgraded. The existing large-bundle warning remains; bundle size is not evidence of headset frame rate.
- **35 automated tests passed:** 30 retained terrain/catalog/geographic cases, plus five new tests covering persistence and movement on every map, independent reset, foreign-map setup/action/import rejection, exact one-time legacy migration, spatial keyboard editing and disabled/gutter/seven-row panel hit testing. Seven tests belonging only to the removed Island trial were retired with that implementation.
- Browser/controller-callback checks on the isolated production service: searched `LCM` using the spatial keyboard callbacks, selected the existing LCM-8 record, previewed and committed placement on Hormuz native hex `-6,14`; reloaded, previewed/cancelled/repeated/committed movement to `-5,14` at 4 MP; switched to Bab al-Mandeb and restored the exact Hormuz piece/revision through the controller map callback.
- On the original Western Senkaku renderer: previewed and created a seven-piece transport test setup, loaded B-01 into B-02 through the shared cargo panel, then unloaded the same B-01 onto `-17,12`. A second participant received B-01 at 0 MP and B-02 at 3 MP, revision 3. Pointer selection of a gold-ring hex produced a 2 MP movement preview; cancellation preserved the saved revision/budgets.
- Visited all four Pacific map views in the browser. The three untouched views remained empty and Western Senkaku restored its seven pieces and revision 3. CENTCOM's original relief/coastline and Pacific's token/highlight composition were visually inspected. A 390 × 844 browser check showed document dimensions 390 × 844, a reachable scrolling menu and readable action controls without horizontal overflow.
- Local handoff at port 5174: the owner's legacy Western Senkaku exercise at revision 16 migrated to its map journal at revision 1. A deep equality check confirmed the entire exercise matched, including seven instances, turn 2, budgets and history. SHA-256 checks confirmed both original journals remained byte-for-byte unchanged. The browser displayed the restored roster and connected/autosaved status; the native CENTCOM workspace also loaded successfully.

For desktop verification only, `?controller-preview=1` shows the exact drawn panel with accessible button/keyboard callbacks and explicit pickup/release controls inside the browser menu. Add `&palette-review=1` to put that preview outside the drawer for visual inspection. These diagnostics are absent from ordinary URLs. This is not WebXR emulation. `window.__playableTerrain.diagnostics` is a read-only record of the current state, selection, preview and controller panel labels; it is not a mutation API. The native terrain diagnostics remain available.

### Miniature palette verification — 2026-09-16

- Build/TypeScript checking passed; 43 automated tests passed. The eight added tests cover all catalog classifications without data mutation, finite shared miniature geometry, native drop height/radius, independent deployment/movement on every map, invalid/stale/cancelled releases, nonoverlapping six-tile panel targets, palette hide/reopen/reparent transforms, and controller grip release/cancel cleanup. The last two use Three.js with stubbed canvas drawing, not headset emulation.
- Isolated production preview on port 5175 with `DATA_DIR=output/palette-verification-data`: browsed Air → Helicopters, picked up the AH-1J record, released outside a selected hex (revision stayed 0), picked it up again and released onto Western Senkaku `-18,12` (one instance, 8 MP, revision 1), then picked up that exact instance and moved to `-17,12` (7 MP, revision 2). A second browser participant displayed the saved same ID and budget. The model, base, route rings and name were visually inspected on the original map.
- CENTCOM: searched LCM with the spatial keyboard, picked up the LCM-8 record and released onto native Hormuz hex `-6,14` (one instance, 5 MP, revision 1). No browser runtime errors were reported in that check. These verification pieces are isolated from the owner's saves.
- The existing bundle-size warning remains. No dependencies were added. Desktop rendering and geometry size do not establish sustained Quest frame rate.

**Actual headset verification remains pending.** Browser tests, controller callback tests and ray hit geometry tests do not prove Quest controller targeting, text readability, passthrough contrast or sustained performance. The owner's earlier successful immersive trial remains distinct evidence.

### Hands-on Quest checklist

1. On each workspace, enter VR seated, then MR separately if offered. Verify the original terrain appearance and readable controller panel.
2. Browse picture tiles by domain/role, change force, search an exact name, and inspect an unavailable record. Grip an eligible miniature, lower it over a hex and release. Verify the browser sees exactly one new ID on that map. Repeat placement, invalid/off-map release, controller disconnection and headset-menu interruption.
3. Grip a placed miniature and move it to a legal hex; attempt an invalid drop. Check map highlights, native coordinates, identity and budgets. Test the pointer preview/confirm fallback separately.
4. Load and unload cargo; verify exact IDs, slots, remaining points and next-turn behavior in a companion browser.
5. Switch every region/focus in the current workspace and return to verify saved pieces. Open the other major workspace, reenter immersion and repeat.
6. Grip and move the palette, hide/reopen it, then toggle labels, coastline/relief where available; move, rotate, raise/lower, resize and recenter the table. Check that tokens sit above the correct native terrain and game positions do not change.
7. Exit/reenter twice, remove/wear the headset, and reconnect USB. Check state and input recovery.
8. Run at least ten minutes with representative pieces/routes and record frame timing, readability, missed input, contrast and comfort.
