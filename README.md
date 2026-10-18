# SpinSmith

**Rip a top onto your real table, then grab the arena's rim with both hands and bend the whole
battlefield while the tops fight. Throw the rival off the real edge of your desk for a DESK KO.**

A hands-first mixed reality spinning-top battler for Meta Quest 3/3S, built with the Immersive
Web SDK (IWSDK). Entry for the Meta VR Start Developer Competition 2026 (Gaming, New Experience).

## Try it (judges): 90 seconds to the hero move

1. Sit at a table with a Meta Quest 3 or 3S, hands free (no controllers), and open the hosted URL
   in the Quest Browser.
2. Press **ENTER** and allow spatial data. Look at the table and pinch, or press your palm on it:
   the arena rises there. Without a usable surface it stands on a floating tray and says so.
3. Pinch your top in its dock and drop it in the arena, then pinch near it, pull back and let go
   to rip it.
4. The first match teaches one move per round: pinch the floor for a ramp; then **grab the rim
   with both hands and squeeze, stretch, twist or tilt** (the two-hand arena forge); then slap
   your palm down for the Anvil Strike.
5. `?fresh` starts as a new player; `?demo` opens a level-8 smith with the first chapter cleared.

## Modes, and where to find them in the headset

| Mode | How to reach it |
|---|---|
| **Circuit Map campaign:** 15 bouts, 3 chapters, 3 medals a bout | Automatic after the first match: PLAY starts the next bout. Pinch the level plate to see the map. |
| **Brawl:** 3 or 4 tops, last one spinning wins | Pinch the brass pegs beside the level plate (2, 3, 4 tops), then PLAY. |
| **Pass and play** on one headset | After a duel, pinch PASS: the next person fights that top and its recorded hands. |
| **Daily Smith Order** | Point at the board over the arena and pinch. About every other day it chases a medal you left on the map, and playing it counts for that bout. |
| **Echo duel** with a friend's top and hands | Open `?vs=CODE` (the code is on the board's back). |
| **Online duel (beta)** between two headsets | Pinch the brass pegs past four (all pegs turn white-hot) or open `?online=host`: the card shows a five-letter room code; the friend opens `?online=CODE`. |
| **Forge** your top / **build** an arena | Pinch the small anvil / the blueprint on the near rim. |
| **Comfort and accessibility** | The brass dial: Calm, Quiet, Assist (80% speed), One hand (forge with one hand) and High contrast. |

All interactions are pinches, palm presses or grabs. Nothing needs a controller.

## How to play

Sit at a table, enable hand tracking, and allow spatial data so the arena can stand on your
table. Everything is done with a pinch: carry your top from its dock into the arena, pinch near
it and pull back to launch, and during the fight pinch the floor and pull to raise a ramp (or
press a fingertip in for a cup, then pinch, pull and let go to sling what it caught). Pinch the small anvil to forge your top, the blueprint to build
an arena. First to 3 heat wins a match.

- **Shared headset:** add `?fresh` to the address to start as a new player, or `?demo` for a
  prepared level-8 smith. In the headset, hold your level plate for 2 s, then pinch it again, to
  start over.
- **Move the arena:** at home, pinch the brass handle on the pedestal's near face and carry it.
  Its new pose is saved; when persistent WebXR anchors are available, the room remembers it.
- **Known limits:** nothing has been measured on a headset yet; table detection relies on the
  room's Space Setup labelling a table or desk. Depth occlusion, persistent-anchor stability and
  gaze input have only been exercised in IWSDK's browser emulator (IWER). The online duel has
  been run between two browser windows, not two headsets; an online guest's cups and slings are not
  carried yet. Brawl bots fight with the simulation's own
  seeking (they do not shape the floor).
- **Comfort dial** (`src/game/comfort.ts`): the brass dial between the dock and the level plate
  steps through Standard; Calm (no hit flashes, the strike is a palm pressed and held instead of
  slapped, for trays and shared spaces); Quiet (sound off); Quiet and calm; Assist (fights at
  80% speed, calm); and One hand: hold the rim with one hand for a moment and a mirrored partner
  appears on the far rim, so turning, pushing in or out and lifting that one hand twist, squeeze,
  stretch and tilt the arena (calm); and High contrast: each top's team ring wide and solid (calm).

## What is in the game

