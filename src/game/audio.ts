/**
 * All game sound is synthesized with WebAudio: no audio files, no licensing, tiny download.
 * The context starts on first use; entering XR is a user gesture, so it is allowed to play.
 *
 * Metal (clashes, the anvil, bells) is modal: a handful of inharmonic partials, each a slightly
 * detuned pair so it beats like real steel, rendered once into short buffers (a few variants each)
 * and replayed with a little random pitch. That sounds richer than live oscillators and costs one
 * buffer source per voice, which matters on Quest's mobile CPU.
 */

import { COMFORT } from './comfort.js';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/**
 * Effects go through `sfx` (bus compressor, a reverb send); the continuous loops (hums, the cord,
 * scrapes) are a bus inside it, ducked under big moments; music has its own bus, ducked too.
 */
let sfx: GainNode | null = null;
let loops: GainNode | null = null;
let music: GainNode | null = null;
/** Straight into the reverb (big moments send extra). */
let verbIn: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** Soft clipping for impact bodies: adds the harmonics that make low end audible on small speakers. */
let soft: Float32Array<ArrayBuffer> | null = null;
/** While paused, no sound may wake the context back up. */
let pausedAudio = false;

/**
 * One event's output: every voice of a sound placed with at() shares one panner (HRTF in the
 * room, or a stereo pan before the arena frame is set), freed when its longest voice ends.
 */
let ev: GainNode | null = null;
let evEnd = 0;
let evLast: AudioScheduledSourceNode | null = null;

/** Plays `fn`'s sounds from an arena-local point (the arena is about 0.15-0.18 across a half). */
function at(x: number, fn: () => void, z = 0) {
  const a = audio();
  if (!a || !sfx) return;
  const g = a.createGain();
  let p: AudioNode = sfx;
  if (arenaFrame) p = panner(a, x, z, sfx);
  else if (a.createStereoPanner) {
    const s = a.createStereoPanner();
    s.pan.value = Math.max(-1, Math.min(1, x / 0.18)) * 0.7;
    s.connect(sfx);
    p = s;
  }
  g.connect(p);
  ev = g;
  evEnd = 0;
  evLast = null;
  fn();
  const free = () => {
    g.disconnect();
    if (p !== sfx) p.disconnect();
  };
  // (fn() set evLast through track(); the cast stops TypeScript narrowing it to the null above.)
  const last = evLast as AudioScheduledSourceNode | null;
  if (last) last.onended = free;
  else free();
  ev = null;
  evLast = null;
}

/** Notes a voice of the current event, so the event's panner lives until the last one ends. */
function track(src: AudioScheduledSourceNode, end: number) {
  if (ev && end >= evEnd) {
    evEnd = end;
    evLast = src;
  }
}

/**
 * Round robin: repeated sounds never play bit-identical. Inside vary(), every voice is shifted by
 * the same small random pitch and level (so chords stay in tune).
 */
let rr = 1;
let rg = 1;
function vary(pitch: number, fn: () => void) {
  rr = 1 + (Math.random() * 2 - 1) * pitch;
  rg = 0.82 + Math.random() * 0.36;
  fn();
  rr = 1;
  rg = 1;
}

/**
 * The arena's place in the room (its local-to-world matrix) and the head: sounds placed with at()
 * come from where they happen, through head-related (HRTF) panners, once the game has set it.
 */
let arenaFrame: ArrayLike<number> | null = null;
export function setAudioFrame(m: ArrayLike<number>, head: { x: number; y: number; z: number }, fwd: { x: number; y: number; z: number }) {
  arenaFrame = m;
  const l = ctx?.listener;
  if (!ctx || !l) return;
  const t = ctx.currentTime;
  if (l.positionX) {
    l.positionX.setValueAtTime(head.x, t);
    l.positionY.setValueAtTime(head.y, t);
    l.positionZ.setValueAtTime(head.z, t);
    l.forwardX.setValueAtTime(fwd.x, t);
    l.forwardY.setValueAtTime(fwd.y, t);
    l.forwardZ.setValueAtTime(fwd.z, t);
    l.upX.setValueAtTime(0, t);
    l.upY.setValueAtTime(1, t);
    l.upZ.setValueAtTime(0, t);
  }
}

/** World position of an arena-local point on the floor. */
function worldOf(x: number, z: number, out: { x: number; y: number; z: number }) {
  const m = arenaFrame!;
  out.x = m[0] * x + m[8] * z + m[12];
  out.y = m[1] * x + m[9] * z + m[13];
  out.z = m[2] * x + m[10] * z + m[14];
  return out;
}
const spot = { x: 0, y: 0, z: 0 };

/** A head-related panner at an arena-local point, into `dest`. */
function panner(a: AudioContext, x: number, z: number, dest: AudioNode): PannerNode {
  const p = a.createPanner();
  p.panningModel = 'HRTF';
  p.distanceModel = 'inverse';
  p.refDistance = 0.5;
  p.rolloffFactor = 0.6;
  if (arenaFrame) {
    worldOf(x, z, spot);
    p.positionX.value = spot.x;
    p.positionY.value = spot.y;
    p.positionZ.value = spot.z;
  }
  p.connect(dest);
  return p;
}

/** Where a voice goes: its event's panner, or straight onto the effects bus. */
function out(): AudioNode {
  return ev ?? sfx!;
}

function audio(): AudioContext | null {
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
    master = ctx.createGain();
    master.gain.value = level();
    // A limiter at the end: stacked bursts, clashes and hums never clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master.connect(limiter).connect(ctx.destination);
    // One room for every effect: a short generated reverb (decaying noise, darker as it fades),
    // high-passed on the way in so impacts' low end stays dry and clean.
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 1.1);
    verbIn = ctx.createGain();
    verbIn.gain.value = 0.22;
    const verbHp = ctx.createBiquadFilter();
    verbHp.type = 'highpass';
    verbHp.frequency.value = 250;
    verbIn.connect(verbHp).connect(verb).connect(master);
    // Glue on the effects: a gentle bus compressor before the limiter, with a little makeup.
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 6;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.12;
    const makeup = ctx.createGain();
    makeup.gain.value = 1.3;
    sfx = ctx.createGain();
    sfx.connect(comp).connect(makeup).connect(master);
    sfx.connect(verbIn);
    loops = ctx.createGain();
    loops.connect(sfx);
    music = ctx.createGain();
    music.gain.value = 1;
    music.connect(master);
    const musicSend = ctx.createGain();
    musicSend.gain.value = 0.3;
    music.connect(musicSend).connect(verb);
    // One second of white noise, reused by every noisy sound.
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    soft = new Float32Array(256);
    for (let i = 0; i < soft.length; i++) soft[i] = Math.tanh(3 * (i / 127.5 - 1)) / Math.tanh(3);
  }
  if (ctx.state === 'suspended' && !pausedAudio) void ctx.resume();
  return ctx;
}

