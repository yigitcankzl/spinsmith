# Passthrough plan: making the real room matter

Oct 7, 2026. Scope: what Quest Browser's WebXR and IWSDK 1.0.1 (the version in `node_modules`)
can do with the real room, which SpinSmith ideas need the room, and a package that fits before
the **Nov 6 feature freeze**. This is a plan only: no code or config was changed.

Why this doc exists: both reviews mark the game down because the room barely matters.
`COMPETITION-REVIEW.md` F2 and `VISION-REVIEW.md` §2.1 and §2.4 say the same things:

- the table only sets the arena height (`placement.ts` `pickTable`, plane centres only);
- the arena floats 8 cm above the wood (`PEDESTAL = 0.08`), so every touch is in mid-air;
- real hands are drawn *under* the virtual floor exactly when they pinch it;
- on the tray the game is the same game, and the judging text penalises "a scene that plays
  identically with passthrough off".

The test used below for every idea: **switch passthrough off (or play on the tray). Does the
player lose something they can see, feel or do?** If not, the idea does not answer the critique.

Plain-language terms used here:

- **XR session**: the immersive mode the browser enters; `immersive-ar` shows passthrough (the
  headset's camera view of the room) behind the app.
- **IWER**: IWSDK's browser XR emulator. With `"environment": "living_room"` it loads a captured
  room with planes, a mesh and (see below) synthetic depth.
- **ECS**: IWSDK's entity-component-system. Systems query entities that carry components such as
  `XRPlane`.
- **Plane / mesh / anchor / hit test / depth sensing**: the WebXR modules that report flat
  surfaces, room geometry, pinned poses, ray hits and per-pixel distance.

---

## 1. Capability matrix

Legend: **V** = verified (source in section 4, or read in `node_modules` here), **A** = assumption
to confirm on a headset.

### 1.1 WebXR on Quest Browser

| Feature | On Quest Browser | Status | Constraints and pitfalls |
|---|---|---|---|
| `immersive-ar` + passthrough | Yes. The app renders over passthrough; framebuffer alpha 0 shows the room, alpha 1 hides it [S1, S2] | **V** | IWSDK creates the renderer with `alpha: true` in AR mode (`world-initializer.js:246`, read here). Blend mode is `alpha-blend` (**A**, not seen on a Meta page). Treat `immersive-ar` as the only MR path. |
| Partially transparent black over passthrough (dimming the room) | Yes, it is Meta's own documented technique: "by playing with the transparency of a black background, applications can create the illusion that the environment is actually being lit and dimmed" [S3] | **V** (guidance) / **A** (exact compositing: premultiplied or straight alpha) | Cost: one translucent full-screen layer. Keep the room visible for safety. |
| Plane detection | Yes. `session.detectedPlanes`, each with a pose and a polygon; on Quest they are horizontal or vertical rectangles from **Space Setup**; `initiateRoomCapture()` can start Space Setup once per session; read planes 2-3 s after start [S1] | **V** | No Space Setup means no planes. Planes can arrive late (the existing 5 s wait and late-table snap handle this). Space Setup heights can be 1-2 cm off (VISION-REVIEW §A). |
| Semantic labels on planes (`table`, `desk`, `wall`, `floor`) | IWER implements `semanticLabel` and the game already filters on `table`/`desk` (`match-system.ts:973`); Meta and IWSDK docs list labels for scene objects [S4, S5] | **A** for Quest Browser (no primary page says `XRPlane.semanticLabel` per label) | Always have an unlabelled fallback: a horizontal plane at table height is a table. |
| Mesh detection | IWSDK `XRMesh` gives bounded meshes (furniture, with label and box) and a `global mesh` (room) [S4]. Chrome's version is behind a flag [S6] | **V** in IWSDK and IWER; **A** for what Quest Browser returns and how often it updates | Comes from the Space Setup scan, so it is **static**: a mug placed after the scan is not in it. Coarse. |
| Hit test | Yes. Since Horizon Browser 40.4 it uses the **Depth API** instead of the scene mesh, on Quest 3/3S, range about 5 m, and needs no Space Setup [S7] | **V** (news article) | Ray-based. Quest 2/Pro behaviour differs (scene mesh, needs Space Setup) **A**. |
| Anchors | `createAnchor`; persistent handles via `requestPersistentHandle` / `restorePersistentAnchor`, max 8 per site, not in private mode [S1] | **V** | Only matters for drift or re-entry; a seated session re-places on `reset` already. |
| Depth sensing | Quest 3 and 3S only (two-camera disparity, about 5 m range); not on Quest 2 or Pro [S7, S8]. IWSDK supports GPU and CPU paths, three occlusion modes [S9] | **V** for hardware; **A** for the first browser version and the per-frame cost in the browser | Low resolution and noisy at edges. Hands in the depth map lag a little. See 1.3 for the IWSDK shader's 5 cm fade band, which is the real blocker here. |
| Hand tracking | 25 joints per hand, `getJointPose` and `fillPoses`; palm pinch is reserved for the system menu [S10] | **V** | No reliable joint velocity in Quest Browser (`linearVelocity` is often null; compute it by differencing) **A**. Update rate not documented (assume 60-90 Hz, with prediction). Native "Fast Motion Mode" is not in WebXR (VISION-REVIEW §A). `XRJointPose.radius` exists in the spec and IWER. |
| Raw camera (`camera-access`) in WebXR | **No** for `immersive-ar` on Quest Browser; requests are rejected [S11] | **V** (forum report, up to Horizon OS v85) | No passthrough pixels in the XR session, so no colour sampling, no computer vision on the room. |
| Passthrough cameras via `getUserMedia` | Exposed to ordinary pages from Quest Browser 38.2 / 40.1 behind an experimental flag and a camera permission [S12]; native Passthrough Camera API since Horizon OS v76 [S13] | **V** (forum, not official) | Behind a flag, so judges will not have it. No per-frame pose or per-eye reprojection. **Not usable for the submission.** |
| Light estimation | Not supported [S1 (old page), no contrary evidence] | **A** (very likely) | Use fixed, authored lighting. |
| IWER emulator, `living_room` | Synthetic room from `@iwer/sem`: planes with labels (the game logs `arena on table` there, `ACTION-PLAN.md` WP4), meshes, and an emulated `depth-sensing` path (`depthDataMap`, GPU path in the injected bundle, read here) | **V** for planes; **A** for depth contents | Emulated hand moves are teleports, so any speed-based gesture cannot be checked there (`ACTION-PLAN.md` WP8). |

### 1.2 How IWSDK exposes each one (read from `node_modules/@iwsdk/core` 1.0.1, verified)

| Feature | IWSDK access | Config | Notes and pitfalls found in the source |
|---|---|---|---|
| Planes | `SceneUnderstandingSystem` makes one entity per `XRPlane` with component `XRPlane { _plane }`; `entity.object3D` is a `Mesh` at the plane pose | `world.features.sceneUnderstanding: true` + `world.xr.features.planeDetection: true` (both already on) | The drawn geometry is a **`BoxGeometry` of the polygon's bounding box, centred on the plane origin** (`createPlaneGeometry`), not the polygon. For edges use `_plane.polygon` (plane-local x/z points) with the entity's world pose. Entities are destroyed when a plane disappears, so never cache entity references. `showWireFrame` makes them visible for debugging. |
| Meshes | Entity per `XRMesh` with `XRMesh { _mesh, isBounded3D, semanticLabel, min, max, dimensions }` | `meshDetection: true` (on) | `'global mesh'` gets `isBounded3D: false` and empty bounds; bounded meshes carry a label and an axis-aligned box. Mesh geometry is rebuilt on topology change. |
| Anchors | `XRAnchor` component: the system makes **one** native anchor and parents every anchored object to a shared `anchoredGroup`; it restores a persistent anchor UUID from `localStorage` | `anchors: true` (on) | Re-parents the object, so code that writes `root.position` in world coordinates (all of `match-system.ts` placement) would need to change. Not needed for a seated session; skip. |
| Hit test / environment raycast | `EnvironmentRaycastSystem` + `EnvironmentRaycastTarget { space: 'left'\|'right'\|'viewer'\|'screen', maxDistance }`; the entity is moved to the hit and hidden on a miss; `xrHitTestResult` holds the raw result | `world.features.environmentRaycast: true` + `hitTest: true` (on) | Ray-based only (controller/hand target ray or gaze). SpinSmith does not need it: the fingertip *is* the probe on a table. |
| Depth sensing and occlusion | `DepthSensingSystem` (register once) + `DepthOccludable { mode: 'SoftOcclusion' \| 'HardOcclusion' \| 'MinMaxSoftOcclusion' }` | `world.xr.features.depthSensing: { required, usage: 'gpu-optimized' \| 'cpu-optimized', format: 'float32' \| 'luminance-alpha' }` (**not set today**) | See 1.3: the shader fades any virtual fragment that is within **5 cm** in front of a real surface, and it switches every material of the entity to `transparent = true` at the moment the entity qualifies. |
| Hands | No IWSDK abstraction used: `hands.ts` reads raw `XRHand` joints with `frame.getJointPose` | `handTracking: true` (on) | `XRJointPose.radius` is available (IWER implements it too) and is what a hand occluder needs. IWER's `XRJointPose` also carries optional linear/angular velocity. |

### 1.3 Depth occlusion in IWSDK, in detail (verified in `depth-sensing-system.js`)

- Occlusion is injected with `onBeforeCompile` into every `Mesh` under the entity's `object3D`
  **when the entity qualifies**. Children added later (tops created per round, debris) are not
  patched. Every patched material becomes `transparent = true`, which changes sort order and
  disables early depth rejection; materials shared with non-occluded objects are patched too.
- The patch keys on `uniform vec3 diffuse;` and `vec4 diffuseColor = vec4( diffuse, opacity );`,
  so it works with the project's `MeshBasicMaterial` and `MeshMatcapMaterial` (no
  `ShaderMaterial` exists in `src/`). It does nothing for `ShadowMaterial` or custom shaders.
