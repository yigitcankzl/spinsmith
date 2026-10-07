# Table interaction: what more the real table can add

Oct 7, 2026. This is a research and plan document only. No code was changed.
Scope: ideas that make the player's **real table** matter more, ranked so the best ones fit before the **Nov 6
feature freeze**.

It builds on `PASSTHROUGH-PLAN.md`, `EXTRA-POINTS.md`, `VISION-REVIEW.md` and `SCORECARD.md`. It does
not repeat their ideas unless something new is said.

**The test for every idea** is the one from `PASSTHROUGH-PLAN.md`: *take the room away (passthrough
off, or the tray). Does the player lose something they can see, feel or do?*

The competition text supports this test from two sides:
- the judging page asks for passthrough that is "purposeful ... a table becomes the play surface";
- Boldest Original Concept asks for "the idea that couldn't exist anywhere else".

Both are quoted in `VISION-REVIEW.md` §5.3. `SCORECARD.md` names "the mixed reality is shallow" as
weakness #2, worth +0.3 to +0.5 overall.

---

## 1. What already exists (read in the code)

| Already built | Where | What it means for new ideas |
|---|---|---|
| Palm press places the arena at the **hand's** true table height; a pinch on the glowing print places it at once | `table-touch.ts`, `match-system.ts` `updatePress` | The table height is calibrated by touch, not only by Space Setup. Anything drawn "on the wood" can trust it within a few mm. |
| The arena is fitted inside the real table polygon (moves at most 15 cm, keeps a 3 cm margin) | `room.ts` `fitToTable`, `match-system.ts` `placeRoot`, `tableShape` | The world polygon is already computed. |
| `ROOM.poly` / `ROOM.floor` hold the polygon and the floor in arena-local units; `roomSurface(x, z)` returns table or floor height | `visuals.ts:487-493`, `match-system.ts` `setRoom` | Any effect can ask "is this point over the real desk?" for free. |
| A depth-only **table mask**: the table top 2 mm below the surface plus a 5 cm skirt | `match-system.ts` `setRoom` | Things falling past the edge are already hidden behind the real desk. |
| A thrown top arcs out, lands on the table or the floor, skids, falls over; shattered parts bounce on the table | `visuals.ts` `updateOut`, `updateBurst` | This is the base for ideas 1-3. |
| Hand occluder; the room dims with a pool of light around the arena; a warm flash on hard hits | `hand-occluder.ts`, `room-light.ts` | Dimming works by drawing black with alpha over passthrough (Meta's documented technique). |

**Gaps found while reading** (they matter for the ideas below):

1. **Falls look about 2.4 times too fast.**
   - `GRAVITY = 9.81` (`visuals.ts:478`) is applied in **arena-local** units.
   - The arena root is scaled by `ARENA_SCALE = 2.4`, so a top falling off the desk accelerates at about
     23.5 m/s² in the world.
   - WP4's spec said `9.81 / ARENA_SCALE`. A 75 cm drop to the floor takes 0.25 s instead of 0.39 s, and
     it will read as "snapped down" on video.
2. **A thrown top dies on landing.**
   - It falls over as soon as it lands (`fall += dt * 2.2` in the skid branch).
   - It spins at a fixed 8 rad/s whatever its `top.spin` was.
   - Its skid decays with `exp(-6 dt)`, so it stops within a few cm.
   - So the real desk is only a landing pad, never a place where something *happens*.
3. **Sparks ignore every surface.**
   - `Sparks` (`visuals.ts:1250`) live 0.25-0.5 s, fall at 1.6 local units/s², and pass straight through
     the arena floor and the table.
   - Nothing ever touches the wood except a thrown top and shatter debris.

---

## 2. What Quest Browser WebXR can do (late 2026)

Confidence levels: H = high, M = medium, L = low. The full sources are in section 6.

| Feature | Status on Quest 3/3S, Quest Browser | Use for SpinSmith |
|---|---|---|
| Plane detection | **Yes (H).** Comes from Space Setup; polygons are rectangles; labels such as `table` and `desk` only appear if the user (or the scan) marked them. Can start capture with `initiateRoomCapture()`. | Already used for the polygon. Expect 1-3 cm edge error. |
| Mesh detection | **Yes (H).** One global mesh plus labelled **cuboid boxes** for furniture (since OS v64). A **static snapshot** from Space Setup; it can shift after a recenter (M). | Only for coarse, permanent furniture (a monitor, a lamp). A mug put down later does not exist. |
| Depth sensing | **Yes, GPU path (H); CPU path limited or absent (M).** Coarse (about 320² per eye, L) and noisy at edges. Meta's own advice: "Depth API for occlusion, Scene Mesh for physics". No WebXR sample does physics against depth (H). | Occlusion only (Q2 timebox). **Not** for collisions with real objects. |
| Hit test | **Yes (H)**, on the Depth API since Browser 40.4, no Space Setup needed. UploadVR: good for stationary placement, not for moving things. | Not needed: the palm press is a better probe. |
| Anchors | **Yes (H)**, persistent too, max 8 per site, not in private mode. | Only for "the desk remembers". On the do-not-do list. |
| Light estimation | **No (M)**: "not permitted by permissions policy". | Rejects any "match the room's light" idea. |
| Raw camera in WebXR (`camera-access`) | **No (H)**: rejected for `immersive-ar`. `getUserMedia` passthrough cameras are reported from Browser 40.1, with no pose alignment and a permission prompt (M). | Rejects wood-grain or colour sampling and object recognition. |
| Fast hand motion | **No WebXR Fast Motion Mode (M).** | Keeps the table slam rejected. |
| Microphone | `getUserMedia({audio})` probably works and the permission carries into the session (M). No evidence on knock detection; the OS echo cancellation and noise suppression may eat knocks. | Experiment only; see idea 8. |

**Meta's design guidance is mixed on tables:**
- *MR Design: Scene* uses "place a game object on a table" as its example. It asks for alignment and shadows, and says not to visualise real surfaces ("will degrade the magic").
- *Scene best practices* warns that the surface can be "a couple of centimeters below the real-world surface", and suggests a 10 cm hover for characters.

SpinSmith already answers both:
- the 8 cm pedestal is the hover;
- the palm press is the calibration;
- the table mask hides the error at the edge.

**Precedents that use the real surface:**

| Title | What it does with the room | What was praised or learned |
|---|---|---|
| Demeo | Board snapped to a marked table, pieces picked up by hand | Praised as "more like a tabletop board game" |
| First Encounters | Puffballs bounce off real furniture, using pre-processed chunks of the scene mesh | Lesson: closest-point queries fail on the concave mesh |
| CoasterMania | Carts crash into real furniture | |
| Laser Dance | Furniture becomes cover | Praised for coping with messy rooms |
| Starship Home | Objects must "live anywhere", floating or resting | Lesson: the mesh is "rough" |

The 2025 edition of this competition gave Best Casual to *Tiny Golf* (MR mini golf with a pinch). Two
IWSDK winners (*The Nanauts*, *Dun Jun*) are named, but the judges' reasons were not published.

**The pattern judges and press reward: virtual objects that physically leave the virtual space and
behave in the real one.** Static decoration of the room is not what they reward.

---

## 3. The ideas

**Score** = impact (1-10: the take-away test, the video, the award text) × feasibility (0-1: API
reliability on Quest 3/3S, the chance it works the first time on a device) / days (developer days with
emulator checks).

| # | Idea | Impact | Feas. | Days | **Score** | Verdict |
|---|---|---|---|---|---|---|
| 1 | **Off the desk:** escaped tops keep spinning across the real wood, wobble, and drop off the real edge with sound for the surface | 8 | 0.9 | 1.0 | **7.2** | **Do** |
| 2 | **Pick it off the desk:** your knocked-out top waits on the wood until you take it back by hand | 6 | 0.8 | 0.75 | **6.4** | **Do** |
| 3 | **Battle scars:** sparks land on the desk; scorch and skid marks darken the real wood; clash light splashes on it | 7 | 0.85 | 1.0 | **6.0** | **Do** |
| 4 | **The game draws your table's edge:** a molten line traces the real edge as the arena forges up | 6 | 0.7 | 0.75 | 5.6 | If time; merge with EXTRA-POINTS Extra 10 |
| 5 | **Table-size-aware arena:** drawn scale and margin from the polygon (small desk → 2.0×, big → 2.4×) | 3 | 0.8 | 0.5 | 4.8 | Cheap guard; judges never see it |
| 6 | Rival gate on the real wall (PASSTHROUGH-PLAN idea 7) | 4 | 0.9 | 1.0 | 3.6 | Decoration; after the top 3 |
| 7 | Real furniture as bumpers (bounded `XRMesh` boxes: monitor, lamp) | 6 | 0.35 | 1.25 | 1.7 | Post-competition spike |
| 8 | Knock on the table to call the rival or taunt (fingertip double-tap, or the mic) | 4 | 0.4 | 1.0 | 1.6 | Reject for the freeze |
| 9 | Persistent scars: the desk remembers last session (anchors) | 4 | 0.4 | 1.0 | 1.6 | Reject (anchors are do-not-do, 8 per site, drift) |
| 10 | Live real objects (a mug) as obstacles via depth | 7 | 0.1 | 3+ | 0.2 | **Reject:** GPU-only depth, no physics, readback stalls |
| 11 | Wood-grain or colour sampling, light matching | - | 0 | - | 0 | **Reject:** no `camera-access`, no light estimation |
| 12 | Table slam | 8 | 0.3 | 2+ | 1.2 | Stays rejected (no fast motion mode in WebXR) |
| 13 | Launch onto the desk (the top drives across the wood into the arena) | 7 | 0.3 | 3 | 0.7 | Reject: needs the sim outside the arena |
| 14 | Shadow catcher (real shadow maps on the wood) | 3 | 0.7 | 1.0 | 2.1 | Do-not-do list; blob shadows already ground the tops |

Surface sound (a woody thock on the desk, a hard clack on the floor, spatialized at the landing point)
scored 12+ on its own (impact 4, 0.3 day). It is folded into idea 1 so the formula does not inflate a
garnish.

### Idea 1. Off the desk: escaped tops live on the real wood (score 7.2)

- **What the player sees and does.**
  - A ramp throws the rival over the wall. It lands on the real desk **still spinning**, skates
    30-60 cm across the wood in a curve (by its spin direction), slows, wobbles and rattles flat.
  - If it reaches the real edge, it drops off with a short arc and clatters on the floor, and the card
    reads **OFF THE DESK**.
  - The player's eyes follow it out of the arena onto their own table. That is the take-away test
    passed: on the tray there is no wood, no edge and no floor.
- **Why it fits.**
  - It turns the existing THROWN finish into the trailer's first shot (ACTION-PLAN WP14 already wants
    "a ramp knockout that throws the top onto the real table" at 0:00).
  - It fits Meta's guidance on surfaces as physics: First Encounters and CoasterMania are the
    precedent.
  - Criteria: Innovation, Technical (scene understanding visibly used), Polish.
