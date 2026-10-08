# SpinSmith audio audit: why it feels cheap

Scope: `src/game/audio.ts` (671 lines, all synthesis, `public/audio/` empty) and its callers in
`src/game/match-system.ts`, `forge.ts`, `builder.ts`, `hub.ts`, `visuals.ts`. Read-only audit.

## Summary

- **Everything is built from one primitive**: `tone()` (`audio.ts:189`), a single oscillator with an instant attack and one exponential decay, plus `hiss()` (`audio.ts:206`), one band-passed noise burst. Nearly all 30 sounds are 1-11 of these stacked. Pure sine/triangle tones with identical envelopes read as "beeps", not objects.
- **The core fantasy sounds are the weakest**: the spin hum is a 190/230 Hz sawtooth+triangle buzz (`audio.ts:379-380, 429-431`), more like an electric razor than a steel top; there is no contact/tip grind, no rattle as the top dies, no rim scrape, and the rip is a square-wave tone (`audio.ts:461`) with no cord zip or launcher clack.
- **Metal does not sound like metal**: the clash uses inharmonic bar ratios (good, `audio.ts:245`) but with pure sines, simultaneous onset, no per-partial detune/beating and a 12 ms 9 kHz tick for a transient; the "Anvil Strike" (`audio.ts:525-530`) and every UI/progress sound use *harmonic* triangle tones (1320/1980 = 3:2), which read as chimes or a toy xylophone.
- **Mix has no hierarchy**: one shared reverb, a master limiter, and music-only ducking. Hums and the rip tone bypass the SFX bus (`audio.ts:395, 467`) so they are dry and never ducked; big hits don't duck small sounds; no sub/low-end layer gives impacts weight; non-spatial sounds are dead-center mono.
- **Perf hazard on Quest**: every `tone()`/`hiss()` inside `at()` creates its own HRTF `PannerNode` (`audio.ts:82-83, 200, 220`): a single clash spawns ~11 HRTF panners, a burst ~8. Fixing that (one panner per event) is both a perf and a quality win, and frees budget for richer synthesis.

## Inventory

All one-shots use `tone()` (oscillator -> gain, instant attack, exp decay to 0.0001, optional exp pitch slide) and/or `hiss()` (1 s mono white-noise buffer at random offset -> bandpass -> exp decay). "Spatial" = routed through `at()` -> per-voice HRTF panner (or stereo pan before the arena frame is set). Everything goes to `sfx` (dry + 0.22 send to a 1.1 s generated noise reverb, `audio.ts:109-116`) unless noted.

