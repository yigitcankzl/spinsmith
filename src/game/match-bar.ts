/**
 * The match bar, over the arena's far rim in the read band: GLASS, the same family as the message
 * card it sits under (the two read as one display). Each top's name with its spin as a health bar
 * draining toward the middle, points toward the match as pips (orange yours, cyan the rival's), the
 * round's word between the names, and after a round your smith level along the bottom.
 */
import { CanvasTexture, Color, Mesh, MeshBasicMaterial, PlaneGeometry } from '@iwsdk/core';
import { brawlSlots, spinStep } from './brawl.js';
import { SAFE_COLORS, warnColor } from './comfort.js';
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
/** In a fight the plate ends under the heat pips; the XP row (and the full height) is for results. */
const FIGHT_H = 272;
/** In a brawl: the gap between the tops' slots (px). */
const BRAWL_GAP = 28;

/** A brawl's tops for the bar: the bots' names (seats 2+, upper case), every top's spin and team colour. */
export interface BrawlField {
  names: readonly string[];
  tops: readonly { spin: number; alive: boolean }[];
  colors: readonly number[];
  /** Launched: a top that is not spinning now is out (before the rip nobody is). */
  live: boolean;
}

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
  private lowT = 0;
  private readonly colors = [new Color(ORANGE), new Color(CYAN)];
  private readonly low = new Color('#e0574a');
  private readonly white = new Color('#ffffff');
  private readonly k = pxPerM(CW, PW * SCALE * ARENA_SCALE);
  private slab: Mesh;
  /** The brawl row as last drawn, per seat: spin step (-1 out), name and colour; redrawn only on change. */
  private lastStep: number[] = [];
  private lastName: string[] = [];
  private lastColor: number[] = [];

  constructor() {
    this.canvas.width = CW;
    this.canvas.height = CH;
    this.tex = signTexture(this.canvas);
    this.mesh = new Mesh(new PlaneGeometry(PW, PH), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'match-bar';
    this.slab = addSlab(this.mesh, PW, PH, 0.08, GLASS_DEPTH / (SCALE * ARENA_SCALE));
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
      const low = v[i] <= 0.25 && v[i] > 0;
      m.color.copy(this.flashT[i] > 0 ? this.white : v[i] > 0.25 ? this.colors[i] : this.low.setHex(warnColor(0xe0574a, SAFE_COLORS.edge)));
      // Low spin is not colour alone (the top's rattle has a twin too): the fill throbs thinner.
      this.fill[i].scale.y = low ? 0.7 + 0.3 * Math.abs(Math.cos(this.lowT * 6)) : 1;
    }
    this.lowT += dt;
  }

  /**
   * The match bar, fighting-game style: your top's name and spin on the left, the rival's on the
   * right, points toward the match as pips, the round's word between the names (TITLE, never
   * dropped: a word too long for the gap is narrowed). Redraws only when something visible changed.
   */
  bar(_mine: number, _theirs: number, myPoints: number, theirPoints: number, toWin: number, names: [string, string], message: string, xp: { level: number; rank: string; fraction: number; gained: number; show: boolean }, field?: BrawlField | null) {
    // The spin fills are meshes (animate()); the plate redraws only for names, pips and words.
    // Compared field by field (no string built every frame).
    const k = this.last;
    const fraction = Math.round(xp.fraction * 1000);
    // A brawl draws every top's spin on the plate itself (in twentieths, so a fight redraws it a few
    // dozen times, not every frame); the duel's two mesh bars are hidden.
    const n = field ? field.tops.length : 0;
    let fieldSame = n === this.lastStep.length;
    for (let i = 0; i < n && fieldSame; i++) fieldSame = this.lastStep[i] === this.seatStep(field!, i) && this.lastName[i] === this.seatName(field!, names, i) && this.lastColor[i] === field!.colors[i];
    for (let i = 0; i < 2; i++) this.fill[i].visible = this.chip[i].visible = n === 0;
    if (fieldSame && k.ready && k.my === myPoints && k.their === theirPoints && k.toWin === toWin && k.n0 === names[0] && k.n1 === names[1] && k.msg === message && k.show === xp.show && k.level === xp.level && k.fraction === fraction && k.gained === xp.gained) return;
    this.lastStep.length = this.lastName.length = this.lastColor.length = n;
    for (let i = 0; i < n; i++) {
      this.lastStep[i] = this.seatStep(field!, i);
      this.lastName[i] = this.seatName(field!, names, i);
      this.lastColor[i] = field!.colors[i];
    }
    Object.assign(k, { ready: true, my: myPoints, their: theirPoints, toWin, n0: names[0], n1: names[1], msg: message, show: xp.show, level: xp.level, fraction, gained: xp.gained });
    const g = this.canvas.getContext('2d')!;
    // A compact plate while the tops fight: no empty glass below the pips.
    const h = xp.show ? CH : FIGHT_H;
    g.clearRect(0, 0, CW, CH);
    glass(g, CW, h);
    this.slab.scale.y = h / CH;
    this.slab.position.y = (PH / 2) * (1 - h / CH);
    // The scoreboard belongs to the same forged machine as the arena: a hot top seam, brass
    // corner fasteners and a stamped centre datum replace the anonymous floating-glass rectangle.
    const seam = g.createLinearGradient(80, 0, CW - 80, 0);
    seam.addColorStop(0, 'rgba(255,122,42,0)');
    seam.addColorStop(0.16, '#ff7a2a');
    seam.addColorStop(0.84, '#d7a457');
    seam.addColorStop(1, 'rgba(215,164,87,0)');
    g.fillStyle = seam;
    g.fillRect(80, 13, CW - 160, 8);
    for (const x of [34, CW - 34]) {
      for (const y of [34, h - 34]) {
        g.beginPath();
        g.arc(x, y, 10, 0, Math.PI * 2);
        g.fillStyle = '#c99a50';
        g.fill();
        g.beginPath();
        g.arc(x - 2, y - 2, 3.2, 0, Math.PI * 2);
        g.fillStyle = 'rgba(255,255,255,0.62)';
        g.fill();
      }
    }
    if (field && n > 0) {
      this.brawlRow(g, field, names, myPoints, theirPoints, toWin, message);
    } else {
    g.save();
    g.translate(CW / 2, 211);
    g.rotate(Math.PI / 4);
    g.strokeStyle = 'rgba(201,154,80,0.55)';
    g.lineWidth = 4;
    g.strokeRect(-13, -13, 26, 26);
    g.restore();
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
      setType(g, 'caption', this.k, DIST);
      g.fillStyle = 'rgba(210,220,232,0.7)';
      g.textAlign = dir === 1 ? 'left' : 'right';
      g.fillText('SPIN', dir === 1 ? x0 : x0, BAR_Y + BAR_H + 29);
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

  private seatName(field: BrawlField, names: [string, string], i: number): string {
    return i < 2 ? names[i] : (field.names[i - 2] ?? '');
  }

  /** A seat's spin in twentieths, or -1 once it is out. */
  private seatStep(field: BrawlField, i: number): number {
    const t = field.tops[i];
    return field.live && !t.alive ? -1 : spinStep(t.spin);
  }

  /**
   * A brawl's plate: one slot per top across the width, each its name over a spin bar in its team
   * colour (red when low); a top that is out is dimmed, its name struck through and its bar reads
   * OUT. Below, your points (left), the round's word (middle) and the field's points (right).
   */
  private brawlRow(g: CanvasRenderingContext2D, field: BrawlField, names: [string, string], myPoints: number, theirPoints: number, toWin: number, message: string) {
    const slots = brawlSlots(field.tops.length, CW, BAR_X, BRAWL_GAP);
    const nameY = 62;
    slots.forEach((s, i) => {
      const step = this.seatStep(field, i);
      const out = step < 0;
      const v = out ? 0 : step / 20;
      const color = `#${(field.colors[i] ?? 0xffffff).toString(16).padStart(6, '0')}`;
      const name = this.seatName(field, names, i);
      g.globalAlpha = out ? 0.42 : 1;
      // The name, in the top's colour so it matches the top on the floor (narrowed if too long).
      setType(g, 'body', this.k, DIST);
      g.textAlign = 'left';
      g.fillStyle = color;
      g.fillText(name, s.x, nameY, s.w);
      if (out) {
        const w = Math.min(s.w, g.measureText(name).width);
        g.fillStyle = TEXT;
        g.fillRect(s.x - 6, nameY - 3, w + 12, 7);
      }
      // The spin bar: dark slot, fill from the left in the team colour.
      g.fillStyle = 'rgba(0, 0, 0, 0.55)';
      g.fillRect(s.x, BAR_Y, s.w, BAR_H);
      if (v > 0) {
        g.fillStyle = v > 0.25 ? color : '#e0574a';
        g.fillRect(s.x, BAR_Y, s.w * v, BAR_H);
      }
      g.strokeStyle = 'rgba(200, 220, 245, 0.35)';
      g.lineWidth = 2;
      g.strokeRect(s.x, BAR_Y, s.w, BAR_H);
      if (out) {
        setType(g, 'caption', this.k, DIST);
        g.fillStyle = TEXT;
        g.textAlign = 'center';
        g.fillText('OUT', s.x + s.w / 2, BAR_Y + BAR_H / 2 + 2, s.w);
      }
      g.globalAlpha = 1;
    });
    // Points toward the match: yours from the left, the field's from the right.
    const pipY = 226;
    for (let i = 0; i < toWin; i++) {
      for (const [dir, pts, color] of [[1, myPoints, ORANGE], [-1, theirPoints, CYAN]] as const) {
        g.beginPath();
        g.arc(dir === 1 ? BAR_X + 22 + i * 62 : CW - BAR_X - 22 - i * 62, pipY, 20, 0, Math.PI * 2);
        g.fillStyle = i < pts ? color : 'rgba(255,255,255,0.14)';
        g.fill();
      }
    }
    if (message) {
      setType(g, 'body', this.k, DIST);
      g.fillStyle = TEXT;
      g.textAlign = 'center';
      const gap = CW - 2 * (BAR_X + toWin * 62 + 40);
      g.fillText(message, CW / 2, pipY, Math.max(160, gap));
    }
  }
}
