/**
 * Echoes: how a smith played one match (each round's rip and the moments their two hands forged
 * the arena), carried after the challenge code as "K3F9-2.R7K_105Q", so a friend fights the way they
 * played, not just their top. No server: the code is the recording. No three.js or DOM here.
 */
import type { ArenaForgeAction } from './arena-forge.ts';

export interface EchoRip {
  /** Launch power 0..1. */
  power: number;
  /** Aim off straight in, in radians (within +-MAX). */
  aim: number;
}

export interface EchoForge {
  /** The round it happened in, from 0. */
  round: number;
  /** Seconds into that round's fight. */
  t: number;
  action: ArenaForgeAction;
  /** The direction of a twist or tilt (1 or -1); squeeze and stretch keep 1. */
  sign: 1 | -1;
}

export interface Echo {
  rips: EchoRip[];
  forges: EchoForge[];
}

/** Room on the code: five rounds of rips (a match is first to 3) and six forges. */
export const ECHO_RIPS = 5;
export const ECHO_FORGES = 6;
/** Where your last match's full code (build and echo) is kept for the board. */
export const ECHO_KEY = 'spinsmith.echo.v1';
/** The aim an echo can carry (the match's MAX_AIM). */
const MAX = 0.6;
/** Forge times step by a quarter second, up to two base-36 digits (about five minutes). */
const T_STEP = 0.25;
/** One letter per move and direction, so a code survives being typed in any case. */
const LETTERS: [ArenaForgeAction, 1 | -1, string][] = [['squeeze', 1, 'Q'], ['stretch', 1, 'S'], ['twist', 1, 'W'], ['twist', -1, 'X'], ['tilt', 1, 'L'], ['tilt', -1, 'M']];

const digit = (n: number) => Math.max(0, Math.min(35, Math.round(n))).toString(36).toUpperCase();

/** An echo as code text: R + two digits per rip, then _ + four characters per forge. */
export function encodeEcho(e: Echo): string {
  const rips = e.rips.slice(0, ECHO_RIPS).map((r) => digit(r.power * 35) + digit(((r.aim / MAX + 1) / 2) * 35)).join('');
  const forges = e.forges.slice(0, ECHO_FORGES).map((f) => {
    const t = Math.max(0, Math.min(36 * 36 - 1, Math.round(f.t / T_STEP))).toString(36).toUpperCase().padStart(2, '0');
    const sign = f.action === 'twist' || f.action === 'tilt' ? f.sign : 1;
    return digit(f.round) + t + LETTERS.find(([a, s]) => a === f.action && s === sign)![2];
  }).join('');
  return `R${rips}${forges ? `_${forges}` : ''}`;
}

/** Code text back to an echo, or null when it is not one. */
export function decodeEcho(text: string): Echo | null {
  const m = /^R((?:[0-9A-Z]{2})*)(?:_((?:[0-9A-Z]{3}[QSWXLM])+))?$/.exec(text.trim().toUpperCase());
  if (!m || !m[1]) return null;
  const rips: EchoRip[] = [];
  for (let i = 0; i < m[1].length && rips.length < ECHO_RIPS; i += 2) {
    rips.push({ power: parseInt(m[1][i], 36) / 35, aim: ((parseInt(m[1][i + 1], 36) / 35) * 2 - 1) * MAX });
  }
  const forges: EchoForge[] = [];
  const body = m[2] ?? '';
  for (let i = 0; i < body.length && forges.length < ECHO_FORGES; i += 4) {
    const [action, sign] = LETTERS.find((l) => l[2] === body[i + 3])!;
    forges.push({ round: parseInt(body[i], 36), t: parseInt(body.slice(i + 1, i + 3), 36) * T_STEP, action, sign });
  }
  return { rips, forges };
}

/** "BUILD-C.ECHO" into its two halves; the echo is null for a plain challenge code. */
export function splitCode(code: string): { build: string; echo: Echo | null } {
  const [build, echo = ''] = code.trim().toUpperCase().split('.');
  return { build, echo: echo ? decodeEcho(echo) : null };
}
