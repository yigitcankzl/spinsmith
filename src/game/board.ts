/**
 * The Smith's board, centred over the arena's far rim at home. Its front shows the one thing that
 * matters today: the Smith Order, with the ledger as a row of stamps (point at it and pinch to take
 * the order). Its back, shown while asked for (a pinch on the level plate), holds the rest: the
 * rivals as medallions with the three marks earned against each, the ledger in full, feats and
 * your top's challenge code. One machined plate, one canvas, one draw call.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { streakTitle, tomorrowLine } from './come-back.js';
import { boardHead, ledgerLine, mapHead, ORDER_DONE_SUB, orderShort } from './hub-copy.js';
import type { Order } from './orders.js';
import { ARENA_SCALE } from './reach.js';
import { addSlab, engrave, metalPlate, ORANGE, PLATE_DEPTH, pxPerM, setType, signTexture, STEEL, TEXT, TEXT_DIM, wrap } from './ui.js';

/** One bout of the Circuit Map's current chapter (campaign.ts). */
export interface BoardBout {
  id: string;
  rival: string;
  /** Medal bits: win 1, then the bout's two medals 2 and 4. */
  medals: number;
  open: boolean;
  boss: boolean;
  /** The bout the map offers next. */
  next: boolean;
  /** Its medals still to earn ('ramp KO · no heat lost'), or '' (shown while the bout is pointed at). */
  left: string;
}

export interface BoardMap {
  chapter: string;
  bouts: BoardBout[];
  medals: number;
  of: number;
  /** What opens the next chapter, or ''. */
  gate: string;
  /** The gate at rest, within HUB_WORDS ('BEAT IRON KEEP', 'IRON CIRCUIT: 3 MEDALS'), or ''. */
  gateShort: string;
}

export interface BoardState {
  order: Order | null;
  done: boolean;
  /** Tomorrow's order, teased once today's is done. */
  tomorrow: Order | null;
  stamps: number;
  /** Stamps needed for the next glow, or null when all are earned. */
  nextGlow: number | null;
  map: BoardMap;
  gilded: boolean;
  /** Feats earned, of how many. */
  feats: number;
  featsOf: number;
  /** Your top's challenge code (a friend opens the game with it to fight your top). */
  code: string;
  /** One compact persistent-history line that makes returning progress visible at a glance. */
  history: string;
  /** Days in a row with a finished match (come-back.ts dayStreak), and whether today counts yet. */
  streak: number;
  playedToday: boolean;
}

const W = 1200;
const H = 480;
/** Seen from about this far (m): over the far rim, in the read band. */
const DIST = 1.2;
/** The medallion row and its one caption end above this canvas y (the map's pointable band). */
const MAP_ROW_BOTTOM = 230;
/** A finished ledger and a top with every mark: white-hot steel, not gold (gold teaches). */
const GILT = '#ffffff';

export class SmithBoard {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';
  private readonly k: number;

  /** `width` in arena-local units (ARENA_SCALE world metres each). */
  constructor(private readonly width = 0.3) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.tex = signTexture(this.canvas);
    this.k = pxPerM(W, width * ARENA_SCALE);
    this.mesh = new Mesh(new PlaneGeometry(width, (width * H) / W), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'smith-board';
    addSlab(this.mesh, width, (width * H) / W, 0.06, PLATE_DEPTH / ARENA_SCALE);
  }

  /** A point on the board's plane in its own space (x, y) as canvas px, or null off the plate. */
  pxAt(x: number, y: number): [number, number] | null {
    const u = x / this.width + 0.5;
    const v = 0.5 - (y * W) / (this.width * H);
    return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? [u * W, v * H] : null;
  }

