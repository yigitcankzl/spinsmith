# Shaping the arena mid-fight: research and plan

Research notes (Oct 6, 2026) on SpinSmith's most original mechanic, reshaping the arena floor
by hand during a fight, which has not moved since the prototype. Section 1 is what exists, section
2 measures it in simulation, section 3 summarizes outside research (sources inline), sections
4-6 are the proposal. `docs/GAMEPLAY-DIRECTION.md` section 6 sets the rules this must keep: a
shape affects both tops, changes a route without guaranteeing a knockout, relaxes in 2-3 s,
reads clearly, and is not spammy.

---

## 1. What exists

`match-system.ts` `updateShaping()`, `sim.ts` `Arena.stamp()`:

| Verb | Gesture | Effect |
|---|---|---|
| Bump | Pinch the floor (within 5 cm) and lift | A gaussian bump, 8-40 mm (arena-local), sigma 3.5 cm, held while pinched |
| Far bump | Point the hand ray at the floor and pinch | Grows 5 cm/s while held |
| Dent | Press a fingertip into the floor | Down to 30 mm deep |
| (dev) | Hold B / N at the gaze | Bump / dent |

Shapes relax with a 0.8 s time constant (gone in about 2-3 s). There is no limit, no preview, no
ownership, and no feedback beyond the floor's warm/cool tint. The rival never shapes. The first
session points at one bump spot.

---

## 2. Measured: how much does shaping decide a fight?

Simulated player policies on all six arenas, all type matchups, 16 rounds each (864 rounds per
policy; script kept at `/tmp/shaping-experiment.ts`, not in the repo):

| Policy | Win | Points / round | KO wins | Round | Shapes / round | Own KO within 1.5 s of a shape |
|---|---|---|---|---|---|---|
| None | 43% | 0.57 | 12% | 16.1 s | 0 | 0% |
| Random bumps (every 2 s) | 46% | 0.68 | 18% | 15.0 s | 8.0 | 16% |
| **Push-out bump** (just inside the rival, every 1.5 s) | **69%** | 1.31 | 46% | 10.8 s | 6.1 | 20% |
| Push-out, only when the rival is in the outer band | 60% | 1.13 | 39% | 12.4 s | 2.3 | 6% |
| Dent ahead of the rival | 41% | 0.74 | 29% | 10.6 s | 5.9 | 27% |

And the same push-out bump under limits:

| Limit | Win | KO wins | Round | Shapes / round |
|---|---|---|---|---|
| 3 s cooldown | 61% | 34% | 12.7 s | 4.0 |
| Lower bump (18 mm instead of 30) | 61% | 30% | 13.7 s | 8.0 |
| Clash-earned charges (max 2) | 61% | 38% | 12.1 s | 4.6 |

What this says:

1. **Shaping is powerful, and skill-gated.** A well-placed bump is worth +26 points of win rate;
   random bumps are worth +3 and knock out your own top 16% of the time. That is the right shape
   of mechanic: it rewards reading, not mashing.
2. **Unlimited, it is too strong and too fast.** +26 points and 11 s rounds overrun the doc's
   "decisive but not guaranteed" and its 15-25 s rounds. Any of the three limits brings it to
   about +18 points (61%) and 12-14 s rounds.
3. **The dent has no purpose yet.** It does not help win and hurts its owner 27% of the time:
   it is unreadable as it stands.
4. **The rival ignores the arena.** Only the player shapes; the mechanic never threatens you, and
   rivals cannot teach it by example.

---

## 3. Research summary

