# Opponent training and human evaluation

**Original experiment specification, 2026-09-16.** This library supplies tasks and scoring, not a trained policy, demonstration corpus or complete simulation environment. Historical articles provide context; they lack the legal action sets, observations and counterfactual outcomes needed for supervised decision training. Do not label the action taken in history as the optimal action.

## Build and measure in this order

| Stage | Concrete work | Evidence required |
| --- | --- | --- |
| 1. Facilitated rules trial | Run SPR-H01 with two sides; record every decision and outcome; inspect obvious dominance, incentives and unclear rules | Both sides can change the outcome in at least one legal trajectory; every metric can be reconstructed; unsupported rulings identified |
| 2. Shared resolver | Implement sector actions, sealed commitments, ownership, item identity, objective events and referee branches | Browser/Quest and headless commands resolve identically; terminal metrics derive from events; legal actions complete whole episodes |
| 3. Baselines | Implement Hold, seeded legal-random, mission-greedy, cautious assurance, and deadline-aware policies for both roles | Complete episodes, legal-action/error rates, results by scenario and side, baseline cross-play table |
| 4. Search | Shortlist legal task plans; compare bounded lookahead under the side's observation and explicit belief model | Same observations and rules as humans; fixed compute limits and timeout fallback; improvement against several frozen baselines |
| 5. Imitation pilot | Collect instructor-reviewed decisions from game runs; train a compact action-ranking policy | Participant/team split, known assistance and consent, held-out legal-action and outcome performance; comparison to authored policy |
| 6. Reinforcement learning | Train policy/value functions on the tested shared resolver; use a population of frozen past opponents | Multiple training seeds; held-out cross-play; exploit analysis; no hidden-truth observation leakage |
| 7. Classroom evaluation | Compare people under equivalent briefings, variants and assistance | Mission, costs, reasoning and transfer reported separately; no inference of real-world command ability from win rate |

Stage 2 is a prerequisite for automated self-play. The supplied terminal calculator is **not** a `step()` environment, and its synthetic example cannot train a useful opponent. Start with a small CPU policy/value model over structured game state; no foundation-model training or dependency upgrade is justified yet. Search and authored policies may remain the better solution if they meet the measured need.

## Environment and observation contract

