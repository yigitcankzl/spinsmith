# SpinSmith: full evaluation

Reviewed Oct 7, 2026, at HEAD `163c18b` (139 commits, working tree clean). This was a read-only review:
I edited no source and committed nothing. I judged it the way a Meta VR Start 2026 judge (Gaming,
New Experience) and a game designer would, using the criteria quoted in `BRIEF.md`.

**Not scored (pending, neutral):** headset testing (the device has not arrived, so only the emulator
was used), Quest Store packaging, the demo video and trailer, and a hosted public build. None of
these affect any number below. Where feel or performance can only be confirmed on a device, I say
"unverified" and score the design and the code, not the missing test.

---

## 0. Scores at a glance

| Category | Score /10 |
|---|---|
| 1. Concept, originality, Gaming-track and MR fit | **7.5** |
| 2. Core loop and moment-to-moment feel (design and code) | **6.5** |
| 3. Depth and variety | **8.5** |
| 4. Onboarding and teaching load (10-minute judge) | **5.5** |
| 5. Balance (measured) | **7.5** |
| 6. Code quality and architecture | **7.0** |
| 7. Comfort, accessibility, seated ergonomics | **6.0** |
| 8. Presentation (visuals, audio, juice, UI) | **6.5** |
| 9. Docs and submission material | **6.0** |
| **Overall** | **7.0** |

**Overall in one line.** This is a very ambitious, unusually well-measured MR tabletop game with a
new hero verb: you reshape the arena floor during the fight. Its biggest problems are not missing
features. They are the opposite: too much to teach in ten minutes, an advantage from skilled play
that is real but modest, a small and hard-to-read hero moment, and docs that have drifted from the
code.

Mapped to the four judging criteria (equal weight; my estimate, ignoring pending items):
Innovation 7.5, Experience Design 6.5, Technical 7.0, Polish & Presentation 6.5, a **mean of about 6.9**.
That puts it in the top band of submissions to reach judging, but not yet a clear winner in Gaming.

---

## 1. Concept and originality (7.5)

**What is new.**
- **Shaping the arena mid-fight** is the core idea, and I have not seen it in a spinning-top game or
  among past Start winners. A pinch on the floor raises a ramp, a fingertip press opens a cup, and a
  caught top can be slung. The sim backs it (`src/game/sim.ts` shapes, and `strike` at
  `sim.ts:737`), so does the input (`match-system.ts:1726` `updateShaping`), and so do the reports.
  It passes the "take it away" test better than most tabletop entries: without the hands-in-the-floor
  verb, this is a different and weaker game.
- **The real table is part of the game, not just a backdrop:**
  - placement on a table or desk plane, with a polygon fit (`room.ts`, `match-system.ts:1312`);
  - press-to-place with your palm at the table's true height (`table-touch.ts`);
  - a palm slap on the real table as the super move (`match-system.ts:1806` `updateStrike`);
  - knocked-out tops landing and falling over on the real desk;
  - a passthrough-dimming shell that turns the arena into a pool of light on your desk
    (`room-light.ts:1-60`, a neat ray-to-table-plane shader);
  - hand occluders (`hand-occluder.ts`).

  This is exactly the "purposeful passthrough" the Experience Design criterion asks for.
- The forge, the arena workshop and the match bar all live inside one machine on the table
  (`hub.ts`, `rim.ts`, `match-bar.ts`). There are no floating menus, and the UI is diegetic.

**What holds it back.**
- **The genre reads as Beyblade-adjacent.** The forge's ring, core and tip structure mirrors
  Beyblade X: internal ids `'3-50'`, `'4-60'`, `'9-60'`, `'5-80'`, `'7-70'` and the tip ids
  `flat/rush/taper/ball/needle/orb` (`parts.ts:179-182`, `225-229`, `325-331`), plus many brand
  mentions in `docs/` (`TOP-CUSTOMIZATION.md`, `COMPETITION-REVIEW.md`). The display names are
  original (Stub, Bolt, Clamp, Chisel...), so players never see the ids. The docs, though, should
  never become public as they are.
- **Many verbs are shaped like a fighting game** (bar, super, tells). That gives depth but dilutes
  the single legible hand verb that BRIEF.md's pattern analysis says past winners had ("all you need
  is a pinch").
- **"Boldest concept" judges may see it as a tops game plus extras**, unless the hero moment reads
  instantly (see section 8).

---

## 2. Core loop and moment-to-moment feel (6.5, unverified on device)

The loop: dock, then rip, then fight (ramp, cup and sling, strike), then result, then XP and
unlocks, then forge or workshop, then rematch.