- The test is `smoothstep(0.0, 0.05, realDepth - virtualDepth)`: a virtual fragment less than
  5 cm in front of the real surface behind it is partly transparent, and discarded below 1%.
  **Anything resting on or just above the real table fades at its base**: tops on the table,
  hub props at `TABLE_Y`, and an arena floor lowered to near the wood. There is no bias uniform.
- Soft mode takes 13 depth samples per fragment; hard mode one; MinMax adds a full-screen
  preprocessing pass per eye.
- SpinSmith builds the whole arena under **one** entity (`match-system.ts:356`
  `createTransformEntity(this.root)`), so `DepthOccludable` on it would also hit panels, bars,
  blob shadows and every prop. Tops would need their own entities.

Consequence: IWSDK's depth occlusion is a poor fit for objects that sit on the table, which is
everything in this game. A **hand occluder** built from joint poses (section 2, idea 2) gives the
one occlusion that matters (fingers over the arena) on every Quest, sharply, for two draw calls,
and it can be checked in IWER.

---

## 2. Ideas that only work with the real room

Ranked by **judge impact per day** (impact 1-10 for the "take it away" test, the video and the
award texts, divided by days; risk-adjusted). Sizes are developer days including emulator
checks, not device tuning unless stated.

| # | Idea | Impact | Days | Score | Needs a headset to finish? |
|---|---|---|---|---|---|
| 1 | Hand occluder: real fingers drawn over the arena | 8 | 0.75 | **10.7** | Edge look only |
| 2 | The room dims, the arena lights your desk (plus forge glow on the wood) | 6 | 0.6 | **10.0** | Strength only |
| 3 | Off the edge: the real table's polygon is a hazard; tops and parts fall onto the real floor and hide behind the real table | 8 | 1.25 | **6.4** | Polygon accuracy |
| 4 | Press to forge: place and calibrate the arena by touching the real table | 8 | 1.5 | **5.3** | Thresholds |
| 5 | The floor is near the wood: a low pedestal, the table is the stop for a well press | 7 | 0.5 + device | 4.7 (adj. 2.5) | **Yes** |
| 6 | Anvil Strike: slam the table mid-fight | 8 | 2 + device | 4.0 (adj. 2.0) | **Yes** |
| 7 | Rival gate on the real wall | 4 | 1 | 4.0 | No |
| 8 | Shadow catcher on the real table | 3 | 1 | 3.0 | Cost only |
| 9 | IWSDK depth occlusion (`DepthOccludable`) | 5 | 1 + device | 2.5 (adj. 1.5) | **Yes** |
| 10 | Real-object obstacles from mesh detection | 3 | 2 | 1.5 | Yes |
| 11 | Passthrough-tinted lighting (light estimation / camera colour) | - | - | **Not possible** | - |
| 12 | XRAnchor for the arena | 1 | 0.5 | 2.0 | Yes (only if drift) |

