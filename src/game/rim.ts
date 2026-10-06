/**
 * The machine's shared parts: what the forge and the arena workshop both build into the arena's
 * rims. Tabs and buttons engraved on metal plates along the near rim, the staggered pop of a
 * drawer's items, and the dial plate on the far rim.
 */
import { BufferAttribute, BufferGeometry, CanvasTexture, CylinderGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, MeshMatcapMaterial, PlaneGeometry, SRGBColorSpace, TorusGeometry, Vector3 } from '@iwsdk/core';
import { makeMatcap, mergeByMaterial } from './visuals.js';
import { engrave, FONT, metalPlate, ORANGE, STEEL, TEXT, TEXT_DIM } from './ui.js';

/** Where a drawer's i-th item is in its pop-in, 0..1, t seconds after the drawer opened. */
export function popIn(t: number, i: number): number {
  return Math.min(1, Math.max(0, (t - i * 0.05) / 0.2));
}

export interface TabSpot {
  /** Arena-local center. */
  at: Vector3;
  /** Turn about +Y so the plate faces outward from the arena center. */
  yaw: number;
}

/** Tab centers in a straight row across the near rim (x spaced by gap, at z and y). */
export function rowSpots(n: number, gap: number, z: number, y: number): TabSpot[] {
  return Array.from({ length: n }, (_, i) => ({ at: new Vector3((i - (n - 1) / 2) * gap, y, z), yaw: 0 }));
}

export interface TabLook {
  /** Lit orange: the open drawer, or a hot action. */
  on?: boolean;
  /** Pointed at: white. */
  hover?: boolean;
  /** An action button (engraved in orange even when idle). */
  hot?: boolean;
}

/**
 * Engraved metal tabs, any number, laid at given spots: one mesh and one canvas (each tab is a
 * column of the canvas), so all of them cost a single draw call.
 */
export class RimTabs {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';

  constructor(
    readonly labels: string[],
    readonly spots: TabSpot[],
    readonly width: number,
    readonly height: number,
    /** How far the plates lean back toward the sky (radians). */
    tilt = 1.1,
  ) {
    const n = labels.length;
    this.canvas.width = 256 * n;
    this.canvas.height = Math.round((256 * height) / width);
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.tex.anisotropy = 4;
    const pos: number[] = [];
    const uv: number[] = [];
    const index: number[] = [];
    const m = new Matrix4();
    const lean = new Matrix4().makeRotationX(-tilt);
    const v = new Vector3();
    spots.forEach((s, i) => {
      m.makeRotationY(s.yaw).multiply(lean).setPosition(s.at);
      const plane = new PlaneGeometry(width, height);
      const p = plane.getAttribute('position');
      const u = plane.getAttribute('uv');
      for (let k = 0; k < p.count; k++) {
        v.fromBufferAttribute(p, k).applyMatrix4(m);
        pos.push(v.x, v.y, v.z);
        uv.push((i + u.getX(k)) / n, u.getY(k));
      }
      for (const k of plane.getIndex()!.array) index.push(k + i * 4);
      plane.dispose();
    });
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3));
    geo.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
    geo.setIndex(index);
    this.mesh = new Mesh(geo, new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
  }

  /** Redraws only when a tab's look changed. */
  draw(look: (i: number) => TabLook) {
    const looks = this.labels.map((_, i) => look(i));
    const key = JSON.stringify(looks);
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    const H = this.canvas.height;
    g.clearRect(0, 0, this.canvas.width, H);
    this.labels.forEach((label, i) => {
      const x = i * 256;
      const l = looks[i];
      g.save();
      g.translate(x, 0);
      metalPlate(g, 256, H);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      let size = Math.round(H * 0.5);
      do g.font = `700 ${size--}px ${FONT}`;
      while (g.measureText(label).width > 220 && size > 10);
      engrave(g, label, 128, H / 2 + 2, l.on || l.hot ? ORANGE : l.hover ? '#ffffff' : STEEL);
      if (l.on) {
        g.fillStyle = ORANGE;
        g.fillRect(256 * 0.3, H * 0.86, 256 * 0.4, H * 0.06);
      }
      g.restore();
    });
    this.tex.needsUpdate = true;
  }
}