/** Call from the landing-page click so Quest grants sound before the immersive session starts. */
export async function unlockAudio(): Promise<boolean> {
  pausedAudio = false;
  const a = audio();
  if (!a) return false;
  try {
    await a.resume();
  } catch {
    return false;
  }
  return a.state === 'running';
}

/** A stereo reverb impulse: independent noise per channel, decaying, low-passed as it goes. */
function impulse(a: AudioContext, seconds: number): AudioBuffer {
  const n = Math.floor(a.sampleRate * seconds);
  const b = a.createBuffer(2, n, a.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / a.sampleRate;
      const k = 0.15 + 0.85 * Math.exp(-t / 0.25);
      lp += (Math.random() * 2 - 1 - lp) * k;
      d[i] = lp * Math.exp(-t / 0.28);
    }
  }
  return b;
}

/** Dev and capture: a stream of everything the game plays (after the limiter), or null before audio starts. */
let tap: MediaStreamAudioDestinationNode | null = null;
export function audioTap(): MediaStream | null {
  const a = audio();
  if (!a || !master) return null;
  if (!tap) {
    tap = a.createMediaStreamDestination();
    master.connect(tap);
  }
  return tap.stream;
}

/**
 * A big moment (a hard hit, the strike, a knockout): the music dips, and so do the loops (hums,
 * cord, scrapes), so the moment's own sound stands out; both come back.
 */
export function duck(depth = 0.35, hold = 0.25) {
  const a = ctx;
  if (!a || !music || !loops) return;
  const t = a.currentTime;
  music.gain.cancelScheduledValues(t);
  music.gain.setTargetAtTime(depth, t, 0.02);
  music.gain.setTargetAtTime(1, t + hold, 0.35);
  loops.gain.cancelScheduledValues(t);
  loops.gain.setTargetAtTime(Math.max(0.35, depth + 0.1), t, 0.015);
  loops.gain.setTargetAtTime(1, t + Math.min(0.8, Math.max(0.3, hold)), 0.25);
}

/** The master level by the comfort dial: off when quiet, softer when calm. */
function level() {
  return COMFORT.sound ? (COMFORT.flashes ? 0.7 : 0.5) : 0;
}

/** Applies the comfort dial's sound setting at once (hums keep running). */
export function applySound() {
  if (ctx && master) master.gain.setTargetAtTime(level(), ctx.currentTime, 0.05);
}

/** Pauses (suspends) or resumes every sound at once, for the headset menu. */
export function setAudioPaused(paused: boolean) {
  pausedAudio = paused;
  if (!ctx) return;
  void (paused ? ctx.suspend() : ctx.resume());
}

/** A short decaying tone (a 2 ms attack, so nothing clicks). */
function tone(freq: number, gain: number, decay: number, type: OscillatorType = 'sine', at = 0, slideTo?: number) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq * rr, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo * rr, t + decay);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain * rg, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out());
  o.start(t);
  o.stop(t + decay + 0.02);
  track(o, t + decay + 0.02);
}

/** A filtered noise burst; the band can sweep from f0 to f1 (a highpass for cracks). */
function hiss(gain: number, decay: number, f0: number, f1 = f0, q = 1, at = 0, type: BiquadFilterType = 'bandpass') {
  const a = audio();
  if (!a || !master || !noise) return;
  const t = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0 * rr, t);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1 * rr, t + decay);
  const g = a.createGain();
  g.gain.setValueAtTime(gain * rg, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(out());
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
  track(src, t + decay + 0.02);
}

/** A broadband crack: the few milliseconds of noise the ear locks onto as "hit". */
function crack(gain: number, decay: number, cutoff: number, at = 0) {
  hiss(gain, decay, cutoff, cutoff, 0.7, at, 'highpass');
}

/** A low thump, soft-clipped so its weight carries on small speakers. */
function thump(f0: number, f1: number, gain: number, decay: number, at = 0) {
  const a = audio();
  if (!a || !soft) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  o.frequency.setValueAtTime(f0 * rr, t);
  o.frequency.exponentialRampToValueAtTime(f1 * rr, t + decay);
  const drive = a.createGain();
  drive.gain.setValueAtTime(0.0001, t);
  drive.gain.linearRampToValueAtTime(1.4, t + 0.003);
  drive.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  const shape = a.createWaveShaper();
  shape.curve = soft;
  const g = a.createGain();
  g.gain.value = gain * rg;
  o.connect(drive).connect(shape).connect(g).connect(out());
  o.start(t);
  o.stop(t + decay + 0.02);
  track(o, t + decay + 0.02);
}

/** A metal's modes: inharmonic ratios to the base, their levels and ring times (s). */
interface Modes {
  ratios: number[];
  gains: number[];
  decays: number[];
}
/** A top's steel ring (struck bar-like modes); high modes die first. */
const STEEL: Modes = { ratios: [1, 1.59, 2.14, 2.76, 3.9, 5.4], gains: [1, 0.55, 0.5, 0.45, 0.25, 0.18], decays: [0.55, 0.42, 0.32, 0.26, 0.16, 0.1] };
/** An anvil: strongly inharmonic, with loud 2.7x and 5.2x modes and a long ring. */
const ANVIL: Modes = { ratios: [1, 1.83, 2.71, 3.6, 5.2, 7.1], gains: [0.7, 0.35, 1, 0.3, 0.6, 0.2], decays: [1.1, 0.45, 1.3, 0.35, 0.8, 0.25] };
/** A small bell for the motif and progress: an octave keeps its pitch clear, the rest stays metal. */
const BELL: Modes = { ratios: [1, 2, 2.76, 4.07, 5.4], gains: [1, 0.3, 0.28, 0.1, 0.07], decays: [0.9, 0.5, 0.35, 0.2, 0.12] };
const BELL_BASE = 587;

/**
 * Renders one struck-metal voice: each mode a detuned pair (0.3-1 Hz apart, so it beats), random
 * +-2 % per mode, onsets staggered by a few milliseconds, optionally a 300-900 Hz "mass" mode for
 * body. A rotating phasor per partial keeps it to a few multiplies a sample.
 */
