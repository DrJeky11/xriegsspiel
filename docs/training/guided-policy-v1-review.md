# Guided-exercise policy: owner and instructor review

Model: `guided-spr-h01/0.1.0`. 32 selected synthetic examples, including disagreements and close choices. These are not a representative learning study.

Review independently before comparing scores. For each example rate factual accuracy (0–2), contextual usefulness (0–2), and clarity (0–2); mark hidden-information problems separately. Record a preferred topic or wording correction. Do not infer the learner’s thoughts from the synthetic context.

The selection policy was trained against authored proxy priorities. Neither evaluator supplied those labels. The model selects a topic; rules and visible events supply the text.

## Review form

### 1. Keep the objective in view

Evidence ID: `synthetic-204040:5:blue:planning:2` · blue · round 5 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing not yet read; 2 drafted orders; a route preview selected; earlier hints: results, results, sequence, mission, reflection.

Draft: `[{"type":"move","asset":"B1","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:1,-10"},{"type":"move","asset":"B2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:1,-9"}]`.

**Selected explanation:** Deliver at least three routine manifests by round 6. This exercise has 6 rounds. Map assembly and this AI exercise keep separate saved pieces.

**Question:** How would you describe your objective in one sentence?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **mission**. This is agreement with a synthetic label, not an expert score.

</details>

### 2. Keep the objective in view

Evidence ID: `synthetic-192930:1:red:planning:2` · red · round 1 · planning · baseline.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing not yet read; 3 drafted orders; a route preview selected; earlier hints: mission, sequence, results, sequence, budget, results, delivery.

Draft: `[{"type":"challenge","asset":"R1","target":"B1","effort":1},{"type":"move","asset":"R2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:3,-11"},{"type":"verify","target":"R-Q1"}]`.

**Selected explanation:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice. This exercise has 6 rounds. Map assembly and this AI exercise keep separate saved pieces.

**Question:** How would you describe your objective in one sentence?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **budget**. Learned topic: **mission**. This is agreement with a synthetic label, not an expert score.

</details>

### 3. Keep the objective in view

Evidence ID: `synthetic-206666:5:red:planning:0` · red · round 5 · planning · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing not yet read; 1 drafted orders; a route preview selected; earlier hints: reports, mission, delivery, mission, sequence, sequence, sequence.

Draft: `[{"type":"challenge","asset":"R1","target":"B1","effort":2}]`.

**Selected explanation:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice. This exercise has 6 rounds. Map assembly and this AI exercise keep separate saved pieces.

**Question:** How would you describe your objective in one sentence?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **budget**. Learned topic: **mission**. This is agreement with a synthetic label, not an expert score.

</details>

### 4. Keep the objective in view

Evidence ID: `synthetic-206969:6:red:complete:1` · red · round 6 · complete · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing not yet read; 0 drafted orders; no route preview; earlier hints: mission, sequence, preview, sequence, budget, reports, reports.

Draft: `[]`.

**Selected explanation:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice. This exercise has 6 rounds. Map assembly and this AI exercise keep separate saved pieces.

**Question:** How would you describe your objective in one sentence?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **reflection**. Learned topic: **mission**. This is agreement with a synthetic label, not an expert score.

</details>

### 5. Draft, seal, then review

Evidence ID: `synthetic-204242:4:blue:planning:0` · blue · round 4 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; a route preview selected; earlier hints: results, reflection, results, preview, preview, reports.

Draft: `[]`.

**Selected explanation:** Select an action, add it to your plan, then review and seal. Both sides resolve together. A draft spends nothing until it is committed. Legal previews do not guarantee an uninterrupted outcome.

**Question:** Which step commits your orders?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **sequence**. This is agreement with a synthetic label, not an expert score.

</details>

### 6. Draft, seal, then review

Evidence ID: `synthetic-205050:4:blue:planning:1` · blue · round 4 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: budget, reflection, budget.

Draft: `[]`.

**Selected explanation:** Select an action, add it to your plan, then review and seal. Both sides resolve together. A draft spends nothing until it is committed. Legal previews do not guarantee an uninterrupted outcome.

