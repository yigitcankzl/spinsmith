# Fight interaction: why shaping the arena mid-fight does not land, and what to do about it

Written October 7, 2026. Feature freeze is November 6 and the competition deadline is November 18.
This doc follows up `ARENA-SHAPING.md`. That doc built the ramp, the well, charges, strain, rival
ramps and the cause line. This one asks why the result still does not feel like playing, and
answers with numbers.

Every number below comes from the real simulation (`src/game/sim.ts`, `shaping.ts`), run by
throwaway scripts in `/tmp/fx`. The scripts are not in the repo. Their key code is in the
appendix. They use a copy of `sim.ts` with the shape constants exposed so they can be tuned
(section 8.1). No repo source file was changed.

---

## 0. Summary

- **A real player is almost no better than doing nothing.** The repo's `pushOut` report
  policy wins 57%. It places a perfect ramp the same frame the rival enters the outer band,
  with no reaction time and no hand motion. Now add a realistic hand loop: 0.25 s reaction,
  0.3 s pinch-lift-release, 70 ms tracking, about 1.2 cm and 15° of error, and even an
  orbit-leading prediction. The same idea then wins **48%** against **46%** for not shaping at
  all. That is +2 points, inside noise (1,296 rounds per row). A random masher gets 46%.
- **76% of a real player's ramps are never touched by a top.** The ramp appears when the
  pinch is released, about 0.62 s after the decision. By then the median top has moved
  **about 20 cm in the world**. The ramp's sigma is 7.2 cm.
- **A decisive moment is rare.** In 48% of rounds there is no 0.5 s moment where a perfectly
  placed ramp would cause a knockout that would not otherwise happen. Averaged over all
  rounds, the decisive window is about **0.5 s out of a 16 s round (3%)**. The push-out
  trigger, "rival in the outer band", is true for only **18%** of fight time.
- **The well does nothing.** A human well under their own top: 45% against 46%, with flips
  won and lost both 9%.
- **The grace and the charges are not the problem.** With a 0.5 s grace instead of 2.5 s,
  the human wins 48% (unchanged). Humans spend about 2.4 charges a round. The economy is
  rarely what stops them.
- **Recommended: "Ramp on pinch + Cup & Sling"** (options A + D below).
  - The ramp appears the moment you pinch, bigger and longer-lived. You aim it by dragging.
  - The well becomes a cup that catches one top. You fling it out with a pull-and-release,
    the same verb as the launch.
  - Measured with the same human model: shaping goes from **48% → 57-61%** (+11 to +15
    points over not shaping).
  - Flips won/lost against an identical no-shaping twin go from **6%/4% → 19-23%/8%**.
    Untouched shapes go from **76% → 27%**.
  - Rounds get shorter: median **17.3 → 11-13 s**, so it needs one tuning knob.
  - Random use stays at 46-49%, so the gain comes from skill.
  - About 7 days of work, staged so the small half (A) ships by itself if headset tests
    reject the cup.

---

## 1. Diagnosis: a round from the player's chair

### 1.1 Second by second (Forge Bowl, typical round, today's build)

| Time | What happens | What the player can do | Feel |
|---|---|---|---|
| 0-2.5 s | Launch, tops spiral in, first clashes (the median clash gap is 0.30 s) | Nothing. Shaping is blocked by the grace | Watching. Fine for 2.5 s |
| 2.5-~16 s | Tops circle with a median lap of 2.07 s, at 25-40 cm/s in the world (p90 50-73 cm/s), clashing about every 0.3 s and hard (≥ 0.45) every 0.66 s | Make a ramp: keep a hand hovering within about 12 cm of the floor, pinch, lift, pull to aim, release. Or poke a well | The rival is in the outer band only 18% of the time. When it is, it takes about 0.6 s from seeing to the ramp existing, and by then the rival is about 20 cm along its path |
| Shape lands | A spike up to about 10 cm tall in the world, 7 cm sigma, full strength for 0.5 s, then relaxing with tau 0.8 s | Wait for a charge (2, refill on a hard clash or after 6 s) | 3 out of 4 ramps sit in empty floor and dissolve. "Thock... nothing" |
| ~16-18 s | Usually a spin-out (the human shaper gets only 18% KO wins) | Nothing useful | Watching. No cause line, because nothing was caused |

The player has about 2.4 actions in a round. Each one takes about 0.6 s of effort, so the player
is acting for roughly 1.5 s of 15. Fewer than one of those actions touches a top.

### 1.2 The numbers behind it

Kinematics come from unshaped rounds after the grace: 216 rounds, all arenas and matchups. World
values are at the 2.4x display scale.

| Measure | Value |
|---|---|
| Top speed, median (Striker / Anvil / Halo) | 40 / 25 / 36 cm/s in the world |
| Top speed, p90 | 70 / 49 / 73 cm/s |
| Rival lap time, median | 2.07 s |
| Share of fight time the rival is in the outer band (> 0.55 R) | 18% |
| Clash gap, median (any / strong ≥ 0.45) | 0.30 s / 0.66 s |
| Ramp sigma | 3.0 cm local = 7.2 cm in the world |
| Time for a median top to cross 2 sigma of a ramp | 0.44 s |
| Human see-to-shape lag (0.25 s reaction + 0.30 s gesture + 0.07 s tracking) | 0.62 s, about 20 cm of travel |
| Far (ray) ramp: time to grow from the minimum to full height (`RAY_BUMP_RATE`) | 0.8 s |

**Decisive opportunities.** Every 0.5 s after the grace, the script clones the fight and adds a
push-out ramp. It counts the moment if the rival is knocked out within 3 s when it would not be
without the ramp, and the player's top survives. Sampled on 54 rounds:

| Who places it | Ramp sigma (world) | Decisive seconds per round | Share of round time | Rounds with at least one |
|---|---|---|---|---|
| Oracle: instant, exact | 7.2 cm | 0.59 s | 3.8% | 54% |
| Human: 0.62 s lag, orbit lead | 7.2 cm | 0.46 s | 3.0% | 52% |
| Human | 10.8 cm | 0.88 s | 5.7% | 66% |

