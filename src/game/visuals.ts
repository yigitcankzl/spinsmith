import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
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
  TubeGeometry,
  Vector2,
  Vector3,
} from '@iwsdk/core';
import forgeArenaShell, { FORGE_SHELL_HEIGHT } from '../scene-assets/forge-arena-shell.scene-asset.js';
import type { ArenaLayout, Theme, Wall } from './layout.js';
import { rimRadius } from './layout.js';
import { Arena, Top, TopSpec } from './sim.js';

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

/** A top's shape: body silhouette and tip, per type. Color comes from the owner (player or opponent). */
export interface TopShape {
  /** Body silhouette as (radius, height) pairs from the tip up. */
  profile: [number, number][];
  tip: 'flat' | 'ball' | 'needle';
  tipMetal: DataTexture;
  ringMetal: DataTexture;
}

/** Striker (attack): low and wide with a flat tip that grips and charges. */
export const STRIKER_SHAPE: TopShape = {
  profile: [
    [0.008, 0.006],
    [0.02, 0.009],
    [0.024, 0.013],
    [0.022, 0.017],
    [0.012, 0.02],
    [0.011, 0.026],
    [0, 0.026],
  ],
  tip: 'flat',
  tipMetal: LIGHT_STEEL,
  ringMetal: LIGHT_STEEL,
};

/** Anvil (defense): heavy and thick-walled on a ball tip that holds its ground. */
export const ANVIL_SHAPE: TopShape = {
  profile: [
    [0.01, 0.008],
    [0.026, 0.011],
    [0.03, 0.016],
    [0.03, 0.022],
    [0.02, 0.026],
    [0.016, 0.031],
    [0, 0.031],
  ],
  tip: 'ball',
  tipMetal: BRASS,
  ringMetal: BRASS,
};

/** Needle (stamina): tall, mass out on a wide ring, spinning on a needle point. */
export const NEEDLE_SHAPE: TopShape = {
  profile: [
    [0.003, 0.012],
    [0.012, 0.016],
    [0.025, 0.022],
    [0.027, 0.026],
    [0.014, 0.032],
    [0.012, 0.04],
    [0, 0.04],
  ],
  tip: 'needle',
  tipMetal: LIGHT_STEEL,
  ringMetal: BRASS,
};

export const PLAYER_COLOR = 0xd6784f;
export const OPPONENT_COLOR = 0x4f9fb0;

const GRAVITY = 9.81;
const DEBRIS_LIFE = 2.5;

interface Debris {
  mesh: Mesh;
  vel: Vector3;
  spin: Vector3;
}

/**
 * A spinning top: tilts with travel, hits and wobble, spins its body, heats its core as spin drains,
 * topples over, and bursts into flying parts on a burst finish.
 */
export class TopView {
  readonly root = new Group();
  /** Burst parts fly in arena space, next to the top rather than inside it. */
  readonly debris = new Group();
  private spinner = new Group();
  private parts: Mesh[] = [];
  private flying: Debris[] = [];
  private debrisAge = 0;
  private burst = false;
  private core: MeshBasicMaterial;
  private shadow: Mesh;
  private readonly hot = new Color(0xff5a14);
  private readonly cool = new Color(0xffb347);
  private fall = 0;
  private fallX = 1;
  private fallZ = 0;

