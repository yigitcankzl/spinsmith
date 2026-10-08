# What makes a Quest MR game feel premium, and where SpinSmith stands

Benchmark written 2026-10-08. Read-only research: README.md, docs/DUEL-DESIGN.md,
docs/night/REVIEW-XR.md, docs/polish/ART-AUDIO.md, the `docs/night/design/r4-*.png` emulator shots
(the grey room and the grey hands are IWER's fake passthrough, not the game), and a skim of `src/`.
I made no source edits.

## Summary

- **SpinSmith already does most of the "juice" checklist.** It has hitstop, knockout slow
  motion, KO replays, staged strikes, rival tells, modal-synthesis clashes, HRTF placement, a
  generated reverb, adaptive music, room dimming, a real-hand depth occluder, blob shadows and
  one-move-per-match onboarding. Adding more effects is not what will make it feel premium. Most
  of the "cheap" read comes from presentation and from the rendering basics below.
- **The biggest unknown is frame pacing.** Nothing has been measured on a Quest. Every reference
  title earns its premium feel at a locked frame rate first. Hitches during a clash cancel out
  every other polish item.
- **The look says "virtual board pasted on the room" where it should say "machine on my desk".**
  There is no depth occlusion of real objects (IWSDK ships `DepthSensingSystem`, and it is
  unused). Clash light never touches the real table. The UI is floating 2D cards: the far-rim
  band is crowded and the text is soft. The premium MR titles (Cubism, Demeo, First Encounters)
  keep virtual content few, grounded and lit by the room's story.
- **The hero object is under-sold.** The tops fill about 4% of the frame and use the same matcap
  family as the static set. Beyblade's presentation language is a ritual countdown, speed
  streaks, a named finish and close-ups of the spinning top. SpinSmith has the named finish but
  not the ritual or the spin read.
- **Hand tracking has no haptics, so the feedback has to come from the hand itself.** Meta's
  hand guidance and recent pseudo-haptics research both say to put light and sound where the hand
  is. SpinSmith's pinch ring is a start. The rip, the ramp and the strike could "buzz" at the
  fingers.

## Techniques from reference titles

### Passthrough integration and grounding

| Technique | Who does it | Source |
|---|---|---|
| Snap the board to a real table, with "automatically adjusted lighting" and props that blend with the room | Demeo MR | [Road to VR](https://roadtovr.com/demeo-mixed-reality-update-quest-pro/), [UploadVR](https://uploadvr.com/demeo-mixed-reality/) |
| Scene mesh plus a passthrough shader, so the real room looks normal while virtual content breaks through it (destructible walls via Voronoi chunks) | First Encounters | [Meta success story](https://developers.meta.com/horizon/discover/success-stories/first-encounters/), [UNIT9](https://spatial.unit9.com/works/first-encounters) |
| Dynamic depth occlusion, a room scan so content respects furniture, and levels generated to fit the room | Laser Dance | [UploadVR impressions](https://www.uploadvr.com/laser-dance-mixed-reality-impressions/), [Road to VR](https://roadtovr.com/?p=173135) |
| Depth API: a per-frame coarse depth map for occluding virtual content behind real objects (Quest 3/3S, up to about 5 m; coarse at edges and fingers) | Meta platform; three.js `depth-sensing` | [UploadVR Depth API](https://uploadvr.com/quest-3-depth-api-mixed-reality-dynamic-occlusion), [Quest Browser depth hit test](https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/) |
| Passthrough relighting: virtual lights and shadows drawn onto real floors, desks and walls through scene-anchor materials. Blob shadows are the cheap alternative | Meta MRUK sample | [Meta passthrough relighting](https://developers.meta.com/horizon/documentation/unity/unity-passthrough-relighting/) |
| Darken the room around a lit play area to direct attention; mark reality transitions clearly; fade, never hard-cut | Meta MR design guidance | [Meta MR passthrough design](https://developers.meta.com/horizon/design/mr-design-passthrough/) |
| Minimal content, calm palette; MR "reduces onboarding friction because players stay connected to their environment" | Cubism | [Mixed News review](https://mixed-news.com/en/cubism-review-beautiful-3d-puzzler-now-with-mixed-reality-mode/), [Meta success story](https://developers.meta.com/horizon/discover/success-stories/ariko-eleven-table-tennis-and-cubism) |

### Hands and feedback without haptics

| Technique | Who does it | Source |
|---|---|---|
| Real hands always visible: a faint virtual hand outline plus selective passthrough over game objects | Cubism hand tracking | [UploadVR](https://uploadvr.com/cubism-passthrough-hand-tracking/), [Mixed News](https://mixed-news.com/en/cubism-review-beautiful-3d-puzzler-now-with-mixed-reality-mode/) |
| Mask virtual objects where the hand mesh overlaps; blend the virtual hand in only near interactables; finger outlines brighten as a pinch progresses and turn blue when a gesture is armed | Meta hand representation guidance | [Meta hand representation](https://developers.meta.com/horizon/design/hand-representation/) |
| Hover state before select; a short distinct sound on every successful selection; targets of at least 22 mm (2.5-3 degrees) with at least 12 mm spacing; direct touch at 42-46 cm | Meta hands UI best practices | [Meta hands UI](https://developers.meta.com/horizon/design/hands-ui-best-practices/) |
| Audio-visual cues rendered on the hand shift affect (rough-hot feels arousing, smooth-cold calm) even though users do not feel touch. Pseudo-haptics work as an affective channel | 2026 study | [arXiv 2602.23747](https://arxiv.org/abs/2602.23747) |
| Unpredictable tracking failure is the main frustration. Forgiving, low-precision verbs beat fine manipulation | Hand Physics Lab review | [Road to VR review](https://roadtovr.com/?p=170345) |
| Picking up minis and throwing dice by hand: an unobtrusive, natural verb set | Demeo hand tracking | [Road to VR](https://roadtovr.com/demeo-hand-tracking-update-quest-3-apple-vision-pro/) |
| Haptic buzz on every contact gives an instant model of size and reach; audio, visual and haptics land on the same frame | Beat Saber | [Road to VR](https://roadtovr.com/?p=76260) |

### Scale, staging and game feel

| Technique | Who does it | Source |
|---|---|---|
| A diorama the seated player leans into; scale must be exactly consistent ("if the scale is off at all, you feel out of place") | Moss (Polyarc) | [Game Developer](https://gamedeveloper.com/business/road-to-the-igf-polyarc-s-i-moss-i-), [Road to VR](https://roadtovr.com/moss-book-2-behind-the-scenes-polyarc/) |
| Gameplay-first audio: mechanics drive the score, so every impact lands on the music; brutal physical impacts | Thumper | [UploadVR review](https://uploadvr.com/thumper-review-psvr/), [PlayStation Blog](https://blog.playstation.com/archive/2016/06/29/rhythm-violence-game-thumper-launches-alongside-playstation-vr-this-october) |
| Hitstop of 50-100 ms, particles, tweening and shake, used as seasoning rather than the meal | "Juice it or lose it", Vlambeer | [Game Developer](https://gamedeveloper.com/design/squeezing-more-juice-out-of-your-game-design-), [GDQuest](https://school.gdquest.com/glossary/juicing) |
| Gentle onboarding: static hazards first, then patterns; one mode, "as little friction as possible" | Laser Dance | [UploadVR](https://www.uploadvr.com/laser-dance-mixed-reality-impressions/) |
| Physical, skill-based movement with immediate sound feedback; ease in, mastery later | Gorilla Tag | [Vaporlens summary](https://vaporlens.app/app/1533390/gorilla_tag.md) |
| Polish means interactions with weight; "floaty" and "wobbly" read as cheap | Reviewer consensus | [Gfinity](https://www.gfinityesports.com/article/i-think-i-found-the-game-where-the-vr-physics-are-so-raw-that-they-rattle-my-very-bones) |

### Beyblade presentation language

| Technique | Source |
|---|---|
| A ritual launch call: an MC counts "3, 2, 1, GO SHOOT!" ("Let it rip!") and both bladers launch together; the DJ commentates for spectators | [MyAnimeList: Blader DJ](https://myanimelist.net/character/145631) |
| The Xtreme Dash: the top's gear catches the stadium rail and rockets around it, giving "breathtaking bursts and colossal crashes" | [Gizmodo JP](https://www.gizmodo.jp/article/beyblade-x-x-dash/), [Beyblade Wiki X series](https://beyblade.fandom.com/wiki/Beyblade_X_-_Episode_50) |
| Named finishes worth different points (Spin, Over, Burst, Xtreme); the finish type is the headline | [Chaos Cards](https://www.chaoscards.co.uk/blog/x-perience-the-new-beyblade-generation), [Beyblade Wiki](https://breezewiki.discard.no/beyblade/wiki/X_Series) |
| A spirit or beast avatar rises from the top on a special move, so the top has a character | [Giant Bomb](https://giantbomb.com/wiki/Concepts/Beyblades) |

### Performance on Quest 3 (WebXR)

| Rule | Source |
|---|---|
| Quest 3 defaults to 90 Hz (11.1 ms); 72 Hz is 13.9 ms. First find out whether you are CPU- or GPU-bound; app logic over 2 ms is suspect; use the OVR Metrics HUD | [Meta WebXR perf workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/) |
| One directional or point light at most with PBR; no real-time shadows; sort opaque front to back; minimise overlapping transparency; stop drawing faded objects; clear to black or white | [Meta WebXR perf best practices](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/) |
| Fixed foveation trades edge resolution for fill rate; keep text central | [Meta FFR](https://developers.meta.com/horizon/documentation/web/webxr-ffr/) |
| Spatial audio, frequency separation in the mix, purpose-built feedback sounds, no jarring loudness | [Meta audio design](https://developers.meta.com/horizon/design/audio/) |

## Gap matrix for SpinSmith

Present means the technique is in the code now. Partial means it exists, but the gap described
keeps it from reading as premium. Missing means it is not in the code.

| # | Technique | Status | Evidence / gap |
|---|---|---|---|
| 1 | Snap to a real table, fit to its outline | Present | `findTable`, pedestal 8 cm above the table, tray fallback with a message (README) |
| 2 | Arena rises out of the table on entry (reveal moment) | Present | "The placed arena forges up out of the table under the title" |
| 3 | Blob or contact shadows on the real surface | Present | `softShadow()` in `hub.ts`, the per-top shadow in `visuals.ts`, soft hand shadows on the arena |
| 4 | Room dimming plus a pool of light on the table | Present | `room-light.ts` (cites Meta's passthrough guidance), quench cold wash, win light ring |
| 5 | Virtual light spilling onto the real table at clashes and strikes (passthrough relighting) | Partial | The palm print and the sparks that land on the desk exist. Clashes, ramps and the white-hot rip do not light the real table around the pedestal. The room light is global, not event-local |
| 6 | Depth occlusion of real objects (a mug or laptop in front of the arena, a top flying off the desk behind real things) | Missing | No `depthSensing` feature, `DepthSensingSystem` or `DepthOccludable` in the code, although IWSDK supports them (`.claude/skills/iwsdk-depth-occlusion`) |
| 7 | Real hands drawn over virtual content | Present | `hand-occluder.ts` (depth-only joint spheres). REVIEW-XR #3: always-on-top stamps and cards still draw over the hands |
| 8 | Using the room beyond the table plane (scene mesh, walls) | Partial | Off-desk falls use the table edge; the portal sits beyond the far rim. `meshDetection` is requested but unused (ACTION-PLAN F2) |
| 9 | Pinch progress and armed feedback at the hand | Present | A pinch ring closes with the fingers and lights when the pinch counts; the strike-ready glow is on the back of the hand |
| 10 | Pseudo-haptics at the hand during sustained actions (cord tension, ramp drag, palm strike) | Partial | The cord heats and trembles at the top end, and a tension tone plays. Nothing vibrates, glows or sounds at the fingers, which is where Meta and the 2026 study say to put it |
| 11 | Hover state plus a select sound on every interactable | Present | `hub.ts` hover rescale, `playPick` and `playPlace`, names on point |
| 12 | Target size and spacing (at least 22 mm, at least 12 mm apart, poke at 42-46 cm) | Partial | Rim drawers and tabs look large, but the workshop's last tab is clipped at the view edge in `r4-workshop.png` ("AREI S"). Nothing has been measured on a headset |
| 13 | Diegetic UI built into the object (Demeo, Cubism) | Partial | The match bar, drawers, level plate and stamp slot are built into the rim (good). The floating label card, Menu signpost and order board are flat 2D cards; REVIEW-XR flags a "sci-fi glass" versus "machined metal" style mismatch |
| 14 | One focal element at a time in the view band | Missing | REVIEW-XR #1: the card, bar, stamp, seal, portal and champion all sit in the same ~30 degrees above the far rim |
| 15 | Crisp text at Quest density (at least 25 px per degree) | Partial | The `Label` canvas is 512x160 with no anisotropy, about 16 texels per degree; body lines shrink to about 13 px (REVIEW-XR #2) |
| 16 | Consistent scale, and a hero object readable at a glance (Moss) | Partial | The arena is 2.4x the sim size and consistent. The tops are about 4% of frame width (SCORECARD), and the spin read is a blur disc plus floor trails |
| 17 | Hero material richness on the thing you watch | Partial | Tops use PBR plus a PMREM forge environment and a Fresnel team rim, but 43 matcap uses make the set look uniform. No spin-dependent streak or emissive edge on the blades |
| 18 | Hitstop, slow-mo KO, never shaking the head | Present | 70-110 ms freeze, KO slow motion, a 0.4x replay of the player's own KO |
| 19 | Telegraphed enemy moves (reads, not reflexes) | Present | Rival tells with a 1 s flash and whine, INTERRUPTED and PARRIED |
| 20 | A ritual launch countdown (Beyblade "3, 2, 1, Let it rip") | Missing | There is no countdown; the rival launches when the player rips. "RIP!" is stamped afterwards |
| 21 | A character for the top (beast or spirit avatar on special moves) | Partial | The seal rises off the top on a strike, and rivals have titles and lines. No visual persona during normal play |
| 22 | Impact audio as layered physical models | Present | `clash()` has a transient, a body, 4 inharmonic modes per ring at ring-specific pitch, and grit |
| 23 | Spatial audio, reverb, ducking, adaptive music | Present | HRTF panners, a generated convolver impulse, `duck()`, `ForgeLoop` at 96 bpm on the motif |
| 24 | Surface-coupled sound (the tip scraping a floor, wood versus steel, ice) | Partial | The hum follows spin and wobble, and landings differ for table and floor. The arena's floor theme (ice, stone, lava) and the real wooden desk do not change the tip's contact sound |
| 25 | Onboarding: one verb at a time, a ghost hand, guided first win | Present | One move per match, ghost hand, breathing rings, the Spur tip reward |
| 26 | Measured frame rate on device, frame pacing held | Missing | "Nothing has been measured on a headset yet" (README). `guardFrameRate` is off in the emulator and one-way only (REVIEW-XR #4) |
| 27 | Refresh-rate choice (72 or 90 Hz) and foveation | Partial | Foveation is 0.5 (`index.ts:37`). `updateTargetFrameRate` is never called, so the session runs at the browser default |
| 28 | Draw calls and lighting within Meta's guidance | Present | 96-144 draw calls, no real-time lights or shadows, multiview, only 4 PBR materials |
| 29 | Overdraw control in passthrough | Partial | Full-view transparent room-light sphere, 0.86-alpha cards and additive sparks all stack under 4x MSAA. Unmeasured |

## Top 10 upgrades

Ordered by leverage: what a judge feels in the first five minutes, per day of work.

### 1. Measure on a Quest 3, then lock frame pacing (and try 90 Hz)
**Why:** a hitch on a clash reads as cheap faster than any visual does. Every reference title is
premium at a locked rate first. Meta's workflow is: find whether you are CPU- or GPU-bound, read
the OVR Metrics HUD, and keep logic under 2 ms. Ship a `?perf` overlay in production builds and make
`guardFrameRate` two-step and recoverable (REVIEW-XR #4). If there is headroom, call
`session.updateTargetFrameRate(90)`: fast-spinning tops benefit most from the extra frames.
**Sources:** [Meta WebXR perf workflow](https://developers.meta.com/horizon/documentation/web/webxr-perf-workflow/), [Meta WebXR perf BP](https://developers.meta.com/horizon/documentation/web/webxr-perf-bp/)

### 2. One focal element in the view band, and the label card off the far rim
**Why:** the crowded band above the far rim is the most visible "prototype" signal in the
screenshots. Premium MR titles keep content few and quiet (Cubism) and tie it to the board
(Demeo). Fade the label while a stamp or entrance plays, sequence the seal before the stamp, and
move teaching lines onto rim plates or next to the hand that should act.
**Sources:** [Meta MR passthrough design](https://developers.meta.com/horizon/design/mr-design-passthrough/), [Cubism review](https://mixed-news.com/en/cubism-review-beautiful-3d-puzzler-now-with-mixed-reality-mode/), REVIEW-XR #1

### 3. Crisp, single-style text and plates
**Why:** soft text is the second most visible cheap signal, and it is what judges read to learn
the game. Double the `Label` canvas, set anisotropy 4, put a floor under line size, and break
long lines instead of shrinking them. Then retire the "sci-fi glass" grid cards so every plate is
machined metal like the match bar and drawers. Keep text at 2.5 degrees or more, near the centre,
where foveation does not blur it.
**Sources:** [Meta hands UI](https://developers.meta.com/horizon/design/hands-ui-best-practices/), [Meta FFR](https://developers.meta.com/horizon/documentation/web/webxr-ffr/), REVIEW-XR #2

### 4. Depth occlusion for everything that leaves the arena
**Why:** MR feels "real" when real things can hide virtual ones. Laser Dance and First Encounters
get their wow from content respecting the room. Turn on `depthSensing` and register
`DepthSensingSystem`. Put `DepthOccludable` (HardOcclusion, the cheap mode) only on content that
travels into the room: off-desk tops, desk sparks, debris, the rival portal and the palm print.
Leave the arena interior and the UI non-occludable, because depth is coarse at edges. Keep the
existing hand occluder for fingers.
**Sources:** [UploadVR Depth API](https://uploadvr.com/quest-3-depth-api-mixed-reality-dynamic-occlusion), [Quest Browser depth](https://www.uploadvr.com/quest-browser-depth-api-webxr-hit-testing-instant-placement/), [Laser Dance](https://www.uploadvr.com/laser-dance-mixed-reality-impressions/), `.claude/skills/iwsdk-depth-occlusion/SKILL.md`

### 5. A ritual launch: "3, 2, 1, RIP!"
**Why:** this is the most recognisable piece of Beyblade presentation, and it is missing. It adds
anticipation before every round and syncs both launches like the anime. Stamp the numerals with
three tom hits from the existing music bed, add a breath of room dim on "1", and accept the rip in
a window around "RIP!". Late or early rips still work, with less power or a "WHITE HOT" bonus on
the beat. This costs no new art, and it gives the video an iconic shot.
**Sources:** [Blader DJ countdown](https://myanimelist.net/character/145631), [Thumper gameplay-first audio](https://uploadvr.com/thumper-review-psvr/)

### 6. Sell the spin: the tops as hero objects
**Why:** at about 4% of the frame, the thing the game is about is hard to read. Moss teaches
exact scale with a hero you lean in to see. Beyblade teaches speed streaks and close-ups. Add an
emissive edge line on each blade that brightens with spin, a radial spin-streak shader on the ring
that replaces the flat blur disc, and a short "lean-in" bonus (lean close and the top's hum and
whirr rise). Spend the PBR budget here, not on the set.
**Sources:** [Moss scale](https://gamedeveloper.com/business/road-to-the-igf-polyarc-s-i-moss-i-), [Beyblade X Xtreme Dash](https://www.gizmodo.jp/article/beyblade-x-x-dash/), docs/EXTRA-POINTS.md (emissive edge idea)

### 7. Pseudo-haptics at the fingers
**Why:** hand tracking has no vibration. Meta's answer is feedback rendered on the hand: outlines
brighten as a pinch progresses and turn blue when armed. The 2026 study shows that audio-visual
cues on the hand still change how a contact feels. During the rip, make the pinching fingertips
glow cord-orange and add a localized crackle at the hand that tightens with tension. On a ramp
pinch, add a short "thunk" and a tip flash at the hand position. On the strike, add a radial
flash from the palm. All sound sources go on the hand's HRTF panner.
**Sources:** [Meta hand representation](https://developers.meta.com/horizon/design/hand-representation/), [arXiv 2602.23747](https://arxiv.org/abs/2602.23747), [Beat Saber contact buzz](https://roadtovr.com/?p=76260)

### 8. Event light on the real table
**Why:** Demeo's "automatically adjusted lighting" and Meta's relighting sample make virtual events
light the real surface. SpinSmith has a global dim and a win ring, but a clash does not touch the
desk. Add one pooled additive quad on the table plane per clash, white-hot rip or strike, in team
color, decaying in 150-300 ms. Under the pedestal, add a faint warm bounce that pulses with the
spin hum. That is one draw call, and it ties the machine to the desk.
**Sources:** [Meta passthrough relighting](https://developers.meta.com/horizon/documentation/unity/unity-passthrough-relighting/), [Demeo MR](https://roadtovr.com/demeo-mixed-reality-update-quest-pro/)

### 9. A persona for each top during play
**Why:** in Beyblade the top is a character (the beast or spirit), which turns a disc into "your
fighter". SpinSmith has seals and rival lines, but nothing during normal play. Show a faint seal
glyph or "spirit" silhouette that flares over the top on big hits, on the Xtreme-style rail dash,
and at match point. Reuse the seal mesh that already rises on a strike.
**Sources:** [Giant Bomb: Beyblades](https://giantbomb.com/wiki/Concepts/Beyblades), [Beyblade X wiki](https://beyblade.fandom.com/wiki/Beyblade_X_-_Episode_50)

### 10. Surface-coupled contact sound, then a loudness pass
**Why:** the clash and hum are already above average. What is missing is the tip's contact with
the floor, which tells the ear what the top is spinning on. Give the whirr band and grit a
per-theme filter (ice glassy and thin, stone gritty, lava hissing, clockwork ticking). When a top
skids across the real desk, switch to a woody low-mid scrape. Then do one loudness and
frequency-separation pass on a Quest's speakers, as Meta's audio guidance asks.
**Sources:** [Meta audio design](https://developers.meta.com/horizon/design/audio/), [Thumper](https://uploadvr.com/thumper-review-psvr/)

### Not in the top 10, considered

- **Scene mesh for off-desk tops** (bouncing off real monitors and walls, as First Encounters
  does). High wow, but it depends on the Space Setup scan, and REVIEW-JUDGE #5 already warns about
  room-label dependence.
- **A voiced announcer** (Blader DJ). Web Speech synthesis would sound cheaper than no voice.
  Stamped words plus drums are the safer substitute.
- **Bloom or post-processing.** It does not reach the XR framebuffer in IWSDK's multiview path
  (ART-AUDIO section 2).
