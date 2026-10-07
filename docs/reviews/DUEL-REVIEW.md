# Duel layer review (forge bar + Anvil Strike)

Reviewed: commits `1917bd2` and `cbba040` (HEAD), against `docs/DUEL-DESIGN.md`. Line numbers are
HEAD's (`git show HEAD:<file>`); the working tree already has uncommitted rival-tell work in
`sim.ts`/`shaping-report.ts`/`match-system.ts`. `npm run typecheck` and `npm run check:sim` pass.
Balance numbers come from a HEAD snapshot, `reportShaping(policy, 8)` (1080 rounds per policy).

## 1. Balance: the strike barely changes a round (High: the headline feature is mostly invisible)

| Policy (N=8, all 15 arenas) | Win | KO wins | Median round | Own KO | Comeback |
|---|---|---|---|---|---|
| human ramp+cup, no strike | 58% | 31% | 15.5 s | 12% | 0% |
| human ramp+cup + timed strike (`humanStrike`) | 59% | 33% | 15.4 s | 13% | 20% |
| human ramp+cup + strike at a random moment | 56% | 32% | 15.0 s | 14% | 16% |
| masher + strike (`masherStrike`) | 49% | 20% | 18.0 s | 12% | 4% |
| masher, no strike | 49% | 17% | 18.5 s | 11% | 0% |
| strike only (`humanStrike(none)`) vs none | 48% vs 47% | 13% | | strike-caused own KO about 1% per strike | |

- Gate "good timing beats masher+strike by at least 12 points": **fails, +10**. And most of those 10
  points come from the ramps, not the strike: good timing beats random timing (same ramps) by only
  3 points. The strike alone adds 1 point.
- Why: the bar fills in only **34% of rounds, median at 17.4 s**, after the median round has ended
  (`STRIKE_BAR.passive: 30`, `clash: 0.07`, shaping.ts:87-89; reset at every launch, match-system.ts:1599).
  On the starter **Forge Bowl** (median round 6.9 s) and on Meteor Pit (6.0 s) it never fills: Forge Bowl
  results are identical with and without the strike. A judge playing a first match there never sees it.
- Strength is not the lever: strike 1.6 or 2.0, own share 0.2-0.3, even zero input lag (`delay 0`)
  all land at 60-62% with timing still worth at most 2-3 points. Availability is the lever:
  passive 15 s gives 64% timed vs 51% masher (+13, passes) but comeback falls to 9%; passive 12 and
  clash 0.1 gives 63%/med 11.8 s (too short). Carrying the bar over three rounds of a match: +1 point.
- Comeback (gate 20-30%) reads 20% at HEAD but is noisy (3-24% across nearby settings; few rounds meet
  `t > 5 && spin < 0.6 rival`). Report it with its count, or widen the definition, before tuning to it.
- Per arena (N=8, about +-6 points of noise): no arena where the strike is too strong. Small pit arenas
  are where it hurts its user: Meteor Pit own KO 13% to 21% with the timed strike, Sumo Square 14% to 21%.
  Big arenas (Colossus 0.26, Grand Anvil 0.25) show 0 to -8 points: a top at n 0.6 gets 0.43 m/s,
  not enough to cross 10 cm of floor.
- Fix (sim first, as the plan says): (a) make the strike skill-expressive: push from the press point
  (palm angle around the rim) instead of the centre, `strike(arena, mine, rival, ox, oz)` with
  `k ~ TUNING.strike * falloff(distance from origin)`: where you slap becomes the read; (b) fill
  faster where rounds are short: `passive` scaled by arena (e.g. `passive * min(1, radius / 0.2)`), or
  start each round at 0.3; (c) re-run the gates with a strike-specific own-KO column.

## 2. A cup set but not yet catching becomes permanent after a strike (High, round-deciding)

match-system.ts:1795-1799. `doStrike` sets `this.cups[s] = null` and `this.slings[s] = null`.
`strike()` (sim.ts:728) frees only cups that hold a top. An empty cup keeps `held = true, trap = true`
(strength 1 forever, sim.ts:294) and nothing frees it any more: `updateCup` is the only timer
(match-system.ts:1841) and it lost its reference. The next top to roll in is caught and held until its
spin dies. Also the sling cord stays drawn: `cord.set(null)` only runs in `endSling`.
Fix:
```ts
for (const s of ['left', 'right'] as const) {
  this.endSling(s, false);                 // hides the cord; the cup was already freed by strike()
  const c = this.cups[s];
  if (c) this.arena.free(c.shape);
  this.cups[s] = null;
}
```

## 3. A hand put down to rest strikes (High, fails the device check "0 strikes from a resting hand")

match-system.ts:323, 1755. The strike reuses `TUNE.press` (down 0.15 m/s, hold 0.25 s): the gentle
press tuned for placing. Setting a hand down on the table beside the arena between moves is exactly a
0.2-0.5 m/s come-down followed by stillness, and the bar stays full until spent. `outside` tests the
index tip only (1754), so fingertips curled over the pedestal edge also count.
Fix: its own thresholds, a slap rather than a press, e.g.
`new TableTouch({ down: 0.6, window: 0.25, still: 0.1, hold: 0.06 })` (tunable knobs `strikeDown`...),
and arm only after the bar has been full for 0.5 s (`fullSince`), so a hand coming down as it fills is
not a strike. Device-check both: 20 slaps (at least 19 hit), 20 rests (0 hit).

