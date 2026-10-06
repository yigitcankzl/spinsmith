import {
  AdditiveBlending,
  BufferAttribute,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshMatcapMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from '@iwsdk/core';
import forgeArenaShell, { FORGE_SHELL_HEIGHT } from '../scene-assets/forge-arena-shell.scene-asset.js';
import type { ArenaLayout, Theme, Wall } from './layout.js';
import { rimRadius } from './layout.js';
import { Arena, Top } from './sim.js';
import { FONT, glass, ORANGE, TEXT } from './ui.js';
import { coreOf, ringOf } from './parts.js';
import type { Core, Ring, TipShape, TopBuild } from './parts.js';

/**
 * Visual style: matte clay bodies, light metal parts, a glowing core.
 * All shading uses matcaps we generate here: cheap on Quest, no licensing,
 * and no dependency on real-room reflections we cannot capture.
 */

type MatcapKind = 'clay' | 'metal' | 'chrome';

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
      } else if (kind === 'chrome') {
        // Polished die-cast metal: faces toward the eye mid grey, a bright strip above, a dark
        // band below it, and edges catching the light.
        const ry = 2 * z * y;
        let env = 0.5 + 0.28 * ry;
        env -= 0.32 * Math.exp(-(((ry + 0.25) / 0.12) ** 2));
        env += 0.85 * Math.exp(-(((ry - 0.45) / 0.08) ** 2));
        env += 0.7 * (1 - z) ** 2;
        r = base.r * env + 0.1 * env ** 4;
        g = base.g * env + 0.1 * env ** 4;
        b = base.b * env + 0.1 * env ** 4;
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

const LIGHT_STEEL = makeMatcap('metal', 0xc8ccd6);
const BRASS = makeMatcap('metal', 0xe2b866);

/**
 * Tops in the style of modern battle tops: a chrome blade with sharp contact points, a colored
 * plastic layer and an emblem chip on top, a dark ratchet below, and a bit with a gear ring and
 * the tip. Every part is generated here from the part's numbers.
 */
/** Real metal on the blades and ratchets: reflections of the room environment sweep across them as they spin. */
const BRUSHED = brushedTexture();
const BLADE_METAL = new MeshStandardMaterial({ color: 0xc4cad5, metalness: 1, roughness: 0.34, map: BRUSHED, roughnessMap: BRUSHED });

/**
 * Spun metal: fine concentric brushing with a few scratches, centered on the top's axis. The
 * blades' cap UVs are their x/z in meters, so the texture is scaled to span a top.
 */
function brushedTexture(): CanvasTexture {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c8c8c8';
  g.fillRect(0, 0, size, size);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 700; i++) {
    const r = rnd() * size * 0.7;
    const v = 150 + Math.floor(rnd() * 105);
    g.strokeStyle = `rgba(${v},${v},${v},${0.08 + rnd() * 0.18})`;
    g.lineWidth = 0.5 + rnd() * 1.5;
    g.beginPath();
    g.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    g.stroke();
  }
  // A few scratches and a darker, worn band toward the rim.
  for (let i = 0; i < 18; i++) {
    const a = rnd() * Math.PI * 2;
    const r0 = size * (0.15 + rnd() * 0.3);
    g.strokeStyle = `rgba(90,90,90,${0.15 + rnd() * 0.2})`;
    g.lineWidth = 0.8;
    g.beginPath();
    g.moveTo(size / 2 + Math.cos(a) * r0, size / 2 + Math.sin(a) * r0);
    g.lineTo(size / 2 + Math.cos(a + 0.2) * (r0 + 30), size / 2 + Math.sin(a + 0.2) * (r0 + 30));
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(1 / 0.08, 1 / 0.08);
  t.offset.set(0.5, 0.5);
  t.anisotropy = 4;
  return t;
}
const RATCHET_METAL = new MeshStandardMaterial({ color: 0x6b717d, metalness: 0.85, roughness: 0.45 });
/** Bit: the tip below a gear ring that catches the rails. */
const GEAR_H = 0.003;
const GEAR_R = 0.0088;
const TIP_H: Record<TipShape, number> = { flat: 0.004, rush: 0.0045, taper: 0.005, ball: 0.0045, needle: 0.007, orb: 0.005 };
/** Chip on top: a dome in the body color with a glowing emblem that heats as spin drains. */
const CHIP_R = 0.0095;
const EMBLEM = emblemTexture();
/** A soft round shadow: dark in the middle, fading to nothing at the edge. */
export const SOFT_SHADOW = softShadowTexture();

function softShadowTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // Used on black materials: the shadow is the texture's alpha.
  return new CanvasTexture(c);
}

