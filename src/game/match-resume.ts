/**
 * A match interrupted by a reload or a closed session: a compact snapshot of where the next round
 * starts (score, round, the first session's lesson round, bout, builds, rival, arena and the
 * match's progress flags), never the live physics. Duels against the AI only: online, brawl, demo
 * and echo matches are never saved. No three.js or DOM here (storage is passed in).
 */
export const RESUME_KEY = 'spinsmith.resume.v1';
export const RESUME_VERSION = 1;
/** A snapshot older than this is a different evening: it is ignored and the game starts at home. */
export const RESUME_MAX_AGE = 12 * 3600 * 1000;

export interface MatchSnapshot {
  v: typeof RESUME_VERSION;
  /** Saved at (ms since epoch). */
  at: number;
  mine: number;
  theirs: number;
  /** Rounds played in this match (the interrupted round is `round + 1`). */
  round: number;
  tutorialRound: number;
  bout: string | null;
  rival: string;
  arena: string;
  /** encodeBuild codes: your top and the rival's. */
  myBuild: string;
  theirBuild: string;
  /** The match's flags: a perfect rip, came back from match point, the first hero ramp. */
  perfect: boolean;
  wasDown: boolean;
  heroRamp: boolean;
  /** The result card's per-round log. */
  rounds: string[];
}

interface ResumeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function encodeSnapshot(s: MatchSnapshot): string {
  return JSON.stringify(s);
}

/** The snapshot, or null when it is missing, malformed, from another version or too old. */
export function decodeSnapshot(raw: string | null, now = Date.now()): MatchSnapshot | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(raw) as Partial<MatchSnapshot> | null;
    if (!s || s.v !== RESUME_VERSION) return null;
    const ints = [s.at, s.mine, s.theirs, s.round, s.tutorialRound];
    if (!ints.every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return null;
    if (now - s.at! > RESUME_MAX_AGE || s.at! > now + 60_000) return null;
    if (typeof s.rival !== 'string' || typeof s.arena !== 'string' || typeof s.myBuild !== 'string' || typeof s.theirBuild !== 'string') return null;
    if (s.bout !== null && typeof s.bout !== 'string') return null;
    return {
      v: RESUME_VERSION,
      at: s.at!,
      mine: Math.floor(s.mine!),
      theirs: Math.floor(s.theirs!),
      round: Math.floor(s.round!),
      tutorialRound: Math.floor(s.tutorialRound!),
      bout: s.bout ?? null,
      rival: s.rival,
      arena: s.arena,
      myBuild: s.myBuild,
      theirBuild: s.theirBuild,
      perfect: s.perfect === true,
      wasDown: s.wasDown === true,
      heroRamp: s.heroRamp === true,
      rounds: Array.isArray(s.rounds) ? s.rounds.filter((r): r is string => typeof r === 'string').slice(0, 16) : [],
    };
  } catch {
    return null;
  }
}

export function saveSnapshot(s: MatchSnapshot, storage: ResumeStorage) {
  try {
    storage.setItem(RESUME_KEY, encodeSnapshot(s));
  } catch {
    // No storage: an interrupted match just starts again from home.
  }
}

/** Reads the snapshot; a stale or unreadable one is removed. */
export function loadSnapshot(storage: ResumeStorage, now = Date.now()): MatchSnapshot | null {
  try {
    const raw = storage.getItem(RESUME_KEY);
    const s = decodeSnapshot(raw, now);
    if (raw && !s) storage.removeItem(RESUME_KEY);
    return s;
  } catch {
    return null;
  }
}

export function clearSnapshot(storage: ResumeStorage) {
  try {
    storage.removeItem(RESUME_KEY);
  } catch {
    // Nothing to clear.
  }
}
