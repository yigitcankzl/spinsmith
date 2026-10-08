/**
 * The Smith's board, centred over the arena's far rim at home. Its front shows the one thing that
 * matters today: the Smith Order, with the ledger as a row of stamps (point at it and pinch to take
 * the order). Its back, shown while asked for (a pinch on the level plate), holds the rest: the
 * rivals as medallions with the three marks earned against each, the ledger in full, feats and
 * your top's challenge code. One machined plate, one canvas, one draw call.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import type { Order } from './orders.js';
import { ARENA_SCALE } from './reach.js';
import { addSlab, engrave, metalPlate, ORANGE, PLATE_DEPTH, pxPerM, setType, signTexture, STEEL, TEXT, TEXT_DIM, wrap } from './ui.js';

export interface BoardRival {
  name: string;
  /** Smith level it arrives at. */
  level: number;
  met: boolean;
  /** MARK bits: beaten 1, knockout 2, shape 4. */
  marks: number;
}

export interface BoardState {
  order: Order | null;
  done: boolean;
  /** Tomorrow's order, teased once today's is done. */
  tomorrow: Order | null;
  stamps: number;
  /** Stamps needed for the next glow, or null when all are earned. */
  nextGlow: number | null;
  rivals: BoardRival[];
  gilded: boolean;
  /** Feats earned, of how many. */
  feats: number;
  featsOf: number;
  /** Your top's challenge code (a friend opens the game with it to fight your top). */
  code: string;
}

const W = 1200;
const H = 480;
/** Seen from about this far (m): over the far rim, in the read band. */
const DIST = 1.2;
/** A finished ledger and a top with every mark: white-hot steel, not gold (gold teaches). */
const GILT = '#ffffff';

export class SmithBoard {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';
  private readonly k: number;

  /** `width` in arena-local units (ARENA_SCALE world metres each). */
  constructor(width = 0.3) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.tex = signTexture(this.canvas);
    this.k = pxPerM(W, width * ARENA_SCALE);
    this.mesh = new Mesh(new PlaneGeometry(width, (width * H) / W), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'smith-board';
    addSlab(this.mesh, width, (width * H) / W, 0.06, PLATE_DEPTH / ARENA_SCALE);
  }

  /** Draws the order side, or (back) the rivals and the ledger; redraws only on change. */
  draw(s: BoardState, back = false) {
    const key = JSON.stringify(s) + back;
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
    if (back) this.drawBack(g, s);
    else this.drawOrder(g, s);
    this.tex.needsUpdate = true;
  }

  private drawOrder(g: CanvasRenderingContext2D, s: BoardState) {
    setType(g, 'caption', this.k, DIST);
    engrave(g, s.done ? 'ORDER DONE' : "TODAY'S ORDER", W / 2, 62, TEXT_DIM);
    if (s.order) {
      const t = setType(g, 'title', this.k, DIST);
      const lines = wrap(g, s.order.text, W - 140, 2);
      const y0 = 168 - ((lines.length - 1) * t * 1.15) / 2;
      lines.forEach((l, i) => engrave(g, l, W / 2, y0 + i * t * 1.15, s.done ? TEXT_DIM : TEXT, W - 140));
      setType(g, 'caption', this.k, DIST);
      // The board hangs out of reach: it is taken by pointing at it and pinching.
      const next = s.tomorrow ? `TOMORROW: ${s.tomorrow.rival} ON ${s.tomorrow.arena}` : 'A NEW ORDER COMES TOMORROW';
      engrave(g, (s.done ? next : `${s.order.arena} · POINT AND PINCH TO TAKE IT`).toUpperCase(), W / 2, 280, s.done ? STEEL : ORANGE, W - 120);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(80, 330, W - 160, 3);
    this.drawStamps(g, s, 396);
  }

  private drawBack(g: CanvasRenderingContext2D, s: BoardState) {
    setType(g, 'caption', this.k, DIST);
    engrave(g, 'RIVALS', W / 2, 50, TEXT_DIM);
    const n = s.rivals.length;
    const col = (W - 80) / n;
    const R = 40;
    s.rivals.forEach((r, i) => {
      const cx = 40 + col * (i + 0.5);
      const cy = 126;
      g.fillStyle = r.met ? '#3a3f48' : '#16191e';
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = r.marks === 7 ? GILT : r.met ? '#8a94a3' : '#2c3138';
      g.lineWidth = r.marks === 7 ? 5 : 3;
      g.stroke();
      // Three notches around the top: beaten, knockout, by your shape.
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.6;
        g.strokeStyle = r.marks & (1 << k) ? ORANGE : 'rgba(0,0,0,0.6)';
        g.lineWidth = 8;
        g.beginPath();
        g.arc(cx, cy, R - 10, a - 0.22, a + 0.22);
        g.stroke();
      }
      // The name under its medallion, on two even lines when it has two words; unmet rivals show
      // only the level they come at.
      const c = setType(g, 'caption', this.k, DIST);
      const lines = r.met ? wrap(g, r.name.toUpperCase(), col - 12, 2) : [`LV ${r.level}`];
      lines.forEach((l, j) => engrave(g, l, cx, cy + R + 30 + j * c * 1.1, r.met ? TEXT : TEXT_DIM, col - 8));
    });
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(80, 262, W - 160, 3);
    this.drawStamps(g, s, 304);
    setType(g, 'caption', this.k, DIST);
    const glow = s.nextGlow ? ` · NEXT EMBLEM GLOW AT ${s.nextGlow}` : '';
    engrave(g, `${s.stamps} STAMP${s.stamps === 1 ? '' : 'S'}${glow} · ${s.feats} OF ${s.featsOf} FEATS`, W / 2, 362, STEEL, W - 120);
    // Your top as a short code for a friend's game: shown here, on request, never as an address.
    const label = 'CHALLENGE CODE';
    setType(g, 'caption', this.k, DIST);
    const lw = g.measureText(label).width;
    setType(g, 'title', this.k, DIST);
    const cw = g.measureText(s.code).width;
    const x = (W - lw - 32 - cw) / 2;
    g.textAlign = 'left';
    engrave(g, s.code, x + lw + 32, 424, TEXT);
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
