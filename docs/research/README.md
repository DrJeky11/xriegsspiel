# Research overview

**Baseline, manual follow-ups, and dataset review:** 2026-09-15. **Status:** research foundation and original simulation proposal available; some manual access, hardware, and classroom validation remain open.

**Implementation update, 2026-09-16:** the [playable AI opponent](../ai-opponent.md) now uses the original geographic maps, and the [exercise database and learning review](../exercise-database.md) provide durable capture, replay, notes, reports and exports. The research-stage descriptions below record earlier findings; their statements that these features await implementation are historical. Human balance, teaching effectiveness and extended headset usability remain separate validation work.

Start with the [owner requirements](../product-requirements.md). The [manual review](manual-review.md) and later [CPE study](command-professional-edition.md) cover eight MCU-linked documents plus publisher references, with explicit coverage and gaps. CPE is a reference for our own platform; obtaining or integrating its software is outside the owner's requested direction.

**Quest platform decision, 2026-09-16:** after reviewing the research on `codex/fullVR`, the owner selected continuing with WebXR and authorized merging the documentation. The [native versus WebXR assessment](quest-native-vs-webxr.md) traces the provisional Three.js choice, compares capabilities and installed PWA delivery, inventories a possible Unity migration, and separates engine work from unfinished game features. Continue the existing application; Unity/OpenXR is an alternative only if future evidence warrants reconsideration. No native migration, IWSDK adoption or PWA implementation was authorized. The audited snapshot passed 60 tests and typechecking; concurrent opponent changes arrived afterward and were not evaluated. Only read-only device/version checks occurred, not a headset usability or performance trial.

The [dataset review](dataset-review.md) evaluates four owner-supplied PDFs: two dated tactics references, the Red Team Handbook, and a 2026 review of educational wargaming research. The [dataset catalog](../datasets/README.md) links the originals; D01–D04 in the source register pin editions and hashes.

The [unit catalog and data-source review](unit-catalog-and-data-sources.md) locates named Command units, explains the boundary between manuals and equipment databases, verifies public WEG and service references, and proposes six initial unit families plus six later candidates. Source specifications remain separate from authored game movement and adjudication rules.

**Opponent follow-up, 2026-09-16:** the owner requested Red opposition with adjustable difficulty and research into training. The [opponent study](opponent-ai.md) audits the implemented geographic mechanics, compares behavior trees/search/learned policies/small language models, and proposes a staged build. Its [executable probe results](opponent-probe.json) establish headless mechanics feasibility, not competitive strength. This new direction supersedes treating human-only opposition as the sole next research path.

## Main findings

**Scenario-library follow-up, 2026-09-16:** the owner authorized eight researched scenarios, one historical and one plausible fictional exercise per requested region. The [library](../scenarios/README.md) supplies briefs, original adjudication, two-sided scorecards, terminal JSON definitions, an offline calculator and an [AI/human evaluation protocol](../scenarios/ai-evaluation.md). SPR-H01 is the first implementation candidate. These are authored scenarios awaiting playtesting and app integration; no model has been trained. [SC01–SC13](../scenarios/sources.md) record historical sources and disagreements.

**Objectives follow-up, 2026-09-16:** the [victory and scenario study](objectives-and-victory.md) compares Command's authored objectives with Littoral Commander, Flashpoint, Combat Mission and Hedgemony. It recommends an asymmetric **Island Resupply** exercise with explicit delivery/deadline outcomes. This supersedes the symmetric cargo race as the preferred playable scenario; the race remains an optional engineering fixture. The recommendation and numeric thresholds remain proposals, and Red still needs executable disruption rules.

**Data-capture follow-up, 2026-09-16:** the owner confirmed capture as a major pillar for trends, analysis, and future model training. The [design](../design/data-capture.md) audits current journals, records a synthetic serialization/replay check, compares storage approaches, and proposes decision/observation capture, analysis and dataset exports. The collector is not implemented; sources DC01–DC05 document storage and interoperability references.

**Equipment implementation follow-up:** the owner subsequently authorized a Chinese Red / US Blue catalog for 1980 onward. The [catalog guide](../../catalog/README.md) records the four-export ODIN import, SQLite database, versioned playable laboratory definitions, component evidence and browser tests. This supersedes the earlier fictional-only catalog proposal; source facts and authored game rules remain separate.