**Question:** Which step commits your orders?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **sequence**. This is agreement with a synthetic label, not an expert score.

</details>

### 7. Draft, seal, then review

Evidence ID: `synthetic-203434:4:blue:planning:3` · blue · round 4 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: reports.

Draft: `[]`.

**Selected explanation:** Select an action, add it to your plan, then review and seal. Both sides resolve together. A draft spends nothing until it is committed. Legal previews do not guarantee an uninterrupted outcome.

**Question:** Which step commits your orders?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **sequence**. This is agreement with a synthetic label, not an expert score.

</details>

### 8. Draft, seal, then review

Evidence ID: `synthetic-194546:5:red:planning:2` · red · round 5 · planning · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 1 drafted orders; a route preview selected; earlier hints: reports, preview, budget, budget, reports, reflection, delivery, delivery.

Draft: `[{"type":"challenge","asset":"R2","target":"B1","effort":2}]`.

**Selected explanation:** Select an action, add it to your plan, then review and seal. Both sides resolve together. A draft spends nothing until it is committed. Legal previews do not guarantee an uninterrupted outcome.

**Question:** Which step commits your orders?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **preview**. Learned topic: **sequence**. This is agreement with a synthetic label, not an expert score.

</details>

### 9. A route preview is a draft

Evidence ID: `synthetic-203434:2:blue:planning:2` · blue · round 2 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 2 drafted orders; a route preview selected; earlier hints: budget, budget, delivery, reflection, preview, reflection, delivery.

Draft: `[{"type":"move","asset":"B2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:10,-13"},{"type":"move","asset":"B1","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:4,-13"}]`.

**Selected explanation:** This preview has not moved a ship. Add it to the plan before sealing. Movement resolves after both sides commit; occupied hexes can stop a route.

**Question:** What still needs to happen before this movement resolves?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **sequence**. Learned topic: **preview**. This is agreement with a synthetic label, not an expert score.

</details>

### 10. A route preview is a draft

Evidence ID: `synthetic-193031:6:blue:planning:2` · blue · round 6 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; a route preview selected; earlier hints: mission.

Draft: `[]`.

**Selected explanation:** This preview has not moved a ship. Add it to the plan before sealing. Movement resolves after both sides commit; occupied hexes can stop a route.

**Question:** What still needs to happen before this movement resolves?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **preview**. This is agreement with a synthetic label, not an expert score.

</details>

### 11. A route preview is a draft

Evidence ID: `synthetic-194546:5:red:planning:0` · red · round 5 · planning · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; a route preview selected; earlier hints: sequence, budget, reports, mission, sequence, results, preview.

Draft: `[]`.

**Selected explanation:** This preview has not moved a ship. Add it to the plan before sealing. Movement resolves after both sides commit; occupied hexes can stop a route.

**Question:** What still needs to happen before this movement resolves?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **sequence**. Learned topic: **preview**. This is agreement with a synthetic label, not an expert score.

</details>

### 12. A route preview is a draft

Evidence ID: `synthetic-224745:6:blue:planning:2` · blue · round 6 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; a route preview selected; earlier hints: sequence, budget, mission, reports.

Draft: `[]`.

**Selected explanation:** This preview has not moved a ship. Add it to the plan before sealing. Movement resolves after both sides commit; occupied hexes can stop a route.

**Question:** What still needs to happen before this movement resolves?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **preview**. This is agreement with a synthetic label, not an expert score.

</details>

### 13. Check this round’s action budget

Evidence ID: `synthetic-223432:6:red:planning:1` · red · round 6 · planning · baseline.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 1 drafted orders; no route preview; earlier hints: mission, budget, sequence, preview, delivery.

Draft: `[{"type":"move","asset":"R1","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:-1,-11"}]`.

**Selected explanation:** Your draft uses 1 of 3 command points and 1 of 3 orders. Each ship acts once per round. Unused command points expire when the round resolves.

**Question:** Do your drafted orders leave the actions you intended to reserve?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **reports**. Learned topic: **budget**. This is agreement with a synthetic label, not an expert score.

</details>

