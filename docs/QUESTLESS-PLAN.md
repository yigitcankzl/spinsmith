# SpinSmith: work to finish without a Quest

This document orders the work that can safely be done before physical Quest access arrives. The
goal is not new content; it is to make the loop at the center of the competition build,
**launch → shape → understand the result → forge → rematch**, readable, measurable and balanced
in the emulator.

## Baseline

- The production build and the TypeScript check pass.
- Main bundle about 2.48 MB (about 688 KB gzip).
- Draw calls in IWER: fight 102-104, forge 164, hub 204-222.
- Arena round medians 15-22 s; quick rounds 0% in the report.
- With 136 legal builds, six arenas and 48 rival samples, the top report's only open warning:
  `Anvil 4-60 Needle` wins about 69%.
- The current smart bump policy wins about 69% against an equal rival; unlimited shaping is too
  strong. The dent has no clear use.

These numbers are for comparing progress. They do not claim to be Quest performance.

## Priority 1: arena shaping vertical slice

Only this core package of shaping goes into the competition build.

### 1. Economy

- The player starts with two shaping charges.
- A strong clash refills one charge.
- If no clash happens for a long time, a slow passive refill keeps the player from being locked out.
- Each hand holds at most one live shape; a new one dissolves the old.
- Shaping is off during the 2.5 s opening grace after the launch.
- A second shape spammed within about a second comes out weaker; no hard cooldown screen.

### 2. Two clear verbs

- **Ramp:** replaces the bump. The pinch start locks the position; the sideways pull sets which
  way the ramp pushes, the lift sets how hard.
- **Well:** replaces the dent. A short, round hollow that pulls a top toward its center and slows
  it a little.
- Both affect the player and the rival by the same physics.
- Near and far use give the same simulation result; far use locks the position at the pinch
  start and does not wander with hand jitter.

### 3. Readability

- An uncommitted ghost shape shows while pinching.
- A direction chevron on the ramp; 2-3 contour rings on the ramp and the well.
- The player's shapes are orange; the rival's, if added later, cyan.
- The rings shrink as the shape relaxes; no separate timer panel.
- A short thock when a ramp/well is released; a separate crunch when a top hits a shape.
- If a finish comes within 1.5 s of a shape, the result text names the cause:
  `YOUR RAMP → POCKET`, `YOUR WELL → SPIN` and so on.

### 4. Measurement tool

Add `npm run report:shaping`. It compares at least these policies deterministically:

- no shaping;
- random shaping;
- a ramp that pushes out at the right time;
- a defensive well in the middle.

Acceptance:

- A good shaper wins about 58-63% against an equal rival.
- Random shaping stays around 48-52%.
- Normal round median 14-20 s.
- 2-4 shapes per round on average.
- Self-KO within 1.5 s of a shape under 10%.

## Priority 2: the first five minutes

Hand feel cannot be measured without a Quest, but the state machine and the message order can be
finished.

### Flow

With a clean save this chain must run without a break:

1. The top calls from the stand.
2. The top is carried to the arena.
3. The rival and the arena are briefly introduced.
4. The rip guide shows and the launch is made.
5. After the third second the first ramp spot is shown.
6. The first match, won or lost, unlocks the Rush tip.
7. The anvil calls; the forge highlights only the part needed.
8. Rush is fitted and saved with the bucket.
9. The stand calls for the rematch.
10. When the rematch starts the tutorial is complete and does not show again.

### Checks

- A small framework-free script for the progress state machine checks that guide steps cannot go
  back and that save/load resumes where it left off.
- With the dev reset, the flow is played once end to end and every screen is captured.
- Only one guide message shows at a time.
- The rival/arena card reads at the normal viewing angle and does not overlap the arena or the
  match bar.
- Result, XP and unlock do not overwrite each other's text.

## Priority 3: balance after shaping

No fine-tuning of the current top balance until the ramp/well system is done. Then run together:

1. `npm run check:sim`
2. `npm run report:arenas`
3. `npm run report:tops`
4. `npm run report:shaping`

Acceptance:

- No build stays above 67%.
- No part average drops below 40% or rises above 60%.
- Arena identities stay; flattening every arena to 50% is not the goal.
- But if an arena carries one type to about 70% while dropping another to about 30%, the arena
  intro states that advantage plainly, or it is softened a little.

