# SpinSmith: submission texts

Meta VR Start Developer Competition 2026 · Gaming – New Experience. Final copy and local assets
for the submission form; only the public game URL and public video upload are still external.

## Tagline (140 characters max)

> The arena is the weapon: grab its rim with both hands, bend it mid-fight, and throw the rival off your real desk.

## Project description (under 500 words)

SpinSmith is a seated, hands-first mixed reality spinning-top battler where **the arena is the
weapon** and your real desk is the ring-out.

Pinch near your top and pull back like a rip cord. Power comes from the motion, not a button. Grab
opposite sides of the live bowl with both hands, then squeeze, stretch, twist or tilt it. Releasing
the rim turns the deformation into a physical impulse that hits both tops. Push carelessly and you
can throw out your own top.

Your fingertip also enters the physics. Flick a tired top, pinch the floor to raise a ramp, press a
cup into the bowl and sling a trapped top, or stamp a charged seal for an Anvil Strike. In the
guided first match the nearest real desk edge glows red; bend the bowl there and the rival skids
over the virtual wall, across the desk and off its edge for a slow-motion **DESK KO**.

The arena uses a labelled table or a flat surface at desk height. Red arcs expose nearby desk
edges, where the rim becomes lower from the second match onward. The room therefore changes the
best angle of attack instead of merely decorating the background. Local progress, daily orders,
champion tops and battle scars survive a browser reload.

The first match teaches only carry, rip, ramp and the two-hand arena forge, each performed first
by a ghost hand. Later matches reveal one move at a time with its own NEW MOVE card: Rim Spring,
Forge Gust, Cup and Sling, Anvil Strike, Flick, Ember Rivet, Spin Rub, Crossguard, Finger Groove
and Forge Wheel (the ghost hand returns for Anvil Strike and Flick). The smith board remembers the
latest move when you return.

Build a top at the anvil by combining rings, cores and tips that alter its physics. Climb fifteen
authored Circuit bouts across three chapters, earn medals, challenge bosses that cast your own
ultimates back at you, complete daily orders, and unlock new arenas. Three- and four-top brawls,
pass-the-headset play, challenge codes and a beta online duel extend the fight.

A comfort dial can disable sound or flashes, slow fights to 80%, mirror a two-hand forge for
one-hand play, enlarge text, switch to high contrast or a colour-safe palette, and move controls
for left-handed use.

SpinSmith is built with the Immersive Web SDK for the Quest browser. A deterministic 120 Hz
simulation drives every fight. Honest limit: every submitted image and clip is from IWSDK's
browser-based XR emulator (IWER), clearly labelled; the game has not yet run on physical Quest
hardware.

## Testing instructions (for the judges)

- **URL:** https://yigitcankzl.github.io/spinsmith/ (HTTPS, opens in the Meta Quest Browser; nothing to install).
- **Headset:** Meta Quest 3 or 3S, seated at a table. Put the controllers down: SpinSmith is hands
  only. Turn on hand tracking (Settings → Movement tracking → Hand and body tracking).
- **Table:** label your desk as a table in Space Setup (Settings → Physical space → Space setup)
  for the DESK KO. Without one the arena uses a flat surface at desk height, or a floating tray
  that says so.
- **Start:** open the URL, press ENTER, allow spatial data. Pinch your top into the arena, then
  pinch near it, pull back and let go to rip.
- **What to expect:** the first match is guided and teaches carry, rip, ramp and the two-hand
  squeeze. In our scripted emulator run the first knockout came at 47 s, the first DESK KO at
  64 s and the match ended at 113 s from ENTER (2026-11-16); a real first-timer will be slower.
- **Shortcuts:** `?demo` opens a level-8 smith with most moves unlocked (PLAY is the boss
  Sawtooth); `?fresh` starts as a new player; `?fps` shows the frame rate beside MENU.
- **No headset:** the game needs the Quest Browser; the video shows every move (emulator footage,
  labelled). The repository README explains how to run it in Meta's IWER emulator.

## Inspiration

Physical spinning tops lost their best feeling when games reduced the rip, impact and unstable
arena to buttons. SpinSmith brings that movement back, then asks a question only mixed reality can
answer: what if the table and the player's hands became part of the rules?

## How it was built

TypeScript, Three.js through the Immersive Web SDK, custom deterministic game physics, WebXR
hand input, generated spatial audio and a local-first save. Headless seeded simulations test
balance and replay determinism; IWER drives repeatable hand and room captures without claiming
physical-headset validation.

## Future improvements

The next milestone is physical Quest 3/3S testing: tune pinch thresholds and reach, verify real
table detection and depth occlusion, profile sustained 72/90 Hz performance, replace emulator-only
shots, then complete public HTTPS deployment and Store packaging. Online play remains beta until it
has been tested across real networks and headsets.

## Target launch date