### 14. Check this round’s action budget

Evidence ID: `synthetic-206969:4:blue:planning:0` · blue · round 4 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 1 drafted orders; a route preview selected; earlier hints: reports, preview, sequence, delivery.

Draft: `[{"type":"move","asset":"B1","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:1,-10"}]`.

**Selected explanation:** Your draft uses 1 of 3 command points and 1 of 3 orders. Each ship acts once per round. Unused command points expire when the round resolves.

**Question:** Do your drafted orders leave the actions you intended to reserve?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **preview**. Learned topic: **budget**. This is agreement with a synthetic label, not an expert score.

</details>

### 15. Check this round’s action budget

Evidence ID: `synthetic-224543:5:red:planning:3` · red · round 5 · planning · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 1 drafted orders; no route preview; earlier hints: budget, sequence, mission, reflection, budget, reports, sequence.

Draft: `[{"type":"move","asset":"R2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:2,-11"}]`.

**Selected explanation:** Your draft uses 1 of 3 command points and 1 of 3 orders. Each ship acts once per round. Unused command points expire when the round resolves.

**Question:** Do your drafted orders leave the actions you intended to reserve?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **reports**. Learned topic: **budget**. This is agreement with a synthetic label, not an expert score.

</details>

### 16. Check this round’s action budget

Evidence ID: `synthetic-213837:3:blue:planning:3` · blue · round 3 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 3 drafted orders; no route preview; earlier hints: budget, sequence, mission, preview, preview.

Draft: `[{"type":"move","asset":"B3","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:11,-13"},{"type":"move","asset":"B2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:10,-9"},{"type":"move","asset":"B1","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:4,-13"}]`.

**Selected explanation:** Your draft uses 3 of 3 command points and 3 of 3 orders. Each ship acts once per round. Unused command points expire when the round resolves.

**Question:** Do your drafted orders leave the actions you intended to reserve?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **budget**. This is agreement with a synthetic label, not an expert score.

</details>

### 17. Arrival and delivery are separate

Evidence ID: `synthetic-199697:3:blue:planning:2` · blue · round 3 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 1 drafted orders; a route preview selected; earlier hints: preview, sequence, preview, reports, sequence.

Draft: `[{"type":"assure","asset":"B3","target":"B1","effort":2}]`.

**Selected explanation:** 0 routine manifests have been delivered. Movement into the marked transfer area and delivering a manifest require separate ship actions in different rounds. Deliver uses 1 command point. Report actions do not deliver cargo.

**Question:** Which recorded action changes the delivered-manifest count?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **budget**. Learned topic: **delivery**. This is agreement with a synthetic label, not an expert score.

</details>

### 18. Arrival and delivery are separate

Evidence ID: `synthetic-219796:2:blue:planning:0` · blue · round 2 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 1 drafted orders; a route preview selected; earlier hints: reports, results, results, reports, mission.

Draft: `[{"type":"move","asset":"B2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:9,-13"}]`.

**Selected explanation:** 0 routine manifests have been delivered. Movement into the marked transfer area and delivering a manifest require separate ship actions in different rounds. Deliver uses 1 command point. Report actions do not deliver cargo.

**Question:** Which recorded action changes the delivered-manifest count?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **preview**. Learned topic: **delivery**. This is agreement with a synthetic label, not an expert score.

</details>

### 19. Arrival and delivery are separate

Evidence ID: `synthetic-216968:6:blue:planning:0` · blue · round 6 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 3 drafted orders; a route preview selected; earlier hints: budget, budget, reports, preview.

Draft: `[{"type":"deliver","asset":"B1","target":"S1"},{"type":"move","asset":"B2","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:2,-11"},{"type":"share","target":"B-Q2"}]`.

**Selected explanation:** 0 routine manifests have been delivered. Movement into the marked transfer area and delivering a manifest require separate ship actions in different rounds. Deliver uses 1 command point. Report actions do not deliver cargo.

**Question:** Which recorded action changes the delivered-manifest count?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **budget**. Learned topic: **delivery**. This is agreement with a synthetic label, not an expert score.

</details>