/** Merges geometries (positions and normals only) into one, so a part stays one mesh. */
function merge(parts: BufferGeometry[]): BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = flat.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  let o = 0;
  for (const g of flat) {
    pos.set(g.getAttribute('position').array as Float32Array, o);
    nor.set(g.getAttribute('normal').array as Float32Array, o);
    o += g.getAttribute('position').count * 3;
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  return out;
}

/**
 * Bakes a static model into one mesh per material look (same kind, color, matcap, blending), so a
 * model of many parts costs a few draw calls. Textured meshes (labels, shadows) stay separate.
 * The source is left untouched; the result shares its materials.
 */
export function mergeByMaterial(root: Object3D): Group {
  root.updateMatrixWorld(true);
  const inv = new Matrix4().copy(root.matrixWorld).invert();
  const local = new Matrix4();
  const groups = new Map<string, { material: Material; geos: BufferGeometry[] }>();
  const out = new Group();
  root.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.visible) return;
    local.multiplyMatrices(inv, m.matrixWorld);
    const mat = m.material as Material & { color?: Color; map?: unknown; matcap?: { uuid: string } | null; blending?: number };
    if (Array.isArray(m.material) || mat.map) {
      const keep = new Mesh(m.geometry, m.material);
      keep.applyMatrix4(local);
      out.add(keep);
      return;
    }
    const key = [mat.type, mat.color?.getHex(), mat.matcap?.uuid, mat.transparent, mat.opacity, mat.side, mat.blending].join('|');
    const geo = m.geometry.clone().applyMatrix4(local);
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    const group = groups.get(key) ?? { material: mat, geos: [] };
    group.geos.push(geo);
    groups.set(key, group);
  });
  for (const { material, geos } of groups.values()) out.add(new Mesh(merge(geos), material));
  return out;
}

