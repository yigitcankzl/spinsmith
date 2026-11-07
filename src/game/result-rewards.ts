import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, MeshStandardMaterial, Object3D, TorusGeometry } from '@iwsdk/core';
import { playLevelUp, playUnlock, playXp, playStamp } from './audio.js';
import { COMFORT } from './comfort.js';
import { ARENAS } from './arenas.js';
import { maxRim } from './layout.js';
import type { ArenaLayout } from './layout.js';
import { Top } from './sim.js';
import type { Seal } from './sim.js';
import { itemKey, itemModel, ROWS, sealModel } from './forge.js';
import { MARK, VERB_CARD, verbReleasedAt } from './progress.js';
import type { ReleasedVerb } from './progress.js';
import { localDate, orderMet } from './orders.js';
import { comeBackCard } from './come-back.js';
import { circuitOf, CORES, EMBLEM_COLORS, EMBLEM_NAMES, RINGS, RIVALS, SEAL_BLURBS, SEAL_NAMES, roleOf, specFromBuild, TIPS } from './parts.js';
import { miniArena, OPPONENT_COLOR, ROOM, TopView } from './visuals.js';
import { BOUTS, CHAPTERS, MEDAL_TEXT, medalCount, medalsFrom, nextBout, nextGate } from './campaign.js';
import type { Bout } from './campaign.js';
import { RESULT_TIME, CAUSE_WINDOW, FINISH_WORD } from './match-constants.js';
import type { MatchSystem } from './match-system.js';


/** A readable name for an unlock key. */
/** The card shown while an unlock (or an order stamp) spins over the arena. */
function revealText(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'rival') return `NEW RIVAL!\n${id} · ${RIVALS.find((r) => r.name === id)?.style ?? ''}`;
  if (kind === 'stamp') return `ORDER DONE!\nStamp ${id} in your ledger`;
  if (kind === 'move') return `NEW MOVE: ${VERB_CARD[id as ReleasedVerb][0]}\n${VERB_CARD[id as ReleasedVerb][1]}`;
  return `NEW: ${unlockName(key)}\n${unlockBlurb(key)}`;
}

/** What a new thing does, in one line (so the card says why it matters and where to try it). */
function unlockBlurb(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'ring') return RINGS.find((r) => r.id === id)?.blurb ?? '';
  if (kind === 'core') return CORES.find((c) => c.id === id)?.blurb ?? '';
  if (kind === 'tip') return TIPS.find((t) => t.id === id)?.blurb ?? '';
  if (kind === 'seal') return `${SEAL_BLURBS[id as Seal]} · set it in the forge's Combat drawer`;
  if (kind === 'arena') return ARENAS.find((a) => a.name === id)?.rule ?? 'A new arena in the rotation';
  if (kind === 'paint') return 'Try it in the forge';
  if (kind === 'emblem') return 'Pick it in the forge, Look drawer';
  return '';
}

function unlockName(key: string): string {
  const [kind, id] = key.split(':');
  if (kind === 'paint') return 'New paint';
  if (kind === 'emblem') return `${EMBLEM_NAMES[Number(id)]} emblem glow`;
  if (kind === 'ledger') return 'Gilded ledger';
  if (kind === 'rival') return `${id} rival`;
  if (kind === 'arena') return `${id} arena`;
  if (kind === 'seal') return `${SEAL_NAMES[id as Seal]} strike`;
  const name = kind === 'ring' ? RINGS.find((r) => r.id === id)?.name : kind === 'tip' ? TIPS.find((t) => t.id === id)?.name : kind === 'core' ? CORES.find((c) => c.id === id)?.name : id;
  return `${name} ${kind}`;
}

