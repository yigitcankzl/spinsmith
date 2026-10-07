# SpinSmith playthrough audit 2 (IWER emulator, new build, 2026-10-08)

I played the new build twice. First as a new player (`fresh`): placing, home, first match against Drifter
(rip, ramp, three rounds, `KeyK` shatter in round 3), result, level-up and unlock, forge (fit the Spur tip,
quench), and a rematch. Then from the level-8 save (`demo`): a match against Leech (rival tell `KeyT`, strike
`KeyJ` + `slap`, cup + sling), all four forge drawers including Style and the strike seal, the workshop
(drop a piece, TRY, BACK), the order board, the Menu button, and a match against Hookjaw (charge tell, FINAL
ROUND).

Screenshots are in `docs/polish/shots2/NN-name.png`. Some of them are frame grids taken from clips: `23-quench-sequence`,
`34-strike-sequence`, `35-strike-freeze-and-tell`, `40-cup-sling-sequence`.
Clips (captured in the emulator, under 15 s each):
- `clip1-first-rip-ramp.mp4`: the first rip and the first ramp
- `clip2-finish-result.mp4`: the final round, the shatter, and the chain of reward messages back to home
- `clip3-tell-strike.mp4`: Leech's tell, a full bar, the palm slap, ANVIL STRIKE, SLAG, and the replay

Caveats: the grey low-poly room, the coloured axis gizmos, the "Hand [L]/[R]" panels and the toolbar belong to the
emulator. The emulator has no table, so the arena floats, and placing finished too fast to film the arena
rising. A few issues come from driving the game with scripts, and they are marked as such.

## Fixed since PLAYTHROUGH.md (keep these)
- **Rematch rival.** After the forge, "rematch" now really starts Drifter again. In the demo save, the level
  card's "Next match: Leech" is the rival you actually get (`25`, `33`).
- **Workshop buttons.** BACK, TRY and SAVE are no longer covered or clipped, and the tab row fits (`47`).
- **Forge labels.** Part names now sit over the tray, and there is a QUENCH TO SAVE sign (`20`).
- **Level card.** It shows XP as numbers ("195 / 300 XP"). In the demo save it has "Next: a new paint at
  Lv 9" and "Next match: ..." (`30`).
- **Stamps.** VS DRIFTER with "Cinder Circuit · bout 1 of 3", FINAL ROUND, SHATTER!, SLAG!, NEW BEST!, REPLAY and
  ANVIL STRIKE! are big, gold and readable (`08`, `58`, `55`, `34`).
- **Console.** There were no errors or warnings during this session. The only errors in the buffer were about
  40 minutes old and came from hot reloads while another session edited the code: `InstancedMesh is not defined` at
  `hub.ts:60`, and a 500 on `progress.ts`. Neither error came back.

## Ranked issues (worst first)

### 1. Unlocks pop up in the middle of a match, and the 3D part is drawn through the scoreboard. Shots: `55-rival-tell.png`, `56-rival-tell2.png`, log
At level 8, winning a single **round** showed "NEW: Cog ring" (against Leech) and "NEW: Hook ring" (against
Hookjaw) between rounds. The ring model sits on top of the scoreboard and the NEW BEST! stamp, while "SLAG!" and
"Fastest knockout 2.7 s" are also on screen. The player is about to rip again, so an unlock card here is noise,
and it looks broken.
**Fix:** queue every unlock until the match result screen (or home). Never show a 3D reveal while the
scoreboard or a stamp is up.
**Likely file:** `src/game/match-system.ts` (round end and the unlock trigger), `src/game/progress.ts` (where unlocks are awarded).