/** A spark emblem (four-point star in a ring), white on transparent, tinted by its material. */
function emblemTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  g.strokeStyle = g.fillStyle = '#ffffff';
  g.lineWidth = 9;
  g.beginPath();
  g.arc(64, 64, 52, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? 44 : 11;
    g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/** Full height of a bit (tip + gear ring). */
export function tipHeight(tip: TipShape) {
  return TIP_H[tip] + GEAR_H;
}

/** The bit: tip and gear ring, standing on y = 0. */
export function tipMesh(tip: TipShape, color = 0xe9e6df): Mesh {
  const h = TIP_H[tip];
  const parts: BufferGeometry[] = [];
  if (tip === 'flat') parts.push(new CylinderGeometry(0.0072, 0.0062, h, 24));
  else if (tip === 'rush') parts.push(new CylinderGeometry(0.0072, 0.0042, h, 24));
  else if (tip === 'taper') parts.push(new CylinderGeometry(0.0072, 0.0018, h, 24));
  else if (tip === 'ball') parts.push(new SphereGeometry(0.0045, 16, 12).translate(0, 0.0005, 0), new CylinderGeometry(0.0072, 0.004, h * 0.5, 24).translate(0, h * 0.25, 0));
  else if (tip === 'orb') parts.push(new SphereGeometry(0.0062, 18, 12).scale(1, 0.75, 1).translate(0, 0.0005, 0), new CylinderGeometry(0.0072, 0.006, h * 0.4, 24).translate(0, h * 0.3, 0));
  else parts.push(new ConeGeometry(0.0055, h, 20).rotateX(Math.PI));
  // The gear ring: twelve teeth that catch the rails.
  parts.push(new CylinderGeometry(GEAR_R, GEAR_R, GEAR_H, 24).translate(0, h / 2 + GEAR_H / 2, 0));
  for (let i = 0; i < 12; i++) {
    parts.push(new BoxGeometry(0.0022, GEAR_H, 0.0016).translate(GEAR_R + 0.0008, h / 2 + GEAR_H / 2, 0).rotateY((i / 12) * Math.PI * 2));
  }
  const m = new Mesh(merge(parts), new MeshMatcapMaterial({ matcap: makeMatcap('clay', color) }));
  m.position.y = h / 2;
  return m;
}

/** The ratchet: a dark collar as tall as the core, with one protrusion per lock tooth. */
export function coreMesh(core: Core): Mesh {
  const r = 0.0105;
  const parts: BufferGeometry[] = [new CylinderGeometry(r, r * 0.92, core.height, 28)];
  for (let i = 0; i < core.teeth; i++) {
    const a = (i / core.teeth) * Math.PI * 2;
    parts.push(new BoxGeometry(0.004, core.height * 0.85, 0.0035).translate(r + 0.0012, 0, 0).rotateY(a));
  }
  const m = new Mesh(merge(parts), RATCHET_METAL);
  m.position.y = core.height / 2;
  return m;
}

/**
 * Each ring's design: an outline (radius by angle), how thick the blade is and how its contact
 * points tilt, a raised second tier, the colored plastic layer's outline, and for open rings the
 * windows cut through it. The three classic rings are built to read apart at a glance:
 * Striker low, wide and sharp; Anvil tall, round and heavy; Halo a wide open wheel.
 */
interface RingDesign {
  outline(a: number): number;
  thick: number;
  /** Rise (+) or fall (-) of the blade per meter beyond 0.7 R: upper or smash. */
  slope: number;
  tier(a: number): number;
  tierHole: number;
  tierThick: number;
  layer(a: number): number;
  /** Windows through the blade (open wheel): count, inner and outer radius. */
  windows?: { count: number; r0: number; r1: number };
  /** Chip dome height factor (taller for heavy rings). */
  dome: number;
}

function phase(a: number, n: number) {
  return (((a * n) / (Math.PI * 2)) % 1 + 1) % 1;
}

function ringDesign(ring: Ring): RingDesign {
  const R = ring.radius;
  const circle = (r: number) => () => r;
  switch (ring.id) {
    case 'striker': {
      // Three long swept swords with a sharp point and a sheer back edge, low and thin.
      const R0 = R * 0.42;
      const sword = (a: number) => {
        const u = phase(a, 3);
        return R0 + (R * 1.18 - R0) * (u < 0.82 ? Math.pow(u / 0.82, 2.6) : Math.pow((1 - u) / 0.18, 0.6));
      };
      return { outline: sword, thick: 0.0035, slope: -0.3, tier: (a) => R0 * 0.92 + (sword(a) - R0) * 0.72, tierHole: 0.006, tierThick: 0.0022, layer: (a) => Math.min(R * 0.5, CHIP_R * 1.2 + (sword(a) - R0) * 0.3), dome: 0.9 };
    }
    case 'hook': {
      // Three claws that curl upward toward their tips.
      const R0 = R * 0.55;
      const claw = (a: number) => {
        const u = phase(a, 3);
        return R0 + (R * 1.1 - R0) * Math.pow(u < 0.62 ? u / 0.62 : (1 - u) / 0.38, 0.8);
      };
      return { outline: claw, thick: 0.004, slope: 0.9, tier: (a) => R0 * 0.85 + (claw(a) - R0) * 0.4, tierHole: 0.006, tierThick: 0.0018, layer: (a) => CHIP_R * 1.15 + (claw(a) - R0) * 0.3, dome: 1 };
    }
    case 'anvil': {
      // Six heavy rounded lobes, thick, under a raised crown: a squat, solid mass.
      const lobes = (a: number) => R * (0.9 + 0.12 * Math.pow(0.5 + 0.5 * Math.cos(phase(a, 6) * Math.PI * 2), 0.6));
      return { outline: lobes, thick: 0.008, slope: 0, tier: circle(R * 0.8), tierHole: 0.006, tierThick: 0.004, layer: circle(R * 0.56), dome: 1.4 };
    }
    case 'halo':
      // A wide wheel: a raised outer rim on four spokes, open between them.
      return { outline: circle(R * 1.05), thick: 0.0032, slope: 0, tier: circle(R * 1.05), tierHole: R * 0.86, tierThick: 0.0025, layer: circle(R * 0.4), windows: { count: 4, r0: R * 0.44, r1: R * 0.84 }, dome: 1 };
    case 'saw': {
      const saw = (a: number) => R * (0.84 + 0.2 * phase(a, 10));
      return { outline: saw, thick: 0.004, slope: -0.15, tier: circle(R * 0.7), tierHole: 0.006, tierThick: 0.0018, layer: circle(R * 0.5), dome: 1 };
    }
    default: {
      // Cog: twelve square teeth on a thick wheel.
      const cog = (a: number) => {
        const u = phase(a, 12);
        return u > 0.15 && u < 0.55 ? R * 1.02 : R * 0.86;
      };
      return { outline: cog, thick: 0.006, slope: 0, tier: circle(R * 0.72), tierHole: 0.006, tierThick: 0.002, layer: circle(R * 0.52), dome: 1.1 };
    }
  }
}

/** A flat outline extruded upward from y = 0 (shape points are (x, z) pairs), with holes. */
function extrudeOutline(points: [number, number][], hole: number, depth: number, windows: [number, number][][] = []): BufferGeometry {
  const shape = new Shape(points.map(([x, z]) => new Vector2(x, -z)));
  const h = new Path();
  h.absarc(0, 0, hole, 0, Math.PI * 2, true);
  shape.holes.push(h);
  for (const w of windows) shape.holes.push(new Path(w.map(([x, z]) => new Vector2(x, -z)).reverse()));
  const g = new ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.0006, bevelSize: 0.0005, bevelSegments: 2, curveSegments: 24 });
  return g.rotateX(-Math.PI / 2);
}

