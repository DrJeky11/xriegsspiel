# Building for Meta Quest 3

Research date: **2026-09-15**. This guide combines documented platform facts with explicitly proposed XRiegsspiel practices. Nothing here constitutes a headset performance result.

## 1. Hardware facts that change the design

Quest 3 is a standalone device with an XR2 Gen 2 mobile processor, 8 GB RAM, 2064 × 2208 physical display pixels per eye, color passthrough, a depth sensor, and documented refresh rates of 72/80/90/120 Hz. Physical panel resolution is not the same as the runtime's render-target resolution. [Q01](sources.md#q01)

Quest 3 supports tracked controllers and hands but **has no eye-tracking hardware**. Head direction can support a gaze-like interaction, but it is not measured eye gaze. Do not design an eye-tracking-dependent mechanic or assume eye-tracked foveation. [Q02](sources.md#q02)

Meta currently documents a **5.75 GiB PSS limit** for Quest 3/3S applications. PSS is an operating-system accounting measure of process memory. Treat this as a termination boundary, not a usable asset budget; leave substantial headroom. A browser tab's JavaScript/GPU limits require separate measurement. [Q09](sources.md#q09)

**Design implication:** many readable pieces, clear terrain, and responsive selection matter more than cinematic materials. A laptop rendering smoothly does not establish standalone performance.

## 2. The two serious implementation paths

| Question | Native Unity/OpenXR | WebXR with IWSDK / Three.js |
| --- | --- | --- |
| How does the player start? | Install and launch an Android application | Open an HTTPS URL in Quest Browser and enter XR |
| Prior-project reuse | Substantial setup knowledge and selected scene patterns | Browser/backend separation lessons; no existing WebXR implementation |
| Browser companion | Separate web client is the most straightforward proposal | Same web application can offer desktop and immersive modes |
| Native room/camera features | Direct Meta SDK integration | Browser-exposed capabilities; feature detection required |
| Rich first-person environment | Strong candidate; profile mobile assets | Feasible for bounded scenes; validate rendering and input scope |
| Main project risk | Two client implementations and Android package complexity | Browser feature differences, lifecycle, and framework churn |

Meta's current WebXR overview recommends **Immersive Web SDK (IWSDK)**. It combines Three.js with an entity/component/system organization and built-in XR interaction/lifecycle features. An ECS groups entities by their data and applies systems to them; it need not become the authoritative game model. The project also publishes its source. [Q03](sources.md#q03), [Q04](sources.md#q04), [Q20](sources.md#q20)

Unity's OpenXR plugin supplies core XR support; Unity Meta OpenXR adds vendor extensions. Unity's own manual states that it does **not directly support XR on the Web platform**. Third-party exporters exist, but Unity does not guarantee them. Do not assume an Android Quest scene becomes a working browser VR game by switching to WebGL. [Q12](sources.md#q12)

**Recommendation:** test IWSDK for the tabletop path and the existing Unity baseline for the native path. Use the same interaction acceptance criteria and small asset set. Select after evidence, not framework preference. Other engines remain possible, but there is no present project evidence justifying another engine evaluation before these two.

## 3. Native Unity starting procedure

The sibling project records Unity **6000.4.5f1**, URP **17.4.0**, OpenXR **1.15.1**, Unity Meta OpenXR **2.4.0**, and Meta Core/MRUK **201.0.0**. These are observed versions, **not a latest-version recommendation**. See the [audit](prior-project-audit.md).

Proposed implementation sequence:

1. Make a minimal XRiegsspiel native project or carefully reuse only the tested foundation. Record editor and package versions in source control.
2. Select Android/Meta Quest. Verify ARM64, IL2CPP, linear color, a valid URP renderer, and the intended OpenXR loader/features for Android.
3. Enable only features actually used. Verify the Quest support feature configuration and test the chosen graphics API. Vulkan/multiview-related settings need a compatible plugin and renderer. [Q11](sources.md#q11)
4. Use a single consistent XR rig and input stack. Unity XR Interaction Toolkit and Meta interaction tools are candidate approaches; do not accidentally install overlapping locomotion/grab systems. Unity documents the role of its interaction packages. [Q12](sources.md#q12)
5. Establish controller select, pointer, grab, cancel, and recenter behavior before adding hand interaction.
6. Add optional passthrough using the version-matched Meta tutorial. Build-time feature configuration and runtime composition must agree. [Q13](sources.md#q13)
7. Deploy a small Android build and test on the actual Quest before adding multiplayer or a full terrain environment.

Keep package scope small. The earlier project records fixing Android namespace/manifest problems by replacing an umbrella Meta SDK dependency with explicit Core and MRUK packages. That is a local lesson, not proof the umbrella package is generally broken.

## 4. WebXR starting procedure

Meta's retrieved setup guide supports Node 20.19+ in the Node 20 line, 22.12+ in the Node 22 line, or Node 24+. The local host has Node 26.0.0, which meets that declared range; no IWSDK installation was attempted. Pin the resulting package versions and lockfile when implementing. [Q05](sources.md#q05)

The documented generator command is `npm create @iwsdk@latest`. It is a future setup step, not a command already run here. Inspect the generated manifest and its dependency engine requirements before selecting a reproducible baseline.

A robust entry/lifecycle flow should:

1. Present a useful desktop board without requiring immersive support.
2. Detect `navigator.xr` and query support for the desired session mode.
3. Request the session from the user's **Enter VR** or **Enter MR** action.
4. Distinguish essential from optional features. Plane detection or hands should not be essential to the initial board.
5. Handle rejected requests, session end, focus changes, and reconnection without losing the user's game.

WebXR session negotiation and user activation are specified by the Immersive Web API. [Q21](sources.md#q21)

Use HTTPS for deployment and device development. `localhost` on the headset normally names the headset, not the developer laptop. Meta documents same-LAN development and USB/Chrome port forwarding as alternatives; its current generator provides a development certificate and IWER desktop emulation. Certificates and routing must be tested on the actual venue network. [Q06](sources.md#q06)

**Prototype guidance:** make the desktop interface intentional. Emulated headset controls are useful for development but do not automatically produce a good instructor dashboard, keyboard workflow, or accessible browser game.

## 5. Separate three different mixed-reality capabilities

| Capability | Meaning | XRiegsspiel use |
| --- | --- | --- |
| Passthrough composition | User sees their room behind virtual content | Optional tabletop comfort and presence |
| Scene/plane/anchor information | Geometric surfaces, semantic room information, or persistent poses | Place and stabilize a board |
| Raw camera access | App receives camera images for processing | Only needed for a deliberate computer-vision feature |

Meta's browser MR reference describes `immersive-ar`, transparent composition, plane detection, and persistent anchors. It explicitly distinguishes passthrough display from access to its pixels. Its examples retain older device details; verify current feature behavior rather than copying historical quotas or assuming every optional API exists. [Q07](sources.md#q07)

The native CameraViewer sample requires camera configuration and permission before retrieving a texture. Displaying a tabletop over passthrough does not by itself justify a camera-upload pipeline. [Q14](sources.md#q14)

**Proposed fallback:** allow manual board placement, height adjustment, and recentering with no saved room model. Do not make scanning the room or granting camera permission a prerequisite for a conventional wargame.

## 6. Multiplayer has two independent problems

1. **Game synchronization:** who issued an order, what happened, and what each participant may know.
2. **Spatial alignment:** where each headset should render the common board in physical space.

Meta's shared-anchor and colocation examples distinguish discovery, networking, and coordinate alignment. A shared anchor does not synchronize game turns, authorize orders, or establish fog of war. A networking SDK does not automatically align a physical table. [Q15](sources.md#q15), [Q16](sources.md#q16)

**Proposal:** first support one headset and browser participants, each with an independently placed view of the same logical map. Add two-headset colocation only if it is central to the demo. Represent placement as a local transform from map coordinates into each client's room. Keep gameplay positions independent of headset tracking origins.

## 7. Comfort and readability

Meta emphasizes spatial text hierarchy and contrast against changing real-world backgrounds. [Q19](sources.md#q19)

Proposed XRiegsspiel interaction defaults:

- Seated or standing tabletop use, adjustable height and scale, and an obvious reset view action.
- Controller ray selection for distant pieces; direct grab for nearby objects; a separate commit/cancel step for consequential orders.
- Large selection targets and visible hover/selected/pending states. Tiny military symbols can have larger invisible hit areas.
- Short labels on the map; selected-unit details on a stable panel; dense tables and long orders on the browser companion.
- Colors reinforced with shapes, text, and ownership labels.
- No forced camera motion. For ground-level observation, start with fixed viewpoints or teleportation and a simple return-to-table action.
- Keep pointing, moving the board, and issuing a unit order distinct. A board grab must never become an accidental move order.
- Handle loss of hand tracking, controller switching, headset removal, and focus loss explicitly.

These are hypotheses to validate with users; no angular text size or physical reach distance has been validated for this product.

## 8. Performance and verification

Meta documents at least **72 FPS** for interactive native Quest apps. Frame intervals calculated as `1000 / refresh rate` are 13.89 ms at 72 Hz, 11.11 ms at 90 Hz, and 8.33 ms at 120 Hz. These are whole-frame intervals, not spare budgets for game logic. Meta's draw/triangle tables are illustrative and workload dependent. [Q10](sources.md#q10)

**Proposed target:** stable 72 Hz minimum for the initial headset demo; evaluate 90 Hz after measuring. Measure browser sessions independently rather than assuming native VRC wording is a browser certification rule. Use Meta's WebXR profiling guidance for browser bottlenecks. [Q08](sources.md#q08)

Start with instanced pieces, a small material set, restrained transparency, baked/simple lighting, level of detail, and bounded textures. Avoid per-frame allocations, mass label updates, expensive physics for counters, or blocking simulation/network work on the render loop. Optimize measured bottlenecks; do not choose a universal polygon budget in advance.

Record device/OS/browser versions, build and scenario identifiers, refresh rate, CPU/GPU timings where available, dropped frames, memory, session length, and asset load behavior. Run a sustained session, not only the first minute.

Meta XR Simulator is an API-level OpenXR runtime, not an emulation of Quest hardware or its Android environment. Current documentation includes macOS support, but compatibility varies with SDK/runtime versions. macOS can develop standalone Quest builds without assuming a Windows Quest Link workflow. [Q17](sources.md#q17), [Q18](sources.md#q18)

For acceptance tests, use the [prototype plan](prototype-plan.md). This research did not connect to, install on, or profile a headset.