- **Technique (steps in 4.1).** `visuals.ts` `updateOut`: world-true gravity, a desk-spin state
  (real `top.spin`, low friction, a curve by `top.hand`, a wobble, then the topple), a bounce off the
  pedestal, an `offDesk` flag. `audio.ts`: `playLand` (wood thock / floor clack) and a desk rattle.
  `match-system.ts`: the "OFF THE DESK" callout with +10 XP (cosmetic, never heat: it depends on the room).
- **WebXR needed.** The plane polygon (H). Without a polygon the clamp stays as today.
- **Emulator.**
  - `living_room` has a labelled table: place the arena near the edge with the brass handle, press
    `O` (throw now), and watch the `[OUT] landed on the table/floor` logs.
  - Screenshots at 0.2 s intervals via the IWSDK CLI.
- **Cost.** 1 day.
- **Risk.**
  - Polygon error of 1-3 cm can make a top "fall" while it visibly sits on wood. Mitigate with a 2 cm
    inward margin before declaring "off".
  - A long skid can carry the top out of view (it moves 30-60 cm). Cap the travel at 0.45 m.
- **Fallback.** No polygon: the old short skid and clamp, but still spinning on the tray's level.

### Idea 2. Pick it off the desk (score 6.4)

- **What the player sees and does.**
  - After a THROWN round, your top lies where it fell on the real desk.
  - On the ready screen you can reach down, pinch it off the wood, and drop it into the arena or the
    dock. It snaps home with a clack and sparks.
  - If you don't, it hops back into the arena by itself when you start the rip (0.4 s arc).
  - The rival's top always hops back on its own.
  - Fell to the floor? "Lost under the desk": a fresh blank drops into the dock glowing and cools.
