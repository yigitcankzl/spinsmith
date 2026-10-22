import {
  AdditiveBlending,
  BufferAttribute,
  BoxGeometry,
  CapsuleGeometry,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  ShapeGeometry,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  OctahedronGeometry,
  Material,
  Matrix4,
  LatheGeometry,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Path,
  PlaneGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  DynamicDrawUsage,
  Quaternion,
  RepeatWrapping,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
  PMREMGenerator,
  Scene,
  Texture,
  WebGLRenderer,
  BackSide,
  SpotLight,
} from '@iwsdk/core';
import { BODY, BRASS as BRASS_METAL, GRAPHITE, GUNMETAL, LATHE_NORMAL, metal, plastic, STEEL, topPlastic } from './materials.js';
import forgeArenaShell, { FORGE_SHELL_HEIGHT } from '../scene-assets/forge-arena-shell.scene-asset.js';
import type { ArenaLayout, Theme, Wall } from './layout.js';
import { rimRadius } from './layout.js';
import { Arena, RAMP_SIGMA, Top, WELL_SIGMA } from './sim.js';
import { addSlab, CYAN, FONT, glass, GLASS_DEPTH, GUIDE, ORANGE, pxPerM, setType, signTexture, slabMaterial, TEXT, TYPE, wrap } from './ui.js';
import { coreOf, EMBLEM_COLORS, ringOf } from './parts.js';
import { ARENA_SCALE, TABLE_Y } from './reach.js';
import { insidePoly } from './room.js';
import type { XZ } from './room.js';
import { COMFORT } from './comfort.js';
import { playLand, playTick } from './audio.js';
import type { Core, Ring, TipShape, TopBuild } from './parts.js';

/**
 * Visual style: light metal heroes on a dark matte machine body, brass trim, a glowing core.
 * Surfaces are lit (materials.ts) by the forge's environment map and the arena's key light; the
 * matcap below remains only for a few small props.
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

/**
 * Tops in the style of modern battle tops: a chrome blade with sharp contact points, a colored
 * plastic layer and an emblem chip on top, a dark ratchet below, and a bit with a gear ring and
 * the tip. Every part is generated here from the part's numbers.
 */
/** Real metal on the blades and ratchets: reflections of the room environment sweep across them as they spin. */
const BRUSHED = brushedTexture();
// The same grayscale image serves two different jobs: visible albedo is authored in sRGB, while
// roughness is data and must stay linear. Sharing one Texture object made one of those wrong.
const BRUSHED_ROUGHNESS = BRUSHED.clone();
BRUSHED.colorSpace = SRGBColorSpace;
/** The turning marks as a normal map too, so the brushing catches the light as the top turns. */
const BLADE_NORMAL = LATHE_NORMAL.clone();
BLADE_NORMAL.repeat.copy(BRUSHED.repeat);
BLADE_NORMAL.offset.copy(BRUSHED.offset);
const BLADE_METAL = new MeshStandardMaterial({ color: 0xdde2ea, metalness: 1, roughness: 0.2, map: BRUSHED, roughnessMap: BRUSHED_ROUGHNESS, normalMap: BLADE_NORMAL });

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
/** The ratchet is machine body: dark, machined. */
const RATCHET_METAL = GUNMETAL;
/** Bit: the tip below a gear ring that catches the rails. */
const GEAR_H = 0.003;
const GEAR_R = 0.0088;
const TIP_H: Record<TipShape, number> = { chisel: 0.004, spur: 0.0045, awl: 0.005, dome: 0.0045, pin: 0.007, bead: 0.005 };
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
  // A tight dark core where the top touches, inside a soft penumbra: it sits on the floor.
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.22, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.32, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  // Used on black materials: the shadow is the texture's alpha.
  return new CanvasTexture(c);
}

/**
 * Merges geometries into one, so a part stays one mesh: positions, normals, texture coordinates
 * (zero where a part has none) for the detail maps, and vertex colors (white where none) if asked.
 */
function merge(parts: BufferGeometry[], colors = false): BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g));
  const count = flat.reduce((n, g) => n + g.getAttribute('position').count, 0);
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const col = colors ? new Float32Array(count * 3).fill(1) : null;
  let o = 0;
  for (const g of flat) {
    const n = g.getAttribute('position').count;
    pos.set(g.getAttribute('position').array as Float32Array, o * 3);
    nor.set(g.getAttribute('normal').array as Float32Array, o * 3);
    const t = g.getAttribute('uv');
    if (t) uv.set(t.array as Float32Array, o * 2);
    const c = g.getAttribute('color');
    if (col && c && c.itemSize === 3) col.set(c.array as Float32Array, o * 3);
    o += n;
  }
  const out = new BufferGeometry();
  out.setAttribute('position', new BufferAttribute(pos, 3));
  out.setAttribute('normal', new BufferAttribute(nor, 3));
  out.setAttribute('uv', new BufferAttribute(uv, 2));
  if (col) out.setAttribute('color', new BufferAttribute(col, 3));
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
    const mat = m.material as Material & { color?: Color; map?: unknown; matcap?: { uuid: string } | null; blending?: number; vertexColors?: boolean };
    if (Array.isArray(m.material) || mat.map) {
      const keep = new Mesh(m.geometry, m.material);
      keep.applyMatrix4(local);
      out.add(keep);
      return;
    }
    // Lit materials merge only with themselves (finish and maps differ at the same color).
    const lit = (mat as Material & { isMeshStandardMaterial?: boolean }).isMeshStandardMaterial ? mat.uuid : '';
    const key = [mat.type, mat.color?.getHex(), mat.matcap?.uuid, lit, mat.transparent, mat.opacity, mat.side, mat.blending].join('|');
    const geo = m.geometry.clone().applyMatrix4(local);
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    const group = groups.get(key) ?? { material: mat, geos: [] };
    group.geos.push(geo);
    groups.set(key, group);
  });
  for (const { material, geos } of groups.values()) out.add(new Mesh(merge(geos, !!(material as Material & { vertexColors?: boolean }).vertexColors), material));
  return out;
}

