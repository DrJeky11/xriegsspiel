# Development computer readiness

**Checked: 2026-09-15.** Local observations are from this Mac during the software audit. Documentation was checked on the same date. This supplements the [prior-project audit](prior-project-audit.md); it does not select an implementation stack.

## Assessment

**Later implementation update, 2026-09-15:** a small TypeScript/Three.js prototype has since been installed and built in this repository. The Quest 3 was connected and authorized over ADB. See the [prototype record](../prototype.md) for exact current checks and the still-pending hands-on headset test. The audit below records the earlier state and is retained as historical evidence.

**The core software is available to start the prototype.** The web prerequisites are present, and Unity's native Android toolchain passed basic executable and compiler checks. No major development application needs to be installed before starting either candidate path.

XRiegsspiel still contains research rather than an application. Project dependency installation, a complete build, and a real Quest test remain necessary. An installed editor and working compilers do not establish that an XR application builds or runs.

## Host and common tools — observed

| Component | Finding | Evidence |
| --- | --- | --- |
| Mac | Apple M5 Pro, ARM64, 48 GiB memory | `sysctl` and `uname -m` |
| Operating system | macOS 26.6.2, build 25G83 | `sw_vers` |
| Available storage | Approximately 471 GiB | `df -h .`; a point-in-time reading |
| VS Code | 1.137.0 | Application bundle metadata |
| Git | 2.54.0 | Version command succeeded |
| Apple command-line tools | Selected at `/Library/Developer/CommandLineTools`; Apple Clang 21.0.0 | `xcode-select`, `xcrun`, and Clang version checks |
| Python | 3.14.6 | Version command succeeded; future Python dependencies still need compatibility checks |
| Docker Desktop | 4.83.0; CLI 29.6.2 | Bundle and CLI checks; Docker engine was unavailable at the configured socket |

Docker is optional for the proposed initial service. The current architecture permits one local service process and does not require containers or a separately installed database.

## WebXR and browser path — observed

| Component | Finding | Readiness |
| --- | --- | --- |
| Node.js / npm | 26.0.0 / 11.12.1 | Both version commands succeeded |
| Other package managers | pnpm 9.12.0; Bun 1.3.14 | Version commands succeeded; npm alone covers the documented IWSDK setup |
| Chrome / Safari | 153.0.8010.37 / 26.6.2 | Application bundle metadata; no WebXR rendering test performed |
| XRiegsspiel dependencies | No `package.json`, `node_modules`, or IWSDK installation in this repository | Application scaffolding and a pinned dependency installation remain to be done |
| Prior frontend tooling | TypeScript 5.9.3, Vite 6.4.2, Playwright 1.59.1 | Installed package manifests in `../mx-id-test/frontend/node_modules`; not XRiegsspiel dependencies |

**Documented compatibility:** installed Node 26 meets Meta's declared IWSDK Node range. IWSDK supplies browser emulation through its development plugin and generates a local development certificate. A separate global SDK, XR browser extension, or `mkcert` install is not a prerequisite for that documented workflow. Inspect the actual generated dependency requirements when scaffolding. [S1](#s1), [S2](#s2)

**Still unverified:** dependency resolution, a web production build, desktop interaction, HTTPS access from the headset, Quest Browser version, XR session entry, and performance. No web packages were downloaded or installed during this audit.

## Native Unity and Android path — observed

Editor root: `/Applications/Unity/Hub/Editor/6000.4.5f1/`.

The modules are beside `Unity.app` in `PlaybackEngines`, rather than inside the application bundle. Tool paths below are relative to `PlaybackEngines/AndroidPlayer/`.

| Component | Installed version / location | Verification |
| --- | --- | --- |
| Unity Hub | 3.17.3 | Application metadata |
| Unity Editor | 6000.4.5f1 | Editor `-version` succeeded |
| Build modules | AndroidPlayer and WebGLSupport | Directories and module metadata inspected |
| Android SDK platforms | API 34, 35, 36 | Platform `source.properties` files |
| Android build tools | 36.0.0 | Metadata; `aapt2 version` succeeded |
| SDK command-line tools | 16.0 | Metadata |
| Bundled ADB | 36.0.0 | Version command succeeded |
| Android NDK | r27c, 27.2.12479018 | Compiled a small C source to an ARM64 Android object; `file` confirmed ELF/aarch64 |
| Bundled OpenJDK | Temurin 17.0.9 | Compiled and ran a small Java program successfully |
| Bundled CMake | 3.22.1 | Version command succeeded |
| Bundled Gradle | 9.1.0 | Offline version command succeeded using bundled Java 17 and the CLI JAR |

