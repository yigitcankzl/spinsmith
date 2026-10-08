/**
 * All game sound is synthesized with WebAudio: no audio files, no licensing, tiny download.
 * The context starts on first use; entering XR is a user gesture, so it is allowed to play.
 */

import { COMFORT } from './comfort.js';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
/** Effects go through `sfx` (with a reverb send); music has its own bus, ducked under big hits. */
let sfx: GainNode | null = null;
let music: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** While paused, no sound may wake the context back up. */
let pausedAudio = false;
/** Where the next sounds sit left to right (-1..1), set around an event by at(). */
let panNow = 0;

/** Plays `fn`'s sounds from an arena-local x (the arena is about 0.15-0.18 across a half). */
function at(x: number, fn: () => void, z = 0) {
  panNow = Math.max(-1, Math.min(1, x / 0.18)) * 0.7;
  atX = x;
  atZ = z;
  placed = true;
  fn();
  panNow = 0;
  placed = false;
}
let atX = 0;
let atZ = 0;
let placed = false;

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
  worldOf(x, z, spot);
  p.positionX.value = spot.x;
  p.positionY.value = spot.y;
  p.positionZ.value = spot.z;
  p.connect(dest);
  return p;
}

/** Where a sound goes: the effects bus, from where it happens (HRTF) or panned to its side. */
function out(a: AudioContext): AudioNode {
  if (placed && arenaFrame) return panner(a, atX, atZ, sfx!);
  if (panNow === 0 || !a.createStereoPanner) return sfx!;
  const p = a.createStereoPanner();
  p.pan.value = panNow;
  p.connect(sfx!);
  return p;
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
    // One room for every effect: a short generated reverb (decaying noise, darker as it fades).
    const verb = ctx.createConvolver();
    verb.buffer = impulse(ctx, 1.1);
    const send = ctx.createGain();
    send.gain.value = 0.22;
    send.connect(verb).connect(master);
    sfx = ctx.createGain();
    sfx.connect(master);
    sfx.connect(send);
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
  }
  if (ctx.state === 'suspended' && !pausedAudio) void ctx.resume();
  return ctx;
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

/** Music dips under a big moment (a hard hit, the strike, a knockout) and comes back. */
export function duck(depth = 0.35, hold = 0.25) {
  const a = ctx;
  if (!a || !music) return;
  const t = a.currentTime;
  music.gain.cancelScheduledValues(t);
  music.gain.setTargetAtTime(depth, t, 0.02);
  music.gain.setTargetAtTime(1, t + hold, 0.35);
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

/** A short decaying tone. */
function tone(freq: number, gain: number, decay: number, type: OscillatorType = 'sine', at = 0, slideTo?: number) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + decay);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  o.connect(g).connect(out(a));
  o.start(t);
  o.stop(t + decay + 0.02);
}

/** A filtered noise burst; the band can sweep from f0 to f1. */
function hiss(gain: number, decay: number, f0: number, f1 = f0, q = 1, at = 0) {
  const a = audio();
  if (!a || !master || !noise) return;
  const t = a.currentTime + at;
  const src = a.createBufferSource();
  src.buffer = noise;
  const f = a.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t);
  f.frequency.exponentialRampToValueAtTime(f1, t + decay);
  const g = a.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(f).connect(g).connect(out(a));
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
}

/** Each ring's ringing pitch (Hz): heavy rings clang low, light ones bright. */
const RING_PITCH: Record<string, number> = { anvil: 900, bulwark: 950, halo: 1300, cog: 1200, hook: 1500, gale: 1600, striker: 1700, saw: 1800 };

/** Metal-on-metal clash; with the rings' ids, each top rings its own pitch (a two-voice clang). */
export function playClash(strength: number, x = 0, ringA?: string, ringB?: string, z = 0) {
  at(x, () => clash(strength, ringA, ringB), z);
}

