# Agent training and the AI Sensei

**Planning record: 2026-09-16, America/New_York · branch `agent-training`.** The owner requested a plan for adjustable opposition, local model training, and an AI Sensei. In this discussion the owner selected **“Teach the exercise and explain decisions”** as the first Sensei milestone. Stronger opposition and assessment remain later objectives. This document records the roadmap and original audit; the subsequent [guided-policy training record](../training/guided-policy-v1.md) records the implemented first experiment.

## Recommended direction

**Owner follow-up, 2026-09-16:** the owner and an instructor will evaluate the work. The owner authorized beginning policy training for the guided exercise and explicitly selected **teaching hints and explanations** as the policy's output. A compact hint selector has now been trained locally and is available as an optional practice pilot for Second Thomas Resupply. The initial examples and criteria have not yet received their evaluation; synthetic labels remain authored proxies. The [training record and review packet](../training/guided-policy-v1.md) supersede the original audit's implementation status below.

Build the first Sensei from our executable rules, historical decisions, and reviewed explanations. Give it a complete teaching loop: **brief → guided practice → explain consequences → reflect → retry a changed exercise**. Improve the opponent alongside that foundation, first by tuning its existing planner, then by testing a small learned plan scorer. Train a conversational model only if evaluated shortcomings justify it.

There are three different things to develop:

| Component | Its job | How it improves | Evidence of success |
| --- | --- | --- | --- |
| Opponent | Choose legal orders for one side | Better authored search, parameter tuning, imitation, potentially reinforcement learning | Stronger or more varied play against several frozen opponents on unseen variants, within the runtime budget |
| Sensei | Explain the exercise, ask useful questions, and connect consequences to decisions | Versioned rule/event explanations; reviewed teaching examples; optional retrieval and language-model adaptation | Correct explanations, useful hints, learner understanding, and transfer to a changed problem |
| Learner record | Remember demonstrated needs and suggest subsequent practice | Explicit skill tags, assistance records, instructor feedback and repeated observations | Recommendations agree with instructor review; uncertainty and missing evidence remain visible |

The existing engine decides legality and outcomes; the human referee retains contest authority. Neither opponent strength nor fluent explanations establish good teaching. The prior [opponent study](../research/opponent-ai.md), [AI Sensei study](../research/ai-sensei-and-wargaming-cloud.md), and [learning framework](../research/learning-and-adjudication.md) remain the rationale. Their older descriptions of missing gameplay are historical.

## What we already have

**Observed in this checkout**, starting at commit `d1371ad8290a955a4549af09cfca1594ce0558fe`, with existing uncommitted guidance documentation and additional guidance work arriving during review:

| Foundation | Present implementation | Work still needed |
| --- | --- | --- |
| Eight playable geographic exercises, both sides | [Opponent runbook](../ai-opponent.md), [shared rules](../../src/opponent/rules.ts) | Facilitated balance trials and versioned training/evaluation variants |
| Three opponent settings | [Geographic planner](../../src/opponent/geographic-policy.ts): authored priorities and bounded search | Demonstrated strength separation, richer behavior, complete candidate-score evidence for teaching/training |
| Headless execution | [Evaluation runner](../../scripts/evaluate-opponent.mjs) calls the same rules without graphics | Persistent batched training adapter, episode manifests, observation-safe trajectories, checkpoints and throughput measurements |
| Durable learning evidence | [Exercise database](../exercise-database.md), [opponent capture](../../server/opponent-capture.ts) | Controlled dataset jobs: the proposed phase 4 of [data capture](data-capture-implementation-plan.md) |
| Human teaching context | Existing scenarios, source records, learning rubric and owner-supplied PDFs | An instructor-reviewed explanation set and actual learner feedback |
| Browser and Quest access | Existing Pacific/CENTCOM workspaces and controller panels | Verify the same teaching slice on the physical headset and browser |

Guidance work was changing during this audit. The implemented follow-up now lives in [the Sensei module](../../src/sensei/guided-policy.ts); it reuses the shared observation and rules contracts. Preserve the six map saves, separate opposed-exercise state, original terrain and current WebXR/TypeScript architecture.

Two findings affect the training plan:

