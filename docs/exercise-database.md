# Exercise database and learning review

**Implemented and activated locally, 2026-09-16.** The owner approved phases 1–3 of the [implementation plan](design/data-capture-implementation-plan.md): durable capture, reconstruction and initial analysis. The authoritative store is `DATA_DIR/exercises.sqlite`; the default is `data/exercises.sqlite`. This is separate from the equipment catalog database. No dependency was added.

## Use it to learn from a game

1. Refresh Pacific or CENTCOM after updating the service. **Pieces & orders** shows database capture status, a run ID and a participant label. Each map keeps its own active exercise.
2. Open **Exercise review** to enter a title and learning objective, including before the first order. During play, an optional intent field records a short shared explanation with the submitted order.
3. Play normally with browser controls or Quest controllers. The shared command path stores the order, the historical information supplied to that participant, validation context, rule result and resulting state. New exercise and import create distinct runs and preserve the previous one.
4. Use **Finish exercise & review** when the map exercise ends. This freezes its game actions and opens the archive. Start a new exercise or import a checkpoint to continue as a new run. Opening review alone does not finish a game.
5. In [Exercise review](http://127.0.0.1:5174/review.html), select a run and move through its decision timeline. Switch between **Decision view**, **Validation state** and **After resolution**. Inspect costs, cargo changes, restrictions, retries and participant evidence. Add a reflection, assumption or assessment; identify the rubric and version for an assessment.
6. Open **Trends & analysis** for rule/interface friction, movement and transport choices, and participation/pacing. Export the evidence as JSON/JSONL or a comparison CSV.

Default development URLs use port 5173; the existing local handoff uses 5174. The archive is `/review.html` on whichever service owns the exercises.

The archive is a separate 2D historical viewer. The original live Pacific and CENTCOM terrain renderers remain intact. It reconstructs game state and available information, not a video of the participant's screen or headset movements.

### Opposed scenarios

[Scenario learning records](http://127.0.0.1:5174/scenario-review.html) use saved scenario invitations from the same browser, or an exercise ID and invitation key. They provide an order/control timeline, historical permitted board and reports, accepted/rejected plans, retry counts, retrospective notes and exports. A submitted plan can contain several individual unit orders; these counts are not pooled with geographic map commands.

During play, historical views and notes are restricted to the invitation role. A completed scenario makes both sides' history available under the existing scenario disclosure rules. Full exports include policy decisions, pinned rules/scenario source and archived referee branches. Unfinished scenarios expose only the requesting role's learning record. Replay branches remain marked as referee modified.

The geographic comparison dashboard covers map exercises. Cross-scenario outcome/learning dashboards and automated tutor judgments are future work; the underlying scenario evidence is now retained for those analyses.

## What is recorded

| Evidence | Handling |
| --- | --- |
| Exercise identity and versions | Separate run IDs; map/scenario/rules/catalog versions; content hashes and actual source/content artifacts; initial state; objective; status and lineage, including a verified source run/checkpoint and input hash for imports |
| Geographic decisions | Unique command result, server-established participant, browser/VR/MR interface, server times, accepted/rejected result, stable reason, before/after hashes and exact rule event |
| Historical information | The drafting view and validation view are linked separately. Geographic views distinguish issued, sent and client-reported presented evidence. Scenario views record issued and client-reported presented evidence. |
| State | Geographic state is content-addressed and checkpointed after each accepted action without repeating the history array. Scenario current state retains round checkpoints, both permitted observations and deterministic resolution history. |
| Rationale and assessments | Optional shared intent submitted with an order; attributed private/shared notes; retrospective timing and rubric metadata where supplied |
| Interface evidence | Bounded, deduplicated batches of semantic previews, restrictions, cancellations, help, disconnect/reconnect and XR lifecycle events; reported drops retained |
| Scenario authority | Sealed plans, policy version/seed, role-filtered views, contests, rulings, takeover, result ledger and preserved replay branches |

Geographic seats are pseudonymous browser identities, not verified people. A different browser/profile or cleared cookie creates a new identity; clearing it also removes access to that seat's private notes. Each database uses a separate cookie name so local preview servers on other ports cannot replace its seat. Valid legacy cookies and cookies from a restored copy migrate without changing the participant. Shared map commands and archives deliberately remain available to participants on this trusted local service. Scenario invitation credentials provide their existing separate access boundary. Public hosting and institutional authentication are outside this implementation.

No raw audio, video, room imagery or continuous controller tracking is collected. An observation establishes available information; a presentation acknowledgment does not prove attention or understanding. An absent note stays absent. Gameplay outcomes, elapsed time and learning quality remain separate.

Exports use run-scoped participant identifiers and label training permission **unspecified**. They are review/research artifacts, not an automatically approved training dataset. No cross-run individual learning score is inferred.

## Reports and missing evidence

Reports carry metric version `exercise-reports/1`, raw counts, denominators, source decision IDs and capture coverage. Retries do not become extra decisions; New/import operations and inherited setup/history do not inflate submitted-order totals.

Comparison groups require matching map/content/build, initial state, objective, run status and actor-source conditions. Imported or legacy starting histories are shown separately from pooled rates. Active and archived exercises form separate groups. No ready event, a late ready event or missing command time produces an unknown pacing value, not zero.

Resource values are authored movement points and cargo slots, measured at the last captured state of each turn. Cargo transfers are not automatically mission deliveries. Elapsed intervals include unobserved pauses. Help counts and drop counts describe captured client telemetry, not complete assistance coverage. Reports execute in read-only workers with bounded concurrency and timeouts so report generation does not run inside an order transaction.

## Durability, migration and one writer

Run one game service per data directory. The server uses SQLite WAL mode with full synchronous commits and explicit transactions. Accepted state, essential observations, command results, events and active-run changes commit together before success is published. A storage error rolls back the action and returns a retryable error. Retrying the same command ID cannot spend twice. Stop the service normally before maintenance that changes its files.

At first database startup, existing `maps/*.jsonl` and the historical `geographic-session.jsonl` are replayed and reconciled. New/import boundaries become separate runs; missing actor/time/view evidence is marked unknown. Originals remain unchanged. A malformed source is recorded as quarantined and startup fails with its path rather than quietly accepting a partial import. Subsequent startups use the database.

Existing standalone `opponents/*.json` sessions and their referenced branch files are verified and migrated when opened. Original files remain intact. Decisions made before this capture layer may have complete round history but lack submission times and original command-view references; those are not invented. Retired Island `session.jsonl` remains a historical file and is not silently converted into geographic rules.

Replay verifies exact stored transitions with the compatible executable rules and pinned content. Source and artifact hashes are retained. If a future mechanics change cannot reproduce an old run, use its matching application version for verification; do not rewrite that history to fit new rules.

### Back up and restore

From the repository root:

```sh
node scripts/capture-db.mjs verify --data=data
node scripts/capture-db.mjs backup --data=data --output=/absolute/path/exercise-backup.sqlite
node scripts/capture-db.mjs restore --input=/absolute/path/exercise-backup.sqlite --data=/absolute/path/new-restore-directory
```

Backup uses SQLite `VACUUM INTO` to produce a consistent standalone file, performs an integrity check and reports its SHA-256. It can run while the service is active. The destination must not already exist. Do not copy just a live `.sqlite` file while ignoring its WAL.

Restore requires a new directory, takes a consistent SQLite snapshot (including committed WAL pages if present), and verifies database integrity and geographic/scenario replay on that snapshot. Verification queries share one read transaction so concurrent play cannot produce a false mismatch. To use it, stop the current service and start one service against the restored directory:

```sh
DATA_DIR=/absolute/path/new-restore-directory PORT=5174 npm start
```

Keep an untouched backup before upgrades and take another after each facilitated exercise. The host must choose the retention period for the database, exports and backups; this release does not automatically delete evidence or backups. Backups contain all local evidence, including private notes and internal invitation/seat credential hashes. Share the role-filtered review export when the full backup is not intended.

After new orders enter the database, reopening an old JSONL journal would discard those later decisions. Recovery must preserve the latest database/backup and use compatible code or an explicit verified conversion. There is no permanent dual writer.

## Local verification and handoff

Observed on 2026-09-16:

- TypeScript and production build passed; the existing large JavaScript chunk warning remains.
- The final full **107-test repository suite passed on Node 22.18.0**, including the concurrent geographic-opponent update and the cookie-isolation regression. On Node 26.0.0, 104 tests passed in the main run; the two HTTP tests initially hit the sandbox's loopback-listener restriction and then both passed with that permission. The expanded 16-test capture suite passed after the cookie fix. Logs are in `output/data-capture-handoff/`. The minimum-version executable was downloaded from the official Node release and checked against its published SHA-256. Node 22 labels its built-in SQLite module experimental.
- Tests cover attributable HTTP clients, stale/duplicate orders, exact reconstruction and portable export, private-note and role-view boundaries, injected transaction write failures, abrupt process death and restart, backup/restore, legacy migration/quarantine, finish/restart boundaries and scenario referee branches. These are automated fixtures, not physical disk-failure or headset trials.
- Live migration rehearsal and cutover preserved all six maps exactly: Palawan overview had six pieces at turn 4, Taiwan/Senkaku overview six at turn 1, western Senkaku seven at turn 2, and the other maps remained empty. **13 exercise runs** were reconstructed, and all original journal SHA-256 hashes were unchanged.
- The service at port **5174** now runs this checkout with `data/exercises.sqlite`. The previous server in `output/worktrees/playable-terrain-workspaces` was stopped. Original pre-migration journals, source hashes, verification records, a consistent database backup and a verified restored copy are in `output/data-capture-handoff/` (gitignored).
- After explicit browser permission, both review pages passed browser interaction and visual checks at port **5188** against an isolated fixture database. Checks covered timeline navigation, decision/validation/after perspectives, cargo changes, private-note persistence, shared rubric assessments, exercise details before an order, map filtering, three reports, compatible groups, and actual JSON/JSONL/CSV downloads. Desktop and 390-pixel layouts were inspected; wide report tables scroll within their containers. No browser console warnings or errors were recorded. See `output/data-capture-handoff/browser-acceptance.json`.
- Live-use check at **2026-09-16 22:48 UTC**: the Palawan/Spratlys focus run contained four VR-labeled placements and one turn advance. All five had original observation references; exact replay reproduced six checkpoints, and reports reconciled to five accepted orders, zero rejected submissions and no missing decision views. Semantic telemetry recorded three displayed restrictions (one invalid drop, two cargo-class mismatches), four cancellations and XR start/end. The database also held one six-round scenario whose replay verified. Evidence is saved in `output/data-capture-handoff/live-use-verification.json`. This verifies real recorded service activity; interface tags alone do not prove hardware identity, comfort or usability.
- **Owner-confirmed Quest movement trial, 2026-09-16 22:59 UTC:** after reopening the game through USB forwarding at `http://localhost:5174/pacific.html`, the owner confirmed the map was visible, entered immersion and moved pieces. Four MR moves were recorded on Palawan/Spratlys overview: Gray Eagle (4 MP), Avenger (6 MP), Zumwalt (4 MP), and AG600 (2 MP). Each retained its original presented observation and exact before/after state; all four replayed exactly and reconciled to 16 MP in the report. Full replay also verified all 13 map runs. Evidence: `output/data-capture-handoff/headset-movement-verification.json` and `headset-all-map-replays.json`. Headset movement capture is verified; controller cargo handling, extended usability/frame rate and review-page interaction remain separate checks.

Browser gameplay was also exercised through the real controls on the isolated Western Senkaku map: an attributed turn advance retained its shared intent and client-acknowledged original view, then **Finish exercise & review** opened the archived decision and its turn 1 → 2 transition. The browser and owner-confirmed MR capture paths have therefore been exercised separately. Further headset trials should cover controller cargo handling, simultaneous browser/headset use, extended comfort and frame rate; these remain usability checks, not claims established by the database tests. Future controlled AI dataset jobs and central hosting remain outside phases 1–3.

## Acceptance audit

| Approved first-release requirement | Current evidence | Status |
| --- | --- | --- |
| Durable decisions, attribution and exact historical views | `tests/capture.test.ts`, HTTP multi-client fixture and `tests/opponent-capture.test.ts`; accepted state/results commit together, stale and foreign views reject, role boundaries hold | Verified in automated fixtures |
| Six independent maps, new/import boundaries and lineage | `tests/map-sessions.test.ts`, import-checkpoint fixture and live cutover report in `output/data-capture-handoff/cutover-verification.json` | Verified |
| Deterministic reconstruction, content and exports | Per-checkpoint replay tests, state/content hashes and `capture-db.mjs verify` on the live and fixture databases | Verified |
| Restart, failed write, retries, backup and restore | Injected event-write rollback, HTTP process-kill/restart, round-trip backups and a restore with committed WAL pages | Verified in automated fixtures; not a physical disk-failure trial |
| Preservation of existing exercise history | Frozen originals and SHA-256 reconciliation; 13 runs replayed; quarantine/retry tests | Verified |
| Review, notes and assessments | Browser timeline/perspective checks, saved private/shared notes and rubric, scenario reflection, downloaded archives; audience and role-boundary tests | Verified through browser and APIs |
| Three reports with evidence and compatible groups | Browser shows two compatible cargo fixtures, six submitted orders, zero rejections; each fixture reports one load, one unload and two MP; exported CSV agrees | Verified through browser and APIs |
| Minimal collection and operational recovery | Bounded semantic telemetry/drop test; versioned exports; documented one-writer, backup/restore and host-selected retention policy | Implemented and documented |
| Browser and real Quest capture paths exercised separately | Browser order → finish → review retained original presented view and intent; the owner completed a headset trial whose four MR moves replayed exactly and survived backup/restore | Verified for browser turn advance and headset movement; broader headset usability remains separate |

Phases 1–3 are implemented and their database acceptance checks have passed. This is a local pilot release; the remaining headset usability work and future controlled datasets/central hosting are not implied to be complete.

**Verification dependency update, 2026-09-16:** map replay no longer imports the opponent engine at module load. The scenario verifier loads that engine only when scenario records exist and are explicitly being checked. During this owner trial, concurrent geographic-opponent changes briefly produced an `Unsupported library version` error; isolating the map verifier allowed all 13 map archives to replay without changing the active game. The final 107-test suite subsequently passed with that rules update, and full live-database verification passed for 13 map runs and one six-round scenario.

**Post-headset recovery check, 2026-09-16:** `output/data-capture-handoff/after-quest-trial.sqlite` was restored into a new directory. Integrity and replay verification passed for all 13 map runs and the completed scenario. All four owner-performed MR moves, their accepted results and presented observation records survived restoration. The live database was not replaced.

**Final browser correction and restart, 2026-09-16 23:27 UTC:** browser navigation exposed a cookie collision between local databases on different ports. The private note remained stored, but the shared cookie selected a new seat. Database-specific cookie names now preserve the participant, with valid legacy-cookie migration. A regression test reproduced the failure before the fix and passed afterward; browser reload and cross-page navigation retained a new private reflection. After a verified backup, both local services were restarted with the fix. All six active map pointers and all four owner MR moves exactly matched the pre-restart backup, and both databases passed replay verification. Evidence: `final-restart-verification.json`, `tests-cookie-isolation.log`, and `tests-node22-final-acceptance.log` in the handoff directory.
