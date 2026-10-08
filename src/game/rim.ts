/**
 * The machine's shared parts: what the forge and the arena workshop both build into the arena's
 * rims. Tabs and buttons engraved on metal plates along the near rim, the staggered pop of a
 * drawer's items, and the dial plate on the far rim.
 */
import { AdditiveBlending, BufferAttribute, BufferGeometry, CanvasTexture, Color, CylinderGeometry, Group, Matrix4, Mesh, MeshBasicMaterial, MeshMatcapMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, RingGeometry, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3 } from '@iwsdk/core';
import { makeMatcap, mergeByMaterial } from './visuals.js';
import { BRASS, GRAPHITE } from './materials.js';
import { ARENA_SCALE } from './reach.js';
import { addSlab, engrave, metalPlate, ORANGE, PLATE_DEPTH, pxPerM, setType, SIGN_TILT, signTexture, STEEL, TEXT } from './ui.js';

/** Where a drawer's i-th item is in its pop-in, 0..1, t seconds after the drawer opened. */
export function popIn(t: number, i: number): number {
  const u = Math.min(1, Math.max(0, (t - i * 0.05) / 0.24));
  // Eased out with a small overshoot, so a part lands with a little bounce.
  return 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;
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

/** Canvas px across one tab: sharp at arm's length (about 35 texels a degree at 0.5 m). */
const TAB_PX = 512;

/**
 * Engraved metal tabs, any number, laid at given spots: one mesh and one canvas (each tab is a
 * column of the canvas), so all of them cost a single draw call. Labels are TITLE type.
 */
export class RimTabs {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private key = '';
  /** Keys travel: each tab's press depth now (m along its face normal), its normal, and the rest pose. */
  private depth: number[];
  private speed: number[];
  private normals: Vector3[] = [];
  private turns: Quaternion[] = [];
  /** The pinch cursor: a ring on the key pointed at that tightens as the fingers close. */
  private ring = new Mesh(
    new RingGeometry(0.0078, 0.0095, 40),
    new MeshBasicMaterial({ color: new Color(ORANGE).multiplyScalar(1.5), transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  );
  private keys!: Mesh;
  private restPlate!: Float32Array;
  private restKeys!: Float32Array;
  private lastT = 0;

  constructor(
    readonly labels: string[],
    readonly spots: TabSpot[],
    readonly width: number,
    readonly height: number,
    /** How far the plates lean back toward the sky (radians): the touch band's one pitch. */
    tilt = SIGN_TILT,
  ) {
    const n = labels.length;
    this.depth = labels.map(() => 0);
    this.speed = labels.map(() => 0);
    this.canvas.width = TAB_PX * n;
    this.canvas.height = Math.round((TAB_PX * height) / width);
    this.tex = signTexture(this.canvas);
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
    // Each tab is a machined key: a slab under its plate, all merged into one mesh.
    const keys = new Group();
    spots.forEach((s) => {
      const key = new Group();
      key.applyMatrix4(m.makeRotationY(s.yaw).multiply(lean).setPosition(s.at));
      addSlab(key, width, height, 0.06, PLATE_DEPTH / ARENA_SCALE);
      keys.add(key);
      this.normals.push(new Vector3(0, 0, 1).applyMatrix4(m.setPosition(0, 0, 0)).normalize());
      this.turns.push(new Quaternion().setFromRotationMatrix(m));
    });
    const merged = mergeByMaterial(keys);
    this.keys = merged.children[0] as Mesh;
    this.mesh.add(merged);
    this.ring.visible = false;
    this.ring.renderOrder = 4;
    this.mesh.add(this.ring);
    this.restPlate = (geo.getAttribute('position').array as Float32Array).slice();
    this.restKeys = (this.keys.geometry.getAttribute('position').array as Float32Array).slice();
  }

  /** Shows the pinch cursor on key i (-1 hides it); gap is the thumb-to-index distance (m). */
  cursor(i: number, gap: number) {
    this.ring.visible = i >= 0 && i < this.spots.length;
    if (!this.ring.visible) return;
    const close = 1 - Math.min(1, Math.max(0, (gap - 0.012) / 0.05));
    this.ring.position.copy(this.spots[i].at).addScaledVector(this.normals[i], this.depth[i] + 0.0012);
    this.ring.quaternion.copy(this.turns[i]);
    this.ring.scale.setScalar(1 - 0.55 * close);
    (this.ring.material as MeshBasicMaterial).opacity = 0.35 + 0.65 * close;
  }

  /** Moves each key toward its travel: the open drawer sits pressed in, the one pointed at rises to meet the finger. */
  private travel(looks: TabLook[]) {
    const now = performance.now() / 1000;
    const dt = Math.min(0.1, now - this.lastT);
    this.lastT = now;
    let moved = false;
    looks.forEach((l, i) => {
      const target = l.on ? -0.0035 : l.hover ? 0.002 : 0;
      // A damped spring: a key bottoms out and springs back a little past rest.
      this.speed[i] = (this.speed[i] + (target - this.depth[i]) * 900 * dt) * Math.exp(-dt * 20);
      const next = this.depth[i] + this.speed[i] * dt;
      if (Math.abs(next - this.depth[i]) > 1e-6) moved = true;
      const settled = Math.abs(next - target) < 1e-5 && Math.abs(this.speed[i]) < 1e-4;
      this.depth[i] = settled ? target : next;
      if (settled) this.speed[i] = 0;
    });
    if (!moved) return;
    const n = this.labels.length;
    const shift = (attr: BufferAttribute, rest: Float32Array, per: number) => {
      const a = attr.array as Float32Array;
      for (let i = 0; i < n; i++) {
        const d = this.normals[i];
        const k = this.depth[i];
        for (let v = i * per; v < (i + 1) * per; v++) {
          a[v * 3] = rest[v * 3] + d.x * k;
          a[v * 3 + 1] = rest[v * 3 + 1] + d.y * k;
          a[v * 3 + 2] = rest[v * 3 + 2] + d.z * k;
        }
      }
      attr.needsUpdate = true;
    };
    shift(this.mesh.geometry.getAttribute('position') as BufferAttribute, this.restPlate, 4);
    const keysPos = this.keys.geometry.getAttribute('position') as BufferAttribute;
    shift(keysPos, this.restKeys, keysPos.count / n);
  }

  /** Redraws only when a tab's look changed. */
  draw(look: (i: number) => TabLook) {
    // A key of three flags per tab, built without objects; the looks are only read on a redraw.
    let key = '';
    const looks = this.labels.map((_, i) => look(i));
    for (const l of looks) key += `${l.on ? 1 : 0}${l.hover ? 1 : 0}${l.hot ? 1 : 0}`;
    this.travel(looks);
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    const H = this.canvas.height;
    g.clearRect(0, 0, this.canvas.width, H);
    // Seen from about half a metre; small plates carry no rivets.
    const k = pxPerM(TAB_PX, this.width * ARENA_SCALE);
    this.labels.forEach((label, i) => {
      const l = looks[i];
      g.save();
      g.translate(i * TAB_PX, 0);
      metalPlate(g, TAB_PX, H, false);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      setType(g, 'title', k, 0.5);
      engrave(g, label, TAB_PX / 2, H / 2 + 2, l.on || l.hot ? ORANGE : l.hover ? '#ffffff' : STEEL, TAB_PX - 40);
      // Selected: orange text and a short orange underline.
      if (l.on) {
        g.fillStyle = ORANGE;
        g.fillRect(TAB_PX * 0.3, H * 0.84, TAB_PX * 0.4, H * 0.05);
      }
      g.restore();
    });
    this.tex.needsUpdate = true;
  }
}

const BEZEL = new MeshStandardMaterial({ color: 0xb8bec8, metalness: 1, roughness: 0.28 });
const DOME = new MeshStandardMaterial({ color: 0xffffff, metalness: 0, roughness: 0.04, transparent: true, opacity: 0.18, depthWrite: false });

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

  private gauges = new Group();
  private gaugeCount = -1;

  constructor(
    private readonly width = 0.26,
    private readonly height = 0.108,
  ) {
    this.canvas.width = 1200;
    this.canvas.height = Math.round((1200 * height) / width);
    this.tex = signTexture(this.canvas);
    this.mesh = new Mesh(new PlaneGeometry(width, height), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }));
    addSlab(this.mesh, width, height, 0.06, PLATE_DEPTH / ARENA_SCALE);
    this.mesh.add(this.gauges);
  }

  /** Each painted dial sits under a steel bezel and a glass dome that catch the room's light. */
  private buildGauges(n: number) {
    this.gaugeCount = n;
    this.gauges.clear();
    if (!n) return;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const r = (74 / W) * this.width;
    const raw = new Group();
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) / n - 0.5) * this.width;
      const y = (0.5 - 268 / H) * this.height;
      const bezel = new Mesh(new TorusGeometry(r * 1.04, r * 0.11, 8, 40), BEZEL);
      bezel.position.set(x, y, 0.0006);
      const dome = new Mesh(new SphereGeometry(r, 24, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), DOME);
      dome.scale.z = 0.35;
      dome.position.set(x, y, 0.0006);
      raw.add(bezel, dome);
    }
    this.gauges.add(mergeByMaterial(raw));
  }

  draw(title: string, subtitle: string, dials: Dial[], message: string, subtitleColor = '#c9d3e0') {
    const key = JSON.stringify([title, subtitle, dials, message, subtitleColor]);
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext('2d')!;
    const W = this.canvas.width;
    const H = this.canvas.height;
    metalPlate(g, W, H);
    if (dials.length !== this.gaugeCount) this.buildGauges(dials.length);
    g.textBaseline = 'middle';
    g.textAlign = 'center';
    // On the far rim, about 1.15 m from the eyes.
    const k = pxPerM(W, this.width * ARENA_SCALE);
    const D = 1.15;
    setType(g, 'title', k, D);
    engrave(g, title.toUpperCase(), W / 2, 60, TEXT, W - 80);
    setType(g, 'caption', k, D);
    engrave(g, subtitle.toUpperCase(), W / 2, 122, subtitleColor, W - 80);
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
      setType(g, 'caption', k, D);
      engrave(g, d.label.toUpperCase(), cx, cy + R + 38, STEEL, W / dials.length - 16);
    });
    // What just happened, or what to do next: BODY, one line (a long one is squeezed, never shrunk).
    setType(g, 'body', k, D);
    engrave(g, message, W / 2, H - 46, TEXT, W - 80);
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
  const block = new Mesh(new CylinderGeometry(0.03, 0.033, 0.03, 8).rotateY(Math.PI / 8).translate(0, -0.015, 0), GRAPHITE);
  const lip = new Mesh(new TorusGeometry(0.026, 0.0028, 6, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8), BRASS);
  const well = new Mesh(new CylinderGeometry(0.024, 0.024, 0.002, 8).rotateY(Math.PI / 8).translate(0, -0.004, 0), new MeshBasicMaterial({ color: 0xff7a2a }));
  g.add(block, lip, well);
  const out = new Group();
  out.add(mergeByMaterial(g));
  return out;
}
