# SpinSmith

A hands-first mixed reality spinning-top battler for Meta Quest, built with the
Immersive Web SDK (IWSDK). Rip your top into an arena on your real table, then
steer the fight by pulling ramps up out of the arena floor and pressing wells into it.

Entry for the Meta VR Start Developer Competition 2026 (Gaming – New Experience).
Current direction: [docs/GAMEPLAY-DIRECTION.md](docs/GAMEPLAY-DIRECTION.md); the remaining work:
[docs/ACTION-PLAN.md](docs/ACTION-PLAN.md).

## How to play

Sit at a table, enable hand tracking, and allow spatial data so the arena can stand on your
table. Everything is done with a pinch: carry your top from its dock into the arena, pinch near
it and pull back to launch, and during the fight pinch the floor and pull to raise a ramp (or
press a fingertip in for a well). Pinch the small anvil to forge your top, the blueprint to build
an arena. First to 3 heat wins a match.

- **Shared headset:** add `?fresh` to the address to start as a new player, or `?demo` for a
  prepared level-8 smith. In the headset, hold your level plate for 2 s, then pinch it again, to
  start over.
- **Move the arena:** at home, pinch the brass handle on the pedestal's near face and carry it.
  Leaving and re-entering, or recentering the headset, places it in front of you again.
- **Known limits:** nothing has been measured on a headset yet; the arena stands on the nearest
  table plane but does not yet know the table's edge.

## What is in the game

- The arena is placed about 60 cm in front of the seated player (its near rim about 30 cm), on a
  pedestal 8 cm above the nearest detected table, or on a floating tray when there is no table or
  the table is far below the eyes (standing over a coffee table). It waits up to 5 s for a table,
  and moves onto one that appears later.
