# Night sprint — 2026-10-18 03:00–08:00 (Istanbul)
Goal: turn Spinsmith from a deep systems sandbox into a finished game that can win Meta VR Start 2026. That means a campaign with levels, more and better tops and arenas, 2–4 players, better feel and look, and strength in every award. Codex is finishing WOW-PLAN.md; this sprint builds on top of its commits and does not revert them.

## At a glance (for the morning)
- **New game structure:** the Circuit Map campaign has 15 bouts in 3 chapters. Each bout has a lesson, a twist and medals; there are bosses with a second wind, two crowded bouts and a finale. Medals gate the chapters, difficulty follows the map, and daily orders chase missing medals.
- **2–4 players:**
  - brawls of 3 or 4 tops with bots that ramp;
  - PASS (pass and play with the recorded hands);
  - an online duel (beta, WebRTC), host-authoritative, with live ghost hands, input validation and two-window tests.
- **More and better content:** a 4th type (Balance) with a counter loop shown on the intro card, a defense signature (center brace), 5 named builds, 2 new rivals (Comet, Gearwright) and 5 new arenas (20 total).
- **Feel and look:** medal stamps the moment they are earned, brawl callouts, hums and trails for every top, a compact match bar, warm forge-steel plates, scorched (not glowing) desk cracks.
- **Accessibility:** one-hand forge, high-contrast team rings, refused moves said in words, gestures with either hand.
- **Quality gates:**
  - five code-review agents and a player-journey soft-lock audit, every finding fixed or noted;
  - a README audit against the code;
  - `check:sim` now proves every bout can be countered, and that crowded bouts can be won;
  - `check:sim-n` and `check:net` were added.
- **Still open:** Quest device test, the video, captions and left-hand layout, hosting (last step).
- **State at 08:00:** see the end of this file. Every check passes, and the tree is clean.

## Research (4 read-only agents, 03:10–03:25)
### Rules (Devpost rules, FAQ, special awards; unchanged since Oct 7)
- Stage One is pass/fail fit. Stage Two scores Innovation, Experience Design, Technical and Polish at 25% each. Judges play on Quest 3/3S. Limit one prize per entry (the highest value).
- **No IWSDK/Web award in 2026.** The main target is Best New Gaming ($100k/$50k). Specials are $25k each: Social & Multiplayer ("shared presence, cooperative play, asymmetric multiplayer"), Reason to Come Back, First Five Minutes, Accessibility Forward, Boldest Original Concept. There are also 2 × $20k Judge's Choice.
- Hard requirements:
  - 60 fps on Quest (Technical).
  - Hands-only.
  - Public HTTPS URL frozen from Nov 18 to Dec 11.
  - Video under 3:00 (IWER allowed, real gameplay).
  - English materials.
  - **No brand names** in the build or tracked files (checked: none; local research docs are gitignored).
- 2025 winners share one pattern: one move a first-timer reads at once, and the real room or table changes play.

### Game design craft
Sources: Nintendo kishōtenketsu, GDC boss design, flow channel, sawtooth difficulty, Beat Saber/Pistol Whip/Cubism campaigns, Meta hand-tracking best practices.
- **Diagnosis:**
  - Difficulty scales with XP grind (`skill=(level-1)/15`), not with position in the content.
  - The rival ladder stalls behind XP gates.
  - There is no "level" with its own goal.
  - Teaching stops after match 4, with no test or twist.
- **Fix: a Circuit Map campaign.**
  - 3 chapters × 5 bouts. Each bout fixes a rival, an arena, a lesson, a twist and 3 medals; the 5th bout is a boss.
  - Medals gate chapters, so skill can replace grind.
  - Per-bout rival skill rises in a sawtooth.
  - A quiet assist kicks in after 2 losses in a row.

### Tops and arenas (spinning-top toy research; IP-safe names only)
- **Balance:** parts are healthy (44–56% each). The type loop holds on bowls but breaks on Ember Ring, Glacier Steps and Meteor Pit. Launch side may bias results by up to about 20 points (check this).
- **Identity:**
  - 4 types with Balance added (top two stats within 10 points).
  - Counter loop: Attack > Stamina > Defense > Attack.
  - Show the matchup on the intro card.
  - Per-type signature passives:
    - Defense Brace: 0.8× knockback in the centre.
    - Balance Shift: seeks, then settles.