function render(a: AudioContext, base: number, m: Modes, seconds: number, body = 0): AudioBuffer {
  const sr = a.sampleRate;
  const n = Math.floor(sr * seconds);
  const b = a.createBuffer(1, n, sr);
  const d = b.getChannelData(0);
  const attack = Math.floor(0.0015 * sr);
  const add = (f: number, g: number, decay: number, onset: number) => {
    if (f > sr * 0.45) return;
    const w = (2 * Math.PI * f) / sr;
    const c = Math.cos(w);
    const s = Math.sin(w);
    const ph = Math.random() * Math.PI * 2;
    let x = Math.cos(ph);
    let y = Math.sin(ph);
    const k = Math.exp(-1 / (decay * sr));
    let env = g;
    const i0 = Math.floor(onset * sr);
    for (let i = i0; i < n && env > 1e-5; i++) {
      const nx = x * c - y * s;
      y = x * s + y * c;
      x = nx;
      const j = i - i0;
      d[i] += y * env * (j < attack ? j / attack : 1);
      env *= k;
    }
  };
  m.ratios.forEach((r, i) => {
    const f = base * r * (1 + (Math.random() - 0.5) * 0.04);
    const g = m.gains[i] * (0.8 + Math.random() * 0.4) * 0.5;
    const onset = i * 0.0008 + Math.random() * 0.002;
    add(f, g, m.decays[i], onset);
    add(f + 0.3 + Math.random() * 0.7, g, m.decays[i] * (0.9 + Math.random() * 0.2), onset + Math.random() * 0.001);
  });
  if (body) add(body, 0.6, 0.07, 0);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(d[i]));
  if (peak > 0) for (let i = 0; i < n; i++) d[i] *= 0.9 / peak;
  return b;
}

/**
 * Rendered voices, a few variants per key, made one per call until there are enough (spreading the
 * cost), then taken round robin.
 */
const bank = new Map<string, { list: AudioBuffer[]; next: number }>();
function voice(key: string, make: (a: AudioContext) => AudioBuffer, variants = 3): AudioBuffer | null {
  const a = audio();
  if (!a) return null;
  let e = bank.get(key);
  if (!e) bank.set(key, (e = { list: [], next: 0 }));
  if (e.list.length < variants) {
    e.list.push(make(a));
    return e.list[e.list.length - 1];
  }
  return e.list[e.next++ % e.list.length];
}

/** Each ring's ringing pitch (Hz): heavy rings clang low, light ones bright. */
const RING_PITCH: Record<string, number> = { anvil: 900, bulwark: 950, halo: 1300, cog: 1200, hook: 1500, gale: 1600, striker: 1700, saw: 1800 };

/** A top's ring by its id, or (no id) a short steel tick at `base` for clicks, latches and clatter. */
function steel(id = '', base = RING_PITCH[id] ?? 1500) {
  return voice(`steel:${id || base}`, (a) => render(a, base, STEEL, id ? 0.8 : 0.4, Math.min(900, Math.max(300, base * 0.42))));
}
function anvil() {
  return voice('anvil', (a) => render(a, 400, ANVIL, 1.6, 320));
}
function bellVoice() {
  return voice('bell', (a) => render(a, BELL_BASE, BELL, 1.4), 2);
}

/**
 * Plays a rendered voice: `rate` shifts its pitch, `damp` (s) chokes it early (a dull, held hit).
 * Returns its gain, so a caller can send it on (to the reverb).
 */
function ring(buf: AudioBuffer | null, gain: number, rate = 1, at = 0, damp = 0, dest: AudioNode = out()): GainNode | null {
  const a = ctx;
  if (!a || !buf) return null;
  const t = a.currentTime + at;
  const r = rate * rr;
  const s = a.createBufferSource();
  s.buffer = buf;
  s.playbackRate.value = r;
  const g = a.createGain();
  g.gain.setValueAtTime(gain * rg, t);
  let end = t + buf.duration / r;
  if (damp) {
    g.gain.setTargetAtTime(0, t + damp, damp * 0.5);
    end = Math.min(end, t + damp * 5);
  }
  s.connect(g).connect(dest);
  s.start(t);
  s.stop(end);
  track(s, end);
  return g;
}

/** A struck bell note at `freq` (the motif and progress sounds). */
function bell(freq: number, gain: number, at = 0) {
  ring(bellVoice(), gain, freq / BELL_BASE, at);
}

/** Metal-on-metal clash; with the rings' ids, each top rings its own pitch (a two-voice clang). */
export function playClash(strength: number, x = 0, ringA?: string, ringB?: string, z = 0) {
  at(x, () => clash(strength, ringA, ringB), z);
}

/** Recent clash start times: at most two clashes ring within a quarter second. */
const clashAt = [-1, -1];
let clashNext = 0;
function clash(strength: number, ringA?: string, ringB?: string) {
  const a = ctx;
  if (!a) return;
  const now = a.currentTime;
  if (now - clashAt[clashNext] < 0.25) return;
  clashAt[clashNext] = now;
  clashNext = (clashNext + 1) % clashAt.length;
  const s = Math.min(1, Math.max(0.1, strength));
  const heavy = s > 0.6;
  // Hit strength is brightness: a graze is dull, a slam opens the whole spectrum.
  const lp = a.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800 + 10000 * s * s;
  lp.Q.value = 0.5;
  lp.connect(out());
  vary(0.03, () => {
    // Transient (the crack), body (the mass, 300-900 Hz), then each top's own ring.
    crack(0.55 * s, 0.003 + 0.005 * s, 1500 + 5000 * s);
    hiss(0.28 * s, 0.05 + 0.04 * s, 650, 420, 1.2);
    for (const id of [ringA, ringB]) ring(steel(id), 0.25 * s, 0.97 + Math.random() * 0.06, Math.random() * 0.004, s < 0.3 ? 0.04 : 0, lp);
    // A graze scrapes more than it rings.
    if (s < 0.3) hiss(0.12, 0.09, 2600, 1600, 2);
    if (heavy) {
      // A slam: a saturated low thump, a longer ring with more room, and flying grit.
      thump(140, 50, 0.45 * s, 0.22);
      const tail = a.createGain();
      tail.gain.value = 1.6;
      lp.connect(tail).connect(verbIn!);
      for (let i = 0; i < 3; i++) tone(3500 + Math.random() * 3000, 0.02, 0.05, 'sine', 0.06 + i * 0.05 + Math.random() * 0.04);
    }
  });
}

/** Rail dash: a rising zip. */
export function playDash(x = 0) {
  at(x, () =>
    vary(0.05, () => {
      hiss(0.35, 0.3, 800, 5000, 3);
      hiss(0.1, 0.25, 300, 900, 6);
    }),
  );
}

