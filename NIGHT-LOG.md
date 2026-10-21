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
## Backlog
- [x] Staged match-1 DESK KO in the deciding round (edge pulse, prompt, slow-mo), `matches=0` probe, tray fallback (Passthrough 5, take-it-away 4, wow)
- [x] Unlabelled horizontal planes 0.45–1.15 m count as tables (Untested rooms 6, scene understanding 6)
- [ ] Desk-edge sectors shape every round, harness-measured, beats random use (Passthrough 5)
- [x] One verb per match with one card, Flick in match 1, palm brace removed (Onboarding 6, First Five Minutes 6)
- [x] Forge grips inside the 2 ft reach check (Seated 6)
- [x] Headless FoV check, essential labels within ±35° vertical (FoV 6)
- [ ] One-Euro filter on pinch/index — tried, dropped (rip power regression); needs device
- [x] Head-ray gaze assist or drop the gaze claim (Gaze 3)
- [x] Lefty in the comfort dial (Accessibility 7)
- [ ] Save match state on pause (Easy in/out 7)
- [x] `?demo` under 150 draws/eye: already 98 hub / 103 fight per eye (measured)
- [x] IWER room matrix probe: living_room, office_small, no table, small table, unlabelled table (Untested rooms 6)
- [ ] Scripted `?fresh` first-five-minutes probe: time to first KO < 90 s, words shown, verbs taught (First Five Minutes 6)
- [ ] Replace instruction text with hand ghosts (Onboarding 6)
- [ ] Tomorrow's order on the exit card, visible streak (Reason to Come Back 8)
- [ ] Captions / visual twin for every audio cue, colour-blind palette (Accessibility 7)
- [x] Frame-time probe in IWER (update CPU ms); heap metric dropped, Chromium buckets performance.memory
- [ ] Run every check 3× and fix flaky ones — combat-readability 4/4, groove 4/4, rub/gust collisions fixed; outer-ring after palm-forge open
- [ ] README top 15 lines matching the code (README:85, echo.ts:30, index.html:88 fixed in 152a1f1)
- [ ] Rewrite docs/SUBMISSION.md from the current game (Submission text 6)
- [ ] Refresh IWER-labelled stills (Images 5)
- [ ] Last: IWER-labelled trailer recut opening on the DESK KO (Video 4)
