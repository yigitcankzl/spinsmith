# SpinSmith

A hands-first mixed reality spinning-top battler for Meta Quest, built with the
Immersive Web SDK (IWSDK). Rip your top into an arena on your real table, then
steer the fight by pulling bumps up out of the arena floor and pressing dents into it.

Entry for the Meta VR Start Developer Competition 2026 (Gaming – New Experience).
Design document: [docs/DESIGN.md](docs/DESIGN.md).

## Status: first playable prototype

What works:

- The arena is placed about 40 cm in front of the seated player, on a pedestal
  8 cm above the nearest detected table (or on a floating tray when no table is found).
- **Rip-cord launch:** pinch the gold ring at the near side of the arena, pull back,
  let go. Pull length and speed set the power; pulling sideways aims the launch
  (slingshot style). A pull shorter than 5 cm does nothing.
- An AI top launches from the far side at the same time.
- **Arena moves during the fight:** pinch the floor and lift to raise a bump
  (it glows warm); press a fingertip into the floor to make a dent. Shapes relax
  back to flat in 2–3 seconds and affect both tops.
- Tops slide down slopes, curve with their spin, grind and spark on contact,
  wobble as spin drains, then topple. A top that leaves the rim loses.
- Result card, then pinch the ring again for the next round. Your top alternates
  between the wide (orange) and the narrow (teal) shape each round.

Not in the prototype yet: top shaping, parts, energy, table-tap waves, sound,
pause, persistence (see the phase plan in the design document).

## Run

```sh
npm install
npm run dev          # dev server + managed Chromium with the Quest emulator (https://localhost:8081)
npm run check:sim    # headless sanity check of the fight simulation
npm run typecheck
npm run build
```

On a headset on the same network, open the network URL printed by
`npx @iwsdk/cli dev status` and accept the local certificate warning.

### Dev keys (only in `npm run dev`)

| Key | Action |
|---|---|
| `L` | Launch at 80% power without the hands (ready or result screen) |
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
src/game/sim.ts            Fight simulation (no three.js): heightmap arena, tops, collisions, verdict
src/game/hands.ts          Pinch and fingertip input from WebXR hand joints
src/game/visuals.ts        Generated matcaps, top and arena meshes, sparks, launcher, text card
src/game/match-system.ts   Placement, rip-cord launch, arena moves, AI launch, match flow
scripts/sim-check.ts       Headless simulation check
docs/DESIGN.md             Game design document
```
