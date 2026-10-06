# SpinSmith gameplay direction

Status and product brief for the competition build, written October 6, 2026.

This document is the gameplay source of truth for the next iteration. It is intentionally
narrower than the full idea backlog. The project already has enough systems; the next job is to
make the central experience readable, tactile and replayable.

---

## 1. Product in one sentence

> **Forge a spinning top with your hands, rip it into an arena on your real table, and reshape
> the battlefield while it fights.**

SpinSmith is not a realistic spinning-top simulator and it is not primarily an arena editor.
It is a seated, hands-first mixed-reality tabletop battler built around three player skills:

1. **Build:** choose parts whose behavior can be understood from their shape.
2. **Launch:** physically rip the cord with useful control over power and direction.
3. **Intervene:** reshape the arena at the right moment to alter the fight.

The desired player feeling is:

> **I built this top, I launched it, and my decision won that fight.**

Everything in the competition build must strengthen that sentence.

---

## 2. What kind of game this is

SpinSmith is a **tabletop action-strategy and collection game**.

- The **action** is the launch, collisions and timed arena manipulation.
- The **strategy** is the build, arena choice and adaptation to a rival.
- The **collection** is the set of fair side-grade parts, paints and arenas opened by Smith
  progression.
- The **mixed-reality toy fantasy** is what joins these systems: the player handles the top and
  its parts at real scale in their own room.

The current career-style Smith progression is the submission progression. Do **not** add a
second roguelike-run economy before the competition. A run system, daily seed and online
leaderboard can be reconsidered after the core game has been playtested on Quest.

---

## 3. The central loop

```text
HOME / SMITHY
  Pick a top and arena
        ↓
MATCH — first to 4 points
  Build advantage → physical launch → readable fight → timed arena move → finish
        ↓
REWARD
  XP, rank progress and an occasional new option
        ↓
FORGE WHEN DESIRED
  Replace one or more parts, immediately understand the tradeoff
        ↓
REMATCH
  Test the new idea against a stronger or different rival
```

The short psychological loop is:

```text
Observe a weakness → form a theory → change one thing → test it → see the result
```

This loop is more important than the number of parts or arenas. A player should be able to say
what they changed and what they expect it to do before starting the next match.

---

## 4. The three skills and their intended influence

No single layer should make the other two irrelevant. As a design target, match outcomes should
feel roughly influenced by:

| Layer | Target influence | What mastery looks like |
|---|---:|---|
| Build | 35% | Choosing a top that suits the arena and rival |
| Launch | 25% | Useful power and angle rather than simply maximum force |
| Fight decisions | 40% | Reading movement and reshaping the floor at the decisive moment |

These are perception targets, not simulation constants.

Failure modes:

- If the build decides everything, the match becomes an automatic simulation.
- If the launch decides everything, rounds end before the unique arena mechanic matters.
- If arena manipulation is unlimited and dominant, build and launch choices become cosmetic.
- If randomness or invisible modifiers dominate, the player cannot learn from a loss.

After a loss, the player should usually identify one actionable cause:

- wrong part for this arena;
- poor launch power or angle;
- mistimed bump or dent;
- failure to read the rival's movement pattern.

---

## 5. Combat pacing

### Current measured baseline

As of October 6:

- built-in arenas produce median rounds of roughly **9–13 seconds**;
- some quick finishes occur before the player has time to read the fight;
- the first-to-4 match structure is working;
- the simulation and type-loop checks pass.

### Target

- Typical round: **15–25 seconds**.
- Rare explosive round: **5–10 seconds**, clearly caused by a perfect launch or major mistake.
- Long stamina round: no more than **35–45 seconds**.
- Complete first-to-4 match: normally **2–4 minutes**, including short resets.

The target is not realism. The target is enough time for this sequence:

1. recognize both movement patterns;
2. see an opportunity forming;
3. make one intentional arena move;
4. understand how that move affected the finish.