- **Why it fits.**
  - A physical, tactile proof that the desk is real space: the hand goes to the wood, beyond the
    machine. Demeo's most praised MR moment is picking pieces up by hand.
  - It reuses SpinSmith's own grammar (carry the top from the dock).
  - Criteria: Experience Design, Innovation.
- **Technique (steps in 4.3).** `TopView.restingOnTable()`; in `toReady`, a `root.clone()` souvenir
  at the landing pose (it shares geometry, 1-3 draw calls) while the real top waits hidden at spawn;
  the grab follows `hub.ts` (`GRAB_NEAR` 0.08 m, hand-loss cancel); release over the arena or dock
  snaps it to `SPAWN`; auto-return on the rip or after 10 s; skip if outside the `reach.ts` band.
- **WebXR needed.** Hands (H), the polygon (H).
- **Emulator.** Yes: dev key `O`, then `1`/`2` + mouse to move a hand onto the souvenir, then a pinch
  (`set-select-value`).
- **Cost.** 0.75 day.
- **Risk.**
  - Confusion about which top is in play. Mitigate: the spawn shows an empty breathing ring while the
    souvenir is out.
  - The ready screen must never wait for it.
- **Fallback.** Auto-return only (0.25 day of the same code).

### Idea 3. Battle scars on the real desk (score 6.0)

