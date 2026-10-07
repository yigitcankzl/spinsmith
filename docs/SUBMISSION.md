# SpinSmith: submission texts

Meta VR Start Developer Competition 2026 · Gaming – New Experience. Drafts to paste into the
submission form; the hosted link, cover image and video come later.

## Tagline (140 characters max)

> Forge a spinning top by hand, rip it into your real table, then reshape the arena mid-fight to win.

## Project description (under 500 words)

SpinSmith is a seated, hands-first mixed reality spinning-top battler. Your arena sits on your
real table; everything you do in it, you do with your hands.

**Forge.** Pinch the small anvil and the arena turns into a forge: the floor sinks, an anvil rises
with your top on it and drawers slide out of the rim. There you build your top from three parts: a metal ring that decides how it
hits, a core that sets its height and how hard it is to shatter, and a tip that decides how it
moves. Pinch a part from the drawer and press it onto the top; the stats change as it clicks in.
Eight rings, five cores and six tips make 226 legal builds, and each one plays differently:
Striker smashes, Anvil absorbs, Halo outlasts.

**Rip.** Place your top in the arena, pinch near it and pull back toward you like a rip cord. The
harder and straighter the pull, the more spin it starts with. A white-hot pull earns extra spin.

**Reshape.** This is what no other top game has. During the fight you shape the arena floor itself.
Pinch the floor and a ramp rises there at once; drag while you hold to aim which way it throws. Press a fingertip in to open a cup that catches the next top to roll in; pinch the caught top, pull back and let go to sling it the other way, into a slag pit if you aim near one. Shapes affect both
tops and relax back to flat in two or three seconds, so a well-placed ramp can throw your rival
into a slag pit, and a careless one can throw your own top out. Two charges keep it a decision,
not a reflex: clashing refills them. When a shape decides a round, the result says so: "YOUR
RAMP → SLAG".

**Strike the table.** Your forge bar, a glowing ring on the back of your hand, fills over each
round and with every solid clash, faster while your top is behind on spin. Full, press your palm on the real table beside the arena: a shockwave
runs out through the floor and throws the tops near the rim, the hot ones furthest. Choose your
strike in the forge, six in all: the Anvil Strike, a Rush straight at the rival, a Magnet that
drags it toward a slag pit, a Tilt that dips the arena toward your palm, a Hammer that makes your
next hit crack, or a Ward that keeps your top in. A gentler press-and-hold strike is one turn of the comfort dial away. Rivals have a big move of their own, and you see it coming: a second of
flashing and a rising whine. Strike first and you cut it short.

**Read the arena.** Fifteen arenas change the fight: a balanced bowl with slag pits and kick
rails, a ring of embers that closes in, a dish that tips under weight, a crater to duel in, twin
basins split by a ridge, a speedway of boost pads, bumpers that circle the floor, and Colossus
Bowl, an arena over a metre across that opens out on your table when the match starts. Each
says at the start who it favours. Rivals have their own styles, lines and moves: rim raiders
charge, center holders quake the floor, drifters pull you toward the pits. You climb them as
circuits, each with a champion to beat. Knock one out and its signature part is yours.

**Come back.** Every day the Smith's board posts a new order: a rival, an arena and one way to win, such as ramping Iron Keep out of the ring. Doing it strikes a stamp into your ledger; missed days cost nothing. Rivals carry medallions with three marks to earn, and the tops that won stand as champions.

**Grow.** Every round gives Smith XP. Levels unlock new parts, paints and arenas, and the first
match teaches the whole loop in five minutes: rip, ramp, win or lose, forge a new tip, rematch.
Each match after it adds one move: the strike, then the cup and sling, then the rivals' tells.

Built with the Immersive Web SDK, SpinSmith runs in the Quest browser with no install. A
deterministic simulation drives the fight and our balance reports: every part, arena and shaping
strategy is measured over thousands of rounds.

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
