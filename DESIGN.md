# SpinSmith design notes and measurements

Everything below was moved verbatim from the README. Back to the [README](README.md).

## How to play

Sit at a table, enable hand tracking, and allow spatial data so the arena can stand on your
table. Everything is done with a pinch: carry your top from its dock into the arena, pinch near
it and pull back to launch, and during the fight pinch the floor and pull to raise a ramp (every later match adds one more hand move with its own card; from the fourth, press a fingertip in for a cup, then pinch, pull and let go to sling what it caught). Pinch the small anvil to forge your top, the blueprint to build
an arena. First to 4 heat wins a match.

- **Shared headset:** add `?fresh` to the address to start as a new player, or `?demo` for a
  prepared level-8 smith. In the headset, hold your level plate for 2 s, then pinch it again, to
  start over.
- **Move the arena:** at home, pinch the brass handle on the pedestal's near face and carry it.
  Its new pose is saved; when persistent WebXR anchors are available, the room remembers it.
- **Known limits:** nothing has been measured on a headset yet; a table or desk labelled in Space
  Setup is preferred; an unlabelled ('other') flat surface at desk height, at least 30 cm wide, under
  the spot in front of you is used when none is labelled (`npm run check:room-matrix` probes
  this in IWER with synthesised planes; not yet tried in a real room). Persistent anchors have only been exercised in
  IWSDK's browser emulator (IWER). Depth occlusion is switched off under IWER (it has no camera
  depth), so it has not run anywhere yet. Gaze: a real gaze input source (Meta VR Glasses) is a full pointer; on Quest, which has none, the head ray only assists buttons (look at one for 0.4 s, it lights up, a pinch of either hand away from the bowl presses it); neither has run on a headset. The
  online duel has been run between two browser windows, not two headsets.
- **Frame rate (`?fps`, `?diagnostics`):** not yet measured on a headset. `?fps` shows a world-locked readout beside MENU (1 s fps, lowest, draw calls, quality level); after 3 s below 66 fps (or 0.9× the session's refresh rate) the game drops room dimming, then sets full foveation, and steps back after 10 s comfortable (rendering only; the 120 Hz sim is untouched); `?diagnostics`' COPY QUEST TEST REPORT includes each step and fps per hub/fight/forge.
- **Comfort dial** (`src/game/comfort.ts`): the brass dial between the dock and the level plate
  picks a setting; the plate in front of it shows ON/OFF and a pinch on it toggles that setting, so
  they combine. Stops in order: Calm (preset: no flashes + press to strike); Large text (the card,
  stamps, match bar and gauge labels 1.3x); One hand: hold the rim with one hand for a moment and a
  mirrored partner appears on the far rim, so turning, pushing in or out and lifting that one hand
  twist, squeeze, stretch and tilt the arena; Assist (fights at 80% speed); Quiet (sound off); No
  flashes; Press to strike (a palm pressed and held instead of slapped, for trays and shared
  spaces); High contrast: each top's team ring wide and solid; Left-handed: the home stations swap
  sides; Colour-safe; Standard (preset: every setting off but the hand). A new smith's home shows
  the dial's plate unasked through the first session.

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
  the arena workshop, your level sits on a plate between them; the dock, anvil and blueprint always show their names; the other controls name themselves in the first session or while pointed at. The next match is picked at home and shown
  on the level plate ("Next match: Hookjaw in Ember Ring"), its arena already on the table: a
  newly opened arena first, else the rival's home arena (Iron Keep in Sumo Square, Drifter in
  Zero-G Dish, ...) unless it was just played, else the one played longest ago
  (`src/game/rotation.ts`). Pin an arena, or go back to the rotation, in the workshop's Arenas
  drawer. In a match a fighting-game bar is set into the far rim
  (`src/game/match-bar.ts`: each top's spin draining as a health bar, points as pips, the
  score in the middle), so score and fight share one view. A small *Menu* button beside the arena returns home, and
  the match ends back home when a side reaches 4 heat.
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
  four rounds and adds one move per round: ramp, then a two-hand arena squeeze, then the ultimate (its third
  round starts with the bar nearly full); rival tells come after that. Finishing the first match, won or
  lost, earns the Spur tip: the anvil appears and calls for it, the forge highlights only that
  part, and after saving the dock calls you back for the rematch.
