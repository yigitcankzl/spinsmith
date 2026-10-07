# SpinSmith: the duel layer

Draft, Oct 7, 2026. What fighting games teach a spinning-top fight played with bare hands at a
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
| Super bar (SF Super Art, Tekken Rage Art) | A resource that builds while fighting; a big spend decision | The two shaping charges become a **3-segment forge bar**, filled by hard clashes, ramps that hit and slings. A ramp or cup costs 1; a full bar is the strike. The bar glows on the back of your hand. |
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
