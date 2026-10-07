# Art direction and audio: from prototype to game

Review of Oct 8, 2026. Read: `README.md`, `docs/reviews/FULL-EVALUATION.md` section 8,
`docs/VISUAL-POLISH.md`, `src/game/{visuals,ui,audio,hub,forge,match-bar,board,room-light}.ts`,
`src/scene-assets/forge-arena-shell.scene-asset.ts`, `public/scenes/main.iwsdk.scene.json`,
`index.html` and the six screenshots in `docs/review/`. No source was edited. Everything below is
code only: no new asset files.

Line numbers refer to the files as of this review.

---

## 1. Why it still reads as a prototype

What the screenshots show, from first glance to last:

1. **The tops are barely readable, and the two sides look the same.** In `fight.png` the tops are
   a few pixels across. Both are grey metal with a small colored layer. Nothing at the top's
   silhouette says "mine" or "theirs". The only team cue is the plastic layer, and the player's
   color (`PLAYER_COLOR = 0xd6784f`, `visuals.ts:477`) is a dusty salmon, not the UI's orange.
2. **The metal is lit by a grey photo studio.** The scene IBL is three.js `RoomEnvironment`
   (`public/scenes/main.iwsdk.scene.json:4-7`, built in IWSDK's `environment-system.js:296`).
   It is neutral and soft, so the blades (`BLADE_METAL`, `visuals.ts:128`) and the pedestal look
   grey and plasticky, with no warm key and no rim. The "forge" story never reaches the metal.
3. **The pedestal is the biggest thing on screen, and it is the wrong color.** The shell's iron is
   `0x51464a` (`forge-arena-shell.scene-asset.ts:19`), a mauve brown that reads pink in every
   screenshot. It is also the largest area drawn with `MeshStandardMaterial`, the most expensive
   fragment shader in the scene.
4. **The particles are squares.** `Sparks` (`visuals.ts:1324-1372`) is a `PointsMaterial` with no
   texture, so every spark is a flat 4 mm square, and nothing stretches along its motion. The
   impact ring and dash streak are flat additive shapes. Without bloom there is no light at the
   hit point.
5. **The UI panels are generic.** Each panel is the same glass card: a faint grid, a thin edge,
   one font size for the title and one for the body (`ui.ts:51-114`, `visuals.ts:1474-1496`).
   There is no type hierarchy and there are no icons. The match bar (`match-bar.ts:42-66`) is
   flat filled rectangles, without the gradient, damage trail or low-health pulse that make a
   fighting-game bar feel alive.
6. **The palette is drifting.** I count 14 different oranges across the code: `#ff8a2a`,
   `0xff6a1a`, `0xff7a2a`, `0xffb347`, `0xffb04a`, `0xff9a3c`, `0xff5a24`, `0xff5a14`,
   `0xff4a12`, `0xd6784f`, and others. There are three cyans: `#4fd1ff` in the UI, `0x4f9fb0` on
   the rival top and `0x4ad8ff` on the pads. The bumper is pink (`0xff3b5c`).
7. **The audio is beeps, with nothing between them.**
   - Every sound is one or a few short oscillator envelopes sent dry into one master bus
     (`audio.ts:32-57`). There is no space (reverb), no buses and no ducking.
   - The clash is a 60 ms noise burst plus three short sines at ratios 1 : 1.47 : 2.13 decaying
     within 0.25 s (`audio.ts:113-120`). That reads as "UI blip", not "steel on steel".
   - The spin hum is a sawtooth through a lowpass, wired straight to the master with no panning
     (`audio.ts:217`), so both tops sound centred however they move.
   - In a fight there is no music at all: the forge loop drops to 0.1 (`match-system.ts:651`).

The direction set in `VISUAL-POLISH.md` (forged tech: graphite neutral, molten orange for the
player, cyan for the rival) is right. The gap is in execution: lighting, particles, UI depth,
palette discipline and the whole audio mix.

## 2. Budget we are working inside

- **Frame time.** At 72 fps a frame has 13.9 ms ([Meta: WebXR perf workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/)).
  Draw calls cost CPU in the driver. The emulator already measured 168-170 calls
  (`VISUAL-POLISH.md` section 6), above the roughly 100-150 guideline. Every item below states its
  draw-call delta, and section 4 claws calls back.
- **Lighting and shadows.** Meta's guidance is one directional or point light at most for PBR
  scenes, no real-time shadows if avoidable, careful with transparency and overdraw, and opaque
  objects sorted front to back
  ([Meta: WebXR perf best practices](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/)).
- **No bloom.** IWSDK renders multiview stereo (`world-initializer.js:248`), and post passes do not
  reach the XR framebuffer. Glow must be faked in-material: Fresnel rims, additive halos,
  emissive colors
  ([three.js shader patterns](https://tessl.io/registry/skills/github/CloudAI-X/threejs-skills/threejs-shaders)).
- **Material cost.** `MeshStandardMaterial` is the most expensive common material. Switching one
  large surface from Standard to Basic or Lambert has doubled mobile frame rates in reported cases
  ([materials overview](https://openskillindex.com/skills/partme-ai-full-stack-skills-threejs-materials)).
  The rule here: **spend PBR only where it moves and is small on screen (the tops); use matcaps
  on big static surfaces.**
- **Fixed foveation** cuts peripheral fragment cost. 1/3 to 2/3 is the useful range, and it hurts
  high-contrast text least when the text sits in the centre
  ([MDN fixedFoveation](https://developer.mozilla.org/en-US/docs/Web/API/XRWebGLLayer/fixedFoveation),
  [Meta FFR](https://developers.meta.com/horizon/documentation/web/webxr-ffr/)).
- **Mixed reality colors.** Light walls wash out subtle colors and dark rooms over-intensify bright
  ones, so contrast should err high and every color should have a job
  ([Meta: color](https://developers.meta.com/horizon/design/styles_color/),
  [Meta: passthrough design](https://developers.meta.com/horizon/design/mr-design-passthrough/)).
- **References from shipped MR games.**
  - Demeo snaps its board to a real table with "automatically adjusted lighting" and frames it as
    one lit object ([Road to VR](https://roadtovr.com/demeo-mixed-reality-update-quest-pro/)).
  - Cubism shows that MR "does not have to be loud": a restrained palette and strong grounding
    ([Android Central](https://www.androidcentral.com/gaming/virtual-reality/mixed-reality-games-getting-good)).
  - First Encounters ties its effects to the real room
    ([UNIT9](https://unit9.com/interactive/meta-first-encounters)).
  - SpinSmith's table-top machine sits squarely in that lineage. The polish has to come from light,
    contact and motion, not from more geometry.
- **Audio.**
  - Procedural audio means "created in real time according to programmatic rules and live input"
    (Farnell, *Designing Sound*, MIT Press; [Aalto procedural audio course](https://sopi.aalto.fi/teaching/pa)).
  - Modal synthesis (a bank of decaying inharmonic sines per struck object) gives impact sounds
    listeners cannot tell from recordings
    ([SMC 2019](https://www.smc2019.uma.es/articles/P1/P1_05_SMC2019_paper.pdf),
    [Microsoft Research](https://microsoft.com/en-us/research/?p=309038)).
  - WebAudio has `ConvolverNode` for reverb from a generated impulse
    ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode/ConvolverNode)), but no
    side-chained compressor, so ducking must be done by event-driven gain automation
    ([MDN DynamicsCompressorNode](https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode),
    [PhET tambo discussion](https://github.com/phetsims/tambo/issues/172)).
  - Meta's audio guidance calls sound "one of the most powerful tools for presence" and recommends
    dynamic mixing and loudness checks
    ([Meta: audio design](https://developers.meta.com/horizon/design/audio/),
    [Meta: audio best practices](https://developers.meta.com/horizon/resources/bp-audio/)).

## 3. Ranked changes

Effort: **S** is at most half a day, **M** is 1-2 days, **L** is 3 or more days.
Cost: the Quest frame-cost estimate. Each one still has to be measured on the headset.

### 1. Team rim light on every top (Fresnel), plus a team ring on the floor (Visual, S)

- **What.**
  - Clone `BLADE_METAL` per side (two materials, not per top). Add a Fresnel rim through
    `onBeforeCompile`, after `#include <emissivemap_fragment>`:
    `totalEmissiveRadiance += uRim * pow(1.0 - saturate(dot(normal, normalize(vViewPosition)*-1.0)), 3.0);`
    Use the player's orange `#ff8a2a` and the rival's cyan `#4fd1ff`, at about 0.6 intensity.
    Apply the same rim to the matcap layer material by injecting it before
    `#include <opaque_fragment>`.
  - Under each top add an additive ring decal in the team color: a `RingGeometry(0.8,1)` scaled
    to about 1.5x the ring radius, sitting on the floor next to `shadow`. Drive its opacity from
    spin (0.35 to 0.7) and pulse it on a hit.
- **Where.**
  - `visuals.ts:128` (material).
  - `visuals.ts:455` (layer material).
  - `TopView` constructor `visuals.ts:539-574` (pass a `side: 'mine' | 'rival'`).
  - Shadow placement `visuals.ts:638`. Mirror the ring there.
- **Why.** This is the evaluation's biggest presentation risk (tops "a few pixels across",
  `FULL-EVALUATION.md:417-419`). A colored rim survives distance and passthrough noise, says whose
  top it is at a glance, and is the cheap stand-in for bloom on metal. Fighting games and MOBAs
  solve readability the same way: team-colored outlines and floor rings.
- **Cost.** A few ALU operations per top fragment, and tops cover little of the screen. The rings
  add 2 draw calls and small additive overdraw.

### 2. A procedural "forge" environment map instead of the grey studio (Visual, S-M)

- **What.**
  - Build a small three.js scene once: a dark floor, a warm orange softbox low on one side
    (emissive plane, about 4x), a cool steel-blue strip high behind, a thin bright top strip for the
    signature specular line, and dark walls.
  - Run `PMREMGenerator.fromScene` on it once at load and assign the result to
    `scene.environment`. Remove `IBLTexture { src: 'room' }` from the scene JSON so IWSDK's system
    does not overwrite it. `IBLGradient` is the zero-code fallback, but gradients give no sharp
    highlight to sweep across a spinning blade.
- **Where.**
  - `public/scenes/main.iwsdk.scene.json:4-7`.
  - A new `forgeEnvironment()` in `visuals.ts` near `BLADE_METAL` (`:126-128`), called from
    `src/index.ts:21` after `World.create`.
- **Why.** Moving reflections are the "real metal" cue (`VISUAL-POLISH.md` section 3), but today
  they reflect a grey photo studio. A warm/cool split puts the forge story in every blade and
  separates the rims from the dark arena.
- **Cost.** One PMREM at load, a few ms once. Runtime cost is identical to now.

### 3. Sparks that look like sparks, and a fake-bloom flash at the hit point (Visual, M)

- **What.** Replace `Points` with an `InstancedMesh` of about 128 quads aligned to velocity:
  - Each quad is stretched along its velocity (length = |v| x 0.03 s, width 0.8 mm) and faces the
    camera around that axis, with a soft texture (reuse `SOFT_SHADOW` as the alpha).
  - Color by life: white, then yellow `#ffd23a`, orange `#ff8a2a`, dark red. Set it per instance
    through `instanceColor`, as `Cord` already does.
  - Sparks bounce once on `arena.height()` with 0.3 restitution, and a few slow embers linger for
    0.6 s.
  - Add a pool of 4 camera-facing additive "flash" quads (the `SOFT_SHADOW` texture tinted
    `#fff1d6`, 3-6 cm). Each pops at the clash point for 60-90 ms, with size and opacity set by
    strength. It reads as bloom.
  - Keep `COMFORT.flashes` gating the flash.
- **Where.**
  - `visuals.ts:1324-1372` (`Sparks`).
  - `Impacts` `visuals.ts:1503-1569` (add the flash pool).
  - Call sites `match-system.ts:2222-2227`.
- **Why.** Square points are the single most "programmer art" element in a fight, and hits are
  the hero moment. Streaks give speed and direction for free.
- **Cost.** 1 draw call (the same as now) plus 1 for the flash pool. Overdraw is bounded by the
  pool size, and the quads are thin. The CPU writes 128 matrices per frame, as the cord already
  does for 40.

### 4. A real mix: buses, a generated reverb, ducking and a smooth mute (Audio, M)

- **What.**
  - In `audio()`, build `sfx`, `ui`, `hum` and `music` `GainNode` buses. They feed `master`,
    then the existing limiter.
  - Add a reverb send: a `ConvolverNode` with a generated stereo impulse of about 1.1 s. Each
    channel is independent noise times `exp(-t/0.28)`, low-passed by a one-pole filter so the tail
    darkens. Send `sfx` at about -14 dB and `music` at about -10 dB. Leave `hum` and `ui` dry.
  - Ducking: `duck(db, ms)` ramps `music` down (and `hum` by half that) with `setTargetAtTime`,
    then releases over about 400 ms. Call it from the clash above `HARD_HIT`, the strike,
    knockouts and the result stinger.
  - Mute: replace the hard `master.gain.value =` (`audio.ts:55, 61`) with `setTargetAtTime(…, 0.05)`
    to avoid clicks. When sound is off for more than 1 s, `ctx.suspend()`. That saves the audio
    thread's CPU, and the hum and loop oscillators keep running today even when muted.
  - Route `out()` (`audio.ts:24-30`) to a named bus instead of `master`.
- **Where.** `audio.ts:8-69`, `:23-30`, every `connect(master!)` (`:217`, `:254`, `:371`).
- **Why.** Reverb alone turns separate beeps into "things in one room". Ducking keeps the heavy
  hits readable once there is music (item 6).
- **Cost.** A convolver with a 1.1 s stereo impulse is a modest FFT load on the audio thread, not
  the render thread. If the headset shows audio glitches, fall back to 3-4 `DelayNode`s with
  feedback (a tiny feedback-delay reverb).

### 5. A clash that is steel on steel: transient, body and modal ring, different per ring (Audio, S-M)

- **What.** Rewrite `clash(strength)` as four layers:
  1. **Transient.** 4-8 ms of high-passed noise (above 6 kHz) at full strength. This is the
     "tick" the ear locks onto.
  2. **Body.** A sine dropping from 180 to 80 Hz over 60 ms, at 0.3 x strength. This is weight.
  3. **Ring.** A modal bank of 4-5 sines at free-bar ratios 1 : 2.76 : 5.40 : 8.93, each with its
     own decay (0.6, 0.35, 0.2, 0.12 s), amplitudes randomized ±30 % and pitch ±4 % per hit. The
     base frequency comes from the ring part: Anvil and Bulwark about 900 Hz, Striker and Saw about
     1700 Hz, Halo about 1300 Hz, Cog with an extra ratchet-click train. Each side rings its own
     bank, so a clash is a two-voice chord.
  4. **Grit.** Band-passed noise at 2-4 kHz for 80-120 ms, scaled by how sideways the hit was.

  Cap clash voices at 3 alive at once, and keep the 60 ms gap already in `match-system.ts:2265`.
  The bumper hit (`:2273`) should use a rubbery variant: a low ring plus a "boing" pitch bend.
- **Where.**
  - `audio.ts:108-120`.
  - Pass ring ids from `match-system.ts:2266` (`playClash(strength, x, ringA, ringB)`).
- **Why.** The current partials (1 : 1.47 : 2.13, under 0.25 s) sound like a UI chime. A
  per-part ring makes the forge build audible: an Anvil top clangs deeper than a Striker.
  Modal synthesis is the standard approach (sources in section 2).
- **Cost.** About 12 short-lived nodes per hit, capped. Negligible.

### 6. A procedural music bed that follows the game (Audio, L)

- **What.** Turn `ForgeLoop` into a small sequencer.
  - **Scheduling.** Use the lookahead pattern: schedule 100 ms ahead from a `setInterval(25 ms)`
    rather than per frame, so music survives frame hitches. ("A Tale of Two Clocks", Chris
    Wilson; the existing `while (this.next < now + 0.2)` is already halfway there.)
  - **Key and tempo.** D minor at 96 BPM, built on the existing motif (D A F D, `audio.ts:168`) so
    music and stingers share one identity.
  - **Layers (vertical remix).** Each layer is a gain that fades in and out on bar boundaries:
    - *Home / forge / workshop:* bellows pad (two detuned saws, lowpass at 400 Hz with a slow
      0.1 Hz LFO), an anvil pattern (hammer ring on beats 1 and 3, a ghost tap on the "and" of 4),
      sparse motif notes as struck-bell plucks every 4 bars.
    - *Ready / pulling:* add an eighth-note bass pulse on D, and open the pad filter with the rip
      power (wire it to the `CordTone` power).
    - *Fight:* taiko-like toms (sines dropping 120 to 60 Hz, noise click) on a syncopated
      pattern, and the bass in eighths. An **intensity** layer (hi-hat-like filtered noise
      sixteenths, the motif in octaves) comes in when either top is under 30 % spin, a forge bar is
      full, or a rival tell is charging.
    - *Result:* stop on the next downbeat. Win plays the motif harmonized in thirds over an anvil
      strike with a long reverb tail. Loss plays the motif's first two notes falling a minor
      sixth, dark, with a low thud.
  - **Leave room for the hum.** Put a peaking EQ at -5 dB around 250-450 Hz on the music bus, so
    the two spin hums (190 and 230 Hz fundamentals) stay audible. Keep the fight music low: about
    -18 dB under SFX peaks.
- **Where.**
  - `audio.ts:354-408` (`ForgeLoop`) and `:177-185` (`playResult`).
  - `match-system.ts:651` (replace the level with `music.setState(phase, intensity)`).
- **Why.** The evaluation says the game "may feel thin between rounds" without a music bed.
  Music carries the most "real game" signal per kilobyte, and it stays synthesized and
  licence-free.
- **Cost.** About 10-20 short oscillators per bar plus 3 sustained ones. The audio thread only.

### 7. A spin hum with a body, a place and motion (Audio, M)

- **What.**
  - **Timbre.** Keep the tonal layer, but add a "whirr": band-passed noise (center 1.2-3 kHz,
    following spin) amplitude-modulated by an `OscillatorNode` at the blade-pass rate (spin rate x
    the ring's contact points: 3 for Striker, 6 for Anvil, 12 for Cog) through a `GainNode`
    modulation input. Real tops sound like a buzzing AM whirr, not a pure saw.
  - **Wobble.** Add a rattle: a second AM at the visual precession rate. The visual uses
    `time*9` (`visuals.ts:649`) but the audio waver uses `time*18` (`audio.ts:228`). Lock both to
    the same rate so the eye and ear agree.
  - **Place.** Give each hum a `StereoPanner`, or better a `PannerNode` (HRTF) placed at the top's
    world position, with `AudioListener` updated from the head pose each frame. With only two
    voices, HRTF is affordable.
  - **Motion.** Add a doppler-like pitch: `f *= 1 - vRadial / 6` (an exaggerated speed of sound)
    from the top's velocity toward the head, so a top charging at you rises in pitch.
  - **Surfaces.** A rail dash or slope scrape raises the noise layer's gain.
- **Where.**
  - `audio.ts:197-236`.
  - `match-system.ts:735` (pass x, z, vx, vz and the ring id).
- **Why.** The hum plays the whole fight. Today it is centred and synthetic. Panned, it puts the
  tops on the table.
- **Cost.** Per top: 2 oscillators, 1 noise source, 2 filters and 1 panner. Negligible.

### 8. One palette, as tokens (Visual, S)

- **What.** Add `src/game/palette.ts` and import it everywhere:
  - `HEAT`: a 5-step ramp, `#fff1d6` (white-hot), `#ffd23a`, `#ff8a2a` (brand), `#e2531a`,
    `#8a2408` (ember).
  - `RIVAL`: `#bff0ff`, `#4fd1ff`, `#1e7fa0`.
  - `STEEL`: `#eef3fa`, `#c9d3e0`, `#8f9bb0`, `#4a4e57`, `#2a2d33`.
  - `GOLD`: `#ffd34a` (earned only). `DANGER`: `#ff3b2a`. `POSITIVE`: `#6fd36f`.

  Then:
  - Make `PLAYER_COLOR` a saturated orange (`#e8661c` body; the rim item 1 carries the brand
    orange).
  - Make `OPPONENT_COLOR` a real cyan-teal (`#2a9fc4`), matching the UI cyan family.
  - Map every hard-coded orange to `HEAT[1..3]`.
  - Turn the bumper pink (`0xff3b5c`) into `DANGER`, or into theme accents.
- **Where.**
  - `visuals.ts:477-478`, `:522`, `:528`, `:803-808`, `:987-990`, `:1126`, `:1148`, `:1340`,
    `:1382-1384`, `:1514`, `:1523`, `:1645`.
  - `ui.ts:23-30`.
  - `match-bar.ts:66-67`.
  - `hub.ts:523`, `:531`.
  - `forge.ts:811`, `:846`.
  - `forge-arena-shell.scene-asset.ts:19-26`.
- **Why.** A tight palette is the cheapest "art-directed" signal (`VISUAL-POLISH.md` section 2,
  Meta's color guidance). Today the player's top is salmon while the UI claims orange.
- **Cost.** None.

### 9. A pedestal that belongs to the forge, and is cheaper to draw (Visual, S)

- **What.**
  - Switch the shell's `iron` and `darkIron` from `MeshStandardMaterial` to `MeshMatcapMaterial`
    with the shared graphite metal matcap (`0x3a3d45`, as the other themes' `pedestal`). Do the
    same for `darkIron` (`0x26282d`). That fixes the mauve.
  - Add one emissive heat band: a thin `TorusGeometry` just under the shoulder in `HEAT[2]` at
    0.5 opacity, additive, warming with `ArenaView.charge` the way the rails do (`visuals.ts:1261`).
  - Make the two launch ports glow with an additive halo quad each (item 13).
  - Avoid near-black on large surfaces in passthrough: it reads as a hole. Keep the darkest large
    surface at or above `#26282d`.
- **Where.**
  - `forge-arena-shell.scene-asset.ts:19-27`.
  - `visuals.ts:1188-1192` (where the shell is cloned).
  - `visuals.ts:1194-1201` (other themes' plinth: add the same band).
- **Why.** It is the largest object in every screenshot, and it is the wrong hue in the most
  expensive material. A warm band ties the pedestal to the fight (it heats with the forge bar).
- **Cost.** **Saves** GPU: the largest PBR surface becomes a matcap. The band adds 1 draw call.

### 10. A fighting-game match bar (Visual and UI, M)

- **What.** Keep the canvas for static text: names, the round word, XP. Draw the two bars as
  meshes in front of it, so they animate every frame without canvas uploads.
  - **Fill.** A quad scaled in x with a vertical gradient: bright top edge, darker bottom, 2 px
    highlight line.
  - **Damage trail.** A second white quad behind the fill that lags the fill by 0.4 s, then
    drains. This is the trail every fighting game uses to show a hit's size.
  - **Danger.** Below 25 % the fill pulses between `DANGER` and `HEAT[1]` at 4 Hz, and the plate
    edge glows.
  - **Points.** Pips become engraved sockets that fill with molten orange (an additive
    halo when lit), with a 150 ms scale pop and the stamp sound when gained.
  - **Labels.** Name plates get a team-color shoulder (a chamfered tab in orange or cyan).
- **Where.**
  - `match-bar.ts:30-96` (drop the 2 % key rounding for bars).
  - `ui.ts:155-199` for the plate.
- **Why.** The bar is the one HUD element always in view during a fight. Today it is flat
  rectangles, and it only redraws on 2 % steps.
- **Cost.** +4-6 small draw calls, or 1 if instanced. Saves the per-change 1400x330 canvas
  upload.

### 11. Type hierarchy, cleaner glass and drawn icons (UI, M)

- **What.**
  - **Hierarchy.** Give `Label` a structured `set({eyebrow, title, body})`:
    - eyebrow: 26 px, 700, tracking 4 px, uppercase, in `HEAT[2]` (or `RIVAL[1]` on rival cards);
    - title: 60 px, 700;
    - body: 32 px, 600, `TEXT_DIM`.

    Example: "Rival: Iron Keep · heavy center holder" becomes RIVAL / Iron Keep / heavy center
    holder.
  - **Numbers.** Draw digits right-aligned at fixed slots so values do not jitter.
  - **Glass.** Drop the grid lines (`ui.ts:64-82`): at Quest pixel density they shimmer as
    noise. Replace them with a 1 px inner highlight on the top edge and a soft inner shadow on the
    bottom.
  - **Contrast.** Raise the fill to `rgba(9,13,21,0.92)` over passthrough.
  - **Sheen.** Add a one-time diagonal sheen sweep on appear: `onBeforeCompile` on the panel
    material with a `uSheen` uniform that runs once over 400 ms.
  - **Icons.** Draw with `Path2D` from code, in one family (2.5 px stroke, rounded joins): ring,
    core, tip, brush (Style); pieces, floor, form, extras; menu, back, try, save; a lock. Put them
    on the drawer tabs and the Menu button.
  - **Sharpness.** Set `anisotropy = 4` and `generateMipmaps` on all label textures. `Label` and
    `glassMesh` do not set it yet.
- **Where.**
  - `ui.ts:51-125`.
  - `visuals.ts:1452-1497` (`Label`).
  - `rim.ts:106` (tab labels).
  - `hub.ts:403-430` (rank plate).
- **Why.** The panels are what judges read. Hierarchy and icons are what separate a shipped UI
  from a debug overlay. Meta's guidance is to err on high contrast.
- **Cost.** None at runtime beyond the textures already there. The sheen is a few ALU operations
  on small quads.

### 12. Contact shadows with weight, and depth on the floor (Visual, S)

- **What.**
  - **Two-layer shadow.** A tight dark core (about 35 % of the radius, opacity 0.7) inside the
    existing soft penumbra: a second gradient stop in `softShadowTexture`, or a second texture.
  - **Shadow follows height and lean.** Scale it by 1 + 2 x the height above the floor, fade it
    with height (thrown tops), and offset it by the lean so a wobbling top's shadow sways.
  - **Floor depth.** In `ArenaView.sync` (already per vertex, already dirty-flagged), multiply
    the vertex color by an AO term: darker within 1 cm of the wall (a wall-contact band), darker
    in dents, lighter on crests, and 6 % darker on the far half so the bowl reads as concave.
    Bake the same term once in `build()` for static floors.
- **Where.**
  - `visuals.ts:181-193`, `:563-566`, `:638`, `:736`.
  - `visuals.ts:1292-1317` (`sync`), plus a static bake call after `build`.
- **Why.** Grounding is the main MR realism cue (Cubism, Demeo). Today the shadow is one soft
  disc, and the floor reads flat grey in `fight.png`.
- **Cost.** Zero draw calls (same meshes). The vertex math runs only when the floor already
  re-syncs.

### 13. Additive halos on everything that glows (Visual, S)

- **What.** A shared `Halo` helper: a camera-facing quad with the `SOFT_SHADOW` alpha, additive,
  no depth write, at 2-3x the emitter's size and about 0.35 opacity. Put it on:
  - the shell's launch ports;
  - the top's emblem chip (opacity following `heat`);
  - the cord's hand end (power-scaled);
  - the hub beacon;
  - the anvil's glow (`hub.ts:531`);
  - pocket lips in the fight;
  - the lit charge pips.

  Batch them into one `InstancedMesh` per scene.
- **Where.**
  - New in `visuals.ts`.
  - Emitters at `forge-arena-shell.scene-asset.ts:83-88`, `visuals.ts:466`, `:1379-1449`,
    `:1642-1664`, `hub.ts:118`, `:531`.
- **Why.** This is how mobile VR fakes bloom. Emissive parts without a halo look like paint.
- **Cost.** 1 draw call (instanced). Overdraw is small because the halos are tiny.

### 14. Cache matcaps, share materials, earn draw calls back (Performance enabler, S)

- **What.**
  - Memoize `makeMatcap(kind, hex)` in a `Map` keyed by `kind|hex`. Every call today runs a
    128x128 JS loop and uploads a new texture. It is called per top layer (`visuals.ts:289`,
    `:455`, `:460`), per forge item (`forge.ts:809`, `:847`, `:856`, `:858`, `:863`) and per
    miniature (`visuals.ts:1677-1679`).
  - Memoize the `MeshMatcapMaterial` too, so `mergeByMaterial` (whose key includes the matcap
    uuid, `visuals.ts:235`) merges across models.
  - Merge the arena's per-gap wall bands and tubes (`visuals.ts:1082-1086`) and the pocket lips
    (`:1093-1096`) into one geometry per material at `build()`.
- **Where.** As listed.
- **Why.** Items 1-13 add about 8-12 draw calls in total. This wins back more than that,
  keeping us near the 150 guideline. It also cuts hitches when the forge opens.
- **Cost.** Saves CPU, about 10-25 draw calls depending on the arena.

### 15. Title treatment: landing, entry moment and a 3D medallion (Visual, M)

- **What.**
  - **Landing (`index.html:26-43`).**
    - Make the `h1` a metallic gradient with `background-clip:text` (steel `#eef3fa` to
      `#8f9bb0`), and replace the flat underline with a molten bar.
    - Draw the spark-in-a-ring emblem as inline SVG (the same path as `emblemTexture`,
      `visuals.ts:247-267`).
    - Add 10-15 CSS ember particles rising slowly.
    - Make ENTER a chamfered button with the glass corner accents. Clicking it plays the motif:
      it unlocks audio and makes the brand audible before the headset is on.
  - **Entry moment in the headset.** On the first entry, a wordmark appears over the far rim:
    `titleMesh` (`ui.ts:128-148`, currently unused). It is drawn with a heat gradient fill that
    cools from white-hot to steel over 1.2 s while the motif plays and sparks fall, then folds
    away.
  - **Medallion.** Extrude the emblem (`Shape` from the same eight points, `ExtrudeGeometry` with
    a bevel) as a brass medallion set into the pedestal's near face, between the two launch ports,
    with a halo. It is the game's mark on its own machine.
- **Where.** `index.html`, `ui.ts:128-148`, a new `emblemMesh()` in `visuals.ts`.
- **Why.** "Looks like a prototype" is decided in the first 5 seconds. Right now that is a flat
  HTML page and a grey arena appearing.
- **Cost.** The medallion is +1 draw call. The wordmark is temporary.

### 16. A UI sound family (Audio, S)

- **What.** One family of brass-and-steel sounds:
  - hover: a 2.4 kHz click, 8 ms, at -30 dB, rate-limited;
  - press: a two-transient latch (noise click, then a 1.1 kHz triangle 40 ms later);
  - panel appear: a short up-swept filtered noise plus a soft sine;
  - tab open: the existing drawer sound;
  - confirm: the first two motif notes;
  - error: the existing `playLocked`.

  Everything goes to the `ui` bus, which stays dry. Today several unrelated actions reuse
  `playPick` (`hub.ts:254`, `forge.ts:333`, `:432`, `:449`).
- **Where.** `audio.ts:267-352`, call sites in `hub.ts`, `forge.ts`, `rim.ts`, `builder.ts`.
- **Cost.** Negligible.

### 17. Finish-specific stingers, tied to what the eye sees (Audio, S-M)

- **SLAG.** A sizzle (band-passed noise falling 4 to 1 kHz over 0.6 s) plus a low bubble (random
  sine blips at 60-120 Hz).
- **THROWN.**
  - A whoosh panned along the flight.
  - Then a delayed table thud and clatter when `TopView` lands (`visuals.ts:707-718`, where
    `landed` becomes true). Expose an `onLand` callback, so the sound happens when the top hits
    the real table.
- **SHATTER.** The existing burst, plus a reverb-heavy ring of the shattered ring's modal bank
  (item 5) and clinks timed to debris bounces (`visuals.ts:773-779`).
- **Slow motion** (`match-system.ts:748`). Pitch-shift the hum and music down an octave by
  ramping `detune` to -1200 cents during `slowMo`, and low-pass the sfx bus. Do the same as a
  45 ms filter dip on the hum bus during `HIT_STOP` (`match-system.ts:2192`).
- **Where.** `audio.ts:136-161`, `visuals.ts:707-779`, `match-system.ts:748`, `:2192`.
- **Why.** The finish is the payoff moment. Synced audio and visual events are what "juice" means.

### 18. Passthrough blend tuning (Visual, S)

- During a fight, give the lit pool a faint warm tint (`uTint` at about 0.25 of `warm` instead
  of 0, `room-light.ts:78`), so the desk looks lit by the arena.
- Widen the falloff slightly (`uR1 = rim + 0.6`) for a softer vignette.
- Flash the room on hits only if `COMFORT.flashes` is on (this is already the case).
- Never draw large opaque near-blacks (item 9).
- Keep the UI glass at least 0.9 alpha over passthrough so text never sits on a busy real
  background.
- **Where.** `room-light.ts:23`, `:59-61`, `:77-78`; `ui.ts:23`.
- **Cost.** None (the same shader).

### 19. Fixed foveation, to pay for the above (Performance, S)

- After `World.create`, call `world.renderer.xr.setFoveation(0.5)`. Keep panels near the view
  centre: the match bar and cards already are.
- **Where.** `src/index.ts:21`.
- **Why.** It buys fragment headroom for the PBR tops, the additive particles and the halos.
- **Cost.** Saves GPU. Check text crispness at the far rim on the headset.

### 20. Comfort: calm should also be quieter (Audio, S)

In the Calm modes (`comfort.ts:18`, `:20`):

- lower the transient and body layers of clash, strike and burst by 6 dB;
- shorten the strike's 55 Hz boom;
- skip the music's intensity layer.

Quiet stays a full mute, with the smooth fade and suspend from item 4.

- **Where.** `comfort.ts:16-21`, `audio.ts` (read `COMFORT.gentle`).
- **Why.** Calm is the mode for trays and shared spaces, and sudden loud transients count as
  "flashes" for the ear.

## 4. Draw-call ledger

| Change | Calls |
|---|---|
| 1 team rings | +2 |
| 3 flash pool | +1 |
| 9 heat band | +1 |
| 10 bar meshes (instanced) | +1 to +6 |
| 13 halos (instanced) | +1 |
| 15 medallion | +1 |
| 14 matcap/material cache, merged rim bands and lips | -10 to -25 |
| **Net** | about -3 to +7 from today's 168-170 |

On the GPU, 9 (shell to matcap) and 19 (foveation) save more than 1, 2, 3 and 13 add.

## 5. Suggested order

1. **Day 1 (all S):** 8 palette, 9 pedestal, 14 caches, 1 team rim and ring, 19 foveation.
2. **Day 2:** 2 forge environment, 12 shadows and floor AO, 13 halos, 3 sparks and flash.
3. **Day 3:** 4 mix buses and reverb, 5 clash, 16 UI sounds.
4. **Days 4-5:** 7 hum, 17 stingers, 6 music (L).
5. **Day 6:** 10 match bar, 11 type and icons, 15 title, 18 and 20.

Each step needs a same-angle before/after screenshot and a `[PERF]` line
(`match-system.ts:727`). On the headset, check the frame time, not only the draw calls.

## 6. Sources

- Meta, WebXR performance workflow: https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/
- Meta, WebXR performance best practices: https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/
- Meta, WebXR fixed foveated rendering: https://developers.meta.com/horizon/documentation/web/webxr-ffr/
- MDN, XRWebGLLayer.fixedFoveation: https://developer.mozilla.org/en-US/docs/Web/API/XRWebGLLayer/fixedFoveation
- Meta, color in immersive design: https://developers.meta.com/horizon/design/styles_color/
- Meta, passthrough design: https://developers.meta.com/horizon/design/mr-design-passthrough/
- Meta, audio design and best practices: https://developers.meta.com/horizon/design/audio/ , https://developers.meta.com/horizon/resources/bp-audio/
- Road to VR, Demeo mixed reality update: https://roadtovr.com/demeo-mixed-reality-update-quest-pro/
- Android Central, mixed reality games (Cubism): https://www.androidcentral.com/gaming/virtual-reality/mixed-reality-games-getting-good
- UNIT9, First Encounters: https://unit9.com/interactive/meta-first-encounters
- three.js shader patterns (Fresnel, rim, onBeforeCompile): https://tessl.io/registry/skills/github/CloudAI-X/threejs-skills/threejs-shaders
- three.js material cost on mobile: https://openskillindex.com/skills/partme-ai-full-stack-skills-threejs-materials
- Modal synthesis of impact sounds: https://www.smc2019.uma.es/articles/P1/P1_05_SMC2019_paper.pdf , https://microsoft.com/en-us/research/?p=309038
- Procedural audio (Farnell, Designing Sound; Aalto course): https://sopi.aalto.fi/teaching/pa
- MDN, ConvolverNode: https://developer.mozilla.org/en-US/docs/Web/API/ConvolverNode/ConvolverNode
- MDN, DynamicsCompressorNode (no side-chain): https://developer.mozilla.org/en-US/docs/Web/API/DynamicsCompressorNode
- PhET tambo, ducking in WebAudio: https://github.com/phetsims/tambo/issues/172
- Chris Wilson, "A Tale of Two Clocks" (WebAudio lookahead scheduling), web.dev / HTML5 Rocks (not re-fetched for this review)