1. **Treat learning and interface as separate choices.** A tactical decision exercise can use a tabletop; an operational game can include first-person observation. Neither echelon determines the renderer.
2. **Prototype a headset-first tabletop for 2–4 players.** That starting experience is confirmed. Our recommendation is a small fictional scenario, human opposition, referee control, limited information, and an after-action review. Passthrough versus fully virtual surroundings remains open; first-person observation can be explored later.
3. **Keep two viable technical paths.** Meta currently recommends IWSDK for immersive web development. Unity provides a mature native OpenXR route, and the owner's prior project already uses it. Unity does not directly support WebXR export without additional tooling. [Q03](sources.md#q03), [Q04](sources.md#q04), [Q12](sources.md#q12)
4. **The prior repository is useful but narrower than this product.** It contains native passthrough/room-understanding work and a separate camera-overlay website. Read the [audit](prior-project-audit.md) before reuse.
5. **Use actual rules as design references.** The [game survey](wargames-and-rules.md) distinguishes downloadable rules, documented institutional use, vendor descriptions, and access gaps. It does not propose cloning a commercial game.
6. **Make the review of decisions a core feature.** Preserve orders, assumptions, information available, outcomes, and facilitator explanations. This is our product recommendation, informed by the educational sources in [learning and adjudication](learning-and-adjudication.md).
7. **Use the new documents to improve facilitation and assessment first.** Trial explicit assumption checks and record learning conditions, decision processes, and outcomes. Treat the tactics publications as dated background for authored scenarios. The [dataset review](dataset-review.md) explains the evidence and proposed adaptations. [D01](sources.md#d01), [D02](sources.md#d02), [D03](sources.md#d03), [D04](sources.md#d04)
8. **Use CPE as a serious benchmark.** It already provides automation, planning, multiplayer, umpire controls, and diagnostics. The [study](command-professional-edition.md) checks the 2024 MCU manual against later releases. The [blueprint](../design/simulation-blueprint.md) proposes our own contextual guidance, shared order ownership, resource accounting, and referee history; their benefits still need testing.
9. **Build foundations for the AI Sensei before advanced agents.** The owner's three lines of effort connect executable practice, integration, and useful decision data. The [cloud and AI study](ai-sensei-and-wargaming-cloud.md) distinguishes reported institutional context from public evidence and proposes an API/headless baseline, historical observations, and separate evaluations of opponents and tutors.

## Reading order

| Reader's task | Read |
| --- | --- |
| Understand confirmed product scope | [Owner requirements](../product-requirements.md) |
| Use the owner-supplied PDFs | [Dataset review](dataset-review.md), then [local catalog](../datasets/README.md) |
| Choose the first implementation | [Architecture](architecture-options.md), then [prototype plan](prototype-plan.md) |
| Build our original operational simulation | [CPE study](command-professional-edition.md), then [simulation blueprint](../design/simulation-blueprint.md) |
| Choose units and source their behavior or equipment data | [Unit catalog and data sources](unit-catalog-and-data-sources.md) |
| Design agents, analytics, or an AI tutor | [Cloud and AI Sensei study](ai-sensei-and-wargaming-cloud.md), then [learning evaluation](learning-and-adjudication.md) |
| Build an adjustable Red opponent or decide whether to train a model | [Opponent research and implementation sequence](opponent-ai.md) |
| Capture decisions, compare exercises, or prepare training datasets | [Data-capture design and implementation sequence](../design/data-capture.md) |
| Build or evaluate Quest support | [Quest guide](quest3-development.md), then [prior project](prior-project-audit.md) |
| Decide between WebXR, an installed web app and native Quest | [Current platform assessment and migration scope](quest-native-vs-webxr.md) |
| Design a scenario or rules engine | [Manual review](manual-review.md), [games](wargames-and-rules.md), then [learning](learning-and-adjudication.md) |
| Run, score or train on the eight maritime exercises | [Scenario library](../scenarios/README.md), [adjudication](../scenarios/adjudication.md), [AI and human evaluation](../scenarios/ai-evaluation.md) |
| Verify a claim or refresh research | [Sources](sources.md), then [verification](verification.md) |

## Evidence conventions

- **Observed:** inspected in the local project during this research.
- **Documented:** supported by the linked publication; its scope and date still matter.
- **Owner-reported context:** information supplied in the conversation; distinguish confirmed product preferences from institutional claims awaiting independent evidence.
- **Proposed:** an XRiegsspiel design choice to test.
- **Unknown:** unavailable, not tested, or not established by the retrieved evidence.

“Currently listed” means listed on a page accessed on the research date. It does not prove an active installation, an exact software build, or use by every Marine or joint organization. Publication dates take precedence over search-engine crawl dates.

## Unresolved product questions

The audience, team planning scope, hybrid adjudication, usability needs, original-platform direction, initial 2–4 players, tabletop-first experience, eight-scenario authoring scope, and continuing with WebXR are confirmed in the [requirements](../product-requirements.md). Still open: which authored scenario to integrate first (SPR-H01 recommended), model detail, passthrough versus fully virtual surroundings, optional framework/packaging choices, hackathon duration/rubric, team skills, device/room arrangement, network restrictions, instructor availability, and session length. Ask about these one at a time only when needed; scenario authoring is already authorized.
