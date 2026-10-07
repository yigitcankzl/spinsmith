# SpinSmith: extra points beyond the current build list

Written Oct 7, 2026. Feature freeze Fri Nov 6; deadline Nov 18.

This doc assumes six items are already being built, in this order:
1. Ramp on pinch.
2. Hand occluder, room dimming and a desk light.
3. Off the edge.
4. Cup & Sling.
5. Press to forge.
6. A music loop and a win stinger.

It does not propose those six again. It asks one question: **once those six are done, where are
judges' points still lost, and which other small jobs win them back for the least time?**

Sources:
- `docs/SCORECARD.md` and the other review docs.
- A read of `src/game/`.
- `npm run report:shaping`, run today. It already has the realistic-player rows: human ramp on
  pinch 53%, against 46% for no shaping.
- The web research in section 4.

No source file was changed.

---

## 1. Where points are still lost after items 1-6

### 1.1 Estimate per criterion

The baseline is the scorecard's re-score without the headset and submission gaps (5.9). That
re-score assumes the game is verified on a Quest and that a competent video, link and cover
exist. The "after 1-6" column assumes each item ships at the level its plan doc describes and
passes its device check.

| Criterion | Baseline (verified) | After items 1-6 | Why it moves | What still caps it |
|---|---|---|---|---|
| Innovation & Creativity | 6.5 | **7.5** | The room now matters. You press your desk to forge, tops fall off the real table edge onto the floor, and your real fingers shape the floor. The cup and sling is a second verb no top game has. This mostly passes the "take it away" test. | The genre is still Beyblade's. Rivals show none of the new verbs in a personal way. |
| Experience Design | 6.0 | **7.0** | Shaping finally decides rounds: 53% → about 57-61% with the cup. Fewer "thock... nothing" ramps, and shorter rounds. | Teaching is still by text card (`match-system.ts:677-680`, `:1554`, `:1564`). The rival is random launches plus one rule. There are no options for different bodies. Feedback is thin without haptics. |
| Technical Implementation | 6.0 | **6.8** | The occluder, the table polygon, calibration by touch and the light pool are real platform work. | `anchors` and `meshDetection` are still requested but unused. The 2.5 MB chunk. Everything depends on device time. |
| Polish & Presentation | 5.0 | **5.8** | Music and a stinger, a dimmed room and a lit desk. | Tops fill about 3-4% of the frame (`docs/review/fight.png`: about 25 px each in an 800 px frame). The rival has no face. Text cards remain. The sound has no motif. There is no capture plan for the video's hero shots. |
| **Mean** | **5.9** | **≈ 6.8** | | |

Special awards after items 1-6:

| Award | Score | Why |
|---|---|---|
| Best First Five Minutes | 6.5 | Press to forge is a real "wow". But the award text asks for teaching "without a wall of text", and we still teach with text. |
| Boldest Original Concept | 6.5 | The table edge and the desk press help. The core is still a top battler. |
| Best Reason to Come Back | 5.0 | Unchanged. |
| Accessibility | 3.0 | Unchanged: no options at all. |

### 1.2 The leaks that remain, ranked

1. **Judges cannot see the fight.**
   - The tops are about 12 cm across in a 72 cm arena (ring radius 0.024-0.03 m × 2.4). At
     seated distance, and on a downscaled video, the clash, the cup catch and the sling read as
     dots.
   - This costs Polish and, through the video, everything else.
2. **Teaching by text.** Every new verb (rip, ramp, cup, sling, press) arrives as a one-line
   card. Meta's hand-onboarding guidance says to use animated ghost hands instead. The Best First
   Five Minutes award uses the same words.
3. **The rival is a stat block.** `RIVALS` in `parts.ts:280` holds a name, a build and a style
   string. The launch is random (`match-system.ts:1252-1263`), and the shaping is one rule. No
   rival has a plan, an intro or a sound, which costs Experience and the Come Back award.
4. **No feedback channel replaces haptics.** Pinches, catches and charge refills mostly have
   sound or visuals, but not both, and not always.
5. **Accessibility is zero.** There is no assisted launch, no text size and no speed option.
   Colour is the only side cue.
6. **No hero-shot plan for the video.** The money shots exist only as luck in normal play: the
   table-edge throw, the sling into slag, real fingers on the clay. Nothing makes them
   repeatable or reviewable.
7. **Audio identity.** Item 6 adds a loop and a stinger. A motif that ties the stinger, level
   up, rival intro and order stamp together, plus real metal transients, is the difference
   between "has music" and "sounds like SpinSmith".
8. **Nothing to carry out of the headset.** There is no share code, no result line and no
   replay.

---

## 2. Extra improvements, ranked by score gain per day

**How the ranking works.**
- Gain is the expected change in the **mean** of the four criteria, divided by the days of work.
- Ties are broken by special-award value; each award is worth $25k.
- Gains assume items 1-6 are in.
- Sizes are for the developer with one AI assistant, matching the pace of WP1-13.