- **What the player sees and does.**
  - Clash sparks that fly past the pedestal **land on the wood**, bounce once and die as tiny embers.
  - A top that crashes onto the desk leaves a short **skid mark**, and a shatter leaves a **scorch
    ring**: they glow orange, cool to dull red, then remain as soft dark marks on the real desk for the
    rest of the match.
  - Every hard clash throws a warm splash of light across the wood around the pedestal.
  - After a long match the table around the arena shows the history of the fight. The marks fade when
    you go home.
- **Why it fits.**
  - The forge fantasy written onto the player's own furniture: a frame no flat-screen game can make.
  - It gives the video texture (VISION-REVIEW C, "juice for the camera").
  - Passthrough-off test: the marks have nothing to sit on.
- **Technique (steps in 4.2).** A `DeskMarks` class: two instanced flat quads (black + `alphaMap`
  at 0.35 opacity darkens passthrough, the `RoomLight` mechanism; additive glow cooling orange →
  black), only inside `ROOM.poly`, max 24, cleared at home. `Sparks.update` takes a surface callback
  and bounces once. `RoomLight.hit(pos)` brightens a warm circle on the desk at each clash.
- **WebXR needed.** The polygon (H), passthrough alpha compositing (A for exact additive behaviour; dark
  marks are safe).
- **Emulator.** Fully, in `living_room` (`K` shatter, `O` throw). On the device, check only that the
  opacity reads on light and dark desks.
