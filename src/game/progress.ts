/**
 * Player progression: XP from rounds and matches, smith levels 1-20 with ranks, and unlocks. Levels
 * open new options (parts, paints, arenas, rivals, emblem glows), never more power: every part is
 * fair in a fight. Three parts come from deeds instead of levels. Also kept here: the ledger of
 * Smith Order stamps, the marks earned against each rival, and your champion tops.
 * No three.js or DOM here (storage is passed in).
 */
import type { TopBuild } from './parts.ts';
import { migrateBuild, migrateKey } from './parts.ts';
import type { Order } from './orders.ts';

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

/** Unlock keys look like 'ring:hook', 'core:clamp', 'tip:bead', 'paint:2', 'arena:Sumo Square'. */
export const STARTERS = [
  'ring:striker',
  'ring:anvil',
  'ring:halo',
  'core:bolt',
  'tip:chisel',
  'tip:dome',
  'tip:pin',
  'paint:0',
  'paint:1',
  'arena:Forge Bowl',
  'arena:Ember Ring',
];

/** What each level opens. A rival's signature part opens by level a few levels after that rival
 * arrives, so knocking the rival out is the early way to it. */
export const LEVEL_UNLOCKS: Record<number, string> = {
  2: 'arena:Zero-G Dish',
  3: 'paint:2',
  4: 'core:stub',
  5: 'tip:awl',
  6: 'paint:3',
  7: 'arena:Clockwork Spire',
  8: 'paint:4',
  9: 'paint:5',
  10: 'ring:hook',
  11: 'arena:Frost Oval',
  12: 'ring:cog',
  13: 'arena:Sumo Square',
  14: 'ring:saw',
  15: 'emblem:1',
  16: 'core:stilt',
  17: 'emblem:2',
  18: 'emblem:3',
  19: 'emblem:4',
  20: 'ledger:gold',
};

/** Rivals that join at a level (the first three are there from the start); announced like unlocks. */
export const RIVAL_UNLOCKS: Record<number, string> = {
  4: 'rival:Leech',
  6: 'rival:Hookjaw',
  9: 'rival:Sawtooth',
  12: 'rival:Bastion',
};

/** The newer arenas, opened beside a level's part or paint (the classics come with LEVEL_UNLOCKS). */
export const ARENA_UNLOCKS: Record<number, string> = {
  2: 'arena:Titan Crater',
  3: 'arena:Orbit Foundry',
  5: 'arena:Twin Basins',
  6: 'arena:Ripple Pool',
  8: 'arena:Glacier Steps',
  10: 'arena:Neon Speedway',
  14: 'arena:Meteor Pit',
  18: 'arena:Colossus Bowl',
  20: 'arena:Grand Anvil',
};

/** Each rival's signature part: knock that rival out once and it is yours (if a level has not opened it already). */
export const RIVAL_SIGNATURE: Record<string, string> = {
  'Rim Raider': 'ring:gale',
  'Iron Keep': 'ring:bulwark',
  Drifter: 'core:spindle',
  Leech: 'ring:cog',
  Hookjaw: 'ring:hook',
  Sawtooth: 'ring:saw',
  Bastion: 'core:stilt',
};

/** Strike seals (docs/DUEL-DESIGN.md): the Anvil Strike is yours from the start. */
export const SEAL_UNLOCKS: Record<number, string> = {
  4: 'seal:rush',
  7: 'seal:magnet',
  10: 'seal:tilt',
  13: 'seal:hammer',
  16: 'seal:ward',
};

/** Emblem glows earned by Smith Order stamps: this many stamps, this glow. */
export const STAMP_UNLOCKS: Record<number, string> = {
  5: 'emblem:5',
  10: 'emblem:6',
  15: 'emblem:7',
};

/** XP for finishing a Smith Order. */
export const ORDER_XP = 120;

/** Marks against a rival: beaten in a match, beaten in a round by knockout, by your own shape. */
export const MARK = { beaten: 1, knockout: 2, shape: 4 } as const;

/** A top that won a match, with its record. */
export interface Champion {
  build: TopBuild;
  wins: number;
}
/** How many champions stand at home. */
export const CHAMPIONS = 3;

/** Parts earned by a deed rather than a level. */
export const QUEST_UNLOCKS: Record<string, { key: string; text: string }> = {
  // The first session's reward: every new player earns one part, win or lose.
  first: { key: 'tip:spur', text: 'Finish your first match' },
  burst: { key: 'core:clamp', text: 'Win a round by SHATTER' },
  knockout: { key: 'tip:bead', text: 'Win a round by slag pit or throw' },
};

