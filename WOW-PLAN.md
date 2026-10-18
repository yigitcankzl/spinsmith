# Wow plan — 2026-10-18
Synthesis of 4 read-only agents (art direction, gameplay wow, winners benchmark, draw calls) on top of HEAD 030dc84. Captures reviewed: `artifacts/capture/spinsmith-cinematic.png`, `artifacts/desk-ko-hand-proof.png`.

## Verdict
The capture pipeline removed the "tech demo" look, but no frame shows the game. Every capture is a menu or a result screen. The hero verb (two hands bend the arena, the arena throws the rival off the real desk) has never been on camera, and part of it never renders at all (see A1).

## A. Make the hero verb visible (in-game, do first)
1. **The forge is invisible while held.** Twist and tilt are computed (`match-system.ts:3762, 3768`) but only scale reaches the stage (`:1501`).
   - Apply `arenaMorphTwist` as stage yaw and `arenaMorph.tilt` as roll at `:1500`.
   - Dent the rim under each grip.
   - On release, spring back with overshoot and about 0.4 s of `SLOW_MO`.
   - Visual only: the sim, the AI and echoes are unchanged. Check that the tops are not squashed by the stage scale.
2. **DESK KO beat at the real edge.**
   - When `roomSurface` drops below the table under the top: 0.3x speed for 0.6 s, an "OFF THE DESK" stamp at the edge, sparks and a hit.
   - `offDesk` is only set on floor landing today (`visuals.ts:1091`), so the celebration plays on an off-frame top.
3. **Spark ray bug.** Streak length is uncapped when a spark flies toward the camera (`visuals.ts:1887`). That is the yellow fan under the hub. Cap it at about `6*w`.
4. **Stamp overlaps the result card** (`match-system.ts:2705`). Place it above the card's top edge, or fade the card while the stamp holds.

## B. Draw calls (Quest risk)
The emulator has no multiview and draws each eye, so the log of 480–516 is about 240–258 per eye. Target: ≤150 per pass, which is ≤300 in the emulator log.

| # | Change | Saves per eye |
|---|---|---|
| 1 | Merge room imprints into 2 meshes with vertex RGBA (`room-imprints.ts:82`) | 30–78 |
| 2 | `visible=false` at zero opacity: top blur/edge/disc, Impacts pool (`visuals.ts:1010-1024, 1140`) | ~6 |
| 3 | `mergeByMaterial` on the static arena parts after `build()` | 15–20 |
| 4 | Merge each hub champion and the stand top (`hub.ts:591`) | ~25 |
| 5 | Instance effect pools: Impacts, ShapeMarks, bar rings `match-system.ts:1029`, pips, rival intent | 15–40 |

Items 1–4 bring fight to about 170–190 and hub to about 90–110. Item 5 gets fight under 150. Measure first with a per-phase `browser run` counter script (`onBeforeRender` counters per named root, fixed save via `?demo`).

## C. Identity (Boldest)
- **Arena floor:** blackened hammered iron (metalness 0.4, roughness 0.6, lathe `normalScale` 0.3) plus an ember emissive map in the grooves and the emblem. Give the pedestal a brass band instead of the tyre look. Today the arena reads as a turntable (`visuals.ts:1498`, `materials.ts:154`).
- **Palette:** plates in blackened steel `#1a1716` with brass edges `#c99a50` and warm off-white text (`ui.ts:29-36`). Move the guide colour out of the orange/gold family (cool white `#e8f4ff`). Teams stay orange vs. cyan.
- **Hub declutter:** station labels only on point or guide step, level plate folded into PLAY, move handle only when a hand is within 10 cm, no sky title. This also cuts draw calls.

## D. Gameplay additions (Reason to Come Back), max 3
1. **The table remembers (1.5 d):**
   - Each DESK KO leaves a scorched notch at its real edge position.
   - The beaten top lies where it stopped, with at most 3 trophies.
   - Store positions relative to the anchored smithy pose (`:2412`).
2. **The real edge orients the arena (1.5 d):** rotate pits and the low wall sector toward the nearest `ROOM.poly` edge. Re-run `report:arenas` and `check:desk-guard`.
3. **"Knock X off your desk" daily order (0.5 d):** add a `deskKO` goal in `orders.ts:8`. Only offer it when a table exists.

