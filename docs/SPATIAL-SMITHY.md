# Spatial smithy implementation

Implemented Oct 15, 2026. This is the ordered IWSDK 1.0 pass that makes the room part of
SpinSmith instead of a background.

## 1. Real-surface placement

- A viewer-space environment raycast follows the player's view and finds real room geometry.
- During placement, a pinch can put the smithy on the horizontal surface being viewed.
- The original palm-on-table flow and timed floating-tray fallback remain available.
- Hits outside seated reach, outside desk height, or on steep surfaces are rejected.

## 2. Stable, persistent location

- The smithy root carries `XRAnchor`; IWSDK restores its persistent WebXR anchor when supported.
- SpinSmith also stores the smithy's anchor-local pose and restores it after a new immersive
  session. Moving the brass handle updates that saved pose.
- If anchors are unavailable, ordinary table placement remains the fallback.

## 3. Real-world depth occlusion

- `DepthSensingSystem` uses the GPU `float32` depth path.
- The physical arena and persistent table marks are `DepthOccludable`, so real hands and
  furniture can pass in front of them.
- Cards and guidance are deliberately excluded; noisy depth must not erase instructions.

## 4. Gaze + pinch

- A real `targetRayMode: "gaze"` input source supplies the aim ray when the browser exposes one;
  either hand supplies the pinch.
- Quest hand interaction is unchanged when gaze is unavailable. IWER uses the head ray as its
  development equivalent.

## 5. The room remembers fights

- A successful ultimate leaves one seal-specific mark just above the real table: Anvil cracks,
  Rush chevrons, Magnet rings, Tilt lanes, Hammer craters, or a Ward arc.
- The newest eight marks are saved locally and rebuilt on the next visit. Together with daily
  Smith Orders, champions and the forged top, the workshop now has a visible history.

## Emulator evidence

- TypeScript, deterministic simulation and production build pass.
- IWER granted hit-test, depth sensing, anchors, plane detection, mesh detection and hand tracking.
- ECS inspection found one environment-raycast target, two depth-occludable entities, 17 detected
  planes, 9 meshes and the anchored smithy root.
- A known horizontal room plane was acquired at `y=0.4545`; IWER's head-ray equivalent plus an
  emulated hand pinch placed the root at `y=0.5345` (the surface plus the 8 cm pedestal), entered
  the hub and saved the new pose.
- Exiting and re-entering immersive XR restored the saved smithy pose.
- A Magnet ultimate created a saved table mark; a full managed-browser relaunch rebuilt the same
  record.

## Physical-device gate

IWER proves system wiring, fallback behavior and persistence logic. It does **not** prove Quest
depth-edge quality, real-hand stability, anchor drift, passthrough contrast, or 60+ fps. Those
claims remain unverified until a Quest 3/3S run; submission copy and footage must say so.