/** The model shown when something is unlocked: the part, a paint pot, or the arena's miniature. */
function unlockModel(key: string, arenas: ArenaLayout[]): Object3D {
  const [kind, id] = key.split(':');
  if (kind === 'arena') return miniArena(arenas.find((a) => a.name === id) ?? arenas[0], true);
  if (kind === 'seal') return sealModel(id as Seal);
  if (kind === 'rival') {
    const r = RIVALS.find((x) => x.name === id);
    if (r) return new TopView(r.build, OPPONENT_COLOR).root;
  }
  if (kind === 'emblem' || kind === 'stamp' || kind === 'ledger' || kind === 'move') {
    // A struck medallion: the glow's color, the stamp's (or a new move's) orange, or the ledger's gold.
    const color = kind === 'emblem' ? EMBLEM_COLORS[Number(id)] : kind === 'stamp' || kind === 'move' ? 0xff8a2a : 0xffd34a;
    // Struck metal with a raised rim and a sunk face, so it reads as a coin while it turns, never a flat blob.
    const g = new Group();
    const metal = new MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.3, emissive: color, emissiveIntensity: 0.15 });
    const coin = new Mesh(new CylinderGeometry(0.02, 0.02, 0.003, 40), metal);
    coin.rotation.x = Math.PI / 2;
    const rim = new Mesh(new TorusGeometry(0.0195, 0.0018, 8, 40), metal);
    const boss = new Mesh(new CylinderGeometry(0.007, 0.008, 0.005, 24), new MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.4, roughness: 0.5 }));
    boss.rotation.x = Math.PI / 2;
    g.add(coin, rim, boss);
    return g;
  }
  for (const [, items] of ROWS) for (const item of items) if (itemKey(item) === key) return itemModel(item);
  return new Group();
}

/**
 * The result and reward flow: XP and level-ups for each round, marks, champions, Smith Orders and
 * campaign medals that outlive a match, then the reveals (each unlock spinning over the arena) and
 * the come-back card on the result.
 */
export class ResultRewards {
  constructor(private readonly m: MatchSystem) {}

  xpGained = 0;
  levelUpText = '';
  private levelStamped = false;
  /** Unlocks waiting to be shown over the arena, and the one showing. */
  reveals: string[] = [];
  reveal: { obj: Object3D; t: number } | null = null;
  /** One unlock shown per result card (the first session's part first); the rest wait for the next ones. */
  revealedHere = false;
  /** The come-back card (streak, tomorrow) still to show on this match's result. */
  comeBackPending = false;
  rewardHold = 0;
  boutEarned = 0;

  /** The match result's last card: the day streak, a new order tomorrow and the next bout. */
  private comeBackText() {
    const today = localDate(new Date());
    const p = this.m.progress;
    const next = verbReleasedAt(p.matches + 1);
    const card = comeBackCard(p.streak(today), null, nextBout(p.bouts, p.matches % 2 === 0, p.matches), next ? VERB_CARD[next][0] : undefined);
    // A won match's last card still says it was won: the score heads it on day one (one short line).
    const log = this.m.matchLog;
    return log.won && card.startsWith('COME BACK TOMORROW') ? card.replace('COME BACK TOMORROW', `WON ${log.score.replace(/ /g, '')} · COME BACK`) : card;
  }

