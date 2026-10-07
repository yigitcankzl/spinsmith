/**
 * Challenge codes: a top as a short code (its ring, core, tip, spin and paint), so a friend can
 * fight it: add ?vs=CODE to the game's address and the next match is against that top. No server:
 * the code is the build. No three.js or DOM here.
 */
import { CORES, RINGS, TIPS } from './parts.ts';
import type { TopBuild } from './parts.ts';

/** The paints a code can carry (the forge's, in order). */
const PAINTS = [0xe8661c, 0xc94a3a, 0xe0a63c, 0xb5654a, 0xe8d6b0, 0x9a5bb0];

/** A build as a code like "K3F9-2" (base 36 of the parts' indices, with a check digit). */
export function encodeBuild(b: TopBuild): string {
  const r = RINGS.findIndex((x) => x.id === b.ring);
  const c = CORES.findIndex((x) => x.id === b.core);
  const t = TIPS.findIndex((x) => x.id === b.tip);
  const p = Math.max(0, PAINTS.indexOf(b.color));
  const n = ((((r * CORES.length + c) * TIPS.length + t) * 2 + (b.spin === -1 ? 1 : 0)) * PAINTS.length + p) + 1000;
  const body = n.toString(36).toUpperCase();
  return `${body}-${(n % 7).toString()}`;
}

/** A code back to a build, or null when it is not one. */
export function decodeBuild(code: string): TopBuild | null {
  const m = /^([0-9A-Z]+)-(\d)$/.exec(code.trim().toUpperCase());
  if (!m) return null;
  let n = parseInt(m[1], 36);
  if (!Number.isFinite(n) || n % 7 !== Number(m[2]) || n < 1000) return null;
  n -= 1000;
  const p = n % PAINTS.length;
  n = Math.floor(n / PAINTS.length);
  const spin = n % 2 ? -1 : 1;
  n = Math.floor(n / 2);
  const t = n % TIPS.length;
  n = Math.floor(n / TIPS.length);
  const c = n % CORES.length;
  const r = Math.floor(n / CORES.length);
  if (r >= RINGS.length) return null;
  return { ring: RINGS[r].id, core: CORES[c].id, tip: TIPS[t].id, spin, color: PAINTS[p] };
}
