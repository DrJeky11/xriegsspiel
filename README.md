# XRiegsspiel

A military wargaming platform for training and education, with **Meta Quest 3 as the primary interface** and browser participation alongside it.

The name plays on *Kriegsspiel*. The project is being developed for a Marine Corps University / Naval Postgraduate School hackathon, as described by the project owner. The repository contains research and a first original cooperative tabletop prototype. It does not imply institutional endorsement.

## Run the map workspaces

Requires Node 22.18+ (tested with Node 26.0.0).

```sh
npm ci
npm run dev
```

Open [Pacific](http://127.0.0.1:5173/pacific.html) or [CENTCOM](http://127.0.0.1:5173/centcom.html). These are the original terrain workspaces with catalog assembly, movement and transport integrated into their browser menus and controller panels. The root address opens Pacific; the old standalone Geographic tabletop address redirects there.

Open **Menu → Pieces & orders → Add pieces** to search the catalog, choose Red/China or Blue/United States, select a record and place an instance. Preview a destination, then confirm. **Terrain & regions** retains the original geographic inspection, labels, layer controls and exports.

All six maps retain their own pieces, year, turn, budgets and history. Switching maps resumes that map's exercise. New maps start empty in 2026; **New exercise** resets only the current map after a preview and confirmation. Existing Geographic tabletop saves migrate to their matching map without modifying the old journal.

With an authorized Quest connected by USB, run `npm run quest` (Pacific), or `QUEST_PATH=/centcom.html npm run quest`. Choose **Enter VR** or **Enter MR** in Quest Browser. Controller panels provide catalog search with a spatial keyboard, Red/Blue assignment, placement, movement, cargo, turns, region selection and terrain/table controls. Changing between the two major workspaces exits immersion; reenter in the destination. Full headset usability still needs the hands-on checklist.

See [playable terrain controls, persistence and verification](docs/playable-terrain.md). `npm test` verifies rules and persistence; `npm run build` typechecks and builds; `npm start` serves the production build. Use `PORT` for a different port and `DATA_DIR` for a separate journal directory. One server process may write a given directory.

The Island Coordination trial and the catalog's fictional test board have been retired from the application. Their source remains in Git baseline `f25a7a7` on `main`. The original trial's [runbook](docs/prototype.md) and [geographic integration record](docs/geographic-scenario.md) are historical records.

## Authored scenario library

The [maritime crisis library](docs/scenarios/README.md) provides **eight scenarios**: one historical adaptation and one plausible fictional exercise each for the Spratlys, Senkakus, Hormuz and Bab al-Mandeb. Each includes roles, objectives, injects, scoring and AI-training variations. [Common adjudication](docs/scenarios/adjudication.md) and the [training/evaluation protocol](docs/scenarios/ai-evaluation.md) separate game results from learning assessment. Versioned JSON definitions and an offline score calculator are included; these scenarios are not yet integrated into the geographic app or balance-tested.

```sh
node scripts/score-scenarios.mjs --validate
node scripts/score-scenarios.mjs scenarios/example-ledger.json
```

## Terrain coverage

Open [CENTCOM terrain](http://127.0.0.1:5173/centcom.html) for **Strait of Hormuz** and **Bab al-Mandeb** hex maps, or [Pacific terrain](http://127.0.0.1:5173/pacific.html) for **Palawan/Spratlys** and **Taiwan/Senkaku**, including Second Thomas Shoal and western Senkaku close-ups. Each playable workspace retains its original geographic hex tiles and inspector. See the [CENTCOM record](docs/centcom-terrain.md) and [Pacific data and terrain record](docs/pacific-terrain.md) for source geography and limitations.

## Start here

Open the [Red/Blue equipment catalog](http://127.0.0.1:5173/catalog.html) to search **1,607 ODIN records**, inspect source facts/components, and open an equipment record in either playable map workspace. The [catalog guide](catalog/README.md) documents the [SQLite database](catalog/equipment.sqlite), original movement/cargo rules, reproducible builds and validation. Historical service and combat performance remain unverified.

Read the [confirmed product requirements](docs/product-requirements.md), the [manual review](docs/research/manual-review.md), and the [research overview](docs/research/README.md). Architecture choices remain [proposed](docs/research/architecture-options.md).

| Topic | Reference |
| --- | --- |
| Using the playable Pacific/CENTCOM workspaces | [Playable terrain runbook](docs/playable-terrain.md) |
| Quest 3 hardware, native Unity, WebXR, input, performance, and testing | [Quest 3 development](docs/research/quest3-development.md) |
| Installed development software, toolchain checks, and remaining setup | [Computer readiness](docs/research/computer-readiness.md) |
| What can be reused from the earlier Quest project | [Prior-project audit](docs/research/prior-project-audit.md) |
| Marine Corps and joint-force games, rules, and evidence of use | [Wargames and rules](docs/research/wargames-and-rules.md) |
| Command Professional Edition mechanics, current features, and improvement opportunities | [CPE reference study](docs/research/command-professional-edition.md) |
| Candidate unit families, movement behavior, equipment facts, and source gaps | [Unit catalog and data sources](docs/research/unit-catalog-and-data-sources.md) |
| Our own simulation, orders, resources, information, and referee design | [Simulation blueprint](docs/design/simulation-blueprint.md) |
| MCU cloud context, game-playing AI, APIs, analytics, and an AI Sensei | [Cloud and AI Sensei study](docs/research/ai-sensei-and-wargaming-cloud.md) |
| Adjustable Red opposition, search versus trained models, current gaps and measured feasibility | [Opponent research](docs/research/opponent-ai.md) |
| How Command and other wargames define victory; proposed first opposed scenario | [Objectives and victory](docs/research/objectives-and-victory.md) |
| Supplied tactics references, red-team methods, and empirical education research | [Dataset review](docs/research/dataset-review.md), [original documents](docs/datasets/README.md) |
| Learning objectives, adjudication, and after-action review | [Learning and adjudication](docs/research/learning-and-adjudication.md) |
| Prototype sequence and acceptance criteria | [Prototype plan](docs/research/prototype-plan.md) |
| Sources, editions, and access limitations | [Source register](docs/research/sources.md) |
| What was actually checked | [Research verification](docs/research/verification.md) |

## Decisions so far

- Quest 3 is primary; browser access is also required.
- Prioritize officers/staffs practicing operational planning and MCU/NPS students learning military decision-making as teams.
- Support the full planning cycle with game-specific turn sequences.
- Automate adjudication, with player contests and referee takeover.
- Make movement and permitted actions immediately understandable; automate supplies and strength records.
- Build our own platform, using CPE as a reference. CPE software access and integration are outside the requested direction.
- Start with 2–4 players using headsets or browsers and work through the headset tabletop experience first. Passthrough versus fully virtual surroundings remains open.
- Preserve the owner's long-term AI Sensei vision through agent development, integration, and analytics. The API, headless runner, and teaching roadmap are **proposals**; the reported institutional cloud capacity is not a first-build requirement.
- Research an adjustable Red opponent. The [opponent study](docs/research/opponent-ai.md) recommends authored planning and bounded search first, then a compact learned policy if evaluation warrants it. `npm run research:opponent` runs a read-only in-memory mechanics probe; a competitive opponent and trained model are not implemented yet.

Research baseline: **15 September 2026**. Recheck platform documentation and game editions before implementation. Future contributors should read [AGENTS.md](AGENTS.md).

The VR/MR unit palette now uses miniature tiles grouped by force, domain and role. Hold the controller grip to pick up a miniature; lower it over a valid hex and release to place or move it. Grip the palette handle to reposition it, and use − / Units + to hide or reopen it. Models are stylized classes with real catalog names; exact vehicle/variant artwork and physical Quest usability remain separate verification work. See [the controls and checklist](docs/playable-terrain.md#vr--mr-controller-controls).
