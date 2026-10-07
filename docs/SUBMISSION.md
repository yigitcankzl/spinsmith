# SpinSmith: submission texts

Meta VR Start Developer Competition 2026 · Gaming – New Experience. Drafts to paste into the
submission form; the hosted link, cover image and video come later.

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

**Learn by doing.** The first match teaches one move, the rip and the ramp, with a ghost hand
showing it; each match after adds one more. A comfort dial turns off sound or flashes, makes the
strike a gentle press, or slows fights to 80%.

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

## Video storyboard (under three minutes)

The one sentence the video must show: *Forge it by hand, rip it into your real table, then
reshape the arena to win.*

| Time | Shot | On screen |
|---|---|---|
| 0:00-0:08 | Cold open on a real wooden table: a ramp throws the rival over the wall, it lands on the table beside the arena, skids and falls over (slow motion) | YOUR RAMP → THROWN |
| 0:08-0:12 | Over the shoulder: the whole arena on the table | Title: SpinSmith |
| 0:12-0:18 | The arena transforms into the forge; hands pinch a tip from the drawer and press it onto the top | "Forge it by hand" |
| 0:18-0:28 | Pinch and pull back; the top rips into the arena | "Rip it into your real table" |
| 0:28-0:40 | Pinch the floor ahead of the rival, drag to aim: the ramp throws it into a slag pit | "Reshape the arena to win" · YOUR RAMP → SLAG |
| 0:40-0:45 | XP fills, LEVEL 2, a new part spins over the arena | Rematch |
| 0:45-0:55 | Home: the Smith's board with today's order; pinch it, ramp the rival out, ORDER DONE and a stamp strikes the ledger | A new order every day |
| 0:55-1:15 | The cup: catching the rival and slinging it into a slag pit | Two verbs: ramp and cup |
| 1:15-1:25 | Hookjaw ramps you: the cyan ramp, THEIR RAMP → SLAG | Rivals use the arena too |
| 1:25-1:45 | Three arenas in quick cuts: embers closing in, the tipping dish, the sumo square | Fifteen arenas |
| 1:45-2:15 | Forge close-ups: rings, cores, tips; stats changing as parts click in | 226 builds |
| 2:15-2:40 | A full round from the pull to a shatter | |
| 2:40-2:50 | End card: logo, "Play in the Quest browser", the link | |

Capture: on a Quest in passthrough, daylight, a real wooden table, in-headset audio; two takes
per shot; use `?demo` for the progression shots and dev key `H` (dev build) or a level-6 save for
Hookjaw.

## Still to do

- Cover image and logo.
- Hosted production build, a cold-start test from a clean browser, and the link checked in a
  private tab and from another network.
- Capture the video on a Quest.
