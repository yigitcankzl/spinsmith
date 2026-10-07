# Camera hands: driving the IWER emulator's hands from a webcam or phone

Status: research and design only. Nothing in `src/` has changed and no package is installed.
Date: 2026-10-07. Versions read: `iwer` 2.5.0, `@iwer/devui` 2.5.0 and `@iwsdk/*` 1.0.1 in
`node_modules`; `@mediapipe/tasks-vision` 1.1.0 (npm `latest`, published 2026-10-06).

## TL;DR

- **Injection works without patching IWER.** Each `XRHandInput` rebuilds its 25 joint matrices
  every frame in `updateHandPose()`, relative to its target-ray space, which comes from
  `hand.position` / `hand.quaternion`. On the two hand instances, replace `updateHandPose` (it
  writes our 25 local matrices and radii) and wrap `onFrameStart` (it sets the hand's root pose
  first). The private fields can be reached through `Object.getOwnPropertySymbols` by symbol
  description, so this works against the iwer copy that the IWSDK plugin bundles. The emulator UI
  stays in manual mode, so you can still fly the headset around.
- **Pinch/select is separate.** The game computes pinch from thumb-tip/index-tip distance itself
  (`src/game/hands.ts:117`), so joints alone are enough. `select` events (IWSDK UI rays) only fire
  from the gamepad `pinch` button. Leave it off by default: `hands.ts` ORs it with the joint test,
  so it would hide the hysteresis you want to test. Add an opt-in `?camSelect=1`.
- **Tracker:** `@mediapipe/tasks-vision` HandLandmarker in `VIDEO` mode with the GPU delegate.
  `LIVE_STREAM` does not exist on the web (`RunningMode = "IMAGE" | "VIDEO"`). Apache-2.0. The
  model is 7.8 MB, the wasm is 13 MB and the JS is 156 KB. Serve all of it locally in dev only.
- **Camera placement matters more than the model.** Monocular depth is the weakest axis, and slaps
  and presses happen on the vertical axis. Put the camera so that vertical movement shows up as
  up/down movement in the image: a phone at the far side of the desk, about 25 to 35 cm above it,
  tilted about 20 to 30 degrees down toward you. A top-down camera is the worst choice for slap
  detection.
- **Phone on Linux:** `scrcpy --video-source=camera --camera-fps=60 --v4l2-sink=/dev/videoN`
  (Android 12+, v4l2loopback is already present in this kernel) gives 60 fps with low latency.
  Android 14 QPR1+ "Webcam" USB mode is the zero-install alternative, but usually runs at 30 fps.
- **Effort:** about 3 to 4 days for a usable bridge with calibration, smoothing and record/replay.
  Expect 80 to 150 ms end to end. This checks gesture logic, timing and flow with real human
  motion. It does **not** check Quest tracking quality, Quest pinch distances or real table
  detection.

---

## 1. IWER internals: how hands work and where to inject

### 1.1 Data model

| What | Where |
|---|---|
| Hand config: `poses.default` (relaxed), `pinch`, `point`; profile `oculus-hand` | `node_modules/iwer/lib/device/XRHandInput.js:18-30` |
| Hand gamepad: one analog button `pinch` with `eventTrigger: 'select'` | `XRHandInput.js:31-35` |
| 25 `XRJointSpace`s created as **children of `targetRaySpace`**; `gripSpace` is also a child of `targetRaySpace` | `XRHandInput.js:74-84` (joint parent at :82) |
| `updateHandPose()`: for each joint, interpolates `poses[poseId]` toward `poses.pinch` by `pinchValue` into `jointSpace[P_SPACE].offsetMatrix`; mirrors the matrix for the right hand; sets `jointSpace[P_JOINT_SPACE].radius`; interpolates `gripOffsetMatrix` | `XRHandInput.js:102-120` (mirror :110-112) |
| `pinchValue` getter = gamepad `pinch` button value; `updatePinchValue(v)` sets `pendingValue`; `setPinchValueImmediate` | `XRHandInput.js:121-145` |
| `onFrameStart(frame)` = `super.onFrameStart(frame)` then `this.updateHandPose()` | `XRHandInput.js:146-149` |
| Pose config format (`HandPose`): `{ jointTransforms: { [joint]: { offsetMatrix: number[16], radius } }, gripOffsetMatrix? }`, column-major, metres, left-hand convention (right is mirrored) | `device/configs/hand/relaxed.js` (grip at :235), type in `XRHandInput.d.ts` |
| Tracked input root: `position` / `quaternion` (IWER `Vector3` / `Quaternion`, default left (-0.25, 1.5, -0.4)) | `device/XRTrackedInput.js:13-46` |
| `updateTargetRaySpace()`: `targetRaySpace.offsetMatrix = fromRotationTranslation(quaternion, position)` | `XRTrackedInput.js:57-60` |
| Base `onFrameStart`: applies gamepad `pendingValue`, dispatches `select` / `selectstart` / `selectend` on 0 to >0 and >0 to 0 edges, tracks `connected` changes | `XRTrackedInput.js:61-102` |
| `GamepadButton.pressed` for analog buttons = `value > 0` | `gamepad/Gamepad.js:27-34` |
| `XRSpace` stores `{ parentSpace, offsetMatrix: mat4 (Float32Array) }` under `P_SPACE`; world pose = product of the parent chain | `spaces/XRSpace.js:12-21, 53-66` |
| `XRJointSpace` stores `{ jointName, radius }` under `P_JOINT_SPACE` | `spaces/XRJointSpace.js:9-13` |
| `frame.getJointPose(joint, base)` = `getPose` + `radius` | `frameloop/XRFrame.js:94-98` |
| Private symbols are plain `Symbol('@iwer/...')`, not `Symbol.for`: `P_HAND_INPUT` :12, `P_TRACKED_INPUT` :13, `P_GAMEPAD` :15, `P_JOINT_SPACE` :27, `P_SPACE` :29 | `lib/private.js` |

