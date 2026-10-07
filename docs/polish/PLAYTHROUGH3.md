# SpinSmith playthrough audit 3: the new features (IWER emulator, 2026-10-08)

Scope: the features from DONE2.md, played as a demanding VR player and as a competition judge.
- Fresh save (`fresh`): first session, the ghost hand, the rival's portal entrance, the first win (ramp knockout replay, heat wave, rewards), home, the forge (fit Spur, quench).
- Demo save (`demo`, level 8): Leech match (portal, KeyJ + slap, molten handprint, pinch rings, hand marks), the Menu double pinch, the comfort dial up to Assist and a match in Assist, the challenge code `23F-6` played to a 4-0 win (replay, heat wave, match report at home).
- A circuit champion's entrance (Iron Keep). The ladder's next rival was Leech, so I set `nextRival` to Iron Keep once from a throwaway page script. No source files were edited.

Shots: `docs/polish/shots3/NN-name.png`. Most of them are frames from the clips, so they show what the player sees, without the emulator's gizmos. Frame grids are `04`, `19`, `20`, `21`, `22`, `25`.
Clips (captured in the emulator):
- `clip1-fresh-play-portal-ghost.mp4` (8 s): first Play, the portal, VS DRIFTER, the rip ghost
- `clip2-ramp-knockout-replay.mp4` (15 s): rip, ramp, SHATTER, heat wave, REPLAY with the turntable, the reward stamps
- `clip3-forge-quench.mp4` (7.5 s): drag the top to the quench, cold wash, FORGED
- `clip4-portal-strike-handprint.mp4` (17 s): level-8 portal, rip, full bar, palm slap, ANVIL STRIKE, the handprint cooling
- `clip5-challenge-win-heatwave-home.mp4` (about 12 s): challenge round 1, a ramp knockout and its replay
- `clip6-challenge-finish-heatwave-report.mp4` (20 s): the winning round, the heat wave, the replay, the unlock, home with the match report
- `clip7-champion-entrance.mp4` (about 6 s): Iron Keep's giant entrance

Caveats: the grey room, the floating arena (there is no table) and the outline hands come from the emulator. The driver leaves the hand where the last move ended, so in several clips a hand lies on the arena during the replay. That is a driver artefact. On a Quest the player would move the hand away.

Console: `scripts/emu.sh logs 200 | grep -i error` is empty. The last 200 console entries are all `log` level: no errors and no warnings.

Fixed since PLAYTHROUGH2 (verified): the guide waits for the quench (`guide` stays `fit` until the quench). Menu needs a second pinch within 3 s. Between rounds the card says "Rip again / Leech opposite spin: steals yours" and is no longer blank. At home after a win, the level card shows "Next: a new paint at Lv 9 / Next match: ..." (demo save).

---

## Ranked issues (worst first)