  constructor(shape: TopShape, spec: TopSpec, color: number) {
    const tipHeight = shape.profile[0][1];
    const body = new Mesh(
      new LatheGeometry(shape.profile.map(([r, h]) => new Vector2(r, h)), 40),
      new MeshMatcapMaterial({ matcap: makeMatcap('clay', color), map: STRIPES }),
    );
    const tipMat = new MeshMatcapMaterial({ matcap: shape.tipMetal });
    const tipR = shape.profile[0][0] + 0.002;
    let tip: Mesh;
    if (shape.tip === 'flat') tip = new Mesh(new CylinderGeometry(tipR, tipR * 0.8, tipHeight, 20), tipMat);
    else if (shape.tip === 'ball') tip = new Mesh(new SphereGeometry(tipHeight / 2, 16, 12), tipMat);
    else tip = new Mesh(new ConeGeometry(tipR + 0.002, tipHeight, 20).rotateX(Math.PI), tipMat);
    tip.position.y = tipHeight / 2;
    // Metal ring around the widest part of the body.
    const widest = shape.profile.reduce((a, b) => (b[0] > a[0] ? b : a));
    const ring = new Mesh(new TorusGeometry(widest[0], 0.0028, 8, 40).rotateX(Math.PI / 2), new MeshMatcapMaterial({ matcap: shape.ringMetal }));
    ring.position.y = widest[1];
    this.core = new MeshBasicMaterial({ color: this.cool.clone() });
    const top = shape.profile[shape.profile.length - 1][1];
    const core = new Mesh(new CircleGeometry(shape.profile[shape.profile.length - 2][0] * 0.55, 24).rotateX(-Math.PI / 2), this.core);
    core.position.y = top + 0.0005;
    this.parts = [body, tip, ring, core];
    this.spinner.add(...this.parts);
    this.root.add(this.spinner);
    this.shadow = new Mesh(
      new CircleGeometry(spec.radius * 1.15, 24).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false }),
    );
    // One flying copy per part, sharing geometry and materials.
    for (const p of this.parts) {
      const m = new Mesh(p.geometry, p.material);
      m.visible = false;
      this.flying.push({ mesh: m, vel: new Vector3(), spin: new Vector3() });
      this.debris.add(m);
    }
  }

  /** The shadow lives on the arena floor, not on the tilting top. */
  get shadowMesh() {
    return this.shadow;
  }

  /** Hides everything (when this view's type is not in play). */
  hide() {
    this.root.visible = false;
    this.shadow.visible = false;
    for (const d of this.flying) d.mesh.visible = false;
  }

  sync(top: Top, arena: Arena, time: number, dt: number) {
    if (top.finish === 'burst') {
      this.updateBurst(top, arena, dt);
      return;
    }
    this.burst = false;
    for (const d of this.flying) d.mesh.visible = false;
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
      const ax = top.vz * 0.25 + top.kickZ * top.kick * 0.35 + Math.cos(time * 9) * lean;
      const az = -(top.vx * 0.25 + top.kickX * top.kick * 0.35) + Math.sin(time * 9) * lean;
      this.root.rotation.set(ax, 0, az);
      // Remember which way it was leaning, to fall that way.
      const l = Math.hypot(ax, az) || 1;
      this.fallZ = ax / l;
      this.fallX = -az / l;
    }
    this.core.color.copy(this.cool).lerp(this.hot, top.wobble);
  }

  /** Burst: the parts fly apart, tumble, bounce on the floor and fade out. */
  private updateBurst(top: Top, arena: Arena, dt: number) {
    if (!this.burst) {
      this.burst = true;
      this.debrisAge = 0;
      this.root.updateMatrixWorld(true);
      this.flying.forEach((d, i) => {
        const p = this.parts[i];
        d.mesh.position.set(top.x, arena.height(top.x, top.z) + p.position.y, top.z);
        d.mesh.rotation.copy(this.root.rotation);
        const a = Math.random() * Math.PI * 2;
        const out = 0.25 + Math.random() * 0.35;
        d.vel.set(Math.cos(a) * out + top.vx * 0.5, 0.35 + Math.random() * 0.4, Math.sin(a) * out + top.vz * 0.5);
        d.spin.set((Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 30);
        d.mesh.visible = true;
      });
    }
    this.root.visible = false;
    this.shadow.visible = false;
    this.debrisAge += dt;
    for (const d of this.flying) {
      if (this.debrisAge > DEBRIS_LIFE) {
        d.mesh.visible = false;
        continue;
      }
      d.vel.y -= GRAVITY * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      // Bounce on the arena floor while still over it.
      const p = d.mesh.position;
      if (arena.inside(p.x, p.z)) {
        const floor = arena.height(p.x, p.z) + 0.003;
        if (p.y < floor) {
          p.y = floor;
          d.vel.y = Math.abs(d.vel.y) * 0.35;
          d.vel.x *= 0.6;
          d.vel.z *= 0.6;
          d.spin.multiplyScalar(0.6);
        }
      }
    }
  }
}

/** Colors and materials per arena theme. */
interface Palette {
  floor: number;
  pit: number;
  wall: DataTexture;
  rail: number;
  railHot: number;
  accent: number;
  pedestal: number;
}

const STONE = makeMatcap('clay', 0x9a948a);
const FROST = makeMatcap('metal', 0xbfe0f2);

const PALETTES: Record<Theme, Palette> = {
  forge: { floor: 0xe9dfd0, pit: 0x4a3a33, wall: LIGHT_STEEL, rail: 0xd9a441, railHot: 0xfff0b0, accent: 0xff5a28, pedestal: 0x6f5a4c },
  stone: { floor: 0xcdc5b8, pit: 0x3b3a40, wall: STONE, rail: 0x8fb7c9, railHot: 0xe6fbff, accent: 0x6fc7ff, pedestal: 0x6b665e },
  clockwork: { floor: 0xeadcb8, pit: 0x4a3d2a, wall: BRASS, rail: 0x5fc9b8, railHot: 0xd8fff6, accent: 0xffc04a, pedestal: 0x7a6440 },
  ice: { floor: 0xe4f4fb, pit: 0x34506a, wall: FROST, rail: 0x7fdcff, railHot: 0xffffff, accent: 0x8fe8ff, pedestal: 0x7d93a6 },
};