Suggested adapter: privileged `reset(manifest, variant, seed)`, per-role `observe(role)`, and one joint `step({blueOrders, redOrders})` after both commitments seal. Return per-role observations, rewards, terminal/truncation flags and permitted explanations. A [PettingZoo parallel interface](https://pettingzoo.farama.org/api/parallel/) can wrap this contract later; its API does not implement our rules or authorization.

An observation contains round/deadline, public token positions and capacities, own orderable assets, public completed transfers, own verified/received reports, permissible actions, own CP and publicly disclosed pressure expenditure. It excludes future injects, referee truth cards, opponent-private records and sealed orders. Use recurrent memory or explicit report histories if past observations matter. Mask actions from known prerequisites only. Do not include a hidden metric through a reward, tooltip, error, file name or deterministic seed encoding.

Action representation: typed action ID, subject ID, target sector/item/record/agreement and effort. Enumerate legal candidates through the engine. Avoid a free-text action space for the first policy; fluent explanations cannot validate a move. A language model, if later evaluated, ranks the same candidates and submits through the same validator.

All episodes pin scenario/rules/map/geography/observation/action/reward versions, variant hash, initial state hash, random generator/state, policy hash, compute limit and assistance setting. The facilitator baseline is deterministic after commitments; randomness is optional in choosing predeclared variants and in policies. A seed alone is insufficient without versions and event records.

## Trajectory format

Use JSONL records with a schema version. Keep policy-visible data physically separate from privileged adjudication and personal identifiers. A proposed decision record is:

```json
{
  "schema": "xriegsspiel-decision/1",
  "runId": "example-not-a-real-run",
  "scenarioId": "SPR-H01",
  "scenarioVersion": "1.0.0",
  "rulesVersion": "maritime-crisis-rules/1.0.0",
  "variantHash": "required-on-export",
  "round": 3,
  "role": "blue",
  "actorKind": "human",
  "teamGroup": "pseudonymous-split-group",
  "observationId": "blue-observation-3",
  "legalCandidateIds": ["candidate-1", "candidate-2"],
  "selectedCandidateId": "candidate-1",
  "accepted": true,
  "rationaleId": "optional-side-visible-note",
  "causalEventIds": ["resolved-event-8"],
  "assistance": "none",
  "refereeModified": false
}
```

The actual observation snapshot, candidate payloads and post-action event record must accompany referenced IDs. This sketch alone cannot replay an episode. Add episode outcomes, component score vector, terminal reason, intervention lineage and data-use permissions in linked records. Count an objective by unique item ID and accepted event, never by a model's textual claim. Keep rejected inputs, timeouts and retries available for reliability analysis without treating them as accepted decisions.

For imitation, reviewers label a decision **defensible, questionable, or insufficient context**, give a brief reason and optionally identify alternatives from the contemporaneous candidate set. Retain disagreement. Winning is not an expert label; a defeated team may have made defensible decisions. Do not train on private human communications without permission for that use.

## Rewards and exploit resistance

First train with terminal rewards only. A proposed **individual mission reward** is +1 for that role's mission success (including joint success), 0 for contested, and −1 for its mission failure, shared failure or its critical breach. In `double_failure`, both receive −1. In a single-side critical-breach outcome, the nonbreaching side receives **0**, not +1: an opponent's violation is not a demonstrated mission accomplishment. Use that rule consistently in training manifests even though tournament adjudication awards a constraint win. An incomplete/truncated run has no terminal game reward; log and investigate it, never relabel it as defeat. Any use of bootstrapping after an infrastructure timeout must be explicit in the learner configuration.

Report the 0–100 vector for diagnosis, but **do not start by training on the entire weighted score**: it could reward reporting or holding resources while losing the mission. Human reasoning-rubric scores are a separate research target, not opponent rewards. For negotiation exercises, individual rewards make cooperation possible; zero-sum `(blueScore − redScore)` would change their purpose.

If sparse learning later needs shaping, preregister a bounded potential on **unique, irreversible, role-visible objective progress** and use `gamma * Phi(next) − Phi(current)`, with terminal potential zero. Compare shaped and unshaped policies on the same unshaped mission metric. Do not pay for repeated movement, requests, reloads, challenge attempts or false reports. Do not claim shaping guarantees good behavior in this imperfect-information multi-agent setting.

Adversarial checks before promotion: repeated cargo transfer/exit, renamed objective IDs, a last-round completion, stale/retried commands, farming Verify/Share, pressure regeneration, concealing CP overuse, illegal own/opponent control, scoring before a pending contest closes, intentional timeout, abandoning rescue, inducing an opponent's penalty and inferring private reports from masks/rewards. Referee-modified runs go into a separate teaching dataset.

## Curriculum, splits and budget

Start with full-information SPR-H01 task planning, then deadline/medical exceptions, passage/report uncertainty, and finally the two negotiation/rescue exercises. Difficulty changes policy planning budget or authored variants, never secretly changes physics, information entitlement or score weights.

These eight briefs form only **four regional families**, and share substantial mechanics. Treat a historical scenario and its fictional companion as one family for leakage control. Use leave-one-region-out outer evaluation: train on three regions, hold out both exercises in the fourth, and rotate for four separate experiments. Within the training regions, split whole teams, episodes, variants and report templates for development validation. Never split neighboring decisions from one replay across train and test. A few families support exploratory transfer evidence, not a broad generalization claim. Test assets and expected score examples are public engineering fixtures, not secret evaluation cases.

Initial **proposed pilot budget**, to revise after profiling: collect 40 facilitated episodes across roles/variants before deciding whether imitation data are adequate; for each automated experiment use three independent training seeds with a ceiling of 100,000 environment joint steps per seed, reporting actual wall time and hardware. This is a cost cap, not a forecast of convergence. Freeze selection using development validation. No training run or throughput measurement has occurred for this library.

For each frozen policy versus each baseline, schedule 20 predeclared held-out variant/seed pairs in each role per scenario: 8 × 2 × 20 = **320 matches per opponent policy**. With four non-Hold baselines this is 1,280 matches per candidate; keep Hold as a separate sanity fixture. Pair the same variants across candidate policies and invert tie priorities where applicable. These sample counts are an initial workload, not a statistical power calculation.

Report role-specific mission success, joint success, contested/shared-failure rates, score components, invalid actions, timeouts, constraint breaches, latency and memory. Use paired differences and confidence intervals clustered by variant, not millions of correlated action rows. Show each scenario and each role rather than hiding asymmetric difficulty in a grand mean. There is no pretrained model promotion threshold until instructor playtests establish usable scenarios; at minimum require no known rule/knowledge exploit and demonstrable improvement over the strongest relevant authored baseline.

## Human competition and learning rubric

For a head-to-head session, play a two-leg fixture with sides exchanged on matched but previously unseen variants; keep planning time, device, assistance and referee procedure fixed. Counterbalance which side a team plays first. If the second leg repeats a disclosed truth card, label it a learning replay, not an independent assessment. Award 1 match point for a mission/constraint win, 0 for loss, and 0.5 each for contested or joint success. Shared/double failure gives **0 each**; incomplete legs are rescheduled. Match points are administrative tournament rules, distinct from RL rewards and mission attainment.

Do not break a fixture tie using raw totals from different asymmetric roles. Use a new matched fixture or report the tie. Report safety failures separately even for the higher-ranked team. Establish role baselines and scenario difficulty before comparing different cohorts. HOR-H01 explicitly includes a potentially dominant cautious policy and must be calibrated before competitive ranking.

An instructor rates each dimension 0–4 using evidence available at the decision: 0 absent/contradicted; 1 asserted without support; 2 partially supported; 3 coherent and supported; 4 supported with alternatives, uncertainty and a clear revision trigger. Total **0–20** is a proposed rubric, not a validated instrument.

| Dimension | Evidence to assess |
| --- | --- |
| Mission framing | Priorities, deadline and acceptable costs stated before orders |
| Information judgment | Facts distinguished from claims; consequential uncertainty identified |
| Resource coordination | Allocation reconciles capacity, timing, ownership and competing duties |
| Adaptation | Changed assumption linked to a justified plan revision |
| Explanation and transfer | Team explains tradeoffs and applies reasoning to a changed vignette |

Rate a sample with two instructors and retain disagreement before relying on the rubric. Record experience and assistance, use a different pre/post vignette and a later transfer check where feasible. Compare learning, rule fluency, enjoyment, interface comfort and mission outcomes separately. An AI Sensei may summarize evidence with event/rule citations; it must not invent intent, reveal private information during play or silently become the referee.
