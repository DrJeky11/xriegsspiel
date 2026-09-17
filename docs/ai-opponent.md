# Playable AI opponent

Implemented 2026-09-16 in the existing Three.js/TypeScript WebXR application. All eight authored maritime scenarios support complete matches against either side, with Novice, Standard and Advanced policies. These are original abstract games; this is not a trained military commander, a CPE integration, or evidence of teaching effectiveness.

**Sensei follow-up, 2026-09-16:** an optional locally trained teaching-hint selector now supports Second Thomas Resupply. Add `sensei=pilot` to the Pacific workspace URL; use **Ask for a teaching hint**, or **Exercise controls → Sensei teaching hint** in the controller panel. The [training runbook](training/guided-policy-v1.md) records launch, evaluation and limitations. This policy selects explanation topics; the opponent continues to use the authored planner described below.

## Play

1. Run `npm run dev`, or `npm run build` followed by `npm start`. Open Pacific or CENTCOM and choose **Menu → Play against AI**.
2. Choose a scenario, your side and difficulty. **Second Thomas Resupply** also offers **Baseline** (transports ready round 1) or **Short window** (ready round 3). Baseline is the default in the AI chooser. Short window keeps the same six rounds, six pressure tokens and victory thresholds. This explicit scenario setting applies equally to both sides and is independent of difficulty.
3. Read your mission, briefing and reports. Choose a unit/staff group and an available order, then **Add order to plan**. Select a miniature or roster entry to choose its unit. Selecting a highlighted water hex previews its route. Use at most three CP and three orders; each mobile asset acts once. An adjacent response launch can spend its action to escort a named vessel.
4. **Review plan**, then **Confirm and seal**. An empty plan holds. The AI has already committed before your planning window opens. Resolve together, review the events, then open the next round. Arriving at Outpost is not delivery: deliver each manifest with a later action.
5. Finish the final review to score. Inspect earlier rounds, the information available before your decisions, and the AI's chosen orders, alternatives and search effort. **Export replay & decisions** includes both sides' historical observations after completion. Diagnostic points do not override mission or shared-rescue requirements.

The existing six map assemblies remain independent. **New scenario** creates another AI run; **Saved runs** resumes earlier ones. Cross-workspace navigation selects the scenario's original terrain. New matches use actual water hexes, visible Red patrols and position-dependent interception. Objective areas have green outlines; selected ships show reachable destinations and route previews. See the [geographic rules](ai-geographic-rules.md). Generic miniatures identify the scenario's actual actors rather than substituting US/China catalog identities.

### Quest controllers

Choose **Play against AI** from the tabletop panel. Trigger buttons select scenario/side/difficulty, browse paginated unit and staff actions, build/review/seal a plan, inspect reports/events, advance rounds and open exercise controls. All these actions use the same server commands as the browser. Use the side grip to reposition/hide the panel using the existing menu handle. Grip a ready ship on your side, lower it over a reachable water hex and release to add its route to the plan. Review and seal using the trigger buttons. Pointer selection and the movement destination list offer the same route preview. Changing rounds, disconnecting or cancelling invalidates a held draft. File exports and invitation copying use the browser menu.

