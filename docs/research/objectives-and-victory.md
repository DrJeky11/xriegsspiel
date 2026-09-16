# Objectives, victory, and our first opponent scenario

**Research: 2026-09-16.** The owner asked how Command and other modern wargames determine success, to help choose our first scenario. Source findings below are distinct from the proposed XRiegsspiel exercise. No scenario, scoring threshold, combat rule, or training reward has been approved or implemented by this research.

**Authoring follow-up, 2026-09-16:** the owner subsequently authorized the [eight-scenario maritime library](../scenarios/README.md). Its SPR-H01 develops the resupply idea with a six-round starting design, explicit pressure/assurance rules and an offline score calculator. The eight-round sketch below remains the earlier proposal, not the current library's rule. All new parameters still require playtesting; the geographic app has not gained competitive adjudication from this authoring work.

## What is the objective of Command?

**Command has scenario-specific objectives.** The scenario author writes each side's briefing, defines events that award or deduct points, and sets result thresholds. The documented range includes Triumph and Disaster; campaign progression can require a separate pass score. The editor explicitly supports making a critical mission outweigh routine attrition, or making the loss of an irreplaceable unit decisive. [W50](sources.md#w50), §§5.4.5–5.4.6.

Scoring and termination are separate: an event can change points or end the scenario. Triggers include entering an area, remaining there for a duration, detection, damage/destruction, time, and side-score thresholds. These support many objective types. An assigned mission governs unit behavior; its existence alone does not define victory. [W50](sources.md#w50), §§5.2.1–5.2.2, 5.5.1, 5.5.3.

A concrete example is the manual's **Trapped Under Ice, 1999** tutorial: success centers on one designated submarine, even at the cost of the player's own; destroying other submarines is optional. This illustrates a scenario author's priorities, not a universal Command scoring rule. [W51](sources.md#w51), §10.4.1.

These are public **Command: Modern Operations** references. The [CPE study](command-professional-edition.md) explains the professional supplement's relationship to the base manual. We did not run either product or verify identical scoring behavior in every professional configuration.

## How other modern wargames decide the result

This is a sample of documented designs, not a universal standard or a comparison of simulation accuracy.

| Game / edition examined | Documented outcome structure | Design lesson for us |
| --- | --- | --- |
| **Littoral Commander: Indo-Pacific**, rules v2.8, Second Printing | Each team checks its scenario's victory conditions at the victory-check stage. The worked example combines a passage objective and turn limit with destruction alternatives. | Define each side's task and exactly when it is evaluated. Different forces need not have identical objectives. [W05](sources.md#w05), §3.5 p. 9, Appendix B pp. 43, 46. |
| **Flashpoint Campaigns: Cold War**, FM01/R0, 2025-11-05 | Victory points account for retaining forces, enemy losses, strategic locations, and other adjustments. Results have degrees such as marginal, tactical, and decisive, plus contested. | Show both the outcome and its component costs. A binary badge can hide substantial differences. [W09](sources.md#w09), §15.1.2 p. 82. |
| **Combat Mission: Shock Force 2**, base-game manual | The after-action report separates ground, target, and parameter objectives. Examples include occupation, preserving a building, spotting units, and limiting casualties. | Success can depend on observing or preserving something, as well as capturing or destroying it. [W52](sources.md#w52), p. 44. |
| **RAND Hedgemony**, 2020 player guide | Influence measures victory. Scenario goals may use absolute or relative thresholds, may differ by player, and can allow multiple winners. The guide places teaching ahead of winning. | Strategic and educational games can need more than a single zero-sum winner. [W53](sources.md#w53), printed p. 7 / PDF p. 13. |

**Our synthesis:** specify the desired end state, deadline, acceptable costs, and outcome rules together. Decide separately whether the exercise ends immediately on success or continues to a fixed assessment point. Make the result explainable from recorded events. A referee can adjudicate a contested result under the platform's intended workflow; the opponent must not set its own score.

## Recommended scenario: Island Resupply

**Proposal:** an original, fictional exercise on a bounded island map. Blue must resupply an outpost before its deadline. Red must deny or delay sufficient delivery. Preserve the owner's US/Blue and China/Red catalog direction, while making the roster, positions and game capabilities explicitly authored. Existing terrain may supply a backdrop; no actual deployment or national behavior is implied.

This is the preferred first **playable opponent scenario**, superseding the earlier symmetric cargo race recommendation. The race remains useful as a small engineering fixture. Resupply gives Red a distinct purpose and gives Blue a reason to coordinate transport and protection under time pressure.

| Candidate | Decisions it can exercise | Additional mechanics beyond today's geographic tabletop |
| --- | --- | --- |
| **Island Resupply — recommended** | Allocate transport, schedule deliveries, protect capacity, adapt when a plan is disrupted | Supply manifests and delivery credit, competitive turns, a bounded interaction that lets Red disrupt delivery, outcome rules |
| Hold an objective until relief | Commit or retain resources, contest control, decide when to withdraw | Control/contest rules, relief clock, engagement/effect model |
| Evacuate personnel before a deadline | Prioritize limited capacity, coordinate pickup and exit, protect passengers | Passenger/exit accounting, disruption rules, evacuation outcome rules |

The initial learning question is: **Can a team complete its assigned mission, explain the resources it risks, and adapt when opposition disrupts its plan?** Record the pregame plan, revisions, and information available at those decisions. Evaluate this separately from the final score, following the [learning framework](learning-and-adjudication.md).

### A concrete first scoring draft

These numbers are **arbitrary starting values for playtesting**, not Command rules or validated logistics assumptions:

- Four uniquely identified supply manifests start available to Blue. Each can be delivered only once to one designated outpost. A delivery requires an accepted transfer into the outpost's inventory; arriving nearby or unloading elsewhere does not count.
- Play eight complete rounds. Both sides receive their decision window before a round ends. For initial full-information tests, alternate the first side each round and compare both initial starting orders.
- At the end of round eight, **three or four deliveries give Blue victory; zero or one gives Red victory; two is a contested result**. This covers every possible delivery total without both sides receiving incompatible winner labels.
- Keep the exercise running to that fixed endpoint in the first specification. An early-end optimization can come later if it preserves every recorded outcome measure, including costs.
- Record delivery count, delivery times, cargo lost, and each side's surviving capacity in the after-action report. Once losses are modeled, label a mission success with heavy losses accordingly. The primary winner still comes from the delivery threshold; incidental enemy losses cannot compensate for missing it.
- Define any later critical-loss or prohibited-action condition explicitly in the scenario and its priority over the ordinary result. None is silently included in this initial draft.

For example, Blue delivering three manifests wins the mission even if Red causes more losses. Blue delivering only one loses it even if Blue destroys more enemy pieces. This deliberately makes mission accomplishment the opponent's goal. Force preservation remains a visible cost, and a future scenario can explicitly elevate it to a mandatory condition.

### What Red needs in order to oppose the mission

**Observed foundation:** the geographic game supports movement, layered occupancy, piece cargo, holds, budget refresh, authoritative commands and replay. Its equipment catalog is not an executable combat model. Cargo presently represents pieces; it does not yet implement supply consumption or this manifest objective. See the [code audit and probe](opponent-ai.md#what-exists-and-what-is-missing).

**Missing:** meaningful interference with delivery. Occupancy alone is not evidence of a balanced denial game. Before calling this an opposed resupply scenario, specify an original, limited contest/effect rule with legal conditions, costs, duration, recovery, and an explanation of what happened. Transport and protection must both affect the result. This could begin with abstract disruption/disablement; weapon-level combat and detection are separate expansions.

The small first build therefore needs:

1. A fixed scenario manifest: map, roster, start state, cargo/objective IDs, rules versions, deadline and outcome thresholds.
2. Enforced side ownership, side turns, frozen assembly during play, facilitator pause/takeover, and replayable objective/end events.
3. A tested disruption/protection interaction so both sides can change delivery prospects. Specify it before training; do not derive invented damage or detection probabilities from equipment descriptions.
4. An authored Red policy that scores plans by their effect on denying delivery, time remaining and its own available resources. Blue's planning objective differs. The same framework can host both roles.
5. Complete headless episodes and an after-action report before difficulty tuning or model training.

Start with declared full information. Add fog of war only with a defined observation model; neither difficulty nor a model gets access to hidden truth. For an asymmetric exercise, compare Red policies against the **same frozen Blue opponents and scenarios**, then report results by role. Swapping roles does not make the two tasks equally difficult.

Use the actual mission result for evaluation and eventual training reward. Additional progress rewards must not create repeated unload credit or encourage postponing the mission for more points. Include tests for duplicate/replayed delivery commands, the last action at the deadline, irreversible cargo loss, both sides waiting, and pause/referee interruptions. Runner crashes and cancelled sessions are incomplete runs, not contested game results.

## Evidence and limits

This follow-up examined the official Command online scenario-editor and example-scenario sections, the Shock Force 2 manual's objective summary, RAND's player-guide victory section, and selected pages of previously retained Littoral Commander and Flashpoint manuals. [W50–W53](sources.md#w50) record new URLs and coverage; W05/W09 record the additional cached-file reading. These findings establish documented game designs, not hands-on execution or universal current-version parity.

No runtime rules changed, no scenario was played, and no balance, combat fidelity, learning benefit or opponent strength was measured. The next design task is to specify and test the small delivery/disruption rules package. A small trained model remains a later experiment once that package produces meaningful outcomes.
