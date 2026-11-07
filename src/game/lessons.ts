/**
 * The first match's words. A ghost hand demonstrates each lesson in place (rip, ramp and forge),
 * so the card only names the gesture: every prompt here stays within
 * PROMPT_WORDS (checked headless in scripts/sim-check.ts). No three.js here.
 *
 * Probes look for some of these exact substrings: 'SQUEEZE INWARD', 'WRENCH IT OFF YOUR DESK',
 * 'PINCH BOTH GLOWS', 'PINCH + PULL: SPRING', 'PINCH + DRAG: RAMP'.
 */

/** The most words any first-match prompt may show (a rival's or seal's name counts). */
export const PROMPT_WORDS = 5;
/** The most words a NEW MOVE card's "how" line may show. */
export const CARD_HOW_WORDS = 4;

/** Words a player reads: tokens with a letter or digit ('·', '+', ':' and '→' are not words). */
export function promptWords(text: string): number {
  return text.split(/[\s·/→]+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export const LESSON = {
  /** The palm print where the arena rises. */
  palmPrint: 'PRESS YOUR PALM HERE',
  noTable: 'NO TABLE · MOVE BY HANDLE',
  hubLaunch: 'PUT YOUR TOP IN',
  hubMatch: 'FINISH YOUR FIRST MATCH',
  rip: 'PINCH, PULL BACK, RELEASE',
  ripPull: 'Pull back, let go',
  ramp: 'PINCH + DRAG: RAMP',
  forge: 'PINCH GLOWS · SQUEEZE INWARD',
  forgeOneHand: 'HOLD GLOW · PUSH INWARD',
  forgeDesk: 'WRENCH IT OFF YOUR DESK',
  forgeDone: 'WATCH THE TOPS REACT',
  forgeLost: 'CANCELLED · HANDS IN VIEW',
  forgeStill: 'CANCELLED · MOVE, THEN RELEASE',
  noCharge: 'No charge yet · refilling',
  strikeWindow: 'RIM OPEN · STRIKE NOW',
  flick: 'SWING A FINGER: FLICK',
  edgeRun: 'REAL EDGE = +1',
  palmCatch: 'OPEN PALM UNDER IT',
  palmCaught: 'SWEEP TO THE RIM',
  palmDropped: 'Dropped · palm under it',
  edgeKo: 'TABLE EDGE KO',
} as const;

/** Hover claims while the first session lasts: what a pinch here would do. */
export const CLAIM = {
  RAMP: 'PINCH + DRAG: RAMP',
  FORGE: 'PINCH BOTH GLOWS',
  RIM: 'PINCH + PULL: SPRING',
  CATCH: 'PRESS: CATCH',
  SLING: 'PINCH + PULL: SLING',
} as const;

export const lessonText = {
  /** The first match's rival card: name and title, no quote. */
  rival: (name: string, title: string) => `${name.toUpperCase()} · ${title.toUpperCase()}`,
  forgeLive: (title: string) => `${title} RELEASE`,
  strike: (seal: string) => `${seal.toUpperCase()}: PINCH + STAMP`,
  strikeNotReady: (pct: number) => `Strike not ready · ${pct}%`,
  overforge: (seal: string) => `${seal.toUpperCase()}: PINCH + STEER`,
};
