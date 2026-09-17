# Guided-exercise policy: first local training run

**Completed 2026-09-16, America/New_York · branch `agent-training`.** The owner authorized policy training, explicitly chose **teaching hints and explanations**, and confirmed **the owner and an instructor** as evaluators. This run trained `guided-spr-h01/0.1.0` on the current laptop and integrated it as an optional practice pilot. Human evaluation is pending.

## What was trained

A small supervised neural network selects one of eight applicable teaching topics: mission, order sequence, route preview, action budget, delivery, reports, recorded results or reflection. It reads 40 features derived from the player's permitted observation, current draft/preview and recent hint history. It has one 48-unit tanh hidden layer and **2,360 parameters**. Its portable JSON checkpoint is about 48 KB; inference runs locally in the existing TypeScript application.

The learned component ranks topics. Versioned rules and permitted events supply the explanation and reflective question. There is no generated free-form prose, chat model, learned game-playing opponent or automatic execution of orders. Applicability masks prevent topics such as Blue delivery advice for Red. Unsupported scenario/rules versions disable this pilot. An invalid or missing model falls back to a factual mission, sequence or reflection reminder.

Scope is **Second Thomas Resupply (SPR-H01), scenario 2.0.0, geographic rules 1.0.0**, on the Second Thomas Shoal focus map, both sides, baseline and Short window variants. It is available on explicit request in practice. The policy API declines assessment requests; the live pilot is explicitly practice-only. Other scenarios require additional content, data and evaluation.

The synthetic teacher is an [authored curriculum priority function](../../scripts/training/guided-teacher.mjs), not instructor expertise learned from examples. This experiment proves the training/export/inference path and gives the evaluators a concrete starting point. The learned approximation has not demonstrated an advantage over directly using the authored teacher.

## Results and provenance

| Measure | Recorded result |
| --- | --- |
| Synthetic complete games | 360, both roles, 322 trajectory-prefix groups |
| Training examples | 15,638 |
| Validation examples | 4,038 |
| Held-out test examples | 3,822 |
| Training seeds | 42, 137, 2026 |
| Selected checkpoint | Seed 42, epoch 106; lowest validation loss |
| Test agreement with authored labels | **98.09%** |
| Majority-applicable-topic baseline | 41.39% |
| Lowest topic recall | Reports: 95.83% |
| Exact episode replay | 360/360 |
| Python/TypeScript prediction agreement | 3,822/3,822 |
| Maximum cross-runtime logit difference | 2.14 × 10⁻¹⁴ |
| Measured Node hint selection latency | p50 0.034 ms, p95 0.093 ms |
| Dataset generation | 40.34 seconds |
| Three-seed training and report generation | 3.90 seconds; excludes simulation and replay evaluation |

These are **synthetic curriculum-imitation results**, not measurements of teaching effectiveness, learner understanding or opponent strength. The runtime timing is a local Node CPU measurement, not a Quest frame-rate measurement. The simple baseline is descriptive; it does not establish superiority over the authored teacher, another tutor or human instruction.

The run used the observed Apple M5 Pro laptop with 48 GiB memory, Node 26.0.0, Python 3.14.6 and existing NumPy 2.5.1. Optimization ran on CPU with two configured OpenBLAS threads. No GPU, cloud service, downloaded language model or new package installation was used. A project-local virtual environment reused the installed NumPy package; it is not a fully isolated dependency installation. Peak memory and energy use were not measured.

The generator calls the shared game rules. It saves initial/final hashes, complete joint orders, permitted observation hashes, contexts, feature vectors, masks and separate teacher labels. Both roles and all samples from a game stay together. Games with the same variant and first two joint rounds share a split group. Exact feature/mask duplicates are excluded across splits. Validation chooses the seed/checkpoint before test rows are loaded. The test set covers new trajectory groups within the **same two variants**, not unseen scenarios, maps or real learner behavior. Briefing acknowledgment and earlier hint histories are synthetic and do not prove comprehension.