Note: WebXR defines **25 joints and no "palm" joint** (OpenXR has 26). The palm is implied by
the metacarpals, and the game's "palm" point is `middle-finger-metacarpal`
(`src/game/hands.ts:11`).

### 1.2 Runtime exposure and per-frame order

- `window.IWER_DEVICE` is set by the IWSDK dev plugin's injected runtime
  (`node_modules/@iwsdk/vite-plugin-dev/dist/injection-bundle.js:1045`, minified:
  `window.IWER_DEVICE=i`). The bundle contains **its own copy of iwer**. Importing `iwer` from
  `node_modules` gives different symbols and classes, so use the device instance and look the
  symbols up by description.
- `device.hands.left/right` always exist (`device/XRDevice.js:633-635`). They are active only when
  `device.primaryInputMode === 'hand'` (`:639-648`) and `connected` (`activeInputs`, `:650-661`).
- The devui handles are exposed as `window.transformHandles`
  (`node_modules/@iwer/devui/lib/scene.js:108`). In manual mode, `renderScene` calls
  `syncDeviceTransforms()` (`scene.js:591-603`, called from `:731-734`), which copies each
  handle's world pose into `hand.position/quaternion`. In programmatic mode it does the reverse
  (`syncFromDevice`, `:607+`).
- Per XR frame (`session/XRSession.js:151-178`): **`devui.render(now)`** (handles overwrite hand
  position) → `device.onFrameStart(frame)` (`XRDevice.js:275-318`): `remote.update()` → (action
  player, or) `activeInput.onFrameStart(frame)` for each input → `updateActiveInputSources()` → app
  rAF callbacks (the game reads joints here).

So anything written inside the hand's own `onFrameStart`, before the original runs, wins over
the devui for that frame. Nothing runs between that point and the game reading the joints.

### 1.3 RemoteControlInterface (CLI / MCP path)

`iwer/lib/remote/RemoteControlInterface.js`: commands are queued and run in `update()`
(`:303-372`). The first command switches `device.controlMode = 'programmatic'` (`:317`). A
release timer switches it back to `'manual'` (`:374-380`). The methods (`:648-690`) are
`set_transform` (hand root position/orientation, `:504-526`), `set_select_value` (pinch,
`:598-602`), `set_hand_pose` (**only a `poseId`: 'default' | 'pinch' | 'point'**, `:839-856`),
`set_connected`, `set_input_mode`, and device state. **There is no joint-level command**, so
remote control cannot express a camera pose. It can only move a canned pose. Switching to
programmatic mode also disables devui interaction (`devui/lib/index.js:40-56`), which takes away
headset fly-around. In-page injection is the right path.

### 1.4 ActionRecorder / ActionPlayer format

`action/ActionRecorder.d.ts`: `ActionFrame { timeStamp, position, quaternion, inputFrames[] }`;
`InputFrame { index, targetRayTransform{position,quaternion}, gripTransform?, hand?: {[joint]:
{position, quaternion, radius}}, gamepad? }`; `InputSchema { handedness, profiles, hasHand,
jointSequence, ... }`. Joints are recorded relative to the target-ray space
(`ActionRecorder.js:133-152`, via `frame.fillPoses(jointSpaces, inputSource.targetRaySpace)`). The
player rebuilds input sources and interpolates joints (`ActionPlayer.js:493-530`). During
playback, `device.inputSources` come from the player (`XRDevice.js:287-289`, `:663-670`), so it
replaces live input.

Usefulness here: the format can hold camera-driven hands, but the recorder and player must come
from the same iwer copy as the device (private symbols), and the injected bundle does not expose
the classes. **Recommendation:** record the bridge's own input stream (timestamped landmarks plus
calibration) as JSONL and replay it through the same bridge. That is deterministic, independent of
IWER and keeps the filter and mapping in the loop.

### 1.5 Injection recipe

1. `device.primaryInputMode = 'hand'` (or select Hands in the devui).
2. For each side, hijack the instance (instance properties shadow the prototype; `onFrameStart`
   calls `this.updateHandPose()`, so the override is picked up):
   - wrapped `onFrameStart(frame)`: if a fresh camera pose exists, set `hand.position` /
     `hand.quaternion` to the synthesized **target-ray** pose, optionally `updatePinchValue(...)`,
     then call the original. The original builds `targetRaySpace`, applies the pending pinch and
     dispatches `select`.
   - replaced `updateHandPose()`: if there is a camera pose, write `inverse(rayWorld) *
     jointWorld[i]` into `joint[P_SPACE].offsetMatrix` for all 25 joints, set
     `joint[P_JOINT_SPACE].radius`, and write the grip offset. Otherwise call the original (canned
     pose).
