# Maritime crisis scenario library

**Version 1.0.0 · authored and researched 2026-09-16.** Eight original educational exercises: one historical adaptation and one plausible fictional companion for each requested location. These are scenario designs with an executable **offline score calculator**, not eight newly playable scenarios in the geographic app. No model has been trained and no balance or learning-effectiveness trial has occurred.

The owner authorized creative scenario development for opponent training and human competition. This library develops the earlier [Island Resupply proposal](../research/objectives-and-victory.md) into a broader set. Start implementation with **SPR-H01**, whose delivery objective is closest to the existing movement/cargo foundation.

| Map/location | Historical adaptation | Plausible fictional exercise | Main decision skill |
| --- | --- | --- | --- |
| Spratly Islands | [SPR-H01: Second Thomas Resupply, 17 June 2024](spratlys.md#spr-h01-second-thomas-resupply) | [SPR-F01: The Medical Window](spratlys.md#spr-f01-the-medical-window) | Deliver under pressure; protect an essential exception |
| Senkaku / Diaoyu / Diaoyutai | [SEN-H01: Collision and Custody, 7 September 2010](senkakus.md#sen-h01-collision-and-custody) | [SEN-F01: Distress Without Consent](senkakus.md#sen-f01-distress-without-consent) | Evidence, competing authority, rescue coordination |
| Strait of Hormuz | [HOR-H01: Stena Impero, 19 July 2019](hormuz.md#hor-h01-stena-impero) | [HOR-F01: The Unreliable Picture](hormuz.md#hor-f01-the-unreliable-picture) | Limited support, transit decisions, uncertain reports |
| Bab al-Mandeb | [BAB-H01: After Swift, 1 October 2016](bab-al-mandeb.md#bab-h01-after-swift) | [BAB-F01: Convoy and Mayday](bab-al-mandeb.md#bab-f01-convoy-and-mayday) | Rescue versus continuity of passage |

“Historical” means the initiating incident is documented. Exact tracks, classified intentions, orders, capabilities, and complete information available to participants are not reconstructed. Each historical exercise identifies its counterfactual decision boundary. Its result need not reproduce history. Fictional exercises combine documented recurring pressures; **no numerical probability or forecast that these particular events will occur is claimed**.

## Use the library

1. Read the selected location brief and [common adjudication rules](adjudication.md). Give teams only their briefing and current reports. Two players command one side each; four divide each side into operations and information/logistics. A facilitator adjudicates; if none is available, use full-information practice and disclose that limitation.
2. Use the named map as geographic context and the specified **abstract sector overlay** for decisions. Tokens, sectors, command budgets, delays, and rounds are authored game quantities, not real navigation or weapons models. Do not convert rounds into minutes or hex movement budgets into ship speed.
3. Play the stated number of rounds, collect objective events and rulings, then evaluate the terminal ledger. Compare mission outcome, the two 0–100 scorecards, and the separate reasoning rubric. High secondary points never buy a failed mission.
4. Use [AI training and evaluation](ai-evaluation.md) to collect trajectories, establish baselines, and define experiments once the decision resolver and authority layer exist.

The [source register](sources.md) records URLs, access dates, locators, evidence disagreements, and retrieval limits. National labels identify scenario roles, not endorsements of territorial claims. These exercises do not change the existing US/China equipment catalog. Philippines, Japan, Iran, the UK, UAE and civilian actors require separate generic scenario tokens; substituting an unrelated US/Chinese catalog vehicle would misrepresent history.

## Machine-readable content and commands

- [Versioned definitions](../../scenarios/maritime-crises.v1.json): eight manifests, map IDs, actor labels, bounded terminal metrics, score weights, mission predicates, consistency constraints and source IDs.
- [Offline calculator](../../scripts/score-scenarios.mjs): validates definitions and referee-supplied terminal ledgers; computes scores and outcome precedence. It does **not** infer events from a replay or implement actions.
- [Example ledger](../../scenarios/example-ledger.json): synthetic SPR-H01 data showing three deliveries and a Blue mission win. It is not a recorded playtest or training demonstration.

```sh
node scripts/score-scenarios.mjs --validate
node scripts/score-scenarios.mjs scenarios/example-ledger.json
npm test
```

Complete ledgers must identify `scenarioId`, `scenarioVersion`, `rulesVersion`, completed rounds, all defined metrics, and whether referee intervention occurred. The calculator rejects unknown/missing metrics, fractional counts, declared cross-metric contradictions and incompatible versions. Aborted runs return `incomplete` with no score. A ledger is trusted facilitator input: schema validation cannot prove its historical truth or that play obeyed the rules.

## Scope and integration sequence

Existing geographic maps, rendering and cargo identity are useful foundations. Current shared control, unrestricted assembly and full-state broadcasting are inappropriate for competitive assessment. Before automated play, implement authenticated ownership, frozen setup, sealed commitments, the common sector resolver, scenario-specific actions, event-derived objective ledgers, role-filtered observations and referee branching. Keep those modules behind the same commands for humans and bots.

The current app's year selector ends at 2026 and its saves use a different schema. Fictional scenarios have **no calendar year**; historical terrain uses today's pinned cartographic snapshot, not a reconstruction. These JSON files must not be imported as geographic saves. Scenario overlays and generic actor tokens are not implemented in the app.

The first facilitated trial should check whether both sides have meaningful choices, whether ties and rescue obligations work, and whether the score rewards the intended behavior. Change parameters by creating a new version and retaining old ledgers. The initial numbers are testable starting values, not validated estimates of national capability.
