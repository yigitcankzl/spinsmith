/**
 * The smithy wall: hung on the real wall in front of the player (a detected wall plane), or on a
 * virtual one when the room has none. In world space, facing the player:
 * - a SPINSMITH sign across the top,
 * - the tool panel on the left, where the forge hangs its parts (point at one and pinch: it flies
 *   to your hand),
 * - the scoreboard on the right, with the arena shelf below it (arena miniatures and the blueprint).
 */
import { BoxGeometry, CanvasTexture, Group, Mesh, MeshBasicMaterial, MeshMatcapMaterial, PlaneGeometry, SRGBColorSpace, Vector3 } from '@iwsdk/core';
import { makeMatcap } from './visuals.js';

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
  /** Right half, below the scoreboard: the arena shelf. */
  readonly arenas = new Group();
  /** Right half, top: where the forge's stats card hangs (over the scoreboard). */
  readonly cardSpot = new Group();
  private board: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private lines: string[] = [];
  private readonly p = new Vector3();

  constructor() {
    this.root.name = 'smithy-wall';
    const wood = new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0x5a3a24) });
    const iron = new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x5d6068) });
    // The back: dark planks with an iron frame.
    const back = new Mesh(new BoxGeometry(WIDTH, HEIGHT, 0.02), wood);
    back.position.z = -0.01;
    const frame = [
      [0, HEIGHT / 2, WIDTH, 0.03],
      [0, -HEIGHT / 2, WIDTH, 0.03],
      [-WIDTH / 2, 0, 0.03, HEIGHT],
      [WIDTH / 2, 0, 0.03, HEIGHT],
      [0.05, -0.05, 0.02, HEIGHT - 0.2],
    ].map(([x, y, w, h]) => {
      const m = new Mesh(new BoxGeometry(w, h, 0.03), iron);
      m.position.set(x, y, 0.005);
      return m;
    });
    const sign = signMesh('S P I N S M I T H', 1.1, 0.13);
    sign.position.set(0, HEIGHT / 2 - 0.1, 0.02);
    this.tools.position.set(-WIDTH / 4 - 0.02, -0.07, 0.02);
    this.cardSpot.position.set(WIDTH / 4 + 0.03, 0.12, 0.03);
    // The arena shelf takes the left half at home, where the tool panel hangs otherwise.
    this.arenas.position.set(-WIDTH / 4 - 0.02, 0.05, 0.02);
    this.arenas.scale.setScalar(1.3);
    // The scoreboard: a slate in the right half.
    this.canvas.width = 1024;
    this.canvas.height = 420;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.board = new Mesh(new PlaneGeometry(0.72, 0.295), new MeshBasicMaterial({ map: this.tex, transparent: true }));
    this.board.position.set(WIDTH / 4 + 0.03, 0.12, 0.021);
    this.root.add(back, ...frame, sign, this.board, this.tools, this.arenas, this.cardSpot);
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
    this.root.scale.setScalar(Math.min(1.5, Math.max(1, (best ? bestT : VIRTUAL_DISTANCE) / 1.5)));
    this.root.visible = true;
    console.log(`[WALL] on ${best ? 'detected wall' : 'virtual wall'} ${bestT.toFixed(2)} m ahead`);
  }

  /** Writes the scoreboard: a big first line, smaller lines below. */
  score(lines: string[]) {
    if (lines.join('\n') === this.lines.join('\n')) return;
    this.lines = lines;
    const g = this.canvas.getContext('2d')!;
    g.clearRect(0, 0, 1024, 420);
    g.fillStyle = '#1b1714';
    g.beginPath();
    g.roundRect(6, 6, 1012, 408, 28);
    g.fill();
    g.strokeStyle = '#a0662e';
    g.lineWidth = 8;
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    lines.forEach((line, i) => {
      g.fillStyle = i === 0 ? '#ffd28a' : '#f3e6d3';
      let size = i === 0 ? 110 : 52;
      do g.font = `bold ${size--}px system-ui, sans-serif`;
      while (g.measureText(line).width > 960 && size > 16);
      const y = lines.length === 1 ? 210 : i === 0 ? 120 : 220 + (i - 1) * 70;
      g.fillText(line, 512, y);
    });
    this.tex.needsUpdate = true;
  }

  /**
   * Shows only what the current activity needs:
   * - home: the arena shelf on the left (pick an arena), the scoreboard on the right;
   * - forge: the tool panel with the top's parts on the left, the stats card on the right;
   * - workshop: the tool panel with the workshop's board on the left, the scoreboard (help) right;
   * - match: the scoreboard alone, large, in the middle.
   */
  setMode(mode: WallMode) {
    this.tools.visible = mode === 'forge' || mode === 'workshop';
    this.arenas.visible = mode === 'home';
    this.cardSpot.visible = mode === 'forge';
    this.board.visible = mode !== 'forge';
    if (mode === 'match') {
      this.board.position.set(0, -0.02, 0.021);
      this.board.scale.setScalar(1.9);
    } else {
      this.board.position.set(WIDTH / 4 + 0.03, 0.12, 0.021);
      this.board.scale.setScalar(1);
    }
  }
}

/** A forged sign: glowing letters on a dark plate. */
function signMesh(text: string, width: number, height: number): Mesh {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * height) / width);
  const g = c.getContext('2d')!;
  g.fillStyle = '#211a15';
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#8a5a2a';
  g.lineWidth = 10;
  g.strokeRect(5, 5, c.width - 10, c.height - 10);
  g.fillStyle = '#ff9a3c';
  g.shadowColor = '#ff6a1a';
  g.shadowBlur = 24;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `bold ${Math.round(c.height * 0.62)}px system-ui, sans-serif`;
  g.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: t }));
}
