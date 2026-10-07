# SpinSmith: the WOW moments

Oct 8, 2026. A design and research document only; no source was changed.
Read: `README.md`, `BRIEF.md`, `docs/polish/DONE.md`, `docs/reviews/FULL-EVALUATION.md`,
`docs/TABLE-INTERACTION.md`, `docs/SUBMISSION.md`, and the code paths named below
(`match-system.ts`, `visuals.ts`, `sim.ts`, `room-light.ts`, `placement.ts`, `room.ts`, `audio.ts`,
`hand-occluder.ts`, `tuning.ts`).

**The question.** What will a judge (10 minutes, seated, hands only) still describe to a colleague a
week later, and what would Meta put in a store trailer? Not "polish", but moments: a few seconds
where the game does something only *this* device in *this* room can do.

**The test for every moment** (from `TABLE-INTERACTION.md`): turn passthrough off, or put the arena
on the tray. If the moment loses nothing, it is decoration, not MR wow.

---

## 0. Where SpinSmith stands today

What already exists and is good (`DONE.md`): the arena forges up out of the table, the room dims to a
pool of light around it (`room-light.ts`), the forge tints the room warm, hit-stop, slow motion on
every knockout, a 0.4x on-table replay, team light rings, stamped words, a synthesized score.

What is missing is the *room* in the climaxes. Every big beat (VS, knockout, replay, match won,
forge saved) happens **inside the 72 cm machine**. The real room is lit and dimmed, but nothing ever
*arrives from it, lands in it, marks it or leaves it*. `FULL-EVALUATION.md` names the result: "the
hero moment is small: 6 cm tops on a 72 cm arena, and a ramp throw lasting a fraction of a second".

Three facts from the code shape every recommendation:

1. **Thrown tops die on the wood, and fall too fast.** `TopView.updateOut` (`visuals.ts:717`) uses
   `GRAVITY = 9.81` in arena-local units under a 2.4x root scale, so falls run at about 23.5 m/s² in
   the world; a landed top skids with `exp(-6 dt)` and topples at once (`fall += dt * 2.2`). The
   `TABLE-INTERACTION.md` plan (ideas 1-3) is **not built yet** (no `deskSpin`, `offDesk`,
   `DeskMarks`, `playLand` in `src/`).
2. **The room polygon, the floor height and a depth-only table mask already exist**
   (`match-system.ts` `setRoom`, `visuals.ts` `ROOM`, `roomSurface`). Anything that lands, bounces or
   falls off the real desk is mostly paid for.
3. **Passthrough darkening is the one "light" tool WebXR gives us** (no light estimation, no camera
   access, `TABLE-INTERACTION.md` section 2). `RoomLight` (`room-light.ts`) is a black-alpha shell with
   a ray-to-table-plane shader. Every room-light idea below is a new uniform in that one shader, not
   a new system.

Budget: fight draw calls were measured at 108-170 in the emulator (`TABLE-INTERACTION.md`,
`ART-AUDIO.md` section 2); the Meta guideline is roughly 100-150 at 72 fps. Every idea states its
draw-call delta. Bloom is impossible (multiview, no post passes), so glow is additive geometry.

---

## 1. The ranked list

Ranked by **wow per effort**: wow (1-10: will a judge talk about it; would it be the trailer's first
shot) × confidence it works on a Quest the first time (0-1) / developer days.
S = half a day or less, M = about 1 day, L = 2+ days.

| # | Moment | Criterion it hits hardest | Wow | Conf. | Effort | Score |
|---|---|---|---|---|---|---|
| 1 | **Off the desk**: a knocked-out top skates across your real table still spinning and drops off its real edge, with a wood thock and a floor clatter | Experience Design (passthrough purposeful), Innovation | 9 | 0.9 | M (1 d) | **8.1** |
| 2 | **The molten handprint**: your strike slap leaves a glowing handprint burnt into your real table, cooling to a dark scorch | Innovation (hands-first), Polish | 7 | 0.9 | S (0.5 d) | **12.6** |
| 3 | **Your hand in the light**: your real hand casts a soft shadow on the arena floor; when your strike is charged, your palm lights the floor under it | Technical (hand tracking), Polish | 6 | 0.85 | S (0.5 d) | **10.2** |
| 4 | **The rival breaks through your wall**: a molten portal burns open in your real wall, the rival's top shoots out in an arc trailing embers and slams into the arena | Innovation, Technical (scene understanding) | 10 | 0.7 | M-L (1.5 d) | **4.7** |
| 5 | **The heat wave**: winning a match sends a ring of warm light rolling out from the arena across your whole room; your champion hops into your open palm | Experience Design, Polish | 8 | 0.8 | M (1 d) | **6.4** |
| 6 | **Sparks on your table**: clash sparks fly past the pedestal and skip on the real wood; every hard clash splashes warm light on the desk; skid and scorch marks stay for the match | Experience Design, Polish | 7 | 0.85 | M (1 d) | **6.0** |
| 7 | **The quench**: dropping your top in the quench slot blasts a column of steam, the forge-orange room snaps to cool blue and settles back to daylight | Polish (sound + light), Experience Design | 6 | 0.9 | S (0.5 d) | **10.8** |
| 8 | **Pick it off the desk**: your own knocked-out top waits on the real wood until you reach down and take it back | Experience Design (hands-first) | 6 | 0.8 | M (0.75 d) | **6.4** |
| 9 | **The turntable replay**: for the replay the whole arena turns on its pedestal so you see the knockout from the rival's side | Polish, Presentation (video) | 6 | 0.75 | M (1 d) | **4.5** |
| 10 | **The Crown looms**: the final champion's top stands taller than the arena behind the far rim, humming so low you feel it, then plunges and shrinks into the arena | Innovation (scale), Reason to Come Back | 8 | 0.7 | M-L (1.5 d) | **3.7** |