/** A fingertip cutting the air: a short whoosh, brighter and louder the faster the swing (arena m/s). */
export function playSwish(speed: number, x = 0) {
  const k = Math.max(0, Math.min(1, (speed - 0.25) / 0.6));
  at(x, () =>
    vary(0.08, () => {
      hiss(0.12 + 0.16 * k, 0.12 + 0.06 * k, 1200 + 2600 * k, 3800 + 4200 * k, 2.5);
    }),
  );
}

/** A fingertip rubbing spin back into a top: a soft, bright tick that rises with the window's gain (0..1). */
export function playRub(gain: number, x = 0) {
  const k = Math.max(0, Math.min(1, gain));
  at(x, () =>
    vary(0.05, () => {
      hiss(0.05 + 0.05 * k, 0.04, 2400 + 3200 * k, 3600 + 4200 * k, 6);
    }),
  );
}

/**
 * The rip lets go: the launcher's clack (a sharp steel latch), a whoosh scaled by power; a perfect
 * rip adds a bright bell ping.
 */
export function playLaunch(power: number, perfect: boolean) {
  vary(0.04, () => {
    crack(0.45, 0.005, 3000);
    ring(steel('', 2400), 0.22, 1, 0, 0.012);
    ring(steel('', 2400), 0.14, 0.8, 0.035, 0.01);
    hiss(0.25 + 0.35 * power, 0.35, 600, 2500, 1, 0.02);
  });
  if (perfect) bell(1760, 0.16, 0.05);
}

/** A launched top touches down on the arena floor: a tick, a small steel ring, a thock. */
export function playTouchdown(x: number, z: number, hard = 1) {
  at(
    x,
    () =>
      vary(0.06, () => {
        const d = 0.12 + Math.random() * 0.05;
        crack(0.3 * hard, 0.004, 2500, d);
        hiss(0.18 * hard, 0.05, 420, 300, 1.5, d);
        ring(steel('', 2000), 0.12 * hard, 1, d, 0.03);
      }),
    z,
  );
}

/** Dropping into a slag pit: a hollow thunk, a falling tone, then the sizzle of hot slag. */
export function playPocket(x = 0) {
  at(x, () =>
    vary(0.04, () => {
      thump(140, 55, 0.4, 0.3);
      hiss(0.2, 0.15, 900, 300, 2);
      hiss(0.12, 0.6, 3000, 800, 2, 0.12);
      tone(90, 0.15, 0.3, 'sine', 0.3, 45);
    }),
  );
}

/** Over the wall: a whoosh off, then it hits the table and clatters. */
export function playOver(x = 0) {
  at(x, () =>
    vary(0.04, () => {
      hiss(0.35, 0.5, 3000, 400, 2);
      crack(0.2, 0.005, 2000, 0.38);
      hiss(0.2, 0.08, 500, 350, 1.5, 0.38);
      ring(steel('', 1700), 0.12, 0.9, 0.38, 0.04);
      ring(steel('', 1700), 0.07, 0.95, 0.52, 0.03);
    }),
  );
}

/** Burst: an explosive crack, a low tear and scattering clinks of the parts. */
export function playBurst(x = 0) {
  at(x, () =>
    vary(0.04, () => {
      crack(0.6, 0.012, 1200);
      hiss(0.7, 0.45, 2500, 300, 0.6);
      thump(110, 38, 0.5, 0.4);
      for (let i = 0; i < 5; i++) ring(steel('', 1800), 0.06, 1 + Math.random() * 1.2, 0.06 + i * 0.09 + Math.random() * 0.05, 0.03);
    }),
  );
}

/**
 * Running out of spin: the precession rattle speeds up as the top goes over (like a coin settling),
 * then one last clank as it falls flat.
 */
export function playTopple(x = 0, z = 0) {
  at(
    x,
    () =>
      vary(0.04, () => {
        let t = 0;
        let gap = 0.13;
        for (let i = 0; i < 9; i++) {
          crack(0.06 + 0.02 * i, 0.003, 2200, t);
          ring(steel('', 1600), 0.05 + 0.012 * i, 1.1 + Math.random() * 0.25, t, 0.015);
          t += gap;
          gap *= 0.8;
        }
        crack(0.35, 0.006, 1500, t);
        hiss(0.22, 0.07, 450, 300, 1.5, t);
        ring(steel('', 1600), 0.3, 0.8, t, 0.12);
      }),
    z,
  );
}

/**
 * SpinSmith's motif: four notes, a hammer's rise (D, A, F, high D) rung like struck steel. The win
 * stinger, a level-up and an order stamp all play it, so the game has one sound of its own.
 */
const MOTIF = [587, 880, 698, 1175];
/** A voice under the motif for the match win (A, F, D, A: D minor, ending on the open fifth). */
const MOTIF_HARMONY = [440, 698, 587, 880];

function motif(at: number, step: number, gain: number, notes = MOTIF.length) {
  MOTIF.slice(0, notes).forEach((f, i) => bell(f, gain, at + i * step));
}

/** Round result: a win is the motif over an anvil strike; a loss is three falling bells. */
export function playResult(won: boolean) {
  // Starts after the finish sound has landed.
  if (won) {
    crack(0.2, 0.006, 2500, 0.4);
    ring(anvil(), 0.18, 1.2, 0.4, 0.3);
    thump(110, 70, 0.25, 0.4, 0.4);
    motif(0.45, 0.13, 0.13);
  } else [392, 330, 262].forEach((f, i) => bell(f, 0.1, 0.45 + i * 0.14));
}

/**
 * The match is decided, after the round's sound: a win swells into the harmonized motif over a
 * long anvil ring and a wide room; a loss tolls twice, low.
 */
export function playMatch(won: boolean) {
  const a = audio();
  if (!a || !verbIn) return;
  if (won) {
    const t = 1.2;
    thump(90, 45, 0.4, 0.6, t);
    const g = ring(anvil(), 0.3, 0.75, t);
    if (g) {
      const send = a.createGain();
      send.gain.value = 2;
      g.connect(send).connect(verbIn);
    }
    MOTIF.forEach((f, i) => {
      bell(f, 0.14, t + 0.15 + i * 0.17);
      bell(MOTIF_HARMONY[i], 0.09, t + 0.15 + i * 0.17);
    });
    bell(MOTIF[3], 0.1, t + 0.9);
    bell(MOTIF[3] * 1.5, 0.06, t + 0.9);
  } else {
    bell(147, 0.18, 1.1);
    bell(110, 0.16, 1.7);
  }
}

