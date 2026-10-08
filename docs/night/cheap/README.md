# Why SpinSmith feels cheap — synthesis

Five read-only audits (2026-10-08): [audio](audio.md), [materials](materials.md), [ui](ui.md), [feel](feel.md), [benchmark](benchmark.md).
Spot-checked in code: ~43 `MeshMatcapMaterial` uses, no `toneMapping` set, sparks are `LineSegments`,
touch signs on 256 px canvases, no haptics, no `updateTargetFrameRate`.

## Root causes
1. **Everything is built from one primitive per domain.** Sound = one oscillator `tone()` or one `hiss()`;
   surfaces = matcap or flat Standard with no maps; sparks = 1 px lines. The game has the right *events*
   (hit-stop, slow-mo KO, replay, pillar) but each is drawn at minimum weight.
2. **Matcaps on hero metal.** Highlights are camera-locked, so they slide with the head in VR and ignore the env map.
3. **No design system in the UI.** 5 panel styles, ~18 type sizes, 7+ facing rules, orange for 10 jobs, debug copy on the board.
4. **Blurry text where hands go.** Touch signs are 256 px canvases (~17–20 texels/deg), softer than the Quest 3 panel.
5. **Hero tops are tiny and read as slow.** ~4–8% of frame width, drawn spin ≈4.5 rev/s, crisp parts at full speed.

## Fix plan (impact first)
| # | Fix | Effort | Source |
|---|-----|--------|--------|
| 1 | Sign/label canvases ≥512 px + anisotropy; cut debug copy; one metal plate style for touch signs, flat on the rim | S | ui |
| 2 | Quad sparks + floor embers instead of `LineSegments` | S | feel |
| 3 | `NeutralToneMapping` (UI exempt), 3-tier palette (hero metal / matte body / brass trim) | S | materials |
| 4 | Audio: one panner per event, hums through FX bus, SFX ducking, bus compressor, random pitch | S | audio |
| 5 | Tops react to hits: scale pop + emissive flash + recoil held through hit-stop; floor shockwave ring | S–M | feel |
| 6 | Replace hero matcaps with a few shared lit materials; procedural normal/roughness maps (hammered iron, lathe rings) | M | materials |
| 7 | Metal synthesis rebuild: detuned inharmonic partials + noise transient, velocity → brightness; new spin hum (whine + grind + rattle) | M | audio |
| 8 | Faster drawn spin with motion-blur disc; tops ×1.3, team-coloured edges | M | feel, benchmark |
| 9 | "3, 2, 1, RIP!" countdown; full KO sequence for every finish; Calm-mode win celebration | M | benchmark, feel |
| 10 | Type tokens (60/36/24/18 dmm, no auto-shrink), home relayout, merge card + bar | M | ui |
| 11 | Warm shadowless spot pool on the arena; contact darkening; bevels | M | materials |
| 12 | Optional CC0 samples (~1–1.5 MB): clash, spin loop, rattle, rip cord, anvil, forge ambience | M | audio |

Not measured on a headset: frame time. Profile on Quest 3 before items 6, 8, 11.
