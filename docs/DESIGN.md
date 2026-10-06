# SpinSmith: forge your top with your hands, reshape the arena with your hands

Meta VR Start Developer Competition 2026 · **Gaming – New Experience** · deadline Nov 18, 2026, 12:00 PT (target Nov 17)

> The original design. Arena shaping has since become two verbs, the **ramp** (replacing the
> bump and the wave) and the **well** (replacing the dent), with charges earned by clashing:
> see [ARENA-SHAPING.md](ARENA-SHAPING.md).
> Names and scoring have changed too: the parts, finishes and points are now SpinSmith's own
> (cores Stub/Bolt/Clamp/Stilt, tips Chisel/Spur/Awl/Dome/Pin/Bead, SLAG/THROWN/SHATTER/OUTLAST,
> heat, first to 3); see `docs/ACTION-PLAN.md` D2-D3.

---

## 1. One sentence

> **Forge your spinning top with your hands, rip it into an arena on your real table, and reshape the battlefield mid-fight.**

## 2. Why this idea

The formula: **a physical action that flat screens crippled + a proven, addictive game loop** (Tiny Golf paired mini golf with the feel of actually striking the ball).

- **Physical action:** Winding and launching a top, shaping clay, snapping on parts. Familiar childhood hand motions that phones reduced to button taps.
- **Loop:** Short matches + a roguelike run (Balatro / Slay the Spire structure). When you lose you understand why, and you start again thinking "this time I'll make it balanced."
- **Table:** The arena sits on your table, played seated, in a small central area.

### Sanity tests
| Test | Result |
|---|---|
| Does the game survive replacing hands with a mouse? | No. Shaping becomes sliders, launching becomes a click; the feel is gone |
| Does the core work with MR turned off? | Partly. Tapping the real table and an arena anchored on your table are MR-specific |
| Is it only fun for the first 5 minutes? | The roguelike loop and three separate skills (design, launch, arena control) should carry replay. **Must be validated by the prototype** |

## 3. Game loop

```
Run (6-8 min) = 5 matches
  Match (~30 s):
    1. Launch the top (rip cord: speed + angle)
    2. Read how it behaves
    3. Steer the fight by reshaping the arena (bump, dent, wave)
    4. Collisions fill Forge Energy -> arena moves spend it
    5. Knock the opponent out or outlast its spin
  Between matches: pick 1 of 3 parts and click it onto your top
If you lose: run ends -> collection / personal best -> new run
```

### Game test
| Question | Answer |
|---|---|
| **Goal** | Beat 5 opponents in a row, each harder than the last |
| **Core verb** | Launch + reshape the arena during the fight |
| **Skill that grows** | Top design, launch angle and power, timing of arena moves |
| **Failure** | Your top topples, runs out of spin, or leaves the arena |
| **Session end** | The run ends (win or lose). Score and new part unlocks |

## 4. Hand gestures (at most 4, clearly distinct)

Rule: **no more than 3-4 gestures in the game.** Similar poses (fist, pinch, finger spread, open hand) get confused at fight speed, and a misread gesture feels like "the game isn't listening." Active powers are not new gestures but **amplified versions of the same gestures.**

| Gesture | Where | What it does |
|---|---|---|
| **Pinch and pull** | Workshop + arena | In the workshop: widen or narrow the top's rings, attach parts. In the arena: pull the floor up into a bump or ramp |
| **Press with a finger** | Arena | Temporary dent |
| **Rip cord** | Launch | Hold the launcher and pull your arm back. Pull speed = spin power, direction = angle. Tracked more reliably than a wrist twist and less tiring |
| **Tap the table** | Arena edge | A wave spreading outward from the center. The hand stays outside the arena and does not block the view. BEATABLE shows real-table tapping works on Quest |

