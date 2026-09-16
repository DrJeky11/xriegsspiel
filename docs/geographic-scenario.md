# Integrated geographic tabletop

**Historical record:** this standalone UI was retired on 2026-09-16. Use the original Pacific/CENTCOM workspaces; see [current controls and verification](playable-terrain.md). Source is preserved in Git baseline `f25a7a7`.
Implemented **2026-09-16 UTC / 2026-09-15–16 America/New_York**. This is the first catalog + geographic scenario slice. It supports assembly, movement, transport and persistence. Combat, detection, fog of war, opposing-player permissions, referee contests and AI remain outside this milestone.

## Open

Run `npm run dev`, then open [Geographic tabletop](http://127.0.0.1:5173/scenario.html). For production, `npm run build` then `npm start`. During this implementation another service occupied 5173, so verification used **`PORT=5174`** and [this running scenario](http://127.0.0.1:5174/scenario.html).

The original Island Coordination exercise, catalog laboratory, Pacific and CENTCOM terrain workspaces retain their entry points. The geographic workspace has its own command endpoints and journal. Its source import never edits the equipment catalog.

## What to do

1. The Western Senkaku focus opens at **2026**, with seven authored demonstration pieces. The initial view focuses the LCM-8; **Fit map** returns to the whole area. Choose **Map & year / New exercise** to choose any of the six existing views, a year from 1980–2026, and an empty or demonstration roster. Preview and confirm the setup. Demonstration entries without eligible dates or suitable terrain are omitted; the preview reports the actual count.
2. Select **Add pieces**. Search all 1,607 records; assign Red/China or Blue/United States. Eligible-only is the default; **All records** retains origin-only, future and unknown-date entries for inspection. Eligibility uses ODIN operator-filter membership, not national origin. Exact historical service is not certified.
3. Select a catalog entry and **Place an instance**. Pick a tile, or enter q/r under **Hex destination & keyboard**, then confirm. Repeat for additional instances. Rejected terrain and occupied layers explain why; they do not change state. This slice caps an exercise at 200 pieces. Assembly remains available during play and placements start with fresh movement budgets; this is not a competitive force-allocation rule.
4. Select a token or roster entry. Gold rings mark legal destinations. Pick a hex to preview the route, point cost and remaining movement; **Confirm order** commits, **Cancel** or Escape spends nothing. The route's projected length is separate from movement points. Select **Focus piece** for detail; **Fit map**, top view, zoom and place labels adjust only the view.
5. To transport a piece, select it, choose a carrier and preview loading. To unload, select the carried piece in the roster or carrier's manifest, then pick a legal destination. IDs survive every transfer. Cargo count appears on the carrier; carried pieces have no independent map token.
6. Accepted orders autosave. Reload reconnects to the same exercise. **Export save** downloads a replay-verified JSON file. **Import save** replays and compares it before offering a replacement preview; confirm to restore. Export before starting another run if you want a portable copy. Old runs remain in the append-only server journal; the UI does not browse that archive.

Shared control and complete information are deliberate. Both force colors are usable by every connected browser/headset; they do not grant opposing-player authority.

## Authored rules and defaults

Versions: scenario `geographic-tabletop/0.1.0`, movement policy `geographic-movement/0.1.0`, existing profile rules `piece-lab/0.1.0`. Catalog and equipment versions come from their manifests. One instance represents one platform or one loose equipment item; it is not an inferred formation.

A **turn is an untimed planning opportunity**, with immediate committed actions and a manual next-turn budget refresh. It has no fixed minutes or hours. Reusing these abstract budgets on different map scales is an interaction experiment, not a speed model. No ODIN speed, range, cargo weight, sensor or weapon figure is converted into a game value.

Hexes have up to six edge-sharing neighbors. Axial distance is `(|Δq| + |Δr| + |Δq + Δr|) / 2`. Route cost sums each entered hex's policy cost. Projected route length is the number of edges times map center spacing: 0.75 km for Western Senkaku, 18 km for Pacific overviews, 5 km for Hormuz and 3 km for Bab al-Mandeb. These local projections are not exact global/geodesic distances. Their grids are independent; selecting another map starts another exercise rather than remapping positions.

| Profile / layer | Budget per turn | Geographic policy |
| --- | --- | --- |
| Tracked ground / surface | 4 | Land/coast; 1 per step |
| Wheeled / surface | 6 | Land/coast; 2 per step |
| Ground system / surface | 3 | Land/coast; 2 per step |
| Amphibious tracked / surface | 4 | Ground as above; water or coast-to-coast transit costs 3 |
| Amphibious wheeled / surface | 6 | Ground as above; water or coast-to-coast transit costs 3 |
| Truck / surface | 6 | Land/coast at 2; 8 cargo slots |
| Ground robot / surface | 3 | Land/coast at 1 |
| Towed / surface | 0 | Land/coast placement; requires transport |
| Rotary-wing / air | 8 | Any hex at 1; no cargo capacity in this profile |
| Air transport / air | 8 | Any hex at 1; 8 cargo slots |
| Fixed-wing/UAV / air | 12 | Any hex at 1 |
| Surface vessel / surface | 5 | Ocean at 1 |
| Sea transport / surface | 5 | Ocean at 1; 12 cargo slots |
| Landing craft / surface | 5 | Ocean at 1; mixed coast at 2; 12 cargo slots |
| Submarine / subsurface | 4 | Ocean at 1 |
| Equipment / inventory | 0 | Land/coast placement; requires transport |

**Coast, islands and reefs:** ordinary ground movement between two mixed coastal hexes is blocked. Their feature presence does not establish a continuous land bridge. Land-to-land and land-to-coast connections are explicitly allowed abstractions; no road, beach suitability or sub-hex path is inferred. An amphibious profile may pay 3 points for coast-to-coast or open-water travel; this does not certify its sea-state suitability. Landing craft may occupy mixed coast but not inland land. Other ships/submarines use ocean only. Reef intersection flags, reef terrain and lagoon terrain exclude all non-air occupation/transit; air can overfly. Ground/air entry does not imply basing or trafficability.

CENTCOM's `coastal-water` is adapted to ocean and its illustrative `upland` to land; neither label supplies depth or measured slope. Its axial coordinates are normalized for the shared renderer by `(q,r) → (q+r,-r)` while original tile IDs, centers and adjacency remain intact. Pacific's original south-r coordinates remain unchanged. Mixed coast remains mixed. Elevation and depth are always **unknown/null**. Symbolic tile height is solely presentation.

**Stacking:** one independently deployed platform per surface, air or subsurface layer in each hex, regardless of force. Ground and ships share the surface layer. Aircraft and submarines can occupy separate layers at the same map position. Inventory items can share eligible land/coast hexes. Occupied layers block both route transit and endpoints. Small display offsets fan symbols out; they do not change tile IDs.

**Transport:** same force, same or adjacent hex, carrier capacity and one carrier movement point are required. Aircraft and vessels are not cargo; ordinary carriers accept equipment/towed pieces, maritime transports also accept ground platforms. Cargo-carrying platforms cannot themselves be loaded; nested cargo is excluded. A maritime exchange requires the item on a coast hex beside the carrier, or on its own coastal hex. Air transport exchanges only at the same land/coast hex. Ground exchanges require land/coast on both ends and cannot bridge two separate mixed coast hexes. Unloading requires a legal free layer, costs the carrier one point, and leaves the item at zero movement until next turn. These slots test identity/capacity bookkeeping, **not actual dimensions, weight, mounting or beach fit**. In particular, loading an M1A2 into the demo LCM-8 is an authored slot exercise, not a claim of real compatibility.

## Demonstration evidence review

The seven instances are authored staging around Uotsuri/Diaoyu: Blue M1A2, LCM-8, UH-60L and one M2 item; Red Type 96, Type 072A and Z-9. Their positions imply neither deployments nor sovereignty. The selection panel separates **authored game values**, **ODIN source facts**, and **variant review**.

The machine-readable [variant review](../src/scenario/variant-review.json) pins the seven exact definition IDs, export membership, access date **2026-09-16**, sources and locators. It preserves these findings:

- **M1A2:** ODIN 1992 aligns with a production milestone. ARMOR's May–June 1993 article identifies the first production vehicle in December 1992 and discusses future fielding. It does not establish universal US service in 1992. SEP variants remain separate. [Army ARMOR, printed p. 16](https://www.benning.army.mil/Armor/eARMOR/content/issues/1993/MAY_JUN/ArmorMayJune1993web.pdf).
- **UH-60L:** ODIN's 1979 date describes family/A-model history; the Army dates L-model production to 1989. The geographic eligibility rule rejects the L variant before 1989 while retaining the raw catalog date. This is a reviewed lower-bound correction, not a full service interval. [Army history, “UH-60 Black Hawk Helicopter”](https://www.army.mil/article-amp/86839/amc_developed_weapons_remain_vital_to_army).
- **LCM-8:** ODIN says 1959; Navy ACU TWO history says the shift to LCM-8 began in 1957 and describes organizational changes in 1959. US operation is supported; the introduction milestone is ambiguous. Both dates predate this exercise's earliest year. [ACU TWO history, Boat Unit TWO paragraphs](https://www.surflant.usff.navy.mil/Organization/Supporting-Commands/Commander-Naval-Beach-Group-Two/Commander-Assault-Craft-Unit-TWO/About-Us/History/).
- **Type 96:** ODIN reports 1997. PRC defense-ministry material describes its appearance in the 1999 parade, which corroborates that appearance, not first service in 1997 or every listed component. [Parade retrospective, Type 96 / Type 99 paragraph](https://www.mod.gov.cn/gfbw/tp_214132/jskj/4827567_4.html).
- **Type 072A, Z-9 and M2:** reviewed the pinned operator/introduction assertions and relevant raw fields. Type 072A's “2003–Present” lacks a verified end; class aliases remain provisional. Z-9/WZ-9 combines variant-dependent information and lacks an independently established exact military introduction interval. M2 is a broad family record with misleading/component-level fields. No independent exact service/retirement interval was established for these entries. See the exact ODIN URLs and export locators in the linked variant review.

Continued service, retirement, loads and classification remain provisional across the broader catalog. The current source vintage does not become a historical map vintage when the scenario year changes. The terrain is the pinned cartographic snapshot, with no reconstruction of historical coastline changes.

## Architecture and persistence

| Boundary | Implementation |
| --- | --- |
| Shared routes, movement, loading and transfer accounting | `src/pieces.ts`; optional `BoardPolicy` provides topology, terrain eligibility, costs and exchange restrictions |
| Geographic adaptation, manifests, setup, deterministic replay | `src/scenario/maps.ts`, `rules.ts` |
| Browser setup, local previews, inspection and command submission | `src/scenario/main.ts`, `style.css`, `scenario.html` |
| Reused instanced terrain, original silhouettes, overlays and controller panel | `src/pacific/terrain-table.ts`; additions are opt-in for the scenario workspace |
| Independent authority and durable journal | `server/scenario-session.ts`, routes in `server/main.ts` |

No renderer duplicates adjudication. Geographic state stores **stable tile IDs**, never mesh indices or room coordinates. An internal adapter translates to the existing pure evaluator's numeric cell interface. Transform/zoom operations touch only Three.js view objects. Quest and browser call the same preview and command functions.

`/api/scenario/state`, `/api/scenario/events` (SSE), and `/api/scenario/command` are separate from the original exercise endpoints. A command carries a unique ID and expected service revision; stale requests are rejected, exact retries apply once. A flushed append to **`data/geographic-session.jsonl`** occurs before acknowledgment. Only one writer per journal is supported. **`data/session.jsonl`** continues to belong to Island Coordination.

Portable schema `xriegsspiel-geographic-save/1` includes year, map/version/geography/source hashes, catalog/equipment/profile/scenario/rules versions, initial setup choice, every instance ID/definition/force, position or carrier, remaining movement, turn, and committed placement/action history with explanations. Import starts from the empty pinned setup, re-evaluates every recorded event, and compares the entire resulting exercise, including explanations and cargo. Mismatched versions, invented positions/budgets/cargo or inconsistent history are rejected without modifying active state. Export also verifies replay. Files over 8 MB and histories over 20,000 events are outside the portable import bounds.

Service restart replays **every command** (including new-run/import replacements), checking snapshots and restoring duplicate protection. A corrupt or incompatible journal fails visibly; preserve it for recovery rather than silently resetting. Old run replacement snapshots remain in the append-only file. Journal rotation, checkpoint acceleration and an archive browser are later work. Exercise event revision counts placements/actions within the current run; service revision monotonically counts accepted commands across runs and imports. They intentionally differ.

## Browser and Quest controls

Browser: pointer selects tokens/tiles; roster and inspector are keyboard reachable. With the map focused, arrows plus Q/E traverse six neighbors and preview; Enter confirms, Escape cancels. The coordinate form supplies an alternative to tiny tile targeting. Middle-drag pans, right-drag rotates, wheel/+/- zoom, **Focus piece**, **Fit map**, top view and labels adjust presentation.

Quest: trigger selects tokens/tiles, including previews. The spatial panel provides confirm/cancel, cycle roster, hold, next turn, source-review notes, cargo choices (paged), table controls and new-exercise setup (cycle map, adjust year, toggle demo, preview). Full catalog search and file import/export use the browser companion; seated controller selection, inspection, movement and cargo actions work through the same functions. Left stick moves the table; right stick changes height/rotation; panel buttons scale/recenter and exit. VR and optional MR entry require WebXR support. No hand tracking, room scans or physical anchoring is required.

Launch the scenario on an authorized USB Quest, leaving the cable attached:

```sh
QUEST_PATH=/scenario.html npm run quest
# If using the implementation verification service:
PORT=5174 QUEST_PATH=/scenario.html npm run quest
```

## Verification record

Automated verification on this implementation: **37 tests passed** (the 27 existing tests plus 10 geographic cases), `npm run typecheck` passed through the production build, and `npm run build` passed. There is no separate lint script. No dependencies were installed or upgraded. Build retains the existing >500 kB shared Three.js warning; it is not headset performance evidence.

New tests cover default roster/era evidence, six-neighbor routes and budget exhaustion, coastal/island rules, air/sea/subsurface/ground stacking, cargo conservation and capacity, force/nesting/air-exchange restrictions, all six map identities/topologies, forged/version-incompatible save rejection, and durable command replay/restart/new/import with stale/duplicate protection.

Browser checks on port 5174 covered:

- Actual pointer/keyboard controls for preview, cancel, commit; preview/cancel preserve state; invalid ground-water orders disable confirmation with a reason.
- Loading an identified M1A2 into the LCM-8, carried state, reload equivalence, unloading at zero movement, and synchronization with a second browser client.
- Empty setup, map/year preview cancellation, catalog search, two separately identified Blue instances and a Red instance, invalid ocean placement and occupied-layer rejection.
- An incompatible-version save showed its rejection in the production browser, disabled confirmation and left state unchanged.
- Actual JSON download/import; independently replayed the downloaded save in Node and compared it to the restored server exercise exactly (service revision 9 at that check).
- Hormuz map switch, 1985 UH-60L rejection with the 1989 review explanation, source review expansion, fresh 2026 demonstration reset.
- Zoom/fit/top/label actions leave the authoritative state unchanged. Desktop 1440 × 1000 and mobile 390 × 844 were visually inspected; mobile width equaled document width. Fixed the hidden file input styling and mobile commit-bar placement after visual inspection.

Production handoff: stopped the test development server and started `PORT=5174 npm start`. The service replayed the journal and the browser recovered revision 11. Verified a pointer-selected ship move and next-turn commitment, then restored a fresh seven-piece demo at service revision 14. Reopened the original exercise (selected a team without submitting), catalog search, Pacific keyboard selection and CENTCOM rendering. The original `data/session.jsonl` hash stayed `e5fbd4babd535ceb8ce0d437cbbaf74ba8834f4fca90e42cee98bce12552f1d1`. No scenario page runtime exceptions occurred in that pass; expected SSE reconnect errors occurred during the intentional server restart.

Artifacts are in gitignored `output/playwright/scenario-*.png` and `geographic-roundtrip.json`. Read-only diagnostics at `window.__geographicScenario.diagnostics` expose current state, selection/preview and rendering/XR counters; they are not a mutation API.

**Device evidence:** authorized Quest 3 was detected; USB forwarding and browser launch for `http://localhost:5174/scenario.html` succeeded. The device reported `mWakefulness=Asleep`. Automatic approval review rejected opening the remote-debugging interface because it could expose authenticated tabs outside the requested scenario. No remote-debugging workaround was used. Page rendering, immersion, controller use and sustained timing on the actual headset remain **pending**; a launch command is not a headset usability test.

### Exact remaining hands-on checklist

1. Wear the connected Quest; open the forwarded URL. Record OS/browser versions and verify the current 2026 Western Senkaku exercise loads with seven pieces and an available Enter VR button.
2. Enter VR seated. Verify panel text, original ship/aircraft/ground/equipment symbols, Blue rectangle/Red diamond identifiers and cargo markers. Cycle every piece using the panel to check overlapping layers remain inspectable.
3. Select B-02 with a ray, identify gold-ring legal hexes, preview an ocean destination, read its cost, cancel and verify unchanged budget. Repeat and confirm; a companion browser must show the same ID, tile, budget and service revision.
4. Select ground B-01 and try water; read rejection and verify no commitment. Preview a legal land/coast destination where available. Test R-06 ocean-only restrictions and an air piece crossing terrain.
5. In **Cargo**, load B-01 into B-02; verify carrier slots and carried identity. Select the carried piece, preview/cancel/repeat an unload, commit, and verify zero movement until next turn. Attempt a disallowed cargo choice and read its reason.
6. Move, raise/lower, rotate, resize and recenter the table while seated. Verify game positions/MP do not change and panel controls remain reachable. Record any text-size or ray-target difficulties.
7. Preview/cancel a new exercise, then test map/year/demo setup in the panel. Verify the browser observes a confirmed replacement and can restore an exported exercise.
8. Exit/reenter twice; remove/wear the headset and reconnect USB. Confirm state preservation and controller recovery. Test MR separately if offered and assess real-room contrast.
9. Run at least ten minutes with representative selections/routes; record XR frame deltas/session counts, missed input, comfort and any measured CPU/GPU timing. Desktop timing cannot establish Quest performance.

Remaining model limitations: unknown navigation/trafficability, historical service and variant data; abstract budgets, arbitrary year/map-scale pairing and slot compatibility; no real deployments, simulation of combat/detection/AI, competing player authority, or validated educational outcomes. These limits are intentional and visible in the interface.
