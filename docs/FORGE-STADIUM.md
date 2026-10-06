# One machine: the Forge Stadium

Research notes (Oct 6, 2026) on a review proposal: the arena, the anvil, the stand, the arena
shelf and the wall parts catalog work like five separate interfaces; make the arena and the
forge **one object that transforms**. Section 1 measures what exists, section 2 checks the
proposal against Meta's hand guidance, section 3 is what we keep, change or drop, section 4 the
plan.

---

## 1. What exists (measured in IWER)

| Station | Where (from the eyes, seated, tray placement) | How it is used |
|---|---|---|
| Arena | center 0.6 m ahead, 0.35 m below; radius 0.12-0.16 local x scale 2, so the near rim is about 0.3 m ahead and the far rim about 0.9 m | Direct pinch on the floor and a ray for far ramps |
| Stand (PLAY) | arena-local (-0.23, 0, 0.06): left of the arena | Pinch your top to carry it into the arena |
| Anvil (FORGE) | arena-local (0.24, 0, 0.06): right of the arena | Pinch to open the forge |
| Arena shelf | about 1.1 m ahead, behind the arena | Ray-pick a miniature to switch arenas |
| Forge wall | a virtual wall 1.6 m ahead (or the real wall), scaled up to 1.8x | Ray-pick a part card, it flies to the hand |
| Forge top | floats 0.35 m ahead, 0.22 m right, 0.2 m below the eyes | Direct: fit parts by hand |

Draw calls: hub 226-228, forge 188 with most parts unlocked. Most of the forge's cost is the
part models on the wall cards (each ring preview is four meshes).

So in the forge the player alternates between a ray to a wall 1.6 m away and direct hands on a
top 0.45 m away, every part. In the hub there are three stations in three directions plus a
shelf behind the arena.

---

## 2. Checked against Meta's hand guidance

