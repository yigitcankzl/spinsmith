/**
 * Player progression: XP from rounds and matches, smith levels 1-20 with ranks, and unlocks. Levels
 * open new options (parts, paints, arenas), never more power: every part is fair in a fight.
 * Two parts come from deeds instead of levels. No three.js or DOM here (storage is passed in).
 */

export const MAX_LEVEL = 20;

/** XP needed to go from this level to the next. */
export function xpToNext(level: number): number {
  return 200 + 120 * (level - 1);
}

export function rankOf(level: number): string {
  if (level >= 18) return 'Legend';
  if (level >= 13) return 'Master Smith';
  if (level >= 8) return 'Smith';
  if (level >= 4) return 'Journeyman';
  return 'Apprentice';
}

/** Unlock keys look like 'ring:hook', 'core:9-60', 'tip:orb', 'paint:2', 'arena:Sumo Square'. */
export const STARTERS = [
  'ring:striker',
  'ring:anvil',
  'ring:halo',
  'core:4-60',
  'tip:flat',
  'tip:ball',
  'tip:needle',
  'paint:0',
  'paint:1',
  'arena:Forge Bowl',
  'arena:Ember Ring',
];

/** What each level opens. */
export const LEVEL_UNLOCKS: Record<number, string> = {
  2: 'arena:Zero-G Dish',
  3: 'paint:2',
  4: 'core:3-50',
  5: 'ring:saw',
  6: 'tip:taper',
  7: 'arena:Clockwork Spire',
  8: 'core:5-80',
  9: 'ring:cog',
  10: 'tip:orb',
  11: 'arena:Frost Oval',
  12: 'paint:3',
  13: 'arena:Sumo Square',
};

/** Parts earned by a deed rather than a level. */
export const QUEST_UNLOCKS: Record<string, { key: string; text: string }> = {
  // The first session's reward: every new player earns one part, win or lose.
  first: { key: 'tip:rush', text: 'Finish your first match' },
  burst: { key: 'core:9-60', text: 'Win a round by BURST' },
  knockout: { key: 'ring:hook', text: 'Win a round by pocket or over' },
};

/** XP per round and match. */
export const XP = {
  roundWin: 60,
  roundLoss: 20,
  burst: 30,
  pocket: 25,
  over: 20,
  spin: 10,
  perfect: 15,
  matchWin: 150,
  matchLoss: 40,
};

/** How a key is earned ('Lv 6', or a deed), or null for starters and things never locked. */
export function unlockHint(key: string): string | null {
  for (const [lv, k] of Object.entries(LEVEL_UNLOCKS)) if (k === key) return `Lv ${lv}`;
  for (const q of Object.values(QUEST_UNLOCKS)) if (q.key === key) return q.text;
  return null;
}

/**
 * The first-session guide, in order: show how to launch; point at one arena move; after the first
 * match, send the player to the anvil; in the forge, have them fit the new part; then invite the
 * rematch; done.
 */
export type Guide = 'launch' | 'bump' | 'match' | 'forge' | 'fit' | 'rematch' | 'done';
export const GUIDE_ORDER: Guide[] = ['launch', 'bump', 'match', 'forge', 'fit', 'rematch', 'done'];

export interface RoundResult {
  won: boolean;
  /** How the losing top went out. */
  finish: 'pocket' | 'over' | 'burst' | 'spin' | null;
  /** Points of the pocket, when it was one (2 or 3). */
  pocketPoints?: number;
  perfect: boolean;
  /** The match was decided by this round. */
  matchOver: boolean;
  matchWon: boolean;
}

export interface Award {
  gained: number;
  /** Each level reached by this award, in order. */
  levels: number[];
  /** Keys unlocked by this award (levels and deeds), in order. */
  unlocked: string[];
}

export interface Storage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'spinsmith.progress.v1';

export class Progress {
  level = 1;
  /** XP into the current level. */
  xp = 0;
  /** Matches finished. */
  matches = 0;
  /** Where the first-session guide is (see Guide). */
  guide: Guide = 'launch';
  private unlocked = new Set(STARTERS);
  private quests = new Set<string>();
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = null) {
    this.storage = storage;
    try {
      const raw = storage?.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as { level: number; xp: number; unlocked: string[]; quests: string[]; matches?: number; guide?: Guide };
        this.matches = s.matches ?? 0;
        // Saves from before the guide existed skip it.
        this.guide = s.guide ?? (this.matches > 0 || s.level > 1 ? 'done' : 'launch');
        this.level = Math.min(MAX_LEVEL, Math.max(1, s.level | 0));
        this.xp = Math.max(0, s.xp | 0);
        for (const k of s.unlocked) this.unlocked.add(k);
        for (const q of s.quests) this.quests.add(q);
      }
    } catch {
      // A broken save starts over.
    }
  }

  get rank() {
    return rankOf(this.level);
  }

  /** How far into the current level (0..1). */
  get fraction() {
    return this.level >= MAX_LEVEL ? 1 : this.xp / xpToNext(this.level);
  }

  isUnlocked(key: string) {
    return this.unlocked.has(key);
  }

  /** The next level unlock ahead of you: its key and level, or null when all are open. */
  get next(): { key: string; level: number } | null {
    for (let lv = this.level + 1; lv <= MAX_LEVEL; lv++) {
      const key = LEVEL_UNLOCKS[lv];
      if (key && !this.unlocked.has(key)) return { key, level: lv };
    }
    return null;
  }

  /** How a locked key is earned ('Lv 6', or a deed), or null when it is open. */
  lockText(key: string): string | null {
    return this.unlocked.has(key) ? null : unlockHint(key);
  }

  /** XP for a round, with any level-ups and unlocks it brings. */
  award(r: RoundResult): Award {
    let gained = r.won ? XP.roundWin : XP.roundLoss;
    if (r.won && r.finish) gained += XP[r.finish] + (r.finish === 'pocket' && (r.pocketPoints ?? 2) > 2 ? 10 : 0);
    if (r.perfect) gained += XP.perfect;
    if (r.matchOver) gained += r.matchWon ? XP.matchWin : XP.matchLoss;
    const out: Award = { gained, levels: [], unlocked: [] };
    // Deeds.
    const deeds = [r.won && r.finish === 'burst' ? 'burst' : r.won && (r.finish === 'pocket' || r.finish === 'over') ? 'knockout' : null, r.matchOver ? 'first' : null];
    for (const deed of deeds) {
      if (!deed || this.quests.has(deed)) continue;
      this.quests.add(deed);
      this.unlock(QUEST_UNLOCKS[deed].key, out);
    }
    if (r.matchOver) this.matches++;
    // Levels.
    this.xp += gained;
    while (this.level < MAX_LEVEL && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      out.levels.push(this.level);
      const key = LEVEL_UNLOCKS[this.level];
      if (key) this.unlock(key, out);
    }
    if (this.level >= MAX_LEVEL) this.xp = 0;
    this.save();
    return out;
  }

  private unlock(key: string, out: Award) {
    if (this.unlocked.has(key)) return;
    this.unlocked.add(key);
    out.unlocked.push(key);
  }

  /** Moves the first-session guide on (only forward) and saves. */
  advance(to: Guide) {
    if (GUIDE_ORDER.indexOf(to) <= GUIDE_ORDER.indexOf(this.guide)) return;
    this.guide = to;
    this.save();
  }

  private save() {
    this.storage?.setItem(KEY, JSON.stringify({ level: this.level, xp: this.xp, unlocked: [...this.unlocked], quests: [...this.quests], matches: this.matches, guide: this.guide }));
  }
}
