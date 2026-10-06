# The arena workshop on the machine

Plan (Oct 6, 2026) to give the arena workshop the treatment the forge got in
[FORGE-STADIUM.md](FORGE-STADIUM.md): no wall board, everything touched within a seated arm's
reach, everything read on the far rim, one verb (pinch, carry, drop).

---

## 1. What exists

`src/game/builder.ts`, opened from the blueprint at the end of the arena shelf:

| Part | Where | Use |
|---|---|---|
| Board: 6 tabs (Place, Shape, Floor, Wall, Theme, Extras), 3-5 pieces per tab, a name under each | The smithy wall, 1.6 m ahead, drawn 3.2x | Ray: pinch a piece, it flies over the arena |
| Try it / Save & play / Back | Bottom of the board | Ray |
| Status line | Top of the board | Read |
| The draft arena | The arena itself | Drop a piece: a pocket is cut into the rim, a pillar stands, a floor piece reshapes the floor, a gem changes the theme. Pick placed pieces up to move or throw away; tap a pocket for 2/3 points; pinch the rim and pull to resize |

So the workshop has the problem the forge had: every piece is a ray pick 1.6 m away, carried to
an arena 0.6 m away and placed by hand. It is also the last user of the smithy wall: the wall's
glass panel, its placement on detected walls and its scoreboard exist only for it (the match bar
already moved to the rim).

Measured: workshop 118 draw calls. `reportArena` takes 75 ms for one round per type pair and
163 ms for three on a desktop; on Quest that is several times longer, too slow to run on the main
thread after every change.

---

## 2. The design

The arena turns into a **drafting table** the way it turns into the forge.

```
                       FAR RIM
      [plate: name · round length · KO rate · type balance dials · last check]

        ╭──────────────────────────────────╮
        │   blueprint grid on the floor     │
        │   brass resize knobs on the rim   │
        ╰──────────────────────────────────╯
     [BACK]  ══ tool rail: the open drawer's pieces ══  [TRY] [SAVE]
       PIECES · SHAPE · FLOOR · WALL · THEME · EXTRAS      (tabs along the rim's arc)
                       NEAR RIM
```

| Part | Where (arena-local) | Why |
|---|---|---|
| **Six tabs along the near rim's arc** (same names as today) | Engraved plates following the rim from -55 to +55 degrees, radius about 0.19 | Six categories do not fit a straight row at a usable size; on the arc each tab stays about 6 cm wide in the world, 12 mm+ apart. Same look as the forge's tabs |
| **Tool rail** | A brass bar across the near rim, about 5 cm above it; the open drawer's 3-5 pieces hang on it | The floor is the canvas, so pieces cannot lie on it as in the forge. Above the near rim they are at about 0.4 m from the eyes, in the touch zone, and do not hide the far half where most pieces go |
| **Pieces** | Picked from the rail, carried, dropped on the floor or the rim, exactly as today | `place()`, `pickFromArena()`, taps and the rim resize stay |
| **Back / Try / Save** | Three engraved buttons at the ends of the tab arc (Back left; Try and Save right) | Rare actions at the edges, the tabs in the middle. Save keeps the forge's verb: a stamp pressed into a slot |
| **Far-rim plate** | Where the forge's stats plate stands | Replaces the status line: the arena's name, the last check's verdict (`arenaWarning`) and three dials from `reportArena`: median round length, KO rate, and the type spread (the gap between the best and worst of Striker, Anvil, Needle) |
| **Drafting look** | Blueprint grid lines on the floor, tick marks and brass knobs on the rim while the workshop is open | Says "you are editing this" at a glance; the knobs show the rim can be pulled |
| **Transformation** | The rail and tabs slide out of the near rim, the plate rises, the grid draws in from the center (0.6 s); reversed for Try it and when leaving | One motion language with the forge; Try it folds the tools away so the demo round is unobstructed, then unfolds |

**The check runs off the main thread.** After each change (on release, not while dragging), the
draft goes to a Web Worker running `reportArena` with one round per pair; the plate's dials
ease to the new values when it answers. Try it still runs its watched demo round.

**The wall goes.** With the workshop on the rim, `wall.ts` keeps only the match bar; wall
detection, the glass board and the scoreboard are deleted.

**Entry.** The blueprint moves off the far shelf onto the near rim, beside the level plate, so
every station at home is touched, not pointed at. The arena shelf itself stays until the arena
plates of FORGE-STADIUM's "later" list.

What does not change: the pieces, their rules (`layout.ts` `validate`), saved arenas, the demo
round, the near and far pinch.

---

## 3. Shared pieces with the forge

The forge's tabs, pop-out tray, metal plates and transformation are written inside `forge.ts`.
The workshop is their second user, so they move into one small module, `src/game/rim.ts`:

- `RimTabs`: engraved tabs on one canvas, laid on a row or an arc, hit-tested by position.
- `popIn(t, i)`: the staggered pop of a drawer's items.
- `StatPlate`: the far-rim plate with dials (the forge's five, the workshop's three).

