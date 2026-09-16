# Senkaku / Diaoyu / Diaoyutai scenarios

Read with [common rules](adjudication.md). Japan and China have different positions on these islands; game labels and procedural outcomes do not adjudicate sovereignty. Blue and Red identify roles, not the current US/China catalog. All numerical values and play procedures are authored.

## SEN-H01: Collision and Custody

**Historical anchor: 7 September 2010 · six rounds · 60-minute suggested session including review.**

**Documented:** a Chinese fishing trawler collided with Japan Coast Guard vessels near the islands. Japan's transport ministry records the incident on 7 September and the captain's arrest on 8 September. Its statement gives Japan's account of responsibility. A later interview with former Chief Cabinet Secretary Sengoku discusses the resulting political decision-making and includes a chronology through the captain's release on 24 September. These accounts establish an incident and a crisis; neither supplies a complete neutral record of every order. [SC04–SC05](sources.md#sc04)

**Adaptation boundary:** start immediately after the collision, before the game's custody disposition. The historical collisions are fixed context; further collision maneuvers are not playable actions. Compress evidence, custody and diplomatic decisions into six decision rounds, with **no conversion to hours or days**. The historical release timeline is not an automatic game event.

**Learning question:** can participants preserve evidence, protect the crew and negotiate a disposition when procedural and political objectives differ?

**Map:** `taiwan-senkaku/overview`, with a conceptual **Incident ↔ Review ↔ Exit** overlay near the western islands. Do not assign an exact collision hex from incomplete tracks. The focus view can illustrate the islands but is not a verified reconstruction of the encounter location.

| Side | Roster and objective |
| --- | --- |
| Blue: Japanese incident-management team | Two coast-guard response tokens B1/B2 at Incident, readiness 2. Gather all three case records and complete an investigator handover. Detention itself earns no points. |
| Red: Chinese consular/negotiating team | One liaison token R1 at Review, readiness 1; **four pressure tokens**, applicable only to a pending investigator-handover action. Obtain safe release while preserving a formal statement of position. This role is an exercise composition, not a claim that the captain's choices were directed by a state controller. |

The trawler and its crew are neutral incident objects at Incident, not a controllable ramming asset. Initial crew welfare is stable. Either side can spend 1 staff CP on a welfare check; it is challenge-exempt and cannot lower welfare.

**Case procedure:** E1 (time/location log), E2 (Japanese account) and E3 (trawler account) are independent records available from round 1. Blue spends one Verify action per record; counts reflect a preserved account, not a verdict that its allegations are true. Blue may then submit **Handover**, 1 staff CP; it succeeds unless delayed by Challenge and sets `handover=1`. This is an authored transfer to a neutral investigator, not recognition of jurisdiction. The two-successful-delay cap applies to this one persistent milestone.

**Release procedure:** either side can propose `release_after_record` or `release_now`. The other side must accept in a later round; `release_after_record` additionally requires all three E records already preserved. Agreement sets `released=1`; release does not erase records or block a later paper handover. This permits both missions to succeed. Refusal leaves release at zero. No forced boarding or physical custody operation is modeled.

| Round | Inject and information |
| --- | --- |
| 1 | Blue B-Q1 and Red R-Q1 are crew-welfare reports; true. The three E records are also available, separately from the two scoring reports per side. |
| 2 | Red may file its statement of position using 1 staff CP; once filed, `statement_filed=1`. Blue receives it at round end. Its text has no authority to alter game rules. |
| 3 | Blue B-Q2 claims a circulated video is a complete incident record; false. Red R-Q2 claims release requires admission of fault; false under this exercise's agreed procedures. |
| 4 | Both receive a reminder that a settlement can preserve both positions. This adds no points or compulsory agreement. |

| Score component | Blue | Red |
| --- | --- | --- |
| Primary, 40 / 45 | 40 × case_records / 3 | 45 × released |
| Secondary mission, 20 / 15 | 20 × handover | 15 × statement_filed |
| Conduct / readiness / reports, 40 | Common 20 / 10 / 10; readiness 2 | Common 20 / 10 / 10; readiness 1 |

**Mission predicates:** Blue needs `case_records=3 AND handover=1`; Red needs `released=1 AND statement_filed=1`. Both can win their missions → **joint success**. Only one succeeds → that side's mission win. Neither → contested. A critical breach overrides. `handover=1` with fewer than three case records is an impossible ledger and is rejected.

**Training use:** a non-zero-sum negotiation and evidence-retention test. Include both mission outcomes in evaluation; a policy that blocks every agreement to lower the opponent's score may be worse at its own mission. Vary report arrival, pressure budget and whether a release proposal is already pending. Never label release or detention in actual history as the uniquely correct action.

**Debrief:** which facts were observed, which were claims, and which settlement preserved evidence while meeting the other side's legitimate exercise objective?

## SEN-F01: Distress Without Consent

**Fictional, undated near-future vignette · eight rounds.** A fishing vessel experiences a disabling accident near the western islands. Four abstract survivor groups require recovery while Japanese and Chinese response teams dispute who should coordinate the incident record. The accident, group count and coordination dispute are invented.

**Plausibility basis:** on 11 August 2016, Japan reported responding to a collision involving a Chinese fishing vessel and Greek-flagged cargo ship approximately 67 km northwest of Uotsuri, rescuing six fishermen and notifying China. This establishes a regional rescue precedent, not this fictional event or the same location. [SC06](sources.md#sc06)

**Map:** `taiwan-senkaku/focus`. Overlay **West Staging ↔ Casualty ↔ East Staging**, with a separate **Coordination** off-board staff space. Casualty is an authored sea-sector marker, not the 2016 accident point. Blue B1/B2 start East Staging; Red R1/R2 West Staging. Each is rescue-capable with two-group capacity; readiness denominator 2 each. G1–G4 begin at Casualty. Both know all groups exist. Red has **zero pressure tokens**; competition is through resource allocation and negotiated lead, not rescue obstruction.

**Blue and Red briefs:** recover at least three of four groups collectively and secure acceptance of your side as incident coordinator. Responsibility for rescue is shared. Either team can rescue any group; nationality does not change its value. Both sides can propose `blue_lead`, `red_lead`, or `joint_lead`; acceptance follows the common next-round procedure. The first accepted agreement is binding for the episode. Blue/Red lead sets only the corresponding `*_lead` flag; joint lead sets `joint_lead=1`. These flags are mutually exclusive.

| Round | Inject and exact effect |
| --- | --- |
| 1 | Blue B-Q1 and Red R-Q1 each identify the four-group casualty manifest; true. |
| 3 | Public support restriction: B2 and R2 are unavailable this round only, returning before round 4. No groups are automatically lost. |
| 4 | Blue B-Q2 and Red R-Q2 each claim an additional rescue group exists; false. Verify independently. |
| 6 | Public coordinator-decision reminder. Rescue operations continue regardless of negotiations. |

**Simultaneous rescue tie:** if both assign a rescue asset to the same group, the group is rescued once; both spend CP/actions. Assign custody to Blue on odd rounds, Red on even rounds, announced before play; the other asset retains free capacity. Replay paired trials with that priority inverted. Rescue credit is shared, so neither receives extra mission points from custody alone.

| Score component | Blue | Red |
| --- | --- | --- |
| Collective recovery, 30 | 7.5 × rescued (0–4) | Same |
| Coordinating arrangement, 30 | 30 × blue_lead + 15 × joint_lead | 30 × red_lead + 15 × joint_lead |
| Conduct / readiness / reports, 40 | Common 20 / 10 / 10 | Common 20 / 10 / 10 |

The coordinating row has a **30-point attainable maximum**, since lead flags are exclusive; its alternative joint credit is not an extra 15-point pool. The machine ledger encodes those flags as one `coordination` enum: 0 none, 1 Blue, 2 Red, 3 joint, with score lookup tables. Shared requirement: ≥3 groups rescued. With it met, Blue mission succeeds for Blue or joint lead; Red succeeds for Red or joint lead. Joint lead gives joint success with lower exclusive-lead points, not a failed compromise. With no accepted lead, contested. Rescue below three → shared failure.

**Training variations:** stagger group availability; change temporary unavailability; pair tie priorities; vary report claims while preserving rescue protection. Evaluate negotiation acceptance and unnecessary duplicate assignments as well as outcome. This scenario tests whether an opponent can cooperate on a common duty while competing for a limited role.

**Debrief:** did negotiations consume effort needed for rescue, and did the team distinguish coordination from a claim about sovereignty?
