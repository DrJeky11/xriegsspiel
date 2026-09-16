# Product requirements and owner clarifications

**Updated: 2026-09-16.** This records the owner's answers in the project conversation. It takes precedence over earlier research assumptions. Acceptance examples below are proposed ways to verify the requirements, not implemented behavior.

## Confirmed direction

| ID | Owner requirement | Practical meaning |
| --- | --- | --- |
| R1 | Quest 3 is the primary interface; browser play is required | Both interfaces support participation in the same wargame, including issuing orders. |
| R2 | Officers and staffs practicing operational planning; MCU/NPS students exploring military decision-making | Prioritize team planning and coordination. Tactical games remain useful references, without making individual tactical training the primary audience. |
| R3 | Support the full planning cycle as a team | Develop plans, test them against opposition, adapt to events, and compare decisions and tradeoffs. These are complementary needs. |
| R4 | Turn actions depend on the wargame | Reconnaissance/discovery, engagements, movement, planned attacks, and sustainment are examples, not an approved universal sequence. |
| R5 | Hybrid adjudication | Software normally resolves actions. A participant can contest a result and a referee can take over for a specific situation. |
| R6 | Reduce the time spent learning and repeatedly looking up rules | Explain the applicable rule at the decision point and make action eligibility clear. |
| R7 | Selecting a piece immediately shows its legal movement | Show the reachable board area for the current unit, state, and rules. |
| R8 | Show and explain the actions a selected piece can perform | Connect the action list, map highlights, requirements, and consequences. |
| R9 | Automate supplies, troop strength, and similar bookkeeping | Replace tally marks and small card annotations with clear, maintained state. |
| R10 | Start with 2–4 players, each joining through a headset or computer browser | Support mixed-device sessions. The exact headset/browser split and room arrangement remain open. |
| R11 | Work through the headset tabletop experience first | Develop the shared board's appearance and spatial interaction before exploring the owner's other experience idea. |
| R12 | Study CPE to build our own substantially improved platform | Use public documentation as a design reference. The owner has no CPE access and explicitly does not want us to obtain or use it; CPE integration is not the implementation goal. |

The owner's central problem is the friction of operating a wargame: learning mechanics, checking legality, and maintaining records. The platform should leave students more time to reason and discuss their plans.

## Headset tabletop discussion

**Owner direction, 2026-09-15:** the owner is considering both fully virtual surroundings and passthrough with a digital map placed on a selected real table or flat surface. Their concern about passthrough was the perceived need to train a model to recognize physical unit/weapon cards; they do not currently have that recognition capability available. Passthrough versus fully virtual surroundings remains under discussion, not a final implementation decision.