- **Cost.** 1 day.
- **Risk.**
  - Draw calls +2 (fight 108-112 → about 114).
  - Marks can look like stickers on a cluttered or dark desk. Keep them soft-edged and below 0.4
    opacity.
  - A mark under a real object (a keyboard) floats over it. It is small and short-lived, but say so
    in the testing notes.
- **Fallback.** On the tray (`ROOM.poly == null`) no marks are made; sparks and the light splash still work.

### Ideas 4, 5, 7 and 8 in brief

- **4. The game draws your table's edge (5.6).** During press-to-forge, a molten `Line` from
  `tableShape().poly` (animated `drawRange`, 1.2 s, additive orange) runs once along the real edge,
  then the arena rises. Not top 3: Meta advises against visualising real surfaces, and a Space Setup
  rectangle 2-3 cm off is *exposed* by a line drawn on it. Add it to EXTRA-POINTS Extra 10 (0.75 day)
  only after T3/T7 show the polygon is accurate.
- **5. Table-size-aware arena (4.8).** If `fitToTable` cannot keep `RIM_MARGIN` after `MAX_FIT_MOVE`,
  use `ARENA_SCALE` 2.0 for that placement. A T7 robustness guard, not a feature. 0.5 day, because
  `ARENA_SCALE` is a module constant shared by `reach.ts`, `TABLE_Y` and the views.
- **7. Real furniture as bumpers (1.7).** Bounded `XRMesh` boxes near the desk (`screen`, `lamp`)
  reflect escaped tops and get depth-only box occluders. Low because furniture comes as Space Setup
  cuboids, small desk objects are rarely captured, it can shift after a recenter, and judges' desks
  will usually have nothing labelled. A post-competition spike: about 30 lines once idea 1 exists.
- **8. Knock to call the rival (1.6).** By hand tracking (a fingertip double-tap, a `TableTouch`
  variant), fast taps blur and resting hands give false positives. By microphone, there is a
  permission prompt before Enter, OS noise suppression may remove knocks, and it is unverified on
  Quest. It is also a new gesture (do-not-do). Reject for the freeze.

---

## 4. Top 3 for the Nov 6 freeze

**Pick ideas 1, 3 and 2, built in that order: about 2.75 days, all emulator-buildable.**

| Order | Idea | Days |
|---|---|---|
| 1 | Off the desk | 1 |
| 2 | Battle scars | 1 |
| 3 | Pick it off the desk | 0.75 |

Why these three:
- They reuse what WP4 and the polygon work already built (`ROOM`, `roomSurface`, the table mask), so
  most of the risk is already paid.
- They give the video one continuous beat: ramp → THROWN → the top skates across the real desk
  leaving a glowing skid → drops off the edge → you pick your top off the wood.

ACTION-PLAN §6 shows WP1-WP13 done, so **Oct 8-12** is free for this, before the device weeks. Put them
under the existing do-not-do amendment as "visual consequences of existing finishes, no new gestures".
Idea 2 reuses the hub's carry.

### 4.1 Off the desk: steps

1. In `visuals.ts`, import `ARENA_SCALE` from `./reach.js` and define `const G = GRAVITY / ARENA_SCALE`.
   Use it in `updateOut` and `updateBurst` (`v.y -= G * dt`, `d.vel.y -= G * dt`).
   - With 2.4× weaker gravity, the same `throwVel.y = 0.3` arcs 2.4× higher. Lower it to about
     0.3 / √2.4 ≈ 0.19 to keep today's arc height, then tune by eye.
2. Add fields to `TopView`: `deskSpin = 0`, `offDesk = false`, `travelled = 0`.
   - Reset them where `outT` is set to -1 (`visuals.ts:629` and the `outT < 0` init).
   - At init, `this.deskSpin = Math.max(0.25, top.spin)`.
3. Table landing branch (`ground >= TABLE_LEVEL`):
   - keep `v.x`, `v.z` (scaled by 0.7);
   - set `landed = true` and `fall = 0`;
   - call `onLand?.('table', p)`.
   - Floor landing: `offDesk = true`, `onLand?.('floor', p)`.
