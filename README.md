# XRiegsspiel

A military wargaming platform for training and education, with **Meta Quest 3 as the primary interface** and browser participation alongside it.

The name plays on *Kriegsspiel*. The project is being developed for a Marine Corps University / Naval Postgraduate School hackathon, as described by the project owner. The repository contains research and a first original cooperative tabletop prototype. It does not imply institutional endorsement.

## Run the map workspaces

Requires Node 22.18+ (database and full tests verified on Node 22.18.0 and 26.0.0).

```sh
npm ci
npm run dev
```

Open [Pacific](http://127.0.0.1:5173/pacific.html) or [CENTCOM](http://127.0.0.1:5173/centcom.html). These are the original terrain workspaces with catalog assembly, movement and transport integrated into their browser menus and controller panels. The root address opens Pacific; the old standalone Geographic tabletop address redirects there.

Open **Menu → Pieces & orders → Add pieces** to search the catalog, choose Red/China or Blue/United States, select a record and place an instance. Preview a destination, then confirm. **Terrain & regions** retains the original geographic inspection, labels, layer controls and exports.

All six maps retain their own pieces, year, turn, budgets and history. Switching maps resumes that map's exercise. New maps start empty in 2026; **New map assembly** resets only the current map after a preview and confirmation. Existing Geographic tabletop saves migrate to their matching map without modifying the old journal.

With an authorized Quest connected by USB, run `npm run quest` (Pacific), or `QUEST_PATH=/centcom.html npm run quest`. Choose **Enter VR** or **Enter MR** in Quest Browser. Controller panels provide catalog search with a spatial keyboard, Red/Blue assignment, placement, movement, cargo, turns, region selection and terrain/table controls. Changing between the two major workspaces exits immersion; reenter in the destination. Full headset usability still needs the hands-on checklist.

See [playable terrain controls, persistence and verification](docs/playable-terrain.md). `npm test` verifies rules and persistence; `npm run build` typechecks and builds; `npm start` serves the production build. Use `PORT` for a different port and `DATA_DIR` for a separate exercise database directory. One server process may write a given directory.

The Island Coordination trial and the catalog's fictional test board have been retired from the application. Their source remains in Git baseline `f25a7a7` on `main`. The original trial's [runbook](docs/prototype.md) and [geographic integration record](docs/geographic-scenario.md) are historical records.

## Reconstruct and learn from exercises

Every new order is captured in a local SQLite exercise database. Open **Pieces & orders → Exercise review**, or **Finish exercise & review**, to inspect the historical board and decisions, add reflections/assessments, compare compatible exercises and export records. Earlier exercises survive resets and imports. AI scenario learning records use their invitation access rules. See the [database and review guide](docs/exercise-database.md) for controls, capture scope, backup/restore and verification limits.

## Play against AI

Choose **Menu → Play against AI** in either workspace. Play either side in all eight maritime scenarios against **Novice, Standard or Advanced** opposition. Move visible Blue and Red ships on the existing water hexes, preview routes, build and seal orders, review position-dependent interception, resume saved runs, contest outcomes and export the completed replay. The Quest controller panel supports the same play cycle. See the [AI controls, rules, evaluation and limitations](docs/ai-opponent.md).

New scenarios open a mission briefing with optional first-round guidance. Round summaries explain recorded outcomes, while **Return to active exercise** restores the scenario map after assembly browsing. See the [Quest trial fixes and targeted retest](docs/quest-test-fixes-2026-09-16.md).

The opponent uses authored priorities and bounded search. It has no access to your draft or private information and uses the same rules at every difficulty. Second Thomas Resupply offers an explicit **Short window** variant for tighter opposition, separate from difficulty. Automated and browser checks pass; physical Quest usability and human balance trials remain pending.

An optional **Sensei pilot** now selects teaching hints for Second Thomas Resupply using a small locally trained policy. During the exercise, choose **Sensei teaching hint** on the main controller menu, or **Ask for a teaching hint** in the browser. No special URL is needed. The owner and an instructor will evaluate the explanations. See the [training results, review packet and launch instructions](docs/training/guided-policy-v1.md); agreement with synthetic labels does not establish learning benefit.

## Authored scenario library

The [maritime crisis library](docs/scenarios/README.md) provides **eight playable scenarios**: one historical adaptation and one plausible fictional exercise each for the Spratlys, Senkakus, Hormuz and Bab al-Mandeb. Each includes roles, objectives, injects, scoring and proposed training variations. [Common adjudication](docs/scenarios/adjudication.md) and the [training/evaluation protocol](docs/scenarios/ai-evaluation.md) separate game results from learning assessment. Versioned JSON definitions and an offline score calculator accompany the playable geographic resolver. Initial automated comparisons exist; instructor balance and learning trials remain pending.

```sh
node scripts/score-scenarios.mjs --validate
node scripts/score-scenarios.mjs scenarios/example-ledger.json
```

## Terrain coverage

Open [CENTCOM terrain](http://127.0.0.1:5173/centcom.html) for **Strait of Hormuz** and **Bab al-Mandeb** hex maps, or [Pacific terrain](http://127.0.0.1:5173/pacific.html) for **Palawan/Spratlys** and **Taiwan/Senkaku**, including Second Thomas Shoal and western Senkaku close-ups. Each playable workspace retains its original geographic hex tiles and inspector. See the [CENTCOM record](docs/centcom-terrain.md) and [Pacific data and terrain record](docs/pacific-terrain.md) for source geography and limitations.

## Start here

Open the [Red/Blue equipment catalog](http://127.0.0.1:5173/catalog.html) to search **1,607 ODIN records**, inspect source facts/components, and open an equipment record in either playable map workspace. The [catalog guide](catalog/README.md) documents the [SQLite database](catalog/equipment.sqlite), original movement/cargo rules, reproducible builds and validation. Historical service and combat performance remain unverified.

Read the [confirmed product requirements](docs/product-requirements.md), the [manual review](docs/research/manual-review.md), and the [research overview](docs/research/README.md). The owner selected **continuing with WebXR** on 2026-09-16; see the [platform decision and findings](docs/research/quest-native-vs-webxr.md). Other architecture choices remain [proposed](docs/research/architecture-options.md).

| Topic | Reference |
| --- | --- |
| Using the playable Pacific/CENTCOM workspaces | [Playable terrain runbook](docs/playable-terrain.md) |
| Quest 3 hardware, native Unity, WebXR, input, performance, and testing | [Quest 3 development](docs/research/quest3-development.md) |
| Why we use WebXR, native Quest migration work, and the recommended path | [Native versus WebXR assessment](docs/research/quest-native-vs-webxr.md) |
| Installed development software, toolchain checks, and remaining setup | [Computer readiness](docs/research/computer-readiness.md) |
| What can be reused from the earlier Quest project | [Prior-project audit](docs/research/prior-project-audit.md) |
| Marine Corps and joint-force games, rules, and evidence of use | [Wargames and rules](docs/research/wargames-and-rules.md) |
| Command Professional Edition mechanics, current features, and improvement opportunities | [CPE reference study](docs/research/command-professional-edition.md) |
| Candidate unit families, movement behavior, equipment facts, and source gaps | [Unit catalog and data sources](docs/research/unit-catalog-and-data-sources.md) |
| Our own simulation, orders, resources, information, and referee design | [Simulation blueprint](docs/design/simulation-blueprint.md) |
| MCU cloud context, game-playing AI, APIs, analytics, and an AI Sensei | [Cloud and AI Sensei study](docs/research/ai-sensei-and-wargaming-cloud.md) |
| Adjustable Red opposition, search versus trained models, current gaps and measured feasibility | [Opponent research](docs/research/opponent-ai.md) |
| Teaching-first AI Sensei, laptop training, difficulty calibration, and required owner input | [Agent training plan](docs/design/agent-training-plan.md) |
| Trained guided-exercise hint policy, pilot controls and evaluator packet | [First training run](docs/training/guided-policy-v1.md) |
| How Command and other wargames define victory; proposed first opposed scenario | [Objectives and victory](docs/research/objectives-and-victory.md) |
| Capturing decisions, comparing exercises, and preparing future AI datasets | [Data-capture design](docs/design/data-capture.md) |
| Supplied tactics references, red-team methods, and empirical education research | [Dataset review](docs/research/dataset-review.md), [original documents](docs/datasets/README.md) |
| Learning objectives, adjudication, and after-action review | [Learning and adjudication](docs/research/learning-and-adjudication.md) |
| Prototype sequence and acceptance criteria | [Prototype plan](docs/research/prototype-plan.md) |
| Sources, editions, and access limitations | [Source register](docs/research/sources.md) |
| What was actually checked | [Research verification](docs/research/verification.md) |

## Decisions so far

- Quest 3 is primary; browser access is also required.
- Continue with the existing Three.js/TypeScript WebXR application. Native Unity/OpenXR remains a future alternative if measured needs justify revisiting the decision; no migration is planned.
- Prioritize officers/staffs practicing operational planning and MCU/NPS students learning military decision-making as teams.
- Support the full planning cycle with game-specific turn sequences.
- Automate adjudication, with player contests and referee takeover.
- Make movement and permitted actions immediately understandable; automate supplies and strength records.
- Build our own platform, using CPE as a reference. CPE software access and integration are outside the requested direction.
- Start with 2–4 players using headsets or browsers and work through the headset tabletop experience first. Passthrough versus fully virtual surroundings remains open.
- Preserve the owner's long-term AI Sensei vision through agent development, integration, and analytics. The API, headless runner, and teaching roadmap are **proposals**; the reported institutional cloud capacity is not a first-build requirement.
- Provide adjustable opposition. The [playable opponent](docs/ai-opponent.md) now supports both roles, three planning budgets and all eight scenarios; `npm run evaluate:opponent` runs policy comparisons. No learned game-playing model is trained; the separate Sensei hint selector has a first trained checkpoint. The earlier [opponent study](docs/research/opponent-ai.md) remains the design rationale.
- Treat data capture as a core pillar for trends, analysis, and future AI training. The owner approved phases 1–3 of the [implementation plan](docs/design/data-capture-implementation-plan.md). Local transactional capture, historical decision review and initial reports are implemented and verified through browser checks and an owner-confirmed Quest movement trial; [the operating guide](docs/exercise-database.md) records the evidence and remaining headset usability checks. Controlled AI dataset jobs and central hosting remain future work.

Research baseline: **15 September 2026**. Recheck platform documentation and game editions before implementation. Future contributors should read [AGENTS.md](AGENTS.md).

The VR/MR unit palette uses miniature tiles grouped by force, domain and role. Bring either controller close to a tile/piece or point its ray at it, then hold the **side grip under your middle finger**. Lower the held miniature until the preview turns green, then release to place or move it. Hold the side grip on the palette's handle or title to reposition it. Use the index-finger trigger for buttons, including − / Units + to hide or reopen the palette. Bare-hand grabbing is not enabled. Models are stylized classes with real catalog names; exact vehicle/variant artwork and physical Quest usability remain separate verification work. See [the controls and checklist](docs/playable-terrain.md#vr--mr-controller-controls).
