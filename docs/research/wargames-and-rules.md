# Wargames, rules, and evidence of use

**Research baseline: 2026-09-15.** This is a selected landscape for XRiegsspiel, not an exhaustive inventory of military simulations. “Rules inspected” means the cited mechanics were checked, not that the game was played or its software reverse engineered.

The follow-up [manual review](manual-review.md) records direct reading of the MCU-linked manuals, additional games, and precise access limits. The owner's [operational planning priorities](../product-requirements.md) now guide which examples matter most.

## What counts as current evidence?

MCU's current cloud listing includes Command Professional Edition, Flashpoint Campaigns Professional Edition, Company Commander, Littoral Commander, Division Commander, DIGICAT, WarPlan, and Strategic Command WWI. These are not all the same kind of game. DIGICAT is described as an alpha digital implementation of OWS. The public page supplies information, not direct cloud access. [W02](sources.md#w02)

MARADMIN 308/26, dated July 2026, announces asynchronous qualifiers and 2027 finals for Marine, joint, and allied participants. This is stronger freshness evidence than old marketing text, but announced future events are not evidence that they have happened. [W03](sources.md#w03)

The current MCU reproduction names Napoleon at War, Company Commander WWII, Company Commander Modern, and Littoral Commander for the four qualifiers. Its narrative says September–February, but its detailed fourth-round dates run into March. Treat exact scheduling as something to recheck; no prototype requirement depends on it. [W02](sources.md#w02)

## Comparison

| System | Main learning scale | Interaction / time model | Evidence and rule access |
| --- | --- | --- | --- |
| Company Commander | Small-unit tactical | Alternating unit orders within player turns | MCU listing; public v1.05 manual |
| Littoral Commander | Grand tactical / joint capabilities | Team impulses, action budget, cards | MCU listing; tabletop v2.8 and digital help inspected separately |
| Division Commander | Division/brigade staff decisions | Five game-specific phases | MCU digital help reviewed; see manual review |
| Strategic Command WWI / WarPlan | Campaign and resource decisions | Turn-based, engine-maintained state | Selected public manual sections reviewed; see manual review |
| OWS / War at Sea | Operational command | Scenario-driven opposing teams | NWC syllabus; complete current rules not retrieved |
| Command Professional Edition | Tactical/operational, multiple domains | Simulation; WEGO and real-time multiplayer | MCU manual v2.4, core CMO manual, and later release notes reviewed selectively |
| Flashpoint Campaigns PE | Tactical, brigade and below | WEGO: orders then overlapping execution | MCU listing; developer/manual references |
| MTWS | MAGTF/JTF staff | Aggregate constructive simulation | Official TECOM program page |
| JTLS-GO | Joint/coalition operational | Event-driven simulation, orders and control staff | NPS 2025 event plus versioned overview |
| VBS3 / DVTE | Individual and small-unit tasks | First-person virtual simulation | Official training pages; exact current installation unknown |
| Hedgemony | Strategic resource choices | Expert-facilitated resource decisions | RAND educational game and public documents; historical reference |

The sections below provide the source links supporting each row. Tactical means decisions about engagements and local actions; operational means coordinating activities toward campaign objectives; strategic means broader objectives, posture, and resources. These are useful distinctions, not rigid product categories.

## 1. Company Commander

**Evidence:** MCU lists it; HexWar describes its PME role. [W02](sources.md#w02), [W21](sources.md#w21)

**Rules checked:** v1.05, 22 October 2024. One hex represents 100 m; counters represent vehicles or teams/squads through strength points. After any deployment phase, players alternate turns. A player selects eligible units to move, attack, or move then attack, or employs off-map support, then ends the turn. The engine selects applicable weapons. Fire can miss, have no effect, suppress, or destroy. Suppression prevents action; recovery depends on quality, and repeated suppression can destroy a unit. Scenario conditions determine the end. See PDF pp. 1–2 and 4–5. [W04](sources.md#w04)

**XRiegsspiel inference:** a useful reference for a compact tactical tabletop. Expose eligibility and order consequences before commitment; depict temporary suppression separately from removal. Do not assume the 2024 manual matches today's Modern edition.

## 2. Littoral Commander: Indo-Pacific

**Evidence:** MCU lists a digital version and includes it in the announced tournament. [W02](sources.md#w02), [W03](sources.md#w03)

**Rules checked:** tabletop v2.8, Second Printing. Initial planning spends Command Points on Joint Capability Cards; deployment is scenario-defined. Teams then alternate player/task-force impulses. Normally each player has three Action Points, with scenario/card exceptions. Core actions combine movement with combat, concealment, or resupply, or play a card. A unit/stack normally takes one core action per turn. Combat uses d20 rolls against combat values; supplies constrain actions. Concealment changes targeting eligibility. Initiative and scenario victory checks follow the action stage. Later planning occurs when specified. See §§3–9; the influence system adds consequences beyond attrition (§12). [W05](sources.md#w05)

**XRiegsspiel inference:** model scarce attention, logistics, reactions, and information explicitly. Keep card acquisition separate from action expenditure. A spatial UI can make resource tradeoffs visible without displaying every card at once. Use an original simplified scenario unless an authorized adaptation is chosen.

The follow-up recovered and reviewed MCU's digital help. Its coverage and version ambiguity are recorded in the [manual review](manual-review.md). Full digital/tabletop parity remains **unknown**.

## 3. Operational Wargame System and War at Sea

**Evidence:** the NWC AY24–25 syllabus assigns OWS or War at Sea for particular seminar exercises. It cites OWS Series Rules v2.2 (October 2023), an OWS Falklands/Malvinas game book v2.1, and War at Sea v2.7 materials issued in seminar. Students take opposing command roles, develop an operational idea, act with incomplete information and time constraints, and finish with a moderated debrief. [W06](sources.md#w06)

**Access limit:** this establishes an educational workflow and specific assigned editions. It does not establish current OWS tables, movement rates, combat algorithms, or the full sequence of play. Those rules were not retrieved. OWS and War at Sea are distinct systems and must not be merged by inference.

**XRiegsspiel inference:** build support for an instructor-controlled map, side-specific briefings, order submission, and adjudication. Ask the relevant instructor/designer for the authorized rule set if an OWS-compatible module becomes a goal. Do not reconstruct missing rules from reviews.

## 4. Command Professional Edition

**Evidence:** present in MCU's cloud portfolio. The developer describes professional editions with differing analysis, data-editing, scripting, and integration capabilities. [W02](sources.md#w02), [W07](sources.md#w07)

**How it plays:** direct orders and mission/policy settings control scenario-defined forces. WEGO provides paused planning and interval execution; real-time multiplayer uses a shared simulation host. CPE adds umpire and analysis tools. The [dedicated study](command-professional-edition.md) records selected manual coverage, later release differences, and what remains untested. [W31](sources.md#w31), [W32](sources.md#w32)

**XRiegsspiel direction:** the owner explicitly wants our own improved platform. Use CPE to study useful concepts and workflow tradeoffs. The [original blueprint](../design/simulation-blueprint.md) proposes a small operational model with contextual actions, resources, limited information, and recorded referee decisions. CPE access and integration are outside this direction.

## 5. Flashpoint Campaigns Professional Edition

**Evidence:** MCU lists the professional edition. Its developer positions it for tactical education and analysis at brigade level and below, with configurable scenarios and exportable staff information. [W02](sources.md#w02), [W08](sources.md#w08)

**How the family plays:** asynchronous WEGO means players issue orders during their own decision opportunities, while execution proceeds over overlapping simulated time. Command friction affects when a player can intervene again. This is different from ordinary “all my pieces, then all yours” alternation, and different from simply playing a turn by email. The public Cold War manual documents the family time model; the follow-up also inspected dated professional features and transport manuals. See the [edition-specific manual review](manual-review.md). [W09](sources.md#w09)

**XRiegsspiel inference:** delayed orders can teach prioritization and adaptation. If implemented, visibly separate draft orders, accepted orders, scheduled execution, and observed results. Do not let headset frame rate determine simulated time.

## 6. MAGTF Tactical Warfare Simulation

**Evidence:** TECOM describes MTWS as a constructive, aggregate simulation for Marine commanders and battle staffs, including MAGTF/MEF and joint-task-force applications. It supports multiple sides and computer-modeled interactions. [W10](sources.md#w10)

**How it plays, at the verified level:** participants practice command-and-control decisions through a staffed simulation environment; modeled units and activities drive an evolving situation. This is a training system rather than a compact, publicly specified tabletop rule set. The public page does not disclose complete adjudication details or establish the software build currently fielded everywhere.

**XRiegsspiel inference:** instructor tooling, scenario preparation, and multi-role participation can matter as much as graphics. Treat integration with institutional simulations as a separate, later project.

## 7. JTLS-GO and NWPAC 2025

**Evidence:** NPS reported a 2025 Northwest Pacific wargame involving U.S. and Japanese participants, including Navy and Marine Corps personnel, and described simulation-supported adjudication and JTLS-GO work. It reported more than 600 participants across a two-and-a-half-week event. That scale illustrates a different category from a hackathon game. [W11](sources.md#w11)

**How the documented system works:** JTLS-GO 6.4.1.0 is web-enabled and supports orders, force control, and joint/coalition simulation. Its overview explains event-driven state changes rather than a universal boardgame turn. The server/model, user interfaces, and exercise control are distinct parts of the system. The overview is not enough to reproduce its adjudication. [W12](sources.md#w12)

**XRiegsspiel inference:** retain an authoritative simulation and independent clients. “Web-enabled” does not mean a modern WebXR application or that its full client runs as ordinary browser JavaScript.

## 8. VBS3 and the Deployable Virtual Training Environment

**Evidence:** official Twentynine Palms and TECOM pages describe VBS3 first-person/small-unit training and a configurable, laptop-based training portfolio. [W13](sources.md#w13), [W14](sources.md#w14)

**How it plays, at the verified level:** trainees interact inside a simulated environment while trainers configure scenarios around selected tasks. Learning is organized around an exercise and subsequent review rather than necessarily a standardized boardgame victory condition.

**Freshness limit:** those pages establish public program descriptions, not that all units still run VBS3, that VBS4 is universally fielded, or that either runs natively on Quest 3.

**XRiegsspiel inference:** first-person interaction is most persuasive when body position, viewpoint, communication, or procedural action is the learning objective. It creates additional locomotion, terrain, animation, and assessment work. Test a short observation vignette before pursuing a broad immersive simulator.

## 9. Hedgemony

**Evidence:** RAND published this educational strategic-choice game in 2020, with defense-policy sponsorship. It explores force development, management, posture, employment, and competing resource demands. Players represent multiple states with distinct objectives and periodically renewed resources. [W15](sources.md#w15)

**Rules access:** public rulebook and guide links exist. The retrieved scenario appendix makes scenario assumptions, starting forces, resources, objectives, and turn count explicit. Full turn procedures were not successfully retrieved in this research. It is a useful strategic contrast, not a claim of current Marine Corps standardization. [W16](sources.md#w16)

**XRiegsspiel inference:** operational games should allow meaningful resource allocation and competing objectives. They need not become tactical combat simulators to produce useful decisions.

## Scenario background from the supplied tactics publications

The [dataset review](dataset-review.md) adds ATP 7-100.3 *Chinese Tactics* (2021 + C1) and ATP 7-100.1 *Russian Tactics* (2024 + C1). Both prefaces describe U.S. Army syntheses for training and professional education, primarily focused on ground tactics. They can inform scenario assumptions about planning, information, coordination, and support. They do not establish legal moves, turn sequences, combat probabilities, or current force data for an XRiegsspiel game. [D01](sources.md#d01), [D02](sources.md#d02), printed prefaces vii.

The Russian publication explicitly says it does not represent current fighting in Ukraine (introduction ix). Preserve that limit and the Chinese publication's 2021 scope. Keep country-specific background, contemporary observations, and authored game parameters distinct. The original fictional operational vignette remains the proposed starting point; these documents do not select a national scenario or authorize a named game's adaptation.

## What to adapt first

These are original recommendations, not borrowed rules:

1. A versioned scenario with explicit learning objectives, sides, information, resources, timing, and ending conditions.
2. One simple decision cadence, implemented consistently across clients.
3. A human adversary and facilitator before sophisticated automated opponents.
4. Limited information with a record of what was known at each decision.
5. A short replay/debrief that explains both outcomes and model assumptions.

Prioritize an operational team-planning scenario for the confirmed audience. Tactical examples can test focused interaction concepts. Keep different games' maps, units, time scales, and rules separate until evidence shows what should be shared.