/** Wall heights (m) by wall type. */
const WALL_HEIGHT: Record<Wall, number> = { low: 0.007, standard: 0.012, high: 0.028, none: 0 };
const POCKET_REACH = 0.03;

/** Points along the rim from angle a0 to a1, pushed out (or in) by `offset`, at height y. */
function rimPath(layout: ArenaLayout, a0: number, a1: number, offset: number, y: number) {
  const n = Math.max(4, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 96));
  const pts: Vector3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    const r = rimRadius(layout, a) + offset;
    pts.push(new Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return pts;
}

function tube(points: Vector3[], radius: number, mat: MeshBasicMaterial | MeshMatcapMaterial) {
  return new Mesh(new TubeGeometry(new CatmullRomCurve3(points), points.length * 2, radius, 6, false), mat);
}

/** A vertical band along the rim from a0 to a1 (the wall face), from the floor up to `height`. */
function band(layout: ArenaLayout, a0: number, a1: number, offset: number, height: number, mat: MeshMatcapMaterial) {
  const pts = rimPath(layout, a0, a1, offset, 0);
  const pos: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    pos.push(p.x, -0.004, p.z, q.x, -0.004, q.z, q.x, height, q.z, p.x, -0.004, p.z, q.x, height, q.z, p.x, height, p.z);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new Mesh(g, mat);
}