From [Hands UI best practices](https://developers.meta.com/horizon/design/hands-ui-best-practices/):

- Direct-touch UI belongs **42-46 cm** from the user; indirect (ray) is comfortable from about
  **0.8 m to 3 m**; avoid the **0.5-0.8 m middle distance**, where users cannot tell whether to
  touch or point.
- Targets about **22 mm** (2.5-3 degrees), at least **12 mm** apart; frequently used controls in
  the lower half.

[Table Troopers](https://developers.meta.com/horizon/discover/success-stories/table-troopers/)
teaches one interaction, the pinch, on its first screen and infers intent from recent pinch
positions; one hand is enough to play.

What this says about SpinSmith:

1. **The wall catalog is far-only and the top is near-only**, so every part is a mode switch.
   Moving the parts to the near rim (about 0.3 m ahead, 0.35 m below: about 0.46 m from the eyes)
   puts both in the direct zone. **The review's main point holds.**
2. **The arena center itself is in the middle distance** (0.6 m ahead, about 0.69 m from the
   eyes). That is fine for watching a fight, and the far ramp already locks its position at the
   pinch start. But **the anvil must not rise at the arena center** as proposed: fitting parts
   there would be a lean. It should rise at the near third of the bowl, about 0.45 m away.
3. The far rim (0.9 m) is the right place for things that are **read, not touched**: the stat
   gauges and the score.

---

## 3. The proposal, item by item

| Proposal | Verdict | Why / change |
|---|---|---|
| Remove the PLAY stand; the top waits in a dock on the near rim; dropping it in the center starts the match | **Keep** | One less station; the dock is in the touch zone. The guide's "launch" step points at the dock instead |
| A big forge lever on the rim instead of walking to the anvil | **Keep, smaller** | A lever is a new gesture (pinch and pull down); a pinchable anvil emblem on the rim is enough at first |
| Arena plates in a slot instead of the miniature shelf | **Later** | Six arenas plus saved workshop arenas need a rack of plates; the shelf works. Do it after the forge |
| Fight mode: everything else hides; score built into the far rim; charges as two lit cells on the near rim | **Mostly done** | The hub props already hide in a fight and the charge pips already sit on the rim. Remaining: the floating match bar becomes a strip on the far rim |
| Forge: the floor sinks, the anvil rises, the top grows 1.5x on it | **Keep, near third** | The anvil rises at about 0.45 m, not at the center (section 2) |
| Drawers on the near rim: Ring, Core, Tip; only the chosen kind shows (4-6 parts) | **Keep, plus Style** | Paints and spin direction need a fourth drawer; presets are dropped from the shelf (the guide never uses them) |
| Stats as four mechanical needles on the far rim | **Keep** | Read-only, at 0.9 m; replaces the floating glass stat card |
| Finish by dropping the top in a quench slot in the center | **Keep, near** | The quench bucket becomes a slot beside the anvil; same "dunk to save" verb |
| Look: precision forge / watchmaker's bench, graphite, brushed steel, a little brass, orange only where hot or fittable, cyan only for the rival, names engraved | **Keep** | It is the forged-tech direction of `VISUAL-POLISH.md` without the glass panels |
| Remove the wall catalog | **Yes, last** | The wall stays for the arena workshop (builder), which this proposal does not cover |

Sizes on the near rim: a parts tray along the near half of a 0.3 m radius rim has about 0.9 m of
arc. Six parts at 40 mm with 12 mm gaps need 0.31 m: room to keep them large (2-3x the 22 mm
minimum) and in the lower field of view.

Draw calls should drop: the forge shows one kind (4-6 part models) instead of every part on the
wall (about 30), and the stat card and wall panel go. Expected forge well under 150.

---

## 4. Plan

The order follows the review: the cheap, high-value steps first, the transformation animation
last. Each step keeps the game playable, `check:sim` green and the guide flow passing.

| Step | What | Size | Check |
|---|---|---|---|
| 1 | **Near-rim parts tray** in the forge: one kind at a time, picked directly; selectors Ring / Core / Tip / Style as four large pinchable tabs on the rim | 2 days | Every part reachable with one hand at about 0.45 m; targets at least 22 mm, 12 mm apart |
| 2 | **Anvil at the near third** in forge mode, the top 1.5x on it; quench slot beside it | 1 day | Fitting a part needs no lean (head stays within 10 cm of its seated pose in IWER) |
| 3 | **Stats on the far rim**: four needles plus the build name engraved | 1 day | Readable from the seated pose; no floating card |
| 4 | **Remove the wall catalog** from the forge (the wall stays for the workshop) | 0.5 day | Forge draw calls under 150 |
| 5 | **Hub merge**: the top docks on the near rim, the stand goes, a forge emblem on the rim opens the forge; the guide steps point at the dock and the emblem | 1.5 days | The first-session flow from a clean save, `[LABEL]` order, screenshots |
| 6 | **Transformation**: the floor sinks, the anvil rises, the drawers slide out (tweens only, 0.6-0.8 s) with a mechanical sound | 1.5 days | Frame time during the tween; comfort (nothing moves toward the face) |
| 7 | **Match bar into the far rim** as a metal strip with the score | 1 day | Fight draw calls stay under 120 |
| Later | Arena plates in a slot; a pull lever for the forge | | After Quest testing |

About 8-9 days in total, inside the time to the Nov 18 deadline, and best done **before** the
headset arrives, so the Quest hand tests measure the final layout rather than one that is about
to change.

Not to do: physics-driven drawers, a scrolling or tabbed panel, hover menus, a new gesture for
any of these. Everything stays **pinch, carry, drop into a slot**.

---

## 5. Risks

- **Forge rewrite:** `forge.ts` (850 lines) holds the shelf, the fitting and the paint logic. The
  fitting and paint code stays; the shelf layout and selection are replaced. The guide's
  "forge highlights only the needed part" must move to the tray (open the Tip drawer, pulse Rush).
- **Table placement:** on a real table the near rim is lower than on the tray; the tray and the
  anvil must sit above the rim, never below the table plane.
- **Left-handed and one-handed play:** the tabs and the tray are centered on the near rim, not on
  one side.
- **The workshop** keeps the wall; two styles side by side until the builder moves to the rim
  too (out of scope now).

---

## 6. Status (Oct 6, 2026): steps 1-7 done

| Step | Result |
|---|---|
| 1 Near-rim tray | Four engraved tabs on the near rim (Ring, Core, Tip, Style); the open drawer's parts (at most six) on pedestals in a half circle around the anvil, about 9 cm apart in the world. Presets left the forge |
| 2 Anvil at the near third | The forge's anvil (1.35x the home one) stands at arena-local z 0.06, your top 1.7x on it, about 0.5 m from the eyes; the quench slot beside it on the right. Let go of the top anywhere and it settles back on the anvil |
| 3 Stats on the far rim | A machined plate with the build engraved, weight against the limit and five dials; a second needle previews a part (green gain, red loss) |
| 4 Wall catalog removed | The wall only shows for the arena workshop; its forge mode is gone |
| 5 Hub merge | The stand is now a dock on the near rim's left, the forge a small anvil on its right, the level plate between them; notes hang over the far rim's left, the arena shelf to its right; the beacon marks the dock or the anvil |
| 6 Transformation | 0.8 s open: the floor sinks 3 cm, the anvil rises out of it, the tabs and tray slide out, the stats plate rises; a mechanical rumble. Saving folds it back in 0.4 s |
| 7 Match bar | A machined strip set into the far rim, tipped toward the player, under the round messages |

Draw calls (IWER, most parts unlocked): hub 228 → 196, forge 188 → 162, fight 108, workshop 118.
The first-session flow from a clean save runs end to end: dock → match → XP and unlocks → small
anvil → Tip drawer open with Rush pulsing → fit → quench → dock for the rematch.
Screenshots: `docs/review/home.png`, `docs/review/forge.png`.

Still for the headset: reach to the tabs on a real table (they sit lowest), hand occlusion over the
tray, and whether a 0.8 s transformation feels quick enough on the tenth visit.