The first suspects are `Anvil + Needle`, Needle stamina in general and Flat's low average. They
are tuned together with the shaping report rather than blindly nerfing one value.

## Priority 4: remaining visual/UI work

This comes after shaping and the first five minutes are done.

- Give the colored plastic top layers one bevel/groove language and small metal links.
- Simplify the Anvil ring's round lobes so they read more mechanical and heavier.
- Bring the match bar, the tutorial card and the Menu sign on the floor into one forged-tech sign
  language.
- Make the rival intro card large enough to read at the normal seated distance.
- Fix the box clamps on the arena shell only if they stand out in the competition framing.
- No new post-processing, bloom, heavy particles or new environment system.

## Priority 5: technical gates before Quest

After every major change:

```sh
npm run typecheck
npm run build
npm run check:sim
npm run report:arenas
npm run report:tops
npm run report:shaping
```

Runtime checks:

- No app-caused errors in the browser console.
- Fight draw calls stay under about 120.
- Forge stays under about 180.
- If the hub goes beyond about 220, new optimization only if the Quest result is bad.
- The main bundle stays under 3 MB; no code splitting just to silence the warning.
- Keep one fixed review screenshot each for home, ready, fight, result, forge and workshop.

## Priority 6: submission preparation

What can be prepared before the Quest arrives:

- A 140-character tagline and a project text under 500 words.
- A description of the hands-first interaction.
- A video storyboard under three minutes.
- Cover image, logo and comparison screenshots.
- A hosted production build and a cold-start test from a clean browser.
- A check that the submission link opens in a private tab and from another network.

The video story must show one sentence:

> Forge it by hand, rip it into your real table, then reshape the arena to win.

Suggested first 45 seconds:

1. Fitting a part to the top by hand.
2. The physical rip launch.
3. Pulling a ramp into the rival's path.
4. Ramp → rail/pocket or burst result.
5. XP/unlock and a quick rematch.

## Not until the Quest arrives

- Rival arena shaping.
- Full trajectory prediction.
- Pocket/rail context snapping.
- Decisive-move slow motion and a long cause trail.
- Rim tilt super, shockwave or new gestures.
- New arenas, parts, progression systems or a daily run.
- Multiplayer, leaderboards, agents or online services.
- A new performance architecture for the hub before seeing the Quest result.

## Only verifiable on a physical Quest

- Pinch, lift, pull and release reliability with real hand tracking.
- Tracking loss with the two hands close together.
- 60 FPS and the GPU/frame-time budget.
- Table/wall detection and the tray fallback.
- Passthrough contrast, metal/plastic readability in real room light.
- Two-foot seated reach and long-session comfort.
- Headset menu pause/resume, sleep/wake and tracking recovery.
- Mix, limiter and spatial perception on speakers/headphones.

When the Quest arrives, the first job is not new features but closing these eight items on the
device.

## Status (Oct 6, 2026)

- **Priority 1 done.** `report:shaping` (24 rounds per pair, sides alternated): no shaping 46-47%,
  random 47-49%, push-out ramp 57-59% (2.8-2.9 shapes per round, median 15.6-16.3 s, self-KO
  5-6%), center well 51-52%. Push-out and random sit at the bottom edge of their bands; the
  spread between runs is about 2 points.
- **Priority 2 done.** `check:sim` section 11 tests the guide state machine. A clean-save run
  logged every label change (dev `[LABEL]` log): the intro, rip, ramp, result, level-up and each
  unlock follow one another, none overwritten; the result waits for every queued unlock.
- **Priority 3 done.** Needle and Orb drain a little faster, Flat and the Halo ring a little
  slower: best build 66%, parts 44-60%, the type loop holds. Extremes are telegraphed: Ember Ring
  (Striker 77%, Needle 24%) says attackers win fast; Sumo Square (Needle 22%) says light
  spinners get pushed off; Zero-G (Needle 64%) says long spinners thrive.
- **Priority 4 done** except the clamps, left as they are (see `VISUAL-POLISH.md` section 8).
- **Priority 5:** typecheck and build pass, bundle 2.48 MB, no app errors; draw calls fight 110,
  hub 226-228, forge 188 with most parts unlocked (over the ~180 guide; it grows with the shelf),
  workshop 118. Screenshots in `docs/review/`.
- **Priority 6:** texts in `SUBMISSION.md`. Hosting waits for the developer.
