# Night audit (release candidate pass)

Working memory for the overnight RC pass. Local commits only: no push, no deploy.

## Baseline (Oct 8, commit 772a4f5)
- typecheck: pass. check:sim: all passed. build: pass, main chunk 2,597 kB (728 kB gzip), dist 3.5 MB.
- Draw calls (emulator, renderer.info): first home 142, fight 134, forge 144, workshop 96.
- Runtime flows (IWER emulator, hand driver): clean-save first session (home -> play -> rip -> ramp -> result -> forge fit Spur + quench -> rematch -> done) works; workshop drop piece -> TRY demo -> back -> SAVE starts a match on "My Arena 1"; reload keeps level 3, Spur tip, guide done, 16 arenas; console: 0 errors.
- Screenshots: docs/night/baseline/01-09.
- Reports: running (arenas, tops, shaping) -> /tmp/ed/base-*.txt.

## Reviewer findings (docs/night/REVIEW-JUDGE.md, REVIEW-DIRECTOR.md, REVIEW-XR.md)
- Judge: (1 crit) no hosted link / no Quest measurement [owner]; (2 high) UI outside comfortable view, tiny sub-lines, WORKSHOP plaque over anvil; (3 high) a pinch on the result card skips it and starts a launch (also via replay skip); (4 med) forge does not read (overlapping tip names, empty label); (5 med) room moments need Space Setup labels [docs].
- Director: (1 high) rivals/arenas never ask for a build change (tips name moves, not parts; no next rival/arena at the forge); (2 high) OUTLAST (64-84% of rounds) gives no reason; (3 med-high) the loss tip is gone by the time you are home; (4 med) Chisel -> Spur lesson invisible; (5 low) README says random rival builds.
- XR: (1 high) everything piles up above the far rim (card, bar, stamp, seal, portal, report); (2 high) the card is blurry and long lines shrink to hairlines (512x160 canvas, grid); (3 med, Quest) depth-test-off markers draw over real hands; (4 med, Quest) frame time unmeasured, fallback one-way; (5 med-low) per-frame garbage in forge/updateShapes/match bar/rim tabs.

## Decisions
- A. Fix the result-pinch skip (judge 3; code evidence; reproduce in runtime first).
- B. Card legibility and the far-rim pile (XR 1+2, judge 2): bigger canvas, a floor on the second line, no grid, the card fades while a stamp shows.
- C. Why you won or lost, and what to forge (director 1-3, judge 4): an OUTLAST reason line, rival tips that name a part, the loss tip kept in the home report, a forge line with the part's effect and the next rival.
- D. Placement: WORKSHOP plaque off the anvil; workshop tab row inside the view (judge 2, earlier playthroughs).
- E. Per-frame garbage in the forge and match bar (XR 5; code evidence; cheap).
- F. Docs: README rival line (director 5); Space Setup step 0 in the testing notes (judge 5).
- G. Shape marks and the ray reticle depth-tested (real hands cover them; XR 3).
- Not now: new table detection, Chisel retune, matchup predictor, IWSDK fork for bundle, two-step perf fallback (Quest data first).

## Active work
- A-H done and red-teamed (H: Smith's board 16% larger, judge 2); final gates run.

## Tests (latest)
- typecheck pass; check:sim all passed; build pass (f062546, d30cc7c).
- E red-team: forge hover hint drawn a frame late, friend line on bad codes, replay skip cutting the finish stamp: fixed (1812b01). Stamp queue spilling rewards into home/ready kept (dimmed card, the player still sees the reward).
- Runtime: forge hover shows the part's line (Halo, Gale); marks hidden under the hand (docs/night/after-G-marks-under-hand.png).
- Runtime: result -> pinch -> ready (was pulling), then a rip launches; forge card shows "Next: Leech, ..."; OUTLAST card shows its reason; 299 label strings fit (harness /tmp/lbl).

- Final gates (844f69f, emulator + hand driver): clean-save first session home -> play -> rip -> ramps -> result (lost 2-3, tip shown) -> forge fit Spur + quench -> rematch intro "Watch your Spur"; reload keeps level/xp/matches/guide/Spur. Workshop: Pillar dropped -> TRY round -> back -> SAVE starts a match on My Arena 1 (16 arenas); after a won match and reload, My Arena 1 and its pillar, level 2, Spur kept. Console: only "An active XRSession already exists" from a doubled emulator enter (harness), no game errors.
- Draw calls same states as baseline (fresh save): home 134 (142), fight 142 (134), forge 146 (144); workshop demo save 96 (96). Demo save: home 184-200, fight 172, forge 186 (more unlocked things on the table).
- Reports: arenas and tops no warnings; shaping complete (19 rows; sim/shaping/arena/tuning code unchanged since baseline). Build pass: main chunk 2,600 kB (729 kB gzip) vs 2,597 kB; dist 3.5 MB.
- Screenshots: docs/night/final-*.png.

## Commits
- cb4fbe3 baseline audit. f062546 result-pinch fix + card legibility (red-team: text fit failed -> fixed in d30cc7c). d30cc7c why you won/lost + forge guidance + label layout rewrite. 58ee030 D placement. 582435a E per-frame garbage + C red-team fixes. 274382b F docs. cc6d697 G depth-tested marks. 1812b01 E red-team fixes. 844f69f H board size.

## Next step
- Done without a headset. Remaining: owner/Quest blockers below.
## Quest-only / owner blockers
- Hand-tracking reliability, slap/press thresholds, table height and reach, passthrough look, hand overlap, long comfort, real fps on Quest 3/3S.
- Hosting (fixed HTTPS URL), store packaging and dashboard, team details, video upload.
