/**
 * The match bar, set into the arena's far rim as a machined strip: each top's spin as a health bar
 * draining toward the middle, points toward the match as pips, the round's word in between, and
 * your smith level along the bottom.
 */
import { CanvasTexture, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from '@iwsdk/core';
import { CYAN, FONT, metalPlate, ORANGE, STEEL, TEXT } from './ui.js';

export class MatchBar {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';

  constructor() {
    this.canvas.width = 1400;
    this.canvas.height = 330;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(new PlaneGeometry(1.6, 0.377), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    this.mesh.name = 'match-bar';
    this.mesh.visible = false;
  }

  /**
   * The match bar, fighting-game style: your top's spin as a health bar draining toward the middle
   * on the left, the rival's on the right, points toward the match as pips, a message in between.
   * Redraws only when something visible changed.
   */
  bar(mine: number, theirs: number, myPoints: number, theirPoints: number, toWin: number, names: [string, string], message: string, xp: { level: number; rank: string; fraction: number; gained: number }) {
    const a = Math.round(Math.max(0, Math.min(1, mine)) * 100);
    const b = Math.round(Math.max(0, Math.min(1, theirs)) * 100);
    const key = [a, b, myPoints, theirPoints, names, message, xp.level, xp.fraction.toFixed(3), xp.gained].join('|');
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    const W = 1400;
    metalPlate(g, W, 330);
    const barW = 560;
    const barY = 90;
    const side = (x0: number, dir: 1 | -1, value: number, color: string, name: string, points: number) => {
      // A dark slot cut into the plate, then the fill anchored at the outer end, draining toward the middle.
      g.fillStyle = '#121418';
      g.fillRect(dir === 1 ? x0 : x0 - barW, barY, barW, 56);
      g.fillStyle = value > 25 ? color : '#e0574a';
      const w = (barW * value) / 100;
      g.fillRect(dir === 1 ? x0 + barW - w : x0 - barW, barY, w, 56);
      g.strokeStyle = 'rgba(200, 220, 245, 0.6)';
      g.lineWidth = 3;
      g.strokeRect(dir === 1 ? x0 : x0 - barW, barY, barW, 56);
      g.fillStyle = TEXT;
      g.font = `700 40px ${FONT}`;
      g.textAlign = dir === 1 ? 'left' : 'right';
      g.textBaseline = 'middle';
      g.fillText(name, dir === 1 ? x0 : x0, 50);
      for (let i = 0; i < toWin; i++) {
        g.beginPath();
        const px = dir === 1 ? x0 + 26 + i * 54 : x0 - 26 - i * 54;
        g.arc(px, 196, 18, 0, Math.PI * 2);
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
    while (g.measureText(message).width > 200 && size > 20);
    g.fillText(message, W / 2, 120);
    // Your smith level along the bottom: level and rank, the XP bar, the XP just earned.
    g.font = `700 32px ${FONT}`;
    g.fillStyle = TEXT;
    g.textAlign = 'left';
    g.fillText(`Lv ${xp.level}`, 40, 280);
    g.fillStyle = ORANGE;
    g.font = `700 26px ${FONT}`;
    g.fillText(xp.rank.toUpperCase(), 130, 281);
    g.fillStyle = 'rgba(255,255,255,0.1)';
    g.fillRect(380, 270, 760, 20);
    g.fillStyle = STEEL;
    g.fillRect(380, 270, 760 * xp.fraction, 20);
    if (xp.gained > 0) {
      g.fillStyle = ORANGE;
      g.textAlign = 'right';
      g.font = `700 32px ${FONT}`;
      g.fillText(`+${xp.gained} XP`, W - 40, 280);
    }
    this.tex.needsUpdate = true;
  }
}
