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
hits, a core that sets its height and how hard it is to burst, and a tip that decides how it
moves. Pinch a part from the drawer and press it onto the top; the stats change as it clicks in.
Six rings, four cores and six tips make 136 legal builds, and each one plays differently:
Striker smashes, Anvil absorbs, Needle outlasts.

**Rip.** Place your top in the arena, pinch near it and pull back toward you like a rip cord. The
harder and straighter the pull, the more spin it starts with. A perfect rip earns extra spin.

**Reshape.** This is what no other top game has. During the fight you shape the arena floor itself.
Pinch the floor, lift and pull sideways to raise a ramp: lift sets how hard it throws, the pull
which way. Press a fingertip in to sink a well that catches a top and holds it. Shapes affect both
tops and relax back to flat in two or three seconds, so a well-placed ramp can throw your rival
into a pocket, and a careless one can throw your own top out. Two charges keep it a decision,
not a reflex: clashing refills them. When a shape decides a round, the result says so: "YOUR
RAMP → POCKET".

**Read the arena.** Six arenas change the fight: a balanced bowl with pockets and dash rails, a
ring of embers that closes in, a dish that tips under weight, a walled spire with no ring-outs,
an ice oval with a vortex, and a wall-less sumo square. Each says at the start who it favours.
Rivals have their own styles: rim raiders, center holders and long drifters.

**Come back.** Every day the Smith's board posts a new order: a rival, an arena and one way to win, such as ramping Iron Keep out of the ring. Doing it strikes a stamp into your ledger; missed days cost nothing. Rivals carry medallions with three marks to earn, and the tops that won stand as champions.

**Grow.** Every round gives Smith XP. Levels unlock new parts, paints and arenas, and the first
match teaches the whole loop in five minutes: rip, ramp, win or lose, forge a new tip, rematch.

Built with the Immersive Web SDK, SpinSmith runs in the Quest browser with no install. A
deterministic simulation drives the fight and our balance reports: every part, arena and shaping
strategy is measured over thousands of rounds.

## Hands-first interaction

- **No controllers, no menus to aim at.** Every action is a pinch, a pull or a press on an object:
  the part in the drawer, the top in its dock, the floor of the arena. The arena, the forge and
  the score are one machine on the table, so the hands never switch between touching and pointing.
- **Pinch and pull to launch:** the rip is the motion of pulling a cord, with arrows showing the
  direction the first time.
- **Pinch, lift and pull to ramp:** the position locks when the pinch starts, a ghost shows the
  ramp before you let go, and release commits it. Far shapes use the hand ray with the same lock,
  so tracking jitter never moves them.
- **Press to well:** a fingertip pressed into the arena floor.
- **Seated:** everything touched sits within a seated arm's reach (about 0.45 m); only the
  score and the stats, which are read, sit on the far rim.
- **Forgiving by design:** tracking loss shorter than a tenth of a second is ignored, and a lost
  hand cancels a half-made shape instead of committing it.

## Video storyboard (under three minutes)

The one sentence the video must show: *Forge it by hand, rip it into your real table, then
reshape the arena to win.*

| Time | Shot | On screen |
|---|---|---|
| 0:00-0:08 | Over the shoulder: a real table, the arena appears on it | Title: SpinSmith |
| 0:08-0:18 | The arena transforms into the forge; hands pinch a tip from the drawer and press it onto the top | "Forge it by hand" |
| 0:18-0:28 | Pinch and pull back; the top rips into the arena | "Rip it into your real table" |
| 0:28-0:40 | Pinch the floor, lift and pull: a ramp throws the rival into a pocket | "Reshape the arena to win" · YOUR RAMP → POCKET |
| 0:40-0:45 | XP fills, LEVEL 2, a new part spins over the arena | Rematch |
| 0:45-0:55 | Home: the Smith's board with today's order; pinch it, ramp the rival out, ORDER DONE and a stamp strikes the ledger | A new order every day |
| 0:55-1:15 | The well: holding a stamina top in the middle against an attacker | Two verbs: ramp and well |
| 1:15-1:45 | Three arenas in quick cuts: embers closing in, the tipping dish, the sumo square | Six arenas |
| 1:45-2:15 | Forge close-ups: rings, cores, tips; stats changing as parts click in | 136 builds |
| 2:15-2:40 | A full round from the rip to a burst finish | |
| 2:40-2:50 | End card: logo, "Play in the Quest browser", the link | |

## Still to do

- Cover image and logo.
- Hosted production build, a cold-start test from a clean browser, and the link checked in a
  private tab and from another network.
- Capture the video on a Quest.
