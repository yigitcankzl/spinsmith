# SpinSmith: independent scorecard

Judged on Oct 7, 2026, as the project stands today. It is not judged on what it might become.
Competition: Meta VR Start Developer Competition 2026, Gaming track. The four criteria count
equally ([judging page](https://start-developer-competition-26.devpost.com/details/judging)).

What this review is based on:
- `README.md`, `docs/TESTING-NOTES.md`, `docs/SUBMISSION.md`, and the six `docs/review/*.png`
  screenshots.
- A read through `src/game/`.
- These checks, all run today: `typecheck` (clean), `check:sim` (all passed),
  `report:shaping`, `report:arenas`, `report:tops` and `build`.
- One read-only screenshot and the console log from the running emulator.

I formed my own judgement before reading the earlier reviews.

---

## 1. Overall score: **5.4 / 10**

| Criterion | Score |
|---|---|
| Innovation & Creativity | 6.5 |
| Experience Design | 5.5 |
| Technical Implementation | 5.0 |
| Polish & Presentation | 4.5 |
| **Mean** | **5.4** |

**Verdict.** SpinSmith is a carefully designed, honestly engineered prototype with one fresh idea:
you pinch the arena floor mid-fight to raise ramps and press wells. Around that idea it builds a
hand-forge and a diegetic "one machine on the table" UI that would look good in a video. As a
game it is still a desktop-emulator build:
- It has never run on a Quest, so its frame rate is unknown.
- None of its three hand verbs (rip, ramp, well) has been felt.
- The real room only sets the arena's height.
- The tops are small in the frame, and the art is procedural matcaps with synthesized sound and
  no music.

There is a lot of systems breadth (136 builds, 6 arenas, a workshop, 7 rivals, daily orders,
20 levels). A judge with ten minutes will see perhaps a fifth of it. Breadth does not make up for
the unproven core feel.

Today this is a solid mid-pack entry, not a prize contender. Strictly as of today it could not
even be submitted: there is no hosted link, no video and no cover (`docs/SUBMISSION.md`, "Still
to do"). I scored the game as if those were present at a basic level.

---

## 2. Scores per criterion

### Innovation & Creativity: 6.5
- **The hero verb is new.** Reshaping the arena floor mid-fight is real and wired end to end:
  - Ramps: pinch, lift for strength, pull to aim (`src/game/match-system.ts:1284-1330`).
  - Wells: a fingertip pressed into the floor, with speed gating so a resting hand does not
    count (`match-system.ts:1331-1343`).
  - Two charges refilled by clashes keep it a decision rather than a reflex.

  I know of no top battler that does this.
- **The forge is literally hands-on.** You pinch a part and press it onto the top, which comes
  apart to show the slot (`forge.ts`, `forge.png`). That turns a menu into a toy.
- **The genre is familiar.** This is a spinning-top battler with part customisation, so the
  frame is Beyblade's. The in-game names are now original, but `docs/TOP-CUSTOMIZATION.md` still
  maps parts to Beyblade X 19 times. Keep it out of anything a judge can open.
- **It fails the "take it away" test.** Passthrough is on (`iwsdk.config.json`, `"mode": "ar"`),
  but the room only supplies a table height (`placement.ts:31-45`; `match-system.ts:969-979`
  filters planes labelled table or desk). On the tray with no table, it plays identically. The
  judging text asks for the real room to "meaningfully change the experience".

### Experience Design: 5.5
- **The first session is designed, not improvised.** First a lone dock and arena, then a guide
  ring beside the rival for the first ramp, then the earned Spur tip, the forge with only that
  part highlighted, and a rematch (`docs/TESTING-NOTES.md`, "The first five minutes";
  `home.png`).
- **It is built for sitting.** The interactables sit on the near rim within roughly 0.35-0.55 m
  (`docs/SUBMISSION.md`, "Hands-first interaction"). Forge, workshop and score all live inside
  the arena, so there are no floating menus to aim at (`forge.png`, `workshop.png`).
- **The player has little say in a fight.**
  - `report:shaping` today: the best shaping strategy (pushOut) wins 57%, against 46% for never
    shaping. That is +11 points for the game's defining verb.
  - Without shaping, only 13% of wins are knockouts. Most rounds are an 18 s outlast decided by
    the launch and the build.
  - The live log showed a 12.6 s OUTLAST after a 0.38-power launch.
- **The rival is thin.** Its launch is random power and aim scaled by your level
  (`match-system.ts:1252-1263`). From level 6, its "shaping" is one rule: ramp you outward
  whenever you are in the outer band (`match-system.ts:1367-1379`). Players do not meet a rival
  that uses the arena until well after the first session.
- **Teaching relies on text cards**, and the far-rim plates are small at seated distance
  (`ready.png` "Rival: Iron Keep · heavy center holder"; `home.png` "New part: Spur tip! Pinch
  the small anvil to forge"; the match bar in `fight.png` is barely legible even on a desktop
  screen).

### Technical Implementation: 5.0
- **The fight sim is deterministic and three.js-free** (`sim.ts`). Balance is measured, not
  guessed:
  - `report:tops`: 136 builds, no warnings. Ring averages run 44-60% and tip averages 45-57%, so
    there is no dominant build.
  - `report:arenas`: every arena has a distinct profile. Sumo Square has a 50% knockout rate;
    Clockwork Spire has 1% shatters.
  - `check:sim` passes, with the type loop at 0.70 / 0.57 / 0.57.
- **The hand input is engineered with care:**
  - Rip power comes only from motion, mixing distance with decaying peak speed
    (`match-system.ts:1200-1203`).
  - A tracking loss during a fast rip still launches (`:1156-1168`).
  - A shape's position locks when the pinch starts.
  - The workshop checks arenas in a worker (`check-worker.ts`).
- **Nothing has been measured on Quest.** The judging page sets a minimum of 60 fps on Quest
  hardware. Emulator scene cost is about 90-100 draw calls and 87-96k triangles per frame (live
  `[PERF]` log), which is plausible for a Quest 3 but unproven. The main chunk is 2.51 MB
  (701 kB gzip).
- **Platform features are requested but not used.** `iwsdk.config.json` turns on `anchors`,
  `meshDetection` and `hitTest`, but `src/` uses none of them, and there is no depth occlusion. A
  real hand pinching the virtual floor will therefore be drawn under it at the exact moment of
  the core verb. Placement knows table centres, not edges.
- **The code is clean but has small stale spots.** `typecheck` is clean and there are no
  TODO/stub markers. Stale lines remain: two doc comments are stacked on one function
  (`match-system.ts:797-798`, `:1218-1222`), and the README still says the "opponent gets a
  random build each round", which `pickRival` (`:799`) contradicts.

### Polish & Presentation: 4.5
- **The UI is coherent in the emulator.** The engraved plates, drawer tabs, brass rail and dials
  share one "forged tech" style (`forge.png`, `workshop.png`). That is the best-looking part of
  the build.
- **The tops are too small to read.** In `fight.png` the two tops take up about 4% of the frame
  width, the arena dominates, and the action is hard to follow. On video this hurts the most.
- **There are no art or sound assets.** `public/gltf`, `public/textures` and `public/audio` are
  empty. Visuals are procedural matcaps; all sound is synthesized (`audio.ts`), with a forge
  drone but no music or melodic stinger.
- **The presentation package does not exist yet:** no video, cover, logo, hosted link or
  LICENSE. Every screenshot is gray IWER emulator room, not passthrough on a real table.

---

## 3. Special awards

| Award | Score | Reason |
|---|---|---|
| Best First Five Minutes | **5.5** | The best-designed onboarding sequence of any part of the game. But it is text-card led, built on gestures nobody has felt, and the forge, the "Smith", arrives only after a full first match. |
| Best Reason to Come Back | **5.0** | The daily order is real (`orders.ts:52-105`: a date-seeded rival, arena and win condition), with medallions, a ledger and champions. But it is single-player and local-only, and only the win condition changes from day to day. |
| Boldest Original Concept | **5.0** | Shaping the floor is bold. A spinning-top battler on a tray that does not need your room is not. |
| Accessibility | **3.0** | Seated, works with either hand, and orange against teal is a reasonably colour-safe pair. But there are no options at all: no one-handed or reduced-motion mode, no text size setting, no alternative to the fast rip, and the well needs a quick downward jab. |

---

## 4. The five biggest weaknesses (ranked)

1. **Never run on a headset.** The frame rate, rip feel, well detection and reach are all
   unknown, and three hand verbs depend on tracking quality the emulator cannot show.
   *Raise it:* spend a week on a Quest 3 / 3S, measure frame time, and tune `FULL_SPEED`,
   `wellSpeed` and the reach constants on the device. **+0.5 to +1.0 overall**, and it removes a
   possible collapse to 3-4.
2. **The submission package is missing.** There is no hosted link, video, cover or LICENSE; today
   it could not pass Stage One. *Raise it:* host the build, shoot a real passthrough video on a
   wooden table around the "YOUR RAMP → THROWN" moment, and make a cover. **+1.0 to +1.5 on
   Polish (+0.3 overall)**, and the entry becomes eligible at all.
3. **The mixed reality is shallow.** The table sets a height and nothing else. Hands are not
   occluded where the pinch happens, and the table edge is unknown. *Raise it:* add depth
   occlusion (IWSDK `DepthOccludable`) for hands, fit the arena to the table edge, and let the
   real table matter in play (thrown tops bouncing off real geometry, or the arena sized to the
   table). **+0.5 to +1.0 on Innovation and Technical (+0.4 overall).**
4. **The fight gives the player little agency and is hard to read.** The hero verb adds only +11
   points of win rate, most rounds are passive outlasts, the tops are small, and the AI is
   random. *Raise it:* make shapes decisive (+20 points or more for good play), draw the tops
   larger or let the camera follow the action, and give rivals a recognisable plan.
   **+0.5 to +1.0 on Experience Design.**
5. **Presentation is generic.** Procedural matcaps, no music, text-card teaching and gray
   emulator captures. *Raise it:* commission or build hero top models, add a short music bed and
   a win stinger, and teach with diegetic demos (a ghost hand doing the ramp) instead of cards.
   **+0.5 on Polish.**

---

## 5. Three genuine strengths

1. **Measured, deterministic game design.** The headless sim plus three balance reports is rare
   in a jam-length entry and gives a credible "how we built it" story. The reports show no
   dominant build, and the arenas are distinct.
2. **One machine on the table.** The arena itself turns into the forge and the drafting table,
   with drawers sliding out of the rim (`forge.png`, `workshop.png`). That is seated-friendly,
   diegetic and exactly the "no floating menus" spirit Meta asks for.
3. **The core verbs are thought through for hands.** Power comes from motion, positions lock
   when the pinch starts, there is grace for tracking loss, a lost hand cancels instead of
   committing, and the floor-shaping verb is original. If it feels as intended on a device, it is
   a memorable hook.

---

## 6. Fun check: would a judge play a second match?

**Probably one more round, not reliably a second match.** The rip is satisfying in concept: a
heated cord, a white-hot pull, and slow motion on a ramp knockout. The first ramp that throws the
rival over the wall is a genuine "oh!" moment.

But the numbers say most rounds end in an 18 s outlast where the player's input after the launch
changes the result by about a tenth. The tops are small enough that the judge may not see why
they won or lost. The rival in the first match does nothing clever.

The progression (a new tip, then a rematch) gives a reason to press on. What it unlocks are
stat variations, not new experiences. A judge who wins the first match by watching will not
feel the need for a second. A judge who lands a ramp knockout will. Making that knockout common
and readable is the single biggest lever on fun.

---

## 7. What the absence of headset testing means

- **For the score:** every Experience Design and Technical point above is given on trust in the
  code, not on evidence. Judges play on a Quest. If any one of the rip power curve, the well
  speed gate, plane-label detection, or 60 fps fails there, Experience Design and Technical drop
  to about 3. The overall score then falls to roughly **3.5-4**.
- **For the risk:** these are specific failure modes, not generic worries:
  - Hand tracking often drops at the fast release of a rip.
  - Fingertip depth jitter can fake or miss a well.
  - Without Space Setup labels there is no "table", so the arena falls back to the tray.
  - Requesting anchors, mesh detection and hit test may add permission prompts for features the
    game never uses.
- **What the current score assumes:** I priced in a moderate risk discount (about -0.5 against
  the same build verified on a device). Verified, this exact build would be about **5.9**.

---

## 8. Comparison with the earlier reviews

| Review | Overall | Innovation | Experience | Technical | Polish |
|---|---|---|---|---|---|
| `COMPETITION-REVIEW.md` (early Oct 7) | 5.1 | 6.5 | 5.5 | 4.5 | 4.0 |
| `VISION-REVIEW.md` (after WP 1-13) | 6.0 | 7.0 | 6.5 | 5.5 | 5.0 |
| **This scorecard** | **5.4** | **6.5** | **5.5** | **5.0** | **4.5** |

- **Against COMPETITION-REVIEW.md: I mostly agree.** The real fixes since then justify a little
  more on Technical (robust placement, gated redraws) and Polish (the landing page and coherent
  plates). Its central points still hold: no headset, shallow MR, and no presentation package.
- **Against VISION-REVIEW.md: I disagree on Experience Design (6.5 → 5.5) and Innovation
  (7.0 → 6.5).** It credits fixes "in code" that nobody has felt. It notes but under-weights its
  own finding that shaping adds only +11 points, and that it still fails the take-it-away test.
  A judge does not score improvements; they score what they play. Its ceiling estimates (7.5-8
  with device time and a real video, about 6.5 without) look reasonable to me, but they are
  ceilings, not today's score.

---

## 9. Re-score without headset/submission gaps

This re-score assumes two things:
- The game has been verified on a Quest and works as the code intends: about 72 fps, and the rip,
  ramp, well and table detection are reliable.
- The submission package exists at a competent level: a hosted link, a good passthrough video
  under 3 minutes, a cover image and a LICENSE.

Both are taken out of the judgement. What is left is judged with the same strictness as above.

### Overall: **5.9 / 10**

| Criterion | Score | Short reasons |
|---|---|---|
| Innovation & Creativity | **6.5** | Floor-shaping mid-fight and the hand-forge are original on Quest. It is held back by the familiar top-battler genre and by mixed reality that fails the "take it away" test: the table gives a height and a landing spot, and the tray plays the same (`placement.ts:31-45`). A good passthrough video sells the idea better, but does not change it. |
| Experience Design | **6.0** | Strengths: a designed first session, everything within seated reach, and the one-machine UI. Weaknesses: shaping adds only +11 points of win rate (57% vs 46%, `report:shaping`). Without shaping only 13% of wins are knockouts, so most rounds are passive 18 s outlasts. The rival is random launches plus one outward-ramp rule (`match-system.ts:1252-1263`, `:1367-1379`). Teaching is by text cards. |
| Technical Implementation | **6.0** | Strengths: a deterministic sim with three balance reports, careful hand input (motion-only power, lock on pinch, grace for tracking loss), a worker-checked workshop, a clean typecheck, and an assumed steady 72 fps. Weaknesses: no depth occlusion, so real hands are drawn under the floor they pinch. Placement uses table centres, not edges. Anchors, mesh detection and hit test are requested in `iwsdk.config.json` but unused. A 2.5 MB main chunk and small stale comments and docs. |
| Polish & Presentation | **5.0** | Strengths: a coherent forged-tech UI (`forge.png`, `workshop.png`) and a competent video and cover. Weaknesses: procedural matcap tops and arena, no art assets, synthesized sound with no music or win stinger, and tops only about 4% of the frame (`fight.png`), so the action is hard to read even on video. |
| **Mean** | **5.9** | A good, decent entry; still below the Gaming prize band (8+). |

### Special awards

| Award | Score | Reason |
|---|---|---|
| Best First Five Minutes | **6.0** | A deliberate rip → ramp → result → forge → rematch sequence. But it is text-card led, and the forge, the game's namesake, only appears after a full match. |
| Best Reason to Come Back | **5.0** | A date-seeded daily order, rival medallions, a ledger and champions. But it is single-player and local-only, and the unlocks are stat variations, not new experiences. |
| Boldest Original Concept | **5.5** | Shaping the floor is bold and shows well on video. The package around it is a familiar genre that does not need your room. |
| Accessibility | **3.0** | Seated, works with either hand, colour-safe orange against teal. No options at all: no one-handed or reduced-motion mode, no text size setting, no alternative to the fast rip or the quick well jab. |

### Top 5 remaining weaknesses (ranked)

1. **The fight gives the player little agency and is hard to read.** The hero verb adds only +11
   points, most rounds end in outlasts, and the tops are small.
   *Fix:*
   - Retune shapes so good play wins 65-70% against no shaping, with knockouts in more than 35%
     of wins.
   - Draw the tops about 1.5x larger, or tighten the arena.
   - Add a clear "this ramp did it" beat in every round.

   *Gain:* **+0.8 to +1.0 on Experience Design (+0.25 overall)**, and the biggest effect on
   whether a judge plays a second match.
2. **The mixed reality is shallow.** The table sets a height. There is no occlusion, no table
   edge, and the room has no role in play.
   *Fix:*
   - Depth occlusion for hands (`DepthOccludable`).
   - Fit the arena to the table edge.
   - One mechanic that needs the room: tops thrown off the arena bounce and slide on the real
     table and off real objects through the mesh, or the arena size comes from the table.
   - Drop the features you don't use.

   *Gain:* **+0.5 to +1.0 on each of Innovation and Technical (+0.3 to +0.5 overall).**
3. **Visuals and audio are generic.** Procedural matcaps, no music, no signature sound.
   *Fix:* modelled hero tops with real metal materials and wear, a short forge-rhythm music bed,
   a win stinger, and a stronger impact sound and light at clashes.
   *Gain:* **+0.8 to +1.0 on Polish (+0.25 overall).**
4. **The rival is thin.** Random launch power and aim, and one ramp rule from level 6.
   *Fix:* give each archetype a readable plan:
   - Iron Keep wells the centre.
   - Hookjaw baits you to the rim, then ramps.
   - Drifter dodges clashes.

   Then show a few of these in the first two matches.
   *Gain:* **+0.3 to +0.5 on Experience Design and Innovation (+0.2 overall).**
5. **Onboarding uses text cards, and depth is spread thin.** The forge comes late, there are no
   accessibility options, and much of the breadth (six arenas, a workshop, seven rivals) goes
   unseen in ten minutes.
   *Fix:*
   - A ghost hand that demonstrates the rip and the ramp instead of cards.
   - The forge earlier, or a 20 s forge moment before the first match.
   - A one-handed / low-speed rip option and a text-size option.

   *Gain:* **+0.3 to +0.5 on Experience Design, +2 on Accessibility (+0.15 overall).**

### What would take it to 7

Fix weaknesses 1 and 2 and half of 3:
- shaping that clearly decides rounds;
- tops large enough to read;
- hand occlusion and a table-edge fit;
- one room-dependent bounce;
- music and a win stinger.

That gives Innovation about 7.5, Experience about 7, Technical about 7 and Polish about 6, so
**about 7.0**. That is contender level for Best First Five Minutes, but not yet for a Gaming
placing.

### What would take it to 8

Everything for 7, plus three more things:
- **A mixed-reality idea that could not exist without the room**, which passes the "take it
  away" test outright. Two examples: the arena forms in the real tabletop itself, or real
  objects become pillars and walls through the mesh.
- **A signature look and sound** that is cover-quality in every frame.
- **Rivals with recognisable personalities** that make you want "one more match".

That gives Innovation about 8.5, Experience about 8, Technical about 7.5 and Polish about 8, so
**about 8.0**. That is the prize band for Gaming and a real candidate for Boldest Original Concept.
