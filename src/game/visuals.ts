import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Group,
  InstancedMesh,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
  Vector3,
} from '@iwsdk/core';
import { Arena, ARENA_RADIUS, POCKET_HALF, POCKETS, RAIL_HALF, RAILS, Top, TopSpec } from './sim.js';

/**
 * Visual style: matte clay bodies, light metal parts, a glowing core.
 * All shading uses matcaps we generate here: cheap on Quest, no licensing,
 * and no dependency on real-room reflections we cannot capture.
 */

type MatcapKind = 'clay' | 'metal';

/** Builds a 128x128 matcap: soft diffuse clay, or bright studio-strip metal. */
export function makeMatcap(kind: MatcapKind, hex: number): DataTexture {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const base = new Color(hex);
  const light = new Vector3(-0.5, 0.7, 0.6).normalize();
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px / (size - 1)) * 2 - 1;
      // DataTexture rows start at the bottom, so py grows upward.
      const y = (py / (size - 1)) * 2 - 1;
      const r2 = Math.min(1, x * x + y * y);
      const z = Math.sqrt(1 - r2);
      const diffuse = Math.max(0, x * light.x + y * light.y + z * light.z);
      let r: number, g: number, b: number;
      if (kind === 'clay') {
        const k = 0.42 + 0.7 * Math.pow(diffuse, 0.8);
        const rim = 0.1 * Math.pow(1 - z, 3);
        r = base.r * k + rim;
        g = base.g * k + rim;
        b = base.b * k + rim;
      } else {
        // Reflection direction's vertical component picks a bright studio strip.
        const ry = 2 * z * y;
        const env =
          0.35 +
          0.75 * Math.exp(-(((ry - 0.55) / 0.14) ** 2)) +
          0.35 * Math.exp(-(((ry + 0.2) / 0.06) ** 2)) +
          0.2 * Math.exp(-(((2 * z * x + 0.6) / 0.16) ** 2));
        r = base.r * env + 0.18 * env ** 3;
        g = base.g * env + 0.18 * env ** 3;
        b = base.b * env + 0.18 * env ** 3;
      }
      const i = (py * size + px) * 4;
      data[i] = Math.min(255, r * 255);
      data[i + 1] = Math.min(255, g * 255);
      data[i + 2] = Math.min(255, b * 255);
      data[i + 3] = 255;
    }
  }
  const tex = new DataTexture(data, size, size);
  tex.colorSpace = SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Vertical stripes around the body so spin speed is readable at a glance. */
function stripeTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 4;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 4);
  g.fillStyle = '#c9c0b6';
  for (let i = 0; i < 4; i++) g.fillRect(i * 16, 0, 5, 4);
  const t = new CanvasTexture(c);
  t.wrapS = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  return t;
}

const LIGHT_STEEL = makeMatcap('metal', 0xc8ccd6);
const BRASS = makeMatcap('metal', 0xe2b866);
const STRIPES = stripeTexture();

export interface TopLook {
  body: number;
  /** Body silhouette as (radius, height) pairs from the tip up, before the tip cone. */
  profile: [number, number][];
  tipMetal: DataTexture;
  ringMetal: DataTexture;
}

export const WIDE_LOOK: TopLook = {
  body: 0xd6784f,
  profile: [
    [0.006, 0.008],
    [0.022, 0.012],
    [0.03, 0.016],
    [0.029, 0.021],
    [0.016, 0.024],
    [0.015, 0.03],
    [0, 0.03],
  ],
  tipMetal: LIGHT_STEEL,
  ringMetal: BRASS,
};

export const NARROW_LOOK: TopLook = {
  body: 0x5aaaa0,
  profile: [
    [0.004, 0.01],
    [0.014, 0.016],
    [0.021, 0.024],
    [0.02, 0.031],
    [0.012, 0.036],
    [0.011, 0.042],
    [0, 0.042],
  ],
  tipMetal: BRASS,
  ringMetal: LIGHT_STEEL,
};