By score the small ones (2, 7, 3) come first, but a score does not pick a trailer. **The order to
build** (section 4) is 1, 2, 6, 4, 7, 5, 3, 8, then 9 and 10 if time remains, because 1 and 4 are
the two moments that carry the video and the judge's memory, and 2 and 6 reuse 1's code.

Also evaluated and folded in or rejected (section 3): HRTF spatial audio (folded into 1, 4, 5), the
arena unfolding like a machine (exists; one cheap upgrade), tracing the table edge (risky), a molten
pour for new parts, a slag drip through the pedestal, touching the table anywhere, catching a flying
top, scale changes, a table slam.

---

## 2. The moments in detail

### 1. Off the desk (M, 1 day). The trailer's first shot

**The moment.** Your ramp throws the rival over the wall. Time slows. It sails out of the lit pool,
lands on your **real** desk *still spinning*, curves across the wood in its spin direction, wobbles,
and, if the edge is near, tips over the **real edge** of your table and clatters on the floor below.
The stamp reads **OFF THE DESK!** Your eyes leave the machine and follow it into your room.

**Why it is wow.** It is the most-cited MR pattern: virtual objects that leave their box and obey
the real room (First Encounters' puffballs bouncing off furniture, CoasterMania's carts crashing
into it; see section 5). It passes the take-away test completely: on the tray there is no wood, no
edge and no floor. Experience Design asks that "the player's real room should meaningfully change
the experience ... a table becomes the play surface"; here the size and shape of *your* table decide
where the top ends up. It is also the cold open already written in `SUBMISSION.md` (0:00-0:08).

**How to build it.** The full step list is `TABLE-INTERACTION.md` section 4.1; the essentials:
- `visuals.ts` `updateOut`: `const G = GRAVITY / ARENA_SCALE` (fixes the 2.4x fast fall), lower the
  initial `throwVel.y` from 0.3 to about 0.19 so the arc keeps its height, then tune.
- A desk-spin state on `TopView` (`deskSpin` from the real `top.spin`, `travelled`, `offDesk`):
  low friction while spinning, the path curves by `top.hand`, a wobble tilt as it slows, the topple
  only when `deskSpin <= 0`, travel capped at 0.45 m (world), a bounce off the pedestal.
- Keep the existing "the surface dropped away → `landed = false`" branch; it already makes a top
  fall off the polygon's edge onto `ROOM.floor`, and the table mask already hides it behind the
  real desk as it falls.
- `roomSurface`: a 2 cm inward margin (`edgeDistance` from `room.ts`) so a 1-3 cm polygon error does
  not drop a top that visibly sits on wood.
- `audio.ts`: `playLand('table' | 'floor', x)` (wood: noise through a lowpass near 400 Hz, 120 ms;
  floor: bandpass near 1.8 kHz, two quieter bounces, then a rolling rattle), and a desk rattle loop
  whose rate follows `deskSpin`. Make these the first sounds to use a `PannerNode` with
  `panningModel = 'HRTF'` placed at the world landing point, with the `AudioListener` following the
  head: a clatter *below and to the left of the desk* is the single best showcase for spatial audio.
- `match-system.ts` `finish`: when the loser's view reports `offDesk`, stamp `OFF THE DESK!` (cosmetic,
  never heat: it depends on the room) and log `[OUT] off the desk`.
- Make the slow motion follow the flying top: `slowMo` already applies to the views (`vdt`), so the
  arc out of the arena plays at 0.3x for free; extend `SLOW_MO_TIME` only when the top is going to
  leave the arena (`finish === 'over'`).

**Quest risks.** Frame cost is nil (no new meshes; one top moves further). Polygon error is the real
risk (mitigated by the margin). A top that skates 45 cm may leave the view; the cap and the curve keep
it near. Comfort: nothing moves the view.

**Verify in IWER** (`living_room` has a labelled table). Move the arena near the table edge with the
brass handle (or `P` with the head turned), then in a match use dev key `O` (throw the rival now)
several times; for a real-gesture take, `drive.sh '["rip",{"power":0.9}]' '["wait",3]' '["ramp"]'`
with `DRIVE_VIDEO` set. Accept when logs show `[OUT] landed on the table` then `... floor`, frames at
0.2 s show the top curving 20-45 cm while spinning, the drop is hidden behind the table edge, and
`[PERF]` draw calls are unchanged.

---

### 2. The molten handprint (S, half a day)

**The moment.** Your forge bar is full; you slap your palm on the real table beside the arena. The
shockwave goes off and, when you lift your hand, **your handprint is burnt into your desk**:
white-orange, then red, then a dark scorch that stays until the match ends.