3. Do **not** go through `poses[...]`. The default config object is shared by both hands, and
   values written there are mirrored for the right hand (`XRHandInput.js:110-112`). Writing the
   offset matrices directly avoids both problems.
4. Tracking loss: keep the last pose for up to about 150 ms, extrapolating a little. After that,
   set `hand.connected = false` (the input source disappears and the game sees `tracked: false`).
   Set it back to `true` on reacquire.
5. Pinch/select: by default leave `pinchValue` at 0, so the game's joint-distance hysteresis is
   what actually gets tested. With `?camSelect=1`, mirror the bridge's own pinch hysteresis into
   `updatePinchValue(0|1)`, so IWSDK ray UI (`select`) works too.
6. Disable `src/dev-hands.ts` while camera hands are on. Its mouse moves would be overwritten
   anyway.

---

## 2. MediaPipe in the browser

| Item | Value | Source |
|---|---|---|
| Package | `@mediapipe/tasks-vision` 1.1.0 (2026-10-06); earlier stable 1.0.1 (2026-07-31), 0.10.35 | npm registry |
| Licence | Apache-2.0 (package). The model is distributed by Google via `storage.googleapis.com/mediapipe-models`; the docs are CC-BY-4.0 and the code samples Apache-2.0 | npm; https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker |
| API | `FilesetResolver.forVisionTasks(basePath)`, `HandLandmarker.createFromOptions(fileset, { baseOptions: { modelAssetPath \| modelAssetBuffer, delegate: 'GPU' \| 'CPU' }, runningMode: 'VIDEO', numHands: 2, minHandDetectionConfidence, minHandPresenceConfidence, minTrackingConfidence })`, `detectForVideo(video, timestampMs)` | `vision.d.ts` lines 20-29, 828, 998, 1044, 2849 |
| Running modes (web) | **`"IMAGE" \| "VIDEO"` only**; there is no `LIVE_STREAM` on the web (it is used in Python/Android) | `vision.d.ts:2849` |
| Result | `landmarks[h][21]` (x, y normalized to the image; z relative depth with the wrist as origin, smaller = closer), `worldLandmarks[h][21]` (metres, origin at the hand's approximate geometric centre), `handedness[h][0].categoryName` | https://github.com/google/mediapipe/blob/master/docs/solutions/hands.md |
| Handedness caveat | "handedness is determined assuming the input image is mirrored ... If it is not the case, please swap the handedness output" | same |
| Model | `hand_landmarker.task` (palm detector + landmark model, float16), **7,819,105 bytes**; https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task | HTTP HEAD |
| Wasm | `vision_wasm_internal.wasm` **12.997 MB** (+ JS loader; a `nosimd` fallback and a module variant are also shipped). The npm package is 40.6 MB unpacked | jsDelivr |
| JS bundle | `vision_bundle.mjs` 156 KB | jsDelivr |
| Speed | Google publishes only Pixel 6: 17.1 ms CPU / 12.3 ms GPU per frame. A laptop iGPU in Chromium with `delegate: 'GPU'` (WebGL2) should reach about 30 to 60 fps for 2 hands at 640x480 to 1280x720. This is an estimate; measure it in the spike. In video mode the palm detector only re-runs when tracking is lost, so steady state is the cheap landmark pass | model page |

Loading locally (no CDN, nothing published):
- Add `@mediapipe/tasks-vision` as a **devDependency** (exact version pinned).
- Wasm: `FilesetResolver.forVisionTasks('/node_modules/@mediapipe/tasks-vision/wasm')`. The Vite
  dev server serves files under the project root. Verify this in the spike. If it fails, fall
  back to `new URL('../../../node_modules/@mediapipe/tasks-vision/wasm', import.meta.url).href`.
- Model: download once with a script into a git-ignored `dev-cache/camhands/hand_landmarker.task`,
  then load it with `fetch()` + `modelAssetBuffer`. **Do not put it in `public/`**: `vite.config.ts`
  has `publicDir: 'public'`, which is copied into `dist/`.
- Inference runs on the main thread to start with (about 10 to 20 ms per camera frame). If it
  costs frame rate, move it to a module Worker that receives `ImageBitmap`s (`createImageBitmap`
  from the video) and uses the GPU delegate on an OffscreenCanvas.
- Secure context: getUserMedia needs HTTPS or localhost. The IWSDK dev server already runs on
  HTTPS.
- The app runs inside the workspace `<iframe id="workspace-runtime-frame">`, which has no `allow`
  attribute (`@iwsdk/vite-plugin-dev/dist/editor/editor-workspace.js`). It is same-origin, and
  `camera`'s default allowlist is `'self'`, so getUserMedia is allowed there. The managed browser
  is a Playwright persistent Chromium context (`vite-plugin-dev/dist/index.js:23185-23240`). If the
  permission prompt does not appear there, open the dev URL in the normal system Chromium (IWER
  is injected by the Vite plugin, so it works in any browser).

---

## 3. Mapping 21 MediaPipe landmarks to 25 WebXR joints

MediaPipe indices: 0 wrist; thumb 1 CMC, 2 MCP, 3 IP, 4 tip; index 5 MCP, 6 PIP, 7 DIP, 8 tip;
middle 9-12; ring 13-16; pinky 17-20.

| WebXR joint | Position |
|---|---|
| wrist | 0 |
| thumb-metacarpal / -phalanx-proximal / -phalanx-distal / -tip | 1 / 2 / 3 / 4 |
| {index,middle,ring,pinky}-finger-metacarpal | **synthesized:** `lerp(L0, L_mcp, k)` with k ≈ 0.20 (index), 0.15 (middle), 0.15 (ring), 0.20 (pinky). The CMC joints sit just distal of the wrist and fan out slightly |
| ...-phalanx-proximal / -intermediate / -distal / -tip | MCP / PIP / DIP / tip (5,6,7,8; 9..12; 13..16; 17..20) |

Orientation, per the WebXR Hand Input spec (https://www.w3.org/TR/webxr-hand-input-1/):
"-Y ... perpendicular to the skin, outwards from the palm", "-Z ... along their associated bone,
away from the wrist". Tips copy the distal joint's orientation. The wrist's -Z points "roughly
towards the center of the palm".

- `zAxis = -(child - joint).normalize()`. For a tip, use (tip - distal). For the wrist, use
  (middle MCP - wrist). For a metacarpal, use (MCP - synthesized metacarpal).
- Palm normal, outward from the palm: `palmOut = right ? (L5-L0)×(L17-L0) : (L17-L0)×(L5-L0)`.
  This was checked on a right hand lying palm-down: it gives -Y. Then `yAxis = -palmOut`,
  re-orthogonalized against z per joint (`y = normalize(y - z·(y·z))`), and `x = y × z`. This
  gives a right-handed basis for both hands, which is what WebXR expects (the thumb is +X on one
  hand and -X on the other).
- Thumb joints: use the thumb's own bending plane for a better twist,
  `yThumb = -normalize((L2-L1)×(L3-L2))` with the sign flipped per hand. If that cross product is
  degenerate (a straight thumb), fall back to `palmOut`.
- Radii: copy IWER's own relaxed pose radii (via `hand[P_HAND_INPUT].poses.default.jointTransforms[j].radius`,
  about 8 mm at the tips and 21 mm at the wrist). `hands.ts:115` subtracts the radius when it
  computes `low`.

Coordinate frames:
- MediaPipe world landmarks follow image axes: x right, y **down**, z **away** from the camera. In
  three.js camera space that is `(x, -y, -z)`, a 180° rotation about X, so it is a proper
  rotation and keeps handedness. desktop-xr-hands does the equivalent flip with an x/y flip and
  says it does not know why the y-flip is needed; this is the reason.
- Feed **unmirrored** frames, which the camera API delivers by default; mirror only the on-screen
  preview. Swap MediaPipe's handedness labels (it assumes selfie-mirrored input). This holds for
  any unmirrored camera, front-facing or over-the-shoulder: mirroring and viewpoint are
  independent. Labels flicker on fast motion and edge-on hands, so assign hands **stickily**: once
  a track has a side, keep it by nearest wrist to the previous frame, and change it only after N
  consecutive disagreeing frames. Add a key to force a swap.
- A flat hand is ambiguous in chirality. Avoid relying on per-frame handedness for anything except
  the first assignment.

---

## 4. Depth, placement, calibration, smoothing, latency

### 4.1 Absolute position from one camera

World landmarks give metric shape but no position. Solve the translation `t` so that
`project(W_i + t)` matches the image landmarks (PnP with known rotation, because world landmarks
are already camera-aligned). It is linear: for each landmark `i` with pixel `(u,v)`,
`fx·tx − (u−cx)·tz = (u−cx)·Zi − fx·Xi` and `fy·ty − (v−cy)·tz = (v−cy)·Zi − fy·Yi` (in
MediaPipe's y-down/z-forward frame). That is 42 equations and 3 unknowns, solved with 3x3 normal
equations. This uses all 21 points and is steadier than desktop-xr-hands' palm-width-only
estimate (its README calls its distance tracking "rather unstable").

- `fx = (W/2)/tan(hfov/2)`; `?camFov=` knob (default 65° for a phone main camera, 70° to 78° for
  laptop webcams).
- MediaPipe world landmarks assume an average hand size. A size error *e* gives a constant depth
  bias, which calibration removes, plus motion along the depth axis scaled by (1+e). Expose
  `?camHandScale=`.
- Expected noise at about 50 cm: lateral and vertical in the image plane about 1 to 3 mm; depth
  about 1 to 2 cm jitter. These are estimates for the spike to measure.

### 4.2 Camera placement and what it means for each axis

| Placement | Desk-vertical axis maps to | Slap / press | Reach (toward the arena) | Notes |
|---|---|---|---|---|
| **Phone at the far side of the desk, 25-35 cm high, tilted 20-30° down, facing you** (recommended) | mostly image Y (good) | good | depth (weaker) | sees the desk surface, both hands and the contact moment |
| Laptop webcam (front-facing, at eye level) | image Y | good | depth | often cannot see the desk surface: tilt the lid back or lift the hands. Calibrate the "table" at the bottom of the frame |
| Over-the-shoulder, looking down at about 45° | mix of image Y and depth | fair | mix | natural first-person framing, but the body occludes hands |
| Straight top-down | **depth** (worst) | poor: vertical speed comes from the noisiest axis | image Y (good) | do not use for slaps or presses |

### 4.3 Calibration (one key, two gestures, about 3 s)

1. **Palm flat on the desk, still for 1 s.** Average the frames to get the desk normal in camera
   space, `n = -palmOut` (pointing up), and the contact point `p0` (mean of wrist and MCPs, moved
   about 1.5 cm along `-n` for palm thickness). This also measures thumb-index rest distances.
2. **Slide the palm straight forward about 20 cm.** The displacement projected on the desk plane
   gives the "forward" axis. This works for any camera placement, so you never need to tell the
   bridge where the camera is.
3. Build `R` (orthonormal: up = `n`, forward from step 2, `x = up × back`) and map
   `p_world = R·(p_cam − p0)·gain + anchor`. `anchor` is a point at `?camReach=` (default 0.40 m)
   in front of the IWER head along its horizontal forward, at **table height**: `?camTableY=`,
   default `head.y − 0.45` (a seated desk; `placement.ts` limits the table to `TABLE_MAX_BELOW_EYES
   = 0.75`). In the emulator, read the true table height from the game's `[MATCH] snapped to table`
   log, or later from a small dev hook. Keep `gain = 1` so speeds and distances stay real.
4. Optional pinch calibration: also record "pinch hard" for 1 s. If the closed thumb-index
   distance is above about 1.5 cm, remap that distance on output (move the thumb tip toward the
   index tip) so a real pinch closes below `pinchOn = 0.02` (`src/game/tuning.ts:24`). Report the
   raw value in the HUD, because this is a camera limitation that the Quest does not have.
5. Re-anchor whenever the IWER head moves a lot (`R` stays; only `anchor` follows), or freeze it
   with a key.

### 4.4 Smoothing and resampling

- **One Euro filter** (Casiez et al., https://gery.casiez.net/1euro/) on the hand **root
  translation** (strong: `minCutoff` about 1.0 Hz, `beta` about 0.5 to 2 for metres, `dCutoff`
  1 Hz) and, separately, light filtering on the 63 **local shape** values (`minCutoff` about
  3 Hz). Rotation comes from the filtered shape. This keeps finger detail responsive and stops
  root jitter.
- **Resample to the render rate.** The game runs at 60 to 90 Hz but camera samples arrive at 30 or
  60 Hz. Feeding the last sample means y changes in steps, and `TableTouch` (EMA 50 ms,
  `src/game/table-touch.ts:12`) sees spikes followed by zero velocity. Interpolate between the two
  latest samples, rendering one camera frame late (+16 to 33 ms), or extrapolate at constant
  velocity for at most one frame interval.
- Bridge gaps of up to 100 ms (motion blur on fast slaps commonly drops 1 or 2 frames) by
  extrapolation instead of disconnecting.

### 4.5 Will the slap be detected?

Game rule (`tuning.ts:40`, `table-touch.ts:31-55`): the smoothed downward speed reaches **≥ 0.6
m/s**, then within 0.25 s it stays **|v| < 0.08 m/s for 0.05 s**, within ±5 cm of the table
(`match-system.ts:1880`). The gentle press variant uses 0.15 m/s / 0.04 m/s / 0.25 s.

- A real slap peaks at about 1 to 3 m/s over 10 to 20 cm, which takes about 0.1 to 0.15 s: **3 to
  4 frames at 30 fps, 6 to 9 at 60 fps**. Even averaged over 33 ms, the peak stays well above 0.6,
  as long as the frames are not lost.
- **Main risk at 30 fps is motion blur.** Indoor webcam exposure is about 20 to 33 ms, so the hand
  smears and the landmarker drops it at peak speed. Mitigate with bright light (a shorter
  exposure), 60 fps on a phone, and gap extrapolation.
- Stillness: image-plane jitter of 2 mm per frame is 6 cm/s raw at 30 fps, close to 0.08. With
  One Euro and resampling it is about 1 to 3 cm/s, below the threshold. The gentle press threshold
  (0.04 m/s) is tighter, but it holds for 0.25 s and is filtered. If the vertical axis comes from
  depth (top-down camera), jitter is about 10 times larger and stillness fails. Hence the
  placement advice.
- Verdict: **30 fps with good light: workable but marginal; 60 fps: comfortable.** Log the
  bridge's own vertical speed in the HUD next to the game's `[PRESS]` log to tune this.

### 4.6 End-to-end latency (estimate)

Exposure and readout 15-35 ms + USB/v4l2 or scrcpy decode 10-30 ms + inference 10-25 ms + filter
and resampling 10-35 ms + wait for the next XR frame 0-16 ms + render and display 16-25 ms ≈
**80-150 ms** (Quest hand tracking is roughly 30-60 ms). This is fine for gesture logic and flow,
but it is not a feel or latency reference.

---

## 5. Phone as camera on Linux

| Option | Needs | fps / quality | Notes |
|---|---|---|---|
| **scrcpy camera → v4l2loopback** (recommended) | Android 12+, USB debugging (`adb` is installed here), `v4l2loopback` (the module is present: `/lib/modules/7.0.0-34-generic/kernel/v4l2loopback`), scrcpy (latest v5.0, 2026-10-05; not installed here) | `--camera-fps=60`, `--camera-size=1280x720`, either camera; no buffering by default | `sudo modprobe v4l2loopback exclusive_caps=1 card_label=PhoneCam` then `scrcpy --video-source=camera --camera-facing=back --camera-size=1280x720 --camera-fps=60 --v4l2-sink=/dev/video2 --no-video-playback --no-audio`. `exclusive_caps=1` is needed for Chrome. Apache-2.0. https://github.com/Genymobile/scrcpy/blob/master/doc/camera.md, https://github.com/Genymobile/scrcpy/blob/master/doc/v4l2.md |
| Android 14 QPR1+ USB "Webcam" mode (UVC) | supported phone (Pixels first; OEM-dependent): USB preferences → Webcam | MJPEG/YUYV, 480p/720p/1080p; **30 fps recommended** to vendors | Zero install, shows up as `/dev/videoN`. https://source.android.com/docs/core/camera/webcam |
| DroidCam / Iriun | app + Linux client + v4l2loopback | freemium; resolution and fps limited in the free tiers | proprietary, Wi-Fi adds latency; only worth it if the two options above fail |
| Built-in webcam | nothing (`/dev/video0` "Integrated Camera" exists) | usually 720p30 | Fine for the first spike. Poor desk view |

Select the device in the bridge with `?camDevice=<label substring>` (via `enumerateDevices()`),
asking for `{ width: 1280, height: 720, frameRate: { ideal: 60 } }`.

---

## 6. Existing code to reuse or learn from

| Project | Licence | Use |
|---|---|---|
| `diarmidmackenzie/aframe-components` → `components/desktop-xr-hands` (https://github.com/diarmidmackenzie/aframe-components/tree/main/components/desktop-xr-hands) | MIT | Closest prior art. MediaPipe to the 25 WebXR joints, with a per-joint table `[pos1,pos2,weight,dirStart,dirEnd,perpStart,perpEnd]` (`src/desktop-xr-hands.js:61-89`). Metacarpals are `lerp(L0 or L1, MCP, 0.3)`; depth comes from palm width and FOV (`:311-350`); fixed 1 cm radii. It fakes the `XRFrame` in A-Frame rather than going through an emulator, and its README lists unstable depth and unreliable pinch. Borrow the table idea, not the depth method |
| `handible` (npm 0.1.0, https://github.com/gust10/Handible) | MIT | MediaPipe + three.js gesture control. Reference only |
| `beemsoft/webxr-handtracking-playground` (https://github.com/beemsoft/webxr-handtracking-playground) | **no licence file** (all rights reserved) | Read only; do not copy |
| Codrops webcam hand controller tutorial (https://tympanus.net/codrops/2024/10/24/creating-a-3d-hand-controller-using-a-webcam-with-mediapipe-and-three-js/) | article | depth and scale heuristics |
| One Euro filter reference implementations (https://gery.casiez.net/1euro/) | BSD-3 / public | about 30 lines; write our own |

As already noted in `docs/HEADSETLESS-DEV.md`, no existing project feeds MediaPipe into
IWER/IWSDK. The injection in section 1.5 is new.

---

## 7. Implementation plan

### 7.1 Files (all dev-only)

```
src/dev/camhands/index.ts        install(): URL gate, getUserMedia, preview overlay, HUD, keys, loop
src/dev/camhands/tracker.ts      HandLandmarker wrapper (local wasm + model buffer), sticky handedness
src/dev/camhands/skeleton.ts     21 -> 25 joint world matrices + grip + target ray (pure math, no DOM)
src/dev/camhands/solve.ts        translation solve (sec. 4.1), calibration maths (sec. 4.3)
src/dev/camhands/filter.ts       One Euro + resampler
src/dev/camhands/iwer.ts         symbol lookup + per-instance hijack (sec. 1.5)
src/dev/camhands/record.ts       JSONL record / replay of raw tracker output + calibration
scripts/fetch-hand-model.sh      curl the .task into dev-cache/camhands/ (gitignored)
```

Small edits that will be needed when implementing:
- `src/index.ts:35`:
  `if (import.meta.env.DEV) { if (new URLSearchParams(location.search).has('camhands')) void import('./dev/camhands/index.js').then((m) => m.install()); else void import('./dev-hands.js').then((m) => m.installDevHands()); }`
- `package.json`: `"@mediapipe/tasks-vision": "<exact version>"` in **devDependencies**.
- `.gitignore`: `dev-cache/`.
- Production exclusion: `import.meta.env.DEV` is folded to `false` by Vite, so Rollup drops the
  dynamic import and the whole `src/dev/camhands` graph. Verify after `npm run build` with
  `grep -rl "HandLandmarker\|tasks-vision" dist` (expect nothing) and by comparing `dist` size.
  Nothing goes into `public/`.

Knobs (dev only, like `tuning.ts`): `camhands`, `camDevice`, `camFov`, `camReach`, `camTableY`,
`camHandScale`, `camSelect`, `camFps`, `camRecord`, `camReplay=<file>`.
Keys: `C` calibrate, `X` swap hands, `P` pause/freeze, `R` toggle recording, `V` toggle preview.

### 7.2 Steps

1. **Spike (0.5 d):** camera → HandLandmarker (local wasm/model, GPU) → 2D overlay; log fps and
   inference ms; check the iframe permission prompt in the managed browser.
2. **Skeleton + injection (1 d):** `skeleton.ts` + `iwer.ts` with a fixed placement (no
   calibration). Check in the emulator that the hand mesh follows, that `getJointPose` for all 25
   joints returns poses, and that the game's `HandInput.pinching` toggles at thumb-index
   2.0/3.5 cm.
3. **Placement (1 d):** translation solve, two-gesture calibration, One Euro, resampling,
   tracking-loss handling, sticky handedness. HUD: per-hand `low`, vertical speed and
   thumb-index distance.
4. **Game gestures (0.5 d):** go through press-to-place, the gentle press, the strike slap, the
   cup fingertip press (`wellSpeed` 0.15 m/s), ramps (`farHold` 0.12 s) and the pinch-and-pull
   rip (`fullPull` 0.22 m, `fullSpeed` 1.0 m/s). Tune only the bridge, never `TUNE`, so the
   results say something about the game.
5. **Record/replay (0.5 d):** JSONL of raw landmarks with timestamps, replayed through the same
   pipeline, for repeatable regression runs (headless with the CLI, or in front of a reviewer).

**Total: about 3 to 4 days.**

### 7.3 Code sketch

```ts
// skeleton.ts: calibrated world-space MediaPipe points -> 25 WebXR joint world matrices.
// No allocation per frame (scratch vectors are module-level).
import { Matrix4, Vector3 } from '@iwsdk/core';

/** WebXR joint order (same as XRHand iteration order). */
export const JOINTS = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  ...['index', 'middle', 'ring', 'pinky'].flatMap((f) => [
    `${f}-finger-metacarpal`, `${f}-finger-phalanx-proximal`, `${f}-finger-phalanx-intermediate`,
    `${f}-finger-phalanx-distal`, `${f}-finger-tip`,
  ]),
] as XRHandJoint[];

/** Per joint: source landmark, or [a, b, k] = lerp(La, Lb, k) for synthesized metacarpals. */
type Src = number | [number, number, number];
const finger = (mcp: number, k: number): Src[] => [[0, mcp, k], mcp, mcp + 1, mcp + 2, mcp + 3];
const SRC: Src[] = [0, 1, 2, 3, 4, ...finger(5, 0.2), ...finger(9, 0.15), ...finger(13, 0.15), ...finger(17, 0.2)];
/** Per joint: the joint its -Z points toward (-1 = tip: reuse previous direction). Wrist -> middle MCP. */
const TO = [11, 2, 3, 4, -1, ...[5, 10, 15, 20].flatMap((m) => [m + 1, m + 2, m + 3, m + 4, -1])];
// (indices into the 25-joint list: 11 = middle-finger-phalanx-proximal, i.e. MediaPipe 9)

const p = Array.from({ length: 25 }, () => new Vector3());
const x = new Vector3(), y = new Vector3(), z = new Vector3(), a = new Vector3(), b = new Vector3(), back = new Vector3();

export function toJoints(L: Vector3[], right: boolean, out: Matrix4[]) {
  SRC.forEach((s, i) => (typeof s === 'number' ? p[i].copy(L[s]) : p[i].lerpVectors(L[s[0]], L[s[1]], s[2])));
  a.subVectors(L[5], L[0]);
  b.subVectors(L[17], L[0]);
  // palmOut = right ? a x b : b x a ; the back of the hand (+Y) is its negation.
  (right ? back.crossVectors(b, a) : back.crossVectors(a, b)).normalize();
  for (let i = 0; i < 25; i++) {
    if (TO[i] >= 0) z.subVectors(p[i], p[TO[i]]).normalize(); // -Z toward the child => +Z = joint - child
    y.copy(back).addScaledVector(z, -back.dot(z)).normalize();
    x.crossVectors(y, z);
    out[i].makeBasis(x, y, z).setPosition(p[i]);
  }
}
```

```ts
// iwer.ts: per-instance hijack of the emulator's hands. No iwer import: the plugin bundles its own
// copy, so private fields are reached through their symbol descriptions.
import { Matrix4, Quaternion, Vector3 } from '@iwsdk/core';

const sym = (o: object, d: string) => Object.getOwnPropertySymbols(o).find((s) => s.description === d)!;

export interface CamPose { ray: Matrix4; joints: Matrix4[]; grip: Matrix4; radii: number[]; pinch: boolean }

export function hijack(device: any, side: 'left' | 'right', read: () => CamPose | null, select: boolean) {
  const hand = device.hands[side];
  const src = hand.inputSource;
  const P_SPACE = sym(src.targetRaySpace, '@iwer/xr-space');
  const P_JOINT = sym(src.hand.get('wrist'), '@iwer/xr-joint-space');
  const spaces: any[] = [...src.hand.values()]; // XRHand insertion order = WebXR joint order
  const inv = new Matrix4(), local = new Matrix4(), pos = new Vector3(), quat = new Quaternion(), scl = new Vector3();
  const origUpdate = hand.updateHandPose.bind(hand);
  const origFrame = hand.onFrameStart.bind(hand);
  let pose: CamPose | null = null;

  // Runs after devui.render() copied its handle into hand.position, before joints are built.
  hand.onFrameStart = (frame: XRFrame) => {
    pose = read(); // filtered + resampled for "now", already in IWER global space
    if (pose) {
      pose.ray.decompose(pos, quat, scl);
      hand.position.set(pos.x, pos.y, pos.z);
      hand.quaternion.set(quat.x, quat.y, quat.z, quat.w);
      if (select) hand.updatePinchValue(pose.pinch ? 1 : 0);
    }
    origFrame(frame); // targetRaySpace <- position/quaternion, pinch applied, select events, updateHandPose()
  };
  // Joint spaces are children of targetRaySpace: write ray^-1 * jointWorld.
  hand.updateHandPose = () => {
    if (!pose) return origUpdate();
    inv.copy(pose.ray).invert();
    for (let i = 0; i < 25; i++) {
      spaces[i][P_SPACE].offsetMatrix.set(local.multiplyMatrices(inv, pose.joints[i]).elements);
      spaces[i][P_JOINT].radius = pose.radii[i];
    }
    src.gripSpace[P_SPACE].offsetMatrix.set(local.multiplyMatrices(inv, pose.grip).elements);
  };
}
```

Target ray: origin about 2 cm in front of the index MCP toward the thumb, direction from an
assumed shoulder (head + (±0.18, −0.25, 0) in head yaw frame) through the origin. This roughly
matches how the Quest system ray behaves, and it is what `hands.ts:131` (`readRay`) and the IWSDK
pointers use. Grip: middle metacarpal position with the wrist orientation.

### 7.4 Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Hijacking private IWER internals (symbol descriptions, `updateHandPose`, joint parenting) | breaks on an iwer upgrade | dev-only; check `require('iwer/package.json').version` at install time and refuse to run with a clear console message on a mismatch; all of it lives in `iwer.ts` |
| Motion blur at 30 fps loses the hand mid-slap | slaps missed | light, 60 fps phone, gap extrapolation |
| Depth noise (cm) | reach and ramp distance jitter; slaps fail with a top-down camera | placement from sec. 4.2, strong One Euro on the root |
| Pinch closes at 1.5-2.5 cm in MediaPipe | pinch flickers around `pinchOn` 2.0 cm | pinch calibration remap, shown in the HUD |
| Handedness flips | hands swap mid-gesture | sticky assignment, `X` key |
| Camera permission in Playwright-managed Chromium | no camera | open the dev URL in the system Chromium |
| Main-thread inference stealing frame time | jank in the emulator | Worker + ImageBitmap |
| Latency 80-150 ms | feel is not representative | use for logic and flow, not feel |
| Bundle leak into production | large wasm/model shipped | DEV-folded dynamic import, nothing in `public/`, grep `dist` |

### 7.5 What it can and cannot validate

**Can:** the full gesture state machines driven by real, unscripted human motion, including
timing windows (press/slap down → still, `farHold`, `wellAfterRamp`, `cupHold`), pinch
hysteresis behaviour, rip pull distance and speed mapping, two-handed coordination, whether
gestures are discoverable and comfortable on a desk-height surface, regressions via
record/replay, and reviewer demos without a headset.

**Cannot:** Quest hand-tracking quality, rate, latency or occlusion behaviour; real Quest pinch
distances (so `pinchOn`/`pinchOff` still need headset tuning); real table/plane detection and
the hand occluder fit in passthrough; absolute reach accuracy; arm fatigue in a headset.
Thresholds tuned against the camera bridge must not be copied into `TUNE` defaults without a
Quest pass.

## Sources

- IWER source: `node_modules/iwer/lib/**` (2.5.0), `node_modules/@iwer/devui/lib/**` (2.5.0), `node_modules/@iwsdk/vite-plugin-dev/dist/**` (1.0.1)
- WebXR Hand Input: https://www.w3.org/TR/webxr-hand-input-1/
- MediaPipe Hand Landmarker: https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker and https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker/web_js
- MediaPipe Hands (legacy docs on handedness and world-landmark origin): https://github.com/google/mediapipe/blob/master/docs/solutions/hands.md
- `@mediapipe/tasks-vision` 1.1.0: https://www.npmjs.com/package/@mediapipe/tasks-vision, https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.0/
- Model: https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
- One Euro filter: https://gery.casiez.net/1euro/
- scrcpy camera and v4l2: https://github.com/Genymobile/scrcpy/blob/master/doc/camera.md, https://github.com/Genymobile/scrcpy/blob/master/doc/v4l2.md
- Android as webcam: https://source.android.com/docs/core/camera/webcam
- desktop-xr-hands: https://github.com/diarmidmackenzie/aframe-components/tree/main/components/desktop-xr-hands
- handible: https://github.com/gust10/Handible ; beemsoft playground: https://github.com/beemsoft/webxr-handtracking-playground
