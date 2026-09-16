# Agent guide

## Project context

XRiegsspiel is a training and education wargaming platform. Meta Quest 3 is the primary interface; browser participation is required. The owner described an MCU/NPS hackathon context. Do not imply institutional endorsement.

The primary learners are officers/staffs practicing operational planning and MCU/NPS students exploring military decision-making. Support the full team planning cycle. The owner confirmed game-specific turn sequences, automated adjudication with player contests and referee takeover, immediate movement/action guidance, and automated bookkeeping. Read `docs/product-requirements.md` for the current record. Start with 2–4 players and the headset tabletop experience; passthrough versus fully virtual surroundings remains open. No implementation stack, game license, scenario, network topology, or delivery schedule has been approved.

The owner wants an original platform informed by Command Professional Edition, not a CPE integration or license acquisition. Do not seek CPE software/account/cloud access. Read [the CPE study](docs/research/command-professional-edition.md) and [simulation blueprint](docs/design/simulation-blueprint.md) before simulation design work. Their specific architecture, cadence, and models remain proposals.

The owner highlighted agent development, integration, and analytics toward an AI Sensei. Read [the cloud and AI study](docs/research/ai-sensei-and-wargaming-cloud.md) before agent or tutor work. Preserve the distinction between reported institutional context and verified public capabilities. The reported 10,000-user cloud capacity is not our prototype target. Public CPE and HexWar documentation already describes headless/API capabilities. Keep playing strength, teaching quality, and referee authority separate.

## Before work

The first cooperative interaction prototype is implemented. Read `docs/prototype.md` before application work for its original rules, provisional Three.js/WebXR stack, commands, limits, and verification evidence. Shared full-information control is deliberate in this slice; future role, fog-of-war, and referee work must introduce the corresponding authority boundaries. Real headset usability remains pending until the recorded checklist is performed.

1. Read `README.md`, `docs/product-requirements.md`, and `docs/research/README.md`.
2. For platform work, read `quest3-development.md` and `prior-project-audit.md` in that directory.
3. For game behavior, read `manual-review.md`, `wargames-and-rules.md`, and `learning-and-adjudication.md` in the research directory.
4. Consult `architecture-options.md`, `prototype-plan.md`, and `sources.md` before choosing a stack or importing rules.
5. Read any more specific local `AGENTS.md` instructions.

## Working conventions

- Ask product clarification questions one at a time. Preserve confirmed answers instead of treating them as open choices.
- Produce a short plan for ambiguous or multi-step work. Prefer the smallest useful change and preserve established architecture.
- Check installed tools, package manifests, and compatibility before adding or upgrading dependencies. Research dated 2026-09-15 is a baseline, not a permanent version policy.
- The sibling `../mx-id-test` project is reference material. Its native Quest work and browser camera prototype are different applications. Do not copy its camera-upload runtime, branding, identifiers, or network configuration into this project by default.
- Separate game rules, authoritative state, player-visible information, and rendering. Headset gestures and mouse actions should express the same game commands.
- Pin scenario and rules versions. Keep adjudication and referee changes explainable and replayable. Record what each player knew when making a decision.
- Preserve a usable seated/controller path and browser controls. Test optional hand tracking and room features on the target headset.
- Read a rulebook's actual edition. A public download or military use does not establish permission to reproduce its artwork, data, or software.
- Label sourced facts, local observations, proposals, and unverified assumptions distinctly. Add URLs, access dates, and page/section locators to new research.

## Verification and handoff

Run relevant available checks. Desktop emulation, an installed editor, a successful build, and a headset test are different evidence. Report only what occurred.

Finish by summarizing changes, verification, and remaining risks. Update the research or decision record when a significant assumption changes. Do not add mandatory approval gates for ordinary reversible work.