**Documented distinction:** passthrough can display the room behind virtual content. Surface placement can use platform-provided spatial information; it does not require the application to recognize printed game cards. Meta documents browser passthrough and planes separately, and native MRUK provides surface placement utilities. Native and browser feature availability must be checked independently. [Q07](research/sources.md#q07), [Q22](research/sources.md#q22).

**Proposed first experience:** keep the map, pieces, and unit cards digital; show them on a board positioned over the real table. Start with controller placement, rotation, size, and height adjustment. Evaluate selecting a platform-reported surface as placement assistance, while keeping manual placement usable without room data. Browser players render the same role-appropriate game state in their own board view. A fully virtual setting could reuse the digital board as a fallback; this is a proposal, not a commitment to ship two modes.

**Still unverified:** placement stability, surface coverage, readability, comfort, and performance on the actual Quest. Aligning multiple headsets over the same physical table is a separate spatial-alignment task from synchronizing their game state.

## Strategic context: cloud, agents, and an AI Sensei

The owner highlighted MCU's Wargaming Cloud, HexWar, global Fight Club participation, and three institutional lines of effort: agent development, agent integration, and data analytics. The stated long-term purpose is an **AI Sensei** that helps learners improve their judgment as commanders. AI includes search, imitation learning, and reinforcement learning as well as LLMs.

The owner also reported 10,000 simultaneous cloud users, CPE's role as the main modern platform, NPS work on APIs/agents, and agents selecting optimal courses of action for both sides. Preserve these as **owner-reported institutional context**, not verified deployment facts or new capacity requirements for our initial 2–4 player prototype. The scope of the reported API/headless limitations remains unclarified; public CPE and HexWar documentation describes such capabilities.

The [AI Sensei and cloud study](research/ai-sensei-and-wargaming-cloud.md) records every note, its evidence status, the different AI methods, and proposed implementation/evaluation steps. A shared API, headless runner, and decision history are recommended foundations; advanced AI, commercial integration, and cloud scale are not approved first-build commitments.

## Proposed first user journey

1. Join a team and receive the scenario briefing and role-appropriate information.
2. See the current phase, its purpose, and which team or formation can act.
3. Select a piece. Its movement area, remaining capacity, available actions, and relevant restrictions appear immediately.
4. Preview an action. See the intended route/recipient, cost, remaining resources, and effects on subsequent choices.
5. Commit the order. The software validates it against current state, resolves it at the selected game's appropriate time, and updates the records.
6. Inspect the explanation. If disputed, submit a contest tied to that result for referee review.
7. Continue after a recorded ruling and review important decisions with the team.

This describes an interface workflow. It does not replace a game's sequence of play or require every action to resolve immediately.

## Proposed acceptance examples

| Need | Evidence to collect |
| --- | --- |
| Immediate movement help | On both Quest and browser, select a unit and identify its reachable area without opening a manual. Recalculate after a state change. |
| Understand consequences | Preview a destination that consumes capacity needed for another action; the interface explains that consequence before commitment. |
| Understand restrictions | An unavailable action gives a specific, permitted reason such as wrong phase, insufficient supply, or already acted. |
| Reliable bookkeeping | An accepted action updates all affected records once; retry/reconnect does not spend twice. A cancelled draft spends nothing. |
| Meaningful referee intervention | Contest one resolved outcome, inspect the evidence, record an upheld or changed ruling, and resume consistently on both clients. |
| Team planning | Participants explain a shared plan, respond to one changed condition, and discuss an alternative during review. |

Measure time to first valid action, external rule lookups, bookkeeping corrections, and instructor assistance, alongside reasoning and comfort. Establish baselines in a small trial before setting numeric targets. Faster clicking alone does not show better decision-making.

## Equipment catalog direction — 2026-09-15

The owner authorized research and implementation of a database of playable parts and pieces, with **Chinese forces as Red and United States forces as Blue**, concentrating on **1980 onward** and using **Army ODIN / Worldwide Equipment Guide** as the primary equipment source. This supersedes the earlier recommendation to restrict the catalog to fictional unit families. Equipment facts, operator/era evidence, original gameplay parameters, and visual assets remain separate records. The requested scope is a reusable catalog; it does not select a real-world deployment or approve a particular combat-resolution model.

Implementation default pending further owner clarification: one individual platform or equipment item per piece; later formations can compose these definitions. Preserve unknown dates rather than making every system available in 1980. Older equipment is retained with continued-service review outstanding. The [catalog guide](../catalog/README.md) records the 1,607-record database, original laboratory rules, source/variant limitations and actual verification. Laboratory eligibility uses source operator and introduction assertions, not verified historical service intervals. This default does not select the echelon or rules of a future operational scenario.

The owner also reported that pieces could be moved during the initial hands-on trial. This is evidence of basic interaction only; the full headset checklist remains incomplete.

## Remaining open choices

- First original scenario, rules, and level of model detail. Any later adaptation of a named game is a separate choice.
- Passthrough versus fully virtual surroundings for the initial tabletop, any later first-person observation, and the implementation stack. WebXR remains a research recommendation.
- Headset/browser split within the initial 2–4 players, whether teams share a room, and remote participation needs.
- Development time, session length, venue network, and instructor availability.
- How much rule/scenario editing facilitators need, and when contests pause play.

Ask the owner **one question at a time**. Do not re-ask the audience, full planning-cycle scope, adjudication preference, or stated pain points as if they were unknown.

## Implementation references

**First prototype authorized, 2026-09-15:** the owner asked to build something small, test it, and then expand. The [first prototype record](prototype.md) documents the implemented original cooperative movement/delivery slice and provisional Three.js/WebXR stack. It does not approve or implement all proposed multiplayer, WEGO, opposing-side, or referee behavior. The final immersive mode and longer-term stack remain subject to actual headset evidence.

- [Manual review](research/manual-review.md): concrete examples and source coverage.
- [Architecture](research/architecture-options.md): proposed authority, information, and replay boundaries.
- [Prototype plan](research/prototype-plan.md): a bounded implementation sequence.
- [Learning and adjudication](research/learning-and-adjudication.md): facilitation and assessment.
- [CPE reference study](research/command-professional-edition.md): documented mechanics, current release differences, and improvement hypotheses.
- [Original simulation blueprint](design/simulation-blueprint.md): proposed objects, execution, resources, explanations, referee handling, and validation.
- [AI Sensei and cloud study](research/ai-sensei-and-wargaming-cloud.md): strategic context, agents, API/headless execution, analytics, and teaching evaluation.

## CPE scope clarification

The owner's initial wording about implementing Command Professional Edition was clarified on 2026-09-15: understand how it works so XRiegsspiel can be an original, substantially better experience. Do not treat a missing CPE license as a blocker, design an adapter by default, or seek access to MCU's cloud. Public documentation research is authorized. Improvements remain goals to demonstrate, not established comparative results.

## CENTCOM terrain direction — 2026-09-15

The owner requested terrain for two locations: **Strait of Hormuz** and **Bab al-Mandeb**, with **hexagonal map tiles**. This work runs alongside the playable-piece database and Pacific terrain tasks. Geographic terrain is the scope; the request does not select force deployments, movement costs, combat rules, or an existing commercial scenario. The [CENTCOM terrain record](centcom-terrain.md) documents the implemented regional grids, sourced coastlines, authored relief, and remaining headset checks. Grid spacing and regional bounds are implementation choices. A seamless global hex indexing scheme remains a separate design decision.

## Pacific terrain direction — 2026-09-15

The owner requested terrain near the **Philippines / South China Sea**, referring to Sierra Madre and nearby shoals, and near **Taiwan / the Senkaku Islands**, with **hexagonal map tiles**. BRP Sierra Madre is represented as a ship landmark on Second Thomas Shoal (Ayungin), separately from the reef. The terrain work is independent of the playable-piece catalog. The [Pacific terrain record](pacific-terrain.md) documents the implemented sourced coastlines, reef/lagoon geometry, regional hex grids, and close-up views. Regional extent, 18 km overview spacing, and 750 m focus spacing are implementation defaults; no operational scenario, movement rules, force deployment, or combat model is implied. A seamless global hex index and surveyed depth/elevation layers remain future work.

## Terrain menu direction — 2026-09-15

The owner selected generated option **01, corner buttons and sliding drawer**, and authorized implementation across the existing Pacific and CENTCOM maps. The map receives the full workspace width; the right menu starts hidden and opens only on request. A separate corner button toggles place labels without opening the menu. Existing region, scale, inspection, layer, source, and export controls remain available. The implementation starts labels off, matching the selected concept, and retains that choice when switching maps within a workspace. Browser layout is shared across all six terrain views, including narrow screens; actual Quest usability remains unverified.

## Geographic integration milestone — 2026-09-16 UTC

The owner requested a working catalog/geographic tabletop slice: map/year setup, Red/Blue assembly, recognizable pieces, inspectable rules/source evidence, hex movement and transport, save/reopen, browser/Quest paths, and verification. This authorizes the integrated scenario workspace described in [the implementation record](geographic-scenario.md). Western Senkaku / 2026, an untimed budget turn, seven demonstration pieces, conservative coast/reef rules and 200-instance limit are documented implementation defaults. They do not establish real deployments, model fidelity, historical service intervals or a universal cadence for other games. Combat, detection, fog of war, AI and opposing-player permissions remain outside this milestone. Hands-on headset usability remains pending.

## Consolidate play into Pacific and CENTCOM — 2026-09-16

**Confirmed owner direction:** preserve the current project in Git before removing superseded application features. Keep a local `main` baseline, use a feature branch for the consolidation, and begin publishing work to the project's remote repository.

- Retire the Island Coordination mock exercise from the active application. The owner considers its initial immersive interaction experiment successful; this does not establish verification of every later headset feature. Preserve its implementation in the baseline history.
- Make the existing **Pacific** and **CENTCOM** workspaces, including their regional and focus maps, the primary places for map building and play.
- Preserve their existing terrain presentation, including coastlines, relief, reef/lagoon features, labels, inspection and display controls. Their authored heights remain illustrative; no measured elevation or bathymetry is implied.
- Bring catalog selection, individual piece placement, movement, transport and associated bookkeeping into those workspaces, using the existing equipment database and shared validated rules.
- Make selection, placement and play available in both browser and immersive VR/MR. The current browser-only catalog assembly path does not satisfy this direction.
- Retire the separate Geographic tabletop entry point after its useful mechanics have been integrated. Do not replace the established maps with another simplified presentation.

**Local observation:** Geographic tabletop already reuses the original geographic datasets and map builders. However, its CENTCOM adapter reduces `upland` to `land` and `coastal-water` to `ocean`, omits original relief and landmark presentation, and uses the Pacific renderer. Preserving the original CENTCOM renderer and terrain detail is a concrete integration requirement, not a request to source replacement geography.

**Implementation sequence:** preserve the baseline; integrate shared piece commands and state with each existing terrain workspace; add controller-accessible catalog selection and placement; remove obsolete application routes and mock-exercise code; then verify terrain preservation, browser workflows, persistence and immersive input separately. The existing browser/VR/MR paths and the new parity requirement must be reported as implemented versus actually tested.

**Confirmed follow-up:** each map retains its own pieces and progress when switching regions or workspaces. Starting a new exercise replaces only that map. The owner also explicitly approved pushing the complete existing baseline, including catalogs, PDFs and source datasets, to `https://github.com/DrJeky11/xriegsspiel`.