### Idea 1. Hand occluder: real fingers drawn over the arena

- **What the player sees and does.** When a hand reaches over the arena, the real hand (in
  passthrough) stays in front of the floor, the tops and the forge parts. Pinching a ramp, the
  fingertips are visibly *on* the clay. A finger pushed below the floor surface disappears into
  it, which is correct.
- **Technique.** A depth-only hand silhouette built from the tracked joints. Two
  `InstancedMesh`es (spheres at the 25 joints, capsules or cylinders along the ~24 bones, per
  hand), `MeshBasicMaterial({ colorWrite: false })`, `depthWrite: true`, `renderOrder: -10`.
  Each frame set the instance matrices from `frame.getJointPose(joint, ref)` (or `fillPoses` +
  `fillJointRadii`), scaled by the joint's `radius` times a knob (start 0.95). Where the occluder
  wins the depth test, nothing virtual is drawn and the framebuffer alpha stays 0, so passthrough
  (the real hand) shows. This is the standard "hand mesh as depth mask" trick; it needs **no depth
  sensing**, so it works on Quest 2, 3, 3S and Pro.
- **Why not IWSDK's `DepthOccludable`.** See 1.3: its 5 cm fade band eats everything that sits on
  the table, it patches every material under the single arena entity, and it needs a Quest 3/3S.
- **Emulator vs headset.** Fully buildable in IWER: emulated hands carry joints and radii. Check
  that the room background shows through the hand's silhouette over the dock and over a top.
  The headset is needed only to judge the edge (joint capsules are a few millimetres off the
  real outline, and the tracked hand lags slightly on fast moves).
- **Size.** 0.75 day.
- **Performance and comfort.** Two draw calls, about 100 instances, no fill cost beyond the hand
  area (it actually saves fill). Risk: a visible "halo" of virtual floor around fingers if the
  radii are too small, or a "cut-out" of virtual content beside the fingers if too large.
- **Fallback.** Controllers or no joints: the occluder hides (count 0). Nothing else changes.

### Idea 2. The room dims, the arena lights your desk

- **What the player sees and does.** In the hub the room is at normal brightness. When the
  rip lands, the room around the desk dims to about 55% while a soft pool of light stays on the
  real wood around the arena, as if the arena were a lamp. Hard clashes flash the room warm for
  80 ms. At the forge the pool turns orange and a glow spreads on the desk around the anvil. A
  ring-out ("THROWN") brings the lights back up. With passthrough off this effect has nothing to
  act on, so it is purposeful passthrough by definition.
- **Technique.** Meta's documented "transparency of a black background" lighting [S3]:
  - One inverted sphere (radius about 2.5 m) centred on the head, black, `transparent: true`,
    `depthWrite: false`, `depthTest: true`, so virtual objects in front of it are untouched and
    only the room (alpha 0 pixels) is dimmed.
  - Its alpha comes from a small `onBeforeCompile` patch on `MeshBasicMaterial`: intersect the
    eye ray with the table plane (`y = tableY`), take the distance of the hit from the arena
    centre, `alpha = dim * smoothstep(0.35, 0.8, d)`; rays above the horizon get the full `dim`.
    A tiny RGB value (premultiplied) adds the warm tint.
  - Forge glow: one additive radial quad at `TABLE_Y` under the anvil and one ring around the
    pedestal base, intensity from the forge heat (reuse `SOFT_SHADOW`-style canvas texture).
