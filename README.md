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
- **Rip-cord launch, no target to hit:** pinch anywhere and a cord runs from your top to
  your hand. Pull back to rip (pull length and speed set the power) or simply hold the
  pinch to charge; let go to launch with whichever is stronger. A sideways pull aims like
  a slingshot; otherwise the top goes where your hand points on the floor. A quick tap
  does nothing.
- An AI top launches from the far side at the same time.
- **Arena moves during the fight:** pinch the floor and lift to raise a bump
  (it glows warm); press a fingertip into the floor to make a dent. Shapes relax
  back to flat in 2–3 seconds and affect both tops.
- Tops slide down slopes, curve with their spin, grind and spark on contact,
  wobble as spin drains, then topple. A top that leaves the rim loses.
- **Far bumps:** point the hand ray at the floor during a fight and hold the pinch to
  raise a bump there. A small blue dot marks where the ray meets the arena floor. In the
  emulator's play mode a left click is a pinch, so the game is playable by looking
  around with the mouse and click-holding.
- Result card, then pinch again for the next round. Your top alternates
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

Pinching in the emulator is awkward, so the prototype can also be played with the
keyboard and the head's gaze. Enter play mode in the emulator toolbar to look around
with the mouse; a small blue reticle marks where you look on the arena floor.

| Key | Action |
|---|---|
| `Space` | Hold to charge, release to launch toward where you are looking |
| `B` | Hold to raise a bump where you are looking (during a fight) |
| `N` | Hold to press a dent where you are looking (during a fight) |
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
