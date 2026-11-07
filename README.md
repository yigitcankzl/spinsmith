# SpinSmith

**The arena is the weapon.** Rip a top onto your real table, grab the arena's rim with both hands and bend the whole battlefield while the tops fight; throw the rival off the real edge of your desk for a DESK KO.

A hands-first mixed reality spinning-top battler for Meta Quest 3/3S, built with the Immersive Web SDK (IWSDK). Entry for the Meta VR Start Developer Competition 2026 (Gaming, New Experience).

**Status:** tested only in IWSDK's Quest emulator (IWER), headless simulations and browser windows; not yet run on a headset. **Hosted URL:** _PLACEHOLDER: hosted URL goes here_

## The opening, measured

From a scripted first session in IWER on 2026-11-07 (a bot that reads each card for 0.8 s; game time from XR entry, including emulated room placement):

| 34 s | 42 s | 46 s | 48 s | 59–65 s | 108 s |
|---|---|---|---|---|---|
| PUT YOUR TOP IN | rip (ghost hand shows it) | PINCH + DRAG: RAMP | first knockout | WRENCH IT OFF YOUR DESK → DESK KO | match won |

## Try it (judges): five minutes, seated, hands only
1. Sit at a table with a Meta Quest 3 or 3S, no controllers, and open the hosted URL in the Quest Browser.
2. Press **ENTER** and allow spatial data. The arena rises on your real table (a labelled table or desk, or any flat unlabelled surface at desk height); with none it stands on a floating tray and says so.
3. Pinch your top, pinch near it, pull back and let go: the rip launches it.
4. The first match teaches only the signature loop: **round 1** pinch the floor for a ramp; **round 2** grab the rim with both hands and squeeze — on a detected table the rival is steered to your real desk edge and flies off it (**DESK KO**; on the tray it is a normal ring-out). Strike and direct-touch Flick stay out of this opening and appear after the first match.
5. Each later match adds one hand move with its own card (Rim Spring, Forge Gust, cup and sling, Ember Rivet, Spin Rub, Crossguard, Finger Groove, Forge Wheel); the last card of a match names the next one, with the day streak and tomorrow's rival. From day 2 of a streak, the day's first finished match pays 25 XP per streak day (up to 7).
6. `?fresh` starts as a new player; `?demo` opens a level-8 smith with the first chapter cleared and the second up to its boss (PLAY is Sawtooth, who casts Hammer).
7. On a headset, `?fps` puts a frame-rate readout beside MENU (fps, lowest, draw calls, quality level) and `?diagnostics` shows a copyable report (per-phase fps, quality steps) on the start page after you leave XR; together they measure what the emulator could not.