let clashVoices = 0;
function clash(strength: number, ringA?: string, ringB?: string) {
  const a = ctx;
  if (a && clashVoices >= 3) return;
  clashVoices++;
  setTimeout(() => clashVoices--, 250);
  const s = Math.min(1, Math.max(0.15, strength));
  // Transient: the tick the ear locks onto. Body: weight. Ring: struck steel. Grit: the scrape.
  hiss(0.6 * s, 0.012, 9000, 7000, 0.7);
  tone(180, 0.3 * s, 0.07, 'sine', 0, 80);
  for (const id of [ringA, ringB]) {
    const base = (id ? (RING_PITCH[id] ?? 1500) : 1500) * (0.96 + Math.random() * 0.08);
    [1, 2.76, 5.4, 8.93].forEach((r, i) => tone(base * r, (0.1 / (i + 1)) * s * (0.7 + Math.random() * 0.6), [0.6, 0.35, 0.2, 0.12][i] * (0.5 + 0.5 * s), 'sine'));
  }
  hiss(0.18 * s, 0.1, 3200, 2200, 3);
}

/** Rail dash: a rising zip. */
export function playDash(x = 0) {
  at(x, () => {
    hiss(0.35, 0.3, 800, 5000, 3);
    tone(300, 0.08, 0.3, 'sawtooth', 0, 900);
  });
}

/** Launch whoosh scaled by power; a perfect rip adds a bright ping. */
export function playLaunch(power: number, perfect: boolean) {
  hiss(0.25 + 0.35 * power, 0.35, 600, 2500, 1);
  if (perfect) tone(1760, 0.15, 0.4, 'sine');
}

/** Dropping into a slag pit: a hollow thunk, a falling tone, then the sizzle of hot slag. */
export function playPocket(x = 0) {
  at(x, () => {
    tone(140, 0.4, 0.3, 'sine', 0, 55);
    hiss(0.2, 0.15, 900, 300, 2);
    hiss(0.12, 0.6, 3000, 800, 2, 0.12);
    tone(90, 0.15, 0.3, 'sine', 0.3, 45);
  });
}

/** Over the wall: a whoosh off into the distance. */
export function playOver(x = 0) {
  at(x, () => hiss(0.35, 0.5, 3000, 400, 2));
}

/** Burst: an explosive crack and scattering clinks of the parts. */
export function playBurst(x = 0) {
  at(x, () => {
    hiss(0.7, 0.4, 2500, 300, 0.6);
    tone(90, 0.5, 0.35, 'sine', 0, 40);
    for (let i = 0; i < 6; i++) tone(2000 + Math.random() * 2500, 0.06, 0.12, 'triangle', 0.05 + i * 0.07 + Math.random() * 0.04);
  });
}

/** Running out of spin: the clatter of a toppling top. */
export function playTopple() {
  for (let i = 0; i < 4; i++) tone(700 + Math.random() * 500, 0.05, 0.08, 'triangle', i * (0.09 - i * 0.015));
}

/** Round result jingle. */
/**
 * SpinSmith's motif: four notes, a hammer's rise (D, A, F, high D) rung like struck steel. The win
 * stinger, a level-up and an order stamp all play it, so the game has one sound of its own.
 */
const MOTIF = [587, 880, 698, 1175];

function motif(at: number, step: number, gain: number, notes = MOTIF.length) {
  MOTIF.slice(0, notes).forEach((f, i) => {
    tone(f, gain, 0.45, 'triangle', at + i * step);
    tone(f * 2.76, gain * 0.25, 0.25, 'sine', at + i * step);
  });
}

export function playResult(won: boolean) {
  // Starts after the finish sound has landed.
  if (won) {
    // The motif over an anvil strike.
    hiss(0.2, 0.2, 3000, 1500, 2, 0.4);
    tone(110, 0.3, 0.5, 'sine', 0.4, 70);
    motif(0.45, 0.13, 0.12);
  } else [392, 330, 262].forEach((f, i) => tone(f, 0.1, 0.3, 'triangle', 0.45 + i * 0.12));
}

/** A thrown top lands: a woody thock on the table, a bright clatter and bounces on the floor. */
export function playLand(on: 'table' | 'floor', x = 0, hard = 1) {
  at(x, () => {
    if (on === 'table') {
      tone(160, 0.25 * hard, 0.12, 'sine', 0, 90);
      hiss(0.15 * hard, 0.1, 500, 300, 1.5);
    } else {
      hiss(0.2 * hard, 0.08, 1800, 1500, 3);
      tone(900 + Math.random() * 300, 0.06 * hard, 0.1, 'triangle', 0.12);
      tone(700 + Math.random() * 300, 0.04 * hard, 0.08, 'triangle', 0.25);
    }
  });
}