/** A spinning top: tilts with wobble, spins its body, heats its core as spin drains. */
export class TopView {
  readonly root = new Group();
  private spinner = new Group();
  private core: MeshBasicMaterial;
  private shadow: Mesh;
  private readonly hot = new Color(0xff5a14);
  private readonly cool = new Color(0xffb347);
  private fall = 0;
  private fallX = 1;
  private fallZ = 0;

  constructor(look: TopLook, spec: TopSpec) {
    const tipHeight = look.profile[0][1];
    const body = new LatheGeometry(
      look.profile.map(([r, h]) => new Vector2(r, h)),
      40,
    );
    const bodyMat = new MeshMatcapMaterial({ matcap: makeMatcap('clay', look.body), map: STRIPES });
    const tip = new Mesh(new ConeGeometry(look.profile[0][0] + 0.002, tipHeight, 20).rotateX(Math.PI), new MeshMatcapMaterial({ matcap: look.tipMetal }));
    tip.position.y = tipHeight / 2;
    // Metal ring around the widest part of the body.
    const widest = look.profile.reduce((a, b) => (b[0] > a[0] ? b : a));
    const ring = new Mesh(new TorusGeometry(widest[0], 0.0028, 8, 40).rotateX(Math.PI / 2), new MeshMatcapMaterial({ matcap: look.ringMetal }));
    ring.position.y = widest[1];
    this.core = new MeshBasicMaterial({ color: this.cool.clone() });
    const top = look.profile[look.profile.length - 1][1];
    const core = new Mesh(new CircleGeometry(look.profile[look.profile.length - 2][0] * 0.55, 24).rotateX(-Math.PI / 2), this.core);
    core.position.y = top + 0.0005;
    this.spinner.add(new Mesh(body, bodyMat), tip, ring, core);
    this.root.add(this.spinner);
    this.shadow = new Mesh(
      new CircleGeometry(spec.radius * 1.15, 24).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
  }

  /** The shadow lives on the arena floor, not on the tilting top. */
  get shadowMesh() {
    return this.shadow;
  }

  sync(top: Top, arena: Arena, time: number, dt: number) {
    const visible = top.state !== 'out';
    this.root.visible = visible;
    this.shadow.visible = visible && top.state === 'spinning';
    if (!visible) return;
    const y = arena.height(top.x, top.z);
    this.root.position.set(top.x, y, top.z);
    this.shadow.position.set(top.x, y + 0.0008, top.z);
    this.spinner.rotation.y = top.angle;
    if (top.state === 'toppled') {
      // Falls over in about half a second instead of snapping flat.
      this.fall = Math.min(1, this.fall + dt * 2.2);
      const f = this.fall * this.fall;
      this.root.rotation.set(1.25 * f * this.fallZ, 0, -1.25 * f * this.fallX);
    } else {
      this.fall = 0;
      // Lean: into the direction of travel, away from the last hit, plus the precessing wobble.
      const lean = 0.03 + 0.4 * top.wobble * top.wobble;
      const ax = top.vz * 1.2 + top.kickZ * top.kick * 0.35 + Math.cos(time * 9) * lean;
      const az = -(top.vx * 1.2 + top.kickX * top.kick * 0.35) + Math.sin(time * 9) * lean;
      this.root.rotation.set(ax, 0, az);
      // Remember which way it was leaning, to fall that way.
      const l = Math.hypot(ax, az) || 1;
      this.fallZ = ax / l;
      this.fallX = -az / l;
    }
    this.core.color.copy(this.cool).lerp(this.hot, top.wobble);
  }
}

/** A torus arc lying in the floor plane from angle a0 to a1 (atan2(z, x) convention). */
function arc(radius: number, tube: number, a0: number, a1: number, mat: MeshBasicMaterial | MeshMatcapMaterial, y: number) {
  const m = new Mesh(new TorusGeometry(radius, tube, 8, Math.max(6, Math.round((a1 - a0) * 30)), a1 - a0).rotateX(Math.PI / 2), mat);
  // rotateX maps the torus start (+X) to angle 0 and sweeps toward +Z; rotating by -a0 starts it at a0.
  m.rotation.y = -a0;
  m.position.y = y;
  return m;
}

/** Arena: a polar mesh following the heightmap, a metal rim and a pedestal underneath. */
export class ArenaView {
  readonly root = new Group();
  private geo: BufferGeometry;
  private rings = 18;
  private segs = 56;
  private colors: Float32Array;
  private readonly base = new Color(0xe9dfd0);
  private readonly warm = new Color(0xffa155);
  private readonly cold = new Color(0x8f8576);
  private readonly tmp = new Color();
  private readonly pit = new Color(0x4a3a33);
  private readonly railIdle = new Color(0xd9a441);
  private readonly railHot = new Color(0xfff0b0);
  private railMats: MeshBasicMaterial[] = [];
  private railFlash: number[] = RAILS.map(() => 0);

