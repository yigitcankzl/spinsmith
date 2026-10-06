# Top customization: what to add, how it works, how it looks

Research notes and a proposal for building your own top in SpinSmith (Oct 6, 2026). Section 1
summarizes how real spinning-top systems and games do it; the rest proposes SpinSmith's
version, mapped onto the simulation we already have (`src/game/sim.ts`, `TopSpec`).

Today a top is one of three fixed types (Striker, Anvil, Needle) picked at random each round.
`DESIGN.md` section 6 sketches a "3 body rings + 3 tips" forge and between-match parts. This
document replaces that sketch with a concrete part system.

---

## 1. Research summary

### 1.1 Every generation splits the top along the same axes

| Axis | Beyblade X (2023+) | Burst (2015-23) | Metal Fight (2008-12) | What it changes |
|---|---|---|---|---|
| **Contact and mass** | Blade (die-cast, about 35 g) | Layer + Forge Disc | Fusion Wheel | Contact shape (smash, upper, absorb), weight, weight distribution |
| **Height and lock** | Ratchet (`3-60` = 3 protrusions, 6.0 mm) | Layer teeth + Driver spring | Spin Track (85 / 100 / 145 / 230) | Height, center of gravity, burst resistance |
| **Tip** | Bit (Flat, Rush, Taper, Ball, Needle, Orb...) | Driver | Performance Tip | Friction and movement pattern, stamina, rail dash |
| **Identity** | Lock Chip (CX line): art, spin direction | Layer art | Face Bolt | Mostly cosmetic |

