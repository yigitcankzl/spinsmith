/**
 * Pure math behind the hand occluder (hand-occluder.ts): which joints and bones make a hand, where
 * each bone's rod and the palm's flat ellipsoid sit, and when the occluder runs at all. No three.js
 * here, so `npm run check:sim` can test it headless.
 */

export type V3 = { x: number; y: number; z: number };

/** The WebXR hand joints, in their standard order, and the bones between them. */
const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
export const JOINTS: XRHandJoint[] = ['wrist'];
for (const f of FINGERS) {
  const parts = f === 'thumb' ? ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'] : ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
  for (const p of parts) JOINTS.push(`${f}-${p}` as XRHandJoint);
}
/** Each joint links to the one before it in its finger, the first of a finger to the wrist. */
export const BONES: [number, number][] = [];
for (let i = 1; i < JOINTS.length; i++) BONES.push([JOINTS[i].endsWith('metacarpal') ? 0 : i - 1, i]);
/** The palm spans the wrist to the knuckles: index, middle and pinky proximal joints. */
export const PALM = {
  wrist: 0,
  index: JOINTS.indexOf('index-finger-phalanx-proximal'),
  middle: JOINTS.indexOf('middle-finger-phalanx-proximal'),
  pinky: JOINTS.indexOf('pinky-finger-phalanx-proximal'),
};

function writeBasis(out: number[], x: V3, y: V3, z: V3, t: V3) {
  out[0] = x.x; out[1] = x.y; out[2] = x.z; out[3] = 0;
  out[4] = y.x; out[5] = y.y; out[6] = y.z; out[7] = 0;
  out[8] = z.x; out[9] = z.y; out[10] = z.z; out[11] = 0;
  out[12] = t.x; out[13] = t.y; out[14] = t.z; out[15] = 1;
  return out;
}
const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const len = (a: V3) => Math.hypot(a.x, a.y, a.z);
const scale = (a: V3, k: number): V3 => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const cross = (a: V3, b: V3): V3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dot = (a: V3, b: V3) => a.x * b.x + a.y * b.y + a.z * b.z;

/**
 * A unit cylinder (radius 1, height 1, along y, centred) stretched from joint a to joint b with
 * radius r, as a column-major 4x4 (Matrix4.fromArray). Null for a bone too short to orient.
 */
export function boneMatrix(a: V3, b: V3, r: number, out: number[] = new Array(16)): number[] | null {
  const d = sub(b, a);
  const l = len(d);
  if (l < 1e-4) return null;
  const y = scale(d, 1 / l);
  // Any axis across the bone will do: the rod is round.
  const helper = Math.abs(y.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const x = cross(helper, y);
  const xs = scale(x, 1 / len(x));
  const z = cross(xs, y);
  return writeBasis(out, scale(xs, r), d, scale(z, r), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 });
}

/**
 * The palm as a unit sphere squashed into a slab: long from the wrist to the middle knuckle, wide
 * from the index to the pinky knuckle, `thick` deep. Column-major 4x4, or null if degenerate.
 */
export function palmMatrix(wrist: V3, index: V3, middle: V3, pinky: V3, thick: number, out: number[] = new Array(16)): number[] | null {
  const along = sub(middle, wrist);
  const l = len(along);
  const across = sub(pinky, index);
  if (l < 1e-3 || len(across) < 1e-3) return null;
  const z = scale(along, 1 / l);
  // Across the knuckles, made square to the palm's length.
  const w0 = sub(across, scale(z, dot(across, z)));
  const w = len(w0);
  if (w < 1e-3) return null;
  const x = scale(w0, 1 / w);
  const n = cross(z, x);
  const c = { x: (wrist.x + middle.x) / 2, y: (wrist.y + middle.y) / 2, z: (wrist.z + middle.z) / 2 };
  return writeBasis(out, scale(x, w / 2), scale(n, thick), scale(z, l / 2), c);
}

/**
 * The proxy hands run only over passthrough (an AR blend mode), and not where real depth occlusion
 * already hides the scene behind the hands, nor with `?nohandocclude` or the dev knob at 0.
 */
export function handOcclusionOn(o: { blend: string | undefined; depthOcclusion: boolean; optOut: boolean; knob: number }) {
  return !o.optOut && o.knob > 0 && !o.depthOcclusion && (o.blend === 'alpha-blend' || o.blend === 'additive');
}