/** Three tapered arcs round a ring, white on transparent: a spinning top's motion streaks. */
const SPIN_STREAKS = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * Math.PI * 2;
    // Each arc is drawn in short steps, bright at its head and fading along its tail.
    for (let i = 0; i < 24; i++) {
      const t = i / 24;
      g.strokeStyle = `rgba(255,255,255,${(1 - t) ** 1.5})`;
      g.lineWidth = 34 * (1 - t * 0.7);
      g.beginPath();
      g.arc(128, 128, 92, a0 - t * 1.6, a0 - (t + 1 / 24) * 1.6, true);
      g.stroke();
    }
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
})();

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
  if (tip === 'chisel') parts.push(new CylinderGeometry(0.0072, 0.0062, h, 24));
  else if (tip === 'spur') parts.push(new CylinderGeometry(0.0072, 0.0042, h, 24));
  else if (tip === 'awl') parts.push(new CylinderGeometry(0.0072, 0.0018, h, 24));
  else if (tip === 'dome') parts.push(new SphereGeometry(0.0045, 16, 12).translate(0, 0.0005, 0), new CylinderGeometry(0.0072, 0.004, h * 0.5, 24).translate(0, h * 0.25, 0));
  else if (tip === 'bead') parts.push(new SphereGeometry(0.0062, 18, 12).scale(1, 0.75, 1).translate(0, 0.0005, 0), new CylinderGeometry(0.0072, 0.006, h * 0.4, 24).translate(0, h * 0.3, 0));
  else parts.push(new ConeGeometry(0.0055, h, 20).rotateX(Math.PI));
  // The gear ring: twelve teeth that catch the rails.
  parts.push(new CylinderGeometry(GEAR_R, GEAR_R, GEAR_H, 24).translate(0, h / 2 + GEAR_H / 2, 0));
  for (let i = 0; i < 12; i++) {
    parts.push(new BoxGeometry(0.0022, GEAR_H, 0.0016).translate(GEAR_R + 0.0008, h / 2 + GEAR_H / 2, 0).rotateY((i / 12) * Math.PI * 2));
  }
  // Moulded POM: a hard, slightly glossy plastic (one per top, freed with it).
  const m = new Mesh(merge(parts), new MeshStandardMaterial({ color, metalness: 0, roughness: 0.32 }));
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
      // Six flat-faced blocks split by square notches, thick, under a raised crown: a heavy nut.
      const blocks = (a: number) => {
        const u = phase(a, 6);
        return u < 0.07 || u > 0.93 ? R * 0.84 : (R * 0.93) / Math.cos((u - 0.5) * (Math.PI / 3));
      };
      return { outline: blocks, thick: 0.008, slope: 0, tier: circle(R * 0.8), tierHole: 0.006, tierThick: 0.004, layer: circle(R * 0.56), dome: 1.4 };
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
  const sample = (f: (a: number) => number, n = steps): [number, number][] => {
    const pts: [number, number][] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
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
  const top = d.thick + d.tierThick;
  // The plastic layer's one detail language: a metal inlay line just inside its edge and three
  // bolts tying it to the blade, merged into the blade (no extra draw call).
  const inlay = new Shape(sample((a) => d.layer(a) - 0.0009, 96).map(([x, z]) => new Vector2(x, -z)));
  inlay.holes.push(new Path(sample((a) => d.layer(a) - 0.0016, 96).map(([x, z]) => new Vector2(x, -z)).reverse()));
  const metal = [bladeGeo, tierGeo, new ExtrudeGeometry(inlay, { depth: 0.0005, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, top + 0.0028, 0)];
  let inner = Infinity;
  for (let i = 0; i < 24; i++) inner = Math.min(inner, d.layer((i / 24) * Math.PI * 2));
  const boltR = (CHIP_R + inner - 0.0016) / 2;
  // A narrow layer (Halo) has no room for bolts beside the chip.
  for (let k = 0; boltR > CHIP_R + 0.001 && k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    metal.push(new CylinderGeometry(0.0008, 0.0009, 0.0007, 8).translate(Math.cos(a) * boltR, top + 0.0034, -Math.sin(a) * boltR));
  }
  const bladeMesh = new Mesh(merge(metal), BLADE_METAL);
  bladeMesh.position.y = base;
  const layerMesh = new Mesh(extrudeOutline(sample(d.layer), CHIP_R * 0.9, 0.0025), topPlastic(color));
  layerMesh.position.y = base + top;
  // The chip: a dome in a lighter body color, the emblem glowing on top.
  const light = new Color(color).lerp(new Color(0xffffff), 0.35).getHex();
  const cap = Math.PI * 0.32;
  const dome = new Mesh(new SphereGeometry(CHIP_R, 24, 10, 0, Math.PI * 2, 0, cap), new MeshStandardMaterial({ color: light, metalness: 0.7, roughness: 0.3 }));
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

/** Fighting tops are drawn this much larger than their simulated size (presentation only). */
// Combat reads from farther away than the forge. Keep the simulation radius unchanged, but let the
// forged contact profile survive at seated distance and in a 16:9 capture.
const HERO_SCALE = 1.32;
/** The drawn spin turns this many times faster than the simulation's angle (which tops out near 4.5 rev/s). */
const SPIN_DRAW = 5;

/** A thin shell hugging the blade's outer edge (its bevel included), for the team-colored glow. */
function edgeGeometry(d: RingDesign, ring: Ring): BufferGeometry {
  const n = 240;
  const outer: Vector2[] = [];
  const inner: Vector2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = d.outline(a);
    outer.push(new Vector2(Math.cos(a) * (r + 0.0011), -Math.sin(a) * (r + 0.0011)));
    inner.push(new Vector2(Math.cos(a) * (r + 0.0002), -Math.sin(a) * (r + 0.0002)));
  }
  const shape = new Shape(outer);
  shape.holes.push(new Path(inner.reverse()));
  const geo = new ExtrudeGeometry(shape, { depth: d.thick + 0.0008, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2).translate(0, -0.0004, 0);
  // The same up or down tilt as the blade's contact points.
  if (d.slope !== 0) {
    const pos = geo.getAttribute('position');
    const R0 = ring.radius * 0.7;
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (r > R0) pos.setY(i, pos.getY(i) + d.slope * (r - R0));
    }
  }
  return geo;
}

/**
 * The blade as fast spin smears it: at each radius, how much of the circle the blade (steel) and
 * the colored layer cover, as color and opacity. Clear in the middle, where the chip stands.
 */
function blurDiscTexture(d: RingDesign, reach: number, color: number): CanvasTexture {
  const N = 64;
  const steel = new Color(0xb4bcc8);
  const layer = new Color(color);
  const cols = new Float32Array(N * 4);
  const c = new Color();
  for (let j = 0; j < N; j++) {
    const r = ((j + 0.5) / N) * reach;
    let blade = 0;
    let lay = 0;
    for (let i = 0; i < 180; i++) {
      const a = (i / 180) * Math.PI * 2;
      if (d.outline(a) + 0.0005 >= r) blade++;
      if (d.layer(a) >= r) lay++;
    }
    blade /= 180;
    lay /= 180;
    c.copy(steel).lerp(layer, blade > 0 ? lay / blade : 0);
    cols.set([c.r, c.g, c.b, r < CHIP_R ? 0 : 0.92 * blade], j * 4);
  }
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(128, 128);
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      const rr = Math.hypot(x - 63.5, y - 63.5) / 64;
      const j = Math.min(N - 1, Math.floor(rr * N));
      const o = (y * 128 + x) * 4;
      img.data[o] = cols[j * 4] * 255;
      img.data[o + 1] = cols[j * 4 + 1] * 255;
      img.data[o + 2] = cols[j * 4 + 2] * 255;
      img.data[o + 3] = rr < 1 ? cols[j * 4 + 3] * 255 : 0;
    }
  }
  ctx.putImageData(img, 0, 0);
  // Spin swooshes: three white crescents trailing around the blade's reach, as top games draw speed.
  ctx.lineCap = 'round';
  for (let k = 0; k < 3; k++) {
    const a0 = (k / 3) * Math.PI * 2;
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * (1 - i / 12)})`;
      ctx.lineWidth = 5 - i * 0.3;
      ctx.beginPath();
      ctx.arc(63.5, 63.5, 56, a0 - (i + 1) * 0.09, a0 - i * 0.09);
      ctx.stroke();
    }
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export const PLAYER_COLOR = 0xe8661c;
export const OPPONENT_COLOR = 0x2a9fc4;
/** Team colors for what marks whose top it is (the floor ring): the UI's orange and the rival's cyan. */
export const TEAM_MINE = 0xff8a2a;
export const TEAM_RIVAL = 0x4fd1ff;

const GRAVITY = 9.81;
const DEBRIS_LIFE = 4;
/** The real table under the arena (arena-local): thrown tops and shattered parts land here. */
const TABLE_LEVEL = TABLE_Y;

/**
 * The real room under the arena, arena-local: the table's outline (null on the tray or when it is
 * unknown) and the floor's height. Set by the match system after every placement.
 */
export const ROOM: { poly: XZ[] | null; floor: number | null } = { poly: null, floor: null };

/** The surface under (x, z) outside the arena: the table where it is, else the floor beside it. */
function roomSurface(x: number, z: number): number {
  if (!ROOM.poly || insidePoly(ROOM.poly, x, z)) return TABLE_LEVEL;
  return ROOM.floor ?? TABLE_LEVEL;
}
/** A thrown top travels at most this far past the rim before it lands and stops (arena-local). */
const THROW_REACH = 0.12;

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
  /** Permanent nicks earned by this physical build; they spin with its forged ring. */
  private scarMarks = new Group();
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
  private depths: number[] = [];
  private shadow: Mesh;
  private teamRing: Mesh | null = null;
  private shakeT = 0;
  private shakeAmp = 0;
  private readonly hot = new Color(0xff5a14);
  private readonly cool: Color;
  private fall = 0;
  /** Seconds since the top went out (-1 while in play), and its flight when thrown over the wall. */
  private outT = -1;
  private throwPos = new Vector3();
  private throwVel = new Vector3();
  private landed = false;
  /** On the desk after a throw: spin left (0..1), its direction, how far it has gone, and whether it fell off the table. */
  private deskSpin = 0;
  private deskHand = 1;
  private travelled = 0;
  offDesk = false;
  /** Called where a thrown top lands on the desk (for its scorch mark). */
  onLand: ((x: number, y: number, z: number) => void) | null = null;
  /** Picked off the desk by the player's hand: hidden until the next round. */
  picked = false;
  /** Where the thrown top rests now (arena-local), or null while not resting on the desk. */
  get restingAt(): Vector3 | null {
    return this.outT >= 0 && this.landed && this.deskSpin <= 0 ? this.throwPos : null;
  }
  /** Where a thrown top is still spinning on the real desk, so a rescue rail can catch it. */
  get rescueAt(): Vector3 | null {
    return this.outT >= 0 && this.landed && this.deskSpin > 0 && !this.offDesk ? this.throwPos : null;
  }
  /** Outer Ring's readable last-chance beat: keep the top alive while its table drift brakes hard. */
  brakeForRescue(dt: number): boolean {
    if (this.outT < 0 || !this.landed || this.offDesk) return false;
    this.throwVel.x *= Math.exp(-dt * 9);
    this.throwVel.z *= Math.exp(-dt * 9);
    this.deskSpin = Math.max(this.deskSpin, 0.32);
    return true;
  }
  /** Keeps a rescued desk top visibly seated on the player's palm (stage-local coordinates). */
  carryRescue(at: Vector3) {
    if (this.outT < 0 || !this.landed || this.offDesk) return;
    this.throwPos.copy(at);
    this.throwVel.set(0, 0, 0);
    this.deskSpin = Math.max(this.deskSpin, 0.32);
  }
  private fallX = 1;
  private fallZ = 0;
  /** Everything drawn of the top (halo, blur disc, edge, parts), scaled up in a fight and punched by hits. */
  private body = new Group();
  private drawScale = 1;
  private readonly ring: Ring;
  private readonly base: number;
  private readonly bodyColor: number;
  /** The drawn spin: SPIN_DRAW times the simulation's angle, and its rate (sim rad/s, smoothed). */
  private drawAngle = 0;
  private lastAngle = 0;
  private rate = 0;
  /** Set by the match while the simulation is held (hit-stop): the drawn spin holds too. */
  frozen = false;
  /** Set by the match while the simulation is stopped (a round's end): a top still up keeps spinning. */
  coast = false;
  /** Fighting tops only: a radial motion-blur disc over the blade, and a team-colored edge on it. */
  private disc: Mesh | null = null;
  private discY = 0;
  private edge: Mesh | null = null;
  private readonly edgeColor = new Color();
  /** A hit's punch: time since it (s), how long it holds, its size, and the recoil direction and lean. */
  private popT = 9;
  private popHold = 0;
  private popAmp = 0;
  private recX = 0;
  private recZ = 0;
  private recoil = 0;
  private edgeFlash = 0;
  private clock = 0;
  private lastFlash = -9;
  /** A toppled top's clatter after it hits the floor (s, -1 before), and where it fell. */
  private clatterT = -1;
  /** Called where a spun-out top lands on its side (for its sparks). */
  onTopple: ((x: number, y: number, z: number) => void) | null = null;

  constructor(build: TopBuild, color: number) {
    const ring = ringOf(build);
    const core = coreOf(build);
    const bit = tipMesh(build.tip);
    const ratchet = coreMesh(core);
    ratchet.position.y += tipHeight(build.tip);
    const base = tipHeight(build.tip) + core.height;
    this.ring = ring;
    this.base = base;
    this.bodyColor = color;
    // The emblem's glow at rest: the build's chosen glow (the forge's orange unless earned otherwise).
    this.cool = new Color(EMBLEM_COLORS[build.emblem ?? 0] ?? EMBLEM_COLORS[0]);
    this.core = new MeshBasicMaterial({ color: this.cool.clone() });
    const ringParts = ringMeshes(ring, color, base, this.core);
    this.parts = [...ringParts, ratchet, bit];
    this.kinds = [...ringParts.map(() => 'ring' as const), 'core', 'tip'];
    this.bases = this.parts.map((p) => p.position.y);
    this.depths = this.parts.map((p) => p.position.z);
    // A blur halo in the body color at the blade's height, bright while spinning fast.
    this.blur = new Mesh(
      new RingGeometry(ring.radius * 0.5, ring.radius * 1.12, 48).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: new Color(color).lerp(new Color(0xffffff), 0.12), map: SPIN_STREAKS, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }),
    );
    this.blur.visible = false;
    this.blurColor = (this.blur.material as MeshBasicMaterial).color.clone();
    this.blur.position.y = topHeight(ring, base) - 0.002;
    this.body.add(this.blur);
    this.spinner.add(...this.parts, this.scarMarks);
    this.body.add(this.spinner);
    this.root.add(this.body);
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

  /** Draws a bounded set of persistent victory, hand-move and Smith Order cuts. */
  scars(s: { wins: number; shapes: number; orders: number }) {
    for (const child of [...this.scarMarks.children]) {
      const mesh = child as Mesh;
      mesh.geometry.dispose();
      (mesh.material as Material).dispose();
      mesh.removeFromParent();
    }
    const earned = [
      { count: Math.min(5, s.wins), color: 0xd9e0e8, angle: -Math.PI / 2 },
      { count: Math.min(4, s.shapes), color: 0xff7a24, angle: Math.PI / 6 },
      { count: Math.min(3, s.orders), color: 0xffd36a, angle: (Math.PI * 5) / 6 },
    ];
    const y = topHeight(this.ring, this.base) + 0.0007;
    earned.filter((e) => e.count > 0).forEach(({ count, color, angle }) => {
      const mark = new Mesh(
        new RingGeometry(this.ring.radius * 0.78, this.ring.radius * 0.98, Math.max(4, count * 3), 1, angle, count * 0.085).rotateX(-Math.PI / 2),
        new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
      );
      mark.position.y = y;
      this.scarMarks.add(mark);
    });
  }

  /** A hard hit shakes the top in place for a moment (real time, so it quivers through hit-stop). */
  shake(strength: number) {
    this.shakeT = 0.055 + 0.105 * strength;
    this.shakeAmp = 0.0009 + 0.0023 * strength;
  }

  /** A hard hit: the halo flashes white for about 80 ms. */
  flash() {
    if (COMFORT.flashes) this.flashT = 0.11;
  }

  /**
   * A hit lands (strength 0..1) from the direction (dx, dz) it came from: the top swells and
   * squats, recoils and leans away, and its edge flares, holding the pose for `hold` seconds (the
   * hit-stop) before it springs back. Presentation only. The edge goes white-hot only with flashes
   * on, and at most about three times a second; in the Calm modes it brightens in its own color.
   */
  hit(strength: number, dx: number, dz: number, hold = 0) {
    this.popT = 0;
    this.popHold = hold;
    this.popAmp = 0.04 + 0.08 * strength;
    const l = Math.hypot(dx, dz) || 1;
    this.recX = -dx / l;
    this.recZ = -dz / l;
    this.recoil = 0.0015 + 0.004 * strength;
    const often = this.clock - this.lastFlash < 0.33;
    this.lastFlash = this.clock;
    this.edgeFlash = often ? 0.4 : 1;
  }

  /**
   * Exploded view (k 0..1): the ring lifts off and the bit drops away, so a part brought close
   * shows where it goes; the slot it would replace pulses.
   */
  explode(k: number, focus: 'ring' | 'core' | 'tip' | null, time: number, revealDepth = 0) {
    this.parts.forEach((p, i) => {
      const kind = this.kinds[i];
      p.position.y = this.bases[i] + (kind === 'ring' ? 0.012 : kind === 'tip' ? -0.009 : 0) * k;
      // In the forge, fan the stack toward the player as well as vertically: the face stays
      // visible while the dark ratchet and the bit no longer hide directly behind the ring.
      p.position.z = this.depths[i] + (kind === 'ring' ? -0.006 : kind === 'core' ? 0.003 : 0.012) * k * revealDepth;
      p.scale.setScalar(kind === focus ? 1 + 0.08 * k * (0.5 + 0.5 * Math.sin(time * 10)) : 1);
    });
    // The edge glow and the blur disc lift with the ring.
    if (this.edge && this.disc) {
      this.edge.position.y = this.base + 0.012 * k;
      this.disc.position.y = this.discY + 0.012 * k;
    }
  }

  /** Frees the GPU buffers when the top is rebuilt with other parts. */
  dispose() {
    for (const child of [...this.scarMarks.children]) {
      const mesh = child as Mesh;
      mesh.geometry.dispose();
      (mesh.material as Material).dispose();
    }
    for (const p of [...this.parts, this.shadow, this.blur, ...(this.disc && this.edge ? [this.disc, this.edge] : [])]) {
      p.geometry.dispose();
      // Shared materials and textures (metals, the emblem, the soft shadow) stay.
      const m = p.material as MeshBasicMaterial;
      if (m === (BLADE_METAL as unknown) || m === (RATCHET_METAL as unknown)) continue;
      if (m.map && m.map !== EMBLEM && m.map !== SOFT_SHADOW) m.map.dispose();
      m.dispose();
    }
    if (this.teamRing) {
      this.teamRing.geometry.dispose();
      (this.teamRing.material as Material).dispose();
    }
    this.root.removeFromParent();
    this.shadow.removeFromParent();
    this.debris.removeFromParent();
  }

  /**
   * Marks a fighting top: a ring of light on the floor in the team's color (orange yours, cyan the
   * rival's), a glowing edge on the blade in that color that brightens with spin, a motion-blur
   * disc for fast spin, and a larger drawing (HERO_SCALE; the simulation's radius is unchanged).
   */
  /**
   * `ring`: draw the team ring under the top (a brawl's extra tops skip it to save a draw per eye).
   * `sides`: the ring's outline, so ownership is a shape too (yours round, the rival's a hexagon).
   */
  team(color: number, radius: number, ring = true, sides = 40) {
    if (ring) {
      const mesh = new Mesh(
        new RingGeometry(radius * 1.2, radius * 1.6, sides).rotateX(-Math.PI / 2),
        // Painted, not glowing: a solid team band reads on the light floor, where additive light washes out.
        new MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }),
      );
      // The contact shadow is offset away from the back-left key. Counter-offset the team ring so it
      // remains centered on the top instead of inheriting the shadow's tiny directional bias.
      mesh.position.set(-0.0024, 0.0003, -0.0018);
      mesh.renderOrder = 2;
      this.teamRing = mesh;
      this.shadow.add(mesh);
    }
    this.drawScale = HERO_SCALE;
    this.body.scale.setScalar(HERO_SCALE);
    this.shadow.geometry.scale(HERO_SCALE, 1, HERO_SCALE);
    for (const f of this.flying) f.mesh.scale.setScalar(HERO_SCALE);
    const d = ringDesign(this.ring);
    this.edgeColor.set(color);
    this.edge = new Mesh(edgeGeometry(d, this.ring), new MeshBasicMaterial({ color, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.edge.position.y = this.base;
    this.spinner.add(this.edge);
    let reach = 0;
    for (let i = 0; i < 90; i++) reach = Math.max(reach, d.outline((i / 90) * Math.PI * 2));
    reach += 0.0008;
    this.disc = new Mesh(
      new CircleGeometry(reach, 48).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ map: blurDiscTexture(d, reach, this.bodyColor), transparent: true, opacity: 0, depthWrite: false }),
    );
    // Just over the colored layer; the chip's dome stands through its clear middle.
    this.discY = this.base + d.thick + d.tierThick + 0.0027;
    this.disc.position.y = this.discY;
    this.disc.renderOrder = 1;
    this.body.add(this.disc);
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
    if (top.state === 'out' && (top.finish === 'over' || top.finish === 'pocket')) {
      this.updateOut(top, arena, dt);
      return;
    }
    this.outT = -1;
    this.picked = false;
    const visible = top.state !== 'out';
    this.root.visible = visible;
    this.shadow.visible = visible && top.state === 'spinning';
    if (!visible) return;
    const y = arena.height(top.x, top.z);
    this.root.position.set(top.x, y, top.z);
    if (this.shakeT > 0) {
      // Side to side, fading out.
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeAmp * (this.shakeT / 0.16) * (Math.floor(this.shakeT * 120) % 2 ? 1 : -1);
      this.root.position.x += a;
      this.root.position.z -= a * 0.5;
    }
    this.shadow.position.set(top.x + 0.0024, y + 0.0008, top.z + 0.0018);
    // The team ring glows with the spin, and flashes with a hit.
    if (this.teamRing) {
      (this.teamRing.material as MeshBasicMaterial).opacity = COMFORT.contrast ? 1 : 0.3 + 0.4 * Math.min(1, Math.max(0, top.spin)) + this.flashT * 6;
      this.teamRing.scale.setScalar(COMFORT.contrast ? 1.35 : 1);
    }
    // The drawn spin: the simulation's angle sped up SPIN_DRAW times (a jump, as at a new round or a
    // replay's start, is not a turn). Held while the simulation is; coasting on once it has stopped.
    let turn = top.angle - this.lastAngle;
    this.lastAngle = top.angle;
    if (Math.abs(turn) > 4) turn = 0;
    if (turn === 0 && this.coast && !this.frozen && top.state === 'spinning') turn = (6 + 22 * Math.min(1, Math.max(0, top.spin))) * top.hand * dt;
    this.drawAngle = (this.drawAngle + turn * SPIN_DRAW) % (Math.PI * 200);
    if (!this.frozen && dt > 0) this.rate += (Math.abs(turn) / dt - this.rate) * Math.min(1, dt * 12);
    this.spinner.rotation.y = this.drawAngle;
    // A hit's punch: up to its size in 40 ms, held through the hit-stop, then back in 160 ms.
    this.clock += dt;
    this.popT += dt;
    const after = this.popT - 0.04 - this.popHold;
    const q = this.popT < 0.04 ? this.popT / 0.04 : after < 0 ? 1 : Math.max(0, 1 - after / 0.16) ** 2;
    const s = this.drawScale * (1 + this.popAmp * q);
    this.body.scale.set(s, s * (1 - 0.5 * this.popAmp * q), s);
    this.body.position.set(this.recX * this.recoil * q, 0, this.recZ * this.recoil * q);
    if (top.state === 'toppled') {
      // Falls over in about half a second instead of snapping flat, then clatters on its side.
      this.fall = Math.min(1, this.fall + dt * 2.2);
      const f = this.fall * this.fall;
      let rattle = 0;
      if (this.fall >= 1) {
        if (this.clatterT < 0) {
          this.clatterT = 0;
          this.onTopple?.(top.x + this.fallX * this.ring.radius, y, top.z + this.fallZ * this.ring.radius);
        }
        this.clatterT += dt;
        const k = Math.max(0, 1 - this.clatterT / 0.7);
        rattle = 0.14 * k * k * Math.abs(Math.sin(this.clatterT * 38));
      }
      this.root.rotation.set((1.25 * f - rattle) * this.fallZ, 0, -(1.25 * f - rattle) * this.fallX);
    } else {
      this.fall = 0;
      this.clatterT = -1;
      // Lean: into the direction of travel, away from the last hit (and from a fresh punch), plus the precessing wobble.
      const lean = 0.03 + 0.4 * top.wobble * top.wobble;
      const punch = 2.5 * this.popAmp * q;
      const ax = top.vz * 0.25 + top.kickZ * top.kick * 0.35 + this.recZ * punch + Math.cos(time * 9) * lean;
      const az = -(top.vx * 0.25 + top.kickX * top.kick * 0.35 + this.recX * punch) + Math.sin(time * 9) * lean;
      this.root.rotation.set(ax, 0, az);
      // Remember which way it was leaning, to fall that way.
      const l = Math.hypot(ax, az) || 1;
      this.fallZ = ax / l;
      this.fallX = -az / l;
    }
    // The edge's flare after a hit: white-hot with flashes on, its own color brightened without.
    this.edgeFlash = Math.max(0, this.edgeFlash - dt * 4);
    const flare = this.edgeFlash * this.edgeFlash;
    this.core.color.copy(this.cool).lerp(this.hot, top.wobble);
    if (COMFORT.flashes) this.core.color.lerp(this.white, 0.7 * flare);
    const blur = this.blur.material as MeshBasicMaterial;
    // A hit flashes the halo white for a moment; accumulated damage heats it red and starts to
    // lift the ring off the core, so a coming burst shows before it happens.
    this.flashT = Math.max(0, this.flashT - dt);
    const risk = Math.max(0, (top.damage - 0.45) / 0.55);
    // Hot metal (docs/DUEL-DESIGN.md): it glows red early, since a hot top flies further from the strike.
    const heat = Math.max(0, (top.damage - 0.12) / 0.88);
    const spinning = top.state === 'spinning';
    blur.opacity = spinning ? Math.max(0.5 * Math.min(1, Math.max(0, top.spin)), this.flashT * 9, 0.6 * heat) : 0;
    this.blur.visible = blur.opacity > 0.01;
    // The streaks sweep round at half the simulation's rate, so the spin reads as motion.
    this.blur.rotation.y = this.drawAngle * 0.1;
    blur.color.copy(this.blurColor).lerp(this.danger, Math.min(1, heat * 1.3)).lerp(this.white, Math.min(1, this.flashT * 12));
    // Fast spin smears the blade into a disc; as the spin drops the disc fades and the parts show.
    const fast = spinning ? Math.min(1, Math.max(0, (this.rate - 9) / 15)) : 0;
    if (this.disc) {
      (this.disc.material as MeshBasicMaterial).opacity = 0.85 * fast * fast * (3 - 2 * fast);
      this.disc.visible = (this.disc.material as MeshBasicMaterial).opacity > 0.01;
      // The swooshes sweep round like the streaks, slower than the real rate so they read as motion.
      this.disc.rotation.y = this.drawAngle * 0.1;
    }
    if (this.edge) {
      const m = this.edge.material as MeshBasicMaterial;
      m.color.copy(this.edgeColor).lerp(this.danger, Math.min(1, heat)).lerp(this.white, COMFORT.flashes ? 0.8 * flare : 0);
      m.opacity = top.state === 'out' ? 0 : Math.min(1, 0.2 + 0.6 * fast + (COMFORT.flashes ? 0.8 : 0.4) * flare);
    }
    this.explode(0.35 * risk * (0.85 + 0.15 * Math.sin(time * 30)), null, time);
  }

  /**
   * Out of the fight. Thrown over the wall, it flies off the rim, lands on the real table beside
   * the arena, skids and falls over; into a slag pit, it sinks out of sight.
   */
  private updateOut(top: Top, arena: Arena, dt: number) {
    if (this.picked) {
      this.root.visible = false;
      this.shadow.visible = false;
      return;
    }
    if (this.outT < 0) {
      this.outT = 0;
      this.landed = false;
      this.fall = 0;
      this.throwPos.set(top.x, arena.height(top.x, top.z), top.z);
      this.throwVel.set(top.vx, 0.19, top.vz);
      // Still spinning as it flies: on the desk it keeps going for a while.
      this.deskSpin = Math.max(0.35, top.spin);
      this.deskHand = top.hand;
      this.travelled = 0;
      this.offDesk = false;
    }
    this.outT += dt;
    this.shadow.visible = false;
    if (top.finish === 'pocket') {
      const k = Math.min(1, this.outT / 0.3);
      this.root.visible = k < 1;
      this.root.position.set(this.throwPos.x, this.throwPos.y - 0.03 * k * k, this.throwPos.z);
      return;
    }
    this.root.visible = true;
    this.blur.visible = false;
    if (this.edge) this.edge.visible = false;
    const p = this.throwPos;
    const v = this.throwVel;
    // Gravity in the arena's own units (it is drawn ARENA_SCALE times life size).
    const g = GRAVITY / ARENA_SCALE;
    if (!this.landed) {
      v.y -= g * dt;
      p.addScaledVector(v, dt);
      // Without a known table edge, never farther than a short throw past the rim.
      const r = Math.hypot(p.x, p.z);
      const max = arena.radius + THROW_REACH;
      if (!ROOM.poly && r > max) {
        p.x *= max / r;
        p.z *= max / r;
        v.x = 0;
        v.z = 0;
      }
      // It lands on the table, or past its edge, on the real floor.
      const ground = roomSurface(p.x, p.z);
      if (p.y <= ground) {
        p.y = ground;
        // Never inside the pedestal: a top dropping right by the rim lands just outside it.
        const rr = Math.hypot(p.x, p.z);
        const out = arena.radius + 0.035;
        if (rr < out && rr > 1e-6) {
          p.x *= out / rr;
          p.z *= out / rr;
        }
        const floor = ground < TABLE_LEVEL;
        if (floor && !this.offDesk) this.offDesk = true;
        if (floor) this.deskSpin = 0;
        playLand(floor ? 'floor' : 'table', p.x, Math.min(1, Math.abs(v.y) * 2));
        if (!floor) this.onLand?.(p.x, p.y, p.z);
        v.y = floor ? -v.y * 0.3 : 0;
        this.landed = !floor || Math.abs(v.y) < 0.05;
        if (import.meta.env.DEV && this.landed) console.log(`[OUT] landed on the ${floor ? 'floor' : 'table'} at ${p.x.toFixed(2)},${p.z.toFixed(2)}`);
      }
    } else {
      // On the desk it is still a top: it spins on, curving with its spin, slowing as it goes, and
      // only falls over once its spin is gone. Off the table's edge it drops again.
      if (this.deskSpin > 0) {
        this.deskSpin = Math.max(0, this.deskSpin - dt * 0.4);
        const sp = Math.hypot(v.x, v.z);
        // The world travel is capped (about 45 cm), so it stays in view.
        const drag = this.travelled * ARENA_SCALE > 0.45 ? 4 : 0.7;
        v.multiplyScalar(Math.exp(-dt * drag));
        const turn = this.deskHand * dt * 1.4;
        const c = Math.cos(turn);
        const s = Math.sin(turn);
        const vx = v.x * c - v.z * s;
        v.z = v.x * s + v.z * c;
        v.x = vx;
        this.travelled += sp * dt;
        // Never into the pedestal: it bounces off.
        const r = Math.hypot(p.x, p.z);
        const edge = arena.radius + 0.035;
        if (r < edge && (v.x * p.x + v.z * p.z) < 0) {
          const nx = p.x / r;
          const nz = p.z / r;
          const vn = v.x * nx + v.z * nz;
          v.x -= 1.6 * vn * nx;
          v.z -= 1.6 * vn * nz;
        }
      } else {
        v.multiplyScalar(Math.exp(-dt * 6));
        this.fall = Math.min(1, this.fall + dt * 2.2);
      }
      p.x += v.x * dt;
      p.z += v.z * dt;
      if (roomSurface(p.x, p.z) < p.y - 0.001) {
        // The real edge is the event. Report it while the top is still visible in the air,
        // rather than waiting until it reaches the physical floor below the table.
        this.offDesk = true;
        this.landed = false;
        v.y = 0;
      }
    }
    this.root.position.copy(p);
    this.spinner.rotation.y += dt * (8 + 50 * this.deskSpin) * (1 - this.fall) * SPIN_DRAW * 0.6;
    // Its blur fades as it spins down on the desk, so it falls over crisp.
    if (this.disc) {
      (this.disc.material as MeshBasicMaterial).opacity = 0.85 * Math.min(1, Math.max(0, (this.deskSpin - 0.15) * 2)) * (1 - this.fall);
      this.disc.visible = (this.disc.material as MeshBasicMaterial).opacity > 0.01;
    }
    // A slowing top wobbles before it falls.
    if (this.landed && this.deskSpin > 0 && this.deskSpin < 0.25) {
      const w = (0.25 - this.deskSpin) * 1.2;
      this.root.rotation.set(w * Math.sin(this.outT * 9), 0, w * Math.cos(this.outT * 9));
      this.shadow.visible = true;
      this.shadow.position.set(p.x + 0.0024, p.y + 0.0008, p.z + 0.0018);
      return;
    }
    const f = this.fall * this.fall;
    this.root.rotation.set(1.25 * f * this.fallZ, 0, -1.25 * f * this.fallX);
    this.shadow.visible = this.landed;
    this.shadow.position.set(p.x + 0.0024, p.y + 0.0008, p.z + 0.0018);
  }

  /** Burst: the parts fly apart, tumble, bounce on the floor and fade out. */
  private updateBurst(top: Top, arena: Arena, dt: number) {
    if (!this.burst) {
      this.burst = true;
      this.debrisAge = 0;
      this.root.updateMatrixWorld(true);
      this.flying.forEach((d, i) => {
        const p = this.parts[i];
        d.mesh.position.set(top.x, arena.height(top.x, top.z) + p.position.y * this.drawScale, top.z);
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
      d.vel.y -= (GRAVITY / ARENA_SCALE) * dt;
      d.mesh.position.addScaledVector(d.vel, dt);
      d.mesh.rotation.x += d.spin.x * dt;
      d.mesh.rotation.y += d.spin.y * dt;
      d.mesh.rotation.z += d.spin.z * dt;
      // Bounce on the arena floor while over it, else on the real table beside it.
      const p = d.mesh.position;
      {
        const floor = arena.inside(p.x, p.z) ? arena.height(p.x, p.z) + 0.003 : roomSurface(p.x, p.z) + 0.003;
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
  /** Walls and pillars (shared, never freed). */
  wall: MeshStandardMaterial;
  rail: number;
  railHot: number;
  accent: number;
  pedestal: number;
}

/** Walls are seen from both sides (inside the bowl and over the rim). */
const doubleSided = (m: MeshStandardMaterial) => {
  const c = m.clone();
  c.side = DoubleSide;
  return c;
};
const STEEL_WALL = doubleSided(STEEL);
const BRASS_WALL = doubleSided(BRASS_METAL);
const STONE = doubleSided(plastic(0x9a948a));
const FROST = doubleSided(metal(0xbfe0f2));
const BASALT = doubleSided(plastic(0x5a4c48));
const VOID_METAL = doubleSided(metal(0x8a7ab0));

const PALETTES: Record<Theme, Palette> = {
  // Three layers at the rim: a dark body, a metal lip (walls and rails), one accent light.
  // The floor is satin plastic, clearly lighter than the painted shell around it.
  forge: { floor: 0x9ea2a8, pit: 0x171313, wall: STEEL_WALL, rail: 0x9aa1ad, railHot: 0xff8a2a, accent: 0xff6a1a, pedestal: BODY },
  stone: { floor: 0xa9abae, pit: 0x26262b, wall: STONE, rail: 0x9aa1ad, railHot: 0xffe2b8, accent: 0xf2e6d2, pedestal: 0x3d3f45 },
  clockwork: { floor: 0xb3a68c, pit: 0x2e2618, wall: BRASS_WALL, rail: 0xb09a6a, railHot: 0xffd27a, accent: 0xffb43a, pedestal: 0x463b2c },
  ice: { floor: 0xaec4d2, pit: 0x22303e, wall: FROST, rail: 0xb8c6d2, railHot: 0xffffff, accent: 0xe8f4ff, pedestal: 0x3e4a56 },
  lava: { floor: 0x86706a, pit: 0x3a0c04, wall: BASALT, rail: 0x8a7a72, railHot: 0xff5a10, accent: 0xff3a0a, pedestal: 0x2a201e },
  void: { floor: 0x7a7596, pit: 0x120c22, wall: VOID_METAL, rail: 0x9a8ab8, railHot: 0xe0b8ff, accent: 0xb86cff, pedestal: 0x252238 },
};

const plinths = new Map<number, MeshStandardMaterial>();
/** A theme's plain plinth: matte machine body in the theme's dark color (shared, never freed). */
function plinthMaterial(hex: number): MeshStandardMaterial {
  let m = plinths.get(hex);
  if (!m) {
    m = GRAPHITE.clone();
    m.color.setHex(hex);
    m.side = DoubleSide;
    plinths.set(hex, m);
  }
  return m;
}

/**
 * The stadium floor's surface, mapped across the arena (center at 0.5, 0.5, rim at the edge):
 * fine spun brushing, two engraved grooves, dial ticks at the rim, an engraved emblem in the
 * middle, and wear where the tops run. Grayscale: the theme's floor color tints it.
 */
const FLOOR_TEXTURE = floorTexture();
const FLOOR_EMBER_TEXTURE = floorEmberTexture();

/** Black except for the engraved rings and centre spark; used only as the forge floor's emission. */
function floorEmberTexture(): CanvasTexture {
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const C = S / 2;
  g.fillStyle = '#000000';
  g.fillRect(0, 0, S, S);
  g.strokeStyle = '#ffffff';
  g.lineCap = 'round';
  for (const f of [0.36, 0.72]) {
    g.globalAlpha = f === 0.36 ? 0.55 : 0.38;
    g.lineWidth = 2.5;
    g.beginPath();
    g.arc(C, C, C * f, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 0.65;
  g.lineWidth = 3;
  g.beginPath();
  g.arc(C, C, C * 0.16, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.moveTo(C - 22, C + 8);
  g.lineTo(C - 4, C - 20);
  g.lineTo(C + 2, C - 5);
  g.lineTo(C + 22, C - 12);
  g.lineTo(C + 7, C + 19);
  g.stroke();
  g.globalAlpha = 1;
  return new CanvasTexture(c);
}

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
  for (let i = 0; i < 120; i++) {
    const v = 170 + Math.floor(rnd() * 85);
    g.strokeStyle = `rgba(${v},${v},${v},${0.03 + rnd() * 0.05})`;
    g.lineWidth = 0.6 + rnd();
    g.beginPath();
    g.arc(C, C, rnd() * C, 0, Math.PI * 2);
    g.stroke();
  }
  // Wear where the tops run: soft scuffs and short arcs in the outer band.
  for (let i = 0; i < 50; i++) {
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
  // Contact shading: the floor darkens into the foot of the wall.
  const foot = g.createRadialGradient(C, C, C * 0.88, C, C, C);
  foot.addColorStop(0, 'rgba(0,0,0,0)');
  foot.addColorStop(0.7, 'rgba(0,0,0,0.12)');
  foot.addColorStop(1, 'rgba(0,0,0,0.32)');
  g.fillStyle = foot;
  g.fillRect(0, 0, S, S);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** The forge shell baked to a few meshes, made on first use. */
let SHELL: Group | null = null;

/** Wall heights (m) by wall type. */
export const WALL_HEIGHT: Record<Wall, number> = { low: 0.007, standard: 0.012, high: 0.028, none: 0 };
/** How far a pocket's trough runs out past the rim: onto the pedestal's top, not into the air. */
const POCKET_REACH = 0.008;

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

function tube(points: Vector3[], radius: number, mat: Material) {
  return new Mesh(new TubeGeometry(new CatmullRomCurve3(points), points.length * 2, radius, 6, false), mat);
}

/** A vertical band along the rim from a0 to a1 (the wall face), from the floor up to `height`. */
function band(layout: ArenaLayout, a0: number, a1: number, offset: number, height: number, mat: Material) {
  const pts = rimPath(layout, a0, a1, offset, 0);
  const pos: number[] = [];
  const uv: number[] = [];
  // u runs along the rim (about one unit per 10 cm, for the brushing), v up the wall.
  for (let i = 0, u = 0; i < pts.length - 1; i++) {
    const p = pts[i];
    const q = pts[i + 1];
    const w = u + p.distanceTo(q) * 10;
    pos.push(p.x, -0.004, p.z, q.x, -0.004, q.z, q.x, height, q.z, p.x, -0.004, p.z, q.x, height, q.z, p.x, height, p.z);
    uv.push(u, 0, w, 0, w, 1, u, 0, w, 1, u, 1);
    u = w;
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
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
  private readonly warm = new Color(0x8f4728);
  private readonly cold = new Color(0x2c3442);
  private readonly pit = new Color();
  private readonly ember = new Color(0xff4a12);
  private readonly tmp = new Color();
  private readonly floorMaterial: MeshStandardMaterial;
  private readonly railIdle = new Color();
  private readonly railHot = new Color();
  private railMats: MeshStandardMaterial[] = [];
  private railFlash: number[] = [];
  private bumperMats: MeshBasicMaterial[] = [];
  private bumperFlash: number[] = [];
  private spinnerDisc: Mesh | null = null;
  /** Pillars that circle the center turn together in this group; boost pads pulse. */
  private orbit = new Group();
  private padMats: MeshBasicMaterial[] = [];
  /** Between fights the circling pillars keep circling (not in the workshop, where they are picked up). */
  idleOrbit = true;
  /** The forge bar's warmth on the rails and the rim line (0..1). */
  charge = 0;
  private padFlash: number[] = [];
  private padMeshes: Mesh[] = [];
  private vortexDisc: Mesh | null = null;
  private disposables: { dispose(): void }[] = [];
  private time = 0;
  /** Two visual-only finger dents in the forged floor: ax, az, bx, bz, strength. */
  private forgeDents = new Float32Array(5);

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
    // Satin moulded plastic, like a real top stadium: a clean mid-light floor the dark-rimmed,
    // colored tops read against. The forge theme alone gives the engraved rings and centre spark a
    // restrained ember response.
    this.floorMaterial = new MeshStandardMaterial({
      map: FLOOR_TEXTURE,
      vertexColors: true,
      metalness: 0.05,
      roughness: 0.62,
      emissive: 0xff4a12,
      emissiveMap: FLOOR_EMBER_TEXTURE,
      emissiveIntensity: 0,
    });
    const floor = new Mesh(this.geo, this.floorMaterial);
    floor.frustumCulled = false;
    // The key light: one warm, shadowless spot above and behind-left of the arena, so the
    // bowl and the tops stand in a pool of light (it lights lit materials only). Always on: hiding
    // a light would recompile every lit material.
    const key = new SpotLight(0xffd2a0, 1.05, 0, 0.72, 0.58, 2);
    key.position.set(-0.16, 0.3, -0.12);
    this.root.add(floor, this.features, key, key.target);
  }

  /** Rebuilds walls, pockets, rails, pillars, center features and pedestal for a layout. */
  build(layout: ArenaLayout) {
    this.layout = layout;
    const P = (this.palette = PALETTES[layout.theme]);
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
    this.features.clear();
    this.base.set(P.floor);
    this.floorMaterial.emissiveIntensity = layout.theme === 'forge' ? 0.32 : 0;
    this.pit.set(P.pit);
    this.railIdle.set(P.rail);
    this.railHot.set(P.railHot);
    const own = <T extends { dispose(): void }>(x: T) => (this.disposables.push(x), x);
    const add = (m: Mesh) => {
      own(m.geometry);
      this.features.add(m);
      return m;
    };
    const wallMat = P.wall;
    const accent = own(new MeshBasicMaterial({ color: P.accent, transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false }));
    const trough = own(new MeshBasicMaterial({ color: 0x26282d, side: DoubleSide }));
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
      // Lit metal in the theme's rail color; heat shows as glow (emissive) over it.
      const mat = own(new MeshStandardMaterial({ color: P.rail, metalness: 1, roughness: 0.3 }));
      this.railMats.push(mat);
      this.railFlash.push(0);
      add(tube(rimPath(layout, r.angle - r.half, r.angle + r.half, -0.004, Math.max(0.004, H * 0.9)), 0.0025, mat));
    }

    // Pillars and bumpers.
    this.bumperMats = [];
    this.bumperFlash = [];
    const pillarMat = P.wall;
    this.orbit.clear();
    this.orbit.rotation.y = 0;
    this.features.add(this.orbit);
    const onOrbit = (m: Mesh) => {
      this.features.remove(m);
      this.orbit.add(m);
      return m;
    };
    for (const p of layout.pillars) {
      const x = p.x * layout.radius;
      const z = p.z * layout.radius;
      const post = onOrbit(add(new Mesh(new CylinderGeometry(p.r, p.r * 1.15, 0.026, 20), pillarMat)));
      post.position.set(x, 0.011, z);
      if (p.bumper) {
        const glow = own(new MeshBasicMaterial({ color: 0xff3b5c }));
        this.bumperMats.push(glow);
        this.bumperFlash.push(0);
        const ring = onOrbit(add(new Mesh(new TorusGeometry(p.r * 1.05, 0.0025, 8, 24).rotateX(Math.PI / 2), glow)));
        ring.position.set(x, 0.02, z);
      }
    }
    if (layout.orbit) {
      // The track the circling pillars run on.
      const track = own(new MeshBasicMaterial({ color: P.rail, transparent: true, opacity: 0.35, depthWrite: false }));
      for (const r of new Set(layout.pillars.map((p) => Math.round(Math.hypot(p.x, p.z) * 100) / 100))) {
        const ring = add(new Mesh(new RingGeometry(r * layout.radius - 0.0015, r * layout.radius + 0.0015, 64).rotateX(-Math.PI / 2), track));
        ring.position.y = new Arena(layout).floorHeight(r) + 0.0008;
      }
    }

    // Boost pads: a glowing chevron flat on the floor, pointing the way it flings.
    this.padMats = [];
    this.padFlash = [];
    this.padMeshes = [];
    const probe = new Arena(layout);
    for (const p of layout.pads ?? []) {
      const mat = own(new MeshBasicMaterial({ color: 0x4ad8ff, transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
      this.padMats.push(mat);
      const x = p.x * layout.radius;
      const z = p.z * layout.radius;
      const chevron = new Shape();
      chevron.moveTo(0.012, 0).lineTo(-0.008, 0.01).lineTo(-0.003, 0).lineTo(-0.008, -0.01).lineTo(0.012, 0);
      const mesh = add(new Mesh(new ShapeGeometry(chevron).rotateX(-Math.PI / 2), mat));
      mesh.position.set(x, probe.height(x, z) + 0.0012, z);
      mesh.rotation.y = -p.angle;
      this.padFlash.push(0);
      this.padMeshes.push(mesh);
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

    // One bold accent band just inside the rim, at floor height (a stadium's single painted line).
    const rimY = new Arena(layout).floorHeight(0.97) + 0.0008;
    add(tube(rimPath(layout, 0, Math.PI * 2, -0.005, rimY), 0.0026, accent));
    // A soft dark ring on the table where the pedestal stands, so the arena sits on it.
    const ao = add(new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), own(new MeshBasicMaterial({ map: SOFT_SHADOW, color: 0x000000, transparent: true, opacity: 0.7, depthWrite: false }))));
    ao.scale.set(0.15 * 4.2 * (layout.radius / 0.15) * (layout.shape === 'square' ? 1.12 : 1), 1, 0.15 * 4.2 * (layout.radius / 0.15) * (layout.shape === 'oval' ? 0.78 : 1));
    ao.position.y = -this.pedestalHeight + 0.0006;
    // A tight, darker contact ring hugging the foot: the wide one alone leaves the base floating.
    const contact = add(new Mesh(ao.geometry, own(new MeshBasicMaterial({ map: SOFT_SHADOW, color: 0x000000, transparent: true, opacity: 0.85, depthWrite: false }))));
    contact.scale.copy(ao.scale).multiplyScalar(2.6 / 4.2);
    contact.position.y = ao.position.y + 0.0003;

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
          // The forge shell's profile (flared foot, inset waist, broad shoulder), bottom to top so it faces out.
          // Closed at the bottom (under the deepest floor), so no table shows between the wall and the plinth.
          new LatheGeometry(
            [
              new Vector2(0, -this.pedestalHeight),
              ...[
                [0.02, -1],
                [0.011, -0.89],
                [0.017, -0.71],
                [0.022, -0.33],
                [0.019, -0.15],
                [0.008, 0],
              ].map(([dr, y]) => new Vector2(0.15 + dr, y * this.pedestalHeight)),
            ],
            64,
          ),
          plinthMaterial(P.pedestal),
        ),
      );
      plinth.scale.set(scale * sx, 1, scale * sz);
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

  /** Lights up the boost pad nearest to an arena-local point (a top was just flung by it). */
  flashPad(x: number, z: number) {
    let best = -1;
    let gap = Infinity;
    (this.layout.pads ?? []).forEach((p, i) => {
      const d = Math.hypot(p.x * this.layout.radius - x, p.z * this.layout.radius - z);
      if (d < gap) {
        gap = d;
        best = i;
      }
    });
    if (best >= 0) this.padFlash[best] = 1;
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
      const k = Math.max(this.railFlash[i], this.charge);
      m.color.copy(this.railIdle).lerp(this.railHot, k);
      m.emissive.copy(this.railHot).multiplyScalar(k);
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
    // three.js turns +y counter to atan2(z, x), so the group turns by minus the sim's angle. Outside
    // a fight (the clock stands at 0) they circle on the view's own clock, so they read before a match.
    if (arena.elapsed === 0 && this.idleOrbit) arena.orbitT += dt;
    this.orbit.rotation.y = -(this.layout.orbit ?? 0) * arena.orbitT;
    this.padMats.forEach((m, i) => {
      this.padFlash[i] = Math.max(0, this.padFlash[i] - dt * 4);
      m.opacity = Math.min(1, 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(this.time * 5)) + this.padFlash[i]);
      this.padMeshes[i].scale.setScalar(1 + 0.4 * this.padFlash[i]);
    });
  }

  private vi(ring: number, seg: number) {
    return 1 + (ring - 1) * this.segs + seg;
  }

  /** Re-samples heights along the rim shape and tints bumps warm, dents cool, pockets dark, embers hot. */
  sync(arena: Arena) {
    const pos = this.geo.attributes.position as BufferAttribute;
    const L = arena.layout;
    const safe = arena.safe;
    const pressure = arena.pressure;
    for (let r = 0; r <= this.rings; r++) {
      const n = r / this.rings;
      const count = r === 0 ? 1 : this.segs;
      for (let s = 0; s < count; s++) {
        const a = (s / this.segs) * Math.PI * 2;
        const radius = n * rimRadius(L, a);
        const x = Math.cos(a) * radius;
        const z = Math.sin(a) * radius;
        const i = r === 0 ? 0 : this.vi(r, s);
        let forgeDent = 0;
        const dentStrength = this.forgeDents[4];
        if (dentStrength > 0) {
          const ad = Math.hypot(x - this.forgeDents[0], z - this.forgeDents[1]);
          const bd = Math.hypot(x - this.forgeDents[2], z - this.forgeDents[3]);
          const ak = Math.max(0, 1 - ad / 0.055);
          const bk = Math.max(0, 1 - bd / 0.055);
          forgeDent = Math.max(ak * ak, bk * bk) * 0.012 * dentStrength;
        }
        pos.setXYZ(i, x, arena.height(x, z) - forgeDent, z);
        const shape = arena.shapeHeight(x, z);
        const dip = -arena.pocketDip(x, z) / 0.003;
        if (shape > 0) {
          const forged = Math.min(1, shape / 0.02);
          // A hand-forged rise reads as dark heated copper, with a thin ember-hot crown, instead
          // of turning into a flat peach-colored blob.
          this.tmp.copy(this.base).lerp(this.warm, forged);
          if (forged > 0.35) this.tmp.lerp(this.ember, (forged - 0.35) * (0.18 + 0.08 * Math.sin(this.time * 7)));
        }
        else this.tmp.copy(this.base).lerp(this.cold, Math.min(1, -shape / 0.02));
        // A raised shape is lit from above and the player's side, so its faces read as a slope
        // (a ramp's steep face is bright toward you, dark away), not as a flat glow.
        if (shape > 0.001) {
          arena.slope(x, z, SLOPE_TMP);
          const lit = (1 - 0.3 * SLOPE_TMP.x - 0.8 * SLOPE_TMP.z) / Math.sqrt((1 + SLOPE_TMP.x * SLOPE_TMP.x + SLOPE_TMP.z * SLOPE_TMP.z) * 1.73);
          this.tmp.multiplyScalar(Math.max(0.35, Math.min(1.5, 0.25 + lit * 1.1)));
        }
        if (dip > 0) this.tmp.lerp(this.pit, Math.min(1, dip) * 0.8);
        // Embers: outside the shrinking safe zone the floor glows, pulsing.
        if (n > safe) this.tmp.lerp(this.ember, 0.45 + 0.15 * Math.sin(this.time * 6));
        // After 15 s the outside band heats and opens. This is the visible clock for sudden death:
        // players see danger moving inward before a wider pocket or lower effective rim ends it.
        if (pressure > 0 && n > 0.74 - pressure * 0.08) {
          const band = Math.min(1, (n - (0.74 - pressure * 0.08)) / 0.2);
          this.tmp.lerp(this.ember, pressure * band * (0.22 + 0.09 * Math.sin(this.time * 7)));
        }
        this.colors[i * 3] = this.tmp.r;
        this.colors[i * 3 + 1] = this.tmp.g;
        this.colors[i * 3 + 2] = this.tmp.b;
      }
    }
    pos.needsUpdate = true;
    (this.geo.attributes.color as BufferAttribute).needsUpdate = true;
    this.geo.computeVertexNormals();
  }

  /** Presses the visible floor under two pinched rim sectors; the simulation height is untouched. */
  setForgeDents(ax: number, az: number, bx: number, bz: number, strength: number) {
    this.forgeDents[0] = ax;
    this.forgeDents[1] = az;
    this.forgeDents[2] = bx;
    this.forgeDents[3] = bz;
    this.forgeDents[4] = Math.max(0, Math.min(1, strength));
  }
}

/** A soft round glow, white on transparent: one spark or ember, stretched along its motion. */
const SPARK_DOT = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
})();

/** Sparks fly fast and die young; embers drift, settle on the floor and cool there. */
const SPARK_POOL = 200;
const EMBER_POOL = 80;

/**
 * Pooled additive sparks for clashes: camera-facing quads a few millimetres wide (WebGL lines are
 * always 1 px on Quest), stretched along their motion, white-hot cooling to a dull red, plus slower
 * embers that land on the floor and cool there. One instanced draw call, nothing allocated per frame.
 */
export class Sparks {
  /** Every spark and ember in one mesh (the name is the old one: the match system adds it). */
  readonly points: Mesh;
  private readonly count = SPARK_POOL + EMBER_POOL;
  private pos = new Float32Array(this.count * 3);
  private vel = new Float32Array(this.count * 3);
  private life = new Float32Array(this.count);
  private max = new Float32Array(this.count).fill(1);
  private floor = new Float32Array(this.count);
  /** Width (arena-local m) and color family (0 fire, 1 gold) per particle. */
  private width = new Float32Array(this.count);
  private gold = new Uint8Array(this.count);
  private gpuPos: InstancedBufferAttribute;
  private gpuVel: InstancedBufferAttribute;
  private gpuCol: InstancedBufferAttribute;
  private nextSpark = 0;
  private nextEmber = SPARK_POOL;
  /** The arena's rim radius (arena-local): sparks past it fall to the desk. */
  rim = 0.17;

  constructor() {
    const n = this.count;
    const geo = new InstancedBufferGeometry();
    // A unit quad: x runs from the head (0) to the tail (1), y across the streak.
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.setAttribute('position', new Float32BufferAttribute([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0], 3));
    geo.setAttribute('uv', new Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    this.gpuPos = new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage);
    this.gpuVel = new InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(DynamicDrawUsage);
    this.gpuCol = new InstancedBufferAttribute(new Float32Array(n * 4), 4).setUsage(DynamicDrawUsage);
    geo.setAttribute('iPos', this.gpuPos);
    geo.setAttribute('iVel', this.gpuVel);
    geo.setAttribute('iCol', this.gpuCol);
    geo.instanceCount = n;
    const mat = new MeshBasicMaterial({ map: SPARK_DOT, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
    // Billboarded in view space: the quad lies along the spark's on-screen motion and is as wide
    // as the spark (iCol.a, arena-local), so a slow one is a round dot and a fast one a streak.
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec3 iPos;\nattribute vec3 iVel;\nattribute vec4 iCol;\nvarying vec3 vSpark;')
        .replace(
          '#include <project_vertex>',
          [
            'vSpark = iCol.rgb;',
            'vec4 head = modelViewMatrix * vec4(iPos, 1.0);',
            'vec4 tail = modelViewMatrix * vec4(iPos - iVel * 0.03, 1.0);',
            'vec2 sd = tail.xy - head.xy;',
            'float sl = length(sd);',
            'vec2 dir = sl > 1e-6 ? sd / sl : vec2(1.0, 0.0);',
            'float w = iCol.a * length(modelViewMatrix[0].xyz);',
            'float trail = min(sl, w * 6.0);',
            'vec4 mvPosition = head;',
            'mvPosition.xy += dir * (position.x * (trail + w) - 0.5 * w) + vec2(-dir.y, dir.x) * (position.y * 0.5 * w);',
            'mvPosition.z += (tail.z - head.z) * position.x * (sl > 1e-6 ? trail / sl : 0.0);',
            'gl_Position = projectionMatrix * mvPosition;',
          ].join('\n'),
        );
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vSpark;')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= vSpark;');
    };
    this.points = new Mesh(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
  }

  private spawn(i: number, x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, width: number, floor: number) {
    const o = i * 3;
    this.pos[o] = x;
    this.pos[o + 1] = y;
    this.pos[o + 2] = z;
    this.vel[o] = vx;
    this.vel[o + 1] = vy;
    this.vel[o + 2] = vz;
    this.life[i] = this.max[i] = life;
    this.width[i] = width;
    this.floor[i] = floor;
    this.gold[i] = 0;
    this.points.visible = true;
  }

  /** A shower where something hit (strength 0..1): more, faster, fatter sparks, and embers on hard hits. */
  burst(x: number, y: number, z: number, strength: number) {
    const n = 6 + Math.round(strength * 28);
    for (let k = 0; k < n; k++) {
      const i = this.nextSpark;
      this.nextSpark = (this.nextSpark + 1) % SPARK_POOL;
      const a = Math.random() * Math.PI * 2;
      const sp = 0.18 + Math.random() * 0.65 * (0.5 + strength);
      const w = 0.0012 + 0.001 * Math.random() * (0.5 + strength);
      this.spawn(i, x, y + 0.012, z, Math.cos(a) * sp, 0.24 + Math.random() * 0.48, Math.sin(a) * sp, 0.32 + Math.random() * 0.36, w, y);
    }
    if (strength > 0.45) this.embers(x, y, z, Math.round(strength * 11), 0.2, 0.12 + 0.14 * strength);
  }

  /** A short hot wake behind a top that has left the arena but is still crossing the real desk. */
  flight(x: number, y: number, z: number) {
    for (let k = 0; k < 3; k++) {
      const i = this.nextSpark;
      this.nextSpark = (this.nextSpark + 1) % SPARK_POOL;
      const a = Math.random() * Math.PI * 2;
      const speed = 0.05 + Math.random() * 0.08;
      this.spawn(i, x, y + 0.006, z, Math.cos(a) * speed, 0.06 + Math.random() * 0.08, Math.sin(a) * speed, 0.24 + Math.random() * 0.12, 0.0018 + Math.random() * 0.0008, y);
    }
  }

  /**
   * Slow embers (gold for a win): they rise at about `up` (arena units/s), spread at `spread`,
   * land on the floor and cool there over about a second.
   */
  embers(x: number, y: number, z: number, n: number, up = 0.18, spread = 0.12, gold: 0 | 1 = 0) {
    for (let k = 0; k < n; k++) {
      const i = this.nextEmber;
      this.nextEmber = this.nextEmber + 1 >= this.count ? SPARK_POOL : this.nextEmber + 1;
      const a = Math.random() * Math.PI * 2;
      const sp = spread * (0.3 + 0.7 * Math.random());
      const life = 0.7 + Math.random() * (gold ? 0.9 : 0.4);
      this.spawn(i, x, y + 0.008, z, Math.cos(a) * sp, up * (0.6 + 0.8 * Math.random()), Math.sin(a) * sp, life, 0.0018 + 0.0012 * Math.random(), y);
      this.gold[i] = gold;
    }
  }

  update(dt: number) {
    if (!this.points.visible) return;
    const P = this.gpuPos.array as Float32Array;
    const V = this.gpuVel.array as Float32Array;
    const C = this.gpuCol.array as Float32Array;
    // Calm comfort modes: the same motion, dimmer and never white-hot.
    const lum = COMFORT.flashes ? 1 : 0.6;
    const hot = COMFORT.flashes ? 1 : 0.4;
    let live = 0;
    for (let i = 0; i < this.count; i++) {
      const o = i * 3;
      const c = i * 4;
      if (this.life[i] <= 0) {
        C[c + 3] = 0; // zero width: nothing drawn
        continue;
      }
      live++;
      const ember = i >= SPARK_POOL;
      this.life[i] -= dt;
      this.vel[o + 1] -= (ember ? 0.7 : 1.6) * dt;
      if (ember) {
        // Embers float: the air slows them.
        const d = Math.exp(-dt * 2.5);
        this.vel[o] *= d;
        this.vel[o + 2] *= d;
      }
      const px = (this.pos[o] += this.vel[o] * dt);
      let py = (this.pos[o + 1] += this.vel[o + 1] * dt);
      const pz = (this.pos[o + 2] += this.vel[o + 2] * dt);
      // Sparks skip off the floor once, losing most of their speed; embers stay where they land.
      // Past the rim, both fall to the real desk.
      const floor = px * px + pz * pz > this.rim * this.rim ? TABLE_Y : this.floor[i];
      if (py < floor && this.vel[o + 1] < 0) {
        this.pos[o + 1] = py = floor + (ember ? 0.0015 : 0);
        const keep = ember ? 0 : 0.5;
        this.vel[o + 1] *= ember ? 0 : -0.35;
        this.vel[o] *= keep;
        this.vel[o + 2] *= keep;
      }
      P[o] = px;
      P[o + 1] = py;
      P[o + 2] = pz;
      V[o] = this.vel[o];
      V[o + 1] = this.vel[o + 1];
      V[o + 2] = this.vel[o + 2];
      // White-hot to orange to a dull red as it cools (gold for a win's embers).
      const k = Math.max(0, this.life[i] / this.max[i]);
      const fade = Math.min(1, this.life[i] / 0.1);
      if (this.gold[i]) {
        const b = lum * fade * (0.4 + 0.6 * k);
        C[c] = b;
        C[c + 1] = b * (0.62 + 0.25 * k);
        C[c + 2] = b * 0.28;
      } else if (ember) {
        const b = lum * fade * (0.25 + 0.75 * k);
        C[c] = b;
        C[c + 1] = b * (0.12 + 0.4 * k * hot);
        C[c + 2] = b * 0.04;
      } else {
        const b = lum * fade * (0.35 + 0.65 * k);
        C[c] = b;
        C[c + 1] = b * (0.25 + 0.75 * k * hot);
        C[c + 2] = b * (0.08 + 0.7 * k * k * hot);
      }
      C[c + 3] = this.width[i] * (ember ? 0.7 + 0.3 * k : 0.6 + 0.4 * k);
    }
    // Nothing left: no draw call and no upload until the next burst.
    this.points.visible = live > 0;
    this.gpuPos.needsUpdate = true;
    this.gpuVel.needsUpdate = true;
    this.gpuCol.needsUpdate = true;
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

/**
 * The message card: GLASS, read never touched. Its first line is a TITLE headline, the rest BODY
 * sentences, each wrapped into even lines (no word left alone on a last line) at fixed sizes, so the
 * same role reads the same size on every message. Redraws only when the text changes.
 */
export class Label {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private text = '';
  private slab: Mesh;
  private strip: Mesh;
  private readonly k: number;

  constructor(
    width = 0.22,
    /** World metres per unit of its parent at its usual scale (the arena's, with the card's 1.25). */
    scale = ARENA_SCALE * 1.25,
    /** Seen from about this far (m). */
    private readonly dist = 1.2,
  ) {
    // About 30 texels a degree at the far rim, filtered at grazing angles.
    this.canvas.width = 1024;
    this.canvas.height = 320;
    this.tex = signTexture(this.canvas);
    this.k = pxPerM(1024, width * scale);
    this.mesh = new Mesh(
      new PlaneGeometry(width, (width * 160) / 512),
      new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false }),
    );
    this.slab = addSlab(this.mesh, width, (width * 160) / 512, 0.08, GLASS_DEPTH / scale);
    // Its own copy: it fades with the card.
    this.slab.material = slabMaterial();
    (this.slab.material as MeshStandardMaterial).transparent = true;
    // A lit strip along the card's lower edge, like the light bar of a machine's display: cool
    // white, not orange (orange is kept for you and the action to take).
    this.strip = new Mesh(new BoxGeometry(width * 0.5, 0.0016, 0.002), new MeshBasicMaterial({ color: new Color(TEXT).multiplyScalar(1.2), toneMapped: false, transparent: true }));
    this.strip.position.set(0, (-width * 80) / 512 - 0.0004, -0.002);
    this.mesh.add(this.strip);
  }

  /** The text shown now. */
  get current() {
    return this.text;
  }

  /** Each frame: a new message fades in over 0.16 s; while something else holds the eye (a stamp), it steps back. */
  update(dt: number, dim = false, dimTo = 0.2) {
    const m = this.mesh.material as MeshBasicMaterial;
    const target = dim ? dimTo : 1;
    m.opacity += Math.max(-dt / 0.15, Math.min(dt / 0.16, target - m.opacity));
    // The card's body fades with it.
    (this.slab.material as MeshStandardMaterial).opacity = m.opacity;
    (this.strip.material as MeshBasicMaterial).opacity = m.opacity;
    // Faded right out (the result's stamp has its place): not drawn at all.
    this.mesh.visible = this.text.length > 0 && (m.opacity > 0.01 || target > 0);
  }

  set(text: string) {
    if (text === this.text) return;
    const appearing = !this.text;
    this.text = text;
    if (import.meta.env.DEV && text) console.log(`[LABEL] ${text.replace('\n', ' / ')}`);
    this.mesh.visible = text.length > 0;
    // A card appearing fades in (update()); a changing one (a pull's percent) just redraws.
    if (appearing) {
      (this.mesh.material as MeshBasicMaterial).opacity = 0;
      if (text) playTick();
    }
    const g = this.canvas.getContext('2d')!;
    const W = 1024;
    const H = 320;
    g.clearRect(0, 0, W, H);
    if (!text) return;
    glass(g, W, H);
    g.fillStyle = TEXT;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // The headline in at most two even lines, each sentence after it in at most two; a card with
    // more than fits keeps its sizes and lets fillText narrow the longest lines.
    const MAX = 940;
    const [first, ...rest] = text.split('\n');
    const lines: [string, 'title' | 'body'][] = [];
    setType(g, 'title', this.k, this.dist);
    for (const l of wrap(g, first, MAX, 2)) lines.push([l, 'title']);
    setType(g, 'body', this.k, this.dist);
    for (const r of rest) for (const l of wrap(g, r, MAX, 2)) lines.push([l, 'body']);
    const size = (role: 'title' | 'body') => Math.round((TYPE[role].dmm * this.dist * this.k) / 1000) * 1.18;
    // Too many lines for the card: the body's last lines join up (squeezed) rather than shrink.
    while (lines.length > 2 && lines.reduce((t, [, r]) => t + size(r), 0) > H - 28) {
      const [last] = lines.pop()!;
      lines[lines.length - 1][0] += ` ${last}`;
    }
    const heights = lines.map(([, r]) => size(r));
    let y = H / 2 - heights.reduce((a, b) => a + b, 0) / 2;
    lines.forEach(([line, role], i) => {
      setType(g, role, this.k, this.dist);
      g.fillText(line, W / 2, y + heights[i] / 2, MAX);
      y += heights[i];
    });
    this.tex.needsUpdate = true;
  }
}

/** A shockwave's band, white on transparent: soft inside, brightest near its leading edge. */
const SHOCK_RING = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0.55, 'rgba(255,255,255,0)');
  grad.addColorStop(0.8, 'rgba(255,255,255,0.45)');
  grad.addColorStop(0.93, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
})();

/**
 * Impact effects in the arena: an expanding ring of light where a hard hit lands, and a fading
 * streak behind a top that dashes along a rail. Small pools, additive, no depth writes.
 */
/** An ink splash: a jagged star with a few flung drops, white (tinted per hit), soft-edged. */
function splashTexture(): CanvasTexture {
  const S = 128;
  const C = S / 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  g.fillStyle = '#ffffff';
  g.beginPath();
  const n = 14;
  for (let i = 0; i <= n * 2; i++) {
    const a = (i / (n * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? C * (0.62 + 0.3 * rnd()) : C * (0.3 + 0.08 * rnd());
    g.lineTo(C + Math.cos(a) * r, C + Math.sin(a) * r);
  }
  g.closePath();
  g.fill();
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const r = C * (0.7 + 0.22 * rnd());
    g.beginPath();
    g.arc(C + Math.cos(a) * r, C + Math.sin(a) * r, 2 + rnd() * 4, 0, Math.PI * 2);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
const SPLASH = splashTexture();

export class Impacts {
  readonly root = new Group();
  /** Hard clashes: a flat ink splash in the hitter's team colour, facing the eye (top-game style). */
  private splashes: { sprite: Sprite; t: number; size: number }[] = [];
  private nextSplash = 0;
  private rings: { mesh: Mesh; t: number; size: number }[] = [];
  private streaks: { mesh: Mesh; t: number }[] = [];
  private nextRing = 0;
  private nextStreak = 0;
  /** A hard clash flares at blade height, facing the eye, so a big hit reads from a seated angle. */
  private flare = new Sprite(new SpriteMaterial({ map: SOFT_SHADOW, color: 0xffffff, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
  private flareT = 1;
  private flareSize = 0;

  /** Hard hits: a thick shockwave rolling over the floor, and a scorch that glows and fades where they met. */
  private shocks: { mesh: Mesh; t: number; size: number; o: Vector3 }[] = [];
  private scorches: { mesh: Mesh; t: number }[] = [];
  private nextShock = 0;
  private nextScorch = 0;
  /** The arena's rim radius (arena-local): shockwaves stop at it rather than hang over the wall. */
  private readonly rimClip = { value: 0.17 };
  private readonly hotScorch = new Color(0xffa040);
  private readonly coldScorch = new Color(0x24140c);

  set rim(r: number) {
    this.rimClip.value = r;
  }

  constructor() {
    this.flare.visible = false;
    this.root.add(this.flare);
    for (let i = 0; i < 2; i++) {
      const sprite = new Sprite(new SpriteMaterial({ map: SPLASH, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
      sprite.visible = false;
      sprite.renderOrder = 4;
      this.splashes.push({ sprite, t: 1, size: 0 });
      this.root.add(sprite);
    }
    for (let i = 0; i < 3; i++) {
      const o = new Vector3();
      const mat = new MeshBasicMaterial({ map: SHOCK_RING, color: 0xffc890, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
      // Only the part over the arena floor draws (uO: the ring's center and radius, arena-local).
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, { uRim: this.rimClip, uO: { value: o } });
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nuniform vec3 uO;\nvarying vec2 vRimXZ;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRimXZ = uO.xy + position.xz * uO.z;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nuniform float uRim;\nvarying vec2 vRimXZ;')
          .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (length(vRimXZ) > uRim) discard;');
      };
      const mesh = new Mesh(new RingGeometry(0.55, 1, 48).rotateX(-Math.PI / 2), mat);
      mesh.visible = false;
      this.shocks.push({ mesh, t: 1, size: 0, o });
      this.root.add(mesh);
    }
    for (let i = 0; i < 4; i++) {
      const mesh = new Mesh(
        new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
        new MeshBasicMaterial({ map: SOFT_SHADOW, color: 0xffa040, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
      );
      mesh.visible = false;
      mesh.renderOrder = 1;
      this.scorches.push({ mesh, t: 1 });
      this.root.add(mesh);
    }
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
    if (strength >= 0.8 && COMFORT.flashes) {
      this.flareT = 0;
      this.flareSize = 0.045 + 0.035 * strength;
      this.flare.position.set(x, y + 0.012, z);
      this.flare.visible = true;
    }
  }

  /** A hard clash (strength 0..1): an ink splash in the hitter's colour, 0.22 s, at blade height. */
  splash(x: number, y: number, z: number, strength: number, color: number) {
    const s = this.splashes[this.nextSplash];
    this.nextSplash = (this.nextSplash + 1) % this.splashes.length;
    s.t = 0;
    s.size = 0.04 + 0.04 * strength;
    s.sprite.position.set(x, y + 0.014, z);
    s.sprite.material.color.set(color);
    s.sprite.material.rotation = Math.random() * Math.PI * 2;
    s.sprite.visible = true;
  }

  /**
   * A hard hit on the floor (strength 0..1): a thick shockwave rolls out over 0.3 s, and a scorch
   * glows hot where it landed and cools to a dark mark that fades in about 2 s. Floor effects only,
   * so they stay in the Calm comfort modes (dimmer there).
   */
  shock(x: number, y: number, z: number, strength: number, color = 0xffc890) {
    const s = this.shocks[this.nextShock];
    this.nextShock = (this.nextShock + 1) % this.shocks.length;
    s.t = 0;
    s.size = 0.03 + 0.06 * strength;
    s.mesh.position.set(x, y + 0.0025, z);
    s.o.set(x, z, 0);
    (s.mesh.material as MeshBasicMaterial).color.set(color);
    s.mesh.visible = true;
    const m = this.scorches[this.nextScorch];
    this.nextScorch = (this.nextScorch + 1) % this.scorches.length;
    m.t = 0;
    m.mesh.position.set(x, y + 0.0012, z);
    m.mesh.scale.setScalar(0.02 + 0.025 * strength);
    m.mesh.rotation.y = Math.random() * Math.PI;
    m.mesh.visible = true;
  }

  /** Clears the floor's marks (a new round). */
  clear() {
    for (const m of this.scorches) {
      m.t = 1;
      m.mesh.visible = false;
    }
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
    if (this.flare.visible) {
      this.flareT += dt / 0.16;
      const k = Math.min(1, this.flareT);
      this.flare.scale.setScalar(this.flareSize * (0.5 + 0.8 * Math.sqrt(k)));
      const m = this.flare.material;
      m.opacity = (1 - k) ** 2;
      m.color.setRGB(1, 1 - 0.45 * k, 1 - 0.8 * k);
      if (k >= 1) this.flare.visible = false;
    }
    const lum = COMFORT.flashes ? 1 : 0.6;
    for (const s of this.splashes) {
      if (!s.sprite.visible) continue;
      s.t += dt / 0.22;
      const k = Math.min(1, s.t);
      // Pops out fast, holds its shape, then thins away.
      s.sprite.scale.setScalar(s.size * (0.55 + 0.45 * Math.sqrt(k)));
      s.sprite.material.opacity = lum * 0.95 * (k < 0.5 ? 1 : 1 - (k - 0.5) / 0.5);
      if (k >= 1) s.sprite.visible = false;
    }
    for (const s of this.shocks) {
      if (!s.mesh.visible) continue;
      s.t += dt / 0.3;
      const k = Math.min(1, s.t);
      // Fast out, easing off as it spreads.
      const r = s.size * (0.25 + 1.0 * (1 - (1 - k) ** 2));
      s.mesh.scale.set(r, 1, r);
      s.o.z = r;
      (s.mesh.material as MeshBasicMaterial).opacity = lum * 0.95 * (1 - k) ** 1.5;
      if (k >= 1) s.mesh.visible = false;
    }
    for (const m of this.scorches) {
      if (!m.mesh.visible) continue;
      m.t += dt / 2;
      const k = Math.min(1, m.t);
      // Ember-hot for a moment, then a dark mark fading away.
      const mat = m.mesh.material as MeshBasicMaterial;
      const cool = Math.min(1, k / 0.2);
      mat.color.copy(this.hotScorch).lerp(this.coldScorch, cool);
      mat.opacity = (0.75 - 0.35 * cool) * (1 - Math.max(0, (k - 0.3) / 0.7));
      if (k >= 1) m.mesh.visible = false;
    }
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

/**
 * Floor trails: a fading ribbon of soft additive dots behind each top (yours orange, the rival's
 * cyan), longer and brighter the faster it moves, so a 1 cm top's path reads at a glance.
 */
export class Trails {
  static readonly PER = 32;
  /** Yours, the rival's, and a brawl's two extra seats (still one instanced draw). */
  static readonly SIDES = 4;
  readonly mesh: InstancedMesh;
  private age = new Float32Array(Trails.PER * Trails.SIDES).fill(9);
  private size = new Float32Array(Trails.PER * Trails.SIDES);
  private at = new Float32Array(Trails.PER * Trails.SIDES * 3);
  private next = [0, 0, 0, 0];
  private newest = 9;
  private readonly m = new Matrix4();
  private readonly v = new Vector3();
  private readonly s = new Vector3();
  private readonly q = new Quaternion();

  constructor() {
    this.mesh = new InstancedMesh(
      new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ map: SOFT_SHADOW, transparent: true, blending: AdditiveBlending, depthWrite: false }),
      Trails.PER * Trails.SIDES,
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    const colors = [new Color(0xff8a2a).multiplyScalar(0.9), new Color(0x4fd1ff).multiplyScalar(0.8), new Color(0x6fd35a).multiplyScalar(0.8), new Color(0xb07cff).multiplyScalar(0.8)];
    for (let i = 0; i < Trails.PER * Trails.SIDES; i++) {
      this.mesh.setColorAt(i, colors[Math.floor(i / Trails.PER)]);
      this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
    }
  }

  /** A dot under top `side` (0 yours, 1 the rival's, 2-3 a brawl's extra tops) moving at `speed` (arena units/s). */
  drop(side: number, x: number, y: number, z: number, speed: number) {
    const i = side * Trails.PER + this.next[side];
    this.next[side] = (this.next[side] + 1) % Trails.PER;
    this.age[i] = 0;
    this.size[i] = 0.012 + Math.min(0.018, speed * 0.038);
    this.at[i * 3] = x;
    this.at[i * 3 + 1] = y + 0.0015;
    this.at[i * 3 + 2] = z;
    this.newest = 0;
  }

  clear() {
    this.age.fill(9);
    this.newest = 9;
  }

  update(dt: number) {
    // Nothing to draw once every dot has faded (outside fights): no draw call, no upload.
    this.newest += dt;
    this.mesh.visible = this.newest < 0.6;
    if (!this.mesh.visible) return;
    for (let i = 0; i < Trails.PER * Trails.SIDES; i++) {
      this.age[i] += dt;
      const k = Math.max(0, 1 - this.age[i] / 0.6);
      this.v.fromArray(this.at, i * 3);
      const r = this.size[i] * k;
      this.mesh.setMatrixAt(i, this.m.compose(this.v, this.q, this.s.set(r, 1, r)));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/**
 * The hot streak a swinging fingertip leaves in the air: white-hot at the newest point, cooling to
 * orange and gone in a quarter second. Two hands, one instanced draw, nothing drawn when idle.
 */
export class FingerStreak {
  static readonly PER = 24;
  static readonly LIFE = 0.26;
  readonly mesh: InstancedMesh;
  private age = new Float32Array(FingerStreak.PER * 2).fill(9);
  private size = new Float32Array(FingerStreak.PER * 2);
  private at = new Float32Array(FingerStreak.PER * 2 * 3);
  private next = [0, 0];
  private newest = 9;
  private readonly m = new Matrix4();
  private readonly v = new Vector3();
  private readonly s = new Vector3();
  private readonly q = new Quaternion();
  private readonly hot = new Color(0xfff1d0);
  private readonly cool = new Color(0xff6a1a);
  private readonly cold = new Color(0x5d6b7a);
  private readonly c = new Color();
  private cooled = new Uint8Array(FingerStreak.PER * 2);

  constructor() {
    this.mesh = new InstancedMesh(
      new OctahedronGeometry(1, 1),
      new MeshBasicMaterial({ transparent: true, blending: AdditiveBlending, depthWrite: false }),
      FingerStreak.PER * 2,
    );
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 13;
    for (let i = 0; i < FingerStreak.PER * 2; i++) {
      this.mesh.setColorAt(i, this.hot);
      this.mesh.setMatrixAt(i, this.m.makeScale(0, 0, 0));
    }
  }

  /** A point of hand `side` (0 left, 1 right) at arena speed `speed`; `armed` false draws it cold. */
  drop(side: number, x: number, y: number, z: number, speed: number, armed: boolean) {
    const i = side * FingerStreak.PER + this.next[side];
    this.next[side] = (this.next[side] + 1) % FingerStreak.PER;
    this.age[i] = 0;
    this.size[i] = 0.002 + Math.min(0.006, speed * 0.008);
    this.at[i * 3] = x;
    this.at[i * 3 + 1] = y;
    this.at[i * 3 + 2] = z;
    this.cooled[i] = armed ? 0 : 1;
    this.newest = 0;
  }

  update(dt: number) {
    this.newest += dt;
    this.mesh.visible = this.newest < FingerStreak.LIFE;
    if (!this.mesh.visible) return;
    for (let i = 0; i < FingerStreak.PER * 2; i++) {
      this.age[i] += dt;
      const k = Math.max(0, 1 - this.age[i] / FingerStreak.LIFE);
      this.v.fromArray(this.at, i * 3);
      this.mesh.setMatrixAt(i, this.m.compose(this.v, this.q, this.s.setScalar(this.size[i] * k)));
      this.mesh.setColorAt(i, this.cooled[i] ? this.cold : this.c.copy(this.cool).lerp(this.hot, k * k));
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }
}

/** A vertical fade, bright at the bottom and gone at the top, for light pillars. */
const PILLAR_FADE = (() => {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 64, 0, 0);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 64);
  return new CanvasTexture(c);
})();

/**
 * A wall of light rising from the rim for a won match or a new level. A level's climbs over 0.4 s
 * and fades over 0.8 s (gold); a won match's stands taller for about 2.5 s with a slow shimmer (your
 * orange). In the Calm comfort modes it rises and fades slowly and never shimmers: no flash at all.
 */
export class Pillar {
  readonly mesh = new Mesh(
    new CylinderGeometry(1, 1, 1, 48, 1, true).translate(0, 0.5, 0),
    new MeshBasicMaterial({ map: PILLAR_FADE, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }),
  );
  private t = -1;
  private mode: 'level' | 'win' | 'calm' = 'level';

  private sx = 1;
  private sz = 1;

  constructor() {
    this.mesh.visible = false;
    // Drawn before the other see-through things, so the match bar and cards stay readable over it.
    this.mesh.renderOrder = -1;
  }

  /** Rises round an arena of this layout (its rim `rim` from the center, oval and square shapes followed). */
  play(layout: ArenaLayout, rim: number, y: number, color: number, mode: 'level' | 'win' | 'calm' = 'level') {
    this.t = 0;
    this.mode = mode;
    this.sx = rim * (layout.shape === 'square' ? 1.12 : 1);
    this.sz = rim * (layout.shape === 'oval' ? 0.78 : layout.shape === 'square' ? 1.12 : 1);
    this.mesh.scale.set(this.sx, 0.001, this.sz);
    this.mesh.position.y = y;
    (this.mesh.material as MeshBasicMaterial).color.set(color).multiplyScalar(1.4);
    this.mesh.visible = true;
  }

  update(dt: number) {
    if (this.t < 0) return;
    this.t += dt;
    // Rise, hold, fade (s), the peak height (arena-local) and brightness, by mode.
    const [rise, hold, out, height, peak] = this.mode === 'win' ? [0.4, 0.8, 1.3, 0.17, 0.7] : this.mode === 'calm' ? [0.9, 0.6, 1.5, 0.15, 0.4] : [0.4, 0, 0.8, 0.12, 0.7];
    const up = Math.min(1, this.t / rise);
    const fade = Math.max(0, (this.t - rise - hold) / out);
    this.mesh.scale.y = height * (1 - (1 - up) ** 3);
    // Calm ramps in as slowly as it rises; a win's shimmer is slow (about 1.3 Hz) and shallow.
    const inK = this.mode === 'calm' ? up * up : Math.min(1, this.t / 0.1);
    const shimmer = this.mode === 'win' ? 0.88 + 0.12 * Math.sin(this.t * 8) : 1;
    (this.mesh.material as MeshBasicMaterial).opacity = peak * inK * shimmer * (1 - fade);
    if (fade >= 1) {
      this.t = -1;
      this.mesh.visible = false;
    }
  }
}

/** What a shape mark draws: a live shape or a ghost of one being made. */
export interface ShapeMarkSpec {
  kind: 'ramp' | 'well' | 'groove';
  x: number;
  z: number;
  dx: number;
  dz: number;
  /** 0..1: how strong it still is (rings shrink as it relaxes). */
  strength: number;
  ghost: boolean;
  /** Its footprint, when not the kind's default. */
  sigma?: number;
  /** Fingertip groove length (m); absent for point shapes. */
  length?: number;
}

/**
 * Contour marks for player shapes: two or three rings that shrink as the shape relaxes (the
 * timer is the shape itself), and a chevron showing which way a ramp pushes. Ghosts are fainter.
 * Drawn over the floor so they never hide inside a mound.
 */
export class ShapeMarks {
  readonly root = new Group();
  private marks: { group: Group; rings: Mesh[]; chevron: Mesh; lane: Mesh; mats: MeshBasicMaterial[] }[] = [];

  /** `sides`: the rings' outline (the rival's marks are hexagons, yours round: not colour alone). */
  constructor(color: number, count = 4, sides = 48) {
    const ring = new RingGeometry(0.94, 1, sides).rotateX(-Math.PI / 2);
    const chevron = new ConeGeometry(0.008, 0.016, 3).rotateX(Math.PI / 2);
    for (let i = 0; i < count; i++) {
      const group = new Group();
      // Depth-tested (pulled forward a little so the floor under a shape never hides them), so a
      // real hand over the arena (the hand occluder writes depth) covers the marks, as it should.
      const mats = [0, 1, 2, 3, 4].map(() => new MeshBasicMaterial({ color, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
      const rings = [0, 1, 2].map((k) => {
        const m = new Mesh(ring, mats[k]);
        m.renderOrder = 20;
        return m;
      });
      const ch = new Mesh(chevron, mats[3]);
      ch.renderOrder = 21;
      const lane = new Mesh(new PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mats[4]);
      lane.renderOrder = 20;
      group.add(...rings, lane, ch);
      group.visible = false;
      this.marks.push({ group, rings, chevron: ch, lane, mats });
      this.root.add(group);
    }
  }

  /** Shows marks for these shapes (in order) at their floor heights; the rest hide. */
  show(specs: ShapeMarkSpec[], height: (x: number, z: number) => number, time: number) {
    this.marks.forEach((m, i) => {
      const s = specs[i];
      m.group.visible = !!s;
      if (!s) return;
      const sigma = s.sigma ?? (s.kind === 'ramp' ? RAMP_SIGMA : WELL_SIGMA);
      const shrink = 0.4 + 0.6 * s.strength;
      m.group.position.set(s.x, height(s.x, s.z) + 0.003, s.z);
      const radii = s.kind === 'ramp' ? [0.6, 1.1, 1.6] : [0.5, 1, 1.5];
      m.rings.forEach((r, k) => {
        r.visible = s.kind !== 'groove';
        r.scale.setScalar(sigma * radii[k] * shrink);
        m.mats[k].opacity = (s.ghost ? 0.35 + 0.15 * Math.sin(time * 8) : 0.85) * (1 - k * 0.25) * Math.max(0.2, s.strength);
      });
      m.lane.visible = s.kind === 'groove';
      if (s.kind === 'groove') {
        m.group.rotation.y = Math.atan2(s.dx, s.dz);
        m.lane.scale.set(Math.max(0.008, sigma * 0.7), 1, Math.max(0.001, (s.length ?? 0.001) * shrink));
        m.mats[4].opacity = (s.ghost ? 0.4 + 0.25 * Math.sin(time * 10) : 0.75) * Math.max(0.2, s.strength);
      } else m.group.rotation.y = 0;
      m.chevron.visible = s.kind === 'ramp' || s.kind === 'groove';
      if (s.kind === 'ramp' || s.kind === 'groove') {
        // The arrow runs out along the push, again and again: this is which way it throws.
        const run = (time * 1.6) % 1;
        const d = s.kind === 'groove' ? ((s.length ?? 0) * (run - 0.5)) : sigma * (0.4 + 1.1 * run);
        m.chevron.position.set(s.kind === 'groove' ? 0 : s.dx * d, 0.002, s.kind === 'groove' ? d : s.dz * d);
        m.chevron.rotation.y = s.kind === 'groove' ? 0 : Math.atan2(s.dx, s.dz);
        m.chevron.scale.set(1.6, 0.35, 1.6);
        m.mats[3].opacity = (s.ghost ? 0.6 : 0.95 * s.strength) * Math.sin(run * Math.PI);
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

/** Arena miniatures: the theme's rim color and floor tint. */
const MINI_R = 0.03;
const MINI_THEME: Record<Theme, number> = { forge: 0xff6a2a, stone: 0x8fb7c9, clockwork: 0xe2b866, ice: 0x9fe8ff, lava: 0xff2a0a, void: 0xb86cff };
const MINI_FLOOR: Record<Theme, number> = { forge: 0xe8dcc4, stone: 0xb9b3a8, clockwork: 0xd9c9a3, ice: 0xdff1fa, lava: 0x8a6a60, void: 0x9a94b8 };

/** A miniature of an arena: its floor, rim in the theme color, and its pockets. */
export function miniArena(layout: ArenaLayout, current: boolean): Group {
  const outer = new Group();
  const g = new Group();
  outer.add(g);
  const square = layout.shape === 'square';
  // Own materials (not the shared ones): the workshop darkens a locked miniature's colors.
  const base = new Mesh(new CylinderGeometry(MINI_R + 0.004, MINI_R + 0.006, 0.014, square ? 4 : 32, 1), GRAPHITE.clone());
  base.position.y = 0.007;
  const floor = new Mesh(new CircleGeometry(MINI_R, square ? 4 : 32).rotateX(-Math.PI / 2), plastic(MINI_FLOOR[layout.theme]).clone());
  floor.position.y = 0.0142;
  const rim = new Mesh(new TorusGeometry(MINI_R, current ? 0.003 : 0.002, 8, square ? 4 : 40).rotateX(Math.PI / 2), new MeshBasicMaterial({ color: MINI_THEME[layout.theme] }));
  rim.position.y = 0.015;
  if (square) {
    base.rotation.y = floor.rotation.y = rim.rotation.y = Math.PI / 4;
  }
  g.add(base, floor, rim);
  for (const p of layout.pockets) {
    const pocket = new Mesh(new BoxGeometry(0.008, 0.004, 0.008), new MeshBasicMaterial({ color: 0x120c08 }));
    pocket.position.set(Math.cos(p.angle) * MINI_R * 0.85, 0.0145, Math.sin(p.angle) * MINI_R * 0.85);
    g.add(pocket);
  }
  if (layout.shape === 'oval') g.scale.set(1, 1, 0.78);
  return mergeByMaterial(outer);
}


/**
 * A word stamped over the arena (ROUND 2, MATCH POINT, RIP!, SLAG, CRACKED): heavy outlined type,
 * molten for you and steel-teal for the rival. It punches in with a little overshoot, holds, then
 * sinks and fades. One at a time; a new one replaces the last.
 */
export class Stamp {
  readonly mesh: Mesh;
  private canvas = document.createElement('canvas');
  private tex: CanvasTexture;
  private t = -1;
  private hold = 1;
  private size = 1;
  /** Cancels the table-fit scale so result words keep the same readable world size. */
  worldScale = 1;
  private queue: [string, string, 'mine' | 'rival' | 'neutral', number, number][] = [];

  /** Ends what shows now at once (a skipped replay's plate); what waits shows next. */
  cut() {
    this.t = -1;
    this.mesh.visible = false;
  }

  /** Stamps after whatever shows now (and after anything stamped in the same frame). */
  /** A stamp is showing now (a minor note should not cut it). */
  get busy() {
    return this.t >= 0;
  }

  /** A visible or queued stamp still owns the player's attention band. */
  get occupied() {
    return this.t >= 0 || this.queue.length > 0;
  }

  later(word: string, sub = '', side: 'mine' | 'rival' | 'neutral' = 'mine', hold = 1, size = 1) {
    // At most three wait: a pile of rewards is not a sequence anyone reads.
    if (this.queue.length < 3) this.queue.push([word, sub, side, hold, size]);
  }

  /** Canvas px per world metre (its usual home: the card's slot over the far rim, about 1.2 m away). */
  private readonly k: number;

  constructor(width = 0.2) {
    this.canvas.width = 1024;
    this.canvas.height = 256;
    this.tex = signTexture(this.canvas);
    this.k = pxPerM(1024, width * ARENA_SCALE);
    this.mesh = new Mesh(new PlaneGeometry(width, width / 4), new MeshBasicMaterial({ map: this.tex, transparent: true, depthWrite: false, depthTest: false }));
    this.mesh.renderOrder = 30;
    this.mesh.visible = false;
  }

  /** Stamps `word` (and a small line under it) for `hold` seconds; side picks the colors; size weighs it (1.5 for a decided match, a level). */
  show(word: string, sub = '', side: 'mine' | 'rival' | 'neutral' = 'mine', hold = 1, weight = 1) {
    this.size = weight;
    const g = this.canvas.getContext('2d')!;
    g.clearRect(0, 0, 1024, 256);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // DISPLAY type at a fixed size; a long word is narrowed to the canvas, never shrunk.
    setType(g, 'display', this.k, 1.2);
    const grad = g.createLinearGradient(0, 40, 0, 190);
    if (side === 'rival') {
      grad.addColorStop(0, '#bff3ff');
      grad.addColorStop(1, CYAN);
    } else if (side === 'neutral') {
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(1, '#c9d3e0');
    } else {
      // White-hot to orange: gold is kept for teaching.
      grad.addColorStop(0, '#fff1d6');
      grad.addColorStop(1, ORANGE);
    }
    g.lineJoin = 'round';
    g.lineWidth = 22;
    g.strokeStyle = 'rgba(10, 12, 16, 0.9)';
    g.strokeText(word, 512, sub ? 108 : 128, 960);
    g.fillStyle = grad;
    g.fillText(word, 512, sub ? 108 : 128, 960);
    if (sub) {
      // BODY under the word (MATCH WON, +1 LEVEL).
      setType(g, 'body', this.k, 1.2);
      g.lineWidth = 12;
      g.strokeText(sub, 512, 220, 980);
      g.fillStyle = '#f4f1ea';
      g.fillText(sub, 512, 220, 980);
    }
    this.tex.needsUpdate = true;
    this.t = 0;
    this.hold = hold;
    this.mesh.visible = true;
  }

  /** Each frame (real time: it keeps moving through hit-stop and slow motion). */
  update(dt: number) {
    if (this.t < 0) {
      const q = this.queue.shift();
      if (q) this.show(...q);
      return;
    }
    this.t += dt;
    const t = this.t;
    const m = this.mesh.material as MeshBasicMaterial;
    // In over 0.12 s from 1.5x with a 1.08 overshoot, hold, then sink and fade over 0.3 s.
    const k = t < 0.12 ? 1.5 - 0.5 * (t / 0.12) - 0.08 * Math.sin((t / 0.12) * Math.PI) : 1;
    const out = Math.max(0, (t - 0.12 - this.hold) / 0.3);
    this.mesh.scale.setScalar(this.worldScale * this.size * k * (1 - 0.15 * out));
    m.opacity = Math.min(1, t / 0.05) * (1 - out);
    if (out >= 1) {
      this.t = -1;
      this.mesh.visible = false;
    }
  }
}

const SLOPE_TMP = { x: 0, z: 0 };

/** A glowing palm print (palm and five fingers), drawn once: where to press or slap the table. */
export const PALM = palmTexture();
function palmTexture(): CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.shadowColor = '#ffffff';
  g.shadowBlur = 10;
  // The palm, then the fingers fanned out above it and the thumb to the side.
  g.beginPath();
  g.ellipse(128, 160, 52, 58, 0, 0, Math.PI * 2);
  g.fill();
  const finger = (x: number, y: number, len: number, angle: number, w = 22) => {
    g.save();
    g.translate(x, y);
    g.rotate(angle);
    g.beginPath();
    g.roundRect(-w / 2, -len, w, len, w / 2);
    g.fill();
    g.restore();
  };
  finger(92, 120, 62, -0.2);
  finger(118, 108, 78, -0.06);
  finger(144, 108, 74, 0.06);
  finger(168, 120, 60, 0.2);
  finger(78, 175, 60, -1.0, 24);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/**
 * The forge's light (the environment map): a dome graded from a lit ceiling to a dark floor, so
 * everything is lit from above and darker underneath, with a soft key panel overhead, a warm
 * softbox low on one side, a cool steel strip high behind and a thin bright line overhead, so
 * spinning blades sweep a warm and a cool highlight. Emitters go over white: the renderer's tone
 * mapping rolls them off. Rendered once at load.
 */
export function forgeEnvironment(renderer: WebGLRenderer): Texture {
  const scene = new Scene();
  scene.background = new Color(0x08090b);
  const dome = new SphereGeometry(8, 32, 16);
  const top = new Color(0x9a9da4);
  const horizon = new Color(0x6a6d74);
  const floor = new Color(0x2a2b2e);
  const col = new Float32Array(dome.getAttribute('position').count * 3);
  const c = new Color();
  for (let i = 0; i < col.length / 3; i++) {
    const y = dome.getAttribute('position').getY(i) / 8;
    if (y > 0) c.copy(horizon).lerp(top, Math.sqrt(y));
    else c.copy(horizon).lerp(floor, Math.min(1, -y * 3));
    c.toArray(col, i * 3);
  }
  dome.setAttribute('color', new BufferAttribute(col, 3));
  scene.add(new Mesh(dome, new MeshBasicMaterial({ vertexColors: true, side: BackSide })));
  const box = (w: number, h: number, color: number, k: number, x: number, y: number, z: number) => {
    const m = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: new Color(color).multiplyScalar(k), side: DoubleSide }));
    m.position.set(x, y, z);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  box(3.4, 2.2, 0xfff4e8, 1.65, -1.8, 3.4, -2.2); // large back-left key panel
  box(2.4, 1.2, 0xffa060, 1.35, -3.2, 1.1, -1.6); // warm back-left softbox
  box(5, 0.5, 0x8fb7ff, 1.15, 2.5, 2.0, 2.8); // cool front-right separator
  box(4, 0.1, 0xffffff, 4, 0, 3, -0.6); // bright line overhead
  box(2, 1, 0x40261a, 1, 3, -0.4, 1); // a dim ember bounce on the right
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.04).texture;
  pmrem.dispose();
  return env;
}

/** How a ghost hand shows its move: a thumb-and-index pinch, a flat palm press, or one fingertip swing. */
export type GhostStyle = 'pinch' | 'palm' | 'tip';

/**
 * A flat low-poly right hand, palm down, fingers away from the player (-z), thumb on -x: the palm
 * press and slap lessons. Left-handed comfort mirrors it per ghost (scale.x).
 */
function palmSilhouette() {
  const k = 0.0011;
  const s = new Shape();
  s.moveTo(-11 * k, 0);
  s.lineTo(11 * k, 0);
  s.lineTo(11.5 * k, 21 * k);
  // Pinky to index: [centre x, length].
  for (const [cx, len] of [[8.6, 12], [3.2, 17], [-2.2, 19], [-7.6, 16]]) {
    s.lineTo((cx + 2.3) * k, 23 * k);
    s.lineTo((cx + 2.3) * k, (23 + len) * k);
    s.lineTo((cx - 2.3) * k, (23 + len) * k);
    s.lineTo((cx - 2.3) * k, 23 * k);
  }
  s.lineTo(-11 * k, 19 * k);
  // The thumb, out to the side.
  s.lineTo(-19 * k, 27 * k);
  s.lineTo(-22 * k, 24 * k);
  s.lineTo(-13 * k, 8 * k);
  s.closePath();
  // Flat on the floor, the wrist toward the player and the palm's centre at the origin.
  return new ShapeGeometry(s).translate(0, -20 * k, 0).rotateX(-Math.PI / 2);
}

/**
 * Every ghost hand shares one set of geometries and one material per hand colour (the lesson
 * ghosts are all white): a ghost costs its visible meshes' draw calls and no new programs. Fades
 * are done by scale, so a shared material never flickers between two ghosts.
 */
const GHOST_GEO: { index?: CapsuleGeometry; thumb?: CapsuleGeometry; palm?: ShapeGeometry; ring?: RingGeometry; trail?: SphereGeometry } = {};
const GHOST_MATS = new Map<number, MeshBasicMaterial>();
function ghostMaterial(hand: number) {
  let m = GHOST_MATS.get(hand);
  if (!m) GHOST_MATS.set(hand, (m = new MeshBasicMaterial({ color: hand, transparent: true, opacity: 0.85, depthWrite: false, side: DoubleSide })));
  return m;
}

/**
 * A ghost hand that shows a move instead of a card telling it: thumb and index fingertips that
 * travel a path and close as they pinch (or a flat palm that presses, or one fingertip that
 * swings), with a ring where it touches. play() loops keyframes (arena-local points with a pinch
 * or press 0..1); hidden when not playing. Respects the comfort dial: no white pop with flashes
 * off, solid with high contrast, a mirrored palm when left-handed.
 */
export class GhostHand {
  readonly root = new Group();
  /** Thumb and index fingertips: they close together as the pinch plays, so it reads as a pinch, not a dot. */
  private index: Mesh;
  private thumb: Mesh;
  private palm: Mesh;
  private ring: Mesh;
  private trail: Mesh;
  private t = 0;
  private readonly accent: number;
  private readonly hand: MeshBasicMaterial;

  constructor(hand = 0xffffff, accent = GUIDE) {
    this.accent = accent;
    const g = GHOST_GEO;
    g.index ??= new CapsuleGeometry(0.0042, 0.014, 3, 8);
    g.thumb ??= new CapsuleGeometry(0.0046, 0.011, 3, 8);
    g.palm ??= palmSilhouette();
    g.ring ??= new RingGeometry(0.8, 1, 24);
    g.trail ??= new SphereGeometry(0.0025, 8, 6);
    this.hand = ghostMaterial(hand);
    this.index = new Mesh(g.index, this.hand);
    this.thumb = new Mesh(g.thumb, this.hand);
    this.palm = new Mesh(g.palm, this.hand);
    this.ring = new Mesh(g.ring, new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.8, depthWrite: false, side: DoubleSide }));
    this.trail = new Mesh(g.trail, new MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.4, depthWrite: false }));
    this.root.add(this.index, this.thumb, this.palm, this.ring, this.trail);
    this.root.visible = false;
    this.ring.rotation.x = -Math.PI / 2;
  }

  /** Plays keyframes [time s, x, y, z, pinch] in a loop (the last time is the loop length). */
  play(keys: number[][], dt: number, style: GhostStyle = 'pinch') {
    this.root.visible = true;
    const len = keys[keys.length - 1][0];
    this.t = (this.t + dt) % len;
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1][0] <= this.t) i++;
    const a = keys[i];
    const b = keys[i + 1];
    const u = Math.max(0, Math.min(1, (this.t - a[0]) / Math.max(1e-6, b[0] - a[0])));
    const e = u * u * (3 - 2 * u);
    const x = a[1] + (b[1] - a[1]) * e;
    const y = a[2] + (b[2] - a[2]) * e;
    const z = a[3] + (b[3] - a[3]) * e;
    const pinch = a[4] + (b[4] - a[4]) * e;
    // Fades at the loop's ends (by scale: the material is shared).
    const fade = Math.max(0.001, Math.min(1, this.t / 0.3, (len - this.t) / 0.3));
    this.hand.opacity = COMFORT.contrast ? 1 : 0.85;
    this.index.visible = style !== 'palm';
    this.thumb.visible = style === 'pinch';
    this.palm.visible = style === 'palm';
    this.ring.visible = style !== 'tip' || pinch > 0.5;
    if (style === 'pinch') {
      // The fingertips' gap closes with the pinch: the index comes down from above and behind, the
      // thumb from below and in front.
      const gap = 0.005 + 0.016 * (1 - pinch);
      this.index.rotation.set(0.5, 0, 0);
      this.index.position.set(x, y + 0.006 + gap * 0.6, z - gap * 0.5);
      this.thumb.position.set(x, y + 0.002 - gap * 0.2, z + 0.004 + gap * 0.7);
      this.thumb.rotation.set(-1.1, 0, 0);
      this.ring.scale.setScalar(0.009 + 0.014 * (1 - pinch));
    } else if (style === 'palm') {
      // Pressed (1), the palm is flat on the surface; lifted, it hovers and tips up a little.
      this.palm.position.set(x, y + 0.002, z);
      this.palm.rotation.set(-0.25 * (1 - pinch), 0, 0);
      this.palm.scale.set(COMFORT.lefty ? -fade : fade, fade, fade);
      this.ring.scale.setScalar(0.014 + 0.03 * pinch);
    } else {
      // One fingertip, lying forward like a pointing finger, swung through the path.
      this.index.rotation.set(1.25, 0, 0);
      this.index.position.set(x, y + 0.004, z);
      this.ring.scale.setScalar(0.012);
    }
    if (style !== 'palm') {
      this.index.scale.setScalar(fade);
      this.thumb.scale.setScalar(fade);
    }
    this.ring.position.set(x, y, z);
    // A white pop marks the pinch or press; with flashes off it only grows, in the guide colour.
    (this.ring.material as MeshBasicMaterial).color.setHex(pinch > 0.8 && COMFORT.flashes ? 0xffffff : this.accent);
    (this.ring.material as MeshBasicMaterial).opacity = (COMFORT.contrast ? 1 : 0.8) * fade;
    // A faint echo a moment behind shows the direction.
    const back = Math.max(0, u - 0.25);
    this.trail.position.set(a[1] + (b[1] - a[1]) * back, a[2] + (b[2] - a[2]) * back, a[3] + (b[3] - a[3]) * back);
  }

  hide() {
    this.root.visible = false;
    this.t = 0;
  }
}
