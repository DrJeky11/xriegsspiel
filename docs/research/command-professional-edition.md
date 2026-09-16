# Command Professional Edition: reference study for XRiegsspiel

**Researched: 2026-09-15.** Public documentation study; no CPE installation, account, license, or institutional service was accessed. Read with the [owner requirements](../product-requirements.md) and the [original simulation blueprint](../design/simulation-blueprint.md).

## Direction

The owner clarified that XRiegsspiel should be **our own platform**, informed by how Command Professional Edition (CPE) works. CPE is a reference product, not a dependency to acquire or wrap. The desired improvement is substantial: students should spend more time planning together and less time operating the game.

**Recommendation:** build an original operational simulation with mission-based orders, explicit resource constraints, limited information, and referee intervention. Make those concepts accessible through a Quest-first shared table and a fully playable browser. Evaluate the improvements against the owner's learning and bookkeeping problems before claiming superiority.

CPE is a demanding benchmark. Its developer describes a professional extension of Command: Modern Operations (CMO), with a separate simulation database, configurable models, scripting, analysis, and external visualization. Public documentation establishes substantial existing functionality; it does not establish XRiegsspiel's future accuracy or comparative usability. [W07](sources.md#w07)

## Evidence and version boundaries

| Evidence | What was established | Limit |
| --- | --- | --- |
| MCU-linked CPE manual | Downloaded; **v2.4, updated 13 October 2024; 181 pages**. Page 7 explicitly says it supplements the core CMO manual. | It is not documentation for every feature in later builds. [W31](sources.md#w31) |
| Core CMO manual linked by that supplement | Downloaded; **425 pages**, file metadata dated 9 February 2023. Selected foundational mechanics read. | Metadata is not a declared game version; later features need newer sources. [W32](sources.md#w32) |
| Official online manual | Mission/cargo/planner and simulation chapters checked against the PDFs. | Living document with no build pin established. [W33](sources.md#w33), [W34](sources.md#w34) |
| Official release notes | Checked v2.4.2, v2.4.3, v2.4.4, and **v2.4.4.1 dated 18 August 2026**. | v2.4.4.1 is the newest public update found in this review, not an inspection of MCU's installed build. [W35](sources.md#w35), [W36](sources.md#w36), [W37](sources.md#w37), [W38](sources.md#w38) |

The two downloaded manuals total 606 pages. Text extraction covered both files; substantive reading was selective, as recorded below. Neither was read cover to cover. Screenshots in manuals show documented layouts, not a live usability test.

## How Command works

### 1. The scenario defines the exercise

A scenario supplies sides, briefings, starting units, awareness settings, relationships, events, and scoring. Platform/component definitions live in a versioned database; a scenario records its database version. Changing that database can change scenario behavior. See CMO §§5.4–5.5 and 8.1–8.2. [W32](sources.md#w32)

**XRiegsspiel implication:** package learning objectives, rules, model versions, content, and starting state together. A saved exercise must remain reproducible after the application changes. Instructor assessment should be separate from the scenario's outcome score.

### 2. Players command through several levels

| Command concept | Documented behavior | Design lesson |
| --- | --- | --- |
| Units, groups, components | Platforms can contain weapons, sensors, magazines, hosted units, and damaged subsystems. | A piece is a view of state, not just a token with one strength number. |
| Direct orders | Courses, speed/altitude, and manual actions give detailed control. | Allow direct intervention while making its relationship to standing orders clear. |
| Missions | Units receive common tasks and automated behavior. | Let students express intent without manually moving every subordinate element. |
| Doctrine and rules of engagement | Inherited settings govern behavior; overrides can change the effective setting. | Show the effective policy and where it came from. |

CMO §§2.1, 3.3, 4.5, and 7.1 are the reference locations. [W32](sources.md#w32)

For XRiegsspiel, selecting a unit should answer four questions together: **What is it doing? What can I order? What constrains it? What happens to the rest of the plan if I change it?**

### 3. Planning and execution are different

The operation planner uses timing, conditions, dependencies, and priority to coordinate missions. Priority is not sequence order. A mission marked satisfied may still execute; that label can release units for other tasks. Fast schedule estimates depend on user assumptions and are not guaranteed completion predictions. CPE pp. 148–158. [W31](sources.md#w31)

The landing planner adds a useful resource-planning example: cargo groupings, compatible transports, capacity constraints, manifests, and waves. It generates drafts before confirmation. CPE pp. 137–147. [W31](sources.md#w31)

**XRiegsspiel implication:** provide a linked map and timeline with explicit dependencies, conflicting allocations, and named completion conditions. Keep draft, committed, executing, blocked, completed, and cancelled states distinct. Show estimates as estimates; reveal which assumptions support them.

### 4. CPE supports two multiplayer cadences

**WEGO:** participants plan while paused, commit orders, and the server advances a chosen interval. An optional umpire can review/edit before and after execution. CPE pp. 12–28. [W31](sources.md#w31)

**Real-time multiplayer:** clients submit orders to a shared simulation host. Player, umpire, and observer roles differ; peer viewports, joining in progress, and saved-state rewind support collaboration and control. CPE pp. 30–31, 48–59. [W31](sources.md#w31)

These are execution choices, not universal reconnaissance/movement/sustainment phases. XRiegsspiel should support one coherent cadence first and keep game-specific phase rules replaceable.

### 5. Information is a modeled product

Contacts can have incomplete identification and uncertain positions. The selected-contact panel exposes known information. Disconnected units can retain a deteriorating local picture and later share reports when communications return. CMO §4.5 and appendix 10.7. [W32](sources.md#w32)

**XRiegsspiel implication:** distinguish actual entities from reports about them, including report age and uncertainty. A movement preview must not reveal an unseen obstruction through a suddenly blocked route. A communications outage in the fictional scenario is also different from a headset losing Wi-Fi.

### 6. Automation already includes bookkeeping and explanations

Command tracks fuel, ammunition, readiness, damage, and cargo. Its manual weapon-allocation interface already reports unmet firing conditions. User-defined cargo can represent other stores, but the online manual says those contents have no built-in simulation effect. CMO §§3.3, 4.5, 7.2.7–8, 9.2.8; online §7.2.8. [W32](sources.md#w32), [W33](sources.md#w33)

**XRiegsspiel implication:** distinguish inventory from its effects on operations. An entry labelled medical stores does not become a medical model. Define what each resource enables, consumes, reserves, and restores. Bring those explanations into selection and planning, with a short history of changes.

### 7. Resolution combines models and uncertainty

The current simulation chapter describes deterministic submodels, stochastic outcomes, and parallel execution. It distinguishes simulation step size from time acceleration; recorded snapshots can support resumed branches. This is not evidence that replaying commands with one seed reproduces every CPE result. [W34](sources.md#w34), §§12.1–12.2

**XRiegsspiel implication:** own our execution order and retain resolved events and random draws. Support exact historical playback separately from a new simulation run. Changing the model or a decision creates a new run with its own results.

### 8. Analysis and customization are existing strengths

CPE documents interactive export, repeated headless runs, model overrides, event hooks, and detailed sensor-failure reports. Extensive diagnostics can increase processing cost. See pp. 74–91, 100–113, 166–170. [W31](sources.md#w31)

**XRiegsspiel implication:** record a compact explanation for every adjudicated action. Offer deeper diagnostics to instructors when needed. A learning review should connect outcomes to decisions and information, beyond plotting unit tracks or totaling losses.

## Changes since the MCU manual

These findings prevent the 2024 supplement from becoming an inaccurate description of the current product.

| Release | Relevant documented changes | Consequence for our comparison |
| --- | --- | --- |
| 2.4.2 — 12 Aug 2025 | 3D terrain/vertical scaling, doctrine interface improvements, additional hooks, improved Lua socket response framing; WEGO server uses a 1-second pulse. [W35](sources.md#w35) | Do not describe Command as lacking 3D terrain or assume the supplement's fidelity behavior applies to every mode. |
| 2.4.3 — 16 Dec 2025 | Timestamped saves, time synchronization changes, refueling allocation improvements, an explicit manual-salvo execution control, and contact-expiry customization. [W36](sources.md#w36) | Undo/history, reservations, draft execution, and information aging are already active product concerns. |
| 2.4.4 — developer announcement 31 May; publisher details 4 Aug 2026 | Menu search, weapon-panel range-color cues, waypoint event actions, terrain and simulation changes. [W37](sources.md#w37) | Do not claim CPE has no command discovery or visual action assistance. The two publication dates are recorded separately. |
| 2.4.4.1 — 18 Aug 2026 | Fixes concerning escorts, datalink behavior, and scenario image loading. [W38](sources.md#w38) | The patch does not establish a new team-permission or communications UI. |

The developer's May roadmap describes Project Hannibal ground-combat work and a new platform communications model as future work. The August patch still calls that communications feature upcoming. No shipping confirmation was found for these projects. The product page also lists a web API under future features. Treat all three as roadmap evidence, not verified capabilities or integration endpoints. [W37](sources.md#w37), [W38](sources.md#w38), [W07](sources.md#w07)

## Where XRiegsspiel could improve

These are **testable product hypotheses**. We have not observed students using CPE, and the owner's reported difficulties concerned previous wargames generally.

| Need | Evidence about CPE | Original XRiegsspiel proposal | Evidence of improvement |
| --- | --- | --- | --- |
| Understand an action immediately | Existing allocation diagnostics and newer search/range cues | One selection panel: permitted actions, reach, costs, reasons, and short rule explanations | Fewer rule lookups; faster first valid order without poorer reasoning |
| Coordinate a staff | 2024 RTMP manual says the latest order to a shared unit wins; no player hierarchy, p. 51 | Explicit order ownership, proposal/approval roles, conflict visibility | Concurrent orders cannot silently overwrite a teammate's intent |
| Keep discussion connected to the plan | 2024 RTMP manual directs users to external communications tools, p. 53 | Team annotations, decision rationale, requests and acknowledgments linked to map objects | Team can reconstruct who requested/authorized a change |
| Track sustainment | Fuel/ammunition/cargo already modeled; generic cargo effects limited as above | Resource ledger plus transport, service, and readiness dependencies appropriate to the scenario | No tally corrections; learners explain downstream consequences |
| Resolve a disputed outcome | Existing umpire edits, rewind, and Absolute Control, pp. 21–28, 51–59 | A contest attached to the result, bounded ruling, preserved explanation/history | Both clients resume consistently; original and changed results remain reviewable |
| Learn in VR | Documented Windows clients and external visualization; no Quest-native control workflow verified | Seated shared table, reachable controls, adjustable detail, browser parity | Same task in Quest/browser, including comfort and retention checks |

CPE references for multiplayer/referee rows: [W31](sources.md#w31). Deployment reference: [W39](sources.md#w39). Later release notes reviewed did not establish that the two 2024 collaboration limitations were removed; their current status remains untested. Also distinguish human team chat from simulated platform communications—improving one does not implement the other.

The publisher provides multiple manuals, tutorial videos, and training. We should compete on the learning experience we can demonstrate, not imply CPE has no educational support. [W40](sources.md#w40)

## What to carry into our design

**Preserve the useful concepts:** missions and direct orders; inherited policy; explicit resources; versioned scenarios; contacts with uncertainty; authoritative resolution; referee control; decision review.

**Redesign the student workflow:** contextual action guidance, shared planning with clear ownership, transparent consequences, accessible Quest interactions, and concise instructor tools.

**Build original content and models:** start with fictional unit classes and authored rules. Publicly readable documentation does not make Command's software, platform databases, scenarios, graphics, or model internals reusable. The vendor's phrase “open-source database” is not evidence of an open-source software/data license. No dependency on CPE files, Lua APIs, or licenses is proposed.

The [blueprint](../design/simulation-blueprint.md) defines how those ideas can become our own executable system. Broad platform fidelity comparable to CPE would be a substantial separate program of model development and validation. The first build should establish the complete learning workflow with a small, explicit model.

## Reading coverage and continuation

The subsequent [unit-source review](unit-catalog-and-data-sources.md) extends this coverage to CMO's database viewer (pp. 169–173) and common air/sea unit appendices (pp. 342–345), with selected movement and equipment passages revisited. It confirms named examples in the manuals, distinguishes the separate database-editor manual, and proposes an independent sourcing route through public equipment references. Its coverage record supplements the original pass below.

| Document | Substantive review | Skimmed or not established |
| --- | --- | --- |
| CPE v2.4 supplement | Front matter and p. 7; WEGO pp. 12, 14–28; RTMP pp. 30–31, 48–53, 56–59; analysis/export pp. 74–78, 84–91; model editing/hooks pp. 100–113; planners pp. 137–165; sensor-report appendix pp. 166–170 | Selected CLI/visualization/interoperability excerpts pp. 60–62, 66, 68, 92–96, 114–122. Setup screenshots, licensing administration, detailed sensor/sonar, terrain, and space appendices were not comprehensively reviewed. |
| Core CMO PDF | Contents and terminology pp. 20–23; orders/components/policy pp. 37–48, 55–58, 70–74; selected-unit information pp. 85–92; selected scenario passages pp. 120–123, 125–126, 132–134; missions/cargo pp. 200–203, 232–236; database pp. 266–267; sensors pp. 281–285; selected ground/damage/action diagnostics pp. 307–308, 310–314; communications pp. 347–354 | Combat formulas, historical walkthroughs, all mission types, most appendices, and the update-history catalog were not comprehensively reviewed. |
| Visual checks | CPE p. 2 edition and p. 151 planner layout; CMO p. 39 action-diagnostic description | No live interface interaction or performance observation. |

Some long sections were read as extracted-text excerpts; the table identifies topical coverage, not an assertion that every line and illustration was inspected. The source register contains exact URLs and PDF hashes. The files and rendered pages remain in temporary research storage, outside the repository.

Remaining research should follow the next implementation need: select the first original rules and learning task, formalize its state transitions, and test the workflow with an instructor. Detailed proprietary CPE internals, current cloud configuration, and CPE benchmark performance remain unknown and are not prerequisites for our own build.