/** The window outlines of an open wheel: sectors between spokes. */
function windowOutlines(w: { count: number; r0: number; r1: number }): [number, number][][] {
  const out: [number, number][][] = [];
  for (let k = 0; k < w.count; k++) {
    const a0 = (k / w.count) * Math.PI * 2 + 0.32;
    const a1 = ((k + 1) / w.count) * Math.PI * 2 - 0.32;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 16; i++) {
      const a = a0 + ((a1 - a0) * i) / 16;
      pts.push([Math.cos(a) * w.r1, Math.sin(a) * w.r1]);
    }
    for (let i = 16; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / 16;
      pts.push([Math.cos(a) * w.r0, Math.sin(a) * w.r0]);
    }
    out.push(pts);
  }
  return out;
}

const tops = new Map<string, number>();

/** The ring's meshes (metal blade and tier, colored layer, emblem chip), with its bottom at y = base. */
export function ringMeshes(ring: Ring, color: number, base: number, glow = new MeshBasicMaterial({ color: 0xffb347 })): Mesh[] {
  const d = ringDesign(ring);
  const steps = 240;
  const sample = (f: (a: number) => number): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const r = f(a);
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return pts;
  };
  const windows = d.windows ? windowOutlines(d.windows) : [];
  const bladeGeo = extrudeOutline(sample(d.outline), 0.006, d.thick, windows);
  // Tilt the contact points up (upper) or down (smash) by how far out they reach.
  if (d.slope !== 0) {
    const pos = bladeGeo.getAttribute('position');
    const R0 = ring.radius * 0.7;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (r > R0) pos.setY(i, pos.getY(i) + d.slope * (r - R0));
    }
    bladeGeo.computeVertexNormals();
  }
  const tierGeo = extrudeOutline(sample(d.tier), d.tierHole, d.tierThick).translate(0, d.thick, 0);
  const bladeMesh = new Mesh(merge([bladeGeo, tierGeo]), BLADE_METAL);
  bladeMesh.position.y = base;
  const top = d.thick + d.tierThick;
  const layerMesh = new Mesh(extrudeOutline(sample(d.layer), CHIP_R * 0.9, 0.0025), new MeshMatcapMaterial({ matcap: makeMatcap('clay', color) }));
  layerMesh.position.y = base + top;
  // The chip: a dome in a lighter body color, the emblem glowing on top.
  const light = new Color(color).lerp(new Color(0xffffff), 0.35).getHex();
  const cap = Math.PI * 0.32;
  const dome = new Mesh(new SphereGeometry(CHIP_R, 24, 10, 0, Math.PI * 2, 0, cap), new MeshMatcapMaterial({ matcap: makeMatcap('metal', light) }));
  dome.scale.y = d.dome;
  const domeTop = base + top + 0.0025;
  dome.position.y = domeTop - CHIP_R * Math.cos(cap) * d.dome;
  glow.map = EMBLEM;
  glow.transparent = true;
  const emblem = new Mesh(new CircleGeometry(CHIP_R * 0.85, 24).rotateX(-Math.PI / 2), glow);
  emblem.position.y = domeTop + CHIP_R * (1 - Math.cos(cap)) * d.dome + 0.0003;
  tops.set(ring.id, top + 0.0025);
  return [bladeMesh, layerMesh, dome, emblem];
}

