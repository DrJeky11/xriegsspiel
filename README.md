# XRiegsspiel

A military wargaming platform for training and education, with **Meta Quest 3 as the primary interface** and browser participation alongside it.

The name plays on *Kriegsspiel*. The project is being developed for a Marine Corps University / Naval Postgraduate School hackathon, as described by the project owner. The repository contains research and a first original cooperative tabletop prototype. It does not imply institutional endorsement.

## Run the first prototype

Requires Node 22.18+ (tested with Node 26.0.0).

```sh
npm ci
npm run dev
```

Open [the local tabletop](http://127.0.0.1:5173). With an authorized Quest connected over USB, run `npm run quest`, put on the headset, and choose **Enter VR** or **Enter MR** in Quest Browser. Keep the USB cable connected. Headset operation still needs the user's first hands-on test.

**Island Coordination:** select a transport, see legal movement, preview and confirm an order, then deliver supplies to two outposts. Browser clients share the same authoritative exercise and decision log. This first slice has shared cooperative control and full information; opposing roles, fog of war, and referee contests remain future work.

See the [prototype runbook and verification record](docs/prototype.md) for controls, original rules, architecture, and the headset test checklist. Run `npm test` and `npm run build` to verify rules and build the client. `npm start` serves the production build with the same session service.

## Integrated geographic tabletop

Open [Geographic tabletop](http://127.0.0.1:5173/scenario.html) to choose a map/year, assemble Red/China and Blue/United States forces from the catalog, preview and commit hex movement, transport individual pieces, and export/reopen a replay-verified exercise. The default is a seven-piece **authored training setup** on Western Senkaku in 2026; positions are not real deployments. All six Pacific/CENTCOM views are available.

The [scenario runbook](docs/geographic-scenario.md) documents original coastal/layer rules, versioned persistence, source ambiguities, browser controls, Quest controller paths, verification and the pending hands-on headset checklist. Its journal is separate from the original Island Coordination saved session.

## Terrain workspaces

Open [CENTCOM terrain](http://127.0.0.1:5173/centcom.html) for **Strait of Hormuz** and **Bab al-Mandeb** hex maps, or [Pacific terrain](http://127.0.0.1:5173/pacific.html) for **Palawan/Spratlys** and **Taiwan/Senkaku**, including Second Thomas Shoal and western Senkaku close-ups. Each workspace has geographic hex tiles and an inspector. These are terrain foundations; the original playable exercise remains separate. See the [CENTCOM record](docs/centcom-terrain.md) and [Pacific data, controls, and verification record](docs/pacific-terrain.md).

## Start here

Open the [Red/Blue equipment catalog](http://127.0.0.1:5173/catalog.html) to search **1,607 ODIN records**, inspect source facts/components, and test individual pieces on a fictional browser board. The [catalog guide](catalog/README.md) documents the [SQLite database](catalog/equipment.sqlite), original movement/cargo rules, reproducible builds and validation. Historical service and combat performance remain unverified.

Read the [confirmed product requirements](docs/product-requirements.md), the [manual review](docs/research/manual-review.md), and the [research overview](docs/research/README.md). Architecture choices remain [proposed](docs/research/architecture-options.md).

| Topic | Reference |
| --- | --- |
| Launching, testing, and extending the first playable slice | [Prototype runbook](docs/prototype.md) |
| Quest 3 hardware, native Unity, WebXR, input, performance, and testing | [Quest 3 development](docs/research/quest3-development.md) |
| Installed development software, toolchain checks, and remaining setup | [Computer readiness](docs/research/computer-readiness.md) |
| What can be reused from the earlier Quest project | [Prior-project audit](docs/research/prior-project-audit.md) |
| Marine Corps and joint-force games, rules, and evidence of use | [Wargames and rules](docs/research/wargames-and-rules.md) |
| Command Professional Edition mechanics, current features, and improvement opportunities | [CPE reference study](docs/research/command-professional-edition.md) |
| Candidate unit families, movement behavior, equipment facts, and source gaps | [Unit catalog and data sources](docs/research/unit-catalog-and-data-sources.md) |
| Our own simulation, orders, resources, information, and referee design | [Simulation blueprint](docs/design/simulation-blueprint.md) |
| MCU cloud context, game-playing AI, APIs, analytics, and an AI Sensei | [Cloud and AI Sensei study](docs/research/ai-sensei-and-wargaming-cloud.md) |
| Capturing decisions, comparing exercises, and preparing future AI datasets | [Data-capture design](docs/design/data-capture.md) |
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
- Treat data capture as a core pillar for trends, analysis, and future AI training. The [data-capture proposal](docs/design/data-capture.md) recommends a replayable decision record, historical observations, local transactional storage, and purpose-specific exports. The collector and analytics pipeline remain unimplemented.

Research baseline: **15 September 2026**. Recheck platform documentation and game editions before implementation. Future contributors should read [AGENTS.md](AGENTS.md).
