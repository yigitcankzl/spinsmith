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
  2: 'tip:rush',
  3: 'arena:Zero-G Dish',
  4: 'core:3-50',
  5: 'ring:saw',
  6: 'paint:2',
  7: 'tip:taper',
  8: 'arena:Clockwork Spire',
  9: 'core:5-80',
  10: 'ring:cog',
  11: 'tip:orb',
  12: 'arena:Frost Oval',
  13: 'paint:3',
  14: 'arena:Sumo Square',
};

/** Parts earned by a deed rather than a level. */
export const QUEST_UNLOCKS: Record<string, { key: string; text: string }> = {
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
  private unlocked = new Set(STARTERS);
  private quests = new Set<string>();
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = null) {
    this.storage = storage;
    try {
      const raw = storage?.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as { level: number; xp: number; unlocked: string[]; quests: string[] };
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
    const deed = r.won && r.finish === 'burst' ? 'burst' : r.won && (r.finish === 'pocket' || r.finish === 'over') ? 'knockout' : null;
    if (deed && !this.quests.has(deed)) {
      this.quests.add(deed);
      this.unlock(QUEST_UNLOCKS[deed].key, out);
    }
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

  private save() {
    this.storage?.setItem(KEY, JSON.stringify({ level: this.level, xp: this.xp, unlocked: [...this.unlocked], quests: [...this.quests] }));
  }
}