/** Feats: ways of winning, each earned once, mostly with your hands. */
export const FEATS: Record<string, string> = {
  ramp: 'Ramp a rival out',
  sling: 'Sling a rival into a pit',
  strike: 'Knock a rival out with your strike',
  interrupt: "Cut a rival's big move short",
  whiteHot: 'Rip white hot',
  flawless: 'Win a match without giving up heat',
  comeback: 'Win a match from match point down',
  hammer: 'Shatter a rival with the Hammer',
  cinder: 'Clear the Cinder Circuit',
  iron: 'Clear the Iron Circuit',
  crown: 'Take the Crown',
  everyArena: 'Win in ten different arenas',
  offDesk: 'Knock a rival off your real table',
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
  const ways: string[] = [];
  for (const [rival, k] of Object.entries(RIVAL_SIGNATURE)) if (k === key) ways.push(`Knock out ${rival}`);
  for (const q of Object.values(QUEST_UNLOCKS)) if (q.key === key) ways.push(q.text);
  for (const [n, k] of Object.entries(STAMP_UNLOCKS)) if (k === key) ways.push(`${n} order stamps`);
  for (const [lv, k] of [...Object.entries(LEVEL_UNLOCKS), ...Object.entries(ARENA_UNLOCKS), ...Object.entries(SEAL_UNLOCKS)]) if (k === key) ways.push(`Lv ${lv}`);
  return ways.length ? ways.join(' or ') : null;
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
  /** The rival faced (for its signature part). */
  rival?: string;
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
  /** Dates (YYYY-MM-DD) whose Smith Order was done: one stamp each. */
  private orders = new Set<string>();
  /** Marks (MARK bits) per rival name. */
  private marks: Record<string, number> = {};
  /** Most recent first. */
  champions: Champion[] = [];
  /** Today's order, kept once made so a level-up mid-day does not change it. */
  private order: Order | null = null;
  /** The arena the player pinned (null: the rotation picks), arenas played most recent first, and every arena played once. */
  arenaPin: string | null = null;
  recentArenas: string[] = [];
  playedArenas: string[] = [];
  /** Feats earned (FEATS keys). */
  feats = new Set<string>();
  /** Arenas a match has been won in. */
  wonIn = new Set<string>();
  /** Personal bests: the hardest rip (power 0..1) and the fastest knockout win (s). */
  records: { rip?: number; fastestKo?: number } = {};
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = null) {
    this.storage = storage;
    try {
      const raw = storage?.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as { level: number; xp: number; unlocked: string[]; quests: string[]; matches?: number; guide?: Guide; orders?: string[]; marks?: Record<string, number>; champions?: Champion[]; order?: Order; arenaPin?: string | null; recentArenas?: string[]; playedArenas?: string[]; records?: { rip?: number; fastestKo?: number }; feats?: string[]; wonIn?: string[] };
        this.matches = s.matches ?? 0;
        // Saves from before the guide existed skip it.
        this.guide = s.guide ?? (this.matches > 0 || s.level > 1 ? 'done' : 'launch');
        this.level = Math.min(MAX_LEVEL, Math.max(1, s.level | 0));
        this.xp = Math.max(0, s.xp | 0);
        for (const k of s.unlocked) this.unlocked.add(migrateKey(k));
        // Saves from before an unlock was added still get everything their level has opened.
        for (let lv = 2; lv <= this.level; lv++) for (const m of [LEVEL_UNLOCKS, ARENA_UNLOCKS, SEAL_UNLOCKS, RIVAL_UNLOCKS]) if (m[lv]) this.unlocked.add(m[lv]);
        for (const q of s.quests) this.quests.add(q);
        for (const d of s.orders ?? []) this.orders.add(d);
        this.marks = { ...(s.marks ?? {}) };
        this.champions = (s.champions ?? []).slice(0, CHAMPIONS).map((c) => ({ ...c, build: migrateBuild(c.build) }));
        this.order = s.order ?? null;
        this.arenaPin = s.arenaPin ?? null;
        this.recentArenas = s.recentArenas ?? [];
        this.playedArenas = s.playedArenas ?? [];
        this.records = { ...(s.records ?? {}) };
        this.feats = new Set(s.feats ?? []);
        this.wonIn = new Set(s.wonIn ?? []);
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
      for (const key of [LEVEL_UNLOCKS[lv], ARENA_UNLOCKS[lv]]) if (key && !this.unlocked.has(key)) return { key, level: lv };
    }
    return null;
  }

  /** How a locked key is earned ('Lv 6', or a deed), or null when it is open. */
  lockText(key: string): string | null {
    return this.unlocked.has(key) ? null : unlockHint(key);
  }

  /** XP for a round, with any level-ups and unlocks it brings. */
  award(r: RoundResult, bonus?: number): Award {
    let gained = bonus ?? (r.won ? XP.roundWin : XP.roundLoss);
    if (r.won && r.finish) gained += XP[r.finish];
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
    // A rival knocked out hands over its signature part.
    // (Not in the first session, which already gives plenty.)
    if (this.guide === 'done' && r.won && r.rival && (r.finish === 'pocket' || r.finish === 'over' || r.finish === 'burst') && RIVAL_SIGNATURE[r.rival]) this.unlock(RIVAL_SIGNATURE[r.rival], out);
    if (r.matchOver) this.matches++;
    // Levels.
    this.xp += gained;
    while (this.level < MAX_LEVEL && this.xp >= xpToNext(this.level)) {
      this.xp -= xpToNext(this.level);
      this.level++;
      out.levels.push(this.level);
      const key = LEVEL_UNLOCKS[this.level];
      if (key) this.unlock(key, out);
      const arena = ARENA_UNLOCKS[this.level];
      if (arena) this.unlock(arena, out);
      const seal = SEAL_UNLOCKS[this.level];
      if (seal) this.unlock(seal, out);
      const rival = RIVAL_UNLOCKS[this.level];
      if (rival) this.unlock(rival, out);
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

  /** Gives a rival's signature part outright (the demo save's knocked-out rivals). */
  claimSignature(rival: string) {
    const key = RIVAL_SIGNATURE[rival];
    if (key) this.unlocked.add(key);
    this.save();
  }

  /** Stamps in the ledger. */
  get stamps() {
    return this.orders.size;
  }

  /** The order for a date: the one already made that day, else a new one from `make`. */
  orderFor(date: string, make: () => Order): Order {
    if (this.order?.date !== date) {
      this.order = make();
      this.save();
    }
    return this.order;
  }

  hasOrder(date: string) {
    return this.orders.has(date);
  }

  /** Today's order is done: a stamp, its XP (with any level-ups) and any glow it earns. */
  completeOrder(date: string): Award {
    const out: Award = { gained: 0, levels: [], unlocked: [] };
    if (this.orders.has(date)) return out;
    this.orders.add(date);
    const glow = STAMP_UNLOCKS[this.orders.size];
    if (glow) this.unlock(glow, out);
    const more = this.award({ won: false, finish: null, perfect: false, matchOver: false, matchWon: false }, ORDER_XP);
    return { gained: more.gained, levels: more.levels, unlocked: [...out.unlocked, ...more.unlocked] };
  }

  marksOf(rival: string): number {
    return this.marks[rival] ?? 0;
  }

  /** Adds marks against a rival; returns the marks that are new. */
  mark(rival: string, bits: number): number {
    const before = this.marksOf(rival);
    const fresh = bits & ~before;
    if (fresh) {
      this.marks[rival] = before | bits;
      this.save();
    }
    return fresh;
  }

  /** A build won a match: it becomes (or stays) a champion, most recent first. */
  recordChampion(build: TopBuild) {
    const same = (b: TopBuild) => b.ring === build.ring && b.core === build.core && b.tip === build.tip;
    const old = this.champions.find((c) => same(c.build));
    this.champions = [{ build: { ...build }, wins: (old?.wins ?? 0) + 1 }, ...this.champions.filter((c) => c !== old)].slice(0, CHAMPIONS);
    this.save();
  }

  /** A match starts in this arena: it becomes the most recent and counts as played. */
  playedArena(name: string) {
    this.recentArenas = [name, ...this.recentArenas.filter((a) => a !== name)].slice(0, 8);
    if (!this.playedArenas.includes(name)) this.playedArenas.push(name);
    this.save();
  }

  /** Earns a feat; true only the first time. */
  feat(id: string): boolean {
    if (!(id in FEATS) || this.feats.has(id)) return false;
    this.feats.add(id);
    this.save();
    return true;
  }

  /** A match won in an arena; true when that makes ten different ones. */
  wonMatchIn(arena: string): boolean {
    this.wonIn.add(arena);
    this.save();
    return this.wonIn.size >= 10;
  }

  /** A new personal best? Higher is better for 'rip', lower for 'fastestKo'. Saves it when it is. */
  best(kind: 'rip' | 'fastestKo', value: number): boolean {
    const old = this.records[kind];
    const better = old === undefined ? true : kind === 'rip' ? value > old + 1e-9 : value < old - 1e-9;
    if (!better) return false;
    this.records[kind] = value;
    this.save();
    return old !== undefined;
  }

  /** Pins an arena for every match (null: back to the rotation). */
  pinArena(name: string | null) {
    this.arenaPin = name;
    this.save();
  }

  /** Starts over as a new smith: level 1, the first session, nothing earned. */
  reset() {
    this.level = 1;
    this.xp = 0;
    this.matches = 0;
    this.guide = 'launch';
    this.unlocked = new Set(STARTERS);
    this.quests.clear();
    this.orders.clear();
    this.marks = {};
    this.champions = [];
    this.order = null;
    this.arenaPin = null;
    this.recentArenas = [];
    this.playedArenas = [];
    this.records = {};
    this.feats = new Set();
    this.wonIn = new Set();
    this.save();
  }

  /** Moves the first-session guide on (only forward) and saves. */
  advance(to: Guide) {
    if (GUIDE_ORDER.indexOf(to) <= GUIDE_ORDER.indexOf(this.guide)) return;
    this.guide = to;
    this.save();
  }

  private save() {
    try {
      this.storage?.setItem(
        KEY,
        JSON.stringify({ level: this.level, xp: this.xp, unlocked: [...this.unlocked], quests: [...this.quests], matches: this.matches, guide: this.guide, orders: [...this.orders], marks: this.marks, champions: this.champions, order: this.order, arenaPin: this.arenaPin, recentArenas: this.recentArenas, playedArenas: this.playedArenas, records: this.records, feats: [...this.feats], wonIn: [...this.wonIn] }),
      );
    } catch {
      // Storage full or blocked (a private window): progress lives for this session only.
    }
  }
}
