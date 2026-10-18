/** Shared, allocation-free rules for the hand tools used around the live arena. */

export const PALM_CATCH_RADIUS = 0.055;
export const GROOVE_MIN_LENGTH = 0.045;
export const GROOVE_MAX_LENGTH = 0.16;
export const GROOVE_RADIUS = 0.018;

export const palmCenterX = (wristX: number, indexX: number) => wristX + (indexX - wristX) * 0.48;
export const palmCenterZ = (wristZ: number, indexZ: number) => wristZ + (indexZ - wristZ) * 0.48;

export function palmCatchDistance(topX: number, topZ: number, palmX: number, palmZ: number) {
  return Math.hypot(topX - palmX, topZ - palmZ);
}

export function grooveLength(sx: number, sz: number, x: number, z: number) {
  return Math.min(GROOVE_MAX_LENGTH, Math.hypot(x - sx, z - sz));
}

export function clampedGrooveX(sx: number, sz: number, x: number, z: number) {
  const dx = x - sx;
  const dz = z - sz;
  const length = Math.hypot(dx, dz);
  return length <= GROOVE_MAX_LENGTH || length === 0 ? x : sx + dx * (GROOVE_MAX_LENGTH / length);
}

export function clampedGrooveZ(sx: number, sz: number, x: number, z: number) {
  const dx = x - sx;
  const dz = z - sz;
  const length = Math.hypot(dx, dz);
  return length <= GROOVE_MAX_LENGTH || length === 0 ? z : sz + dz * (GROOVE_MAX_LENGTH / length);
}
