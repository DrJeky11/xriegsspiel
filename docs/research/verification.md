# Research scope and verification

Research date: **2026-09-15**. This file records work performed, not future prototype acceptance results.

## Initial research pass

- Inspected the initially empty XRiegsspiel repository and looked for applicable local/ancestor agent instructions.
- Located and read the sibling `mx-id-test` runbooks, manifest/lockfile, editor/build configuration, and selected runtime code without modifying it.
- Recorded the sibling repository commit, clean status, declared package versions, and available development tools.
- Cross-checking the package records found a TextMesh Pro discrepancy: manifest 3.2.0 versus lockfile 5.0.0. The audit preserves both values; the sibling project was not repaired.
- Read the six pages of extracted text from the supplied MCU reading list.
- Consulted official Meta/Unity/Immersive Web technical references, MCU/USMC/NPS/NWC institutional material, publisher-authored rules, and RAND/UK MOD educational resources.
- Recorded 42 numbered source entries, with editions, section locators, and access caveats. Some entries include an additional corroborating link.
- Downloaded the publisher-authored Littoral Commander v2.8 PDF from its publicly offered retailer link into a temporary directory. Extracted selected rule sections, rendered page 6 using Poppler, visually checked the action-stage diagram/text, and recorded the file hash.
- Wrote a research index, platform guide, prior-project audit, game survey, learning framework, architecture options, prototype plan, source register, and future-agent guide.

## Initial-pass verification checks

Completed checks:

- **11 Markdown files:** local targets, heading anchors, balanced code fences, final newlines, trailing whitespace, and unresolved citation/placeholder tokens checked.
- **82 local links/anchors:** all resolved.
- **42 source entries:** every entry is referenced by the research documents.
- **45 external URLs:** syntax checked. This was not a blanket live HTTP availability test; actual retrieval failures are recorded below.
- **Package snapshot:** seven package versions matched both the earlier project's manifest and lockfile; the separate TextMesh Pro discrepancy matched the two recorded values. Editor version also matched.
- **PDF provenance:** the downloaded rulebook's SHA-256 matched the source register.
- `git diff --check` completed without errors. The documentation was still untracked, so the explicit file checks above provided its whitespace validation.
- The sibling repository's final `git status --short` remained clean.

The transient validation script was run from `/private/tmp/xriegsspiel-research/check_docs.py`; it is a session artifact, not a repository tool or a future build prerequisite. This repository contains no application to build or run yet.

## Evidence limits

- **No Quest was tested.** No headset pairing, APK installation, WebXR session, performance profile, or classroom trial occurred.
- **No implementation was built.** No Unity/IWSDK dependency installation, package migration, game-engine test, or backend build occurred.
- The earlier project's reported headset milestone was not reproduced. Its code and configuration were inspected; its stale changelog statement was identified.
- The downloaded Littoral Commander PDF is v2.8 Second Printing. It is not established as the latest edition, nor as equivalent to MCU's digital version.
- Initial MCU digital help extraction returned no text, and direct downloads returned HTTP 403. The follow-up recovered Littoral and Division Commander help through Chrome and reviewed them using OCR and selected rendered pages. Edition and software-build parity remain unverified.
- The direct USMC MARADMIN page returned a rendering error; its indexed official text and MCU reproduction supported the dated announcement.
- OWS/War at Sea complete current rulebooks were not retrieved. The NWC syllabus establishes assigned editions and an educational workflow, not all mechanics.
- RAND's Hedgemony landing page and indexed scenario appendix were available; the full rulebook download returned HTTP 403. Detailed turn procedures were not verified.
- The linked commercial books were not read in full. The learning note summarizes their MCU annotations.
- Institutional cloud login, software licenses, export/integration APIs, hackathon rules, and venue networking were not accessed or validated.

## Refresh triggers

Before scaffolding: recheck engine/SDK dependencies and compatibility against the installed runtime. Before selecting a published rules adaptation: obtain its authoritative edition and reuse terms. Before demonstrating: validate the actual Quest/browser/network setup and learner workflow. Record those results separately from this research baseline.

