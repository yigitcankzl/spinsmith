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

The first match teaches only carry, rip, ramp and the two-hand arena forge. Later matches reveal
one move at a time with a performed ghost-hand lesson: Rim Spring, Forge Gust, Cup and Sling,
Anvil Strike, Flick, Ember Rivet, Spin Rub, Crossguard, Finger Groove and Forge Wheel. The smith
board remembers the latest move when you return.

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

- **No controllers, no menu screens.** Every action is a pinch, a pull or a press on an object: the
  part in the drawer, the top in its dock, the floor of the arena. The hand ray is only a reach
  extender: for a ramp on the arena's far side and the small Menu button. The arena, the forge and
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

## Competition video (1:52, cut 2026-11-09, game sound and a synthesized music bed)

The one sentence the video must show: *The arena is the weapon: squeeze it and throw the rival off
your desk.* Built from three research passes (Meta competition winners' videos, mixed-reality
trailers, trailer craft): the name in the first seconds, one title per shot, one move per full frame,
real gameplay only, an end card with the call to action.

| Time | Shot | Point proved |
|---|---|---|
| 0:00-0:04 | SPINSMITH logo and name; both hands squeeze the bowl on the table's corner; the rival goes over the real edge: DESK KO | The one beat that needs your desk, first |
| 0:04-0:08 | YOUR DESK IS THE RING-OUT: the same squeeze from low at the desk; the rival lands on the floor | The desk edge, seen from the side |
| 0:08-0:22 | A NEW PLAYER, UNCUT at 2x (labelled, the clock in real seconds): ghost-hand rip, first ramp, the first knockout at about 27 s | Hands only; the game teaches by showing |
| 0:22-0:24 | ONE NEW MOVE EVERY MATCH: the match-won card names the next move | Why play match 2 |
| 0:24-0:37 | Squeeze, flick, Crossguard, Spin Rub, stamp an ultimate, full frame | The core hands |
| 0:37-0:53 | EVERY MOVE BY HAND, about a second each from the moment it acts: ramp, rim spring, forge gust, cup and sling, finger groove, ember rivet, forge wheel, outer ring catch, twist, stretch, slap the table, and the ultimates Rush, Magnet, Tilt, Hammer, Ward | No move skipped |
| 0:53-1:13 | THREE BOSSES: Iron Keep's tilt and your Anvil Strike; Sawtooth's Hammer; Bastion's Anvil Strike; BEAT ALL THREE (5-0, THE CROWN IS YOURS) | The rival fights back with your own seals |
| 1:13-1:27 | FOUR-TOP BRAWLS: launch, your top knocks rivals out | Crowded play |
| 1:27-1:33 | 20 ARENAS: real match openings on three of them | Every arena plays its own way |
| 1:33-1:46 | Forge a part onto the top; shape an arena in the workshop; the Circuit Map board (demo save) | Depth and a reason to come back |
| 1:46-1:52 | The opening DESK KO at half speed with its sound (labelled 0.5x), then the end card over it: logo, SPINSMITH, Your desk is the ring-out, play it in the Quest Browser, link on the Devpost page | The line to remember, and what to do next |

Cut: `~/Desktop/spinsmith-videos/reel-2026-11-05/spinsmith-reel-v4-1080p60.mp4` (1:52, 1080p60, about
-14 LUFS). Every frame says `IWER EMULATOR / SYNTHETIC ROOM / NOT HEADSET FOOTAGE`: the capture layer
(`scripts/capture/prepare-room.sh`) draws a plain 3D room and a table matched to the emulator's
synthesised table plane, and skinned hands. `scripts/reel-v4.sh` cuts it; the music is synthesized on
the reel's own clock by `scripts/capture/music.py` (no samples or third-party audio), so cuts land on
the beat and the music stops for each KO and returns with a hit. The streak and level 8 come from the
`?demo` save. The earlier 2:31 cut (`scripts/reel-v3.sh`, with the scripted arena swap) is kept for
reference, not for submission. Still to do: real-headset footage if any Quest becomes available.

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
- **Render budget (desktop IWER, per eye, 2026-11-07):** the automated matrix measures hub 99,
  forge 99, workshop 85, a normal fight up to 118 and a 4-top brawl up to 136 draw calls per eye
  (budget 150; the script fails above it); the
  game's update 0.4-1.4 ms median; GPU 0.86 ms median on the timed scene. Under a 4x CPU throttle
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
