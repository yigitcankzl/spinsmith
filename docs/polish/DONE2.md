# Polish pass 2: what was built (Oct 8)

From WOW.md, STORE-READY.md, BENCHMARK.md and PLAYTHROUGH2.md.

## Wow moments (WOW.md)
- **Off the desk** (1): a thrown top keeps spinning on the real table, curves with its spin, bounces off the pedestal and can drop off the table's real edge; OFF THE DESK! and a feat; falls now use true scale (the 2.4x fast-fall bug); wood and floor landing sounds.
- **Molten handprint** (2): a strike's palm leaves a print on the desk, white-hot to a scorch.
- **Hand in the light** (3): a soft shadow under each hand over the arena; a warm glow when the strike is ready.
- **The rival breaks in** (4): a portal opens beyond the far rim; the rival's top arcs out trailing embers and lands with the VS stamp. (A detected wall is not used yet.)
- **Heat wave** (5): a won match sends a ring of warm light across the room.
- **Sparks on the table** (6, partly): sparks past the rim fall to the desk. Skid marks: not built.
- **Quench** (7): a cold blue wash and a long hiss.
- Not built: pick your top off the desk (8), turntable replay (9), the Crown looms (10).

## Store and judge readiness (STORE-READY.md)
- A service worker (offline after the first load, production only); visible start failure; guarded saves (progress, top, arenas, comfort); `privacy.html`; how-to-play, the `?fresh` tip and credits on the landing page; `lang="en"`; manifest `id`, `lang`, `categories` and a maskable icon; nothing hand-attached while the system menu is up.
- Part ids renamed from the Beyblade-derived ids (3-50, flat, rush ...) to the game's names, with old saves migrated and a check.
- The Devpost description cut to 476 words, led by the one idea.
- Needs the user: hosting (immutable HTTPS URL), store art, trailer, team details; device checks.

## Benchmark gaps (BENCHMARK.md)
- Live hand feedback (2): the pinch ring.
- Show, not tell (3): the ghost hand for the first rip and ramp.
- Spatial audio (7): HRTF panners for hums, clashes and landings, the listener following the head.
- Social (8): challenge codes.
- Accessibility (9): an Assist mode (80% speed) on the comfort dial.

## Playthrough 2 fixes
- Unlocks wait for the match's end and a pinch moves through them; the guide waits for the quench; the card is never blank between rounds; a strike's finish is not buried in text; plain rival intros; Menu needs a second pinch to leave a match; the sling's release is stamped; a clearer match report; smaller station plaques that keep clear of the props; paint names and the strike's name in the forge; raised shapes shaded as slopes (a ramp reads as a ramp); tells wind up for 1.3 s; a larger match bar.
