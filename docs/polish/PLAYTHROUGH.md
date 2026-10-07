# SpinSmith playthrough audit (IWER emulator, 2026-10-08)

Played as a first-time player (`fresh`: place, hub, play, rip, ramp, three rounds, `k` to finish, level-up and
unlock reveals, forge: fit Spur tip, quench, rematch) and as a returning player (`demo`: level-8 hub, order
board, match with rip and strike via `j` + `slap`, workshop). Screenshots are in `docs/polish/shots/`
(NN-name.png). Clips: `clip1-rip-strike.mp4`, `clip2-strike.mp4` (captured in the emulator).

Caveats:
- The grey low-poly room is the emulator's room, not the game. The coloured axis gizmos and "Hand [L]/[R]"
  panels in some shots belong to the emulator UI. Neither is listed as an issue.
- Another session was editing `src/` during the run, so Vite hot reloads threw me back to the landing page about
  8 times (`20-forge-fitted` first attempt, `32-board-close`). Because of that, the cup and sling clip and the
  close-up of the order board were not captured. One `TEAM_MINE is not defined` error showed up in the console
  during the same edits. It is probably a half-finished edit, but re-check it.
- The arena "floats" because the emulator has no table plane ("No table found: the arena floats here").

## Ranked issues (worst first)

### 1. The workshop UI is a pile of overlapping, clipped controls. Shot: `33-workshop.png`
The brass piece rail runs straight through the arena and covers the BACK and TRY buttons, which are themselves cut
off ("BAC", "RY"). SAVE overlaps a piece model. On the category strip, "BOOST PAD" runs past the edge of its bar.
The fifth tab on the right is clipped ("AI..."). The stats card ("MY ARENA") text is unreadably small. It looks
like a debug layout.
**Fix:** lay the workshop out on two planes: the tab row and piece strip on one curved shelf below the arena, and
BACK / TRY / SAVE as a separate row behind it that nothing covers. Size the strip to fit its labels, or let it
scroll. Fit the tab count to the width.
**File:** `src/game/match-system.ts` (build phase) and the workshop/hub layout in `src/game/hub.ts` / `src/game/ui.ts`.

### 2. A burst of reveals after the first win, all crammed into the label panel, and the 3D part clips into the panels. Shots: `14-match-result.png`, `15-unlock-new.png`
After the first win, six messages cycle through one small text panel in about 3 s: "You win the match!",
"LEVEL 2! Apprentice", "NEW! Clamp core", "NEW! Spur tip", "NEW! Zero-G Dish arena", "NEW! Titan Crater arena".
The revealed part model (a big red core) is drawn straight through the label and scoreboard (`15`). There is no
pause, no sound or fanfare in the frame, and no "tap to continue". A first-time player cannot read it.
**Fix:** use a dedicated reward sequence. Clear the arena and show one unlock at a time on a turntable above the
arena, in its own space below the label. Make it hold until the player taps or pinches, then group the rest
("+2 arenas unlocked"). Make the level-up its own beat with a different panel style.
**File:** `src/game/match-system.ts` (result / unlock queue), `src/game/progress.ts`.

### 3. "Rematch" and "Next match" name the wrong rival (bug). Shots: `23-after-quench.png`, `24-rematch-ready.png`, `30-demo-hub.png`
After the forge the hub says "Your top is ready / Put it in the arena for a rematch", and the state rival is
Rim Raider. Tapping play then starts **Iron Keep**. In the demo save, the level card says "Next match: Rim Raider
in Forge Bowl", but the match is again against Iron Keep. The promise of a rematch after forging, which is the
core loop beat, is broken.
**Fix:** decide the next rival once and use that one stored value for the hub text and for `startMatch()`.
After a first-session forge, rematch the rival you just played (Drifter).
**File:** `src/game/match-system.ts` (`startMatch`, the hub "next" text), `src/game/progress.ts`.