  /** XP for the round just played; level-ups flare and ring, unlocks queue to be shown. */
  earn(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const before = this.m.progress.level;
    const award = this.m.progress.award({ won, finish: loser.finish, pocketPoints: loser.pocketPoints, perfect: this.m.lastPerfect && won, matchOver, matchWon, rival: loser === this.m.theirs || !won ? this.m.rival.name : undefined });
    this.xpGained = award.gained;
    this.m.matchLog.xp += award.gained;
    this.m.matchLog.rounds.push(`${won ? '' : '-'}${FINISH_WORD[loser.finish ?? 'spin']}`);
    playXp();
    console.log(`[XP] +${award.gained} -> Lv ${this.m.progress.level} (${(this.m.progress.fraction * 100).toFixed(0)}%)${award.unlocked.length ? ` unlocked ${award.unlocked.join(', ')}` : ''}`);
    if (award.levels.length) {
      playLevelUp();
      for (let i = 0; i < 3; i++) this.m.sparks.burst((Math.random() - 0.5) * 0.1, 0.02, (Math.random() - 0.5) * 0.1, 1);
      if (COMFORT.flashes) this.m.pillar.play(this.m.arena.layout, maxRim(this.m.arena.layout) + 0.01, this.m.arena.floorHeight(1), 0xffd34a);
      this.levelUpText = `LEVEL ${this.m.progress.level}!\n${this.m.progress.rank}${this.m.progress.level > before + 1 ? ` (+${this.m.progress.level - before})` : ''}`;
      if (!this.m.quietFirst || matchOver) {
        this.m.stamp.later(`LEVEL ${this.m.progress.level}!`, this.m.progress.rank.toUpperCase(), 'mine', 1.2, 1.5);
        this.levelStamped = true;
      }
    }
    // Match 1 reveals only its NEW MOVE: the Spur tip is the home note's next step, the rest wait on the board.
    this.reveals.push(...(this.m.quietFirst ? [] : award.unlocked));
    // The first session's own part goes first: the forge calls for it next.
    this.reveals.sort((a, b) => Number(b === 'tip:spur') - Number(a === 'tip:spur'));
    // One new hand verb per completed match: its card leads the reveals (after the first part).
    const verb = matchOver && !this.m.demo ? verbReleasedAt(this.m.progress.matches) : undefined;
    if (verb) this.reveals.splice(this.reveals[0] === 'tip:spur' ? 1 : 0, 0, `move:${verb}`);
    // Online matches give XP for your own result, but no marks, bouts, orders or champions.
    if (!this.m.demo && !this.m.online) this.trackComeBack(won, loser, matchOver, matchWon);
    // The forge is earned only after the player has actually raised a ramp. Finishing a match
    // without the hero verb repeats that one lesson instead of silently graduating it.
    if (matchOver && this.m.progress.guide === 'match') this.m.progress.advance('forge');
  }

  /**
   * What outlives the match: marks against this rival, a champion for a won match, and today's
   * order when this match plays it and the round or match fulfils it.
   */
  private trackComeBack(won: boolean, loser: Top, matchOver: boolean, matchWon: boolean) {
    const cause = this.m.lastShape && this.m.elapsed - this.m.lastShape.t < CAUSE_WINDOW ? this.m.lastShape.kind : null;
    let scarChanged = false;
    if (won && cause) {
      this.m.progress.recordScar(this.m.myBuild, 'shapes');
      scarChanged = true;
    }
    if (matchWon) {
      this.m.progress.recordScar(this.m.myBuild, 'wins');
      scarChanged = true;
    }
    if (scarChanged) this.m.myView.scars(this.m.progress.scarsFor(this.m.myBuild));
    const ko = loser.finish === 'pocket' || loser.finish === 'over' || loser.finish === 'burst';
    // In a brawl a bot's knockout is no mark against the rival (nor its circuit's clearing).
    const rivalOut = loser === this.m.theirs || !this.m.extras.length;
    const fresh = won && rivalOut ? this.m.progress.mark(this.m.rival.name, (matchWon ? MARK.beaten : 0) | (ko ? MARK.knockout : 0) | (cause ? MARK.shape : 0)) : 0;
    // Beating a circuit's champion for the first time clears the circuit: a moment of its own.
    const c = circuitOf(this.m.rival.name);
    if (fresh & MARK.beaten && c?.champion) {
      // In a campaign bout the map says it (BOSS DOWN, a chapter opening, the finale); free play keeps this stamp.
      if (!this.m.bout) {
        this.m.stamp.later(`${c.circuit.toUpperCase()} CLEARED!`, `${this.m.rival.name.toUpperCase()} IS BEATEN`, 'mine', 2.2, 1.5);
        playLevelUp();
      }
      const feat = c.circuit.startsWith('Cinder') ? 'cinder' : c.circuit.startsWith('Iron') ? 'iron' : 'crown';
      // In the campaign the chapter's boss bout earns it (trackBout); a rival met earlier in a bout does not.
      if (!this.m.bout) this.m.featDone(feat);
    }
    if (matchWon) this.m.progress.recordChampion(this.m.myBuild);
    const event = {
      rival: this.m.rival.name,
      arena: this.m.arena.layout.name,
      wonRound: won,
      finish: loser.finish,
      cause,
      cupCaughtInRound: this.m.cupCaughtInRound,
      matchWon,
      shutout: matchWon && this.m.theirPoints === 0,
      role: roleOf(specFromBuild(this.m.myBuild)),
      perfectInMatch: this.m.perfectInMatch,
      deskKo: this.m.desk.deskKoScored,
    };
    if (this.m.bout && !this.m.demo) this.trackBout(this.m.bout, event, matchOver, matchWon);
    const o = this.m.order;
    if (!this.m.orderMatch || !o || this.m.progress.hasOrder(o.date)) return;
    const met = orderMet(o, event);
    if (!met) return;
    const before = this.m.progress.level;
    const a = this.m.progress.completeOrder(o.date);
    this.m.progress.recordScar(this.m.myBuild, 'orders');
    this.m.myView.scars(this.m.progress.scarsFor(this.m.myBuild));
    console.log(`[ORDER] done: ${o.text} -> ${this.m.progress.stamps} stamps${a.unlocked.length ? `, unlocked ${a.unlocked.join(', ')}` : ''}`);
    this.reveals.unshift(`stamp:${this.m.progress.stamps}`);
    this.reveals.push(...a.unlocked);
    if (a.levels.length && !this.levelUpText) {
      playLevelUp();
      this.levelUpText = `LEVEL ${this.m.progress.level}!\n${this.m.progress.rank}${this.m.progress.level > before + 1 ? ` (+${this.m.progress.level - before})` : ''}`;
    }
  }

