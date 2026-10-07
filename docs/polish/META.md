# SpinSmith: the game around the fights

Oct 8, 2026. Read-only research for "it still looks like a prototype": what turns the current
loose loop (dock → match vs a random rival → XP → home) into a game with a world, a journey and
an ending. Scope: rivals, match structure, result screen, rewards, level-ups, orders, records,
titles, narrative flavor, achievements, session endings. Code only (text, procedural visuals,
synthesized audio). The rule stays: **levels open options, never power.**

Line numbers are from the working tree on Oct 8 (other agents are editing `match-system.ts`,
`progress.ts` and `parts.ts` at the same time, so lines may drift by a few; function names are
given as well).

---

## 1. What is there, and why it reads as a prototype

The systems exist; the **frame** around them does not.

| Piece | Where | What a player sees |
|---|---|---|
| Rival choice | `pickRival()` `match-system.ts:1022` | A weighted random draw from the rivals your level allows. No order, no goal, no "who's next". |
| Rival identity | `RIVALS` `parts.ts:327` | A name, a 3-word style, a build, a move. Shown once as a 2-line label: `Rival: Drifter · stamina drifter` (`match-system.ts:~1551`). No personality, no voice, no record against you. |
| Difficulty | `const skill = (level-1)/15` `match-system.ts:1743` | Rivals rip harder **as you level up**. Levelling quietly makes the game harder: the reward for playing is a tougher opponent and no visible reason why. |
| Match end | `finish()` `:2291`, `earn()` `:2400`, `updateRewards()` `:2453` | The same 512×160 two-line `Label` as every other message ("You win the match! / Heat 3 - 1"), an XP line on the match bar, then one NEW! card, then `toHub()` after `RESULT_TIME = 4` s. No summary of what you did. |
| Progress | `progress.ts` | Level 1-20, five rank names, unlock keys, order stamps, rival marks, 3 champions. Nothing named after a deed of yours except marks. |
| Structure | — | There is no ladder, no champion, no "end". The first 10 minutes have no shape after the tutorial: you play, you level, you play. |
| Narrative | — | None. No smithy, no mentor, no reason the rivals are here. (grep finds no story text in `src/game`.) |
| Records | — | Nothing kept beyond matches played, marks and champions' win counts. No bests, no head-to-head. |

The evaluation (`docs/reviews/FULL-EVALUATION.md` §3) put depth at 8.5 but said the depth is
"mostly invisible to the people scoring it". The fix below is not more content; it is a
**spine**: a ladder of named rivals with a champion at the top, and a proper match report that
says what just happened and what is next.

---

## 2. Research: how shipped games frame their fights

