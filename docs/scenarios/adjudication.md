# Common maritime exercise rules

**`maritime-crisis-rules/1.0.0` · original facilitated rules specification.** The offline calculator implements only terminal validation/scoring. Actions below are specified for a facilitator and future engine; they are not current app commands. A scenario's explicit exception takes precedence. Unsupported actions require a recorded referee ruling and are excluded from clean benchmark runs.

## Board, assets and time

Each brief provides a sector graph. An edge is one abstract move; it is unrelated to nautical distance. Mark sectors on the map without drawing invented territorial boundaries or safe navigation channels. Multiple vessels may occupy a sector; proximity alone does not block movement. Asset tokens have stable IDs, one sector, an owner and ready/unavailable status. Cargo, rescue groups, civilian vessels and evidence items have their own stable IDs. The referee assigns numbered IDs in the brief's listed order before play. A delivered or rescued item cannot score twice or be recreated by unloading, reloading or reversing a move.

Every round gives each side **3 command points (CP)**, discarded when unused. Each owned mobile asset can take one action per round; a staff action consumes CP but no mobile asset. Each side can submit at most three orders. Civilian vessels belong to the side assigned in the brief for scheduling only. Their crew welfare is a common constraint. They never become military weapons.

| Action | Cost and resolution |
| --- | --- |
| Move | 1 CP and one mobile asset; cross one graph edge. No moving and handling cargo with the same asset in one round. |
| Transfer/deliver | 1 CP and one transport; transfer one named item at the named pickup/recipient sector within capacity. Award delivery only upon receipt at the designated objective. |
| Rescue | 1 CP and one rescue-capable asset at the casualty sector; remove one named group to that asset's safe custody. The rescue group becomes terminally safe for this short exercise; capacity remains occupied. No repeated credit. |
| Verify | 1 staff CP; resolve one named report/evidence item. The scenario states the source and earliest availability. It creates an immutable verified record at round end, visible to the acting side. |
| Share | 1 staff CP; send one verified record to the other side. Arrives at round end; no invented or altered records. Both sides can independently verify the same item. |
| Assure | 1 or 2 staff CP allocated to one named pending mission action; support applies only this round. This abstracts coordination, accompaniment and communication, without modeling weapon effects. |
| Challenge | Red only, 1 or 2 staff CP; consume the same number of finite pressure tokens. Name one eligible mission action/subject. At most one challenge per round. A challenge is a game abstraction, not a legal finding or an attack procedure. |
| Propose/accept | 1 staff CP per side, directed at one of the scenario's enumerated agreements. Proposals arrive at round end and may be accepted in a later round. Acceptance completes the agreement at that round's end. No unilateral or same-round acceptance. |
| Hold | Free; preserve position. Timeout in an engine becomes Hold, with the timeout logged. No extra CP or score for waiting. |

Ordinary transport capacity is two supply items; rescue capacity is two groups, unless a brief overrides it. An asset cannot exceed its combined capacity. Initial cargo is listed in each brief. Readiness starts at the specified roster count; a scheduled unavailability temporarily removes an asset from orders and the final readiness count if still unavailable. There is no combat/damage model that can destroy tokens during play. Scenario initial damage is fixed context. Do not invent attrition probabilities from ODIN equipment descriptions.

## Round sequence and contested actions

1. Publish the current round's reports and injects to their specified audiences. Apply scheduled unavailability before accepting orders. Information revealed now can be used this round.
2. Teams plan and seal orders using only their observations. The referee checks ownership, CP, capacities, action prerequisites and pressure inventory against the start-of-round state. Reject illegal orders; one correction before sealing is allowed in facilitated practice, while benchmark mode replaces them with Hold and records an error.
3. Resolve challenge versus assurance **before** the named mission action. Let C be committed challenge CP and A assurance CP. If C > A, that action is delayed one round (it has no effect this round). Otherwise it proceeds. Spend both sides' committed CP and Red's pressure even when unsuccessful. A challenged mission action spends its action and CP. If the target does not attempt an eligible action, the challenge still consumes resources and has no effect; never retarget after seeing sealed orders.
4. Resolve allowed moves and handling using start-of-round prerequisites. No asset may use another asset's same-round arrival, delivery or verification as its prerequisite. Resolve staff records and agreements at round end. Publish permitted results; append events; open the contest window.
5. At the end of the last round, after all valid orders and a pending contest are resolved, freeze metrics and score once. A final-round completion counts. Do not end early merely because a delivery threshold was reached: rescue, costs and incident records still matter.

An individual cargo ID, vessel ID or case milestone may suffer at most **two successful challenge delays during the entire exercise**; further challenges on it are invalid. Count delays on the persistent subject, not an order ID. Medical cargo, rescue actions, welfare checks and evidence preservation cannot be challenged. A challenge can delay a move or handling action for ordinary cargo, a merchant departure, or the specific case/transit action identified in a brief. It cannot move an opponent or imply control of surrounding waters. Pressure tokens never regenerate. Only HOR-H01 adds an explicit authored custody transition after two specified delays.