### 1.3 How often a shape matters

Below, "flips" compares each round with its **twin**: the same launch and the same deterministic
sim, with no shaping.
- **Flips won**: rounds the shaper won that the twin lost.
- **Flips lost**: rounds the shaper lost that the twin won. These are real own goals.
- **Shape-decided KO**: the rival was knocked out within 1.5 s of the player's shape, and the
  twin lost.
- **Unnoticed**: no top came within 1.2 sigma of the shape while it was above 30% strength.

All six arenas, 3x3 matchups, 24 rounds each: 1,296 rounds per row. The standard error of the
win rate is about ±1.4 points.

| Policy (today's rules) | Win | KO wins | Median round | Shapes/round | Flips won / lost | Shape-decided KO | Own KO ≤ 1.5 s after own shape | Unnoticed |
|---|---|---|---|---|---|---|---|---|
| No shaping | 46% | 13% | 17.9 s | 0 | – | – | – | – |
| Masher (random ramps and wells, as often as charges allow) | 46% | 17% | 17.0 s | 5.6 | 9% / 10% | 4% | 13% | 48% |
| Repo `pushOut` (0 s lag, exact) | 57% | 30% | 15.6 s | 2.8 | 16% / 5% | 13% | 6% | 0% |
| **Human push-out** (0.62 s lag, orbit lead, 1.2 cm / 15° error) | **48%** | 18% | 17.3 s | 2.4 | 6% / 4% | 4% | 6% | **76%** |

The lag sweep comes from 432-round runs, so the noise is about ±2.4 points:

| Human push-out, lag from decision to shape | Win | Unnoticed |
|---|---|---|
| 0.35 s (the shape appears at the pinch, no lift) | 53% | 44% |
| 0.62 s (today's near ramp) | 48% | 79% |
| 0.90 s (far ray ramp, held to grow) | 46% | 86% |
| Human, aiming where the rival *is* (no lead), 0.62 s | 47% | 70% |
| Human centre well (under own top), 0.62 s | 45% | 12% (touched, but useless: flips 9% / 9%) |
| Human push-out with a 0.5 s grace | 48% | 80% |

Shape size against lag: the share of a human's ramps that a top touches, and the win rate (432
rounds each):

| Ramp sigma (world) | Hold / tau | Lag | Touched | Win |
|---|---|---|---|---|
| 7.2 cm (today) | 0.5 s / 0.8 s | 0.62 s | 24% | 48% |
| 10.8 cm | 1.0 s / 1.0 s | 0.62 s | 34% | 48% |
| 7.2 cm | 0.5 s / 0.8 s | 0.35 s | 56% | 53% |
| **10.8 cm** | **1.0 s / 1.0 s** | **0.35 s** | **72%** | **55%** |
| 14.4 cm | 1.0 s / 1.0 s | 0.35 s | 84% | 53% (own KO 13%) |
| 10.8 cm | 1.5 s / 1.2 s | 0.35 s | 72% | 53% |

Size alone does not help, but **cutting the lag** does. Size helps only once the shape lands
within about a third of a second of the decision. Beyond 11 cm, own goals rise faster than the
gains.

### 1.4 The five problems, ranked

1. **The verb is timed against the target, and the hand loop is too slow for it.**
   - The ramp exists only on release, 0.62 s after the decision (0.9 s or more for the far
     version).
   - At 25-40 cm/s in the world, the target is gone. 76% of real ramps touch nothing, and the
     win gain is +2 points.
   - Meta's guidance warns against "time-based or reflex-heavy events" for hands
     ([Meta hands best practices](https://developers.meta.com/horizon/design/hands-best-practices/)).
     This verb is exactly that.
2. **Only one strategy works, and it works rarely.** The only measurable use is "push the
   rival out when it is near the rim".
   - The rival is there 18% of the time.
   - A perfectly placed ramp is decisive for about 0.5 s per round.
   - In the middle of the bowl, where the fight spends 82% of its time, no current shape does
     anything useful.
3. **The well has no purpose.**
   - 45-51% across all policies, with flips won and lost equal (9% / 9%).
   - Its brace effect (−50% knockback) and drag (3/s over 5 cm in the world) are too small to
     read and too small to matter.
   - Ramp and well are not a strategic pair. They are one useful verb and one decoy.
4. **The player has nothing to do for about 90% of the fight.**
   - Between the rare windows the player watches, which is the "no way to influence the
     battle once it started" complaint that autobattlers get
     ([itch.io comment](https://itch.io/post/14171752),
     [Teamfight Tactics](https://en.wikipedia.org/wiki/Teamfight_Tactics)).
   - The hand also has to hover within about 12 cm of the floor to be ready for a near ramp.
     That is tiring, and in passthrough it blocks the player's own view of the tops.
5. **Arenas do not change what shaping means.**
   - With today's human push-out, the net flips per arena are −1 to +3 everywhere except
     Clockwork Spire (+7).
   - The arena rules (embers, ice, the rocking dish, sumo) never interact with the shape. The
     arena intro promises a different game on each arena, but the fight verb is the same
     everywhere and weak everywhere.

**Not problems.**
- **The opening grace.** Cutting it to 0.5 s changes nothing (48%).
- **The charges.** They rarely bind a human.
- **Readability.** The cause line and the slow motion exist. They just almost never fire,
  because only 4% of rounds have a shape-decided KO.

---

## 2. Research: what makes mid-action intervention satisfying

Sources were opened or seen in search results on October 7, 2026. Earlier sources are in
`ARENA-SHAPING.md` §3.

**Pinball: nudge, tilt, flippers, ball save.**
- Players nudge *pre-emptively*, before the ball heads for a drain, not in reaction to it.
- Tilt gives escalating, visible warnings ("DANGER") before dead flippers.
- Ball save and magna-save are emergency tools at the outlane.
- Lesson: a soft, rate-limited influence with visible escalation, plus one dramatic rescue or
  finisher at the rim.
- Sources: [Glossary of pinball terms](https://en.wikipedia.org/wiki/Glossary_of_pinball_terms),
  [Pinball FX table mechanics](https://pinballfx.fandom.com/wiki/Table_Mechanics),
  [Digital Pinball Fans on tilt](https://digitalpinballfans.com/threads/can-someone-please-explain-how-tilt-works.4436/post-73631).

**Curling sweeping.**
- Sweepers never touch the stone. They change the ice in front of it, continuously and by
  small amounts. A stone can travel up to about 3 m further, and sweeping along the line of
  travel adds about 33% more than sweeping across it.
- Lesson: change the surface ahead of the agent. Small continuous influence is a proven verb.
  Section 4 shows why it fails in *our* bowl.
- Sources: [LeanCurling: why sweep](https://leancurling.com/sweeping-science/why-do-we-sweep),
  [sweeping angle](https://leancurling.com/sweeping-science/sweeping-angle),
  [PMC study](https://pmc.ncbi.nlm.nih.gov/articles/PMC7835804).

**Peggle.**
- One aimed shot, then watching. A moving Free Ball bucket keeps every shot's end tense.
- On the decisive peg the game slows down and zooms in (Extreme Fever).
- Lesson: one committed, aimed action plus a slow-motion payoff on the decisive moment.
  SpinSmith already has the payoff. It lacks the reliable action.
- Sources: [Peggle](https://en.wikipedia.org/wiki/Peggle),
  [Gamezebo](https://www.gamezebo.com/news/peggle-how-a-spark-started-a-fever/).

**Marble runs and physics toys.**
- In The Incredible Machine and Cogs you set up, then watch.
- Physical runs that allow intervention mid-run use **switches and stop/release gates**, not
  free forces. The fischertechnik Dynamic XXL "user can intervene in the marble's route" with
  a lever.
- Lesson: intervention reads best as a *catch, hold, release* or a switch at a junction, not
  as a nudge against a moving target.
- Sources: [Contraptions](https://en.wikipedia.org/wiki/Return_of_the_Incredible_Machine:_Contraptions),
  [Cogs](https://en.wikipedia.org/wiki/Cogs_(video_game)),
  [fischertechnik Dynamic XXL](https://www.fischertechnik.de/en/products/toys/marble-runs/544619-dynamic-xxl),
  [Marble It Up: Mayhem review](https://nintendoworldreport.com/review/48530).

**Beyblade and top games.**
- In Beyblade X, the stadium's gear rail gives the Xtreme Dash. Launch angle and bank shots
  are the only skilled inputs in physical play.
- BEYBLADE X XONE adds an Active Gauge that fills over time (Attack, Counter, Dash) and an
  X Gauge filled by big hits.
- In Ideal's Battling Tops (1968) there is no input after the launch.
- Lesson: impacts filling a meter is a proven model. No top game lets you physically catch
  and re-launch a top mid-fight, so that verb would be SpinSmith's own, and it echoes the rip.
- Sources: [Xtreme Beystadium](https://beyblade.fandom.com/wiki/Xtreme_Beystadium),
  [launch techniques](https://malloftoys.com/en-gb/blogs/news/advanced-beyblade-launch-techniques),
  [BEYBLADE X XONE on Steam](https://store.steampowered.com/app/3023070/_XONE/),
  [Battling Tops](https://en.wikipedia.org/wiki/Battling_Tops).

**God games.**
- Chahi on From Dust: "It would be very frustrating if the player can't anticipate what the
  plan is". Direct terrain shaping fixed a frustrating command-only version. Predictable
  cycles let players plan.
- Lemmings: a limited stock of skills, assigned in real time to autonomous walkers.
- Reus: shape only the land.
- Lesson: the player must be able to anticipate the agent's path, and terrain verbs need
  *predictable* agents.
- Sources: [Game Developer: From Dust](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-),
  [Lemmings](https://en.wikipedia.org/wiki/Lemmings_(video_game)),
  [Reus](https://en.wikipedia.org/wiki/Reus_(video_game)).

**Tabletop mixed reality with hands on Quest.**
- Demeo's hand tracking felt natural for picking up minis and dice, but small tracking
  errors are punished harshly.
- Reviews of Wall Town Wonders' hand mini-games call them charming but shallow.
- Lesson: tactile and forgiving input, with depth coming from the systems.
- Sources: [Demeo hand tracking](https://mixed-news.com/en/demeo-tabletop-vr-role-playing-game-gets-hand-tracking/),
  [Wall Town Wonders review](https://www.roadtovr.com/wall-town-wonders-review-quest-3/amp).

**Hand-tracking numbers.**
- Meta: targets of at least about 22 mm, forgiving gestures, clear audio and visual feedback
  in place of haptics, keep hands low, and avoid reflex events
  ([UI best practices](https://developers.meta.com/horizon/design/hands-ui-best-practices/),
  [hands best practices](https://developers.meta.com/horizon/design/hands-best-practices/)).
- Quest 3 hand latency is about 70 ms
  ([Road to VR](https://www.roadtovr.com/apple-vision-pro-meta-quest-3-hand-tracking-latency-comparison/)).
- Quest 2 fingertip error is about 1.1 cm
  ([PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC10830632/)).
- Simple visual reaction is 200-250 ms, and a two-choice reaction is 350-450 ms
  ([PsyToolkit](https://us.psytoolkit.org/lessons/simple_choice_rts.html)).
- Fitts' law makes acquisition time grow with distance over width
  ([MacKenzie](https://www.yorku.ca/mack/hhci2018.html)).
- The model above uses 0.25 s reaction, 0.30 s gesture, 0.07 s tracking and 1.2 cm / 15° of
  error. That is generous: a choice ("ramp or well, which top?") would add about 0.15 s.

**Game feel.**
- Swink: real-time control needs a correction cycle under about 100 ms
  ([Game feel](https://en.wikipedia.org/wiki/Game_feel)). Our cycle is 620 ms, so the ramp
  cannot feel like control. It can only feel like a bet.
- Hit-stop and telegraphs make cause and effect legible
  ([critpoints on hitstop](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/),
  [telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing)).
- Sid Meier: a game is "a series of interesting decisions"
  ([GDC 2012](https://gamedeveloper.com/design/video-sid-meier-explores-interesting-decisions-in-gameplay)).

**Principles drawn from the above for SpinSmith.**
1. Never time a verb against a target moving across several of its own widths during the hand
   loop. Either make the effect appear at the pinch, or **catch first and act on a stationary
   target**.
2. Change the ground *ahead* of a top, with big forgiving areas.
3. Ramp and well must answer different situations. Today both answer "rival near the rim".
4. Keep the influence rate-limited with visible escalation (charges and strain stay).
5. Give the player one dramatic finisher at the rim, with the slow-motion payoff that already
   exists.
6. One gesture family, hands low, and reuse the gesture the player already masters: the rip.

---

## 3. What a fix must achieve (targets)

Measured with the human model, against an equal rival, over 1,296 rounds:

| Measure | Today | Target |
|---|---|---|
| Good human vs no shaping | +2 points | +10 to +17 points (56-63%) |
| Masher vs no shaping | +0 | ≤ +3 (skill-gated) |
| Flips lost (own goals vs twin) | 4% | ≤ 8% |
| Unnoticed shapes | 76% | ≤ 35% |
| Shape-decided KOs | 4% of rounds | 10-20% (cause line and slow motion fire often, but not every round) |
| Median round | 17.3 s | 13-18 s |

---

## 4. Options

### A. Ramp on pinch: bigger, sooner, longer (tuning and gesture pass)

**Player experience.**
- Pinch the floor and a full ramp appears at once, with a thock.
- While you hold, dragging turns its face (the chevron follows your hand). Releasing does
  nothing. The ramp is already working.
- It is about 11 cm wide in the world and holds for 1 s before relaxing.
- The far version is the same at the ray's floor hit: a short 120 ms hold, then the ramp
  appears at full size. There is no 0.8 s growth.

**Code.**
- `match-system.ts` `updateShaping()`: call `makeShape('ramp', …)` on `h.justPinched` (near:
  inside the grab band; far: after `TUNE.farHold`). Keep the shaping record and update the
  live shape's `dx/dz` from the drag while pinched.
- Add `Arena.aimShape(shape, dx, dz)` in `sim.ts` (a two-line setter).
- Drop the lift-to-height mapping. Height is always `SHAPE_SIZE.ramp`.
- `sim.ts`: `RAMP_SIGMA` 0.03 → 0.045, `TUNING.shapeHold` 0.5 → 1.0, `RELAX_TAU` 0.8 → 1.0.
- `visuals.ts` `ShapeMarks.show()`: read sigma from an exported constant instead of the
  hard-coded 0.03 / 0.022.
- `rivalShaping()`: keep the rival's ramp at today's size. Without that, rounds against
  level-6+ rivals fall to 8.7 s (section 5).

**Risks on a headset.**
- A pinch that lands by accident now costs a charge at once. WP8's guards help, plus a 120 ms
  hold for near ramps too.
- Aiming by dragging after commit must not jitter. Lock the direction once the drag passes
  1.2 cm.

**Size:** 1.5 days.

**Measured:** 48% → **57%**, rounds 13.2 s, flips 15% / 4%, unnoticed 26%, own KO 9%.

### B. Tempo windows after clashes

**Player experience.** After a solid clash, while you hold a charge, the fight slows to 0.35x
for 0.9 s with a whoosh. That is your window to shape.

**Code.**
- `updateFight()`: scale the simulation's `accumulator` intake by 0.35 while in the window.
  The fixed step stays deterministic.
- Window trigger in the `clash` handler, with a ring flash in `Impacts`.
- `shaping-report` gets a time-scale hook.

**Measured.**
- Windows only: 51%. Windows plus normal shaping: 55%.
- With A's sizes: 53% and 15% own KO.
- Real time per round rises from 17.4 to 20.9 s.
- Hard clashes come every 0.66 s, so the windows open constantly. The fight would spend much
  of its time in slow motion, which kills its pace and its impact.

**Risks.** Slow motion everywhere loses its value as the payoff. A time-scaled
`ShapingCharges` passive refill is needed. Comfort is fine (only the content slows).

**Size:** 2 days.

**Verdict:** rejected as the main fix. A single slow window could still be a "last-chance"
super later.

### C. "Hold the rim" tilt (continuous low-key influence)

**Player experience.** Grab the near rim with one hand and tip the whole bowl a little,
curling-style. A strain meter (pinball tilt) locks you out for 3 s after 3 s of full tilt.

**Code.** `Arena.slope()` adds a player tilt next to `tiltX/tiltZ`; a rim grab in
`updateShaping()`; a strain bar.

**Measured** (human, 0.32 s delay, 0.25 s wrist smoothing, tilting toward the rival when it is
further out):
- Tilts of 0.02 / 0.035 / 0.06 / 0.1 rad all give 44-46% against 46%. That is **no effect**.
- The bowl's own rim slope (about 0.15) and the tops' drive and orbit swamp any tilt a player
  could hold comfortably.
- Larger tilts tip both tops alike.
- Combined with today's ramps: 46%.

**Risks.** A global, constant motion of the room-anchored arena: comfort and occlusion.

**Size:** 2 days.

**Verdict:** rejected. The numbers say it does nothing.

### D. Cup & Sling: the well becomes a trap, released like the rip

**Player experience.**
- Poke the floor ahead of a top. A **cup** opens there: about 8 cm wide in the world, shallow,
  glowing, and held for up to 2 s.
- The first top that rolls in is **caught**. It spins in place inside the cup, rattling, and
  a capture flash marks it.
- Now you have all the time you need. Pinch near the cup, pull back like the rip cord, and
  let go. The top is **slung** opposite the pull at 0.5-0.6 m/s (sim). A short aim line shows
  where it goes, and it snaps to a slag-pit mouth within ±20°.
- Catch the rival and sling it into a pit. Or catch your own top and sling it into the rival
  as a charged attack.
- If nothing is caught in 2 s, the cup relaxes as a plain hollow.

Why it works:
- The timing problem disappears. You aim at a top that is held still.
- The cup's position only has to be roughly ahead of a top (8 cm wide, 2 s). 64% of cups catch
  something.
- It gives the middle of the bowl, where the fight spends 82% of its time, a purpose.
- It reuses the game's best gesture.

**Code.**
- `sim.ts`:
  - `FloorShape` gains `held?: boolean`, `trap?: boolean` and `caught?: Top | null`.
  - `Arena.strength()` returns 1 while held.
  - A trap applies drag (5/s) and a centering pull (250/s² × gaussian) **only to its caught
    top**. The first top within 0.8 sigma becomes `caught`.
  - The cup is shallow (0.6 cm local) so the other top rolls over it.
  - Add `Arena.sling(shape, dx, dz, speed)`: set the velocity, `kick = 0.9`, and remove the
    shape.
  - New constants `CUP_SIGMA` 0.035, `CUP_HOLD` 2, `SLING_SPEED` 0.5-0.6.
- `match-system.ts`:
  - The well branch of `updateShaping()` makes a cup.
  - A pinch within about 6 cm (world) of a cup holding a top starts a sling drag. Reuse the
    launch's pull math and pocket snap.
  - Release calls `arena.sling`.
  - `finish()` cause line "YOUR SLING → SLAG".
- `visuals.ts`: a cup mark (ring and glow), a caught-top rattle, and the aim line (reuse the
  launch `Cord` and `launchZone` visuals).
- `audio.ts`: capture clunk and sling twang.
- `shaping-report.ts`: cup policies.

**Risks on a headset.**
- A second pinch near a moving fight can be misread. Gate it to "a cup holds a top" and to the
  cup's 6 cm radius.
- The hand over the arena hides the tops. The pull goes *toward the player* (as in the rip),
  so the hand leaves the bowl.
- Catching your own top by accident is about 26% of cups in the sim. That is fine if letting
  go without a pull simply frees it, which is the default.

**Size:** 3.5 days.

**Measured.**
- Sling 0.6: **63%**, KO wins 43%, rounds 12.3 s, flips 24% / 7%, shape-decided KO 16%, own
  KO 13%.
- Masher: 46-49%.

### E. Combined: A + D (recommended)

- The ramp is the quick, frequent tool near the rim: one charge, on pinch.
- The cup and sling is the rare, decisive move anywhere: it needs a full meter (2 charges).
  - The prototype requires 2 charges but spends 1. Spending both is a tuning check in step 2
    of the plan.
- The two verbs now answer different situations:
  - Ramp: "it's near the rim, finish it".
  - Cup: "it's in the middle, catch it and set up the kill", or "load my own top as an
    attack".

**Size:** 5 days, plus 2 days of feel, rival and report work = **about 7 days**.

**Measured:** 57% (sling 0.5) to **61%** (sling 0.6). Rounds 13.0 / 11.2 s. Flips 19-23% / 8%.
Unnoticed 27%.

---

## 5. Prototype results (human-feasible policies)

The human model is the same in every row:
- 0.25 s reaction, 0.30 s gesture, 0.07 s tracking.
- 1.2 cm position error and 15° aim error (world).
- At least 1 s between deliberate actions.
- Today's charges and strain.

The ramp policy acts when the rival is beyond 0.55 R and leads it along its orbit. The sling
policy places the cup ahead of the rival's orbit. It releases 0.32 s after a catch, aimed at the
nearest pit (15° error), and lets its own top go unslung.

Each row is 1,296 rounds (6 arenas × 9 matchups × 24), compared with deterministic no-shaping
twins.

| Design | Policy | Win | KO wins | Median round | Shapes/round | Flips won / lost | Shape-decided KO | Own KO | Unnoticed |
|---|---|---|---|---|---|---|---|---|---|
| – | No shaping | 46% | 13% | 17.9 s | 0 | – | – | – | – |
| Today | Masher | 46% | 17% | 17.0 s | 5.6 | 9% / 10% | 4% | 13% | 48% |
| Today | Repo `pushOut` (superhuman) | 57% | 30% | 15.6 s | 2.8 | 16% / 5% | 13% | 6% | 0% |
| **Today** | **Human push-out** | **48%** | 18% | 17.3 s | 2.4 | 6% / 4% | 4% | 6% | **76%** |
| A | Human, ramp on pinch (sigma 10.8 cm world, hold 1 s, tau 1 s) | 57% | 34% | 13.2 s | 2.1 | 15% / 4% | 13% | 9% | 26% |
| D | Human, cup & sling 0.6 | 63% | 43% | 12.3 s | 4.4 | 24% / 7% | 16% | 13% | 31% |
| D | Masher, cup & sling 0.5 | 46% | 22% | 14.5 s | 5.1 | 12% / 13% | 5% | 19% | 15% |
| D | Masher, cup & sling 0.6 | 49% | 27% | 12.9 s | 4.7 | 16% / 13% | 10% | 20% | 16% |
| **A+D** | **Human, sling 0.5** | **57%** | 34% | 13.0 s | 4.4 | 19% / 8% | 13% | 16% | 27% |
| **A+D** | **Human, sling 0.6** | **61%** | 42% | 11.2 s | 4.1 | 23% / 8% | 17% | 14% | 27% |

Per arena, win rates (net flips):

| Arena | Today, human | A | D (0.6) | A+D (0.6) |
|---|---|---|---|---|
| Forge Bowl | 47% (+2) | 60% (+14) | 67% (+21) | 66% (+21) |
| Ember Ring | 42% (−1) | 45% (+2) | 68% (+25) | 60% (+17) |
| Zero-G Dish | 49% (+3) | 54% (+8) | 62% (+16) | 61% (+15) |
| Clockwork Spire | 57% (+7) | 68% (+18) | 63% (+13) | 69% (+19) |
| Frost Oval | 46% (+1) | 60% (+15) | 65% (+20) | 60% (+15) |
| Sumo Square | 49% (0) | 57% (+9) | 56% (+7) | 53% (+4) |

**Robustness and side checks** (432 rounds each, ±2.4 points):

| Check | Win | Note |
|---|---|---|
| Cup & sling 0.5, careful human | 52% | |
| Cup & sling 0.5, clumsy human (0.4 s reaction, 2 cm, 25°) | 55% | Same as the careful one within noise: the catch removes the timing skill floor |
| Cups placed | 2,104 | 38% caught the rival, 26% caught own top (freed), 31% caught nothing |
| A, slow human (0.5 s lag) | 51% | A still depends on speed. D does not |
| A, human aiming where the rival is (no lead) | 50% | |
| A, masher | 47% | Skill-gated |
| Game rival (`rivalShaping`: exact, every 3 s, 0.6 R, 0.85 height), no shaping, today | 36% | |
| Same, today's human push-out | 37% | Today the player cannot answer a ramping rival |
| Same, cup & sling 0.5 (rival on today's sizes) | 44% | |
| Same, A+D (rival also on the new sizes) | 41%, rounds **8.7 s** | The rival must keep today's ramp size, or a 4 s gap |

### What the numbers say

- **A alone** turns a decoration into a real verb: +11 points, a quarter of today's misses, and
  own goals unchanged.
  - It is still a speed test. A slower player drops back to 51%.
  - Its effect still exists only near the rim. Ember Ring (a small arena) barely improves.
- **D** is the bigger change in feel.
  - It is the only design where a clumsy player does as well as a careful one, because the
    skill moves from reflex to choosing where to put the cup and where to aim the sling.
  - It is strong on every arena with pits.
  - On Sumo Square it is weaker (no pits; the sling aims at the edge).
  - Ember Ring gains the most (+25), because its small bowl makes cup placement easy.
- **A+D** keeps both good parts. A masher stays at 46-49%.
  - The open costs are shorter rounds (11-13 s) and own KO of 14-16%. Many of these are
    "my top was slung into a hit that went wrong", but the hard number, flips lost, is 8%.
  - Both have knobs: sling speed (0.5 ↔ 0.6 moves the win rate 57 ↔ 61% and the round length
    13.0 ↔ 11.2 s), and `TUNING.drain` or the pit escape speed if rounds run short.
- **B (tempo windows) and C (tilt) fail on the numbers.** C does nothing at any comfortable
  tilt. B helps only by slowing the whole fight down.

---

## 6. Recommendation: Ramp on pinch + Cup & Sling (A + D)

Ship it in two stages so the competition build is never worse than today. Stage 1 is A, which
is self-contained and low-risk. Stage 2 is D. If D fails the headset feel tests by Oct 30, ship
A alone and keep today's well.

### Plan (about 7 working days, Oct 8 → Oct 30, leaving a week of buffer before the Nov 6 freeze)

| # | Step | Files / functions | Size | Acceptance |
|---|---|---|---|---|
| 1 | **Make the report honest.** Add the lag-model human policies (`humanRamp`, later `humanCup`), the twin comparison (flips won/lost, shape-decided KO, unnoticed) and a masher to `shaping-report.ts`. Keep `pushOut` as "superhuman" for reference. Run 24 rounds per pair | `src/game/shaping-report.ts`, `scripts/shaping-report.ts` | 0.5 d | Reproduces section 5's "Today" rows within ±2 points |
| 2 | **A: ramp on pinch.** `updateShaping()` commits at the pinch (near: 120 ms hold inside `SHAPE_GRAB`; far: `TUNE.farHold`, full size, no `RAY_BUMP_RATE` growth). The drag re-aims a live shape through `Arena.aimShape()`, and the direction locks after 1.2 cm of drag. `RAMP_SIGMA` 0.045, `shapeHold` 1.0, `RELAX_TAU` 1.0. `ShapeMarks` reads sigma from `sim.ts`. The rival ramp stays at today's size | `sim.ts`, `match-system.ts` `updateShaping()` / `makeShape()` / `rivalShaping()`, `visuals.ts` `ShapeMarks` | 1.5 d | Report: human ramp 55-59%, masher ≤ 49%, unnoticed ≤ 35%, flips lost ≤ 6%, median round ≥ 13 s. `npm run check:sim` and `report:arenas` unchanged (no shapes there). Emulator: a pinch shows the ramp and plays the thock on the same frame (`[SHAPE]` log at the pinch, not the release) |
| 3 | **D sim: cup and sling.** `held`, `trap` and `caught` on `FloorShape`. Capture, drag and pull only on the caught top. `Arena.sling()`. Constants `CUP_SIGMA` 0.035, `CUP_HOLD` 2, `CUP_DRAG` 5, `CUP_PULL` 250, `SLING_SPEED` 0.55. The cup needs 2 charges (try spending both against spending one) | `sim.ts`, `shaping.ts` | 1 d | Report: human cup 58-63%, cup masher ≤ 49%, flips lost ≤ 8%, median round 12.5-16 s. Capture rate of placed cups ≥ 55%. `check:sim` green |
| 4 | **D gesture.** The fingertip press (today's well detection with the WP8 guards) opens a cup. A pinch within 6 cm (world) of a cup *holding a top* starts a sling pull. The direction is opposite the pull, snapped to a pit mouth within ±20° (`pocketAt`). Release → `arena.sling`. No pull → the top is freed. A lost hand frees it | `match-system.ts` `updateShaping()`, a new `updateSling()`, launch pull helpers | 1.5 d | Emulator (IWER, keyboard and dev keys): cup → catch → sling → SLAG with the `[SHAPE] cup`, `[SHAPE] caught`, `[SHAPE] sling` logs. A dev key `C` drops a cup at the gaze for tests |
| 5 | **D readability.** Cup ring and glow in the owner's colour. The caught top rattles (small wobble). Aim line during the pull (the first 0.4 s of the sling path, Peggle-style). Capture clunk, sling twang. Cause line "YOUR SLING → SLAG / THROWN". The existing slow motion fires on sling KOs | `visuals.ts`, `audio.ts`, `match-system.ts` `finish()` | 1 d | Emulator screenshots of each state, readable at the pedestal view. The cause line shows on 10-20% of rounds in a 20-round dev session |
| 6 | **Rival and guide.** The rival keeps ramps at today's size (or a 4 s gap); there is no rival cup before level 10. The first-session guide moves from "bump here" to "poke ahead of the rival" (cup), then "pull back to sling". Retune so a no-shaping player against the game rival is 36-42% | `match-system.ts` `rivalShaping()`, `updateGuide()` | 0.5 d | Report row "none vs game rival" 36-42%. "A+D vs game rival" ≥ 47%, median ≥ 11 s |
| 7 | **Round length.** If the median is under 13 s, lower the sling speed first, then `TUNING.drain` by about 5%. Re-run `report:arenas` and `report:tops` | `sim.ts` `TUNING` | 0.5 d | Median 13-18 s on every arena. Type balance gates unchanged |
| 8 | **Headset feel tests** (the first device session; extend `ACTION-PLAN.md` T5/T6) | — | 0.5 d plus the session | See below |

**Headset feel tests.**

- **T5b, ramp on pinch.**
  - 20 near and 20 far ramps aimed at a marked spot and direction: ≥ 17/20 near and ≥ 16/20
    far within 3 cm and ±30°.
  - In 10 normal rounds, ≥ 1 ramp per round touches the rival, judged by the crunch sound.
- **T6b, cups.**
  - 20 deliberate cups: ≥ 18 open.
  - 0 accidental cups in 5 rounds of hands resting on the table.
  - ≥ 50% of cups placed "ahead of the rival" catch something.
- **T11, sling.**
  - 20 slings at a marked pit from a caught top: ≥ 14 hit the pit.
  - The aim line is visible past the player's own hand: test with the right hand pulling
    toward the body and with the left.
  - Pass rule: no accidental slings while pinching to re-aim a ramp next to a cup.
- **Feel questions after 5 rounds**, 3-5 testers:
  - "What did your last shape do?" At least 4 of 5 answer correctly (from `ARENA-SHAPING.md`
    §6).
  - "Did you ever feel you were only watching?" Most answer no.
  - "Which felt better, ramp or sling?" Record the answers. If the sling loses, ship A alone.
- **Comfort.**
  - The hand never needs to hover over the bowl between moves. The cup is a poke, and the
    sling pull leaves the bowl toward the body.
  - With 5 minutes of play there are no "arm tired" reports.

**Cut line.** If step 4 or the T11 tests fail by Oct 30, revert the cup gesture behind a dev
flag and ship A alone. The report says 57% against today's 48%, with fewer misses and no extra
own goals.

---

## 7. Notes and limits of the evidence

- The human model is a model. Its reaction, gesture and tracking times come from the
  literature (section 2). A real player may also anticipate better than the orbit
  extrapolation used here. Even so, a 0 s, exact oracle only reaches 57% today, and the human
  numbers are the honest floor.
- These measures ignore readability. A shape a player cannot see working counts the same as
  one they can. The 76% "unnoticed" figure is the closest proxy, and it is damning.
- Every row is against an equal, non-shaping rival unless marked "game rival". The superhuman
  rival used in some earlier experiments (instant, every 1.5 s) is not the game's habit.
- **A bug the prototype exposed.** A plain well with D's strong pull acting on *both* tops makes
  a blender: the tops clash repeatedly and both burst within 0.5 s. The cup must act only on
  the top it caught. That is why `caught` is part of the sim design, not just a visual.
- The combined-masher row (random ramps and cups together) was discarded. It used plain wells
  with the cup's pull, which hit the blender bug above.

---

## 8. Appendix: experiment code (in /tmp/fx, not in the repo)

### 8.1 Sim copy

`/tmp/fx/game/` holds copies of `sim.ts`, `layout.ts`, `arenas.ts`, `parts.ts` and `shaping.ts`.
In the `sim.ts` copy:
- The constants `RELAX_TAU`, `RAMP_SIGMA`, `WELL_SIGMA`, `WELL_DRAG` and `WELL_BRACE` became
  fields of an exported `X` object.
- A player tilt `X.tiltX/tiltZ` is added in `slope()`.
- `Arena.strength()` returns 1 for `held` shapes.
- Wells flagged `trap` act only on the first top to enter within 0.8 sigma (`only`). The patch
  adds this to the drag (through a new `dragFor(top)`) and a centering pull:

```ts
// in advance(), after the well drag
if (X.wellPull > 0) {
  for (const w of arena.shapes) {
    if (w.kind !== 'well') continue;
    if ((w as any).trap) { const o = (w as any).only; if (o && o !== t) continue;
      if (!o) { if (Math.hypot(t.x - w.x, t.z - w.z) < 0.8 * X.wellSigma) (w as any).only = t; else continue; } }
    const rx = t.x - w.x, rz = t.z - w.z;
    const g = Arena.strength(w) * Math.exp(-(rx * rx + rz * rz) / (4 * X.wellSigma * X.wellSigma));
    t.vx -= rx * X.wellPull * g * dt;
    t.vz -= rz * X.wellPull * g * dt;
  }
}
```

### 8.2 Harness (`lab.ts`): twin comparison

```ts
/** Plays every setup with the policy and with no shaping (the twin), and compares. */
export function evaluate(policy: Policy, S: Setup[], rival: Policy | null = null, opts = {}, perArena = false) {
  for (const s of S) {
    const twin = playRound(s, null, rival);          // same launch, deterministic sim
    const r = playRound(s, policy, rival, opts);
    const w = r.v === 1, tw = twin.v === 1;
    if (w && !tw) flipWin++;                          // shaping won a round the twin lost
    if (!w && tw) flipLoss++;                         // own goal
    if (r.v === -1 && r.loser.finish !== 'spin' && r.t - r.lastShape < 1.5) ownKo++;
    if (r.shapeKo && !tw) shapeDecided++;
    // unnoticed: no top within 1.2 sigma of a shape while its strength > 0.3
  }
}
// playRound: per step, run scheduled actions (ctx.later(at, fn)), call the policies, then
// charges.update, step(), charges.clash(); same launches as scripts/shaping-report.ts.
```

### 8.3 The human ramp (`policies.ts`)

```ts
export const HUMAN = { reaction: 0.25, gesture: 0.3, tracking: 0.07, posErr: 0.005 /* local m, ~1.2 cm world */, dirErr: 0.26 /* ~15 deg */, minGap: 1.0 };
export const lag = () => HUMAN.reaction + HUMAN.gesture + HUMAN.tracking; // 0.62 s

export function humanRamp(opts: { delay?: number; lead?: number; amp?: number; band?: number } = {}): Policy {
  return (c) => {
    const { arena, rival, t, mem, rnd } = c;
    if (t < TUNING.grace || mem.busy > t || t - (mem.last ?? -9) < HUMAN.minGap || c.charges.charges < 1) return;
    const r = Math.hypot(rival.x, rival.z);
    if (!rival.alive || r < arena.radius * (opts.band ?? 0.55)) return;
    const d = opts.delay ?? lag();
    mem.busy = t + d; mem.last = t;
    const lead = (opts.lead ?? 1) * (1 + 0.25 * gauss(rnd));          // imperfect orbit lead
    const p = lead > 0 ? predictOrbit(rival, d, lead) : { x: rival.x, z: rival.z };
    c.later(t + d, () => {                                            // the shape exists only now
      const f = c.charges.spend(c.t, TUNING.grace);
      if (!f) return;
      const pr = Math.hypot(p.x, p.z) || 1;
      const ang = Math.atan2(p.z, p.x) + HUMAN.dirErr * gauss(rnd);
      c.arena.addShape('ramp', p.x - (p.x / pr) * 0.012 + HUMAN.posErr * gauss(rnd),
        p.z - (p.z / pr) * 0.012 + HUMAN.posErr * gauss(rnd), (opts.amp ?? SHAPE_SIZE.ramp) * f, 'me', Math.cos(ang), Math.sin(ang));
    });
  };
}
```

### 8.4 Cup & sling (`proto.ts`)

```ts
const SLING = { sigma: 0.035, drag: 5, pull: 250, hold: 2.0, speed: 0.6, catchR: 0.9 };
function sling(target: 'rival' | 'any'): Policy {
  return (c) => {
    const { arena, me, rival, t, mem, rnd } = c;
    const w = mem.trap as any;
    if (w) {
      if (!arena.shapes.includes(w)) { mem.trap = null; return; }
      if (w.only && mem.caughtAt == null) mem.caughtAt = t;            // the cup closed on a top
      const caught = w.only && t - mem.caughtAt > 0.15 && (target === 'any' || w.only === rival) ? w.only : null;
      if (w.only && w.only !== rival && target === 'rival' && !mem.releasing) {   // own top: just let go
        mem.releasing = true;
        c.later(t + HUMAN.reaction + HUMAN.tracking, () => { arena.shapes = arena.shapes.filter((s) => s !== w); mem.trap = null; mem.releasing = false; mem.caughtAt = null; });
        return;
      }
      if (caught && !mem.releasing) {
        mem.releasing = true;                                          // see the catch, pull, let go
        c.later(t + HUMAN.reaction + HUMAN.tracking, () => {
          const exit = nearestExit(rival, arena.layout);               // toward the nearest pit mouth
          const ang = Math.atan2(exit.z, exit.x) + HUMAN.dirErr * gauss(rnd);
          if (caught.alive) { caught.vx = Math.cos(ang) * SLING.speed; caught.vz = Math.sin(ang) * SLING.speed; caught.kick = 0.9; }
          arena.shapes = arena.shapes.filter((s) => s !== w);
          mem.trap = null; mem.releasing = false; mem.caughtAt = null;
        });
      } else if (!mem.releasing && t - w.madeAt > SLING.hold) { w.held = false; w.age = TUNING.shapeHold; mem.trap = null; mem.caughtAt = null; }
      return;
    }
    if (t < TUNING.grace || mem.busy > t || t - (mem.last ?? -9) < HUMAN.minGap || c.charges.charges < 1 || !rival.alive) return;
    const d = lag();                                                   // lay the cup ahead on the orbit
    mem.busy = t + d; mem.last = t;
    const p = predictOrbit(rival, d + 0.3, 1 + 0.25 * gauss(rnd));
    c.later(t + d, () => {
      const f = c.charges.spend(c.t, TUNING.grace);
      if (!f) return;
      const s: any = c.arena.addShape('well', p.x + HUMAN.posErr * gauss(rnd), p.z + HUMAN.posErr * gauss(rnd), 0.006 * f, 'me');
      s.held = true; s.trap = true; s.madeAt = c.t; mem.trap = s;
    });
  };
}
```

### 8.5 Other scripts

- **`diag.ts`.** Speeds, lap times, outer-band share and clash gaps. Also the opportunity
  scan: clone the arena and both tops every 0.5 s, add a push-out ramp (exact, or after the
  0.62 s lag at the orbit-predicted spot), and run 3 s forward against an unshaped clone.
- **`proto.ts`.**
  - `tempo()`: 0.35x for 0.9 s after a clash ≥ 0.45 while holding a charge.
  - `tilt()`: a human tilt with 0.32 s delay, 0.25 s smoothing and a strain lockout.
  - `combo()`: A + D, where the cup needs 2 charges and is used when the rival is inside
    0.55 R; otherwise ramps.
  - `gameRival`: the copy of `rivalShaping()`.
  - The `F1`-`F11` runs: the 1,296-round table.
- **Run time:** about 90 s per 1,296-round row on one core. Run the rows in parallel
  (`node proto.ts F5 &` …).
