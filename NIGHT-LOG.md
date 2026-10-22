# Night log — 2026-10-22, 01:30 → 08:00 Istanbul
Self-improving loop: score (independent judge) → pick the lowest sub-criterion → build in a worktree → verify → re-score → merge or drop.
Baseline: judge-report.md (2026-10-22, HEAD 2108a38, mean 5.75).

## Cycles
| Cycle | Sub-criterion | Before → after | Measurements | Commit / outcome |
|---|---|---|---|---|
| 1 (01:30) | Independent judge baseline | — | 38 rows scored; lowest fixable: gaze 2, video 3, FoV 4, submission text 4, onboarding 5, scene understanding 5, untested rooms 5, first five minutes 5 | builders launched: deskko, room, verbs, reach |
| 1 | Polish: text (stale claims) | 4 → pending re-score | README:85 4 heat, desk-KO bonus in tutorial line, echo.ts comment, index.html showcase line | 152a1f1 |
| 1 | Solid / bug-free (flaky probe) | 6 → pending | check:combat-readability 1/3 → 4/4 after holding the tops during the ramp approach and finishing inside the 1.5 s cause window | 5316d93 |
| 1 | 60 fps evidence | 4 → pending | `?demo` save: hub 98, fight 103 draw calls/eye (the old 172–200 were both eyes); fresh fight 102/eye; game update CPU p50 0.6–0.7 ms, p95 1.0–1.2 ms, max 2.9–5.8 ms (laptop CPU, IWER); lowest fps 89–118 (IWER, not Quest) | ba7b64e |
| 1 | Scene understanding / untested rooms | 5 → pending | Unlabelled and orientation-less horizontal planes 0.45–1.15 m count as tables (IWER sets orientation from the label only, so 'other' planes had none). `check:room-matrix` 5/5 in IWER: office_small table, living_room 0.455 m table, no table → tray, 50×40 cm table, unlabelled table | 5d98f5c, 145bd4f |
| 1 | Onboarding / First Five Minutes (verb cliff) | 5 → pending | One verb per completed match (`VERB_RELEASE`): Flick in match 1, then Spring, Gust, Ember, Rub, Crossguard, cup+sling, Groove, Wheel; NEW MOVE card each; palm brace removed | 0118617 |
| 1 | Purposeful passthrough / wow (staged DESK KO) | 5 → pending | Match 1 round 2 (forge lesson) steers the rival to the nearest real edge, pulses the arc, "WRENCH IT OFF YOUR DESK"; `check:desk-ko-first` in IWER: squeeze → off desk → DESK KO, slow-mo peak 1.06 s | 62786d0 |
| 1 | Seated 2 ft / FoV / gaze / lefty | 6 / 4 / 2 / 6 → pending | Forge grips 45°→65°, in touchTargets, ≤0.61 m at tray drops 0.30–0.40 (0.64 m at the deepest tray); FoV sim-check ±35° v / ±40° h for every read surface (3 labels moved in); head-ray dwell 0.4 s + pinch for buttons on Quest; Left-handed in the comfort dial | 40a262d, 43560bf, 3ec0d69, 407e601 |
| 1 | Solid / bug-free (gesture collisions found by probes after the merges) | 6 → pending | Arena Forge tilt release formed a cup (2 charges); a Spin Rub reach fired Forge Gust (2 charges); groove probe flake; fixed: cup blocked 0.45 s after a pinch release, gust not fired onto your own top or during a rub window, rail posts not built during a rub. Hands suite 22/23 in sequence; outer-ring fails only right after palm-forge (passes 3/3 alone) — open | 41cf1b6 |
| 1 | Hand tracking (One-Euro filter) | 6 → dropped | Filtering the pinch point cut rip power on the release and broke dual-rip 2/2; reverted. Needs device tuning (raw vs smoothed paths for rip/flick) | — |
| 1 re-score (02:15) | Fresh judge on the touched rows | passthrough 5→8, take-it-away 4→8, FoV 4→7, gaze 2→4, onboarding 5→6, first five minutes 5→6, scene understanding 5→6, submission text 4→5; seated 6→6, untested rooms 5→5, solid 6→5, 60 fps 4→3 (stricter reviewer) | Regressions found: bout 1-4 taught the cup before its release; a head-ray dwell + any pinch could press MENU; gust's own-top guard too wide. All three fixed | 243bc4f |
| 2 (02:15–02:45) | Passthrough every round (drop sides) | 8 → pending | Under each red arc the rim is a lower drop side for both tops (`DESK_DROP_ESCAPE` 0.55). Harness 24 rounds/pair: masher +0.5 win; ramp aimed at the arc beats the same habit at the wrong rim by +3.0 win / +0.18 heat (side desk), +2.4 / +0.10 (far desk); over-the-wall ≤20% of finishes; median round 14.8 → 11.2 s. Online and brawls off | 1efe7b3 |
| 2 | Onboarding text (hand ghosts) | 6 → pending | First-match prompt words 359 → 152 (prompts 272 → 120, cards 87 → 32), cap 5 words; shared-mesh ghost hands for rip, seal stamp, slap, flick | 6a7247b |
| 2 | First Five Minutes (probe) | 6 → pending | `check:first-five` in IWER from a fresh save: first KO = first DESK KO at 46.2 s game time (round 2), match end 133 s (6 rounds, 4-3); 55 distinct prompts / 258 words incl. stamps; come-back card shown. Headless: median first KO 15.6 s, match 61 s | 15d5716 |
| 2 | Reason to Come Back | 8 → pending | Day streak + "Tomorrow: <order>" + next bout on the result card and the board (no new meshes) | a57873c |
| 2 | Easy in/out + accessibility | 7 / 6 → pending | Interrupted matches resume at the round start (not the first match; 12 h stale rule); colour-safe dial mode (Okabe-Ito); rival rings/marks hexagonal; wrong-way rub stamp, low-spin bar throb | 7a91c36, f507218 |
| 2 | Solid / bug-free | 5 → pending | Found by probes: resume replayed a pre-fresh tutorial (fixed: never resume match 1); flick swing also committed a groove (fixed); outer-ring driver aimed at a stale goal while the arena slid (fixed). Full `check:hands` passes in one sequence; desk-ko-first, desk-ko, desk-guard, combat-readability, room-matrix 5/5 pass | 61fe076 |
| 2 re-score (02:50) | Fresh full judge | accessibility 6→8, scene understanding 6→7, seated 6→7, habit 7→8, repeat usage 8; passthrough 8→6 and take-it-away 8→5 (this judge: the tray loop is otherwise the same) | Bugs found: bouts 1-2/1-3 taught forge/strike while cards announced Spring/Gust; rub-tip gust guard too small; drop side live in match 1; README step 4 lacked the table caveat. All fixed | 3d…, see below |
| 3 (02:50–03:05) | Solid / bug-free (arbitration) | 6 → pending | One rule table (`src/game/gesture-owner.ts`) owns each hand per frame; 25 table-driven sim-check cases; flick follow-through no longer leaves a groove (found by check:hands); full `check:hands` passes, desk-ko-first, desk-ko, desk-guard, combat-readability, room-matrix pass | 9f32128 + fixes |
| 3 | First Five Minutes (stamp diet) | 6 → pending | IWER first session: prompts 55 → 22, words 258 → 81; first KO 19.2 s, first DESK KO 41.7 s, match end 110 s; come-back card shown | 33d0418 |
| 3 | Accessibility (combinable comfort) | 8 → pending | Dial selects, plate toggles; any combination; v1 → v2 migration | 74bb5c1 |
| 3 | 60 fps (overlay + guard) | 4 → pending | `?fps` world-locked readout; QualityGuard steps full → lite → lite+foveation after 3 slow seconds, back after 10 good; per-phase fps in the Quest test report | b37a58a |
| 3 | Untested rooms | 6 → pending | Room matrix 10 cases incl. tilted 30° surface (tray), two desks (near wins), 0.38 m coffee table (tray), table 1.7 m away (tray), rebuilt-plane control | e1de6cd |
| 4 (03:05–03:22) | Video | 3 → pending | New 41.6 s reel (`scripts/night-trailer.sh`, `~/Desktop/spinsmith-videos/night-2026-10-22/spinsmith-reel-1080p60.mp4`): opens on a side view of the staged DESK KO (rival skids off the desk edge), then rip + ramp with the lesson ghost, DESK KO close, Flick, strike, tilt, forge, workshop, hub; every shot labelled IWER. New `stageFirstWrench` drive step; SUBMISSION video section rewritten | night-trailer.sh |
| 4 | Hand tracking | 5 → pending | One-Euro on aim/hover/hit paths only (`pinchSmooth`, `indexSmooth`; minCutoff 2.5 Hz, beta 10): still-hand jitter −67%, 1.5 m/s sweep lag 13.8 mm; rip, flick, rub, gust, slap stay raw. dual-rip passes | 011a669 |
| 4 | Passthrough polish (hand occlusion) | — | Existing joint-proxy occluder gated (AR only, `?nohandocclude`), palm slab, never pickable, flick glow / wrist bar drawn over it; kept on under depth sensing because tops are not depth-occluded | abaa5e7 |
| 4 | Submission text | 5 → pending | README 469 → 179 lines (judge path, real-room list, hands table, honest limits); design notes moved to DESIGN.md | bc80a55 |
| 4 | Solid / bug-free | — | Probes found: sim-check block left unclosed by a merge (caught: a piped `tail` had hidden the exit code; now checks keep exit codes); groove committing before a flick on a curved swing (fixed: a groove commits once the fingertip leaves the floor). `check:hands` 1 of 2 sequences clean (flick double-charge 1 in ~6 runs, open); desk-ko-first, desk-ko, desk-guard, combat-readability, room-matrix pass | 832a4d4 |
| 4 re-score (03:30) | Fresh full judge | Mean of the four criteria 6.3 (baseline 5.75), assuming Stage One gaps closed: hand tracking 5→7, first five minutes 6→7, accessibility 7, video 3→5, submission text 5 | Found: strike described as a slap (it is a seal stamp with a slap fallback), SUBMISSION Outer Ring "pinch" (open palm), incomplete verb list, flick clip showing a match-4 card, crowd bout 3-3 at 100% — text fixed, crowd retune in progress | docs |
| 5 (03:30–04:00) | Solid (seal) | — | Probe found pinching the ready seal raised a ramp under it (3/3); fixed: a pinch on the ready seal belongs to the seal. First-five in IWER: first KO 15.6 s, DESK KO 38.1 s, match end 56.7 s, 20 prompts / 74 words, no driver errors | 564d802 |
| 5 | UI/UX (hub diet) | 7 → pending | Hub at rest 45 → 18 words (longest 4), Circuit Map 41 → ~21 words; detail on hover; PLAY is the one orange call to action | 570e5c8 |
| 5 | Video / images | 5 / 4 → pending | Reel re-cut 45.5 s with current-UI seal stamp and a fresh-save first-match win (LEVEL 2, BOUT WON, NEW MOVE: Rim Spring, DAY 1 STREAK); found and fixed the NEW MOVE card being covered after <1 s; 9 IWER-labelled stills in `~/Desktop/spinsmith-videos/night-2026-10-22/stills/` | night-trailer.sh |
| 5 | Solid (crowd balance) | 6 → pending | Crowded bouts: best build last spinning 2-3 88% → 50%, 3-3 100% → 50% (crowd swaps only; assert ≤ 65%) | night-crowd merge |
| 5 | Art / video | 6 / 5 → pending | Second cut over the CC0 360° café backdrop (wooden table, skinned hands; labelled as a backdrop): DESK KO front and side, first-match rip, flick, seal stamp, first-match win cards; `spinsmith-reel-room-1080p60.mp4` 45.5 s | night-trailer.sh |
| 6 (03:45–04:17) | Solid / code structure | 6 → pending | match-system.ts 9,672 → 7,997 lines: hand-verbs.ts (Crossguard, Gust, Ember), desk-play.ts (edge arcs, drop sides, staged DESK KO, verdict, Outer Ring), result-rewards.ts, online-duel.ts; byte-identical bodies via a compiler-driven rewrite; desk-ko-first, desk-ko, desk-guard, combat-readability, room-matrix pass on the split | 97c74bc…6b9eba6 |
| 6 | Solid (probe hygiene) | — | Found: hover cards are teaching copy (shown only while the guide runs), so intent-preview depended on the save; drive resets resurrected a match via the resume snapshot; flick/rub drivers reached through the bowl floor (a groove). All fixed in the probes/driver. `HANDS_ISOLATE=1` (fresh page per mode) exposed a cold-start forge-wheel failure (turn ≥0.35 reached, charge not spent) — open. Sequential `check:hands` still fails ~1 in 2 runs on a varying mode (rub / crossguard double charge) — open | several |
| 6 re-score (04:25) | Fresh full judge | Mean 6.5 (baseline 5.75), assuming Stage One gaps closed: Innovation 7.6, Experience 6.6, Technical 5.5, Polish 6.2; submission text 7, video 5, images 4 (it looked at the 10-15 store folder) | Split judged clean (every moved line re-appears with `this.m.`); open: check:hands double charge, forge-wheel cold start. Fixed now: README layout lists the new modules, gaze called a head-ray assist, label statement per cut | docs |
| 7 (04:25–04:45) | Video / images | 5 / 4 → pending | Room cut 53.9 s: DESK KO, hub, first-match rip, DESK KO side, flick, seal stamp, four-top brawl, forge, workshop (all over the backdrop), arenas (grey), first-match win cards; 11 stills in `stills-room/` | night-trailer.sh |
| 7 (04:45–05:25) | FoV / solid | 6 / 5 → pending | FoV check now covers MENU, REMATCH, PLAY and FORGE names (head-frame angles); buttons and stations pulled in. Double-charge hunt with a charge-spend spy in IWER: a Spin Rub's circling left a Finger Groove that committed on lift (fixed); hands releasing the Arena Forge grips posted a Crossguard rail (fixed: they must leave the rim first); a hand reaching for the grips posted a rail (fixed: the pinch point reserves the grip); one Spin Rub stroke pays one window, Crossguard refunds once (agent). Arena Forge squeeze still double-charges in some long sequences (passes alone and after the tutorial probe) — open | f25b6f1, a936611, + fixes |
| 7 | Flick on a 75%-fitted arena | — | Whenever the match arena is fitted at 75% (scale 1.8: the `?demo` save, or after the room-matrix probe) the flick probe's swing never flicks (3/3 runs); at scale 2.04–2.4 it passes. Same at older commits, so not a tonight regression; on small real tables Flick may be harder to land — worth a sim/probe check of the flick contact band against root scale | open |