Do not slow only the animation while leaving decisions unchanged. Tune speed, launch lethality,
collision damage and finish thresholds together until the player has meaningful response time.

### Fight rhythm

A good round has three readable beats:

1. **Entry:** the launch creates an initial trajectory and advantage.
2. **Contest:** tops clash, separate and reveal their behaviors.
3. **Finish:** a build property, arena feature or player-created slope produces a decisive event.

Not every round needs all three beats, but the typical round should.

---

## 6. Arena manipulation

Arena manipulation is the most original mechanic and must remain visible in the final game.

Current verbs:

- pinch and lift to create a temporary bump or ramp;
- press to create a temporary dent;
- far interaction through the hand ray when the physical point is outside comfortable reach.

Rules:

- A deformation affects **both** tops.
- The effect must be strong enough to change a route, but not guarantee a knockout.
- The shape relaxes within roughly 2–3 seconds.
- The created shape and the top's response must be visually connected.
- The player must be able to tell whether the move helped, failed or backfired.

Do not add table-tap waves, multiple active powers or a complex energy economy until physical
playtesting demonstrates a specific need.

If manipulation becomes spammy, apply the smallest constraint that fixes it. Preferred order:

1. only one held deformation per hand;
2. a short recovery before another full-strength deformation;
3. only if those fail, a collision-earned Forge Energy meter.

The resource system is not a feature goal by itself. It exists only if unrestricted manipulation
damages decision quality.

---

## 7. Launch

The rip-cord is the first physical payoff and must feel good before more systems are added.

It communicates:

- distance pulled;
- speed at release;
- aim direction;
- perfect launch threshold;
- failed weak pull without punishing the player.

Design requirements:

- Maximum power must not always be the best choice.
- Sideways direction must produce an understandable launch angle.
- The cord, sound, top spin-up and release must feel like one event.
- A weak or stopped pull should reset clearly instead of producing a confusing bad launch.
- The gesture must work seated and inside the competition's small interaction radius.

The launch is successful when a new player wants to repeat it even without the progression
system.

---

## 8. Top building and the forge

The submission build uses four readable categories:

| Slot | Player question |
|---|---|
| Ring | How does it hit and carry its mass? |
| Core | How tall and burst-resistant is it? |
| Tip | How does it move and preserve spin? |
| Crest | What color and spin direction identifies it? |

The forge is not a spreadsheet. Physical form, motion and sound should explain the part before
the stat card does.

### First-time simplicity

New players begin with three presets:

- **Striker:** aggressive movement and strong hits;
- **Anvil:** stable, heavy and resistant;
- **Needle:** calm movement and long spin.

The first forge visit changes **one part**. Do not ask a new player to evaluate every legal
combination. Unlocking choices gradually is useful because it reduces cognitive load, not because
the player needs a grind.

### Build rules

- Every unlocked part is a side-grade, never a permanent stat upgrade.
- A part must have a visible silhouette or motion difference.
- A build's important tradeoff should fit in one sentence.
- Cosmetics never add power.
- The weight limit may reject a build, but the rejection must explain the smallest useful fix.
- Replacing a part must be faster than starting another match feels burdensome.

### Current balance baseline

- 136 legal builds are implemented.
- Global part averages are mostly within a workable range.
- Hook ring and Ball tip currently appear in no top-20 build.
- Needle and Anvil become extreme on particular arenas.

Do not add more parts. Make the existing parts distinct and viable first.

Suggested balance gates:

- no general-purpose part below roughly 40% or above 60% average win rate;
- no build above roughly 65% across representative arenas;
- arena-specific counters may be stronger, but the arena must communicate the reason;
- a weak part is acceptable only if it owns a clear situational purpose.

---

## 9. Rivals

A rival should be something the player can learn, not a fresh random stat bundle every round.

For a first-to-4 match:

- keep the rival's build and spin direction stable for the match;
- let difficulty change launch quality and decision timing, not hidden stat bonuses;
- show enough of the rival top that its behavior can be predicted;
- introduce harder combinations as Smith level increases.