**Punch-Out!! (Wii, 2009): the rival ladder.** Three circuits (Minor, Major, World), each of
3-4 boxers ranked #3 → #1 and a circuit champion; beating the World champion leads to Title
Defense, where every opponent returns with a new trick (King Hippo tapes a manhole cover over his
weak spot) ([Punch-Out!! Wiki](https://punchout.fandom.com/wiki/Contender_Mode),
[Wikipedia](https://en.wikipedia.org/wiki/Punch-Out!!_(2009_video_game))). Each opponent has an
intro "movie" of stills that sets up their personality, and taunts are part of how they fight
([TV Tropes](https://www.tvtropes.org/pmwiki/pmwiki.php/Fridge/PunchOut),
[Nintendo Life](https://www.nintendolife.com/reviews/wii/punch-out)). Lesson: a small cast
becomes memorable through **rank, an intro and one gimmick each**, and a known number of steps
to the title.

**Arcade fighting-game ladders.** Street Fighter II's arcade mode is a ladder ending with a boss;
the after-fight screen shows both faces and the winner's **win quote**; the Japanese version
showed **a playing tip on the continue screen** after a loss
([Wikipedia](https://en.wikipedia.org/wiki/Street_Fighter_II),
[Tropedia: Victory Quote](https://tropedia.fandom.com/wiki/Victory_Quote)). Lesson: a VS card,
a one-line quote and a tip on a loss cost only text.

**Creed: Rise to Glory (VR).** The career is **seven fights**: a couple of amateur bouts, pro
bouts, a title fight and a first defence, each preceded by a seconds-long training montage
([TechRaptor](https://techraptor.net/content/creed-rise-to-glory-review-the-glory-of-michael-b-jordans-abs),
[PlayStation Country](https://www.playstationcountry.com/creed-rise-glory-psvr-review/)). Lesson:
a VR career can be short and still feel complete; the shape is amateur → contender → title →
defence.

**The Thrill of the Fight 2 (VR).** Career mode: start as a rookie, climb the amateur rankings to
qualify for a tournament, face "increasingly dangerous opponents with distinct styles and
tells", and earn gold medals that unlock **prestige gear** (cosmetic)
([Steam](https://store.steampowered.com/app/4884540),
[Gaming Trend](https://gamingtrend.com/news/thrill-of-the-fight-2-punches-into-full-release/)).
Lesson: rankings plus a title fight, rewards that are looks, not stats. SpinSmith already has
"styles and tells"; it lacks the rankings.

**Beyblade games.** The classic Beyblade tournament mode is seven rounds with a semi-final and
final, the champion earning a part ([Beyblade Wiki](https://beyblade.fandom.com/wiki/Beyblade:_Let_it_Rip!));
Beyblade X: Xone frames its story as a championship with named rival bladers and a final rival
"waiting at the summit" ([Wikipedia](https://en.wikipedia.org/wiki/Beyblade_X:_Xone)). Lesson:
the genre's own fiction is a **tournament with a final rival**, not a random queue.

**Mario Golf: Super Rush (Golf Adventure).** A Mii enrols at a country club, goes from beginner
to pro, faces classmates and bosses, and **earns badges by winning small tournaments**, which
open the next course ([Mario Wiki](https://www.mariowiki.com/Mario_Golf:_Super_Rush),
[Wikipedia](https://en.wikipedia.org/wiki/Mario_Golf:_Super_Rush)). Lesson: a **mentor
institution** (the club; here, the smithy) and a badge per stage.

**Rocket League offline Season.** You choose season length; e.g. 9 weeks plus 2 playoff matches
against every AI team, for a season trophy ([TrueAchievements](https://i1.trueachievements.com/game/Rocket-League/walkthrough/2),
[TechAeris](https://techaeris.com/2015/07/17/rocket-league-review-rocket-propelled-multiplayer-madhouse/)).
Lesson: a standings table is the cheapest "world" there is.

**Wii Sports Resort.** Each sport has 5 **stamps** earned by playing in specific ways, and a
"Defeat the Champion" goal (Lucía in Table Tennis) once you are good enough
([Wii Sports Wiki](https://wiisports.fandom.com/wiki/Table_Tennis_(Wii_Sports_Resort))).
Lesson: feats that ask for a *way of playing*, and a named champion.

**Eleven Table Tennis (VR).** AI difficulty is a 0-100 slider with named stops (Easy … World
Class, Legendary) ([Eleven-VR Wiki](https://eleven-vr.fandom.com/wiki/Single_Player_/_AI)).
Lesson: difficulty belongs to **who you face**, named, not to your own level.

**Achievement design.** Achievements work best designed with the game, as optional challenges
that steer players toward new ways to play; a normal play-through should earn about half, and
**one should come in the first ten minutes**
([Game Developer: The cake is not a lie](https://gamedeveloper.com/design/the-cake-is-not-a-lie-how-to-design-effective-achievements),
[DiGRA framework](https://dl.digra.org/index.php/dl/article/view/545),
[Game Developer: An alternative to achievements](https://www.gamedeveloper.com/design/an-alternative-to-achievements)).

**Tiny Golf (2025 winner).** The Devpost write-up lists "casual progression loops (unlocks,
rewards)" as future work: the winner itself had none ([Devpost](https://devpost.com/software/tiny-golf)).
A structured journey is a real differentiator in this competition, not table stakes.

**This competition.** "Satisfying in ≤10 minutes", "a rewarding, habit-forming purpose"
(`BRIEF.md`). A judge plays perhaps 5-6 matches (a match ≈ 2-3 rounds of ~13 s plus rips and
cards, about 1-1.5 min). **The first circuit must be winnable in the first session**, so the
judge reaches a title moment.

---

## 3. Ranked additions

Ranked by (judge-visible impact in 10 minutes) × (how much it changes "prototype" into "game")
÷ effort. Effort: S ≤ 0.5 day, M 1-2 days, L 3+ days.

### 1. The Circuits: a rival ladder with a champion at the top (M)

**What.** Replace the random rival draw with three short circuits and a final bout, Punch-Out
style. Losing never moves you back; you just face the same bout again (no lives, no streak).

| Circuit | Bouts (rank → champion) | Rung skill | Prize (options, never power) |
|---|---|---|---|
| **Cinder Circuit** (first session) | #2 Drifter → #1 Rim Raider → **Champion Iron Keep** | 0.00 / 0.10 / 0.20 | Cinder Belt, title *Cinder Champion*, a belt plaque at home |
| **Iron Circuit** | #2 Leech → #1 Hookjaw → **Champion Sawtooth** | 0.35 / 0.45 / 0.55 | Iron Belt, title, a paint |
| **Crown Circuit** | #1 Bastion → **The Forgemaster** (see item 7) | 0.70 / 0.85 | Crown Belt, title *Master of the Forge*, gold ledger trim |
| **Title Defense** (after Crown) | Every rival again with a twist (item 10) | 0.9-1.0 | Defense stars per rival |

Why this order: Drifter is the gentlest first bout (stamina, slow; the ramp lesson lands), Rim
Raider is the aggressive step up, Iron Keep the "heavy center holder" champion whose gimmick
(sitting in the middle) asks for exactly the ramp-and-throw verb. Each champion has a home arena
and a "title bout" banner.

**Where.**
- New pure module `src/game/circuit.ts` (no three.js, like `orders.ts`): the table above as data,
  `nextBout(progress)`, `boutResult(progress, won)`, `skillFor(bout)`.
- `pickRival()` `match-system.ts:1022` and `prepareNext()` `:794`: the next rival is the current
  bout's (free play after Crown keeps today's weighted draw).
- `const skill = …(this.progress.level - 1) / 15` `match-system.ts:1743`: take the bout's rung
  skill instead. This also makes "levels never power" honest in both directions: levelling no
  longer makes rivals harder; climbing the ladder does, and the player can see it ("#1 contender").
- `RIVAL_UNLOCKS` `progress.ts:66`: rivals arrive by circuit, not by level. The NEW RIVAL reveal
  (`revealText()` `match-system.ts:2562`) moves to "a new circuit opens", showing its three
  rivals. `sim-check.ts` §12 asserts `RIVAL_UNLOCKS[r.level]` and must change with it.
- Order context `rivals:` (`toHub()`, `match-system.ts:~872`): the rivals met in the circuits.
- Arena per bout: `RIVAL_HOME` `rotation.ts:8` where unlocked, else the rotation; a champion bout
  opens its home arena if still locked (opening an arena is an option, allowed).
- Hub level plate `drawRank()` `hub.ts:407`: "Next match: Hookjaw in Ember Ring" becomes
  "CINDER CIRCUIT · BOUT 2 of 3 · Rim Raider (#1)".

**Data.** `Progress` gains `circuit: { tier: 0..3, bout: number }`, `belts: string[]`, and
per-bout `losses` (for the hint in item 7). Saved like `order`; old saves start at Cinder bout 1
unless `matches > 0`, then at the bout their level suggests.

**Why.** It is the single change that gives the game a spine: a known number of steps, a named
boss, a title, and an end. A judge clears Cinder in session one (bouts 1-3 ≈ matches 1-4 incl.
the first-session rematch) and gets a champion moment on camera.

**Risk.** A player stuck on a champion. Mitigations: XP still flows (losses give ~100), each new
level offers a new part or seal to try (that is the options loop working), after 3 losses at one
bout the Forgemaster's note gives a rival-specific tip, and the bout's skill eases by 0.05 per
loss down to the previous rung (invisible, opponent-side only).

**Test.** Headless (`sim-check.ts` new section): every rival appears in exactly one bout, each
circuit ends in its champion, skills are non-decreasing; a win advances, a loss does not, a belt
is given once, state survives save/reload with a fake `Storage` (as §11 does for the guide);
first session lands on Cinder bout 1. Balance: add a `--skill` sweep to `shaping-report.ts` so
the "human ramp+cup" policy wins about 70% at rung 0.0 and 50-55% at 0.85; gate in the report.
Emulator: `?fresh`, drive four matches with `scripts/drive.sh`, look for `[CIRCUIT] bout` logs and
the belt card.

### 2. A match report plate instead of a two-line label (M)

**What.** When a match is decided, the far-rim match bar (`match-bar.ts`) flips into a **match
report**, one canvas plate, one draw call, in the style of `SmithBoard`:
- a big stamped **WIN** / **LOSS**, the rival's name and its win quote (item 3);
- one row per round: finish icon (SLAG / THROWN / SHATTER / OUTLAST), seconds, and a small
  hand mark when your ramp/cup/sling/strike caused it (the cause already computed in `finish()`
  `:2291`);
- three stats: best rip %, shapes made, knockouts by your hands;
- the XP tally counting up line by line (Rounds +120, Knockout +25, White-hot +15, Match +150),
  each line with a short `playXp()` tick, then the level bar filling;
- what changed: marks earned against this rival, order progress, a personal best (item 5);
- one call to action: **"Next: Rim Raider (#1) · put your top in"**, or after a loss
  **"Rematch Iron Keep"** plus the tip (item 7).

**Where.** `finish()` and `earn()` in `match-system.ts:2291/2400` gather a `MatchLog`; the
`case 'result'` branch `:695` holds the report longer (until a pinch, at least 4 s) when
`matchOver`; `MatchBar` gets a `report(r: MatchReport)` drawing mode. NEW! reveals
(`updateRewards()` `:2453`) play *after* the tally, over the arena as now.

**Data.** `MatchLog { rounds: {won, finish, cause, perfect, seconds}[]; shapes; strikes; bestRip }`
built during the match (reset in `startMatch()` `:1123`); a pure `matchReport(log, award, progress)`
in a new `src/game/report.ts` returns the lines, so it is testable.

**Why.** The result screen is where "game" vs "prototype" is decided at a glance: every shipped
fighter, Rocket League and Creed end a bout with a summary, a tally and a "next". Today the
moment of victory is the same small glass label as a hint. It also makes the shaping verb
visible ("2 of 3 rounds won by your hands").

**Test.** Headless: `matchReport()` on fixed logs (a 3-0 shape-KO win, a 1-3 loss, a draw-replay)
gives the expected rows, XP lines summing to `award.gained`, and a "Next" line that matches
`nextBout()`. Emulator: `K` (shatter) twice and `O` once, screenshot the plate; check that it
reads from the seat (text ≥ 40 px on the 1400 px canvas, as the bar's names).

### 3. Rival identity: epithet, VS card, quotes, a sound and a trim (M)

**What.** Each rival becomes a character in text and procedural looks:

| Rival | Epithet | Intro line | Win quote | Signature look |
|---|---|---|---|---|
| Drifter | "the Long Spin" | "I don't fight. I wait." | "Still spinning. Are you?" | slow teal shimmer trail |
| Rim Raider | "the Edge Runner" | "The rim is mine. Stay off it." | "Over the wall. Again." | white sparks on the ring edge |
| Iron Keep | "the Unmovable" | "The middle is my house." | "You knocked. Nobody answered." | thick dark rim band, low hum |
| Leech | "the Thief" | "Thanks for the spin." | "Your spin, my win." | reversed-spin chevrons |
| Hookjaw | "the Low Wall's Curse" | "Low walls? Lovely." | "Hooked." | hook glints on the upper ring |
| Sawtooth | "the Chipper" | "Every hit leaves a mark." | "In pieces. As promised." | jagged saw silhouette (exists) |
| Bastion | "the Patient Tower" | "Take your time. I have plenty." | "Tall walls, short fights." | tall core, slow pulse |
| The Forgemaster | — | "Show me what you made." | "Back to the anvil, apprentice." | gold-and-teal, all three tells |

- A **VS card** at a match's start (2.5 s): both tops spinning side by side over the arena (the
  reveal path in `updateRewards()` already spins a `TopView` there), your name/title vs theirs,
  the circuit rank ("#1 CONTENDER"), the head-to-head record ("You 2-1"), its style and big move.
  Replaces the label at `match-system.ts:~1551`.
- A one-line **taunt** during the tell (`Rivals' big moves`, `:1943`), on a first knockout
  against you, and the **win quote** on the report.
- A **3-note rival motif** played at the VS card and on its tell, built with the existing
  `motif()` / `tone()` in `audio.ts:170` (each rival gets its own pitches; the player's four-note
  motif stays the "win" sound).
- A **trim accent** inside the rival's teal family (never orange, the player's) on the ring's
  edge and on its board medallion.

**Where.** `Rival` interface `parts.ts:316` gains `epithet`, `intro`, `taunt`, `win`, `lose`,
`motif: number[]`, `trim: number`; `RIVALS` `parts.ts:327`. New `playRivalMotif(name)` in
`audio.ts`. VS card: a small canvas plate class beside `Label` in `visuals.ts` or `ui.ts`.

**Why.** Punch-Out and Street Fighter show a tiny cast becomes memorable through an intro, a
gimmick and a line. SpinSmith already has the gimmick (tells); it is missing the voice. Text and
synth cost nothing in assets and almost nothing in frame time.

**Test.** Headless: every rival has all fields; quotes fit the card width (measure with a
fixed per-character width budget, ≤ 34 chars); no brand words (extend the §13 vocabulary
check); motif pitches are distinct per rival. Emulator: `H` (Hookjaw match), screenshot the VS
card; `T` to trigger the tell and check the `[LABEL]` log shows its taunt.

### 4. The "next goal" line and a real session ending (S)

**What.** Home always shows **exactly one** nearest goal under the next match, chosen by a pure
function in this order: one win from a belt ("One more win: the Cinder Belt") → an order not
done → under 150 XP to an unlock ("90 XP to Lv 7: the Magnet strike") → the next feat close to
done. The report's call to action uses the same function. After a match, "pinch again" from the
report starts the **next bout directly** (one-more-match with no trip home); the dock/home stays
one pinch away via Menu.

Also a **"Today" line** on the board once 3+ matches are played this day: "Today: 4 matches,
Lv 5 → 6, 1 stamp, Cinder Belt". It gives a clean, satisfying stop point (the "bus stop" test)
without punishing leaving.

**Where.** `nextGoal(progress, circuit, order)` in `circuit.ts`; `drawRank()` `hub.ts:407` line 3;
`updateReadyPinch()` `match-system.ts:~1563` currently `return`s when `matchOver`: allow a pinch
on the report to call `startMatch()` with the next bout. `Progress` gains
`today: { date, matches, levelFrom, stamps }` (reset when the local date changes).

**Why.** The "one more match" hook is a goal that is *almost* done and visible at the moment of
decision; the end-of-session hook is a summary that makes stopping feel like completion.

**Test.** Headless: `nextGoal()` priority on crafted progress states; `today` resets across a
date change with a fake clock. Emulator: finish a match, pinch the report, check `[MATCH] rival`
is the next bout without a `[HUB]` log in between.

### 5. Records and a logbook (S)

**What.** Keep what a player is proud of: matches/wins, per-rival W-L, knockouts by kind,
**knockouts by your hands**, best rip %, fastest knockout, longest win run (shown, never
taken away: no "streak lost" message), white-hot rips. A **"NEW BEST!"** line on the report
when one is beaten. Head-to-head shows on the VS card and on each board medallion on point.

**Where.** `Progress` (`progress.ts:195`) gains `stats` and `record(log: MatchLog)`; saved in
`save()` `:414`, cleared in `reset()` `:390`. Board medallions (`board.ts`) show "W-L" under
the name of a met rival.

**Why.** Records are free content: they make a 6th match against Drifter interesting ("fastest
KO 4.2 s"). Rocket League and Eleven both lean on visible stats and ranks.

**Test.** Headless: feed `record()` fixed logs, check bests only go up, per-rival totals match,
reload equals.

### 6. Belts, titles and a home that shows the journey (S-M)

**What.** Ranks by level stay (Apprentice … Legend). Add **titles earned by deeds**: *Cinder
Champion*, *Iron Champion*, *Master of the Forge*, *Shapeshifter* (10 knockouts by your hands),
*Order Keeper* (10 stamps), *Untouched* (a 3-0 shutout of a champion). The current title is
engraved under your level on the level plate and on the VS card ("Lv 7 Journeyman · Cinder
Champion"). **Belts** appear at home as small procedural plaques (a brass plate with an
engraved circuit name and an emblem in the circuit's color) on the free stretch of the left rim
under the champions, so the hub fills up as you climb, visible in one look (a judge sees one
plaque after session one). Pinch the level plate's title to cycle owned titles (same pattern
as the comfort dial).

**Where.** `Progress.titles: string[]`, `Progress.title: string`; plaques in `hub.ts` near the
champion stands (`:~470`), one merged mesh + one canvas for all belts (draw calls: +1-2 on a
hub at ~210).

**Why.** Thrill of the Fight and Punch-Out give the title a physical form (belt, medal). A home
that changes as you progress is the cheapest "world".

**Test.** Headless: titles granted once by their conditions; `title` survives reload; the
hub draw-call count logged in dev (`[HUB]`) stays under 215.

### 7. The Forgemaster: a mentor voice and the final bout (S text + M boss)

**What.** One character frames everything: **the Forgemaster**, the old smith whose smithy the
table becomes. No cutscenes, only engraved lines on existing surfaces:
- the first-session notes (`guideNote()` `match-system.ts:~899`) are signed in his voice
  ("Your top waits in its dock. Put it in the arena, apprentice.");
- a circuit opening: "The Iron Circuit. They hit back. Bring something heavier.";
- **a tip after a loss**, specific to the rival and how you lost (Street Fighter II's continue
  tips): lost to a SLAG against Iron Keep → "Iron Keep holds the middle. Raise a ramp under it,
  not beside it."; lost on OUTLAST to Drifter → "Drifter outlasts attack tops. Try the Halo or a
  cup." About 2 lines × 8 rivals × 4 finishes, written as data;
- at the end of Crown: he steps in as the **final bout**: a gold-trimmed top with a fixed
  champion build, whose tells cycle charge → quake → pull (the tell code already takes a move
  per rival; the boss changes `move` between tells). Beating him gives *Master of the Forge*
  and the Title Defense ladder.

**Where.** `src/game/lines.ts` (pure data: tips keyed by rival and finish, circuit openers,
Forgemaster lines); the boss as an 8th `Rival` with `moves: RivalMove[]` (`parts.ts:316`), its
tell loop in the "Rivals' big moves" block (`match-system.ts:1943`).

**Why.** Mario Golf's club and Creed's trainer show a mentor turns a list of fights into a
journey with almost no content. A loss that ends with a useful tip is also the best fix for
"watching dice" (FULL-EVALUATION §2): it tells the player what their hands should do.

**Test.** Headless: every rival × finish has a tip; lines ≤ 2 × 40 chars; the boss's tells cycle
through all three kinds in a simulated fight (extend §22's rival-move test); `report:shaping`
row "human vs Forgemaster" lands at 45-55%.

### 8. Feats: twelve stamps that ask for a way of playing (M)

**What.** A small fixed set (Wii Sports Resort's five per sport is the model), shown as empty
stamp slots on the board's ledger row, each a *way* of winning, most about the hands:

| Feat | Condition (already measured) |
|---|---|
| First Blood | Win a round (in the first match for nearly everyone: the "one in the first ten minutes") |
| Ramp Artist | Knock out with your ramp (cause = ramp) |
| Catch and Release | Knock out with a sling |
| Hammer Time | Win a round right after your strike |
| White Heat | Three white-hot rips in one match |
| Untouched | Win a match 3-0 |
| Comeback | Win a match after being 0-2 down |
| Shatterer | Shatter a top |
| Giant Slayer | Beat a circuit champion |
| Home Turf | Win on an arena you built |
| Full Medallion | Earn all three marks on one rival |
| Cross-Trained | Win a match with each kind of top (attack, defense, stamina) |

Rewards: a title or emblem glow, never stats. A **FEAT!** reveal reuses the stamp reveal path.

**Where.** `src/game/feats.ts` pure: `FEATS` and `featsMet(event, progress)` fed from the same
`OrderEvent`-like data `trackComeBack()` builds (`match-system.ts:2421`); `Progress.feats`.
Board: the ledger row gets a feats strip, or the board's rival row and feats share a second page
on pinch (keep the board one canvas).

**Why.** The existing marks and orders already reward "ways of winning"; feats make that set
finite and visible, so a judge sees empty slots on the first visit (COME-BACK §2: the reason to
come back has to be visible in session one).

**Test.** Headless: each feat fires on a crafted event and not on a near miss; feats are given
once; at least two are reachable in a scripted first session (simulate 3 matches with the
"human ramp" policy and count). Emulator: `K` gives Shatterer; the reveal order stays one card
per result after the first session.

### 9. Level-up and unlock ceremonies that explain themselves (S)

**What.** Today a level-up is a label "LEVEL 5! / Journeyman" plus sparks, and an unlock is
"NEW! / Spindle core" over a spinning model.
- Add the part's **blurb** to its card (`SEAL_BLURBS` exists; give rings/cores/tips a one-line
  "what it does": the `blurb` field exists on `Ring`), and a call to try it: "Try it: pinch the
  anvil".
- A **rank-up** (Lv 4, 8, 13, 18) gets its own bigger moment: the level plate's rank text is
  re-engraved with a hammer sound (a `playStamp()` variant) and the dock's emblem ring changes.
- New items carry a small **NEW pip** in the forge drawer and workshop until first used
  (`Progress.seen: string[]`).

**Where.** `revealText()` / `unlockName()` `match-system.ts:2562`; `drawRank()` `hub.ts:407`;
forge drawers in `forge.ts`.

**Why.** An unlock that says what it is for turns a reward into an option the player wants to
try, which is the whole "levels open options" promise.

**Test.** Headless: every unlock key has a non-empty blurb (`unlockHint` style loop over
`LEVEL_UNLOCKS`, `ARENA_UNLOCKS`, `SEAL_UNLOCKS`, signatures, quests). Emulator: `?demo` then a
won match, screenshot the card.

### 10. Title Defense: rivals come back with one twist each (M, post-freeze candidate)

**What.** After the Forgemaster, each rival returns once with a twist from existing knobs, as
Punch-Out's Title Defense does: Drifter opens with a cup under itself; Iron Keep's quake comes
twice per round; Rim Raider fights on a no-wall arena; Leech spins your way (same spin);
Hookjaw gets a rival ramp; Sawtooth chips 1.5× (cosmetic-free, rival-side only); Bastion on a
high-wall arena. One defense star per rival.

**Where.** `circuit.ts` bout data gains `twist`; applied in `startMatch()` and the rival AI.

**Why.** Long-tail content for "come back" without new assets; strictly opponent-side, so it
does not touch player power.

**Test.** `report:shaping` rows per twist: the human policy stays within 40-60%.

### 11. Orders that live inside the journey (S)

Today's order picks any rival you can meet (`dailyOrder()` `orders.ts:76`). Bias it to the
**current circuit's rivals** and show the order's goal on the VS card when an order match is on
("ORDER: ramp Iron Keep out"). A **weekly commission** (3 orders in a week, no streak) gives a
paint. Test: §12's determinism tests with the circuit-biased context.

### 12. Smithy dressing at home (S, optional)

Procedural only: a soot-dark back plate behind the board with hanging tongs silhouettes, the
belts (item 6) on hooks, a faint ember glow under the board that brightens with your rank. One
canvas texture and one mesh. Adds "place" without assets. Test: hub draw calls.

---

## 4. Suggested order before the Nov 6 freeze

| Day | Work | Items |
|---|---|---|
| 1 | `circuit.ts` + Progress state + skill from rung + tests + `shaping-report --skill` | 1 |
| 2 | Rival data (epithets, quotes, motifs, trims) + VS card | 3 |
| 3-4 | `MatchLog`, `report.ts`, match report plate, rematch-from-report, next-goal line | 2, 4 |
| 5 | Records, titles, belt plaques | 5, 6 |
| 6 | Forgemaster lines + loss tips; boss bout | 7 |
| 7 | Feats; unlock blurbs and rank-up | 8, 9 |

Items 10-12 after the freeze or if time remains. Total ≈ 7 days; items 1-4 alone (≈ 4 days)
change the first ten minutes the most: a judge meets Drifter "the Long Spin" on a VS card,
wins two bouts, beats Iron Keep for the Cinder Belt, reads a match report with their own ramp
knockouts counted, and goes home to a plaque and "Next: the Iron Circuit".

**Teaching load.** None of this adds a gesture. The VS card and report replace text that exists;
the circuit replaces a random choice with a fixed one. Keep the first-session rule of one NEW
card per result; the belt card counts as that card.

**Not doing.** Currencies, loot, energy timers, streak loss, online ladders, stat-boosting
rewards, any asset files.

---

## Sources

- Punch-Out!! Wiki, Contender Mode: https://punchout.fandom.com/wiki/Contender_Mode
- Punch-Out!! (2009), Wikipedia: https://en.wikipedia.org/wiki/Punch-Out!!_(2009_video_game)
- TV Tropes, Punch-Out (opponent intros): https://www.tvtropes.org/pmwiki/pmwiki.php/Fridge/PunchOut
- Nintendo Life, Punch-Out!! review: https://www.nintendolife.com/reviews/wii/punch-out
- Street Fighter II, Wikipedia: https://en.wikipedia.org/wiki/Street_Fighter_II
- Tropedia, Victory Quote: https://tropedia.fandom.com/wiki/Victory_Quote
- TechRaptor, Creed: Rise to Glory review: https://techraptor.net/content/creed-rise-to-glory-review-the-glory-of-michael-b-jordans-abs
- PlayStation Country, Creed PSVR review: https://www.playstationcountry.com/creed-rise-glory-psvr-review/
- The Thrill of the Fight 2, Steam: https://store.steampowered.com/app/4884540
- Gaming Trend, Thrill of the Fight 2 full release: https://gamingtrend.com/news/thrill-of-the-fight-2-punches-into-full-release/
- Beyblade Wiki, Beyblade: Let it Rip!: https://beyblade.fandom.com/wiki/Beyblade:_Let_it_Rip!
- Beyblade X: Xone, Wikipedia: https://en.wikipedia.org/wiki/Beyblade_X:_Xone
- Mario Golf: Super Rush, Mario Wiki: https://www.mariowiki.com/Mario_Golf:_Super_Rush
- Mario Golf: Super Rush, Wikipedia: https://en.wikipedia.org/wiki/Mario_Golf:_Super_Rush
- Rocket League Season mode, TrueAchievements walkthrough: https://i1.trueachievements.com/game/Rocket-League/walkthrough/2
- TechAeris, Rocket League review: https://techaeris.com/2015/07/17/rocket-league-review-rocket-propelled-multiplayer-madhouse/
- Wii Sports Resort Table Tennis, Wii Sports Wiki: https://wiisports.fandom.com/wiki/Table_Tennis_(Wii_Sports_Resort)
- Eleven-VR Wiki, Single Player / AI: https://eleven-vr.fandom.com/wiki/Single_Player_/_AI
- Game Developer, The cake is not a lie (achievement design): https://gamedeveloper.com/design/the-cake-is-not-a-lie-how-to-design-effective-achievements
- DiGRA, Framework for designing and evaluating game achievements: https://dl.digra.org/index.php/dl/article/view/545
- Game Developer, An alternative to achievements: https://www.gamedeveloper.com/design/an-alternative-to-achievements
- Tiny Golf, Devpost: https://devpost.com/software/tiny-golf
- Competition criteria: `BRIEF.md`; current progression: `docs/COME-BACK.md`, `docs/reviews/FULL-EVALUATION.md`