### 2. The first win is still a label slideshow, not a reward moment. Clip: `clip2-finish-result.mp4` (4-12 s), `17-hub-after-win.png`, `42-result.png`
In about 8 s the label cycles "You win the match!" → "LEVEL 2! Apprentice" → "NEW: Spur tip" → FEAT! (stamp) →
"Won 4 - 0 vs Drifter / OUTLAST · OUTLAST · SHATTER · best rip 95% · +395 XP" → "New part: Spur tip! Pinch
the small anvil". There is no hold, no tap to continue, no turntable for the part, and the rank does not
visibly change: "Apprentice" at Lv 1 and Lv 2. The match report then disappears after a few seconds. In the
demo save, the hub label was already empty when I looked (`42-result.png`).
**Fix:** use one reward sequence that waits for a pinch: 1) a big WIN plate with the score, 2) the
level-up as its own beat (a ring sweep, the number counting up, a sound), 3) the new part on a turntable above
the arena with its role tag, held until a pinch. Keep the match report on the level card until the next match.
**Likely file:** `src/game/match-system.ts` (result and unlock queue), `src/game/hub.ts` (level card), `src/game/ui.ts`.

### 3. The label goes blank exactly when a new player needs it (between rounds and in the forge). Shots: `15-round-result.png`, `16-matchpoint-ready.png`, `36-after-strike-round.png`, `20-forge-open.png`, `22-forge-fitted.png`
In every `ready` phase after round 1, the state label is `""`. Only the scoreboard shows, with nothing saying "Rip
again". In the forge the label is also empty. The real instructions ("Your new part: bring the Spur tip to
your top", "Fitted! Drop your top in the quench slot to save it", "Rush: Your top charges straight at the
rival") are printed in tiny type on the stats card, **behind the top**, which hides the middle of the line.
**Fix:** in `ready`, always show "Round N · rip again" (or "Match point" / "Final round"). In the forge, send the
step prompt to the main label. Move the stats card's hint line above the dials, or lift the card so the
top no longer covers it.
**Likely file:** `src/game/match-system.ts` (`toReady`, forge phase label), `src/game/forge.ts` (stats card layout).

### 4. Home station plaques overlap each other and the props. Shots: `19-hub-stations.png`, `18-hub-after-win2.png`, `30-demo-hub.png`
In the first session after the win, the WORKSHOP plaque is drawn across the forge anvil, and the level card
covers half of the workshop's blueprint roll. FORGE floats far above its anvil. In the demo save, **no
plaques show at all** (no PLAY, FORGE or WORKSHOP), so the two homes look like different games. The docked
tops (`32-docks.png`) have no names.
**Fix:** put one small plate on the base of each prop. Place it relative to that prop, offset toward the
player, and never across another prop. Keep it the same in every save (fade it after N visits if needed, but
do it the same way everywhere). Move the level card down and in front so that it does not cover the
workshop. Add a name plate to each docked top.
**Likely file:** `src/game/hub.ts`.

### 5. Forge drawers: parts are hard to tell apart, and the Style drawer is a pile of identical labels. Shots: `21-forge-close.png`, `43-forge-ring.png`, `44-forge-core.png`, `45-forge-style.png`, `46-forge-seal.png`
- **Tips.** All six tips are the same cream cog, and they overlap: Spur sits on top of Chisel. The new part
  (Spur) has only a copper tint, with no NEW badge.
- **Rings and cores.** They are black discs piled into a dark heap in front of the anvil. You cannot see
  their shapes.
- **Style.** Six labels all read **PAINT**, with no colour names. "SPIN DIRECTI..." is cut off. Strike seal and
  Emblem glow labels stack on top of each other.
- **Strike seal.** Choosing a seal (tap to cycle: "Rush: Your top charges straight at the rival") changes nothing
  visible. The text only appears on the hidden stats-card line.

**Fix:**
- Lay each drawer out as an arc of separate plinths, spaced so that they do not overlap, with the part's real
  mesh lit by a key light, and a role chip (ATTACK / GRIP / STAMINA).
- Mark new parts with a NEW badge.
- For paints, show the swatch on the plinth and use the colour's name as the label.
- For the strike seal, open a small carousel of seal medallions with each name and a one-line effect. Play the
  seal's rise animation on the top when it is picked.

**Likely file:** `src/game/forge.ts` (drawer layout, labels), `src/game/parts.ts`.

### 6. The guide moves to "rematch" before the quench (still a bug). Log / state after `["drag","Spur","top"]`
Right after the tip is fitted, and before the quench, the state already reads `guide:"rematch"`. If the player
leaves or reloads before quenching, the fit is lost, but the tutorial believes it is done (this was point 17
of the first audit).
**Fix:** advance from `fit` to `rematch` only when the quench saves the top.
**Likely file:** `src/game/forge.ts` / `src/game/match-system.ts` (where the guide steps are set).