  /**
   * Draws the order side, or (back) the Circuit Map and the ledger; redraws only on change. `at` is
   * where a hand points on the board (canvas px), or null: at rest every line keeps to HUB_WORDS and
   * the map names one bout; pointed at, the board shows its detail (on the map, the pointed bout's).
   */
  draw(s: BoardState, back = false, at: readonly [number, number] | null = null) {
    // Only which bout is pointed at matters on the back, and only pointed-or-not on the front.
    const bout = back && at ? this.boutAt(s, at) : -1;
    const key = JSON.stringify(s) + back + (at !== null) + bout;
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    metalPlate(g, W, H);
    if (s.gilded) {
      g.strokeStyle = GILT;
      g.lineWidth = 4;
      g.strokeRect(14, 14, W - 28, H - 28);
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    if (back) this.drawBack(g, s, at !== null, bout);
    else this.drawOrder(g, s, at !== null);
    this.tex.needsUpdate = true;
  }

  private drawOrder(g: CanvasRenderingContext2D, s: BoardState, hover: boolean) {
    setType(g, 'caption', this.k, DIST);
    // At rest: a streak at risk (or the order's state), the goal and the rival; pointed at, the
    // whole order, the streak it keeps alive and its one action. PLAY stays the call to action.
    const risk = s.streak > 0 && !s.playedToday;
    const head = s.done ? 'ORDER DONE' : "TODAY'S ORDER";
    const top = hover ? (s.streak > 0 ? `${head} · ${streakTitle(s.streak, s.playedToday)}` : head) : boardHead(risk ? streakTitle(s.streak, false) : null, s.done);
    engrave(g, top, W / 2, 62, risk ? ORANGE : TEXT_DIM, W - 120);
    if (s.order) {
      const [title, sub] = orderShort(s.order);
      const t = setType(g, 'title', this.k, DIST);
      const lines = hover ? wrap(g, s.order.text, W - 140, 2) : [title];
      const y0 = 168 - ((lines.length - 1) * t * 1.15) / 2;
      lines.forEach((l, i) => engrave(g, l, W / 2, y0 + i * t * 1.15, s.done ? TEXT_DIM : TEXT, W - 140));
      setType(g, 'caption', this.k, DIST);
      const next = tomorrowLine(s.tomorrow);
      const line = hover ? (s.done ? next : `${s.order.arena} · PINCH TO PLAY`) : s.done ? ORDER_DONE_SUB : sub;
      engrave(g, line.toUpperCase(), W / 2, 292, hover && !s.done ? ORANGE : STEEL, W - 120);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(80, 334, W - 160, 3);
    this.drawStamps(g, s, 398);
  }

  /** The map's bout column under canvas point `at`, or -1 (only over the medallion row). */
  private boutAt(s: BoardState, at: readonly [number, number]): number {
    const n = s.map.bouts.length;
    const i = Math.floor(((at[0] - 40) / (W - 80)) * n);
    return at[1] < MAP_ROW_BOTTOM && i >= 0 && i < n ? i : -1;
  }

  private drawBack(g: CanvasRenderingContext2D, s: BoardState, hover: boolean, pointed: number) {
    // The Circuit Map: this chapter's five bouts as medallions, three medal notches each. One bout
    // is named at a time: the one pointed at, else the next one.
    setType(g, 'caption', this.k, DIST);
    engrave(g, mapHead(s.map.chapter, s.map.medals, s.map.of), W / 2, 44, TEXT_DIM, W - 120);
    const n = s.map.bouts.length;
    const focus = pointed >= 0 ? pointed : s.map.bouts.findIndex((b) => b.next);
    const col = (W - 80) / n;
    s.map.bouts.forEach((b, i) => {
      const R = b.boss ? 46 : 38;
      const cx = 40 + col * (i + 0.5);
      const cy = 122;
      if (i > 0) {
        g.fillStyle = b.open ? '#8a94a3' : '#2c3138';
        g.fillRect(cx - col + R + 6, cy - 2, col - 2 * R - 12, 4);
      }
      g.fillStyle = b.open ? '#3a3f48' : '#16191e';
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = b.medals === 7 ? GILT : b.next ? ORANGE : b.open ? '#8a94a3' : '#2c3138';
      g.lineWidth = b.medals === 7 || b.next ? 6 : 3;
      g.stroke();
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.6;
        g.strokeStyle = b.medals & (1 << k) ? ORANGE : 'rgba(0,0,0,0.6)';
        g.lineWidth = 8;
        g.beginPath();
        g.arc(cx, cy, R - 10, a - 0.22, a + 0.22);
        g.stroke();
      }
      const t = setType(g, 'caption', this.k, DIST);
      engrave(g, b.boss ? 'BOSS' : b.id, cx, cy + 8, b.open ? TEXT : TEXT_DIM, R * 1.6);
      if (i !== focus) return;
      const lines = b.open ? wrap(g, b.rival.toUpperCase(), col - 12, 2) : ['?'];
      lines.forEach((l, j) => engrave(g, l, cx, cy + R + 28 + j * t * 1.1, b.open ? TEXT : TEXT_DIM, col - 8));
    });
    // One line under the map: the pointed bout's medals still to earn; at rest, what opens the next chapter.
    const b = s.map.bouts[pointed];
    const line = b ? (b.open ? b.left || 'EVERY MEDAL WON' : 'LOCKED') : s.map.gateShort;
    if (line) {
      setType(g, 'caption', this.k, DIST);
      engrave(g, line.toUpperCase(), W / 2, 244, b ? TEXT_DIM : ORANGE, W - 120);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(80, 268, W - 160, 3);
    this.drawStamps(g, s, 304);
    setType(g, 'caption', this.k, DIST);
    const glow = s.nextGlow ? ` · NEXT EMBLEM GLOW AT ${s.nextGlow}` : '';
    const ledger = hover ? `${s.stamps} STAMP${s.stamps === 1 ? '' : 'S'}${glow} · ${s.feats} OF ${s.featsOf} FEATS` : ledgerLine(s.stamps, s.feats, s.featsOf);
    engrave(g, ledger, W / 2, 362, STEEL, W - 120);
    // Your top as a short code for a friend's game: shown here, on request, never as an address.
    const label = 'CHALLENGE CODE';
    setType(g, 'caption', this.k, DIST);
    const lw = g.measureText(label).width;
    setType(g, 'title', this.k, DIST);
    // An echo makes the code long; it squeezes to fit rather than run off the plate.
    const cw = Math.min(g.measureText(s.code).width, W - 160 - lw - 32);
    const x = (W - lw - 32 - cw) / 2;
    g.textAlign = 'left';
    engrave(g, s.code, x + lw + 32, 424, TEXT, cw);
    setType(g, 'caption', this.k, DIST);
    engrave(g, label, x, 428, TEXT_DIM);
    g.textAlign = 'center';
  }

  /** The ledger: one stamp per order done, in a row centred at y. */
  private drawStamps(g: CanvasRenderingContext2D, s: BoardState, y: number) {
    const shown = Math.min(14, Math.max(s.stamps, 7));
    for (let i = 0; i < shown; i++) {
      const cx = W / 2 + (i - (shown - 1) / 2) * 62;
      g.beginPath();
      g.arc(cx, y, 22, 0, Math.PI * 2);
      g.fillStyle = i < s.stamps ? (s.gilded ? '#d8dde6' : '#8a94a3') : '#16191e';
      g.fill();
      g.strokeStyle = i < s.stamps ? '#eef3fa' : '#2c3138';
      g.lineWidth = 3;
      g.stroke();
    }
  }
}
