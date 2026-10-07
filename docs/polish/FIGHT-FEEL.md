# SpinSmith: fight feel (making the fight read as a real game)

Oct 8, 2026. Scope: the fight, moment to moment. That covers the rip, the clash, ramps, cups and slings, the
strike (the seals), rival tells, the four finishes, the round result and the match win. Read for this report:
`README.md`, `docs/reviews/FULL-EVALUATION.md` (sections 2 and 8), `docs/DUEL-DESIGN.md`,
`src/game/match-system.ts`, `visuals.ts`, `audio.ts`, `match-bar.ts`, `sim.ts`, `comfort.ts`,
`room-light.ts` and `shaping.ts`. No source was edited. The emulator was not used.

**Line numbers** are for the tree as of Oct 8, 01:05. `match-system.ts`, `sim.ts`, `parts.ts`, `progress.ts`
and `forge.ts` were being edited while I read them (the Tilt, Hammer and Bulwark seals were going in), so
treat `match-system.ts` lines as approximate and search for the function name.

All proposals are code-only: procedural geometry, canvas textures and synthesized WebAudio. None needs
camera or head motion. Every flash stays behind `COMFORT.flashes`.

---

## 1. Why the fight still reads as a prototype

The game already has the right kinds of feedback: sparks, an impact ring, a 45 ms hit stop, a room flash,
slow motion on a shape knockout, a hot-metal glow, debris and synthesized sounds. What it lacks is
**hierarchy, framing and staging**:

1. **Every hit looks the same.** A graze, a hard clash, a strike and a knockout all draw on the same
   three effects:
   - `sparks.burst` (`match-system.ts` ~2253);
   - `impacts.hit`, a ring that lasts 0.18 s (`visuals.ts:1532`);
   - `roomLight.hit` (`room-light.ts:65`).

   The hit stop is a fixed 45 ms (`HIT_STOP`, `match-system.ts:95`). In shipped fighters the size of the
   freeze, the spark and the sound tells the player how big a hit was.
2. **Text tells the story.** Finishes, strikes and tells are words on the glass `Label` card, for example
   "SLAG! You +2 heat\nHeat 2 - 0" (`finish()`, ~2291-2350). The match bar's center word is shrunk to fit
   220 px (`match-bar.ts:73-75`). Nothing in the arena says SLAG.
3. **Rounds have no frame.** There is no round number, no "final round" or "match point", and no countdown.
   "FIGHT" only swaps in for "READY" in the bar's middle (`match-system.ts:742`). A round ends straight
   into a text card.
4. **The tops are hard to follow.** Each top is about 6 cm on a 72 cm arena (FULL-EVALUATION section 8).
   - Nothing follows a top as it moves: no trail and no marker on the floor.
   - Spin, the top's "health", shows only on the far-rim bar, about 1 m away.
5. **Slow motion is rationed.** It plays only when your own shape caused the knockout, at 0.3 speed for
   0.9 s, or 0.45 s for other wins (`finish()`, ~2336-2342). A rival's knockout of you, and every other
   finish, gets nothing.
6. **The audio is a row of one-shots.**
   - The fight has no music: the forge loop is ducked to 0.1 (`match-system.ts:651`).
   - A clash is one layer whatever its size (`audio.ts:113`).
   - The Hammer reuses the shatter sound (`playBurst`, ~2229). The Tilt reuses the forge machine's rumble
     (`playMachine`, ~2041).