## 4. The "locked" clunk on every resting hand (Medium)

match-system.ts:1757-1758. With the bar not full (most of the time, see 1), each come-down beside the
arena plays `playLocked()`: before the strike was ever taught, the player hears a failure sound for
resting a hand. It also runs in the workshop demo (`updateStrike` is not gated on `this.demo`; the
strike itself fires there too with `J`).
Fix: `if (!full) { if (this.strikeTaught && this.forgeBar.value > 0.6) playLocked(); continue; }`
and skip the touch loop when `this.demo`.

## 5. Table height: wrong with `rootK`, and no surface on the tray (Medium)

- match-system.ts:1750: `tableY = root.y - PEDESTAL * rootK`, but `root.y` is `table + PEDESTAL`
  (placement.ts:59; `fitMatch` never moves y). At rootK 0.7 the band's top is 6 mm under the floor rim,
  so a still hand at rim height outside the arena (a sling pull ending outside the rim) can count.
  Fix: `const tableY = this.root.position.y - PEDESTAL;`.
- Same cause, visual (from the arena commit): the pedestal mesh scales with root
  (`ArenaView(PEDESTAL / ARENA_SCALE)`), so a shrunk arena's pedestal and AO ring float
  `(1 - rootK) * 8 cm` above the table. Fix in `updateSize`: keep root.y at `base + PEDESTAL * rootK`,
  or give `ArenaView` a pedestal height of `PEDESTAL / (ARENA_SCALE * rootK)` on resize.
- Floating tray (placed by timeout, no press, no plane): the band is 8 cm under a floating arena in
  mid-air; the hint says "the table". The design's correction 1 says the hand's own height. Fix: when
  `!onTable` and not press-placed, accept `[root.y - 0.25, root.y - 0.03]` and say
  "Slap down beside the arena".

## 6. Teaching can be lost (Medium)

match-system.ts:1741-1745. `strikeTaught` is set when the hint is shown, once a session. In the first
session `updateGuide` rewrites the label every frame while the bump hint is up, and "Caught! ..." also
overwrites it; the judge never reads it and is never told again. Fix: teach until the first successful
strike (persist `struckOnce` in Progress), re-show a short "SLAM the table!" each time the bar fills
until then. And 1808 clears any label after the first teaching: clear only the hint
(`if (this.time - this.hintAt < 4) this.label.set('')`).

## 7. The strike's cause and effect read backwards (Medium, readability)

match-system.ts:1783-1805. The impulse is applied at once, the sim freezes 90 ms, then tops fly while
the 0.35 s ring is still near the middle: tops move before the wave reaches them. The wave starts at
the arena's centre, not at the palm. Fix: ring in 0.15 s (or queue each top's impulse until
`shockT * maxRim * 1.1 >= its radius`); add `impacts.hit` at the palm's local point on the pedestal
side first. `HIT_STOP * 2` (90 ms) is over the design's 40-80 ms: use 0.07.
Small: 1786 `floorHeight(shockT)` should be `floorHeight(min(1, r / arena.radius))`.

## 8. Low

- Cause credit: a ramp that set up the KO followed by a strike is credited `STRIKE` (lastShape
  overwritten, 1800): the `rampKO` order (orders.ts:109) is then missed, and `MARK.shape` ("by your
  shape", match-system.ts:2156) is granted for a strike. Decide: keep the ramp if it was within the
  window, or add a `MARK.strike` notch.
- Wrist rings (1773-1780): always on in a fight, both hands, ten grey segments even at 0%; placed
  5 cm world-up from the wrist joint, so a palm-up hand shows it floating over the palm. Show from
  30% only, on the hand last used, offset along the back-of-hand normal (store the wrist quaternion).
- Rival never strikes: fine for this step (a player-only comeback tool); the tells (step 3) give it
  counterplay. The working-tree `rivalBar` fills with `behind = false`; keep the report's player and
  rival bars symmetric when comparing.
- No XP for strikes; no other progress side effects found. `J` / `Shift+J` behave (spend checks grace).

## 9. Making it land with a judge in 10 minutes (cheap, in order)

1. Guarantee the moment: in the first match (guide stage `bump`/`match`) start round 2 with the bar
   at 0.8, so every judge gets "bar full" within about 3 minutes, on any arena.
2. Telegraph where the eyes are: they watch the tops, not their wrists. Lerp the rails to the
   palette's existing `railHot` with `forgeBar.value`, and pulse them white when full: the arena
   itself heats up.
3. Show where to slap: reuse the press-to-place print (`this.print`), glowing on the table on the
   hand's side of the pedestal while the bar is full. It teaches without words.
4. Make it a moment: "ANVIL STRIKE!" on the label for 0.8 s, `slowMo` on any strike that knocks
   a top out within 1.5 s (the cause path already does this), a rising hum while full.
5. One input, one meaning: once the strike needs a slap (3), the placing press and the cup press
   never collide with it, and the sound of a missed slap can stay.