**The rip.** A pinch-and-pull slingshot. Power comes from travel plus speed at release, and the angle
of the pull matters (flat is fast, steep gives more spin). The cord heats from white to orange to
yellow and a charge ring grows (README:47-57). The pinch has hysteresis, 2.0 cm to close and 3.5 cm
to open (`tuning.ts:24-25`, `hands.ts:4-6`), and full power needs a 22 cm pull at 1 m/s
(`tuning.ts:27-28`). This is a good, well-understood verb (Tiny Golf won with the same idea). The
92% "white-hot" threshold gives skill something to chase.

**The ramp.** It rises when the pinch has held for 0.12 s (`RAMP_NEAR_HOLD`, `match-system.ts:1775`)
instead of on release. This is the most important feel decision in the project, and the data
backs it:
- with a 0.35 s lag on the pinch, a human ramp wins 57% of rounds and leaves 33% untouched;
- with a 0.62 s lag on release, it drops to 51% and leaves **71% untouched** (`npm run report:shaping`).

On a real Quest, whether the ramp "meets the top" is the whole game. It is unverified until the
headset arrives.

**Cup and sling.** It is clever: the press-in opens a cup, and pinch, pull and release slings the
caught top, snapping to a slag pit within 20°. It also gives a defensive read, since a rival held
in your cup cannot use its move (`match-system.ts:1917` "HELD!"). But it is a third verb in the
same 15 s round.

**Strike (palm slap).**
- The bar starts each round a third full and fills on its own in 24 s, three times as fast when
  behind (`shaping.ts:85-91`).
- The slap thresholds are 0.6 m/s down and 0.05 s still (`tuning.ts:41`), armed 0.5 s after the bar
  fills, which is well reasoned against resting hands.
- A glowing handprint shows where to slap, and the strike starts from the palm's point on the rim.

It is physical and MR-native: hitting the real table is a great feeling. The device question is
whether tracking jumps look like slaps.

**Seals and rival tells.**
- Seals: Anvil, Rush at Lv 4, Magnet at Lv 7.
- Tells: a 1 s flash and whine, then a charge, quake or pull, and "INTERRUPTED!" if you strike
  first (`match-system.ts:1882-1951`).

This is good fighting-game thinking (read, then punish) without frame-tight timing.

**Moment-to-moment concerns.**
- **The player's agency is modest in numbers.**
  - A random masher wins 49% and doing nothing wins 48%. That is good, because random input does
    not pay.
  - The best human-feasible play wins 58% (ramp and cup) and 64% (with the Anvil Strike).
  - A good player therefore still loses roughly 4 rounds in 10 to a rival with equal stats. 28% of
    rounds are "untouched", meaning no shape changed the result.
  - Own knockouts from your own shapes run 13-16%.

  For a judge who plays well for two matches, the fight can feel like watching dice with
  occasional input. Fighting games feel fair because skill dominates; here the sim dominates.
- **Rounds are short.** The median is 12.8-15 s with the human policies, and each round holds only
  about 5 shapes. The sling, slap and tells all compete for those 13 seconds.
- **The loop between rounds is long.** Result card, then XP bar, then up to several NEW! cards
  (each holds about 2.8 s), then a pinch for the next round. The first-session flood is gated by
  `guide === 'done'` (`progress.ts:284`), which is good, but later matches can still stack level,
  arena and rival reveals.

---

## 3. Depth and variety (8.5)

There is a lot of content, and most of it is real systems rather than reskins:
- **15 arenas** built from data (`layout.ts`, `arenas.ts`): shape, floor (8 types), wall, pits,
  rails, pillars and bumpers, circling pillars, boost pads, vortex, turntable, rocking dish, a ring
  of embers that closes in, and themes (ice is slippery). There are big stadiums up to 1.25 m that
  open out for a match.
- **Parts**: 8 rings, 5 cores and 6 tips, giving **226 legal builds** under 40 g (checked:
  `allBuilds().length === 226`). Each part changes physics, not just stats: height, lock, spin
  transfer, rail gear and Saw chipping.
- **3 seals**, **7 rivals**, each with a style, a fixed build and a big move, **7 signature parts**,
  **levels 1-20** that open options and never power (`progress.ts:41-60`), daily **Smith Orders**,
  rival medallions with 3 notches, champions, and a stamp ledger (`orders.ts`, `board.ts`).
- **The arena workshop**: user-made arenas with live median-length, KO-rate and type-balance dials,
  checked in a worker (`builder.ts`, `check-worker.ts`). This is UGC with a built-in balance oracle.
  It is excellent, and it is what Tiny Golf won with.