**February 2027**, after physical Quest validation and Meta Horizon Store review.

## Hands-first interaction

- **No controllers, no flat menus.** Every action is a pinch, a pull or a press on an object: the
  part in the drawer, the top in its dock, the floor of the arena; the one button, a small MENU
  plate on the rim, is pinched like the rest. The hand ray is only a reach extender: for a ramp on
  the arena's far side and that MENU plate. The arena, the forge and
  the score are one machine on the table: direct touch first, the ray only for what is out of reach.
- **Pinch and pull to launch:** the rip is the motion of pulling a cord, with arrows showing the
  direction the first time.
- **Pinch to ramp, drag to aim:** the ramp rises the moment the pinch holds (about a tenth of a
  second), so it meets a moving top; dragging turns it, and a small dead zone keeps tracking
  jitter from swinging it. Far ramps use the hand ray the same way.
- **Two-hand arena forge:** pinch opposite glowing rim sectors, then squeeze, tilt or twist. The
  arena visibly deforms, holds for a readable beat, and throws the stored impulse into the fight
  when released.
- **Outer Ring rescue:** once a round, when your own top is thrown onto a detected real table, you
  have 5 s to catch it with an open palm and sweep it back to the rim (it returns with less spin).
- **Press for a cup, pull to sling (from the fourth match):** a fingertip pressed into the arena floor opens a cup; a pinch on the caught top, pulled back and released, slings it.
- **Press the table to place, and to strike:** a palm pressed on the real table raises the arena
  at the table's true height, and during a fight, with the forge bar full for 4 s (or in gentle mode),
  the same press beside the arena strikes; otherwise the seal is pinched and stamped into the bowl. It is the same detector (down, then still), so a hand resting on the
  table is never a press.
- **Seated:** everything touched sits within a seated arm's reach (the check
  keeps every touch target between 0.32 and 0.67 m from the eyes); only the score and the stats,
  which are read, sit on the far rim.
- **Comfort dial:** sound off, no hit flashes, the strike as a palm pressed and held instead of
  slapped (for a fold-down tray or a shared room), fights at 80% speed, a one-hand forge (a held
  rim grip gets a mirrored partner on the far rim), and high-contrast team rings.
- **Forgiving by design:** tracking loss shorter than 0.28 s is ignored, a lost hand cancels a
  half-made shape instead of committing it, and a refused move says why in words.
- **Together, still hands-first:** the brass pegs (a pinch) set brawls or open an online room;
  PASS hands the headset over; online, each smith's two pinch points show live on the other table.

## Competition video (1:14, v11 with voice-over, 2026-11-16)

`~/Desktop/spinsmith-videos/reel-2026-11-05/spinsmith-reel-v11-vo-1080p60.mp4`, cut by `scripts/reel-v10.sh`
(picture and music) and `scripts/capture/vo-mix.py` (voice-over laid phrase by phrase on its shot, the
reel's mix ducking under it, about -14 LUFS). Earlier cuts: `scripts/reel-v9.sh` (0:40) …
`scripts/reel-v3.sh`. Each move gets its lead-in, the gesture and its result (2-3 s), with a line in
orange that says what the hand does; each of the three groups opens with a card. v11 opens on one legible DESK KO
through the player's eyes and closes on a closer one (`shots/v12/`): both hands squeeze,
the rival flies off the real desk edge and lands on the floor. Every frame, the end card included, says
`IWER EMULATOR / SYNTHETIC ROOM / NOT HEADSET FOOTAGE` (bottom right), with the speed written into it
on every retimed clip. Cuts land on the music's beat (120 BPM, synthesized by
`scripts/capture/music.py`, no samples). The voice is an AI text-to-speech read of
`docs/VIDEO-SCRIPT.md`.

| Time | Shot |
|---|---|
| 0:00-0:04 | Cold open: FOR META QUEST 3 / HANDS ONLY / NO CONTROLLERS; SQUEEZE THE ARENA.; THROW THEM OFF YOUR DESK. and DESK KO through the player's eyes (0.6x), with the SPINSMITH brand |
| 0:04-0:06.5 | PINCH. PULL. RIP. (the launch) |
| 0:06.5-0:12.5 | EXTRA / FLICK, EXTRA / CROSSGUARD (half speed), EXTRA / SPIN RUB (outside the 16, not counted) |
| 0:12.5-0:14.5 | ONE NEW MOVE PER MATCH: a won match's NEW MOVE card, then WON 4-0 · COME BACK naming the next move (1.5x) |
| 0:14.5-0:24 | Card SHAPE THE ARENA, then 1-4: Twist, Stretch, Forge Wheel, Ramp |
| 0:24-0:42 | Card WORK YOUR TOP, then 5-11: Rim Spring, Forge Gust, Palm Catch, Finger Groove, Cup and Sling, Ember Rivet, Anvil Strike |
| 0:42-0:56 | Card STAMP THE SEAL, then 12-16: Rush, Magnet, Tilt, Hammer, Ward |
| 0:56-1:04 | FORGE YOUR TOP (a whole part swap); BUILD YOUR ARENA (a placed piece); 20 ARENAS; FOUR-TOP BRAWLS |
| 1:04-1:08.5 | BOSSES CAST YOUR MOVES; BASTION AT THE RIM. STAMP!; THE FINAL BOSS FALLS (half speed) |
| 1:08.5-1:10.5 | YOUR DESK IS THE RING-OUT: a closer first-person DESK KO (0.75x) |
| 1:10.5-1:14 | The end card |