| Artifact | Purpose |
| --- | --- |
| [Portable checkpoint](../../src/sensei/models/guided-spr-h01.v1.json) | Trained weights, feature order, versions and provenance |
| [Dataset manifest](guided-policy-v1-dataset.json) | File/source hashes, seeds, split method, counts and exclusions |
| [Training report](guided-policy-v1-training.json) | Three seed traces, selection, confusion matrix, runtimes and metrics |
| [Runtime evaluation](guided-policy-v1-evaluation.json) | Replay, inference parity and latency |
| [Evaluator packet](guided-policy-v1-review.md) | 32 examples with independent owner/instructor rating fields |
| [Review evidence](guided-policy-v1-review.jsonl) | Context, feature values and visible events for those examples |

The model SHA-256 is `8561d9032c13952d3dac3cacdffc0a642dc3a499c8c883ca2009cb7c0eb563bb`. Full generated data, seed checkpoints and raw predictions remain under ignored `output/guided-policy-v1/`; the dataset occupies approximately 20 MB. None of the training data came from the live exercise database, participant notes or human play.

## Try the pilot

With the application running, open:

```text
/pacific.html?region=palawan-spratlys&scale=focus&sensei=pilot
```

1. Choose **Menu → Play against AI → SPR-H01 · Second Thomas Resupply**. Start either side using the baseline or Short window variant.
2. Use **Ask for a teaching hint**. Read the question as well as the explanation. The **Evidence** disclosure shows rule/event identifiers.
3. Read the mission briefing, then acknowledge it. This is self-report, not a comprehension score. Request another hint after previewing or drafting an order, or after a round resolves.
4. In the Quest controller panel, use **Exercise controls → Sensei teaching hint**. Route, plan and review pages also offer the action when space permits. The same text is paginated, with **More explanation**, **Another teaching hint** and **Back to exercise** controls.
5. Before reloading or closing the page, select **Export hint review log** in the browser menu. This saves the last 200 requested hints in that page session, with observation/revision IDs, context, model decisions and evidence references. It is a partial local review log, not a durable or complete assistance record.

The pilot uses the current round even when the historical event viewer is on an earlier round. Changes to the draft, preview, side, briefing acknowledgment or saved revision invalidate the displayed hint. Requests pause while disconnected, a command is pending, the exercise is paused or a contest is unresolved. Removing `sensei=pilot` disables the pilot. A page reload resets local hint history and briefing acknowledgment; saved game state still follows the existing persistence path.

For the isolated review server used during this task:

```sh
npm run build
PORT=5190 DATA_DIR=output/guided-policy-v1/preview-data npm start
```

