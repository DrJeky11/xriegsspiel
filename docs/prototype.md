# First tabletop prototype

**Implementation and checks: 2026-09-15.** The owner authorized building a small first prototype before expanding it. This implements the selected-piece interaction slice in the [prototype plan](research/prototype-plan.md). It is not completion of the full wargaming platform or all four checkpoints.

## Launch

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:5173>. The server binds to loopback by default. To use the built version, run `npm run build` and then `npm start` instead of the dev server. Only one server should use port 5173.

### Connected Quest

1. Keep the authorized Quest connected by USB and put it on.
2. With the local server running, execute `npm run quest`.
3. In Quest Browser, open `http://localhost:5173` if the requested tab does not appear.
4. Choose **Enter VR** for a virtual backdrop or **Enter MR** for transparent passthrough composition if offered by the browser. Both use the same digital tabletop and manual placement controls.
5. Point at a team and pull the trigger. Point at a highlighted tile and pull again. Use **Confirm order** or **Cancel preview** in the spatial panel to the right of the table.

The script uses `adb reverse tcp:5173 tcp:5173`. The headset's localhost reaches the Mac through USB. Disconnecting USB breaks this development route. No LAN address, camera stream, certificates, APK installation, or public hosting is required for this route. Normal remote hosting would need HTTPS and session access controls. Multiple authorized devices require `QUEST_SERIAL` to select one.

### Controls

| Action | Browser | Quest controllers |
| --- | --- | --- |
| Select team / preview movement | Click a piece or team button, then destination | Point and trigger |
| Confirm / cancel | Inspector buttons; Escape cancels | Spatial panel buttons |
| Deliver / load | Select team, action button, confirm | Service action in spatial panel, confirm |
| Change round / restart | Preview then confirm | Preview then confirm in panel |
| Move view / table | Shift + right-drag to pan; right-drag to orbit | Left stick moves table horizontally |
| Height / rotation | Orbit, zoom, rotate button | Right stick vertical for height; horizontal for rotation |
| Scale / reset | View buttons; wheel zoom | Table-size and recenter buttons |
| Exit immersion | Browser/system control | Exit immersive view button |

The browser also has a keyboard destination dropdown under **Controls & original rules**. Two-finger gestures pan/zoom on touchscreens. Hand tracking and room surface detection are not requested. A reference pose places the table in front of the viewer; this is manual placement, not a persistent room anchor or physical-table alignment.

## Authored rules

- Scenario: `island-coordination/0.1.0`; rules: `island-logistics/0.1.0`.
- Original 9 × 7 grid. Coordinates A–I / 1–7. Adjacent means sharing an edge.
- Atlas, Beacon, and Cedar each have four movement points per round and two cargo slots. Initially each carries two supply; the depot holds two more. Eight total supply.
- Entering plain/road costs 1 point, forest 2, ridge 3. Water and occupied cells are impassable. No diagonal movement or stacking.
- Loading at the B4 depot or delivering at the E2 North relay / H4 East harbor costs 1 movement point. A service transfers as much supply as the capacity, request, and inventory allow.
- Both outposts request four supply by the end of round 5. Reaching a destination using the final movement point leaves delivery for a later round.
- Committed actions resolve immediately. Advancing the round restores movement points without changing cargo. This slice does **not** implement the proposed later WEGO cadence.
- All clients cooperate on one exercise and share control. A server revision detects intervening orders; duplicate command IDs apply only once.
- There is no combat, strength loss, opposing-side information, or teaching score. The discussion prompt is how route, sequence, and reloading choices constrained the shared plan.

These are authored game parameters, not real vehicle performance or copied game rules. Geometry, terrain, labels, and transport pieces are generated locally; no external art or military equipment database was imported.

## Implementation decision

**Provisional for the interaction experiment:** TypeScript + Three.js/WebXR, Vite, and one Node HTTP process. The existing research recommended evaluating IWSDK; direct Three.js was selected here to keep the test limited to terrain rendering, controller rays, a spatial panel, and shared commands. This does not decide the eventual engine or rule cadence. IWSDK/Unity remain candidates if later surface, interaction, or native requirements justify them.

| Boundary | File | Responsibility |
| --- | --- | --- |
| Scenario and rules | `src/game.ts` | Versioned original state, route evaluation, action validation, deterministic transitions |
| Authority and persistence | `server/session.ts` | Revision/duplicate protection; append a flushed journal record before acknowledging |
| Transport and serving | `server/main.ts` | Same-origin HTTP commands, SSE state updates, dev/production serving |
| Browser interaction | `src/main.ts`, `src/style.css` | Selection, local drafts, explicit commit, action explanations, decision log/export |
| Rendering and headset input | `src/tabletop.ts` | Terrain and pieces, room placement, controller rays, in-world buttons, XR lifecycle |
| USB launch | `scripts/quest.mjs` | Select authorized Quest, forward port, request Browser navigation |