## Manual follow-up and owner clarifications

On the same research date, the owner supplied MCU's Wargaming page and clarified the audience and usability needs. Added `docs/product-requirements.md` and `manual-review.md`; updated earlier guidance to reflect operational team planning, game-specific phases, hybrid adjudication, immediate movement/action guidance, and automated bookkeeping.

- Inventoried eleven linked game manuals/help documents. Read seven selectively or through full OCR as specified in the manual-review coverage table.
- Read all 18 OCR pages of Littoral Commander digital help and all 18 of Division Commander help. Visually checked Littoral pp. 1–2, 9, 12, 14 and Division pp. 2, 11, 18.
- Reviewed additional Company Commander movement/action passages, selected Strategic Command WWI and WarPlan sections, and Flashpoint professional/transport sections.
- Downloaded the publisher's 159-page Flashpoint Cold War FM01 as a separate reference; inspected selected orders/path planning and readiness/logistics sections. Its edition differs from the unverified MCU FM01.
- Added ten source entries (W22–W31), including explicit unread-document records. Recorded hashes for three additional downloaded PDFs.
- Temporary downloads, page renders, and OCR stayed outside the repository. No source manuals or illustrations were redistributed.
- Direct MCU HTTP access still returned 403. The publisher's `ftp.eu` mirror had a certificate hostname mismatch; the valid main `ftp.matrixgames.com` URL succeeded without weakening certificate checks.

At the end of that pass, four MCU-linked documents remained unread: Company Commander help, Command PE user manual, Flashpoint Southern Storm manual, and MCU's FM01. The later CPE follow-up below recovered the Command manual. This was a focused review of available material, not a cover-to-cover claim for every manual. No software, headset, or classroom test was performed in that follow-up.

### Follow-up verification results

- 13 Markdown files passed local-link/anchor, code-fence, final-newline, whitespace, and unresolved-reference checks.
- All 128 local links/anchors resolved; all 52 registered sources were referenced. The 55 external URLs passed syntax checks, not a blanket live availability test.
- The three additional PDF hashes matched the source register; their page counts were 18, 18, and 159.
- Searched the guidance for superseded audience and unread-digital-help statements; updated the current guidance while retaining the initial-pass history.
- `git diff --check` passed. Files remain untracked; the explicit Markdown checks cover their contents. No commit or staging was performed.

## Owner-supplied dataset review

On **2026-09-15**, inspected the four PDFs already supplied by the owner in `docs/datasets/`: Chinese Tactics, Russian Tactics, The Red Team Handbook, and Educational Wargaming in Higher Education. They contain 252, 280, 238, and 21 PDF pages respectively, totaling **791 pages**.

- Extracted all four PDFs using Poppler `pdftotext -layout`; used `pdfinfo` for page counts, metadata, and file characteristics. No new dependencies were installed.
- Read the education article and its reference/publication material; selectively reviewed the longer publications. `dataset-review.md` and D01–D04 in `sources.md` enumerate the pages/sections actually examined. Full-text extraction does not mean a cover-to-cover review.
- Rendered and visually inspected nine pages: Chinese PDF 4 and 61; Russian PDF 3 and 5; Red Team PDF 94 and 177; education article PDF 5, 8, and 21. Checked editions/change dates, a planning diagram, a perspective table, a tool attribution, the learning framework, study-selection details, and article metadata/license.
- Recorded garbled extracted ATP dates/transliterations and the Russian PDF's generic metadata title. Used rendered pages to establish publication dates. Recorded the education article's inconsistent October/December 2024 search cutoff.
- Located the exact Army PDF URLs through official publication references. The web reader rejected the ATPs for size; the local files made review possible. Opened the official Red Team PDF and journal article page. Direct article DOI opening encountered a redirect/safety error; the journal URL worked.
- Identified three separate article supplements, but did not retrieve their contents or independently review the fifteen underlying studies. No remote/local PDF hash equivalence or latest-edition status was established.
- Added a document catalog, focused dataset review, four source records, and updates to research navigation, learning/evaluation guidance, game-background guidance, and prototype checkpoints. Clarified the earlier manual pass's statement about PDFs in the repository to distinguish the later owner-supplied collection.