- **New content:**
  - New tops: Ember Comet, Rackfang (a new Rack tip), Twin Gear, Saw Wraith, Long Ember, Low Tide.
  - New arenas: Crucible Gate (a 3-point mouth), Gear Rink, Sentinel Gates, Bellows, Ridge Raceway, Summit.
  - New finish: Crucible (a 3-point pocket within 0.5 s of a clash), plus PARRIED and RAIL banner words.
  - `Pocket.points` is never read today.

### Multiplayer
- `sim.ts` is a pure deterministic 120 Hz step, and `collide(a,b)` is already pairwise. Going to N tops is about 150–250 lines; keep the 2-top wrappers.
- The real cost is in `match-system.ts`: `mine`/`theirs` are hard-wired, with about 270 rival references.
- No colocation or shared anchors in WebXR or IWSDK. Two people can't fight live in one headset.
- **Decision and order:**
  1. **3–4 top free-for-all with bots.** This is the base for everything else, and judges can try it with one headset.
  2. **Party pass-and-play.** Each human's last turn replays as an echo with ghost hands while the headset holder fights live; empty seats are bots.
  3. **Online 1v1 (beta).** Host-authoritative, 30 Hz snapshots, guest sends events, Trystero (as built: Nostr-relay signalling, 27.5 KB gz lazy chunk; the torrent strategy is a separate package in 0.26). No TURN, so about 10–20% of pairs can't connect; show that honestly.
- **Testing:** node N-top determinism/ranking checks, a loopback transport with latency and loss, and two IWER tabs over BroadcastChannel.

## Night order
1. Wait for Codex to finish (repo quiet), then complete anything left in WOW-PLAN.md.
2. Campaign: `campaign.ts`, progress fields with save migration, per-bout rival/arena/skill, medals at match end, the map on the board, and a `check:campaign` test.
3. Top identity: Balance type, counter card, signature passives (only if the reports stay balanced), new arenas and tops.
4. N-top sim and free-for-all with bots.
5. Accessibility basics: high contrast, sound captions, one-hand path. Brand scrub.

## Done
Codex finished WOW-PLAN at 03:26 (6d7bea6): forge legible while held, room marks batched, desk trophies, forged identity, hero captures. Render budget measured after it: 182 calls, about 91 per eye in IWER (target ≤150), 165k triangles.