- **Emulator vs headset.** IWER draws the `living_room` behind the canvas, so the dimming and the
  pool show in a runtime screenshot (**A**: confirm on the first screenshot). On the headset,
  check the strength and whether Quest composites premultiplied alpha (the tint looks right) or
  straight alpha (the tint is weaker; the dim still works).
- **Size.** 0.6 day.
- **Performance and comfort.** One translucent full-screen pass, a few ALU ops: well under 0.5 ms
  on Quest 3 (**A**; measure in T1). Never dim below 50%, ease over 0.6 s, keep full brightness
  in menus and when the head turns away from the arena (alpha already rises off the pool only on
  the table, so add `dim *= smoothstep(...)` on the angle to the arena). Seated play keeps
  safety risk low, but a dark room plus a dim layer can hide obstacles: cap it lower in the
  fight (0.4) if testers report it.
- **Fallback.** No table plane: use the arena root's table height (pedestal base) as `tableY`;
  tray: the pool sits under the tray.

### Idea 3. Off the edge: the real table is a hazard

- **What the player sees and does.** A top thrown over the rim on the side nearest the table's
  edge flies off the real desk, drops past the edge and clatters on the real floor beside the
  chair; one that drops behind the desk is hidden by the real table edge as it falls. Burst
  parts that skid off the edge do the same. The card reads "THROWN off the desk". The arena is
  also nudged inwards so its rim stays on the wood instead of hanging over the edge.
- **Technique.**
  - Table polygon: `XRPlane._plane.polygon` (plane-local x/z) transformed by the plane entity's
    world matrix. Do **not** use the IWSDK plane mesh's geometry (it is a bounding box centred on
    the plane origin).
  - Floor height: the lowest horizontal plane labelled `floor`, else `y = 0` of the
    `local-floor` reference space (IWSDK's default, `init/xr.js`).
  - `TopView.updateOut` and `updateBurst` (`visuals.ts:656`, `:706`): the landing floor becomes
    `arena.inside ? arena.height : onTable(x, z) ? TABLE_LEVEL : FLOOR_LEVEL`. Lift the
    `THROW_REACH` clamp (`visuals.ts:480`) when the path leaves the table polygon; one bounce at
    restitution 0.3, skid, topple, then the existing fade.
  - Table occluder: a depth-only `ShapeGeometry` of the polygon, 2 mm below the surface, plus a
    5 cm skirt down its edges, `colorWrite: false`, `renderOrder: -10`. It hides anything below
    the real table top (a falling top, the forge stage sinking `FORGE_SINK`, debris that falls
    "through"), exactly like the real table would.
  - Placement fit: a pure `fitToTable(center, polygon, rimRadius)` in `placement.ts` that moves
    the arena centre up to 15 cm towards the polygon centroid so the rim stays 3 cm inside.
- **Emulator vs headset.** The `living_room` table plane exists, so all of it can be built and
  checked in IWER with the dev shatter key `K` and a ring-out placed near the edge (move the arena
  with the brass handle). The headset is needed to see whether Space Setup polygons match real
  desk edges within 2-3 cm in two rooms.
- **Size.** 1.25 days.
- **Performance and comfort.** Two extra cheap draw calls. A top falling to the floor makes the
  player look down: keep the fall short in time (0.4 s), show it, but do not require it.
- **Fallback.** No polygon (tray or touch-placed without a plane): today's behaviour (land on the
  disc at `TABLE_LEVEL`, clamp at `THROW_REACH`). No floor plane and no `local-floor`: clamp as
  today.

### Idea 4. Press to forge: place and calibrate by touching the real table

- **What the player sees and does.** After Enter, a molten handprint glows on the desk at the
  comfortable spot `placeArena` already computes, with the cue "Press your table". The player
  lays a palm (or slaps) on the wood. The arena forges up out of the table where the hand was:
  sparks, the rim rising over 0.8 s, a boom. This is `VISION-REVIEW.md` idea A, but with a
  **press** as the guaranteed path and the slap as a bonus, so detection is not the risk.
- **Technique.**
  - Pure detector `src/game/table-touch.ts`, fed each frame with the lowest of the index tip,
    middle tip and palm joints (`hands.ts` already reads joints; add the palm/middle tip):
    - **press**: the hand comes down (smoothed downward speed above 0.15 m/s at some point in the
      last 0.5 s), then holds still (speed below 0.04 m/s) for 0.25 s, palm roughly down;
    - **slap**: downward speed of at least 0.8 m/s that drops to near zero within 60 ms, or
      tracking lost mid-swing and the hand reappears within 150 ms at the same height;
    - with a table plane, accept only within ±4 cm of it (a mid-air hold is rejected); without
      one, accept within `TABLE_MIN_H..TABLE_MAX_H` and at least 25 cm below the eyes.
  - Contact height = lowest joint `y` minus its `radius`. This is the true surface, better than
    the 1-2 cm error of Space Setup heights, and it also works **with no Space Setup at all**.
  - `placement.ts`: `placeAtTouch(head, touch, tableY)` keeps the comfortable reach and moves the
    arena centre up to 15 cm towards the touch.