The forge keeps its behaviour; only its drawing code moves.

---

## 4. Plan

| Step | What | Size | Check |
|---|---|---|---|
| 1 | Move the tabs, the pop-in and the dial plate from `forge.ts` into `rim.ts` | 0.5 day | The forge looks and works the same (screenshots, first-session flow) |
| 2 | Workshop tabs on the rim arc and the tool rail with the open drawer's pieces; pick, carry and drop as today | 1.5 days | Every piece reachable at about 0.4 m; targets at least 22 mm, 12 mm apart; placing a pocket on the near rim is not blocked by the rail (the rail lifts away while a piece is held) |
| 3 | Back / Try / Save buttons on the rim | 0.5 day | Try, Save & play and Back flows |
| 4 | Far-rim plate and the check in a Web Worker | 1 day | No frame over 14 ms while the check runs; dials update within a second of a change |
| 5 | Drafting look and the transformation, folding for Try it | 1 day | Frame time during the tween; the demo round sees no tools |
| 6 | The blueprint on the near rim; delete the wall board, its placement and the scoreboard | 0.5 day | Hub flow; nothing references the wall but the match bar |
| 7 | Gates and docs: draw calls (workshop under 120), screenshots, README | 0.5 day | `check:sim`, build, review screenshots |

About 5.5 days. After it, every activity happens on the one machine on the table, and the
"smithy wall" exists only as the match bar strip.

---

## 5. Risks

- **The rail over the near rim** could hide pockets placed there; it lifts away while a piece is
  carried, and pockets can still be picked from the far side.
- **Six tabs** are more than the forge's four; if they read crowded on the headset, Shape and Wall
  merge into one "Form" drawer (3 shapes and 4 walls on two rail rows).
- **The worker** needs the simulation as a browser module; Vite bundles a module worker from
  `new Worker(new URL('./check-worker.ts', import.meta.url), { type: 'module' })`; the node report
  workers stay as they are.
- **Real tables:** the tabs sit lowest; reach on a real table is a headset check, as for the forge.

---

## 6. Status (Oct 6, 2026): steps 1-7 done

| Step | Result |
|---|---|
| 1 `rim.ts` | `RimTabs` (any number of engraved plates on a row or an arc, one mesh, one draw call), `popIn`, `DialPlate`; the forge uses them unchanged in look |
| 2 Tabs and rail | Six drawer tabs on the near rim's arc, each turned to face the seated player so the ends still read; a brass rail across the near rim with the open drawer's pieces and an engraved name strip; the rail steps away while a piece is carried |
| 3 Actions | Back at the rail's left end, Try and Save at its right end (the arc ends were hidden behind the rail in testing, so the actions moved onto it) |
| 4 Far plate and worker | The draft's name and form, three dials (round length, KO rate, balance) and the warning or last message; `check-worker.ts` runs `reportArena` with one round per pair after every change, a change during a check queues one more |
| 5 Drafting look | Blueprint rings and spokes over the floor (one line mesh) and four brass knobs on the rim; the tools fold out in 0.6 s, fold away for Try and when leaving, and unfold after the demo |
| 6 Entry and the wall | The blueprint lies on the near rim beside the anvil; `wall.ts` is deleted, the match bar lives in `match-bar.ts` |
| 7 Gates | Typecheck, build (the worker is its own chunk), `check:sim`; draw calls workshop 118 → 96, hub 192, forge 162, fight 112; flows tested: place a pocket, change the floor, Try and back, Save & play, Back |

Screenshots: `docs/review/home.png`, `docs/review/workshop.png`.

## 7. Review pass (Oct 7, 2026)

A review scored the workshop 5/10 (fight 8, forge 7, home 6): six tabs, the rail, the actions
and the plate crowded the front. Changes:

- **Four drawers, at most five pieces each,** in a straight row like the forge's tabs: Pieces
  (pocket, rail, pillar, bumper), Floor (bowl, flat, hill, ridge, tiers), Form (circle, oval,
  square, a wall piece that steps low → standard → high → none, a theme piece that steps through
  the four themes) and Extras. Pieces that change the whole arena apply on a tap on the rail too.
  (The review's three drawers would have lost Shape and Tiers and put twelve pieces in Style.)
- **The rail is no wider than the arena** and 3.5 cm lower; names shrink to fit under their piece.
- **Floor pieces read without names:** their relief is exaggerated to full height; Flat (a very
  shallow dish in play) is drawn as a plate with only a lip; they hang nearly side-on.
- **Back on the left rim, Try and Save on the right;** Save sits in front of a stamp slot set into
  the rim (`rimSlot()` in `rim.ts`), which also saves when pinched.
- **The forge's quench** became the same slot set into the right rim (no bucket, no label); it
  breathes while your top is carried.
- **Home:** the PLAY, FORGE and BUILD names show during the first session, afterwards only while
  pointed at.

Draw calls: hub 186, forge 160, workshop 90.