- **Smith levels** (`src/game/progress.ts`): every round gives XP (more for a win and for a
  knockout, a white-hot pull, and the match; the first match of each streak day pays 25 XP per
  streak day, up to 7), filling levels 1-20 with ranks
  (Apprentice, Journeyman, Smith, Master Smith, Legend). Levels open options, never power: you
  start with the classic tops' parts, two paints and two arenas, and each level opens a part, a
  paint, an arena, a seal or a rival, with emblem glows near the top, ending in a gilded ledger;
  the Clamp core comes from a first shatter win and the Bead tip from a first slag or throw win.
  Leech's, Hookjaw's, Sawtooth's and Bastion's signature parts also open by level, a few levels after they arrive: knocking
  the rival out is the early way to it. Locked parts and arenas show dark with how they are earned. A match is
  against one rival that keeps its build and spin for every round (Rim Raider, Iron
  Keep and Drifter at first; Leech, Hookjaw, Sawtooth, Bastion, Comet and Gearwright join with levels, announced as
  NEW RIVAL). After the first session the Circuit Map (below) picks who you face; free play (a
  pinned arena, a brawl, or the map won) picks among the rivals you have met. Each rival has a
  title and lines: "VS LEECH · Iron Circuit · BOUT 2-1" is stamped as the match starts, with its
  intro line, and it has a word for you when the match ends. In the campaign the bout sets how hard a rival rips (see the Circuit Map); in free play higher levels make rivals rip harder and aim steadier. Never
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
  collide, and the last top spinning takes the heat, scored on the foe that went out last. Bots
  raise a ramp inside their nearest foe every few seconds, aimed at the rim.
  Brawls are free play (no bout, order or challenge). `npm run check:sim-n` checks that the N-top
  step with two tops matches the duel step exactly, that crowded rounds always end and that they
  replay identically.
- **Pass and play:** when a duel ends, a PASS button joins MENU and REMATCH: the next person on
  the same headset fights the top just played and its recorded rips and forges (an echo, below),
  with a ghost hand from the far rim.
- **Online duel (beta)** (`src/game/online.ts`, `src/game/net.ts`): open the game with
  `?online=host` and the card shows a five-letter room code; a friend on another headset opens
  `?online=CODE`. The host's game runs the only simulation: it waits for both rips, applies the
  guest's ramps, cups and slings, rim springs, arena forges and strikes from the far side, and sends both tops and the floor 30 times a
  second; the guest sees the fight turned half round, so their own top is near them. Each smith's
  hands reach the other table live (20 times a second) as two ghost hands on the far side. Signalling
  goes over public Nostr relays to a WebRTC link (Trystero, loaded only when a room is opened) with public STUN
  only, so some strict networks will not connect, and it says so. Tested with two browser
  windows (`&net=bc`) and a node loopback with 200 ms round trips and 5% loss
  (`npm run check:net`). The real path (Nostr signalling to a WebRTC channel) has also connected
  two separate browser processes on one machine in about 3 s (`node scripts/net-live-check.mjs`
  with the dev server running). It has not yet been run between two headsets or two homes.
- **A reason to come back** (`src/game/orders.ts`, `src/game/board.ts`):
  once the first session is over, the Smith's board over the far rim shows **today's Smith
  Order**, made from the local date and what you have unlocked (the same all day): a rival, an
  arena and one way of winning (ramp them out, shatter them, outlast them from your cup, win
  with a given kind of top, with a white-hot pull, without giving up heat, on your own arena). Pinch the
  board to play it; doing it strikes a stamp into the ledger (stamps 5, 10 and 15 earn emblem
  glows). Missed days cost only the streak. A match ends on a come-back card: the streak (COME
  BACK TOMORROW on day one, WON 4-0 · COME BACK after a win), the next match's new move (or the
  next bout), and tomorrow's order (Tomorrow: beat RIVAL · +120 XP). The board's back (a pinch on the level plate) shows the
  current chapter of the Circuit Map as medallions with three medal notches each, and the medals
  the next bout still asks for. The last three tops
  that won a match stand as champions on the left rim with their record; pinch one to make it
  your top again. The hosted build has a web app manifest, so it should be installable to the Quest
  library (not yet tried on a headset).
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
- **Heat, first to 4:** a knockout (SLAG into a pit, THROWN over the wall, SHATTER) scores 2 heat;
  the one glowing Crucible pocket in each walled arena scores 3, and so does a top thrown off your
  real table (a DESK KO). OUTLAST (the other top stops first, or has less spin at the 45 s limit)
  scores 1. From 15 s the pressure phase opens the pockets (up to 75% wider by 19 s) and heats the
  outer rim, so rounds rarely run long. The
  score shows on the match bar.