- The saved [192-match geographic comparison](../research/opponent-geographic-evaluation-2026-09-16.json) records 1,392 decisions, with direct-call p95 latency about **801 ms**. It is a one-seed development sample, not a training-speed benchmark. In Second Thomas Resupply, Standard and Advanced Blue each achieved the mission in 1/4 matchups; their Red counterparts achieved it in 4/4. These role-specific results do not establish balanced scenarios or three reliably distinct difficulty levels.
- The current `greedy` and `deadline` baselines follow the same scoring path: style 2 adds no distinct behavior. A fresh in-memory check found identical opening order batches in **16/16 scenario/side cases**. Make them meaningfully distinct or count them as one policy. Do not interpret four policy names as four independent strategic tests.

## What this laptop can support

**Fresh local observations:** Apple M5 Pro, ARM64, 18 physical/logical CPUs reported by the host, **48 GiB memory**, macOS 26.6.2, approximately **465 GiB available disk**. Node is 26.0.0; Python is 3.14.6. Active Python package metadata reports MLX 0.31.2 and NumPy 2.5.1. PyTorch, MLX LM, Transformers, Gymnasium, PettingZoo, Stable Baselines3 and SB3-Contrib are absent from that environment. Other environments were not inventoried.

**Assessment:** this is a plausible machine for scorer tuning, a compact policy/value network, and an optional small language-model adapter experiment. Hardware capacity has been checked; GPU execution, peak training memory and convergence have not. A 100,000–1 million parameter float32 policy has roughly 0.4–4 MB of raw weights; total training memory also includes optimizer state, activations and batches.