### Dataset-review verification results

- **16 Markdown files** passed local-link/anchor, balanced-fence, final-newline, trailing-whitespace, and unresolved-reference checks, including untracked files.
- **196 local links/anchors** resolved. All **56 registered sources** were referenced; no unknown source IDs were found.
- **65 unique external URLs** passed syntax checks. This was not a blanket live availability test.
- All **four local PDF SHA-256 hashes**, page counts, and recorded byte sizes matched the source register. The hashes matched those captured before documentation edits; source PDFs were unchanged.
- `git diff --check` passed. Files remain untracked as at task start; no staging or commit was performed.

This was documentation research. No game rules, ingestion service, model, application build, instructor/classroom evaluation, or headset test was implemented or validated. Scenario-specific currency and content adaptation remain future checks, not evidence supplied by possession of the PDFs.

## CPE reference study and original simulation design

On **2026-09-15**, the owner clarified that the goal is to understand CPE and build our own substantially improved platform. CPE software, account, license, and MCU cloud access were not requested and were not pursued. Updated the requirements and agent guidance to preserve that direction.

- Recovered MCU's CPE PDF through Chrome after the web reader rejected its size. Confirmed its internal edition as v2.4, updated 13 October 2024, with 181 pages. Downloaded the 425-page base CMO manual explicitly referenced by CPE p. 7.
- Extracted text from both complete files with Poppler. Read selected mechanics/workflow sections; the CPE study records exact topical/page coverage and unreviewed areas. Extraction of 606 pages does not mean a cover-to-cover review.
- Rendered and visually checked CPE pp. 2 and 151 and CMO p. 39. Verified the edition and inspected planner layout and action-diagnostic wording.
- Consulted the official online mission/simulation chapters, release notes from v2.4.2 through v2.4.4.1, and deployment/training descriptions. The latest public patch found was dated 18 August 2026. Distinguished later shipping features from roadmap statements and the dated 2024 multiplayer limitations.
- Added the CPE reference study and an original simulation blueprint. Updated research navigation, manual coverage, source records, requirements, architecture, prototype guidance, and the general game survey. Proposed improvements are explicitly untested.
- Kept the two new source PDFs, extracted text, and renders in temporary research storage. Added no dependencies, simulator code, proprietary database, source artwork, or game scenarios. The existing owner-supplied PDFs were not edited.

### CPE follow-up verification results

- **18 Markdown files** passed local-link/anchor, balanced-fence, final-newline, trailing-whitespace, and unresolved-reference checks, including untracked files.
- All **260 local links/anchors** resolved. All **66 registered sources** were referenced; no unknown source IDs were found.
- **76 unique external URLs** passed syntax checks. Research sources were retrieved as described above; this was not a blanket availability test for every older URL.
- Both downloaded PDF SHA-256 hashes, page counts, and byte sizes matched W31–W32 in the source register.
- Reviewed the new design for requirement coverage, distinction between proposals and evidence, limited-information previews, replay/correction behavior, and consistency with the original-platform clarification.
- `git diff --check` passed. As at task start, repository documentation remains untracked; explicit file checks covered its contents. No staging or commit occurred.

No CPE installation was run, no model fidelity was validated, and no XRiegsspiel build, headset session, multiplayer test, or learning comparison was performed. The deliverables are research and implementation guidance. Three other MCU-linked manuals remain unread, as identified in the manual review; they do not block the original CPE-informed design.

## Wargaming Cloud and AI Sensei follow-up

On **2026-09-15**, captured the owner's notes about MCU's cloud, HexWar, Fight Club, agent development, integration, analytics, NPS/CPE work, and an AI Sensei. Distinguished reported institutional context from confirmed product direction and public evidence.