/** The quench: hot steel into water, a long hiss and a bubbling settle. */
export function playQuench() {
  hiss(0.35, 1.2, 5000, 1200, 0.8);
  hiss(0.12, 0.8, 800, 400, 2, 0.2);
  for (let i = 0; i < 5; i++) tone(300 + Math.random() * 400, 0.03, 0.06, 'sine', 0.3 + i * 0.12 + Math.random() * 0.05);
}

/** A card appears: a soft, short tick. */
export function playTick() {
  tone(2200, 0.025, 0.05, 'sine');
  tone(3300, 0.012, 0.03, 'sine', 0.01);
}

/** A round begins: a low gong (a struck plate's partials, decaying over a second and a half). */
export function playGong() {
  tone(110, 0.25, 1.5, 'sine');
  tone(110 * 2.76, 0.08, 1.1, 'sine');
  tone(110 * 5.4, 0.04, 0.7, 'sine');
  hiss(0.1, 0.05, 2000, 1500, 1);
}

/** An order stamp: the motif's first two notes, struck. */
export function playStamp() {
  tone(140, 0.3, 0.25, 'square', 0, 90);
  motif(0.12, 0.12, 0.1, 2);
}

/**
 * A continuous spinning hum per top. Pitch follows spin (it drops and wavers as the top
 * slows), loudness follows spin and speed. Silent when stopped.
 */
export class SpinHum {
  private osc: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  /** The whirr: band-passed noise pulsed at the blade-pass rate. */
  private whirr: GainNode | null = null;
  private whirrBand: BiquadFilterNode | null = null;
  private blade: OscillatorNode | null = null;
  private pan: StereoPannerNode | null = null;
  private place: PannerNode | null = null;

  constructor(private readonly base: number) {}

  private start(a: AudioContext) {
    this.osc = a.createOscillator();
    this.osc2 = a.createOscillator();
    this.osc.type = 'sawtooth';
    this.osc2.type = 'triangle';
    this.filter = a.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 4;
    this.gain = a.createGain();
    this.gain.gain.value = 0;
    this.pan = a.createStereoPanner();
    this.osc.connect(this.filter);
    this.osc2.connect(this.filter);
    // Panned left-right, then placed in the room where the top is (HRTF).
    this.place = a.createPanner();
    this.place.panningModel = 'HRTF';
    this.place.distanceModel = 'inverse';
    this.place.refDistance = 0.5;
    this.place.rolloffFactor = 0.6;
    this.filter.connect(this.gain).connect(this.pan).connect(this.place).connect(master!);
    // The whirr: noise through a band, its loudness swung by the blade-pass oscillator.
    if (noise) {
      const src = a.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      this.whirrBand = a.createBiquadFilter();
      this.whirrBand.type = 'bandpass';
      this.whirrBand.Q.value = 2;
      this.whirr = a.createGain();
      this.whirr.gain.value = 0;
      this.blade = a.createOscillator();
      this.blade.type = 'sine';
      const depth = a.createGain();
      depth.gain.value = 0.5;
      const am = a.createGain();
      am.gain.value = 0.5;
      this.blade.connect(depth).connect(am.gain);
      src.connect(this.whirrBand).connect(am).connect(this.whirr).connect(this.pan);
      src.start();
      this.blade.start();
    }
    this.osc.start();
    this.osc2.start();
  }

