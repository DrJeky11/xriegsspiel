# Quest trial fixes

Follow-up to the [owner's 7:45 p.m. test](quest-test-2026-09-16-1945.md), implemented on `codex/quest-test-guidance-fixes` from `d1371ad`. The original review remains a record of the earlier build. These are software fixes verified locally; a new physical Quest trial has not occurred.

## Changes

| Review finding | Implemented behavior |
| --- | --- |
| Purpose and first round were unclear | New AI scenarios open a mission briefing with role, objective, deadline, geographic context, ships/cargo, action sequence and a separate learning focus. Browser and controller panels provide optional first-round guidance. Full rules remain available. |
| Short window concealed unavailable transports | Setup explicitly distinguishes round-one Baseline ships from round-three Short window ships, with six rounds total. Unavailable roster entries explain their return round. Planning and sealing show remaining CP and groups that can still act. Baseline was already the default; that default was not changed. |
| Regional context disappeared | A persistent browser label identifies mode, map, saved assembly or AI run, and round. A display-only locator marks the approximate close-up area on its matching regional map. The locator uses regional hexes and does not copy ships, create saved pieces or provide a second movement grid. |
| Assembly and AI rosters looked interchangeable | Controls say **New map assembly**, **New AI scenario** and **Show saved map assembly**. Assembly controller palettes identify the mode and map. The interface explains the separate saved states. |
| Reopening AI showed the wrong terrain | The AI tab and **Return to active exercise** restore the retained scenario's map before rendering its units. The controller settings offer the same return action. Stale in-flight refreshes are invalidated when changing runs. |
| Results did not explain consequences | Resolution opens a paginated controller summary and a browser summary before Next round. They report spent/expired CP, recorded order outcomes, interruptions and objective changes. They explain why report work or movement produced zero deliveries. Detailed events, contests and historical review remain available. |
| Loading felt slow, cause unknown | Both HTML entry points show loading status before the application bundle finishes. Local measurements cover code startup, terrain, catalogs/reference data, map construction, miniature classification, database joining, assembly restoration and AI initialization. **Terrain & regions → Loading measurements** displays timings and offers JSON export; `window.__loading` exposes read-only diagnostics. |

No rule versions, delivery thresholds, AI policy, authority, database schema or dependencies changed. The current rules still require a later Deliver action at Sierra Madre, one action per vessel, three CP and at most three orders per round. The guidance uses the player's permitted observation and recorded results; it neither chooses nor submits orders.

## Verification

- Production build and TypeScript checking passed; the existing large-bundle warning remains.
- All **115 automated tests passed**, including eight new cases for Short window availability, Baseline guidance, draft reservations, the narrated verify/move/share sequence, historical summaries, private-event filtering, interrupted movement, actual delivery, all eight scenarios in both roles, and regional locator isolation. Several assertions share one test case.
- The first sandboxed test attempt could not bind local ports. Repeating with loopback access passed the HTTP integration tests; this was an environment restriction, not a gameplay failure.
- An isolated production service used port **5176** and `output/quest-fixes/test-data`, separate from the owner's exercise database. Browser verification used the available in-app browser after the Playwright CLI could not reach its package registry. No dependency was installed.
- A fresh Baseline run opened the mission briefing. A Short window run reproduced B3's move to `11,-14` and B-Q1 verification in round 1, sharing in round 2, and advancement to round 3. Shared controller callbacks showed one expired CP in round 1, two in round 2, zero deliveries, no Blue movement in round 2, and ready transports in round 3.
- With separate test assemblies containing two focus pieces and seven regional pieces, exercised AI close-up → regional assembly → AI tab, the browser Return button, and the controller Return button. Read-only database snapshots matched all six active assembly run IDs/revisions/state hashes and both AI state hashes exactly across those transitions. The retained Short window run stayed at round 3/revision 4 during the comparison.
- Subsequently advanced that isolated AI run through rounds 3–6 with empty plans and finished scoring through controller callbacks. Each round showed a summary and the final result was Red win, 35 Blue / 100 Red. This checks UI completion, not competent play or balance.
- Inspected the regional locator, restored close-up ships, normal browser briefing layout and controller preview. Also started a Red-role Hormuz scenario. No browser errors were recorded in these flows.
- One **warm desktop reload** reported ready after **0.79 s**: map/rules construction 538 ms, equipment reference 35 ms, assembly restoration 31 ms and AI initialization 32 ms. Stages overlap and must not be summed. This is a local measurement, not a cold load, Quest result or proof that file size causes the reported delay. No speculative loading optimization was applied.
- The timing export button is implemented; the in-app automation did not observe a download event, so file receipt remains unverified.

Verification artifacts are retained locally under `output/quest-fixes/`. The work was copied byte-for-byte into a separate worktree when another concurrent task switched the shared checkout to `agent-training`; only these fixes and their verification records belong to this branch.

## Targeted Quest retest

1. Reload the fixed build before entering MR. Start **Baseline** and, from the briefing alone, explain your side, three-delivery target, end-of-round-6 deadline, B1/B2 cargo and the later Deliver action. Use the optional first-round guide without a facilitator explaining CP.
2. Start **Short window** separately. Confirm that the chooser, roster and planning panel explain round-three supply availability and six rounds total. Draft a B3 order, inspect the still-available Staff group, and inspect unused CP before sealing.
3. Read a round summary, then its detailed events. Explain whether the ship moved, whether anything was delivered, and the recorded reason for any interruption. Check summary pagination, readability and contest controls in MR.
4. Switch AI close-up → regional assembly → active AI, using both the AI tab and controller return. Identify the locator and separate assembly roster. Confirm the same run, round and ship positions in a companion browser. Check for additional clipping or framing defects; desktop checks cannot exclude them.
5. Repeat grip pickup, valid/invalid release and palette movement during that flow. This patch preserves those interactions; it does not establish physical reach, targeting or comfort.
6. Record a cold Quest load and a warm reload with device/browser version and connection method. Inspect/export the stage timings, then profile the slow stages before deciding whether to defer reference data or split bundles.
7. Complete a played match on the headset separately. Record readability, missed input, frame timing and comfort during a sustained session. Learning effectiveness and human balance remain separate assessments.
