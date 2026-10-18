/** The four deliberate ways two hands can forge the live arena. */
export type ArenaForgeAction = 'squeeze' | 'stretch' | 'twist' | 'tilt';

export interface ArenaForgeGesture {
  /** Relative change in the distance between the hands; negative is inward. */
  pull: number;
  /** Signed rotation of the hand-to-hand axis, in radians. */
  twist: number;
  /** Signed height difference between the hands, in arena units. */
  tilt: number;
}

export interface ArenaForgeImpulse {
  x: number;
  z: number;
}

/**
 * Small two-hand tracking noise is a cancelled grab, not a free arena attack. The three
 * denominators describe equally deliberate gestures; the shared score is their deadzone.
 */
export function classifyArenaForge({ pull, twist, tilt }: ArenaForgeGesture): ArenaForgeAction | null {
  const pullScore = Math.abs(pull) / 0.045;
  const twistScore = Math.abs(twist) / 0.12;
  // A real height split of about 4 cm is deliberate. Smaller differences are normal tracking
  // noise or a squeeze with uneven wrists and must not steal the gesture from pull/twist.
  const tiltScore = Math.abs(tilt) / 0.072;
  if (Math.max(pullScore, twistScore, tiltScore) < 0.55) return null;
  if (tiltScore > twistScore && tiltScore > pullScore) return 'tilt';
  if (twistScore > pullScore) return 'twist';
  return pull < 0 ? 'squeeze' : 'stretch';
}

/**
 * Converts the visible arena deformation into the velocity kick a top receives on release.
 * Stretch grows toward the rim, making it useful for pressuring an exposed rival without
 * throwing a protected center top just as hard.
 */
export function arenaForgeImpulse(
  action: ArenaForgeAction,
  gesture: ArenaForgeGesture,
  topX: number,
  topZ: number,
  arenaRadius: number,
  downhillX: number,
  downhillZ: number,
  strength = 1,
): ArenaForgeImpulse {
  const radius = Math.hypot(topX, topZ) || 1;
  const nx = topX / radius;
  const nz = topZ / radius;
  if (action === 'twist') {
    const direction = gesture.twist >= 0 ? 1 : -1;
    const impulse = Math.min(0.32, 0.12 + Math.abs(gesture.twist) * 0.58) * strength;
    return { x: -nz * impulse * direction, z: nx * impulse * direction };
  }
  if (action === 'tilt') {
    const impulse = Math.min(0.24, 0.11 + Math.abs(gesture.tilt) * 1.1) * strength;
    return { x: downhillX * impulse, z: downhillZ * impulse };
  }
  const impulse = Math.min(0.3, 0.13 + Math.abs(gesture.pull) * 0.75) * strength;
  const outward = action === 'stretch' ? 1 : -1;
  const rimBias = action === 'stretch'
    ? 0.65 + 0.7 * Math.min(1, radius / Math.max(0.01, arenaRadius))
    : 1;
  return { x: nx * impulse * outward * rimBias, z: nz * impulse * outward * rimBias };
}

/** A compact tactical read: positive means this top is closer to leaving the arena. */
export function arenaForgeDanger(x: number, z: number, vx: number, vz: number, arenaRadius: number) {
  const radius = Math.hypot(x, z) || 1e-3;
  const outward = (vx * x + vz * z) / radius;
  return radius / Math.max(0.01, arenaRadius) + Math.max(0, outward) * 0.8;
}