  constructor(pedestalHeight: number) {
    const count = 1 + this.rings * this.segs;
    const pos = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    const idx: number[] = [];
    for (let r = 1; r <= this.rings; r++) {
      for (let s = 0; s < this.segs; s++) {
        const a = this.vi(r, s);
        const b = this.vi(r, (s + 1) % this.segs);
        if (r === 1) idx.push(0, b, a);
        else {
          const c = this.vi(r - 1, s);
          const d = this.vi(r - 1, (s + 1) % this.segs);
          idx.push(c, d, a, d, b, a);
        }
      }
    }
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new BufferAttribute(pos, 3));
    this.geo.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.geo.setIndex(idx);
    const floor = new Mesh(this.geo, new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0xffffff), vertexColors: true }));
    floor.frustumCulled = false;
    // Steel wall in arcs between the pockets.
    const rim = new Group();
    const steel = new MeshMatcapMaterial({ matcap: LIGHT_STEEL });
    POCKETS.forEach((p, i) => {
      const next = POCKETS[(i + 1) % POCKETS.length] + (i === POCKETS.length - 1 ? Math.PI * 2 : 0);
      rim.add(arc(ARENA_RADIUS + 0.006, 0.006, p + POCKET_HALF, next - POCKET_HALF, steel, 0.011));
    });
    // Pockets: a dark trough outside each opening with a hot glowing lip.
    const trough = new MeshBasicMaterial({ color: 0x1b1412, side: DoubleSide });
    const lip = new MeshBasicMaterial({ color: 0xff5a28, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false });
    for (const p of POCKETS) {
      const hole = new Mesh(new RingGeometry(ARENA_RADIUS - 0.004, ARENA_RADIUS + 0.03, 16, 1, p - POCKET_HALF, POCKET_HALF * 2).rotateX(Math.PI / 2), trough);
      hole.position.y = -0.002;
      rim.add(hole, arc(ARENA_RADIUS - 0.003, 0.0018, p - POCKET_HALF, p + POCKET_HALF, lip, 0.003));
    }
    // Dash rails: glowing brass strips just inside the wall; they flash when a top dashes.
    for (const r of RAILS) {
      const mat = new MeshBasicMaterial({ color: 0xd9a441 });
      this.railMats.push(mat);
      rim.add(arc(ARENA_RADIUS - 0.004, 0.0025, r - RAIL_HALF, r + RAIL_HALF, mat, 0.012));
    }
    const pedestal = new Mesh(
      new CylinderGeometry(ARENA_RADIUS + 0.012, ARENA_RADIUS + 0.03, pedestalHeight, 48, 1, true),
      new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0x6f5a4c), side: DoubleSide }),
    );
    pedestal.position.y = -pedestalHeight / 2;
    this.root.add(floor, rim, pedestal);
  }

  /** Lights up the rail nearest to an arena-local point (a top just dashed there). */
  flashRail(x: number, z: number) {
    const a = Math.atan2(z, x);
    let best = 0;
    let gap = Infinity;
    RAILS.forEach((r, i) => {
      const d = Math.abs(Math.atan2(Math.sin(a - r), Math.cos(a - r)));
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    this.railFlash[best] = 1;
  }

  /** Fades rail flashes back to idle. */
  update(dt: number) {
    this.railMats.forEach((m, i) => {
      this.railFlash[i] = Math.max(0, this.railFlash[i] - dt * 3);
      m.color.copy(this.railIdle).lerp(this.railHot, this.railFlash[i]);
    });
  }

  private vi(ring: number, seg: number) {
    return 1 + (ring - 1) * this.segs + seg;
  }

  /** Re-samples heights and tints raised shapes warm, dents cool. */
  sync(arena: Arena) {
    const pos = this.geo.attributes.position as BufferAttribute;
    for (let r = 0; r <= this.rings; r++) {
      const radius = (r / this.rings) * ARENA_RADIUS;
      const n = r === 0 ? 1 : this.segs;
      for (let s = 0; s < n; s++) {
        const a = (s / this.segs) * Math.PI * 2;
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const i = r === 0 ? 0 : this.vi(r, s);
        const h = arena.height(x, z);
        pos.setXYZ(i, x, h, z);
        const shape = arena.shapeHeight(x, z);
        const dip = -arena.pocketDip(x, z) / 0.003;
        if (shape > 0) this.tmp.copy(this.base).lerp(this.warm, Math.min(1, shape / 0.02));
        else this.tmp.copy(this.base).lerp(this.cold, Math.min(1, -shape / 0.02));
        if (dip > 0) this.tmp.lerp(this.pit, Math.min(1, dip) * 0.8);
        this.colors[i * 3] = this.tmp.r;
        this.colors[i * 3 + 1] = this.tmp.g;
        this.colors[i * 3 + 2] = this.tmp.b;
      }
    }
    pos.needsUpdate = true;
    (this.geo.attributes.color as BufferAttribute).needsUpdate = true;
    this.geo.computeVertexNormals();
  }
}

/** Pooled additive sparks for clashes. */
export class Sparks {
  readonly points: Points;
  private pos: Float32Array;
  private vel: Float32Array;
  private life: Float32Array;
  private next = 0;

  constructor(private count = 96) {
    this.pos = new Float32Array(count * 3);
    this.vel = new Float32Array(count * 3);
    this.life = new Float32Array(count);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.pos, 3));
    this.points = new Points(
      geo,
      new PointsMaterial({ color: 0xffb04a, size: 0.004, transparent: true, blending: AdditiveBlending, depthWrite: false }),
    );
    this.points.frustumCulled = false;
  }

  burst(x: number, y: number, z: number, strength: number) {
    const n = 4 + Math.round(strength * 14);
    for (let k = 0; k < n; k++) {
      const i = this.next;
      this.next = (this.next + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const sp = 0.15 + Math.random() * 0.45 * (0.5 + strength);
      this.pos.set([x, y + 0.012, z], i * 3);
      this.vel.set([Math.cos(a) * sp, 0.2 + Math.random() * 0.35, Math.sin(a) * sp], i * 3);
      this.life[i] = 0.25 + Math.random() * 0.25;
    }
  }

  update(dt: number) {
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -10; // parked out of sight
        continue;
      }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 1.6 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
    }
    (this.points.geometry.attributes.position as BufferAttribute).needsUpdate = true;
  }
}