### Arena placement relative to the real table
- The arena sits on a **pedestal about 8 cm above the table.** That leaves room to press a 3-4 cm dent into the virtual floor without the hand hitting the real table.
- **Table taps** happen **on the real table next to the pedestal**, not inside the arena. The touch has a physical counterpart and the hand does not cover the arena.
- The arena is placed in front of the player, **no farther than 40 cm** from the seat. Diameter about 30 cm, so every point is within reach (the competition's "2 ft" test).
- **No table:** the arena is placed on a tray floating in front of the seated player. Table taps become taps on the tray edge (no physical counterpart, only visual and audio feedback).

**View occlusion:** The arena is about 30 cm across. A hand inside it covers the tops. Arena moves must be possible near the rim. Hands inside the arena are drawn semi-transparent with a shadow.

## 5. Arena and energy

- The arena is a **heightmap.** Tops slide down slopes. Shapes you create **flatten back within 2-3 seconds.**
- Shapes **affect both tops.** A badly timed dent can trap your own top. That is where risk and reward come from.
- **Forge Energy:** Collisions fill it, arena moves spend it. A small bump is cheap, a dent costs more, a wave is expensive. Aggressive play is rewarded; unlimited meddling to trap the opponent is impossible.

### Fight readability (no text, no HUD)
| Information | How it reads |
|---|---|
| Which top has more spin | Pitch of the spin hum and motion blur of the body stripes |
| Which one is close to toppling | Wobble grows, core heats up |
| Why a hit sent it flying | Sparks at the impact and a short streak showing the push direction |
| What an arena move did | The path the tops follow over the shape glows for a second |
| Forge Energy | A light ring around the arena rim fills up |
| Active power ready | Your top's core glows and a short sound plays |

### End rules
- A top that leaves the arena, topples or runs out of spin loses.
- **Both out or stopped at the same time:** the one with more remaining spin wins. If equal, the match is replayed.
- **45-second time limit.** At timeout the top with more spin wins. This punishes running away from the opponent.

## 6. Top design

### Shape = behavior (visible and intuitive)
The physics does not need to be realistic, but it must never contradict intuition.

**Material is conserved.** Total mass is fixed. Widening a ring thins the body, so mass cannot be created for free. Widening moves mass outward: steadier spin and harder hits, but slower acceleration.

| Body | Behavior |
|---|---|
| Wide, thin-walled | Mass on the outside: stable spin, hits hard, accelerates slowly |
| Narrow, thick | Mass at the center: accelerates fast, agile, but easily knocked around |

| Tip | Behavior |
|---|---|
| Needle | Low friction: stays calm at the center, lasts long |
| Round | Mobile and aggressive, roams the arena |
| Flat, wide | High grip and strong hits, but loses spin quickly |

Shaping is not a free clay simulation: there are **3 body rings** and **3 tip types.** Pinch a ring to widen or narrow it, switch the tip between three options. The game derives a balanced lathe profile from these.

**Main shaping happens at the start of a run.** So that a bad design does not punish the player for 5 matches, each break between matches offers a choice: **take a part or re-forge one ring.** This creates the "read the opponent, adjust the design" loop without becoming a chore.

### Parts (between matches, pick 1 of 3)
Pick a part and attach it to your top. The best parts change not just the top's stats but **your arena powers:**

| Part | Effect |
|---|---|
| Magnetic Clay | Your dents pull the opponent harder |
| Spring Alloy | Bumps bounce your own top |
| Frozen Edge | The floor your top passes over becomes slippery for a few seconds |
| Seismic Core | Table-tap waves are bigger |
| Terraformer | Arena shapes last longer |
| Leech Metal | Every collision gives more energy |
| Gyro Stabilizer | Your own top is less affected by the slopes you create |

Example builds: heavy attacker + ramps · tank + dents · speedster + waves · magnet + trap arena.

### Core (active power): stretch goal
Not in the prototype. One clear trigger rule: **when the meter is full, pinch your own top** (reach over it and pinch). No separate hand pose, the lowest misread risk. The submission will have a single core, e.g. **Ram:** pinching dashes your top at the opponent.

### Opponent archetypes
Each of the 5 matches must demand a different answer, otherwise part choice is meaningless:

| Opponent | Behavior | Weakness |
|---|---|---|
| **Anchor** | Heavy, never leaves the center | Dents do nothing. Get under it with a ramp and tip it over |
| **Charger** | Fast and aggressive | Deflect it with ramps and it throws itself out |
| **Drifter** | Circles near the rim | A well-timed wave or bump knocks it out easily |
| **Leech** | Steals spin on contact | Keep it away: separate with walls and dents |
| **Smith (boss)** | Reshapes the arena like you | Read its moves and counter them |

Run: the first 4 matches are seeded random archetypes, the last is always Smith.

### Meta progression is separate from run power
- **Within a run** parts give power; they reset when the run ends.
- **Permanent progression** only unlocks options (new part types, tip types, arena themes) and cosmetics. **No stat advantage.**
- **Daily run:** everyone starts with the same parts. Fair, no grind.
- **Collection shelf** stores winning designs but gives no in-game power.

## 7. First five minutes (no text)

1. The arena appears on the table. A glowing lump of metal forms in your left palm.
2. Pinch it and it becomes a top. Pull the rings wider and the top changes.
3. The launcher appears. Rip the cord, the top drops onto your table and spins. **First payoff at about 20 seconds.**
4. A training opponent arrives. They collide. A glowing spot appears on the floor. Pinch and pull, a bump rises and the opponent flies out.
5. You win, 3 parts appear, you attach one. The run begins.

## 8. System interactions (the whole app by hand)

Hands-first applies to the entire app, not just fights: a player must be able to finish everything without ever pairing a controller.

| Situation | Gesture |
|---|---|
| Placing the arena | The table is found automatically. The arena appears in front of you; pinch and drag the pedestal to adjust |
| Left / right hand | Whichever hand rips the cord on the first launch becomes the launch hand. No settings needed, the game learns it |
| Recentering | Pinch and drag the pedestal (always available) |
| Pause | Turn your palm toward your face and hold (a long palm-up hold that must not clash with Meta's system gesture; verify on device) -> a small menu with large buttons at the arena rim |
| Restart | A pinch-pressed button in the pause menu |
| Failed cord pull | If the pull is too weak the top is not released; the launcher returns to your hand. No penalty |
| Hand tracking lost | The fight slows to a stop and resumes with a 1-second countdown when the hand returns |

## 9. Reasons to come back

- Personal best and longest run.
- Unlocked parts, cores and arena themes.
- Top collection: your winning tops stand on a shelf at the table edge (persistent, anchored).
- Daily run: the same opponent series for everyone each day (seeded). **A shared leaderboard needs a server; the first version only has personal bests.**

## 10. Competition fit

| Criterion | How we meet it |
|---|---|
| Gaming track: *hands-first, seated, without controllers* | The whole game by hand, on a table, seated |
| Innovation & Creativity (25%) | A top made by hand + reshaping the arena mid-fight |
| Experience Design (25%) | 30-second matches, text-free teaching, a small arena that suits a narrow field of view |
| Technical Implementation (25%) | Table detection + anchors, table-tap detection, 60 fps physics |
| Polish & Presentation (25%) | Sound (spin hum, metal clashes) and sparks are half the game |
| Best First Five Minutes | First launch at about 20 seconds |
| Best Reason to Come Back | Roguelike runs, collection, daily run |
| Boldest Original Concept | Reshaping the arena by hand during the fight |
| Best Agentic Interaction | Not a goal. Later maybe: a character that designs rival tops and the daily series |

## 11. Competitors (survey of Oct 6, 2026)

| Game | What | Difference |
|---|---|---|
| [BEYBLADE XR Project](https://apps.apple.com/us/app/beyblade-xr-project-%CE%B1-ver/id6477907047) (Jul 2024, phone) | Official Beyblade AR: scan the room and battle tops in real space | No hands on a phone: no shaping, no cord ripping, no arena reshaping |
| [Mortal Blade AR](https://play.google.com/store/apps/details?id=com.LeoPowaGames.MortalBladeAR) (phone) | 1v1 AR top matches | Same |
| [Totally Accurate Tops](https://www.roblox.com/games/16228276182/Totally-Accurate-Tops) (Roblox) | Build a top and battle | Screen and mouse |
| [Spin-Tops](https://play.google.com/store/apps/details?id=fi.Miksumortti.SpinTops) (mobile; download count **to be verified** on the Play page) | Top battles and customization | Evidence that the loop is loved |

**No spinning-top battler found on Quest.** "Top battles in real space" exists on phones; our difference is **everything done by hand.**

**Trade dress:** Beyblade is only mentioned in competitor analysis. The game does not imitate Beyblade's colors, launcher design, part names or logo. We use our own visual language.

## 12. Technical plan

- **IWSDK (WebXR).** Table detection + persistent anchor, pinch detection (with hysteresis), WebAudio sounds, save system.
- **"New Experience" rule:** No pre-existing codebase. All code in this repository is written within the competition window (from Sep 24, 2026); the git history is the record.
- **Physics:** No physics engine, our own simple simulation. Each top has position, velocity, spin and wobble (tilt). Circle-circle collisions. Slope from the heightmap gradient. Spin drains with friction and collisions; as spin drops, wobble grows until the top topples. Fixed timestep, deterministic. Two bodies and a small grid, so 60 fps is the target; **to be measured on Quest.**
- **Arena:** A 32×32 heightmap in the prototype (64×64 if needed), relaxing toward flat every frame; mesh vertex heights are updated in place.
- **Top visuals:** A lathe body from the 3-ring profile (LatheGeometry), parts as extra meshes.
- **Table tap:** The fingertip approaching the table plane quickly and stopping.
- **Rip cord:** Pinch-hold the launcher; measure the hand's backward speed.

## 13. Risks

| Risk | Mitigation |
|---|---|
| **No Quest.** Hand feel, table-tap accuracy and fps cannot be measured in the emulator | At least one day of Quest access is required (borrowed, friend, lab). First task after the prototype |
| Fights look random, so the player feels no control | Exaggerated, visible shape-behavior differences. Sparks and push direction at collisions |
| Too many gestures and misreads | At most 4 gestures |
| Hands cover the arena | Moves from the rim, semi-transparent hands |
| Scope creep | Core fight first. Parts and cores later |

## 14. Prototype (1-2 days) and kill criteria

**Scope:** An arena on the table (heightmap), two tops (fixed shapes: one wide, one narrow), rip-cord launch, a simple AI opponent, one temporary bump pulled up with a finger. No sound, parts, cores or shaping.

**The one question:** *Is it fun to raise a bump at the right moment and steer the opponent out?*

**Continue only if all hold:**
1. Launching feels good.
2. An arena move visibly changes the outcome.
3. It makes you want "one more match."

## 15. Phase plan (if the prototype holds)

| Phase | Content |
|---|---|
| 0 | Prototype and kill decision |
| 1 | Top workshop: 3-ring shaping, shape-behavior link |
| 2 | Run structure: 5 matches, opponent types, part choice and attaching |
| 3 | Energy, table-tap wave, cores |
| 4 | First five minutes, text-free teaching |
| 5 | Persistence: collection shelf, personal best, daily run |
| 6 | Sound, sparks, visual polish, performance |
| 7 | Quest tests, playtests, fixes |
| 8 | Video (under 3 min), Devpost text, release |

## 16. Minimum submission scope

**The competition build is single-player with no AI agent.** Multiplayer and an agent character would blow up the scope; both come after submission.

| Must ship | If time allows |
|---|---|
| Single player, 1 arena | Daily run |
| 5 opponents (4 archetypes + Smith) | Collection shelf |
| 3 shape parameters (rings + tip) | Table-tap wave |
| 6-8 parts | Second active power |
| Bump + dent | Arena themes |
| Rip-cord launch | |
| 1 active power | |
| Run + personal best | |

## 17. Measurable test criteria

- At least 4 of 5 new players launch the top **within 60 seconds** without verbal help.
- At least 3 replay **on their own** after the first match.
- Average gesture misreads per match **below 1.**
- Players can explain **why they won or lost** after a match.
- A sustained **60 fps or more** on Quest.

## 18. Visual style (decided Oct 6, 2026)

**Hybrid: clay body + metal parts + glowing core.** Sketch: `docs/style-hybrid.png`.

- **Body: colored, matte clay.** This is the part you shape by hand. Vivid colors read clearly against a real room, and ownership is obvious at a glance.
- **Parts: metal (steel, brass).** Tips, rings and cores are attached later. The material difference tells the player "this you shape, this you attach."
- **Glowing core:** An orange glowing eye on top. It brightens when the active power is ready.
- **Heat cracks:** Thin orange lines that multiply on the body as spin drains. "About to topple" reads without text.
- **Metal parts should be fairly light-toned.** In MR, metal cannot reflect the real room; dark metal looks fake and murky.
- **Materials use our own generated matcap textures.** Very cheap on Quest and no licensing issues (a popular ready-made matcap library has no stated license and will not be used).