### 7. Too much text at once around a strike, and the seal disc covers the stamp. Shots: `35-strike-freeze-and-tell.png`, `34-strike-sequence.png`
Within 1.5 s, the player sees:
- "Forge bar full: Anvil Strike! / Slap your palm down beside the arena"
- "Leech winds up a pull! / Strike now to stop it"
- the label "INTERRUPTED!" together with the stamp "ANVIL STRIKE!"
- the stamp "SLAG!", with the dark seal medallion drawn behind it, cutting into the letters
- a three-line label: "YOUR ANVIL STRIKE → SLAG / SLAG! You +2 heat / Heat 2 - 0"

The same event is written three times.
**Fix:** while a stamp is up, the label should stay quiet (or show only the score). Let the strike own its
moment: the seal rises, the name is stamped, there is a ring shockwave across the floor, and *then* the
knockout stamp. Draw the seal behind the stamp with depth-test off for the stamp, or move it above.
Merge "INTERRUPTED" into the strike stamp's sub-line ("ANVIL STRIKE! · pull broken").
**Likely file:** `src/game/match-system.ts` (`doStrike`, labels on knockout), `src/game/stamp.ts` (or wherever `Stamp` lives).

### 8. Rival-intro and arena text is still jargon in microscopic type. Shots: `08-after-play-vs.png`, `33-demo-vs.png`, `53-order-taken.png`
The headline is the whole quote: "Leech, the Spin Thief: 'Your spin looks tasty.'" Line 2 is about 5 px high,
and it chains four tags: "opposite spin: steals yours · pulls you to the pits · Balanced bowl: four slag pits,
four kick rails". The prompt "Pinch over the arena where you want to launch / pull back and let go" has a
large line 1 and a tiny line 2.
**Fix:** headline = rival name + title. Line 2 = one plain sentence (the tip). Show the arena's features
by lighting the pits and rails on the floor for 1 s instead of naming them. Set a minimum size for line 2.
**Likely file:** `src/game/ui.ts` (label fitting), rival data in `src/game/progress.ts`.

### 9. Rounds and tells are over too fast to read. Logs; shots `57-rival-tell3.png` → `58-rival-tell4.png`
Hookjaw's charge went from its first floor lane to "THEIR CHARGE → SLAG" in under 2 s, and the tell's label
("HOOKJAW: CHARGE!") came after the lane, not with it. My rip slagged Hookjaw in 2.7 s, and Leech's pull ended
a round 3 s after my cup. A Quest player needs time to see the lane, decide, and slap.
**Fix:** give each tell at least a 1.2 s wind-up before it can hit, with the label shown at the start of the
tell, and use a minimum round time (for example, rails hold tops for 3 s from the rip in every match, not only the first).
**Likely file:** `src/game/rival-ai.ts` / `src/game/match-system.ts` (tell timing), `src/game/sim.ts`.

### 10. The quench is still a hard cut. Shot: `23-quench-sequence.png`
The top hovers over the slot, then about 0.5 s later it cuts to home with FORGED! and sparks. There is no
dunk, steam, hiss or cooling colour. This is the save beat of the core loop.
**Fix:** lower the top into the slot (0.3 s), add a steam burst and a hiss, cool the top from orange to
steel (0.6 s), lift it out, stamp "FORGED · Striker Bolt Spur", then go home.
**Likely file:** `src/game/forge.ts`.

### 11. "Menu" ends a match with a single pinch. Shot: `54-menu.png`
Tapping Menu in the ready phase went straight home with no panel and no "Leave match?" step. On a Quest,
an accidental pinch near the left edge forfeits the match.
**Fix:** open a small panel (Resume / Comfort / Leave match) or hold to confirm.
**Likely file:** `src/game/match-system.ts` / `src/game/ui.ts` (menu button).

