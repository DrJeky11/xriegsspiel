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

The existing authored movement, terrain, stacking, transport and era rules are unchanged; their detailed record is in [the original geographic runbook](geographic-scenario.md). Source capabilities are not converted into speeds, weapon effects or cargo weights. This consolidation adds no combat, detection, fog of war, opposing-player authority or 3D equipment models.

## VR / MR controller controls

The same controller panel is drawn and hit-tested in both original renderers. Trigger selects pieces, tiles and panel buttons. All placement and movement commits use the same evaluator and server commands as browser controls.

- **Add pieces:** browse catalog results; **Search & filters** changes Red/Blue, eligible/all records and the search query. The spatial keyboard supports letters, digits, hyphen, spaces, backspace and clear. Select a result, inspect its eligibility, choose **Place this piece**, point at a map hex, then confirm or cancel the preview.
- **Select next piece:** cycles all placed and carried instances, so overlapping layers and cargo remain selectable.
- **Cargo / load / unload:** provides paged transfer choices. A carried item previews unloading by selecting a hex.
- **Actions & next turn:** hold, next turn, evidence and clear selection.
- **Maps & terrain:** switches regions/focus views in the current workspace while keeping the immersive session and each map's saved state. Terrain controls toggle labels and, for CENTCOM, source coastline and illustrative relief. Opening the other major workspace exits immersion and navigates to it; enter VR/MR again there.
- **Table & exercise:** resize/recenter, set up a new exercise for this map, and exit immersion. Left stick moves the table; right stick adjusts height/rotation.

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

For desktop verification only, `?controller-preview=1` shows a textual mirror of the exact controller panel buttons/keyboard callbacks inside the menu. This is not WebXR emulation. `window.__playableTerrain.diagnostics` is a read-only record of the current state, selection, preview and controller panel labels; it is not a mutation API. The native terrain diagnostics remain available.

**Actual headset verification remains pending.** Browser tests, controller callback tests and ray hit geometry tests do not prove Quest controller targeting, text readability, passthrough contrast or sustained performance. The owner's earlier successful immersive trial remains distinct evidence.

### Hands-on Quest checklist

1. On each workspace, enter VR seated, then MR separately if offered. Verify the original terrain appearance and readable controller panel.
2. Search for a unit with the spatial keyboard, change force, inspect an unavailable record, then place an eligible instance using the ray, preview and confirm. Verify the browser sees the same ID and map.
3. Select the piece with a ray and with the roster cycle. Preview/cancel/repeat a legal move; attempt an invalid one. Check map highlights, native coordinates and budgets.
4. Load and unload cargo; verify exact IDs, slots, remaining points and next-turn behavior in a companion browser.
5. Switch every region/focus in the current workspace and return to verify saved pieces. Open the other major workspace, reenter immersion and repeat.
6. Toggle labels, coastline/relief where available; move, rotate, raise/lower, resize and recenter the table. Check that tokens sit above the correct native terrain and game positions do not change.
7. Exit/reenter twice, remove/wear the headset, and reconnect USB. Check state and input recovery.
8. Run at least ten minutes with representative pieces/routes and record frame timing, readability, missed input, contrast and comfort.