Known limits of the footage (emulator hands): the Anvil Strike slap is hard to see, the hand sits
over the Magnet well and the Hammer crater for a moment, and the Spin Rub hand runs near the centre.
The dev server (used for every emulator shot and test) is more forgiving in two places than the
shipped build: the Outer Ring palm catch reaches 1.8x as far (src/game/desk-play.ts) and the forge
picks up a top from 14 cm instead of 9 cm (src/game/forge.ts), because emulated hands cannot aim as
finely as real ones. The shipped thresholds are untested on real hands.

Capture: the presentation room (`scripts/capture/shot.mjs`) is walls, a window and a stand-in table
matched to the emulator's detected table plane; parked driver hands breathe, curl and fidget and
cast a soft shadow (capture only). The music is synthesized on the cut's clock
(`scripts/capture/music.py`, no samples), with no noise hats or crashes.

## How it was tested (card for the Devpost gallery)

- **No headset was used.** Every image and clip is Meta's IWER browser emulator and is labelled so.
- **Simulation:** `npm run check:sim` (campaign, orders, parts, arenas, reach, comfort and more),
  `check:sim-n` (two to four tops: the 2-top step equals the duel step bit for bit, rounds end, runs
  replay identically), and `report:tops` / `report:arenas` (thousands of simulated rounds per part
  and arena, no dominant build).
- **Online:** `check:net` runs the protocol over a lossy, delayed loopback (200 ms round trip, 5%
  loss): interpolation error measured under 1 mm (the check fails above 1.5 cm), every event applied once and in order, and guest input
  sanitised at the host. The duel was also played in two browser windows.
- **In the emulator, with emulated hands:** the first match's rip, ramp and two-hand forge;
  campaign bouts and medals; four-top brawls; PASS; the one-hand forge; online pairing, rounds,
  scores and live hands.
- **Render budget (desktop IWER, per eye, 2026-11-16, `artifacts/perf/render-budget-2026-11-16.json`):**
  the automated matrix measures hub 93, forge 107, workshop 63, a normal fight up to 133 and a
  4-top brawl up to 139 draw calls per eye (budget 150; the script fails above it); the
  game's update 0.4-1.4 ms median and GPU 0.86 ms median (saved 2026-10-23 runs). Under a 4x CPU throttle
  the page drops to 24-35 fps and the GPU timer shows that frame is CPU-side submission and the
  emulator; the quality guard steps down when frames run long (tested under throttle). Real Quest
  frame rate is not yet measured.

## Submission assets

- Landscape cover: `~/Desktop/spinsmith-videos/store/cover-landscape-2560x1440.png`
- Square cover: `~/Desktop/spinsmith-videos/store/cover-square-1440.png`
- Portrait cover: `~/Desktop/spinsmith-videos/store/cover-portrait-1008x1440.png`
- Hero: `~/Desktop/spinsmith-videos/store/hero-3000x900.png`
- Transparent logo: `~/Desktop/spinsmith-videos/store/logo-transparent.png`
- Hero image: `~/Desktop/spinsmith-videos/night-2026-10-22/stills-room/00-hero.jpg` (title over a two-hand forge frame, labelled)
- Gameplay stills (current build, 2026-10-22, IWER-labelled): `~/Desktop/spinsmith-videos/night-2026-10-22/stills-room/`
  (DESK KO, seal stamp, flick, four-top brawl, forge, workshop, first-match win cards). The six
  10-08 stills in `~/Desktop/spinsmith-videos/store/` predate the DESK KO staging and are superseded.
- Technical check: clean production build, clean-profile `?fresh` and `?demo`, service-worker
  controlled reload, offline second open, save/reload after the first match, and no browser errors.

## External steps still to do

- Deploy the production build to a fixed HTTPS origin, then repeat the cold-start and offline test
  against that public URL from a private tab and another network.
- Upload the competition MP4 to the video host accepted by Devpost and paste the public link.
- A physical Quest is unavailable, so 72/90 fps, true hand tracking, passthrough, real-table
  placement, depth-edge quality, anchor drift, gaze input and store packaging remain unverified.
  The systems and fallbacks pass the listed IWER tests only; do not describe them as device-tested.
