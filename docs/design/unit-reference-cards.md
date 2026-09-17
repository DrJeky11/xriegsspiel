# Real photographs and role guidance in the piece menu

**Planning record · 2026-09-16 (America/New_York).** Requested by the owner; initial plan followed by an authorized implementation record below. Inspected checkout: `16c9f19`, with existing presentation-related documentation changes preserved.

The owner wants to recognize the actual equipment before selecting it and understand what it does. Real reference images belong in the menu; existing 3D board miniatures are acceptable. The recommendation is a shared reference card for browser and Quest, starting with ships. It should add little sustained rendering cost if images replace the existing menu thumbnails, but this requires physical Quest measurement.

## What exists — observed locally

- The catalog contains **1,607 records**, including **137 sea platforms**. Zumwalt is present as `odin-008c2a5121dd0965e8cac49c96c03812`; its playable definition is `piece-008c2a5121dd0965e8cac49c96c03812`.
- [The importer](../../scripts/import-odin.py) deliberately omits image/notes fields and text over 300 characters. The current [SQLite builder](../../scripts/build-catalog-db.py) has no media or curated role-description tables. Re-running the import alone will not solve this.
- [Browser assembly](../../src/play/workspace.ts) lists five text results per page. The [Quest panel](../../src/play/panel.ts) presents six tiles with generic miniature thumbnails; selected details are currently text only. [The equipment library](../../src/catalog/main.ts) also lacks photographs.
- Pacific and CENTCOM draw the shared panel onto an existing **1024 × 1280 canvas texture**. The miniature thumbnail cache is bounded by class and force. The proposed photo cache must retain that bounded-memory principle rather than accumulate one decoded image for every catalog entry.
- Current map-assembly Zumwalt uses the authored `surface-vessel` profile: **5 movement points**, water cost **1**, and **0 cargo slots**. These are game abstractions. Assembly does not simulate its weapons, radar or stealth. AI scenarios have separate authored assets, actions and saves; catalog selection does not add a ship to an AI scenario.
- Production static serving in [server/main.ts](../../server/main.ts) lacks explicit image MIME mappings and asset cache policy. These need a small implementation update; changing development-only behavior would be insufficient.
- Installed Node is **26.0.0**, Three.js is **0.186.0**. No runtime dependency addition is proposed.

## The selection experience — proposed

Each browse tile should show a recognizable photograph, the equipment name and one short role label. The selected card should answer three questions immediately:

| Question | Card content |
| --- | --- |
| What am I selecting? | Larger photograph, complete catalog name, nationality, platform type and variant/class identification. |
| What is it for? | One plain-language sentence describing its sourced real-world role, with at most two identifying features. |
| What can it do here? | Current mode, authored movement/capacity, allowed actions and useful restriction explanations from the active rules. |

Keep the six-tile Quest layout initially. Use the trigger to inspect a larger card with **Pick up / Place**, **Back**, and optional **Sources & details** controls. Make the photo and role visible before pickup; inspecting the expanded card is optional. Preserve direct side-grip pickup from a tile, repeated placement, the movable/hideable palette, and pointer fallback. Photo loading must never gate picking up a legal piece.

Place a small existing miniature preview beside the selected photograph, labeled **Board piece**, so the player understands the photo-to-token relationship. The photo area can use a short class label, but the complete original catalog name must remain available. Do not silently rename or merge variants. Preserve stable hit targets while images arrive, readable text over a solid background, and browser image alternative text.

For a record with no reviewed photograph, show the existing miniature labeled **Reference photo unavailable**. A verified sister ship can illustrate a class if explicitly captioned as a class example. A related class or different vehicle variant must not be presented as the exact item. An unavailable photo is a coverage gap, not a reason to remove a playable record.

## Concrete Zumwalt example

**Proposed title:** Zumwalt class · Guided-missile destroyer