## Cut from first 5 minutes and video
- Outer Ring rescue, cup/sling and the `wellSpin` order, brace/parry, rim spring, workshop.
- Seals: show only Anvil and Tilt.
- Forge stamp: one verb per stamp, not "SQUEEZE · STRETCH · TILT · TWIST" (`:3689`).
- Don't pitch counts (arenas, builds, feats).

## E. Capture pipeline (zero Quest cost)
- **Hands** (`scripts/capture/shot.mjs:119-125`):
  - Keep them transparent, with alpha = `smoothstep(0, 0.035, wristDist)`.
  - Colour about `0xe0b39a` with a slight emissive.
  - Pose them mid-gesture (pinch, rip), close to the camera.
- **Camera** (`setup.sh:39`):
  - About z 0.45, y 1.45, pitch -34.
  - Try the IWER device `fovy` at about 50–60° (unverified).
  - Tops should fill about a third of the frame in hero shots.
- **Backdrop:**
  - Drop the procedural dev table.
  - Best option is a flat, eye-height photo of the developer's own desk. Otherwise a CC0 workshop 360° photo with a bench at seated eye height, aligned via `backgroundYaw`.
  - Blur 0.2, intensity 0.7.
- **One UI panel at most per shot.** Never the grey room, the outline hands or the "Remote Control Active" pill. `desk-ko-hand-proof.png` must be re-shot.
- **Honesty:** follow Pocket Grove (https://devpost.com/software/pocket-grove). Caption every image "Meta IWER emulator capture, CC0/own-desk photo backdrop, no headset". No composited person-in-room or fake through-the-lens footage.

## Thumbnails (pick one)
1. Clash macro: two tops colliding at the rim, big spark burst, dark background, large SPINSMITH. No gallery entry shows a collision.
2. Giant foreground hand ripping the cord, top flying at the camera over a real desk.
3. Bent orange bowl, beaten top flung out of frame, big "DESK KO!".

## Trailer (60 s, after A and D1)
1. Palm presses the table, arena rises.
2. Rip, white-hot cord.
3. Rival portal slam.
4. Two-hand wrench: the bowl twists, snaps back, the rival flies (slow-mo).
5. Ramp → slag.
6. Rival skids across the real desk: OFF THE DESK.
7. Palm-slap Anvil, molten print cools.
8. KO replay.
9. Reload: notch, trophy top, scars, plus the daily order "Knock Drifter off your desk".
10. Echo ghost hand forges from the far rim. Title: "Rip it. Forge the arena. Your table is the ring."

Reference: 2025 IWSDK award winner Dun Jun won with grid visuals and outline hands. Clear gameplay beats faked polish.

## Implemented outcome

Completed on 2026-10-18 in four isolated feature commits plus a capture pass:

- The held arena now visibly scales, twists and tilts, dents under both grips, then springs back in
  slow motion without scaling either top model.
- DESK KO now celebrates at the declared table edge, awards the verified +1 heat, persists the
  defeated rival and a scorched edge mark, and can appear as a table-aware daily order.
- Room marks are batched into two meshes and invisible transient top effects stop drawing. The
  desktop IWER report measured 122 stereo calls in the hub and 262 in a fight (about 61/131 per
  eye without multiview). This is a draw-call comparison, not a Quest FPS claim.
- Forge Bowl received a blackened spun-metal floor, ember groove texture, brass compression band
  and ember shoulder seam; touchable UI plates now use the same brass perimeter language.
- Repeatable `capture:heroes` evidence now records a real two-hand forge pose and only captures
  DESK KO after the production palm path asserts +3, a 3–0 score and a persisted trophy.
- Capture uses a 55° seated camera, synthetic-hand wrist fade, a disclosed CC0 backdrop and the
  NVIDIA PRIME path. `gpu-info.mjs` verified the renderer as RTX 4060. The captures still say
  `IWER EMULATOR · CC0 360° ENVIRONMENT · NO HEADSET FOOTAGE` in-frame.

Still intentionally unclaimed: physical Quest frame rate, real Quest hand reliability, real depth
occlusion and real passthrough alignment. Those remain device-test work.