/** A thrown top lands: a thock on the table, a bright clatter and bounces on the floor. */
export function playLand(on: 'table' | 'floor', x = 0, hard = 1) {
  at(x, () =>
    vary(0.06, () => {
      if (on === 'table') {
        crack(0.25 * hard, 0.004, 2000);
        thump(170, 90, 0.25 * hard, 0.12);
        hiss(0.15 * hard, 0.1, 500, 300, 1.5);
        ring(steel('', 1600), 0.08 * hard, 1, 0, 0.04);
      } else {
        thump(120, 45, 0.3 * hard, 0.2);
        hiss(0.2 * hard, 0.08, 1800, 1500, 3);
        ring(steel('', 1600), 0.08 * hard, 0.9 + Math.random() * 0.2, 0.12, 0.03);
        ring(steel('', 1600), 0.05 * hard, 0.9 + Math.random() * 0.2, 0.25, 0.02);
      }
    }),
  );
}

/** DESK KO: the room goes quiet for a beat, then the top cracks off the real table's edge. */
export function playDeskKo(x = 0) {
  duck(0.05, 0.6);
  at(x, () =>
    vary(0.03, () => {
      crack(0.7, 0.008, 1800, 0.15);
      thump(160, 60, 0.55, 0.3, 0.15);
      ring(anvil(), 0.22, 1.1, 0.15, 0.25);
    }),
  );
}

/** The quench: hot steel into water, a long hiss and a bubbling settle. */
export function playQuench() {
  hiss(0.35, 1.2, 5000, 1200, 0.8);
  hiss(0.12, 0.8, 800, 400, 2, 0.2);
  for (let i = 0; i < 5; i++) tone(300 + Math.random() * 400, 0.03, 0.06, 'sine', 0.3 + i * 0.12 + Math.random() * 0.05, 600 + Math.random() * 300);
}

/** A card appears: a soft, short tick. */
export function playTick() {
  vary(0.04, () => {
    tone(2200, 0.025, 0.05, 'sine');
    tone(3300, 0.012, 0.03, 'sine', 0.01);
  });
}

/** Pointing at something you can pick: a very soft, short tick (never more than one in 60 ms). */
let hoverAt = -1;
export function playHover() {
  const a = audio();
  if (!a || a.currentTime - hoverAt < 0.06) return;
  hoverAt = a.currentTime;
  vary(0.12, () => {
    tone(4000, 0.014, 0.015, 'sine');
    crack(0.03, 0.002, 5000);
  });
}

/** A round begins: a low gong (a struck plate's partials, decaying over a second and a half). */
export function playGong() {
  vary(0.02, () => {
    crack(0.12, 0.006, 1500);
    tone(110, 0.25, 1.5, 'sine');
    tone(110 * 2.76, 0.08, 1.1, 'sine');
    tone(110 * 2.78, 0.05, 1.0, 'sine');
    tone(110 * 5.4, 0.04, 0.7, 'sine');
    hiss(0.1, 0.05, 2000, 1500, 1);
  });
}

/** An order stamp: a heavy stamp, then the motif's first two notes. */
export function playStamp() {
  crack(0.3, 0.005, 1500);
  thump(150, 80, 0.3, 0.2);
  motif(0.12, 0.12, 0.11, 2);
}

/**
 * A continuous spinning top per top, from three layers driven by its state: a high metallic whine
 * whose pitch falls with spin, the tip's grind on the floor (noise pulsed at the rotation rate,
 * louder with speed), and a precession rattle (clicks that grow louder and slower as the top
 * wobbles and dies). Silent when stopped. Built once; update() only moves parameters.
 */
export class SpinHum {
  private w1: OscillatorNode | null = null;
  private w2: OscillatorNode | null = null;
  private whine: GainNode | null = null;
  private grindBand: BiquadFilterNode | null = null;
  private grind: GainNode | null = null;
  private rot: OscillatorNode | null = null;
  private rattleBand: BiquadFilterNode | null = null;
  private rattle: GainNode | null = null;
  private nextClick = 0;
  private pan: StereoPannerNode | null = null;
  private place: PannerNode | null = null;

  constructor(private readonly base: number) {}

  private start(a: AudioContext) {
    this.pan = a.createStereoPanner();
    // Mixed, panned left-right, then placed in the room where the top is (HRTF), into the loops.
    this.place = panner(a, 0, 0, loops!);
    this.pan.connect(this.place);
    // The whine: two inharmonic sines, kHz up, quiet (it carries a long way).
    this.w1 = a.createOscillator();
    this.w2 = a.createOscillator();
    this.whine = a.createGain();
    this.whine.gain.value = 0;
    this.w1.connect(this.whine);
    this.w2.connect(this.whine);
    this.whine.connect(this.pan);
    this.w1.start();
    this.w2.start();
    if (!noise) return;
    const src = a.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    // The grind: low-mid noise, its loudness swung by the rotation oscillator.
    this.grindBand = a.createBiquadFilter();
    this.grindBand.type = 'bandpass';
    this.grindBand.Q.value = 1.2;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 250;
    this.rot = a.createOscillator();
    const depth = a.createGain();
    depth.gain.value = 0.45;
    const am = a.createGain();
    am.gain.value = 0.55;
    this.rot.connect(depth).connect(am.gain);
    this.grind = a.createGain();
    this.grind.gain.value = 0;
    src.connect(this.grindBand).connect(hp).connect(am).connect(this.grind).connect(this.pan);
    // The rattle: a narrow metallic band of the same noise, opened by short clicks.
    this.rattleBand = a.createBiquadFilter();
    this.rattleBand.type = 'bandpass';
    this.rattleBand.Q.value = 5;
    this.rattle = a.createGain();
    this.rattle.gain.value = 0;
    src.connect(this.rattleBand).connect(this.rattle).connect(this.pan);
    src.start(0, Math.random() * 0.9);
    this.rot.start();
  }