| Sound | Trigger (file:line) | Synthesis | Dur | Variation | Spatial |
|---|---|---|---|---|---|
| `playClash` / `clash` (`audio.ts:229-248`) | top-top clash `match-system.ts:3180` (gated 60 ms); wall hit `:3190` (strength 0.3x); bumper `:3194` (0.5); ward parry `:3130` (1.0) | hiss 12 ms @9k->7k; sine 180->80 Hz 70 ms; per ring 4 sines at 1/2.76/5.4/8.93 x RING_PITCH (900-1800 Hz) decays 0.6/0.35/0.2/0.12 s; hiss 100 ms @3.2k Q3 | ~0.6 s | base pitch +-4 %, partial gain +-30 %; voice cap 3 per 250 ms (`:236-238`) | yes, ~11 HRTF panners/event |
| `playDash` (`:251`) | rail dash `:3200,3016,2822,2907`; boost pad `:3152` | hiss 800->5000 Q3 + saw 300->900 Hz | 0.3 s | none | yes |
| `playLaunch` (`:259`) | rip release `match-system.ts:2497` | hiss 600->2500 Hz, gain by power; perfect adds sine 1760 Hz | 0.35-0.4 s | power only | no (mono center) |
| `playPocket` (`:265`) | ring-out into slag pit `:3228` | sine 140->55, hiss 900->300, hiss 3k->800 (sizzle), sine 90->45 | ~0.7 s | none | yes |
| `playOver` (`:275`) | knocked over the wall `:3229` | single hiss 3000->400 Hz | 0.5 s | none | yes |
| `playBurst` (`:280`) | burst finish `:3230`; Hammer lands `:3139` | hiss 2500->300 Q0.6, sine 90->40, 6 triangle blips 2-4.5 kHz | ~0.5 s | random blip pitch/time | yes, 8 panners |
| `playTopple` (`:289`) | spin-out finish `:3231` | 4 triangle blips 700-1200 Hz @ gain 0.05 | ~0.3 s | random pitch | **no** |
| `playResult` (`:307`) | every round end `:3235` (after `duck(0.25,1.2)`) | win: hiss + sine 110->70 + motif (4 triangle notes + sine x2.76); lose: 3 triangle notes G-E-C | ~1 s | none | no |
| `playLand` (`:318`) | thrown top lands `visuals.ts:817`; rival top placed `match-system.ts:1440` | table: sine 160->90 + hiss 500; floor: hiss 1.8k + 2 triangle bounces | 0.1-0.35 s | bounce pitch random, gain by impact | yes |
| `playQuench` (`:332`) | top quenched in forge `match-system.ts:1253` | hiss 5k->1.2k 1.2 s, hiss 800->400, 5 sine 300-700 Hz "bubbles" 60 ms | 1.2 s | random bubble pitch | no |
| `playTick` (`:339`) | card text appears `visuals.ts:1714` | sine 2200 + 3300 | 50 ms | none | no |
| `playGong` (`:345`) | round start `match-system.ts:2301` | sines 110, 303.6, 594 Hz + 50 ms hiss | 1.5 s | none | no |
| `playStamp` (`:353`) | order stamp / quench name `:1266,1634,3477` | square 140->90 + first 2 motif notes | ~0.5 s | none | no |
| `SpinHum` x2 (`:362-449`) | per frame `match-system.ts:949` (base 230 / 190 Hz) | saw f + triangle 2.01f -> LP Q4 (400-3000 Hz by spin); noise bandpass (1.2-3 kHz) AM'd by sine 8-48 Hz "blade pass"; pitch = base*(0.45+0.75 spin), +-8 % waver by wobble | continuous | spin, speed, wobble | HRTF, **direct to master** (`:395`) |
| `CordTone` (`:452-478`) | while pulling `match-system.ts:2463` | square 110->440 Hz by power, LP 1200 Hz | continuous | power only | no, **direct to master** (`:467`) |
| `playPick` (`:481`) | pick part/top; UI choose; core tooth clicks `forge.ts:364` and ~10 more | triangle 880 Hz | 80 ms | none | no |
| `playPlace` (`:486`) | part fitted/snap, paint dip, drop, rise done, ~15 sites | triangle 520 + sine 1560 + 50 ms hiss | 120 ms | none | no |
| `playRemove` (`:493`) | part thrown away / removed | hiss 1500->300 | 0.2 s | none | no |
| `playXp` (`:498`) | XP tick `:3401` | sine 880->1320 | 120 ms | none | no |
| `playLevelUp` (`:503`) | level up `:3404,3430,3455`, reset `:1215`, `:2003` | hiss + motif an octave up (triangle + sine x2.76) | ~1.4 s | none | no |
| `playUnlock` (`:513`) | part unlocked `:3478` | triangle 1175 + 1760 | 0.8 s | none | no |
| `playBarFull` (`:519`) | forge bar full `:2680` | triangle 587, 880 | 0.8 s | none | no |
| `playStrike` (`:525`) | Anvil Strike and other strikes `:2820,2903-2917` | sine 55->30 0.9 s, hiss 1800->200 Q0.4, triangle 1320 + 1980 | 1.4 s | none | no |
| `playTell` (`:533`) | rival winds up `:2781,2921` | saw 300->900 + square 150->450 | 1 s | none | no |
| `playLocked` (`:539`) | locked item pinched, strike not ready | square 140->90 | 150 ms | none | no |
| `playThock` (`:544`) | ramp/well set in floor `:2959,3035,3055` | sine 120->70 + hiss 900 | 180 ms | none | no |
| `playCrunch` (`:550`) | top runs into player's shape `:3098` | single hiss 2200->900 | 90 ms | none | no |
| `playMachine` (`:555`) | arena <-> forge transform, size change | hiss 400->150, saw 70->55, square 160->90 clunk | 0.75 s | none | no |
| `playDrawer` (`:562`) | forge/builder drawer opens | hiss 2500->1200 + triangle 700 click | 0.2 s | none | no |
| `ForgeLoop` music (`:574-671`) | per frame `match-system.ts:832` | 96 bpm D minor: saw drone 73.4 Hz LP 220; triangle "anvil" 1320 (+sine x2.76) on 1 & 3; saw bass eighths; sine toms 120/150->55; HP noise hats + high motif when tense | loop (4 bars) | state + tension layers | no (music bus + 0.3 reverb send) |
| `duck()` (`:162`) | hard hit `:3177`, strike `:2924`, result `:3234`, rival land `:1441` | ducks **music bus only** | - | - | - |