- **One machine on the table** (`src/game/hub.ts`, `src/game/rim.ts`): the arena sits on your
  table, drawn twice its simulation size (about 60 cm across), and everything else is built into
  it. At home, your top waits in its dock on the near rim's left (carry it into the arena or tap
  it to play), a small anvil on the near rim's right opens the forge, a blueprint beside it opens
  the arena workshop, your level sits on a plate between them; their names show during the
  first session and afterwards only while pointed at, and a row of arena miniatures
  floats behind the arena: point at one and pinch, it flies to your hand; drop it on the arena
  (or tap it) to switch. In a match a fighting-game bar is set into the far rim
  (`src/game/match-bar.ts`: each top's spin draining as a health bar, points as pips, the
  round's result in the middle), so score and fight share one view. A small *Menu* button beside the arena returns home, and
  the match ends back home when a side reaches 3 heat.
- **Rip-cord launch, from where you choose:** pinch over the arena (inside the dashed ring)
  and your top goes to that spot; pinch anywhere else and it launches from its usual spot near
  you. A cord runs from your top to your hand. The pull aims like a slingshot (the top goes the
  other way), and its angle matters: a flat pull dashes off fast, a pull straight up launches
  slower with more spin. The rival starts from a different spot on its half every round. Rip it back and let go: power comes only from the motion, how far the hand
  travelled and how fast it was still moving at release, so a rip that stops before letting
  go loses power and a hold without a pull does nothing. While ripping, the top spins up,
  the molten cord heats from white to orange to yellow, straightens, trembles and pulses
  toward the top, and a glow ring grows under the top. 92% or more is a
  white-hot pull with extra spin. In the emulator's play mode, click and flick the mouse: the
  hands move with the view.
- An AI top launches from its spot on the far half at the same time.
- **Arenas are data** (`src/game/layout.ts`): size (12–18 cm), shape (circle, oval, square),
  floor (bowl, flat, hill, tornado ridge, two tiers), wall (low, standard, high and climbable,
  none with a sumo berm), slag pits, kick rails, pillars and pinball bumpers,
  a center vortex, a turntable, a rocking dish that tips under the tops' weight, a ring of
  embers that closes in after 16 s, and a theme (forge, stone, clockwork, ice; ice is
  slippery).
- **Six built-in arenas** (`src/game/arenas.ts`) that together use every knob: Forge Bowl,
  Ember Ring, Zero-G Dish, Clockwork Spire, Frost Oval and Sumo Square. Pick the arena on the home
  screen. `npm run report:arenas` simulates every
  type matchup on every arena and reports round length, knockouts and type balance.
- **Build your top from parts** (`src/game/parts.ts`, design in `docs/TOP-CUSTOMIZATION.md`):
  a Ring (contact style and mass: Striker, Hook, Anvil, Halo, Saw, Cog), a Core (height and
  shatter lock: Stub, Bolt, Clamp, Stilt), a Tip (movement and rail gear: Chisel, Spur, Awl,
  Dome, Pin, Bead), spin direction and color, under a 40 g weight limit (136 legal builds).
  The parts change the fight: a lower top hits under a taller one, low tops scrape on steep
  slopes, upper rings lift tops over walls, opposite spins pass spin from the faster top to
  the slower (Cog rings much more), same spins grind each other down, tips dash on rails by
  their gear, Saw rings chip toward a shatter. The classic Striker (attack), Anvil (defense)
  and Halo (stamina) are presets in a rock-paper-scissors loop. Your top is warm colored,
  the opponent's cool teal; the opponent gets a random build each round.
- **Forge, by hand** (`src/game/forge.ts`, `docs/FORGE-STADIUM.md`): pinch the small anvil and
  the arena turns into the forge: its floor sinks, an anvil rises at the near third of the bowl
  with your top on it, four drawer tabs slide out of the near rim (Ring, Core, Tip, Style) and a
  stats plate rises on the far rim. Everything you touch is within a seated arm's reach. The open
  drawer's parts (at most six) lie on a half circle around the anvil. Pinch a part and bring it
  to your top: the top comes apart to show where the part goes and that slot pulses; let go to
  fit it with a clack (tapping a part fits it too). A core locks with one click per tooth;
  overweight builds are refused. Pinch your top to pick it up and turn it; let go and it settles
  back on the anvil. Tap a paint pot or dip the top in it to paint it; spin tokens set the spin
  direction. Drop the top in the quench slot set into the right rim to save: the forge folds back into
  the arena. The stats plate shows the build, one dial per stat with a second needle previewing
  a part (green gain, red loss), and what just happened. `npm run report:tops` plays every build against the others and flags dominant
  builds and dead parts.
- **First session** (docs/GAMEPLAY-DIRECTION.md, section 12): until the first match is
  finished the home is just your top in its dock (a breathing ring calls you to it) and the
  arena; the anvil, the arena shelf and the workshop come after. The first launch shows arrows
  running toward you and how to rip; the first fight puts a breathing ring on the floor beside
  the rival where lifting would push it, until your first ramp. Finishing the first match, won or
  lost, earns the Spur tip: the anvil appears and calls for it, the forge highlights only that
  part, and after saving the dock calls you back for the rematch.
- **Smith levels** (`src/game/progress.ts`): every round gives XP (more for a win and for a
  knockout, a white-hot pull, and the match), filling levels 1-20 with ranks
  (Apprentice, Journeyman, Smith, Master Smith, Legend). Levels open options, never power: you
  start with the classic tops' parts, two paints and two arenas, and each level opens a part, a
  paint, an arena or a rival, and levels 14-20 give paints and emblem glows (cosmetic only),
  ending in a gilded ledger; the Clamp core comes from a first shatter win and the Hook ring from a
  first slag or throw win. Locked parts and arenas show dark with how they are earned. A match is
  against one rival archetype that keeps its build and spin for every round (Rim Raider, Iron
  Keep and Drifter at first; Leech, Hookjaw, Sawtooth and Bastion join with levels, announced as
  NEW RIVAL); its name and style show at the start. Higher levels make rivals rip harder and aim steadier, never
  stronger in stats.
  After a round the match bar shows the XP earned and the level bar; a level-up rings and
  throws sparks, and each unlock spins over the arena. Your level and rank sit on the near rim.
  Progress is saved in the browser.
- **A reason to come back** (`src/game/orders.ts`, `src/game/board.ts`, `docs/COME-BACK.md`):
  once the first session is over, the Smith's board over the far rim shows **today's Smith
  Order**, made from the local date and what you have unlocked (the same all day): a rival, an
  arena and one way of winning (ramp them out, shatter them, outlast them from your well, win
  with a given kind of top, with a white-hot pull, without giving up heat, on your own arena). Pinch the
  board to play it; doing it strikes a stamp into the ledger (stamps 5, 10 and 15 earn emblem
  glows). Missed days cost nothing. The board also shows the seven rivals as medallions with
  three notches each: beaten, knocked out, beaten by your own ramp or well. The last three tops
  that won a match stand as champions on the left rim with their record; pinch one to make it
  your top again. The hosted build has a web app manifest, so it can be added to the Quest
  library.
- **Shatter:** hard hits build up damage and a top can shatter, its parts flying and
  bouncing across the arena.
- **Arena workshop** (`src/game/builder.ts`, `docs/ARENA-WORKSHOP-RIM.md`): pinch the
  blueprint and the arena turns into a drafting table: blueprint lines draw over its floor, brass
  knobs mark the rim, four drawer tabs fold out in a row on the near rim as in the forge
  (Pieces; Floor; Form: circle, oval, square, and one wall and one theme piece that step on each
  tap; Extras), a brass rail no wider than the arena holds the open drawer's pieces (at most five)
  with their names engraved below, Back sits on the left rim, Try and Save on the right, Save in
  front of a stamp slot set into the rim, and a plate on the far rim shows the draft's name and form with three dials: median round length,
  knockout rate and type balance. The draft is checked in a worker (`src/game/check-worker.ts`)
  after every change, so the dials follow your edits without stalling a frame.
  The pieces: slag pits, kick rails, pillars and bumpers to place; circle, oval and square plates;
  miniature floors (bowl, flat, hill, ridge, tiers); wall rings (low, standard, high, none);
  theme gems; and extras (vortex, turntable, rocking, embers). Pinch a piece, carry it over the arena and let go: pits and rails snap to the
  rim where you drop them, pillars and bumpers stand where you drop them, the others change
  the arena. Pieces on the arena can be picked up and moved, or dropped off the arena to
  remove them. Pinch the rim and
  pull to resize; the rail steps away while a piece is carried. *Try* folds the tools away and
  plays an AI-vs-AI demo round in the draft (no points), then unfolds them; *Save* stores the
  arena in the browser, adds it to the rotation and starts a match in it.
- **Heat, first to 3:** a knockout (SLAG into a pit, THROWN over the wall, SHATTER) scores 2
  heat, OUTLAST (the other top stops first, or has less spin at the 45 s limit) scores 1. The
  score shows on the match bar.
- **Sound,** all synthesized: a spin hum per top whose pitch drops and wavers as it
  slows, metal clashes, the cord's rising tension tone, launch, rail kick, slag pit,
  burst, topple and result jingles.
- **Arena moves during the fight** (`docs/ARENA-SHAPING.md`): pinch the floor, lift and pull
  sideways to raise a ramp (lift sets its strength, the pull which way it throws a top); press a
  fingertip into the floor to make a well that catches and slows a top. A ghost shows the ramp
  while pinching, contour rings shrink as a shape relaxes back to flat in 2–3 seconds, and every
  shape affects both tops. Two charges, shown as sparks on the near rim: a shape spends one, a
  strong clash or about 6 s refills one, a hand keeps one live shape, and nothing can be shaped
  in the first 2.5 s. A finish within 1.5 s of your shape names it ("YOUR RAMP → SLAG").
- Tops orbit the bowl in their spin direction, bounce off each other and spark on
  contact, lean into hits, wobble as spin drains, then topple.
- **Far ramps:** point the hand ray at the floor during a fight and hold the pinch to
  raise a ramp there; its place locks when the pinch starts. A small blue dot marks where the ray meets the arena floor. In the
  emulator's play mode a left click is a pinch, so the game is playable by looking
  around with the mouse and click-holding.
- Result card with the finish and score, then pinch again for the next round.

## Run

```sh
npm install
npm run dev          # dev server + managed Chromium with the Quest emulator (https://localhost:8081)
npm run check:sim    # headless sanity check of the fight simulation
npm run report:arenas # how each built-in arena plays, by simulation
npm run report:tops  # how every top build plays against the others, by simulation
npm run typecheck
npm run build
```

On a headset on the same network, open the network URL printed by
`npx @iwsdk/cli dev status` and accept the local certificate warning.

### Dev keys (only in `npm run dev`)

Pinching in the emulator is awkward, so the game can also be played with the
keyboard and the head's gaze. Enter play mode in the emulator toolbar to look around
with the mouse; a small blue reticle marks where you look on the arena floor.

In dev builds the view itself is also a pointer: in play mode, look at a button (or a spot on
the arena in the builder) and click. The hands hang below the view in the emulator, so their
own rays rarely line up with what you are looking at.

| Key | Action |
|---|---|
| `Space` | Hold to charge, release to launch toward where you are looking |
| `B` | Hold to grow a ramp where you are looking, aimed outward; release to set it (during a fight) |
| `N` | Make a well where you are looking (during a fight) |
| `L` | Launch at 80% power without the hands (ready or result screen) |
| `K` | Shatter the opponent now (during a fight) |
| `O` | Throw the opponent over the wall now (during a fight) |
| `H` | A match against Hookjaw, a rival that ramps you out (home, ready or result) |
| `` ` `` | Start over as a new player: clears progress and the saved top, reloads |
| hold `1` / `2` + mouse | Move only the left / right hand across the view (the head stays still); the wheel moves it nearer or farther |
| `R` | Reset to the ready screen |
| `P` | Re-place the arena in front of the current head pose |

### Testing in the emulator (IWSDK CLI)

```sh
npx @iwsdk/cli xr enter
npx @iwsdk/cli xr set-input-mode --input-json '{"mode":"hand"}'
npx @iwsdk/cli xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.15,"z":0.1},"orientation":{"pitch":-40,"yaw":0,"roll":0}}'
npx @iwsdk/cli xr set-transform --input-json '{"device":"hand-right","position":{"x":0,"y":0.6,"z":-0.1}}'
npx @iwsdk/cli xr set-select-value --input-json '{"device":"hand-right","value":1}'   # pinch
```

The console logs `[MATCH]` lines for placement, launches and results.

## Layout

```
src/game/layout.ts         Arena layout data, rim shapes, validation
src/game/arenas.ts         The built-in arenas
src/game/arena-report.ts   Simulated play report for a layout
src/game/builder.ts        Arena workshop: drafting table, piece rail, drag and drop, resize, saved arenas
src/game/check-worker.ts   The workshop's arena check, off the main thread
src/game/rim.ts            The machine's shared tabs, pop-in and dial plate
src/game/match-bar.ts      The match bar on the far rim
src/game/sim.ts            Fight simulation (no three.js): arena from a layout, tops, collisions, verdict
src/game/hands.ts          Pinch and fingertip input from WebXR hand joints
src/game/visuals.ts        Generated matcaps, top shapes per type, burst debris, arena, sparks, cord, text card
src/game/audio.ts          Synthesized sound effects and the spin hum
src/game/match-system.ts   Placement, rip-cord launch, arena moves, AI launch, match flow
src/dev-hands.ts           Dev only: move one emulated hand with the mouse
scripts/sim-check.ts       Headless simulation check
docs/DESIGN.md             Game design document
```