/**
 * The rip cord as a molten-metal tether: glowing beads along a sagging curve from the top to the
 * hand. Slack sags, a taut cord straightens and trembles, and pulses flow toward the top as power
 * builds. Instanced, so the whole cord is one draw call and nothing is allocated per frame.
 */
export class Cord {
  readonly line: InstancedMesh;
  private readonly beads = 40;
  private readonly cool = new Color(0xfff1d6);
  private readonly warm = new Color(0xff6a1a);
  private readonly hot = new Color(0xffd23a);
  private readonly col = new Color();
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly sc = new Vector3();
  private readonly mid = new Vector3();
  private readonly tan = new Vector3();
  private readonly zAxis = new Vector3(0, 0, 1);
  private time = 0;

  constructor() {
    this.line = new InstancedMesh(
      new SphereGeometry(1, 8, 6),
      new MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: AdditiveBlending, depthWrite: false }),
      this.beads,
    );
    this.line.frustumCulled = false;
    this.line.visible = false;
    for (let i = 0; i < this.beads; i++) this.line.setColorAt(i, this.cool);
  }

  /** heat 0..1: slack white cord -> taut, trembling, orange-to-yellow with pulses flowing to the top. */
  set(from: Vector3 | null, to?: Vector3, heat = 0, dt = 1 / 72) {
    this.line.visible = from !== null;
    if (!from || !to) return;
    this.time += dt;
    const length = from.distanceTo(to);
    // Sag midpoint below the straight line; tension removes it.
    const sag = Math.max(0, 0.05 - length * 0.15) * (1 - heat);
    this.mid.copy(from).add(to).multiplyScalar(0.5);
    this.mid.y -= sag;
    const tremble = heat * heat * 0.004;
    for (let i = 0; i < this.beads; i++) {
      const t = i / (this.beads - 1);
      // Quadratic Bezier from -> mid control -> to.
      const a = (1 - t) * (1 - t);
      const b = 2 * (1 - t) * t;
      const c = t * t;
      this.v.set(
        from.x * a + this.mid.x * b + to.x * c,
        from.y * a + this.mid.y * b + to.y * c + Math.sin(this.time * 70 + i * 1.7) * tremble * Math.sin(Math.PI * t),
        from.z * a + this.mid.z * b + to.z * c,
      );
      // Pulses travel from the hand (t = 1) toward the top (t = 0).
      const pulse = 0.5 + 0.5 * Math.sin((t + this.time * (1.5 + 4 * heat)) * Math.PI * 6);
      const r = 0.0016 + 0.0016 * heat + 0.0014 * pulse * heat;
      // Stretch each bead along the curve so neighbours overlap into one continuous strand.
      this.tan.set(
        2 * (1 - t) * (this.mid.x - from.x) + 2 * t * (to.x - this.mid.x),
        2 * (1 - t) * (this.mid.y - from.y) + 2 * t * (to.y - this.mid.y),
        2 * (1 - t) * (this.mid.z - from.z) + 2 * t * (to.z - this.mid.z),
      );
      const segment = this.tan.length() / (this.beads - 1);
      this.q.setFromUnitVectors(this.zAxis, this.tan.normalize());
      this.m.compose(this.v, this.q, this.sc.set(r, r, Math.max(r, segment * 0.75)));
      this.line.setMatrixAt(i, this.m);
      if (heat < 0.6) this.col.copy(this.cool).lerp(this.warm, heat / 0.6);
      else this.col.copy(this.warm).lerp(this.hot, (heat - 0.6) / 0.4);
      this.col.multiplyScalar(0.7 + 0.5 * pulse);
      this.line.setColorAt(i, this.col);
    }
    this.line.instanceMatrix.needsUpdate = true;
    if (this.line.instanceColor) this.line.instanceColor.needsUpdate = true;
  }
}

/** A floating text card; redraws only when the text changes. */
export class Label {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private text = '';

  constructor(width = 0.22) {
    this.canvas.width = 512;
    this.canvas.height = 160;
    this.tex = new CanvasTexture(this.canvas);
    this.tex.colorSpace = SRGBColorSpace;
    this.mesh = new Mesh(
      new PlaneGeometry(width, (width * 160) / 512),
      new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }),
    );
  }

  set(text: string) {
    if (text === this.text) return;
    this.text = text;
    this.mesh.visible = text.length > 0;
    const g = this.canvas.getContext('2d')!;
    g.clearRect(0, 0, 512, 160);
    if (!text) return;
    g.fillStyle = 'rgba(30, 24, 20, 0.78)';
    g.beginPath();
    g.roundRect(4, 4, 504, 152, 36);
    g.fill();
    g.fillStyle = '#fff4e2';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      g.font = i === 0 ? 'bold 56px system-ui, sans-serif' : '34px system-ui, sans-serif';
      g.fillText(line, 256, 80 + (i - (lines.length - 1) / 2) * 58);
    });
    this.tex.needsUpdate = true;
  }
}
