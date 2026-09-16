# Unit catalog and sources for an original wargame

**Implementation follow-up, 2026-09-15:** the owner subsequently requested Chinese Red and US Blue equipment from 1980 onward. The [catalog guide](../../catalog/README.md) records the resulting 1,607-record ODIN import, SQLite database, component references and playable laboratory. Statements below that no bulk export or playable catalog had been obtained describe the earlier research stage.

**Researched: 2026-09-15. Status: source review and proposed roster, not an implemented unit database or approved scenario.** Read with the [requirements](../product-requirements.md), [CPE study](command-professional-edition.md), and [simulation blueprint](../design/simulation-blueprint.md).

## Geographic demonstration follow-up — 2026-09-16

The first [integrated geographic scenario](../geographic-scenario.md) now connects the existing catalog to hex maps. Its [seven-variant evidence review](../../src/scenario/variant-review.json) preserves operator/date ambiguities and source locators. It separates M1A2 production from fielding, corrects the geographic UH-60L lower bound to 1989 without changing ODIN’s raw 1979 field, and records unresolved LCM-8, Type 96, Type 072A, Z-9 and M2 service/variant questions. Original movement points and cargo slots remain independent of source performance fields.

## Answer

**Yes: the Command manuals contain unit examples and descriptions of how units work. They do not provide a complete, independently reusable equipment database.** The CPE v2.4 supplement points to the base Command: Modern Operations (CMO) manual on p. 7 and to a separate database-editor manual on p. 100. The publisher lists that database manual among installation materials; it was not obtained. [W31](sources.md#w31), [W40](sources.md#w40)

We also have a useful independent route: the Army's public **Worldwide Equipment Guide (WEG)**, equipment passages in the two supplied tactics PDFs, and service equipment fact sheets. Use these for reference facts; author and validate our own movement, observation, resource, and adjudication rules.

## 1. What is actually in the Command manuals

Page numbers here are one-based PDF pages; the inspected CMO printed page numbers agree. W31 is the 181-page CPE v2.4 supplement dated 13 October 2024. W32 is the 425-page base manual with February 2023 file metadata, not a verified software-build identifier.

| Question | Relevant material | What it gives us |
| --- | --- | --- |
| What is a unit? | CMO §2.1, pp. 20–23 | Platforms, groups, hosted units, sensors, mounts, and magazines. |
| Which named units appear? | CMO §§10.4–10.5, pp. 342–345 | Short air/naval examples; see below. |
| How do they move? | CMO §§3.3.3–3.3.5, pp. 40–44 | Waypoints, throttle, altitude/depth, and formations. |
| What state do they maintain? | CMO §4.5, pp. 85–92 | Mission, loadout, fuel, speed, damage, sensors, policy, and contacts. |
| Where are detailed equipment values? | CMO §§6.3.4–6.3.5, pp. 169–173; §8.1, pp. 266–267 | Database viewer and scenario/database version linkage. |
| How are forces tasked and transported? | CMO §§7.1–7.2, especially pp. 232–236; CPE pp. 137–158 | Missions, cargo, and planning. |
| How are effects resolved? | CMO §§9.1–9.2; land pp. 307–308; damage p. 310 | Descriptions of models and constraints, not a complete model implementation. |

Sources: [W31](sources.md#w31), [W32](sources.md#w32). These are documentation observations, not tests of CPE software.

### Named examples that could inform our catalog

The base manual's appendices explicitly introduce these examples:

| Role | Examples named in the manual | Locator |
| --- | --- | --- |
| Multirole aviation | F-16, F/A-18, Rafale, Gripen | CMO pp. 343–344 |
| Air superiority/interception | F-15A/C, Su-27, F-14 | CMO pp. 342–343 |
| Ground-support aviation | A-10, Su-25 | CMO p. 343 |
| Airborne warning/control | E-3, A-50 | CMO pp. 343–344 |
| Aircraft carriers | Nimitz, Kuznetsov | CMO pp. 344–345 |
| Surface combatants | Arleigh Burke, Perry, Ticonderoga, Udaloy | CMO p. 345 |

These are introductory examples spanning historical periods, not a current order of battle or a recommended force package. Exact variant, year, equipment fit, and readiness still matter. Read the [base PDF starting at p. 342](https://cdn.akamai.steamstatic.com/steam/apps/1076160/manuals/CMO_manual_EBOOK.pdf#page=342). [W32](sources.md#w32)

**Version distinction:** the online Appendices page currently uses chapter 11 and contains keyboard, overlay, and database-editing sections; the retrieved page does not contain these common-unit lists. Use the pinned PDF for the named examples. [W45](sources.md#w45)

### Movement and behavior we can learn from

**Documented controls:** movement follows a course; speed and altitude/depth can change at waypoints. Mission settings can provide defaults, with direct overrides. Terrain and slope affect ground travel. Formation membership also affects how units move together. [W44](sources.md#w44), §§3.1–3.3; CMO pp. 40–44.

**Documented information structure:** detailed platform, weapon, and sensor entries belong to the database viewer. Aircraft loadout and crew/system characteristics can affect modeled behavior. A class name alone does not define a unit's capabilities. [W44](sources.md#w44), Drop-Down Menus §§6.3.4–6.3.5.

**Documented task structure:** ferry, support, patrol, strike, and cargo are different missions. Cargo compatibility and handling matter; generic cargo inventory does not automatically have a modeled operational effect. [W33](sources.md#w33), §§7.2.1–7.2.8.

### Limits that matter for our design

- **Equipment data:** the reviewed manuals contain examples and some values, but do not enumerate the full professional database or give us its data files. The separate DB-editor manual is a documented reference, not a missing license we need to acquire.
- **Ground fidelity:** the dated base manual's §9.2.5 explicitly describes its land-combat model as basic. This is a limitation stated by that edition, not a claim that every 2026 build behaves identically. Later ground-model work is discussed in the [CPE study](command-professional-edition.md#changes-since-the-mcu-manual).
- **Fuel:** CMO p. 90 exempts facilities and land units from its described fuel consumption. Our proposed ground logistics rules must be explicit original choices; do not claim they reproduce that manual.
- **Reuse:** no license to redistribute Command's database, artwork, scenarios, or software was established. We can build original unit definitions informed by public facts and documented concepts.

## 2. Where to obtain independent unit information

| Source | Useful information | Verified access and limits |
| --- | --- | --- |
| Army ODIN / Worldwide Equipment Guide | Named equipment, variants, mobility, dimensions, components, and other characteristics | Public catalog and a LAV-25 detail entry opened in the browser. WEG describes its purpose as training/education. An API or bulk-data entitlement was not established. [W46](sources.md#w46), [W47](sources.md#w47) |
| Supplied **Chinese Tactics**, ATP 7-100.3 | Organization and roles; maneuver equipment in appendix A; contents identify other capability appendices | Read A-1–A-4, PDF 203–206: includes Type 96/99 tanks, ZBD-04/05 and ZBL-08 infantry fighting vehicles, and personnel carriers. A dated 2021 U.S. Army account, not verified 2026 Chinese force data. [D01](sources.md#d01) |
| Supplied **Russian Tactics**, ATP 7-100.1 | Support organization and equipment | Appendix H, H-1–H-3, PDF 245–247; table H-1 lists logistics trucks with speed, range, and cargo. The source itself directs readers to WEG for more detail. A dated 2024 description, not a current deployment database. [D02](sources.md#d02) |
| U.S. Navy LCAC fact file | Ship-to-shore transport role, speed, payload, and dimensions | Description, Features, and General Characteristics read; page updated 14 October 2021. Keep legacy LCAC distinct from the newer Ship to Shore Connector. [W48](sources.md#w48) |
| NAVAIR MV-22B page | Tiltrotor transport role, flight modes, and specifications | Mission, Description, Specifications read; page updated February 2023. It does not supply a complete mission-performance model. [W49](sources.md#w49) |
| Previously reviewed game manuals | Actual game movement costs, action eligibility, phases, supply, and resolution concepts | [Company Commander, Littoral Commander, Division Commander, and Flashpoint](manual-review.md) are useful references. Their different editions and rules cannot be combined into one implied standard. |

The two tactics PDFs are descriptive training sources. Their organization diagrams can inform a formation's composition; equipment facts do not by themselves supply formation movement rates or combat odds. No scenario nationality is selected by this review.

### Three verified examples of obtainable movement/capacity data

These are **reported reference values**, not XRiegsspiel rules or independently tested performance:

| Equipment | Reference values | Provenance and interpretation |
| --- | --- | --- |
| LAV-25 reconnaissance vehicle | Maximum land speed **100 km/h**; maximum water speed **9.66 km/h**; range **668 km** | WEG entry, Automotive tab; displayed modification date 03/05/2025. The source title includes “Canadian”; operator and exact variant must be selected separately for a scenario. Separate land and water travel modes. [W47](sources.md#w47) |
| URAL 4320-31 cargo truck | Maximum speed **85 km/h**; approximate range **1,000 km**; cargo **6,500 kg** | ATP 7-100.1, table H-1, printed H-3 / PDF 247; columns visually checked. This is equipment-level capacity, not an entire logistics unit's capacity. [D02](sources.md#d02) |
| Legacy LCAC | **40+ knots with full load**; **60-ton normal / 75-ton overload payload** as labeled by the source | Navy fact file, General Characteristics. The page also provides roughly 54.43/68.04 metric equivalents. Preserve normal/overload distinctions; do not treat overload as routine. [W48](sources.md#w48) |

The WEG detail has separate system, automotive, protection, weapon, and image-source sections. This shows a viable equipment-research workflow; only the description, variants, and automotive section were read for the sample. The three examples above are not a validated joint-force package.

## 3. Proposed unit families for XRiegsspiel

**Recommendation:** start with a small fictional operational roster organized around movement, information, transport, and sustainment. Use formation/detachment pieces with explicit composition; a piece must say whether it represents one vehicle, several vehicles, or a formation. Do not make a battalion inherit one vehicle's maximum speed or cargo capacity.

The following are **original candidate behaviors**, not extracted CPE rules. Sources in the last column supply reference concepts or equipment examples, not approval of the proposed abstractions. All numeric game costs and outcomes remain to be authored.

### First roster to develop

| Candidate | What it represents and does | Proposed movement and actions | State that matters | Reference starting point |
| --- | --- | --- | --- | --- |
| Ground maneuver detachment | Personnel assigned to occupy, hold, and move between locations | Foot routes; embark/disembark using another unit; move, observe, hold, bounded engagement | Strength, readiness, supply, carrier identity | D01 appendix A; [manual behavior examples](manual-review.md) |
| Reconnaissance detachment | A force that collects and reports information | Wheeled or foot profile selected by scenario; move and observe with explicit time costs | Observation capability, report age, mobility, fuel if modeled | W47 LAV-25; D01 reconnaissance context |
| Cargo-truck detachment | Carries stores between hubs and recipients | Road/cross-country links with separate travel and handling time; load, deliver, return | Payload, fuel, damage, cargo manifest, reservations | D02 H-3 |
| Landing-craft detachment | Connects ship/offshore supply to eligible shore locations | Water routes and explicitly compatible landing edges; embark, transit, unload | Payload, landing compatibility, fuel, handling availability | W48 LCAC; W33 cargo |
| Airlift detachment | Moves personnel or suitable stores rapidly between eligible sites | Air routes; takeoff/landing and loading take time; deliver or relocate | Capacity, endurance/reserve, base compatibility, readiness | W49 MV-22B; W33 ferry/cargo |
| Supply hub | Stores and issues resources at a location | Fixed; receive, reserve, transfer, and provide only explicitly modeled services | Stocks, throughput, storage limits, service status | D02 H-1–H-3; [resource blueprint](../design/simulation-blueprint.md#resources-and-sustainment) |

For the proposed Island Coordination vignette, begin with these **six families** and a small number of pieces chosen for the learning task. Both sides can use the same authored definitions initially. This creates decisions about transport allocation, information, and supply without requiring a global equipment collection.

### Add when the scenario needs the additional decision

| Candidate | Proposed function and movement | Additional state/model needed | Reference starting point |
| --- | --- | --- | --- |
| Tracked/mechanized formation | Ground movement and carrying its dismounts; explicit mounted/dismounted states | Composition, vehicle/passenger separation, terrain access, fuel, readiness | D01 A-1–A-4 |
| Fire-support battery | Relocate, prepare, perform the game's bounded support action, resupply | Ammunition compatibility, preparation time, observation requirement, original effects rule | CMO land/replenishment pp. 307–308; D01 appendix B identified in contents, detailed review pending |
| Air-defense detachment | Relocate or remain deployed; provide a modeled protection service | Sensor/report dependency, setup state, ammunition, explicit interception rule | CMO database/combat concepts; detailed equipment selection pending |
| Surface escort | Accompany or patrol around other maritime pieces | Formation travel, endurance, sensing, readiness, original engagement rule | W32 surface-combatant examples; W33 patrol |
| Reconnaissance UAV detachment | Fly an observation mission and return to a compatible base | Endurance, turnaround, report delivery, sensor model | CMO §9.4, p. 332 identified; full candidate-specific review pending |
| Engineer/service detachment | Travel to a location and restore a scenario-defined route or service | Service time, tools/stores, capacity, supported repairs | D02 support context; task-specific doctrine review pending |

Fighter aviation, submarines, full carrier operations, and detailed electronic warfare can follow a demonstrated learning need. Their names being available does not make their behavior cheap to implement. A command role can initially be represented through team permissions and orders; a separate headquarters token needs a scenario reason.

## 4. Turning a specification into legal movement

**Proposed method:** choose the map scale, time interval, piece scale, and allowed travel modes before assigning movement values. A maximum road speed is not sustained cross-country speed, an aircraft's advertised range is not its usable delivery radius, and arrival is not the same as unloading completion.

For the blueprint's simple connected-area map, assign a travel time and resource cost to each traversable connection for each movement profile. The preview includes only destinations reachable within the displayed interval after applicable preparation and handling time. Use permitted knowledge for previews; resolve newly discovered conditions during execution.

**Worked fictional example, unrelated to the real equipment values above:** an authored delivery interval is 60 simulation minutes. Loading takes 10 minutes, the chosen route takes 30, and unloading takes 10. Delivery finishes after 50 minutes. Adding a 20-minute detour moves completion to minute 70, so the delivery cannot finish in that interval. A visible cost breakdown explains this immediately. The scenario must specify whether unfinished travel continues into the next interval.

Track movement separately from available fuel, remaining cargo, and action eligibility. If two tasks reserve the same transport, detect the conflict before commitment. Keep route restrictions, handling, observation, and combat effects as named rules with versioned examples.

## 5. What each unit record needs

This is a proposed content checklist, not a new runtime schema:

| Part | Fields to preserve |
| --- | --- |
| Identity | Stable ID, family, name, description, source variant/year, piece echelon and composition |
| Mobility | Modes, terrain/route access, movement rule, preparation/transition times, endurance, reserve policy |
| Capabilities | Available actions; sensors/observation; eligible cargo; supported resource/service types |
| Constraints | Capacity units, ammunition/fuel compatibility, basing/landing compatibility, readiness requirements |
| State | Position **or** carrier, strength, functional damage, inventory, reservations, current task |
| Information | Side-visible reports, timestamps, uncertainty; keep actual enemy state separate |
| Explanation | Costs, eligibility reasons, expected timing, rule reference, resulting state changes |
| Provenance | Source URL, edition/date, exact page/table/section, access date, PDF hash when available, uncertainty and reuse notes |
| Game model | Separately authored values/units, rationale, rules/scenario version, reviewer and validation status |

Unknown reference values stay unknown; they must not become zero or a confidently generated number. An instructor-authored game value can fill a deliberate abstraction, provided it is labeled as such. Artwork and 3D models need their own provenance; the equipment descriptions do not supply those assets.

## 6. Practical sourcing workflow and remaining work

1. Use the six proposed families to bound the first catalog; select one explicit piece scale for each.
2. For each necessary factual claim, consult a pinned official equipment entry or the supplied PDF and record its locator. Verify variant, travel mode, units, and source date. Check consequential values against another suitable source before using them as performance inputs.
3. Read the relevant organization/role sections for formation composition and tasks. Keep dated national descriptions separate from our fictional roster.
4. Author movement, observation, resource, and effects rules for the chosen learning task. The existing game-manual review supplies reference approaches where equipment facts stop short of game mechanics.
5. Check worked examples, capacity/resource conservation, embarkation, movement boundaries, hidden information, and referee changes. Then have an instructor review the assumptions and trial the learning exercise.

**Research completed:** named Command examples located; behavior/data boundaries documented; WEG catalog and one equipment detail verified through the public UI; three numerical mobility/capacity examples checked; twelve candidate families distinguished by first-roster versus later use.

**Still unresolved:** first scenario and echelon, exact variants/nationality if desired, numeric game rules, item-specific reuse terms for imported material, and model/classroom validation. No software, CPE database, bulk equipment export, game compatibility, or current real-world order of battle was obtained or implemented.

## Reading coverage

- CPE: re-read pp. 7 and 100–102 for base-manual and DB-editor boundaries; used previously reviewed planner/cargo passages.
- CMO: unit terminology pp. 20–23; courses/altitude/formations pp. 40–44; selected-unit pp. 85–92; DB viewer pp. 169–173; database pp. 266–267; land pp. 307–308 and damage p. 310; unit appendices pp. 342–346. Visually checked p. 343. Other chapters were consulted selectively or through existing coverage; this was not a cover-to-cover reading.
- ATP 7-100.3: contents and appendix A, A-1–A-4 / PDF 203–206, in addition to the [prior review](dataset-review.md). No numeric equipment table was transcribed from this source.
- ATP 7-100.1: appendix H, H-1–H-3 / PDF 245–247; rendered PDF 247 and visually checked table H-1, particularly the URAL 4320-31 column.
- Online: Command UI and database-viewer sections; checked the online appendix contents against the PDF and found different coverage; publisher training-manual listing; WEG reference/index and LAV-25 description, variants, Automotive tab; Navy LCAC fact file; NAVAIR MV-22B page. WEG's initial web-reader failure was recovered through the browser. No private institutional service was accessed.
