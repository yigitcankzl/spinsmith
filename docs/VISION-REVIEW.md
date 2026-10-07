# SpinSmith: vision review (creative direction and competition strategy)

Written Oct 7, 2026, after work packages 1-13 of `docs/ACTION-PLAN.md` were finished. Deadline:
Wed Nov 18, 2026, 12:00 PT. Six weeks left; one developer with an AI assistant; a Quest is on its way.

This review does not redo `docs/COMPETITION-REVIEW.md` (the judge-style review, about 5.1/10) or
the action plan. It asks two questions: what still keeps SpinSmith out of the prize band, and what
single idea would make a judge remember it a week later.

Inputs:
- all the docs named in the brief and the six `docs/review/*.png` screenshots;
- the code in `src/game/`;
- checks run today: `npm run check:sim` (all passed; type loop 0.70 / 0.57 / 0.57),
  `report:shaping`, `report:arenas` and `build` (main chunk 2.51 MB, 699 KB gzip);
- web research, with sources in section 6.

Nothing here has been measured on a headset. Every statement about feel, tracking or frame rate
is a risk to check, not a result.

---

## 1. Where it stands now

### 1.1 Scores per judging criterion

The four criteria count 25% each. Stage One is pass/fail; Stage Two is scored
([judging page](https://start-developer-competition-26.devpost.com/details/judging)).

| Criterion | Oct 7 review | Now | Why it moved, and what still caps it |
|---|---|---|---|
| Innovation & Creativity | 6.5 | **7.0** | **Up because:** the Beyblade X vocabulary and 1/2/2 scoring are gone (Stub/Bolt/Clamp/Stilt, Chisel..Bead, OUTLAST/THROWN/SLAG/SHATTER, heat to 3). Thrown tops now land on the real table. Rivals from Lv 6 raise ramps, so the hero verb is shown being used against you. **Still capped because:** the room's only job is to set the arena's height and give knocked-out tops somewhere to land. Played on the tray, the game is the same game. In the words of the Boldest Original Concept award, it is not yet "the idea that couldn't exist anywhere else". |
| Experience Design | 5.5 | **6.5** | **Up because:** placement waits for planes, re-places on a new session and on recenter, and has a drag handle. `?fresh`, `?demo` and an in-headset reset exist. Reach was tuned (§16, 0.32-0.62 m). Text is larger, accidental shapes are guarded, there is a real landing page, the first match is steadier and the match is first to 3. **Still capped because:** the gestures have never been felt. Teaching still uses text cards ("Rival: Iron Keep · heavy center holder", `ready.png`; "New part: Spur tip! Pinch the small anvil to forge", `home.png`). The forge, the "Smith" in SpinSmith, first appears at about minute 3. |
| Technical Implementation | 4.5 | **5.5** | **Up because:** placement is robust in code (`placement.ts`, §14), arena syncs and bar redraws are gated (WP7), and the sim and reports are deterministic, which makes a good "how we built it" story. **Still capped because:** there is no Quest frame time. There is no depth occlusion, so real hands are drawn *under* the virtual floor exactly when they pinch it. The table edge is unknown (`placement.ts:31-45` uses plane centres only). The main chunk is 2.5 MB. |
| Polish & Presentation | 4.0 | **5.0** | **Up because:** the HTML landing page, panned clashes, a synthesized forge loop, slow motion on a shape knockout and readable plates. **Still capped because:** there is no video, cover or logo yet. Visuals are procedural matcaps. Tops are small in the frame (`fight.png`: the two tops are about 4% of the frame width). There is no music with a melody or a win sting. The landing page uses only the app icon, with no image of the game (`index.html:48`). |
| **Weighted** | **≈5.1** | **≈6.0** | Safely through Stage One. **Still below the $100k Gaming band**, and outside every special award except, plausibly, Best First Five Minutes. |

**Realistic ceiling:**
- About **7.5-8** with the recommended plan (section 4), at least 5 device days and a real passthrough video.
- About **6.5** without the Quest.

### 1.2 What changed since COMPETITION-REVIEW.md

| Review finding | Status | Comment |
|---|---|---|
| F1 Never on a headset | **Open** | The single biggest risk. Nothing below matters if the rip, ramp or frame rate fails on a Quest |
| F2 Room barely matters | **Partly fixed** | Tops and debris land on the table (WP4). Still no occlusion, no table edge, no interaction *with* the table |
| F3 Beyblade X vocabulary | **Fixed in the game** | `docs/TOP-CUSTOMIZATION.md` still maps every part to Beyblade X (19 mentions). It must not be visible if the repo is ever linked (decision D5) |
| F4 Reach | **Fixed in code** | Needs device check T7. The table edge is still open |
| F5 Placement | **Fixed in code** | Needs device check T3 |
| F6 Hosting, video, cover | **Open** | D1 (hosting) is still undecided. No LICENSE |
| F7 Shared headset | **Fixed** | |
| F8 Small text | **Fixed** | Needs device check T8 |
| F9 Hero verb modest | **Partly fixed** | Rivals ramp and slow motion exists. But pushOut still wins only 57% against 46% for no shaping (`report:shaping`, today): +11 points. The verb matters, but not spectacularly |
| F10 Performance | **Fixed in code** | Draw calls: hub about 210, which is still high |
| F11 First five minutes | **Mostly fixed** | Text cards remain. The forge comes late |
| F12 Visuals and audio | **Partly fixed** | No music, no cover-quality look |
| F13 Hands details | **Fixed in code** | Needs device checks T4-T6 |
| F14 Docs | **Fixed** | LICENSE still left to the developer |
| F15 Come-back invisible | **Fixed** | Tomorrow teaser, `?demo`, board, medallions, champions |

The project is now **feature-complete and well-engineered, but not yet memorable**. Every system
the review asked for exists. What it lacks is one moment that only a headset at a real table can
give, and that a judge retells.

---

## 2. Still missing to compete (beyond the action plan's open items)

The plan's open items are already tracked and are not repeated here: Quest protocol Q0-Q3,
occlusion, table edge, hosting, LICENSE, cover, video. These are additional gaps.

1. **The real table is passive scenery.** The arena floats 8 cm above the wood: `PEDESTAL = 0.08`,
   whose comment reads "leaving room to press wells" (`placement.ts:7-8`). So every touch verb
   (ramp pinch, well press, `match-system.ts:1212` `depth > 0.004`) happens **in mid-air above the
   table**. The table is there, physically under the player's hands, and the game never lets them
   touch it.
   - This is the biggest wasted asset in the design. Real-surface touch is measurably more precise
     and confident than mid-air touch ([Ying & Heo 2026](https://arxiv.org/abs/2607.02430)).
   - Shipped Quest games sell it as "real-world haptics"
     ([BEATABLE](https://roadtovr.com/beatable-hand-tracking-rhythm-quest-release-date/)).
   - Hands have no haptics, and Meta asks for feedback on more than one channel
     ([accessibility checklist](https://developers.meta.com/vr/design/accessibility-checklist/)).
     The table is the free haptic channel.
2. **No signature move.** The verbs are rip, ramp and well. All three are careful, small, fingertip-scale
   motions. Nothing in a round is *big*: no gesture a spectator would copy, no sound a judge
   would hear from the next room. Winning entries from 2025 had one physical verb you could name
   in two words: punch and slap (Dun Jun), pinch-and-putt (Tiny Golf)
   ([Dun Jun](https://devpost.com/software/dunjun),
   [winners](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)).
3. **The opening is a menu, not a moment.**
   - Enter XR → wait up to 5 s for planes → the arena appears → a breathing ring calls you to the
     dock → a text card.
   - The first thing the player *does* is carry a top.
   - The first thing the player *sees* is a machine that is already there, so no cause and effect
     with the room.
   - The Best First Five Minutes award text asks for "a payoff before the headset comes off" and
     teaching "without a wall of text"
     ([special awards](https://start-developer-competition-26.devpost.com/details/special-awards)).
     Today's payoff is the first slow-motion knockout at about 1:30. The first *physical* payoff
     (the rip) is good but small.
4. **Hands disappear under the arena.** Without depth occlusion, a real hand pinching the floor is
   drawn behind the virtual floor in passthrough. In the video this reads as "fake", exactly on the
   hero verb. The plan has occlusion as an optional 1-day timebox (Q2). **It should be a
   must-try, not an optional extra.** If the cost is too high, use the fingertip glow fallback plus
   a semi-transparent floor under the hand.
5. **The fight is visually small at video scale.**
   - In `fight.png` the tops are dots inside a large, dark machine.
   - The bar, the far plate and the rim chrome take more pixels than the action.
   - In a 1080p video downscaled on Devpost, the clash will not read.
   - Fix this mainly with capture framing (closer, lower camera) and with juice on the tops
     themselves: spin trails, heat glow, sparks that land on the table. Do not rescale the game.
6. **The narrower VR Glasses field of view.** Meta's VR Glasses (spring 2027) are the reason for
   this competition. They are reported at roughly 70° x 66° against Quest 3's 110° x 96°
   ([vr.org](https://vr.org/articles/meta-vr-glasses-store-hand-tracked-apps-first-v207-sdk-2026)).
   From `reach.ts` constants:
   - The dock and the anvil sit about **46° to the side** and 42° below the eyes when the player
     looks at the arena centre (30° down). On the Glasses they are **outside the view** and need a
     head turn.
   - The four forge tabs span ±40° horizontally, which is also at or past the edge.
   - Judges will test on a Quest, so this does not cost points directly. But "built for the form
     factor Meta is launching" is a cheap credibility line if the home layout is pulled in to
     ±30°. Today it would be untrue.
7. **Text-led teaching remains.** Rival and arena intro cards (`ready.png`), "New part: …"
   (`home.png`), "Finish your first match / Put your top in the arena"
   (`match-system.ts:616`). Each is one line, which is fine. But the award rewards cues that are
   icons, motion and sound.
8. **No music with identity.** `audio.ts:303` is a drone with hammer ticks. There is no win
   sting and no theme. A judge's memory of a game is often its sound. Trailer advice says "bad
   music choices" are among the most common mistakes
   ([codecks](https://codecks.io/blog/2023/creating-video-game-trailers-best-practices/)).
9. **No way to carry the game out of the headset.** There is no result line, code or link a player
   could send. Best Reason to Come Back asks for "a loop that pulls the user back tomorrow"; a
   shared daily result is the cheapest proven version of that
   ([Wordle](https://en.wikipedia.org/wiki/Wordle)).
10. **The smith has no face.** The player is "the smith" in name only. Rivals are archetypes with
    medallions, which is good, but nothing says "*this* is your forge, *your* mark". The fantasy
    (heat, hammer, quench) appears in words (WHITE HOT, SLAG) more than in actions. There is no
    hammer, no quench hiss you cause, and nothing you sign.

---

## 3. The vision

### 3.1 One sentence

> **Your table is the anvil: strike it to forge an arena out of the wood, rip your hand-made top
> into it, and hammer the table to win the fight.**

### 3.2 The hook moment

> **A judge slams a palm on their own desk. They feel the real thud and hear a forge boom. The
> arena jumps, and the rival's top leaps the rim, clatters across the real wood and topples next
> to their coffee mug.**

Why this is the hook:
- **It cannot exist without the headset and the table.** It passes the take-it-away test
  literally: no table, no strike.
- **It is the one gesture in the game with real touch feedback.**
- **It turns "smith" from a word into a verb.**
- **It is one shot in a video**: a real hand, a real table, a real sound, a virtual consequence.

Everything already built stays: the forge, the rip, ramps and wells, orders, the workshop. The
reframe adds **one shared detector** (a palm strike on the real table) and spends it twice:
1. once to **open** the game;
2. once as the **signature finisher**.

### 3.3 Candidate additions and reframes

Sizes are focused developer days. "Value" is the expected gain in winning odds on a 1-10 scale,
judged against the criteria and awards. The table is ranked by value per day (risk-adjusted).

| Rank | Idea | Value | Days | Value/day | Risk | Quest |
|---|---|---|---|---|---|---|
| 1 | A. Strike to forge: the opening and placement by a palm strike | 8 | 1.5 | **5.3** | Medium | Tuning |
| 2 | B. Anvil Strike: the signature finisher | 8 | 2 | **4.0** | Medium | Tuning |
| 3 | C. Juice for the camera: heat, quench and table sparks | 5 | 1.25 | **4.0** | Low | No |
| 4 | D. Inclusive by default: an accessibility pass | 5 | 1.25 | **4.0** | Low | Light |
| 5 | E. The Forgemaster: a voice that calls the fight | 4 | 1.25 | **3.2** | Low-medium | Mix only |
| 6 | F. Duel codes: async ghost tops and pass-the-headset duels | 6 | 2.5 | **2.4** | Low | No |
| 7 | G. Sign your top: a fingertip sigil | 4 | 1.5 | **2.7** (2.0 adj.) | Medium | Yes |
| 8 | H. The floor is the table: passive-haptic arena (spike) | 8 | 3 | **2.7** (1.6 adj.) | High | Yes |
| 9 | I. The rival forges a counter | 4 | 2 | **2.0** | Medium (balance) | No |
| 10 | J. Real objects as obstacles (a real cup as a pillar) | 6 | 4 | **1.5** (0.8 adj.) | High | Yes |
| — | Rejected: LLM rival or commentator, live networked multiplayer | — | — | — | — | — |

#### A. Strike to forge (opening and placement)

- **What it is.**
  - After Enter, a molten handprint glows on the detected table, or on the tray when there is no
    table, at the comfortable spot `placeArena` already computes. The cue: "Strike your table."
  - The player slaps the wood. The arena **forges up out of the table** at the strike point:
    - a ring of sparks;
    - the rim rising from below the surface over 0.8 s;
    - a boom.
  - The player's top is already glowing white-hot on its dock, and it hisses as it cools.
- **What it also fixes.**
  - **Placement:** the player chooses the spot, so a small table or a table edge is solved by the
    player rather than by the plane polygon (the open WP6 item).
  - **Height:** the fingertip and palm heights at impact give the true table surface within a few
    millimetres. Plane heights from Space Setup can be off by a centimetre or two.
- **Fallbacks.** After 6 s without a strike, it places as now (`SETTLE_MAX`). A pinch on the
  handprint also works, for players who cannot or will not strike.
- **The player moment:** "I hit my desk and the game came out of it."
- **Why it matters.**
  - **Best First Five Minutes:** the first action is physical, needs no words, and pays off in 2
    seconds.
  - **Innovation, Boldest Original Concept:** it is purposeful passthrough.
  - **Technical:** it is robust to rooms the developer never tested.
- **Precedent.**
  - BEATABLE turns any table into an instrument and calls it "real-world haptics", with a fast
    calibration step
    ([Road to VR](https://roadtovr.com/beatable-hand-tracking-rhythm-quest-release-date/)).
  - First Encounters, the Quest 3 MR showcase, opens with the room being broken into, which is
    the "the room reacts" opening that judges know
    ([Meta](https://developers.meta.com/horizon/discover/success-stories/first-encounters/)).
- **How to build it.**
  - A pure `strike.ts` detector from the wrist and palm joints (the wrist is already read,
    `hands.ts:98`), over the last 150 ms of samples:
    1. the hand is roughly palm-down above the plane;
    2. its downward speed is at least about 0.8 m/s;
    3. it decelerates to near zero within 3 cm of the table plane, or within 3 cm of the lowest
       point if there is no plane.
  - Unit tests on synthetic traces in `sim-check`.
  - A forge-up animation in `ArenaView` (scale y from 0 plus sparks), and a sound.
- **Size:** 1.5 days, then 0.5 day of device tuning.
- **Risk:** medium.
  - Fast motion is where hand tracking loses the hand. Meta's native "Fast Motion Mode" is not
    exposed to WebXR
    ([Hands 2.2](https://developers.meta.com/horizon/blog/hand-tracking-22-response-time-meta-quest-developers/)).
  - Mitigation: accept a strike when the hand is lost mid-swing but reappears on the plane within
    150 ms.
  - The pinch fallback means it can never block entry.
- **Needs the Quest:** for thresholds only.

#### B. Anvil Strike, the signature finisher

- **What it is.**
  - During a fight, once per round, a hammer icon on the near rim fills with heat from clashes. It
    reuses the shaping-charge embers' logic.
  - When it is full, the player slams the real table beside the arena. The arena jolts: a radial
    impulse through the sim lifts and shoves both tops away from the point of the arena nearest
    the strike.
  - The result depends on the builds:
    - light, tall tops hop the rim;
    - low, heavy tops (Stub core, Anvil ring) ride it out.
  - A strike-caused finish reads **"YOUR STRIKE → THROWN"**, with the existing slow motion.
  - Late rivals (Bastion) can strike too, shown as a cyan hammer flash on the far rim: one
    telegraphed beat, so the player can brace with a well.
- **The player moment:**
  - the timing gamble: strike while the rival is on the rim, but your own top is nearer the wall;
  - the real thud under the palm.
- **Why it matters.**
  - It is the hook moment (section 3.2) and the video's opening shot.
  - Boldest Original Concept: the room is an input device.
  - It deepens the build layer (height and mass now answer "how do I survive a strike"), which
    serves the gameplay doc's "I built this, I launched it, my decision won".
  - It is the bold verb that the current fingertip verbs lack (section 2, item 2).
- **Precedent.**
  - The table slam was in the original design (`DESIGN.md`) and in the review (F2.5). It was cut
    only for time.
  - Table Troopers' lesson: "infer player intention" from recent hand samples to reach the
    reliability that competition play needs
    ([Meta](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)).
  - Real-surface touch is precise and preferred ([arXiv 2607.02430](https://arxiv.org/abs/2607.02430)).
- **How to build it.**
  - Same detector as A.
  - `sim.ts`: an `Arena.strike(x, z, power)` impulse, deterministic, with a `report:shaping` row
    ("strike at the best moment" against "none").
  - Target: the strike adds +6-10 points to the win rate and an own-KO rate under 12%. That keeps
    the "a decision, not a reflex" rule.
- **Size:** 2 days, then device tuning.
- **Risk:** medium.
  - **False triggers from hands resting on the table.** Mitigations: the velocity threshold, the
    charge gating, and ignoring strikes while pinching.
  - **Balance.** The report row is the guard.
- **Kill rule (by Nov 1):** fewer than 17 of 20 strikes detected, or more than 1 false trigger in
  5 rounds. In that case, change the gesture to a "palm press": a flat palm held on the table for
  0.3 s. It is slower but certain, and keeps the real-table feedback.
- **Needs the Quest:** for tuning.

#### C. Juice for the camera: heat, quench and table sparks

- **What it is.** Visuals for moments that already exist:
  - Tops glow and leave a short heat trail above a spin threshold.
  - Clash sparks fall *onto the real table* and die there. This reuses the WP4 table-bounce code.
  - The quench slot gives a hiss and a steam puff when you save a top.
  - A 2-bar win sting and a lower forge theme (made by the developer or CC0, decision D6).
- **The player moment:** every action has a sensory echo, which matters more without haptics.
- **Why it matters:** Polish & Presentation ("art direction, and sound design" are in the
  criterion's text). It is also the video's texture.
- **Precedent:** trailer guidance ranks readable action and good music above everything else
  ([presskit.gg](https://presskit.gg/field-guides/game-trailers-screenshots-guide),
  [codecks](https://codecks.io/blog/2023/creating-video-game-trailers-best-practices/)).
- **Size:** 1.25 days.
- **Risk:** low. Watch draw calls: use one instanced spark mesh.
- **Needs the Quest:** no, but check the frame cost in T1.

#### D. Inclusive by default: an accessibility pass

- **What it is.** Mostly stating and finishing what is nearly there:
  1. **One hand, either hand.** Every verb already works with one hand. Say so on the landing page
     and in the notes, and verify a left-hand-only run.
  2. **Assisted rip.** In the forge, a "steady launcher" toggle (the dev `L` key path already
     launches at 80%): tap your top to launch at a fixed 75%, aimed at the rival. XP is unchanged.
  3. **Reach assist.** Every hub and forge target is also ray-pickable (most are), and a strike can
     be replaced by a palm press (B's fallback).
  4. **Not colour alone.** The player is orange and the rival cyan, which is already colour-blind
     safe for the common types. Add a shape cue as well: a chevron emblem on your top and the bar,
     a ring on the rival's.
  5. **Captions for sounds.** The finish words are already captions; add a "NEW RIVAL" sting
     label.
- **The player moment:** a player with one usable hand, or less precise motor control, plays the
  whole game.
- **Why it matters.**
  - Experience Design.
  - A supporting line for **Best Accessibility Forward Experience**. That award's text names voice
    and eyes-only input, which we cannot do well in WebXR, so this is a long shot.
  - Meta's VRCs recommend one-handed play (Accessibility.4), more than colour alone (.6) and
    seated reach (.9)
    ([checklist](https://developers.meta.com/vr/design/accessibility-checklist/)).
  - Table Troopers markets "one hand… the other free for snacks"
    ([Meta](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)).
- **Size:** 1.25 days.
- **Risk:** low.
- **Needs the Quest:** only a left-hand pass.

#### E. The Forgemaster: a voice that calls the fight

- **What it is.** 25-40 short recorded barks, played by rules rather than AI:
  - "White hot!"
  - "Thrown!"
  - "Your ramp!"
  - "Iron Keep holds the middle — lift it out."
  - "Order done."

  Record them in the developer's own voice, run through a light filter, or as one fixed character.
  Panned to the arena. A mute option.
- **The player moment:** the game reacts to *you* like a sports announcer. This also replaces
  some text cards (gap 7) with sound.
- **Why it matters:**
  - Polish;
  - First Five Minutes (teaching by voice);
  - identity for the smithy.
- **It is not "agentic AI", and should not be called that.**
- **Precedent:** announcers in fighting and sports games.
  - The Web Speech API's synthesis exists in browsers
    ([MDN](https://developer.mozilla.org/docs/Web/API/Web_Speech_API)), but Quest Browser support
    and voice quality are unverified. Prefer recorded files.
- **Size:** 1.25 days.
- **Risk:** low-medium. Barks can grate; keep them rare and with a cooldown.
- **Needs the Quest:** the mix only.

#### F. Duel codes: async ghost tops and pass-the-headset duels

- **What it is.**
  - A champion's build plus its best recorded rip (power and aim) packs into a short code, about
    10 characters, or a link `…?duel=XXXX`.
  - The deterministic sim plays a friend's top as the rival, launched with *their* rip and named
    with their sigil (G) or initials.
  - On one headset, "Smith vs Smith" alternates: each player forges, then fights the other's ghost
    and shapes live, best of 3.
  - On exit, the 2D page shows today's order result as a share line ("SpinSmith Oct 21 · Hookjaw
    · THROWN by ramp · 3-1") and a copy button.
- **The player moment:** "Beat my top" sent to a friend, and a sofa duel passing the headset.
- **Why it matters:**
  - **Best Reason to Come Back:** a social pull with no server.
  - A *weak* claim on **Social & Multiplayer**, whose text asks for "shared presence". This is
    asynchronous; be honest about it.
- **Precedent.**
  - Wordle's spoiler-free share grid ([Wikipedia](https://en.wikipedia.org/wiki/Wordle)).
  - Ghost Pro Racing's async ghost links in HTML5
    ([PlayCanvas forum](https://forum.playcanvas.com/t/ghost-pro-racing-async-multiplayer-racer/40733)).
  - Trackmania's ghost racing
    ([Wikipedia](https://en.wikipedia.org/wiki/Trackmania_(2020_video_game))).
- **Size:** 2.5 days.
- **Risk:** low technically. The real risk is that judges never use it: one person, one session.
- **Needs the Quest:** no.

#### G. Sign your top: a fingertip sigil

- **What it is.** In the forge, trace a sigil with the index fingertip on the top's face. Store it
  as 16-24 points, simplified. It is stamped glowing on your top, your champions, the ledger
  and duel codes.
- **The player moment:** ownership, as in "I built this top", made literal.
- **Why it matters:** identity (gap 10), Come Back (collection pride), and a 3-second video beat.
- **Precedent:** the craft-and-sign fantasy of hand-built toys. HandCraft XR was a 2025 Judges'
  Choice for hand crafting
  ([winners](https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/)).
- **Size:** 1.5 days.
- **Risk:** medium. Fingertip drawing in mid-air is imprecise (gap 1), so it must be forgiving.
- **Needs the Quest:** yes.

#### H. The floor is the table: a passive-haptic arena (timeboxed spike)

- **What it is.** Remove the pedestal on a real table:
  - The arena's floor plane sits *at* the calibrated table surface (from A).
  - The rim stands a few cm proud, and the body is drawn as a recess forged into the wood.
  - Pinching the floor means pinching at the wood. A well becomes a fingertip **tap on the
    table**, triggered on contact while moving down, not on penetration.
  - Bowl depths are small (`arenas.ts`: 0.007-0.012 local, so 1.4-2.4 cm in the world; the
    Clockwork Spire is 9 cm and keeps its pedestal), so the error is small.
- **The player moment:** every touch on the arena is a real touch.
- **Why it matters.** This is the deepest version of the vision and the strongest
  Boldest-Original claim. But it changes the feel of verbs that are not yet verified.
- **Precedent:**
  - BEATABLE (real-world haptics);
  - [arXiv 2607.02430](https://arxiv.org/abs/2607.02430) (physical surfaces make touch precise);
  - the passive-haptics literature.
- **Size:** 3 days if adopted.
- **Risk:** high.
  - It depends on calibration accuracy.
  - It needs occlusion to look right (the floor drawn over fingers that touch the wood).
  - The hub props' heights change.
- **Do only:** a 0.5-day spike behind `?sunk` on the device in week 3. Adopt it only if T5 and T6
  pass *better* than the pedestal. Otherwise drop it with no regret.
- **Needs the Quest:** yes.

#### I. The rival forges a counter

- **What it is.** Before a rematch, the rival's anvil on the far rim shows it re-forging: the worker
  (`check-worker.ts`) searches the 136 builds for a counter to your top on this arena, using the
  sim. The card reads "Iron Keep studied your Spur."
- **The player moment:** a nemesis that adapts, which mirrors the player's own loop of "observe →
  theory → change → test".
- **Why it matters:**
  - Innovation;
  - Come Back;
  - a defensible line under **Agentic Interaction**'s "procedural content, context-aware". It is
    simulation search, not an LLM; say so.
- **Size:** 2 days.
- **Risk:** medium. A perfect counter is unfun, so cap it (pick from the top 30%, never the best).
- **Needs the Quest:** no.

#### J. Real objects as obstacles (a real cup as a pillar)

- **What it is.** Mark a real object (touch its top) or detect it with depth, and it becomes a
  pillar or bumper in the arena.
- **Why not now.**
  - With an 8 cm pedestal, a cup cannot physically be inside the arena.
  - With H, it could, but it needs depth sensing to locate it, plus occlusion.
  - Laser Dance does room-aware layouts with a full 3D scan
    ([UploadVR](https://uploadvr.com/laser-dance-mixed-reality-impressions)). That is not a
    six-week WebXR job.
- **Size:** 4 days.
- **Risk:** high.
- **Status:** post-competition.

#### Rejected

- **An LLM rival or commentator.** It needs a server or an API key shipped to clients, and that
  conflicts with the no-external-services stance. It adds latency in a 15-second round, and
  on-device models are too heavy for Quest Browser alongside the game.
- **Live networked multiplayer.** It needs signalling and hosting beyond static pages, and a second
  headset to test. Table Troopers shows the appeal, but not in six weeks for one person.
- **Passthrough-camera AI (object recognition).** In WebXR the `camera-access` feature is rejected
  in immersive-ar on Quest Browser, and only a `getUserMedia` workaround exists
  ([Meta forum](https://communityforums.atmeta.com/discussions/Questions_Discussions/request-webxr-raw-camera-access-camera-access-feature-in-quest-browser/1367463)).

---

## 4. Recommended plan

### 4.1 The picks

| Pick | Why | Days |
|---|---|---|
| **1. A, Strike to forge** | The best value per day. It is the first-five-minutes moment and the placement fix in one | 1.5 + 0.5 device |
| **2. B, Anvil Strike** | The hook and the signature. Shares A's detector, so it is cheap after A | 2 + device tuning |
| **3. C, Juice for the camera** | Polish and video texture. No device risk | 1.25 |
| **4. D, Inclusive by default** | Cheap, raises Experience Design, and gives a credible accessibility paragraph | 1.25 |

**Total: about 6.5 days of build plus about 1 day of device tuning.** WP1-13 finished ahead of the
action plan's weeks 1-2, so this fits in the time the plan had reserved for them, without touching
the Quest protocol or the freeze dates.

**Promote, from the existing plan:** Q2 depth occlusion is now a **must-try** (gap 4), because the
strike and the pinch both happen right at the surface where hand-under-floor errors show.

**Optional, only if every device gate passes by Oct 30:** E (Forgemaster barks, 1.25 days), then H
as a 0.5-day spike. F and G only after the submission.

### 4.2 Cut or freeze now

- **Freeze:** the arena workshop, orders, medallions, champions, levels and parts. They are done;
  judges will not see more.
- **Cut:** new arenas, parts and rivals; anchors; mesh-based physics; LLM features; networking;
  F (duel codes) and G (sigil) for the competition build.
- **Hookjaw and Bastion gating:** keep as is. If B ships, give only Bastion a strike.
- **Docs:** `TOP-CUSTOMIZATION.md` stays private (D5). Do not link the source repo.

### 4.3 Week-by-week fit with the existing schedule

| Week | Dates | Work | Gate |
|---|---|---|---|
| 1 | Oct 8-13 | `strike.ts` detector and synthetic tests in `sim-check`. Strike-to-forge flow with the pinch and 6 s fallbacks. `Arena.strike` in the sim and a `report:shaping` row. **D accessibility pass.** Decide D1 (hosting) and D6 (music) | `check:sim` green. The strike row meets +6-10 points of win rate and own KO under 12% |
| 2 | Oct 14-20 | **B in the game:** the hammer charge, YOUR STRIKE credit, Bastion's strike. **C juice and sting.** Cover and logo drafts from the emulator. Buy a Quest on Oct 20 if none is in hand | The emulator flow runs: strike → forge-up → rip → strike KO |
| 3 | Oct 21-27 | **The Quest arrives → Q0 protocol plus a new T14 "Strike":** 20 deliberate slams, 10 rounds with resting hands. Then Q1 tuning. Q2 occlusion (must-try). Optional 0.5-day H spike | T1, T3, T4, T5 and T14 pass |
| 4 | Oct 28-Nov 3 | Q3 playtests: 3-5 fresh players, with "did they strike unprompted?" and "did they retell it?" added. **Nov 1: the B kill rule** (palm-press fallback). Optional E if the gates are green | Playtest metrics recorded |
| 5 | Nov 4-10 | **Feature freeze Fri Nov 6.** Video capture Nov 7-9 (section 5), edit Nov 9-10. Final cover | Rough cut ≤ 2:30 |
| 6 | Nov 11-17 | **Code freeze Fri Nov 13.** Deploy Mon Nov 16. Cold-start tests. Video public. **Submit Tue Nov 17** | Submitted |

**If the Quest never arrives:**
- Ship A with the pinch-to-place fallback as the main path and keep B behind a dev flag. A
  strike tuned only in the emulator is not trustworthy, and an untrusted signature move is worse
  than none.
- Put the time into C, D and E.
- Expect about 6.5.

---

## 5. Presentation strategy

### 5.1 Title, tagline, thumbnail

- **Title:** keep **SpinSmith**. It is short, ownable (no game of that name was found in a web
  search) and says "top" plus "smith". In text, add a descriptor: *SpinSmith: a table-top
  forge battler for hands*.
- **Tagline (140 characters max):**
  > Strike your real table to forge an arena, rip your hand-built top into it, and hammer the table to win.

  Alternatives:
  - "Your table is the anvil." (short form, for the thumbnail)
  - "Forge it. Rip it. Strike the table."
- **Thumbnail and cover (16:9):**
  - An over-the-shoulder passthrough shot of a real wooden desk with warm daylight.
  - A real hand frozen at the bottom of a slam, with a soft motion streak.
  - The arena glowing molten orange from the strike, and a cyan top mid-air above the rim with
    sparks.
  - A coffee mug in frame for scale and "real room".
  - Logo top-left; three words of text at most: **YOUR TABLE IS THE ANVIL**.
  - No UI plates in the cover.

### 5.2 The video's first 10 seconds

Trailer rules that apply:
- hook within 5 seconds;
- no logo first;
- real gameplay;
- under 2:30 if possible, even though 3:00 is allowed;
- "lead with the story and what makes your project distinct".

Sources: [presskit.gg](https://presskit.gg/field-guides/game-trailers-screenshots-guide),
[codecks](https://codecks.io/blog/2023/creating-video-game-trailers-best-practices/),
[judging](https://start-developer-competition-26.devpost.com/details/judging).

| Time | Shot | Sound |
|---|---|---|
| 0:00-0:02 | Passthrough, a real empty desk. A palm slams it. The arena **forges up out of the wood** in sparks | The real thud (external mic) + the forge boom |
| 0:02-0:05 | A pinch and a pull: the top rips in, white hot | Cord tension, launch |
| 0:05-0:09 | The rival on the rim. A second slam: the rival hops the rim, skids across the real desk and topples by the mug. Slow motion. **YOUR STRIKE → THROWN** | Thud, clang, clatter, the win sting |
| 0:09-0:10 | Cut to black: **SpinSmith** · "Your table is the anvil" | The sting resolves |

Then keep the `SUBMISSION.md` storyboard from 0:12, with two changes:
- the forge segment gets the quench hiss;
- the "two verbs" segment becomes "three verbs: ramp, well, strike".

Capture notes:
- Record in-headset in passthrough with a second phone camera for the hands-on-table cut. Two
  takes per shot.
- Label any slow motion as in-game slow motion (it is), so the "honestly represents" rule holds.
- Never add effects in the edit that the game does not do.

### 5.3 Which awards to aim the text at

1. **Boldest Original Concept (primary).** Write the description around "the table is the
   anvil".
   - The arena is forged out of your table with a strike.
   - The fight is decided by striking it.
   - Knocked-out tops land on it.
   - The award text says "the idea that couldn't exist anywhere else"; make that sentence true and
     quote it back.
2. **Best First Five Minutes (secondary, the most evidenced).**
   - Give the timed path: strike → arena in 2 s → first rip under 45 s → first knockout → first
     forge.
   - Include the T13 playtest numbers ("4 of 5 players launched unaided in under 60 s").
3. **Best Reason to Come Back (supporting paragraph).** Daily orders, medallions, the ledger and
   tomorrow's teaser, with `?demo` in the testing notes. It is real but not distinctive, so do
   not lead with it.
4. **Accessibility:** one paragraph (one hand, either hand, assisted rip, palm-press alternative,
   colour plus shape cues, seated). Do not claim more.
5. **Do not claim** Social & Multiplayer or Agentic Interaction. The rival counter-forging (I),
   if built later, is "simulation-driven", not AI.

The "how we built it" section should stay as it is: the deterministic sim, balance reports,
headless checks, IWSDK, no install. It earns Technical credibility cheaply.

---

## 6. Sources

Competition:
- Overview and design guidelines: https://start-developer-competition-26.devpost.com/
- Judging criteria: https://start-developer-competition-26.devpost.com/details/judging
- Special awards: https://start-developer-competition-26.devpost.com/details/special-awards
- Meta announcement (VR Glasses, hands-first, "a tight vertical slice"): https://developers.meta.com/blog/meta-connect-2026-vr-start-developer-competition/
- UploadVR on the competition and the VR Glasses: https://www.uploadvr.com/meta-launches-1-million-competition-for-hands-first-apps-ahead-of-vr-glasses/
- VR Glasses field of view, store priority for hand-tracked apps: https://vr.org/articles/meta-vr-glasses-store-hand-tracked-apps-first-v207-sdk-2026
- Road to VR on the competition: https://roadtovr.com/?p=232601

Previous winners and comparable games:
- 2025 winners: https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/
- Dun Jun (IWSDK winner): https://devpost.com/software/dunjun
- Table Troopers (hands-first tabletop MR, one hand, intent inference): https://developers.meta.com/horizon/discover/success-stories/table-troopers/
- BEATABLE (the table as an instrument, "real-world haptics"): https://roadtovr.com/beatable-hand-tracking-rhythm-quest-release-date/
- First Encounters (room-reactive MR opening): https://developers.meta.com/horizon/discover/success-stories/first-encounters/
- Laser Dance (room-aware procedural MR): https://uploadvr.com/laser-dance-mixed-reality-impressions
- Pocket Lands (tabletop MR diorama): https://www.uploadvr.com/pocket-lands-impressions/
- Lasertag (co-located MR, depth meshing): https://www.uploadvr.com/developer-implemented-continuous-scene-meshing-quest-3-lasertag/

Interaction, haptics, accessibility:
- Ying & Heo (2026), "Physical surfaces make touch interactions in virtual reality precise, efficient, and bimanual": https://arxiv.org/abs/2607.02430
- Meta accessibility checklist (VRC.Quest.Accessibility.3, .4, .6, .9): https://developers.meta.com/vr/design/accessibility-checklist/
- Hands 2.2 and Fast Motion Mode: https://developers.meta.com/horizon/blog/hand-tracking-22-response-time-meta-quest-developers/
- Meta hands UI best practices: https://developers.meta.com/horizon/design/hands-ui-best-practices/
- Web Speech API: https://developer.mozilla.org/docs/Web/API/Web_Speech_API
- WebXR camera access on Quest Browser (not available in immersive-ar): https://communityforums.atmeta.com/discussions/Questions_Discussions/request-webxr-raw-camera-access-camera-access-feature-in-quest-browser/1367463

Asynchronous and social precedents:
- Wordle and its share grid: https://en.wikipedia.org/wiki/Wordle
- Ghost Pro Racing (async ghost links, HTML5): https://forum.playcanvas.com/t/ghost-pro-racing-async-multiplayer-racer/40733
- Trackmania (ghost racing, Track of the Day): https://en.wikipedia.org/wiki/Trackmania_(2020_video_game)

Trailers:
- presskit.gg trailer guide: https://presskit.gg/field-guides/game-trailers-screenshots-guide
- Codecks, trailer best practices: https://codecks.io/blog/2023/creating-video-game-trailers-best-practices/

Local evidence (Oct 7, 2026):
- `npm run check:sim`: all passed.
- `report:shaping`: none 46%, pushOut 57%, centerWell 51%; against a ramping rival, none 36% and pushOut 47%.
- `report:arenas`: medians 15.0-22.3 s.
- `npm run build`: main chunk 2,508 KB, 699 KB gzip.
- Screenshots: `docs/review/{home,ready,fight,result,forge,workshop}.png`.
- Code: `placement.ts:7-8,31-45,60`, `match-system.ts:616,1212`, `hands.ts:98`, `audio.ts:303`, `reach.ts:17-28`, `index.html:48`.