**Photograph:** USS Zumwalt (DDG 1000), 17 October 2016, U.S. Navy / Liz Wolter. DVIDS image **2930395**, VIRIN **161017-N-CE233-334**, is marked public domain. The caption identifies the subject and date. Use it as a dated class example, not proof of the ship's current equipment fit. [S1]

**Real-world role:** A surface warship designed for strike missions and operations against aircraft, ships and submarines. The Navy's class fact file supports these broad mission categories; its last-updated date is 5 January 2023. This is background, not certification of a 2026 weapon fit or operational readiness. [S2]

**In map assembly:** 5 movement points per turn; water movement; no cargo capacity. Move and hold through the existing rules. Weapon and sensor effects are not modeled in this mode. Generate these values from the rules rather than copying them into the editorial description.

The selected card also shows the stylized board miniature and placement eligibility for the chosen force/year. Preserve the original source name, ODIN link and unresolved historical-service status under details.

## Integration work — proposed

### 1. Add a small, reviewed reference collection

Create a versioned presentation manifest, provisionally `catalog/references.json`, keyed by existing equipment IDs. Keep original ODIN facts, playable definitions and authored rules unchanged. Each reviewed record should include:

- Plain-language role, recognition notes, source URLs and section locators, source dates, access date and review status.
- Media ID, photographed subject/hull or variant, relationship to the catalog record (`exact variant` or `class example`), photo date and any configuration caveat.
- Original source page and asset URL, creator/credit, license or public-domain evidence, required attribution, review date and checksum.
- Local thumbnail/detail paths, dimensions, byte sizes, alt text and framing information. Keep the full ship visible and avoid stretching or crops that remove identifying features.

Publish normalized copies of this metadata as additive reference/media tables through the existing SQLite builder, with foreign keys to equipment. Store image files separately under a dedicated static asset directory. The website can consume the manifest, consistent with its existing JSON-based catalog loading; it does not need a new database service. Keep the reference version independent of piece/rules versions so updating a photo does not invalidate a saved exercise.

Start with **10–12 useful sea platforms across Blue and Red**, including Zumwalt, Type 052D, Type 055, Type 072A and LCM-8 where suitable imagery can be reviewed. These names were confirmed in the current catalog. Then cover the remaining 137 sea records, prioritizing pieces used by the owner. Ground, air and individual equipment records follow using the same mechanism. Track photo and role coverage separately; do not claim the whole catalog is illustrated after the pilot.

Prefer official photographs with explicit reuse evidence. Review each asset independently, including U.S. official photographs of foreign platforms; public accessibility and an ODIN record do not establish image rights. DVIDS identifies exceptions and non-endorsement requirements. Preserve its required notice in the reference credits. [S3] Where appropriate, separately reviewed openly licensed photographs can fill gaps. Do not use generated imagery as evidence of actual equipment appearance.

### 2. Share the content across the three existing menu surfaces

Add a small shared reference lookup/image loader, then extend browser assembly, the existing Quest `TablePanel` contract/drawing code, and the equipment library. Introduce a dedicated photo/detail panel layout with matching hit geometry; the current fixed text-line layout has no space for a large photo.

Browser rows use thumbnails and reserved dimensions. Quest draws the decoded photos into the existing panel canvas. Keep the current panel resolution and mesh initially: this adds no photo-specific 3D meshes or per-ship renderers. Batch image-completion redraws and mark the panel texture dirty only when needed. Existing hover/selection updates continue; they should not restart fetches or decode work. Three.js documents canvas-backed textures and update behavior. [S4]

Load reference metadata independently of required map startup. Retrieve only the visible page's thumbnails and the selected detail image; optionally prefetch the next page after the current one is ready. Prioritize input and game traffic, limit concurrent image work, and ignore stale completions after selection/page changes. Use asynchronous image decoding with a handled failure path. [S5] An old image must never appear under a newly selected unit name.