Desktop `?controller-preview=1&palette-review=1` exposes the exact controller callbacks for verification. It is not headset emulation. Physical Quest readability, input comfort, MR contrast and sustained frame rate still require the [hands-on checklist](playable-terrain.md#hands-on-quest-checklist), plus a complete AI match in each workspace.

## Difficulty and information

| Level | Planning budget | Behavior |
| --- | --- | --- |
| Novice | No forward simulation | Immediate mission priorities with reproducible seeded variation |
| Standard | Up to 24 complete plans, one predicted reply, one round | Coordinates a whole round and accounts for an expected opposing plan |
| Advanced | Up to 12 plans, three predicted replies, three rounds; at most 108 attempted transitions | Compares plausible replies and weighs weaker outcomes as well as average progress |

All levels receive the same role-filtered observation and legal choices, resources, delays and score rules. They cannot see the human's draft, actual sealed orders, opposing private reports, unverified truth or future injects. Search constructs a hypothetical world from its observation. It may assume previously available navigation/evidence records were verified, and predicts future actions through authored baseline policies; those are beliefs, not access to hidden state. Forecasts do not insert future report or availability cards.

`geographic-planner/1.0.0` combines authored task priorities with bounded lookahead, including rescue deadlines and capacity. Historical articles and supplied PDFs informed design; no imitation or reinforcement-learning model was trained. Stronger compute budgets do not guarantee stronger play in every position. The additional lookahead is not validated expert-level play; the geographic development comparison below records its actual results.

Geographic decisions run in a worker with a three-second deadline (legacy sector decisions retain one second). A failed, invalid or late decision becomes legal Hold and is disclosed in the audit. It cannot freeze the match or invent an action. Normal server-side planning is local and uses no model API or new dependency.

## Authority, saves and referee

The creator receives separate random player and referee capabilities. The server stores their hashes; the browser stores the keys locally for resumption. **Copy team invitation** shares only same-side control. Teammates share one plan submission authority; they do not receive separate command budgets. Keep the invitation and creator browser if you need to resume from another device. These capabilities implement exercise access, not verified personal accounts or public-hosting infrastructure.

The application stores authoritative AI runs in `DATA_DIR/exercises.sqlite` through the shared capture service, in separate opponent tables. Round checkpoints, role observations, sealed plans, policy versions/seeds, accepted and rejected commands, events and audit are retained. Accepted state and decision records commit transactionally. Exact command retries apply once; stale revisions reject. Restart verifies deterministic replay. One server process may own a data directory. The AI's current portable record is **Export replay & decisions**; the geographic archive UI remains a separate workflow. The capture integration also retains historical observation IDs, original source artifacts and role-scoped learning records; training permission is unspecified, not assumed.

Open **Scenario learning records** from Pieces & orders, or `/scenario-review.html`, for historical role views, command results, retrospective notes and learning exports. During play, access follows the invitation role; completed exports include both sides and preserved referee branches. See the [exercise database guide](exercise-database.md) for backup/restore and capture limitations.

Standalone sessions without the capture service use flushed atomic JSON saves at `DATA_DIR/opponents/<run-id>.json`. Existing JSON runs are verified and imported when opened by the database-backed application; the source file is preserved.

Pause freezes submissions and advancement. A player may contest a visible current-round event during review. Advancement stays frozen until the creator enters **Referee controls** and records either an uphold ruling or a new replay branch. A replay retains the old branch in the database (or `opponents/branches/` for standalone JSON sessions), records the reason and disclosure, and marks the run as referee modified. Referees can explicitly take over either side during planning and restore AI control. They cannot silently inspect an uncommitted AI plan. Referee-modified episodes are teaching runs, excluded from clean policy comparison.

The first version supports uphold/replay and takeover, not arbitrary editing of scores or incident flags. Rejected orders are not classified as deliberate breaches. Legal play keeps conduct penalties at zero. New runs pin scenario 2.0.0, geographic rules 1.0.0, terrain provenance and `maritime-engine/2`. Earlier sector runs retain their original library and `maritime-engine/1` resolver for deterministic replay; starting a new run opts into geography.

## Runtime rules

Select your ship and a highlighted water hex, or choose **Movement destinations → Preview route**. Review the route's movement cost and patrol warning, then **Add route to plan**. Mission actions become available only at their objective area and use a later action. Use **Focus selected ship** or the objective buttons to inspect the board. Ships retain their hex positions across rounds and saves. Each round's review names actual movement and interception locations.

The [geographic rules](ai-geographic-rules.md) define water passability, tick-by-tick traffic, four-point movement, adjacent interception, escort assignment, offshore transfer and version compatibility. These are authored game rules, not real-world performance or legal conclusions.

## Verification and limits

**Owner MR trial, 2026-09-16, 7:45 p.m. EDT:** the owner started Second Thomas Resupply as Blue against Standard AI with the Short window variant, resolved two rounds and stopped at round 3 planning. The [test review](quest-test-2026-09-16-1945.md) records accepted commands and positive table/menu/visual feedback alongside major gaps in first-time orientation, results explanation and map/mode continuity. This is a partial physical-headset trial, not a complete-match or learning-effectiveness validation.

The geographic update has separate evidence from the first sector prototype. Automated checks cover all eight native deployments, water-only paths and budgets, native render coordinates, Sierra Madre's landmark, spatial interception and bypass routes, escort protection, finite delays, objective eligibility, simultaneous collisions, private-information invariance, deterministic play at every difficulty/role, and the worker boundary. HTTP tests create all eight geographic scenarios in both roles, finish/export them, restart the service, and check that all six map assemblies remain unchanged. Legacy sector and capture/replay checks remain in the full suite.

The development comparison is recorded in [geographic evaluation](research/opponent-geographic-evaluation-2026-09-16.json). Reproduce it with `npm run evaluate:opponent -- --seeds 1 --output /tmp/geographic-evaluation.json`. It compares three difficulties in both roles across all eight scenarios against four authored baselines. This is neither a held-out policy evaluation nor a human learning study. Difficulty changes planning effort; it does not guarantee a monotonic win rate. Instructor trials and scenario calibration remain necessary.

The [earlier 768-game sector comparison](research/opponent-evaluation-2026-09-16.json) and its 91-test/browser verification record describe the first engine, not geographic performance. Baseline is now the default because hex routing changes travel and interference; the short-window variant remains explicitly selectable.

The isolated geographic preview is `http://127.0.0.1:5187`, backed by `/tmp/xriegsspiel-geographic-ai-data`. Browser and controller-callback checks are distinct from physical Quest testing. Headset readability, grip comfort, MR contrast and sustained frame rate require the [hands-on checklist](playable-terrain.md#hands-on-quest-checklist). A large frontend bundle warning remains. No dependency was added and no trained model or teaching-effectiveness claim is made.

### Geographic verification record, 2026-09-16

TypeScript, production build and the full 106-test suite passed; no tests skipped. The 192-match development comparison made 1,392 evaluated decisions: direct-call latency p50 11.44 ms, p95 801.43 ms and maximum 1,197.70 ms on Node 26. Worker startup and HTTP add overhead; the geographic worker has a three-second limit. One seed per baseline is a small development sample. In Second Thomas Resupply, Standard/Advanced Red completed the mission in all four baseline matchups, while Blue's mission success was one of four at each difficulty. This is a meaningful scenario-balance limitation, not proof of expert opposition.

Browser checks on the isolated preview verified route preview and drafting, an actual R1 interception stopping B1 at hex 7,-13, R2 moving four water hexes, saved-state restoration, and the controller callback sequence for pickup, route selection, release, review and sealing. The callback-driven safe route moved B1 to 7,-14. Pacific-to-CENTCOM scenario switching and the native Hormuz terrain/ship controls were also checked. These checks do not establish physical grip tracking or headset comfort.