Named characters, dialogue and complex AI are not required. Simple build archetypes are enough:

- aggressive rim attacker;
- heavy center holder;
- stamina drifter;
- opposite-spin equalizer;
- upper attacker that exploits low walls.

The player should adapt through build, launch and arena use—not by memorizing invisible AI rules.

---

## 10. Arenas

The six built-in arenas provide contexts for different builds. Each arena should be explainable
with one primary rule and, at most, one secondary rule.

Examples:

- rail arena: aggressive geared tips gain a dash opportunity;
- low-wall arena: upper attacks and ramps threaten over finishes;
- ice arena: low friction changes movement and stopping distance;
- sumo arena: positioning and knockback dominate.

Current extreme results—such as Needle near 80% in Zero-G or near 20% in Sumo—may be acceptable
only when the matchup is clearly telegraphed and the player can respond before committing.

The arena workshop is an optional creative mode and retention feature. It is **not** the first
thing a new player should see and is not the core pitch of the competition video. Keep it behind
the home experience after the player understands normal fights.

Do not add more built-in arenas before existing ones are readable and balanced.

---

## 11. Progression and reason to return

The current Smith progression is the single submission progression:

- XP from playing, wins and expressive finishes;
- ranks from Apprentice to Legend;
- parts, paints and arenas opened over time;
- deed unlocks for memorable actions such as the first burst or pocket win;
- stronger rival selection at higher levels;
- browser persistence.

Progression principles:

- unlock **options**, never permanent combat power;
- reward varied play, not repetition of the safest action;
- show the next nearby unlock so progress has direction;
- deliver the first meaningful unlock within the first session;
- do not add part levels, duplicates, gacha or currencies.

Personal bests, daily runs, collection shelves with multiple saved builds and online leaderboards
are post-submission ideas unless the core game is already tested and polished.

---

## 12. First session and onboarding

The first session must not present the full smithy as a menu of equal choices.

### Target first two minutes

1. The arena appears on the real table with the player's preset top beside it.
2. The top or a clear physical cue invites the player to start.
3. The launcher appears and teaches one rip through motion, not a paragraph.
4. The first clash demonstrates the relationship between sound, spin and wobble.
5. One arena location becomes an obvious opportunity for a bump.
6. The player's move produces a dramatic, understandable finish.
7. The player earns one part and is taken to a simplified forge interaction.
8. The player replaces that part, sees the tradeoff and can immediately rematch.

The arena workshop, full arena selection, advanced stats and all locked content stay out of this
path.

### Teaching hierarchy

Teach only one new question at a time:

1. How do I launch?
2. How do I influence the fight?
3. Why did that top behave differently?
4. How do I change one part?
5. Which arena or rival should I prepare for?

---

## 13. Readability and feedback

Important information should be understandable without reading during the round.

| Information | Primary cue |
|---|---|
| Ownership | molten orange player, cyan rival |
| Remaining spin | movement, pitch and the compact match bar |
| Approaching topple | wobble and unstable sound |
| Hard hit | impact sound, large sparks, brief simulation-only hit stop |
| Burst risk | visible part separation/heat and accumulated damage cue |
| Rail dash | lit rail followed by a clear acceleration streak |
| Arena deformation | visible shape plus a short response trail under the affected top |
| Finish cause | pocket, over, burst or spin shown immediately and briefly |

The arena and essential match information must fit inside a comfortable narrow field of view.
The wall HUD must support the fight, not become visually more important than the arena.

The visual-polish implementation is specified separately in `docs/VISUAL-POLISH.md`.

---

## 14. Comfort and physical constraints

- Fully playable seated and without controllers.
- Essential actions stay within a roughly 2 ft interaction radius.
- Far arena points remain usable through the hand ray.
- The arena must not be so large that the player constantly moves their head between the score
  and the fight.
