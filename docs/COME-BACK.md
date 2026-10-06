# A reason to come back: research and plan

Research notes (Oct 7, 2026) on a review that found SpinSmith's progression gives a reason for one
more match, a weaker reason for one more session, and almost none for coming back tomorrow. The
competition has a $25,000 special award for **Best Reason to Come Back**. Section 1 checks the
review against the code, section 2 summarizes outside research, sections 3-5 are the proposal.

---

## 1. What exists (checked in `src/game/progress.ts`, `parts.ts`, `match-system.ts`)

| Claim | Checked |
|---|---|
| Levels 14-20 are empty | **True.** `LEVEL_UNLOCKS` ends at 13 (Sumo Square). 14-17 give nothing, 18 only the rank name *Legend*, 19-20 nothing |
| The empty stretch is long | **True.** Total XP: Lv 13 at 10,320, Lv 20 at 24,320. At roughly 250 XP a match (a 4-0 first win gave 235-240, a loss gives about 100), Lv 13 takes about 40 matches and Lv 14-20 another 55 or so: one to two hours of play with nothing new |
| Only three deeds | **True.** `QUEST_UNLOCKS`: finish the first match (Rush), a burst win (9-60), a pocket or over win (Hook) |
| New rivals are not celebrated | **True.** Leech (Lv 4), Hookjaw (6), Sawtooth (9) and Bastion (12) join `pickRival()`'s pool silently; the unlock reveal only shows unlock keys, and rivals are not keys |
| Only the current build is kept | **True.** `spinsmith.top.v1` holds one build; saved arenas (`spinsmith.arenas.v1`) are the only lasting creations |
| No records, no daily goal | **True.** Nothing outlives a match except XP and unlocks |

What works and should stay: XP for good play rather than only for winning, the first match's Rush
tip fitted by hand, unlocks that add options rather than power, "Next: X at Lv Y", the level-up
and unlock reveals.

---

## 2. Research