**No headset?** The game runs in the IWSDK Quest emulator in Chromium (Node 22.18 or newer; the first `npm install` and `npm run dev` download about 1.2 GB including a Chromium, so allow 10+ minutes): `npm install`, `npm run dev` (it opens the emulator at https://localhost:8081), press **ENTER**, then `scripts/emu.sh enter` (or seat the emulated head, y <= 1.49, and press `P`) so the arena stands on the emulator's desk instead of the tray. Enter play mode in the emulator toolbar, look at PLAY and click to put your top in, hold and release `Space` to rip, hold `B` for a ramp and press `F` for the two-hand squeeze ([all dev keys](#dev-keys-only-in-npm-run-dev)). The production build asks for the Quest Browser; only the dev server has the emulator. Bosses are bouts 1-5, 2-5 and 3-5; with `?demo` the next PLAY is Sawtooth (2-5).

**The first match is guided:** your top is shielded for its first rounds and the rival waits until you act; in round 2 on a detected table the rival is steered to your desk edge, so any squeeze throws it (DESK KO). From match 2 the rival plays freely and a wall or burst knockout is worth 2 heat (a pocket its marked value, a DESK KO +1).

**If something goes wrong:** no table found → floating tray (it says so); hands not tracked → keep them in view, a held move waits 0.28 s before it cancels; a refused move says why on the card ("No charge yet", "Strike not ready").

## What uses your real room
- **Placement:** the arena stands on a labelled table or desk, or on an unlabelled flat surface at desk height (at least 30 cm wide); with none it floats on a tray and says so.
- **Real edges:** red-orange arcs on the rim face real table edges within about 25 cm; from the second match those sides are lower drop sides, and the first match stages a DESK KO across the nearest one.
- **Strike on the real table:** with the bar full, pinch the seal and stamp it into the bowl; if you wait 4 s (or in gentle mode) a palm slap on the real table beside the arena does it instead and leaves a molten print that cools to a scorch.
- **Outer Ring catch:** once a round, when your own top is thrown over the wall onto a detected table, you have 5 s to catch it with an open palm and sweep it back to the rim (it returns with less spin).
- **Wall portal:** the rival arrives through a portal on a detected wall behind the far rim (in the dark beyond it when there is no wall).
- **Saved pose:** carry the arena by its brass handle; its pose is saved, and kept by persistent WebXR anchors where available.
- **Without a table** (the floating tray, on a headset): no edge arcs, no drop sides, no staged or bonus DESK KO, and no Outer Ring catch (the strike slap lands on the tray's level instead); the bowl, verbs and campaign are the same. The dev emulator adds a stand-in desk outline instead ([The emulator's table](#testing-in-the-emulator-iwsdk-cli)).

## Hands

| Verb | Gesture | Unlocks |
|---|---|---|
| Rip | Pinch your top (or near it), pull back, let go | Start |
| Flick | Swing an open fingertip through a top at its height | Match 2 hint |
| Ramp | Pinch the floor and hold; drag to aim | First match, round 1 |
| Arena Forge | Grab the rim with both hands: squeeze, stretch, tilt, twist | First match, round 2 |
| Strike | Full bar: pinch the seal, stamp it into the bowl (after 4 s, or gentle mode: slap the table) | Match 2 |
| Rim Spring | Pinch rim, pull, release | Match 2 |
| Forge Gust | Sweep palm toward pocket | Match 3 |
| Cup and sling | Jab floor, catch, sling | Match 4 |
| Ember Rivet | Pinch hot rivet, plant | Match 5 |
| Spin Rub | Fingertip along your rim | Match 6 |
| Crossguard | Two palms on rim | Match 7 |
| Finger Groove | Slide fingertip, then lift | Match 8 |
| Forge Wheel | Turn the near wheel | Match 9 |

Each later verb comes with its own NEW MOVE card (`VERB_RELEASE` and `VERB_CARD` in `src/game/progress.ts`). Online duels, brawls and the `?demo` save (level 8) have every verb. Every one-hand gesture (rip, ramp, cup, strike) works with either hand. Per-verb tuning is in [DESIGN.md](DESIGN.md); Flick's measured effect comes from `npm run report:flick`.

## Measured performance (IWER on a desktop GPU, not a Quest)

**In short:** 47–117 draw calls per eye in every saved state (budget 150), the game's own update 0.4–1.4 ms per frame (p50, unthrottled, 2026-10-23; up to 2.0 ms in a slower 11-05 session), GPU time 0.86 ms per frame (p50) on the timed capture-room scene (95 draws per eye). Under a 4x CPU throttle the page drops to 24–35 fps, and the GPU timer shows why: of a ~37 ms frame, game update plus GPU are about 5 ms and the rest is CPU-side draw submission and the emulator. Nothing here is a Quest measurement.

`npm run report:runtime-performance` reports the active renderer and fails when a phase goes over 150 draw calls per eye. IWER renders each eye as its own camera without multiview, so the script divides the renderer's count by the number of views. Saved runs from 2026-10-23 are in `artifacts/perf/`.

| Phase | Draw calls per eye | Lowest fps over 5 s | Game update per frame (p50 / p95 / max) |
|---|---|---|---|
| Hub | 47 | 97 | 0.9 / 1.2 / 2 ms |
| Ready, first match | 75 | 88 | 1.4 / 1.7 / 2.5 ms |
| Fight, first match | 51 | 88 | 1.2 / 1.8 / 3.1 ms |
| Fight, first match, capture room (planes and edge arcs up) | 83 | 96 | 0.5 / 0.8 / 1.5 ms |
| Fight, 4-top brawl, capture room | 97 | 89 | 0.8 / 1.3 / 6.7 ms |
| Fight, 4-top brawl on the opened-out arena, capture room (2026-11-05, `brawl4-fight-room-2026-11-05.json`) | 112 | 74 | 2.0 / 2.6 / 3.6 ms |

The 2026-11-05 rows come from a later session than the 10-23 rows; an A/B in that one session (same brawl, opened-out vs original arena, two runs each) read 1.8–1.9 vs 1.8–2.0 ms update p50 and 71–74 vs 70–73 lowest fps, so the opened-out arena costs nothing measurable; the session itself runs slower than 10-23's.

A 4-top brawl at 4x CPU throttle (next round's ready phase) reads 86 draws per eye, lowest 24 fps, update p95 3.7 ms (`brawl4-ready-room-cpu4x-2026-10-23.json`). The worst case saved is 117 draws per eye (ready phase with the capture room's planes and the desk-edge arcs up, `ready-cpu1x-2026-10-23.json`); the gate fails the script above 150 in any state.

CPU-throttled proxy (`PERF_THROTTLE=4` / `6`, DevTools CPU emulation, ready phase, `artifacts/perf/ready-cpu*x-2026-10-23.json`): the game's own update per frame goes from 0.4 / 0.6 ms (p50 / p95) unthrottled to 1.9 / 2.5 ms at 4x and 3.0 / 4.6 ms at 6x, inside a 72 Hz frame (13.9 ms). These throttled runs caught a heavier scene than the table above (117 draws per eye, 168 k triangles, the capture room's planes and edge arcs up). The page's lowest fps falls to 35 at 4x and 21 at 6x. With the game's update that small (2.5 ms p95 at 4x), the rest of the frame is three.js submitting two eye passes without multiview plus the emulator itself (IWER runs in the same JavaScript thread and draws the 360 backdrop); since then the script also times the GPU (EXT_disjoint_timer_query_webgl2 around each render): on the capture-room ready scene (95 draws per eye) GPU time is 0.86 ms p50 unthrottled and 2.4 ms p50 at 4x, so of the ~37 ms frame at 4x (27 fps) the game update and the GPU take about 5 ms and the rest is CPU-side draw submission and the emulator (`ready-room-gpu*-2026-10-23.json`). The GPU figure rises under CPU throttle because the timer spans begin to end on the GPU timeline, which includes the GPU waiting on slower command submission; it is an upper bound on GPU work. How much of that CPU cost carries over to a Quest is not known; this is not a Quest prediction.

The quality guard is off under the emulator by design (a desktop frame rate says nothing about a headset); `PERF_GUARD=1 PERF_THROTTLE=6` turns it on for the run and fails if it does not step down. Saved run (`artifacts/perf/guard-cpu6x-2026-10-23.json`): at 24 fps it went full → lite after 3 s, then lite → lite+foveation after 3 more. That run's game update peaked at 15.3 ms (p95 6.7 ms), one spike over a 72 Hz frame at 6x throttle.

The budget is 150 draws per eye, with no bloom and no shadow maps. The frame rate on Quest has not been measured, because the game has not run on a headset yet. There, `?fps` shows the frame rate and lowest frame rate. When frames run long, a quality guard first turns off room dimming, then sets full fixed foveation (src/game/quality.ts).

## Accessibility (seated, hands only)

One brass dial on the home table (its plate shows unasked through a new player's first session, src/game/hub.ts:412); each pinch turns it, a pinch on its plate toggles the stop. Stops in order (src/game/comfort.ts):

1. **Calm**: no flashes and press-to-strike together
2. **Large text**: cards, stamps, match bar and gauge labels 1.3x
3. **One hand**: hold one rim grip to forge; the far rim mirrors it
4. **Assist**: fights run at 80% speed
5. **Quiet**: sound off (every gameplay sound has a visual twin: a stamp or the card)
6. **No flashes**
7. **Press to strike**: press and hold instead of a slap
8. **High contrast**: wide, solid team rings
9. **Left-handed**: home stations swap sides
10. **Colour-safe**: Okabe-Ito blue / orange / yellow warnings; your rings are round and the rival's hexagons (src/game/visuals.ts:915), and the real-edge band is striped (src/game/desk-play.ts:57), so nothing relies on hue alone
11. **Standard**: everything off but the hand

The toggles combine and are saved. `npm run check:sim` covers the dial, Large text's scale and the colour-safe swaps.

## IWSDK features used (and where)

| Feature | Where | Run on |
|---|---|---|
| ECS world and systems (`World.create`, `createSystem`) | src/index.ts, src/game/match-system.ts (`createSystem`) | IWER |
| Scene planes with semantic labels (`XRPlane`, table/desk choice) | src/game/match-system.ts (`XRPlane` query), src/game/placement.ts | IWER (synthesised rooms, `check:room-matrix`) |
| Environment hit-test for unlabelled surfaces (`EnvironmentRaycastTarget`) | src/game/match-system.ts (`EnvironmentRaycastTarget`) | IWER |
| Persistent anchor for the smithy pose (`XRAnchor`) | src/game/match-system.ts (`XRAnchor`) | IWER |
| Depth occlusion (`DepthOccludable`) | src/game/match-system.ts (`DepthOccludable`) | not yet (IWER has no camera depth) |
| Hand joints (`XRHand`), joint proxies that hide the game behind real hands | src/game/hands.ts, src/game/hand-occluder.ts | IWER |
| Fixed foveation (`setFoveation`): 0.5 at start, full when the quality guard steps down | src/index.ts, src/game/match-system.ts (`setFoveation`), src/game/quality.ts | IWER (`PERF_GUARD=1`) |
| HRTF spatial audio (`PannerNode`) | src/game/audio.ts | desktop browser |

## Known limits

- Nothing has been run or measured on a headset yet, including frame rate (`?fps` and `?diagnostics` are there for it).
- Unlabelled-surface placement is probed only in IWER with synthesised planes (`npm run check:room-matrix`, green 2026-11-05), not in a real room; a table or desk labelled in Space Setup is preferred.
- Persistent anchors have only been exercised in IWER. Depth occlusion is off under IWER (no camera depth), so it has not run anywhere yet. Real hands hide the game behind them through invisible tracked-joint proxies (spheres, bone rods and a palm slab; on over passthrough, off with `?nohandocclude`), seen only in IWER.
- Head-ray assist: on Quest (no eye tracking) looking at a far button for 0.4 s lights it and a pinch away from the bowl presses it; a real gaze source (Meta VR Glasses) gets a full pointer. Neither has run on a headset.
- The online duel (beta) has run between two browser windows and two browser processes on one machine, not between two headsets or two homes; public STUN only, so some strict networks will not connect.
- Real-edge drop sides, Spin Rub and installing to the Quest library are unverified on a headset; the offline cache is checked in the browser only.

## Modes, and where to find them in the headset

| Mode | How to reach it |
|---|---|
| **Circuit Map campaign:** 15 bouts, 3 chapters, 3 medals a bout; each chapter's boss casts one of your ultimates back at you (Iron Keep Tilt, Sawtooth Hammer, Bastion Anvil Strike) after a 1.4 s telegraph your own strike can interrupt (any seal but Ward); rival moves and boss seals start from your fourth match | Automatic after the first match: PLAY starts the next bout. Pinch the level plate to see the map. |
| **Brawl:** 3 or 4 tops in three rule sets: last one spinning, first credited pocket, or Crucible (first 3-heat pocket); the arena opens out 20% per top past two | Pinch the brass pegs beside the level plate (each pinch steps duel → last spinning 3, 4 → pocket 3 → Crucible 4), then PLAY. |
| **Pass and play** on one headset | After a duel, pinch PASS: the next person fights that top and its recorded hands. |
| **Daily Smith Order** | Point at the board over the arena and pinch. About every other day it chases a medal you left on the map, and playing it counts for that bout. |
| **Echo duel** with a friend's top and hands | Open `?vs=CODE` (the code is on the board's back). |
| **Online duel (beta)**, tested in two browser windows | Keep pinching the pegs past the Crucible brawl (all pegs turn white-hot) or open `?online=host`: the card shows a five-letter room code; the friend opens `?online=CODE` (both after the first session). |
| **Forge** your top / **build** an arena | Pinch the small anvil / the blueprint on the near rim. |
| **Comfort and accessibility** | Independent toggles that combine (left-handed and high contrast and quiet at once): Quiet (sound off), No flashes, Press to strike, Assist (80% speed), One hand (forge with one hand), High contrast, Left-handed, Colour-safe (blue/orange/yellow warnings; your rings are round, the rival's hexagons) and Large text (the card, stamps and match bar 1.3x), plus the presets Calm (no flashes + press to strike) and Standard (all off but the hand). Hands only: pinch the brass dial to pick a setting, then pinch the plate in front of it, which shows ON/OFF, to toggle it. Each toggle is kept; an old single-mode save becomes its matching toggles. Every gameplay sound has a visual twin (a stamp or the card), so Quiet loses no information. Left-handed swaps the near-rim stations to the other side; `?lefty` once still holds it on, `?lefty=0` undoes. |

All interactions are pinches, palm presses or grabs. Nothing needs a controller, and every one-hand
gesture (rip, ramp, cup, strike) works with either hand (left-hand rip and ramp checked in IWER).

Full feature list, the How to play details and every design number: [DESIGN.md](DESIGN.md).

## Run

```sh
npm install
npm run dev          # dev server + managed Chromium with the Quest emulator (https://localhost:8081)
npm run check:sim    # headless sanity check of the fight simulation
npm run check:sim-n  # two-to-four-top simulation check
npm run check:net    # online protocol check over a lossy loopback
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
| `N` | Open a cup where you are looking (during a fight) |
| `C` | Open a cup right under the rival, to try the sling (during a fight) |
| `J` | Fill the forge bar (then press a palm on the table beside the arena); `Shift+J` also strikes (during a fight) |
| `T` | Fill the rival's bar: its tell starts, or a boss's seal (during a fight, from the fourth match) |
| `A` | Show the next arena, locked or not (home) |
| `L` | Launch at 80% power without the hands (ready or result screen) |
| `F` | Both emulated hands grab the rim and squeeze: the real two-hand Arena Forge, so the first match's round 2 DESK KO works on a desktop (during a fight, emulator in hand mode) |
| `K` | Shatter the opponent now (during a fight) |
| `1`-`6` | Pick a strike seal (during a fight; outside a fight, hold 1 / 2 with the mouse to move a hand) |
| `G` | Force the rival's charge (during a fight) |
| `O` | Throw the opponent over the wall now (during a fight) |
| `H` | A match against Hookjaw, a rival that ramps you out (home, ready or result) |
| `` ` `` | Start over as a new player: clears progress and the saved top, reloads |
| hold `1` / `2` + mouse | Move only the left / right hand across the view (the head stays still); the wheel moves it nearer or farther |
| `R` | Reset to the ready screen |
| `P` | Re-place the arena in front of the current head pose |

### Testing in the emulator (IWSDK CLI)

**Measured first session** (`npm run check:first-five`: IWER, office_small room, a scripted newcomer that reads each card for 0.8 s; a bot, not a human; 2026-11-07): first knockout at 48.2 s, first DESK KO at 64.5 s and match over at 107.7 s from XR entry, including placement. The match showed 10 distinct prompts / 43 words, and the probe fails on missing carry, rip, ramp or Arena Forge actions, driver errors, strike/Flick teaching, more than 10 prompts / 45 words, no match end, or a first KO after 90 s. Other IWER suites: `check:hands` (every hand verb), `check:desk-ko-first`, `check:desk-ko`, `check:desk-guard`, `check:combat-readability`, `check:room-matrix` (10 room cases, synthesised planes). `check:desk-ko-first` and `check:room-matrix` expect the arena on the emulator's desk: a page loaded while the emulated head stood (IWER's default y = 1.6) puts it on the tray, so both scripts first seat the head (`scripts/emu.sh enter`) and re-place it (`scripts/capture/place.mjs`); other probes can also leave the arena away from the desk edge.

**Hand driver** (`src/dev-drive.ts`, dev builds only): `window.drive` plays real hand motions on
the emulated hands (tap, drag, rip, ramp, cup, sling, palm slap), so the game's own gesture
detection reads them, unlike the dev keys. From a shell (dev server started with
`--allow-browser-automation`): `scripts/emu.sh enter`, then for example
`scripts/drive.sh '["tap","play"]' '["wait",2.5]' '["rip",{"power":0.9}]' '["wait",3]' '["ramp"]'`.
`scripts/check-hand-mechanic.mjs` contains the repeatable interaction probes used by the build.

```sh
npx @iwsdk/cli xr enter
npx @iwsdk/cli xr set-input-mode --input-json '{"mode":"hand"}'
npx @iwsdk/cli xr set-transform --input-json '{"device":"headset","position":{"x":0,"y":1.15,"z":0.1},"orientation":{"pitch":-40,"yaw":0,"roll":0}}'
npx @iwsdk/cli xr set-transform --input-json '{"device":"hand-right","position":{"x":0,"y":0.6,"z":-0.1}}'
npx @iwsdk/cli xr set-select-value --input-json '{"device":"hand-right","value":1}'   # pinch
```

The console logs `[MATCH]` lines for placement, launches and results.

**The emulator's table.** `iwsdk.config.json` loads IWER's `office_small` room (`dev.emulator.environment`),
one of the Meta Quest scene captures IWER ships (`living_room`, `meeting_room`, `music_room`,
`office_large`, `office_small`, fetched from `@iwer/sem` on unpkg). It holds a real `table`-labelled
horizontal XRPlane, 1.60 m x 0.75 m with its top at 0.748 m, centred at (0.06, 0.75, -0.65): a
desk directly in front of the origin, with a wall behind it. IWER feeds it through
`XRFrame.detectedPlanes` like Quest's Space Setup does, so the game's production detection
(`tables()` / `tableShape()` in `src/game/match-system.ts`) reads it unchanged. Dev builds only
(none of this is in the Quest build): when no table is found, `setRoom` gives the emulator a 78 x 62 cm
stand-in desk outline so the Outer Ring and the real-edge KO stay testable, and the Outer Ring palm
catch (1.8x) and the forge's palm pick-up (14 vs 9 cm) are more forgiving for emulated hands. The head has to be seated
(eyes at most 0.75 m above the desk, i.e. y <= 1.49), as on a headset: `scripts/emu.sh enter` /
`front` use y = 1.45, and the pose above (1.15) works too. IWER's default standing head
(y = 1.6) is correctly refused as "standing over the table" and the arena floats on the tray; seat
the head and press `P` to re-place. On the table the log reads `[MATCH] arena on table at ...`
(or `[MATCH] snapped to table at 0.83` if the head was seated after the first placement), and
each fight logs `[MATCH] fit <arena>: scale ..., slide ... m` without `(no table)`. The `living_room`
capture also has tables, but none in reach of a seated player at the origin, so every match there
said "(no table)".

## Layout

```
src/game/layout.ts         Arena layout data, rim shapes, validation
src/game/arenas.ts         The built-in arenas
src/game/arena-report.ts   Simulated play report for a layout
src/game/builder.ts        Arena workshop: drafting table, piece rail, drag and drop, resize, saved arenas
src/game/check-worker.ts   The workshop's arena check, off the main thread
src/game/rim.ts            The machine's shared tabs, pop-in and dial plate
src/game/match-bar.ts      The match bar on the far rim
src/game/sim.ts            Fight simulation (no three.js): arena from a layout, tops, collisions, verdict; stepN for 2-4 tops
src/game/campaign.ts       The Circuit Map: bouts, medals, chapter gates, map-paced rival skill
src/game/online.ts         The online duel: host and guest roles over a transport
src/game/net.ts            Online transports (WebRTC via Trystero, BroadcastChannel, loopback), snapshots, reliable events
src/game/hands.ts          Pinch and fingertip input from WebXR hand joints
src/game/visuals.ts        Generated matcaps, top shapes per type, burst debris, arena, sparks, cord, text card
src/game/audio.ts          Synthesized sound effects and the spin hum
src/game/match-system.ts   Placement, rip-cord launch, arena moves, AI launch, match flow
src/game/desk-play.ts      Real-room play: desk-edge arcs and drop sides, the staged first DESK KO, desk verdict, Outer Ring
src/game/hand-verbs.ts     Crossguard, Forge Gust and Ember Rivet
src/game/gesture-owner.ts  One owner per hand per frame: the priority table between the open-hand verbs
src/game/result-rewards.ts Result screen: level-up, unlock cards, streak and tomorrow's order
src/game/online-duel.ts    Opening, joining and running an online duel
src/game/placement.ts      Table choice (labelled and unlabelled planes), arena height and reach
src/game/lessons.ts        First-match prompt copy (5-word cap) and hover cards
src/game/quality.ts        Frame-rate guard and per-phase fps samples for ?fps / ?diagnostics
src/game/one-euro.ts       One-Euro smoothing for aim and hit tests (speed verbs read raw joints)
src/dev-hands.ts           Dev only: move one emulated hand with the mouse
scripts/sim-check.ts       Headless simulation check (campaign, orders, parts, arenas included)
scripts/sim-n-check.ts     Two-to-four-top simulation check (2-top equality, determinism, rounds end)
scripts/net-check.ts       Online protocol check over a lossy, delayed loopback
```
