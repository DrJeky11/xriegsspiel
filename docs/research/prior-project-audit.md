# Audit of the earlier Meta Quest project

**Inspected:** 2026-09-15, read-only. Actual location: `/Users/fgq321/code_projects/mx-id-test` (the supplied path had an extra user-directory segment).

**Git HEAD:** `19e54b1b64a5b790da03be539c969b48fa7a6ae0`. `git status --short` was clean when inspected. No local `AGENTS.md` was found in this project or XRiegsspiel, and no applicable ancestor file was found. XRiegsspiel was empty apart from `.git` before this research.

## What is there

| Area | Observed purpose | Relevance |
| --- | --- | --- |
| `quest-unity/` | Unity native passthrough scene, MRUK room visualization, and camera/detection client | Main native XR reference |
| `frontend/` | Vite/TypeScript camera-overlay website using media capture and a detection API | Web/API and request-lifecycle lessons |
| `backend/` | FastAPI detection service, DTOs, mock/YOLO modes, and tests | Service separation and test seams |
| `testView/`, `testViews/` | Additional Unity project directories | Not the documented primary runbook target; behavior not audited |
| `CHANGELOG.md` | Development history and reported headset milestones | Useful historical evidence, not a new test |

The inspected browser entry point uses `navigator.mediaDevices.getUserMedia`; no `navigator.xr`/immersive session implementation was found there. It should not be described as an existing WebXR game.

## Version snapshot

Values from `quest-unity/ProjectSettings/ProjectVersion.txt` and `Packages/manifest.json`, checked against `Packages/packages-lock.json`:

| Component | Recorded version |
| --- | --- |
| Unity editor | 6000.4.5f1 |
| Universal Render Pipeline | 17.4.0 |
| Meta XR Core SDK | 201.0.0 |
| Meta MR Utility Kit | 201.0.0 |
| Unity OpenXR | 1.15.1 |
| Unity Meta OpenXR | 2.4.0 |
| XR Management | 4.5.1 |
| TextMesh Pro | Manifest: 3.2.0; lockfile: 5.0.0 |
| Unity UI | 2.0.0 |

The seven other package versions in this table agree between manifest and lockfile. **TextMesh Pro does not.** Inspect Unity's package resolution and validate a clean import before choosing a reusable baseline; this research did not repair or explain that discrepancy.

The frontend manifest declares TypeScript `^5.8.3`, Vite `^6.3.4`, and Playwright `^1.59.1`. These are declared ranges, not independently verified installed versions.

Observed on the development host: Node **26.0.0**, npm **11.12.1**, Python **3.14.6**, and `adb` on PATH. Unity **6000.4.5f1** and sibling `PlaybackEngines/AndroidPlayer` and `PlaybackEngines/WebGLSupport` directories exist under `/Applications/Unity/Hub/Editor/6000.4.5f1/`. An earlier check inside the app bundle missed the modules because this installation keeps them beside `Unity.app`.

File presence does not prove that licensing, Android toolchains, package resolution, or a fresh build works. No packages were installed or upgraded. Any Python dependency decision must account for the installed Python version.

## Concrete native setup worth studying

Paths in this section are relative to the inspected source repository.

| File | Evidence / lesson |
| --- | --- |
| `quest-unity/Assets/Editor/MXIDQuestStarterBootstrap.cs` | Generates scenes and configures ARM64, IL2CPP, linear color, GameActivity, and URP renderer assignment |
| `quest-unity/Assets/Scenes/PassthroughTestScene.unity` | Documented native test scene |
| `quest-unity/Assets/Scripts/MRUKRoomDebugVisualizer.cs` | Room callbacks, semantic anchors, plane/volume visualization, missing-room status |
| `quest-unity/Assets/Settings/MXIDQuestURPAsset.asset` | 4× MSAA, render scale 1, HDR/depth texture/opaque texture disabled; a default renderer reference is assigned |
| `quest-unity/Assets/Oculus/OculusProjectConfig.asset` | Meta feature configuration accompanies the scene setup |
| `quest-unity/Assets/Plugins/Android/AndroidManifest.xml` | Native activity, internet permission, headset-camera permission, supported-device declaration |
| `quest-unity/Assets/Scripts/QuestYoloRuntimeBootstrap.cs` | Automatically creates a camera-access/detection runtime after scene load |

Project settings record Android min API **32** and target API **34**. The manifest separately declares Horizon OS SDK minimum **60** and target **201**. These are different version namespaces. Do not mistake either for current store submission requirements; check the chosen distribution path before release.

## Reusable lessons

- **URP renderer assignment matters.** The changelog reports a black view fixed by restoring the default renderer reference.
- **Use a coherent Meta package set.** The changelog reports Android manifest/AAR namespace conflicts resolved by reducing the umbrella SDK dependency to Core + MRUK.
- **Room understanding is not arbitrary object recognition.** MRUK visualizes saved/available room geometry and semantic anchors. The separate camera/YOLO pipeline has a different purpose.
- **Model browser and native clients around a shared contract.** The detection DTOs demonstrate that boundary, although the wargame will need a new domain contract.
- **Reject stale asynchronous responses.** A stopped/restarted capture loop should not apply old results. The analogous game concern is stale orders after reconnect or turn advancement.

## What not to infer or copy wholesale

The changelog reports a successful native passthrough cube and room-anchor test. This is **historically reported**, not reproduced during this task. It also contains a stale statement that camera access is deferred, while the newer README and executable bootstrap implement it. Source inspection establishes that the code exists; it does not prove the camera/detection pipeline currently works on device.

The post-scene-load bootstrap would create a camera client even if only a scene were copied. Select source files deliberately. Do not bring the automatic YOLO runtime, headset-camera permission, view-locked debug overlays, LAN endpoint, product identity, telemetry identifier, or broad supported-device claim into XRiegsspiel without a corresponding feature need.

The room visualizer is a debug tool: it iterates through text meshes in `LateUpdate` and displays many transparent surfaces. It is not a measured production rendering baseline.

No authoritative multiplayer game state, rules engine, fog-of-war projection, scenario authoring system, or after-action replay was established by this audit. Build those as explicit XRiegsspiel features rather than assuming the existing service provides them.

## Reuse recommendation

Carry forward the **setup knowledge, a minimal native scene, focused package configuration, and API separation pattern**. Keep the source repository untouched. Before relying on its native configuration, reproduce one clean cube/passthrough build on Quest 3 and record fresh evidence.
