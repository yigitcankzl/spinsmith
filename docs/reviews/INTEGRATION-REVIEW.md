# Integration review (7cf4e0d..e48376d: arenas, duel layer, tells, seals, signature parts)

Method: I read the diffs and the code paths they touch, mostly match-system.ts. I ran `npm run typecheck` and
`npm run check:sim`, and both are clean. I also ran node probes that import src/game/*.ts:
`reportShaping(policy, 5)` against each rival move, `playBuilds(all, 6)` for part balance, the Twin ridge
heights and the cost of maxRim. Line numbers are for HEAD.

Probe numbers (N=5, all arenas). Human ramp+cup vs no move: win 57%, median 15.4 s.
- vs charge: 56% (10.3 s). With the anvil: 61%.
- vs quake: 57%. With the anvil: 62%.
- vs pull: **49%**, own KO 19%. With the anvil: 60%.

Tells shorten rounds a lot, which is good for judges. Pull is the only move that hurts, and Drifter
(Lv 1) uses it. Part means: Anvil 56.5, **Gale 55.5**, Striker 54.8, Bulwark 51.9, Spindle 50.1, overall 49.9.
The signature parts sit inside the band, and none of them dominates.

## Earlier reviews: what is still open

Fixed and checked:
- ARENAS: H1 (fitMatch), H2 (stage scale), H3 (ridge fixed; the spawn at n 0.56 now sits on the crest,
  14.1 vs 8.3 mm, so the top rolls into a basin, which looks intended), H4, M1, M2, M3 (load backfill and `next`),
  M4 (sizeSettled), M6, M7, L2, L4.
- DUEL: §2 (cups and slings let go), §3 (slap thresholds plus a 0.5 s arm), §4 (clunk gone), §5 table
  height (lowered root: `root.y - PEDESTAL*rootK` is the table), §7 (0.18 s ring from the palm, HIT_STOP 45 ms).

Still open:
- **DUEL §1, partly open.** The levers are in (palm origin, START 0.3, passive 18), and timed strike vs no strike is
  now +4-5 points in the probes. A strike-specific own-KO column is still missing.
- **DUEL §4 remainder.** The slap loop still runs in the workshop demo (match-system.ts:1799). See F9.
- **DUEL §5 floating tray.** The band is still `PEDESTAL` under a tray root in mid-air (:1798). Only the wording changed.
- **DUEL §6.** `struckOnce` and `tellTaught` live per session, not in Progress. That is acceptable.
- **DUEL §8.** A strike still earns `MARK.shape` (:2294), and a strike after a ramp still loses `rampKO` credit. The wrist
  rings still show on both hands from 5% up (:1828).
- **ARENAS M5, partly open.** Meteor got `shrinkStart: 8` and arenaWarning gained the KO rule. The report
  still puts the rival on the axis.
- **ARENAS L1 became a new bug.** See F4.

## Findings

**F1, MEDIUM: re-placing during a pull leaves the cord drone and the charge ring on.** match-system.ts:620-623 → toReady
(:1444). A recenter (holding the Meta button, which judges do) or a session change while `phase === 'pulling'` calls
toReady. toReady never calls `cordTone.update(null)` or hides `chargeRing`. Result: the square-wave drone keeps
sounding and the orange ring keeps glowing at the old spot until the next pull. Fix: at the top of toReady,
`this.cordTone.update(null); this.chargeRing.visible = false; this.puller = null;`.

**F2, MEDIUM: a recenter during a workshop TRY round corrupts the state.** :622. A demo round runs in `phase 'fight'`, so
needPlace calls `toReady()` with `demo` still true. The result is a 'ready' card with the Menu, a stale `this.rival`, and
a pinch that launches a non-scoring round. Pressing Menu then calls `toHub()`, which closes neither the builder nor
`demo`, so the workshop panels stay up over home. Fix:
`if (this.demo) this.endDemo(); else if (p === 'pulling' || p === 'fight' || p === 'result') this.toReady();`.

**F3, MEDIUM: the quake's shockwave starts in the wrong place.** :1886-1888. A rival quake sets `shockT = 0` but never
`shockAt`, so the ring spreads from the palm point of the player's last strike (or from the middle if there was none). The
sim's quake comes from the middle (`strike(arena, rival, you)`, with origin 0,0). Iron Keep is a Lv 1 rival, so this shows
in the second match. Fix: `this.shockAt.x = this.shockAt.z = 0;` before `this.shockT = 0`.

**F4, MEDIUM: circling pillars snap at every launch, and the ones shown in 'ready' are not the real ones.**
visuals.ts:1275. Outside a fight the view turns by `this.time`, while the sim's pillars sit at angle 0 (`elapsed` is 0
after `arena.reset`). At launch the clock switches to `arena.elapsed`, and the pillars jump by up to 180° on Orbit
Foundry (Lv 3). A launch spot picked against what you see can land on a pillar that isn't drawn there. Fix: add
`Arena.orbitPhase` and use `pillarAt(L, p, arena.orbitPhase + arena.elapsed, ...)`. At launch, set
`arena.orbitPhase = this.arenaView.time` and have the view use `orbitPhase + elapsed` in a fight. This also closes ARENAS L1.

**F5, MEDIUM: a rival quake breaks your cup on the rival and leaves the sling cord frozen.** sim.ts:732 with :799.
`braced` only checks whether *your* top is caught. When your cup holds the rival and you are mid-sling, `strike()` frees
every caught cup. updateShaping then stops updating the cord (`sl.cup.caught` is null, match-system.ts:1724-1729), but the
cord is never hidden: it hangs in the air until you let go, and the sling does nothing. Fix (it also teaches cups as a
counter): in rivalTell, before the move lands,
`if (this.arena.shapes.some(s => s.caught === them)) { this.tellAt = -1; them.tell = 0; this.label.set('HELD! Its move fizzles'); this.labelTimer = 1.2; return; }`.
Also call `endSling(s, false)` for both sides in the quake branch.

**F6, MEDIUM: the seal drawer always shows the anvil.** forge.ts:859 `g.add(sealModel('anvil'))`. The drawer model and the
part held in the hand both stay a hammer after you pick Rush or Magnet. `isOn` (:560) marks the seal pedestal "on" only for
non-anvil seals, so a new player's anvil looks unequipped. Nothing in a match names the seal until the cause line. Fix:
`itemModel(item, build?)` with `sealModel(build?.seal ?? 'anvil')`. In `fit()`, after cycling, swap the slot's model
children for `sealModel(seal)`, make `isOn` return `true` for the seal, and add `Strike: ${SEAL_NAMES[seal]}` to the stats card.

**F7, MEDIUM: three signature parts are dead, one hint is wrong, and the demo save disagrees.** progress.ts:86-94 and :146-149.
- Hookjaw's `ring:hook` is also the first-knockout quest, so you always have it before Hookjaw (Lv 6) shows up.
- Sawtooth's `ring:saw` opens at Lv 5, before Sawtooth arrives at Lv 9.
- Bastion's `core:5-80` opens at Lv 8, before Bastion arrives at Lv 12.
- `unlockHint('ring:cog')` returns "Lv 9", but knocking out Leech gets it at Lv 4.
- demo-save.ts:31-32 marks Rim Raider and Iron Keep as knocked out, but its `award()` calls pass no `rival`, so a `?demo`
  judge reads "Locked: Knock out Rim Raider" on Gale while the ledger shows that knockout.

Fix: check RIVAL_SIGNATURE before the level tables in unlockHint (or return `Lv 9 or knock out Leech`). Give
Hookjaw, Sawtooth and Bastion new signatures, or drop them from the table. In demoSave, pass `rival: 'Rim Raider'` and
`'Iron Keep'` on two of the award calls.

**F8, MEDIUM (teaching): the first match floods the player with rewards.** progress.ts:283 plus the quest and level unlocks. A first
match won by knockout queues up to six NEW! cards: hook (quest), the rival's signature, tip:rush, Zero-G Dish, Titan
Crater, plus a level-up. Each one holds the result for about 2.8 s (:2338). After that, home says only "New part: Spur
tip!". Fix: `if (... && this.guide === 'done')` on the signature drop, and the same for ARENA_UNLOCKS[2] (or move Titan Crater to Lv 3).

**F9, LOW: the slap strikes and the rails pulse in the workshop demo.** :1799-1816. updateStrike is not gated on
`demo`. Fix: `if (this.demo) { this.arenaView.charge = 0; this.shock.visible = this.shockT < 1; return; }` after the shock step.

**F10, LOW: the cause line prefers your shape over the rival's later move.** :2210-2217. Example: you ramp at 10.0 s, Rim
Raider's charge lands at 10.8 s, and you go over at 11.2 s. The card reads "YOUR RAMP BACKFIRED". Fix: on v === -1, use
THEIR when `theirs && (!recent || this.rivalShapeAt > this.lastShape!.t)`.

**F11, LOW: a braced or fizzled move still plays everything.** :1883-1892. With your top in your own cup, a quake or pull does
nothing (sim.ts:808). The game still shows "IRON KEEP: QUAKE!", the ring and the room flash, and sets `rivalShapeAt`, so a
later unrelated KO reads "THEIR QUAKE". Fix: have rivalMove return `false` when braced. In that case show
`BRACED!` and skip `rivalShapeAt`.

**F12, LOW: charge and Rush double their effects.** sim.ts:807 sets `sinceDash = 0`, so updateFight (:2154-2158) also
runs a rail flash, a dash ring and `playDash`. A Rush therefore plays dash twice plus strike. Fix: give the move its own
flag (`t.charged = true`) and leave `sinceDash` to the rails.

**F13, LOW: a late table doesn't refit.** :1393. easeToTable sets `onTable` but `fitKey` (:1171) doesn't change, so a big
arena placed on the tray stays at full size over the table it just found. Fix: `this.placedAt = this.time;` in the snap branch.

**F14, LOW: the tell teaching text can't always be followed.** :1864. "Strike first to stop it" shows even with your bar
empty, and the landing card replaces it after 1 s (TELL_TIME) even though `labelTimer` is 2.5. Fix:
`this.forgeBar.full ? 'Slap the table now to stop it' : 'A full forge bar can stop it'`. On the first landing, make
the second line "Next time strike while it glows".

**F15, LOW: the report credits the rival's quake to the player.** shaping-report.ts:337 uses `arena.lastStrike`, which
`strike()` also sets for a rival quake. Fix: in rivalMove's quake, save and restore `arena.lastStrike` (as it does for `tell`).

### Per-frame allocations and costs
- updateSize (:1171) builds a template-string key and an `ease` closure every frame in four phases. Fix: compare
  `L`, `L.radius` and `placedAt` fields directly, and make `ease` a private method.
- `maxRim` takes about 0.09 µs (measured), so calling it every frame is fine. You can cache it in `fitKey` anyway.
- tableShape() runs once per fit or setRoom. Fine.
- `setRoom()` rebuilds the mask geometry each time the slide settles (twice per big-arena match). That is acceptable.
- updateStrike: the `forEach` closure on `barSegs` and the `['left','right']` literals (common across the file). Use a
  `static SIDES` constant and indexed loops.
- ArenaView.update: `railMats`, `bumperMats` and `padMats` forEach closures (visuals.ts:1256-1276). `flashPad` allocates `?? []`.
- Older, but still on every frame: updateShapes `filter().map()` twice plus `[]` (:2068-2069), `bar.bar(['YOU', name.toUpperCase()], {...})`
  (:715), and `tables()` with `new Vector3()` per plane, called twice per frame in updatePress and every frame in a drag (:1380).

Checked and fine:
- No tells during the grace (they need `grace + 2` s).
- No tell starts with a top out, and a landing on a dead rival returns.
- The rival bar resets every launch.
- `forge.allowed()` resets a locked seal to the anvil, and saves without a seal read as the anvil.
- `sizeSettled` gates the pull, and startMatch → toReady settles before the first pinch.
- A re-place mid-fight refits through `placedAt` in `fitKey`, and the `lowered` and `pushed` offsets reset in placeRoot.
- Gale, Bulwark and Spindle balance (see above).
- The seal and signature reveals find their models through ROWS and sealModel.

## Five cheap polish items for a judge's first 10 minutes

There are now six verbs (pull, ramp, cup, sling, slap, and reacting to tells) plus seals and signatures. Teach one per match.

1. **Hold the strike and the tells until each has been taught.** Give the first match's bar boost (:1643) only once
   `guide !== 'bump'` (after the ramp). Start rival tells (:1852) only after the first strike lands
   (`this.struckOnce`, or persist it), so "strike first" always means something.
2. **Show where to slap.** While `armed`, show `this.print` on the table beside the pedestal, on the hand's side. Name
   the seal in the hint: `${SEAL_NAMES[seal]} ready!\nSlap the table beside the arena`. (DUEL §9.3 hasn't been done.)
3. **Put the rival's move on its intro card** (:1480): `Rival: Rim Raider · charges while it glows`. Fix the
   teaching text from F14. Show "HELD!" or "BRACED!" (F5, F11) so the cup reads as defense.
4. **Calm the first session's rewards** (F8), and make the reveals say what to do: "Rim Raider's GALE ring is yours: fit
   it at the anvil" and "RUSH strike: choose it in the forge's STYLE drawer".
5. **Make the seal visible** (F6): the right coin in the drawer, "Strike: Rush" on the stats card, and the seal's
   color on the wrist ring when it's full, so a judge who changed it sees the change.
