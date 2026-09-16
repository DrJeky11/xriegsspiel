# MCU manual review: making rules usable

**Reviewed: 2026-09-15.** Follow-up to the owner's [MCU Wargaming page](https://www.usmcu.edu/Academic-Programs/Wargaming/) recommendation. Read this with the [confirmed requirements](../product-requirements.md). The aim is to understand interaction and rule structure for an educational platform.

## Coverage and editions

The initial pass read seven of the eleven linked game manuals/help documents. A later CPE follow-up brought the total to eight and added the core CMO manual; a publisher manual also provided a separate Flashpoint reference. Long manuals were reviewed selectively. No game was played, and documentation does not establish behavior of the cloud's installed build. Page references below are one-based PDF pages unless marked “printed.”

| Linked document | Edition / size | Review coverage |
| --- | --- | --- |
| Company Commander manual | v1.05, 22 Oct 2024; 12 pages | Turn, movement, terrain, and action restrictions, pp. 2–4; combat/suppression passages, pp. 4–9. [W04](sources.md#w04) |
| Company Commander in-game help | Edition and length unverified | Link resolved; retrieval failed. [W28](sources.md#w28) |
| Littoral Commander digital help | No version/date established; 18 pages | All pages through OCR; visually checked pp. 1–2, 9, 12, 14. [W22](sources.md#w22) |
| Division Commander digital help | No version/date established; 18 pages | All pages through OCR; visually checked pp. 2, 11, 18. [W23](sources.md#w23) |
| Flashpoint Southern Storm manual | Linked beneath PE; size about 42 MB | Web reader size limit; full document not read. [W29](sources.md#w29) |
| Flashpoint FM01 Game Operations, MCU copy | About 19 MB; edition unverified | Web reader size limit; do not assume it matches the publisher copy below. [W30](sources.md#w30) |
| Flashpoint FM02 Professional Features | 31 Jul 2024; 57 pages | Introduction; §3 umpire, §4 command cycles, §22 ammunition, §23 resupply; associated excerpts. [W24](sources.md#w24) |
| Flashpoint FM17 Transport Operations | R3, 27 Sep 2024; 34 pages | Introduction and selected §§2–3 passages: capacity, orders, planner prerequisites, issue/cancel/delete. [W25](sources.md#w25) |
| Strategic Command WWI manual | No version/date established; 298 pages | §5.2 movement; §§5.6.10–11 reinforcement/upgrades; §§6.10–12 turn/supply; §§6.27–30 supply and readiness excerpts. [W26](sources.md#w26) |
| WarPlan manual | No version/date established; 57 two-page spreads | §6 sequence; selected §§11.4–12 logistics/supply, §14 movement/reconnaissance, §15.1 combat. Printed pp. 17, 60–65, 80–85. [W27](sources.md#w27) |
| Command PE user manual | v2.4, 13 Oct 2024; 181 pages | Download recovered. Selected multiplayer, umpire, planner, analysis, and model-extension sections; see the [dedicated coverage record](command-professional-edition.md#reading-coverage-and-continuation). [W31](sources.md#w31) |
| **Additional:** Flashpoint Cold War FM01, publisher copy | FCCW-01/R0, 5 Nov 2025; 159 pages | Selected §§21–22 orders/path planning, §§26–27 readiness/logistics, pp. 118–124, 141–143. [W09](sources.md#w09) |
| **Additional:** Core Command Modern Operations manual | 425 pages; file metadata 9 Feb 2023 | Selected orders, policy, information, scenario, cargo, database, and communications sections. This is the base manual referenced by CPE p. 7. [W32](sources.md#w32) |

MCU also describes DIGICAT, but supplies no game manual in that section. The tournament enrollment guide is administrative, outside this mechanics review. [W02](sources.md#w02)

## Findings from the manuals

### Company Commander: movement has consequences

Selecting a unit highlights reachable hexes. Enhanced movement uses a different highlight and prevents firing that turn. Normal movement can reduce fire effectiveness, while some units cannot move and fire. Terrain and enemy zones of control constrain movement. See pp. 3–4. [W04](sources.md#w04)

**Design implication:** a useful movement overlay needs distinct consequences, labels, and a legend. Display the effect on subsequent actions before commitment. A simple distance circle will not be sufficient for all games.

### Littoral Commander digital: allocations precede resolution

The help describes alternating task-force impulses; only the active task force may take core actions. Unit/stack actions combine movement with combat, concealment, or resupply, or use a card. Movement highlighting accounts for terrain and stack speed. The combat UI allocates ammunition and commits attacks before resolving the impulse's combat together. Resupply highlights eligible recipients and selects an amount. See pp. 1–3, 9, 12–14. [W22](sources.md#w22)

**Ambiguity to preserve:** p. 9 both limits movement to once per turn and describes continuing movement while points remain. This may mean one movement action with several destination selections; confirm before encoding that interpretation. The help has no established edition, and full parity with tabletop v2.8 remains unknown. [W22](sources.md#w22), [W05](sources.md#w05)

**Design implication:** distinguish selecting, allocating, committing, and resolving. Pending orders must reserve resources consistently without making the visual preview itself spend anything. Treat a stack as an explicit selection, with visible membership and cost.

### Division Commander: staff work changes action eligibility

The help gives five phases: sector intelligence, asset transfer, mode change, strike, then movement/combat. Phase-eligible units are highlighted. Support points and staff points support different activities; mode changes have costs, success chances, and fatigue effects. Transferred support points have reduced effective value during the current turn. Movement also pays for attacks; the display distinguishes maximum movement from movement that preserves attack capacity. See pp. 1–3, 7–18. [W23](sources.md#w23)

**Design implication:** this is a particularly useful interface reference for the owner's audience. Show the current phase's purpose, eligible formations, required inputs, and resulting capacities. A resource record may need both its owned quantity and its temporarily usable quantity. Do not label all such values simply “supplies.”

### Flashpoint: orders, timing, and referee control are separate concerns

**Professional features:** FM02 describes asynchronous WEGO, where orders and execution are separate. An umpire can edit units/state, change command-cycle timing, control visibility, and recalculate affected derived state. Ammunition can be counted by weapon/munition. Resupply settings trade desired recovery against time; order transmission/preparation can add delay. See §§1, 3–4, 22–23. [W24](sources.md#w24)

**Transport:** FM17 makes the plan a way to issue coordinated orders. Eligibility depends on transport/cargo capacity, route, and pickup/drop-off conditions. It explicitly distinguishes issuing a plan, cancelling its orders, and deleting the planning object: deleting does not cancel existing orders. See §§3.1–3.5. [W25](sources.md#w25)

**Commercial family reference:** the 2025 Cold War manual shows unit-specific orders, waypoint planning, arrival orders, and estimated arrival times. Orders may persist across command cycles. It tracks ammunition and readiness; it explicitly abstracts fuel for its time/distance scale. Rest/resupply trades time for recovery, and a scenario option can automate emergency ammunition replenishment. See §§21–22, 26–27. This does not establish identical PE behavior. [W09](sources.md#w09)

**Design implication:** an accepted order is not necessarily an accomplished action. Keep its status and timing visible. Name cancellation controls according to their actual effect. Instructor changes must refresh derived eligibility and explain affected orders. Record scenario options that materially change the learning exercise.

### Strategic Command WWI: state has several independent capacities

The manual distinguishes movement Action Points from remaining Strikes. Many units can be deselected and resumed; some types have exceptions. Reinforcing and upgrading have eligibility conditions and end that unit's action. The engine calculates supply, morale, entrenchment, action points, and visibility at turn start; additional processes run after ending the turn. Low supply constrains action points and reinforcement. See §§5.2, 5.6.10–11, 6.10–12, 6.28–30. [W26](sources.md#w26)

**Design implication:** “has acted” cannot always be one boolean. Maintain the selected game's separate counters and prohibitions. Refresh previews at phase boundaries and explain why a formerly available action has changed.

### WarPlan: bookkeeping includes networks and capacity

Players alternate control; the engine processes supply, production, repair, and other systems between turns. Land movement spends operation points according to terrain, weather, and zones of control; combat also spends operation points. Its supply rules distinguish sources, map supply, unit supply, and port stockpile capacity. Reconnaissance governs how much enemy information is displayed. See §§6, 11.4–12, 14–15.1. [W27](sources.md#w27)

**Design implication:** an operational logistics view should explain which connection or capacity limits a unit, and what a proposed allocation changes. Display a compact status on the piece, with the resource/network explanation available on selection.

## Proposed common behavior for XRiegsspiel

These are original implementation recommendations grounded in the owner's requirements. They are not rules copied from any one game, nor a commitment to implement all the systems above.

### 1. Calculate and explain available actions

Have the rules layer provide the same action evaluation to Quest and browser. For the current session revision and role, include:

- Available action types and permitted reasons for restrictions.
- Reachable destinations/eligible recipients and a route where relevant.
- Costs, reserved quantities, projected remaining capacity, and actions forfeited.
- Timing: immediate, scheduled, or awaiting a phase/impulse resolution.
- A short explanation plus the selected rules edition and section reference.

Revalidate on commitment because another teammate or referee may have changed state. Return an updated preview when necessary. Use labels and shapes alongside color, and make details readable without leaning over tiny counter text in VR.

### 2. Preserve uncertainty while explaining rules

Movement eligibility and outcome certainty are different. Hidden contacts can interrupt an otherwise valid order. Calculate the player's preview from permitted information; do not expose a secret enemy through a tooltip, unreachable hex, resource calculation, or predicted success percentage. Explain known constraints and mark unresolved assumptions appropriately. The authoritative resolver applies the full rules when execution reaches them.

Rules guidance should explain what is permitted and what it costs. Choosing a student's plan for them is a separate feature decision.

### 3. Automate records with understandable causes

Keep resource types and units explicit. A scenario may use strength points, ammunition rounds, abstract supply, staff effort, or command points; their update rules differ. Present current, reserved, projected, and maximum values only where meaningful. Show a short change history: the action or ruling, quantity changed, and resulting balance.

Implement one selected game's resource model first. Shared presentation can support different models later without collapsing their semantics.

### 4. Make contests a first-class referee workflow

Proposed sequence:

1. A player contests a specific result and gives a reason.
2. The referee sees the order, rule/version, inputs, recorded random outcomes if any, and relevant state.
3. The referee upholds the result, applies a scoped correction, or supplies a ruling for an unsupported case.
4. The session records the original result and subsequent ruling with author, reason, visibility, and affected state.
5. Recalculate affected previews and resume from a consistent revision.

If later actions depend on the contested outcome, define a pause/checkpoint policy before implementation. A correction must not silently invalidate those actions. Replaying from a checkpoint or branching an exercise should preserve the original history. Do not treat “contest” as permission for players to edit authoritative state or reveal opponent information.

### 5. Keep the first demonstration small and representative

Recommended scope: one original operational planning vignette with team discussion, a small board, game-specific phases, a consequential resource choice, automated resolution, one contest/referee intervention, and a short decision review. A manual reference is not a commitment to clone its game.

Use Division Commander for phase guidance examples, Littoral Commander digital for allocations/commitment, Flashpoint for order status and referee concepts, and the [CPE study](command-professional-edition.md) for mission-based simulation and a current comparison. Keep each source's rules separate. The [prototype plan](prototype-plan.md) translates the confirmed needs into checkpoints.

## Limits and next verification

This is a focused manual review, not a full formal specification or software audit. OCR was checked against selected rendered pages; uninspected illustrations and ambiguous wording remain possible gaps. Three linked documents remain unread: Company Commander help, Flashpoint Southern Storm, and MCU's FM01. The [source register](sources.md) records URLs, editions, download hashes, and access outcomes so another agent can continue without treating gaps as established rules.

Before implementing a named game's compatibility, verify the exact authorized edition, resolve relevant ambiguities, and test behavior against that edition. No third-party PDFs, screenshots, counters, or scenario data were added by the manual-review pass. The owner later supplied four research PDFs in `docs/datasets/`; the separate [dataset review](dataset-review.md) records their coverage and uses.