  /** spin 0..1 (0 = silent), speed in m/s, wobble 0..1; x is where the top is (arena-local, for panning). */
  update(spin: number, speed: number, wobble: number, time: number, x = 0, z = 0) {
    const a = audio();
    if (!a || !loops) return;
    if (!this.w1) this.start(a);
    const t = a.currentTime;
    const on = spin > 0;
    // The whine wavers with the drawn wobble (visuals: time * 9) and falls as spin does.
    const waver = 1 + wobble * 0.03 * Math.sin(time * 9);
    const f = this.base * 7.3 * (0.35 + 0.75 * spin) * waver;
    this.w1!.frequency.setTargetAtTime(f, t, 0.05);
    this.w2!.frequency.setTargetAtTime(f * 1.47 + 0.7, t, 0.05);
    this.whine!.gain.setTargetAtTime(on ? 0.008 + 0.02 * spin : 0, t, 0.08);
    if (arenaFrame && this.place) {
      // In the room: the HRTF panner carries direction, so the stereo pan stays centred.
      worldOf(x, z, spot);
      this.place.positionX.setTargetAtTime(spot.x, t, 0.03);
      this.place.positionY.setTargetAtTime(spot.y, t, 0.03);
      this.place.positionZ.setTargetAtTime(spot.z, t, 0.03);
      this.pan!.pan.setTargetAtTime(0, t, 0.05);
    } else this.pan!.pan.setTargetAtTime(Math.max(-1, Math.min(1, x / 0.18)) * 0.6, t, 0.05);
    if (!this.grind || !this.rot || !this.grindBand || !this.rattle || !this.rattleBand) return;
    // The grind follows the rotation, with a little jitter so it never sounds like a tremolo.
    this.rot.frequency.setTargetAtTime((6 + 40 * spin) * (0.93 + 0.14 * Math.random()), t, 0.05);
    this.grindBand.frequency.setTargetAtTime(300 + 600 * spin, t, 0.05);
    this.grind.gain.setTargetAtTime(on ? 0.25 + 0.2 * spin + 0.35 * Math.min(1, speed) : 0, t, 0.08);
    // The rattle: a wobbling or dying top clatters, louder and slower as it goes.
    const shake = on ? Math.max(wobble, spin < 0.3 ? ((0.3 - spin) / 0.3) * 0.7 : 0) : 0;
    if (shake > 0.12 && t >= this.nextClick) {
      const g = this.rattle.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(2.5 * shake * shake, t);
      g.setTargetAtTime(0, t + 0.002, 0.008);
      this.rattleBand.frequency.setValueAtTime(2000 + 1500 * Math.random(), t);
      this.nextClick = t + (0.7 + 0.6 * Math.random()) / (5 + 35 * spin);
    } else if (this.nextClick > t + 1) this.nextClick = t;
  }
}

/**
 * The rip cord: a ratchet that clicks once per few centimetres pulled (faster as you pull faster),
 * the cord's friction rising with power, and the launcher's gear winding up under it.
 */
export class CordTone {
  private gear: OscillatorNode | null = null;
  private gearGain: GainNode | null = null;
  private band: BiquadFilterNode | null = null;
  private fric: GainNode | null = null;
  private clickBand: BiquadFilterNode | null = null;
  private click: GainNode | null = null;
  private last = -1;
  private pulled = 0;

  update(power: number | null) {
    const a = audio();
    if (!a || !loops) return;
    if (!this.gear) {
      this.gear = a.createOscillator();
      this.gear.type = 'triangle';
      const lp = a.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1500;
      this.gearGain = a.createGain();
      this.gearGain.gain.value = 0;
      this.gear.connect(lp).connect(this.gearGain).connect(loops);
      this.gear.start();
      if (noise) {
        const src = a.createBufferSource();
        src.buffer = noise;
        src.loop = true;
        this.band = a.createBiquadFilter();
        this.band.type = 'bandpass';
        this.band.Q.value = 1.5;
        this.fric = a.createGain();
        this.fric.gain.value = 0;
        src.connect(this.band).connect(this.fric).connect(loops);
        this.clickBand = a.createBiquadFilter();
        this.clickBand.type = 'bandpass';
        this.clickBand.Q.value = 6;
        this.click = a.createGain();
        this.click.gain.value = 0;
        src.connect(this.clickBand).connect(this.click).connect(loops);
        src.start();
      }
    }
    const t = a.currentTime;
    if (power === null) {
      this.gearGain!.gain.setTargetAtTime(0, t, 0.03);
      this.fric?.gain.setTargetAtTime(0, t, 0.03);
      this.last = -1;
      return;
    }
    const moved = this.last < 0 ? 0 : Math.abs(power - this.last);
    this.last = power;
    this.gear.frequency.setTargetAtTime(180 + 520 * power, t, 0.03);
    this.gearGain!.gain.setTargetAtTime(0.012 + 0.02 * power, t, 0.03);
    if (!this.fric || !this.band || !this.click || !this.clickBand) return;
    this.band.frequency.setTargetAtTime(500 + 2000 * power, t, 0.03);
    this.fric.gain.setTargetAtTime(0.03 + 0.06 * power + Math.min(0.25, moved * 12), t, 0.03);
    if ((this.pulled += moved) > 0.04) {
      this.pulled = 0;
      const g = this.click.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(1.5 + power, t);
      g.setTargetAtTime(0, t + 0.001, 0.005);
      this.clickBand.frequency.setValueAtTime((2500 + 2000 * power) * (0.9 + 0.2 * Math.random()), t);
    }
  }
}

/** Builder: picking a piece up from the tray or the arena. */
export function playPick() {
  vary(0.06, () => {
    crack(0.06, 0.003, 3000);
    tone(1100, 0.05, 0.06, 'sine');
  });
}

/** The forge's core locks on tooth by tooth: a ratchet whose pitch climbs as it seats. */
export function playTooth(left: number) {
  vary(0.02, () => {
    crack(0.08, 0.003, 3500);
    ring(steel('', 2200), 0.07, 1 / (1 + 0.04 * left), 0, 0.02);
  });
}

/** Builder: a piece clicks into place. */
export function playPlace() {
  vary(0.05, () => {
    crack(0.12, 0.004, 2500);
    hiss(0.12, 0.05, 600, 450, 1.5);
    ring(steel('', 1400), 0.1, 1, 0.005, 0.05);
  });
}

/** The forge: a part fitted is hammered home on the anvil, a hard blow and a lighter tap. */
export function playFit() {
  vary(0.04, () => {
    crack(0.3, 0.005, 2000);
    thump(160, 90, 0.2, 0.1);
    ring(anvil(), 0.2, 1.6, 0, 0.18);
    crack(0.15, 0.004, 2500, 0.16);
    ring(anvil(), 0.1, 1.62, 0.16, 0.1);
  });
}

/** The forge: a top dipped in a paint pot, a thick slosh and a few rising bubbles. */
export function playDip() {
  vary(0.06, () => {
    hiss(0.25, 0.35, 700, 250, 0.7, 0, 'lowpass');
    for (let i = 0; i < 3; i++) tone(280 + Math.random() * 200, 0.04, 0.07, 'sine', 0.08 + i * 0.09 + Math.random() * 0.04, 650);
  });
}

/** Builder: a piece dropped off the arena is thrown away. */
export function playRemove() {
  vary(0.06, () => hiss(0.18, 0.2, 1500, 300, 1.5));
}

/** XP ticking up after a round: a soft rising blip. */
export function playXp() {
  vary(0.04, () => tone(880, 0.05, 0.12, 'sine', 0, 1320));
}