/** A flat wedge outside the rim from a0 to a1 (the pocket's trough). */
function wedge(layout: ArenaLayout, a0: number, a1: number, mat: MeshBasicMaterial) {
  const inner = rimPath(layout, a0, a1, -0.004, -0.003);
  const outer = rimPath(layout, a0, a1, POCKET_REACH, -0.003);
  const pos: number[] = [];
  for (let i = 0; i < inner.length - 1; i++) {
    const [a, b, c, d] = [inner[i], inner[i + 1], outer[i + 1], outer[i]];
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return new Mesh(g, mat);
}

/** Canvas texture of a spiral (vortex) or of turntable spokes. */
function discTexture(kind: 'vortex' | 'spokes', color: string) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.translate(64, 64);
  g.strokeStyle = color;
  g.lineWidth = kind === 'vortex' ? 5 : 7;
  for (let arm = 0; arm < (kind === 'vortex' ? 3 : 6); arm++) {
    g.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const a = (arm / (kind === 'vortex' ? 3 : 6)) * Math.PI * 2 + (kind === 'vortex' ? t * 4 : 0);
      const r = 8 + t * 54;
      if (t === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.stroke();
  }
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/**
 * The arena, built from its layout: a floor mesh that follows the heightmap and the rim shape,
 * walls between the pockets, pocket troughs, dash rails, pillars and bumpers, a vortex or a
 * turntable in the middle, an ember ring for the shrinking zone, and a themed pedestal.
 * build() rebuilds everything for a new layout; sync() follows the live floor every frame.
 */
export class ArenaView {
  readonly root = new Group();
  private features = new Group();
  private geo: BufferGeometry;
  private rings = 18;
  private segs = 64;
  private colors: Float32Array;
  private layout!: ArenaLayout;
  private palette!: Palette;
  private readonly base = new Color();
  private readonly warm = new Color(0xffa155);
  private readonly cold = new Color(0x8f8576);
  private readonly pit = new Color();
  private readonly ember = new Color(0xff4a12);
  private readonly tmp = new Color();
  private readonly railIdle = new Color();
  private readonly railHot = new Color();
  private railMats: MeshBasicMaterial[] = [];
  private railFlash: number[] = [];
  private bumperMats: MeshBasicMaterial[] = [];
  private bumperFlash: number[] = [];
  private spinnerDisc: Mesh | null = null;
  private vortexDisc: Mesh | null = null;
  private disposables: { dispose(): void }[] = [];
  private time = 0;

  constructor(private readonly pedestalHeight: number) {
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
    this.root.add(floor, this.features);
  }

  /** Rebuilds walls, pockets, rails, pillars, center features and pedestal for a layout. */
  build(layout: ArenaLayout) {
    this.layout = layout;
    const P = (this.palette = PALETTES[layout.theme]);
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.features.clear();
    this.base.set(P.floor);
    this.pit.set(P.pit);
    this.railIdle.set(P.rail);
    this.railHot.set(P.railHot);
    const own = <T extends { dispose(): void }>(x: T) => (this.disposables.push(x), x);
    const add = (m: Mesh) => {
      own(m.geometry);
      this.features.add(m);
      return m;
    };
    const wallMat = own(new MeshMatcapMaterial({ matcap: P.wall, side: DoubleSide }));
    const accent = own(new MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
    const trough = own(new MeshBasicMaterial({ color: 0x15110f, side: DoubleSide }));
    const H = WALL_HEIGHT[layout.wall];

    // Walls in the gaps between pockets (the whole rim when there are none).
    const pockets = [...layout.pockets].sort((p, q) => p.angle - q.angle);
    const gaps: [number, number][] = [];
    if (layout.wall !== 'none') {
      if (pockets.length === 0) gaps.push([0, Math.PI * 2]);
      pockets.forEach((p, i) => {
        const next = pockets[(i + 1) % pockets.length];
        const end = next.angle - next.half + (i === pockets.length - 1 ? Math.PI * 2 : 0);
        gaps.push([p.angle + p.half, end]);
      });
    }
    for (const [a0, a1] of gaps) {
      if (a1 - a0 < 0.01) continue;
      add(band(layout, a0, a1, 0.004, H, wallMat));
      add(tube(rimPath(layout, a0, a1, 0.004, H), 0.004, wallMat));
    }
    if (layout.wall === 'none') {
      // A sumo ring: a bright edge line marks where the berm ends.
      add(tube(rimPath(layout, 0, Math.PI * 2, 0, this.edgeHeight(1)), 0.0018, accent));
    }

    // Pockets: dark troughs with a glowing lip; 3-point pockets get a wider, hotter lip.
    for (const p of layout.pockets) {
      add(wedge(layout, p.angle - p.half, p.angle + p.half, trough));
      add(tube(rimPath(layout, p.angle - p.half, p.angle + p.half, -0.003, 0.003), p.points >= 3 ? 0.003 : 0.0018, accent));
    }

    // Dash rails, just inside the wall; they flash when a top dashes.
    this.railMats = [];
    this.railFlash = [];
    for (const r of layout.rails) {
      const mat = own(new MeshBasicMaterial({ color: P.rail }));
      this.railMats.push(mat);
      this.railFlash.push(0);
      add(tube(rimPath(layout, r.angle - r.half, r.angle + r.half, -0.004, Math.max(0.004, H * 0.9)), 0.0025, mat));
    }

    // Pillars and bumpers.
    this.bumperMats = [];
    this.bumperFlash = [];
    const pillarMat = own(new MeshMatcapMaterial({ matcap: P.wall }));
    for (const p of layout.pillars) {
      const x = p.x * layout.radius;
      const z = p.z * layout.radius;
      const post = add(new Mesh(new CylinderGeometry(p.r, p.r * 1.15, 0.026, 20), pillarMat));
      post.position.set(x, 0.011, z);
      if (p.bumper) {
        const glow = own(new MeshBasicMaterial({ color: 0xff3b5c }));
        this.bumperMats.push(glow);
        this.bumperFlash.push(0);
        const ring = add(new Mesh(new TorusGeometry(p.r * 1.05, 0.0025, 8, 24).rotateX(Math.PI / 2), glow));
        ring.position.set(x, 0.02, z);
      }
    }

    // Center features.
    const center = 0.32 * layout.radius;
    this.vortexDisc = null;
    this.spinnerDisc = null;
    if (layout.vortex > 0) {
      const tex = own(discTexture('vortex', '#ffffff'));
      const mat = own(new MeshBasicMaterial({ map: tex, color: P.accent, transparent: true, opacity: 0.7, blending: AdditiveBlending, depthWrite: false }));
      this.vortexDisc = add(new Mesh(new CircleGeometry(center, 40).rotateX(-Math.PI / 2), mat));
    }
    if (layout.spinner > 0) {
      const tex = own(discTexture('spokes', '#5a4a30'));
      const mat = own(new MeshBasicMaterial({ map: tex, color: P.rail, transparent: true, opacity: 0.55, depthWrite: false }));
      this.spinnerDisc = add(new Mesh(new CircleGeometry(center, 40).rotateX(-Math.PI / 2), mat));
    }

    // Pedestal: the forge shell for forge arenas, a plain themed plinth for the others.
    const sx = layout.shape === 'square' ? 1.12 : 1;
    const sz = layout.shape === 'oval' ? 0.78 : sx;
    const scale = layout.radius / 0.15;
    if (layout.theme === 'forge') {
      const shell = forgeArenaShell.clone(true);
      shell.scale.set(scale * sx, this.pedestalHeight / FORGE_SHELL_HEIGHT, scale * sz);
      this.features.add(shell);
    } else {
      const plinth = add(
        new Mesh(
          new CylinderGeometry(0.15 + 0.012, 0.15 + 0.03, this.pedestalHeight, 64, 1, true),
          own(new MeshMatcapMaterial({ matcap: makeMatcap('clay', P.pedestal), side: DoubleSide })),
        ),
      );
      plinth.scale.set(scale * sx, 1, scale * sz);
      plinth.position.y = -this.pedestalHeight / 2;
    }
  }

  /** Height of the floor at a normalized radius on the rim (for the sumo edge line). */
  private edgeHeight(n: number) {
    return this.layout.wall === 'none' ? 0.02 * Math.min(1, n) : 0;
  }

  /** Lights up the rail nearest to an arena-local point (a top just dashed there). */
  flashRail(x: number, z: number) {
    const a = Math.atan2(z, x);
    let best = -1;
    let gap = Infinity;
    this.layout.rails.forEach((r, i) => {
      const d = Math.abs(Math.atan2(Math.sin(a - r.angle), Math.cos(a - r.angle)));
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    if (best >= 0) this.railFlash[best] = 1;
  }

  /** Lights up the bumper nearest to an arena-local point. */
  flashBumper(x: number, z: number) {
    let best = -1;
    let gap = Infinity;
    let bi = 0;
    for (const p of this.layout.pillars) {
      if (!p.bumper) continue;
      const d = Math.hypot(p.x * this.layout.radius - x, p.z * this.layout.radius - z);
      if (d < gap) {
        gap = d;
        best = bi;
      }
      bi++;
    }
    if (best >= 0) this.bumperFlash[best] = 1;
  }

  /** Animates flashes and the spinning center discs. (The ember zone shows in the floor colors.) */
  update(dt: number, arena: Arena) {
    this.time += dt;
    this.railMats.forEach((m, i) => {
      this.railFlash[i] = Math.max(0, this.railFlash[i] - dt * 3);
      m.color.copy(this.railIdle).lerp(this.railHot, this.railFlash[i]);
    });
    this.bumperMats.forEach((m, i) => {
      this.bumperFlash[i] = Math.max(0, this.bumperFlash[i] - dt * 4);
      m.color.setRGB(1, 0.23 + 0.7 * this.bumperFlash[i], 0.36 + 0.6 * this.bumperFlash[i]);
    });
    const center = arena.floorHeight(0) + 0.0012;
    if (this.vortexDisc) {
      this.vortexDisc.rotation.y -= dt * 3;
      this.vortexDisc.position.y = center;
    }
    if (this.spinnerDisc) {
      this.spinnerDisc.rotation.y -= dt * this.layout.spinner;
      this.spinnerDisc.position.y = center + 0.0004;
    }
  }

  private vi(ring: number, seg: number) {
    return 1 + (ring - 1) * this.segs + seg;
  }

  /** Re-samples heights along the rim shape and tints bumps warm, dents cool, pockets dark, embers hot. */
  sync(arena: Arena) {
    const pos = this.geo.attributes.position as BufferAttribute;
    const L = arena.layout;
    const safe = arena.safe;
    for (let r = 0; r <= this.rings; r++) {
      const n = r / this.rings;
      const count = r === 0 ? 1 : this.segs;
      for (let s = 0; s < count; s++) {
        const a = (s / this.segs) * Math.PI * 2;
        const radius = n * rimRadius(L, a);
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const i = r === 0 ? 0 : this.vi(r, s);
        pos.setXYZ(i, x, arena.height(x, z), z);
        const shape = arena.shapeHeight(x, z);
        const dip = -arena.pocketDip(x, z) / 0.003;
        if (shape > 0) this.tmp.copy(this.base).lerp(this.warm, Math.min(1, shape / 0.02));
        else this.tmp.copy(this.base).lerp(this.cold, Math.min(1, -shape / 0.02));
        if (dip > 0) this.tmp.lerp(this.pit, Math.min(1, dip) * 0.8);
        // Embers: outside the shrinking safe zone the floor glows, pulsing.
        if (n > safe) this.tmp.lerp(this.ember, 0.45 + 0.15 * Math.sin(this.time * 6));
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
      // Shrink each line until it fits the card.
      let size = i === 0 ? 56 : 34;
      const weight = i === 0 ? 'bold ' : '';
      do g.font = `${weight}${size--}px system-ui, sans-serif`;
      while (g.measureText(line).width > 470 && size > 12);
      g.fillText(line, 256, 80 + (i - (lines.length - 1) / 2) * 58);
    });
    this.tex.needsUpdate = true;
  }
}