- **Real-edge cue:** in a duel fight on a detected table, up to two red hazard-striped bands (yellow
  in Colour-safe) sit on the rim, following its shape, in the directions where the real table edge is within about 25 cm of it; an arc brightens
  while the rival is near the rim inside it; in the first match's forge round the nearest arc pulses for the staged DESK KO. From the second match on, a one-time call (REAL
  EDGE: LOW RIM / THROW THEM OFF YOUR DESK) explains it. From the second match the rim under each arc is a lower drop side for both tops (a top goes over it at 55% of the usual outward speed; `DESK_DROP_ESCAPE` in `src/game/sim.ts`), so where your real desk edge is changes where throws land; online duels and brawls leave it off. Unverified on a headset.
- **Sound,** all synthesized: a spin hum per top whose pitch drops and wavers as it
  slows, metal clashes, the cord's rising tension tone, launch, rail kick, slag pit,
  burst, topple and result jingles.
- **Arena moves during the fight:** pinch the floor and a ramp
  rises there at once (after a 0.12 s hold, full size, about 11 cm across); keep holding and drag
  to aim which way it throws a top. From the fourth match, press a fingertip into the floor to open a cup that catches
  the first top to roll in; pinch it, pull back and let go to sling it the other way (snapped
  into a slag pit within 20°). A cup with nothing in it, or a catch not slung, lets go after 2 s. A ghost shows the ramp for that first moment, contour rings shrink as a shape relaxes back to flat in 2–3 seconds, and every
  shape affects both tops. In the opening match every finish scores one heat (a desk KO adds its bonus one) so all three lessons
  get a round. Afterwards knockouts score two as normal. Three charges, shown as sparks on the near rim: a shape spends one, 6 s refills one, a strong clash refills one only when your own shape caused it, a hand keeps one live shape, and nothing can be shaped in the first 1.8 s. In the first three matches the rim holds your top for 6 s (10 s in the first match's second round) and holds the rival only until you act, so the lesson's move is what can win the round. A finish within 1.5 s of your shape names it ("YOUR RAMP → SLAG").
- **Flick (direct touch):** your open index fingertip is a body in the fight. Lower it to the
  tops' height (it glows orange while a charge can pay, grey when not) and swing it through a top:
  the top takes the finger's speed. A real swing spends one charge; a slow touch or a top running
  into a still finger only nudges it, free, at most twice a second. A fast-spinning top shrugs most
  of a flick off, a tired, wobbling one is thrown, so the timing matters as much as the aim. In the
  headless sim a human-paced flicker (0.32 s lag, 15° aim error) wins 68% against an equal rival
  (no hands 51%, random flicking 52%) and comes back from a spin deficit in 18% of rounds instead
  of 7% (`npm run report:flick`, 6 rounds per arena and type pairing). Online, the guest's flick is sent as a
  direction and swing speed and the host applies it. The first match teaches it too: once its
  forge lesson is done (or in its third round), a tired rival near the rim calls for a flick.
- **One new move per match:** after the first match's lessons (ramp, Arena Forge, strike, Flick)
  each completed match releases exactly one more hand verb, the measured ones most useful first, and ends with its
  card (NEW MOVE: name, one line on the gesture): Rim Spring for match 2, Forge Gust 3, cup and
  sling 4 (campaign bout 1-4 teaches it), Ember Rivet 5, Spin Rub 6, Crossguard 7, Finger Groove 8, Forge Wheel 9
  (`VERB_RELEASE` in `src/game/progress.ts`, checked by `npm run check:sim`). Online, brawls and
  the `?demo` save (level 8) have every verb.
- **One owner per hand:** `src/game/gesture-owner.ts` is the single priority table (held tool, release locks, Crossguard post, cup press, own gust, Spin Rub, Forge grip, slap) that decides which verb owns a hand each frame and which verbs may listen or fire; every colliding pair is a row in `npm run check:sim`.
- **Spin Rub (direct touch, from the sixth match):** run the same fingertip slowly along your own
  top's rim, mostly sideways rather than into it (below flick speed). The first rub spends one
  charge and opens a 1.2 s window: rubbing the way the top turns adds up to 0.3 spin a second
  (0.28 per window, never above full spin), rubbing against it brakes at 40% of that rate. The top
  is eased off the finger but never pushed. Without a charge it does nothing. Online, the guest
  sends the spin it rubbed and the host caps it per window. Covered by `npm run check:sim` and
  `check:net`; not yet tried on a headset.
- **Forge Gust and Rim Spring (from the third and second match):** a fast open-palm sweep over the bowl
  pushes the tops it crosses but steers around your own; swept toward a pocket mouth, the rival
  is pushed twice as hard and lifted so the pocket takes it. Pinching the rim and pulling inward
  springs that sector: your own top is pulled in and the rim holds behind it for 1 s, and a rival
  there is slung along the wall toward its nearest pocket. In the headless sweep with human
  reaction lag and aim error, gust moved from +0.1 to +8.9 win points over doing nothing and the
  spring from -1.6 to +10; random sweeping or springing gains about +2.
- **Crossguard and Ember Rivet (from the seventh and fifth match):** two open palms make a rail; the first
  time your top crosses it (or the rival crosses it on its way out) it costs a charge, and the
  rail then stays live 0.8 s. Every save of your own top refunds that charge, and the rival's
  escape is sent on toward its nearest pocket. A caught hot rivet planted in the bowl is a live
  post for 3 s that kicks the rival outward. Headless sweep: crossguard -0.6 -> +5.1, ember
  -0.8 -> +7.4 win points; random use +0.8 and +1.5. The single-palm brace (and its Counterflow riposte) measured about 0
  and was removed.
- **Arena Forge aim:** the two-hand forge hits the rival three times as hard when it is in the
  outer band or heading out, and only a fifth as hard in the middle, so it rewards timing.
  Squeeze pulls your own top in and throws the rival out, and the forging top's rim holds for
  0.4 s. In the same headless sweep: squeeze -1.0 -> +7.4, stretch +3.3 -> +6.9, tilt
  +0.1 -> +5.6, twist +0.3 -> +3.4 win points over doing nothing; random forging +2.8.
- Tops orbit the bowl in their spin direction, bounce off each other and spark on
  contact, lean into hits, wobble as spin drains, then topple.
- **Far ramps:** point the hand ray at the floor during a fight and hold the pinch to
  raise a ramp there; its place locks when the pinch starts. A small blue dot marks where the ray meets the arena floor. In the
  emulator's play mode a left click is a pinch, so the game is playable by looking
  around with the mouse and click-holding.
- **The duel layer:** a forge bar (the ring on the back of each hand)
  starts each round almost half full (45%; a white hot rip adds a quarter), fills on its own in 24 s and from solid clashes, three times
  as fast while your top is behind on spin. Full, pinch
  the seal off your top and stamp it into the arena (hold the pinch to steer Tilt, Magnet or
  Ward); a palm pressed on the table beside the arena is the fallback (after 4 s, or in Press to
  strike). The seal you engrave in the forge's
  Combat drawer picks it: the Anvil Strike (a shockwave from the middle that throws tops near the
  rim, hot ones further; your own top is braced), the Tilt (Lv 3: the arena dips toward your
  palm; the rival slides, your top holds), the Rush (Lv 4: your top charges the rival), the Ward
  (Lv 5: for 4 s your top cannot be knocked out, and a charge into it rebounds: "PARRIED!"), the
  Magnet (Lv 7: the rival is dragged toward a slag pit) or the Hammer (Lv 9: your next solid hit
  cracks three times as hard). A top
  that has taken a beating glows red: it flies further. The strike is staged: a short freeze, the
  seal rising off your top, its name stamped over the arena.
- **Rival tells:** from the fourth match each rival has one big move (a charge, a quake or a
  pull). Its own bar fills like yours; when full it flashes and whines for a second, then the
  move lands, unless your strike cuts it short ("INTERRUPTED!") or your Ward turns it back. Once
  you know the tells, a rival with its move ready waits a few seconds while your strike is ready
  too: strike first, or hold the strike as the answer.
- **Rival signature parts:** knock one of the seven older rivals out once and its part is yours (Rim Raider's Gale
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
  circuit, ten arenas won, a rival knocked off your real table), counted on the board's back; personal bests (hardest rip, fastest knockout)
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
- **Store basics:** a service worker caches the game for offline play (checked in the browser, not on a headset); `privacy.html`; a
  maskable icon; the landing page has how-to-play and credits; a failed start says so.
- **Sound** (`src/game/audio.ts`): spatial (HRTF) placement of hums, clashes and landings; one generated room reverb, music that follows the game at 96
  bpm in D minor on the game's four-note motif (home: drone and anvil; getting ready: bass;
  fight: toms; tension: hats and the motif), ducked under big hits; clashes ring at each ring's
  own pitch (an Anvil clangs lower than a Striker).
- The finish stamps first; a result card follows 0.9 s later (none in the first match's rounds),
  and the next round starts after 4 s, sooner on a pinch.

