# Night sprint — 2026-10-18 03:00–08:00 (Istanbul)
Goal: turn Spinsmith from a deep systems sandbox into a finished game that can win Meta VR Start 2026. That means a campaign with levels, more and better tops and arenas, 2–4 players, better feel and look, and strength in every award. Codex is finishing WOW-PLAN.md; this sprint builds on top of its commits and does not revert them.

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
  3. **Online 1v1 (beta).** Host-authoritative, 30 Hz snapshots, guest sends events, Trystero torrent (~23 KB gz). No TURN, so about 10–20% of pairs can't connect; show that honestly.
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
| 0c7b02e, 661bde0 | **Crowded bouts:** 2-3 is three tops (Leech + Saw Wraith) and 3-3 is four tops (Gearwright + Twin Gear + Long Ember). Last top spinning wins, and the bout still counts. IWER: 2-3 starts with its crowd and its lesson. |
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

**Emulator note (06:15):** after several capture-rig restarts, the hand driver's single-hand rip and ramp stopped registering in IWER: "rip did not build enough motion". Forge and strike still worked. The same probe fails identically on commit 1b5c00e, which passed this exact probe at 05:25, so this is emulator or driver state, not a code regression. Restarting the dev server, resetting the device and clearing the saved arena pose did not clear it. Re-check the first session after a fresh browser profile.

**Local only (gitignored):**
- `docs/SUBMISSION.md`: the Devpost description is rewritten (469 words) to cover the campaign, play together and the new comfort modes, and the interaction notes are updated.
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
  - a guest's cups and slings are not carried (ramps, forges, rim springs, rips with spot and direction, strikes with the guest's seal, and live hands are);
  - not tested across the internet or between two headsets;
  - no TURN server;
  - (fixed) a host's workshop arena is sent whole and validated on the guest.
- **Brawl:** bots raise ramps but have no tells or ultimates; the knockout replay is skipped in brawls (its buffer holds two tops).
- **Campaign:** the map is a re-skinned board (no diorama); no EX remixes; the medal reveal is one stamp.
- **Content skipped:** the Rack tip (the Tips drawer already holds six parts, and tip meshes are keyed in visuals.ts).
- **Accessibility not done:** captions for sound cues and a left-hand mirror.
- **Capture rig:** after many automated probes the IWER rig drifted to controllers and the default pose. Re-run `scripts/capture/setup.sh restart` before shooting.
