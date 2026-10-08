# Game director review (RC pass, Oct 8)

Scope: the Forge -> Rip -> Reshape -> Result -> Rematch loop. Read-only review. Sources: README, DUEL-DESIGN (Status), NIGHT-AUDIT, polish DONE/DONE2/DONE3, PLAYTHROUGH3, baseline shots `docs/night/baseline/01-09`, `/tmp/ed/base-arenas.txt`, `/tmp/ed/base-tops.txt` (complete), `/tmp/ed/base-shaping.txt` (only the `none` row had finished; shaping numbers below come from `/tmp/ed/shaping-final2.txt` and DUEL-DESIGN Status), and the code.

## Verdict

The hand layer is in good shape: one verb per match (`match-system.ts:2507-2512`), a measured skill gap (none 48%, human ramp 58%, + Anvil Strike 64%), six seals within 4 points, circuits, daily orders, side-grade levels. The weak link is the **forge's place in the loop**. Most rounds are decided by spin, so the build is the biggest lever. But nothing in a match tells the player that, and nothing after a loss sends them to the anvil with a reason. Rivals and arenas already differ enough to call for different builds: the data shows it, the player never hears it. All five findings are text and placement fixes on data that already exists. None needs new content.

---

## 1. Rivals and arenas never ask for a build change (HIGH)

**Evidence**
- All seven rival tips teach a hand move or a seal, never a part: Rim Raider "ramp it", Iron Keep "wait for its quake, then strike", Drifter "knock it out early", Leech "keep away and ramp", Hookjaw "cup your own top", Sawtooth "a Ward or a cup", Bastion "a Tilt or a ramp" (`src/game/parts.ts:347-353`).
- The type loop is real: attack beats stamina, defense beats attack, stamina beats defense (`sim.ts:526-528`). The player starts as Striker (`forge.ts:65`). The Cinder champion Iron Keep is the Anvil preset (Anvil Bolt Dome, `parts.ts:348`), the direct counter to the starting top. That is the natural "change your top" wall, and its tip says "strike it out".
- Arenas shift types a lot (`base-arenas.txt`): Striker 43% (Grand Anvil) to 68% (Ember Ring), Halo 33% (Glacier Steps) to 64% (Zero-G Dish), Anvil 36% to 59%. The arena `rule` text already says it ("long spinners thrive", "heavy tops hold", "attackers win fast", `arenas.ts:36,55,109`). But it only shows on the ready card (`match-system.ts:3148`), after the build is locked. Home shows only "Next match: X in Y" (`hub.ts:494`). The forge stats plate shows dials and role, with no next rival and no arena (`forge.ts:696-710`).
- All rivals spin left (`spin: -1` x7, `parts.ts:347-353`), and new players spin right. So Leech's Cog grind ("steals spin from opposite spin", `parts.ts:144`) always works on a new player. The obvious build answer, matching its spin with the spin token, is never hinted.

**Problem it solves:** "are builds meaningful?" and "do rivals and arenas push build changes?" They do in the sim. In the player's head they do not, so the forge feels cosmetic after the Spur lesson.

**Smallest fix**
- (a) Give each rival tip a second clause naming a build answer, using parts and types the player owns at that point. Iron Keep: "...or forge a Halo: long spin outlasts a heavy middle". Leech: "...or match its spin with the spin token". Drifter: "...a Striker or Spur hunts it down".
- (b) Add one line on the forge stats plate (and under "Next match" on the level plate): `Next: Iron Keep (holds the middle) in Sumo Square: heavy tops hold`. Build it from the existing `rival.style` and `layout.rule` strings.

**Regression/scope risk:** low. These are strings plus one line of canvas text. Check the plate's text fitting (`hub.ts:493` already shrinks the font to fit).

**Do NOT do now:** a matchup-percentage predictor, auto-suggested builds, a counter or weakness icon system, new parts, retuning the type loop.

## 2. The most common finish, OUTLAST, gives no reason (HIGH)

**Evidence**
- 64-84% of rounds end on spin, not a knockout (arena KO rates 16-36%, `base-arenas.txt`). Even the best scripted player wins only about 41% of rounds by knockout (`human + anvil strike`, KO wins 41%). A passive player still wins 48% (`none`), and comebacks are 0-5% (DUEL-DESIGN Status). So spin rounds are usually decided by build and rip, visibly and early.
- A cause is named only for a knockout within 1.5 s of a shape (`match-system.ts:3076-3089`: `loser.finish !== 'spin'`). A spin loss reads "OUTLAST! They +1 heat". The home report records it as "they OUTLAST" (`matchReport`, `match-system.ts:1527-1531`).

**Problem it solves:** "does a player understand why they won or lost?" They do for knockouts (YOUR RAMP -> SLAG, THEIR CHARGE -> THROWN, BACKFIRED). Mostly they do not for the finish they see most.

