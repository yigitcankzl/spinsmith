# SpinSmith: submission texts

Meta VR Start Developer Competition 2026 · Gaming – New Experience. Final copy and local assets
for the submission form; only the public game URL and public video upload are still external.

## Tagline (140 characters max)

> Forge a spinning top by hand, rip it into your real table, then reshape the arena mid-fight to win.

## Project description (under 500 words)

SpinSmith is a seated, hands-first mixed reality spinning-top battler, and it has one idea no top
game has had: **you fight by reshaping the arena.** The arena stands on your real table; everything
you do in it, you do with your hands.

**Rip.** Pinch near your top and pull back like a rip cord. The harder and straighter the pull,
the more spin. A white-hot pull earns extra.

**Reshape.** During the fight, pinch the arena floor and a ramp rises at once; drag to aim it, and
throw your rival into a slag pit or over the wall. Press a fingertip in to open a cup that catches
a top; pinch it, pull back and let go to sling it. Shapes affect both tops, so a careless ramp can
throw your own top out. When your move decides a round, the arena says so, and plays it again.

**Strike the table.** A forge bar glows on the back of your hand. Full, slap your palm on the real
table beside the arena: a shockwave runs through the floor, and your palm leaves a molten print on
your desk. Six strikes to choose from: Anvil, Rush, Magnet, Tilt (the arena dips toward your
palm), Hammer and Ward. Rivals wind up big moves of their own; strike first and cut them short.

**Your room is the stage.** A rival arrives through a portal and slams into the arena. A top
thrown over the wall keeps spinning across your real desk and can drop off its real edge. Your
hands cast shadows on the arena, a win sends a wave of light across your room, and every sound
comes from where it happens.

**Forge.** Pinch the small anvil and the arena becomes a forge. Build your top from 226 legal
combinations of ring, core and tip; each changes the physics, not just a number. Quench it to
save, and the room turns cold blue for a breath.

**Climb.** Seven rivals with their own lines and moves, climbed as circuits with a champion each;
fifteen arenas, from a balanced bowl to a ring of closing embers to a stadium over a metre
across; daily Smith Orders, twelve feats, personal bests, and an arena workshop with live
balance dials. Levels open options, never power. Share your top as a challenge code and a friend
fights it.

**Learn by doing.** The opening match gives each hand verb its own round: rip and ramp, then catch
and sling, then an arena-changing ultimate. A ghost hand shows the first ramp, and every knockout
in this lesson scores one heat so no step gets skipped. A comfort dial turns off sound or flashes,
makes the strike a gentle press, or slows fights to 80%.

Built with the Immersive Web SDK, SpinSmith runs in the Quest browser with no install and works
offline once loaded. A deterministic simulation drives the fight and the balance: every part,
arena and strike is measured over thousands of rounds.

## Hands-first interaction

- **No controllers, no menus.** Every action is a pinch, a pull or a press on an object: the part
  in the drawer, the top in its dock, the floor of the arena. The hand ray is only a reach
  extender: for a ramp on the arena's far side and the small Menu button. The arena, the forge and
  the score are one machine on the table, so the hands never switch between touching and pointing.
- **Pinch and pull to launch:** the rip is the motion of pulling a cord, with arrows showing the
  direction the first time.
- **Pinch to ramp, drag to aim:** the ramp rises the moment the pinch holds (about a tenth of a
  second), so it meets a moving top; dragging turns it, and a small dead zone keeps tracking
  jitter from swinging it. Far ramps use the hand ray the same way.
- **Press for a cup, pull to sling:** a fingertip pressed into the arena floor opens a cup; a pinch on the caught top, pulled back and released, slings it.
- **Press the table to place, and to strike:** a palm pressed on the real table raises the arena
  at the table's true height, and during a fight, with the forge bar full, the same press beside
  the arena is your strike. It is the same detector (down, then still), so a hand resting on the
  table is never a press.
- **Seated:** everything touched sits within a seated arm's reach (the check
  keeps every touch target between 0.32 and 0.67 m from the eyes); only the score and the stats,
  which are read, sit on the far rim.
- **Comfort dial:** sound off, no hit flashes, and the strike as a palm pressed and held instead
  of slapped (for a fold-down tray or a shared room).
- **Forgiving by design:** tracking loss shorter than a tenth of a second is ignored, and a lost
  hand cancels a half-made shape instead of committing it.

## Competition video (0:50)

The one sentence the video must show: *Forge it by hand, rip it into your real table, then
reshape the arena to win.*

| Time | Shot | Point proved |
|---|---|---|
| 0:00-0:03 | Rip and live ramp cold open | The core new experience is visible immediately |
| 0:03-0:08 | Arena rise and rival portal | Seated tabletop scale; the room is the stage |
| 0:08-0:20 | Ramp, cup/sling and table strike | Hands actively reshape a live fight |
| 0:20-0:32 | Forge and arena workshop | Physical build expression and authored battlegrounds |
| 0:32-0:40 | Anvil, Tilt and Ward | Three distinct ultimates leave persistent arena rules |
| 0:40-0:49 | Arena variety, progression and match finish | Breadth, return loop and instant rematch |
| 0:49-0:50 | End card | Hands only · seated · Quest Browser |

Final video: `~/Desktop/spinsmith-videos/submission-package/spinsmith-competition-1080p60.mp4`
(50.333 s, H.264, 1920×1080 at 60 fps, stereo AAC). Every gameplay shot is visibly labelled
`IWER EMULATOR CAPTURE · QUEST BUILD`: IWER is IWSDK's browser-based XR emulator. This is honest
prototype footage and does not claim to demonstrate physical-headset passthrough or tracking.
`CAPTURE=1 scripts/competition-trailer.sh` recreates every source clip and the final cut from the
current build; running it without `CAPTURE` re-cuts the existing sources.

## Submission assets

- Landscape cover: `~/Desktop/spinsmith-videos/store/cover-landscape-2560x1440.png`
- Square cover: `~/Desktop/spinsmith-videos/store/cover-square-1440.png`
- Portrait cover: `~/Desktop/spinsmith-videos/store/cover-portrait-1008x1440.png`
- Hero: `~/Desktop/spinsmith-videos/store/hero-3000x900.png`
- Transparent logo: `~/Desktop/spinsmith-videos/store/logo-transparent.png`
- Six gameplay stills: `~/Desktop/spinsmith-videos/store/01-portal.png` through `06-home.png`
- Technical check: clean production build, clean-profile `?fresh` and `?demo`, service-worker
  controlled reload, offline second open, save/reload after the first match, and no browser errors.

## External steps still to do

- Deploy the production build to a fixed HTTPS origin, then repeat the cold-start and offline test
  against that public URL from a private tab and another network.
- Upload the competition MP4 to the video host accepted by Devpost and paste the public link.
- A physical Quest is unavailable, so 72/90 fps, true hand tracking, passthrough, table placement,
  depth occlusion and store packaging remain unverified. Do not describe them as device-tested.