**Indirect influence feels skillful when** agents are simple and predictable, interventions
are scarce and local, the effect scales with placement and timing, and the game previews a
little before and spotlights the cause after.
- **Curling** is the closest analogue: sweepers change only the surface in front of the stone,
  a small, continuous nudge to an outcome already in motion, with rules on whose zone it is
  ([LeanCurling](https://www.leancurling.com/why-sweep/),
  [NBC Olympics](https://www.nbcolympics.com/news/curling-101-rules)).
- **From Dust** kept its people predictable so terrain edits read clearly
  ([Game Developer](https://www.gamedeveloper.com/design/the-core-of-i-from-dust-i-)).
- **Godus** is the warning: an imprecise finger plus a costly resource made misfires
  infuriating ([Pocket Gamer](https://www.pocketgamer.com/godus/review/)).
- **Tiny Glade** snaps loose strokes to clean shapes
  ([analysis](https://deeprootdepths.substack.com/p/tiny-glades)).
- **Pinball's nudge and tilt** is the model for allowed-but-not-spammable: free light nudges,
  escalating warnings, a penalty only for abuse
  ([TiltForums](https://tiltforums.com/t/electronic-tilt-for-pinball-machines-part-3/4901)).
- **Peggle** shows only the first trajectory segment, then zooms and slows on the decisive peg
  ([Wikipedia](https://en.wikipedia.org/wiki/Peggle)).

**Spinning tops.** Real stadium gimmicks are passive (Beyblade X's rail dash, Burst's
Slingshock rails, Zero-G stadiums that sway under the tops:
[Beystadium X](https://beyblade.fandom.com/wiki/Beystadium_(X_Series)),
[ZeroG](https://beyblade.fandom.com/wiki/ZeroG_Stadium_Balance_Type)). The official games give
post-launch agency through abstract meters: Beyblade X: Xone has a time-filled Active Gauge for
attacks and counters and a hit-filled X Gauge for a special phase
([Wikipedia](https://en.wikipedia.org/wiki/Beyblade_X:_Xone)). **No top game lets you shape the
stadium by hand**: SpinSmith's verb is genuinely its own. Worth borrowing: "clashes charge your
power".

**Hands.** Meta: few, simple gestures that succeed and fail predictably; pinch is the most
precise; forgiving on direction rather than exact position; rays need a cursor, hover and
confirmation ([Meta gesture design](https://developers.meta.com/vr/design/hands-gesture-design/)).
Quest 3 hand latency is about 70 ms ([Road to VR](https://www.roadtovr.com/apple-vision-pro-meta-quest-3-hand-tracking-latency-comparison/)),
so shapes must be placed ahead of a top, not timed against an impact. Rays degrade on small or
far targets and with jitter ([SFU](https://vvise.iat.sfu.ca/user/data/papers/nojitter.pdf)): far
shapes need generous snapping and a position locked at pinch start. Raw finger physics without
haptics frustrates (Hand Physics Lab); map gestures to discrete, parameterized shapes.

**Limits that suit 15-25 s rounds:** cooldowns invite use-on-ready; charges allow a planned
double; event-earned meters reward engagement (fighting games, Xone); one live shape per hand is
the most readable cap.

---

## 4. Proposal

### 4.1 Verbs: two, each near and far

| Verb | Gesture | What it does | Why |
|---|---|---|---|
| **Ramp** (replaces the bump) | Pinch the floor, lift, and pull sideways: lift sets height, the pull sets which way the slope faces | A ramp with a steep face and a long tail; a top crossing it is thrown toward the pull | The hero move: it aims. "Ramp the rival through the rail into the pocket" becomes something you do on purpose |
| **Well** (replaces the dent) | Press a fingertip in | A short, round hollow that catches and slows a top: hold your stamina top in the middle, or trap an attacker | Gives the dent the purpose it lacks (measured useless now) |
| Far versions | Hand ray + pinch (ramp: pull while pinching sets direction) | Same shapes at a distance | Position locked at pinch start; snapped to the floor under the nearest top's path within ~3 cm |

Context snapping (Tiny Glade): a ramp placed within a few cm of a rail or pocket mouth bends
into a funnel toward it, so the decisive move is reproducible rather than lucky.

Shapes keep affecting both tops (curling's rule of the surface, the doc's rule).

### 4.2 Economy: charges earned by clashing

- **2 charges**, shown as two small sparks on the near rim. A ramp or well spends one.
- A **clash** (strength over 0.3) refills one; a slow passive refill (about 6 s) prevents a
  passive top from being locked out.
- **One live shape per hand**: a new one dissolves the old.
- **Strain** (pinball tilt): two shapes within about 1 s make the floor flash and the second
  weaker, instead of a hard lockout.
- The opening grace (2.5 s) also blocks shaping, so the first read happens first.

Measured target: a good player around 60% against an equal rival (+15-20 points), rounds
14-20 s. Tune the bump height and refill with the shaping experiment, as section 2 did.

### 4.3 Readability

- **Before:** while pinching, a ghost of the shape with contour rings and a chevron for the
  slope, and on each top a 0.4 s deflection stub of its predicted path (partial, like Peggle's
  first segment; never the full outcome). Commit on release.
- **During:** height colors (warm raised, cool hollow) and 2-3 contour rings that shrink as the
  shape relaxes (the timer is the shape itself). The shape's rim tinted in the owner's color.
  Sound: a rising stretch while pulling, a thock on release, a crunch when a top hits it.
- **After:** a decisive-move detector: if a shape bent a top's path by more than about 20
  degrees and a finish followed within 1.5 s, a 0.4 s slow-motion and a trail from the shape to
  the finish; the result card names it ("Your ramp: Pocket finish +3"). This is also the
  trailer's capture tool.

### 4.4 The rival shapes too

Archetypes from section 9 of the gameplay doc get one shaping habit each, at a slower rate and
lower skill than a good player, unlocked with Smith level:
- Iron Keep (defense): wells under itself to hold the middle.
- Rim Raider (attack): ramps toward you when you are near a pocket.
- Leech, Hookjaw: ramps that feed their dash or their upper attack.
Seeing the rival use the arena teaches the mechanic by example and makes it a two-sided game. Its
shapes are drawn in the rival's cyan.

### 4.5 Deferred

- A meter-gated **rim tilt** super (grab the rim, tilt the arena, a Zero-G homage): spectacular,
  but global, easy to overuse and a comfort risk. Prototype last, at most once a round.
- **Slam / shockwave**: fast palm motion tracks poorly; slapping a real table is loud.
- **Ice or sticky patches**: cost a gesture and read poorly in passthrough.

---

## 5. Plan

| Step | What | Check |
|---|---|---|
| 1 | Shaping economy (charges, clash refill, one live shape per hand, strain, no shaping in the grace) + its rim display | Shaping experiment: push-out player at 58-63%, rounds 14-20 s |
| 2 | Ramp with direction (pull vector) and its sim shape; well instead of dent | Experiment: aimed ramps beat plain bumps; wells give a stamina top a measurable edge, own-KO under 10% |
| 3 | Ghost preview and contour rings; owner tint; stretch / thock / crunch sounds | Emulator review; readable in one glance |
| 4 | Deflection stubs while pinching | Frame time: predict two tops for 0.4 s at the sim step (~100 steps, cheap) |
| 5 | Decisive-move detector, slow-mo and cause trail | Fires on 10-25% of rounds, not more |
| 6 | Rival shaping habits per archetype | Win rates per archetype stay within the balance gates |
| 7 | Context snapping to rails and pockets | The hero move reproducible in a test setup |
| 8 | (Later) rim tilt super | Comfort on Quest |

Steps 1-3 make the mechanic fair and readable; 4-5 make it understood; 6 makes it two-sided.
Every step keeps `npm run check:sim` and the balance reports green, and step 1's experiment
becomes a script (`npm run report:shaping`) so the mechanic stays measured.

---

## 6. Success criteria (from the gameplay doc's playtests)

- Most players intentionally shape at least once per normal round.
- At least 4 of 5 can say what their shape did after a round ended by it.
- A good shaper wins about 60% against an equal rival; a random shaper about 50%.
- Fewer than 1 misread shaping gesture per round on Quest.