### 12. Order board: tiny, floating, and in competition with the level card. Shots: `31-board.png`, `30-demo-hub.png`, `53-order-taken.png`
The board says "Beat Rim Raider without giving up heat". The level card says "Next match: Leech". The rival
chips and streak dots are a few pixels high, and the board hangs in mid-air. Taking the order starts the Rim
Raider match with no order banner and no reminder of the condition during the match.
**Fix:** mount the board on a post. Use larger chips and two rows at most. When the order is taken, stamp
"SMITH ORDER" with the condition and keep a small "no heat given" pip by the scoreboard. Show the result
of the order at the end of the match.
**Likely file:** `src/game/hub.ts` (order board), `src/game/match-system.ts`.

### 13. Workshop: pieces and their names don't line up, and test runs are confusing. Shots: `47-workshop.png`, `50-workshop-close.png`, `51-workshop-try.png`, `52-workshop-after-try.png`
- The name strip (SLAG PIT, KICK RAIL, PILLAR, BUMPER, BOOST PAD) is a separate bar that is not aligned with
  the piece models on the brass rail. The rail still runs across the front of the arena.
- Rejected drops ("Drop slag pits near the rim") show only on the small card.
- Slag pits look like small brass nubs on the rim, not pits.
- During TRY, the rail and the name strip stay visible and nothing says it is a test.
- The result reads "Anvil Bolt Chisel won / outlast after 22 s". That is a build name, not "Yours" or "Rival".
- The log lists two `save` targets.

**Fix:**
- Put each name under its own model, on the rail.
- Show a red ghost and a buzz when a drop is not allowed.
- Draw pits as dark glowing hollows.
- Hide the rail during TRY and show "TEST RUN · pinch to stop".
- Name the result by side.

**Likely file:** `src/game/match-system.ts` (build phase), `src/game/workshop.ts` / `src/game/hub.ts`.

### 14. The cup and sling have no payoff, and the hint points at things you cannot see. Shots: `37-cup.png`, `40-cup-sling-sequence.png`
The catch and the yellow elastic line read well, but the release has no stamp, no whoosh in the frame, and no
trail. The top just slides. "Aim at a slag pit" points at pits that are not visibly marked on the floor of
Forge Bowl. When I ran the sling as a separate call (about 3 s later), the cup had already let go and Leech
slagged me. Check how long a cup should hold if the player hesitates. *This was found through the driver.*
**Fix:** on release, add a short stretch-snap sound, a motion trail, and a "SLING!" stamp if it causes a
knockout. During the catch, light the slag pits on the floor. Show a shrinking ring on the cup so the player
sees how long the hold lasts.
**Likely file:** `src/game/shaping.ts` (cup and sling), `src/game/visuals.ts`.

### 15. The ramp is still a flat orange smear, and "the ring" is ambiguous. Clip `clip1-first-rip-ramp.mp4` at 4.5-8 s; shot `13-round2-ramp.png`
The prompt says "Pinch the floor at the ring: a ramp rises at once". Several rings are on the floor and none
of them pulses. What rises looks like a glow under the hand, not a wedge.
**Fix:** pulse the target band while the prompt shows. Draw the ramp as a lit wedge with a bright leading edge,
plus the arrow already built.
**Likely file:** `src/game/shaping.ts`, `src/game/visuals.ts`.

### 16. The scoreboard is still tiny. All fight shots, for example `16-matchpoint-ready.png`, `55-rival-tell.png`
YOU / READY / DRIFTER, the heat pips, "j+0" and the small bars are a few pixels high, even at 50 cm. Its
size has not changed since the first audit.
**Fix:** make it about 2x bigger and keep only the two names, big heat counters and one state word.
**Likely file:** `src/game/ui.ts` / `src/game/visuals.ts`.

### 17. Smaller notes
- **Black slab under the arena.** A dark wedge-shaped shadow or slab sticks out from the pedestal at the
  lower left (`50-workshop-close.png`; also visible in `04`, `19`). It looks like a geometry or contact-shadow
  artefact. Check `src/game/visuals.ts` (contact shadow).