/** Top of a build above its tip (m). */
function topHeight(ring: Ring, base: number) {
  return base + (tops.get(ring.id) ?? 0.008);
}

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
  private blur: Mesh;
  private blurColor: Color;
  private flashT = 0;
  private readonly danger = new Color(0xff2a14);
  private readonly white = new Color(0xffffff);
  /** Which part each mesh belongs to, and its resting height, for the exploded view. */
  private kinds: ('ring' | 'core' | 'tip')[] = [];
  private bases: number[] = [];
  private shadow: Mesh;
  private readonly hot = new Color(0xff5a14);
  private readonly cool = new Color(0xffb347);
  private fall = 0;
  private fallX = 1;
  private fallZ = 0;

  constructor(build: TopBuild, color: number) {
    const ring = ringOf(build);
    const core = coreOf(build);
    const bit = tipMesh(build.tip);
    const ratchet = coreMesh(core);
    ratchet.position.y += tipHeight(build.tip);
    const base = tipHeight(build.tip) + core.height;
    this.core = new MeshBasicMaterial({ color: this.cool.clone() });
    const ringParts = ringMeshes(ring, color, base, this.core);
    this.parts = [...ringParts, ratchet, bit];
    this.kinds = [...ringParts.map(() => 'ring' as const), 'core', 'tip'];
    this.bases = this.parts.map((p) => p.position.y);
    // A blur halo in the body color at the blade's height, bright while spinning fast.
    this.blur = new Mesh(
      new RingGeometry(ring.radius * 0.5, ring.radius * 1.12, 48).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: new Color(color).lerp(new Color(0xffffff), 0.4), transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    );
    this.blurColor = (this.blur.material as MeshBasicMaterial).color.clone();
    this.blur.position.y = topHeight(ring, base) - 0.002;
    this.root.add(this.blur);
    this.spinner.add(...this.parts);
    this.root.add(this.spinner);
    this.shadow = new Mesh(
      new PlaneGeometry(ring.radius * 3.2, ring.radius * 3.2).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0x000000, map: SOFT_SHADOW, transparent: true, opacity: 0.5, depthWrite: false }),
    );
    // One flying copy per part, sharing geometry and materials.
    for (const p of this.parts) {
      const m = new Mesh(p.geometry, p.material);
      m.visible = false;
      this.flying.push({ mesh: m, vel: new Vector3(), spin: new Vector3() });
      this.debris.add(m);
    }
  }

  /** A hard hit: the halo flashes white for about 80 ms. */
  flash() {
    this.flashT = 0.08;
  }

  /**
   * Exploded view (k 0..1): the ring lifts off and the bit drops away, so a part brought close
   * shows where it goes; the slot it would replace pulses.
   */
  explode(k: number, focus: 'ring' | 'core' | 'tip' | null, time: number) {
    this.parts.forEach((p, i) => {
      const kind = this.kinds[i];
      p.position.y = this.bases[i] + (kind === 'ring' ? 0.012 : kind === 'tip' ? -0.009 : 0) * k;
      p.scale.setScalar(kind === focus ? 1 + 0.08 * k * (0.5 + 0.5 * Math.sin(time * 10)) : 1);
    });
  }

  /** Frees the GPU buffers when the top is rebuilt with other parts. */
  dispose() {
    for (const p of [...this.parts, this.shadow, this.blur]) {
      p.geometry.dispose();
      // Shared materials and textures (metals, the emblem, the soft shadow) stay.
      const m = p.material as MeshBasicMaterial;
      if (m === (BLADE_METAL as unknown) || m === (RATCHET_METAL as unknown)) continue;
      if (m.map && m.map !== EMBLEM && m.map !== SOFT_SHADOW) m.map.dispose();
      m.dispose();
    }
    this.root.removeFromParent();
    this.shadow.removeFromParent();
    this.debris.removeFromParent();
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
    const blur = this.blur.material as MeshBasicMaterial;
    // A hit flashes the halo white for a moment; accumulated damage heats it red and starts to
    // lift the ring off the core, so a coming burst shows before it happens.
    this.flashT = Math.max(0, this.flashT - dt);
    const risk = Math.max(0, (top.damage - 0.45) / 0.55);
    blur.opacity = top.state === 'spinning' ? Math.max(0.28 * Math.min(1, Math.max(0, top.spin)), this.flashT * 9, 0.35 * risk) : 0;
    blur.color.copy(this.blurColor).lerp(this.danger, Math.min(1, risk)).lerp(this.white, Math.min(1, this.flashT * 12));
    this.explode(0.35 * risk * (0.85 + 0.15 * Math.sin(time * 30)), null, time);
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
  // Three layers at the rim: a dark body, a metal lip (walls and rails), one accent light.
  forge: { floor: 0x5b5f69, pit: 0x2a2523, wall: LIGHT_STEEL, rail: 0x9aa1ad, railHot: 0xff8a2a, accent: 0xff6a1a, pedestal: 0x3a3d45 },
  stone: { floor: 0x606369, pit: 0x26262b, wall: STONE, rail: 0x9aa1ad, railHot: 0xffe2b8, accent: 0xf2e6d2, pedestal: 0x3d3f45 },
  clockwork: { floor: 0x675d4d, pit: 0x2e2618, wall: BRASS, rail: 0xb09a6a, railHot: 0xffd27a, accent: 0xffb43a, pedestal: 0x463b2c },
  ice: { floor: 0x6a7f8f, pit: 0x22303e, wall: FROST, rail: 0xb8c6d2, railHot: 0xffffff, accent: 0xe8f4ff, pedestal: 0x3e4a56 },
};

