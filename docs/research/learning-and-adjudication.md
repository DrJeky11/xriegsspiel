# Learning objectives and adjudication

Research baseline: **2026-09-15**. Sections explicitly marked as proposals are XRiegsspiel design recommendations.

## What the supplied reading list contributes

Walters's six-page MCU document is an **annotated bibliography**, not a rules guide. Its five principal recommendations span different purposes:

| Book | Topic highlighted by the annotation |
| --- | --- |
| Simon Parkin, *A Game of Birds and Wolves* (2020) | Historical tactical innovation and challenging assumptions |
| John M. Lillard, *Playing War* (2016) | Naval education, planning, and learning to adapt |
| Philip Sabin, *Simulating War* (2012) | Small games designed around classroom objectives |
| Jeff Appleget, Robert Burks, Fred Cameron, *The Craft of Wargaming* (2020) | Designing analytical games around a research question |
| Aggie Hirst, *Politics of Play* (2024) | Examining assumptions and the limits of simulated experience |

This summarizes the annotations; the books themselves were not read in full. [W01](sources.md#w01)

**Project interpretation:** start with an observable learning need. Immersion may help understanding, but vividness alone does not demonstrate learning or validate the model.

## Different purposes require different evidence

The owner-supplied [2026 empirical review](sources.md#d04) adds a direct research synthesis to the earlier bibliography. It examines fifteen heterogeneous studies from 2014–2024 and highlights gaps between engagement, measured learning, and longer-term competence. Its adapted 3P framework connects learning conditions, participant activities, and outcomes. See printed pp. 244, 246–248, 252–253, 256; the [dataset review](dataset-review.md) records coverage and methodological limits. This is support for a more explicit evaluation design, not evidence that XRiegsspiel or VR is effective.

The following is a proposed product-design framework:

| Purpose | Example question | Useful evidence |
| --- | --- | --- |
| Education | Can learners explain a tradeoff they previously missed? | Decision rationale, discussion, transfer to a new vignette |
| Training | Can a team perform a specified task consistently? | Task rubric, errors, timing, repeat performance |
| Analysis | What does a model suggest about a research question? | Assumptions, data provenance, sensitivity, repeated comparisons |

XRiegsspiel's initial task is educational. Do not infer real-world predictive validity from a game score or a successful demonstration. If the project later supports analysis, that needs a separate model-validation effort.

TECOM's explanation of MCDP 7 emphasizes continuous learning as a professional expectation. It provides institutional context; it does not prescribe this project's scoring system. [W19](sources.md#w19)

## Wargaming methods relevant to the platform

The UK MOD handbook distinguishes **free adjudication** (expert judgment), **rigid adjudication** (predefined rules), **semi-rigid adjudication** (rules with adjudicator intervention), and **consensual adjudication**. Its matrix games use proposed actions, supporting arguments, counterarguments, and a facilitator-led outcome under time limits. Classic closed Kriegsspiel can separate the sides' information from an umpire's full picture. These are allied methodological references, not a claim that USMC mandates one method. [W17](sources.md#w17), chapter 3, printed pp. 40–44.

MCU's MCPP teaching module describes a **friendly action → enemy/population reaction → friendly counteraction** cycle to refine a course of action. It is a planning technique, not inherently a symmetric competitive game. [W18](sources.md#w18)

The Joint Staff's public index identifies JP 5-0 as the joint planning foundation; current full publications are directed to JEL+. This research does not claim to have inspected the latest JP 5-0. [W20](sources.md#w20)

## Confirmed learning context

The owner identified officers/staffs practicing operational planning and MCU/NPS students exploring military decision-making. The experience must support collaborative planning, opposition, adaptation, and comparison together. The main reported obstacles are rule learning, repeated lookups, unclear legal actions, and manual supply/strength records. See [requirements](../product-requirements.md).

Hybrid adjudication is confirmed: software normally resolves actions, players can contest results, and a referee can take over in specific situations. The detailed contest workflow remains a proposal in the [manual review](manual-review.md).

## Proposed first learning objectives

Choose a primary assessment focus for the first scenario while preserving the full team planning cycle. Operational coordination is the leading fit for the confirmed audience; the other objectives can contribute to the same exercise.

| Candidate | What the learner must do | What to record |
| --- | --- | --- |
| Tactical judgment | Select and explain an action under incomplete information | Known contacts, alternatives considered, rationale, later revision |
| Operational coordination | Allocate a scarce shared resource among competing tasks | Requests, priorities, allocation, timing, unmet needs |
| Communication | Give an order another participant can interpret | Intent, recipient, acknowledgment, interpretation mismatch |
| Adaptation | Revise a plan after an unexpected event | Trigger, changed assumption, new action, explanation |

Use fictional geography and abstract units initially so terrain/data production does not overwhelm the learning experiment. Numbers should be visibly labeled as game parameters until instructors validate their meaning.

## Proposed game and facilitation loop

1. **Brief:** objective, role, initial information, model limits, and how success will be discussed.
2. **Observe:** display only the information available to that role.
3. **Decide:** submit a bounded order and, at selected moments, a short reason.
4. **Adjudicate:** apply the chosen rules; support player contests and referee intervention, including unsupported cases.
5. **Reveal:** deliver role-appropriate consequences and advance the game clock.
6. **Reflect:** pause at a meaningful decision or complete a short final review.

For the first implementation, use a small deterministic rule set plus recorded human rulings. Add random outcomes only where the learning objective requires uncertainty; record the draw and relevant parameters. An instructor override must record who changed what and why. Decide whether the reason is visible immediately or only in the debrief.

An LLM is not required. If added later, a narrow role such as drafting a briefing or summarizing logged decisions is easier to verify than unrestricted adjudication. Model-generated text must not silently change game state, leak another side's information, or invent events missing from the log.

## Proposed planning reflection tools

The supplied [Red Team Handbook v9.0](sources.md#d03) offers concrete facilitator methods: Think-Write-Share (printed pp. 201–202), Key Assumptions Check (pp. 163–165), Premortem Analysis (pp. 173–174), and 4 Ways of Seeing (pp. 79–80). Its preface states that the handbook is not official doctrine. The [dataset review](dataset-review.md) separates each method from its proposed product adaptation.

For the first fictional exercise, try one private assumption prompt followed by team sharing and a recorded reconsideration trigger. Revisit it after the changed condition and during the debrief. Keep this short enough to support discussion without recreating the owner's bookkeeping problem.

Challenging a plan is distinct from contesting a resolved game result. Reflection prompts do not change authoritative state or expose hidden opponent information. Preserve private drafts, team-shared ideas, and facilitator notes under explicit visibility rules. If names are hidden from peers but retained for facilitators, describe that accurately.

## Proposed after-action review

NWC's cited exercise ends with a moderated debrief about decisions and adaptation. [W06](sources.md#w06)

Build a replay around **decision points**, not just animations:

- What did the participant believe was happening?
- What information was available, stale, absent, or misunderstood?
- What was the intended effect, and what alternatives were considered?
- What did the opposing participant choose?
- What did the model or facilitator decide, using which assumption?
- What would the learner retain or change in a new scenario?

Show the participant's historical view first. Reveal the full state only when the facilitator chooses; otherwise the review encourages hindsight judgments based on information the learner never had.

Store objective outcomes separately from assessment. A lucky outcome can follow weak reasoning; a defensible decision can fail. Keep the record rich enough for the instructor to discuss both.

## Proposed evidence that VR helps

The [AI Sensei study](ai-sensei-and-wargaming-cloud.md) extends this learning loop into the owner's agent-development, integration, and analytics vision. Keep tutor assessment separate from opponent strength: evaluate grounded explanations, appropriate hints, instructor agreement, and transfer to a changed problem. A policy's win rate does not measure teaching quality. Historical observations and recorded assistance are essential to interpreting both.

Run the same short decision exercise in tabletop VR and desktop browser mode. Counterbalance the order where practical and use an equivalent second scenario so the second attempt is not simply memorized. A few hackathon participants provide usability evidence, not proof of educational efficacy.

Record:

- Time to understand the situation and submit a valid order.
- External rule lookups, bookkeeping corrections, and requests for instructor help.
- Interaction errors versus errors in reasoning.
- Instructor rubric for explanation and coordination.
- Comfort, readability, and whether users can complete the session seated.
- Whether a ground-level view changes a relevant decision.
- Ability to apply the lesson to a changed vignette.

Use these results to decide whether first-person observation earns its implementation cost. If the tabletop already teaches the objective better, retain it; if viewpoint-dependent understanding is the key finding, prioritize that feature next.

### Additions from the empirical review

Apply the 3P framework as a proposed evaluation record, with fields chosen for the learning question:

- **Conditions:** participant experience, briefing, role allocation, interface, scenario/rules versions, and facilitator instructions.
- **Process:** selected decision rationales, alternatives, revisions, team interaction observations, and facilitator/referee interventions alongside the event log.
- **Outcomes:** an equivalent before/after reasoning task and a changed vignette, with instructor criteria defined in advance. Add a delayed retention/transfer check when feasible.

Keep enjoyment, rule fluency, game outcomes, and learning assessments separate. An action log alone cannot establish the quality of a team's reasoning. For browser/VR comparisons, preserve comparable briefing and facilitation, record deviations, and retain the counterbalanced order and equivalent-scenario approach above. These are XRiegsspiel proposals informed by [D04](sources.md#d04), not a validated instrument supplied by the article.