  /** spin 0..1 (0 = silent), speed in m/s, wobble 0..1; x is where the top is (arena-local, for panning). */
  update(spin: number, speed: number, wobble: number, time: number, x = 0, z = 0) {
    const a = audio();
    if (!a) return;
    if (!this.osc) this.start(a);
    const t = a.currentTime;
    // The waver follows the drawn wobble (visuals: time * 9).
    const waver = 1 + wobble * 0.08 * Math.sin(time * 9);
    const f = (this.base * (0.45 + 0.75 * spin)) * waver;
    this.osc!.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2!.frequency.setTargetAtTime(f * 2.01, t, 0.05);
    this.filter!.frequency.setTargetAtTime(400 + 2600 * spin, t, 0.05);
    const loud = spin > 0 ? 0.025 + 0.05 * spin + 0.04 * Math.min(1, speed) : 0;
    this.gain!.gain.setTargetAtTime(loud, t, 0.08);
    if (arenaFrame && this.place) {
      // In the room: the HRTF panner carries direction, so the stereo pan stays centred.
      worldOf(x, z, spot);
      this.place.positionX.setTargetAtTime(spot.x, t, 0.03);
      this.place.positionY.setTargetAtTime(spot.y, t, 0.03);
      this.place.positionZ.setTargetAtTime(spot.z, t, 0.03);
      this.pan!.pan.setTargetAtTime(0, t, 0.05);
    } else this.pan!.pan.setTargetAtTime(Math.max(-1, Math.min(1, x / 0.18)) * 0.6, t, 0.05);
    if (this.whirr && this.blade && this.whirrBand) {
      this.blade.frequency.setTargetAtTime(8 + 40 * spin, t, 0.05);
      this.whirrBand.frequency.setTargetAtTime(1200 + 1800 * spin, t, 0.05);
      this.whirr.gain.setTargetAtTime(spin > 0 ? 0.02 + 0.03 * spin + 0.05 * Math.min(1, speed) : 0, t, 0.08);
    }
  }
}

/** The rip cord's tension: a tone that rises with power while pulling. */
export class CordTone {
  private osc: OscillatorNode | null = null;
  private gain: GainNode | null = null;

  update(power: number | null) {
    const a = audio();
    if (!a) return;
    if (!this.osc) {
      this.osc = a.createOscillator();
      this.osc.type = 'square';
      this.gain = a.createGain();
      this.gain.gain.value = 0;
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1200;
      this.osc.connect(f).connect(this.gain).connect(master!);
      this.osc.start();
    }
    const t = a.currentTime;
    if (power === null) {
      this.gain!.gain.setTargetAtTime(0, t, 0.03);
      return;
    }
    this.osc.frequency.setTargetAtTime(110 + 330 * power, t, 0.03);
    this.gain!.gain.setTargetAtTime(0.03 + 0.05 * power, t, 0.03);
  }
}

/** Builder: picking a piece up from the tray or the arena. */
export function playPick() {
  tone(880, 0.06, 0.08, 'triangle');
}

/** Builder: a piece clicks into place. */
export function playPlace() {
  tone(520, 0.1, 0.12, 'triangle');
  tone(1560, 0.05, 0.1, 'sine', 0.02);
  hiss(0.12, 0.05, 3000, 2000, 1);
}

/** Builder: a piece dropped off the arena is thrown away. */
export function playRemove() {
  hiss(0.18, 0.2, 1500, 300, 1.5);
}

/** XP ticking up after a round: a soft rising blip. */
export function playXp() {
  tone(880, 0.05, 0.12, 'sine', 0, 1320);
}

/** Level up: an anvil strike and a rising bell chord. */
export function playLevelUp() {
  hiss(0.25, 0.25, 3000, 1500, 2);
  // The motif, slower and an octave up.
  MOTIF.forEach((f, i) => {
    tone(f * 2, 0.1, 0.9, 'triangle', 0.15 + i * 0.16);
    tone(f * 2 * 2.76, 0.03, 0.5, 'sine', 0.15 + i * 0.16);
  });
}

/** A part unlocked: a bright two-note chime. */
export function playUnlock() {
  tone(1175, 0.09, 0.6, 'triangle');
  tone(1760, 0.07, 0.8, 'triangle', 0.12);
}

/** The forge bar is full: a rising ring, the motif's first two notes. */
export function playBarFull() {
  tone(587, 0.08, 0.5, 'triangle');
  tone(880, 0.08, 0.7, 'triangle', 0.1);
}

/** The Anvil Strike: a hammer on an anvil, a deep boom under it, a long metal ring. */
export function playStrike() {
  tone(55, 0.6, 0.9, 'sine', 0, 30);
  hiss(0.5, 0.25, 1800, 200, 0.4);
  tone(1320, 0.12, 1.4, 'triangle', 0.02);
  tone(1980, 0.06, 1.1, 'triangle', 0.03);
}

/** A rival's tell: a rising whine over a second, then a rival's move lands. */
export function playTell() {
  tone(300, 0.12, 1.0, 'sawtooth', 0, 900);
  tone(150, 0.08, 1.0, 'square', 0, 450);
}

/** A locked thing pinched: a dull clunk. */
export function playLocked() {
  tone(140, 0.15, 0.15, 'square', 0, 90);
}

