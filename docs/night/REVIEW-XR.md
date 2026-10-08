# XR art / tech director review (night RC pass, 2026-10-08)

Read-only review. Sources: AGENTS.md, README.md, docs/NIGHT-AUDIT.md (baseline: draw calls home 142 / fight 134 / forge 144 / workshop 96; main chunk 2,597 kB, 728 kB gzip), docs/polish/ART-AUDIO.md, PLAYTHROUGH3.md, STORE-READY.md, screenshots `docs/night/baseline/*.png` and `docs/polish/shots3/*.png`, and the code listed in the brief.

## What is already right (do not churn it)

- The renderer budget choices are sound. IWSDK renders multiview stereo with MSAA (`node_modules/@iwsdk/core/dist/init/world-initializer.js:245,248`), so 134-144 draw calls are not doubled per eye. There are no real-time lights or shadows (no `*Light` anywhere in `src`). Only 4 `MeshStandardMaterial`s exist, against 37 matcap materials. IBL comes from one PMREM bake (`visuals.ts:2004`). Fixed foveation is 0.5 (`src/index.ts:37`).
- Hands first: every fight verb works with either hand. Rip: pinch your top. Ramp: pinch the floor directly, or by ray past reach (`match-system.ts:2457-2461`). Strike: a palm press anywhere beside the arena (`match-system.ts:2550`). Menu is pickable by touch or ray (`match-system.ts:1022-1040`). The Menu pinch no longer grabs the ripcord (`match-system.ts:870-871`, PLAYTHROUGH3 #1 is fixed). The game is playable one-handed.
- Real hands are drawn over the virtual content by a depth-only occluder (`hand-occluder.ts`, renderOrder -10). It needs no depth sensing.
- The direction (graphite, molten orange for the player, cyan for the rival) holds across the arena, the bar and the stamps. The off-note is the "sci-fi glass" card (a faint grid, steel rivets, `ui.ts:51-114`) next to the "machined metal" plates (`ui.ts:155-199`, the match bar, tabs and signs). That is a polish item, not a release item.

## Findings (prioritized, max five)

### 1. HIGH: The space above the far rim is overloaded. The card, the bar, the stamp, the seal, the portal and the champion arc all take the same ~30° of view
**Evidence**
- `shots3/18-champion-passes-behind-card.png`: the rival card, the READY bar, the cyan portal and the arriving champion are stacked inside one band above the far rim. The top passes behind the card.
- `shots3/10-anvil-strike-seal-overlap-print-hot.png`: the seal medallion covers the "A" of ANVIL STRIKE!, and the bar sits right behind the stamp.
- `shots3/16-home-match-report.png`: the "Won 4 - 0" report covers the order board's rival chips.
- `baseline/03-first-fight.png`: the instruction card and the bar are stacked over the rival's half.

In code, they all occupy the same slot:
- the card: `LABEL_AT = (0, 0.115, -0.21)` (`match-system.ts:85`), 0.66 m wide after scales (0.22 x 1.25 x 2.4);
- the bar: `(0, 0.03, -0.205)` (`match-system.ts:603`);
- the stamp: `(0, 0.045, 0.03)`, drawn with `depthTest: false` and renderOrder 30 (`match-system.ts:552`, `visuals.ts:1898`);
- the portal: `updateEntrance` (`match-system.ts:1312+`);
- the match report goes into the same label (`match-system.ts:842-845`).

**Impact:** high. A judge's first impression of the big moments (entrance, strike, win) is clutter. The emulator shows this exactly, so it does not need a Quest to confirm.

**Smallest fix:** one rule, with one occupant at a time.
1. While `stamp` is showing or the entrance runs, fade the label to 0 and restore it afterwards. Hook into `Stamp.show` and `updateEntrance`.
2. Raise the seal pop above the stamp's line, or sequence it 0.4 s before the stamp (PLAYTHROUGH3 #6).
3. At home, put the match report on the level card (it already has a "Next match" line) instead of the floating label.

**Regression risk:** low to medium. The label is the tutorial channel, so the fade must be limited to stamp and entrance windows (each under 2 s), or a guide line can be missed. Re-run the fresh-save flow and check that every guide label is still seen.

**Do NOT now:** build a general layout manager, move UI to a wrist menu, or redesign the bar.

### 2. HIGH: The fight's instruction card is under-resolved, and long lines shrink to unreadable sizes
**Evidence**
- `Label` is a 512 x 160 canvas (`visuals.ts:1616-1617`). It has no anisotropy and no mipmap settings, while `rim.ts:59`, `board.ts:51` and `visuals.ts:174` set anisotropy 4.
- On screen the card is about 0.66 x 0.21 m at about 1.2 m from the eyes: about 31° wide, so about 16 texels per degree. That is below the Quest 3's roughly 25 pixels per degree, so the text is magnified and soft.
- Each line shrinks until it fits 470 px, and the body line is capped at `head - 8` (`visuals.ts:1655-1664`). Estimate from the code (Rajdhani's average advance is about 0.45 em): the 49-character fight hint "Pinch the floor at the ring: a ramp rises at once" shrinks to about 21 px. Its second line then drops to about 13-14 px, which is about 7 texels of x-height and under 1° per em.
- `baseline/03-first-fight.png` shows it: "drag to aim it at the rival" is a hairline under the headline.
- The glass grid lines (`ui.ts:64-82`) sit behind all label text and will shimmer at Quest density (ART-AUDIO #11 recommended removing them; they are still there). `GLASS` is 0.86 alpha (`ui.ts:23`), under the 0.9 that ART-AUDIO #18 set for passthrough.

**Impact:** high. This card is how a first-time player and a judge learn the ramp and the strike.

**Smallest fix:**
1. Draw `Label` at 1024 x 320 (double every px constant in `Label.set`) and set `tex.anisotropy = 4`.
2. Give the body line a floor (about 28 px at 512 scale) and break overlong headlines onto two lines instead of shrinking them.
3. Drop the grid from `glass()` and raise the fill to about 0.92.

Texture memory goes up by about 1 MB. There is no draw-call change.

**Regression risk:** low. Check that the 3-line cards (rival intro, match report) still fit. `glass()` is shared by every card, so take one screenshot of home, the fight and the forge.

**Do NOT now:** switch to MSDF or uikit text, or change the font.

### 3. MEDIUM (needs Quest): Always-on-top layers draw over your real hands and defeat the hand occluder
**Evidence**
- The occluder works through depth only (`hand-occluder.ts`; the comment at the top says virtual content behind the hand "fails the depth test").
- These layers skip the depth test, so they paint over the real fingers:
  - the ramp/well marks (`ShapeMarks`, `depthTest: false`, renderOrder 20/21, `visuals.ts:1772-1779`);
  - the stamp (`visuals.ts:1898`);
  - the ray reticle (`match-system.ts:492`).
- The worst case is the core verb. When you pinch a ramp on the near half, the orange rings (and the ghost ramp, `match-system.ts:2895`) are drawn right under the pinching fingers. On a Quest they would show across your real fingertips.
- Pinch rings (`match-system.ts:334`) are meant to be on the hand, so they are fine.
- This cannot be seen in the emulator: IWER draws its own hand meshes, and there is no passthrough.

**Impact:** medium. It breaks the "my hand is on the table" illusion exactly at the moment of input.

**Smallest fix:**
- Set `depthTest: true` on the `ShapeMarks` materials, with `polygonOffset` (factor -2, units -2), so they still win against the deformed floor but lose to the occluder.
- Leave the stamp as is, or give it `depthTest: true` with a high renderOrder. It floats 11 cm above the floor, so it does not need to beat the floor.

**Regression risk:** with the depth test on, parts of a ramp ring can sink under a steep ramp. The marks already sit 3 mm above `height(x, z)` (`visuals.ts:1794`). Check a full-size ramp and a well in the emulator before and after.

**Do NOT now:** add depth sensing, or tune the occluder's radii without a headset.

### 4. MEDIUM (needs Quest): The frame-time safety net is blind in testing and works one way only, and the biggest GPU cost is unmeasured
**Evidence**
- The room dimming is a 2.5 m sphere around the head (`room-light.ts:73-76`). It is transparent, back-faced, `frustumCulled = false`, and runs a per-pixel ray-plane intersection (`room-light.ts:56-70`).
- It is visible in every phase except home: dim 0.25-0.45 in ready/fight/result and 0.35 in the forge (`match-system.ts:796`). That is a full-view alpha-blended layer in both eyes under 4x MSAA, under the cards (`GLASS` 0.86), the bar, the stamp and the additive sparks.
- `guardFrameRate` (`match-system.ts:1508-1517`) is the only fallback:
  - it is off in the emulator (`'IWER_DEVICE' in window`), so it has never run;
  - it fires only after 3 s below 62 fps;
  - it then switches to foveation 1 and no dimming for the rest of the session, which blurs peripheral text, including the bar and the label.
- `[PERF]` draw-call logging is dev-only (`match-system.ts:891-899`). NIGHT-AUDIT lists "real fps on Quest 3/3S" as an owner blocker. No headset frame data exists.

**Impact:** medium. It is likely fine on a Quest 3. The Quest 3S has the same SoC, but the risk is real in the forge (144 calls, 4 PBR materials plus dimming) and during heavy spark scenes.

**Smallest fix:**
1. Let a URL flag (`?perf`) turn on the existing `[PERF]` line plus the averaged fps in production builds, so one headset session (with the Quest Browser's remote console, or OVR Metrics) gives real numbers.
2. Make the guard two-step: foveation 0.75 first, then dimming off. Let it recover after about 10 s back above 70 fps.

**Regression risk:** low. The flag changes nothing unless it is set. A guard that flaps between states is the risk, so require 10 s of stability.

**Do NOT now:** remove the room dimming, cut effects pre-emptively, or attempt post-processing or bloom (multiview has none).

### 5. MEDIUM-LOW: Per-frame allocations and redundant work in hot paths, against AGENTS.md ("treat per-frame allocation as a bug")
**Evidence (each runs every frame)**
- **Forge:**
  - `forge.ts:399`: `this.slots.filter(...).indexOf(s)` inside the per-slot loop, which is O(n^2) and allocates arrays.
  - `forge.ts:407` and `:531`: `showCard()` on every frame. Each call builds a `withItem` build, runs two `statsOf()`, maps the dials and `JSON.stringify`s a key (`rim.ts:145`).
  - `forge.ts:382-386`: the focus blink re-uploads the tab canvas texture 4 times a second.
- **Fight and home:**
  - `match-system.ts:2889-2893` `updateShapes`, in every phase: a closure, 2-4 arrays and one object per shape. `ShapeMarks.show` allocates a `radii` array per mark (`visuals.ts:1795`).
  - `match-bar.ts:89`: an array `join` key every frame, plus a fresh `xp` object literal and names array at the call site (`match-system.ts:913-919`).
  - `rim.ts:88`: `JSON.stringify` of the tab looks every frame (workshop and forge).
  - `for (const side of ['left','right'] as const)` array literals in several per-frame methods.

**Impact:** medium-low. Each item is small, but together they feed regular minor garbage collections. On Quest these show up as occasional one-frame hitches, most likely in the forge, which is already the highest-draw-call phase.

**Smallest fix:**
- Hoist constant arrays (`SIDES`, `radii`) to module scope.
- Cache the forge card's key on `(hovered item, held item, explode bucket)` and only call `statsOf` when it changes.
- Precompute the slot index per drawer when the drawer opens.
- Reuse a `specs` array in `updateShapes`.

**Regression risk:** low (pure refactors). The forge card must still update while a part is held near a slot. Run `npm run typecheck` and `check:sim`, then repeat the forge fit flow once in the emulator.

**Do NOT now:** move the systems to ECS queries, or rewrite the canvases as meshes.

## Checked, not in the top five

- **Bundle:** 2.6 MB main (728 kB gzip). It is mostly IWSDK itself: uikit with Yoga's inline wasm (about 95 kB base64), KTX2/basis, Draco and Meshopt loaders, and a 456 kB msdf worker. The game uses none of them (no GLTF, `spatialUI: false`, all UI is canvas). This is acceptable over Wi-Fi on a Quest. `public/sw.js` is network-first, so second launches do not get faster. A cache-first rule for the hashed `assets/` files would be a cheap later win. Do not try to tree-shake or fork IWSDK before submission.
- **Seated reach:**
  - The arena centre is 0.68 m out (`placement.ts`), so the far half (up to about 1.1 m) depends on the ray pinch. Whether that is precise when aimed down at a table is a Quest question.
  - The reach check (`scripts/sim-check.ts:606`) covers home and forge targets but no fight targets. By hand: the Menu button (`match-system.ts:1846`, x = -0.48 m) is about 0.63 m from the eyes and about 54° to the left at a 0.35 m drop. That is inside the 0.67 m limit, but at its edge and untested. The slap mark (`match-system.ts:2540-2542`) is about 0.55 m away, which is fine.
  - The slap mark is always near-right. Any spot works, but left-handed players are prompted to the right.
- **Depth precision:** the near plane is 1 mm (`iwsdk.config.json`). With a 24-bit depth buffer that is still sub-millimetre at 1-2.5 m, so it is fine for this scale.
- **Passthrough look:** the big near-black pedestal and floor ring (`shots3/18`) will read as solid black holes over the real desk (ART-AUDIO #18: "never draw large opaque near-blacks"). This can only be judged on a Quest with a real table.

## Verifiable now vs Quest-only

| Item | Screenshots / code | Needs a physical Quest |
|---|---|---|
| 1 Far-rim overload | Yes: shots3/10, 16, 18, baseline/03 | No |
| 2 Label legibility | Code numbers + baseline/03; the fix is checkable in the emulator | The final read at 1.2 m with foveation |
| 3 Marks over real hands | Code (depthTest false versus the occluder) | Yes: passthrough plus the real hand |
| 4 Frame time | Code path only; no fps data exists | Yes: OVR Metrics or the `?perf` log, Quest 3 and 3S |
| 5 Allocations | Code | The GC hitch frequency |
| Reach, ray precision, slap thresholds, table height, pinch-ring offset (PLAYTHROUGH3 #14), black pedestal over passthrough | Code estimates | Yes |