- **Is a slap detectable from hand tracking alone?** Partly. A press is reliable (slow, still,
  on a surface). A fast slap is where hand tracking blurs and loses the hand; WebXR has no Fast
  Motion Mode and no trustworthy joint velocity, so velocity comes from frame differences of
  predicted poses. Expect most medium slaps to be caught by "fast, then stopped at the plane"
  plus the lost-and-reappeared rule, and some hard ones missed. That is why the press is the
  contract and the slap only changes the sound and sparks. (A microphone onset detector would
  make slaps near-certain, but it needs a permission prompt before Enter; not recommended.)
- **Emulator vs headset.** IWER hand moves are teleports, so the speed paths cannot be shown
  there. The press path can: put the emulated hand at the `living_room` table height and hold.
  Unit tests in `scripts/sim-check.ts` on synthetic traces cover press, slap, lost-mid-swing,
  resting hands, slow drift and a mid-air hold. Thresholds need the headset.
- **Size.** 1.5 days (detector and tests 0.5, placing flow 0.5, forge-up animation and sound
  0.5), then 0.5 day of device tuning.
- **Performance and comfort.** Negligible cost. Comfort: a press is gentle; never require a
  slap. Accessibility: the pinch fallback below.
- **Fallback.** After 8 s without a touch, place as today (`SETTLE_MAX` logic: table plane or
  tray). A pinch on the handprint places immediately. Controllers: the trigger on the handprint.
  The brass handle still moves the arena later.

### Idea 5. The floor is near the wood (low pedestal)

- **What the player sees and does.** The arena's pedestal drops from 8 cm to about 3.5 cm, so the
  bowl's centre floor is about 1 cm above the real table. Pressing a well, the finger meets the
  wood right as the well registers: the table becomes the physical stop of the press.
- **Technique.** `PEDESTAL` in `placement.ts` (it feeds `TABLE_Y` in `reach.ts`, so hub props,
  `TABLE_LEVEL` and `ArenaView(PEDESTAL / ARENA_SCALE)` follow). Keep the Clockwork Spire's deep
  bowl on a taller pedestal (per-arena `max(PEDESTAL, depth * ARENA_SCALE + 1 cm)`). Make it a dev
  knob first (`?pedestal=` in `tuning.ts`; pass the value in rather than importing `tuning.ts`
  from `reach.ts`, which would create an import cycle). It needs idea 4's calibrated height,
  because a 2 cm Space Setup error is bigger than the gap.
- **Emulator vs headset.** Geometry and `sim-check` §16 reach checks run headless; the *feel*
  (does the wood help or block the press?) needs the headset. VISION-REVIEW §H calls this a
  spike; that stays true.
- **Size.** 0.5 day plus a device session (T5/T6). **Fallback.** Keep 0.08 on the tray and when
  the touch calibration did not run.

### Idea 6. Anvil Strike (mid-fight slam)

VISION-REVIEW §B as written: a charged palm strike on the table jolts both tops. Strongest
"Boldest Original" verb, but it needs the slap detector tuned on a headset, a sim change and a
balance report row, and it is on the action plan's do-not-do list. **Do it only if idea 4's slap
path hits at least 17 of 20 on the device by Nov 1**; otherwise leave it out.

### Idea 7. Rival gate on the real wall

The rival's entrance (a forge door with glowing seams and its banner) appears on the nearest
wall plane in front of the player, and the rival's top drops from it onto the arena's far rim
at the start of a match. Technique: the first vertical plane labelled `wall` within 3 m in the
look direction, a quad plus the existing cards, oriented by the plane pose. IWER `living_room`
has walls, so it is fully emulator-buildable. 1 day. Fallback: the gate stands on the far rim as
today. Good for the video, weak on the "take it away" test (it is decoration), so it ranks below
the package.

### Idea 8. Shadow catcher on the real table

A `ShadowMaterial` plane on the table polygon plus one directional light with a 512-1024 map, so
tops and the arena cast real-looking shadows on the wood (Cubism grounds by shadow;
`VISUAL-POLISH.md`). The blob shadows and AO ring already give most of the grounding
(VISUAL-POLISH: "~80% of the effect"), shadow maps are on the do-not-do list, and the cost is a
shadow pass on Quest. 1 day. Revisit after the freeze only if T1 shows headroom.

### Idea 9. IWSDK depth occlusion (`DepthOccludable`)

Occludes everything real (arms, sleeves, a mug, another person) on Quest 3/3S. In this game it
fails on its own terms: the shader's 5 cm fade (section 1.3) makes tops, props and a low arena
floor semi-transparent near the wood; it patches the whole single arena entity; and there is no
bias to tune without forking the shader. If tried, put `HardOcclusion` only on separate entities
for the tops while they are in the arena, keep the 8 cm pedestal, and keep it only under the
Q2 rule (≤ 1.5 ms). The hand occluder (idea 1) delivers the visible part of this for less.

### Idea 10. Real-object obstacles from mesh detection

Bounded meshes come from the Space Setup scan, so they are static and coarse; a mug put on the
desk after the scan does not exist for the game. Real-time depth on the CPU is too costly in the
browser. Skip.

### Idea 11. Passthrough-tinted lighting

There is no light estimation and no camera access in a WebXR session on Quest Browser
(section 1.1), so the game cannot read the room's colour or brightness. The documented substitute
is the reverse direction: let the game *light the room* (idea 2).

### Idea 12. Anchors