- The arena is placed about 68 cm in front of the seated player (its near rim about 30 cm), on a
  pedestal 8 cm above the nearest detected table, or on a floating tray when there is no table or
  the table is far below the eyes (standing over a coffee table). It waits up to 8 s for a table
  (or a palm pressed on it), says when there is none, and moves onto one that appears later. It
  fits the arena inside the table's outline.
- **One machine on the table** (`src/game/hub.ts`, `src/game/rim.ts`): the arena sits on your
  table, drawn 2.4 times its simulation size (about 72 cm across), and everything else is built into
  it. At home, your top waits in its dock on the near rim's left (carry it into the arena or tap
  it to play), a small anvil on the near rim's right opens the forge, a blueprint beside it opens
  the arena workshop, your level sits on a plate between them; their names show during the
  first session and afterwards only while pointed at. The next match is picked at home and shown
  on the level plate ("Next match: Hookjaw in Ember Ring"), its arena already on the table: a
  newly opened arena first, else the rival's home arena (Iron Keep in Sumo Square, Drifter in
  Zero-G Dish, ...) unless it was just played, else the one played longest ago
  (`src/game/rotation.ts`). Pin an arena, or go back to the rotation, in the workshop's Arenas
  drawer. In a match a fighting-game bar is set into the far rim
  (`src/game/match-bar.ts`: each top's spin draining as a health bar, points as pips, the
  round's result in the middle), so score and fight share one view. A small *Menu* button beside the arena returns home, and
  the match ends back home when a side reaches 3 heat.
- **Rip-cord launch, from where you choose:** pinch over the arena (inside the dashed ring)
  and your top goes to that spot; pinch anywhere else and it launches from its usual spot near
  you. A cord runs from your top to your hand. The pull aims like a slingshot (the top goes the
  other way), and its angle matters: a flat pull dashes off fast, a pull straight up launches
  slower with more spin. The rival starts from a different spot on its half every round. Rip it back and let go: power comes only from the motion, how far the hand
  travelled and how fast it was still moving at release, so a rip that stops before letting
  go loses power and a hold without a pull does nothing. While ripping, the top spins up,
  the molten cord heats from white to orange to yellow, straightens, trembles and pulses
  toward the top, and a glow ring grows under the top. 92% or more is a
  white-hot pull with extra spin. In the emulator's play mode, click and flick the mouse: the
  hands move with the view.
- An AI top launches from its spot on the far half at the same time.
- **Arenas are data** (`src/game/layout.ts`): size (radius 0.12–0.26 arena units, up to
  1.25 m across in the room), shape (circle, oval, square), floor (bowl, flat, hill, tornado
  ridge, two tiers, crater, ripples, twin basins), wall (low, standard, high and climbable, none
  with a sumo berm), slag pits, kick rails, pillars and pinball bumpers, pillars that circle the
  middle, boost pads, a center vortex, a turntable, a rocking dish that tips under the tops'
  weight, a ring of embers that closes in, and a theme (forge, stone, clockwork, ice, lava, void;
  ice is slippery).
- **Big arenas open out for a match:** at home, in the forge and in the workshop an arena past
  0.19 shows shrunk to home size; when a match starts it opens out to full size and slides back,
  so its near rim stays where a small arena's is. On a real table it is shrunk (to 70% at most)
  until it stays on the wood.
- **Twenty built-in arenas** (`src/game/arenas.ts`) that together use every knob: the six
  classics (Forge Bowl, Ember Ring, Zero-G Dish, Clockwork Spire, Frost Oval, Sumo Square) and
  Titan Crater, Twin Basins, Ripple Pool, Colossus Bowl, Neon Speedway, Orbit Foundry, Glacier
  Steps, Meteor Pit, Grand Anvil, Crucible Gate (one wide mouth fed by rails), Sentinel Gates
  (a bumper guarding every pit), Bellows (a rocking dish, then closing embers), Gear Rink (ice
  with long end rails) and Ridge Raceway (a ridge, rails and a vortex), opened by level. The rotation picks the arena. `npm run report:arenas` simulates every
  type matchup on every arena and reports round length, knockouts and type balance.
- **Build your top from parts** (`src/game/parts.ts`):
  a Ring (contact style and mass: Striker, Hook, Anvil, Halo, Saw, Cog, Gale, Bulwark), a Core (height and
  shatter lock: Stub, Bolt, Clamp, Stilt, Spindle), a Tip (movement and rail gear: Chisel, Spur, Awl,
  Dome, Pin, Bead), spin direction and color, under a 40 g weight limit (226 legal builds).
  The parts change the fight: a lower top hits under a taller one, low tops scrape on steep
  slopes, upper rings lift tops over walls, opposite spins pass spin from the faster top to
  the slower (Cog rings much more), same spins grind each other down, tips dash on rails by
  their gear, Saw rings chip toward a shatter. The classic Striker (attack), Anvil (defense)
  and Halo (stamina) are presets in a rock-paper-scissors loop; a build whose two strongest
  stats are within 10 points is a balance top. A defense top braces when it holds the middle (15%
  less knockback in the arena's inner half), so dragging it to the rim is how to beat it. The intro
  card says who counters whom. Named builds from the same parts give each
  style an identity: Ember Comet (attack), Long Ember (stamina), Twin Gear (left-spin balance),
  Saw Wraith (attack) and Low Tide (defense). Your top is warm colored,
  the opponent's cool teal; each rival keeps its build and spin for the whole match (see Smith levels).
- **Forge, by hand** (`src/game/forge.ts`): pinch the small anvil and
  the arena turns into the forge: its floor sinks, an anvil rises at the near third of the bowl
  with your top on it, five drawer tabs slide out of the near rim (Ring, Core, Tip, Look, Combat) and a
  stats plate rises on the far rim. Everything you touch is within a seated arm's reach. The open
  drawer's parts (at most six) lie on a half circle around the anvil. Pinch a part and bring it
  to your top: the top comes apart to show where the part goes and that slot pulses; let go to
  fit it with a clack (tapping a part fits it too). A core locks with one click per tooth;
  overweight builds are refused. Pinch your top to pick it up and turn it; let go and it settles
  back on the anvil. Tap a paint pot or dip the top in it to paint it; spin tokens set the spin
  direction. Drop the top in the quench slot set into the right rim to save: the forge folds back into
  the arena. The stats plate shows the build, one dial per stat with a second needle previewing
  a part (green gain, red loss), and what just happened. `npm run report:tops` plays every build against the others and flags dominant
  builds and dead parts.
- **First session:** until the first match is
  finished the home is just your top in its dock (a breathing ring calls you to it) and the
  arena; the anvil and the workshop come after. The first launch shows arrows
  running toward you and how to rip; the first fight puts a breathing ring on the floor beside
  the rival where lifting would push it, until your first ramp. The first match lasts at least
  three rounds and adds one move per round: ramp, then a two-hand arena squeeze, then the ultimate (its third
  round starts with the bar nearly full); rival tells come after that. Finishing the first match, won or
  lost, earns the Spur tip: the anvil appears and calls for it, the forge highlights only that
  part, and after saving the dock calls you back for the rematch.
- **Smith levels** (`src/game/progress.ts`): every round gives XP (more for a win and for a
  knockout, a white-hot pull, and the match), filling levels 1-20 with ranks
  (Apprentice, Journeyman, Smith, Master Smith, Legend). Levels open options, never power: you
  start with the classic tops' parts, two paints and two arenas, and each level opens a part, a
  paint, an arena, a seal or a rival, with emblem glows near the top, ending in a gilded ledger;
  the Clamp core comes from a first shatter win and the Bead tip from a first slag or throw win.
  A rival's signature part also opens by level, a few levels after that rival arrives: knocking
  the rival out is the early way to it. Locked parts and arenas show dark with how they are earned. A match is
  against one rival that keeps its build and spin for every round (Rim Raider, Iron
  Keep and Drifter at first; Leech, Hookjaw, Sawtooth, Bastion, Comet and Gearwright join with levels, announced as
  NEW RIVAL). Rivals come as a ladder, **the circuits**: the Cinder Circuit (Drifter, Rim Raider,
  then its champion Iron Keep), the Iron Circuit (Leech, Hookjaw, champion Sawtooth) and the
  Crown (Bastion); the next bout is the first rival you have not beaten, and beating a champion
  clears its circuit. Each rival has a title and lines: "VS DRIFTER · Cinder Circuit · bout 1 of 3"
  is stamped as the match starts, with its intro line, and it has a word for you when the match ends. In the campaign the bout sets how hard a rival rips (see the Circuit Map); in free play higher levels make rivals rip harder and aim steadier. Never
  stronger in stats.
  After a round the match bar shows the XP earned and the level bar; a level-up rings and
  throws sparks, and each unlock spins over the arena. Your level and rank sit on the near rim.
  Progress is saved in the browser.
- **The Circuit Map** (`src/game/campaign.ts`): after the first session the next match comes from
  a campaign of fifteen bouts in three chapters (Cinder Circuit, Iron Circuit, The Crown). Each
  bout fixes a rival and an arena, teaches one thing and twists it, and asks for two medals beyond
  the win (ramp KO, forge KO, strike KO, shatter, white-hot rip, no heat lost, cup outlast, edge
  KO). The fifth bout of each chapter is its boss; bouts 2-3 and 3-3 are crowded (three and four
  tops, last top spinning wins). Rival skill follows the map, not your level:
  it climbs through a chapter and dips at the next one's start, and two losses in a row on a
  bout quietly ease it. A chapter opens with 8 or 18 medals and the previous boss beaten, so
  skill stands in for grinding. The intro card names the bout's lesson and the medals still
  open; medals are kept win or lose, stamped at the match's end; the board's back (a pinch on
  the level plate) shows the chapter as five medallions. Pinning an arena in the workshop
  switches to free play. Checked by `npm run check:sim` (every bout's rival and arena exist,
  knockout medals only where a knockout is possible, the sawtooth, the gates and the save).
- **Brawls, three or four tops** (`stepN` in `src/game/sim.ts`): the brass pegs beside the level
  plate set how many tops share the next match. Two is a duel; three or four is a brawl where the
  extra seats are other rivals' and named smiths' tops (in green and violet), every pair can
  collide, and the last top spinning takes the heat, scored on the foe that went out last.
  Brawls are free play (no bout, order or challenge). `npm run check:sim-n` checks that the N-top
  step with two tops matches the duel step exactly, that crowded rounds always end and that they
  replay identically.
- **Pass and play:** when a duel ends, a PASS button joins MENU and REMATCH: the next person on
  the same headset fights the top just played and its recorded rips and forges (an echo, below),
  with a ghost hand from the far rim.
- **Online duel (beta)** (`src/game/online.ts`, `src/game/net.ts`): open the game with
  `?online=host` and the card shows a five-letter room code; a friend on another headset opens
  `?online=CODE`. The host's game runs the only simulation: it waits for both rips, applies the
  guest's ramps and arena forges from the far side, and sends both tops and the floor 30 times a
  second; the guest sees the fight turned half round, so their own top is near them. Each smith's
  hands reach the other table live (20 times a second) as two ghost hands on the far side. Signalling
  goes over public WebRTC relays (Trystero, loaded only when a room is opened) with public STUN
  only, so some strict networks will not connect, and it says so. Tested with two browser
  windows (`&net=bc`) and a node loopback with 200 ms round trips and 5% loss
  (`npm run check:net`); not yet between two headsets.
- **A reason to come back** (`src/game/orders.ts`, `src/game/board.ts`):
  once the first session is over, the Smith's board over the far rim shows **today's Smith
  Order**, made from the local date and what you have unlocked (the same all day): a rival, an
  arena and one way of winning (ramp them out, shatter them, outlast them from your cup, win
  with a given kind of top, with a white-hot pull, without giving up heat, on your own arena). Pinch the
  board to play it; doing it strikes a stamp into the ledger (stamps 5, 10 and 15 earn emblem
  glows). Missed days cost nothing. The board also shows the seven rivals as medallions with
  three notches each: beaten, knocked out, beaten by your own ramp, cup or sling. The last three tops
  that won a match stand as champions on the left rim with their record; pinch one to make it
  your top again. The hosted build has a web app manifest, so it can be added to the Quest
  library.
- **Shatter:** hard hits build up damage and a top can shatter, its parts flying and
  bouncing across the arena.
- **Arena workshop** (`src/game/builder.ts`): pinch the
  blueprint and the arena turns into a drafting table: blueprint lines draw over its floor, brass
  knobs mark the rim, five drawer tabs fold out in a row on the near rim as in the forge
  (Pieces; Floor; Form: circle, oval, square, and one wall and one theme piece that step on each
  tap; Extras; Arenas: the Rotation plate, then every arena, built-in and yours, as miniatures
  five to a page, pinch the tab again for the next page; tap one to pin it for every match and
  start a draft from it, tap Rotation to unpin, drop one of yours off the arena to throw it away), a brass rail no wider than the arena holds the open drawer's pieces (at most five)
  with their names engraved below, Back sits on the left rim, Try and Save on the right, Save in
  front of a stamp slot set into the rim, and a plate on the far rim shows the draft's name and form with three dials: median round length,
  knockout rate and type balance. The draft is checked in a worker (`src/game/check-worker.ts`)
  after every change, so the dials follow your edits without stalling a frame.
  The pieces: slag pits, kick rails, pillars and bumpers to place; circle, oval and square plates;
  miniature floors (bowl, flat, hill, ridge, tiers); wall rings (low, standard, high, none);
  theme gems; and extras (vortex, turntable, rocking, embers). Pinch a piece, carry it over the arena and let go: pits and rails snap to the
  rim where you drop them, pillars and bumpers stand where you drop them, the others change
  the arena. Pieces on the arena can be picked up and moved, or dropped off the arena to
  remove them. Pinch the rim and
  pull to resize; the rail steps away while a piece is carried. *Try* folds the tools away and
  plays an AI-vs-AI demo round in the draft (no points), then unfolds them; *Save* stores the
  arena in the browser, adds it to the rotation and starts a match in it.
- **Heat, first to 3:** a knockout (SLAG into a pit, THROWN over the wall, SHATTER) scores 2
  heat, OUTLAST (the other top stops first, or has less spin at the 45 s limit) scores 1. The
  score shows on the match bar.
- **Sound,** all synthesized: a spin hum per top whose pitch drops and wavers as it
  slows, metal clashes, the cord's rising tension tone, launch, rail kick, slag pit,
  burst, topple and result jingles.
- **Arena moves during the fight:** pinch the floor and a ramp
  rises there at once (after a 0.12 s hold, full size, about 11 cm across); keep holding and drag
  to aim which way it throws a top. Press a fingertip into the floor to open a cup that catches
  the first top to roll in; pinch it, pull back and let go to sling it the other way (snapped
  into a slag pit within 20°). A cup with nothing in it, or a catch not slung, lets go after 2 s. A ghost shows the ramp for that first moment, contour rings shrink as a shape relaxes back to flat in 2–3 seconds, and every
  shape affects both tops. In the opening match every finish scores one heat so all three lessons
  get a round. Afterwards knockouts score two as normal. Three charges, shown as sparks on the near rim: a shape spends one, a
  strong clash or about 6 s refills one, a hand keeps one live shape, and nothing can be shaped
  in the first 2.5 s. A finish within 1.5 s of your shape names it ("YOUR RAMP → SLAG").
- Tops orbit the bowl in their spin direction, bounce off each other and spark on
  contact, lean into hits, wobble as spin drains, then topple.
- **Far ramps:** point the hand ray at the floor during a fight and hold the pinch to
  raise a ramp there; its place locks when the pinch starts. A small blue dot marks where the ray meets the arena floor. In the
  emulator's play mode a left click is a pinch, so the game is playable by looking
  around with the mouse and click-holding.
- **The duel layer:** a forge bar (the ring on the back of each hand)
  starts each round a fifth full (a white hot rip adds a quarter), fills on its own in 24 s and from solid clashes, three times
  as fast while your top is behind on spin. Full, press
  your palm on the table beside the arena: your strike. The seal you engrave in the forge's
  Combat drawer picks it: the Anvil Strike (a shockwave from the middle that throws tops near the
  rim, hot ones further; your own top is braced), the Tilt (Lv 3: the arena dips toward your
  palm; the rival slides, your top holds), the Rush (Lv 4: your top charges the rival), the Ward
  (Lv 5: for 4 s your top cannot be knocked out, and a charge into it rebounds: "PARRIED!"), the
  Magnet (Lv 7: the rival is dragged toward a slag pit) or the Hammer (Lv 9: your next solid hit
  cracks three times as hard). A top
  that has taken a beating glows red: it flies further. The strike is staged: a short freeze, the
  seal rising off your top, its name stamped over the arena.
- **Rival tells:** from the fourth match (the third, once you have struck) each rival has one big move (a charge, a quake or a
  pull). Its own bar fills like yours; when full it flashes and whines for a second, then the
  move lands, unless your strike cuts it short ("INTERRUPTED!") or your Ward turns it back. Once
  you know the tells, a rival with its move ready waits a few seconds while your strike is ready
  too: strike first, or hold the strike as the answer.
- **Rival signature parts:** knock a rival out once and its part is yours (Rim Raider's Gale
  ring, Iron Keep's Bulwark ring, Drifter's Spindle core, ...).
- **Framing and feel** (`Stamp` in `src/game/visuals.ts`): big stamped words over the arena for
  the bout (VS), each later round (ROUND 2, MATCH POINT, FINAL ROUND, with a gong), the rip
  (RIP!, WHITE HOT!), every finish (SLAG!, THROWN!, SHATTER!, OUTLAST!, with your move that caused
  it), level-ups, the forged top and a cleared circuit. Hard hits freeze for 70-110 ms and shake
  both tops (never the view); every knockout plays in slow motion; sparks are streaks that cool
  from white-hot and skip off the floor; each top has a ring of light in its team color; a won
  match runs sparks round the rim; a knockout your move caused replays on the table at 0.4x
  (a pinch skips it). The placed arena forges up out of the table under the title.
- **Feats, bests and the match report** (`src/game/progress.ts`): thirteen feats, each stamped the
  first time (ramp a rival out, sling one into a pit, knock one out with your strike, cut a big
  move short, rip white hot, a flawless match, a comeback from match point, a Hammer shatter, each
  circuit, ten arenas won, a rival knocked off your real table), counted on the board; personal bests (hardest rip, fastest knockout)
  stamped when beaten; after a match, home shows its report (result, each round's finish, best
  rip, XP). After a loss the rival's card gives a tip against it.
- **The room is the stage:** a rival arrives through a portal beyond the far rim and slams into
  the arena; a top thrown over the wall keeps spinning across the real desk, curves with its spin
  and can drop off the table's real edge (OFF THE DESK!); a strike leaves a molten palm print on
  the desk that cools to a scorch; sparks past the rim land on the desk; your hands cast soft
  shadows on the arena (a warm glow when the strike is ready); a won match sends a ring of light
  across the room; the quench turns the room cold blue for a moment.
- **Hands, shown not told:** a pinch ring at each hand closes as the fingers do and lights when
  the game counts a pinch; a ghost hand shows the first rip and the first ramp.
- **Challenge codes** (`src/game/challenge.ts`): the board shows your top's code; a friend adds
  `?vs=CODE` to the address and their next match is against your top.
- **Echo duels** (`src/game/echo.ts`): after a match the code also carries how you played it
  (`K3F9-2.R…_…`): each round's rip and when your two hands forged the arena. Your friend's
  Challenger rips the way you did and forges their arena at the same moments, from the far rim,
  with a ghost hand. No server: the code is the recording.
- **Store basics:** a service worker keeps the installed game working offline; `privacy.html`; a
  maskable icon; the landing page has how-to-play and credits; a failed start says so.
- **Sound** (`src/game/audio.ts`): spatial (HRTF) placement of hums, clashes and landings; one generated room reverb, music that follows the game at 96
  bpm in D minor on the game's four-note motif (home: drone and anvil; getting ready: bass;
  fight: toms; tension: hats and the motif), ducked under big hits; clashes ring at each ring's
  own pitch (an Anvil clangs lower than a Striker).
- Result card with the finish and score, then pinch again for the next round.

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
| `T` | Fill the rival's bar: its tell starts (during a fight, after the first match) |
| `A` | Show the next arena, locked or not (home) |
| `L` | Launch at 80% power without the hands (ready or result screen) |
| `K` | Shatter the opponent now (during a fight) |
| `O` | Throw the opponent over the wall now (during a fight) |
| `H` | A match against Hookjaw, a rival that ramps you out (home, ready or result) |
| `` ` `` | Start over as a new player: clears progress and the saved top, reloads |
| hold `1` / `2` + mouse | Move only the left / right hand across the view (the head stays still); the wheel moves it nearer or farther |
| `R` | Reset to the ready screen |
| `P` | Re-place the arena in front of the current head pose |

### Testing in the emulator (IWSDK CLI)

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
src/dev-hands.ts           Dev only: move one emulated hand with the mouse
scripts/sim-check.ts       Headless simulation check (campaign, orders, parts, arenas included)
scripts/sim-n-check.ts     Two-to-four-top simulation check (2-top equality, determinism, rounds end)
scripts/net-check.ts       Online protocol check over a lossy, delayed loopback
```