Master: gain 0.5/0.7 by comfort setting -> DynamicsCompressor used as limiter (-6 dB, 12:1, `:101-107`).

## Missing sounds

| Event | Status | Notes |
|---|---|---|
| Rip (cord pull) | Partial | Only a square tone rising with power (`CordTone`). No ratchet/zip of the cord, no gear whine of the launcher, no friction texture. |
| Launch / release | Partial | Noise whoosh only (`:260`); no launcher "clack" when the top releases and **no touchdown** of the top hitting the arena floor. Not spatialized. |
| Spin hum | Present but wrong character | Electric buzz; no high-frequency metallic whine, no tip-on-floor grind, no gyroscopic "singing". |
| Collisions by strength | Partial | Strength scales gain/decay only; same spectrum for a graze and a slam. No separate heavy-hit layer (sub thump, longer ring, debris). Hard-hit hit-stop (`match-system.ts:3166-3178`) has no dedicated audio punctuation beyond the normal clash. |
| Rim / wall scrape | Missing | Wall hit reuses a weak clash (`:3190`); no sustained scrape/grind while a top rides the wall or two tops grind together. |
| Spin-out wobble | Missing | Only an 8 % pitch waver on the hum (`audio.ts:428`). No accelerating precession rattle ("wobble-wobble-clatter") as `wobble` rises (`sim.ts:736`). |
| Topple / KO by spin-out | Weak | 4 quiet triangle blips (`:290`), not spatialized, gain 0.05: almost inaudible after the limiter. |
| Ring-out over wall | Weak | A single hiss sweep (`:276`); no fall, no thud/bounce on the table/floor. |
| KO slow-mo / finisher | Missing | No distinct "finish" impact or reverb tail swell; finish sound and result start 0.4 s apart with no drama. |
| Round win/lose | Present | Win: motif; lose: 3-note game-show descent (`:314`). |
| Match win/lose | Missing | `playResult` is the same for a round and the match; `matchWon` (`match-system.ts:3395`) triggers no unique sound. No crowd/forge cheer. |
| UI hover | Missing | Hover is visual only (`hub.ts:288-291`, `builder.ts:516-540`, `rim.ts:140`); in hand-tracked VR the lack of hover audio removes the main "you're on it" confirmation. |
| UI press | Partial | Reuses `playPick`/`playDrawer`; no dedicated press/release pair. |
| Forge strikes (hammering a part on) | Missing | Fitting a part = `playPlace` chime (`forge.ts:664`); nothing that sounds like a hammer on an anvil, despite an anvil being on screen. |
| Part snap | Weak | Same chime for every part type and for paint dips (`forge.ts:512` -> `fit`). Core tooth clicks reuse an identical 880 Hz triangle (`forge.ts:364`). |
| Paint dip | Missing | Uses the part-snap chime; no liquid sound. |
| Level up | Present | Chiptune-ish triangle motif. |
| Ambient bed | Missing | No forge room tone (fire roar, bellows, crackle) under home/forge; the "bellows drone" is a 73 Hz LP saw (`:601-607`). In MR this is fine at low level, but currently silence between notes. |
| Music | Present but thin | One-oscillator voices, no chords/pads, no sidechain; anvil hits are triangle tones. |

## Why it sounds cheap (evidence)