**Why it is wow.** It turns the most physical verb in the game into a mark on the player's own
furniture: the hand did something *to the room*. It is a hands-first signature (the competition's
hard requirement, and the 2025 "Best Hand Interactions" lineage in `BRIEF.md`). It costs almost
nothing because the palm texture already exists.

**How to build it.**
- `visuals.ts` already has `PALM` (a generated palm texture) and `match-system.ts` builds
  `slapMark` from it. In `doStrike` (`match-system.ts:2282`), take the slap's world palm position and
  orientation (the hand's wrist-to-middle-metacarpal direction from `hands.ts`), drop it onto the
  table plane (`this.root.position.y - PEDESTAL`, or `ROOM` table height), and spawn one decal:
  - an additive quad (PALM map) whose colour lerps `#fff2c0 → #ff7a1a → #6a1500 → black` over 2.5 s;
  - a second quad, black with the PALM map as `alphaMap`, opacity rising to 0.3: it darkens
    passthrough (the `RoomLight` mechanism), so the scorch reads on a light desk.
- Only over the polygon (`insidePoly`), outside the pedestal; keep the last 3, clear in `toHub`.
- Sound: a short sizzle under the strike (`hiss` already exists in `audio.ts`).
- Calm comfort mode (press and hold): the print grows while the palm is held, which is even better.

**Quest risks.** +2 draw calls while marks exist. A judge's hand rarely matches the print's size
exactly: scale the print by the tracked hand's wrist-to-middle-tip length. On a dark desk the scorch
vanishes; the glow phase still reads.

**Verify in IWER.** In the second match or with `?demo`: `drive.sh '["key","KeyJ"]' '["slap"]'`, then
`scripts/emu.sh shot` 0.3 s, 1.5 s and 4 s after. Accept when the print sits on the table under the
emulated palm, cools in three visible stages, and is gone after Menu.

---

### 3. Your hand in the light (S, half a day)

**The moment.** Hold your hand over the arena and **its shadow falls on the floor**, sharpening as you
lower your hand toward the tops. When your strike is charged, the shadow turns into light: your palm
glows and throws a warm pool onto the arena floor and the table beneath it.

**Why it is wow.** It is quiet, but it is the moment a player realises the virtual arena *knows where
their real hand is*. The hand occluder already hides the arena behind real fingers; a contact shadow
is the other half of "my hand is in the same space" (Meta's MR scene guidance asks for alignment and
shadows to ground virtual objects). It also tells the player, without words, where a pinch will land.

**How to build it.**
- A `HandShadow` in `visuals.ts`: per hand one quad with `SOFT_SHADOW` (exists), placed under the palm
  centre (mean of wrist and the middle metacarpal) at `arena.height(x, z)` when over the arena, else
  at the table height. Size grows and opacity falls with height (`0.06 + 0.4 h`, `0.5 * (1 - h/0.25)`).
- Charged bar: swap to an additive warm material and raise the brightness (one uniform). For the
  table part, add a `uHand` position + strength to `RoomLight`'s shader (the same pattern as the
  hit splash in idea 6): a small brightened circle on the table under the palm.
- `MatchSystem.update`: feed it from `this.hands` only in `ready`, `pulling`, `fight`.

**Quest risks.** +2 draw calls. Hand tracking jitter makes a shadow shimmer: smooth the palm position
over about 60 ms.

**Verify in IWER.** Hold `1` or `2` and move one emulated hand over the arena; shots at two heights.
In a fight, `KeyJ` to fill the bar, then the same shots. Accept when the shadow follows the hand,
grows and fades with height, and turns warm when charged.

---

### 4. The rival breaks through your wall (M-L, 1.5 days). The memory

**The moment.** The VS stamp lands. Across the room, on **your real wall**, a crack of orange light
spreads into a glowing ring; the wall inside it goes black, then shows a furnace glow behind. A low
rumble comes *from that wall*. The rival's top fires out of the hole trailing embers, arcs over your
table and slams into the arena with a clang and a ring of sparks. The portal seals itself.

