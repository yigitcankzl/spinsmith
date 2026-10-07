/**
 * All game sound is synthesized with WebAudio: no audio files, no licensing, tiny download.
 * The context starts on first use; entering XR is a user gesture, so it is allowed to play.
 */

import { COMFORT } from './comfort.js';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
/** While paused, no sound may wake the context back up. */
let pausedAudio = false;
/** Where the next sounds sit left to right (-1..1), set around an event by at(). */
let panNow = 0;

/** Plays `fn`'s sounds from an arena-local x (the arena is about 0.15-0.18 across a half). */
function at(x: number, fn: () => void) {
  panNow = Math.max(-1, Math.min(1, x / 0.18)) * 0.7;
  fn();
  panNow = 0;
}

/** Where a sound goes: the master bus, through a stereo panner when it sits to one side. */
function out(a: AudioContext): AudioNode {
  if (panNow === 0 || !a.createStereoPanner) return master!;
  const p = a.createStereoPanner();
  p.pan.value = panNow;
  p.connect(master!);
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
    master.gain.value = 0.7;
    // A limiter at the end: stacked bursts, clashes and hums never clip.
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    master.connect(limiter).connect(ctx.destination);
    // One second of white noise, reused by every noisy sound.
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended' && !pausedAudio) void ctx.resume();
  master!.gain.value = COMFORT.sound ? 0.7 : 0;
  return ctx;
}

/** Applies the comfort dial's sound setting at once (hums keep running). */
export function applySound() {
  if (master) master.gain.value = COMFORT.sound ? 0.7 : 0;
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

/** Metal-on-metal clash: a noisy crack plus inharmonic ringing partials. */
export function playClash(strength: number, x = 0) {
  at(x, () => clash(strength));
}

function clash(strength: number) {
  const s = Math.min(1, Math.max(0.15, strength));
  hiss(0.5 * s, 0.06, 4000, 2500, 0.8);
  const base = 1500 + Math.random() * 400;
  tone(base, 0.12 * s, 0.25, 'triangle');
  tone(base * 1.47, 0.08 * s, 0.18, 'sine');
  tone(base * 2.13, 0.05 * s, 0.12, 'sine');
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

/** Dropping into a pocket: a hollow thunk and a falling tone. */
export function playPocket(x = 0) {
  at(x, () => {
    tone(140, 0.4, 0.3, 'sine', 0, 55);
    hiss(0.2, 0.15, 900, 300, 2);
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
    this.osc.connect(this.filter);
    this.osc2.connect(this.filter);
    this.filter.connect(this.gain).connect(master!);
    this.osc.start();
    this.osc2.start();
  }

  /** spin 0..1 (0 = silent), speed in m/s, wobble 0..1. */
  update(spin: number, speed: number, wobble: number, time: number) {
    const a = audio();
    if (!a) return;
    if (!this.osc) this.start(a);
    const t = a.currentTime;
    const waver = 1 + wobble * 0.08 * Math.sin(time * 18);
    const f = (this.base * (0.45 + 0.75 * spin)) * waver;
    this.osc!.frequency.setTargetAtTime(f, t, 0.05);
    this.osc2!.frequency.setTargetAtTime(f * 2.01, t, 0.05);
    this.filter!.frequency.setTargetAtTime(400 + 2600 * spin, t, 0.05);
    const loud = spin > 0 ? 0.025 + 0.05 * spin + 0.04 * Math.min(1, speed) : 0;
    this.gain!.gain.setTargetAtTime(loud, t, 0.08);
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
 * A quiet forge loop under home, the forge and the workshop: a low bellows drone and a hammer
 * on the anvil every other beat, ducked under a fight. Synthesized and scheduled a beat ahead.
 */
export class ForgeLoop {
  private bus: GainNode | null = null;
  private drone: OscillatorNode | null = null;
  private next = 0;
  private beat = 0;

  /** level 0..1; call every frame. */
  update(level: number) {
    const a = audio();
    if (!a || !master) return;
    if (!this.bus) {
      this.bus = a.createGain();
      this.bus.gain.value = 0;
      this.bus.connect(master);
      const f = a.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 180;
      this.drone = a.createOscillator();
      this.drone.type = 'sawtooth';
      this.drone.frequency.value = 55;
      const g = a.createGain();
      g.gain.value = 0.05;
      this.drone.connect(f).connect(g).connect(this.bus);
      this.drone.start();
      this.next = a.currentTime + 0.1;
    }
    this.bus.gain.setTargetAtTime(level, a.currentTime, 0.4);
    // Schedule the coming beat (0.75 s): a hammer ring on even beats, a soft tap on odd ones.
    while (this.next < a.currentTime + 0.2) {
      const t = this.next;
      const even = this.beat % 2 === 0;
      const ring = (freq: number, gain: number, decay: number) => {
        const o = a.createOscillator();
        const g = a.createGain();
        o.type = 'triangle';
        o.frequency.value = freq;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
        o.connect(g).connect(this.bus!);
        o.start(t);
        o.stop(t + decay + 0.02);
      };
      if (even) {
        ring(1320, 0.05, 0.5);
        ring(1320 * 2.76, 0.02, 0.3);
      } else ring(880, 0.02, 0.15);
      this.beat++;
      this.next += 0.75;
    }
  }
}
