# Building, testing and filming SpinSmith without a headset

Research date: 2026-10-07. Feature freeze Nov 6, deadline Nov 18, 2026.
Items marked **[uncertain]** were not fully verified from a primary source.

## TL;DR

1. **Emulator footage is allowed.** The competition rules say the video should "showcase footage of
   your Project as viewed on a Meta Quest device **or via XR Simulator or another equivalent
   emulator**" (quoted in `BRIEF.md` from the Devpost rules,
   https://start-developer-competition-26.devpost.com/). Meta's own launch post lists the Immersive
   Web Emulator as a supported pre-hardware tool, because the target VR Glasses do not ship until
   2027 (https://developers.meta.com/horizon/blog/meta-connect-2026-vr-start-developer-competition/).
   An honest, well-shot IWER video is a valid submission. A headset is useful but not required.
2. **Use a short headset window well.** IWER's `ActionRecorder` records **full 25-joint hand data plus
   the head pose** from a real Quest WebXR session. `ActionPlayer` then replays it in the desktop
   emulator (checked in `node_modules/iwer/lib/action/ActionRecorder.js`, iwer 2.5.0). One or two
   hours on a borrowed or used Quest can give you real pinch, pull and slap recordings that you
   replay for weeks.
3. **Real hands without a headset** need a webcam bridge from MediaPipe to IWER. No ready-made
   MediaPipe-to-IWER bridge was found. The closest is `desktop-xr-hands` (A-Frame, MediaPipe to
   WebXR joints). SpinSmith already has `src/dev-hands.ts` as a hook point. Depth from one webcam
   is unreliable, so this is good for gesture shape and timing but not for touching a real table.
4. **Nothing simulates a palm slap on a real table.** Table contact and passthrough lighting can only
   be checked on a device. Plan at least one device session before Nov 6.

## 1. Emulators and simulators

| Tool | Stack | Hands | Planes / scene | Passthrough | Notes for SpinSmith |
|---|---|---|---|---|---|
| **IWER + @iwer/devui** (in IWSDK) | WebXR, any browser | Yes. `XRHandInput` with pose presets (`default`, `pinch`, `point`, `relaxed`), an analog `pinchValue`, and custom `HandPose` joint matrices. DevUI hand UI was still listed as "under development" in the devui README, but IWSDK's own emulator drives hands. | Yes, through `@iwer/sem`: `XRPlane`, `XRMesh`, semantic labels, hit test. Rooms: `living_room`, `meeting_room`, `music_room`, `office_large`, `office_small`. | Rendered room standing in for passthrough | **Primary tool.** Already set up (`iwsdk.config.json`: `metaQuest3`, `living_room`). Also offers `RemoteControlInterface` (`animate_to`, `look-at`, select) and `ActionRecorder`/`ActionPlayer`. |
| **Immersive Web Emulator (IWE)** Chrome/Edge extension | WebXR | Older versions controller-only; 2.x is built on IWER **[uncertain on hand UI parity]** | v1.1 added `immersive-ar`, anchors, plane detection | Synthetic room | Use it to try the *deployed* URL without the dev server. https://github.com/meta-quest/immersive-web-emulator |
| **Mozilla WebXR API Emulator** | WebXR | No articulated hands | No | No | Last updated 2021. Skip. |
| **Meta XR Simulator** (v74+, 83.0 downloads) | OpenXR runtime for Unity, Unreal, native. **Windows and macOS only.** | Keyboard and mouse poses: aim, poke, pinch, grab (keys 1-4); controller-driven hand tracking; palm pose extension | Synthetic rooms with walls, floor, furniture, anchors, depth | Synthetic | Also record/replay to VRS and data forwarding from real controllers. Does not run on Linux. Use with Chrome's WebXR is undocumented **[uncertain, unverified]**. Not relevant to an IWSDK app. https://developers.meta.com/horizon/documentation/native/xrsim-intro/ , https://developers.meta.com/horizon/documentation/native/xrsim-hand-tracking/ |
| **Meta XR Operator** (Aug 2026, XR SDK v205) | MCP agent testing on top of XR Simulator | Meta says it **cannot reliably judge hand tracking**, motion quality or audio | n/a | n/a | Unity/native only. https://developers.meta.com/horizon/blog/meta-xr-operator-close-the-build-test-verify-loop-for-vr/ |
| **Unity XRI Interaction Simulator** | Unity | Hand simulation added in XRI 3.x | Through the AR Foundation simulation | Simulated | Not relevant (wrong engine). https://unity.com/blog/hand-tracking-tools-for-unity-xr |
| **Godot XR Simulator** (asset library) | Godot | Controllers and camera only; no hand tracking | No | No | https://godotengine.org/asset-library/asset/5447 |

**What no emulator can test:**

- real hand-tracking jitter, occlusion and loss (for example, a hand flat on a table often loses
  tracking);
- whether the detected table plane matches the real table height and edge;
- how passthrough grain, real room lighting and contrast affect readability;
- real GPU and thermal performance on the XR2 Gen 2;
- the 3S's narrower FoV against your in-world UI;
- comfort.

**Performance without a device:** desktop numbers do not transfer. Use proxies:

- draw-call and triangle budgets (already tracked in `QUESTLESS-PLAN.md`);
- Chrome DevTools with 4-6x CPU throttle;
- texture memory;
- avoiding transparent overdraw on big surfaces.

Treat 72 fps on Quest 3S as unproven until measured on a device (OVR Metrics Tool, or the Quest
Browser's WebXR performance HUD **[uncertain naming]**).

## 2. Real hands without a headset

**Options:**

- **MediaPipe Hand Landmarker** (`@mediapipe/tasks-vision`) gives 21 landmarks per hand at 30+ fps
  in the browser, so no server is needed. WebXR needs 25 joints. The four metacarpal joints and the
  wrist and palm orientation must be derived from the 21 landmarks.
- **Existing projects:**
  - `desktop-xr-hands` (Diarmid Mackenzie, A-Frame). It maps MediaPipe to WebXR joint positions and
    orientations. The author says palm-size depth is "rather unstable" and joint radii are fixed at
    1 cm. Its mapping table is the best reference to copy.
    https://diarmidmackenzie.github.io/aframe-components/components/desktop-xr-hands/ ,
    https://github.com/diarmidmackenzie/aframe-components/blob/main/components/desktop-xr-hands/index.js
  - `beemsoft/webxr-handtracking-playground`: MediaPipe hands driving three.js hand models.
    https://github.com/beemsoft/webxr-handtracking-playground
  - `hwkim3330/hand`: MediaPipe driving a rigged three.js hand. https://github.com/hwkim3330/hand
  - `Ojperdomoc/ExplosionCAD_VR`: webcam hands on desktop, WebXR hands on headset.
    https://github.com/Ojperdomoc/ExplosionCAD_VR
  - Codrops tutorial on webcam hand controllers with three.js.
    https://tympanus.net/codrops/2024/10/24/creating-a-3d-hand-controller-using-a-webcam-with-mediapipe-and-three-js/
  - `handible` (npm), MediaPipe gesture control for the web. https://npmjs.com/package/handible
  - **No project was found that feeds MediaPipe into IWER/IWSDK specifically.**
- **Ultraleap / Leap Motion Controller 2:** gives real depth and 3D hands. It ships an OpenXR API
  layer (`XR_EXT_hand_tracking`) and a WebSocket server (LeapJS-compatible). With IWER you would read
  the WebSocket and write joints. Cost about EUR 140 new, often cheaper used. On Linux, support is
  limited to Ultraleap's Gemini packages **[uncertain]**. https://docs.ultraleap.com/hand-tracking/getting-started
- **A phone as a webcam** (DroidCam, or a phone browser streaming over WebRTC) is just a better camera
  for MediaPipe. If you mount the phone above the table looking down, height above the table is easy
  to read from the 2D image. That is the dimension SpinSmith's slap and pull care about.

**How a bridge would plug into SpinSmith:**

`src/dev-hands.ts` already moves the emulator's per-hand handles. A `dev-webcam-hands.ts` could:

1. run Hand Landmarker on a `getUserMedia` stream;
2. map wrist position to the hand handle position, scaled to a calibrated box above the emulated
   table;
3. set `pinchValue` from the thumb-index tip distance (`XRHandInput.updatePinchValue`), or build a
   custom `HandPose` per frame from landmarks;
4. treat a fast drop of the palm toward the table plane as a slap.

**Effort:** 1.5-3 days for a usable version, more for good joint orientations.

**Value:** you can check gesture timing, thresholds and "does it feel like a pull" with your own
hand. It does **not** replace device testing of tracking quality.

## 3. Getting brief headset access

- **Buy used and resell.** This is probably the most reliable option in Turkey.
  - Second-hand Quest 3 and 3S units are listed on sahibinden, letgo and the Facebook groups. Resell
    after Nov 18 at a small loss.
  - New Quest 3 512 GB was listed around 32,750 TL at Teknosa/MediaMarkt at one point. A 2026 figure
    of 59,400 TL for a new 3S 128 GB also appears; Turkish prices have moved a lot. **[uncertain,
    check current listings]**
  - https://www.mediamarkt.com.tr/tr/product/_meta-oculus-meta-quest-3-512gb-sanal-gerceklik-gozlugu-beyaz-1239504.html ,
    https://www.tamindir.com/blog/meta-quest-3s-ozellikleri-fiyati_90518/
- **Renting:**
  - Grover rents a Quest 3 128 GB for about EUR 16.49/month plus EUR 4.90 delivery, in DE/AT/NL and
    other EU countries. It does **not** ship to Turkey.
    https://www.grover.com/de-en/products/meta-mixed-reality-meta-quest-3-128gb
  - Slovenia: legit.si. https://legit.si/en/products/najem-vr-ocal-meta-quest-3
  - US: Lensrentals. https://www.lensrentals.com/rent/meta-quest-3-advanced-all-in-one-vr-headset-128gb
  - No consumer Quest rental service was found in Turkey. Event-rental firms in Istanbul and Ankara
    rent VR kits by the day for events. Asking one for a 1-2 day private rental is plausible but
    unverified **[uncertain]**.
  - A Yandex listing for a "Meta Quest 3 VR rental service" exists but could not be verified.
    https://portal.yandex.com.tr/yaozet/services/meta-quest-3-vr-rental-service-nguT0kcx
- **University and labs.** Ask the Hacettepe CS / game-tech labs, METU's Modeling & Simulation /
  VR labs, and makerspaces and teknokent incubators. Many have Quest 2/3 units for courses. A Quest 2
  tests hands and performance but has **no colour passthrough or depth**, so it cannot test MR well.
- **Friends and local VR arcades.** One afternoon with a friend's Quest 3 is enough for the
  recording plan below.
- **Meta programs:**
  - The Start program offers support, mentorship and forum access. The Partner tier has a Discord
    with a "What I'm Building" channel for feedback and playtesters.
  - No device loan or discount for 2026 competition entrants was found **[uncertain; ask in the
    Start forum / priority support]**.
  - Oculus Launch Pad historically provided hardware but is a separate, application-based program.
  - https://developers.meta.com/horizon/discover/programs/start/ ,
    https://communityforums.atmeta.com/discussions/Questions_Discussions/meta-horizon-start-program-discord-link/1356268
- **Remote testers:**
  - Because SpinSmith is a URL, any Quest 3 owner can open it in Quest Browser. You can post a build
    in r/WebXR, r/OculusQuest (check self-promo rules), the WebXR Discord and the Start forum.
  - Ask testers for an in-headset recording, which is easy on Quest, plus written notes.
  - The best version: ship a hidden `?record=1` mode that runs IWER's `ActionRecorder` on their
    session and offers a JSON download. This gives you their real hand data.
  - Meta also offers Release Channel invites and playtest feedback tools, but for APK/Store builds.
    https://developers.meta.com/horizon/blog/release-channel-url-invite-playtesting-feedback-meta-quest-developers
- **Cloud device labs:** no public cloud lab offering Quest headsets was found. The IWSDK
  native-test skill mentions "XRPilot" as a device-rental tool not to depend on; it appears
  internal or non-public **[uncertain]**.

## 4. Recording a trailer with little or no device time

**Rules that apply:**

- Under 3:00, public on YouTube or Vimeo.
- Footage from a Quest **or an XR Simulator / equivalent emulator**.
- The judging text says: "show real gameplay that honestly represents the experience... Don't lean on
  AI-generated video to carry the pitch" (`BRIEF.md`).
- Meta Store convention: footage captured on Quest 3 / Pro should carry "Captured on [device]".
  https://developers.meta.com/horizon/resources/vrc-quest-asset-10/
- By the same logic, label emulator footage "Captured in Immersive Web Emulator (IWER)".

**Meta's capture guidance:**
https://developers.meta.com/horizon/resources/video-capture-mr-vr/ ,
https://developers.meta.com/horizon/documentation/unity/ts-mqdh-media/

- 1080p, 36 fps variable, 20 Mbps, low stabilisation in the headset. Up to 2160p60 at 40 Mbps
  through Meta Quest Developer Hub. MQDH is Windows/macOS only.
- On Linux, record in the headset (Meta button, then Camera, then Record video) and `adb pull`, or
  use `scrcpy --crop ... --record`. Quest 3 on Linux may need scrcpy 3.3.4 with a patched server
  (https://www.jabawok.net/?p=232).
- Colour-correct; VR footage tends to be dark.
- Third-person footage makes the trailer more engaging.

**Passthrough capture caveat:** older reports say passthrough was blacked out in recordings and
casts (https://skarredghost.com/2021/09/05/record-videos-oculus-quest-passthrough-ar). Quest 3
system recordings of MR apps do include passthrough today, but whether **Quest Browser WebXR
`immersive-ar`** recordings and scrcpy mirrors show it should be checked on the first device day
**[uncertain]**.

**Techniques used by small teams:**

- **Scripted emulator cinematics.** Drive the headset camera with IWER's `RemoteControlInterface`
  (`animate_to`, `look-at`) or `npx iwsdk xr set-transform`. Drive the hands with recorded
  `ActionPlayer` data. Run the game at the same time and capture the canvas with OBS at 1080p60.
  The camera moves are repeatable, smooth and honest, because it is the real game running.
- **Camera smoothing / a tripod-mounted headset** for steady first-person footage
  (https://www.roadtovr.com/inside-xr-design-make-great-vr-trailer-without-mixed-reality-capture/).
  Structure the trailer as hook, show-don't-tell, then a story arc.
- **Third-person over-the-shoulder phone footage** of the player's real hands on a real table,
  cut against the in-headset capture. Use this only for real device sessions.
- **Compositing CG over real table footage** (match-moving the arena onto a phone video) is
  **risky**. It can look like device capture when it is not. If used, show it briefly as a
  labelled concept shot, never as gameplay.
- **Webcam "fake passthrough"** (the emulator rendered over a webcam feed) shares the same risk. Fine
  as a labelled dev-tool demo, not as the hero gameplay.

## 5. Recommendation for SpinSmith (ranked)

| # | Action | Effort | Why |
|---|---|---|---|
| 1 | **Lock an emulator capture pipeline now.** OBS at 1080p60 on the IWER canvas, `living_room` SEM, scripted camera paths through `RemoteControlInterface` / `iwsdk xr animate-to`, `dev-hands.ts` for hand motion. Shoot a rough 2:30 cut this week, to the shot list in `SUBMISSION.md`. | 1 day | A valid submission video exists even if no headset ever appears. It also shows which moments do not read. |
| 2 | **Get one device session before Nov 6**, ideally two (around Oct 20 and Nov 1). Cheapest certain path: buy a used Quest 3 locally and resell after Nov 18. Ask Hacettepe/METU labs and friends in parallel. Prefer Quest 3 over 3S for the video; test FoV on 3S if one turns up. | 0.5 day to arrange; net cost = resale loss | Hand-on-table tracking, plane accuracy, passthrough readability and fps cannot be emulated. |
| 3 | **Prepare the device session script before it happens.** (a) A `?record=1` mode wrapping `ActionRecorder`, saving JSON for pinch, pull and slap takes (good, sloppy, fast, a hand flat on the table). (b) A checklist: table plane height vs real, tracking loss on slap, fps with OVR Metrics, 3S FoV crop of the UI, passthrough contrast. (c) Footage: in-headset recording "Captured on Meta Quest 3" plus phone over-the-shoulder takes. | 0.5-1 day | It turns 2 hours of access into weeks of replayable real-hand regression tests in IWER, plus all the hero footage. |
| 4 | **Replay real recordings in IWER as regression tests** after the session (ActionPlayer, deterministic). Retune gesture thresholds against real jitter. | 0.5-1 day | It closes the feel loop without the device. |
| 5 | **Optional: MediaPipe webcam bridge** in a new `dev-webcam-hands.ts`, using a phone mounted above the desk looking down. Copy the joint mapping from `desktop-xr-hands`. | 1.5-3 days | Only worth it if no device is available by about Oct 25. It tunes gesture timing with your own hands; do not use it for hero footage. |
| 6 | **Remote testers** through r/WebXR, the WebXR Discord and the Start forum: a URL plus `?record=1`, asking for an in-headset clip and notes. Ask Meta Start support whether entrants can get device access. | 0.5 day plus waiting | Free extra hand data and room variety, matching the judges' "rooms you never tested". |
| 7 | **Final cut (Nov 7-17):** device footage first, labelled "Captured on Meta Quest 3". If none, emulator footage labelled "Captured in IWER emulator". No AI video, no unlabelled composites. | 1-2 days | Honest-representation criterion and Polish & Presentation (25%). |

**Fallback if no device ever appears:** submit with steps 1, 4 (using tester recordings, if any)
and 5. Say plainly in the Devpost text which parts were tuned in the emulator. Judges test on
real Quests anyway, so make thresholds forgiving and add a clear recalibration option for table
height.