**Why it is wow.** Breaking open the real room is the signature move of Meta's own MR showcases
(First Encounters' walls blowing open; see section 5). It is the clearest possible proof of "scene
understanding ... anchoring content to detected planes" (Technical criterion), and it gives every
match a ritual entrance (fighting-game framing, `META.md`). It happens at the start of a match, so a
judge sees it in their first two minutes. With passthrough off it means nothing: pure MR.

**How to build it.**
- **Find the wall.** In `match-system.ts` next to `tables()`, add `walls()` reading the same
  `queries.planes` (`orientation === 'vertical'`, `semanticLabel` matching `wall`). Cast a ray from
  the head through the arena centre, horizontally, and take the nearest wall polygon it hits within
  4 m (point-in-polygon in the plane's own space). Fallback with no wall: a point 1.6 m beyond the
  arena centre at head height. In the dimmed room (`dim` 0.25 at ready) a glowing ring in the dark
  reads fine without a wall.
- **The portal** (new `Portal` class in `visuals.ts`, world space, not under `root`): three meshes
  oriented to the wall normal, 1-2 cm off the wall: a black disc whose alpha is 1 in the middle
  (an opaque black hole in passthrough: the "hole in the wall" illusion), an inner cone/tunnel with a
  radial orange-to-black gradient drawn *behind* the disc's plane so parallax sells depth, and an
  additive ring of jagged crack lines (generated like `floorTexture`). It opens over 0.5 s (crack
  lines grow first), holds 1 s, closes over 0.4 s.
- **The flight.** In `toReady`, when `myPoints === 0 && theirPoints === 0`, start `this.entrance`:
  the rival's view (`theirView.root`) is driven along a parabola from the portal (converted with
  `root.worldToLocal`) to `rivalSpot()` over about 1.0 s, spinning, emitting `sparks.burst` with low
  strength every few frames (sparks are in root space; emit from the converted point). On landing:
  `impacts.hit`, `sparks.burst(..., 1)`, `playClash(1, ...)`, `roomLight.hit()`. The pinch for the
  rip is ignored until the landing (`updateReadyPinch` gate); `INTRO_TIME` (2.5 s) already covers it.
- **Sound.** A rumble (`tone(45, ...)` with noise), a crack, then a whoosh that follows the top: give
  this sound its own HRTF `PannerNode` placed at the portal and then moved with the top. This is the
  showcase for spatial audio after idea 1.
- Once per match only; a pinch skips it. The rival's colour (cyan) can tint the furnace light, so the
  portal is the rival's, and a later champion's portal can be bigger.

**Quest risks.** Wall labelling depends on Space Setup (every room that has one has walls; a room
without Space Setup uses the fallback point). A wall 3-4 m away makes a 15 cm portal tiny: size it to
subtend about 8° (radius = 0.07 × distance). An object flying toward the face is a comfort risk:
keep the arc above the table and ending in the far half of the arena, never closer than 50 cm to the
head, at under 3 m/s. Fixed foveation blurs the periphery: the portal sits straight ahead, so it is
in the sharp centre. +3 draw calls for 2.5 s only.

**Verify in IWER.** The `living_room` environment comes from `@iwer/sem`, which provides `XRPlane`s
with semantic labels (`HEADSETLESS-DEV.md`); confirm walls appear with a `[ENTRANCE] wall at ... /
fallback` log. Start a match (`drive.sh '["tap","play"]'`), record with `DRIVE_VIDEO`, and with
`scripts/emu.sh look` turned to the wall take shots at 0.3, 0.8, 1.3 and 2.0 s. Accept when the ring
sits flat on the emulated wall in front, the top's arc ends at its spawn, the rip is blocked until
it lands, and `[PERF]` shows the extra calls only during the entrance.

---

### 5. The heat wave, and the champion in your palm (M, 1 day)

**The moment.** You win the match. The final knockout plays out; then a **ring of warm light rolls out
from the arena across your whole room**, over the table, the floor and up the walls, as the dimmed
room comes back to full daylight behind it. Your top rises out of the arena; turn your palm up and it
hops into your hand, spinning down, and you set it on the champions' rim.

**Why it is wow.** Today a won match runs sparks round the rim (`celebrate`), a moment inside the
machine. The heat wave is the room celebrating. It uses the one light tool WebXR offers (passthrough
dimming) at full scale, and costs one uniform. The palm catch is a tactile closure: a reward you
physically receive, and a natural pause that tells a judge "the match is over".

**How to build it.**
- `room-light.ts`: add `uWave` (radius) and `uWaveK` (strength). In the shader, after `a`, using the
  distance from `uCenter` of the eye ray's hit on the table plane (or, for rays that do not hit it,
  the horizontal distance of the shell point): inside the wave front `a *= 0` (room bright),
  and a band at the front adds warm tint (`uTint`). `RoomLight.wave()` runs the radius from the rim
  to 3 m over 1.2 s. The shell is already a sphere around the head, so walls are covered.
- `match-system.ts` `finish`: when `decided && youWon`, call `roomLight.wave()` alongside
  `celebrate`; play `playLevelUp`-style swell (exists) plus a low whoomp.
- Palm catch (optional half): in `result` with `matchOver && won`, a `palmUp` check in `hands.ts`
  (palm normal from wrist, index and pinky metacarpals pointing up, hand still, over the near rim).
  The top (a clone of the champion view) arcs from the arena into the palm and spins there for 2 s,
  following the palm; then it flies to the champions' rim. Without a palm up within 3 s it goes there
  by itself.

**Quest risks.** A full-room brightness change is a comfort question for some players: it goes
*toward* normal (the dimmed room returns to daylight), never darker or flashing, and Calm mode keeps
the wave but drops the tint. Palm-up detection with hands on a table is reliable but fingers curling
can flip it: require 0.3 s of stability.

**Verify in IWER.** `?demo`, start a match, then dev key `O` or `K` until you reach 3 heat (each
knockout scores 2); shots at 0.2 s steps from a seated head pose aimed past the arena at the
room. For the catch, the driver's `move` step can place a hand palm up (`point: 'low'`; if the driver
cannot rotate a palm up, add a `palmUp` dev key). Accept when the wave visibly travels outward, the
room ends at the hub's brightness, and the top lands in the hand or on the rim.

---

### 6. Sparks on your table, light on the wood, marks of the fight (M, 1 day)

