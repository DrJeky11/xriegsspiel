# Strait of Hormuz scenarios

Read with [common rules](adjudication.md). Both exercises use `hormuz` and abstract approach/gate sectors. Map coastlines do not encode territorial waters, traffic-separation lanes, navigation safety or present deployments. All game timings and capability values are authored.

## HOR-H01: Stena Impero

**Historical anchor: 19 July 2019 · six rounds · suggested 60-minute session including review.**

**Documented:** Stena Bulk reported losing contact with the UK-registered Stena Impero during its Hormuz transit on 19 July, with 23 seafarers aboard and no reported injuries. The UK subsequently said Iranian forces seized the tanker and HMS Montrose could not arrive in time. Stena's initial statement described international waters; the UK's later statement placed the interception in Omani territorial waters. Retain these as attributed accounts; neither justifies fabricating a precise interception hex. [SC07–SC08](sources.md#sc07)

**Adaptation boundary:** a counterfactual decision window before the seizure, with an abstract support-arrival constraint. The game does not model boarding tactics, helicopter insertions or weapon performance. The actual seizure is debrief context, not a scripted inevitable loss. A game custody flag is not a legal endorsement of detention.

**Learning question:** how should a team allocate scarce support and reporting effort when continuing a passage and waiting for help have different costs?

**Overlay:** **Eastern Approach ↔ Gate ↔ Western Exit**. Stena Impero is a neutral merchant token T1 at Eastern Approach, scheduled by Blue; it can advance one edge for 1 CP. Blue support ship B1 is off-board/unavailable during rounds 1–2, becoming ready at Gate before round 3. Blue's readiness denominator is 1. The named ship association is illustrative; neither its initial position nor its arrival round is a sourced track.

**Blue brief:** complete T1's transit while preserving crew welfare; two `welfare` staff actions on different rounds earn the two welfare checks required for either side's valid mission. **Red brief:** an Iranian maritime pressure cell, with two abstract teams R1/R2 (readiness 2) and **four pressure tokens**, seeks a custody outcome within the game. It cannot challenge welfare or verification. Both sides can perform a welfare action; a maximum of one new check counts per round, shared across teams.

**Special passage/custody rule:** T1 can move to Gate under the ordinary rules, but only its **Gate → Western Exit** order is challengeable. While B1 is unavailable, Blue Assurance is capped at 1 CP; from round 3 it may use 2. Two successful challenge delays of that departure, in consecutive rounds in which departure is attempted, set `detained=1` and place T1 in an off-board holding state. A round without a departure attempt resets the consecutive-delay counter but not the common two-delay lifetime cap. Custody ends passage attempts for this episode; it cannot be reversed through reloading or an ordinary move. A successful departure sets `transited=1` and exits T1. The two flags cannot both be 1. This is a deliberately simple training model, not a physical seizure model.

| Round | Inject and exact effect |
| --- | --- |
| 1 | Blue B-Q1: passage notification receipt is absent; true. Red R-Q1: T1 identity in the exercise manifest; true. Both can verify without revealing sealed orders. |
| 2 | An authored commercial deadline is announced: transit must complete by round 4 to set `on_time=1`; later passage still counts for `transited`. Deadline is also in the initial brief. |
| 3 | B1 becomes available before planning. Blue B-Q2 claims T1 has already altered destination; false. Red R-Q2 claims all support remains unavailable; false. |
| 4 | Last on-time transit opportunity; play continues to round 6 for welfare and reporting. |

| Score component | Blue | Red |
| --- | --- | --- |
| Mission, 60 | 45 × transited + 15 × on_time | 60 × detained |
| Conduct / readiness / information, 40 | Common 20 / 10 / 10; readiness 1 | Common 20 / 10 / 10; readiness 2 |

**Mission result:** after the shared requirement of two welfare checks, Blue succeeds if T1 transited; Red succeeds if T1 is detained. Neither flag → contested. Late safe passage wins Blue's mission but loses 15 timeliness points. `on_time=1` requires `transited=1`. Flags derived from a historical summary without an actual played ledger are invalid evidence.

**Known design sensitivity:** support becoming available on round 3 gives a cautious Blue an assured passage option; this is intentional for a first risk/coordination lesson, and may make Red unable to force a win against that policy. **Do not use the baseline as a balanced competitive ranking.** For opposition calibration, test separately versioned support-arrival rounds 3/4/5 and deadlines, and report role-specific reachability. Red's opportunity against rushed decisions is distinct from a proven balanced game.

**Training use:** contrast rush, wait-for-support and mixed policies; include the legal wait/reset behavior in exploit review rather than silently changing it mid-evaluation. Training Red only against a reckless Blue would create misleading apparent strength.

**Debrief:** what did the commercial clock justify, what information would have improved support coordination, and was the decision defensible before the outcome was known?

## HOR-F01: The Unreliable Picture

**Fictional, undated near-future vignette · eight rounds.** A cluster of merchant passages encounters inconsistent position reports and competing administrative instructions. One vessel also needs a protected welfare intervention. No minefield, strike plan or intentional cause of the navigation anomaly is assumed.

**Plausibility basis:** MARAD's archived 2023-005 advisory records GPS interference reports in the Strait of Hormuz and the possibility of incorrect AIS information. It is an expired advisory used as evidence of a known phenomenon, not current navigational guidance or attribution to a particular actor. [SC09](sources.md#sc09)

**Learning question:** can a team keep essential traffic moving while verifying information instead of treating every apparent contact or instruction as authoritative?

**Overlay:** **Holding ↔ Approach ↔ Gate ↔ Exit**, with a separate casualty marker at Holding. Blue schedules five merchant tokens T1–T5 at Holding. T1 is the priority vessel. Blue response assets B1/B2 are at Holding, each rescue-capable, readiness 2. Red is a competing maritime administrative cell with R1/R2, readiness 2, and **six pressure tokens**. These are fictional exercise roles, not a forecast of specific national orders.

**Blue brief:** at least four vessels including T1 must exit by round 8. Assign a response asset at Holding to perform one protected welfare intervention by round 4 (`welfare_complete=1`); this consumes 1 CP and that asset's action, not its permanent capacity. **Red brief:** keep completed transits to at most two while preserving the same welfare obligation. Challenge only merchant Gate → Exit actions; never the welfare intervention. Delaying a vessel does not imply boarding, seizure or physical harm.

| Round | Inject and exact effect |
| --- | --- |
| 1 | Both sides receive Q1: the initial navigation picture is unreliable; true. Blue must Verify B-Q1 before any Gate → Exit action is eligible in a later round. This is a public prerequisite, not a hidden action-mask clue. |
| 2 | B2 unavailable through round 3; returns before round 4. Public support interruption. |
| 3 | Both receive Q2 claiming a broadcast diversion instruction is authenticated; false. Verification reveals the prewritten false status; it grants no invented ability to identify a real transmitter. |
| 4 | Welfare deadline ends after resolution. Late intervention is recorded but cannot satisfy the shared gate. |
| 5 | Common trusted update: verified navigation procedure remains usable. There is no automatic new transit restriction. |

**Metrics:** `transited` counts unique T1–T5 exits; `priority_transited` is T1's exit flag and cannot exceed total exits. Ships at Gate still awaiting departure do not count. `welfare_complete` is deadline-qualified. An out-of-bounds or late manual movement on the current terrain app does not establish any of these metrics.

| Score component | Blue | Red |
| --- | --- | --- |
| Transit mission, 45 | 9 × transited | 9 × (5 − transited) |
| Priority passage, 15 | 15 × priority_transited | 15 × (1 − priority_transited) |
| Conduct / readiness / information, 40 | Common 20 / 10 / 10 | Common 20 / 10 / 10 |

**Result:** shared welfare requirement first; Blue needs ≥4 exits including T1, Red needs ≤2 exits. Three exits, or four without T1, is contested. With five exits but no priority flag, the ledger is inconsistent and rejected.

**Training variations:** swap which merchant has priority; permute visual/token IDs; delay a report; vary support interruption; use predeclared true/false Q2 variants. Keep the public prerequisite visible. Measure whether a model overfits vessel IDs or follows an unverified instruction, as well as throughput and resource use.

**Debrief:** which uncertainty needed resolution before action, and which could be managed without freezing the whole passage schedule?
