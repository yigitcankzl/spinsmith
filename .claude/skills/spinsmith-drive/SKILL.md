---
name: spinsmith-drive
description: Plays SpinSmith in the IWER emulator with real hand motions (rip, ramp, cup, sling, palm slap, taps on hub/forge items) through the dev hand driver, reading the game state between moves. Use to playtest a flow end to end (the first session, a match, the forge), to check that a gesture change still works, or to stage and record repeatable demo shots (DRIVE_VIDEO). Triggers: "oyna", "emülatörde dene", "elle oyna", "playtest", "demo çekimi", "drive the hands", "test the first session".
---

# Driving SpinSmith's hands in the emulator

The dev build has `window.drive` (`src/dev-drive.ts`): each call plays a real hand motion on the
emulated hands, so the game's own gesture code (pinch hysteresis, rip power from pull length and
speed, the 0.12 s ramp hold, the cup's downward speed, the slap detector) reads it. The dev keys
(Space, B, J...) skip all of that; use them only to set up a situation.

You decide between moves (slow: one CLI call is 2-4 s); the driver does the fast part (a move lasts
0.3-1.5 s and follows a moving top while it reaches).

## Setup (once per dev server)

```bash
npx @iwsdk/cli dev status        # browserCommandReady must be true
# The driver needs the Playwright runner; if `drive.sh` says automation is off:
npx @iwsdk/cli dev restart --allow-browser-automation
scripts/emu.sh enter             # enter XR, hands mode, seated head pose (again after any reload)
```

`scripts/emu.sh`: `enter`, `front`, `look X Y Z`, `shot [file]`, `logs [n] [pattern]`, `key K`.

## Calling the driver

```bash
scripts/drive.sh '["state"]'
scripts/drive.sh '["tap","play"]' '["wait",2.5]' '["rip",{"power":0.9}]' '["wait",3]' '["ramp"]'
```

Each argument is one step `[name, ...args]`; steps run in order; the output is the state after the
last step (or the last step's return value). Long sequences: `DRIVE_TIMEOUT=120000`.

| Step | What it does |
|---|---|
| `["state"]` | phase, label text, level/matches/guide, rival and its move, fight time, heat, charges, forge bar, both tops (x, z arena-local; r = distance / arena radius; spin; alive), cups, hands, and `targets` (hub or forge items with world positions) |
| `["tap", name or [x,y,z], side?]` | reach, pinch, let go. Hub: `play`, `forge`, `workshop`, `order`, `comfort`, `champion`. Forge: `tab_ring`, a part name (`Gale`), `quench`, `top` |
| `["drag", from, to, side?]` | pinch, carry, let go (e.g. a forge part onto `top`, your top into the arena) |
| `["rip", {power, aim, steep, side}]` | pinch over your top, pull back, let go while moving. power 0..1, aim degrees (+ right), steep 0..1 |
| `["ramp", {at, angle, lead, hold, side}]` | pinch the floor just inside the rival (or `at: {x, z}`), drag outward; follows the rival while reaching. Needs the fight 2.5 s in and a charge |
| `["cup", {at, side}]` | fingertip pressed into the floor where the top will be (`rival`, `mine`, `{x, z}`). From the third match |
| `["sling", {angle, pull, side}]` | pinch the top held in a cup, pull back, let go: it flies along `angle` (degrees; default outward) |
| `["slap", {gentle, side}]` | palm slapped (or pressed and held) on the table beside the near-right rim: the strike when the bar is full. From the second match |
| `["move", side, [x,y,z], dur, point]`, `["pinch", side, true/false]` | low level; point is `pinch`, `index` or `low` |
| `["key", "KeyJ", shift?]` | a dev key inside a sequence (KeyJ fill the bar, KeyK shatter the rival, KeyO throw it, KeyT start its tell, KeyC cup under it) |
| `["wait", s]`, `["rest"]` | pause; give the hands back to the emulator UI |
| `["demo"]`, `["fresh"]` | level-8 save / new player; the page reloads, then `scripts/emu.sh enter` |
| `["peek", "path"]` | a game field (`theirs.vx`, `progress.guide`, `hub.items.0.action`) for debugging |

## Playtest loop

1. `state` → read `phase` and `label`.
2. Pick the move the label asks for (the first session teaches one move per match: ramp, then the
   strike, then the cup).
3. After each move, `scripts/emu.sh logs 60` shows `[SHAPE]`, `[STRIKE]`, `[MATCH]` lines: did the
   game see the gesture? A missing `[SHAPE] ramp` after `ramp` means the gesture failed, which is
   the finding.
4. `scripts/emu.sh shot /tmp/step-N.png` and look at it (Read) when the result matters visually.
5. Report what worked, what the game did not recognise, and anything confusing on screen.

Good targets: rival `r` above 0.6 for a ramp (it throws it out); a full bar (`bar` 1) and the
rival near the rim for a slap; `cups.holding` true before a sling.

## Demo shots

Place the camera first (`scripts/emu.sh look X Y Z`, or `npx @iwsdk/cli xr set-transform` for the
headset), then record the steps:

```bash
DRIVE_VIDEO=~/Desktop/spinsmith-videos/ramp-throw.mp4 scripts/drive.sh '["rip",{"power":0.9}]' '["wait",3]' '["ramp"]' '["wait",3]'
```

The clip is what the player sees (the emulator's room with the game over it, 1920 wide, 60 fps,
H.264), without the emulator's gizmos and panels. One call is at most about 100 s; record long
takes in several clips. Check a frame with `ffmpeg -ss 5 -i clip.mp4 -frames:v 1 /tmp/f.jpg` and
Read it. Label emulator footage as captured in the emulator.

## The trailer, in one command

`scripts/trailer.sh [out-dir]` records the seven trailer shots (rise and title, portal, ramp
knockout and replay, strike, cup and sling, forge and quench, a won match) with the game's sound,
then cuts `spinsmith-trailer-rough.mp4` with title cards, every shot labelled as emulator footage.
`CUT_ONLY=1 scripts/trailer.sh` recuts from the recorded shots.

## Limits

The emulator's hands are canned poses blended by a pinch value; the driver moves them perfectly.
It checks the game's gesture logic and flow, not Quest tracking quality or how a move feels. Do
not tune `TUNE` defaults from driver runs.