1. **No attack shaping, one decay curve for everything.** `tone()` sets full gain at `t` and exponentially decays (`audio.ts:198-199`); there is no attack, no two-stage (fast transient + slow body) envelope, no release tail. Every sound has the same "blip" morphology, which is the single strongest "synth-toy" cue.
2. **Basic waveforms as finished sounds.** Triangle tones for pick/place/unlock/bar-full/level-up/motif (`:302, 482, 487, 507, 514-515, 520-521`), square for locked/stamp/cord (`:354, 461, 540`), saw for tell/dash (`:254, 534`). Raw square/saw without filtering = 8-bit; triangle = toy xylophone.
3. **Metal partials are too clean.** Clash ratios 1/2.76/5.4/8.93 (`:245`) are right in principle, but: (a) pure sines with no slight detuned pair -> no beating/shimmer that real steel has; (b) all partials start at the same instant with monotonic decay; (c) high partials at 8.93 x 1800 Hz = 16 kHz are mostly inaudible and harsh, while the 300-900 Hz "mass" region is nearly empty (one 70 ms 180 Hz sine, `:242`); (d) the transient is a 12 ms band-pass at 9 kHz (`:241`), a "tick", with no broadband crack. Result: glassy "ting" rather than heavy steel tops colliding.
4. **"Anvil" sounds are harmonic chimes.** `playStrike` rings 1320 + 1980 Hz triangles, a perfect fifth (`:528-529`); the music's anvil is a triangle at 1320 (`:656`). Anvils are strongly inharmonic with a bright, noisy strike; a fifth sounds like a doorbell.
5. **Strength only changes volume.** `s` scales gain and decay (`:239-247`) but not brightness or spectrum. Real hard hits are brighter and have more low-end; soft grazes are duller. No filter on strength -> every hit sounds like the same sample turned up/down.
6. **Spin hum is a buzzer.** Saw + triangle at 190-280 Hz through a resonant LP (Q 4) (`:379-383, 429-432`). A metal top's sound is dominated by high whine (rim/tip resonance, kHz), contact noise and rattle, not a mid-range sawtooth. Both hums share the same timbre with only a 230/190 base difference (`match-system.ts:298`). The blade-pass AM (`:406-414`) is a good idea but its noise band (1.2-3 kHz, gain <=0.1) is masked by the saw.
7. **Repetition.** Most sounds have zero variation: `playPick` is always 880 Hz triangle (used for core tooth clicks in rapid succession, `forge.ts:364`), `playPlace`, `playDash`, `playThock`, `playGong`, `playStrike`, `playLaunch` are bit-identical every time. Only clash, burst, land, topple, quench randomize (`:244, 284, 290, 325, 335`).
8. **Mix architecture.** Only music is ducked (`:162-169`); SFX never yield to big moments, so a KO plays over two hums, possibly a clash and the result motif at the same level. Hums and cord tone bypass `sfx` (`:395, 467`), so they are dry (no shared room) while one-shots are wet; this makes the core loop sound detached from the impacts. The only dynamics is a master limiter at -6 dB 12:1 (`:101-107`): with stacked bursts it will pump, and there is no bus glue compression or a separate low-end/sub path. Reverb is one 1.1 s generic noise impulse for SFX and music (`:109-122`), equal for a UI tick and a slag-pit plunge.
9. **Low end is missing where weight matters.** Impact bodies are short sines (clash 180 Hz/70 ms, land 160 Hz/120 ms, thock 120 Hz/180 ms). On Quest's small speakers sines under ~150 Hz vanish; weight must come from 150-500 Hz harmonics (saturation) plus noise, which the code does not generate.
10. **Mono / center for most events.** Launch, topple, result, gong, strike, UI, quench, machine are not routed through `at()`; all sources are mono buffers/oscillators, so non-placed sounds sit dead-center inside the head. Only the reverb (stereo impulse, `:133-146`) adds width.
11. **Quiet, buried key moments.** Topple blips at gain 0.05 x 0.7 master (`:290`), rival-top touchdown absent, ring-out a single noise sweep (`:276`): the most important beats of a round (how it ended) are the least audible.
12. **Music is thin chiptune.** Single-oscillator voices (`:621-632`), saw drone at 0.035 (`:605`), no harmony beyond a bass that moves D <-> Bb (`:662`), and a 4-bar loop that repeats indefinitely. It does carry state (home/ready/fight/tension), which is good structure.
13. **Quest perf hazard limits richness.** `out()` makes a new HRTF `PannerNode` for every voice inside `at()` (`:82-83`, called from `tone()` `:200` and `hiss()` `:220`): clash = 2 hiss + 1 + 8 tones = 11 HRTF panners (x up to 3 concurrent clashes), burst = 8. HRTF convolution is among the most expensive WebAudio nodes on mobile; on Quest Browser this can cause audio-thread underruns (crackles), which themselves sound cheap. A `setTimeout` per clash (`:238`) is also used for voice counting.

## Fix plan (ranked by impact / effort)

Effort: S = < 2 h, M = half day, L = 1-2 days. All (a) items are pure synthesis in `src/game/audio.ts` unless noted.

### (a) Synthesis and mix fixes