**Gaps.**
- **Three signature parts are dead**:
  - Hookjaw's `ring:hook` is also the first-knockout quest (`progress.ts:127`);
  - Sawtooth's `ring:saw` opens at Lv 5, but Sawtooth arrives at Lv 9;
  - Bastion's `core:5-80` opens at Lv 8, but Bastion arrives at Lv 12
    (`progress.ts:41-94` against `parts.ts:329-331`).

  In addition, `unlockHint('ring:cog')` reports "Lv 9" even though knocking out Leech at Lv 4 also
  gives it, because the level table is checked first (`progress.ts:146-149`). This was raised in
  INTEGRATION-REVIEW F7 and is still open.
- The seal drawer item is still always the anvil model (`forge.ts:872`). The coin on the top does
  show the chosen seal (`forge.ts:271`).
- A judge sees perhaps 2-3 arenas, 3 rivals and one forge visit in 10 minutes. The depth is real but
  mostly invisible to the people scoring it, so it mostly helps "Reason to Come Back".

---

## 4. Onboarding and teaching load (5.5)

**Good.**
- The staged first-session guide (`progress.ts:153-159`: launch, bump, match, forge, fit, rematch,
  done) keeps the anvil and workshop hidden until the first match ends.
- First-launch arrows, then a breathing ring beside the rival for the first ramp, then a Spur tip
  as the guaranteed reward with the forge highlighting only that part, then a rematch.
- The strike hint waits until after the first ramp (`match-system.ts:1815`). Tells start only after
  the first match.
- `?fresh` / `?demo` and the hold-to-reset level plate handle shared headsets (`index.ts:8-17`).
- The HTML landing page states the three requirements: sit at a table, hands only, allow spatial
  data (`index.html`).

**Problems.**
- **The verb count.** In the first 10 minutes a judge is asked to learn: place (press or pinch),
  carry the top to the dock, rip with aim and angle, ramp with drag-to-aim, cup, sling, the forge
  bar and slap, reading tells, the forge (drawers, fit, paint, quench), and possibly the board. That
  is 6-8 verbs. BRIEF.md's own pattern ("one instantly-legible hand verb") argues for rip plus ramp
  only in the first match, with each further verb introduced in its own later match.
- **The first-match strike prompt and cup instructions arrive together.** TESTING-NOTES "first five
  minutes" step 3 teaches ramp, cup and sling in one breath. Every text prompt is a label that also
  carries round results, and labels overwrite each other (DUEL-REVIEW §6, only partly addressed by
  `struckOnce` living per session).
- **Text is the main teacher**: two-line labels such as "Your top waits in its dock / Put it in the
  arena to play" (`match-system.ts:863-866`). That is fine on a desktop, but in-headset readability
  at about 70 cm is unverified.
- **The tray fallback is silent.** With no labelled table, the arena floats after 8 s
  (`PRESS_WAIT = 8`, `match-system.ts:39`) with no in-headset explanation. README:31 says 5 s, so the
  docs disagree with the code.
- **A failed `launchXR()` is not caught** (`index.ts:26`), so a desktop judge pressing ENTER gets
  nothing. This matters less once a Quest is the only target.

---

## 5. Balance, from the measured numbers (7.5)

I ran all four scripts at HEAD. Typecheck is clean. `check:sim` reports "all passed" (14.8 s, 24
sections). The reports are not fast:
- `report:arenas`: 2 min 9 s;
- `report:tops`: 3 min 34 s on 15 threads (47 CPU-minutes);
- `report:shaping`: about 10 min.

### 5.1 `check:sim`

```
fight: 21.5 s, 43 clash steps, winner stamina
type loop: attack>stamina 0.70, defense>attack 0.57, stamina>defense 0.57
```

The rock-paper-scissors loop holds, though it is lopsided: attack beats stamina strongly (0.70),
while the other two edges are mild (0.57). With 3 presets, Striker is the safest pick for a new
player.

### 5.2 `report:arenas` (preset types, every arena)

| Arena | Median | KO | Striker / Anvil / Halo | Read |
|---|---|---|---|---|
| Forge Bowl (starter) | 18.2 s | 31% | 66 / 42 / 41 | Starter favours attack: fine for a first match |
| Ember Ring | 15.1 s | 27% | **79** / 46 / **24** | Strongest type skew in the game |
| Sumo Square | 14.9 s | **53%** | 64 / 66 / **20** | Halo is nearly unplayable; the arena is a KO lottery |
| Zero-G Dish | 22.3 s | 20% | 51 / 36 / 64 | Stamina arena, as intended |
| Clockwork Spire | 21.9 s | 21% | 49 / 46 / 55 | Only 10 clashes: a quiet arena |
| Ripple Pool, Titan Crater, Orbit Foundry | 20-22 s | 18-20% | about 50 each | Balanced but long and low-KO |
| Meteor Pit | 19.5 s | 16% | 58 / 55 / 38 | Lowest KO, despite "Pit" |
| Grand Anvil (Lv 20 capstone) | 21.4 s | 19% | 43 / 59 / 48 | Fine |

