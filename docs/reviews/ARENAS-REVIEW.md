# Arenas review (commit 7cf4e0d, fifteen arenas)

Method: read the full diff plus the code it touches. Ran `npm run typecheck` (clean) and `npm run report:arenas`,
plus node probes that import src/game/*.ts (display sizes, Twin ridge profile, pad chaining, orbit push, side fairness).
`npm run check:sim` fails at sim-check.ts:227 ("two charges, then none"). That comes from the **uncommitted**
shaping.ts/sim.ts work in the tree, not from this commit. Line numbers below are for the current tree.

Measured per arena (S = ARENA_SCALE 2.4, reach 0.68 m):

| Arena | k at home | push (m) | far rim from head | rival top in hub, % of shrunk rim |
|---|---|---|---|---|
| Colossus Bowl | 0.73 | 0.216 | 1.52 m | 99 % (sits on the wall) |
| Glacier Steps | 0.73 | 0.120 | 1.33 m | 99 % |
| Grand Anvil | 0.76 | 0.192 | 1.47 m | 95 % |
| Titan Crater / Neon Speedway | 0.79 | 0.168 / 0.041 | 1.42 / 1.17 m | 91 % |
| classics | 1.00 | 0 | 0.97-1.09 m | 72 % |

## HIGH

**H1. A big arena doesn't fit a real desk, and table-fit ignores the push.** match-system.ts:1131 and :1063 fit with
`this.arena.radius` of whichever arena was current at placement. updateSize (:1096) then slides the root back by up to
0.216 m with no table check. Colossus is 1.25 m across, and its far rim lands 1.52 m from the head. A normal 0.6-0.8 m
desk has its far edge about 0.9 m from the eyes, so the far half floats past the desk, or into the wall behind it, in
passthrough. The table mask can't hide it because the arena sits above the table. Switching arenas (setArena :697)
never refits either. Fix: in updateSize, cap the match size by the table:
```ts
let kMatch = 1, push = match ? Math.max(0, rimRadius(L, Math.PI/2) - NEAR_RIM) * ARENA_SCALE : 0;
const t = match && this.onTable ? this.tableShape() : null;           // cache per placement, not per frame
if (t) { const c = {x: placed.x - Math.sin(yaw)*push, z: placed.z - Math.cos(yaw)*push};
  const room = edgeDistance(t.poly, c.x, c.z) - RIM_MARGIN;          // export edgeDistance from room.ts
  kMatch = Math.min(1, room / (rim * ARENA_SCALE)); push *= kMatch; }
const k = match ? kMatch : Math.min(1, DISPLAY_RIM / rim);
```
(`placed` = root position with `this.pushed` taken out.) Also refit x/z in setArena using `maxRim(layout)`.

**H2. Tops, shadows, sparks and marks don't shrink with the arena.** :1109 scales only `arenaView.root`. The top views
(:885), sparks, marks, launchZone and pips sit in `this.stage`, unscaled. At home the rival's waiting top
(toHub :746, at full-size `-SPAWN`) stands on the rim wall of Colossus and Glacier (table above). The tops also look 1.37x
too big, and while the arena opens, the rim sweeps past a top that doesn't move. The same happens in the forge and the
workshop. Fix: scale the stage instead: `this.stage.scale.setScalar(this.viewK)`, and drop
`arenaView.root.scale` and `builder.viewScale` from the arena's own path. `arenaPoint`'s `/k` stays correct because
`stage.position` is 0 outside the forge. Builder piece previews (builder.ts:611) then need no `*k`.

**H3. The Twin Basins ridge is inverted, so the arena doesn't do what its rule says.** sim.ts:195:
`(1 - smoothstep(0.75, 0.65, n))` is 0 for n<0.65 and 1 for n>0.75. Probe heights on x=0, compared with x=5 cm:
n=0.4 → 1.9 vs 2.6 mm (no ridge), n=0.72 → 11.9 vs 7.7 mm. So the middle is one plain oval bowl, and a 4-6 mm hump
sits exactly on both launch spots (spawn n=0.72). Fix: `* smoothstep(0.85, 0.7, n)` (ridge through the middle,
fading before the rim), then re-run the report. Twin currently reads 17.6 s, KO 39 %.

**H4. Workshop resize runs away for arenas past 0.19.** builder.ts:580-590 with match-system.ts:1097. Once maxRim
exceeds DISPLAY_RIM, the shown rim stays at 0.19 whatever the true radius, and arenaPoint divides by the *new*
viewK. If the hand rests 1 cm outside the rim, every frame reads n≈1.05, grows the radius, shrinks k, and reads n≈1.05
again, so the arena jumps to 0.26. Pulling in does the reverse, down to 0.19. Sizes 0.20-0.25 can't be chosen, and
nothing moves on screen. Fix: freeze the display scale while resizing.
`Builder` gets `get resizing() { return this.held?.mode === 'resize'; }`, and updateSize uses
`const k = match ? 1 : this.builder.resizing ? this.viewK : Math.min(1, DISPLAY_RIM / rim);`. The rim then follows the
hand, and it eases back to 0.19 on release.

## MEDIUM

**M1. Boost pads stack without limit.** sim.ts:699-711 adds 0.35 m/s on every pass (0.8 s cooldown, any direction or
speed). In a probe with one top on a pad and the other toppled, Striker reached 1.28 m/s on Neon Speedway and 1.34 m/s on
Twin Basins, which is 2.6x LAUNCH_SPEED (0.5). Fix: top up to a pad speed instead of adding:
```ts
const along = t.vx*c + t.vz*s; const add = Math.max(0, PAD_TOP - along); // PAD_TOP ≈ 0.55
t.vx += c*add; t.vz += s*add;
```

**M2. Circling-pillar validation assumes a round rim.** layout.ts:164-167 checks `hypot > 0.85` only at the dropped
spot. On an oval (short axis 0.78) or a square (edge 1.0 against corner 1.19), a pillar dropped at 0.8 on the long axis
passes through the wall as it circles. Builder-only. Fix:
`if (layout.orbit) for (let i=0;i<32;i++){const a=i/32*2*Math.PI; if (Math.hypot(p.x,p.z)*layout.radius > rimRadius(layout,a)*0.85) return 'A circling pillar would run into the wall';}`

**M3. Saves from before this commit never get the new arenas.** progress.ts:205 loads `unlocked` as stored.
ARENA_UNLOCKS only fire on a level-up (:270), so a level-10 headset save has no Orbit Foundry and no Twin, Ripple,
Titan or Speedway. Fix, after load:
`for (let lv = 2; lv <= this.level; lv++) for (const m of [LEVEL_UNLOCKS, ARENA_UNLOCKS, RIVAL_UNLOCKS]) if (m[lv]) this.unlocked.add(m[lv]);`
Also, `get next` (:233) ignores ARENA_UNLOCKS, so the home teaser shows "paint:2" instead of "Orbit Foundry" at Lv 2.

**M4. You can start the pull while the arena is still opening and sliding.** updateReadyPinch (:1370) has no settle
gate. The open-out eases over about 1.5 s (`dt*3`) and moves the spawn and the cord anchor under the hand. Fix:
`if (this.viewK < 0.995 || Math.abs(this.pushed - targetPush) > 1e-3) return;` with `targetPush` stored by updateSize.
This is also the hook for A1.

**M5. Rule text doesn't match how the arenas play** (report:arenas): Meteor Pit "Short and brutal" has a 22.6 s median
and 16 % KO. Glacier Steps "one shove and they slide off" has 12 % KO. Grand Anvil and Ripple Pool are at 10 % KO and
22-24 s. The classics run 21-68 % KO. Judges would sit through long spin-outs. Suggestions: Meteor Pit gets an optional
`shrinkStart` on the layout (sim.ts SHRINK_START per arena, for example 6 s). Glacier gets more tier step or
`depth: 0.009`. Grand Anvil gets `wall: 'standard'`. Add `if (r.knockout < 0.15) return 'Rounds rarely end in a knockout'`
to arenaWarning. The report itself (arena-report.ts:50-52) always puts the rival on the axis, but the game randomizes
±40° (rivalAngle :1343), so pad and pillar contact with real rival spots is never tested. Use
`spawnDistance(layout)` plus a seeded angle. Side/spin fairness probe (300 mirror rounds, rival angle randomized): every
arena falls within 33-53 %, which is within noise. No side bias was found.

**M6. The round card and match bar are hard to read at 1.4-1.5 m.** :1111-1113 move them to the pushed far rim but keep
scale 1.25, so text on Colossus shows about 30 % smaller than on the classics. Fix:
`const s = 1.25 * Math.max(1, (TUNE.reach/ARENA_SCALE + this.pushed/ARENA_SCALE + far) / (TUNE.reach/ARENA_SCALE + 0.17));`
Apply it to `label.mesh.scale` and `bar.mesh.scale`. An alternative is to move the label to a fixed spot over the near
half during a match.

**M7. The Menu button goes out of reach.** :1114-1115 grow it by `f` *and* the root slides back. On Colossus it lands
about 0.76 m from the head, compared with 0.59 m before. reach.ts aims for 0.42-0.46 m direct touch. Fix: keep it
player-relative: `set(-0.2, 0.05, 0.14 + this.pushed / ARENA_SCALE)`. It clears the 0.26 rim (0.305), and you can
add an x nudge for the square's corner (Glacier corner at 0.185, 0.185).

## LOW

- **L1** visuals.ts:1250 and match-system.ts:1325: `arena.reset()` zeroes `elapsed` each round, so the circling pillars
  snap back to their start angle. Keep an `orbitPhase` in Arena that carries across rounds, or ease the view.
- **L2** sim.ts:756-765: orbit contact uses the top's world velocity and adds the pillar velocity even on the trailing
  side, which makes the top stick. Use relative velocity: `vp=(-pz,px)*orbit; into=(v-vp)·n; if(into<0) v-=(1+e)*into*n`.
  The effect measured now is small (+0.03 m/s peak).
- **L3** layout.ts validate has no pad checks. Add a check that a pad is not within `PAD_R+0.15` of the player spawn
  or the rival arc (|angle+π/2|<0.7 at spawn). Neon Speedway's rival spot comes within 31 mm of a pad (pad reach 22 mm).
- **L4** :1287 moveArena, grabbed during the ~1.5 s ease back home: `p.set(d.start+…)` overwrites updateSize's slide,
  so a leftover push stays in the position. Gate with `if (this.pushed > 1e-4) return false;`.
- **L5** :1754 rivalShaping tests the Euclidean `r < radius*0.6` and uses an absolute ramp size. Ramps on 0.24-0.26
  arenas land far from the rim, which makes the big arenas easier against Lv 6+ rivals. Use
  `normRadius(L, me.x, me.z) < 0.6` and scale the offset by `L.radius/0.17`.
- **L6** visuals.ts:978 `rings = 18`: at 0.62 m world radius the crater lip and the ripples facet (3.5 cm rings). Use
  `rings = Math.ceil(18 * Math.max(1, layout.radius / 0.17))` (rebuild the geometry when it changes).
- Checked and fine: older saved custom arenas (optional `orbit`/`pads` are read with `??` everywhere), hub DROP_R 0.2
  against a shown rim of 0.19 or less, pickFromArena (elapsed is 0 while building), room light pool (centered on the
  pushed root, radius from rim), GRID 64 (extent 0.27 covers the Glacier corner at 0.262, cell 8.6 mm against 8.8 mm
  before, cost negligible), the forge (stage sinks, rim 0.19 or less), and the pad chevron and orbit rotation signs
  (they match `pillarAt`).

## Additions for the judges' 10 minutes

- **A1. Arena reveal (high value, cheap).** On a match's first `toReady`, make the open-out a deliberate 1.2 s beat:
  gate the pinch (M4), play `playMachine()` as it starts sliding and a thud when it lands. Sweep a light ring from the
  center to the rim (reuse ArenaView embers coloring with a moving `n`). Light the arena's signature pieces in turn:
  pads flash, pillars turn a quarter, Twin's ridge line draws in. Show the rule card last.
- **A2. Pad feedback.** Today pads only pulse. In sim, set `t.padHit = i` when a pad fires. After `step`, the match calls
  `arenaView.flashPad(i)` (opacity 1 and scale 1.3, decaying over 0.25 s), `sparks.burst` along the pad angle, and a
  rising whoosh. Speed is the rule of Neon Speedway, so the player has to see and hear the pad fire.
- **A3. Orbit readability.** At home the pillars stand still (elapsed 0), so nobody learns they circle until they get hit.
  Give ArenaView a display clock outside 'fight' and 'build' (visual only, so pickFromArena is unaffected), and add
  dashed direction arrows on the track ring that scroll with `orbit`.
- **A4. Put a new arena in front of the judges.** A fresh 10-minute player reaches about Lv 3-5, which opens only
  Orbit Foundry (Lv 3) and maybe Twin (Lv 5). Move Titan Crater, the most striking one once H1 and H2 are fixed, to Lv 2
  or 3. nextArena() then plays it at once. The level-8 demo save already opens four new arenas.
- **A5. Per-arena tuning fields** (`shrinkStart`, `padSpeed`, `orbit`), so M5 can be tuned per arena without touching
  the classics. Gate each change on report:arenas, with KO at least 20 % and a median of 18 s or less.
