/**
 * The smithy wall: hung on the real wall in front of the player (a detected wall plane), or on a
 * virtual one when the room has none, facing the player. It only shows when there is a use for it:
 * - forge: a board with a SPINSMITH sign, filled with the parts (point at one and pinch: it flies
 *   to your hand);
 * - workshop: the workshop's board on the left and a short help on the right;
 * - match: nothing on the wall; its fighting-game bar (each top's spin as a health bar, points
 *   below) is placed over the arena's far rim by the match system;
 * - home: nothing.
 */
import { CanvasTexture, Group, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from '@iwsdk/core';
import { CYAN, FONT, glass, GLASS_LIGHT, glassMesh, ORANGE, STEEL, TEXT, TEXT_DIM, titleMesh } from './ui.js';

/** Wall board size (m). */
const WIDTH = 1.7;
const HEIGHT = 1.05;
/** Without a detected wall, the board stands this far ahead of the head. */
const VIRTUAL_DISTANCE = 1.6;
/** Detected walls between these distances (m) count. */
const MIN_DISTANCE = 0.7;
const MAX_DISTANCE = 4;

export type WallMode = 'home' | 'forge' | 'workshop' | 'match';

export interface WallPlane {
  /** Center and unit normal, world space. */
  center: Vector3;
  normal: Vector3;
}

export class Wall {
  /** World space: add with world.createTransformEntity. */
  readonly root = new Group();
  /** Left half: the forge's tool panel (local +x right, +y up, +z toward the player). */
  readonly tools = new Group();
  private board: Mesh;
  /** The board with its sign and halves (forge, workshop). */
  private panel = new Group();
  /** The match bar. */
  /**
   * The match bar. It is not hung on the wall: the match system places it just over the arena's
   * far rim, so the score sits next to the fight instead of high on the wall.
   */
  readonly hud: Mesh;
  private hudCanvas = document.createElement('canvas');
  private hudTex: CanvasTexture;
  private hudKey = '';
  private mode: WallMode = 'home';
  private placed = false;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private lines: string[] = [];
  private readonly p = new Vector3();

  constructor() {
    this.root.name = 'smithy-wall';
    // The back: one tinted glass panel; the title floats on it.
    const back = glassMesh(WIDTH, HEIGHT, ORANGE, 2048);
    const sign = titleMesh('SPINSMITH', 0.9, 0.12);
    sign.position.set(0, HEIGHT / 2 - 0.1, 0.01);
    this.tools.position.set(-WIDTH / 4 - 0.02, -0.07, 0.02);
    // The scoreboard: a slate in the right half.
    this.canvas.width = 1024;
    this.canvas.height = 420;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.board = new Mesh(new PlaneGeometry(0.72, 0.295), new MeshBasicMaterial({ map: this.tex, transparent: true }));
    this.board.position.set(WIDTH / 4 + 0.03, 0.12, 0.021);
    this.panel.add(back, sign, this.board, this.tools);
    this.hudCanvas.width = 1400;
    this.hudCanvas.height = 330;
    this.hudTex = new CanvasTexture(this.hudCanvas);
    this.hudTex.colorSpace = SRGBColorSpace;
    this.hud = new Mesh(new PlaneGeometry(1.6, 0.377), new MeshBasicMaterial({ map: this.hudTex, transparent: true, depthWrite: false }));
    this.hud.visible = false;
    this.root.add(this.panel);
    this.root.visible = false;
    this.score(['SpinSmith']);
  }

  /**
   * Hangs the board on the detected wall straight ahead (or a virtual wall), centered on the line
   * of sight at eye height, facing the player. head and fwd (horizontal, unit) are world space.
   */
  place(head: Vector3, fwd: Vector3, walls: WallPlane[]) {
    let best: Vector3 | null = null;
    let bestT = MAX_DISTANCE;
    for (const w of walls) {
      const facing = fwd.dot(w.normal);
      if (Math.abs(facing) < 0.6) continue;
      // Where the line of sight meets the wall.
      const t = this.p.copy(w.center).sub(head).dot(w.normal) / facing;
      if (t < MIN_DISTANCE || t > bestT) continue;
      bestT = t;
      best = head.clone().addScaledVector(fwd, t - 0.03);
    }
    const at = best ?? head.clone().addScaledVector(fwd, VIRTUAL_DISTANCE);
    at.y = head.y - 0.05;
    this.root.position.copy(at);
    this.root.rotation.set(0, Math.atan2(-fwd.x, -fwd.z), 0);
    // A farther wall gets a larger board, so it reads the same.
    this.root.scale.setScalar(Math.min(1.8, Math.max(1, (best ? bestT : VIRTUAL_DISTANCE) / 1.2)));
    this.placed = true;
    this.setMode(this.mode);
    console.log(`[WALL] on ${best ? 'detected wall' : 'virtual wall'} ${bestT.toFixed(2)} m ahead`);
  }

  /** Writes the scoreboard: a big first line, smaller lines below. */
  score(lines: string[]) {
    if (lines.join('\n') === this.lines.join('\n')) return;
    this.lines = lines;
    const g = this.canvas.getContext('2d')!;
    glass(g, 1024, 420, STEEL, GLASS_LIGHT);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((line, i) => {
      g.fillStyle = i === 0 ? TEXT : TEXT_DIM;
      let size = i === 0 ? 110 : 52;
      do g.font = `bold ${size--}px ${FONT}`;
      while (g.measureText(line).width > 960 && size > 16);
      const y = lines.length === 1 ? 210 : i === 0 ? 120 : 220 + (i - 1) * 70;
      g.fillText(line, 512, y);
    });
    this.tex.needsUpdate = true;
  }

  /** Shows only what the current activity needs (see the file comment). */
  setMode(mode: WallMode) {
    this.mode = mode;
    // In a match the wall itself steps away; only the bar shows, over the arena.
    this.root.visible = this.placed && (mode === 'forge' || mode === 'workshop');
    this.panel.visible = mode === 'forge' || mode === 'workshop';
    this.hud.visible = mode === 'match';
    this.board.visible = mode === 'workshop';
    // In the forge the parts fill the whole board, larger; in the workshop its board takes the left half.
    if (mode === 'forge') {
      this.tools.position.set(-0.03, -0.1, 0.02);
      this.tools.scale.setScalar(1.08);
    } else {
      this.tools.position.set(-WIDTH / 4 - 0.02, -0.07, 0.02);
      this.tools.scale.setScalar(1);
    }
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
    if (key === this.hudKey) return;
    this.hudKey = key;
    const g = this.hudCanvas.getContext('2d')!;
    const W = 1400;
    glass(g, W, 330, ORANGE);
    const barW = 560;
    const barY = 90;
    const side = (x0: number, dir: 1 | -1, value: number, color: string, name: string, points: number) => {
      // Frame, then the fill anchored at the outer end, draining toward the middle.
      g.fillStyle = 'rgba(255,255,255,0.08)';
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
    this.hudTex.needsUpdate = true;
  }
}