Dependencies are pinned in `package.json` and `package-lock.json`. Node 26.0.0, npm 11.12.1, Three.js 0.186.0, Vite 8.3.0, and TypeScript 7.0.2 were actually used. Registry engine requirements were checked before installation.

`data/session.jsonl` contains accepted commands with resulting snapshots; it survives server restarts and is gitignored. Restarting an exercise appends a new reset record while preserving previous journal records. The tests verify exact event replay for a run starting at revision zero. An exported run after reset additionally needs its starting revision and reset metadata; a general replay loader has not been implemented. The current UI exports the current exercise and events as JSON; it is not a historical fog-of-war replay viewer. Only one server process may write the journal. A mismatched rules/scenario version fails startup; archive the journal deliberately before changing versions.

## Verification evidence

### Passed

- `npm run build`: TypeScript check and Vite production build. The client bundle is approximately 594 kB / 150 kB gzip. Vite reports its standard >500 kB chunk warning; no performance conclusion is inferred from build size.
- `npm test`: seven tests covering terrain/occupancy/budget routes; non-mutating previews and last-point consequences; supply conservation and cargo limits; round boundaries; stale/duplicate commands; journal restart; and an attainable five-round plan with exact replay equivalence.
- Browser interaction: select Beacon, preview a four-point route to E2, see zero points remain for delivery, cancel with revision still zero, preview again, and commit. Two independent browser clients both showed revision 1, Beacon at E2 with zero movement and two supply, and the same event.
- Route animation follow-up: committed pieces now follow the evaluated route rather than moving directly to the destination. The production browser was sampled over 51 animation frames for C4 → D4 → E4 → E3 → E2; every sample stayed on the two route legs and reached E2. Build/typecheck and all seven tests passed after the fix. Reconnect/reset snapshots snap to their known position without inventing a traversed route. Reduced-motion preference also uses an immediate position update.
- Browser reload: second client recovered the committed shared state through SSE. Desktop 1440 × 1000 and mobile 390 × 844 were rendered and visually inspected. Mobile document width equaled viewport width. Labels and initial narrow-screen framing were improved after inspection.
- Production service: stopped the development server, started `npm start`, reloaded the built client, and verified the persisted fresh exercise at revision 2, round 1, all initial cargo and movement restored. `npm run quest` also passed its real device/server checks and requested Browser navigation. The production service was left running on port 5173 for the owner's test.
- Actual USB device query identified Quest 3 and an authorized ADB connection. Installed Quest Browser package reported `150.1.0.24.52.1046134268`; Android display build `UP1A.231005.007.A1`. This Android build identifier is not asserted to be the Horizon OS marketing version.
- USB port forwarding and Browser launch commands succeeded. The device subsequently reported `mWakefulness=Asleep`; a prototype tab and immersive session have **not yet** been verified on it.

Artifacts from browser checks are in gitignored `output/playwright/` and `.playwright-cli/`. Read-only client diagnostics are available at `window.__xriegsspiel.diagnostics`, including XR session starts and frames. Desktop counters do not establish headset refresh rate.

### First hands-on headset test — pending

1. Put on Quest, open the URL, and confirm the board loads and Enter VR is enabled.
2. Enter VR. Confirm seated table height and readable panel. Select a team with a controller ray.
3. Preview a highlighted destination, read costs, cancel, repeat, then confirm. Check that the browser sees the same move and inventory.
4. Try board position, height, rotation, scale, and recenter. Confirm these do not change game coordinates.
5. Advance a round, move to an outpost, preview and confirm a delivery.
6. Exit and reenter twice; remove/wear the headset. Confirm the state persists and controllers recover.
7. Try MR separately if supported. Assess contrast against the actual room and table placement comfort.
8. Record session duration, OS/browser version, readability, input failures, and measured XR timing. No sustained Quest performance or usability claim is made yet.

## Remaining limits

This is a local, trusted cooperative prototype, not a deployable multi-user service. No authentication, role ownership, opposing teams, fog-of-war filtering, referee contests, session lobby, or shared spatial anchors are implemented. The state boundary is structured for later role-specific projections; currently all scenario information is intentionally shared. Journal growth/rotation and multi-process persistence are also future work. No headset input, passthrough, comfort, or sustained performance test is claimed until the checklist is exercised on the device.

## Platform sources consulted

Accessed **2026-09-15**. These support API/transport choices, not prototype test results.

- [Three.js WebXRManager](https://threejs.org/docs/pages/WebXRManager.html), `enabled`, `getController`, `setSession`, `setReferenceSpaceType`, and `setFramebufferScaleFactor`.
- [Chrome: local servers and port forwarding](https://developer.chrome.com/docs/devtools/remote-debugging/local-server), **Case 2**, USB forwarding of development traffic.
- [Meta IWSDK project setup](https://developers.meta.com/horizon/documentation/iwsdk/guides/01-project-setup/), updated 2026-09-04, **Prerequisites** and **Create a project**. Consulted as the research-recommended alternative; IWSDK was not installed in this slice.