### 20. Arrival and delivery are separate

Evidence ID: `synthetic-212524:3:blue:planning:1` · blue · round 3 · planning · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 2 drafted orders; no route preview; earlier hints: reports, delivery, reflection, preview.

Draft: `[{"type":"hold"},{"type":"move","asset":"B1","target":"pacific-terrain/0.1.0:palawan-spratlys/focus:2,-14"}]`.

**Selected explanation:** 0 routine manifests have been delivered. Movement into the marked transfer area and delivering a manifest require separate ship actions in different rounds. Deliver uses 1 command point. Report actions do not deliver cargo.

**Question:** Which recorded action changes the delivered-manifest count?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **budget**. Learned topic: **delivery**. This is agreement with a synthetic label, not an expert score.

</details>

### 21. Distinguish reports from verified information

Evidence ID: `synthetic-197576:2:blue:planning:2` · blue · round 2 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; a route preview selected; earlier hints: sequence, reflection, delivery, delivery, mission, preview.

Draft: `[]`.

**Selected explanation:** Your view contains 1 reports; 1 are verified. Verify checks a report. Sharing requires prior-round verification and a separate action. Neither action moves ships.

**Question:** Which information is verified, and which remains a claim?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **sequence**. Learned topic: **reports**. This is agreement with a synthetic label, not an expert score.

</details>

### 22. Distinguish reports from verified information

Evidence ID: `synthetic-224846:4:red:planning:3` · red · round 4 · planning · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: results, sequence, preview, delivery, sequence, reports, sequence.

Draft: `[]`.

**Selected explanation:** Your view contains 3 reports; 2 are verified. Verify checks a report. Sharing requires prior-round verification and a separate action. Neither action moves ships.

**Question:** Which information is verified, and which remains a claim?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **budget**. Learned topic: **reports**. This is agreement with a synthetic label, not an expert score.

</details>

### 23. Distinguish reports from verified information

Evidence ID: `synthetic-190304:6:blue:planning:3` · blue · round 6 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: none.

Draft: `[]`.

**Selected explanation:** Your view contains 4 reports; 4 are verified. Verify checks a report. Sharing requires prior-round verification and a separate action. Neither action moves ships.

**Question:** Which information is verified, and which remains a claim?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **reports**. This is agreement with a synthetic label, not an expert score.

</details>

### 24. Distinguish reports from verified information

Evidence ID: `synthetic-225149:6:blue:planning:1` · blue · round 6 · planning · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: mission, results.

Draft: `[]`.

**Selected explanation:** Your view contains 4 reports; 4 are verified. Verify checks a report. Sharing requires prior-round verification and a separate action. Neither action moves ships.

**Question:** Which information is verified, and which remains a claim?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **reports**. This is agreement with a synthetic label, not an expert score.

</details>

### 25. Connect an order to its recorded effect

Evidence ID: `synthetic-224543:3:blue:review:1` · blue · round 3 · review · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: mission, reflection, mission, sequence.

Draft: `[]`.

**Selected explanation:** r3-e20: B1: 4 water hexes to 5, -13. r3-e23: B3: Escort B1 · 2 CP

**Question:** What happened compared with what you expected?

Rules: `maritime-geographic-rules/1.0.0:move`, `maritime-geographic-rules/1.0.0:escort`. Events: r3-e20, r3-e23.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **results**. This is agreement with a synthetic label, not an expert score.

</details>

### 26. Connect an order to its recorded effect

Evidence ID: `synthetic-220200:5:red:review:0` · red · round 5 · review · baseline.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: results, mission, delivery, budget.

Draft: `[]`.

**Selected explanation:** r5-e39: R2 intercepted B1 beside hex 4, -13. S1, S2 spent one of two allowed delays. r5-e42: R1: 3 water hexes to 2, -11.

**Question:** What happened compared with what you expected?

Rules: `maritime-geographic-rules/1.0.0:interception`, `maritime-geographic-rules/1.0.0:move`. Events: r5-e39, r5-e42.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **reflection**. Learned topic: **results**. This is agreement with a synthetic label, not an expert score.

</details>

