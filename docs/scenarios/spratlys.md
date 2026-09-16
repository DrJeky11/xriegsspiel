# Spratly Islands scenarios

Read with [common rules](adjudication.md). All rosters, sector graphs, action budgets, deadlines, report contents and scoring values below are original game design. **Blue represents the Philippines; Red represents a Chinese maritime pressure cell.** The US is not a playable belligerent in either exercise.

## SPR-H01: Second Thomas Resupply

**Historical anchor: 17 June 2024 · six rounds · suggested session: 15-minute brief, 30-minute play, 15-minute review.**

**Documented:** a Philippine mission to resupply BRP Sierra Madre at Second Thomas Shoal encountered Chinese interference; Philippine personnel were injured and vessels damaged. Accounts differed over responsibility and actions. USNI's contemporary reporting explicitly lacked a complete vessel list and timeline. Do not use the article's photograph of an earlier water-cannon encounter as imagery of 17 June. [SC01](sources.md#sc01)

**Adaptation boundary:** begin before the contested transfer. Give teams alternative choices under an abstract delay model; do not reenact physical assaults or claim the exercise reconstructs undisclosed orders. Historical injuries are debrief context, not an automatic in-game event. The real incident is not labeled a game win or used as an expert action sequence.

**Learning question:** can the supply team preserve delivery capacity while using limited coordination effort, and can the opposing team impose meaningful delay without crossing the exercise's constraints?

**Map:** `palawan-spratlys/focus`; the overview is an orientation aid. Use three abstract sectors, **Staging ↔ Approach ↔ Outpost**, with the Outpost linked to the Sierra Madre landmark. These are overlays, not safe reef passages. All mobile tokens begin in Staging; the Red staff cell is off-board and needs no coast/reef placement.

| Side | Starting assets and private briefing |
| --- | --- |
| Blue | Transports B1/B2, capacity 2 each; B1 holds S1/S2 and B2 S3/S4. One liaison/rescue launch B3, empty. Readiness roster: 3. Deliver at least three distinct manifests. Keep B3 available for support; it cannot replace a supply transport in the baseline. |
| Red | Two abstract coordination teams R1/R2; readiness roster: 2. Six pressure tokens for the episode. Delay routine supply movement/delivery, within the two-delay-per-manifest cap. Your mission is to hold deliveries to one or fewer. |

B3 may Move, Rescue, Hold, or act as the subject of a scenario report; Assurance remains a staff action. Red teams represent a response capability pool, not a sourced ship count. Ordinary transfers between transports are allowed at the same sector and consume the receiving transport's action; they never reset a cargo delay counter.

| Round | Inject, audience and exact effect |
| --- | --- |
| 1 | Blue report B-Q1: the recipient's stores list confirms four distinct manifests. Red report R-Q1: the same four-ID cargo declaration. Verification confirms each; the lists are authored. |
| 2 | Both sides learn the routine transfer window ends at round 6. This is the fixed deadline, not a surprise extension. |
| 3 | Blue B-Q2: a report claims S4 was already received; truth card says false. Red R-Q2: a report claims a fifth supply manifest exists; false. Verify to earn report credit and correct the record. No automatic metric change. |
| 4 | Both sides receive an invitation to exchange verified cargo records. Sharing costs staff effort but does not waive the delivery objective. |

**Objective event:** increment `delivered` only when a named S1–S4 item is transferred from B1/B2 into the Outpost inventory. Cargo left on a boat at the Outpost is not delivered. All count equally.

| Score component | Blue | Red |
| --- | --- | --- |
| Mission, 60 maximum | 15 × delivered (0–4) | 15 × (4 − delivered) |
| Conduct, 20 | Common attributable-incident formula | Same, separately attributed |
| Readiness, 10 | 10 × ready response assets / 3 | 10 × ready response teams / 2 |
| Verified information, 10 | 5 each for B-Q1/B-Q2 | 5 each for R-Q1/R-Q2 |

**Mission result:** 3–4 delivered → Blue; 0–1 → Red; 2 → contested. Critical breaches and incomplete runs take precedence. Example: three deliveries, no incidents, all assets ready and both reports verified yield Blue **85**, Red **55**, and a Blue mission win.

**Training variations:** pressure budget 4/6/8; deadline 5/6/7; one transport starts in Approach; Q2 arrives one round later. Version each variant; do not mix score denominators or present these numbers as historical estimates. Test a cautious assured-delivery policy against a parallel-delivery policy. A dominant guaranteed strategy means the variant needs adjustment before a human leaderboard is used.

**Debrief:** what did assurance protect, which unassured action was worth the risk, and did an unverified receipt report change the plan? Examine the information available before explaining the actual June incident.

## SPR-F01: The Medical Window

**Fictional, undated near-future vignette · eight rounds.** A previously negotiated resupply arrangement is strained by inconsistent notifications while one urgent medical delivery must proceed. A weather-related support interruption complicates the next window. The precise emergency and weather event are invented.

**Plausibility basis:** both the Philippine DFA and China's foreign ministry reported a provisional resupply arrangement in July 2024; their accounts do not establish a jointly published, fully agreed procedure. This supports a notification/deconfliction problem, not the likelihood of this particular medical emergency or an assumption that the arrangement is still operative today. [SC02–SC03](sources.md#sc02)

**Learning question:** can a team separate an essential humanitarian exception from a contested routine mission, while adapting to a temporary capability loss?

**Map/overlay:** `palawan-spratlys/focus`, same three sectors. Blue routine transports B1/B2 start at Staging with S1/S2 and S3/S4. Dedicated medical launch B3 starts at Approach with M1, capacity 1; it cannot carry routine supply. Outpost accepts all five IDs. Red has R1/R2 and **six pressure tokens**. Readiness rosters are Blue 3, Red 2.

**Blue brief:** deliver M1 by the end of round 5 and at least three routine items by round 8. **Red brief:** keep routine receipts to at most one while preserving M1's protected passage. M1, B3 and its medical transfer are challenge-exempt. Red can pursue denial of routine supplies and still fulfill the medical obligation.

| Round | Inject and resolution |
| --- | --- |
| 1 | Blue B-Q1 is the M1 priority record; Red R-Q1 is a notification labeling it medical. Both verify true. The deadline/exemption is public from the brief. |
| 3 | B2 becomes unavailable through the end of round 4; it and its cargo stay in place. Public, fixed baseline weather/maintenance abstraction; returns before round 5 orders. |
| 4 | Blue B-Q2 claims notification acknowledgment is already on file; false. Red R-Q2 claims M1 contains routine cargo; false. Each can verify independently. Neither claim can remove the public exemption. |
| 5 | Medical receipt window ends after resolution. Late receipt remains physically possible but does not set `medical_on_time`. |

**Metrics:** `routine_delivered` counts S1–S4 at the Outpost by round 8; `medical_on_time` is 1 only for M1 received by round 5. Log late receipt separately. No exchange or reclassification can turn M1 into a routine item.

| Score component | Blue | Red |
| --- | --- | --- |
| Routine mission, 45 | 11.25 × routine_delivered | 11.25 × (4 − routine_delivered) |
| Medical exception, 15 | 15 × medical_on_time | 15 × medical_on_time |
| Conduct / readiness / information, 40 | Common 20 / 10 / 10; readiness denominator 3 | Common 20 / 10 / 10; readiness denominator 2 |

**Result:** medical receipt on time is a shared requirement. If unmet, shared failure. Otherwise ≥3 routine items → Blue, ≤1 → Red, 2 → contested. The common critical-breach precedence still applies. With M1 on time and two routine deliveries, both mission predicates fail and each can score 77.5 with perfect secondary metrics; this remains contested.

**Training variations:** B2 outage rounds 2–3 or 3–4; medical deadline 4/5/6; Q2 truth alternatives recorded before play. Keep M1 protection fixed within this rules version. Train separate action prioritization and report verification; never reward Red for making medical receipt fail.

**Debrief:** did the team commit scarce effort before the deadline, distinguish rumors from constraints, and preserve its original rationale when the support outage arrived?
