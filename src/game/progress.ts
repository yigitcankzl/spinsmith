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
import { BOUTS, boutOpen } from './campaign.ts';
import { dayStreak } from './come-back.ts';
import type { BoutRecord } from './campaign.ts';

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
  8: 'rival:Sawtooth',
  10: 'rival:Bastion',
  12: 'rival:Comet',
  14: 'rival:Gearwright',
};

/** The newer arenas, opened beside a level's part or paint (the classics come with LEVEL_UNLOCKS). */
export const ARENA_UNLOCKS: Record<number, string> = {
  3: 'arena:Crucible Gate',
  5: 'arena:Twin Basins',
  6: 'arena:Ripple Pool',
  8: 'arena:Glacier Steps',
  9: 'arena:Sentinel Gates',
  10: 'arena:Neon Speedway',
  12: 'arena:Colossus Bowl',
  14: 'arena:Meteor Pit',
  15: 'arena:Titan Crater',
  16: 'arena:Bellows',
  17: 'arena:Orbit Foundry',
  18: 'arena:Gear Rink',
  19: 'arena:Ridge Raceway',
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
  3: 'seal:tilt',
  4: 'seal:rush',
  5: 'seal:ward',
  7: 'seal:magnet',
  9: 'seal:hammer',
};

/** Emblem glows earned by Smith Order stamps: this many stamps, this glow. */
export const STAMP_UNLOCKS: Record<number, string> = {
  5: 'emblem:5',
  10: 'emblem:6',
  15: 'emblem:7',
};

/**
 * Hand verbs past the first match's lessons (rip, ramp, Arena Forge, strike, Flick) arrive one per
 * completed match, most useful first (headless win points over doing nothing: spring +10, gust
 * +8.9, ember +7.4, rub +5.9, crossguard +5.1; cup, groove and wheel unmeasured). The value is the
 * completed-match count that releases the verb; its card shows as that match ends. Online, brawl
 * and the demo save (level 8) play with every verb.
 */
export const VERB_RELEASE = { spring: 1, gust: 2, ember: 3, rub: 4, crossguard: 5, cup: 6, groove: 7, wheel: 8 } as const;
export type ReleasedVerb = keyof typeof VERB_RELEASE;
/** The unlock card for each released verb: name, and what the hand does. */
export const VERB_CARD: Record<ReleasedVerb, [string, string]> = {
  spring: ['Rim Spring', 'Pinch the rim, pull inward, let go: it holds your top'],
  gust: ['Forge Gust', 'Sweep an open palm over the bowl toward a pocket'],
  ember: ['Ember Rivet', 'Pinch the hot rivet a clash throws out and plant it'],
  rub: ['Spin Rub', 'Run a fingertip along your top\'s rim, the way it turns'],
  crossguard: ['Crossguard', 'Two flat palms on the rim make a rail that saves you'],
  cup: ['Cup and sling', 'Jab the floor to catch a top, then pull and let go'],
  groove: ['Finger Groove', 'Slide an open fingertip along the floor, then lift'],
  wheel: ['Forge Wheel', 'Turn the wheel by the near rim to steer the current'],
};
/** The verb whose card shows when the completed-match count reaches `matches`, if any. */
export function verbReleasedAt(matches: number): ReleasedVerb | undefined {
  return (Object.keys(VERB_RELEASE) as ReleasedVerb[]).find((v) => VERB_RELEASE[v] === matches);
}

/** XP for finishing a Smith Order. */
export const ORDER_XP = 120;

/** Marks against a rival: beaten in a match, beaten in a round by knockout, by your own shape. */
export const MARK = { beaten: 1, knockout: 2, shape: 4 } as const;

/** A top that won a match, with its record. */
export interface Champion {
  build: TopBuild;
  wins: number;
}

/** A rival physically knocked past the real desk edge; newest trophies are shown on that desk. */
export interface DeskTrophy {
  rival: string;
  build: TopBuild;
  /** Arena-local direction of the crossed table edge. */
  angle: number;
  date: string;
}

export type OpeningZone = 'center' | 'edge' | 'ambush' | 'neutral';
export interface OpeningMemory {
  zone: OpeningZone;
  streak: number;
  x: number;
  z: number;
  outcome: string;
}