- Rechecked MCU's public game listing, cloud network scope, and Fight Club/qualifier information. Also read the two-page 2025 tournament announcement as web text and the USMC's September 2022 cloud-launch article for historical context; these did not establish technical capacity.
- Read HexWar's Company Commander AI, Analytical Reporting Tools, and HexWar Management System pages. Recorded vendor-described headless/API and reporting capabilities without claiming a hands-on test or MCU deployment verification.
- Consulted primary accounts of AlphaGo, OpenAI Five, and the October 2019 AlphaStar results. Read the AlphaGo publisher-indexed abstract/captions, not its full paper; a subsequent direct page opening failed at an authentication redirect. Consulted PettingZoo's Parallel API documentation as an interface pattern; installed no packages.
- Public searches did not independently establish the reported 10,000-user capacity, CPE's institutional primacy, the specific NPS API/agent-development effort, or the claimed cloud deployment of optimal policies for both sides. The scope of the API/headless limitation remains a pending clarification, not a blocker for our own design.
- Added one research/design study and seven source records, linked it from the repository guidance, and incorporated headless execution and decision-history foundations into the proposed blueprint and prototype. Preserved the confirmed 2–4 player tabletop scope. Resolved a duplicate R10 identifier by labeling the CPE direction R12 without changing its meaning.

### AI Sensei follow-up verification results

- **19 Markdown files** passed local-link/anchor, balanced-fence, final-newline, trailing-whitespace, and unresolved-reference checks, including untracked files.
- All **292 local links/anchors** resolved. All **73 source records** were referenced; no duplicate or unknown source IDs were found. The requirements table has **12 unique IDs**, R1–R12.
- **83 unique external URLs** passed syntax checks. This is not a blanket live-availability check of all older sources.
- Reviewed the new material for coverage of the owner's notes, separation of AI roles, information boundaries, simultaneous-order handling, repeatability, and the distinction between teaching quality and playing strength.
- `git diff --check` passed. Explicit content checks covered untracked documentation; no staging or commit occurred.

No game/API implementation, model training, load test, simulator access, vendor contact, headset session, or learner evaluation occurred in this follow-up. The documented acceptance criteria describe future evidence to collect.

## Unit catalog and equipment-source follow-up

On **2026-09-15**, added the [unit catalog and sourcing review](unit-catalog-and-data-sources.md) in response to the owner's request for units, movement, functions, and alternative wargame information.

- Extended the CPE/CMO reading to database-viewer and named air/naval unit passages. Re-read CPE p. 7 and pp. 100–102 to distinguish the base manual, equipment database, and separate database-editor manual. The latter was not obtained.
- Rendered and inspected CMO p. 343. Confirmed that the online Appendices page has different coverage and does not include the PDF's common-unit lists; corrected the new note to direct readers to the PDF.
- Read Chinese Tactics A-1–A-4 / PDF 203–206 and Russian Tactics H-1–H-3 / PDF 245–247. Rendered PDF 247 and visually checked the logistics table's URAL 4320-31 speed, range, and cargo column.
- Opened the public Army WEG catalog and LAV-25 detail through the browser after the web reader failed. Read the entry's description, variants, and Automotive tab; obtained the direct citation URL from its Share URL control. No account, bulk export, or API was used.
- Read the Navy LCAC and NAVAIR MV-22B reference pages. Retained source dates, normal/overload distinctions, and the difference between specifications and game parameters.
- Added six source records, W44–W49; proposed six initial unit families and six later candidates, with movement, actions, state, and remaining research identified. No scenario, nationality, echelon, numeric rules, or implementation stack was selected.

### Unit-source verification results

- Checked all **20 Markdown files**, including untracked files, for local targets/anchors, balanced fences, final newlines, trailing whitespace, and unresolved placeholders.
- All **325 local links/anchors** resolved; **79 source IDs** were unique and referenced. **97 external URL occurrences** passed syntax checks; this was not a blanket availability check.
- The CPE, CMO, Chinese Tactics, and Russian Tactics PDF hashes matched the four existing source-register records. Originals were unchanged.
- `git diff --check` passed; explicit Markdown checks covered untracked content. No application build or game tests apply to this documentation-only change.

The transient check summary is `/private/tmp/xriegsspiel-research/unit-doc-check.json`. The detailed equipment sample was verified as published information, not as real-world measured performance. Model validation, instructor review, and headset/classroom trials remain future work.