/**
 * The stadium floor's surface, mapped across the arena (center at 0.5, 0.5, rim at the edge):
 * fine spun brushing, two engraved grooves, dial ticks at the rim, an engraved emblem in the
 * middle, and wear where the tops run. Grayscale: the theme's floor color tints it.
 */
const FLOOR_TEXTURE = floorTexture();

function floorTexture(): CanvasTexture {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const C = S / 2;
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  // Base: a soft light center falling off to the rim.
  const base = g.createRadialGradient(C, C, 0, C, C, C);
  base.addColorStop(0, '#f2f2f2');
  base.addColorStop(1, '#c9c9c9');
  g.fillStyle = base;
  g.fillRect(0, 0, S, S);
  // Fine spun brushing.
  for (let i = 0; i < 1400; i++) {
    const v = 170 + Math.floor(rnd() * 85);
    g.strokeStyle = `rgba(${v},${v},${v},${0.05 + rnd() * 0.1})`;
    g.lineWidth = 0.6 + rnd();
    g.beginPath();
    g.arc(C, C, rnd() * C, 0, Math.PI * 2);
    g.stroke();
  }
  // Wear where the tops run: soft scuffs and short arcs in the outer band.
  for (let i = 0; i < 260; i++) {
    const a = rnd() * Math.PI * 2;
    const r = C * (0.5 + rnd() * 0.42);
    g.strokeStyle = `rgba(60,60,60,${0.04 + rnd() * 0.08})`;
    g.lineWidth = 1 + rnd() * 2.5;
    g.beginPath();
    g.arc(C, C, r, a, a + 0.1 + rnd() * 0.5);
    g.stroke();
  }
  // Two engraved grooves: a dark cut with a lit lower edge.
  for (const f of [0.36, 0.72]) {
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(40,40,40,0.55)';
    g.beginPath();
    g.arc(C, C, C * f, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(255,255,255,0.45)';
    g.beginPath();
    g.arc(C, C, C * f + 4, 0, Math.PI * 2);
    g.stroke();
  }
  // Dial ticks just inside the rim.
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const long = i % 4 === 0;
    g.strokeStyle = `rgba(40,40,40,${long ? 0.55 : 0.35})`;
    g.lineWidth = long ? 4 : 2;
    g.beginPath();
    g.moveTo(C + Math.cos(a) * C * 0.9, C + Math.sin(a) * C * 0.9);
    g.lineTo(C + Math.cos(a) * C * (long ? 0.82 : 0.86), C + Math.sin(a) * C * (long ? 0.82 : 0.86));
    g.stroke();
  }
  // The engraved emblem in the middle: a spark in a ring.
  g.strokeStyle = 'rgba(40,40,40,0.5)';
  g.lineWidth = 6;
  g.beginPath();
  g.arc(C, C, C * 0.16, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(40,40,40,0.45)';
  g.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? C * 0.13 : C * 0.035;
    g.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The forge shell baked to a few meshes, made on first use. */
let SHELL: Group | null = null;

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
  private readonly cold = new Color(0x2c3442);
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
    // Texture coordinates follow the rim: the floor texture maps to the arena whatever its shape.
    const uv = new Float32Array(count * 2);
    uv.set([0.5, 0.5], 0);
    for (let r = 1; r <= this.rings; r++) {
      for (let s = 0; s < this.segs; s++) {
        const a = (s / this.segs) * Math.PI * 2;
        const n = r / this.rings;
        uv.set([0.5 + 0.5 * n * Math.cos(a), 0.5 + 0.5 * n * Math.sin(a)], this.vi(r, s) * 2);
      }
    }
    this.geo = new BufferGeometry();
    this.geo.setAttribute('position', new BufferAttribute(pos, 3));
    this.geo.setAttribute('color', new BufferAttribute(this.colors, 3));
    this.geo.setAttribute('uv', new BufferAttribute(uv, 2));
    this.geo.setIndex(idx);
    const floor = new Mesh(this.geo, new MeshMatcapMaterial({ matcap: makeMatcap('clay', 0xffffff), map: FLOOR_TEXTURE, vertexColors: true }));
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

    // A thin glowing line just inside the rim, at floor height, in the theme's accent.
    const rimY = new Arena(layout).floorHeight(0.97) + 0.0008;
    add(tube(rimPath(layout, 0, Math.PI * 2, -0.005, rimY), 0.0011, accent));
    // A soft dark ring on the table where the pedestal stands, so the arena sits on it.
    const ao = add(new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), own(new MeshBasicMaterial({ map: SOFT_SHADOW, color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }))));
    ao.scale.set(0.15 * 3.1 * (layout.radius / 0.15) * (layout.shape === 'square' ? 1.12 : 1), 1, 0.15 * 3.1 * (layout.radius / 0.15) * (layout.shape === 'oval' ? 0.78 : 1));
    ao.position.y = -this.pedestalHeight + 0.0006;

    // Pedestal: the forge shell for forge arenas, a plain themed plinth for the others.
    const sx = layout.shape === 'square' ? 1.12 : 1;
    const sz = layout.shape === 'oval' ? 0.78 : sx;
    const scale = layout.radius / 0.15;
    if (layout.theme === 'forge') {
      SHELL ??= mergeByMaterial(forgeArenaShell);
      const shell = SHELL.clone(true);
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
    if (import.meta.env.DEV && text) console.log(`[LABEL] ${text.replace('\n', ' / ')}`);
    this.mesh.visible = text.length > 0;
    const g = this.canvas.getContext('2d')!;
    g.clearRect(0, 0, 512, 160);
    if (!text) return;
    glass(g, 512, 160, ORANGE);
    g.fillStyle = TEXT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      // Shrink each line until it fits the card.
      let size = i === 0 ? 56 : 34;
      const weight = i === 0 ? 'bold ' : '';
      do g.font = `${weight}${size--}px ${FONT}`;
      while (g.measureText(line).width > 470 && size > 12);
      g.fillText(line, 256, 80 + (i - (lines.length - 1) / 2) * 58);
    });
    this.tex.needsUpdate = true;
  }
}

