# Cinematic IWER capture

Run `npm run capture:cinematic` to restart the managed GPU-backed browser, enter IWER hand mode,
apply a repeatable seated camera, and save a clean 1920×1080 frame under
`artifacts/capture/`.

The capture setup mutes game audio only for that automated IWER session. It does not change the
player's saved comfort mode or disable sound in production.

The capture always labels itself as emulator footage. The bundled background is
**Comfy Cafe** by Sergej Majboroda from Poly Haven, licensed CC0:
https://polyhaven.com/a/comfy_cafe

This rig is for presentation and regression comparison. It is not evidence of
Quest performance, real passthrough, or physical-device hand tracking.

Run `npm run capture:heroes` for the two competition-facing gameplay frames. The first enters a
real simulated bout and holds the two-handed arena forge at maximum deformation; the second runs
the asserted palm-to-DESK-KO path before capture. Both remain explicitly labelled as IWER footage.
The setup restarts the managed browser with NVIDIA PRIME offload enabled; renderer identity can be
checked without guessing via `npx @iwsdk/cli browser run scripts/capture/gpu-info.mjs`.

Run `npm run capture:hands` for a reusable mechanics catalogue rather than a trailer. It records
fourteen separate hand-driven clips (launch, fingertip shaping, arena manipulation, return catch,
ultimates, workshop gestures, Forge Gust and Counterflow) and joins labelled copies into one
1080p60 reference reel under
`~/Desktop/spinsmith-videos/hand-mechanics/`. Every action goes through IWER's emulated hand
skeleton; the reel is explicitly labelled as emulator automation, not physical-headset footage.

To refresh only selected raw clips after a gameplay change, keep the existing output directory and
pass comma-separated clip numbers, for example:

```sh
HAND_ONLY=3,4,8 CAPTURE_USE_RUNNING=1 npm run capture:hands -- \
  "$HOME/Desktop/spinsmith-videos/hand-mechanics"
```

The script relabels and rejoins all fourteen files after replacing those captures. `HAND_START_AT`
is still available when every clip from a given number onward should be refreshed.

Run `npm run capture:room-gameplay` for two continuous room-backed gameplay takes and their joined
1080p60 file under `~/Desktop/spinsmith-videos/room-gameplay/`. The synthetic CC0 room and emulated
hands are disclosed in-frame; this is a presentation/regression view, not Quest footage.

`npm run report:runtime-performance` records the active renderer, five-second FPS floor, draw calls,
triangle count and supported recorder codecs. On this NVIDIA development machine the dev scripts
request the patched IWSDK Vulkan path; `postinstall` reapplies that small compatibility patch after
dependency installs and fails loudly if the upstream plugin layout changes.