- **Empty level card in the first session.** At Lv 1 and Lv 2 the bottom half of the card is empty, with a
  thin dark stick (the reset coin's post?) showing through it (`04`, `19`). Fill it with "Next: ..." the way
  the demo save does.
- **A FEAT! stamp mid-round in the first match.** It appeared during round 2 of match 1 ("Rip white hot",
  `12-round2-rip.png`) on top of the "White hot!" label. Hold feats until the result.
- **The arena changes without a word.** The home arena switched from Forge Bowl to the smaller Ember Ring
  after the Leech win, with no announcement.
- **Mixed case in the match report.** "SLAG · slag · OUTLAST": lower case seems to mean the rival's point.
  Use colour or "you"/"them" instead.
- **The rematch looks like the first match.** It shows the same intro line and the same "bout 1 of 3". A
  "REMATCH · new tip: Spur" sub-line would pay off the forge.
- **The palm-slap target floats in the air.** With no table it hangs in empty space beside the arena,
  next to an extra dashed ring (`35`). On a real table it is probably fine. Check it on a Quest.
- **Placing finished in about 1 s in the emulator.** The 8 s palm wait and the rise were too fast to capture,
  and no SPINSMITH title was visible over the far rim afterwards (`06-hub-up-title.png`). Check on device.
- **Driver only.** `rip` with `aim:10` logged `aim 0.00`, and one `ramp` landed on the far rim away from the
  rival. Check `src/dev-drive.ts`. This is not a game issue.

## What feels great (keep)
- The VS stamp, FINAL ROUND, SHATTER! with its spark burst, NEW BEST!, and the REPLAY tag: they are bold,
  gold and readable.
- The rival tell lane: Hookjaw's charge path glows orange on the floor (`57`). It is readable at a glance.
- The palm-slap prompt: a yellow hand icon in a ring by the rim, plus the "Forge bar full" label. The ANVIL
  STRIKE! stamp with the ring flash looks strong.
- The sling's elastic line from the top to your fingers (`40`).
- The arena model up close (`07`): machined rings, tick marks and team-coloured rim arcs. It looks premium.
- The orange and cyan team rings under the tops make it clear who is who in every frame.
- The forge's big RING / CORE / TIP / STYLE tabs, and the QUENCH TO SAVE sign.
- The workshop's BACK / TRY / SAVE layout is clean now.
- The rematch and next-match rivals are now consistent.

## Moments that are not yet "wow" and what would make them wow
| Moment | Now | To make it wow |
|---|---|---|
| Arena arrival | Could not be seen in the emulator; no title visible after | Check on a Quest. Hold the SPINSMITH title for 2 s with a forge-glow sweep across the rim |
| First rip | The label says "Dash launch"; the top just appears spinning | A RIP! stamp sized by power, a ripcord zip sound, a spark ring where it lands |
| First ramp | A glow smear | A wedge rising with a metal clank, the rival visibly launched over it, a slow-motion moment on the first ramp hit |
| First win / level-up / unlock | Six labels in 8 s | The reward sequence of issue 2: pinch to advance, the part on a turntable, a level ring sweep |
| Quench | A cut | A dunk, steam, a colour cool-down, then FORGED |
| Strike | Good but crowded | One owner per beat: the seal rises, the name, a floor shockwave, then the knockout |
| Sling | A silent release | A snap sound, a trail, a SLING! stamp on a knockout |
| Rematch | Same intro as before | "REMATCH: Drifter vs your new Spur tip" with the new part glinting on the top |
| Smith order | A plain match | An order banner, a live condition pip, a stamped result |
| Unlock mid-match | Clips through the HUD | Hold it until the result |

## Console errors
`scripts/emu.sh logs 200 | grep -i error` showed nothing during this session. The buffer also held older
errors from hot reloads that happened before the session started, while another session edited `src/`:
- `ReferenceError: InstancedMesh is not defined at new Hub (hub.ts:60:21)` (uncaught, plus an unhandled rejection)
- `GET /src/game/progress.ts` 500
- several `net::ERR_ABORTED` on `?__iwsdk_preview_reload=...` (normal during reloads)

Neither error came back after the edits settled. The `InstancedMesh` error was probably a missing import that
was saved halfway through. `hub.ts` now imports `InstancedMesh` (line 15), so the error is already fixed.