| # | Fix | Impact | Effort | Files |
|---|---|---|---|---|
| 1 | **One panner per event**: in `at()`, create one gain -> one HRTF panner, set a module `eventOut` that `out()` returns, disconnect after the longest voice. Cuts HRTF nodes ~10x per clash; spatialize launch, topple, strike, result impact too (pass the top's x/z). | High (perf + coherence) | S | `audio.ts`, `match-system.ts:2497, 3231, 2820` |
| 2 | **Route hums and cord tone through `sfx`** (and a dedicated `loops` bus) so they share the room; add `duckSfx()` that pulls loops/hums down 6-9 dB for 0.3-0.8 s on hard hits, KO and strike (extend `duck()`). Add a gentle bus compressor on `sfx` (-18 dB, 3:1, 10 ms/120 ms) before the limiter. | High | S | `audio.ts:395, 467, 162` |
| 3 | **Metal synthesis rewrite (modal voice)**: a `strike(base, partials, decays, s)` helper with ~6 inharmonic modes (e.g. 1, 1.59, 2.14, 2.76, 3.9, 5.4), each a *pair* of sines detuned 0.3-1 Hz for beating, per-mode random +-2 %, higher modes decaying faster; excite with a 3-8 ms broadband noise burst through a highpass whose cutoff and gain rise with strength; add a 300-600 Hz "mass" mode and a short saturated sub (WaveShaper tanh) for heavy hits. Use it for clash, strike (anvil: base ~400 Hz, strong 2.7x/5.2x), music anvil, part snap. | High | M | `audio.ts:229-248, 525-530, 655-658, 486-490` |
| 4 | **Strength-to-timbre mapping**: lowpass on the clash bus at `2 kHz + 10 kHz * s`; below s=0.3 use a short duller "tick + scrape" variant; above `HARD_HIT` (0.6) add a heavy layer (low thump, longer ring, debris tinkles, reverb send x2). | High | S | `audio.ts:234-248` |
| 5 | **Spin hum rewrite**: replace saw+triangle with (i) a high metallic whine: 2-3 sines at inharmonic ratios around 1.5-4 kHz following spin, low gain; (ii) contact grind: looped noise -> bandpass 300-900 Hz + highpass, AM'd at the rotation rate with random jitter; (iii) a wobble rattle: noise clicks whose rate falls and amplitude rises with `wobble` (precession clatter). Different ring materials select different whine ratios. | High | M | `audio.ts:362-449` |
| 6 | **Rip + launch**: CordTone -> ratchet clicks (short noise ticks, rate = cord speed) plus a friction band rising with power; launch adds a launcher clack transient and a delayed (~0.15-0.25 s) touchdown thock on the arena at the top's x/z. | High | S-M | `audio.ts:259, 452`, `match-system.ts:2497` |
| 7 | **Round-robin variation for every one-shot**: +-3-6 % pitch, +-2 dB gain, random noise offset (already done in `hiss`), and 2-3 alternate partial sets; use `playPick` pitch steps for core tooth clicks so they ratchet upward. | Medium | S | `audio.ts` (all exports), `forge.ts:364` |
| 8 | **Wall scrape / grind loop**: a per-top scrape voice (noise -> bandpass 2-5 kHz + comb/resonant peak) whose gain follows wall contact and top-top contact time, instead of reusing clash at 0.3 (`match-system.ts:3190`). | Medium | M | `audio.ts`, `match-system.ts:3186-3191` |
| 9 | **Finish moments**: topple = louder spatialized precession rattle that accelerates then a final metal clank; ring-out = whoosh + delayed bounce/clatter on table; burst = add a low tear + longer debris tail; a distinct match-win cue (full motif harmonized, longer anvil ring, extended reverb) vs round win. | Medium | M | `audio.ts:265-315`, `match-system.ts:3228-3235, 3395` |
| 10 | **UI layer**: add `playHover()` (very soft 3-5 kHz tick, 15 ms, pitch varies per item, rate-limited), separate press/release pair (soft down click, brighter up click). Replace triangle chimes for unlock/bar-full/xp with filtered bell (modal voice at low gain). | Medium | S | `audio.ts`, `hub.ts:288`, `builder.ts:516`, `rim.ts` |
| 11 | **Forge**: part fit = hammer strike on anvil (modal voice + noise) with 1-3 quick taps; paint dip = short low-passed noise "slosh" with bubble sines; keep `playPlace` for builder only. | Medium | S | `audio.ts`, `forge.ts:512, 664` |
| 12 | **Low-end translation**: run impact bodies through a WaveShaper (soft clip) to add 2nd/3rd harmonics so weight is audible on Quest speakers; high-pass the reverb send at ~250 Hz to keep it clean. | Medium | S | `audio.ts:109-122, 242, 283, 526` |
| 13 | **Stereo width for non-spatial sounds**: tiny Haas/detune split (two slightly detuned copies panned +-0.3) for UI/result/music voices. | Low | S | `audio.ts:189-203` |
| 14 | **Music**: add a pad (2-3 detuned saws -> LP, slow attack) for chords, use the modal anvil, vary the 4-bar loop with an A/B section, sidechain music to clashes via `duck()` (already wired). | Medium | M-L | `audio.ts:574-671` |
| 15 | **Ambient forge bed** for home/forge: looped brown noise LP 400 Hz (fire roar) + random crackle ticks + slow bellows swell; very low level in MR. | Low-Med | S | `audio.ts`, `match-system.ts:832` |

**Quest perf notes**: Quest Browser runs WebAudio on a mobile CPU. Budget: keep simultaneous HRTF panners to the 2 hums + <= 3 event panners (fix #1); cap live oscillators at ~40 (modal voice with 6 detuned pairs = 12 oscs, so cap concurrent clashes at 2 and drop partials for weak hits); prefer one shared looped noise source with per-voice filters over many buffer sources; avoid `ConvolverNode` per voice (one shared reverb is right); keep reverb impulse <= 1.5 s; precompute a handful of short `AudioBuffer`s (render modal strikes once with `OfflineAudioContext` at startup, 6-8 variants each) and play them as buffers: that gives sample-like quality at near-zero runtime cost and is the best middle ground before real samples. Replace the `setTimeout` voice counter with `ctx.currentTime` bookkeeping.

### (b) Where recorded CC0 samples would be needed

Synthesis can get impacts, UI and hums to "good indie" level; these are the sounds where recordings make the largest perceived jump. Suggested sources: Freesound (CC0 filter), Sonniss GDC bundles (royalty-free, check licence), Kenney audio packs (CC0). Encode as mono 48 kHz Opus/OGG (AAC fallback for Safari not needed on Quest), total budget ~1-1.5 MB.

| Sample | Description | Length | Variants | Replaces |
|---|---|---|---|---|
| Metal top clash | Two steel spinning tops / Beyblade-style metal collision, close-mic | 0.3-0.8 s | 6-8 (light / medium / hard) | `clash` (layer under the modal synth, pitch-shifted per ring) |
| Spinning top loop | Metal top spinning on a hard plastic/steel dish: whine + contact grind | 3-5 s seamless loop | 2 (fast, slow) | `SpinHum` core layer (playbackRate follows spin) |
| Top wobble / death rattle | Top precessing and clattering to a stop on a dish | 1.5-3 s | 2-3 | `playTopple`, wobble layer |
| Rip cord / launcher | Ripcord pull ratchet + launcher release click | 0.5-1.2 s | 3 | `CordTone`, `playLaunch` transient |
| Top touchdown | Small metal object dropped onto a hard dish/table | 0.1-0.3 s | 4 | launch touchdown, `playLand` |
| Wall scrape | Metal scraping on metal rim, sustained | 1-2 s loop | 2 | scrape loop (#8) |
| Anvil / hammer strike | Blacksmith hammer on anvil, single hits | 0.8-1.5 s ring | 4-6 | `playStrike`, forge fit, music anvil |
| Quench | Hot steel plunged into water, hiss + bubbling | 1.5-2.5 s | 1-2 | `playQuench` |
| Forge ambience | Forge fire roar / bellows, room tone | 20-30 s loop | 1 | ambient bed (#15) |
| Slag pit / lava plop | Thick liquid plop + sizzle | 0.6-1 s | 2 | `playPocket` |
| Part clicks | Small mechanical metal click/latch (gun/camera-like), UI-grade | 0.05-0.15 s | 4-6 | `playPlace`, `playPick`, core tooth clicks |
| Burst / shatter | Small metal parts bursting, spring + scattering pieces | 0.8-1.5 s | 2 | `playBurst` |

Keep the synthesized layers as variation/pitch carriers on top of samples (sample transient + synthesized ring pitched to the ring's `RING_PITCH`), which preserves the per-ring identity the current code already has.