| # | Extra | Days | Quest? | Main gain | Mean gain | Per day |
|---|---|---|---|---|---|---|
| 1 | Readability pack: footprints, trails, fight focus | 1.25 | no (check fps) | Polish +0.3, Exp +0.2, A11y +1 | +0.13 | 0.10 |
| 2 | Ghost-hand teacher (no text cards) | 1.5 | tune only | Exp +0.3, Polish +0.1, **FFM +1.0** | +0.10 | 0.07 + award |
| 3 | Capture kit and hero-shot plan | 0.75 | capture yes | Polish +0.3 (via the video) | +0.08 | 0.10 |
| 4 | Feel without haptics | 0.75 | tune only | Exp +0.15, Polish +0.15 | +0.08 | 0.10 |
| 5 | The judge's ten minutes (landing, notes, description) | 0.5 | no | Stage One safety, Exp +0.1, Polish +0.1 | +0.05 | 0.10 |
| 6 | Rival personalities: plans, intros, motifs | 1.5-2 | no | Exp +0.3, Polish +0.2, Innov +0.1, Come Back +0.3 | +0.15 | 0.08 |
| 7 | Decisive-moment replay | 1.5 | no | Polish +0.2, Exp +0.2, Innov +0.1 | +0.13 | 0.08 |
| 8 | Audio identity: motif and CC0 metal | 1 | mix only | Polish +0.25 | +0.06 | 0.06 |
| 9 | Smith's settings: assisted launch, large text, calm fight | 0.75-1.25 | left-hand pass | Exp +0.15, **A11y 3 → 5.5** | +0.04 | 0.04 + award |
| 10 | Forged out of the table: the first 30 s | 1 | yes | FFM +0.5, Polish +0.15, Innov +0.1 | +0.06 | 0.06 + award |
| 11 | Smith card: share code and duel link | 1.5 | no | Come Back +0.5 | +0.02 | 0.01 + award |
| 12 | Hero silhouette pass on the tops | 1.5 | no | Polish +0.2 | +0.05 | 0.03 |

Details for each follow.

---

### Extra 1. Readability pack: make the fight visible at 60 cm and on video

**What it is.** Four cheap layers that make each top's footprint and motion bigger without
changing its size or the simulation:

- **Footprint ring.** A flat decal under each top, about 1.7 × the ring radius, in the owner's
  colour. It carries a **shape cue as well as colour**:
  - the player's ring is notched like a chevron and points along the direction of travel;
  - the rival's is a plain double ring.

  It doubles the visual footprint, shows heading at a glance, and is the colour-blind cue
  (VRC.6).
- **Short motion trails.** A ribbon of the last ~0.25 s (12 samples) in the owner's colour.
  Its opacity follows speed, so a fast striker leaves a streak and a stamina top a faint arc.
  A trail is the main way a 6 cm object reads as "moving fast" on a 1080p video.
- **Stroboscopic blade disk.** At high spin the existing blur halo (`TopView.blur`) gets a
  canvas texture with N sectors, one per blade (3 for Striker, 6 for Anvil, 4 for Halo). It is
  rotated at an aliased rate, so the silhouette stays readable as a slowly turning star instead
  of a smeared disc.
- **Fight focus.** During the fight phase:
  - the Menu button, the dock and anvil labels and the far-rim chrome fade to about 40%;
  - the near-rim props drop their idle pulses.

  The eye goes to the floor. This works with item 2's room dimming: same timing, one fade
  curve.

**Gain.**
- Polish +0.3 and Experience +0.2: you can see why you won.
- Accessibility +1: not colour alone.
- It makes every later video shot better.

**Evidence and precedent.**
- In Meta's own guidance, readability for tabletop MR comes from object affordance, not UI. Table
  Troopers' units "function like board game pieces"
  ([Table Troopers](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)).
- Game-feel practice says every action needs one primary and one secondary feedback
  ([eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)).
