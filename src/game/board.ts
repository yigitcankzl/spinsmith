/**
 * The Smith's board on the far rim at home: today's Smith Order, the rivals as medallions with
 * the three marks earned against each, and the ledger of order stamps. One machined plate, one
 * canvas, one draw call; pinch it to take today's order.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';
import type { Order } from './orders.js';
import { engrave, FONT, metalPlate, ORANGE, STEEL, TEXT, TEXT_DIM } from './ui.js';

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
  /** Your top's challenge code (a friend adds ?vs=CODE to the address to fight it). */
  code: string;
}

const W = 1200;
const H = 780;
const GOLD = '#ffd34a';

export class SmithBoard {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';

  constructor(width = 0.36) {
    this.canvas.width = W;
    this.canvas.height = H;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mesh = new Mesh(new PlaneGeometry(width, (width * H) / W), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'smith-board';
  }

  draw(s: BoardState) {
    const key = JSON.stringify(s);
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    metalPlate(g, W, H);
    if (s.gilded) {
      g.strokeStyle = GOLD;
      g.lineWidth = 8;
      g.strokeRect(14, 14, W - 28, H - 28);
    }
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // Today's order.
    g.font = `700 40px ${FONT}`;
    engrave(g, s.order ? `SMITH ORDER · ${s.order.date}` : 'SMITH ORDER', W / 2, 62, s.done ? TEXT_DIM : ORANGE);
    if (s.order) {
      let size = 58;
      do g.font = `700 ${size--}px ${FONT}`;
      while (g.measureText(s.order.text).width > W - 100 && size > 24);
      engrave(g, s.order.text, W / 2, 132, TEXT);
      g.font = `600 36px ${FONT}`;
      const next = s.tomorrow ? `DONE · tomorrow: ${s.tomorrow.rival} on ${s.tomorrow.arena}` : 'DONE: a new order comes tomorrow';
      engrave(g, s.done ? next : `${s.order.arena} · pinch the board to take it`, W / 2, 192, s.done ? '#6fd36f' : STEEL);
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(60, 236, W - 120, 3);
    // The rivals: a medallion each, three notches for the marks.
    g.font = `700 32px ${FONT}`;
    engrave(g, 'RIVALS', W / 2, 272, STEEL);
    const n = s.rivals.length;
    const R = 62;
    s.rivals.forEach((r, i) => {
      const cx = (W * (i + 0.5)) / n;
      const cy = 380;
      g.fillStyle = r.met ? '#3a3f48' : '#16191e';
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = r.marks === 7 ? GOLD : r.met ? '#8a94a3' : '#2c3138';
      g.lineWidth = r.marks === 7 ? 6 : 3;
      g.stroke();
      // Three notches around the top: beaten, knockout, by your shape.
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k - 1) * 0.55;
        g.strokeStyle = r.marks & (1 << k) ? ORANGE : 'rgba(0,0,0,0.6)';
        g.lineWidth = 9;
        g.beginPath();
        g.arc(cx, cy, R - 12, a - 0.2, a + 0.2);
        g.stroke();
      }
      g.font = `700 ${r.met ? 34 : 32}px ${FONT}`;
      engrave(g, r.met ? r.name.split(' ')[0].toUpperCase() : `LV ${r.level}`, cx, cy + 12, r.met ? TEXT : TEXT_DIM);
      g.font = `600 30px ${FONT}`;
      if (r.met) engrave(g, r.name.includes(' ') ? r.name.split(' ').slice(1).join(' ').toUpperCase() : '', cx, cy + R + 22, STEEL);
    });
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.fillRect(60, 526, W - 120, 3);
    // The ledger: one stamp per order done.
    g.font = `700 32px ${FONT}`;
    engrave(g, 'LEDGER', W / 2, 566, s.gilded ? GOLD : STEEL);
    const shown = Math.min(14, Math.max(s.stamps, 7));
    for (let i = 0; i < shown; i++) {
      const cx = W / 2 + (i - (shown - 1) / 2) * 74;
      g.beginPath();
      g.arc(cx, 640, 28, 0, Math.PI * 2);
      g.fillStyle = i < s.stamps ? ORANGE : '#16191e';
      g.fill();
      g.strokeStyle = i < s.stamps ? '#ffd2a8' : '#2c3138';
      g.lineWidth = 3;
      g.stroke();
    }
    g.font = `600 30px ${FONT}`;
    engrave(g, `${s.stamps} stamp${s.stamps === 1 ? '' : 's'}${s.nextGlow ? ` · a new emblem glow at ${s.nextGlow}` : ''} · feats ${s.feats}/${s.featsOf}`, W / 2, 708, STEEL);
    g.font = `700 30px ${FONT}`;
    engrave(g, `Challenge a friend: ?vs=${s.code} on their address fights your top`, W / 2, 750, ORANGE);
    this.tex.needsUpdate = true;
  }
}
