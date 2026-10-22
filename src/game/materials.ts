/**
 * The forge's few lit materials, shared by every model, in three tiers:
 * - hero metal: polished STEEL (arena walls, anvil face, hammer, pillars) and hammered FORGED
 *   steel (the anvil's body);
 * - machine body: a mid painted slate, matte (GRAPHITE), or dark machined metal (GUNMETAL);
 * - trim: BRASS, plus the orange heat lines (unlit, elsewhere).
 * All are lit by the environment map and the arena's key light, so highlights stay on the object
 * as the head moves (matcaps slid with the view). The detail maps are generated here once, small.
 *
 * Imported first by the entry point: unlit materials (UI, labels, glows, decals) are exempt from
 * tone mapping, so their authored colors reach the screen unchanged.
 */
import {
  DataTexture,
  ExtrudeGeometry,
  Shape,
  LinearFilter,
  LinearMipmapLinearFilter,
  LineBasicMaterial,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PointsMaterial,
  RepeatWrapping,
  SpriteMaterial,
  Vector2,
} from '@iwsdk/core';

// Unlit materials always skip the tone curve (set on the prototype, so every one made anywhere does).
for (const M of [MeshBasicMaterial, LineBasicMaterial, PointsMaterial, SpriteMaterial]) {
  Object.defineProperty(M.prototype, 'toneMapped', { get: () => false, set: () => undefined, configurable: true });
}

/** A repeatable pseudo-random sequence (same maps every load). */
function random(seed: number) {
  return () => (seed = (seed * 16807) % 2147483647) / 2147483647;
}

/** Height field (n x n, wrapping) to a tangent-space normal map (RGBA, row 0 = v 0). */
function normalTexture(h: Float32Array, n: number, strength: number): DataTexture {
  const data = new Uint8Array(n * n * 4);
  const at = (x: number, y: number) => h[((y + n) % n) * n + ((x + n) % n)];
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      // Sobel slopes along u (x) and v (y).
      const dx = at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1);
      const dy = at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1);
      const nx = -dx * strength;
      const ny = -dy * strength;
      const l = Math.hypot(nx, ny, 1);
      const i = (y * n + x) * 4;
      data[i] = (nx / l) * 127.5 + 127.5;
      data[i + 1] = (ny / l) * 127.5 + 127.5;
      data[i + 2] = (1 / l) * 127.5 + 127.5;
      data[i + 3] = 255;
    }
  }
  return texture(data, n);
}

function texture(data: Uint8Array, n: number): DataTexture {
  const t = new DataTexture(data, n, n);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.magFilter = LinearFilter;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}

/** Hammered iron: overlapping soft dimples (256², tiles), as normals and as roughness. */
function hammered(): { normal: DataTexture; rough: DataTexture } {
  const n = 256;
  const h = new Float32Array(n * n);
  const rnd = random(23);
  for (let k = 0; k < 140; k++) {
    const cx = rnd() * n;
    const cy = rnd() * n;
    const r = 9 + rnd() * 16;
    const depth = 0.6 + rnd() * 0.5;
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const d = Math.hypot(x - cx, y - cy) / r;
        if (d >= 1) continue;
        const i = ((y + n) % n) * n + ((x + n) % n);
        h[i] -= depth * (1 - d * d) ** 2;
      }
    }
  }
  for (let i = 0; i < h.length; i++) h[i] += (rnd() - 0.5) * 0.05;
  // Roughness (green channel): dimple floors a little smoother than the ridges between them.
  const data = new Uint8Array(n * n * 4);
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of h) (lo = Math.min(lo, v)), (hi = Math.max(hi, v));
  for (let i = 0; i < h.length; i++) {
    const k = (h[i] - lo) / (hi - lo);
    const v = 255 * (0.62 + 0.38 * k);
    data[i * 4] = data[i * 4 + 1] = data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  return { normal: normalTexture(h, n, 0.35), rough: texture(data, n) };
}

/**
 * Lathe rings: fine concentric turning marks around the texture's center, with the floor's two
 * engraved grooves (see FLOOR_TEXTURE in visuals.ts), so the bowl glints in rings as the head moves.
 */
