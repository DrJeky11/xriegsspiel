# Proposed prototype plan

**Not a schedule commitment.** The hackathon length, team, venue constraints, and available headsets have not been established. Work in checkpoints and stop expanding scope until the current checkpoint is usable.

## First demonstration to aim for

Start with the confirmed **2–4 players**, joining through Quest 3 or computer browsers. Assign opposing/team roles and provide referee controls; who facilitates and whether that person is additional remain open. The team develops a plan, selects pieces to see legal movement/actions, previews a resource choice, commits orders, adapts to a changed condition, contests one result for referee review, and discusses its decisions afterward. The headset/browser split and room arrangement remain open.

The demonstration should prove that the spatial interface helps a learning task and that both clients participate in the same game.

Following the owner's CPE clarification, implement our own rules and simulation. The [CPE study](command-professional-edition.md) supplies the comparison; the [simulation blueprint](../design/simulation-blueprint.md) elaborates Island Coordination with tasks, reservations, information, and referee history. Its suggested first cadence is WEGO, subject to the scenario decision. CPE access is not a prerequisite.

## Scenario candidates after audience clarification

These are original fictional scenario sketches, not reproductions of an existing game's rules.

| Candidate | Educational focus | Minimal content | Review question |
| --- | --- | --- | --- |
| Tactical: Harbor Decision | Explain a local choice with uncertain reports | Small terrain board, a few abstract teams, one objective, a changed report | Which assumption drove your decision, and when did you revise it? |
| Operational: Island Coordination | Prioritize a scarce shared resource | Several areas, transport/resource tokens, competing requests, one disruption | How did your allocation help one task while constraining another? |

Prioritize the operational sketch for the confirmed audience. The tactical sketch remains a small interaction/rules reference. A first scenario should exercise the full team planning cycle with a manageable primary assessment focus; neither sketch is an approved ruleset. Do not use an arbitrary timer or attrition score as a substitute for a learning objective.

## Checkpoint 1: Interaction and delivery evidence

- Run a small tabletop in Quest Browser using the selected web baseline.
- Inspect or reproduce the prior native cube/passthrough foundation if native features need comparison.
- In headset and desktop: select a token, see its movement area and available actions, inspect why restrictions apply, preview costs and consequences, confirm/cancel, pan/scale the board, and reset the view.
- Test tabletop placement, scale, and reset. Explore a ground-level observation point later if it serves the learning task.
- Record version and timing evidence; choose the first implementation stack.

**Exit criterion:** real headset operation and clear browser controls, with no critical interaction feature resting only on an emulator result.

## Checkpoint 2: One authoritative game loop

- Version a fictional scenario and define the legal action/phase sequence.
- For source-informed scenario content, record the publication edition/page separately from authored values and units. The [dataset review](dataset-review.md) defines a small provenance record; the tactics PDFs are background, not an executable ruleset.
- Implement role assignment, command validation, and one automated resolution path.
- Maintain strength/resources automatically and show current, reserved, and projected quantities where applicable.
- Keep hidden information out of unauthorized client payloads.
- Handle reconnects and duplicate command submissions.
- Log decisions and outcomes with a clear sequence, historical observation revision, actor category, and scenario/rules manifest.
- Exercise the same rules through a minimal headless runner with a scripted policy. Give it the same information and command restrictions as a human role. The [AI Sensei study](ai-sensei-and-wargaming-cloud.md) records the proposed API and later agent roadmap.

**Exit criterion:** both clients complete the same short game, including a disconnect/rejoin, without inconsistent state or duplicate resource use. The headless runner reproduces the same result for the same manifest and accepted orders.

## Checkpoint 3: Facilitation and learning

- Provide start/pause/advance controls and a clearly identified facilitator perspective.
- Support a player contest and recorded referee ruling, including supported outcomes and unsupported situations.
- Verify how a correction affects pending orders and when play pauses or resumes.
- Show a review timeline with historical player knowledge and explanations.
- Run the operational vignette with a planning team; use the tactical sketch only if it resolves a specific remaining usability question.
- Trial one short assumption-check prompt before commitment and revisit it after the changed condition. Preserve the initial assumption, supporting information, and revision; keep reflection separate from adjudication contests. [D03](sources.md#d03)
- Record participant experience, briefing/facilitator conditions, selected rationales, and an equivalent before/after reasoning task plus a changed vignette. Use the [learning plan](learning-and-adjudication.md) to separate interface usability, enjoyment, and evidence of learning. [D04](sources.md#d04)

**Exit criterion:** the facilitator can explain a meaningful decision from the evidence stored by the application.

## Checkpoint 4: Rehearsal on the actual setup

- Use the intended network, headset, browser, and participant arrangement.
- Verify cold start, joining, headset removal, reentry, and browser refresh.
- Run for the intended demonstration/session length, including a sustained rendering test.
- Test seated use, legibility, and controller recovery.
- Prepare a saved scenario and a browser-only way to continue if the headset is unavailable.

**Exit criterion:** another person can launch and complete the demonstration from the runbook without developer intervention.

## Verification matrix

These are future acceptance checks, not results already obtained.

| Area | Meaningful check | Evidence to retain |
| --- | --- | --- |
| Rules | Boundary cases for legal actions, costs, phase order, and ending conditions | Test cases tied to the selected rules |
| Authority | Wrong-role and stale commands rejected; duplicate accepted command has one effect | Integration test / recorded exchange |
| Information | Opponent secrets absent from payloads, tooltips, and player replay | Role-by-role inspection |
| Synchronization | Headset/browser orders converge on the same session revision | Two-client test |
| Replay | Event replay produces the recorded final state and historical knowledge | Replay equivalence check |
| Agent interface | Headless and interactive runs agree; scripted policy receives no privileged observations | Paired run and role-boundary checks |
| XR lifecycle | Enter/exit twice; remove headset; reconnect; cancel permission | Device checklist with versions |
| Fallbacks | No hand tracking or room data; normal desktop browser | Completed task using fallback controls |
| Rendering | Sustained target refresh with representative map/pieces/text | Frame/memory measurements, duration |
| Learning | Learner explains the decision and applies it to a changed situation | Facilitator rubric and brief observations |

An SDK sample compiling, a desktop screenshot, and a scene appearing in the editor are useful intermediate checks but do not satisfy headset acceptance.

## Deliberate scope limits for the first build

Defer colocated multi-headset alignment, voice networking, avatars, raw camera recognition, large geospatial terrain, extensive unit databases, scenario marketplaces, institutional simulator integration, and autonomous AI adjudication until a tested learning requirement calls for them.

Keep the first game small enough to complete and explain. Browser play, referee control, information boundaries, and review are central to this proposal.

Capture the API and decision-history foundations now. Defer advanced learned policies, adaptive tutoring, and large cloud deployment until the underlying game and teaching loop work. The owner's reported 10,000-user institutional capacity is context to verify, not a capacity commitment for this prototype.

## Questions for the project owner or instructor at implementation time

1. Which first operational vignette and primary assessment focus best serve the confirmed learners?
2. How much time is available for development and for the demonstration?
3. Within the confirmed 2–4 players, what is the headset/browser split and are participants colocated or remote?
4. Is an instructor available to validate the scenario and adjudication?
5. Will the venue allow headset Wi-Fi, local servers, and the required development/distribution route?
6. Which explicit original model assumptions and parameter values will the instructor validate first?

These are unresolved planning inputs. Ask the owner one question at a time. The [requirements record](../product-requirements.md) preserves answers already given.