Serve optimized, content-hashed files from the same application origin. Add correct WebP/JPEG MIME types and immutable caching only for hashed assets; keep manifests revalidatable and game APIs uncached. This removes dependence on third-party image sites during play. It does not make the whole application offline-capable: the local game server is still required and browser cache retention is not guaranteed.

### 3. Bind game help to actual rules

Keep authored role text separate from live action guidance. Before placement, show base game values and eligibility. For a placed piece, show remaining movement and currently legal actions using existing rule previews. Never infer weapon effects, cargo capacity, speed or stealth bonuses from a photograph or description.

For any later AI-scenario card integration, use the scenario's authorized observation and candidate actions. Do not assign a real class photograph to a generic scenario asset without an explicit reviewed mapping, and do not disclose an unidentified opponent's class through its image. This feature does not authorize new scenario rosters, adjudication, agent behavior or combat models.

## Expected effect on speed

**Engineering expectation, not a benchmark:** little sustained frame-rate change, a small image-transfer cost when browsing a new page, and potentially less time spent guessing what a piece represents. Static photos still incur decode, canvas drawing and GPU-upload costs; the existing menu texture does not make loading free.

Proposed initial budgets, to adjust after visual QA:

| Resource | Initial target | Meaning |
| --- | --- | --- |
| Browse thumbnail | 384 × 256; at most 40 KB | Six visible thumbnails total at most 240 KB. |
| Selected photo | 960 × 640; at most 160 KB | Six thumbnails plus one detail image total at most 400 KB, excluding metadata and request overhead. |
| Decoded photo cache | 12 thumbnails and one detail image | About 6.84 MiB of raw RGBA pixels; browser copies, overhead and GPU allocations are additional. |
| Quest panel | Existing 1024 × 1280 | About 5 MiB of base RGBA texture pixels already present, excluding mipmaps/copies. Avoid enlarging it by default. |

These compressed file budgets are goals, not measured output sizes. A full 137-ship set at both limits would occupy about **27.4 MB** on disk; it must not all download when the game starts. Loading all 1,607 thumbnail candidates at 40 KB each would mean about **64.3 MB** before detail images. Small file size also does not guarantee small decoded memory, which depends on dimensions. The byte estimates above are direct arithmetic, not device measurements.

The photo pipeline must have no place in command validation, turn resolution, autosave or multiplayer state messages. Images remain local presentation; commands still reference the existing IDs. A player who already knows the piece retains the direct pickup path. Expanded reading is optional and spends no turn resources. Better identification may reduce mistaken selections, but learning benefits and faster setup need a user trial.

The larger implementation effort is **finding and verifying correct images and concise descriptions**, particularly across variants and historical configurations. The reusable menu integration is bounded; complete catalog curation is ongoing content work.

## Verification before calling the feature complete

1. **Content:** validate IDs, source/license metadata, local file existence, dimensions/size budgets and exact/class-example labels. Manually verify each pilot photo against its caption and catalog identity. Audit role claims and date/configuration caveats.
2. **Behavior:** test stale image completions, missing/corrupt files, rapid paging and bounded cache eviction. Photo failures must preserve selection/placement. Replay the same commands with photos enabled and disabled; authoritative results must match. Verify all six saved assemblies survive map switching unchanged.
3. **Browser:** inspect Pacific, CENTCOM and the equipment library, including narrow layouts, keyboard access, alt text and production MIME/cache headers. Confirm network traces fetch only relevant images and never call external photo hosts during play.
4. **Quest:** compare the same representative board/build with photos enabled and disabled, in VR and MR separately, for at least ten minutes. Browse repeatedly, inspect details, grip/place/move, hide/reopen the palette and exit/reenter. Record actual refresh rate, frame times/dropped frames, image readiness, memory where observable, input misses and readability. Judge sustained rendering against the measured baseline; a successful desktop build is insufficient. Profile cold loads and warm-cache paging separately.
5. **Usability:** ask the owner and a few new users to identify several ships, explain their real-world role and available game actions, and place the intended piece. Compare time, wrong selections and help requests with the current menu. Provisional goal: improve recognition without adding steps to direct placement.