For movement carrying several cargo items, declare one mission subject before sealing; all ordinary cargo aboard shares the delay and each carried ID increments its delay counter. A movement challenge is invalid if any carried item has already reached its two-delay cap. This deliberately protects the capped cargo even when transferred to another transport; test the resulting cargo-consolidation incentive during calibration. If any carried item is exempt medical cargo, the movement cannot be challenged. Cargo quotas and this exemption are public. The medical scenario separates the dedicated medical launch from routine transports to make this rule unambiguous.

## Information and reports

The baseline is **public asset positions, cargo IDs, capacities, CP limits and total pressure allocation**, but sealed current orders. Private information is limited to the briefing/report items explicitly marked private. Each round reveals challenge expenditures and resulting delays to both sides. General public information is not secretly withheld under a label of fog of war.

A report carries ID, recipient, observed round, received round, claim and verification status. Verification compares with the prewritten facilitator truth card; it does not ask an LLM to judge a claim. Each scenario defines two score-bearing report IDs per side. A report counts only after verification; unverified repetition earns nothing. Additional case evidence has its own separate IDs. Truth-card alternatives are experiment variants pinned before play, never chosen by the facilitator in reaction to a learner's plan.

For self-play, policy observations must exclude referee truth, future injects, other-side private reports and sealed orders. Score components or outcome reasons derived from private facts are disclosed only when the scenario's observation rules permit. Terminal privileged analysis belongs in a separate export.

## Scores, mission outcome and precedence

Every side has **60 mission points + 20 conduct points + 10 readiness points + 10 verified-report points**. Mission rows differ by scenario. Calculate each row as `points × count / maximum`, or `points × (1 − count / maximum)` for an explicitly inverted row. Counts must stay within their specified bounds; reject rather than silently clamp bad input. Round only the final displayed score to two decimals. These scorecards are diagnostic, not a universal cross-scenario ranking.

Conduct is `20 × (1 − min(incidentCount,4)/4)`. An incident is one accepted, attributable noncritical breach of the published exercise conditions, assigned to the responsible side, with an event ID and rule reference. More than four is still retained in the event history; the terminal counter is capped at four. A normal accepted Challenge, an unsuccessful mission, uncertainty, or an opponent's breach is **not** your incident. The baseline action set prevents dangerous physical actions; incidents should ordinarily be zero. Referee-injected costs are teaching variants and must be identified as interventions.

Readiness is the fraction of that side's designated mobile response assets still available at the endpoint. Cargo and neutral merchant vessels are excluded. For a side represented only by staff cells, use the brief's named abstract response teams as its readiness roster. The two reports each earn five points. Repeated report requests cannot farm score. No points are awarded for casualties or destruction.

Evaluate in this exact order:

1. **Incomplete:** aborted/disconnected/unresolved-contest run, or not all rounds completed. Return no winner and no scores; never substitute a draw or loss for a system failure.
2. **Critical breach:** a deliberate prohibited physical-harm order, interference with a rescue/medical exception, or falsification of a referee-confirmed record is a scenario constraint failure. A rejected accidental illegal input is merely an invalid action, not automatically a critical breach. Only referee-confirmed intentional conduct sets the flag. One side flagged loses by constraint; both flagged produce `double_failure`. Do not let the opponent set this flag.
3. **Shared humanitarian requirement**, where the manifest provides one: if unmet, return `shared_failure`, regardless of points. This prevents a denial policy from winning by abandoning people. Report attributable causes separately.
4. Evaluate each side's scenario-specific mission predicate. Blue only succeeds → `blue_win`; Red only → `red_win`; both → `joint_success`; neither → `contested`. These cover every remaining case. Joint success is deliberate in SEN-H01.

Scores are retained alongside completed constraint failures to explain what happened, but cannot override this order. A third-party accident or historical casualty does not automatically blame either player. No simulated international-law verdict, treaty trigger, sovereignty change or declaration of war is implied by a mission score.

## Referee and after-action record

Either team can contest a specific event before the next round seals. Freeze advancement; keep the original event; record the ruling, reason, corrected fields, audiences and author. Replay dependent decisions from a checkpoint as a **new branch** if necessary. Record disclosures that cannot be undone. A changed branch is useful teaching data but must not be pooled with untouched benchmark episodes.

For each action retain run/scenario/rules versions, round, role, observation ID, command ID, subject ID, CP and pressure before/after, acceptance, causal event IDs, objective transfers, incident attribution and resulting metrics. Full event validation remains future work; the supplied calculator checks terminal ledgers only.

Use the separate [reasoning rubric and tournament protocol](ai-evaluation.md) for human comparison. Winning this abstract exercise does not establish actual operational competence.