4. Replace the skid `else` branch:
   - `deskSpin -= dt / 2.0`;
   - friction `v.multiplyScalar(Math.exp(-dt * (deskSpin > 0 ? 1.5 : 6)))`;
   - curve: rotate `(v.x, v.z)` by `top.hand * 1.2 * dt * deskSpin`;
   - `travelled += |v| dt`, and stop moving when `travelled > 0.45 / ARENA_SCALE`;
   - pedestal bounce: if `hypot(p.x, p.z) < arena.radius + 0.035`, reflect `v` about the radial normal
     with ×0.5;
   - spinner: `rotation.y += dt * 30 * max(0, deskSpin)`;
   - wobble tilt: `0.15 * (1 - deskSpin)` around the velocity axis;
   - start `fall` only when `deskSpin <= 0`;
   - keep the existing "surface dropped → `landed = false`" edge check, and set `offDesk = true` there.
5. Edge margin: in `roomSurface`, treat points within 0.02 / ARENA_SCALE of the polygon edge as table
   (use `edgeDistance` from `room.ts`) so polygon error does not drop a top that sits on visible wood.
6. Sound:
   - in `audio.ts`, add `playLand(kind: 'table' | 'floor', x)` (a table thock: noise burst through a
     lowpass at about 400 Hz, 120 ms; floor: a bandpass at about 1.8 kHz, 60 ms, quieter, two bounces);
   - add `DeskRattle` (a quiet filtered-noise loop whose rate follows `deskSpin`).
   - `MatchSystem` wires `view.onLand` to them.
7. Callout: when the result card is built (near `match-system.ts:1932`), if the loser's view has
   `offDesk`, append "OFF THE DESK" and grant +10 XP through `progress.ts`'s round XP (cosmetic). Log
   `[OUT] off the desk`.
8. Check:
   - `npm run typecheck`, `npm run check:sim` (sim untouched; must stay identical).
   - In IWER `living_room`: place the arena with its right rim about 10 cm from the table edge (brass
     handle), `O` ×5, `K` ×3.
   - Capture frames every 0.2 s.
   - Accept when:
     - a top lands, curves and travels 20-45 cm while spinning;
     - at least one run drops off the edge and is hidden by the table mask as it falls;
     - logs show `landed on the floor`;
     - draw calls are unchanged.

### 4.2 Battle scars: steps

1. **Texture.** In `visuals.ts`, build `SCAR_ALPHA` (64×64 `DataTexture`, radial falloff with
   noise) and `SKID_ALPHA` (64×16, an elongated streak), both generated in code like the matcaps.
2. **Class `DeskMarks` in `visuals.ts`.**
   - Two `InstancedMesh`es of `PlaneGeometry(1, 1).rotateX(-PI/2)`, 24 instances each:
     - `char`: black, `alphaMap`, opacity 0.35, `transparent`, `depthWrite false`, `renderOrder 1`;
     - `glow`: `AdditiveBlending`, instance colours.
   - API: `add(kind: 'scorch' | 'skid' | 'ember', x, z, angle, size)` and `update(dt)`, which lerps each
     glow's instance colour from `0xff7a1a` to black over 1.5 s (embers 0.6 s, no char).
   - `clear()`.
   - Positions at `TABLE_LEVEL + 0.0005`, and only if `ROOM.poly && insidePoly(ROOM.poly, x, z)`, and
     outside `arena.radius + 0.03`.
   - Separate alphaMaps per kind mean two char meshes, or one atlas. **Use one atlas** to stay at 2 draw
     calls.
3. **Hooks.**
   - `TopView` gets `onMark?: (kind, x, z, angle) => void`.
   - Call it on the table landing (skid along `atan2(v.z, v.x)`) and on the first table bounce of each
     debris piece in `updateBurst` (scorch, size 0.02 local).
   - `MatchSystem` constructs one `DeskMarks`, adds it under `root`, wires `onMark`, calls `update` in
     the frame loop and `clear()` in `toHub()`.