export interface TopScars {
  wins: number;
  shapes: number;
  orders: number;
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
  interrupt: "Stop a rival's big move",
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
/** Play dates kept for the day streak (a longer streak still counts up to this). */
const DAYS_KEPT = 400;

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
  /** Dates (YYYY-MM-DD) a match was finished on, the newest DAYS_KEPT: the day streak. */
  private days = new Set<string>();
  /** Marks (MARK bits) per rival name. */
  private marks: Record<string, number> = {};
  /** What each rival saw in the player's recent openings. */
  private openings: Record<string, OpeningMemory> = {};
  /** Visible history carried by a forged top, keyed by its physical build. */
  private scars: Record<string, TopScars> = {};
  /** Most recent first. */
  champions: Champion[] = [];
  /** The real desk remembers its three newest ring-outs. */
  deskTrophies: DeskTrophy[] = [];
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
  /** The Circuit Map: medal bits per bout id (campaign.ts), and losses in a row per bout. */
  bouts: BoutRecord = {};
  boutLosses: Record<string, number> = {};
  /** One hidden forge shard lives in each campaign bout. All fifteen open the Night Circuit. */
  private secrets = new Set<string>();
  private readonly storage: Storage | null;

  constructor(storage: Storage | null = null) {
    this.storage = storage;
    try {
      const raw = storage?.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as { level: number; xp: number; unlocked: string[]; quests: string[]; matches?: number; guide?: Guide; orders?: string[]; marks?: Record<string, number>; openings?: Record<string, OpeningMemory>; scars?: Record<string, TopScars>; champions?: Champion[]; deskTrophies?: DeskTrophy[]; order?: Order; arenaPin?: string | null; recentArenas?: string[]; playedArenas?: string[]; records?: { rip?: number; fastestKo?: number }; feats?: string[]; wonIn?: string[]; bouts?: BoutRecord; boutLosses?: Record<string, number>; secrets?: string[]; days?: string[] };
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
        for (const d of s.days ?? []) if (typeof d === 'string') this.days.add(d);
        this.marks = { ...(s.marks ?? {}) };
        this.openings = { ...(s.openings ?? {}) };
        this.scars = { ...(s.scars ?? {}) };
        this.champions = (s.champions ?? []).slice(0, CHAMPIONS).map((c) => ({ ...c, build: migrateBuild(c.build) }));
        this.deskTrophies = (s.deskTrophies ?? []).slice(0, CHAMPIONS).flatMap((t) =>
          t && typeof t.rival === 'string' && Number.isFinite(t.angle) && typeof t.date === 'string'
            ? [{ ...t, angle: Number(t.angle), build: migrateBuild(t.build) }]
            : [],
        );
        this.order = s.order ?? null;
        this.arenaPin = s.arenaPin ?? null;
        this.recentArenas = s.recentArenas ?? [];
        this.playedArenas = s.playedArenas ?? [];
        this.records = { ...(s.records ?? {}) };
        this.feats = new Set(s.feats ?? []);
        this.wonIn = new Set(s.wonIn ?? []);
        for (const [id, m] of Object.entries(s.bouts ?? {})) if (BOUTS.some((x) => x.id === id)) this.bouts[id] = (m | 0) & 7;
        this.boutLosses = { ...(s.boutLosses ?? {}) };
        for (const id of s.secrets ?? []) if (BOUTS.some((x) => x.id === id)) this.secrets.add(id);
        // Saves from before the Circuit Map: a circuit already cleared (its champion beaten) counts as
        // its chapter won with one medal a bout, so a veteran is not sent back to the first bout.
        if (!s.bouts && this.matches > 0) {
          const cleared: [number, string][] = [[1, 'Iron Keep'], [2, 'Sawtooth'], [3, 'Bastion']];
          for (const [chapter, champion] of cleared) if ((this.marks[champion] ?? 0) & MARK.beaten) for (const b of BOUTS) if (b.chapter === chapter) this.bouts[b.id] = 3;
        }
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

  /** A match was finished on this local date (YYYY-MM-DD): it counts toward the day streak. */
  playedOn(date: string) {
    if (this.days.has(date)) return;
    this.days.add(date);
    this.days = new Set([...this.days].sort().slice(-DAYS_KEPT));
    this.save();
  }

  hasPlayed(date: string) {
    return this.days.has(date);
  }

  /** Days in a row with a finished match, up to today (or yesterday while today is unplayed). */
  streak(today: string): number {
    return dayStreak(this.days, today);
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

  openingAgainst(rival: string): OpeningMemory | null {
    const m = this.openings[rival];
    return m ? { ...m } : null;
  }

  /** Remembers a launch. Repeating a zone builds a readable streak; changing it breaks the read. */
  rememberOpening(rival: string, zone: OpeningZone, x: number, z: number): OpeningMemory {
    const old = this.openings[rival];
    const next = { zone, streak: old?.zone === zone ? old.streak + 1 : 1, x, z, outcome: '' };
    this.openings[rival] = next;
    this.save();
    return { ...next };
  }

  finishOpening(rival: string, outcome: string) {
    const m = this.openings[rival];
    if (!m || m.outcome === outcome) return;
    m.outcome = outcome;
    this.save();
  }

  scarsFor(build: TopBuild): TopScars {
    return { ...(this.scars[buildKey(build)] ?? { wins: 0, shapes: 0, orders: 0 }) };
  }

  recordScar(build: TopBuild, kind: keyof TopScars) {
    const key = buildKey(build);
    const s = this.scars[key] ?? (this.scars[key] = { wins: 0, shapes: 0, orders: 0 });
    s[kind] = Math.min(12, s[kind] + 1);
    this.save();
  }

  /** A build won a match: it becomes (or stays) a champion, most recent first. */
  recordChampion(build: TopBuild) {
    const same = (b: TopBuild) => b.ring === build.ring && b.core === build.core && b.tip === build.tip;
    const old = this.champions.find((c) => same(c.build));
    this.champions = [{ build: { ...build }, wins: (old?.wins ?? 0) + 1 }, ...this.champions.filter((c) => c !== old)].slice(0, CHAMPIONS);
    this.save();
  }

  /** Keeps the defeated rival, not merely a counter: this is what appears beside the arena tomorrow. */
  recordDeskKo(rival: string, build: TopBuild, angle: number, date = new Date()) {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    this.deskTrophies = [{ rival, build: { ...build }, angle: Number.isFinite(angle) ? angle : 0, date: day }, ...this.deskTrophies].slice(0, CHAMPIONS);
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

  /**
   * A campaign bout ended: keeps any new medal bits, counts losses in a row (a win clears them), and
   * opens the arena of every bout now open. Returns the new bits and the keys unlocked.
   */
  recordBout(id: string, earned: number, won: boolean): { fresh: number; unlocked: string[] } {
    const before = this.bouts[id] ?? 0;
    const fresh = earned & ~before & 7;
    this.bouts[id] = before | (earned & 7);
    this.boutLosses[id] = won ? 0 : (this.boutLosses[id] ?? 0) + 1;
    const out: Award = { gained: 0, levels: [], unlocked: [] };
    for (const x of BOUTS) if (boutOpen(x, this.bouts)) this.unlock(`arena:${x.arena}`, out);
    this.save();
    return { fresh, unlocked: out.unlocked };
  }

  hasSecret(id: string) {
    return this.secrets.has(id);
  }

  get secretCount() {
    return this.secrets.size;
  }

  /** The hard remix opens only after the Crown and every hidden shard are both earned. */
  get nightUnlocked() {
    return this.secrets.size === BOUTS.length && BOUTS.every((b) => ((this.bouts[b.id] ?? 0) & 1) !== 0);
  }

  /** Claims a bout's single hidden shard. Returns false for an invalid or already claimed id. */
  collectSecret(id: string): boolean {
    if (this.secrets.has(id) || !BOUTS.some((b) => b.id === id)) return false;
    this.secrets.add(id);
    this.save();
    return true;
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
    this.days.clear();
    this.marks = {};
    this.openings = {};
    this.scars = {};
    this.champions = [];
    this.deskTrophies = [];
    this.order = null;
    this.arenaPin = null;
    this.recentArenas = [];
    this.playedArenas = [];
    this.records = {};
    this.feats = new Set();
    this.wonIn = new Set();
    this.bouts = {};
    this.boutLosses = {};
    this.secrets.clear();
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
        JSON.stringify({ level: this.level, xp: this.xp, unlocked: [...this.unlocked], quests: [...this.quests], matches: this.matches, guide: this.guide, orders: [...this.orders], marks: this.marks, openings: this.openings, scars: this.scars, champions: this.champions, deskTrophies: this.deskTrophies, order: this.order, arenaPin: this.arenaPin, recentArenas: this.recentArenas, playedArenas: this.playedArenas, records: this.records, feats: [...this.feats], wonIn: [...this.wonIn], bouts: this.bouts, boutLosses: this.boutLosses, secrets: [...this.secrets], days: [...this.days] }),
      );
    } catch {
      // Storage full or blocked (a private window): progress lives for this session only.
    }
  }
}

function buildKey(build: TopBuild) {
  return `${build.ring}|${build.core}|${build.tip}|${build.spin}|${build.color}|${build.emblem ?? 0}|${build.seal ?? 'anvil'}`;
}
