# SpinSmith

A hands-first mixed reality spinning-top battler for Meta Quest, built with the
Immersive Web SDK (IWSDK). Rip your top into an arena on your real table, then
steer the fight by pulling bumps up out of the arena floor and pressing dents into it.

Entry for the Meta VR Start Developer Competition 2026 (Gaming – New Experience).
Design document: [docs/DESIGN.md](docs/DESIGN.md).

## Status: first playable prototype

What works:

- The arena is placed about 40 cm in front of the seated player, on a pedestal
  8 cm above the nearest detected table, or on a floating tray when there is no table or the
  table is far below the eyes (standing over a coffee table).
- **The arena is the menu:** between rounds, rip your top to play; pinch the arena's rim and
  turn it like a dial to click through the arenas (the arena turns with your hand and springs
  back); pinch the smith's hammer leaning on the pedestal to open the workshop. A match ends
  at 4 points and the next one starts in the same arena.
- **Rip-cord launch, no target to hit:** pinch anywhere and a cord runs from your top to
  your hand. Rip it back and let go: power comes only from the motion, how far the hand
  travelled and how fast it was still moving at release, so a rip that stops before letting
  go loses power and a hold without a pull does nothing. While ripping, the top spins up,
  the molten cord heats from white to orange to yellow, straightens, trembles and pulses
  toward the top, and a glow ring grows under the top. 92% or more is a
  perfect rip with extra spin. A sideways rip aims like a slingshot; otherwise the top goes
  where your hand points on the floor. In the emulator's play mode, click and flick the
  mouse: the hands move with the view.
- An AI top launches from the far side at the same time.
- **Arenas are data** (`src/game/layout.ts`): size (12–18 cm), shape (circle, oval, square),
  floor (bowl, flat, hill, tornado ridge, two tiers), wall (low, standard, high and climbable,
  none with a sumo berm), pockets with 2 or 3 points, dash rails, pillars and pinball bumpers,
  a center vortex, a turntable, a rocking dish that tips under the tops' weight, a ring of
  embers that closes in after 12 s, and a theme (forge, stone, clockwork, ice; ice is
  slippery).
- **Six built-in arenas** (`src/game/arenas.ts`) that together use every knob: Forge Bowl,
  Ember Ring, Zero-G Dish, Clockwork Spire, Frost Oval and Sumo Square. Turn the rim to pick the
  arena. `npm run report:arenas` simulates every
  type matchup on every arena and reports round length, knockouts and type balance.
- **Three top types** in a rock-paper-scissors loop: Striker (attack) hunts the opponent,
  Anvil (defense) is heavy and holds the middle, Needle (stamina) spins longest. Attack
  beats stamina, defense beats attack, stamina beats defense. Shape and tip show the
  type; your tops are warm orange, the opponent's cool teal. Your type cycles each round,
  the opponent's is random.
- **Burst:** hard hits build up damage and a top can burst apart, its parts flying and
  bouncing across the arena.
- **Arena workshop:** pinch the hammer beside the arena. A menu rides above your left
  hand, facing you (like Tiny Golf's builder): tabs on top (Place, Shape, Floor, Wall, Theme,
  Extras), and the chosen category's pieces shown large in one row below, sliding in when the
  tab changes. Without a tracked left hand the menu stands at eye level beside the arena.
  The pieces: pockets, rails, pillars and bumpers to place; circle, oval and square plates;
  miniature floors (bowl, flat, hill, ridge, tiers); wall rings (low, standard, high, none);
  theme gems; and extras (vortex, turntable, rocking, embers). Pinch a piece, carry it over the arena and let go: pockets and rails snap to the
  rim where you drop them, pillars and bumpers stand where you drop them, the others change
  the arena. Pieces on the arena can be picked up and moved, or dropped off the arena to
  remove them; a quick tap on a pocket flips it between 2 and 3 points. Pinch the rim and
  pull to resize. *Try it* plays an AI-vs-AI demo round in the draft (no points) and shows
  how it played; *Save & play* stores the arena in the browser, adds it to the rotation and
  starts a match in it.
- **Points, first to 4:** pocket, over or burst finish +2, spin finish (the other top
  stops first, or has less spin at the 45 s limit) +1. The score shows on the card.
- **Sound,** all synthesized: a spin hum per top whose pitch drops and wavers as it
  slows, metal clashes, the cord's rising tension tone, launch, rail dash, pocket,
  burst, topple and result jingles.
- **Arena moves during the fight:** pinch the floor and lift to raise a bump
  (it glows warm); press a fingertip into the floor to make a dent. Shapes relax
  back to flat in 2–3 seconds and affect both tops.
- Tops orbit the bowl in their spin direction, bounce off each other and spark on
  contact, lean into hits, wobble as spin drains, then topple.
- **Far bumps:** point the hand ray at the floor during a fight and hold the pinch to
  raise a bump there. A small blue dot marks where the ray meets the arena floor. In the
  emulator's play mode a left click is a pinch, so the game is playable by looking
  around with the mouse and click-holding.
- Result card with the finish and score, then pinch again for the next round. Your top alternates
  between the wide (orange) and the narrow (teal) shape each round.

Not in the prototype yet: top shaping, parts, energy, table-tap waves, pause,
saving progress (only built arenas are saved) (see the phase plan in the design document).

## Run

```sh
npm install
npm run dev          # dev server + managed Chromium with the Quest emulator (https://localhost:8081)
npm run check:sim    # headless sanity check of the fight simulation
npm run report:arenas # how each built-in arena plays, by simulation
npm run typecheck
npm run build
```

On a headset on the same network, open the network URL printed by
`npx @iwsdk/cli dev status` and accept the local certificate warning.

### Dev keys (only in `npm run dev`)

Pinching in the emulator is awkward, so the prototype can also be played with the
keyboard and the head's gaze. Enter play mode in the emulator toolbar to look around
with the mouse; a small blue reticle marks where you look on the arena floor.

In dev builds the view itself is also a pointer: in play mode, look at a button (or a spot on
the arena in the builder) and click. The hands hang below the view in the emulator, so their
own rays rarely line up with what you are looking at.

| Key | Action |
|---|---|
| `Space` | Hold to charge, release to launch toward where you are looking |
| `B` | Hold to raise a bump where you are looking (during a fight) |
| `N` | Hold to press a dent where you are looking (during a fight) |
| `L` | Launch at 80% power without the hands (ready or result screen) |
| `K` | Burst the opponent now (during a fight) |
| `A` | Switch to the next arena (outside a fight) |
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
src/game/builder.ts        Arena workshop: piece tray, drag and drop, resize, saved arenas
src/game/sim.ts            Fight simulation (no three.js): arena from a layout, tops, collisions, verdict
src/game/hands.ts          Pinch and fingertip input from WebXR hand joints
src/game/visuals.ts        Generated matcaps, top shapes per type, burst debris, arena, sparks, cord, text card
src/game/audio.ts          Synthesized sound effects and the spin hum
src/game/match-system.ts   Placement, rip-cord launch, arena moves, AI launch, match flow
src/dev-hands.ts           Dev only: move one emulated hand with the mouse
scripts/sim-check.ts       Headless simulation check
docs/DESIGN.md             Game design document
```