4. **Sparks on surfaces.**
   - Export `roomSurface`.
   - Change `Sparks.update(dt, floorAt?: (x, z) => number)`.
   - On `y < floorAt`: `y = floor`, `vy = -0.3 * vy`, `vx *= 0.5`, `vz *= 0.5`, and add 0.3 s to `life`
     once (a flag in a `Uint8Array`).
   - If the spark is over the wood, call `marks.add('ember', ...)` for every 4th.
   - Pass `(x, z) => this.arena.inside(x, z) ? this.arena.height(x, z) : roomSurface(x, z)` from
     `MatchSystem`.
5. **Light splash.**
   - `RoomLight.hit(pos?: Vector3, k = 1)` stores a world position; add uniforms `uFlashPos` and
     `uFlash`.
   - In the shader, after computing `a`: `a *= 1.0 - uFlash * 0.8 * (1.0 - smoothstep(0.05, 0.35, distance(hit.xz, uFlashPos.xz)))`.
   - Decay `uFlash` over 0.25 s.
   - At `match-system.ts:1779`, pass the clash's world position (`root.localToWorld`).
6. **Check.**
   - typecheck.
   - IWER: `K` and `O` five times each, then screenshots of the desk around the pedestal from the
     seated pose (headset y 1.15, pitch -40).
   - Accept when:
     - at least 3 marks are visible after a shatter, glowing then dark;
     - none sits inside the pedestal or off the polygon;
     - fight draw calls rise by at most 3;
     - the marks are gone after Menu → home.
   - On a device (T1): check opacity on the real desk and the frame time.

### 4.3 Pick it off the desk: steps

1. In `TopView`, add a `restingOnTable()` getter. It returns a clone of `root.position` when
   `outT >= 0 && landed && fall >= 1 && !offDesk`, else null.
