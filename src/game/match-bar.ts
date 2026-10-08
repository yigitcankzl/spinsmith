/**
 * The match bar, set into the arena's far rim as a machined strip: each top's spin as a health bar
 * draining toward the middle, points toward the match as pips, the round's word in between, and
 * your smith level along the bottom.
 */
import { CanvasTexture, Color, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';
import { addSlab, CYAN, FONT, metalPlate, ORANGE, STEEL, TEXT } from './ui.js';

/** The spin bars' slots on the plate canvas (px): width and top. */
const BAR_W = 500;
const BAR_Y = 92;

export class MatchBar {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private last = { ready: false, my: 0, their: 0, n0: '', n1: '', msg: '', show: false, level: 0, fraction: 0, gained: 0 };
  /** The spin bars as meshes over the plate (animated every frame): fill, and the chip behind it. */
  private fill: [Mesh, Mesh];
  private chip: [Mesh, Mesh];
  private shown: [number, number] = [1, 1];
  private chipAt: [number, number] = [1, 1];
  private chipWait: [number, number] = [0, 0];
  private flashT: [number, number] = [0, 0];
  private readonly colors = [new Color('#ff9a3c'), new Color(CYAN)];
  private readonly low = new Color('#e0574a');
  private readonly white = new Color('#ffffff');

  constructor() {
    this.canvas.width = 1400;
    this.canvas.height = 330;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(new PlaneGeometry(1.6, 0.377), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'match-bar';
    addSlab(this.mesh, 1.6, 0.377, 0.06, 0.03);
    this.mesh.visible = false;
    // Plate coordinates of the bar slots (the canvas is 1400 x 330 on a 1.6 x 0.377 plane).
    const px = (x: number) => (x / 1400 - 0.5) * 1.6;
    const py = (y: number) => (0.5 - y / 330) * 0.377;
    const w = (BAR_W / 1400) * 1.6;
    const h = (60 / 330) * 0.377;
    const quad = (side: 0 | 1, color: number, z: number) => {
      const m = new Mesh(new PlaneGeometry(w, h).translate(side === 0 ? -w / 2 : w / 2, 0, 0), new MeshBasicMaterial({ color, transparent: true, depthWrite: false }));
      // Anchored at the middle end of its slot, draining toward it.
      m.position.set(side === 0 ? px(40 + BAR_W) : px(1400 - 40 - BAR_W), py(BAR_Y + 30), z);
      // Drawn after the plate (both are see-through, so order decides).
      m.renderOrder = z > 0.0015 ? 3 : 2;
      this.mesh.add(m);
      return m;
    };
    this.chip = [quad(0, 0xfff1d6, 0.001), quad(1, 0xe8fbff, 0.001)];
    this.fill = [quad(0, 0xff9a3c, 0.002), quad(1, 0x4fd1ff, 0.002)];
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
   * The match bar, fighting-game style: your top's spin as a health bar draining toward the middle
   * on the left, the rival's on the right, points toward the match as pips, a message in between.
   * Redraws only when something visible changed.
   */
  bar(mine: number, theirs: number, myPoints: number, theirPoints: number, toWin: number, names: [string, string], message: string, xp: { level: number; rank: string; fraction: number; gained: number; show: boolean }) {
    // The spin fills are meshes (animate()); the plate redraws only for names, pips and words.
    const a = 0;
    const b = 0;
    // Compared field by field (no string built every frame).
    const k = this.last;
    const fraction = Math.round(xp.fraction * 1000);
    if (k.ready && k.my === myPoints && k.their === theirPoints && k.n0 === names[0] && k.n1 === names[1] && k.msg === message && k.show === xp.show && k.level === xp.level && k.fraction === fraction && k.gained === xp.gained) return;
    Object.assign(k, { ready: true, my: myPoints, their: theirPoints, n0: names[0], n1: names[1], msg: message, show: xp.show, level: xp.level, fraction, gained: xp.gained });
    const g = this.canvas.getContext('2d')!;
    const W = 1400;
    metalPlate(g, W, 330);
    const barW = BAR_W;
    const barY = BAR_Y;
    const side = (x0: number, dir: 1 | -1, value: number, color: string, name: string, points: number) => {
      // A dark slot cut into the plate, then the fill anchored at the outer end, draining toward the middle.
      g.fillStyle = '#121418';
      g.fillRect(dir === 1 ? x0 : x0 - barW, barY, barW, 60);
      g.strokeStyle = 'rgba(200, 220, 245, 0.6)';
      g.lineWidth = 3;
      g.strokeRect(dir === 1 ? x0 : x0 - barW, barY, barW, 60);
      g.fillStyle = TEXT;
      g.font = `700 66px ${FONT}`;
      g.textAlign = dir === 1 ? 'left' : 'right';
      g.textBaseline = 'middle';
      // Clear of the plate's corner bolts.
      g.fillText(name, x0 + dir * 40, 54);
      // Heat toward the match: one pip per point.
      for (let i = 0; i < toWin; i++) {
        g.beginPath();
        const px = dir === 1 ? x0 + 70 + i * 74 : x0 - 70 - i * 74;
        g.arc(px, 205, 26, 0, Math.PI * 2);
        g.fillStyle = i < points ? ORANGE : 'rgba(255,255,255,0.14)';
        g.fill();
      }
    };
    side(40, 1, a, '#ff9a3c', names[0], myPoints);
    side(W - 40, -1, b, CYAN, names[1], theirPoints);
    g.fillStyle = TEXT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 64;
    do g.font = `bold ${size--}px ${FONT}`;
    while (g.measureText(message).width > 300 && size > 44);
    // Between the two bars, never over them; a line too long for the gap is left to the card above.
    if (g.measureText(message).width <= 300) g.fillText(message, W / 2, 122);
    // After a round only: your smith level, the XP bar and the XP just earned (not during a fight,
    // when the eyes are on the tops).
    if (!xp.show) {
      this.tex.needsUpdate = true;
      return;
    }
    g.font = `700 48px ${FONT}`;
    g.fillStyle = TEXT;
    g.textAlign = 'left';
    g.fillText(`Lv ${xp.level}`, 80, 268);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(250, 256, 780, 26);
    g.fillStyle = STEEL;
    g.fillRect(250, 256, 780 * xp.fraction, 26);
    if (xp.gained > 0) {
      g.fillStyle = ORANGE;
      g.textAlign = 'right';
      g.font = `700 48px ${FONT}`;
      g.fillText(`+${xp.gained} XP`, W - 80, 268);
    }
    this.tex.needsUpdate = true;
  }
}