**Interpretation.**
- There are no warnings. KO rates span 16-53% and medians 15-22 s with no player input. That is a
  healthy spread: arenas really do favour styles, and the game says so at the start.
- Ember Ring and Sumo Square (79/24 and 64-66/20) are past "favours" and into "decides". Since
  rivals keep their build for a match, Drifter (Halo) in Sumo Square is close to a guaranteed loss
  for the rival, or the reverse for a Halo player. Consider nudging these two arenas toward a type
  spread of about 70/30 at most.
- Several late arenas (Ripple, Titan, Orbit, Grand Anvil) sit at about 20-22 s with about 19% KO.
  With player shaping, rounds shorten (about 13-15 s), so this is acceptable.

### 5.3 `report:tops` (226 builds, every arena, 48 opponents each)

- Parts: rings span 43-56%, cores 48-53% and tips 45-53%. Best build: Gale Bolt Dome at 63%. Worst:
  Cog Clamp Chisel at 31%. No warnings. This is a tight band for a parts game; nothing dominates.
- **Findings.**
  - **Gale** (Rim Raider's signature, earned by knocking out a Lv 1 rival once) is the **best ring at
    56%**, and 6 of the top 10 builds use it. That softly contradicts "levels open options, never
    power". The easiest signature part is a power upgrade.
  - **Cog** (43%) and **Hook** (44%) are the weakest rings. Every one of the 5 worst builds is Cog.
    Cog is Leech's signature and a Lv 9 unlock, so its reward is the worst part.
  - **Chisel** (the Striker preset's tip) is the weakest tip at 45%. The starter attack top is
    handicapped by its own tip, but the Bolt core and Striker ring carry it.
  - The Bolt core (the default) is the best core (53%). That is fine for onboarding, though it
    means the other cores feel like sidegrades or downgrades.

### 5.4 `report:shaping` (player policies against the rival, all arenas)

| Policy | Win | KO wins | Median | Untouched | Own KO | Comeback |
|---|---|---|---|---|---|---|
| none | 48% | 13% | 19.0 s | — | 0% | 2% |
| masher (random) | 49% | 17% | 18.2 s | 44% | 12% | 0% |
| human ramp, lag 0.35 s, on pinch | 57% | 31% | 15.7 s | 33% | 8% | 4% |
| human ramp, lag 0.62 s, on release | 51% | 22% | 17.8 s | **71%** | 7% | 4% |
| human cup and sling | 56% | 24% | 16.9 s | 32% | 10% | 2% |
| human ramp + cup | 58% | 30% | 15.0 s | 28% | 13% | 5% |
| superhuman push-out | 61% | 36% | 14.0 s | 0% | 7% | 4% |
| human + Anvil Strike | **64%** | 39% | **12.8 s** | 27% | 13% | **8%** |
| human + Rush | 60% | 38% | 12.6 s | 29% | **16%** | 4% |
| human + Magnet | 63% | 37% | 14.1 s | 27% | 11% | 2% |
| none vs charging rival | 43% | 19% | 16.1 s | — | 0% | 1% |
| human + strike vs charging | 62% | 37% | 12.9 s | 27% | 14% | 2% |

**Interpretation.**
1. **Skill matters and noise does not pay.** The masher gains +1 over doing nothing, while good
   timing gains +10 to +16. The strike gate ("beat masher+strike by at least 12") passes at
   +15. This is the single best piece of evidence in the repo.
2. **The game hinges on input latency.** The same ramp logic goes from 57% to 51%, and from 33% to
   71% untouched, when the effective lag rises from 0.35 s to 0.62 s. The pinch-start ramp is the
   right call. The first headset session must measure real pinch-to-ramp latency.
3. **The comeback mechanic does not deliver.** The target is 20-30%; the measured comeback is 0-8%
   across all policies. The "fills 3x faster when behind" and "lands 1.6x harder when behind" knobs
   do not turn lost rounds. Either the promise goes from the pitch (SUBMISSION:43, "faster when you
   are losing"), or a stronger catch-up is needed (for example, the behind player's cup automatically
   braces, or the strike scales with the spin deficit).
4. **Own knockouts at 13-16% are high for a "verb that should feel good".** One round in 7 ends with
   your own ramp or strike throwing your top out. The cause line ("YOUR RAMP BACKFIRED") makes it
   readable, but for a first-time judge it reads as punishment. Consider bracing your own top for
   the first match, or halving self-effect in the first session only.
5. **Seal parity** is close but misses its own gate: Rush is 4 below the Anvil (target within 3),
   with the highest own KO at 16%. Magnet is at parity.
6. **The skill ceiling is low.** Superhuman push-out with no lag reaches only 61%, and the best
   human with a strike 64%. The rival AI always matches launch quality to the level, so the outcome
   stays close to a coin flip with a thumb on the scale. That suits a casual game, but it limits
   "mastery" retention.
7. **The median round with the strike is 12.8 s**, under the 13 s floor. That is good for judges
   (fast matches) and fine to accept. Update the target instead of tuning to it.

---

## 6. Code quality and architecture (7.0)

**Strong.**
- **The sim and render are cleanly separated.** `sim.ts` (1,046 lines), `shaping.ts`, `layout.ts`,
  `parts.ts`, `progress.ts`, `orders.ts`, `rotation.ts` and `table-touch.ts` import nothing from
  three.js. The sim runs at a fixed 120 Hz step (`sim.ts:140`) and is deterministic, which is what
  makes the four reports and the workshop's worker check (`check-worker.ts`) possible.
- **Tests.** `scripts/sim-check.ts` has 24 sections and about 160 checks. They cover physics
  invariants, the type loop, arena knobs, parts, progression, guide monotonicity, vocabulary,
  placement, reach (§16), rotation, table fit, cup, press, strike bar, tells, signatures and slap.
- **Balance as code**: arena warnings, the part band and shaping-policy gates are all reproducible.
- **Device-tuning knobs** come from URL parameters in dev builds only, with production defaults
  (`tuning.ts:1-50`). This will make the first headset day efficient.
- **Pure, dependency-free gesture detectors** (`TableTouch`) are reused for both place and slap with
  different thresholds.
- Clear comments, typed throughout, `tsc --noEmit` clean, no TODO, FIXME or mock data in `src/`.
- Audio and assets are fully procedural (no licences to clear), and pause is handled
  (`setAudioPaused`, VisibilityState).

**Risks and debt.**
- **`MatchSystem` is a 2,341-line class** (`match-system.ts:126-2466`). `init` is 189 lines and
  `update` 159. Placement, launch, shaping, strike, tells, guide, result, hub transitions, demo
  rounds and occluders all share mutable fields, which is the source of most bugs the past reviews
  found (cups not freed after a strike, recentring mid-pull, demo-round leakage). Do not refactor
  before the freeze, but expect state bugs in the device phase.
- **Private API use**: `e.getValue(XRPlane, '_plane')` in three places (`match-system.ts:1312, 1336,
  1397`) reads IWSDK internals for `semanticLabel` and `polygon`. A minor IWSDK update could break
  placement silently. Pin `@iwsdk/core 1.0.1`, which is already exact, and add a guard log.
- **Per-frame allocation is against AGENTS.md's own rule.** There are 21 `new Vector3/Quaternion`
  calls in `match-system.ts` (some are fields, some are not), 15 `filter`/`map` chains, template
  strings for keys, and a `tables()` call with a `new Vector3` per plane. These were flagged in the
  INTEGRATION-REVIEW per-frame list and are mostly still present. They are likely fine at 72 fps
  on Quest 3, but are an uncertainty with the dimming shell and occluders on (draw calls: hub about
  210, forge 160, fight 108-112, per ACTION-PLAN §6).
- **Silent failures**:
  - `launchXR()` has no catch (`index.ts:26`);
  - a corrupt save silently resets (`progress.ts:216`, `forge.ts:51`, `builder.ts:70`);
  - there is no "no table found" message.
- **Unused XR features are requested**: `anchors`, `meshDetection` and `hitTest` in
  `iwsdk.config.json`. That means more permission prompts and features to explain, with no use.
- **Velocity risk**: 139 commits in 2 days (Oct 6-7). The codebase is moving faster than the
  reviews can check. `check:sim` is the only automated gate, and nothing tests `MatchSystem` flows.
- Small dead or wrong content: the three dead signatures, the wrong Cog hint, and the seal drawer
  model (above).

---

## 7. Comfort, accessibility, seated ergonomics (6.0)

**Good.**
- It is seated by design: no locomotion (`iwsdk.config.json` `locomotion: false`), and the arena
  appears about 68 cm ahead (`REACH = 0.68`, `placement.ts:10`) with its near rim about 30 cm away.
- There is a reach test: touch targets sit at 0.32-0.67 m and at most 63° below the eyes
  (sim-check §16).
- Big arenas shrink until they fit on the table.
- The dimming pool reduces visual clutter around the play area. Hit-stop freezes only the tops,
  never the head (45 ms, `match-system.ts:93-94`).
- Re-place works on recenter, and there is a brass handle to carry the arena.
- Tracking loss under 0.1 s is ignored, and a lost hand cancels a half-made shape.
- Colour coding (warm for you, cool teal for the rival) is a good colour-blind-friendly pairing.

**Concerns.**
- **No accessibility options at all.** There is no mute or volume control, no reduce-flash or
  reduce-motion setting (room flash on knockouts, shockwave, white hit flashes), no left-handed or
  one-handed mode, no seated-height or reach override in production (knobs are dev-only), and no
  text-size option. ACTION-PLAN §5 explicitly deprioritises this. That is defensible for the
  Accessibility award, but the criteria also reward inclusive design in general.
- **The slap** needs a hard downward hit (at least 0.6 m/s). Repeated slapping every match is a mild
  wrist and comfort concern and noisy in shared spaces. It is also impossible on a lap tray or
  airplane tray ("airplane seat test": a slap on a fold-down tray is bad). Offer a pinch-fist or
  "press and hold" alternative for the strike.
- **Two-handed simultaneity** is never required (good), but the far ramp uses the hand ray, which
  partly contradicts "no menus to aim at" (`pickButton` at `match-system.ts:807`; the Menu button is
  picked by ray at :693).
- **The upper reach end of 0.67 m** is in the band Meta discourages for repeated touch (above
  0.55-0.6 m). The far rim holds only read-only elements, but sling pulls and ramps at the far edge
  of a 1.25 m stadium will be a stretch.

---

## 8. Presentation: visuals, audio, juice, UI (6.5)

**Visuals.**
- A cohesive "forge" art direction: dark gunmetal, orange molten accents, brass knobs and Rajdhani
  type (`docs/review/*.png`, `index.html`).
- Generated matcaps and per-type top silhouettes (`visuals.ts`, 1,694 lines), arena themes (forge,
  stone, clockwork, ice, lava, void), heat glow on damaged tops, burst debris, a molten cord and
  contour rings on relaxing shapes.
- The match bar is styled after fighting games and set into the far rim.

All screenshots are emulator-grey; on passthrough the warm-dark palette should look much better.

**Juice.**
- Hit-stop of 45 ms, slow motion on a shape knockout, and white flashes on hard hits.
- A shockwave ring from the palm, rails warming with the bar, and a "YOUR RAMP → SLAG" cause line.
- Level-up sparks and unlock reveals spinning over the arena.

That is a lot of the right juice for the effort.

**Audio.**
- Everything is synthesized (`audio.ts`): a spin hum per top whose pitch drops as it slows, panned
  clashes, cord tension, a slag pit sound, bursts, a four-note motif shared by win, level-up and
  stamp, and a synthesized forge loop.
- It is identity-consistent and licence-free. Without a proper music bed the experience may feel
  thin between rounds. Unverified in headset.

**Readability and scale.**
- **Tops are about 6 cm on a 72 cm arena** (a 2.4x scale over the sim). In `docs/review/fight.png`
  the tops are a few pixels across. The hero moment, a ramp throwing the rival, is small and fast.
  This is the biggest presentation risk, both for judges in the headset and for any footage.
- Far-rim text (match bar, stats plate) at about 1 m is unverified. WP5 raised bar names to 56 px.
- `docs/review/home.png` still shows the floating "Arenas" shelf and PLAY/FORGE/BUILD labels, which
  later commits moved or changed. The screenshots lag the build.

---

## 9. Docs and submission material (6.0)

**Strong.**
- An exceptional amount of design thinking, written down: `GAMEPLAY-DIRECTION.md`,
  `DUEL-DESIGN.md` (with gates and honest "missed" notes), `ARENA-SHAPING.md`,
  `FIGHT-INTERACTION.md`, `TABLE-INTERACTION.md`, three code reviews in `docs/reviews/`, an honest
  `ACTION-PLAN.md` with a schedule, freeze dates and a do-not-do list, and `TESTING-NOTES.md`
  written for judges.
- `SUBMISSION.md` has a tight tagline, a description under 500 words, a hands-first section and a
  video storyboard.

**Problems: stale or wrong claims** that an AI-assisted Stage One or an attentive judge would catch.

| Claim | Reality |
|---|---|
| "Six rings, four cores and six tips make 136 legal builds" (SUBMISSION.md:19); "136 legal builds" (README.md:78, which also lists 4 cores) | 8 rings, 5 cores and 6 tips: **226** builds (`report:tops` header) |
| Storyboard "Six arenas" (SUBMISSION.md:92) and "136 builds" (:93) | 15 arenas, 226 builds |
| "waits up to 5 s for a table" (README.md:31) | `PRESS_WAIT = 8` (`match-system.ts:39`); TESTING-NOTES says 8 |
| "about 60 cm in front" (README.md:29) | `REACH = 0.68` (`placement.ts:10`) |
| "does not yet know the table's edge" (README.md:25) | The polygon fit exists (`room.ts`, sim-check §18) |
| "No controllers, no menus to aim at" (SUBMISSION.md:58) | The Menu button and far ramps use the hand ray (`match-system.ts:693, 807, 1775`) |
| "about 0.35-0.55 m" reach (SUBMISSION.md:71) | Tested range is 0.32-0.67 m (sim-check §16) |
| "faster when you are losing" (SUBMISSION.md:43), framed as a comeback | Measured comeback is 2-8% (target 20-30%) |

**Other problems.**
- **The README is a developer document**: about 260 lines, internal paths, dev keys. A judge needs
  a five-line "Try it" block at the top.
- **Brand residue**: Beyblade mentions across docs (`TOP-CUSTOMIZATION.md`, `COMPETITION-REVIEW.md`,
  `ACTION-PLAN.md` D2), plus agent-tooling folders (`.claude/`, `.agents/`, `AGENTS.md`;
  `git ls-files` shows 74 tracked files under `.claude`/`.agents`). This only matters if the repo or
  docs become public, but the rules forbid brand names in the project.
- There are many overlapping planning docs (EXTRA-POINTS, VISION-REVIEW, SCORECARD,
  COMPETITION-REVIEW, QUESTLESS-PLAN). These are useful history, but noise for anyone evaluating.

---

## 10. Top strengths

1. **A genuinely new hero verb with numbers behind it.** Arena shaping during the fight (ramp on
   pinch, cup and sling) is the original idea, and `report:shaping` proves that random input does
   not pay (+1) while good play does (+10 to +16).
2. **A deterministic, three.js-free sim powers everything**: 24-section `check:sim`, three balance
   reports across 226 builds and 15 arenas, policies that model human latency, and a live balance
   oracle in the arena workshop running in a worker.
3. **MR that changes the game, not just the backdrop**: table-plane placement with polygon fit,
   palm press-to-place, a palm slap on the real table as the super, tops falling onto the real desk,
   a passthrough-dimming pool of light, and hand occluders.
4. **Diegetic, seated-first interface**: forge, workshop, match bar, board and level plate are all
   built into one machine on the table, with a reach test in CI and every action a pinch, pull or
   press.
5. **A strong "reason to come back" layer for a jam game**: daily Smith Orders, rival medallions,
   signature parts, champions, 20 levels of options-not-power, a UGC arena workshop, `?fresh` and
   `?demo`, and an installable manifest.

## 11. Top risks to winning

1. **Feel on hardware decides everything, and it is unknown.**
   - Pinch-to-ramp latency (the gap between 0.35 and 0.62 s is 57% vs 51% wins and 33% vs 71%
     untouched).
   - False and missed slaps.
   - 60+ fps with the dimming shell, occluders and about 210 hub draw calls.
   - Plane labels in unfamiliar rooms.
2. **Teaching load versus a 10-minute judge**: 6-8 verbs plus forge, workshop and board. Judges may
   leave having learned the rip and seen a lot of text, without the "I reshaped the arena and won"
   moment.
3. **Agency reads as small**: a skilled player wins 58-64%, 28% of rounds are untouched by shapes,
   and own knockouts run 13-16%. A judge can come away thinking "the tops fight themselves".
4. **The hero moment is small**: 6 cm tops on a 72 cm arena, and a ramp throw lasting a fraction of
   a second. It is hard to read in the headset and harder on video, and the competition wants an
   instantly legible hand verb.
5. **Credibility and robustness gaps**:
   - stale or false claims in README and SUBMISSION (136 vs 226 builds, six arenas, "no menus to
     aim at", the comeback);
   - silent fallbacks (no-table tray, `launchXR` failure);
   - private `_plane` API use;
   - placement depends on a `table|desk` semantic label, while judges' rooms are "rooms the
     developer never tested".

## 12. Highest-leverage improvements before the Nov 6 feature freeze (ranked)

| # | Improvement | Why | Effort |
|---|---|---|---|
| 1 | **Run the device day-one protocol the moment the Quest lands** (ACTION-PLAN Q0): pinch-to-ramp latency, slap 19/20 and resting 0/20, fps with dimming and occluders, pinch thresholds, text legibility. Then tune only with the `tuning.ts` knobs | Every other score depends on it, and the knobs are ready | 1 day + 2 days of tuning |
| 2 | **Teach one verb per match.** Match 1: rip and ramp only (cup, sling and strike off). Match 2: the cup and sling. Match 3: the strike. Tells only after the first successful strike (persist `struckOnce` in Progress). Keep NEW! cards to one per result screen | Turns "too much" into a five-minute ramp up; fits "First Five Minutes" | 1 day |
| 3 | **Make the hero moment big.** Raise fight-time scale or top size (try the `?scale=` knob at 2.8-3.0 on the device), exaggerate the ramp lip and the throw arc, and trigger slow motion plus a short camera-facing "THROWN!" burst for every shape knockout, not just some | The wow moment must read in a glance and on video | 1-2 days |
| 4 | **Make agency feel bigger and safer.** First session: your own top is braced against your own ramp and strike, which kills most own knockouts. Raise the ramp throw against the rival a little so that "human ramp+cup" reaches about 62-65% while the masher stays near 50%. Re-gate with `report:shaping` | A judge should feel their hands win the round | 1 day (sim plus reports) |
| 5 | **A docs truth pass and a judge-facing README**: fix every row in the section 9 table, add a five-line "Try it" block at the top, drop or reword the comeback claim, and move internal planning docs into `docs/archive/` | Cheap; protects Stage One and credibility | 0.5 day |
| 6 | **Visible fallbacks**: an in-headset card "No table found: the arena floats; press your palm on any surface to place it", plus a `launchXR` catch with "Open this on a Meta Quest". Remove the unused `anchors`, `meshDetection` and `hitTest` features | Robustness in unknown rooms; fewer permission prompts | 0.5 day |
| 7 | **Balance touch-ups**: trim Gale to about 53%, raise Cog and Chisel to about 47%, push Ember Ring and Sumo Square to 70/30 at worst, bring the Rush within 3 points of the Anvil. Give Hookjaw, Sawtooth and Bastion real signatures (or new parts) and fix the Cog `unlockHint` | Content that exists should pay off; makes "options, not power" true | 0.5-1 day |
| 8 | **Minimal comfort options on the level plate**: sound on or off, reduce flashes, and a "gentle strike" (press and hold instead of slap) for trays and shared spaces | Covers the airplane-seat test and basic inclusivity | 0.5-1 day |
| 9 | **Fix the remaining small bugs**: the seal drawer model (`forge.ts:872`), and per-frame allocations on hot paths (`tables()`, the `filter`/`map` calls in `updateShapes`, the key strings in `updateSize`) | Polish and frame-time headroom | 0.5 day |
| 10 | **Do not refactor `MatchSystem` before the freeze.** After it, split it into phase controllers (Placement, Launch, Fight, Duel, Result, Guide) | Lower regression risk now; maintainability later | Post-freeze, 2-3 days |

---

## 13. Pending (neutral, not scored)

These are not counted against any score: on-headset testing (the device has not arrived), the
hosted public URL and its freeze, the demo video, cover and logo, and Quest Store or PWA packaging.
When they are done, the storyboard in `SUBMISSION.md` should be revised to match current content
(15 arenas, 226 builds, the strike and tells), and the cold open should be the real-table ramp
throw.

---

## 14. Follow-up (Oct 7, the same day)

Done without the headset:

- **One verb per match** (item 2): match 1 is rip and ramp only; match 2 adds the strike (its
  later rounds start with the bar nearly full); match 3 the cup and sling, with a first-time hint;
  tells from match 4 (match 3 once a strike has landed). After the first session, one NEW! card
  per result screen; the rest wait for the next ones.
- **Hero moment** (item 3, the part that needs no device): every knockout win slows down for a
  moment; one your own move caused slows for 0.9 s in a shower of sparks. The fight-time scale
  stays a device decision.
- **Agency** (item 4): the ramp is a little taller and wider; ramp + cup 58% → 60%, Anvil 64%
  against masher 49%. "Own KO" turned out not to be caused by your own shapes (halving their
  push on your top changed it by a point), so no bracing was added.
- **Docs truth pass** (item 5): README "Try it" block; 226 builds, 5 cores, 15 arenas, 68 cm,
  8 s, the table outline, "no menus" reworded, the reach range, the comeback claim dropped.
  Planning docs were not moved (it would break their cross-links); brand mentions remain only
  in research citations in internal docs.
- **Visible fallbacks** (item 6): "No table found: the arena floats here" card; ENTER on a
  browser without immersive AR says "Open this page on a Meta Quest"; anchors, mesh detection,
  hit test and environment raycast removed; a warning if IWSDK's private `_plane` disappears.
- **Balance** (item 7): Gale 56% → 50%, Cog 43% → 48%, Hook 44% → 46%; Ember Ring 79/24 → 68/47,
  Sumo Square Halo 20% → 40%; Rush within 3 of the Anvil. Chisel was left at 44%: it is the
  attack preset's tip and the type loop depends on it. Hookjaw's, Sawtooth's and Bastion's
  signatures now open by level only after those rivals arrive (Lv 10, 14, 16; Cog Lv 12), the
  first-knockout deed gives the Bead tip, and lock hints list every way ("Knock out Sawtooth or
  Lv 14").
- **Comfort** (item 8): a brass comfort dial on the near rim: Standard, Calm (no hit flashes,
  press-and-hold strike), Quiet (sound off), Quiet and calm.
- **Small bugs** (item 9): the seal drawer was already right (the tray coin follows the build);
  the per-frame allocations left are small and wait for a device profile.