/** A ramp or well set into the floor: a low, solid thock. */
export function playThock() {
  tone(120, 0.22, 0.18, 'sine', 0, 70);
  hiss(0.08, 0.06, 900, 400, 1.5);
}

/** A top runs into a player's shape: a short gritty crunch. */
export function playCrunch() {
  hiss(0.12, 0.09, 2200, 900, 2);
}

/** The arena turns into the forge: a low mechanical rumble that ends in a clunk. */
export function playMachine() {
  hiss(0.6, 0.12, 400, 150, 1.5);
  tone(70, 0.2, 0.5, 'sawtooth', 0, 55);
  tone(160, 0.25, 0.15, 'square', 0.6, 90);
}

/** A forge drawer slides out: a short slide and a click. */
export function playDrawer() {
  hiss(0.14, 0.08, 2500, 1200, 1);
  tone(700, 0.06, 0.05, 'triangle', 0.13);
}

/**
 * The music: one sequencer at 96 bpm in D minor, built on the motif, scheduled ahead of the clock.
 * Layers come and go with the game: home has the bellows drone and the anvil; getting ready adds a
 * bass pulse; the fight adds toms; tension (a full bar, a top nearly out of spin, a rival tell)
 * adds hats and the motif up high. Big moments duck it (duck()).
 */
export type MusicState = 'home' | 'ready' | 'fight' | 'quiet';
export class ForgeLoop {
  private bus: GainNode | null = null;
  private drone: OscillatorNode | null = null;
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
      // Leave room for the spin hums (about 190-230 Hz).
      const eq = a.createBiquadFilter();
      eq.type = 'peaking';
      eq.frequency.value = 330;
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
      this.next = a.currentTime + 0.1;
    }
    const level = state === 'quiet' ? 0 : state === 'home' ? 0.55 : state === 'ready' ? 0.5 : 0.45;
    this.bus.gain.setTargetAtTime(level, a.currentTime, 0.5);
    // Sixteenth notes at 96 bpm, scheduled 0.2 s ahead.
    const sixteenth = 60 / 96 / 4;
    while (this.next < a.currentTime + 0.2) {
      this.play(a, this.next, this.step % 64);
      this.step++;
      this.next += sixteenth;
    }
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

  private hat(a: AudioContext, t: number, gain: number) {
    if (!noise) return;
    const src = a.createBufferSource();
    src.buffer = noise;
    const hp = a.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const g = a.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    src.connect(hp).connect(g).connect(this.bus!);
    src.start(t, Math.random() * 0.5);
    src.stop(t + 0.06);
  }

  /** One sixteenth of the 4-bar loop (64 steps). */
  private play(a: AudioContext, t: number, i: number) {
    const st = this.state;
    if (st === 'quiet') return;
    const bar = i % 16;
    // The anvil: a ring on beats 1 and 3, a ghost tap before 4.
    if (bar === 0 || bar === 8) {
      this.voice(a, t, 1320, 0.045, 0.5);
      this.voice(a, t, 1320 * 2.76, 0.016, 0.3, 'sine');
    } else if (bar === 14) this.voice(a, t, 880, 0.018, 0.12);
    // Every four bars at home, the motif rung softly an octave down.
    if (st === 'home' && i === 48) MOTIF.forEach((f, k) => this.voice(a, t + k * 0.22, f / 2, 0.03, 0.6));
    // Bass: eighths on D (B-flat in bar 3), from getting ready on.
    if (st !== 'home' && i % 2 === 0) this.voice(a, t, i >= 32 && i < 48 ? 58.27 : 73.42, st === 'fight' ? 0.11 : 0.07, 0.18, 'sawtooth');
    // Fight: toms on 1, the and of 2, and 4.
    if (st === 'fight' && (bar === 0 || bar === 6 || bar === 12)) this.voice(a, t, bar === 6 ? 150 : 120, 0.22, 0.22, 'sine', 55);
    // Tension: hats in sixteenths and the motif up high, a note a beat.
    if (st === 'fight' && this.tension > 0.5) {
      this.hat(a, t, i % 4 === 0 ? 0.05 : 0.025);
      if (i % 4 === 0) this.voice(a, t, MOTIF[(i / 4) % 4] * 2, 0.025, 0.25);
    }
  }
}