IWSDK's `XRAnchor` re-parents the object under a shared anchored group, which would break the
world-space placement code in `match-system.ts`. A seated game already re-places on `reset` and
can be moved with the handle. Keep it on the do-not-do list unless drift is seen on the device.

---

## 3. Recommended package

**Pick: ideas 1, 3, 4 and 2, in that build order. About 4.1 days**, all buildable and checkable in
IWER now, with thresholds and looks tuned on the headset later. Together they change the answer
to "does it play identically with passthrough off?":

| With the real room | On the tray / passthrough off |
|---|---|
| You press your real desk and the arena forges out of it at the true wood height | A handprint you pinch on a tray |
| Your real fingers sit on the clay when you shape it | Fingers vanish under the floor |
| Thrown tops fly off your real desk, hit your floor, hide behind your table edge | They stop on a virtual disc |
| The fight dims your room and lights your desk | Nothing to dim |

Why these four: each is independent (any one can be cut without breaking the others), none
touches the simulation or the balance reports, each has a fallback that is today's behaviour,
and together they give the video its first 15 seconds (press → forge-up → room dims → ring-out
off the desk). Deliberately left out: Anvil Strike (needs headset tuning and a balance change),
the low pedestal (needs the headset), and `DepthOccludable` (wrong fit, section 1.3).

**Do-not-do list.** `ACTION-PLAN.md` §5 lists "a table-slam gesture, mesh-based physics or new
gestures". This package adds a *press* for placement only, with a pinch fallback that can never
block entry, and no physics engine (the table edge and floor are two heights and a polygon test
in the existing hand-written fall code). Record that amendment in §5 when the work starts.

### Schedule (before the Fri Nov 6 feature freeze)

| Dates | Work |
|---|---|
| Oct 8-9 | Step A, hand occluder |
| Oct 12-14 | Step B, the room model, table edge, floor and table occluder |
| Oct 15-19 | Step C, press to forge |
| Oct 20 | Step D, room dim and desk glow |
| Device arrival (week 3-4) | Device checks below, inside the Q0/Q1 protocol days; tune knobs only |
| Nov 6 | Freeze. Anything failing its device check is switched off by its knob, not debugged |

### Step A. Hand occluder (0.75 day)

1. New `src/game/hand-occluder.ts`: class `HandOccluder` with two `InstancedMesh`es (joint
   spheres: `SphereGeometry(1, 8, 6)`; bones: `CylinderGeometry(1, 1, 1, 6)`), shared
   `MeshBasicMaterial({ colorWrite: false })`, `renderOrder = -10`, `frustumCulled = false`.
   Preallocate the joint-name list, a `Float32Array(25 * 16)` and `Float32Array(25)` per hand
   for `fillPoses`/`fillJointRadii` (fall back to `getJointPose` when `fillPoses` is missing);
   no allocation in `update`.
2. `update(frame, ref, session, player)`: for each `inputSource.hand`, write sphere matrices
   (position, scale = radius × `TUNE.occluderScale`) and bone matrices (midpoint, length,
   radius = the smaller joint radius), premultiplied by `player.matrixWorld` as `hands.ts`
   does. Set `mesh.count = 0` for an untracked hand.
3. `match-system.ts`: create it in `init` next to `this.hands`, register both meshes with
   `world.createTransformEntity(...)`, and call `this.handOccluder.update(frame, ref, session,
   this.player)` right after `this.hands.update(...)` (line ~463). Keep UI panels and the gaze
   crosshair drawn with `depthTest: false` so the occluder never hides them.
4. `tuning.ts`: `occluderScale: knob('occluderScale', 0.95)`, and `occluder: knob('occluder', 1)`
   to switch it off.
- **Emulator acceptance (now):** `npm run typecheck`; enter XR in `living_room`; with the dev
  hand helper put the right hand between the eyes and the docked top: `browser screenshot`
  shows the room through the hand's silhouette over the top and the dock; draw calls rise by
  at most 2; `browser logs` clean.
- **Device acceptance (later):** pinch a ramp and press a well: fingertips are in front of the
  floor, no visible halo wider than about 5 mm; T1 frame time changes by less than 0.3 ms.

### Step B. Off the edge (1.25 days)

1. New pure module `src/game/room.ts` (no three.js, testable): `TableShape { y, poly: {x, z}[] }`,
   `insidePoly(poly, x, z)`, `edgeDistance`, and `fitToTable(center, poly, rim)` (move up to
   0.15 m towards the centroid so the rim stays 0.03 m inside).
2. `match-system.ts`: next to `tables()` (`:969`) add `tableShape(): TableShape | null` that
   reads the chosen plane's `_plane.polygon` and transforms it with `e.object3D.matrixWorld`
   (reuse a scratch `Vector3`), and `floorY()` (lowest horizontal `floor` plane, else 0 for
   `local-floor`). In `placeRoot` (`:938`) apply `fitToTable`. After every placement or move,
   convert the polygon and floor to arena-local (`this.root.worldToLocal`) and hand them to the
   views (`TopView.setRoom(polyLocal, floorLocal)`, also for debris).
3. `visuals.ts`: in `updateOut` (`:656`) and `updateBurst` (`:706`) replace the single
   `TABLE_LEVEL` with `surfaceAt(x, z)` = arena / table / floor; drop the `THROW_REACH` clamp
   (`:480`, `:681-686`) once the path is outside the polygon; one bounce (0.3), skid, topple.
   Add `playClatter()` in `audio.ts` for the floor hit. Result card text "THROWN off the desk"
   when the top lands on the floor (`match-system.ts` result text, display only).