Start with the installed Node rules engine for simulation and CPU measurements. For a learned scorer, compare CPU with an Apple GPU implementation only after a small end-to-end benchmark. PyTorch documents an MPS device backend, but availability and the required operations must be checked on this host. [T1](#t1)

For a later conversational experiment, MLX LM documents Apple-silicon inference and fine-tuning, including LoRA/QLoRA and local JSONL datasets. A compatible 3B–4B checkpoint is an experiment candidate, not a selected or tested model. Raw quantized weight size is not peak training memory. [T2](#t2)

Use a project-local isolated Python environment when training implementation starts. Resolve against Python 3.14.6, check binary wheels and imports, run a forward/backward pass, and save/reload a checkpoint before pinning packages. If required packages are incompatible, select a supported isolated interpreter; do not replace the system Python. Keep experiment records and checkpoints local, with a disk cap and resumable jobs. Start with one job, retain capacity for the game, and increase parallel simulation only when measured.

No additional computer, cloud GPU, CPE access or institutional cloud is needed to begin. Cloud spending becomes a separate decision only if a measured experiment cannot meet the chosen schedule locally. Estimate training time from complete rollout-plus-optimization throughput, with evaluation and checkpoint time included; the old move microbenchmark cannot supply that estimate.

## Delivery sequence

All quantities below are **proposed pilot budgets**, not proven sample requirements or schedule commitments. Steps 1–2 deliver the owner's teaching priority without waiting for a trained opponent. Steps 3–5 provide the competitive learning path; step 6 is conditional.

### 1. Deliver one understandable exercise

Use **Second Thomas Resupply, baseline variant**, as the first teaching slice because it is already playable and was the subject of the owner's confusion. This scenario choice is a recommendation; the teaching-first priority is confirmed.

Before the first order, explain the player's role, the exercise objective, how success is decided, the round sequence, and what the visible pieces belong to. Make regional map orientation, the focus map and the saved AI exercise understandable without merging their saved states. Use short headset-readable steps and the same content in the browser.

At selection and preview, explain available actions, costs, known restrictions and uncertain consequences using the rules engine. After resolution, connect accepted orders to recorded effects. For example, a movement order reaching an objective area and a later delivery action have different effects under this game. The explanation should identify the relevant rule and events, not infer the player's intention.

Provide optional hints in increasing detail: reminder → relevant constraint → worked explanation. Explain mechanics without automatically selecting the learner's plan. Keep hints available on request and record their use. Assessment mode later fixes permitted assistance in advance.

**Deliverables:** one guided exercise; stable explanation/rule identifiers; a reviewed set of approximately 20–30 common questions and misconceptions, with expected answers and evidence; a short comprehension check.

**Acceptance:** a learner can state the objective, describe a round, submit a valid order and explain its recorded consequence. All reviewed factual explanations match the pinned rules/events; private or future information is absent. Repeat the complete slice in browser and physical Quest. Owner testing establishes usability; teaching effectiveness needs additional learners.

### 2. Add an evidence-based debrief and next practice

Select up to three useful decision points after the exercise. Show the learner's historical view, the actual order and outcome, then ask what they expected. Only after their response, offer a reviewed alternative and its assumptions. Separate **observed consequence**, **estimated alternative**, and **instructor judgment** visibly.

A later counterfactual tool can branch a saved checkpoint in an isolated analysis run. Compare the same alternatives under paired opponent assumptions; report the assumptions and variation, not “the optimal decision.” A branch using postgame information must be labeled as hindsight and kept out of live player advice. It never rewrites the original exercise.

Begin a small learner record with explicit tags such as objective comprehension, action sequencing, resource coordination and revising assumptions. Retain supporting decision IDs, assistance and uncertainty. Missing rationale is unknown; a loss is not a diagnosis. Select the next authored practice variant from those tags, initially through transparent rules. Adapt between exercises, and keep formal assessments on fixed conditions.

**Deliverables:** a brief/debrief rubric, reviewed examples, linked feedback, and a changed practice vignette. Start with a small usability pilot, such as 5–8 learners, before designing a larger learning study. Use the existing proposed [reasoning rubric](../scenarios/ai-evaluation.md#human-competition-and-learning-rubric), reviewed by an instructor and checked for disagreement on a sample.

**Acceptance:** explanations remain correct when a learner loses, receives a hint, or a referee changes the result; feedback distinguishes missing evidence from mistakes. Learners explain the concept in a different vignette without the same hints. Report comprehension, transfer, rule lookups and usability separately from game wins. A small pilot does not establish educational efficacy.

### 3. Make training data and evaluation reliable

Extend the existing runner and capture system rather than writing a second simulation. A long-lived Node process should handle batched episodes through the shared `observe`, order validation, joint resolution and advancement functions. A Python learner can exchange structured batches with it. A proposed reset/step adapter must preserve simultaneous sealed orders: neither learning side receives the other's current commitment. PettingZoo's Parallel API is an optional interface reference for joint actions, not an authorization implementation. [T3](#t3)

Maintain two separate datasets:

| Dataset | Inputs and targets | Principal quality check |
| --- | --- | --- |
| Opponent decisions | Permitted observation, complete legal candidate plans, selected plan, teacher scores/outcomes, policy and reward versions | No private/future information in policy inputs; legal complete order batches; reproducible transitions |
| Teaching examples | Learner question or decision context, permitted rule/event evidence, reviewed explanation or hint, rubric tags and reviewer corrections | Claims resolve to evidence; no invented intent; assistance, audience and disagreement retained |

Give every export a manifest with source runs/decisions, rules/map/scenario versions, extraction code version, teacher/model revision, seeds, exclusions, permissions, split assignments, lineage and hashes. Keep privileged outcome labels separate from inference inputs. Human training permission is currently **unspecified** in exports; exclude those records until their permitted use is recorded. Synthetic episodes can start the opponent pilot without participant data. Referee-modified histories can support reviewed teaching examples but remain separate from clean policy evaluation.

Split before labeling or tuning. Related replays, imports and branches stay together. Group humans by participant/team only where authorized linkage exists; current run-scoped identities cannot prove participant-independent splits. Reserve unseen variants for the first single-scenario experiment. Later, use the existing four-region evaluation plan with historical/fictional companions in the same region group; the eight existing scenarios alone do not demonstrate broad transfer. Keep final test cases out of retrieval examples, demonstrations, tuning and checkpoint selection.

**Acceptance:** exact replay and interactive/headless parity; hidden-state variation tests; every training example traces to evidence; excluded records and missingness counted; no related run crosses splits. Measure completed episodes, decisions and joint steps per second, CPU/GPU memory, disk growth, and end-to-end latency.

### 4. Strengthen and calibrate the authored opponent

Freeze the current opponent as a comparison baseline. Deduplicate or repair the `deadline` baseline, inspect the planner's shortlist coverage, and tune a small set of explicit weights/search choices on development variants. Retain the existing legal fallback and referee takeover. A model cannot rank a good plan that candidate generation never offers.

Keep Novice, Standard and Advanced as the initial labels. Change decision quality through planning depth, coordination and controlled choice among reasonable plans. Difficulty, behavioral style and scenario handicap are different settings. Preserve the same rules and information at every level; never silently throw matches or change resources mid-exercise. The existing **Short window** is a scenario variant, not a difficulty setting.

Evaluate both roles separately, against distinct frozen policies and later human testers. Report mission/joint/shared-failure outcomes, invalid proposals, fallback/timeouts, predictability and latency. Compare paired variants with uncertainty intervals, not only a pooled win rate. The existing [evaluation protocol](../scenarios/ai-evaluation.md) proposes 20 held-out variant/seed pairs per scenario/role/baseline, or 1,280 matches per candidate against four genuinely distinct baselines; begin with a cheaper smoke suite before this full workload.

**Acceptance:** difficulty labels correspond to measured differences and human challenge ratings. If levels overlap, adjust or merge them. If one side dominates because of scenario design, calibrate the scenario separately and version it; do not present imbalance as intelligence.

### 5. Train a compact plan scorer, then consider reinforcement learning

First collect approximately **10,000–50,000 synthetic decision examples** from the strongest evaluated planner across varied legal states. Include difficult and failed positions, legal alternatives and teacher quality flags. Add reviewed human examples later if available. Training on a weak planner can reproduce its weaknesses; teacher outputs are estimates, not optimal labels.

Train a **100,000–1 million parameter** candidate-ranking/value model. Encode game capabilities, resources, deadlines and relative geometry rather than memorizing equipment names or absolute map IDs. Rank complete valid order batches, or construct them sequentially with batch-level revalidation; individual legal-action masks alone cannot enforce shared budget and mutual exclusions. Version feature normalization, candidate ordering and observation/action schemas with the checkpoint.

Compare imitation with the tuned authored scorer at equal decision budgets. Revisit states the learned policy itself encounters and obtain reviewed/teacher labels for failures. Promote a model only if held-out play improves, or comparable play becomes meaningfully cheaper, while legality, information boundaries and responsiveness remain intact. Otherwise keep the simpler planner.

If imitation plateaus and the environment is trustworthy, pilot reinforcement learning against a mixture of frozen baselines and earlier model snapshots. Begin with one learning side per experiment; train both roles separately. A proposed cap is **100,000 joint environment steps per training seed, three seeds**. Extend toward a million only after learning curves and held-out performance justify it. Frozen opponent mixtures help test exploitability and forgetting; repeated play against a single copy can produce brittle habits.

Use the scenario's individual mission reward and shared requirements from the [existing reward specification](../scenarios/ai-evaluation.md#rewards-and-exploit-resistance). These exercises are not uniformly zero-sum. Keep learning rubrics separate from game rewards; distinguish terminal results from truncations and infrastructure failures. Test stalling, repeated-action score farming, forgotten shared obligations and private-information leakage.

Masked PPO is a candidate, not a selected dependency. SB3-Contrib documents mask-aware evaluation requirements and no recurrent-policy support; it is not a ready-made multi-agent league. A memory-dependent policy requires a compatible design and an observation history contract. [T4](#t4)

**Acceptance:** compare at least three training seeds against frozen baselines and previous champions, on untouched variants. Report proposal validity before fallback, completed-match results, cost and failure cases. Checkpoint selection uses validation only. Deploy a versioned artifact behind the current worker/validation boundary, with schema checks, timeout handling, save/reload parity and rollback to the authored policy. Training remains offline; classroom sessions use a frozen policy.

### 6. Add conversational flexibility only where it helps

Once reviewed teaching examples exist, compare authored explanations with a prompted small language model using retrieved, versioned rules and role-permitted event records. Retrieval supplies current evidence at answer time; it does not train the model. Start with local structured lookup and text search; an embedding database is optional if search quality requires it.

Evaluate questions about missing evidence, ambiguous results, stale rules, referee changes, and attempts to obtain the opponent's private information. Treat retrieved notes as evidence, not instructions. Require evidence references and an explicit “not enough information” response when warranted. A chat model does not receive order or referee privileges.

Only fine-tune an adapter if prompting/retrieval repeatedly fails on a defined teaching task, such as concise explanations or appropriately timed questions. Train on corrected teaching examples, including uncertainty and useful abstention. Fine-tuning on raw manuals alone cannot teach the current game's actions, guarantee factuality or establish teaching skill. Keep rule knowledge in the versioned evidence source and compare the adapted model against the unchanged baseline on held-out examples. Exact checkpoint, license, runtime support and local memory fit must be checked before download/training. [T2](#t2)

**Acceptance:** correct supported claims and citations, no leaks in the boundary tests, useful feedback rated by instructors, tolerable answer latency, and no regression in learner comprehension/transfer. Parameter loss or conversational fluency alone is insufficient.

## Information needed from the owner

Ask these **one at a time** when needed. Audience, team planning, browser participation, WebXR, automated adjudication with human takeover, and the teaching-first priority are already confirmed.

| Decision/input | Why it matters | Suggested working assumption |
| --- | --- | --- |
| Who can review teaching content and learner explanations? | Defines credible feedback and rubric labels | **Confirmed:** the owner and an instructor are the evaluators; their reviews are pending |
| First teaching scenario and lesson | Bounds the initial content and acceptance trial | Second Thomas Resupply baseline; understand objectives, order sequence and consequences |
| Intended session length and milestone date | Determines guidance length, test scope and training budget | Deliver one complete teaching slice before setting a broader schedule |
| Instructor/learner availability | Determines usability pilots, demonstrations and learning evaluation | Start with owner plus a few volunteers; do not assume institutional access |
| Guidance preference | Determines whether practice offers hints, worked examples or only debriefs | Optional graduated hints in practice; fixed assistance in assessment |
| Permitted references and human-data reuse | Determines source inclusion, training exports and retention | Our versioned rules and synthetic play first; human reuse remains excluded while permission is unspecified |
| Local job window and resource budget | Determines concurrency, memory/disk caps and acceptable laptop load | Local, resumable jobs; start small and measure; no assumed cloud budget |
| What stronger opposition should improve | Defines model selection beyond winning | Less repetition and better measured challenge, with explicit difficulty; instructor calibration later |

The next input is their review of the [32-example packet](../training/guided-policy-v1-review.md) and the live pilot. Expert trajectories, a large document corpus and paid compute are not prerequisites for the first guided exercise. Reviewed teaching examples are more valuable at that stage than a large volume of unlabelled games.

## Original planning verification and remaining risk

The checks in this section belong to the earlier planning pass. The [training follow-up](../training/guided-policy-v1.md#verification-and-limits) records the subsequent implementation, actual CPU training, full test results and browser checks.

This planning task created the requested branch while preserving existing uncommitted work, inspected current code and prior research, refreshed the hardware/package inventory, and checked current primary framework documentation. The 16-case baseline comparison ran without opening a live exercise database. The larger 192-match figures above come from the saved report and were not rerun here.

Handoff checks:

- **28/28 tests passed**, none skipped: `node --test tests/opponent-rules.test.ts tests/opponent-geography.test.ts tests/opponent-session.test.ts tests/opponent-capture.test.ts`. These exercise existing rules, geography, sessions and capture; they are not trained-model tests.
- `npm run typecheck` passed on the latest checked working tree. An earlier invocation caught a narrowing error in the concurrently added `guidance.ts`; that work resolved it before the successful recheck. This planning task did not edit runtime files.
- `git diff --check` passed. The plan's relative file targets and its README/research/requirements references were checked; external sources were opened separately.
- No production build, fresh full tournament, physical headset trial, GPU training benchmark or learning trial was run for this plan.

No model, dataset builder, training adapter or tutor was implemented by this planning task; no dependency was installed and no participant data was used for training. The important uncertainties are scenario balance, distinct opponent strength, teacher/example quality, actual local training throughput, and instructional benefit on the physical headset and with learners.

## Current technical sources

Accessed **2026-09-16, America/New_York**. These are framework capabilities, not measurements of this project. Earlier research sources and education references remain linked from the documents above.

### T1

[PyTorch 2.14: MPS backend](https://docs.pytorch.org/docs/2.14/notes/mps.html), **MPS backend**, availability/build checks and moving tensors/models to `mps`. Supports investigating Apple GPU execution; does not verify this Python environment or our future training operators.

### T2

[MLX LM](https://github.com/ml-explore/mlx-lm), README introduction and fine-tuning features; [LoRA/QLoRA guide](https://github.com/ml-explore/mlx-lm/blob/main/mlx_lm/LORA.md), **Fine-tune**, **Data / Local Datasets**, and **Memory Issues**. Documents low-rank adaptation, quantized-model handling, JSONL and checkpoint artifacts. Exact model support and memory fit still require a local experiment.

### T3

[PettingZoo: Parallel API](https://pettingzoo.farama.org/api/parallel/), **Parallel API** and **Usage**. Describes simultaneous per-agent actions and per-agent observations/rewards/termination; using it would not itself enforce our permissions or sealed-order semantics.

### T4

[SB3-Contrib: Maskable PPO](https://sb3-contrib.readthedocs.io/en/master/modules/ppo_mask.html), **Can I use?**, evaluation warnings and **Example**. Documents action masking, required mask-aware evaluation, multiprocessing mask placement and the recurrent-policy limitation. Version selection and XRiegsspiel integration remain future work.