- No required two-handed pose where one hand occludes the other.
- A lost hand must not cause an accidental launch or arena move.
- Pauses or hit stops freeze simulation only; head tracking and rendering never freeze.
- Real Quest testing decides interaction sizes and reach—not the desktop emulator.

The current approximately 60 cm visual arena is impressive but must be tested from the seated
default pose. If the near edge is cropped or the far edge is uncomfortable, reduce scale or move
the arena rather than adding more camera-dependent UI.

---

## 15. Scope freeze for the competition build

### Keep and polish

- forge with Ring/Core/Tip/Crest;
- physical rip-cord launch;
- first-to-4 matches;
- bump and dent manipulation;
- six existing arenas;
- current parts and fair unlock progression;
- arena workshop as an optional mode;
- synthesized audio and decisive combat feedback.

### Do not add before the core passes playtests

- more parts or arenas;
- a second progression/run economy;
- multiplayer;
- online leaderboard;
- AI agent or conversational rival;
- table-tap wave;
- second active power;
- part levels, duplicates, rarity or gacha;
- complex narrative or named-character production;
- additional gestures.

When a new idea appears, first ask which current weakness it fixes. If the answer is only “more
content,” it is out of scope.

---

## 16. Priority order

### P0 — prove the game

1. Test rip-cord feel on a physical Quest.
2. Give the player enough time to read and influence a round.
3. Confirm that a bump or dent can visibly change an outcome without guaranteeing it.
4. Confirm that players understand why they won or lost.

### P1 — make the first session work

1. Guided first launch.
2. Guided first arena intervention.
3. First reward and one-part forge interaction.
4. Immediate rematch.

### P2 — balance and presentation

1. Fix dead parts and extreme arena matchups.
2. Keep arena, tops and match information in one comfortable view.
3. Apply the unified forged-tech visual direction.
4. Improve impact feedback and audio hierarchy.

### P3 — submission reliability

1. Sustained Quest frame-time measurement.
2. Test several rooms and table heights.
3. Clean pause/resume and hand-loss behavior.
4. Host the final build and rehearse the judge path.
5. Capture an honest sub-three-minute gameplay video.

---

## 17. Playtest success criteria

The next playtests should answer these questions with observed behavior rather than opinion.

| Criterion | Target |
|---|---:|
| Launch without verbal help | at least 4 of 5 new players within 60 seconds |
| Arena engagement | most players intentionally attempt a move in each normal round |
| Outcome comprehension | at least 4 of 5 can explain the main reason for a win/loss |
| Voluntary replay | at least 3 of 5 start another match without being prompted |
| Round duration | median 15–25 seconds |
| Gesture reliability | fewer than 1 meaningful misread per round |
| Comfort | all essential actions work seated without leaning out of reach |
| Performance | sustained 60 fps minimum on target Quest hardware |

The core passes only when the physical launch is satisfying, arena manipulation has visible
agency and the player voluntarily wants another match.

---

## 18. Trailer and competition pitch

The competition video should communicate the game in this order:

1. a top assembled by hand in the real room;
2. a physical rip-cord launch onto the table;
3. a readable clash;
4. the player raises the arena and causes a dramatic finish;
5. a new part is earned, fitted and immediately tested;
6. a quick montage of different builds and arenas;
7. the optional workshop only after the core loop is understood.

The trailer's hero moment is not the number of combinations. It is the instant a player-created
ramp sends the rival through a rail and into a pocket.

---

## 19. Guidance for the next design session

When proposing changes, preserve these decisions:

- the career-style Smith progression is enough for submission;
- the forge, launch and live arena intervention are the three pillars;
- the workshop is optional;
- no new content categories until physical playtests;
- readable causality matters more than realistic physics;
- the game must remain seated, hands-first and comfortable in a narrow field of view.

The most valuable design work now is:

1. combat pacing and decisive moments;
2. the first two-minute onboarding path;
3. how one part change creates an understandable rematch theory;
4. how rivals and arenas communicate counters before a match;
5. how to remove or defer anything that distracts from those goals.

