# SpinSmith: the duel layer

Oct 7, 2026; built the same night (status at the end). What fighting games teach a spinning-top fight played with bare hands at a
real table, cut to what fits before the Nov 6 freeze.

## The problem

`FIGHT-INTERACTION.md` measured it: the player watches most of a round. Ramp on pinch cut the
untouched ramps from 76% to 30%, but a 13-16 s round still holds only 2-5 player moves. Fighting
games hold a decision every second or two: close in or wait, spend the bar or keep it, read the
opponent. The duel layer adds those decisions without frame-tight timing (hand input lags about
0.6 s) and without new gestures (pinch, press and pull-release are enough).

## What we take, and what it becomes here

| Fighting games | Why it works | SpinSmith |
|---|---|---|
| Super bar (SF Super Art, Tekken Rage Art) | A resource that builds while fighting; a big spend decision | A separate forge bar is filled by hard clashes and successful arena hits. A ramp or cup costs one of three shaping charges; a full forge bar arms the ultimate. The bar glows on the back of your hand. |
| The super move | A rare, cinematic, round-turning moment | **Anvil Strike**: with a full bar, press your palm on the table beside the arena (the press-to-place detector). A shockwave runs from your hand through the floor; tops are thrown outward, the hotter the further. |
| Smash's damage percent | The more you are hit, the further you fly | **Hot metal**: the sim's existing burst `damage` drives a red glow, and knockback (walls, pits, the strike) scales with it. No new state. The name is not "heat": heat is the score. |
| Reads and tells | Mind games, not reflexes | **Rival tells**: each rival gets one big move, telegraphed by a 1 s glow and sound. You choose: cup your own top to brace, or strike first. A decision, not a reflex. |
| Comeback (Tekken Rage) | Hope for the one behind | Below 30% spin, the bar fills twice as fast. |
| Hitstop and juice | Hits that are felt | 40-80 ms freeze of the tops (never the head) on a hard clash; sparks, the room flash (exists), a heavier clang. |
| Combos | Turning an opening into damage | Later: a counter for ramp → cup → sling chains ("3 HIT"). Built from set-ups in space, not input strings. |

## Corrections to the first proposal

1. **No table, still a strike.** On the tray (no Space Setup) the press is accepted at the hand's
   own height, as `TableTouch` already does. The core verb never depends on a table plane.
2. **Off the desk scores no heat.** A top thrown off the real table is a visual and XP moment
   (`TABLE-INTERACTION.md`), never points: Space Setup outlines can be off by a few cm.
3. **Teaching load.** A judge has about ten minutes and already learns the rip, ramp, cup, sling
   and the forge. The strike is prompted the first time ("Bar full: press the table!"); tells come
   from the second rival on; combos only after the freeze.
4. **Estimate.** 5 days for the cut below, not the full table above.

## Not taken

Input strings (quarter-circle + punch), frame-exact timing, a held block, new gestures, loot
boxes, currencies, streak punishment.

## Plan

1. **Sim first (1.5 days).** `ShapingCharges` gets 3 segments and fill sources; `damage` scales
   knockback; `Arena.strike(x, z, power)` (radial impulse through the floor). `report:shaping`
   gets a "human with strike" policy (lag 0.6 s, strikes when the bar is full and the rival is
   hot or near a pit). Gates, else the idea changes before any visuals:
   - good timing beats the masher by at least 12 points of win rate;
   - median round 13-20 s;
   - the player behind on spin comes back in 20-30% of rounds;
   - own knockouts from the strike at most 10%.