**The award and the competition.** The rules name the award (one winner, $25,000) but give no
criteria beyond the name ([Devpost](https://start-developer-competition-26.devpost.com/)). The
competition's design guidance matters more: seated, fast cold starts, clean pause and resume, and
"something satisfying in 10 minutes or less", the *one bus stop test*: "can someone have a
complete moment in a short ride?" ([Devpost](https://start-developer-competition-26.devpost.com/),
[Meta blog](https://developers.meta.com/blog/meta-connect-2026-vr-start-developer-competition/)).
A come-back system must therefore fit a five-to-ten-minute visit, not demand an evening.

**Judges play once.** They see the first session, maybe a second. A reason to come back that only
shows tomorrow does not exist for them. It has to be **visible in the first session**: today's
order on the home screen, a board of rivals with empty medallions, a ledger with empty stamp
slots. The video must show it too.

**Daily, seeded, one per day.** Wordle's creator credits limiting play to one puzzle a day; the
scarcity made it a ritual of a couple of minutes ([MoEngage](https://www.moengage.com/blog/wordle-viral-growth-story/)).
Slay the Spire's Daily Climb gives everyone the same seeded run with modifiers for the day
([Into the Spine](https://intothespine.com/2018/03/05/slay-the-spire-daily-climb/)). A seed derived
from the date needs no server and stays identical for every player
([Solo Dev Stack](https://solodevstack.com/blog/daily-challenges-shareable-seeds-no-server),
[DEV](https://dev.to/solsticioapp/a-daily-logic-puzzle-with-no-backend-at-all-1ef6)). SpinSmith's
simulation is already deterministic, so a daily order can be generated and even checked for
feasibility offline.

**Meta's own guidance for Quest.** "Daily and weekly quests become retention rituals", the minimum
engagement on a given day; players need "something to do, something to work toward, and
something new to look forward to"; long-term goals prevent the "I've completed everything" feeling
([Meta, engagement and retention guide](https://developers.meta.com/horizon/blog/build-faster-earn-more-developers-guide-to-engagement-and-retention-meta-quest/)).
Beat Saber, Pistol Whip and Synth Riders ran weekly featured challenges
([Meta](https://www.meta.com/blog/oculus-picks-welcome-to-oculus-challenges/),
[Synth Riders](https://synthridersvr.com/challenges/)).

**Streaks without punishment.** Streaks work through loss aversion (losses feel about twice as
strong as gains) and can turn into anxiety; ethical designs soften the reset
([Smashing Magazine](https://smashingmagazine.com/2026/02/designing-streak-system-ux-psychology/)).
Duolingo's weekend protection made users 4% more likely to return a week later and 5% less likely
to lose their streak ([UX Collective](https://uxdesign.cc/3-reframing-streaks-on-duolingo-5-ideas-for-a-more-healthy-and-flexible-approach-to-language-8fd89545771e)).
The review's instinct is right: count what was done, never take it away.

**Challenges that change how you play.** Into the Breach gives each squad three achievements that
are harder puzzles forcing a different style, and completing them buys new squads
([Fandom review](https://www.fandom.com/articles/into-the-breach-review)). Hades' bounties and
Heat let players choose harder runs for rewards
([RPG Site](https://www.rpgsite.net/feature/10287-hades-pact-of-punishment-heat-modifiers-and-how-to-maximize-your-rewards)).
Badges support the feeling of competence when they mark real skill
([Frontiers in Psychology](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2023.1278738/pdf)).
For SpinSmith that means orders should ask for **a way of winning**, above all with the arena
shaping that is the game's own verb, not for more of the same.

**The way back in.** A WebXR game is a link; to come back the player must find it again. Meta
packages WebXR apps as PWAs for the Horizon Store, where they sit in the library like any app
([Meta, PWA overview](https://developers.meta.com/horizon/documentation/web/pwa-overview/),
[UploadVR](https://uploadvr.com/elysian-is-the-first-webxr-game-on-quests-horizon-store)). Not for
now (publishing is the developer's call), but the hosted build should at least have a web app
manifest so it can be added to the home screen.

---

## 3. Proposal

Three pieces, all from content that exists; no new parts, arenas or server.

### 3.1 Smith Orders: one order a day

- **What:** today's rival, today's arena and one goal, generated from the local date
  (`YYYY-MM-DD` hashed into a seed) and the player's unlocks, so it is always playable.
- **Goals ask for a way of winning,** measured from what the match already knows (finish type,
  `lastShape` cause, perfect rip, the player's build role, arena, round count):
  - *Ramp Iron Keep into a pocket* (a finish within 1.5 s of your ramp, the existing cause line)
  - *Burst Sawtooth*
  - *Win in Ember Ring with a stamina top*
  - *Win without a perfect rip*
  - *Win a match on an arena you built*
  - *Win with a well under your top* (well cause on a spin finish)
- **Where:** a forged order slip on the home screen, beside the dock: rival, arena and goal
  engraved. Pinching it sets up the match (rival and arena fixed). It is there from the first
  visit after the tutorial, so a judge sees it.
- **Reward:** a **Smith stamp**, struck into the ledger with an anvil strike, plus XP. Every fifth
  stamp gives a cosmetic (section 3.4). Missing days costs nothing: the ledger counts stamps, there
  is no streak to lose. An order not finished today is simply replaced tomorrow.
- **Check:** the generator is deterministic and tested in `check:sim`: the same date gives the
  same order, every generated goal is reachable with the player's unlocks, and the simulation
  can finish it (a policy run like `report:shaping`'s).

### 3.2 The rival board: medallions with three marks

- The seven rivals as medallions on the arena shelf's free row. Unmet rivals are dark shapes with
  "Lv N"; a new one is announced as **NEW RIVAL** with the unlock reveal at Lv 4, 6, 9 and 12.
- Each medallion takes up to three marks: **beaten**, **beaten by a knockout** (pocket, over or
  burst), **beaten by your shape** (the cause line). Twenty-one marks in all: a visible, finite
  collection that rewards the shaping mechanic.
- No extra screen: pointing at a medallion shows its marks and the rival's style on the far plate.

### 3.3 Champions: three tops that keep their record

- Saving in the forge keeps the build as now; a **champion** is a build that has won a match. The
  last three champions stand on the dock row with their name and record (wins, best finish), and
  pinching one makes it your top.
- Kept small on purpose: three, not a gallery (draw calls on the hub are about 186).

### 3.4 Levels 14-20 get real rewards

Cosmetic, never power, from what exists:

| Level | Reward |
|---|---|
| 14 | Paint 4 (`TOP_COLORS` holds six; only four are used) |
| 15 | A brass rim trim for your arena |
| 16 | Paint 5 |
| 17 | Engraved name on your top's emblem |
| 18 | *Legend* rank and a gold emblem |
| 19 | Forge glow color |
| 20 | A gilded ledger cover; every rival medallion rim turns gold |

The alternative, capping at 13, wastes the existing XP curve and leaves fast players at the end
in about 40 matches.

---

## 4. Plan

| Step | What | Size | Check |
|---|---|---|---|
| 1 | NEW RIVAL reveals at Lv 4/6/9/12 (rivals become unlock keys) | 0.5 day | Reveal order test (the `[LABEL]` log), no overwritten texts |
| 2 | Order generator (date seed, goal templates, feasibility) + its test | 1 day | `check:sim`: determinism, every goal reachable, simulated completion |
| 3 | Goal tracking from match results; stamps and the ledger in `Progress` (saved) | 1 day | Unit tests with a fake storage, as for the guide |
| 4 | The order slip on the home screen and the ledger plate; stamp strike | 1 day | Emulator: pinch the slip → the match is set; finish → stamp |
| 5 | Rival board medallions with three marks | 1 day | Marks recorded per finish; hub draw calls |
| 6 | Level 14-20 cosmetics | 1 day | Each reward visible; saves load |
| 7 | Champions (three) | 1 day | A won build becomes a champion; pinch to equip |
| 8 | Web app manifest for the hosted build; video storyboard shows the order and the board | 0.5 day | Add-to-home works in Quest Browser |

About 7 days. Steps 1-4 alone already give judges a visible daily goal in the first session; 5-7
deepen it.

**Not doing:** server leaderboards or shared daily scores (the game stays offline, with no
backend), push notifications, punishing streaks, energy timers, new parts or arenas.

---

## 5. Risks

- **Orders that cannot be done** frustrate most; every template is checked against the player's
  unlocks and the simulation before it is offered, and a fallback order always exists.
- **The tutorial and the first order** must not overlap: the order slip appears only once the guide
  is `done`, already in the first session after the rematch.
- **Local date:** a player changing the clock can farm orders; harmless offline, and not worth
  guarding against.
- **Hub clutter:** the review just asked for fewer words at home; the slip and ledger are engraved
  metal like the level plate, small, and show their text only when pointed at after the first time.

---

## 6. Status (Oct 7, 2026): steps 1-8 done

| Step | Result |
|---|---|
| 1 New rivals | `RIVAL_UNLOCKS` (Lv 4, 6, 9, 12) are unlock keys: the rival spins over the arena as **NEW RIVAL!** with its style, in order with the other rewards |
| 2 Orders | `orders.ts`: a seed from the local date picks a rival the player can meet, an unlocked arena (one where knockouts happen for a knockout order, your own for an own-arena order) and one of seven goals. `check:sim` section 12: the same date gives the same order over 120 days, every order is playable, knockouts and bursts happen in simulated rounds on the arenas used |
| 3 Tracking | The order, the marks and the champions are updated from each round (`trackComeBack`); the well goal counts a well set during the round, since a spin finish comes too late for the cause window. Stamps, marks, champions and today's order are saved with the progress |
| 4 Board | `board.ts`: one engraved plate over the far rim's left with today's order, the rivals and the ledger; pinch it to play the order. Doing it shows **ORDER DONE!** and strikes a stamp |
| 5 Rival marks | Three notches per medallion (beaten, knocked out, by your shape); a full medallion gets a gold rim |
| 6 Levels 14-20 | Paints 4 and 5 (the forge's Style drawer now has all six) and emblem glows at 15, 17, 18 (gold, with *Legend*) and 19, and the gilded ledger at 20. Emblem glows replaced the plan's rim trim and engraving: one mechanism, chosen in the forge with a glow token that steps through the glows you own, and shown on every top |
| 7 Champions | The last three tops that won a match stand on small stands along the left rim; pointing shows their wins, pinching makes one your top |
| 8 Way back in | `public/manifest.webmanifest` and icons; the storyboard shows the board and a stamp |

Found while testing: a level-up during the day changed the order (new rivals changed the seeded
pick); the order is now kept for its date once made, and a test covers it.

Played through in the emulator: pinch the board → the match against Iron Keep in Ember Ring →
a perfect rip and a win → **ORDER DONE!**, stamp 1, LEVEL 4, the 3-50 core, **NEW RIVAL! Leech**,
in that order, none overwritten. Draw calls at home: 210 with a champion (was 186).