| Commit | What |
|---|---|
| 4c8c45c | **Circuit Map campaign**: 15 bouts in 3 chapters (Cinder, Iron, The Crown). Each bout fixes a rival, arena, lesson and twist, and asks for 2 medals beyond the win. Rival skill follows map position (a sawtooth: 0 → 0.3, 0.25 → 0.6, 0.55 → 1.0) and eases by 0.15 after 2 losses in a row. Chapters need medals (8 and 18) plus the previous boss. The board's back is the chapter map, and the intro card names the lesson and the medals still open. The demo save has the Cinder Circuit cleared. Tests: sim-check 32. IWER: the demo opens at 2-1 Leech; winning it records the bout and points to 2-2. |
| d16e34d | **Fix (regression from 0cb4cf9):** rim grips were gated behind the defense lesson (2 finished matches), so the forge lesson in the first match could never start with real hands. IWER verifies the forge with matches=0 and tutorial round 2. |
| 65232b4 | **N-top sim:** `stepN`, `rankingN`, `roundOverN`. 2-top `step` is bit-identical. Test: check:sim-n. |
| 40efdac, e011343 | **Brawl (3–4 tops):** brass pegs at home set 2/3/4 tops. Bots are other rivals' and named smiths' tops in green and violet. Every pair collides, and the last top spinning takes the heat. IWER: a 4-top round runs and ends correctly. |
| 70ba661 | **Pass and play:** a PASS button after a duel. The next smith on the same headset fights that top and its recorded rips and forges (echo). IWER: button → Challenger with the echo. |
| 7e2fdda | **One-hand forge (accessibility):** new comfort mode. A single held rim grip gets a mirrored virtual partner, so one hand can twist, squeeze, stretch and tilt. IWER verified. |
| 53884b8, e62ae5d | **Balance type** (4th type), 5 named builds, 5 new arenas: Crucible Gate, Sentinel Gates, Bellows, Gear Rink, Ridge Raceway. All pass report:arenas and report:tops with no warnings. |
| 6afb8f7 | Crucible Gate and Sentinel Gates moved into campaign bouts 2-1 and 3-3. |
| 927898e, 2da8d89, 390b8a7, f74f5ec, 2508e75 | **Online duel (beta):** net.ts (Trystero/Nostr signalling loaded lazily in a 76 KB chunk, BroadcastChannel for two windows, snapshot buffer, reliable events; check:net with 200 ms RTT, 5% loss, p99 error 0.65 mm) and online.ts plus match-system wiring. The host runs the only sim, waits for both rips, applies the guest's ramps and forges from the far side, and sends 30 Hz snapshots and results. The guest renders the fight turned half round. A room opens from the brass pegs (past 4) or `?online=host`. IWER, two windows: pairing, same arena, the guest's rip waits for the host, the round plays live on both, the result matches (2-0 / 0-2). Not tested between two headsets or across the internet. |
| 7ffe772, 7d357cf | **Review fixes** (code-review agent): REMATCH keeps the bout or brawl; a pin or new smith drops a queued bout; brawl credits only the rival's own KO; bots cleared between rounds; same-step outs go to the ranking; no one-hand locked loop; no echo overwrite from brawl/online; old saves keep cleared circuits; medal hunting alternates with free play once the map is won; team ring freed; a knocked-out rival stops shaping. |
| 5a0047d | Brawl "X OUT · N TOPS LEFT" callouts. Strike cracks on the desk are dark scorch marks, not glowing rays (the "yellow fan" two reviewers flagged). |
| 6bdf63d | Campaign bosses get a **second wind** at their last round: a stamp, rips ≥ 0.85, shaping twice as often. |
| d45c643 | **High-contrast** comfort mode (bold, solid team rings). |
| 0e6b7f1, 868e98d, 89a6a82 | README leads with the hero move, a 90-second judge path and a "modes and where to find them" table. Campaign, brawl, pass, online and accessibility are documented. |

| 9c33e5e | The intro card reads the **type matchup** ("you counter it" / "it counters you", 4-type loop); the level plate shows the bout's medals (n/3). Test: sim-check 33. |
| 1c27873 | The brawl match bar shows "N LEFT". |
| 2508e75 | **Online from inside the headset:** the brass pegs step duel → 3 → 4 → online room (all pegs white-hot, the card shows the code) → duel. |
| a04c947 | **Live hands online:** each smith's two pinch points go to the other table 20 times a second and show as two ghost hands on the far side. IWER, two windows: the guest sees the host's hands, fresh within 45 ms. |
| cd2999d | The guest's Anvil Strike reaches the host (applied with the guest's top as striker). IWER: the event arrives; the host ignores it outside a fight. |

| 391b872 | Two new rivals, **Comet** (light upper, charge) and **Gearwright** (left-spin grinder, pull), staged in The Crown (3-2, 3-3). |
| 9c50ff4 | The board's front shows the next bout and the medal count every day. |
| 772a7e3 | **Online review fixes** (second review agent, 11 findings):
- the guest's stage turns half round instead of mirroring coordinates, which fixes asymmetric arenas;
- a new guest gets fresh counters;
- leave or fail returns to offline play, and MENU ends the duel;
- every match with a peer is against the other smith;
- stale rips are cleared;
- the guest's charges refill and its ramps cost a charge;
- tilt carries direction and force;
- heat is taken from the host;
- floor shapes refresh with the right colours;
- snapshots use the wall clock;
- online matches give no marks or bouts.

IWER two windows after the fix: the guest's top equals the host's rival top, the stage is turned π, and the score is 2-0 / 0-2. |
| e183be9 | Plates in blackened forge steel with warm text (the art-direction note). |
| dc5f6d1 | **Defense signature:** 15% less knockback while holding the inner half. The loop stays intact (0.70 / 0.61 / 0.56), and report:tops shows no warnings. |
| 1fdd70e, b189cfd | A bout's twist is said at round two. Fix: the round counter was cumulative across the session ("ROUND 5" in a second match). |