### 1. Pinching Menu also grabs your top's ripcord. The "Leave this match?" prompt is never readable. Shot `13`, log
In the ready phase, the first pinch on Menu arms "Leave?". In the same frame, `updateReadyPinch()` takes the pinch as a rip: a cord line runs from the Menu button to your top, and the card immediately changes to "Pull back and let go". Letting go then re-stamps MATCH POINT. The label "Leave this match? / Pinch Menu again to go home" is overwritten in the frame it appears, so the only cue left is the tiny button text "Leave?". If the second pinch comes more than 3 s later (natural for a player who is reading), it arms again instead of leaving. From the CLI, two pinches 4 s apart never left the match.
**Fix:** when `pickButton` returns `menu`, consume the pinch (`break` before `updateReadyPinch`, or mark the hand's pinch as used). Keep the confirm on the label until it expires. Show a short ring timer on the button so the player can see the 3 s window.
**File:** `src/game/match-system.ts` around line 828 (the menu block in `ready`). Check the same in `pulling` and `fight`.

### 2. The knockout replay is buried under reward stamps and reads as "the match restarted". Shots `19`, `20`; clips 2 and 6, 7-12 s
The replay lasts about 5 s (240 steps at 0.4x). Its REPLAY stamp lasts 0.8 s. Then LEVEL 2!, NEW BEST!, FEAT! and NEW: Clamp core stamp over it, while the label still says "You win the match!". After the REPLAY tag is gone, a judge sees two whole tops spinning again after a win, including the top that just shattered, and thinks a new round started. The turntable turn (up to 120° at 26°/s) does show (the rim handles sweep round), but with a fixed head it looks like the arena drifting, not like a camera move.
**Fix:**
- While `replay` is active, hold every `stamp.later` and unlock card until the replay ends. Pinch-to-skip should release them.
- Keep a small persistent "REPLAY · 0.4x" chip (corner of the scoreboard) for the whole replay. Tint or desaturate the stand-in tops (the ghost tops, `this.ghosts`) so they read as a recording.
- Start the turn with a short ease and add a visible rotating tick ring on the pedestal, so the turn reads as deliberate.
**File:** `src/game/match-system.ts` (`startReplay`, `playReplay`, `stamp.later` queue), `src/game/visuals.ts` (Stamp).

### 3. The rival's portal is off to the upper right, half outside the seated view, and too plain to be a moment. Shots `02`, `08`, `22`; clips 1 and 4, 0.8-3 s
The portal is placed at `px = 0.24, y = 0.16` behind the far rim, "clear of the card". With the seated head pose it sits in the top-right corner of the view. At level 8 (`08`) it is cut by the frame edge. On a Quest it would be peripheral. It is a flat cyan ring on a dark disc with no swirl, depth, light or sound build-up. The top pops out with a few thin sparks. The cyan ring "rotates", but a uniform ring shows no rotation.
**Fix:**
- Put the portal on the arena's axis, behind the far rim and low (just above the rim). Move the rival card up or fade it until the landing, instead of moving the portal aside.
- Give it a swirl texture (reuse the vortex canvas texture from `visuals.ts`), an additive inner glow that lights the far rim, and a rising whoosh with a thump on the landing.
- Open it 0.3 s before the top appears, with ember spill.
**File:** `src/game/match-system.ts` `updateEntrance` (lines 1266-1318).

### 4. The rival's landing spot is given away: its cyan team ring and contact shadow sit in the arena before the top arrives. Shot `14`
While the top is still inside the portal (`u < 0`), only `theirView.root` is hidden. The cyan team ring and the dark shadow are already on the far spot, so the arc lands on a marker that was already there and the arrival loses its surprise.
**Fix:** hide the team ring and `shadowMesh` until touchdown, then pop the ring in with the landing spark ring.
**File:** `src/game/match-system.ts` `updateEntrance` (the `u < 0` branch).

### 5. The molten handprint reads as a UI icon, the same shape as the "slap here" target. Shots `10`, `11`; clip 4, 11-17 s
The print is a flat, crisp, cartoon palm silhouette in solid yellow, then orange, then red. It has the same outline as the yellow slap-prompt icon in the same spot, so after a strike it looks like the game is asking for another slap. It never becomes a scorch: the final colour is RGB (1, 0.12, 0.02) at 25% opacity, a faint red, not a dark burn. In the next round the old red print sits under the new yellow slap target (`clip4` and the `shadow` test).
**Fix:**
- Use a different texture from the prompt: a soft-edged, slightly smeared palm with finger gaps, and an emissive core with a dark rim. Add 2-3 s of heat shimmer and a few rising embers.
- Cool it to a dark brown-black scorch (normal blending, multiply-like) at about 40% opacity.
- Place it under the actual palm position at impact, not at the prompt's centre.
- Hide the slap target while a print is under 2 s old, or offset the new target.
**File:** `src/game/match-system.ts` `printPalm` / `updatePrints` (1379-1402), and the palm texture in `visuals.ts`.

### 6. The strike's seal medallion still cuts into the ANVIL STRIKE! stamp. Shot `10`
A dark disc with an orange glyph overlaps the "A" of ANVIL STRIKE! This is PLAYTHROUGH2 #7 and it is still not fixed.
**Fix:** draw the stamp with `depthTest: false` and a higher `renderOrder`, or raise the seal above the stamp. The best option is to sequence them: the seal rises (0.4 s), then the name is stamped.
**File:** `src/game/match-system.ts` (`sealPop`), `src/game/visuals.ts` (Stamp).

### 7. The hand shadows and the strike-ready glow on the arena are not visible. Shot `24`; `/tmp` test with the left hand 0-4 cm over the floor, bar full
I held a hand 0-4 cm over the arena floor with the bar at 100% in `fight`. I could not see a shadow or an orange glow in any frame. The mark is 3-6 cm wide, at 25% black opacity, straight below the hand. From the seated eye it is hidden by the hand itself.
**Fix:**
- Project the shadow along the light direction (from the far upper light), so it falls 2-4 cm beside the hand, toward the player.
- Make it about 1.5x the palm size, with 40-50% opacity near contact.
- For the hot state, use an additive orange disc that pulses with the bar.
- Also hide the mark while `replay` is active.
**File:** `src/game/match-system.ts` `updateHandMarks`.

### 8. The quench still cuts away before the moment, and the cold wash happens at home. Shot `21`; clip 3
Dropping the top on the quench slot snaps the top back onto the anvil, the forge collapses, and home appears with a faint grey-blue tint and FORGED!. There is no dunk into the slot, no steam, and no orange-to-steel cool-down on the top. The "steam" is three orange spark bursts. In the emulator the blue wash is barely noticeable.
**Fix:** in the forge, before `leaveForge`:
1. Lower the top into the slot (0.3 s).
2. Add a white steam puff (a soft additive sprite column) and the hiss.
3. Lerp the top's emissive from orange to none (0.6 s).
4. Lift it out.
5. Then go home with the wash at about 2x its current strength.

**File:** `src/game/forge.ts` (`save`), `src/game/match-system.ts` `leaveForge`, `src/game/room-light.ts` (`quench`).

### 9. The champion's entrance happens out of view and passes behind the HUD. Shots `17`, `18`, `25`; clip 7
Iron Keep comes out at 3.5x scale, but the portal is smaller than the top, so it does not look like it came through. The biggest part of the arc is above the seated view (frame `17` has only the portal). Near the landing it passes behind the rival card and the scoreboard (`18`). The sub-line "Cinder Circuit · CHAMPION" is tiny.
**Fix:**
- Scale the portal with `champion` (2.5x), centre it, and run the arc low over the arena so it stays in view.
- Hide the card and the scoreboard during the arc.
- Add a floor shake, a low brass sting, and a gold "CHAMPION" plate under VS.

**File:** `src/game/match-system.ts` `updateEntrance`, the VS stamp.

### 10. A drawn first round replays the whole match intro. Log ("Draw / Replay the round" → "Leech, the Spin Thief / quote")
`toReady` starts the entrance and the intro card whenever the score is 0-0. After a 0-0 draw (17.4 s against Leech), the rival's name and quote came back, and the portal entrance runs again by the same code path.
**Fix:** start the entrance on a `matchStart` flag, set in `startMatch` and cleared after the first `toReady`, not on `myPoints === 0 && theirPoints === 0`.
**File:** `src/game/match-system.ts` around line 2010.

### 11. The win sequence is long and stacked: about 14 s from the knockout to home, with up to 6 stamps. Clips 2 and 6
First win: SHATTER! → REPLAY → LEVEL 2! → NEW BEST! (Fastest knockout 4.0 s, in the first match ever, so there was no record to beat) → FEAT! → four "NEW:" labels (Spur tip, Clamp core, Zero-G Dish arena, Titan Crater arena) → the match report → "New part: Spur tip! Pinch the small anvil". The match report then shows for about 2 s before the forge prompt replaces it (`07` has no report).
**Fix:**
- Suppress NEW BEST on a first record.
- Show at most one unlock card on the arena and send the rest to the level card as "+3 more".
- Show the match report on the level card until the next match (it already has a "Next match" line), not on the transient label.

**File:** `src/game/match-system.ts` (result queue), `src/game/hub.ts` (level card).

### 12. Challenge codes: sharing your own code is a 5 px line, and a friend's paint is ignored. Shot `23`
The challenge itself works: `23F-6` gave "Challenger, code 23F-6 / Your friend forged me. Beat me.", VS CHALLENGER, a full match, and "Challenger: Tell them you won." The problems:
- Your own code exists only as an orange footnote on the order board: "Challenge a friend: ?vs=U6-6 on their address fights your top". It is unreadable at arm's length.
- The win does not show the code to send back.
- The decoded paint is replaced by `OPPONENT_COLOR`.
- The rival tip "Read its parts in the intro" points at an intro that does not list the parts.
- The match report label covers the board's rival chips (`16`, `23`).

**Fix:**
- Add a "YOUR CODE U6-6" plate on the dock (or the level card) in large type.
- After a challenge win, stamp "BEAT 23F-6 · send U6-6 back".
- Keep the friend's paint, or tint only the team ring.
- Put the challenger's parts (ring / core / tip) in the intro line 2.
- Lift the report label clear of the board.

**Files:** `src/game/hub.ts`, `src/game/board.ts`, `src/game/match-system.ts` `challenger()`.

### 13. Assist mode is hidden and bundled. Log
- Assist is the 5th dial stop (four pinches from Standard). Each pinch changes sound or flashes on the way.
- It forces "calm" (no flashes, press-to-strike), so a player who only wants more time loses the slap.
- Nothing in a match shows that Assist is on.
- Only the sim accumulator is slowed (`match-system.ts:2763`). Tells, label timers and the replay run in real time.
- The comment in `comfort.ts` still says "four modes".

**Fix:** make Assist a separate toggle (or a second dial). Show an "ASSIST 80%" chip on the scoreboard. Scale tell wind-ups and the cup hold by the same factor.
**Files:** `src/game/comfort.ts`, `src/game/match-system.ts`, `src/game/hub.ts`.

### 14. The pinch rings float beside the hand, not at the fingertips. Shots `09`, `12`
On both hands the ring sits 4-8 cm toward the thumb side, outside the hand outline (the left one is over the empty air beside the palm). In the emulator's relaxed pose, `h.pinch` is the midpoint of the thumb and index tips. It reads as a separate floating UI ring rather than "your fingers". The rings also show while the hand is far from anything pinchable.
**Fix:** anchor the ring at the index tip (or at 70% from the thumb toward the index). Show it only when a pinch target (top, floor, button) is within reach. Check on a Quest: real hand poses may land it correctly.
**File:** `src/game/match-system.ts` `updatePinchRings`.

### 15. The ghost hand is a 7 mm orb, not a hand. Shots `03`, `04`
For the first rip there is a white sphere with a yellow ring that dips and pulls toward the player. It reads, but it sits at the near rim over the orange rip arrows, and the "pull" motion (10 cm) is shorter than the drawn arrows. The ramp ghost drags only 3 cm (arena units), at the far side, while following a moving rival. At seated distance this is barely a twitch.
**Fix:** use a translucent hand mesh (the emulator or WebXR hand model in a ghost material), or at least two dots (thumb and index) that close together, so "pinch" is shown and not just a ring change. Lengthen the ramp drag to about 6-8 cm and freeze its anchor while it loops.
**Files:** `src/game/visuals.ts` `GhostHand`, `src/game/match-system.ts` `updateGuide`.

### 16. The heat wave is a thin horizontal line, not a wave of warmth. Shot `15`; clip 6, 5-7 s
The won match's ring of light crosses the room as a 1-2 px orange line at about eye height, plus a short orange floor flare. It looks like a horizon glitch and not like heat rolling past the player.
**Fix:** use a wide, soft, vertical gradient band (20-40 cm tall, additive) on an expanding cylinder, with a short warm tint on the room light behind it, and a soft whoosh as it passes the head.
**File:** `src/game/room-light.ts` `wave()`.

### 17. Smaller notes
- **Home plaques.** WORKSHOP is still drawn across the forge anvil, and the first-session level card is still half empty with a dark post through it (`07`; PLAYTHROUGH2 #4 and #17).
- **The forge label is still empty** in the forge phase. The step text is only on the stats card (PLAYTHROUGH2 #3).
- **The challenge win grants a progression unlock** ("NEW: Clamp core"). That is fine if intended, but it makes friend codes an XP farm.
- **Ramp pinch in `ready` becomes a rip.** A floor pinch made just after a round ended launched a 20% rip ("launch power 0.20") twice. It was found through the driver, but a real player who reaches for a ramp as the round ends will do the same. Ignore pinches in the first 0.4 s of `ready`, or require the pinch to start over your own top.
- **Shattered parts fly toward the camera.** In the first win a large black ring fragment lands in the lower-left foreground, half a metre from the player (`clip2`, 7.5 s). It is dramatic, but it hides the result stamp. Cap the debris velocity toward the head.
- **The arena switches** to a new arena (Ember Ring, then Clockwork Spire) after leaving or winning, with no announcement (PLAYTHROUGH2 #17).

---

## Wow vs. not yet

| Moment | Now | Verdict | To make it wow |
|---|---|---|---|
| Rival portal entrance | Flat cyan disc in the top-right corner, a small top arcs in, then VS | Not yet | Centre it low behind the far rim; swirl, light spill, sound; hide the landing ring until touchdown (#3, #4) |
| Champion entrance | A 3.5x top out of a small portal, mostly above the view | Close | Big portal, low arc in view, floor shake, gold CHAMPION plate (#9) |
| Knockout replay with turntable | The turn works, but 0.8 s of REPLAY tag, then reward stamps over it | Not yet | Hold the rewards, keep a REPLAY chip, tint the stand-ins (#2) |
| Molten handprint | A yellow/orange cartoon palm, same as the slap target | Not yet | A soft molten texture, shimmer and embers, a dark scorch (#5) |
| ANVIL STRIKE | Strong flash and stamp | Wow (still crowded) | Fix the seal overlap (#6) |
| Hand shadows / glow | Not visible | Not yet | Offset along the light, larger, stronger (#7) |
| Pinch rings | Visible, but beside the hand | OK | Anchor at the fingertip (#14) |
| Ghost hand | A small orb with a ring | OK for the rip, weak for the ramp | Ghost hand mesh or two closing dots (#15) |
| Quench | Cut to home, faint blue tint | Not yet | Dunk, steam, cool-down in the forge (#8) |
| Heat wave | A thin orange line | Not yet | A soft tall band with a whoosh (#16) |
| Match report at home | Readable, but overlaps the board and is replaced soon after the first win | OK | Move it to the level card (#11, #12) |
| Challenge codes | The flow works end to end | OK | Big "your code" plate, send-back stamp (#12) |
| Assist mode | Works (sim at 80%) but hidden | OK | Own toggle and a chip (#13) |
| Menu double pinch | Leaves, but the first pinch grabs the ripcord | Bug | Consume the pinch (#1) |

## Best 5 for a trailer (emulator captures; re-shoot on a Quest with a real table)
1. `clip2-ramp-knockout-replay.mp4` 4-8 s: the ramp throws Drifter into the SHATTER!, sparks, and the orange heat flare across the room.
2. `clip4-portal-strike-handprint.mp4` 9.5-12 s: the bar is full, the palm slaps, ANVIL STRIKE!, and the white-hot print appears (after fixes #5 and #6 it becomes the hero shot).
3. `clip7-champion-entrance.mp4` 0.8-3 s: the giant champion top bursts from the portal. Re-shoot with the head pitched up (`scripts/emu.sh look 0.2 1.5 -0.9`) so the arc is in frame.
4. `clip1-fresh-play-portal-ghost.mp4` 1.5-3.5 s: the portal opens, the rival arcs in, and VS DRIFTER lands.
5. `16-home-match-report.png` / `clip6` end: home with the gold Clockwork Spire arena, the docks, the anvil, and "Won 4 - 0 vs Challenger". It is the "your desk is a forge" establishing shot.
