# Night audit (release candidate pass)

Working memory for the overnight RC pass. Local commits only: no push, no deploy.

## Baseline (Oct 8, commit 772a4f5)
- typecheck: pass. check:sim: all passed. build: pass, main chunk 2,597 kB (728 kB gzip), dist 3.5 MB.
- Draw calls (emulator, renderer.info): first home 142, fight 134, forge 144, workshop 96.
- Runtime flows (IWER emulator, hand driver): clean-save first session (home -> play -> rip -> ramp -> result -> forge fit Spur + quench -> rematch -> done) works; workshop drop piece -> TRY demo -> back -> SAVE starts a match on "My Arena 1"; reload keeps level 3, Spur tip, guide done, 16 arenas; console: 0 errors.
- Screenshots: docs/night/baseline/01-09.
- Reports: running (arenas, tops, shaping) -> /tmp/ed/base-*.txt.

## Reviewer findings
(pending: competition judge, game director, XR art/tech director)

## Decisions
## Active work
## Tests
## Commits
## Next step
## Quest-only / owner blockers
- Hand-tracking reliability, slap/press thresholds, table height and reach, passthrough look, hand overlap, long comfort, real fps on Quest 3/3S.
- Hosting (fixed HTTPS URL), store packaging and dashboard, team details, video upload.