/** Level up: an anvil strike and the motif, slower and an octave up on bells. */
export function playLevelUp() {
  crack(0.25, 0.006, 2500);
  ring(anvil(), 0.15, 1.3, 0, 0.4);
  MOTIF.forEach((f, i) => bell(f * 2, 0.11, 0.15 + i * 0.16));
}

/** A part unlocked: two bright bells. */
export function playUnlock() {
  bell(1175, 0.1);
  bell(1760, 0.08, 0.12);
}

/** The forge bar is full: a rising ring, the motif's first two notes. */
export function playBarFull() {
  bell(587, 0.1);
  bell(880, 0.1, 0.1);
}

/** The Anvil Strike: a hammer on an anvil, a deep boom under it, a long metal ring in the room. */
export function playStrike() {
  const a = audio();
  if (!a || !verbIn) return;
  vary(0.03, () => {
    crack(0.5, 0.008, 1200);
    thump(70, 32, 0.6, 0.8);
    hiss(0.4, 0.25, 1800, 200, 0.4);
    const g = ring(anvil(), 0.35, 1, 0.005);
    if (g) {
      const send = a.createGain();
      send.gain.value = 1.5;
      g.connect(send).connect(verbIn!);
    }
  });
}

/** A rival's tell: a rising whine over a second, then a rival's move lands. */
export function playTell() {
  tone(300, 0.12, 1.0, 'sawtooth', 0, 900);
  tone(150, 0.08, 1.0, 'square', 0, 450);
}

/** A locked thing pinched: a dull clunk. */
export function playLocked() {
  vary(0.04, () => {
    thump(140, 90, 0.18, 0.12);
    hiss(0.08, 0.05, 500, 350, 1.5);
  });
}

/** A ramp or well set into the floor: a low, solid thock. */
export function playThock(x = 0, z = 0) {
  at(
    x,
    () =>
      vary(0.05, () => {
        thump(120, 70, 0.22, 0.18);
        hiss(0.08, 0.06, 900, 400, 1.5);
      }),
    z,
  );
}

/** A top meets player-made terrain: ramps scrape upward, wells answer with a low metal knock. */
export function playShapeHit(kind: 'ramp' | 'well' | 'groove', x = 0, z = 0) {
  at(
    x,
    () =>
      vary(0.05, () => {
        if (kind === 'ramp' || kind === 'groove') {
          crack(0.16, 0.004, 2800);
          hiss(0.14, 0.13, 850, 3600, 3);
          ring(steel('', 1750), 0.11, 1.08, 0.01, 0.05);
        } else {
          thump(150, 62, 0.18, 0.14);
          ring(steel('', 900), 0.12, 0.78, 0, 0.08);
        }
      }),
    z,
  );
}

/** A cup closes around a top: one heavy lock followed by a short confirming chime. */
export function playCupCatch(x = 0, z = 0) {
  at(
    x,
    () =>
      vary(0.025, () => {
        crack(0.22, 0.005, 1900);
        thump(130, 48, 0.28, 0.22);
        ring(steel('', 1100), 0.19, 0.82, 0.025, 0.12);
        tone(660, 0.055, 0.12, 'sine', 0.07, 880);
      }),
    z,
  );
}

/** A held top is fired from a cup: tension snap first, then a fast directional whip. */
export function playSling(x = 0, z = 0) {
  at(
    x,
    () =>
      vary(0.04, () => {
        crack(0.3, 0.004, 4200);
        ring(steel('', 2100), 0.13, 1.15, 0, 0.025);
        hiss(0.38, 0.28, 420, 6200, 4, 0.015);
        tone(180, 0.05, 0.22, 'sawtooth', 0.015, 720);
      }),
    z,
  );
}

/**
 * The six seals have different audio silhouettes, so the arena rule can be recognised without
 * reading its label. These are deliberately short; the physical arena change is the lasting beat.
 */
export function playUltimateSignature(seal: 'anvil' | 'rush' | 'magnet' | 'tilt' | 'hammer' | 'ward', x = 0, z = 0) {
  at(
    x,
    () => {
      if (seal === 'anvil') {
        crack(0.5, 0.008, 1200);
        thump(70, 32, 0.6, 0.8);
        ring(anvil(), 0.35, 1, 0.005);
      } else if (seal === 'rush') {
        crack(0.28, 0.004, 3800);
        hiss(0.42, 0.42, 350, 6500, 4);
        tone(120, 0.12, 0.36, 'sawtooth', 0, 1050);
      } else if (seal === 'magnet') {
        thump(95, 55, 0.3, 0.35);
        tone(980, 0.08, 0.42, 'sine', 0, 210);
        tone(1230, 0.06, 0.36, 'sine', 0.04, 260);
      } else if (seal === 'tilt') {
        hiss(0.45, 0.55, 180, 720, 2, 0, 'lowpass');
        tone(72, 0.18, 0.5, 'sawtooth', 0, 48);
        crack(0.28, 0.007, 1100, 0.34);
      } else if (seal === 'hammer') {
        for (let i = 0; i < 3; i++) {
          const delay = i * 0.1;
          crack(0.32 - i * 0.05, 0.006, 1700, delay);
          thump(105 - i * 12, 42, 0.42 - i * 0.06, 0.28, delay);
          ring(anvil(), 0.17, 0.82 - i * 0.06, delay, 0.18);
        }
      } else {
        crack(0.3, 0.004, 2600);
        thump(180, 70, 0.25, 0.25);
        ring(steel('', 1250), 0.24, 1.15, 0.02);
        tone(520, 0.06, 0.32, 'sine', 0.04, 1040);
      }
    },
    z,
  );
}

/** A top scrapes along the rim: steel dragged on steel, a ringing band over grit. */
export function playScrape(strength: number, x = 0, z = 0) {
  const s = Math.min(1, Math.max(0.15, strength));
  at(
    x,
    () =>
      vary(0.06, () => {
        crack(0.2 * s, 0.003, 3000);
        hiss(0.22 * s, 0.12 + 0.12 * s, 4500, 2200, 2);
        hiss(1.0 * s, 0.15 + 0.15 * s, 3100, 2800, 14);
      }),
    z,
  );
}

/** The arena turns into the forge: a low mechanical rumble that ends in a clunk. */
export function playMachine() {
  vary(0.03, () => {
    hiss(0.6, 0.12, 400, 150, 1.5);
    tone(70, 0.2, 0.5, 'sawtooth', 0, 55);
    crack(0.2, 0.005, 1500, 0.6);
    thump(160, 90, 0.25, 0.15, 0.6);
  });
}

/** A forge drawer slides out: a short slide and a click. */
export function playDrawer() {
  vary(0.05, () => {
    hiss(0.14, 0.08, 2500, 1200, 1);
    crack(0.08, 0.003, 3000, 0.13);
    tone(900, 0.04, 0.04, 'sine', 0.13);
  });
}