7. **A comfort bug: the rival tell flashes at 8 Hz.** `rivalTell()` (~1973) calls
   `theirView.flash()` on every 1/8 s step for a full second. WCAG 2.3.1 sets the limit at three flashes
   in any one second ([W3C](https://www.w3.org/WAI/WCAG20/Understanding/three-flashes-or-below-threshold)).
   The flash is small (the top's halo) and is skipped in Calm mode, but it is the wrong pattern, and it is
   the easiest fix in this report.

## 2. What shipped games do (and what carries over to a seated MR table)

- **Hit stop sized to the hit.** Sakurai's Famitsu column on hitstop lists ways to sell it:
  - freeze both fighters;
  - shake the victim, not the camera;
  - shake less as the stop runs out;
  - scale the stop with the hit;
  - keep the attacker moving slightly.

  Smash's hitlag grows with damage
  ([Source Gaming translation](https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/),
  [SmashWiki: Hitlag](https://www.ssbwiki.com/Hitlag),
  [critpoints on hitstop](https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/)).
  A 2023 IEICE study reports the best-rated durations as about 0.1-0.2 s for hit stop and 0.2-0.4 s for
  slow motion ([IEICE technical report, Mar 2023](https://ken.ieice.org/ken/paper/20230315OCSt/eng/);
  only the summary was read, the page refused a direct fetch). SpinSmith's 45 ms is short for its biggest
  moments.
- **Object shake instead of screen shake.** In VR the camera must never shake. Meta's comfort guidance:
  "avoid designing your app so that the camera shakes erratically in response to a gameplay event"
  ([Meta comfort guidelines](https://developers.meta.com/horizon/design/comfort/)). Sakurai's version
  fits that rule: shake the object that was hit.
- **A finishing blow gets its own staging.** Smash Ultimate's Finish Zoom slows time and adds a red
  backdrop when a hit will win the game ([SmashWiki: Finish Zoom](https://www.ssbwiki.com/Finish_Zoom)).
  Street Fighter covers the screen in a special colour when a super lands the KO
  ([EventHubs, SF5 AE KO sequence](https://www.eventhubs.com/news/2017/oct/17/all-new-critical-art-ko-sequence-spotted-street-fighter-5-arcade-edition)).
  SpinSmith cannot zoom, but on a table it can slow time, stamp a word into the world and stage the
  finish in the arena.
- **The goal itself is the celebration.** Rocket League's goal explosions turn the scoring moment into a
  firework on the goal ([Publisher Collective overview](https://srand.publisher-collective.com/news/rocket-league-goal-explosions)).
  Its replays play from cameras, but on a tabletop **a replay needs no camera**: the tops simply run the
  last seconds again on the table.
- **The launch is a shared ritual.** Beyblade battles start on a spoken "3, 2, 1, Let it Rip!" (Takara
  Tomy: "Go Shoot!"), and both players must launch on "Rip"
  ([Wikipedia: Beyblade](https://www.Wikipedia.com/wiki/Beyblade)). "Let It Rip" is Hasbro's catchphrase,
  and ACTION-PLAN D2 renames terms borrowed from Beyblade, so use SpinSmith's own words (proposal in
  item 4).
- **Each finish has its own name and look.** Beyblade X names its finishes (Spin, Over, Burst, Xtreme;
  [Takara Tomy Start Dash Guide](https://www.takaratomyasia.com/documents/beybladex/1705650582_Beyblade%20X_Start%20Dash%20Guide.pdf)).
  SpinSmith's SLAG, THROWN, SHATTER and OUTLAST already map onto these and deserve distinct moments.
- **Telegraphs are what make reads fair.** A tell needs a readable wind-up that says what is coming and
  where, in both sight and sound
  ([Game Developer: enemy attacks and telegraphing](https://gamedeveloper.com/design/enemy-attacks-and-telegraphing),
  [Game Developer: anticipation](https://gamedeveloper.com/design/adding-weight-to-your-game-design-part-2-anticipation)).
  SpinSmith's tell says *when* (flash and whine) but not *what* or *where*.
- **Health bars show recent damage.** Fighting games show recent damage as a trailing or red section that
  drains after the hit
  ([MvC3 red health](https://srk.shib.live/w/Marvel_vs_Capcom_3/Game_Elements/Red_Health),
  [DBFZ health](https://dragonballfighterz.fandom.com/wiki/Health)). It makes each hit legible on the HUD.
- **Juice is layered feedback on a working core.** See "Juice it or lose it" (Jonasson and Purho, 2012)
  and "The Art of Screenshake" (Nijman, Vlambeer)
  ([summary](https://rpgplayground.com/research-making-a-juicy-game/),
  [Kenney's list](https://kenney.nl/learn/must-see-videos-for-indie-developers)).
- **In hands-only VR, sound carries the impact.** Beat Saber's feel comes from slice, sound and haptics
  landing together, and a quieter cut sound made hits feel weaker
  ([Road to VR, Inside XR Design](https://roadtovr.com/beat-saber-instructed-motion-until-you-fall-inside-xr-design/)).
  Hand tracking gives no haptics, so in SpinSmith sound and light have to do that job.
- **VR can slow time.** SUPERHOT VR shows that slowing the world, but never the player's own body, is
  comfortable ([Voices of VR #88](https://voicesofvr.com/?p=821)). SpinSmith's rule fits: the sim and its
  visuals slow; the head, the hands and the hand rings never do.
- **Spatial audio.** A WebAudio `PannerNode` with HRTF and an `AudioListener` updated from the head pose
  keeps sounds on the table as the head turns
  ([MDN, web audio spatialization](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics)).

### Rules for SpinSmith's juice (VR-safe)

1. Never move the camera, the head or the hands. Hit stop and slow motion affect only the sim and the
   visuals in the arena. The hand rings, cord and pointer always run in real time (they already do:
   `vdt` is used only for top views, sparks and impacts, `match-system.ts:751`).
2. Flashes: at most 3 per second from all sources together, small (the top's halo, a pit, a rail), and
   only with `COMFORT.flashes`. The room-wide effect stays a dimming (`roomLight`), never a brightening
   beyond today's.
3. Text in the world, never on the head. Words stamp onto the far rim or above the arena.
4. Every event has a tier, and its freeze, particles, light and sound all scale with that tier.

---

## 3. The ranked list

Effort: **S** is up to half a day, **M** is 1-2 days, **L** is 3 or more days.

**Emu** means it can be checked in the emulator with screenshots, `[MATCH]`/`[STRIKE]` logs and the dev
keys (`K` shatter, `O` throw, `J`/`Shift+J` strike, `T` tell). Sound can be checked only through logs or
an offline render. How things read at true scale, and comfort, need the headset.

| # | Change | Where | Effort | Emu |
|---|---|---|---|---|
| 1 | Impact tiers: hit stop, object shake, hit star and sound scale with the hit | `updateFight` clash block (~2240-2270), `HIT_STOP` (95), `TopView.sync` (`visuals.ts:620`), `Impacts` (`visuals.ts:1503`) | S-M | yes |
| 2 | Finish sequences: freeze, then slow motion, then a world stamp, with VFX and sound per finish | `finish()` (~2291), `TopView.updateOut`/`updateBurst` (`visuals.ts:674/740`), new `FinishStamp`, `audio.ts` | M | yes |
| 3 | Fix the 8 Hz tell flash; directional telegraphs for charge, quake and pull | `rivalTell()` (~1947-1990) | S | yes |
| 4 | Round framing: ROUND N / MATCH POINT / FINAL plate; a 3-2-1 on the existing opening wait; the RIP burst at release | `toReady()` (~1512), `updateReadyPinch()`, `launch()` (~1706), `match-bar.ts` | S-M | yes |
| 5 | Match bar as a fighting-game HUD: chip damage, hit flash, pips that ignite, forge-bar icon, last-10-s clock | `match-bar.ts` (whole), call at `match-system.ts:742` | M | yes |
| 6 | Readable tops: team ring with a spin gauge on the floor, motion trails | `TopView` (`visuals.ts:509`), new `Trail` | M | yes (scale no) |
| 7 | Strike "super freeze" and seal staging (all six seals) | `doStrike()` (~1999-2060) | M | yes |
| 8 | Audio layering: tiered clash, hum ducking, finish stingers, fight music that builds | `audio.ts:109-185`, `ForgeLoop` (358), `SpinHum` (197) | M | partly |
| 9 | Near misses and rim drama: pit lips glow near a top, rim-scrape sparks on hard wall bounces | `sim.ts wall()` (event field only), `ArenaView.update` (`visuals.ts:1257`) | S-M | yes |
| 10 | Match win and loss celebration | `finish()` (decided branch), `updateRewards()` (~2453), `ArenaView` | M | yes |
| 11 | Instant replay of a knockout on the table | new ring buffer in `updateFight`, a `replay` phase | M-L | yes |
| 12 | Fixes to the in-progress Tilt, Hammer and Bulwark (section 4) | `sim.ts` 404-418, 576-577, 782-810, 912-930, 1040-1055 | S | yes (report) |
| 13 | Rip release: directional spark cone, launch ring, white-hot stamp | `launch()` (~1740), `showCharge()` (~1689) | S | yes |
| 14 | Hot metal you can read: ember smoke and crack lines on damaged tops | `TopView.sync` (`visuals.ts:657-667`) | S-M | yes |
| 15 | Floor ripple for the Anvil Strike and the quake (visual only) | `ArenaView.sync` (`visuals.ts:1292`) | M | yes |
| 16 | One flash budget for comfort (≤3/s) | `comfort.ts`, every `flash()`/`hit()` caller | S | yes (logs) |
| 17 | Spatial audio from the arena (HRTF panners, listener on the head) | `audio.ts out()` (24) | M | no |
| 18 | Spoken calls (speechSynthesis), feature-detected and off by default | `audio.ts` | S | no |

### 1. Impact tiers (S-M, emulator yes)

**What.** Classify every contact into a tier and scale everything with it. The tiers use the existing
`clash.strength` (0..1) and the hit's context:

| Tier | Trigger | Hit stop | Object shake (both TopViews) | VFX | Sound |
|---|---|---|---|---|---|
| Graze | strength < 0.3 | 0 | 0 | 4-6 sparks (today) | tick: hiss only, 30 ms |
| Solid | 0.3-0.6 | 30 ms | 0.6 mm amplitude, 40 ms | sparks plus a small ring | clash, 2 layers |
| Hard | > 0.6 (`HARD_HIT`) | 70 ms | 1.2 mm, decaying | sparks ×2, ring, **hit star** (see below), halo flash | clash, 3 layers plus a low thump, hums duck |
| Heavy | Hammer landing, strike contact, ramp or sling into a clash | 110 ms | 2 mm | star ×1.6, jagged crack ring, embers | anvil clang plus a crack |
| Finish | the step that decides the round | 150 ms, then item 2 | 2.5 mm | see item 2 | see item 2 |

**How.**
- Replace `HIT_STOP` (95) with a function of the tier. Keep `HIT_STOP_GAP` so grinding contact does not
  stutter.
- Add `shake(amount, time)` to `TopView`, applied as a positional jitter on `root` in `sync()`. It should
  alternate sides, decay linearly and lie along the contact normal (Sakurai's "shake horizontally on the
  ground, lessen gradually"). The jitter must run on real `dt`, not on the paused sim, so the tops
  quiver during the freeze.
- The **hit star** is a new pooled billboard in `Impacts`: a 4- or 8-point star drawn once to a canvas,
  additive, facing the head. It lasts 60-90 ms, at 0.6× and then 1× scale, at the contact point. This is
  the fighting-game "hit spark" and reads at 1 m where 1 cm points do not.
- Make `Sparks` (`visuals.ts:1345`) directional. Throw them **tangentially along each top's spin**
  (`hand`), so opposite spins throw sparks to opposite sides. Raise the per-burst count to
  4 + 24·strength on hard hits, and the pool from 96 to 160.

**Why.** It answers "every hit looks the same", and it is the most-cited single technique in game-feel
literature. The total extra stop per round stays small, because hard hits are rare and gated.

### 2. Finish sequences (M, emulator yes: K, O and natural finishes)

**What.** Today a finish is a text card and a one-shot sound. Make each finish a 1.2-1.6 s staged moment,
the same for both sides, so the rival's knockouts read too:

1. **Freeze.** 150 ms at the deciding step (sim already stopped; freeze the visuals with `vdt = 0`).
2. **Slow motion.** `slowMo` 0.6 s at 0.35× for every knockout (today: only your own shape's, at 0.3×).
   Keep 0.9 s for "YOUR RAMP → SLAG". This sits inside the IEICE range for slow motion.
3. **Stamp.** The finish word stamps onto the far rim as a new `FinishStamp`: a canvas-texture plane
   about 2× the label's width.
   - Heavy outlined type with a molten gradient for your win and a steel-teal one for the rival's.
   - It scales 1.5 → 1.0 with a 1.08 overshoot over 120 ms, holds, then sinks into the rim slot.
   - The cause line ("YOUR SLING") sits under it, small.
   - Use this in place of the glass label for finish words. The label stays for teaching.
4. **Per-finish VFX and sound:**
   - **SLAG.** The pit's lip flares to white-orange, an ember column (40 particles rising 6-10 cm,
     drifting) comes out of the pit mouth, and the sinking top glows orange as it goes down
     (`updateOut`, pocket branch, `visuals.ts:684`). Sound: a hiss and sizzle (bandpass noise 3k→800 Hz
     over 0.6 s) over today's thunk, then a low "glug" (sine 90→45 Hz).
   - **THROWN.** A ribbon trail follows the top's flight arc in `updateOut`. An impact ring and dust
     puff appear on the real table where it lands (the landing is already computed: `landed`, line 717).
     Sound: a Doppler-style whoosh (pitch falls as it leaves), then a clank on landing timed to
     `landed`.
   - **SHATTER.** The core pops white for 2 frames before the parts separate, then add 12 small shard
     particles beside the existing debris. Debris starts hot orange and cools to the body colour over
     0.8 s, with a ring of light. Sound: today's burst plus a glassy crack (hiss 6k→2k, Q 4) and a low
     boom.
   - **OUTLAST.** The loser's wobble finishes and it clatters (exists). The winner's halo swells and
     its hum glides up to the motif's root (587 Hz) and resolves: the "last top standing" sound. Pull
     the finish ring onto the winner.

**Why.** These are the hero moments of every round. They give the "it happened in my room" payoff and
the footage the submission video needs. They also replace the text that currently carries them.

### 3. Telegraphs that read, and the 8 Hz flash (S, emulator yes: T)

**What.**
- Replace `theirView.flash()` at 8 Hz (~1973) with a steady glow ramp. The halo's opacity and colour rise
  continuously over `TELL_TIME`, plus at most two pulses per second.
- Add a **what and where** telegraph per move:
  - **Charge:** a red-teal lane on the floor from the rival toward your top. Its fill runs from the rival
    toward you over the 1 s, and it tracks your top until 0.15 s before the move lands, then locks.
  - **Quake:** a ring that **contracts** onto the rival over 1 s (the wind-up), then the existing outward
    shock.
  - **Pull:** a dotted line from *your* top to the slag pit mouth it will drag you toward. The target
    pit's lip pulses teal.
- Show a small "!" glyph (canvas billboard) over the rival for the 1 s.
- Give the whine (`playTell`) a different top note per move (charge rising, quake falling, pull
  wobbling), so a player learns them by ear.
- "INTERRUPTED!" becomes a stamp (item 2's class) with a crack sound.

**Why.** It turns the tell from "something will happen" into a read the player can answer: strike, cup
your top, or move away from the lane. The flash change is a comfort fix.

### 4. Round framing (S-M, emulator yes)

**What.**
- **Round plate.** In `toReady()`, stamp "ROUND 2", "MATCH POINT" (either side at 2+ heat) or "FINAL
  ROUND" (both at 2) onto the far rim with a gong. The gong is a low tone plus 2.76× and 5.4× partials,
  decaying over 1.5 s. Round 1 shows the rival intro instead (exists, as a label today).
- **3-2-1 without adding a wait.** The match opener already waits while a big arena opens out
  (`sizeSettled`, `updateReadyPinch` returns until settled). Play the count on that existing wait: three
  rim lamps (or the rails) light in turn, 0.4 s apart, each with a motif-note anvil tick. Then
  "PINCH TO RIP" (or your own call) glows on the launch zone. In rounds 2+ the count runs in 0.9 s.
  Pinching is never blocked: the count is staging, not a gate.
- **The rival winds up with you.** While you pull, the rival's top spins up in place (its `angle` and
  halo track your power), so both visibly launch together, as in a real battle.
- **The RIP burst.** On release, stamp a word over the arena centre for 0.6 s (for example "RIP!", or a
  forge word such as "STRIKE!" if D2 renames it). Both launch points throw sparks, with one shared
  whoosh and a sub thump. Avoid "Let It Rip", Hasbro's catchphrase.

**Why.** Framing is what separates "a sim running" from "a bout". It costs no extra time per round.

### 5. The match bar as a fighting-game HUD (M, emulator yes)

**What** (`match-bar.ts`):
- **Make the fills meshes.** Move the two spin fills out of the canvas onto two quads over the plate,
  with `scale.x` and colour set per frame. The plate canvas then redraws only for names, pips and words.
  This makes the per-frame animation below free; today every change redraws a 1400×330 canvas.
- **Chip damage.** Behind each fill, a pale bar holds the old value for 0.35 s after a clash, then drains
  to the new one over 0.3 s. A hard hit leaves a visible white chunk.
- **Hit flash.** The side that was hit flashes its fill white for 60 ms, once per hard hit, inside the
  flash budget.
- **Heat pips ignite.** On scoring, the new pips light one by one with a 1.3× scale pop, an ember puff and
  a stamp sound. A knockout's 2 heat light as two quick pops.
- **Forge-bar icon.** A small seal glyph under your name fills with your forge bar and glows when ready.
  Fighting games always put the super meter on the HUD. The hand ring stays where it is.
- **Clock.** Show the last 10 s of the 45 s limit as a ticking number in the middle, with a soft tick
  each second.
- **Bigger centre words.** The middle shows only short stamped words (FIGHT, SLAG, ROUND 2). Drop the
  220 px squeeze (`match-bar.ts:73-75`) by giving the middle 360 px: the bars are 560 px each, so cut
  them to 500.

**Why.** It is what a judge's eye goes to between clashes, and today it moves in 2% steps with no sense
of impact.

### 6. Tops you can read at 6 cm (M; emulator yes, true scale no)

**What.**
- **Team ring with a spin gauge.** On the floor under each top, a thin ring about 1.6× the top's radius
  in team colour (warm for you, teal for the rival). Its arc length is the top's spin (a radial gauge),
  going red under 25% like the bar. It rides under the existing soft shadow (`visuals.ts:563`). Health is
  then readable where the eyes are, not at the far rim.
- **Motion trail.** A ribbon of 16-24 samples in team colour, additive, shown when speed is above about
  0.25 m/s, with alpha set by speed. Use one `BufferGeometry` per top updated in place, with no
  allocation per frame (AGENTS.md rule). On rail dashes, pads and slings it is wider and white-hot.
- Optional: a 1.15× **readability scale** on the top meshes during fights only, never in the sim.
  Check it against the arena's proportions once in the headset.

**Why.** FULL-EVALUATION section 8 calls this "the biggest presentation risk". Trails and floor rings are
how small, fast objects are made readable in top-down arcade games, and they need no camera.

### 7. Strike staging and the "super freeze" (M, emulator yes: J then Shift+J)

**What.** In `doStrike()`, before calling `sealStrike`:
- **Super freeze.** Pause the sim for 250 ms. Ease the room dim 0.45 → 0.7 over 120 ms, a darkening
  rather than a flash, then back. This is the fighting-game "super flash" in a VR-safe form. Then:
  - your seal's glyph (reuse `sealModel`, `forge.ts:807`) rises 3 cm over your top and spins once;
  - a 250 ms charge sound plays (rising filtered noise plus the motif's first note);
  - then the effect lands.
  - Skip the freeze when it would stack within 0.5 s of another freeze.
- **Per seal, the effect lands:**
  - **Anvil:** a ghost hammer (two boxes) drops onto the rim at the palm point over 80 ms. Then two
    shock rings, a fast thin bright one and a slow wide dust-coloured one, and the floor ripple (item 15).
  - **Rush:** a comet trail on your top for the 0.6 s of `rushing`. The rival's halo flashes on contact.
  - **Magnet:** three teal-to-red arcs from the rival to the target pit, contracting. The pit lip pulses.
  - **Tilt, Hammer and Bulwark:** see section 4.
- **The palm print.** The handprint on the table (`slapMark`) stamps flat, flashes once and leaves a
  fading scorch ring where you slapped. A slap on a real table should leave a mark in the game too.

**Why.** The strike is the player's "super". It should be the second-biggest moment in a round, after a
knockout. Today it shares a 45 ms freeze with ordinary hard hits.

### 8. Audio layering (M, partly emulator: logs or an offline render)

**What** (`audio.ts`):
- **Tiered clash** (`clash()`, line 113), built from three layers:
  - a transient (hiss, 30 ms);
  - a metallic body whose partials vary by ring (`contact`: smash, upper, absorb, grind);
  - on hard hits only, a sub thump (sine 120→55 Hz, 0.18 s).

  Pass the tier from item 1.
- **Hum ducking.** On hard hits and finishes, duck both `SpinHum` gains by 6 dB for 150 ms (a sidechain
  done by hand), so the clash punches through.
- **Finish stingers**, distinct per finish (item 2). Today's `playResult` motif then plays on the round
  win.
- **Fight music that builds.** The `ForgeLoop` beat (`audio.ts:358`) becomes the fight bed at 0.25
  rather than ducked to 0.1. Layers come in with tension:
  - a hi-hat-like noise tick when either top falls under 35% spin;
  - an octave drone when either forge bar is full;
  - the beat doubles in the last 10 s of the time limit.

  It is all scheduled synthesis, like the existing loop. This also covers ACTION-PLAN D6 (music) without
  asset files.
- **Distinct seal sounds:** `playHammer`, `playTilt` and `playWard` (section 4), instead of reusing
  `playBurst` and `playMachine`.

**Why.** With hand tracking there are no haptics, so sound has to carry the weight of each hit (see the
Beat Saber evidence above).

### 9. Near misses and rim drama (S-M, emulator yes)

**What.**
- **Wall hit event.** In `sim.ts wall()`, set new fields `t.sinceWall = 0` and `t.wallHit = outward`
  in the bounce branch. These are events only; the physics is unchanged.
- **Rim scrape.** In `updateFight`, a wall hit above 0.4 × the escape speed gives:
  - sparks scraped along the rim tangent;
  - a scrape sound (bandpass noise sweep);
  - a short glow on that wall segment, using the `railFlash` approach in `ArenaView`.
- **Pit lip glow.** In `ArenaView.update`, each pit lip glows by how close a top is to its mouth and how
  fast it is moving outward. A top that skims past a pit makes the lip flare. That is the "ohh!" moment
  that makes knockouts feel close.

**Why.** It turns near-knockouts, which happen far more often than knockouts, into visible tension.

### 10. Match win and loss (M, emulator yes)

**What.**
- **Win:**
  - the rails and pit lips light in a chase around the rim, two loops in 1.2 s;
  - ember fountains rise from the pits;
  - the winning top rises 6 cm over the centre and spins slowly on a beam of light (reuse the reveal
    spin, `updateRewards` ~2479);
  - "MATCH" stamps with the final heat;
  - the full motif plays as a chord with three anvil hits.
- **Loss:** the arena cools to blue-grey for 1.5 s, the rival's top does a short spin-up "taunt" in the
  middle, and a falling three-note phrase plays (it exists).
- Keep it under 3 s, then let the XP and unlock cards follow (FULL-EVALUATION section 2 says the
  between-round loop is already long).

### 11. Instant replay on the table (M-L, emulator yes)

**What.**
- **Recording.** Keep a ring buffer of the last 2.0 s of both tops' state at 60 Hz (x, z, angle, kick,
  kickX, kickZ, wobble, plus the shapes' marks). That is under 2,000 floats, preallocated.
- **Playback.** After a knockout's stamp, run the last 1.5 s at 0.4× on the same arena, with a "REPLAY"
  tag on the bar and the deciding shape's marks shown.
- **Skip.** A pinch skips it, and since a pinch already starts the next pull, it costs a player in a
  hurry nothing.
- Knockouts only; not in the first session.

**Why.** On a tabletop a replay needs no camera: it is the Rocket League goal replay without the motion.
It makes every ramp knockout legible ("so that is what my ramp did"), and it is ready-made footage for
the video.

### 12. The in-progress seals: fixes before balancing (S)

See section 4. The short version:
- `Top.launch` does not reset `hammer` and `guard`.
- The Tilt spring rings past level.
- The report's Tilt palm can be out of a seated player's reach.
- Hammer damage can be too small to show.
- Bulwark does not reduce strike or pull knockback, and drops off a cliff when it ends.
- The name "Bulwark" collides with the Bulwark ring.

### 13. The rip release (S, emulator yes: L or a drive rip)

**What.** In `launch()` (~1740):
- **Directional sparks.** Replace the round `sparks.burst` with a cone of sparks along the launch
  direction.
- **Launch ring.** A floor ring at the launch point, using `Impacts.hit` at a size set by power.
- **Halo flare.** The top's halo flares to the cord's heat colour for 0.2 s.
- **White hot:** a 50 ms freeze, a white ring and the "WHITE HOT" stamp (item 2) in place of the label
  text, plus today's ping.

### 14. Hot metal you can read (S-M, emulator yes: hard clashes, or K for comparison)

**What.**
- **Smoke.** Above damage 0.45, a hot top gives off thin embers and a darker smoke puff every 0.15 s,
  using a small particle pool.
- **Cracks.** Above 0.7, add 2-3 crack lines on the ring: a canvas texture of jagged lines blended
  additively in red-orange, revealed by damage.

This complements the red halo (`visuals.ts:662-667`) and the ring lift (`explode`). It foreshadows a
SHATTER, and shows that a strike will throw the top further.

### 15. Floor ripple (M, emulator yes)

**What.** In `ArenaView.sync`, add a visual-only height offset
A·sin(k(r_from_origin - v·t))·envelope for 0.4 s after an Anvil Strike or a quake. Use about 3 mm in
arena units, a speed matching the 0.18 s shock ring, and the existing vertex colours (warm crest). Force
`sync()` each frame while it runs. The sim is unchanged.

**Why.** It makes the floor itself the shockwave, the most physical-looking effect available without a
camera.

### 16. One flash budget (S, emulator yes through logs)

**What.** Add `flashOk(now)` to `comfort.ts`. It returns false after 3 flashes in the trailing 1 s, or
whenever `COMFORT.flashes` is off. Route `TopView.flash`, `RoomLight.hit` and the bar hit flash through
it.

**Why.** A strike, a hard clash and a tell can coincide. This guarantees WCAG 2.3.1 by construction
rather than case by case.

### 17. Spatial audio (M, headset only)

**What.** `out()` (`audio.ts:24`) uses a `StereoPanner` driven by arena-local x. Replace it with a
`PannerNode` (HRTF) placed at the event's world position. Update `ctx.listener` from the head pose each
frame. Then sounds stay on the table when the player looks away, which is more convincing in MR.

### 18. Spoken calls (S, headset only)

**What.** Try `speechSynthesis` with a low pitch and a fast rate for "Round two", "Slag!" and "Match
point", feature-detected and off by default. Quest Browser support and voice quality are unverified, so
the synthesized stingers stay the real announcer.

---

## 4. The three new seals: Tilt, Hammer, Bulwark

They are being implemented as I write: `sim.ts:782-810`, `TILT` and `HAMMER*`/`BULWARK_TIME`
constants, `Arena.shove`, `Top.hammer` and `Top.guard`; also `parts.ts` names and blurbs, `progress.ts`
unlocks (Tilt Lv 10, Hammer Lv 13, Bulwark Lv 16), the `forge.ts` coins, the `match-system.ts` aura and
`doStrike` branches, and the `shaping-report.ts` policy. Below is a precise spec as **deltas to that
code**, with starting numbers for `npm run report:shaping`.

**Balance gates**, the same as DUEL-DESIGN:
- each seal's "human + seal" win rate within ±3 points of Anvil (64%);
- median round 12-20 s;
- own knockouts caused by the seal at most 10%.

### Shared bug: the state survives into the next round

`Top.launch()` (`sim.ts:576-577`) resets `rushing` and `tell` but not `hammer` or `guard`. Both only
count down inside `advance()`, which stops when a round ends. A Hammer or Bulwark still running at a
finish therefore carries into the next launch. **Fix:** add `hammer: 0, guard: 0` to the `Object.assign`
in `launch()`. Also clear `arena.shove` (it is already cleared in `reset()`, good).

### Tilt: the arena dips toward your palm for about 2 s

**Mechanics** (`sim.ts`):
- **Exists.** `sealStrike` sets `arena.shove = {x, z, t: TILT.time}` from the rim point beside the palm.
  `Arena.update` (404-418) adds `sx = shove.z·TILT.shove` and `sz = -shove.x·TILT.shove` to the dish
  target and runs the dish spring (`TILT_SPRING 18`, `TILT_DAMP 3`). `slope()` (254-255) feeds
  `tiltZ`/`tiltX` into gravity, and `stage.rotation` shows the same values. The signs are right: the
  floor dips toward (x, z).
- **Problem 1: the spring rings.** Damping ratio ζ = 3 / (2√18) ≈ 0.35, which gives about 30% overshoot.
  When the shove ends the arena swings *past level the other way* and back. That throws tops away from
  the palm, which can cause own knockouts. It also wobbles a 72 cm object in view. **Fix:** while `shove`
  is set, and for 0.6 s after, use a critically damped spring for the shove part:
  - `SHOVE_SPRING = 40`;
  - `SHOVE_DAMP = 2·√40 ≈ 12.6`;
  - 90% of the target reached in about 0.35 s, with no overshoot.

  Leave the dish's own rocking (weight-driven) on its old constants. The simplest version keeps two tilt
  states and adds them: `tiltX = dishX + shoveX`.
- **Problem 2: the shape of the shove.** Give it an envelope: ease in 0.2 s, hold, ease out 0.4 s.
  Start from:
  - `TILT = { shove: 0.12, hold: 1.6, in: 0.2, out: 0.4 }`, total about 2.2 s, as the user asked;
  - the current 0.16 is a slope of 9° (1.57 m/s² down the slope), likely knockout-heavy, so start lower;
  - scale `shove` by wall type: `none` ×0.6 (sumo rings out easily), `low` ×0.8, `high` ×1.2; ice ×0.7.
- **Problem 3: reach.** A seated player can slap only beside the near half and the sides of the arena
  (the strike needs the palm outside the rim, `updateStrike` ~1898; the far rim is about 1 m away).
  `shaping-report.ts humanStrike` puts the Tilt palm at the rival's position, which can be on the far
  rim. **Fix the report**: clamp the palm angle to the reachable arc, ±110° around the player axis
  (+z), and pick the reachable rim point nearest the rival's direction. The skill in Tilt becomes
  waiting for the orbiting rival to come round to your side, which takes about 1-2 s. That is a real
  read.
- **Who it affects.** Both tops, by design: the slide is the risk. If own knockouts exceed 10%, add
  `Top.footing` (a gravity multiplier from the shove only), set to 0.6 for your top while the shove
  runs, matching `TUNING.strikeOwn`.
- **Thrown tops.** A top thrown during a Tilt flies in tilted stage space (`TopView.updateOut` lands it
  on `roomSurface` in stage coordinates). Either compute the landing in root space or level the thrown
  top's parent for its flight.

**Visuals.**
- **Tilt.** The stage tilts (exists; at 0.12 that is 6.8°, cap the visual at 8°).
- **The low side.** The rim glows the seal colour (`SEAL_COLOR.tilt` 0x7de07d), with intensity set by
  angle, through the wall and rail materials.
- **Flow chevrons.** Five chevrons slide downhill across the floor (ShapeMarks-style cones moving at
  about 10 cm/s), so the slope reads even when the tilt is small.
- **The palm.** The print stamps and leaves a scorch ring.
- **Comfort.** The tilt moves an object, not the view. With critical damping its angular speed peaks
  near 0.5 rad/s. The far-rim bar and labels hang on `root`, not `stage` (`match-system.ts` ~423-458), so
  text stays level.

**Sound** (`playTilt`, new; replaces the `playMachine` reuse):
- onset: 8 ratchet clicks (square 1.2 kHz, 15 ms each, 25 ms apart);
- a metal creak under the hold (sawtooth 70→55 Hz through a 400 Hz lowpass with 5 Hz vibrato,
  1.6 s);
- release: a clunk (tone 120→70 Hz plus a short hiss).

### Hammer: your next solid clash deals about 3× burst damage

**Mechanics** (`sim.ts`):
- **Exists.**
  - `HAMMER = 3`, `HAMMER_TIME = 5`, `HAMMER_MIN = 0.3` (clash strength).
  - In `collide()` (1047-1053), a solid clash multiplies the damage dealt by 3 and clears both tops'
    `hammer`.
- **Problem 1: the result may be invisible.** Damage per clash is `0.24·impulse²·punch·chip/resist`.
  Typical solid clashes add only a few hundredths, so 3× is often under 0.15: no red glow (heat shows
  from 0.12) and no shatter threat. Measure first: log `[STRIKE] hammer landed` deltas (the dev log
  exists, ~2232). Then set:
  - `dealt = max(HAMMER·normal, HAMMER_CRACK)` with `HAMMER_CRACK = 0.22`, so a Hammer always visibly
    cracks the rival and turns it hot;
  - knockback on the target `jb *= HAMMER_PUSH (1.3) · (1 + TUNING.hot·b.damage)`, the same hot-metal
    rule as the strike, so a Hammer on a hot rival near the rim can throw it;
  - the hammer holder takes 0.7× knockback on that clash (it "wins" the exchange).
- **Problem 2: no contact, no Hammer.** A stamina or defense top may not clash within 5 s. While
  `hammer > 0`, add a homing pull in `advance()`: `HAMMER_SEEK = 1.6` /s, steering like `spec.seek`
  (`sim.ts` ~644-652) and scaled by spin. Shorten `HAMMER_TIME` to 4 s. On expiry it fizzles: refund
  0.25 of the forge bar, so a whiff is not a total loss.
- **Event.** Add `hammer?: true` to the `Clash` returned by `collide()`, so the view need not infer the
  landing from `mine.hammer` changing to 0. Today's check (~2225-2229) also fires on a clash whose
  strength is under `HAMMER_MIN`, because only solid clashes clear it.

**Visuals.**
- **Armed:**
  - the halo turns gold (`SEAL_COLOR.hammer` 0xffe066);
  - a small hammer glyph (the `sealModel('hammer')` sledge) orbits 2 cm above the top at 2 rev/s;
  - the existing gold torus aura stays;
  - the hand ring stays gold-lit until it lands, the "charged state" readout fighting games use for
    V-Trigger-style buffs.
- **Landing:** the Heavy tier from item 1: a 110 ms stop, a big hit star and a jagged crack ring on the
  rival. The rival's halo jumps to red at once, and a "CRACKED" mini-stamp shows if damage crossed 0.45.
- **Coin clash.** The Anvil seal's coin is also a hammer head (`forge.ts:810-817`). Redraw the Anvil
  coin as an anvil silhouette so the two seals differ.

**Sound** (`playHammer`, new; stop reusing `playBurst`, which promises a shatter):
- armed: a soft rising tick every 0.5 s;
- landing: an anvil clang (`playStrike`'s partials up a fifth), plus a crack (hiss 4k→1k, Q 3), plus a
  sub boom;
- fizzle: falling sine 600→200 Hz and a hiss.

### Bulwark: 3 s in which your top cannot be knocked out and is pushed less

**Mechanics** (`sim.ts`):
- **Exists.**
  - `guard = BULWARK_TIME (3)`.
  - `wall()` (912-930): `open` is false while guarded. Pits, walls and the sumo edge hold the top,
    good.
  - `collide()` (1014-1015): half knockback while guarded.
- **Gaps:**
  1. **The strike and the rival's quake ignore it.** `strike()` (~764) scales by `strikeOwn` but not
     by `guard`, and `rivalMove`'s pull (867) adds full speed. Multiply `k` by `GUARD_PUSH = 0.5` for a
     guarded top in `strike()`, skip `lifted` for it, and halve `pull` in `rivalMove` when
     `you.guard > 0`.
  2. **It ends on a cliff.** A top pressed against the rim with outward speed above the escape speed is
     out the step `guard` reaches 0. Add a 0.4 s fade after expiry: escape thresholds
     ×(1 + 1.0·fade), via a `t.guardFade` field, and clamp the outward velocity to 0.8 × the pocket
     threshold at the expiry step.
  3. **An event for the save.** When the guard is what kept a top in (it would have escaped with
     `open` true), set `t.sinceSave = 0`. The view needs it for the "blocked" moment.
  4. **The name.** "Bulwark" is also a ring (Iron Keep's signature part, `progress.ts` RIVAL_SIGNATURE)
     and close to the rival "Bastion". Rename the seal **"Ward"** (or "Aegis") in `SEAL_NAMES`; the
     internal key can stay.
- **Optional teeth**, only if its win rate lags more than 3 points: a rival that *charges* into a
  guarded top bounces off at 1.3×. That makes Bulwark the counter to charge tells.
- **Report policy.** Today it fires when `nm > 0.7 || me.damage > 0.6`, or on a tell. That is right: it
  is a reactive seal. Add a gate: "rounds saved by the guard" counted as knockouts prevented, so its
  value shows.

**Visuals.**
- **The dome.** Twelve thin vertical ribs, in steel-white `SEAL_COLOR.bulwark` 0xd9d4ff, form a cage
  1.3× the top's radius. They retract one by one as the 3 s runs, so the timer is readable without text.
  This replaces the stretched torus aura.
- **On a save:** that rim segment flashes the seal colour, sparks scatter along the rim tangent, and a
  "WARDED" mini-stamp appears.
- **End:** the ribs shatter into a few glints.

**Sound** (`playWard`, new):
- cast: a shimmer (bandpass noise sweep 1→6 kHz over 0.4 s, plus a triangle at 880 Hz);
- held: a low hum under it;
- save: a bell "dong" (220 Hz plus a 2.76× partial, 1.2 s decay);
- end: a descending glassy three-note figure.

---

## 5. Suggested order (about 9-11 days for everything; the first 5 days give most of the effect)

1. Day 1: item 3 (tell flash fix) and item 16 (flash budget); item 12 (seal fixes) and a re-run of
   `report:shaping`.
2. Days 2-3: item 1 (impact tiers) and item 2 (finish sequences, with the `FinishStamp` class).
3. Day 4: item 4 (round framing) and item 13 (rip release).
4. Day 5: item 5 (match bar) and item 6 (team rings and trails).
5. Days 6-7: item 7 (strike staging and the seal visuals and sounds from section 4) and item 8 (audio
   layering and music).
6. Then items 9, 10, 14, 15 and 11 by available time. Items 17 and 18 wait for the headset.

Every item keeps the sim's results unchanged, except item 12 and the seal mechanics in section 4. After
any change in `sim.ts`, run `npm run check:sim`, `report:shaping`, `report:arenas` and `report:tops`.

## Sources

- Sakurai on hitstop (Famitsu vol. 490, translated): https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/
- SmashWiki, Hitlag: https://www.ssbwiki.com/Hitlag
- critpoints, hitstop/hitfreeze/hitlag: https://critpoints.net/2017/05/17/hitstophitfreezehitlaghitpausehitshit/
- IEICE technical report (Mar 15, 2023) on hit-stop and slow-motion durations: https://ken.ieice.org/ken/paper/20230315OCSt/eng/
- SmashWiki, Finish Zoom: https://www.ssbwiki.com/Finish_Zoom
- EventHubs, SF5 Arcade Edition KO sequence: https://www.eventhubs.com/news/2017/oct/17/all-new-critical-art-ko-sequence-spotted-street-fighter-5-arcade-edition
- Meta Horizon comfort guidelines: https://developers.meta.com/horizon/design/comfort/
- W3C WCAG 2.3.1, Three Flashes or Below Threshold: https://www.w3.org/WAI/WCAG20/Understanding/three-flashes-or-below-threshold
- Beyblade (launch call and "Rip" window): https://www.Wikipedia.com/wiki/Beyblade
- Takara Tomy, Beyblade X Start Dash Guide (finish types): https://www.takaratomyasia.com/documents/beybladex/1705650582_Beyblade%20X_Start%20Dash%20Guide.pdf
- Rocket League goal explosions overview: https://srand.publisher-collective.com/news/rocket-league-goal-explosions
- Game Developer, enemy attacks and telegraphing: https://gamedeveloper.com/design/enemy-attacks-and-telegraphing
- Game Developer, adding weight: anticipation: https://gamedeveloper.com/design/adding-weight-to-your-game-design-part-2-anticipation
- Marvel vs Capcom 3 red health: https://srk.shib.live/w/Marvel_vs_Capcom_3/Game_Elements/Red_Health
- Dragon Ball FighterZ health: https://dragonballfighterz.fandom.com/wiki/Health
- "Juice it or lose it" and "The Art of Screenshake" summary: https://rpgplayground.com/research-making-a-juicy-game/
- Kenney, must-see videos for indie developers: https://kenney.nl/learn/must-see-videos-for-indie-developers
- Road to VR, Inside XR Design, Beat Saber: https://roadtovr.com/beat-saber-instructed-motion-until-you-fall-inside-xr-design/
- Voices of VR #88, SUPERHOT VR: https://voicesofvr.com/?p=821
- MDN, web audio spatialization basics: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Web_audio_spatialization_basics