**The moment.** Clash sparks that fly past the pedestal **skip on your real desk** and die as tiny
embers on the wood; every hard hit splashes warm light across the table around the arena; a top that
crashes onto the desk leaves a glowing skid, a shatter leaves a scorch ring. By the end of a long
match your table carries the history of the fight; going home, the marks fade.

**Why it is wow.** The forge fantasy written onto the player's own furniture, continuous rather than
a single beat, and great texture for the video. It shares code with ideas 1 and 2.

**How to build it.** `TABLE-INTERACTION.md` section 4.2 has the step list: `Sparks.update(dt, floorAt)`
(sparks are created with `floor[i] = y`, the arena height, so they currently skip at the arena's
height even past the rim; the callback makes them fall to the table), a `DeskMarks` class (two
instanced quads, one atlas, 24 instances), and `RoomLight.hit(pos)` with `uFlashPos` so the hit flash
is a splash on the wood near the clash instead of a whole-room flicker. The splash is the bigger win
of the three and is a 30-line change.

**Quest risks.** +2-3 draw calls; keep char marks under 0.4 opacity so they read as burns, not
stickers. A mark under a real keyboard floats over it; it is small and short-lived.

**Verify in IWER.** `K` and `O` five times each in `living_room`; shots of the desk around the
pedestal from the seated pose (headset y 1.15, pitch -40). Accept when at least three marks are
visible after a shatter (glowing then dark), none inside the pedestal or off the table, the splash is
local, and draw calls rise by 3 at most.

---

### 7. The quench (S, half a day)

**The moment.** In the forge the room glows orange like a furnace (it already tints warm). You drop
your finished top into the quench slot: a violent **hiss**, a column of steam erupts from the rim, the
room **snaps to a cold blue** for a moment, then settles back to the hub's daylight as the forge folds
away. The top comes out dark steel, then its team colour returns.

**Why it is wow.** `PLAYTHROUGH.md` issue 14: "The quench is an instant cut back to the hub". The
quench is the forge's punctuation, and steel-hitting-water is a sound everyone knows. Turning the
room from hot to cold makes the forge feel like a place, not a menu. It costs little: the tint is a
colour, the steam is sparks with a different colour and gravity.

**How to build it.**
- `room-light.ts`: make `warm` a colour target instead of a boolean (`setTint(color)`), easing over
  0.3 s; add a slow flicker to the forge's warm tint (two sines, ±10%) so the room *breathes* like a
  fire while the forge is open.
- `forge.ts` `save()` / `match-system.ts` `leaveForge`: hold the fold-back for 0.8 s; spawn steam from
  a second `Sparks` instance with grey-white colours, negative gravity (rising), longer life and
  wider spread, a `hiss(0.9, 1.2, ...)` with a falling filter, then tint `#1a3a5a` for 0.3 s easing to
  none.
- The saved top: emissive black for 0.4 s, then its colour returns (the forge's emissive lerp).

**Quest risks.** Steam as additive streaks may look like sparks: draw them as larger, softer points
or reuse `SOFT_SHADOW` as a sprite texture, 10-16 sprites. +1 draw call for 1.5 s.

**Verify in IWER.** Hub → `tap forge` → `drag` the top to `quench` (driver targets exist). Record with
`DRIVE_VIDEO`; check frames at 0.1, 0.5 and 1.2 s. Accept when the steam rises, the tint flips warm →
blue → none, and the hub comes back after the beat.

---

### 8. Pick it off the desk (M, 0.75 day)

**The moment.** After your own top is thrown, it lies on the real desk where it fell. On the ready
screen you reach down, pinch it off the wood, and drop it back into the arena; it snaps home with a
clack and sparks. If you do not, it hops back by itself when you start the rip.

**Why it is wow.** Demeo's most praised MR feeling is picking pieces up off a real table by hand. It
proves the desk is real space, with the game's own carry verb. See `TABLE-INTERACTION.md` section 4.3
for the full plan (a souvenir clone, `GRAB_NEAR` from `hub.ts`, auto-return on the rip or after 10 s,
skip if out of reach per `reach.ts`).

**Quest risks.** Which top is in play: the spawn shows an empty breathing ring while the souvenir is
out. Nothing ever waits on it.

**Verify in IWER.** Needs a dev key that throws *your* top (`Shift+O`). Then `drive.sh '["drag",
[x,y,z], "play"]'` with the souvenir's world position from `["state"]` (add it to the state's
`targets`).

---

### 9. The turntable replay (M, 1 day)

**The moment.** The knockout replay (exists: 0.4x, stamped REPLAY) now plays while **the whole arena
turns slowly on its pedestal**, about 120°, so you watch the ramp throw from the rival's side, as if
the director cut to another camera. It turns back as the replay ends.

**Why it is wow.** A replay from the same angle you just watched adds little; a new angle is what
sports broadcasts and fighting games use. In MR the camera cannot move (and must not), but the
*diorama* can: moving the object, not the view, is comfortable, and it reads beautifully on video.