### 4. The forge gives almost no in-world guidance or feedback. Shots: `18-forge-open.png`, `19-forge-close.png`, `21-forge-spur-fitted.png`
The hub said "New part: Spur tip! Pinch the small anvil to forge". But inside the forge the label panel is
**empty**: nothing says "drag the Spur tip onto your top". The new part is not highlighted. "Spur fitted:
Aggressive, steers better" and "Drop your top in the quench slot to save" appear only in the console
(`[FORGE]`) and as tiny text on the stats card, half hidden behind the top. The quench slot (the black octagon on
the right) has no label.
**Fix:** reuse the main label panel in the forge for the step prompt ("Drag Spur onto your top" → "Fitted!
Drop it in the quench"). Pulse or glow the new part and the quench slot. Move the stats card above the top so
nothing covers it.
**File:** `src/game/forge.ts`, `src/game/match-system.ts` (forge phase label).

### 5. All forge parts look like the same beige cogs, piled on top of each other. Shots: `18-forge-open.png`, `20-forge-fitted.png`
The tip drawer shows six nearly identical cream gears that overlap each other and the anvil. The ring drawer is a
cluster of grey discs. There are no names and no stat chips, so you cannot tell Chisel from Spur without touching
them. This reads as placeholder art.
**Fix:** show each part as its actual mesh on a small labelled plinth or tray slot, spaced on an arc. Add a
one-word role tag (ATTACK / GRIP...) and mark the new part with a "NEW" badge.
**File:** `src/game/forge.ts` (drawer layout), `src/game/parts.ts`.

### 6. The first match teaches the ramp too late and ends rounds before you learn anything. Shots: `07-fight-start.png`, `08-fight-ramp-prompt.png`, `10-round2-fight.png`
Round 1 ended in 2.8 s ("SLAG! You +2 heat") before any instruction. The ramp prompt only appeared in round 2.
Between rounds the label is **empty** in the ready phase (`09`, `12`), so there is no "rip again" prompt. The
round result shows for under 2 s and was gone before I could capture it.
**Fix:** for match 1, keep the rival away from the slag (or use a gentler AI) until the ramp has been used once.
Always show a ready prompt ("Rip again: round 2 of 3"). Hold round results for at least 2.5 s with a clear
"Round 2" card.
**File:** `src/game/match-system.ts` (guide steps `launch` / `bump` / `match`, `toReady`).

### 7. The scoreboard is tiny and its words overlap. Shots: `09-scoreboard-close.png`, `13-shatter.png`
Even from about 30 cm away, "YOU / READY / DRIFTER", the heat pips and "+2 heat" are a few pixels high. A
marker overlaps the word "READY". At the end, the "You win the match" text is drawn over the bars at about 5 px.
**Fix:** make the scoreboard about 2x bigger with fewer elements: two names, two large heat counters and a
state word. Drop the duplicate text that is already in the label.
**File:** `src/game/ui.ts` (scoreboard), `src/game/visuals.ts`.

### 8. Level-up has no presence, and the level card is half empty. Shots: `14-match-result.png`, `22-quench.png`, `23-after-quench.png`
"LEVEL 2! Apprentice" uses the same panel as every hint, and the rank was already Apprentice at Lv 1, so nothing
visibly changes. After the forge, the Lv 2 card has an empty bottom half (no "Next:" line) and an XP bar with no
numbers.
**Fix:** give the level-up its own burst (bigger type, a ring sweep, a sound). Show XP as "120 / 300". Always fill
the card's second row (the next unlock or the next match).
**File:** `src/game/hub.ts` (level card), `src/game/progress.ts`.

### 9. Hub labels are floating flat text, and they are inconsistent. Shots: `02-hub-first.png`, `16-after-unlock.png`, `30-demo-hub.png`
PLAY, COMFORT and FORGE are large white flat letters floating at odd angles with no backing. "BUILD" is smaller
and off-axis, and the same place is called "workshop" elsewhere. The demo hub drops all of these labels. The
COMFORT orange coin and the coin under the level card (reset) are not explained.
**Fix:** use one label style: a small engraved brass plate on each prop's base, always shown, facing the player.
Pick one name, either "Workshop" or "Build". Label the reset coin or fold it into the Menu.
**File:** `src/game/hub.ts`.

### 10. The label panel's type hierarchy flips. Shots: `05-after-play.png`, `06-ready-instruction.png`, `10-round2-fight.png`
Sometimes line 1 is the big headline ("Rival: Drifter..."). Sometimes it shrinks below line 2, because long text
auto-fits ("Pinch over the arena where you want to launch" is smaller than "pull back and let go"). It looks
unstable.
**Fix:** fix the headline size, keep it short (<= 28 chars), and put the long text in line 2.
**File:** `src/game/ui.ts`.

### 11. Rival and arena intros are jargon. Shots: `05-after-play.png`, `24-rematch-ready.png`
"Rival: Drifter · stamina drifter" repeats the name in lower case. "Balanced bowl: four slag pits, four kick
rails" uses terms never explained, and the slag pits are not visible on the floor in the shot. "Iron Keep · heavy
center holder · quakes the floor" is three tags in a row.
**Fix:** use a rival intro card with a portrait or top model and one plain sentence ("Drifter: hard to knock
out, outlasts you"). Highlight the pits and rails on the floor for 1 s while their names show.
**File:** `src/game/match-system.ts` (ready label), rival data in `src/game/progress.ts` / `sim.ts`.

### 12. Contradicting text right after a strike. Clip: `clip2-strike.mp4` (frame at 2 s)
Right after a successful strike, the label shows "Iron Keep winds up a quake! / Fill your bar to stop it next
time", which implies the strike didn't count. The strike's own feedback is weak in the frame.
**Fix:** do not show the "fill your bar" hint when the bar was just spent. Instead, show "Strike! Quake broken"
or a stun state. Add a big shockwave ring, a camera-space flash and a hit-stop of about 80 ms on the strike.
**File:** `src/game/match-system.ts` (`doStrike`, rival move labels).

### 13. The ramp doesn't read as a ramp, and "the ring" is ambiguous. Shots: `10-round2-fight.png`, `11-ramp.png`
The prompt says "Pinch the floor at the ring", but the floor has several rings and none is highlighted. The ramp
shows as a flat orange glow smear under the hand, not a raised wedge.
**Fix:** pulse the exact pinch ring during the prompt. Give the ramp a lit raised edge or a wedge mesh and an
arrow.
**File:** `src/game/shaping.ts`, `src/game/visuals.ts`.

### 14. The quench is an instant cut back to the hub. Shots: `21-forge-spur-fitted.png` → `22-quench.png`
Dropping the top in the quench jumps straight to the hub with no steam, hiss or cool-down glow. This is the
"save" moment of the core loop.
**Fix:** play 1 s of steam, a colour cool-down on the top and a "Saved: Striker Bolt Spur" stamp before the
transition.
**File:** `src/game/forge.ts`.

### 15. Each reload drops you back to "Press your table", and the first prompt is unclear. Shots: `01-placing.png`, `17-hub-notable.png`
"Press your table / palm down, here: the arena rises" waits 8 s and then places anyway. When there is no table,
the hub label is replaced by "No table found: the arena floats here / Move it by its brass handle", and the
pending guide prompt ("New part: Spur tip!...") only comes back later. The press target is a small orange ring
far away.
**Fix:** show a countdown or progress ring on the press target. Show the no-table notice as a small sub-line,
not over the guide prompt.
**File:** `src/game/match-system.ts` (placing, `PRESS_WAIT`).

### 16. The order board floats in mid-air with tiny text. Shot: `30-demo-hub.png`, `31-board.png`
"SMITH ORDER · 2026-10-08 / Beat Rim Raider without giving up heat" is a dense card hanging in space. The rival
chips (WON, DRIFTER, LEECH, HOOKJAW, LV 8, LV 10) and the "streak" dots are tiny. The hand passes through it.
**Fix:** mount it on a post or wall rail. Use larger type and fewer chips.
**File:** `src/game/hub.ts` (order board).

### 17. Smaller notes
- The docked tops in the demo hub (left side, `30`) have no names. You cannot tell which is the champion and
  which is the current top.
- The Menu button floats at the left edge in every fight, tilted and partly outside the comfortable view (`06`).
- The fit in the forge was lost on the reload before quench, but the guide had already advanced to "rematch"
  (`20-forge-fitted` second attempt). Check that the guide only advances on quench.
- The landing page (`00-landing.png`) looks clean. "HEATING THE FORGE..." on load is a nice touch.

## Bugs summary
1. Rematch / next-match rival mismatch (issue 3).
2. A burst of 4 unlocks plus a level-up in one go. The reveal mesh clips through the panels (issue 2).
3. The guide step may advance before the fit is saved (issue 17).
4. The "Fill your bar to stop it" hint shows right after a strike (issue 12).
5. A `TEAM_MINE is not defined` console error during the forge (probably caused by a concurrent edit).
