/**
 * The match bar, over the arena's far rim in the read band: GLASS, the same family as the message
 * card it sits under (the two read as one display). Each top's name with its spin as a health bar
 * draining toward the middle, points toward the match as pips (orange yours, cyan the rival's), the
 * round's word between the names, and after a round your smith level along the bottom.
 */
import { CanvasTexture, Color, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { ARENA_SCALE } from './reach.js';
import { addSlab, CYAN, GLASS_DEPTH, glass, ORANGE, pxPerM, setType, signTexture, STEEL, TEXT, TEXT_DIM } from './ui.js';

/** The canvas (px) and the plane (in its own units; the match shows it at SCALE, as wide as the card). */
const CW = 1400;
const CH = 404;
const PW = 1.31;
const PH = (PW * CH) / CW;
const SCALE = 0.21;
/** Seen from about this far (m). */
const DIST = 1.21;
/** The spin bars' slots on the canvas (px): margin, width, top and height. */
const BAR_X = 48;
const BAR_W = 592;
const BAR_Y = 118;
const BAR_H = 56;

export class MatchBar {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private last = { ready: false, my: 0, their: 0, toWin: 0, n0: '', n1: '', msg: '', show: false, level: 0, fraction: 0, gained: 0 };
  /** The spin bars as meshes over the plate (animated every frame): fill, and the chip behind it. */
  private fill: [Mesh, Mesh];
  private chip: [Mesh, Mesh];
  private shown: [number, number] = [1, 1];
  private chipAt: [number, number] = [1, 1];
  private chipWait: [number, number] = [0, 0];
  private flashT: [number, number] = [0, 0];
  private readonly colors = [new Color(ORANGE), new Color(CYAN)];
  private readonly low = new Color('#e0574a');
  private readonly white = new Color('#ffffff');
  private readonly k = pxPerM(CW, PW * SCALE * ARENA_SCALE);

  constructor() {
    this.canvas.width = CW;
    this.canvas.height = CH;
    this.tex = signTexture(this.canvas);
    this.mesh = new Mesh(new PlaneGeometry(PW, PH), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'match-bar';
    addSlab(this.mesh, PW, PH, 0.08, GLASS_DEPTH / (SCALE * ARENA_SCALE));
    this.mesh.visible = false;
    const px = (x: number) => (x / CW - 0.5) * PW;
    const py = (y: number) => (0.5 - y / CH) * PH;
    const w = (BAR_W / CW) * PW;
    const h = (BAR_H / CH) * PH;
    const quad = (side: 0 | 1, color: number, z: number) => {
      const m = new Mesh(new PlaneGeometry(w, h).translate(side === 0 ? -w / 2 : w / 2, 0, 0), new MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
      // Anchored at the middle end of its slot, draining toward it.
      m.position.set(side === 0 ? px(BAR_X + BAR_W) : px(CW - BAR_X - BAR_W), py(BAR_Y + BAR_H / 2), z);
      // Drawn after the plate (both are see-through, so order decides).
      m.renderOrder = z > 0.0015 ? 3 : 2;
      this.mesh.add(m);
      return m;
    };
    this.chip = [quad(0, 0xfff1d6, 0.001), quad(1, 0xe8fbff, 0.001)];
    this.fill = [quad(0, 0xff8a2a, 0.002), quad(1, 0x4fd1ff, 0.002)];
  }

  /** A hard hit on a side (0 yours, 1 the rival's): its bar flashes white for a moment. */
  hit(side: 0 | 1) {
    this.flashT[side] = 0.06;
  }

  /**
   * Each frame: the spin bars ease to the tops' spin; what a hit took stays as a pale chunk for
   * 0.35 s, then drains away (fighting-game chip damage).
   */
  animate(mine: number, theirs: number, dt: number) {
    const v = [Math.max(0, Math.min(1, mine)), Math.max(0, Math.min(1, theirs))];
    for (const i of [0, 1] as const) {
      const drop = this.shown[i] - v[i];
      this.shown[i] = v[i];
      if (drop > 0.02) this.chipWait[i] = 0.35;
      if (this.chipAt[i] < v[i]) this.chipAt[i] = v[i];
      if ((this.chipWait[i] -= dt) <= 0) this.chipAt[i] = Math.max(v[i], this.chipAt[i] - dt / 0.3);
      this.fill[i].scale.x = Math.max(0.001, v[i]);
      this.chip[i].scale.x = Math.max(0.001, this.chipAt[i]);
      this.flashT[i] = Math.max(0, this.flashT[i] - dt);
      const m = this.fill[i].material as MeshBasicMaterial;
      m.color.copy(this.flashT[i] > 0 ? this.white : v[i] > 0.25 ? this.colors[i] : this.low);
    }
  }

  /**
   * The match bar, fighting-game style: your top's name and spin on the left, the rival's on the
   * right, points toward the match as pips, the round's word between the names (TITLE, never
   * dropped: a word too long for the gap is narrowed). Redraws only when something visible changed.
   */
  bar(_mine: number, _theirs: number, myPoints: number, theirPoints: number, toWin: number, names: [string, string], message: string, xp: { level: number; rank: string; fraction: number; gained: number; show: boolean }) {
    // The spin fills are meshes (animate()); the plate redraws only for names, pips and words.
    // Compared field by field (no string built every frame).
    const k = this.last;
    const fraction = Math.round(xp.fraction * 1000);
    if (k.ready && k.my === myPoints && k.their === theirPoints && k.toWin === toWin && k.n0 === names[0] && k.n1 === names[1] && k.msg === message && k.show === xp.show && k.level === xp.level && k.fraction === fraction && k.gained === xp.gained) return;
    Object.assign(k, { ready: true, my: myPoints, their: theirPoints, toWin, n0: names[0], n1: names[1], msg: message, show: xp.show, level: xp.level, fraction, gained: xp.gained });
    const g = this.canvas.getContext('2d')!;
    glass(g, CW, CH);
    g.textBaseline = 'middle';
    const nameY = 62;
    setType(g, 'title', this.k, DIST);
    const widths = [g.measureText(names[0]).width, g.measureText(names[1]).width];
    const side = (dir: 1 | -1, color: string, name: string, points: number) => {
      const x0 = dir === 1 ? BAR_X : CW - BAR_X;
      // A dark slot under the fill, anchored at the outer end, draining toward the middle.
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.fillRect(dir === 1 ? x0 : x0 - BAR_W, BAR_Y, BAR_W, BAR_H);
      g.strokeStyle = 'rgba(200, 220, 245, 0.35)';
      g.lineWidth = 2;
      g.strokeRect(dir === 1 ? x0 : x0 - BAR_W, BAR_Y, BAR_W, BAR_H);
      setType(g, 'title', this.k, DIST);
      g.fillStyle = TEXT;
      g.textAlign = dir === 1 ? 'left' : 'right';
      g.fillText(name, x0, nameY, CW * 0.36);
      // Points toward the match: one pip per point, in the side's colour.
      for (let i = 0; i < toWin; i++) {
        g.beginPath();
        g.arc(dir === 1 ? x0 + 22 + i * 62 : x0 - 22 - i * 62, 226, 20, 0, Math.PI * 2);
        g.fillStyle = i < points ? color : 'rgba(255,255,255,0.14)';
        g.fill();
      }
    };
    side(1, ORANGE, names[0], myPoints);
    side(-1, CYAN, names[1], theirPoints);
    // The round's word between the names, as wide as the gap allows.
    if (message) {
      setType(g, 'title', this.k, DIST);
      g.fillStyle = TEXT;
      g.textAlign = 'center';
      const gap = CW - 2 * (BAR_X + Math.min(CW * 0.36, Math.max(widths[0], widths[1])) + 40);
      g.fillText(message, CW / 2, nameY, Math.max(160, gap));
    }
    // After a round only, along the bottom: your smith level, the XP bar and the XP just earned (not
    // during a fight, when the eyes are on the tops).
    if (xp.show) {
      const y = 330;
      setType(g, 'body', this.k, DIST);
      g.fillStyle = TEXT;
      g.textAlign = 'left';
      const lv = `LV ${xp.level}`;
      g.fillText(lv, BAR_X, y);
      const x = BAR_X + g.measureText(lv).width + 32;
      const end = CW - BAR_X - 260;
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.fillRect(x, y - 10, end - x, 20);
      g.fillStyle = STEEL;
      g.fillRect(x, y - 10, (end - x) * xp.fraction, 20);
      g.textAlign = 'right';
      g.fillStyle = xp.gained > 0 ? ORANGE : TEXT_DIM;
      g.fillText(xp.gained > 0 ? `+${xp.gained} XP` : 'XP', CW - BAR_X, y, 240);
    }
    this.tex.needsUpdate = true;
  }
}