  /**
   * Medals earned in a bout this round build up through the match and are kept when it ends (won
   * or lost: a medal earned is earned). Each new one stamps in turn, then the map says what opened.
   */
  private trackBout(bout: Bout, event: Parameters<typeof medalsFrom>[1], matchOver: boolean, matchWon: boolean) {
    const earned = medalsFrom(bout, event, !!ROOM.poly);
    // A medal earned mid-match is said at once (feedback while the move is fresh); the match end sums up.
    const now = earned & ~1 & ~this.boutEarned & ~(this.m.progress.bouts[bout.id] ?? 0);
    this.boutEarned |= earned;
    if (!matchOver) {
      bout.medals.forEach((m, i) => {
        if (now & (2 << i) && !this.m.quietFirst) this.m.stamp.later('MEDAL!', MEDAL_TEXT[m].toUpperCase(), 'mine', 1.1, 1.1);
      });
      return;
    }
    const before = nextBout(this.m.progress.bouts);
    const { fresh, unlocked } = this.m.progress.recordBout(bout.id, this.boutEarned, matchWon);
    // One stamp for the bout (the queue keeps three; feats and levels share it), one for a new chapter.
    const got = bout.medals.filter((_, i) => fresh & (2 << i)).map((m) => MEDAL_TEXT[m].toUpperCase());
    const have = [1, 2, 4].filter((m) => (this.m.progress.bouts[bout.id] ?? 0) & m).length;
    const finale = !!(fresh & 1) && bout === BOUTS[BOUTS.length - 1];
    if (fresh & 1 && bout.boss) this.m.progress.feat((['cinder', 'iron', 'crown'] as const)[bout.chapter - 1]);
    // The finale's own stamps replace the bout's (the stamp queue holds three).
    if (fresh && !finale) {
      const word = fresh & 1 ? (bout.boss ? 'BOSS DOWN!' : 'BOUT WON!') : 'MEDAL!';
      this.m.stamp.later(word, `MEDAL ${have} OF 3${got.length ? ` · ${got.join(' · ')}` : ''}`, 'mine', 1.6, fresh & 1 && bout.boss ? 1.5 : 1.2);
      playStamp();
    }
    // The campaign's end: the last boss beaten for the first time is the game's finale.
    if (finale) {
      const medals = medalCount(this.m.progress.bouts);
      this.m.stamp.later('THE CROWN IS YOURS', 'EVERY CIRCUIT CLEARED', 'mine', 2.4, 1.6);
      this.m.stamp.later('SPINSMITH', `${medals} OF ${BOUTS.length * 3} MEDALS`, 'mine', 2, 1.4);
      this.levelUpText = `You took the Crown.\nThanks for playing. Medals, orders and brawls await`;
      this.m.celebrate = Math.max(this.m.celebrate, 4);
      playLevelUp();
    }
    const after = nextBout(this.m.progress.bouts);
    // A boss beaten without the medals to open the next chapter: say what is missing, right here.
    if (fresh & 1 && bout.boss && !finale && (!after || after.chapter <= bout.chapter) && nextGate(this.m.progress.bouts)) this.m.stamp.later('NOT YET', nextGate(this.m.progress.bouts).toUpperCase(), 'neutral', 1.8, 1.1);
    if (after && before && after.chapter > before.chapter) {
      this.m.stamp.later(`${CHAPTERS[after.chapter - 1].name.toUpperCase()} OPEN!`, `NEXT: ${after.rival.toUpperCase()} IN ${after.arena.toUpperCase()}`, 'mine', 1.8, 1.5);
      playLevelUp();
    }
    if (!this.m.quietFirst) this.reveals.push(...unlocked);
    if (import.meta.env.DEV) console.log(`[BOUT] ${bout.id} ${matchWon ? 'won' : 'lost'} bits ${this.m.progress.bouts[bout.id] ?? 0} (+${fresh}) next ${after?.id ?? '-'}${nextGate(this.m.progress.bouts) ? ` · ${nextGate(this.m.progress.bouts)}` : ''}`);
  }