Open [the local pilot](http://127.0.0.1:5190/pacific.html?region=palawan-spratlys&scale=focus&sensei=pilot). Use only one server process per data directory. This preview has its own exercise database. For a browser controller-callback preview, append `&controller-preview=1&palette-review=1`; this does not emulate physical headset ergonomics.

## Owner and instructor evaluation

Start with the [32-example packet](guided-policy-v1-review.md). It includes four examples per predicted topic, deliberately favoring disagreements and close choices. It is not a representative sample or a new untouched test set. Each evaluator should rate independently before opening the authored proxy comparison or discussing scores.

Use the following working rubric; it is proposed for this pilot and can be corrected by the evaluators:

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Factual accuracy | Incorrect | Ambiguous or incomplete | Correct under the cited rules/evidence |
| Contextual usefulness | Unhelpful or misleading here | Some relevance | Helps with the immediate learning need |
| Clarity | Confusing | Understandable with effort | Clear and concise |

Flag private-information exposure separately. Record whether a problem concerns the **selected topic** or the **wording/evidence**, then write a preferred topic or corrected explanation. Missing evidence is a finding, not an invitation to infer a learner's intent. Live play can reveal issues absent from synthetic contexts; export the hint log and note the relevant hint ID.

Use those corrections to revise the authored content/labels, then evaluate a new version on newly reserved examples. These 32 examples become development evidence once discussed or used for tuning. Keep both evaluators' original scores and disagreements. Before claiming learning benefit, also check whether learners can explain the objective, order sequence and consequence, then apply the idea in a changed exercise without the same hints.

Human review exports explicitly retain `trainingPermission: "unspecified"`. The current scripts only consume generated synthetic datasets. They do not automatically ingest reviewer comments, human logs or notes; permitted reuse must be recorded before including those records in training.

## Reproduce locally

The repository JavaScript dependencies must already be installed. The recorded Python dependency is [NumPy 2.5.1](../../scripts/training/requirements-guided.txt), verified with Python 3.14.6 on this host. Check the active interpreter and import before selecting an environment. The commands below reuse that existing package, as this run did:

```sh
python3 --version
python3 -c 'import numpy; print(numpy.__version__)'
python3 -m venv --system-site-packages output/guided-policy-v1/.venv
npm run generate:guided
output/guided-policy-v1/.venv/bin/python scripts/train-guided-policy.py
npm run evaluate:guided
```

Defaults produce `data/`, `training/` and `evaluation/` within `output/guided-policy-v1/`. Existing output files at those paths are replaced; select new paths to retain an earlier experiment:

```sh
node scripts/generate-guided-training.mjs --episodes 360 --output output/guided-policy-next/data
output/guided-policy-v1/.venv/bin/python scripts/train-guided-policy.py --data output/guided-policy-next/data --output output/guided-policy-next/training
node scripts/evaluate-guided-policy.mjs --data output/guided-policy-next/data --training output/guided-policy-next/training --output output/guided-policy-next/evaluation
```

`npm run train:guided` is a convenience alias using `python3` from the active environment. The trainer checks data hashes, gradients, split separation and checkpoint reload. The evaluator reconstructs all episodes and checks the test observations, features, masks, predictions, evidence audience and nonmutation. A regenerated manifest has a new timestamp/timing hash, so the model's provenance and complete file hash change even when the numeric weights reproduce. Runtime/library changes can also alter floating-point results.

Scripts write only to their output directories; they do not automatically replace the bundled checkpoint or tracked reports. Review a candidate's evidence together, then copy its checkpoint and matching reports as a versioned change and run the relevant checks. Altering features, topic definitions, rules or source behavior requires regenerating and reevaluating the corresponding data/model; changing prose requires content review as well.

## Verification and limits

- **113 tests passed across verification runs:** the full suite passed 111 tests; two HTTP files initially could not bind a local port inside the sandbox. Both passed when rerun with local-port access. No tests were skipped. Six new tests cover the checkpoint, version/request gating, hidden information, applicability across complete games, invalid-model fallback and review evidence.
- `npm run build` passed, including TypeScript checking. Vite still warns about a large frontend chunk; the model is bundled even when the optional UI is off.
- The recorded runtime evaluator replayed all 360 synthetic games and matched all 3,822 Python/TypeScript test predictions. These counts are separate from the repository test count.
- Playwright checked an isolated production preview: exercise startup; mission, sequence and route-preview learned hints; controller callbacks; briefing acknowledgment; invalidation after a preview change; matching browser/controller text; unchanged game revision after hint requests; a three-record JSON export; pilot absence without the URL flag; and a post-resolution hint quoting the player’s actual movement event (`r1-e4`). No browser console errors were reported. A screenshot was visually inspected. Evidence is in ignored `output/playwright/guided-policy-browser.png` and `output/playwright/guided-pilot-review.json`. The later round-review export and screenshot use the `guided-pilot-round-review.json` and `guided-policy-round-review.png` names in that directory.
- No physical Quest trial, instructor review, human learning study, stronger-opponent evaluation or GPU benchmark occurred in this training task. Short training time and high synthetic agreement do not remove those limits.

The main remaining risks are incomplete authored explanations, unhelpful topic choices for actual learners, synthetic history that differs from real usage, limited scenario coverage and headset readability. The evaluator packet and live pilot make those gaps concrete; they do not certify a finished Sensei.