### 27. Connect an order to its recorded effect

Evidence ID: `synthetic-206060:3:blue:review:0` · blue · round 3 · review · short-window/1.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: sequence, preview, results, preview, results, sequence.

Draft: `[]`.

**Selected explanation:** r3-e19: B-Q2: False according to the pinned exercise truth card. r3-e22: B2 stopped at hex 9, -14: another ship has the next hex at movement tick 3.

**Question:** What happened compared with what you expected?

Rules: `maritime-geographic-rules/1.0.0:verify`, `maritime-geographic-rules/1.0.0:traffic`. Events: r3-e19, r3-e22.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **reports**. Learned topic: **results**. This is agreement with a synthetic label, not an expert score.

</details>

### 28. Connect an order to its recorded effect

Evidence ID: `synthetic-224341:3:blue:review:1` · blue · round 3 · review · baseline.

**Objective:** Deliver at least three routine manifests by round 6.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: preview.

Draft: `[]`.

**Selected explanation:** r3-e22: B-Q2: False according to the pinned exercise truth card. r3-e24: B2 stopped at hex 6, -13: another ship has the next hex at movement tick 1.

**Question:** What happened compared with what you expected?

Rules: `maritime-geographic-rules/1.0.0:verify`, `maritime-geographic-rules/1.0.0:traffic`. Events: r3-e22, r3-e24.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **delivery**. Learned topic: **results**. This is agreement with a synthetic label, not an expert score.

</details>

### 29. Reflect before the next attempt

Evidence ID: `synthetic-203232:3:red:review:0` · red · round 3 · review · baseline.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: results, budget, reports, reports, budget.

Draft: `[]`.

**Selected explanation:** Revisit one decision using the information available at that time. Separate the outcome from your reasoning. An alternative is an idea to test, not a proven better answer.

**Question:** Which assumption would you keep or change, and what evidence supports that choice?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **results**. Learned topic: **reflection**. This is agreement with a synthetic label, not an expert score.

</details>

### 30. Reflect before the next attempt

Evidence ID: `synthetic-204040:4:red:review:0` · red · round 4 · review · baseline.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: reports, budget, results, budget.

Draft: `[]`.

**Selected explanation:** Revisit one decision using the information available at that time. Separate the outcome from your reasoning. An alternative is an idea to test, not a proven better answer.

**Question:** Which assumption would you keep or change, and what evidence supports that choice?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **results**. Learned topic: **reflection**. This is agreement with a synthetic label, not an expert score.

</details>

### 31. Reflect before the next attempt

Evidence ID: `synthetic-219998:6:red:complete:0` · red · round 6 · complete · short-window/1.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: preview, reflection, budget, reflection, sequence, reports, sequence.

Draft: `[]`.

**Selected explanation:** Revisit one decision using the information available at that time. Separate the outcome from your reasoning. An alternative is an idea to test, not a proven better answer.

**Question:** Which assumption would you keep or change, and what evidence supports that choice?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **results**. Learned topic: **reflection**. This is agreement with a synthetic label, not an expert score.

</details>

### 32. Reflect before the next attempt

Evidence ID: `synthetic-210504:4:red:review:1` · red · round 4 · review · baseline.

**Objective:** Keep routine deliveries to one or fewer. Pressure is finite; each manifest can be delayed at most twice.

**Synthetic context:** briefing read; 0 drafted orders; no route preview; earlier hints: results, budget, reports, reports, mission, budget, budget.

Draft: `[]`.

**Selected explanation:** Revisit one decision using the information available at that time. Separate the outcome from your reasoning. An alternative is an idea to test, not a proven better answer.

**Question:** Which assumption would you keep or change, and what evidence supports that choice?

Rules: `maritime-geographic-rules/1.0.0`. Events: none; this is a rule explanation/reflection prompt.

Owner: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

Instructor: accuracy __/2 · usefulness __/2 · clarity __/2 · information issue __ · correction: __

<details><summary>Authored proxy comparison (open after rating)</summary>

Proxy topic: **results**. Learned topic: **reflection**. This is agreement with a synthetic label, not an expert score.

</details>