/**
 * Impact effects in the arena: an expanding ring of light where a hard hit lands, and a fading
 * streak behind a top that dashes along a rail. Small pools, additive, no depth writes.
 */
export class Impacts {
  readonly root = new Group();
  private rings: { mesh: Mesh; t: number; size: number }[] = [];
  private streaks: { mesh: Mesh; t: number }[] = [];
  private nextRing = 0;
  private nextStreak = 0;

  constructor() {
    for (let i = 0; i < 4; i++) {
      const mesh = new Mesh(
        new RingGeometry(0.8, 1, 32).rotateX(-Math.PI / 2),
        new MeshBasicMaterial({ color: 0xffd2a0, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
      );
      mesh.visible = false;
      this.rings.push({ mesh, t: 1, size: 0 });
      this.root.add(mesh);
    }
    for (let i = 0; i < 3; i++) {
      const mesh = new Mesh(
        new PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(-0.5, 0, 0),
        new MeshBasicMaterial({ color: 0xffb04a, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
      );
      mesh.visible = false;
      this.streaks.push({ mesh, t: 1 });
      this.root.add(mesh);
    }
  }

  /** A ring of light expanding from a hard hit (strength 0..1). */
  hit(x: number, y: number, z: number, strength: number) {
    const r = this.rings[this.nextRing];
    this.nextRing = (this.nextRing + 1) % this.rings.length;
    r.t = 0;
    r.size = 0.02 + 0.04 * strength;
    r.mesh.position.set(x, y + 0.002, z);
    r.mesh.visible = true;
  }

  /** A streak behind a top dashing in direction (dx, dz). */
  dash(x: number, y: number, z: number, dx: number, dz: number) {
    const s = this.streaks[this.nextStreak];
    this.nextStreak = (this.nextStreak + 1) % this.streaks.length;
    s.t = 0;
    s.mesh.position.set(x, y + 0.003, z);
    s.mesh.rotation.y = -Math.atan2(dz, dx);
    s.mesh.visible = true;
  }

  update(dt: number) {
    for (const r of this.rings) {
      if (!r.mesh.visible) continue;
      r.t += dt / 0.18;
      const k = Math.min(1, r.t);
      r.mesh.scale.setScalar(r.size * (0.4 + 1.6 * k));
      (r.mesh.material as MeshBasicMaterial).opacity = 0.9 * (1 - k);
      if (k >= 1) r.mesh.visible = false;
    }
    for (const s of this.streaks) {
      if (!s.mesh.visible) continue;
      s.t += dt / 0.35;
      const k = Math.min(1, s.t);
      s.mesh.scale.set(0.09 * (0.5 + k), 1, 0.014 * (1 - 0.6 * k));
      (s.mesh.material as MeshBasicMaterial).opacity = 0.8 * (1 - k);
      if (k >= 1) s.mesh.visible = false;
    }
  }
}

/** What a shape mark draws: a live shape or a ghost of one being made. */
export interface ShapeMarkSpec {
  kind: 'ramp' | 'well';
  x: number;
  z: number;
  dx: number;
  dz: number;
  /** 0..1: how strong it still is (rings shrink as it relaxes). */
  strength: number;
  ghost: boolean;
}

/**
 * Contour marks for player shapes: two or three rings that shrink as the shape relaxes (the
 * timer is the shape itself), and a chevron showing which way a ramp pushes. Ghosts are fainter.
 * Drawn over the floor so they never hide inside a mound.
 */
export class ShapeMarks {
  readonly root = new Group();
  private marks: { group: Group; rings: Mesh[]; chevron: Mesh; mats: MeshBasicMaterial[] }[] = [];

  constructor(color: number, count = 4) {
    const ring = new RingGeometry(0.94, 1, 48).rotateX(-Math.PI / 2);
    const chevron = new ConeGeometry(0.008, 0.016, 3).rotateX(Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const group = new Group();
      const mats = [0, 1, 2, 3].map(() => new MeshBasicMaterial({ color, transparent: true, depthTest: false, depthWrite: false }));
      const rings = [0, 1, 2].map((k) => {
        const m = new Mesh(ring, mats[k]);
        m.renderOrder = 20;
        return m;
      });
      const ch = new Mesh(chevron, mats[3]);
      ch.renderOrder = 21;
      group.add(...rings, ch);
      group.visible = false;
      this.marks.push({ group, rings, chevron: ch, mats });
      this.root.add(group);
    }
  }

  /** Shows marks for these shapes (in order) at their floor heights; the rest hide. */
  show(specs: ShapeMarkSpec[], height: (x: number, z: number) => number, time: number) {
    this.marks.forEach((m, i) => {
      const s = specs[i];
      m.group.visible = !!s;
      if (!s) return;
      const sigma = s.kind === 'ramp' ? 0.03 : 0.022;
      const shrink = 0.4 + 0.6 * s.strength;
      m.group.position.set(s.x, height(s.x, s.z) + 0.003, s.z);
      const radii = s.kind === 'ramp' ? [0.6, 1.1, 1.6] : [0.5, 1, 1.5];
      m.rings.forEach((r, k) => {
        r.scale.setScalar(sigma * radii[k] * shrink);
        m.mats[k].opacity = (s.ghost ? 0.35 + 0.15 * Math.sin(time * 8) : 0.85) * (1 - k * 0.25) * Math.max(0.2, s.strength);
      });
      m.chevron.visible = s.kind === 'ramp';
      if (s.kind === 'ramp') {
        m.chevron.position.set(s.dx * sigma * 1.1, 0, s.dz * sigma * 1.1);
        m.chevron.rotation.y = Math.atan2(s.dx, s.dz);
        m.mats[3].opacity = s.ghost ? 0.6 : 0.9 * s.strength;
      }
    });
  }
}

/**
 * The shaping charges at the near rim: one ember per charge, lit when ready, dim when spent, the
 * next one glowing up as it refills.
 */
export class ChargePips {
  readonly root = new Group();
  private mats: MeshBasicMaterial[] = [];
  private readonly lit = new Color(0xff8a2a);
  private readonly dim = new Color(0x2a2f38);

  constructor(count = 2) {
    const geo = new CircleGeometry(0.006, 20).rotateX(-Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const mat = new MeshBasicMaterial({ color: this.dim.clone() });
      const m = new Mesh(geo, mat);
      m.position.x = (i - (count - 1) / 2) * 0.018;
      this.mats.push(mat);
      this.root.add(m);
    }
  }

  set(charges: number, refilling: number) {
    this.mats.forEach((m, i) => {
      m.color.copy(this.dim).lerp(this.lit, i < charges ? 1 : i === charges ? 0.35 * refilling : 0);
    });
  }
}