| d2a0eac, 3b60535 | Online guest launches carry its picked spot and pull direction. The host checks the spot (finite, inside the ring, clear of the host's). Chapter feats come from the boss bout; the finale's stamps are never dropped (third review agent). |
| e1920ff | **Campaign finale:** beating The Crown's 3-5 for the first time gives THE CROWN IS YOURS, a medal tally, the celebration and a thank-you card. IWER: verified with 14 bouts pre-won. |
| 37f4779 | The brawl pegs are hidden in the first session (one top, one verb first). |
| e5d8a4a | **Daily orders chase map medals:** about every other day the order targets a medal left on a won bout, and playing it counts on the map. Test: sim-check 34. |
| 1b5c00e | A bout medal is stamped the moment it is earned, not only at match end. |
| 3f9b13f, 4fb2bd7 | Refused moves (no charge, strike not ready) are said in words as well as the clunk, for players without sound. |

| 881a7b3, cce7e0c | The match bar is compact during a fight (no empty glass under the pips); the desk strike cracks are short hairlines. |
| 7c89757 | Brawl tops get their own spin hums (silent and never started when unused). |
| c7abba3, 3d6dc08 | An online guest's chosen seal and rim spring reach the host (IWER two windows: the rim event arrives). |
| dc34ced | Brawls, online rooms and PASS introduce themselves once, after the first matches; a fresh save forgets the hints. |

| 50a3126, c74e44b | Brawl tops leave trails in their own colours (still one instanced draw); the knockout replay is skipped in brawls. |

| 90c94d2, 7c6c7d4 | Copy pass by a review agent: stamp subs and card lines fit their slots, terms match the game, there is no "both hands" in the forge lesson (one-hand mode), the final bout has a real lesson, and online errors are in plain words. |
| 0c7b02e, 661bde0 | **Crowded bouts:** 2-3 is three tops (Leech + Ember Comet; Saw Wraith was swapped out at fb4c984) and 3-3 is four tops (Gearwright + Twin Gear + Long Ember). Last top spinning wins, and the bout still counts. IWER: 2-3 starts with its crowd and its lesson. |
| e4ec69e (removed later) | A debug-looking two-window online screenshot (controllers, gizmos) was added, then removed after the judge pass; re-shoot it in the capture rig with hands. |

| fd21deb | Second judge pass. Scores rose in Experience 6→7, Polish 5→6, Social 5→6, Come Back 8→9, First Five 5→6 and Accessibility 5→6. The README's stale claims are fixed (the online row says "tested in two browser windows", the old circuit ladder text is gone, the board-back text is right), and there is an "If something goes wrong" box. |
| 91102a1 | An online host's workshop arena goes to the guest whole, cloned and validated (untrusted input), instead of matching by name. |
| 86a13b5 | Brawl bots raise a ramp inside their nearest foe every 3.5–5.5 s. IWER: bot ramps appear, the round ends normally, and there are no errors. |

| a649199 | Fourth review agent. An order for a crowded bout brings its crowd; bot ramps show in the other side's colour. **Online:** the guest goes home *before* taking the host's arena, which fixes a mismatch that two windows sharing one save had hidden (verified: host Gear Rink → guest Gear Rink). |

| 944be20, 6bef129 | The level plate names a crowded bout even with the pegs up; the board says "free play in X (pinned)" when an arena is pinned, so PLAY and the map agree. |

| 5cb2e59 | **Player-journey audit fixes** (soft-lock review agent):
- MENU shows while aiming, and the result holds while leaving is confirmed;
- online: a sent rip waits in ready (it was re-sent every frame), mid-fight rips are ignored, a start that arrives during placement is deferred, and `?online=` on a new headset joins after the first session;
- recentring keeps the match-over screen;
- the first-session rematch counts as 1-1, and a rematch keeps a friend's echo;
- a new smith gets all lessons and closes the room;
- the one-hand lesson text is right;
- missing-medal bouts take turns, and a boss won without enough medals says what is missing.

IWER: MENU in ready → "Leave this match?" → hub; the online round regression passes. Not changed on purpose: the ramp lesson can still be skipped through the anvil (harmless; changing the guide flow is riskier). |

| c6c71ae, e4a741e, 5a73fc0 | An online duel never pulls a host or guest out of the forge or workshop (it starts when they are home). MENU while aiming waits until after the first session. |

**Emulator note (06:15):** after several capture-rig restarts, the hand driver's single-hand rip and ramp stopped registering in IWER: "rip did not build enough motion". Forge and strike still worked. The same probe fails identically on commit 1b5c00e, which passed this exact probe at 05:25, so this is emulator or driver state, not a code regression. Restarting the dev server, resetting the device and clearing the saved arena pose did not clear it. Re-check the first session after a fresh browser profile. Narrowed down further: drive.rip works in a normal (demo) match in the same browser, and the first session's pinch enters `pulling` but no launch follows. So it is specific to the first-session state. **Resolved at 06:30:** sampling the hand during a first-session rip shows the driver's pinch moving 0.22 m and the launch firing (phase → fight). The failures were the first rip after a page reload, before the driver's calibration settled; a second attempt in the same page works. This is emulator-driver flakiness, not a game bug. Final evidence (07:12): in a failing attempt the emulated hand's pinch point never moves (y 1.484, z -0.35 for the whole "pull") while the pinch opens and closes. The driver's glide is not reaching the hand pose; IWER's transform handle is the likely pose authority. Rip, ramp, forge and strike all pass whenever the hand actually moves.

| 9d52960 | The online launch-spot clamp and the guest score sync are pure functions in online.ts, tested in `check:net` (OnlineLink no longer uses TS parameter properties, so node can import it). |
| 6621d5e, deed7fd | README audit by an agent against the code (16 fixes): the cup comes from the third match, a charge refills in 4 s, lesson grace, tells from the fourth match, signature parts, DESK KO = 3 heat, Nostr signalling, online after the first session, "should be installable" and "offline checked in the browser" instead of claims, the dev keys. |

| 8d5ba2c | **Online trust boundary** (crash-risk sweep agent): the host validates and clamps every guest event (finite numbers, ranges, known kinds, actions and seals) via `sanitizeGuestEvent` (tested in check:net). A malformed launch spot or hello is ignored, pending online starts are voided when a peer leaves (this fixes a null crash), the early-event window is bounded, and the pegs are capped at four. Snapshots from a host are now checked on the guest too (d6064cc: only finite snapshots reach the view). |

| d6064cc | The guest refuses non-finite host snapshots (validSnapshot, tested). |
| 05d10f2 | An open online room's code leads the board's front line while you wait (IWER: pegs → room 5J4PT on the board → pegs → closed). |
| 9b40f60, 2c4b985 | The old circuit counts ("CINDER CIRCUIT 2/3") are gone from the plate and the intro: it is the bout, "brawl" or "free play". |

| ec6e27d | README: one-hand gestures work with either hand (left-hand rip and ramp checked in IWER). |
| 6125383, (next) | **No walls on the map** (sim-check 35/36): in every bout's arena some forgeable build beats the bout's rival at least half the time without hands (hardest: 2-2 at 70%). In the crowded bouts, using each top's own spin, the best build is last spinning 50% (2-3, fair share 33%) and 63% (3-3, fair share 25%). |

Final smoke (IWER, 06:40): bout (2-1) and rematch (bout kept), PASS → Challenger with echo, brawl, and an online round, all with no console errors.

| fb4c984 | Sixth review agent:
- the guest's launch direction is normalised, not clamped as a position (which had bent steep pulls to 45°);
- a deferred duel starts on any path home;
- a workshop try-out is protected;
- after a full clear, every missing-medal bout gets a turn;
- the rip and cord races on both sides are closed;
- the board redraws when a room closes;
- the event receiver skips an empty slot.

The crowd test now uses real spins, and 2-3's crowd changed to Ember Comet. Online regression passes. |

| 5587d93 | Seventh (last) review: `endOnline` no longer redraws home itself. That redraw had wiped the "left" and "no one connected" cards and could save a new smith's order from the old smith's arenas; the callers now redraw, then speak. The cord tone is silenced on a remote launch and while waiting for the peer. |

| (this) | **Online cups and slings:** the guest's cup is held on the host (it catches, then lets go after the hold); the guest's sling sends its pull and the host slings the caught top, snapped toward a pit. Both are sanitised. IWER, two windows: the cup event made a host cup that caught a top, and the sling event slung it ("THEIR SLING"). |

**Local only (gitignored):**
- `docs/SUBMISSION.md`: the Devpost description is rewritten (469 words) to cover the campaign, play together and the new comfort modes. The interaction notes are updated, and there is a "How it was tested" card.
- `artifacts/capture/` holds fresh labelled IWER stills: `brawl-four-tops.png`, `campaign-map.png` and `campaign-crowded-bout-intro.png`.

**Checkpoint 05:58:**
- `tsc`, `check:sim`, `check:sim-n`, `check:net`, `build` and `public-release-check` all pass.
- 72 commits since Codex's last (6d7bea6); the tree is clean.

**First session, verified with real emulated gestures (IWER, fresh save):**
- round 1, ramp → lastShape ramp;
- round 2, the two-hand forge → squeeze (this was broken before d16e34d);
- round 3, palm slap → strike;
- the match ends, the guide moves to the forge, and the match is recorded as bout 1-1.

Smoke (IWER, error listener on): bout match, rematch (bout kept) and a 3-top brawl ran with no console errors.

Measured in IWER: a 4-top brawl fight is 248 calls, about 124 per eye (under 150).

## Decisions
- **Multiplayer design:**
  - The research found no shared anchors or colocation in WebXR or IWSDK, and two people cannot fight live in one headset. So:
    - **brawl:** bots on one headset;
    - **pass and play:** echo-driven on one headset;
    - **online:** host-authoritative over WebRTC.
  - Lockstep was rejected: hand input is per frame, not per step, and one stall would freeze both players.
  - No TURN server, so some networks won't connect, and the game says so.
- **Online on the guest:** cups and slings are not sent yet (ramps, forges, rips, strikes and hands are). Online matches still award XP on each side for that side's own result.
- The `docs/GAMEPLAY-DIRECTION.md` scope freeze ("no more parts/arenas") is overridden by the user's explicit request for more and better tops and arenas. New content still has to pass `report:tops` and `report:arenas`.

## Remaining (honest)
- **Device evidence:** nothing has run on a Quest. A hosted build tried by one Quest owner (minimum fps, lost gestures) is still the biggest risk. Only the IWER render budget is measured: hub 107, duel fight 91 and 4-top brawl 124 per eye (target ≤150).
- **Video:** none yet. Shots worth taking in the labelled IWER rig:
  - a 4-top brawl;
  - the Circuit Map (board back) and a BOSS DOWN or SECOND WIND moment;
  - PASS on one headset;
  - the online duel in two windows, labelled as such;
  - the two-hand forge and DESK KO (Codex's hero shots).
- **Online (beta) gaps:**
  - (fixed at the end) a guest's cups and slings are carried too, along with ramps, forges, rim springs, rips with spot and direction, strikes with the guest's seal, and live hands;
  - not tested across the internet or between two headsets;
  - no TURN server;
  - (fixed) a host's workshop arena is sent whole and validated on the guest.
- **Brawl:** bots raise ramps but have no tells or ultimates; the knockout replay is skipped in brawls (its buffer holds two tops).
- **Campaign:** the map is a re-skinned board (no diorama); no EX remixes; the medal reveal is one stamp.
- **Content skipped:** the Rack tip (the Tips drawer already holds six parts, and tip meshes are keyed in visuals.ts).
- **Accessibility not done:** captions for sound cues and a left-hand mirror.
- **Capture rig:** after many automated probes the IWER rig drifted to controllers and the default pose. Re-run `scripts/capture/setup.sh restart` before shooting.

## State at the end of the night (07:10)
- **Checks:** `tsc --noEmit`, `check:sim`, `check:sim-n`, `check:net`, `build` and `public-release-check` all pass. `report:tops` and `report:arenas` show no warnings.
- **Render budget (IWER, per eye):** hub about 70–107 depending on what is shown, duel fight about 91, 4-top brawl about 124 (target ≤150).
- **History:** 103 commits on master since Codex's last (6d7bea6), all authored by Yiğitcan Kızıl, none with a Co-Authored-By or Claude line. Nothing is pushed; pushing is left to you.
- **Workspace:** the tree is clean; worktrees and branches from the night are merged and deleted. The emulator is on the `?demo` save and the dev server is running.
- **Local only:** `docs/SUBMISSION.md` (updated description and testing card) and the stills in `artifacts/capture/`.