/**
 * The music: one sequencer at 96 bpm in D minor, built on the motif, scheduled ahead of the clock.
 * Layers come and go with the game: home has the forge's room tone (a low fire roar breathing like
 * bellows, a crackle now and then) and the anvil; getting ready adds a bass pulse; the fight adds
 * toms; tension (a full bar, a top nearly out of spin, a rival tell) adds hats and the motif up
 * high. Big moments duck it (duck()).
 */
export type MusicState = 'home' | 'ready' | 'fight' | 'quiet';
export class ForgeLoop {
  private bus: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private bed: GainNode | null = null;
  private next = 0;
  private step = 0;
  private state: MusicState = 'quiet';
  private tension = 0;

  /** Call every frame with where the game is; tension 0..1. */
  update(state: MusicState, tension = 0) {
    const a = audio();
    if (!a || !music) return;
    this.state = state;
    this.tension = tension;
    if (!this.bus) {
      this.bus = a.createGain();
      this.bus.gain.value = 0;
      // Leave room for the spin hums' grind (about 300-900 Hz).
      const eq = a.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.value = 450;
      eq.Q.value = 1;
      eq.gain.value = -5;
      this.bus.connect(eq).connect(music);
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 220;
      this.drone = a.createOscillator();
      this.drone.type = 'sawtooth';
      this.drone.frequency.value = 73.4;
      const g = a.createGain();
      g.gain.value = 0.035;
      this.drone.connect(f).connect(g).connect(this.bus);
      this.drone.start();
      this.startBed(a);
      this.next = a.currentTime + 0.1;
    }
    const level = state === 'quiet' ? 0 : state === 'home' ? 0.55 : state === 'ready' ? 0.5 : 0.45;
    this.bus.gain.setTargetAtTime(level, a.currentTime, 0.5);
    this.bed?.gain.setTargetAtTime(state === 'home' ? 1 : 0, a.currentTime, 1);
    // Sixteenth notes at 96 bpm, scheduled 0.2 s ahead.
    const sixteenth = 60 / 96 / 4;
    while (this.next < a.currentTime + 0.2) {
      this.play(a, this.next, this.step % 64);
      this.step++;
      this.next += sixteenth;
    }
  }

  /** The forge's room tone: looped brown noise, low-passed, swelling slowly like bellows. Quiet. */
  private startBed(a: AudioContext) {
    const n = a.sampleRate * 3;
    const b = a.createBuffer(1, n, a.sampleRate);
    const d = b.getChannelData(0);
    let v = 0;
    let peak = 0;
    for (let i = 0; i < n; i++) {
      v = (v + (Math.random() * 2 - 1) * 0.02) * 0.998;
      d[i] = v;
      peak = Math.max(peak, Math.abs(v));
    }
    // The end fades into the start, and the loop goes back to just after it: no seam.
    const fade = Math.floor(a.sampleRate * 0.2);
    for (let i = 0; i < fade; i++) d[n - fade + i] = d[n - fade + i] * (1 - i / fade) + d[i] * (i / fade);
    for (let i = 0; i < n; i++) d[i] /= peak;
    const src = a.createBufferSource();
    src.buffer = b;
    src.loop = true;
    src.loopStart = fade / a.sampleRate;
    src.loopEnd = n / a.sampleRate;
    const lp = a.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 400;
    const breath = a.createGain();
    breath.gain.value = 0.03;
    const bellows = a.createOscillator();
    bellows.frequency.value = 0.12;
    const depth = a.createGain();
    depth.gain.value = 0.015;
    bellows.connect(depth).connect(breath.gain);
    this.bed = a.createGain();
    this.bed.gain.value = 0;
    src.connect(lp).connect(breath).connect(this.bed).connect(music!);
    src.start();
    bellows.start();
  }

  private voice(a: AudioContext, t: number, freq: number, gain: number, decay: number, type: OscillatorType = 'triangle', slideTo?: number) {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + decay);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g).connect(this.bus!);
    o.start(t);
    o.stop(t + decay + 0.02);
  }

  /** A struck metal voice on the beat (the music's anvil and bells). */
  private metal(a: AudioContext, buf: AudioBuffer | null, t: number, gain: number, rate: number, damp = 0) {
    ring(buf, gain, rate, t - a.currentTime, damp, this.bus!);
  }

  private hat(a: AudioContext, t: number, gain: number, cutoff = 7000, decay = 0.04) {
    if (!noise) return;
    const src = a.createBufferSource();
    src.buffer = noise;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = cutoff;
    const g = a.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    src.connect(hp).connect(g).connect(this.bus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + decay + 0.02);
  }

  /** One sixteenth of the 4-bar loop (64 steps). */
  private play(a: AudioContext, t: number, i: number) {
    const st = this.state;
    if (st === 'quiet') return;
    const bar = i % 16;
    // The anvil: a ring on beats 1 and 3, a ghost tap before 4.
    if (bar === 0 || bar === 8) this.metal(a, anvil(), t, 0.07 * (0.85 + Math.random() * 0.3), 1.47 * (0.995 + Math.random() * 0.01), 0.35);
    else if (bar === 14) this.metal(a, anvil(), t, 0.025, 1.47, 0.05);
    // The forge crackles now and then at home.
    if (st === 'home' && Math.random() < 0.08) this.hat(a, t + Math.random() * 0.1, 0.008 + Math.random() * 0.02, 2500, 0.006);
    // Every four bars at home, the motif rung softly an octave down.
    if (st === 'home' && i === 48) MOTIF.forEach((f, k) => this.metal(a, bellVoice(), t + k * 0.22, 0.05, f / 2 / BELL_BASE));
    // Bass: eighths on D (B-flat in bar 3), from getting ready on.
    if (st !== 'home' && i % 2 === 0) this.voice(a, t, i >= 32 && i < 48 ? 58.27 : 73.42, st === 'fight' ? 0.11 : 0.07, 0.18, 'sawtooth');
    // Fight: toms on 1, the and of 2, and 4.
    if (st === 'fight' && (bar === 0 || bar === 6 || bar === 12)) this.voice(a, t, bar === 6 ? 150 : 120, 0.22, 0.22, 'sine', 55);
    // Tension: hats in sixteenths and the motif up high, a note a beat.
    if (st === 'fight' && this.tension > 0.5) {
      this.hat(a, t, i % 4 === 0 ? 0.05 : 0.025);
      if (i % 4 === 0) this.metal(a, bellVoice(), t, 0.04, (MOTIF[(i / 4) % 4] * 2) / BELL_BASE);
    }
  }
}