## Backlog
- [x] Staged match-1 DESK KO in the deciding round (edge pulse, prompt, slow-mo), `matches=0` probe, tray fallback (Passthrough 5, take-it-away 4, wow)
- [x] Unlabelled horizontal planes 0.45–1.15 m count as tables (Untested rooms 6, scene understanding 6)
- [x] Desk-edge sectors shape every round, harness-measured, beats random use (Passthrough 5)
- [x] One verb per match with one card, Flick in match 1, palm brace removed (Onboarding 6, First Five Minutes 6)
- [x] Forge grips inside the 2 ft reach check (Seated 6)
- [x] Headless FoV check, essential labels within ±35° vertical (FoV 6)
- [ ] One-Euro filter on pinch/index — tried, dropped (rip power regression); needs device
- [x] Head-ray gaze assist or drop the gaze claim (Gaze 3)
- [x] Lefty in the comfort dial (Accessibility 7)
- [x] Save match state on pause (Easy in/out 7)
- [x] `?demo` under 150 draws/eye: already 98 hub / 103 fight per eye (measured)
- [x] IWER room matrix probe: living_room, office_small, no table, small table, unlabelled table (Untested rooms 6)
- [x] Scripted `?fresh` first-five-minutes probe: time to first KO < 90 s, words shown, verbs taught (First Five Minutes 6)
- [x] Replace instruction text with hand ghosts (Onboarding 6)
- [x] Tomorrow's order on the exit card, visible streak (Reason to Come Back 8)
- [x] Captions / visual twin for every audio cue, colour-blind palette (Accessibility 7)
- [x] Frame-time probe in IWER (update CPU ms); heap metric dropped, Chromium buckets performance.memory
- [ ] Run every check 3× and fix flaky ones — combat-readability 4/4, groove 4/4, rub/gust collisions fixed; outer-ring after palm-forge open
- [x] README top 15 lines matching the code (README:85, echo.ts:30, index.html:88 fixed in 152a1f1)
- [x] Rewrite docs/SUBMISSION.md from the current game (Submission text 6)
- [ ] Refresh IWER-labelled stills (Images 5)
- [x] IWER-labelled trailer recut opening on the DESK KO (Video 4)
- [x] FPS overlay + automatic quality fallback (60 fps 3)
- [x] One gesture arbitration table for the open fingertip / palm verbs, tested (Solid 5)
- [x] Comfort modes as combinable toggles (Accessibility 6)
- [x] Fewer stamps in match 1 (55 prompts / 258 words) (First Five Minutes)
- [x] Room matrix: tilted plane, two desks, coffee table, table at the edge of reach (Untested rooms 5)
- [x] Real hands occlude the arena (joint capsules writing depth) (passthrough / polish)
- [x] One-Euro again, only on aim/hover paths; rip and flick keep raw joints (hand tracking 5)
- [x] README condensed for a 5-minute judge (text 5)
- [x] First-five "seal stamp did not spend": both — the seal pinch raised a ramp (game, fixed) and the driver aimed at a settling seal (fixed)
- [ ] Flick + groove double charge in long check:hands sequences (1 in ~6)
- [x] Hub/home label diet (UI/UX 7)
- [x] Stills from the current build, IWER-labelled: `~/Desktop/spinsmith-videos/night-2026-10-22/stills/` and `stills-room/` (the older store folder is untouched)
- [ ] check:hands: rub / crossguard double charge in sequence (~1 in 2 runs), forge-wheel cold start under HANDS_ISOLATE=1
- [ ] Flick never lands in the probe when the match arena is fitted at 75% (scale 1.8) — check the contact band against root scale