Sources: [beybxdb ratchet](https://www.beybxdb.com/parts-system-guide/parts/ratchet),
[beybxdb bits](https://www.beybxdb.com/parts-system-guide/parts/bit),
[monkeemods bits guide](https://monkeemods.com/blog/beyblade-x-bits-guide),
[beyblade.wiki Burst systems](https://beyblade.wiki/burst-systems/),
[Custom Line](https://beyblade.fandom.com/wiki/Custom_Line).

The CX line (2025) shows where the toy is heading: the Blade itself splits into a Lock Chip
(identity), a Main Blade (metal mass) and an Assist Blade (secondary contacts, can be flipped
for two modes). More parts means more combinations, but also more for a player to read.

### 1.2 Physics that matter

| Property | Effect |
|---|---|
| Mass out on the rim (high moment of inertia) | Spins longer, hits harder; slower to get moving |
| Mass in the center | Harder to push, resists bursts, agile |
| Low height | Hits under taller tops, low center of gravity, but scrapes on slopes |
| High height | Gets hit from below; wobbles more |
| Flat / rubber tip | High grip, fast orbit, burns spin quickly |
| Ball / needle tip | Stays put, long spin, easy to knock over |
| Contact slope down (smash) | Pushes the opponent away |
| Contact slope up (upper) | Lifts the opponent: over the wall, off balance |
| Round contacts (absorb) | Deflects, takes less knockback |
| Gear teeth on the tip | Catches the stadium rail for an Xtreme Dash |

Sources: [beyblade.wiki concepts](https://beyblade.wiki/beyblade-x-concepts/),
[Upper Attack](https://beyblade.fandom.com/wiki/Upper_Attack),
[gear bits](https://monkeemods.com/blog/beyblade-x-gear-bits-guide).

**Spin direction:** when tops spinning in opposite directions rub, they mesh like gears and the
faster one loses spin to the slower one until they match (spin equalization)
([toymana](https://www.toymana.com/blogs/news/beyblade-x-spin-direction-guide-right-spin-vs-left-spin-strategies)).
Same-direction contacts grind and both lose spin.

### 1.3 How the packaging presents it

Beyblade X boxes print five stats: Attack, Defense and Stamina are the **sum of the three
parts** (e.g. Attack 127 = Blade 70 + Ratchet 17 + Bit 40); Dash and Burst Resistance come from
the Bit alone ([monkeemods stats](https://monkeemods.com/blog/beyblade-x-stats-explained)).
Summed per-part stats are easy to read and a good template.

### 1.4 How the games do it

| Game | Customization | Progression |
|---|---|---|
| Beyblade X: Xone (Switch/PC 2024) | Blade / Ratchet / Bit, 6 saved Beys, no duplicate part names in a set | Win opponents' parts, mystery "?" parts with random enhancements, shop |
| Beyblade X: Evobattle (PC 2025) | CX sub-parts, metallic "Bey Coating" | Feed parts to level them, merge duplicates, coatings also give stats |
| Beyblade Burst app | Layer / Disc / Driver in a "Beylocker" | Scan the real toy, parts level 1-5 with use |
| Beyblade X app | Scan the toy's code | Points into a gacha; Bluetooth launcher logs real launch power |

Common patterns: a three-slot assembly screen, summed stats, part levels, gacha and mystery
parts, cosmetic finishes. Sources: [Xone](https://en.wikipedia.org/wiki/Beyblade_X:_Xone),
[Siliconera guide](https://www.siliconera.com/how-to-customize-a-beyblade-in-beyblade-x-xone/),
[Evobattle review](https://noisypixel.net/beyblade-x-evobattle-review/),
[Burst app](https://beyblade.fandom.com/wiki/Beyblade_Burst_App).

**What we take:** the three-part split, summed stats, winning parts from opponents.
**What we skip:** gacha, part levels and stat-giving cosmetics. They are grind, and
`DESIGN.md` already rules that progression unlocks options, never power.

### 1.5 Hand-based assembly in VR

| Reference | Lesson |
|---|---|
| Owlchemy (Job Simulator) | Make small objects bigger than life; diegetic panels instead of floating menus |
| LEGO Bricktales VR | Pieces fit only one way, so snaps rarely miss; building on a real table in MR feels natural |
| Gun assembly sims (GunX, ShotForge) | The click and clack sell the connection more than visuals do |
| Meta Interaction SDK | Snap points + attract on hover: the part pulls into its socket as the hand gets close |
| Gorilla Tag | A mirror to preview cosmetics |
| Tilt Brush | A color palette on the off hand, turned with the wrist |

Sources: [UploadVR on Owlchemy](https://www.uploadvr.com/owlchemy-labs-hand-tracking/),
[Bricktales review](https://roadtovr.com/lego-bricktales-review-quest-3-2-pro/),
[Snap interactions](https://developers.meta.com/horizon/documentation/unity/unity-isdk-snap-interaction/).

---

## 2. Proposal: four parts

A SpinSmith top is a stack of four parts, top to bottom. Three set the performance, one is
identity. This matches the toy closely enough that Beyblade players read it instantly, and
stays small enough for a hand-built game.

| Part | Toy equivalent | Decides | First set |
|---|---|---|---|
| **Crest** | Lock Chip | Color, emblem, **spin direction** | 4 emblems, 6 colors, left/right |
| **Ring** | Blade | Contact style, mass, weight distribution | 6 rings |
| **Core** | Ratchet | Height, burst lock | 4 cores |
| **Tip** | Bit | Movement, stamina, rail dash | 6 tips |

6 x 4 x 6 = **144 performance combos**, times spin direction. That is enough for theorycrafting
without needing hundreds of authored parts.

### 2.1 Rings (contact and mass)

| Ring | Look | Contact | Mass | Plays as |
|---|---|---|---|---|
| **Striker** (today's attack shape) | 3 sharp blades, sloped down | Smash | Light, outward | Hits hard, recoils hard |
| **Hook** | 3 blades sloped up like ramps | Upper | Light, outward | Lifts tops over walls and into pockets |
| **Anvil** (today's defense shape) | Thick round disc | Absorb | Heavy, central | Shrugs off hits, rarely bursts |
| **Halo** (today's stamina shape) | Thin wide ring, mass at the edge | Absorb | Medium, far out | Long spin, weak hits |
| **Saw** | 6 small teeth | Smash, low recoil | Medium | Many small hits, chips burst damage |
| **Cog** | Gear rim | Grind | Medium | Steals spin against opposite spin (2.5) |

### 2.2 Cores (height and lock)

Named in the toy's style: lock teeth, then height in mm.

| Core | Height | Lock | Effect |
|---|---|---|---|
| **3-50** | Low | Weak | Hits under taller tops; scrapes on steep slopes |
| **4-60** | Medium | Medium | Standard |
| **9-60** | Medium | Strong | Hard to burst, slightly less punch (stiffer) |
| **5-80** | High | Medium | Dodges low hits, but wobbles out sooner |

### 2.3 Tips (movement)

| Tip | Movement | Stamina | Rail dash |
|---|---|---|---|
| **Flat** (today's attack tip) | Fast orbit, aggressive | Poor | Strong |
| **Rush** | Fast, but steers better | Fair | Strong |
| **Taper** | Balanced: wanders, then settles | Good | Medium |
| **Ball** (today's defense tip) | Holds the middle | Good | Weak |
| **Needle** (today's stamina tip) | Stays still | Best | None |
| **Orb** | Slow drift, hard to knock over | Good | Weak |

### 2.4 Crest (identity)

- Color (the player's top keeps a warm palette, the opponent a cool one, so a fight stays readable)
- Emblem engraved on the top face, plus your initials
- **Spin direction:** left or right, shown with an arrow on the crest. It has real gameplay (2.5).

### 2.5 New mechanics this unlocks

Each new part property needs one rule in the simulation. All of them are small.

| Mechanic | Rule | Why it matters |
|---|---|---|
| **Height** | On a clash, the lower top gets a lift bonus against the taller one; low tops lose spin on slopes the player raises | Makes the arena shaping and the core choice interact |
| **Upper contact** | Hit impulse gets an upward component: more `kick` (tilt), more chance to go over a low wall | A second way to win besides smash |
| **Spin direction** | Opposite spins: spin flows from the faster to the slower top on contact. Same spin: both lose a little | The classic "launch left against the stamina top" counterplay |
| **Rail dash** | Dash strength scales with the tip's gear value (rails already exist) | Tips matter on rail arenas |

---

## 3. How it works in code

### 3.1 Data

```ts
interface TopBuild {
  crest: { color: number; emblem: string; spin: 1 | -1 };
  ring: RingId;
  core: CoreId;
  tip: TipId;
}
```

Each part is a plain table row with **deltas to `TopSpec`**, just like the packaging sums. For
example `Flat: { cruise: +0.25, drive: +1.5, spinDrain: +0.03, roam: +0.4, gear: 1 }`.
`specFromBuild(build)` starts from a neutral base and adds the rows. The three existing types
become three ready-made builds (Striker = Striker ring + 3-50 + Flat, etc.), so today's balance
is the starting point rather than thrown away.

New `TopSpec` fields: `height`, `contact` ('smash' | 'upper' | 'absorb' | 'grind'), `gear`. The
spin direction already exists as `Top.hand`.

### 3.2 Material is conserved

`DESIGN.md` keeps total mass fixed so no build is strictly better. With parts this becomes a
**budget**: every part has a weight, and a build must stay under the weight limit. Heavy rings
force light cores and tips. The forge rejects an overweight build with a clear message, the same
way the arena workshop rejects invalid arenas.

### 3.3 Balance check

`npm run report:tops` (same idea as `report:arenas`): every build plays every other build in
simulation on 2-3 reference arenas. It warns when one build wins more than 65% overall, or when
a part is never in a top-10 build (dead part). This is what makes 144 combos shippable without
hand-testing them all.

### 3.4 Looks come from the parts

`TopShape` already builds the body from a lathe profile, a tip type and metals. A build's shape
is three profile segments stacked: tip profile, core segment (its height), ring profile.
Contact blades (Striker, Hook, Saw, Cog) are small extra meshes around the ring. Height and
silhouette are therefore readable at arm's length, which matters more than detail: a tall top
looks tall, a hook looks like a ramp.

The opponent uses the same system, so opponent archetypes from `DESIGN.md` (Anchor, Charger,
Drifter, Leech) become authored builds: Leech = Cog ring + opposite spin.

---

## 4. How it looks and feels in the headset

### 4.1 The forge station

It reuses the arena workshop's layout, so players learn one pattern:

- A **forge board** across the arena (like the workshop board) with tabs **Ring / Core / Tip /
  Crest**. Parts are drawn 1.5-2x scale so they can be grabbed (Owlchemy's rule).
- An **anvil spindle** stands in the middle of the arena: an upright pin where the top is built,
  at a height you can work on without bending.
- Your current top sits on the spindle with its four sockets. The stat bars hover beside it.

### 4.2 Building, step by step

1. **Pull a part off the board** with a pinch. As it nears the spindle, it pulls toward its
   socket and shows a ghost of where it will sit (attract on hover).
2. **Let go** and it drops onto the stack with a metallic clack and a short spark. A part only
   fits its own socket, so there are no wrong drops (Bricktales). The old part pops off and
   flies back to the board.
3. **Twist to lock the core:** pinch the ring and turn your wrist about 30 degrees, like
   locking a real Blade onto its Ratchet. It clicks per tooth: a 9-60 gives 9 clicks, a 3-50
   gives 3. You feel the lock strength.
4. **Stat bars update live** as each part seats: Attack, Defense, Stamina, Dash, Burst
   Resistance, and a weight gauge that turns red when over budget.
5. **Spin direction:** pinch the crest and flip it over; the arrow changes.
6. **Test spin:** pinch "Test" and the top drops on the spindle and spins. A training dummy
   top on the far side lets you rip a practice launch against it.

### 4.3 Cosmetics

- **Color:** a color swatch ring on the left hand (Tilt Brush style); touch a swatch with your
  right index finger, then touch the crest.
- **Engraving:** your initials are struck into the crest with the hammer, one strike per letter.
  It is quick and it fits the forge theme.
- **Inspection stand:** after building, the top floats and turns slowly at eye level, like the
  Gorilla Tag mirror, for a screenshot.
- Unlockable finishes (blued steel, brass, damascus) are **purely visual**.

### 4.4 Comfort and readability

- No floating menus beside the head: the board stands across the arena.
- Every step has a sound; sounds carry more than visuals in hand interactions.
- One piece in the hand at a time; no two-handed assembly required.
- In the emulator everything works with the gaze crosshair and a click.

---

## 5. Progression (options, not power)

| Event | Unlocks |
|---|---|
| First win by **burst** | The 9-60 core |
| First win by **pocket / over** | The Hook ring |
| Beating an archetype | One of its parts (Xone's "win the opponent's part", minus the grind) |
| Wins in each arena | Finishes and emblems |

- No part levels, no duplicates, no gacha.
- **Saved builds:** 3 slots on a shelf next to the arena. The shelf is also the collection
  from `DESIGN.md`.
- Before each match you can swap **one part** (the "adjust the design" loop from `DESIGN.md`),
  so a bad build is never stuck for a whole match.

---

## 6. Plan

| Step | What | Size |
|---|---|---|
| 1 | `TopBuild`, part tables, `specFromBuild`; three current types as builds; sim tests still pass | Small |
| 2 | New sim rules: height, upper contact, spin direction, gear dash; `report:tops` | Medium |
| 3 | Shape from parts (stacked lathe profiles + contact blade meshes) | Medium |
| 4 | Forge station: board with tabs, spindle, snap sockets, live stats (reusing the workshop code) | Medium-large |
| 5 | Core twist-lock, crest flip, test spin | Medium |
| 6 | Colors, engraving, inspection stand | Small-medium |
| 7 | Unlocks and saved builds | Small |

Steps 1-3 change no UI and can ship behind the current random-type flow, so the game stays
playable throughout. Step 4 is where the player sees it.

**Recommended submission scope:** steps 1-5 with 4 rings, 3 cores and 4 tips (48 combos).
The rest are additions after the core loop feels right.

## 7. What is built (Oct 6, 2026)

Steps 1-5 of the plan, with the full first set of parts (6 rings, 4 cores, 6 tips, 136 legal
builds under 40 g):

- `src/game/parts.ts`: part tables, `specFromBuild`, weight, box-style stats. The simulation's
  three classic types are now presets built from these parts.
- `src/game/sim.ts`: height, scraping, upper lift, spin direction (sharing and grinding), gear
  dash, saw chip. Covered by `npm run check:sim`.
- `npm run report:tops`: the parts were tuned with it to 44-57% average per part, best build
  71%, while keeping the type loop. Hook and Ball are in no top-20 build yet; Needle wins 80%
  on Zero-G Dish. Both are for on-device tuning.
- `src/game/forge.ts`: the forge station (board, spindle, stats card with previews, tap or
  carry to fit, core lock clicks, weight refusal, Test, Save).
- Opponents get a random build each round (a classic preset half the time), mostly left spin.

Not built yet: twist-to-lock with the wrist (the core clicks in by itself), engraving,
the inspection stand, unlocks and several saved builds.

## 8. Open questions

- Should the opponent always pick a counter to your build (harder, more strategic) or a random
  build (easier to learn)? Probably counter only in later matches.
- Does twist-to-lock read well with hand tracking, or should it be a pinch-and-click fallback?
  Needs a Quest test.
- Will 4 performance parts overload a new player? A "quick build" with 3 presets on the board
  should keep the first minutes simple.