4. Table occluder: in `match-system.ts` (or `room-view.ts`), a `ShapeGeometry` from the
   polygon plus a 5 cm edge skirt, depth-only material as in step A, 2 mm below the surface;
   rebuilt when the plane's `lastChangedTime` changes; hidden on the tray.
5. `scripts/sim-check.ts` §17: `insidePoly`, `fitToTable` (small table, table edge near the
   player, polygon that cannot fit: no move beyond 0.15 m).
- **Emulator acceptance:** `npm run check:sim` passes §17; in `living_room`, log
  `[MATCH] table polygon n=4 ... floor y=...`; move the arena with the brass handle so the rim is
  near the table edge, force a ring-out (or `K` for a shatter): the screenshot shows the top on
  the floor beside the table, and a top that falls behind the table edge is hidden by it. Draw
  calls in the result phase +2 at most.
- **Device acceptance:** in two rooms, the occluder's edge lies within about 3 cm of the real
  desk edge (temporarily tint it with a `?roomDebug` knob); a ring-out off the edge lands where
  the real floor is.

### Step C. Press to forge (1.5 days, then 0.5 day device tuning)

1. New pure `src/game/table-touch.ts`: `TableTouch.update(sample, dt, planeY | null)` returning
   `{ kind: 'press' | 'slap', x, y, z } | null`, with constants for the thresholds in section 2
   idea 4 (all exposed as `TUNE` knobs).
2. `hands.ts`: also read `middle-finger-tip` and the palm joint (`middle-finger-metacarpal`) and
   expose `low: Vector3` (lowest joint minus its radius) and `palmDown: boolean`.
3. `placement.ts`: `placeAtTouch(head, fwdX, fwdZ, touch, tableY, reach)` that keeps the
   comfortable reach and shifts the centre at most 0.15 m towards the touch; feed it to
   `fitToTable` from step B when a polygon exists.