Run the existing `npm test` and `npm run build` during implementation alongside the targeted checks. If the photo detail causes visible Quest hitches, reduce image dimensions, cache/prefetch scope or redraw frequency and repeat the affected measurement before expanding content coverage.

## Sources and evidence limits

Accessed **2026-09-16 EDT**. Section locators below identify the material used.

- **S1 — [DVIDS: USS Zumwalt, image 2930395](https://www.dvidshub.net/image/2930395/uss-zumwalt).** Caption, Image Info and Public Domain sections. Subject/date/credit and rights designation retrieved; full-resolution acquisition, cropping and on-device legibility have not been tested. Gallery ordinal text differs between page heading and rights footer; use the stable photo ID and VIRIN.
- **S2 — [U.S. Navy: Destroyers (DDG 1000)](https://www.navy.mil/Resources/Fact-Files/Display-FactFiles/Article/2391800/destroyers-ddg-1000/).** Description, Features and last-updated date, 5 January 2023. Text retrieved through web search; direct opening returned 403. Broad role description only; dated future installation schedules are not treated as current facts.
- **S3 — [DVIDS copyright information](https://www.dvidshub.net/about/copyright).** Public Use Notice of Limitations; Intellectual Property Restrictions; Non-Endorsement Requirements and Disclaimer. Recheck the asset and applicable notice when packaging.
- **S4 — [Three.js CanvasTexture](https://threejs.org/docs/pages/CanvasTexture.html).** Description, constructor defaults and update behavior. Checked against installed Three.js 0.186.0 and the local canvas-panel implementation.
- **S5 — [MDN: HTMLImageElement.decode()](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode).** Return value, Exceptions and Avoiding empty images. Supports the asynchronous decode/failure approach; not a guarantee against all headset stalls.

**Verification performed for this plan:** inspected source/UI contracts, installed runtime versions and current catalog records/profiles; counted maritime coverage; reviewed the listed public sources; checked document links and patch formatting. No runtime changes, image asset imports, browser performance tests or physical Quest trials were performed by this planning task.

## Implementation record — 2026-09-16 EDT

The owner authorized implementation on a new branch, `codex/unit-reference-cards`. The planning sections above remain the design rationale; the following records what this implementation actually provides.

- **Shared selection cards:** browser assembly, the equipment library and both Quest controller palettes now use reviewed photographs and plain-language roles. Quest retains six tiles and direct side-grip pickup, with a dedicated expanded reference layout, board miniature, pointer placement, Back and Sources controls. Selected map pieces expose **More unit actions → Reference card**, with remaining movement, reachable-destination count and hold eligibility drawn from current rules. Browser orders retain their existing rule previews.
- **Ten reviewed sea records:** Zumwalt, LCM-8, Type 052D, Type 055, Type 072A, Type 054A, Type 052C, Type 056, Type 903 and Type 920. Photo coverage and role coverage are each **10 of 137 sea records** (1,607 catalog records overall). Type 920 supplies a support-role example in this pilot; Type 071 remains a coverage gap. All photographs are explicitly dated **class examples**. Full catalog names and distinct IDs are retained. Uncovered records and failed photos show the stylized miniature and **Reference photo unavailable**.
- **Content and rights:** [references.json](../../catalog/references.json) pins source pages, asset URLs, subject, relationship, dates, credit, licensing, review, source-download checksum and derivative sizes/checksums. Recognition notes are observations of the dated photograph; role sources are independently listed. [Image credits](../../public/unit-references/README.md) preserve attribution and the DVIDS notice. Type 072A and Type 056 derivatives retain CC BY-SA 4.0. Other images are public domain in the United States or CC BY 4.0. Complete source frames are retained and padded; no equipment details were generated. Source-host resized files were used for Huizhou and LCM-8 when full-resolution downloads were rate limited; their actual downloaded URLs and checksums are recorded.
- **Storage and serving:** the catalog SQLite builder adds `unit_reference`, `reference_source`, `reference_media` and `reference_asset` tables. Existing rules, definitions, IDs and saved-state versions are unchanged. Content-hashed WebP assets are served locally with `image/webp` and immutable caching. JSON manifests revalidate; command/state APIs remain uncached. No application dependencies were added.
- **Loading:** reference metadata is optional and independent of required map startup. Only current browse/selection requests are decoded, at most two at once, with a retained cache capped at twelve thumbnails and one detail image. There is no full-catalog prefetch. Superseded completions are discarded; decode/fetch failures and timeouts preserve input. Image completion batches update image slots and the existing panel canvas without rebuilding browser selection controls. Browser-managed copies and in-flight decodes remain additional memory, as anticipated in the original budget.
- **Measured asset sizes:** all twenty derivatives total **1,004,492 bytes**. The largest thumbnail is **24,054 bytes** and the largest detail image is **155,320 bytes**, under the proposed 40,000/160,000-byte limits. Dimensions remain 384 × 256 and 960 × 640. The Quest canvas remains 1024 × 1280. These are disk/transfer and dimension checks, not headset memory or frame-time measurements.

### Verification performed

- `npm run build` passed typechecking and production compilation. The existing large-chunk warning remains.
- `npm test` passed **124 tests**, including new delayed-completion, failed-image, concurrency/cache-limit and reference-panel target checks. The first sandboxed run could not bind ports for two HTTP tests; rerunning with local port access passed the complete suite.
- `python3 scripts/verify-catalog.py` and `python3 scripts/verify-references.py` passed IDs, canonical hashes, image existence/decoding/dimensions/bytes, content metadata, database counts, foreign keys and integrity checks. All ten photographs were visually inspected against their recorded subjects/captions. Broad role statements were checked against the linked source sections, including the actual **29 August 2001** MCRP 3-31B edition, p. 26; the 2015 ONI report, pp. 10 and 15–18; and the 2020 China Maritime Report 5 summary. These sources do not establish 2026 equipment fit or readiness.
- Isolated production browser at port **5176**, using `output/reference-card-verification`: Pacific and CENTCOM cards, equipment library, keyboard activation and 390 × 844 layouts checked without horizontal overflow. The Quest canvas was inspected through controller-preview diagnostics. A direct grip callback from the LCM-8 detail card committed one piece at Pacific `0,0`; a deliberately corrupt photo still allowed pointer placement of one LCM-8 at Hormuz `-6,14`. Each reached revision 1 with 5 MP.
- Delayed Zumwalt completion after switching to LCM-8 did not replace the selected photo. Five pages forward/back remained usable. All six exercises were equal before and after map switching. Reloading with `reference-photos=off` retained the exact exercise and made **zero photo requests**. Image requests stayed on the application origin. Production responses verified WebP MIME, immutable hashed-image caching, manifest `no-cache` and API `no-store`.
- QA screenshots and scripts are under ignored `output/playwright/`. The owner's live save directory was not used for feature verification. Existing unrelated work in the shared checkout was preserved.

### Remaining verification and expansion

Physical Quest VR/MR testing, sustained frame-time/memory comparison and human recognition trials remain pending. Run the ten-minute checklist above with `reference-photos=off` and normal loading on otherwise matching URLs/builds. Desktop controller callbacks are not physical controller or headset evidence. The cache counters are available under `window.__playableTerrain.diagnostics.referencePhotos`; they do not measure total browser/GPU memory.

To reproduce derivatives, use `python3 scripts/build-reference-images.py --download` (Pillow 12.2 was already installed; Python 3.14.6), then `python3 scripts/build-catalog-db.py` and `python3 scripts/verify-references.py`. Downloads must match their pinned checksums; a changed source requires a new content review. Ground, air and remaining maritime coverage are still to be curated. AI scenario assets remain unmapped and their rules/rosters are not changed by this feature.