2. **In play (2 days).** The palm press during a fight (outside the arena's rim, full bar),
   shockwave visuals and sound, the bar on the hand, the hot-metal glow, hitstop, the first-time
   prompt, `[STRIKE]` dev logs and a dev key.
3. **Rival tells (1.5 days).** One telegraphed big move per rival style (dash, pull, ramp), its
   glow and sound; a rival row in the report.
4. **Choose your strike, and more parts (3-4 days, after step 2 works).**
   - A new forge drawer, the **seal**: the strike engraved on your top, unlocked by level.
     Anvil Strike (shockwave, the first), Quench (refills your own spin), Rush (your top dashes
     at the rival), Magnet (pulls the rival toward a slag pit). Three before the freeze, all with
     the same palm press; each balanced in the report so none is always best.
   - No market and no currency. Variety comes from play: the first knockout of a rival gives
     its signature part (beat Hookjaw, take the Hook ring); 4-6 new parts tied to strikes and
     rivals (`report:tops` balance); a weekly order that gives a rare part.
5. **After the freeze.** Combo counter, part-specific strikes, rival memory (Nemesis-style),
   multiplayer.

## Device checks (when the headset arrives)

20 strikes during a fight, at least 19 detected; 0 strikes from a hand resting on the table
between moves (the press needs the bar full and a come-down first); the shockwave reads from the
seat; hitstop never makes a head turn feel stuck.

## Status (Oct 7-8)

Built and in the repo, measured with `npm run report:shaping` (rows "masher + strike" onward):

- The forge bar is **separate from the shaping charges** (now three): sharing one bar made the
  strike cost three ramps and it never paid. It fills from solid clashes (0.07 each) and in 30 s
  on its own, three times as fast while your top is below 70% of the rival's spin.
- Oct 14 arena-dominance pass: a rival touching your authored terrain refunds a charge and adds
  forge heat; the first fight chains ramp → cup → ultimate; every seal leaves a physical terrain
  consequence (or, for Tilt, tips the complete dish for three seconds).
- **Hot metal scales only the strike**, not clashes: scaling clashes too tipped the type loop
  (stamina beat defense only 49%).
- The strike is felt by `n²` (n = distance to the rim, 0..1): a top in the middle barely moves,
  so when you strike matters; your own top takes 60%.
- **Seals:** Anvil, Tilt (Lv 3), Rush (Lv 4), Ward (Lv 5, a parry since gameplay round 2), Magnet
  (Lv 7), Hammer (Lv 9), within 3 points of the Anvil in `report:shaping`. A Quench
  (spin refill) was cut: even a 0.05 refill decided spin finishes (65% win).
- **Rival tells:** charge (Rim Raider, Hookjaw, Sawtooth), quake (Iron Keep, Bastion), pull
  (Drifter, Leech), after the first match. A rival quench was cut for the same reason.
- **Signature parts:** a rival knocked out once gives its part; new Gale and Bulwark rings and
  the Spindle core (`report:tops`, no warnings).
- After the duel review: the bar starts each round a third full (a fifth since gameplay round 2) and fills on its own in 24 s
  (it filled in only a third of rounds before, too late to matter); the strike starts from the
  palm's spot on the rim (a top near your hand goes to the middle, one across the arena out); it
  lands 1.6x harder while you are behind; a hard slap, armed half a second after the bar fills,
  so a resting hand never strikes; the Rush is braced.
- Final `npm run report:shaping` (12 rounds per pair, 15 arenas): masher + strike 49%; human +
  Anvil 64% (+15, gate met), median 12.8 s (just under 13), comeback 8% (gate missed: the
  measure is noisy, 0-22% across nearby settings, and rounds that fall far behind rarely turn);
  Rush 60%, Magnet 63%; against a charging rival 62% with the strike, 43% without.
- `npm run report:arenas`: no warnings on any of the fifteen arenas (KO 16-53%, medians 15-22 s).
- After the full evaluation (`docs/reviews/FULL-EVALUATION.md`): the player's ramp is a little
  taller and wider (0.065 high, sigma 0.052), Ember Ring's embers start at 19 s and Sumo Square
  is wider. `report:shaping` now: masher 48%, human ramp 58%, ramp + cup 60% (median 14.7 s),
  Anvil 64% against masher + strike 49% (+15), median 12.5 s; Rush 62%, Magnet 65%. Comeback
  stays at 0-5%, so the docs no longer promise one. `report:arenas`: no warnings (Ember Ring
  Striker 68% / Halo 47%, Sumo Square 60% / 40%). `report:tops`: 226 builds, parts 44-55%, no
  warnings (Gale 50%, Cog 48%).
- Not built: combo counter, rival memory, the weekly rare-part order. Needs the headset: the slap
  thresholds (`?slapDown=` etc.) and whether a tracking jump can look like a slap.
- Six seals after the polish pass (Oct 8, `report:shaping`, 12 rounds per pair): Anvil 64%, Rush
  62%, Magnet 65%, Tilt 63% (the arena dips toward the palm for 1.6 s; your own top holds), Hammer
  63% (the next solid clash cracks three times as hard, at least 0.22), Ward 61% (3 s: no knockout,
  half the knockback, braced against quakes and pulls); masher + strike 49%.