function latheRings(): DataTexture {
  const n = 512;
  const C = n / 2;
  const rnd = random(5);
  // The profile along the radius (4 samples per pixel): bands of turning marks, each its own pitch.
  const steps = C * 4 + 8;
  const profile = new Float32Array(steps);
  let phase = 0;
  let pitch = 6;
  let amp = 0.4;
  for (let i = 0; i < steps; i++) {
    if (rnd() < 0.006) (pitch = 4 + rnd() * 8), (amp = 0.2 + rnd() * 0.5);
    phase += (Math.PI * 2) / (pitch * 4);
    const r = i / 4 / C;
    let v = amp * Math.sin(phase);
    for (const g of [0.36, 0.72]) v -= 3 * Math.exp(-((((r - g) * C) / 2) ** 2));
    profile[i] = v;
  }
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const s = Math.hypot(x + 0.5 - C, y + 0.5 - C) * 4;
      h[y * n + x] = s < steps - 1 ? profile[Math.floor(s)] : 0;
    }
  }
  return normalTexture(h, n, 0.25);
}

/** Brushed steel: fine lines along u (128², tiles). */
function brushedLines(): DataTexture {
  const n = 128;
  const rnd = random(41);
  const h = new Float32Array(n * n);
  for (let y = 0; y < n; y++) {
    const row = (rnd() - 0.5) * 1.2;
    for (let x = 0; x < n; x++) h[y * n + x] = row + (rnd() - 0.5) * 0.15;
  }
  return normalTexture(h, n, 0.4);
}

const HAMMERED = hammered();
HAMMERED.normal.repeat.set(6, 2);
HAMMERED.rough.repeat.copy(HAMMERED.normal.repeat);
/** The concentric turning marks, centered at uv (0.5, 0.5); the floor maps its rim to the texture's edge. */
export const LATHE_NORMAL = latheRings();
const BRUSHED_NORMAL = brushedLines();
BRUSHED_NORMAL.repeat.set(4, 1);

/** Hero metal, polished: walls, pillars, the anvil's face and the hammer. */
export const STEEL = new MeshStandardMaterial({ color: 0xb9bec8, metalness: 1, roughness: 0.32, normalMap: BRUSHED_NORMAL, normalScale: new Vector2(0.35, 0.35) });
/** Hero metal, hammered: the anvil's body. */
export const FORGED = new MeshStandardMaterial({ color: 0x9298a2, metalness: 0.9, roughness: 0.75, normalMap: HAMMERED.normal, roughnessMap: HAMMERED.rough });
/** Machine body, painted matte slate: plinths, stands, the shell (well above #2a2c32, so passthrough never shows a hole). */
export const BODY = 0x6c717b;
export const GRAPHITE = new MeshStandardMaterial({ color: BODY, metalness: 0.1, roughness: 0.8, normalMap: HAMMERED.normal, normalScale: new Vector2(0.2, 0.2), roughnessMap: HAMMERED.rough });
/** The same graphite with darkening baked into vertex colors where parts meet (lathe profiles). */
export const GRAPHITE_AO = GRAPHITE.clone();
GRAPHITE_AO.vertexColors = true;
/** Machine body, machined: ratchets, coins, the shell's clamps. */
export const GUNMETAL = new MeshStandardMaterial({ color: 0x3a3d44, metalness: 0.85, roughness: 0.42 });
/** Trim. */
export const BRASS = new MeshStandardMaterial({ color: 0xc99a50, metalness: 1, roughness: 0.4 });

const metals = new Map<number, MeshStandardMaterial>();
const plastics = new Map<number, MeshStandardMaterial>();

/** A shared colored metal (coins, gems, theme walls), one per color. */
export function metal(hex: number): MeshStandardMaterial {
  let m = metals.get(hex);
  if (!m) metals.set(hex, (m = new MeshStandardMaterial({ color: hex, metalness: 0.85, roughness: 0.38 })));
  return m;
}

/** A shared painted or moulded surface (paper, paint, stone, pieces), one per color. */
export function plastic(hex: number): MeshStandardMaterial {
  let m = plastics.get(hex);
  if (!m) plastics.set(hex, (m = new MeshStandardMaterial({ color: hex, metalness: 0, roughness: 0.55 })));
  return m;
}

/** A top's colored plastic layer: glossy moulded plastic under a clear coat (one per top, freed with it). */
export function topPlastic(hex: number): MeshPhysicalMaterial {
  return new MeshPhysicalMaterial({ color: hex, metalness: 0, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.15 });
}


/**
 * A box with a small chamfer on every edge (w x h x d, centered), so machined parts catch a thin
 * highlight line along their edges instead of ending in a hard, aliased corner.
 */
export function bevelBox(w: number, h: number, d: number, bevel = Math.min(w, h, d) * 0.12): ExtrudeGeometry {
  const x = w / 2 - bevel;
  const y = h / 2 - bevel;
  const s = new Shape();
  s.moveTo(-x, -y).lineTo(x, -y).lineTo(x, y).lineTo(-x, y).lineTo(-x, -y);
  const depth = d - 2 * bevel;
  return new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 1 }).translate(0, 0, -depth / 2);
}