4. `match-system.ts` `placing` phase (`:483`): after `SETTLE_MIN`, show a handprint decal (an
   emissive quad) at `placeArena`'s spot, on the table plane or at a guessed desk height; run
   `TableTouch` on both hands; on a touch, `this.root.position.y = touch.y + PEDESTAL`,
   `this.onTable = true`, keep `touch.y` as the calibrated table height (used by step B's
   occluder and step D's pool), log `[MATCH] forged by press at y=...`, then `place()`. Raise
   `SETTLE_MAX` to 8 s for the touch path; pinch on the handprint places at once.
5. `visuals.ts` `ArenaView`: `forgeUp(t)` (rim and pedestal scale from 0 to 1 in y over 0.8 s,
   one instanced spark burst). `audio.ts`: `playForgeUp(strong)` (louder for a slap).
6. On `reset` or a new session, go back to `placing` with the handprint (today it re-places
   silently).
7. `scripts/sim-check.ts` §18: synthetic traces: press detected; slap detected; lost-mid-swing
   slap detected; hand resting on the table from the start not detected until it lifts and
   presses; slow drift not detected; mid-air hold 15 cm above a known plane not detected.
- **Emulator acceptance:** `check:sim` §18 passes; in `living_room`, Enter XR, the handprint
  shows on the table; put the emulated hand on the table height and hold 0.3 s: the arena forges
  up there and the log shows the height within 1 cm of the plane; with no hand input for 8 s it
  places as before; pinch on the handprint places at once.
- **Device acceptance:** 20 presses ≥ 19 detected; 20 slaps ≥ 14 detected (else the slap only
  stays as a bonus, no change); 0 placements in 10 s of looking around with hands in the lap;
  the dock's base looks flush with the wood (height error ≤ 1 cm).

### Step D. The room dims, the desk is lit (0.6 day)

1. New `src/game/room-light.ts`: an inverted `SphereGeometry(2.5, 24, 12)` with
   `MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, side: BackSide })`
   patched in `onBeforeCompile` with uniforms `uDim`, `uTint`, `uTableY`, `uCenter`, `uRadius`
   (pool alpha as in idea 2). It follows the head position each frame (no rotation needed).
2. `match-system.ts`: a target dim per phase (hub 0.1, ready 0.25, fight 0.45, result 0.25,
   forge 0.35 with a warm tint), eased over 0.6 s; a heavy clash briefly lowers the dim and adds
   tint for 80 ms (hook where clash audio plays). Pool centre = arena root, `uTableY` = the
   calibrated table height or the plane.
3. Forge glow: an additive radial quad at `TABLE_Y` under the anvil (`hub.ts` anvil, `:370`),
   intensity from the forge heat; one ring at the pedestal base during the fight.
4. `tuning.ts`: `dim: knob('dim', 1)` as a multiplier (0 switches it off).
- **Emulator acceptance:** screenshots of hub and fight from the seated pose: the room is visibly
  darker in the fight and a light pool sits on the table around the arena; the arena itself is
  not darkened; FPS in IWER unchanged within noise.
- **Device acceptance:** T1 cost under 0.5 ms; three testers rate the dim "comfortable"; the
  tint reads warm (if not, Quest composites straight alpha: raise the tint).

### Overall acceptance for the package

- `npm run typecheck`, `npm run check:sim` (§13-18) and `npm run build` pass.
- One IWER run in `living_room` from Enter to the first ring-out shows, in order: handprint →
  press → forge-up → hub → fight (room dims) → a ring-out landing beside the table, with
  screenshots saved to `docs/review/`.
- On the headset: the T1 frame budget still holds (72 Hz, never below 60) with all four on; each
  item that fails its device check is switched off by its knob default before Nov 6.
- The video storyboard opens on: a real palm on a real desk, the arena forging up, fingers on the
  clay, a top flying off the desk.

---

## 4. Sources

Web sources (fetched or found Oct 7, 2026). Note: Meta's WebXR mixed-reality page [S1] is
2023-era; it still says mesh, depth and hit test are unsupported, which newer sources contradict.

- [S1] Meta, WebXR mixed reality (planes, anchors, `initiateRoomCapture`, persistent anchor
  limits): https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/
- [S2] three.js / WebXR alpha-blend behaviour as summarised from S1 and the anchors sample:
  https://cabanier.github.io/webxr-samples-1/anchors.html
- [S3] Meta, Passthrough design guidance ("transparency of a black background ... lit and
  dimmed"; scene understanding lets objects interact with tables and walls):
  https://developers.meta.com/horizon/resources/mr-design-passthrough/
- [S4] Meta, IWSDK scene understanding guide (`XRPlane`, `XRMesh`, `XRAnchor`,
  `SceneUnderstandingSystem`): https://developers.meta.com/horizon/documentation/web/iwsdk-guide-scene-understanding/
  and https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/
- [S5] Semantic labels registry used by IWER: https://github.com/immersive-web/semantic-labels
- [S6] Chrome mesh detection (experimental flag), xrblocks README:
  https://cdn.jsdelivr.net/npm/xrblocks@0.18.0/src/world/mesh/README.md
- [S7] UploadVR, Quest Browser 40.4 hit test uses the Depth API, Quest 3/3S, about 5 m:
  https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/
- [S8] UploadVR, Quest 3 Depth API and dynamic occlusion:
  https://uploadvr.com/quest-3-depth-api-mixed-reality-dynamic-occlusion
- [S9] Meta, IWSDK depth sensing / occlusion guides (modes, transparency, timing, custom
  shaders): https://developers.meta.com/horizon/documentation/web/iwsdk-guide-depth-sensing/
  and https://developers.meta.com/horizon/documentation/iwsdk/guides/15-depth-occlusion/
- [S10] Meta, WebXR hands (25 joints, `fillPoses`, palm pinch reserved):
  https://developers.meta.com/horizon/documentation/web/webxr-hands/
- [S11] Meta community forum, WebXR `camera-access` not supported in Quest Browser:
  https://communityforums.atmeta.com/discussions/Questions_Discussions/request-webxr-raw-camera-access-camera-access-feature-in-quest-browser/1367463
- [S12] Babylon.js forum, passthrough cameras through `getUserMedia` in Quest Browser behind a
  flag: https://forum.babylonjs.com/t/webxr-camera-passthrough-support/58274
- [S13] Meta blog, Passthrough Camera API (native, Horizon OS v76):
  https://developers.meta.com/horizon/blog/new-era-mixed-reality-passthrough-camera-api-machine-learning-computer-vision
- Meta Horizon Browser release notes: https://developers.meta.com/horizon/release-notes/web/
- W3C WebXR Depth Sensing: https://www.w3.org/TR/webxr-depth-sensing-1/
- Meta MR design overview: https://developers.meta.com/horizon/design/mr-overview/
- Competition judging (passthrough "purposeful ... a table becomes the play surface"):
  https://start-developer-competition-26.devpost.com/details/judging
- MR game references: First Encounters
  https://developers.meta.com/horizon/discover/success-stories/first-encounters/ and
  https://unit9.com/interactive/meta-first-encounters ; Laser Dance
  https://uploadvr.com/laser-dance-mixed-reality-impressions ; Starship Home
  https://www.meta.com/blog/starship-home-launch/ ; Cubism MR grounding by shadows
  https://www.uploadvr.com/cubism-quest-3-update/ ; Demeo MR board on a real surface
  https://uploadvr.com/demeo-to-get-hand-tracking/ ; Table Troopers (intent inference from hand
  samples) https://developers.meta.com/horizon/discover/success-stories/table-troopers/ ; BEATABLE
  (table as real-world haptics) https://roadtovr.com/beatable-hand-tracking-rhythm-quest-release-date/ ;
  Lasertag continuous meshing (native only)
  https://www.uploadvr.com/hauntify-on-quest-3-now-uses-lasertags-continuous-scene-meshing/

Local sources read (verified facts in sections 1.2-1.3): `node_modules/@iwsdk/core` 1.0.1
`dist/depth/depth-sensing-system.js`, `dist/depth/depth-occludable.d.ts`,
`dist/scene-understanding/scene-understanding-system.js`, `dist/scene-understanding/*.d.ts`,
`dist/environment-raycast/*.d.ts`, `dist/schemas/iwsdk-project.v1.schema.json`,
`dist/init/xr.js`, `dist/init/world-initializer.js`; `node_modules/iwer` 2.5.0
(`lib/labels`, `lib/depth`, `lib/pose/XRJointPose.d.ts`); the `iwsdk-depth-occlusion` skill.
What is still an assumption is marked **A** in section 1.1 and must be confirmed in the first
headset session (Q0): plane labels on Quest Browser, depth cost, alpha compositing of the dim
layer, joint velocity availability, hand update rate.
