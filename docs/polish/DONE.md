# Polish pass: what was built (Oct 8)

From the five reports in this folder (FIRST-TIME, FIGHT-FEEL, META, ART-AUDIO, PLAYTHROUGH). Device-dependent items (true scale, text size on the headset, slap thresholds) wait for a Quest.

## Built

- **Arrival and home.** The arena forges up out of the table (1.1 s rise with a machine sound and a landing thud); the SPINSMITH title stands over the far rim once a session; home stations pop in one by one; before the first match, ember dots arc from the dock into the arena; station names sit on small dark plaques; the first session's level plate hides the level road; XP shows as numbers; WORKSHOP is the blueprint's name; the comfort dial's name shows only when pointed at.
- **Placing.** A drawn palm print with a ring that runs down over the 8 s wait; "Rest your palm here". The landing page's ENTER waits (HEATING THE FORGE...) until the world is ready.
- **Fight framing.** A `Stamp` class: VS (with the circuit and bout), ROUND 2 / MATCH POINT / FINAL ROUND with a gong, RIP! / WHITE HOT!, every finish with its cause (SLAG!, THROWN!, SHATTER!, OUTLAST!), INTERRUPTED!, CRACKED!, the strike's name, LEVEL N!, FORGED!, NEW BEST, FEAT!, circuit cleared. A queue keeps simultaneous ones in order.
- **Game feel.** Tiered hit-stop (70-110 ms) with both tops shaking (never the view); slow motion on every knockout; spark streaks that cool from white-hot and skip off the floor; hard wall knocks scrape sparks; damaged tops shed embers; team rings of light under each top (orange yours, cyan theirs); a won match runs sparks round the rim; the match bar's spin bars animate every frame with chip damage and a white flash on hard hits; a ramp's arrow runs out along its push.
- **Strikes.** Three new seals (Tilt Lv 10, Hammer Lv 13, Ward Lv 16) balanced within 3 points of the Anvil; Tilt anchors your own top; Hammer always cracks and is staged; Ward replaces the name Bulwark (a ring's name). Every strike has a super freeze, its seal rising off your top and its name stamped. Rival tells: a stamped warning, a lane on the floor (the charge's path, the pull's pit), at most 3 flashes a second.
- **Rivals and structure.** Each rival has a title, an intro line, a win line, a loss line and a tip; the circuits ladder (Cinder, Iron, Crown) picks the next bout; beating a champion clears its circuit; the first session's rematch keeps its rival; twelve feats; personal bests; a match report at home; unlock cards say what the thing does; one unlock per result card (the first session's part first).
- **First match.** The rim holds tops for 6 s in the very first match and the ramp hint shows as ramps open, so the lesson is not lost to a fast round.
- **Art.** A generated forge environment map (warm and cool highlights on metal) replacing the grey studio, fixed foveation 0.5, team colors (orange #e8661c body, cyan #2a9fc4 rival), a graphite pedestal, contact shadows with a dark core, part names over the forge tray and a QUENCH TO SAVE sign, the label's headline always biggest, cards fade in.
- **Audio.** A generated room reverb, effects and music buses, ducking under big hits, a smooth mute, a quieter calm mode; clashes as modal steel rings tuned per ring; a 96 bpm D-minor music sequencer on the motif that follows the game (home, ready, fight, tension); spin hums with a blade-rate whirr, panned to the top; a slag sizzle; a soft tick for cards; a gong for rounds.
- **Replay.** A knockout your own move caused plays again on the table at 0.4x after its slow-motion moment, stamped REPLAY; a pinch skips it.
- **Tools.** The hand driver (`window.drive`, `scripts/drive.sh`), MP4 recording of what the player sees (`DRIVE_VIDEO`), dev keys inside sequences, `scripts/emu.sh`.

## Not built (and why)

- Title defense, weekly commission, smithy dressing: larger features, after the freeze.
- Match bar redesign beyond the animated bars, card eyebrow/icons, board legibility, true top scale: need the headset to judge sizes.
- Spatial (HRTF) audio and spoken calls: headset-only judgments.
- Moving the workshop's BACK / TRY / SAVE off the rail's sight line: the rail was lowered; a full relayout waits for a headset check.