  /** Shows a level-up, then each new unlock spinning over the arena before it flies off. */
  updateRewards(dt: number) {
    if (this.levelUpText && this.m.phase === 'result' && this.m.resultTimer < RESULT_TIME - 1.4 && (this.m.matchOver || !this.m.quietFirst)) {
      // A level the stamp already says keeps its beat, but the card does not say it twice.
      if (!this.levelStamped) this.m.label.set(this.levelUpText);
      this.levelUpText = '';
      this.levelStamped = false;
      // The level-up reads before the first unlock replaces it.
      this.rewardHold = 1.4;
      this.m.resultTimer = Math.max(this.m.resultTimer, 1.4 + 2.8);
    }
    if (this.rewardHold > 0) this.rewardHold -= dt;
    // Unlocks wait for the match's end (never between rounds), then show one after another.
    else if (!this.reveal && !this.m.replay && this.m.matchOver && this.reveals.length && this.m.phase === 'result' && this.m.resultTimer < RESULT_TIME - 1.4) {
      this.revealedHere = true;
      const key = this.reveals.shift()!;
      const obj = unlockModel(key, this.m.arenas);
      this.m.stage.add(obj);
      this.reveal = { obj, t: 0 };
      if (key.startsWith('stamp:')) playStamp();
      else playUnlock();
      this.m.label.set(revealText(key));
      // Keep the result up while it shows.
      this.m.resultTimer = Math.max(this.m.resultTimer, 2.8);
    } else if (this.comeBackPending && !this.reveal && !this.m.replay && this.m.matchOver && !this.reveals.length && this.m.phase === 'result' && this.m.resultTimer < 1.2) {
      // Once the result and every unlock have been read: why to come back tomorrow.
      this.comeBackPending = false;
      this.m.label.set(this.comeBackText());
    }
    const r = this.reveal;
    if (!r) return;
    r.t += dt;
    // A pinch moves on to the next one.
    if ((this.m.hands.left.justPinched || this.m.hands.right.justPinched) && r.t > 0.4 && r.t < 2) r.t = 2;
    const grow = Math.min(1, r.t / 0.3);
    const leave = Math.max(0, (r.t - 2) / 0.6);
    // Low over the arena's middle, clear of the card and the match bar behind it.
    r.obj.position.set(0, 0.055 + 0.008 * Math.sin(r.t * 3) + leave * 0.3, 0.03);
    r.obj.rotation.y += dt * 2.5;
    r.obj.scale.setScalar(1.6 * grow * (1 - leave));
    if (leave >= 1) {
      r.obj.removeFromParent();
      // Its own geometry. ponytail: materials stay (most are shared from materials.ts, and disposing
      // one forces a recompile stall); a few per-reveal ones leak, fine at one reveal per unlock.
      r.obj.traverse((o) => {
        const m = o as Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      this.reveal = null;
      // Its card stays readable a moment after the model flies off (a stamp may have covered its start).
      this.rewardHold = 1.5;
      this.m.resultTimer = Math.max(this.m.resultTimer, 1.5 + 1.3);
    }
  }
}