2. In `MatchSystem.toReady()`, before the two `launch` calls:
   - `const rest = mineView.restingOnTable()`.
   - If `rest` is set and `reachOk(rest)` passes (the `reach.ts` rules: ≤ 0.62 m, ≤ 63° below the eyes):
     - create `this.souvenir = mineView.root.clone()`, add it under `root` at `rest` with the toppled
       rotation;
     - set `this.souvenirSince = this.time`;
     - hide `mineView` until it returns, and show a breathing ring at `SPAWN`.
   - If the top fell to the floor (`offDesk`): play `playPlace()` and give the spawn top a cooling
     emissive (reuse the forge's emissive lerp if one exists, else a scale-in) with the label "Lost
     under the desk: a fresh blank".
   - For the rival's view, if it is resting: an auto-return arc at once (0.4 s, sparks on arrival).
3. In the `ready` update, while a souvenir is out:
   - Grab: for each hand, on `justPinched` within `GRAB_NEAR` (0.08 m, world) of the souvenir, set
     `held = side`.
   - While held: follow `hands[side].pinch` (world → root local).
   - Lost hand longer than `HAND_LOSS_GRACE`: cancel and drop back to `rest`.
   - On release:
     - if `arena.inside(local)` or within 0.06 of the dock, tween it to `SPAWN` over 0.25 s, then
       `playPlace()`, `sparks.burst`, and remove the souvenir;
     - else it stays where it was released, on the table height if it is over the polygon.
   - Auto-return when `pulling` starts or after 10 s: an arc over 0.4 s.
4. The launch logic is untouched. The souvenir is only a visual. The launch still uses the spawn top,
   so nothing in the sim or the rip depends on the pick-up.
5. Guide: the first time a souvenir appears, a breathing ring under it and a label "Your top is on
   the desk: take it back (or just rip)". Only once (a progress flag).
6. Check:
   - IWER: `O` until your top is thrown (or a dev key that throws *your* top: add `Shift+O` beside the
     existing `O`).
   - Hold `2` and move the mouse onto it, pinch, carry it over the arena, release.
   - Accept when:
     - the souvenir appears on the wood;
     - it can be carried and returned;
     - auto-return fires on the rip and after 10 s;
     - nothing waits on it;
     - there are no extra draw calls after it returns.

---

## 5. Honest notes

- None of the three changes the sim, the balance reports or the scoring, and none adds a gesture.
  Idea 2 reuses the carry.
- They only show on THROWN and SHATTER rounds.
  - Check the knockout share in `report:arenas` and `report:shaping` (the target in SCORECARD:
    knockouts in more than 35% of wins).
  - If throws are rare, idea 1 is seen less. Do not tune balance for it; let the first match's
    steadier rival and the WP9 shape knockouts provide them.
- The device risk is almost entirely polygon accuracy. Run them on T3/T7 day:
  - place the arena at the desk edge;
  - throw 10 times;
  - count tops that "fall" from visible wood or "float" past the edge.
  - Fallback knob: `?deskmargin=` in `tuning.ts`.
- Rejected for good reasons: live-object physics (GPU-only depth, no physics path), colour or light
  sampling (no camera access, no light estimation in WebXR on Quest), the slam (no fast-motion
  hands), and anchors (do-not-do; IWSDK re-parents the arena).

## 6. Sources

Quest WebXR:
[WebXR MR](https://developers.meta.com/horizon/documentation/web/webxr-mixed-reality/) ·
[IWSDK scene understanding](https://developers.meta.com/horizon/documentation/iwsdk/guides/11-scene-understanding/) ·
[IWSDK depth occlusion](https://developers.meta.com/horizon/documentation/iwsdk/guides/15-depth-occlusion/) ·
[Mesh + Depth API blog](https://developers.meta.com/horizon/blog/mesh-depth-api-meta-quest-3-developers-mixed-reality) ·
[three.js depth is GPU-only](https://discourse.threejs.org/t/webxr-depth-sensing-api-dont-work-in-three-js-r168/70675) ·
[hit test on depth, Browser 40.4](https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/) ·
[furniture as boxes, v64](https://www.uploadvr.com/quest-v64-undocumented-features-furniture-recognition-multimodal/) ·
[light estimation not permitted](https://communityforums.atmeta.com/discussions/dev-quest/feature-light-estimation-is-not-permitted-by-permissions-policy/1238655) ·
[camera access / getUserMedia](https://forum.babylonjs.com/t/webxr-camera-passthrough-support/58274) ·
[Fast Motion Mode (native)](https://developers.meta.com/horizon/documentation/unity/fast-motion-mode/) ·
[mic in WebXR](https://forum.babylonjs.com/t/using-meta-quest-2-microphone-inside-of-webxr-game/38321).

Design guidance:
[MR Design: Scene](https://developers.meta.com/horizon/design/mr-design-scene/) ·
[Scene best practices](https://developers.meta.com/horizon/documentation/unity/scene-best-practices/) ·
[passthrough dimming](https://developers.meta.com/horizon/resources/mr-design-passthrough/).

Precedents:
[First Encounters](https://developers.meta.com/horizon/discover/success-stories/first-encounters/) ·
[CoasterMania](https://uploadvr.com/coastermania-mixed-reality-quest-3-room-mesh) ·
[Starship Home](https://www.uploadvr.com/how-creature-approached-mixed-reality-design-challenges-with-starship-home/) ·
[Laser Dance](https://uploadvr.com/laser-dance-early-access-review) ·
[best MR games](https://www.uploadvr.com/best-mixed-reality-games-quest-3/) ·
[2025 competition winners](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/).

Local code read: `visuals.ts` (`ROOM`, `roomSurface`, `updateOut`, `updateBurst`, `Sparks`),
`match-system.ts` (`updatePress`, `placeRoot`, `setRoom`, `toReady`, the clash branch), `room.ts`,
`table-touch.ts`, `room-light.ts`, `hand-occluder.ts`, `hub.ts`, `sim.ts`, `iwsdk.config.json`, and
IWSDK's scene-understanding module.