**Smallest fix:** on a spin finish, write a second card line from data already in hand:
- If the ENDURE gap (`statsOf(spec).stamina`, mine vs theirs) is at least 15: "Its Pin tip spins longer than your Chisel".
- Else if your rip was weak (power < 0.6): "Weak rip: 45%".
- Else: "Spin ran out in the clashes".

One function and no new UI. It also feeds finding 1: the reason names a part.

**Regression/scope risk:** low. Keep it off the stamp (the stamp stays OUTLAST!) so the result queue does not grow.

**Do NOT do now:** spin-over-time graphs, a damage breakdown screen, retuning comebacks or knockout rates (the gates were met; DUEL-DESIGN already stopped promising comebacks).

## 3. The loss tip disappears before the player decides what to do next (MEDIUM-HIGH)

**Evidence**
- "You lose the match / Tip: ..." is set on the transient label (`match-system.ts:3069`). It competes with the finish stamp, level and feat stamps, unlock cards and the replay (PLAYTHROUGH3 #2 and #11; DONE3 capped the queue at three, it did not remove it).
- The persistent home report keeps only the round list, best rip and XP (`match-system.ts:1527-1531`). Shot `05-home-after-match.png` shows "you SHATTER · you SHATTER · best rip 81% · +330 XP". After a loss, nothing at home says what to try. Home is where the choice between forge, rematch and workshop is made.

**Problem it solves:** the Result -> Reshape -> Rematch link. The loop's "one more match" works best when the loss leaves a concrete plan ("the Halo might hold it").

**Smallest fix:** after a lost match, replace the "best rip / XP" tail of `matchReport()` with `Try: ${rival.tip}` (the build clause from finding 1). If the tip names a part, give the anvil the existing "call" ring that the first session uses for the Spur.

**Regression/scope risk:** low. Watch the report label overlapping the order board's rival chips (PLAYTHROUGH3 #12).

**Do NOT do now:** a post-match analysis screen, coaching popups, a loss-streak assist.

## 4. The first forge lesson is a change the player cannot see (MEDIUM)

**Evidence**
- The first session's only forced build change is Chisel -> Spur (`match-system.ts:1089,1175`). The blurbs are "Fast and aggressive, burns spin" against "Aggressive, steers better" (`parts.ts:300-301`). The numbers barely move (seek 3 -> 4, gear 1.15 -> 1.25, roam 0.6 -> 0.45). The forge says only "Spur fitted: Aggressive, steers better" (`forge.ts:637`).
- The data also says it is an upgrade, not a side-grade: Chisel is the weakest part by average (44%, `base-tops.txt`), and Striker Bolt Spur makes the top-10 at 59%. That cuts against "levels open options, never power" in the very first unlock.
- Yet the setup is ideal: the first-session rematch keeps the same rival (DONE.md), a clean A/B test.

**Problem it solves:** "top builds mean behaviour, not only stats." The first lesson should be "a part changes how your top moves", not "parts click into slots".

**Smallest fix:** on the first-session rematch's intro card, add one line: "Watch your Spur: it turns on Drifter sooner". Rewrite the Spur blurb as a behaviour: "Turns toward the rival; Chisel runs wide on the rim".

**Regression/scope risk:** very low (strings).

**Do NOT do now:** retune Chisel or Spur. Chisel is inside the ATTACK preset (`sim.ts:530`), so a change ripples through every arena and type report. Do not change the first reward to a different part this close to the freeze either.

## 5. The judge-facing README contradicts the rival design (LOW, but a judge reads it first)

**Evidence:** README line 97: "the opponent gets a random build each round". README's levels section and `parts.ts:327-330` say a rival keeps its build and spin for the whole match. `randomBuild()` (`match-system.ts:1579`) is only for workshop demos and the no-rival path.

**Problem it solves:** a judge reading "random build" assumes there is nothing to read or counter, which undercuts findings 1 to 3. Rivals are learnable archetypes; that is the point.

**Smallest fix:** replace the clause with "each rival keeps its build for the match (see Smith levels)".

**Regression/scope risk:** none.

**Do NOT do now:** rewrite the README. It is long but accurate otherwise.

---

## Checked and fine (no action)

- **Teaching order:** rip + ramp, then strike (bar pre-filled to 0.8 in later rounds, `match-system.ts:2355`), then cup and sling, then tells. The cup arrives around minute 6-8, which is fine: ramp + cup is only +2 over ramp alone (60% vs 58%). Do not move it earlier.
- **Progression:** levels 1-20 take roughly 80 matches (`xpToNext = 200 + 120(L-1)`). Signature parts from knockouts give three parts early in the Cinder circuit. Seals are side-grades (61-65%). There is no second currency.
- **Return reasons:** the daily order, circuits, medallion notches, champions on the rim and challenge codes are enough. Do not add more systems. Challenge wins granting unlocks (PLAYTHROUGH3 #17) is a minor farm, acceptable.
- **Agency:** skill gap +16 points, own knockouts 13%. Gates met; leave the tuning alone.
