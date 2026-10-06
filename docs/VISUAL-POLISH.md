# Visual polish: why it looks cheap and what to change

Research notes (Oct 6, 2026) on how polished Quest mixed-reality games look premium, and a plan
for SpinSmith. Sources are linked inline; claims we could not verify are marked.

## 1. Diagnosis

Looking at the hub and a fight in the emulator:

| Problem | Where |
|---|---|
| **No single art direction.** Chrome tops, brown clay anvil and stand, a cream drum arena, sci-fi glass UI: four styles side by side | Everything |
| **Nothing is grounded.** No shadows or contact darkening, so things float over the real table | Tops, arena, props |
| **Flat lighting.** Matcaps are baked: a spinning metal top never catches a moving highlight, so it reads as plastic | Tops, arena |
| **The arena floor is a flat cream disc** with no material, print or depth | Arena |
| **System font** in every canvas texture | All UI |
| **Little juice.** Small sparks on hits, no trails, no flash, no hit stop | Fights |
| **Primitive props.** The anvil and stand are boxes and cylinders | Hub |

## 2. What premium Quest MR games do

- **Stylized, well-lit objects in the real room, not photorealism.** Starship Home "blends
  stylized objects with passthrough tinting" ([Meta](https://www.meta.com/blog/starship-home-launch/),
  [GDC talk](https://gdcvault.com/play/1034292/Future-Realities-Summit-Art-Directing)).
- **A tight palette:** one neutral plus one or two saturated accents that stand out against noisy
  passthrough; emissive accents carry the premium read (Cubism, Laser Dance:
  [UploadVR](https://www.uploadvr.com/cubism-quest-3-update/),
  [Road to VR](https://www.roadtovr.com/designing-mixed-reality-apps-dynamic-spaces-laser-dance-case-study/)).
- **Every object is grounded.** Cubism's main grounding cue on the real desk is drop shadows.
- **The play area is framed:** Demeo's board has a bevelled edge, rim light and a skirt
  ([Mixed](https://mixed-news.com/en/demeo-tabletop-vr-role-playing-game-gets-hand-tracking/)).
- **Focus by dimming the room** around the play area
  ([Meta passthrough design](https://developers.meta.com/horizon/resources/mr-design-passthrough/)).

## 3. Technical options on Quest Browser (WebXR, three.js)

| Technique | Verdict |
|---|---|
| Blob / contact shadows (radial gradient quad under each top, AO ring under the arena) | Near-free, ~80% of the grounding effect |
| Real shadow catcher (`ShadowMaterial` plane on the table + one shadowed directional light, 512-1024 map) | Medium cost, worth it after blob shadows |
| WebXR light estimation | Treat as **unsupported** on Quest Browser (developers report "not permitted by permissions policy": [forum](https://communityforums.atmeta.com/discussions/dev-quest/feature-light-estimation-is-not-permitted-by-permissions-policy/1238655)) |
| `MeshStandardMaterial` + environment map (IWSDK `IBLTexture { src: 'room' }`) instead of matcaps | Low cost; moving reflections on spinning metal are the main "real metal" cue. One light only ([Meta perf](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/)) |
| Bloom post-processing | **Not viable**: IWSDK renders multiview stereo; post passes do not reach the XR framebuffer and would eat the frame budget |
| Fake glow: emissive parts, additive sprites, a Fresnel rim via `onBeforeCompile` | Cheap; gives the bloom look |
| Display fonts (OFL): Rajdhani, Oxanium, Chakra Petch, Exo 2 | Load with the `FontFace` API before drawing canvases; Bold/SemiBold, 2x resolution ([Meta typography](https://developers.meta.com/horizon/design/styles_typography/)) |
| Depth occlusion (IWSDK `DepthOccludable`) | Hands pass in front of tops; apply to tops and arena only |

Budget: 13.7 ms at 72 Hz; aim for under 100-150 draw calls; transparency and overlapping
particles are the main fill-rate risk ([Meta perf workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/)).

## 4. Art direction for SpinSmith

**"Forged tech":** dark gunmetal and graphite as the neutral, molten orange as the player accent,
cyan as the rival and UI accent. Glow comes from heat (orange) and energy (cyan) lines.

- **Arena:** a dark metal stadium instead of the cream drum. A brushed graphite floor with
  engraved concentric rings and a faint printed emblem, an emissive orange line inside the rim,
  a bevelled lip, a dark skirt and an AO ring where it meets the table.
- **Tops:** real metal (`MeshStandardMaterial`, metalness 1, roughness ~0.3) with the room
  environment, a Fresnel rim and an emissive chip in the owner's color.
- **Props:** the anvil and stand in the same graphite and orange, with simple bevels; or
  replaced by glowing pedestals of the arena's style.
- **UI:** keep the dark glass; add a display font, an animated sheen and spring-in animations.

## 5. Plan, highest impact per cost first

1. Contact shadows under tops and an AO ring under the arena.
2. Metal tops with `MeshStandardMaterial` and the room environment map.
3. The dark metal arena floor, rim glow and skirt.
4. Display font (Rajdhani for numbers and labels, Oxanium for titles) loaded before canvases.
5. Props restyled to graphite and orange.
6. Fresnel rim and emissive chips on tops.
7. Impact juice: bigger sparks, an 80 ms flash on both tops, 50 ms hit stop, a floor ring.
8. Spin trails or a motion-blur disc driven by spin.
9. A real shadow catcher on the table.
10. Depth occlusion for hands.

Steps 1-4 change the first impression most and are each small. Every step needs a frame-time
check on the headset.

## 6. First pass (done, Oct 6, 2026)

Following a review of this plan, the first pass made the four changes that turn four styles
into one, and nothing else:

1. **Arena floor:** cream replaced by mid-dark graphite per theme (not black, which loses detail
   in MR), faint brushed rings and one engraved groove in the floor's vertex colors (no extra
   draw call), a thin glowing accent line just inside the rim.
2. **Grounding:** soft radial shadows under the tops (replacing hard discs), under the anvil
   and the stand, and a dark ring on the table under the arena. The anvil and stand now stand on
   the table instead of floating at arena-floor height.
3. **Top metals:** only the blades and ratchets use `MeshStandardMaterial` (shared), lit by
   IWSDK's built-in `IBLTexture { src: 'room' }` studio environment (not the real room); the
   painted and plastic parts stay matcap.
4. **Props:** the anvil, stand, bucket, shelf planks and miniature bases moved from brown clay
   and wood to the graphite, steel, brass and orange set.

Also: cyan is reserved for the rival; neutral UI accents and bars use steel.

Before and after, same camera: `polish-before-after-hub.png`, `polish-before-after-fight.png`.

Cost in the emulator (desktop browser, uncalibrated, frame interval capped by vsync):

| | Draw calls | Triangles | CPU per frame |
|---|---|---|---|
| Before | 166 | 85.4k | 5.5 ms |
| After | 168-170 | 89-90k | 5.9-6.5 ms (run-to-run noise ~0.6 ms) |

The draw-call count was already above the ~150 guideline before this pass; it is the next thing
to bring down (merging the arena's rim tubes and the shelf cards). The GPU cost of the standard
materials has to be measured on the headset.

Second pass, if this is not enough: bigger sparks with a 40-50 ms simulation-only hit stop, and
emissive chips. The font comes after the 3D look has settled, as one central constant
(Rajdhani only).

## 7. Asset quality sprint (Oct 6, 2026)

After a review found the first pass mostly recolored existing objects (models and surfaces 4/10,
presentation 4.5/10), a sprint on the objects themselves:

1. **Tops:** each ring has its own design (outline, thickness, contact tilt, raised tier, layer,
   windows). Striker is low and wide with three swept swords, Anvil tall and heavy with six lobes
   under a crown, Halo a wide open wheel on four spokes. Blades carry a spun-metal texture as
   color and roughness. `tops-silhouettes.png`.
2. **Arena:** a machined floor texture (fine brushing, two engraved grooves, dial ticks, an
   engraved emblem, wear where the tops run) instead of wide bands; the rim is three layers (dark
   body, metal lip, one accent light); rails idle in steel. `arena-surface.png`.
3. **Framing:** without a table the arena stands about 30 degrees below the eyes; notes hang over
   the far rim or over the station they point at, never between the eyes and the tops.
4. **Props:** the anvil is modelled from a classic side profile (tapering horn, face plate with a
   hardy hole, stepped heel, waist, feet); the stand is a turned pedestal with brass prongs.
5. **UI:** one display font, Rajdhani, loaded before any panel is drawn.

Same camera, before the visual work and after the sprint: `polish-sprint-before-after.png`.

Still weak, in order: the colored plastic layers on the tops are plain flat shapes; the wall and
panels are generic glass rather than SpinSmith-specific; the arena shell's clamps are still
primitive boxes; impact effects are untested on the headset; nothing has been measured on Quest.

## 8. One detail language (Oct 6, 2026)

- **Plastic layers:** every colored layer carries a metal inlay line just inside its edge and
  three bolts tying it to the blade (Halo's narrow layer keeps only the line). Both are merged
  into the blade mesh: no extra draw call.
- **Anvil ring:** six flat-faced blocks split by square notches instead of round lobes, so it
  reads as a heavy machined nut.
- **Signs:** the match bar, the notes, the rival card, the hub card and the buttons (Menu
  included) are all the same panel: dark glass, orange corner accents and two steel rivets.
- **Rival card:** a quarter larger over the far rim; notes over the anvil stay smaller because
  the anvil is close to the eyes.
- The arena shell's clamps read as part of the silhouette at the competition framing and were
  left as they are.

`tops-inlay.png`: Striker, Anvil and Halo from above.