**Documented compatibility:** the installed NDK, JDK, CMake, and SDK tool versions match Unity 6.4's documented dependency table. Meta lists Android Build Support, OpenJDK, and SDK/NDK tools as the native Unity prerequisites. All are present. [S3](#s3), [S4](#s4)

The shell's `JAVA_HOME` points to a separate Homebrew Java 21.0.11, which also runs. `/usr/libexec/java_home -V` did not discover a registered Java runtime; this is not evidence that Java is missing. Use the editor's bundled Java 17 for the documented Unity baseline. Its Intel Java/compiler components ran successfully on this Apple Silicon host. Unity documents Rosetta as a requirement on Apple Silicon. [S5](#s5)

Gradle is packaged as JARs under `Tools/gradle/lib`, without a standalone `bin/gradle` script. Its actual CLI entry point was inspected and executed successfully. Neither a global Gradle nor a global CMake installation is needed to use those bundled tools.

The prior Unity project's package cache contains Meta XR Core and MRUK 201.0.0, Unity OpenXR 1.15.1, and Unity Meta OpenXR 2.4.0. These are available reference dependencies, not packages installed in XRiegsspiel. Its TextMesh Pro discrepancy remains: manifest 3.2.0 versus lockfile and cache 5.0.0. Resolve that during a clean import if reusing the native baseline.

**Still unverified:** active Unity license entitlement, clean XR package import, actual editor external-tool selection, a complete Android/IL2CPP build, simulator integration, and a headset run. A Unity license file exists, but its presence alone does not verify current entitlement. No license contents or account credentials were copied into this report.

## Meta device tools — observed

| Component | Finding | Limitation |
| --- | --- | --- |
| Meta Quest Developer Hub | 6.4.0 installed | Account state and device pairing not inspected |
| Meta XR Simulator | 201.0 installed | Runtime integration not exercised |
| System ADB | 37.0.1 | Runs successfully; `adb devices -l` returned an empty device list |

The initial sandbox prevented ADB from opening its local listener. The permitted local retry started ADB successfully and returned no devices. This means no ADB device was detected at the time; it does not determine whether a headset is powered off, unplugged, unpaired, or awaiting developer setup.

Meta XR Simulator models XR APIs and does not emulate Quest hardware or Android. It cannot establish standalone headset performance. Meta's PC Link workflow requires Windows; standalone Quest development is a different workflow. [S4](#s4), [S6](#s6)

## Proposed next steps

1. For the proposed WebXR-first comparison, scaffold a small IWSDK project, inspect and pin dependencies, and run its type check and build. The host prerequisites are already present.
2. Connect the Quest 3 and verify the intended test route: HTTPS in Quest Browser, or developer mode and USB debugging for native installation/ADB forwarding. Developer account readiness and the headset's Horizon OS/browser versions remain unknown.
3. Run a minimal interaction scene on the actual headset and in a desktop browser. If evaluating native Unity, first establish a clean import and Android build using the installed editor and bundled tools.

No engine, SDK, or system-tool upgrade is proposed by this audit. No application software was installed or upgraded. Temporary compiler checks were removed afterward. ADB was started to check device availability. The prior project was read only; this report and its index link are the repository changes.

## Sources

All accessed **2026-09-15**. Local versions above come from the machine, not these pages.

### S1

[Meta: IWSDK project setup](https://developers.meta.com/horizon/documentation/iwsdk/guides/01-project-setup/) — updated 2026-09-04; **Prerequisites**, **Create a project**, and **Start the development session**.

### S2

[Meta: Testing your experience](https://developers.meta.com/horizon/documentation/iwsdk/guides/02-testing-experience/) — updated 2026-09-04; **HTTPS Required**, **Testing on Meta Quest**, and **Testing with IWER**.

### S3

[Unity 6.4: Supported dependency versions](https://docs.unity3d.com/6000.4/Documentation/Manual/android-supported-dependency-versions.html) — **SDK**, **NDK**, **JDK**, and CMake note.

### S4

[Meta: Hardware and software requirements](https://developers.meta.com/horizon/documentation/unity/unity-development-requirements/) — updated 2026-08-11; **Developer accounts**, **Unity**, and **System requirements**. Its legacy “x86 only” macOS line conflicts with its explicit Apple Silicon installation note; consult Unity's version-specific requirements and actual build evidence rather than treating that line as a complete host matrix.

### S5

[Unity 6.4: System requirements](https://docs.unity3d.com/6000.4/Documentation/Manual/system-requirements.html) — **Unity Editor system requirements**, macOS and Rosetta entries.

### S6

[Meta: XR Simulator overview](https://developers.meta.com/horizon/documentation/unity/xrsim-intro/) — updated 2026-09-04; **Standalone XR Simulator** and **Overview**.