- "Do not convey essential information by colour alone"
  ([Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/full-list/);
  [Meta VRC.6](https://developers.meta.com/vr/design/accessibility-checklist/)).
- Trailer guides: readable action first
  ([presskit.gg](https://presskit.gg/field-guides/game-trailers-screenshots-guide)).

**Implementation.**
- **Where it lives.** `visuals.ts` `TopView`:
  - Add a `footprint` mesh next to `shadow`. It is the same plane geometry with a canvas texture
    drawn once per side, so there are two shared materials in all.
  - Add a `Trail` class beside `Sparks`: a preallocated `BufferGeometry` with 24 vertices, a
    triangle strip updated in place, one draw call per top.
  - Feed it from `TopView.update()` with the top's arena-space position. Never allocate in the
    update.
- **The blade disk:** set `blur.material.map` to a sector texture. Rotate it at
  `spin * k mod (2π / blades)` so it aliases on purpose.
- **Fight focus:** one `focus` scalar (0..1) in `match-system.ts`, eased over 0.4 s when the
  phase becomes `fight`. It multiplies the opacity of the props listed in `hub.ts` and `rim.ts`.
  Use the same easing as item 2's dimming.
- **Optional knob:** `TUNE.scale` already exists (`tuning.ts`). On the device, test 2.4 against
  2.7 (tops about 12% larger). Only change it if the reach checks in `reach.ts` (§16) still pass;
  otherwise leave it.
- **Cost:** about +4 draw calls in a fight (108-112 today). Check frame time in the device
  protocol.

**Size:** 1.25 days. **Quest:** no, apart from a frame-time check.
**Risks:**
- Trails on a top that falls off the table must stop at "out". Reset the trail in `outT`
  handling.
- Additive overdraw. Keep trails thin.

---

### Extra 2. Ghost-hand teacher: replace the text cards with animated hands

**What it is.** A translucent hand that **performs** each verb at the exact spot where it
matters, looping until the player does it once. When the player does, the ghost dissolves with a
reward sound and the payoff plays. It covers:
- the first carry to the dock;
- the rip: pinch over the arena, pull back, let go;
- the first ramp: pinch beside the rival, drag outward;
- the cup and the sling, after item 4 (press ahead of the rival, then pinch the caught top, pull,
  release);
- the desk press, after item 5.

Text shrinks to at most a 2-3 word plate ("Pull back", "Press the desk"), or disappears.

**Gain.**
- **Best First Five Minutes +1.0.** It is the award's own wording: "teaches controller-free
  interaction without a wall of text".
- Experience +0.3, Polish +0.1.
- It is also a video shot: the ghost demonstrates, the real hand copies it.

**Evidence.**
- Meta's hands onboarding guide: "Demonstrate gestures visually with animated hand
  demonstrations: outlines of 3D hands that animate naturally to show the gesture". It also says
  to teach "one or two gestures at a time", give "a gameplay payoff" before the next one, and
  keep text "short and to the point"
  ([Meta hands onboarding](https://developers.meta.com/horizon/design/hands-onboarding-best-practices/)).
- The special-awards text
  ([Devpost](https://start-developer-competition-26.devpost.com/details/special-awards)).
- Table Troopers: "the first screen demonstrates the core mechanic immediately"
  ([Meta](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)).

**Implementation.**
- **No asset file is needed.** The emulator package already ships real joint transforms for three
  hand poses, under the MIT licence from Meta:
  - `node_modules/iwer/lib/device/configs/hand/relaxed.js`
  - `node_modules/iwer/lib/device/configs/hand/pinch.js`
  - `node_modules/iwer/lib/device/configs/hand/point.js`

  These are `jointTransforms[joint].offsetMatrix` for the 25 WebXR joints. Copy the three pose
  tables into a new `src/game/ghost-poses.ts`, keeping the MIT header and the source path.
- **The hand itself:** a new `src/game/ghost.ts` `GhostHand`:
  - one `InstancedMesh` of 25 joint spheres plus 24 bone capsules, so one draw call;
  - an additive, fresnel-ish pale material at about 35% opacity, in a neutral steel-white (not
    the rival's cyan).
- **Animation:**
  - The pose is a per-joint slerp between relaxed, pinch and point.
  - The wrist follows a keyframed path in arena space, given as a few `[t, pos, pose]` tuples
    per lesson. For example, the rip: hover over the launch spot, pinch, move 15 cm toward the
    player, open.
  - Mirror the hand on X for left-handed players; use the last hand that pinched (`hands.ts`).
- **Hook-up:** `match-system.ts` `updateGuide()` and the lines that set guide labels
  (`:677-680`, `:1554`, `:1564`). Each guide state picks a lesson instead of a sentence.
- **During the rip lesson,** drive a faint `Cord` (`visuals.ts:1275`) from the ghost's pinch
  point, so the cord teaches too.
- **Hand-off:** the moment the real hand performs the verb (the existing `[SHAPE]` and launch
  events), fade the ghost over 0.2 s, play `playUnlock()` at low gain, then the payoff.
- **Coordinate with item 4, step 6.** It rewrites the first-session guide to "poke ahead of the
  rival" and "pull back to sling", so build the ghost after that step lands.

**Size:** 1.5 days. **Quest:** for tuning only (path speed, opacity in passthrough).
**Risks:**
- A ghost hand overlapping the real hand is confusing. Fade it when the real hand comes within
  8 cm.
- The pose data's coordinate frame needs a one-off check in IWER.

---

### Extra 3. Capture kit and hero-shot plan

**What it is.** A small dev-only mode, plus a shot plan built around items 1-6:
- `?capture` hides:
  - the Menu button;
  - `[PERF]`, `[LABEL]` and the other dev logs;
  - every label except the cause line, which it enlarges;
  - the guide rings after the first session.
- A dev key **freezes the sim** on the current frame (the sim is deterministic and `vdt` already
  exists, `match-system.ts:555`). Use it for the cover still and the end card.
- `?capture&seed=N` fixes the random rival launch (`Math.random` at `:1256-1257`) to a seeded
  generator. The same opening can then be retaken until the real play produces the shot. It
  is real gameplay, retaken, which the rules allow: "real gameplay that honestly represents the
  experience".
- **The shot plan** (it replaces the first rows of the `SUBMISSION.md` storyboard):
  1. **0-5 s, cold open:** the rival is slung off the real table edge, falls and clatters on the
     real floor (items 3 and 4).
  2. **5-12 s:** a palm on the desk, the arena forges up, the room dims (items 5 and 2).
  3. **12-20 s:** real fingers over the clay pinch a ramp (items 1 and 2).
  4. **20-30 s:** a cup catch, the aim line, the sling, slow motion, the replay (extra 7).
  5. Then the forge, the rival intro and the stinger.

  Framing:
  - Lean in to 35-40 cm and lower the head, so the tops take at least 15% of the frame width.
  - Keep the head still (Meta's capture playbook).
  - Crop to 16:9 in the edit.
  - Capture on a Quest 3.

**Gain:** Polish +0.3 through the video. The video is the first thing a judge sees, and the
scorecard calls video legibility the main Polish loss.

**Evidence.**
- Trailers have about 5 s to hook; open on gameplay, not logos
  ([presskit.gg](https://presskit.gg/field-guides/game-trailers-screenshots-guide),
  [wnhub](https://wnhub.io/news/analytics/item-237)).
- Meta's capture playbook: storyboard the key MR moments and capture on a Quest 3
  ([Meta capture](https://developers.meta.com/horizon/resources/video-capture-mr-vr/),
  [Meta blog](https://developers.meta.com/horizon/blog/best-practices-vr-mr-app-captures-meta-quest-developers/)).
- The rules on real gameplay
  ([judging](https://start-developer-competition-26.devpost.com/details/judging)).

**Implementation.**
- **Flags:** read in `match-system.ts` next to the `?demo` and `?fresh` handling (`demo-save.ts`).
- **Seeded RNG:** a 10-line mulberry32 in `tuning.ts`, used only for the rival launch and the
  rival spot.
- **The freeze:** a `captureFreeze` flag that sets `vdt = 0` but keeps rendering.
- Keep all of it behind `import.meta.env.DEV || params.has('capture')`, so judges never hit it.

**Size:** 0.75 day, plus the capture days already planned. **Quest:** for the capture.
**Risks:**
- None technical.
- Do not add any visual the game lacks: honesty is part of the rule.

---

### Extra 4. Feel without haptics

**What it is.** Hands have no rumble, so every touch needs a sound **and** a visual:
- **Pinch confirm.** On every pinch start that grabs something (a top, a part, the floor, a
  cup), play a 30 ms high "tick" and a tiny spark at the pinch point. On a pinch that grabs
  nothing, play nothing. That silence teaches what is grabbable.
- **Hover light.** A fingertip within grab range of an interactable lights its rim.
- **Tracking warning.** When a hand's joints jump implausibly, or stop updating for over 50 ms
  mid-gesture, tint the fingertip glow red. This is Table Troopers' "tint the hands a bit red"
  before tracking fails.
- **Arena jolt, not camera shake.** On a hard hit (`HARD_HIT`), the arena root jitters 1-2 mm
  for 60 ms. Never move the camera: comfort.
- **Ramp and cup moments:**
  - a dust ring at a ramp's base;
  - a ripple across the floor's vertex colours when a cup opens;
  - a charge refill as an ember flying from the clash point to the pip, with a soft chime.

**Gain:** Experience +0.15 and Polish +0.15. Meta VRC.3 asks for multimodal feedback.

**Evidence.**
- Meta's onboarding guide says to provide "visual feedback" because "hands provide no haptic
  feedback the way a controller does"
  ([Meta](https://developers.meta.com/horizon/design/hands-onboarding-best-practices/)).
- VRC.3, "multiple cues"
  ([checklist](https://developers.meta.com/vr/design/accessibility-checklist/)).
- Table Troopers' red-tint warning and intent inference
  ([Meta](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)).
- Cubism lights the gripping fingertips and turns the hand red when it is poorly tracked
  ([UploadVR](https://uploadvr.com/cubism-hand-tracking-update-oculus-quest/)).
- Hit stop of 0.05-0.1 s and small shake
  ([eastondev](https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/)).

**Implementation.**
- **Pinch state:** `hands.ts` `HandInput` already tracks pinch state and tips.
- **Tick sound:** add `playTick()` to `audio.ts`, using the existing `tone()`.
- **Spark:** reuse `Sparks.burst` at low count.
- **Tracking warning:** compare joint positions frame to frame in `hands.ts`, with a fixed
  buffer and no allocation.
- **Arena jolt:** offset the arena view's root in `match-system.ts` where `hitStop` is set
  (`:1439-1444`).

**Size:** 0.75 day. **Quest:** to tune the red-tint threshold.
**Risk:** the red tint must not flicker. Use hysteresis: 3 bad frames on, 10 good frames off.

---

### Extra 5. The judge's ten minutes

**What it is.** No new features, just making sure a judge with one link and ten minutes finds
the good parts:
- **The landing page** (`index.html`) gets:
  - one real gameplay still (from extra 3);
  - three icons: sit at a table, controllers down, allow spatial data;
  - a line: "Everything is a pinch, a pull or a press."
- **`TESTING-NOTES.md`** gets a top block called **"What to try in 10 minutes"**:
  1. press your desk;
  2. ramp at the glowing ring;
  3. cup the rival, then sling it;
  4. forge the new tip.

  Add `?demo` for later content and one sentence on accessibility options (extra 9).
- **The Devpost description** opens with the room-dependent verbs (desk press, table edge, real
  fingers) and uses the four criterion names as headings, with one paragraph each.
- **A cold-start check** from a clean browser on another network. It is already in
  `ACTION-PLAN.md`; keep it.

**Gain:**
- This guards Stage One, the pass/fail viability check.
- Experience and Polish +0.1 each, because judges actually reach the cup and the forge.

**Evidence.**
- Devpost advice: put "the info the judges need front and center", and address the judging
  rubric explicitly ([dev.to](https://dev.to/jacklyn/how-to-make-your-devpost-submissions-not-suck-37i0)).
- Missing or broken try-it links are a classic loss
  ([MLH](https://guide.mlh.io/general-information/judging-and-submissions/hackathon-submission-portal/using-devpost)).
- Meta: put controllers away at the start
  ([Meta](https://developers.meta.com/horizon/design/hands-onboarding-best-practices/)).

**Size:** 0.5 day. Do it after the freeze if needed: it is text, apart from the landing image.
**Quest:** no.
**Risk:** none.

---

### Extra 6. Rival personalities: a plan, an intro and a motif for each rival

**What it is.** Each rival keeps its build, and gains three things:

1. **A readable plan.** Only launch choice and shaping can change, because the sim has no
   steering:
   - **Rim Raider:** a hard, flat launch aimed at your top, and an early ramp. It tells you it
     is coming.
   - **Iron Keep:** a soft launch to the centre. It opens a cup in the middle whenever your top
     comes near, from level 1 but rarely, and is slow to sling. This teaches the cup by using it
     on you.
   - **Drifter:** a wide, slow launch into a long orbit. It never shapes, and it wins by
     outlasting.
   - Later rivals: Leech (spin steal), Hookjaw (the ramp it has today), Sawtooth (ramps you into
     the wall to chip you), Bastion (cups and waits).
2. **A 2-second intro** that replaces the "Rival: Iron Keep · heavy center holder" card:
   - The rival's top drops onto the far rim, spins up, and performs its tell. Iron Keep thumps
     into the centre and a cup ring pulses. Rim Raider laps the rim once at full speed. Drifter
     floats a slow wide arc.
   - Then it returns to its spot.
   - A medallion with its name and **one icon** (sword, shield, infinity) replaces the style
     sentence. This is the fighting-game "versus" beat, but diegetic.
3. **A motif.** Two or three notes in the rival's own interval, played at the intro and again
   when it scores. This uses the motif system from extra 8.

**Gain:**
- Experience +0.3: the player learns "how do I beat Iron Keep".
- Polish +0.2, Innovation +0.1.
- Come Back +0.3: medallions now point to a personality.
- It answers the scorecard's "the rival is thin" and its "path to 8" item: "rivals with
  recognisable personalities".

**Evidence.**
- Versus screens and pre-fight intros exist to set up a match-up and amp the player
  ([Street Fighter 6](https://www.pushsquare.com/news/2022/06/literally-face-off-against-opponents-in-street-fighter-6-with-interactive-versus-screen),
  [Versus splash trope](https://tropedia.fandom.com/wiki/Versus_Character_Splash)).
- SF6's select screen shows "character type, effective range, ease of use" at a glance
  ([EventHubs](https://eventhubs.com/news/2023/may/03/sf6-css-animations-unique-heart)).
- The scorecard's own fix list, weakness 4.

**Implementation.**
- **Data:** add a `plan` field to `Rival` in `parts.ts:271`, a small record such as
  `{ launch: 'hard-at-you' | 'soft-centre' | 'wide', shape: 'early-ramp' | 'centre-cup' | 'none' | ..., icon, motif }`.
- **Launch:** `match-system.ts` uses the plan in the rival-launch block (`:1252-1263`), which
  today is random. Keep the level-based `skill` scaling.
- **Shaping:** `rivalShaping()` (`:1367-1379`) switches on `plan.shape`. Item 4 step 6 already
  gives this function a cup rule from level 10. Instead, gate the cup by plan, at a low rate for
  Iron Keep.
- **Balance:** `shaping-report.ts` gets one row per first-session rival ("none vs Iron Keep
  plan"). The target is unchanged: 36-42% for a non-shaper against any rival.
- **Intro:** a 2 s scripted `TopView` path in the `ready` phase, before the existing intro
  timer (`INTRO_TIME`, `:66`). The medallion art can reuse `board.ts`'s medallion drawing.

**Size:** 2 days, or 1.5 days for the first three rivals only. **Quest:** no.
**Risk:**
- Balance. Keep the report gate.
- Do not let plans make the first match harder. Keep `first` launches steady, as today.

---

### Extra 7. Decisive-moment replay

**What it is.**
- When a round is decided by a shape or a sling (the cause line already detects this,
  `match-system.ts:1515`), the slow motion is followed by an **in-arena replay**:
  - the last 2 s play again at 0.5× with the tops drawn as glowing ghosts;
  - the deciding ramp or cup is redrawn as a ghost mark;
  - a "REPLAY" plate sits on the far rim.
- One pinch skips it. It plays at most once per match, for the best moment.

This is the "play of the game" for a 15-second round. A judge sees *why* their move worked, and
the video gets a second look at its best shot.

**Gain:** Polish +0.2, Experience +0.2 (readable cause and effect), Innovation +0.1. It is the
strongest trailer beat after the table-edge fall.

**Evidence.**
- Overwatch's kill cam and Play of the Game exist to show "how you died" and to celebrate skill
  ([GDC Vault](https://gdcvault.com/play/1024053/contactUs)).
- A replay buffer holds the last N seconds continuously
  ([insights.gg](https://insights.gg/blog/what-is-instant-replay-gaming)).

**Implementation.**
- **Recording:** a preallocated `Float32Array` ring buffer. 2.5 s × 90 Hz × 2 tops × 8 floats is
  about 3,600 floats: x, z, y, the spin angle, the two tilts, alive and out. Also record the live
  shapes, at most 4 per frame. Write once per rendered frame in `match-system.ts` after
  `sim.step`.
- **Playback:** drive two extra `TopView` instances, or reuse the real ones while the result
  phase is paused, from the buffer, and `ShapeMarks` with `ghost: true`.
- **The camera does not move:** this is MR. The replay happens on the table.
- **Hook-up:** call it from `finish()` after the slow motion. It extends the result phase
  (`RESULT_TIME = 4`) by 2 s only when it plays.

**Size:** 1.5 days. **Quest:** no.
**Risk:** medium.
- It interacts with the out and fall animations of `TopView` (`outT`, `landed`). Use separate
  ghost views to avoid it.
- Stretch item: build it only if the core is green by Oct 30.

---

### Extra 8. Audio identity: one motif, real metal, captions

**What it is.** It builds on item 6:
- **A motif.** Four notes in a forge-ish mode, for example D-F-A-G♯ (Phrygian dominant
  colour), used everywhere:
  - the win stinger (item 6) is the motif harmonised;
  - the loss is the motif falling;
  - level-up is the motif an octave up;
  - order stamp is the motif struck as anvil hits;
  - rival motifs (extra 6) are its inversions.
- **Real transients.** Two or three CC0 anvil and metal samples (under 100 kB, `.ogg`) layered
  under the synthesized `clash()` and the forge's `playPlace()` "clack". The synthesis keeps
  the variety; the sample gives the body.
- **Captions.** Significant sounds (rival scores, charge ready, NEW RIVAL) get a short word or
  icon, which mostly exists already. Add a mute-music switch to extra 9's plate.

**Gain:** Polish +0.25. The criterion text names sound design, and earlier reviews flag
"generic audio" twice.

**Evidence.**
- CC0 sources:
  - [Kenney Music Jingles, 85 CC0 jingles](https://opengameart.org/node/22000), usable as a
    stinger base;
  - [OpenGameArt CC0 metal impacts](https://opengameart.org/content/metal-impact-sounds);
  - [BigSoundBank anvil, CC0](https://bigsoundbank.com/anvil-1-s3589.html).
- Music is among the most common trailer mistakes
  ([codecks](https://codecks.io/blog/2023/creating-video-game-trailers-best-practices/)).

**Implementation.**
- **The motif:** a `MOTIF` array in `audio.ts`, and a `playMotif(variant)` used by
  `playResult`, `playLevelUp`, `playUnlock` and the stamp.
- **Samples:**
  - Decode with `AudioContext.decodeAudioData`, after the first user gesture (the Enter
    button), from `public/audio/`. That folder is empty today.
  - Load them through the manifest only if IWSDK requires it for audio. Otherwise use a plain
    `fetch` in `audio.ts`, which stays off the render path.
  - Record each sample's licence in a `public/audio/CREDITS.txt`.
- **Self-made option:** record a real hammer on a real piece of steel with a phone. It is free,
  original and on-theme.

**Size:** 1 day. **Quest:** for the mix only.
**Risk:** low. Keep the total under 300 kB, and decode lazily.

---

### Extra 9. Smith's settings: assisted launch, large text, calm fight

**What it is.** A small physical plate on the near rim at home with three toggle switches, each
saved in `progress.ts`:
1. **Steady launch.** Tap your top to launch at 75%, aimed at the rival. This is the dev
   `L`-key path (`match-system.ts:1685`) made public. It is for players who cannot do a fast
   rip, and XP is unchanged.
2. **Large text.** Every `Label` and plate is drawn 1.35× larger. `Label` takes a width
   (`visuals.ts:1354`); multiply it by a global factor.
3. **Calm fight.** A global sim-time factor of 0.8×. The same `vdt` scaling as slow motion
   (`:555`) gives slower tops and more time to react to the 0.35 s ramp lag. The deterministic
   sim is unchanged, because only dt is scaled. It is also a game-speed option.

Then state what is already true:
- Every verb works with one hand, either hand, including the sling.
- The game is seated.
- Shape cues are not colour alone (extra 1).

Put an "Accessibility" paragraph in the Devpost text and the testing notes.

**Gain:**
- **Accessibility 3.0 → about 5.5**: still a long shot, since the award text stresses voice and
  eyes-only input.
- Experience +0.15: a judge who fumbles the rip has an out.

**Evidence.**
- Meta VRC.4 (one-handed play), VRC.2 (larger UI elements), VRC.6 (colour plus pattern), VRC.9
  (seated), and the "gesture interactions need alternative input methods" best practice
  ([checklist](https://developers.meta.com/vr/design/accessibility-checklist/)).
- Game Accessibility Guidelines: "provide a simpler alternative", "allow the font size to be
  adjusted", "include an option to adjust the game speed"
  ([GAG](https://gameaccessibilityguidelines.com/full-list/)).
- Table Troopers' one-handed play as a selling point
  ([Meta](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)).

**Note.** `ACTION-PLAN.md` §5 lists accessibility features as "not winnable". This extra is
different: it costs 1 day, mostly on existing code paths, and its main return is Experience
Design and an honest paragraph. The award itself is the long shot.

**Size:** 0.75 day for the lite version (switches 1 and 2), 1.25 days with calm fight.
**Quest:** a left-hand-only pass.
**Risk:** low. Calm fight must also slow the rival's shaping timers.

---

### Extra 10. Forged out of the table: the first 30 seconds

**What it is.** It builds on item 5, press to forge, and turns placement into the opening:
1. Your palm print glows on the wood.
2. A molten line traces the arena's circle **on the real table**.
3. The arena rises out of it, throwing sparks that land on the desk (WP4's table bounce), as
   the room dims (item 2).
4. A glowing blank drops into the dock and cools from orange to steel with a quench hiss: your
   top.
5. The rival's intro follows (extra 6).

The target is the **first rip within 25 s of Enter**. A second session skips to a 3 s version.

**Gain:** Best First Five Minutes +0.5 ("payoff before the headset comes off"), Polish +0.15,
Innovation +0.1. It is the second shot of the trailer.

**Evidence.**
- The award text
  ([Devpost](https://start-developer-competition-26.devpost.com/details/special-awards)).
- Trailer hook advice
  ([presskit.gg](https://presskit.gg/field-guides/game-trailers-screenshots-guide)).
- `VISION-REVIEW.md` §2.3: "the opening is a menu, not a moment".

**Implementation.**
- **Where it runs:** in the placement flow item 5 creates, in `placement.ts` and
  `match-system.ts`.
- **Molten line:** a ring decal at table height with an emissive "draw-on" via the `drawRange`
  of a line strip.
- **Rise:** a 0.8 s scale and rise tween of the arena root.
- **Sparks:** reuse `Sparks` with the WP4 fall code.
- **The blank:** a `TopView` with a temporary emissive override that lerps to the real
  materials.

**Size:** 1 day. **Quest:** yes, because it must look right on real wood.
**Risk:** it must never delay play. Skip it with any pinch, and fall back to the pinch-to-place
path.

---

### Extra 11. Smith card: a share code and a duel link (no server)

**What it is.**
- A champion's build packs into a short code. Ring (6), core (4), tip (6), spin, paint and
  emblem fit in under 20 bits, about 4-5 base32 characters, for example `SS-7KQ2`. The code is
  shown on the champion plate and on the 2D page after the session ends.
- `?duel=7KQ2` loads that top as the rival, "Smith 7KQ2's top", with a neutral plan.
- The 2D page also shows a Wordle-style result line with a copy button: "SpinSmith · Oct 21 ·
  Hookjaw · THROWN by my sling · 3-1".

**Gain:** Best Reason to Come Back +0.5, plus a sentence in the description. It barely moves the
four criteria, because judges play alone.

**Evidence.**
- Wordle's spoiler-free share line
  ([Wikipedia](https://en.wikipedia.org/wiki/Wordle)).
- Async ghosts in HTML5
  ([PlayCanvas forum](https://forum.playcanvas.com/t/ghost-pro-racing-async-multiplayer-racer/40733)).

**Implementation.**
- **Encoding:** `encodeBuild` and `decodeBuild` in `parts.ts`, with a check character.
- **The duel link:** read `?duel` next to `?demo`, and build a `Rival` on the fly.
- **The 2D page:** `index.html` reads the last result from `localStorage` on `sessionend`.
- No network.

**Size:** 1.5 days. **Quest:** no.
**Risk:** low, but low value for judging. **Post-freeze or cut.**

---

### Extra 12. Hero silhouette pass on the tops

**What it is.** One more pass on the three starter rings only, so each reads from 60 cm by its
outline alone:
- Striker taller and more swept;
- Anvil blockier;
- Halo thinner and more open.

Add an emissive edge line on each blade tip that brightens with spin. It is all procedural, in
`visuals.ts` `ringMeshes()`, with no glTF.

**Gain:** Polish +0.2.

**Why it ranks last:**
- The Oct 6 asset sprint already did most of this (`docs/VISUAL-POLISH.md` §7-8,
  `tops-inlay.png`).
- Extra 1's footprint ring and strobe disk buy more legibility per hour.
- Self-made or CC0 glTF tops would cost 2-3 days, with a risk of a style clash.

**Size:** 1.5 days. **Quest:** no. **Risk:** low. Do it only if ahead of schedule.

---

### Other areas the brief asked about, covered inside the extras

- **Camera framing (4% of the frame):** extra 1 (footprints, trails, fight focus, the
  `TUNE.scale` knob) and extra 3 (lean-in capture, crop).
- **Trailer moments:**
  1. The table-edge fall.
  2. The desk press and forge-up.
  3. Real fingers on the clay.
  4. The cup, the sling, slow motion and the replay.
  5. The rival intro.
  6. The forge clack.
  7. The stinger and the stamp.

  See extras 3, 6, 7 and 10.
- **The first 30 seconds:** extras 2 and 10.
- **Small polish:** extra 4.

---

## 3. Recommended selection and merged schedule

### 3.1 The picks

The recommended picks are **extras 1, 2, 3, 4, 5, 6 (1.5-day version), 8 and 9 (lite)**. That
is about **8.25 days**:

| Extra | Days |
|---|---|
| 1 Readability pack | 1.25 |
| 2 Ghost-hand teacher | 1.5 |
| 3 Capture kit | 0.75 |
| 4 Feel without haptics | 0.75 |
| 5 The judge's ten minutes | 0.5 |
| 6 Rival personalities, first three rivals | 1.5 |
| 8 Audio identity | 1 |
| 9 Smith's settings, lite | 0.75 |

- **Stretch,** only if every device gate is green by Oct 30: extra 7 (replay), then extra 10
  (opening).
- **After the freeze or cut:** extras 11 and 12.

**Why this set.**
- Every pick is buildable and checkable in IWER.
- None touches the sim balance, except extra 6, which has a report gate.
- Each can be switched off by a flag if a device check fails.

Together they attack the four remaining leaks: visibility, text teaching, the thin rival and
feedback. Those are what separate "a good entry" from "a polished one".

**Expected scores.**

| Criterion | After items 1-6 | Plus the picks |
|---|---|---|
| Innovation & Creativity | 7.5 | 7.6 |
| Experience Design | 7.0 | 7.7 |
| Technical Implementation | 6.8 | 6.9 |
| Polish & Presentation | 5.8 | 6.7 |
| **Mean** | **≈ 6.8** | **≈ 7.2** |

| Award | After items 1-6 | Plus the picks |
|---|---|---|
| Best First Five Minutes | 6.5 | 7.5 (8 with extra 10) |
| Accessibility | 3.0 | 5.5 |
| Best Reason to Come Back | 5.0 | 5.3 |

That is a realistic contender for Best First Five Minutes. A Gaming placing still needs the
device verification and a strong video, which no extra replaces.

### 3.2 Day-by-day order, Oct 8 - Nov 6, merged with items 1-6

**Assumptions:**
- About six working days a week.
- Item sizes come from their plan docs: item 1 is 2 days with the report; item 4 is about 4.5
  days; items 2-5 are about 4.1 days in total; item 6 is about 0.75 day.
- The Quest arrives in week 3 (`ACTION-PLAN.md`: buy on Oct 20 if none is confirmed). If it
  comes earlier or later, slide the "Q" rows; every extra row is emulator-only and can swap
  with them.

| Date | Main work (items 1-6 and device) | Extra |
|---|---|---|
| Thu Oct 8 | **Item 1:** honest report, ramp on pinch | — |
| Fri Oct 9 | **Item 1:** drag re-aim, `ShapeMarks` sigma, report gates | **E4 (part):** pinch-confirm tick and spark, the ramp dust ring |
| Sat Oct 10 | **Item 2:** hand occluder, room dim, desk light pool | — |
| Mon Oct 12 | **Item 3:** room model, table edge, floor | — |
| Tue Oct 13 | **Item 3:** falls onto the real floor, arena fitted inside the edge | **E1 (start):** footprint rings with shape cues |
| Wed Oct 14 | — | **E1:** trails, strobe disk, fight focus (shares item 2's fade curve). Frame-cost check in IWER |
| Thu Oct 15 | **Item 4:** cup and sling in the sim, report rows | — |
| Fri Oct 16 | **Item 4:** gesture, `updateSling()` | — |
| Sat Oct 17 | **Item 4:** readability (cup ring, aim line, clunk and twang, cause line) | **E4 (rest):** cup ripple, charge ember chime |
| Mon Oct 19 | **Item 4:** rival and guide retune, round length | — |
| Tue Oct 20 | **Item 6:** music loop and win stinger | **E8:** motif system and CC0 or self-recorded metal; the stinger *is* the motif. Buy the Quest if none is confirmed |
| Wed Oct 21 | — | **E2:** ghost hand (pose data, `InstancedMesh`, rip and ramp lessons) |
| Thu Oct 22 | **Item 5:** press to forge (detector, pinch fallback) | **E2 (finish):** cup, sling and press lessons, then remove the text cards |
| Fri Oct 23 | **Item 5:** calibration, the forge-up flow | — |
| Sat Oct 24 | — | **E6:** rival plans for Rim Raider, Iron Keep and Drifter, plus report rows |
| Mon Oct 26 | **Q0:** device protocol. Items 1-5 checks, E1 frame time, E2 opacity | — |
| Tue Oct 27 | **Q1:** tuning | — |
| Wed Oct 28 | **Q1:** tuning, E4 red-tint threshold | **E6 (finish):** 2 s intros, medallion icons, rival motifs |
| Thu Oct 29 | — | **E9 lite:** steady launch and large text; the left-hand-only pass on the device |
| Fri Oct 30 | **Gate:** all device checks green? | **E3:** `?capture`, seeded rival, freeze key. Trial captures of the cold open |
| Sat Oct 31 | **Q3:** playtests with 3-5 fresh players. Note whether they followed the ghost hands without help | — |
| Mon Nov 2 | Fix list from the playtests | **Stretch E7** (replay), only if Oct 30 was green; otherwise fixes |
| Tue Nov 3 | Fixes | **Stretch E7 (finish)**, or **E10** (opening) if item 5 felt great on the device |
| Wed Nov 4 | Performance pass on the device; switch off anything failing by its flag | — |
| Thu Nov 5 | Regression run: `check:sim`, every report, a full first session in IWER and on the Quest | **E5:** landing image and icons, the "What to try in 10 minutes" notes, the description headings |
| **Fri Nov 6** | **Feature freeze.** | — |
| Nov 7-10 | Video capture with E3's shot plan; edit. Cover still from the freeze key | — |
| Nov 11-17 | Unchanged from `ACTION-PLAN.md`: code freeze Nov 13, deploy Nov 16, submit Nov 17 | — |

**If the Quest is late** (after Oct 30):
- Keep the Q days as buffer for E7.
- Hold extra 10: it needs real wood.
- E3's capture can still be planned. Record in IWER if the device never comes, and say so in
  the notes.

**Cut order if time runs short:**
1. E7
2. E10
3. E9 down to steady launch only
4. E6 down to intros only, with no plans

Never cut E1, E2 or E5.

---

## 4. Sources

Competition:
- Judging criteria: https://start-developer-competition-26.devpost.com/details/judging
- Special awards: https://start-developer-competition-26.devpost.com/details/special-awards
- 2025 winners (Tiny Golf, Dun Jun, The Nanauts, HandCraft XR): https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/
- 2025 competition overview: https://www.uploadvr.com/meta-horizon-start-developer-competition-2025

Meta design guidance:
- Hands onboarding best practices (ghost hands, minimal text, visual feedback without haptics): https://developers.meta.com/horizon/design/hands-onboarding-best-practices/
- Accessibility checklist (VRC.2, .3, .4, .6, .9; alternative inputs): https://developers.meta.com/vr/design/accessibility-checklist/
- Table Troopers success story (pinch, one-handed play, red tint, intent inference): https://developers.meta.com/horizon/discover/success-stories/table-troopers/
- Capturing MR and VR apps: https://developers.meta.com/horizon/resources/video-capture-mr-vr/
- Capture best practices: https://developers.meta.com/horizon/blog/best-practices-vr-mr-app-captures-meta-quest-developers/

Shipped games:
- Cubism hand tracking (fingertip highlights, red warning): https://uploadvr.com/cubism-hand-tracking-update-oculus-quest/
- Street Fighter 6 versus screen: https://www.pushsquare.com/news/2022/06/literally-face-off-against-opponents-in-street-fighter-6-with-interactive-versus-screen
- Street Fighter 6 character select: https://eventhubs.com/news/2023/may/03/sf6-css-animations-unique-heart
- Versus splash trope: https://tropedia.fandom.com/wiki/Versus_Character_Splash
- Overwatch replay technology (kill cam, Play of the Game): https://gdcvault.com/play/1024053/contactUs
- Instant replay buffers: https://insights.gg/blog/what-is-instant-replay-gaming
- Wordle share line: https://en.wikipedia.org/wiki/Wordle
- Async ghost racing in HTML5: https://forum.playcanvas.com/t/ghost-pro-racing-async-multiplayer-racer/40733

Game feel, trailers and submissions:
- Game feel (feedback layers, hit stop, small shake): https://eastondev.com/blog/en/posts/dev/20260521-game-feedback-feel/
- Trailers and screenshots guide: https://presskit.gg/field-guides/game-trailers-screenshots-guide
- Trailer mistakes, gameplay first: https://wnhub.io/news/analytics/item-237
- Trailer best practices (music): https://codecks.io/blog/2023/creating-video-game-trailers-best-practices/
- Devpost submission advice: https://dev.to/jacklyn/how-to-make-your-devpost-submissions-not-suck-37i0
- MLH, using Devpost: https://guide.mlh.io/general-information/judging-and-submissions/hackathon-submission-portal/using-devpost

Accessibility:
- Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/full-list/
- Okabe-Ito colour-blind-safe palette (orange #E69F00 and sky blue #56B4E9 as a reference for the orange and cyan pair): https://conceptviz.app/blog/okabe-ito-palette-hex-codes-complete-reference

CC0 audio:
- Kenney Music Jingles (CC0): https://opengameart.org/node/22000
- Metal impact sounds (CC0): https://opengameart.org/content/metal-impact-sounds
- BigSoundBank anvil (CC0): https://bigsoundbank.com/anvil-1-s3589.html

Local data:
- `npm run report:shaping`, Oct 7, 2026:
  - none: 46%
  - human ramp on pinch: 53%
  - human ramp on release: 50%
  - superhuman: 57%
  - centre well: 51%
- IWER hand poses, MIT licence: `node_modules/iwer/lib/device/configs/hand/{relaxed,pinch,point}.js`