export interface Dial {
  label: string;
  /** 0..100 */
  value: number;
  /** A second needle for a previewed change; green when higher, red when lower (or `lowerIsBetter`). */
  preview?: number;
  lowerIsBetter?: boolean;
}

/**
 * The plate on the far rim: a title engraved, a subtitle, one dial per value, and a message line.
 */
export class DialPlate {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';

  constructor(width = 0.26, height = 0.108) {
    this.canvas.width = 1200;
    this.canvas.height = Math.round((1200 * height) / width);
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
  }

  draw(title: string, subtitle: string, dials: Dial[], message: string, subtitleColor = TEXT_DIM) {
    const key = JSON.stringify([title, subtitle, dials, message, subtitleColor]);
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    const W = this.canvas.width;
    const H = this.canvas.height;
    metalPlate(g, W, H);
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    g.font = `700 64px ${FONT}`;
    engrave(g, title.toUpperCase(), W / 2, 62, TEXT);
    g.font = `600 36px ${FONT}`;
    engrave(g, subtitle, W / 2, 116, subtitleColor);
    const R = 74;
    dials.forEach((d, i) => {
      const cx = W * ((i + 0.5) / dials.length);
      const cy = 268;
      // The dial: a dark face, ticks along a 240 degree arc, and the needle.
      g.fillStyle = '#15181d';
      g.beginPath();
      g.arc(cx, cy, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = '#8a94a3';
      g.lineWidth = 4;
      g.stroke();
      const a0 = Math.PI * (5 / 6);
      const span = Math.PI * (4 / 3);
      for (let t = 0; t <= 10; t++) {
        const a = a0 + (span * t) / 10;
        g.strokeStyle = t % 5 === 0 ? '#c9d3e0' : '#5d6672';
        g.lineWidth = t % 5 === 0 ? 4 : 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * R * 0.78, cy + Math.sin(a) * R * 0.78);
        g.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92);
        g.stroke();
      }
      const needle = (v: number, color: string, width: number) => {
        const a = a0 + span * Math.min(1, Math.max(0, v / 100));
        g.strokeStyle = color;
        g.lineWidth = width;
        g.lineCap = 'round';
        g.beginPath();
        g.moveTo(cx, cy);
        g.lineTo(cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.8);
        g.stroke();
      };
      if (d.preview !== undefined && d.preview !== d.value) {
        const better = d.lowerIsBetter ? d.preview < d.value : d.preview > d.value;
        needle(d.preview, better ? '#6fd36f' : '#e0574a', 6);
      }
      needle(d.value, ORANGE, 8);
      g.fillStyle = '#c9d3e0';
      g.beginPath();
      g.arc(cx, cy, 9, 0, Math.PI * 2);
      g.fill();
      g.font = `700 40px ${FONT}`;
      engrave(g, d.label, cx, cy + R + 36, STEEL);
    });
    // What just happened, or what to do next.
    let size = 36;
    do g.font = `600 ${size--}px ${FONT}`;
    while (g.measureText(message).width > W - 80 && size > 16);
    engrave(g, message, W / 2, H - 50, STEEL);
    this.tex.needsUpdate = true;
  }
}

/**
 * A slot set into the rim: an octagonal graphite block, flush with the rim, a brass lip and a
 * glowing orange well. Its top is at y = 0; the forge quenches your top in it, the workshop
 * stamps a saved arena into it.
 */
export function rimSlot(): Group {
  const g = new Group();
  const block = new Mesh(new CylinderGeometry(0.03, 0.033, 0.03, 8).rotateY(Math.PI / 8).translate(0, -0.015, 0), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0x4a4e57) }));
  const lip = new Mesh(new TorusGeometry(0.026, 0.0028, 6, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8), new MeshMatcapMaterial({ matcap: makeMatcap('metal', 0xe2b866) }));
  const well = new Mesh(new CylinderGeometry(0.024, 0.024, 0.002, 8).rotateY(Math.PI / 8).translate(0, -0.004, 0), new MeshBasicMaterial({ color: 0xff7a2a }));
  g.add(block, lip, well);
  const out = new Group();
  out.add(mergeByMaterial(g));
  return out;
}
