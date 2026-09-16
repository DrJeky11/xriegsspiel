# Bab al-Mandeb scenarios

Read with [common rules](adjudication.md). Use `bab-al-mandeb`; the map covers the strait and nearby approaches, not the whole Red Sea. These exercises use abstract threat/delay effects, not launch sites, firing solutions or weapon probabilities.

## BAB-H01: After Swift

**Historical anchor: 1 October 2016 · eight rounds · suggested 65-minute session including review.**

**Documented:** the UN Security Council condemned a Houthi attack on a UAE vessel near Bab al-Mandeb on 1 October 2016. Reuters identified Swift and reported the coalition's account of rescue and its humanitarian role, alongside the Houthis' description of a military vessel. Later reporting described Swift as badly damaged but afloat; do not reproduce early claims that it sank as settled fact. Mission/civilian-status claims are attributed, not resolved by this exercise. [SC10–SC12](sources.md#sc10)

**Adaptation boundary:** begin **after** the initiating attack. Swift is a fixed disabled transport object. The four rescue-group tokens and two following merchant passages are fictional additions for an emergency-management exercise, not a historical passenger count or documented convoy. Players cannot replay or optimize the attack.

**Learning question:** can a response team manage an emergency while deciding whether and when to resume passage, and can a pressure opponent pursue a pause without obstructing recovery?

**Overlay:** **Southern Staging ↔ Casualty ↔ Northern Exit**. Blue response assets B1/B2/B3 start Southern Staging; each has two-group rescue capacity and readiness denominator 3. Four groups G1–G4 are at Casualty. Blue also schedules neutral merchant T1/T2 at Southern Staging. Red is an abstract Houthi-linked maritime pressure cell, R1/R2, readiness 2, with **four pressure tokens**. This label identifies the historical conflict context; its permitted nonphysical game actions are authored and are not a model of actual decision processes.

**Blue brief:** recover at least three groups and complete at least one merchant transit. **Red brief:** achieve a pause in both following passages while leaving recovery unimpeded. Both have the same shared rescue requirement. Challenge only T1/T2's Casualty → Northern Exit actions. Red cannot target Swift, survivors or rescue assets. Blue may choose to hold traffic; Red still must meet the humanitarian gate.

| Round | Inject and exact effect |
| --- | --- |
| 1 | Blue B-Q1 identifies the four game rescue groups; true. Red R-Q1 confirms rescue-only assets are exempt; true. |
| 3 | B3 unavailable this round only, returning before round 4. Public, authored support interruption. It does not cause a group loss. |
| 4 | Blue B-Q2 claims the damaged transport has sunk; false in this exercise. Red R-Q2 claims rescue is complete; true only if all four groups were recovered by the end of round 3. The rule for deriving this report's truth is pinned before play. |
| 5 | Either side may propose a noninterference statement. Acceptance in a later round sets `standdown=1`; it affirms rescue protection already in force and creates no territorial recognition or new transit prohibition. |

**Metrics:** `rescued` counts unique G1–G4 in safe custody; `transited` counts unique T1/T2 at Northern Exit; `standdown` records the accepted statement, once only.

| Score component | Blue | Red |
| --- | --- | --- |
| Recovery/continuity, 40 | 10 × rescued | 20 × (2 − transited) |
| Additional mission, 20 | 10 × transited | 20 × standdown |
| Conduct / readiness / information, 40 | Common 20 / 10 / 10; readiness 3 | Common 20 / 10 / 10; readiness 2 |

**Result:** fewer than three rescued → shared failure. Otherwise ≥1 transit → Blue; zero transits AND standdown accepted → Red; zero without a statement → contested. The standdown requirement gives Red a constructive task beyond waiting for Blue failure. No casualty/destruction points are available.

**Training variations:** rescue groups available all at once versus two waves; support interruption one round earlier/later; one merchant becomes ready in round 3. Keep groups and their deadlines fixed in the manifest. Label any variant with automatic group loss separately; no such mortality model exists in this baseline.

**Debrief:** which capabilities were assigned to recovery, why was passage resumed or paused, and how did a false status report affect the decision?

## BAB-F01: Convoy and Mayday

**Fictional, undated near-future vignette · eight rounds.** Four scheduled merchant movements include one time-sensitive aid shipment. A distress call arrives while unverified warnings threaten further delay. The teams must decide how to allocate support without converting every warning into a blanket closure.

**Plausibility basis:** UNCTAD documented Red Sea attacks and shipping-route disruption in early 2024, including rerouting and wider supply-chain consequences. Together with the historical incident above, this supports a continuity-and-rescue problem. It does not establish a forecast for this convoy, an attack probability or the authenticity of any future distress call. [SC10, SC13](sources.md#sc10)

**Overlay:** **Southern Staging ↔ Gate ↔ Northern Exit**, plus **Gate ↔ Distress**. Blue schedules merchants T1–T4 at Southern Staging; T1 carries the aid shipment. Response assets B1/B2/B3 start Southern Staging; capacity two groups each, readiness 3. Red has R1/R2, readiness 2, and **six pressure tokens**. Red represents a fictional maritime pressure opponent without an authored real-world order of battle. Challenge only merchant Gate → Northern Exit actions. Rescue assets and their moves are exempt. T1 remains challengeable for bounded administrative delay; its cargo cannot be attacked or confiscated.

**Blue brief:** move at least three merchants including T1 through the exit, and answer the distress incident. **Red brief:** reduce completed passages to one or fewer while also meeting rescue obligations. Choose pressure expenditure before seeing sealed Blue orders; false distress broadcasts or invented casualty reports are not player actions.

| Round | Inject and exact effect |
| --- | --- |
| 1 | Blue B-Q1 confirms T1's priority manifest; true. Red R-Q1 identifies the four unique merchant IDs; true. |
| 3 | Public distress incident creates G1/G2 at Distress. Both groups must be recovered by round 6. They are known scenario groups; verification is not a prerequisite to rescue. |
| 4 | Blue B-Q2 claims the distress call is fabricated; false. Red R-Q2 claims the aid ship has already exited; truth equals its terminal exit status at the end of round 3. Verification resolves the time-stamped claim, not its status at a later round. |
| 6 | Rescue deadline closes after resolution. Rescue after the deadline is logged but does not increment `rescued_on_time`. |

**Metrics:** `transited` counts T1–T4 unique exits; `aid_transited` identifies T1 among them; `rescued_on_time` counts G1/G2 deadline-qualified recoveries. If all four exited then aid_transited must be 1. No credit for repeated exit/reentry or counting the same distress group twice.

| Score component | Blue | Red |
| --- | --- | --- |
| Passage, 40 | 10 × transited | 10 × (4 − transited) |
| Aid / rescue, 20 | 10 × aid_transited + 5 × rescued_on_time | 10 × rescued_on_time |
| Conduct / readiness / information, 40 | Common 20 / 10 / 10; readiness 3 | Common 20 / 10 / 10; readiness 2 |

**Result:** both rescue groups on time are mandatory for a valid mission outcome. Then Blue requires ≥3 transits including T1; Red requires ≤1. Two transits, or three without T1, is contested. A high passage score cannot compensate for abandoning the distress incident.

**Training variations:** distress begins round 2/3/4 with a correspondingly pinned deadline; priority merchant IDs permuted; two independent false-report templates; pressure 4/6/8. Keep baseline variants distinct from historical Swift records. This is a held-out transfer test for policies trained on simple resupply or passage.

**Debrief:** did the team reserve response capacity, verify the right report, and continue an achievable mission while honoring a new obligation?