**How to build it.** In `playReplay`, ease a `replayYaw` from 0 to about 2.1 rad and back, applied to
`this.stage.rotation.y` (the stage already takes the arena's tilt; compose them) rather than `root`,
so the pedestal, rim UI and match bar stay put and only the floor, walls and tops turn. Pick the
direction that brings the knockout point toward the player. The REPLAY stamp and the bar stay
readable because they are not on the stage.

**Quest risks.** Rotating a large object in front of a seated player can cause mild vection if fast;
keep it under 60°/s with ease in and out, and skip it in Calm mode. Sparks and marks are in `root`
space and would not turn: hide marks during the replay, or parent sparks to the stage.

**Verify in IWER.** Throw the rival with your own ramp via the driver (`rip`, `ramp`; the replay only
runs for a knockout your own move caused). Record; check that the stage turns, the pedestal does not,
and a pinch skips both the replay and the turn.

---

### 10. The Crown looms (M-L, 1.5 days)

**The moment.** The Crown bout (Bastion, or the Forgemaster finale proposed in `META.md` 7). Instead
of a portal, a **top taller than the arena** rises behind the far rim, 40-50 cm high, spinning slowly
with a hum so low it is more felt than heard, its shadow falling across the arena. It tilts toward
you, then plunges into the arena, shrinking as it falls to fight size, landing with the biggest clang
in the game.

**Why it is wow.** Scale contrast is the thing MR does that a TV cannot: a familiar object far too big
for your table. It makes the final circuit an event, and it is the shot for the end of the trailer.
It ranks low only because a judge in 10 minutes will not reach the Crown unless the video or `?demo`
shows it.

**How to build it.** Reuse the rival's `TopView` geometry at a 7-8x scale on a separate group beside
`root` (one more top, about 10 draw calls for 4 s), a slow spin and precession, `SpinHum` with a very
low base pitch, a big contact shadow on the arena (`SOFT_SHADOW`), then a 0.8 s fall with an
exponential scale-down to 1x ending at `rivalSpot()`, using the entrance code from idea 4.

**Quest risks.** A large object close to the face: keep it behind the far rim (at least 1 m from the
head) and never above eye height. Frame time: transient.

**Verify in IWER.** A dev key or `?demo` save at the Crown; record the intro.

---

## 3. Evaluated and folded in, or rejected

| Idea | Verdict | Why |
|---|---|---|
| **HRTF spatial audio** for landings, the portal, the heat wave | Fold into 1, 4, 5 | The stereo panner (`audio.ts` `at()`) only maps arena x to left/right. One shared `PannerNode` (HRTF) helper, plus `AudioListener` position/orientation from the head each frame, is about 40 lines. It is wasted on sounds inside the 72 cm arena (all in front) but makes a clatter under the desk or a rumble from the wall land in the right place. Device-only to judge (`DONE.md`). |
| **The arena unfolding like a machine** | Exists (1.1 s rise from a glowing point); one cheap upgrade | Today it scales up uniformly. Staggering the parts (pedestal, then floor, then wall segments rising in sequence, each with a clank) is the "machine" read, 0.5 day. Lower wow than any moment above because it is already good. |
| **Tracing the real table edge** with a molten line during placement | Not now | Meta's MR guidance says not to visualise real surfaces, and a Space Setup rectangle 2-3 cm off is exposed by a line drawn on it (`TABLE-INTERACTION.md` idea 4). Revisit after device tests of polygon accuracy. |
| **A molten pour** forging a new part (a crucible tips, metal fills a mould, cools white → steel) | Optional, inside the arena | A nice unlock ceremony, but it happens inside the machine and fails the take-away test. If done, make the pour come *down from above the table* into the forge, 0.5 day. |
| **Slag drips through the pedestal** onto the real table as a glowing puddle | Merge into 6 as a mark kind | Cute; the SLAG finish has no outside-the-arena beat today. One more mark kind once `DeskMarks` exists. |
| **Touch the table anywhere** (a fingertip on the wood gives a thock and a glow ring) | Small, later | Good "haptics by sound and light", but it is ambient, it adds false-positive risk near the strike detector, and it does not make a memory. |
| **Catch a flying top** in mid-air | Reject | Fast hand motion blurs tracking (no Fast Motion Mode in WebXR), tops fly toward the face (comfort), and it changes the round. The palm catch in 5 is the safe version. |
| **Scale changes** (lean in to enlarge the arena, pick the arena up) | Reject | Changes the reach rules the game is tuned for (`reach.ts`) and the arena is placed by touch; the Crown (10) gets the scale wow without touching play. |
| **Table slam / real objects as bumpers / depth physics** | Reject | Covered in `TABLE-INTERACTION.md`: no Fast Motion Mode, GPU-only depth, furniture boxes rarely labelled. |

---

## 4. Build order, and the judge's 10 minutes

Order: **1 → 2 → 6 → 4 → 7 → 5 → 3 → 8**, then 9 and 10. About 7.5 days for 1-8; 1, 2 and 6 share
the surface code and sounds and should be built together (2.5 days).

What a judge then meets, in order, with no menu:

| Minute | Beat | Moment |
|---|---|---|
| 0:30 | Palm on the table, the arena forges up, the room dims | exists |
| 1:00 | VS: **a portal burns open in the wall, the rival flies in** | 4 |
| 1:30 | The rip; the hand's shadow on the floor shows where the pinch lands | 3 |
| 2:00 | First ramp knockout: slow motion, **the rival skates across the desk and drops off the edge** | 1 |
| 2:10 | Replay from the other side | 9 |
| 2:30 | Your top thrown later lies on the wood; **you pick it up** | 8 |
| 3-5 | Sparks skip on the table, the wood collects scorch marks | 6 |
| 5-6 | Second match: the strike; **a molten handprint on the desk** | 2 |
| 6-7 | Forge: the room breathes orange; **the quench, steam and cold blue** | 7 |
| 8-9 | Match won: **the heat wave rolls over the room, the champion lands in your palm** | 5 |

Trailer: 1 is the cold open (`SUBMISSION.md` 0:00), 4 is the title beat, 5 the end card.

Guard rails for all of them:
- **No sim change.** Every moment is visual and audio; `check:sim` and the reports must stay identical.
- **No new gesture** except the optional palm-up catch, which is never required.
- **Skippable and short.** A pinch skips 4, 9 and 10; none blocks play for more than 1.5 s.
- **Calm mode** (`comfort.ts`): no tints or waves flashing; 9 off; 4 and 5 keep their motion but drop
  colour flashes.
- **Tray fallback**: 1, 2, 6 and 8 need the table polygon; on the tray they fall back to today's
  behaviour. 4 falls back to a portal in the dark beyond the arena. 5, 7 and 9 work anywhere.
- **Draw calls**: at most +3 at any time in a fight (6), transient +3 (4) and +10 (10) during intros.

---

## 5. What shipped MR games do (research)

Gathered by web search on Oct 8, 2026. Where only a search snippet was read, it says so.

| Game | Signature MR / hands moment | What SpinSmith takes from it | Sources |
|---|---|---|---|
| **First Encounters** (Meta, bundled with Quest 3) | A ship crashes through your real ceiling; creatures blast holes in your real walls, and shooting widens them into an alien world. The Verge: "the single most fun MR experience I've had so far". | The room as a container that breaks open: idea 4 (portal in your wall). | [TechRadar](https://www.techradar.com/computing/virtual-reality-augmented-reality/i-am-a-huge-vr-nerd-and-these-are-the-7-meta-quest-3-apps-im-downloading-first), [UNIT9](https://unit9.com/project/meta-first-encounters), [Meta success story](https://developers.meta.com/horizon/discover/success-stories/first-encounters/) |
| **Synth Riders** (MR) | Punches open a section of your real wall into its world. | Same pattern, idea 4. | [UploadVR best MR games](https://www.uploadvr.com/best-mixed-reality-games-quest-3/) |
| **Drop Dead: The Cabin**, Home Invasion | Virtual windows and doors appear on your real walls; zombies break in through them, so your home is under siege. | Threats arriving *from* the room, not spawning in the play space: idea 4. | [MIXED](https://mixed-news.com/en/home-invasion-hands-on/), [VRScout](https://vrscout.com/news/drop-dead-the-cabin-is-getting-a-mixed-reality-mode/) |
| **Starship Home** | Your walls become spaceship windows; during a hyperspace jump the *whole real room* turns the tunnel's colour. Reviewers half expected the portholes to remain after taking the headset off ("my first mixed-reality 'wow' moment"). | Room-wide colour at the climax: ideas 5 (heat wave) and 7 (quench, hot to cold). | [ISPR / Android Central](https://ispr.info/2024/09/27/starship-home-i-just-had-my-first-mixed-reality-wow-moment-on-the-quest-3), [MIXED](https://mixed-news.com/en/?p=26634), [UploadVR on design](https://www.uploadvr.com/how-creature-approached-mixed-reality-design-challenges-with-starship-home/) |
| **Cubism** (MR mode) | The puzzle snaps to your real desk, its menu lies flat on the tabletop (real touch feedback), pieces cast shadows on the desk and, per UploadVR's list, "bounce off the table and the books surrounding them". | Shadows and contact ground virtual objects: idea 3 (hand shadow), ideas 1 and 6 (things that land on the desk). | [UploadVR](https://www.uploadvr.com/cubism-quest-3-update/), [UploadVR best MR](https://www.uploadvr.com/best-mixed-reality-games-quest-3/), [MIXED review](https://mixed-news.com/en/cubism-review-beautiful-3d-puzzler-now-with-mixed-reality-mode/) |
| **Demeo / Demeo x D&D Battlemarked** | The board moves onto your mapped table, resizes to fit, its borders fade into the table; you pick miniatures up and roll dice by hand; reviewers single out reaching out to move heroes "like at a real game night". | Hands taking pieces off a real table: idea 8. SpinSmith already fits the arena to the table. | [UploadVR](https://www.uploadvr.com/best-mixed-reality-games-quest-3/), [Android Central](https://androidcentral.com/gaming/virtual-reality/i-played-virtual-dandd-on-a-real-table-with-the-quest-pro-and-it-was-amazing), [Battlemarked review](https://www.useapotion.com/2026/02/demeo-x-dungeons-dragons-battlemarked-review-the-vr-tabletop-crossover-of-our-dreams/) |
| **Spatial Ops** | Enemies come out from behind your furniture; bullets hit real walls and grenades bounce off the kitchen counter (scene mesh collisions). | Physics that respects real geometry: idea 1 (the desk edge). | [MIXED](https://mixed-news.com/en/spatial-ops-game-modes/), [MIXED](https://mixed-news.com/en/meta-quest-3-spatial-ops-quest-store-release-window/) |
| **Laser Dance** | Your room becomes a laser course fitted to its layout and your body; you place the buttons on two real walls; furniture is cover (Heise, snippet only); watching a friend crawl is "the real show". | Setup as authorship; moments that look good to an onlooker (the trailer). | [UploadVR review](https://uploadvr.com/laser-dance-early-access-review), [Heise](https://heise.de/-10860484) |
| **Thrasher** | Not MR. You steer a space eel like a ribbon dancer, even with one finger; the slight lag of hand tracking gives the creature weight; reviewers preferred hands to controllers. | Hands win on feel, not precision: no fast-catch verbs (section 3), lean on smoothing (idea 3). | [Voices of VR](https://voicesofvr.com/?p=14033), [Press Start](https://press-start.com.au/reviews/2024/07/23/thrasher-review-rhythmic-gymnastic-violence/) |
| **Mini golf on a table** | No documented "ball rolls off the real table" moment was found. GOLF+ added an MR mini-golf mode on the scene mesh; House of Golf builds holes around the room. *Tiny Golf* is the 2025 Start competition's Best Casual winner (`BRIEF.md`: one pinch verb on your real table, plus a course builder); no press coverage of a signature moment was found. | An open lane: nobody shipped "it falls off your real table" as a moment, so idea 1 is distinct. | [UploadVR](https://www.uploadvr.com/mixed-reality-mini-golf-quest-3-tease/), [House of Golf](https://queststoredb.com/game/house-of-golf-vr-9013007132099615/), [Devpost: Tiny Golf](https://devpost.com/software/tiny-golf) |
| **Miracle Pool** | A reviewer forgot the virtual pool table was not real and tried to lean on it. | How strongly a well-grounded table object convinces. | [MIXED](https://mixed-news.com/en/miracle-pool-hands-on-meta-quest-3/) |
| **Pencil Pals** | Not found. The closest is *Pencil* (Meta 2024 Presence Platform hackathon winner): real paper and a real pencil with projected guides. | Real touch is free in MR: idea 2 (the slap on a real table leaves a mark). | [MIXED](https://mixed-news.com/en/learn-to-draw-on-real-paper-with-this-ingenious-mixed-reality-app-for-quest-3/), [UploadVR](https://www.uploadvr.com/a-case-for-pencil-why-physical-drawing-is-better-in-mixed-reality-2/) |
| **LEGO Bricktales** (counter-example) | The diorama sits on your rug or table at LEGO scale, but reviewers call it "plain passthrough" because nothing reacts to the room. | What SpinSmith risks today: the room is a backdrop during the climaxes. | [FutureFive](https://futurefive.co.nz/story/game-review-lego-bricktales-meta-quest-3) |
| **Silent Slayer** | A vampire's coffin in your real room; noise or a shaky hand wakes it (Meta Quest awards for Horror and Puzzle). | Tension from the player's real hands. | [MIXED review](https://mixed-news.com/en/silent-slayer-review/) |

**Meta's guidance.**
- *MR Design: Scene*: put objects on real surfaces, add shadows, let objects bounce off floors and
  walls, use labels to dress the room; show detected surfaces as little as possible (a brief animated
  outline can build trust). [Meta](https://developers.meta.com/horizon/design/mr-design-scene/)
- *Mesh and Depth API*: occlusion keeps content from looking like a sticker; within about 0.2 m and
  for hands near the headset, fade instead of relying on depth.
  [Meta blog](https://developers.meta.com/horizon/blog/mesh-depth-api-meta-quest-3-developers-mixed-reality)
- *Passthrough relighting* (MRUK, native only): virtual objects cast shadows onto and light up the
  real room. In WebXR the same read comes from passthrough darkening, which `room-light.ts` already
  uses. [MIXED](https://mixed-news.com/en/meta-quest-3-passthrough-relighting-figmin-xr/),
  [Meta: passthrough design](https://developers.meta.com/horizon/resources/mr-design-passthrough/)
- No public Meta criteria for what gets featured were found; Meta points developers to its
  showcase samples Phanto (scene mesh, passthrough, depth) and Discover.
  [Meta blog](https://developers.meta.com/horizon/blog/start-developing-Meta-Quest-3-tips-performance-mixed-reality/)

**Patterns, and how the ranked list maps to them.**
1. **The room breaks open** (First Encounters, Synth Riders, Drop Dead, Starship Home): idea 4, and
   10 as its late-game sequel.
2. **Room-wide light at the big beat** (Starship Home's hyperspace, relighting): ideas 5 and 7.
3. **Respect for real geometry**: snapping, shadows, bouncing off real things (Demeo, Cubism, Spatial
   Ops); no reaction gets called a gimmick (Bricktales): ideas 1, 3, 6.
4. **Real touch for free** (Cubism's flat menu, Pencil, Miracle Pool): ideas 2 and 8.
5. **Hands win on feel, not precision** (Thrasher): no fast catches; smoothing and forgiving timing.
