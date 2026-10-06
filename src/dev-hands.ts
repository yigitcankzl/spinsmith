/**
 * Dev only: move one emulated hand with the mouse. Hold 1 (left hand) or 2 (right hand) and move
 * the mouse in the emulator's play mode: the hand moves across the view instead of the head
 * turning; the wheel moves it nearer or farther. Clicking still pinches.
 *
 * The emulator's own UI owns the hand poses: every frame it copies its per-hand handle objects
 * (window.transformHandles, keyed 'left' / 'right') into the emulated device, so the handles are
 * what must move. The device input is moved too, for when the emulator is driven remotely.
 */
import { Quaternion, Vector3 } from '@iwsdk/core';

interface EmulatedVector {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): unknown;
  clone(): EmulatedVector;
}
/** The emulator UI's per-hand handle: a three.js object from the emulator's own copy of three. */
interface Handle {
  position: EmulatedVector & { copy(v: unknown): unknown };
  parent: { worldToLocal(v: EmulatedVector): unknown } | null;
  getWorldPosition(target: EmulatedVector): EmulatedVector;
}

interface EmulatedDevice {
  quaternion: { x: number; y: number; z: number; w: number };
  hands: Partial<Record<'left' | 'right', { position: EmulatedVector }>>;
  controllers: Partial<Record<'left' | 'right', { position: EmulatedVector }>>;
}

/** Meters of hand travel per pixel of mouse movement, and per wheel notch. */
const PER_PIXEL = 0.0012;
const PER_NOTCH = 0.02;

export function installDevHands() {
  let held: 'left' | 'right' | null = null;
  const q = new Quaternion();
  const right = new Vector3();
  const up = new Vector3();
  const forward = new Vector3();

  const device = () => (window as unknown as { IWER_DEVICE?: EmulatedDevice }).IWER_DEVICE;
  /** The held side's input (hand, or controller in controller mode), if the emulator has one. */
  const input = () => {
    const d = device();
    if (!d || !held) return null;
    return d.hands[held] ?? d.controllers[held] ?? null;
  };
  /** Moves the held hand along the view's axes. */
  const move = (dx: number, dy: number, dz: number) => {
    const d = device();
    if (!d || !held) return;
    q.set(d.quaternion.x, d.quaternion.y, d.quaternion.z, d.quaternion.w);
    right.set(1, 0, 0).applyQuaternion(q);
    up.set(0, 1, 0).applyQuaternion(q);
    forward.set(0, 0, -1).applyQuaternion(q);
    const wx = right.x * dx + up.x * dy + forward.x * dz;
    const wy = right.y * dx + up.y * dy + forward.y * dz;
    const wz = right.z * dx + up.z * dy + forward.z * dz;
    const handle = (window as unknown as { transformHandles?: Map<string, Handle> }).transformHandles?.get(held);
    if (handle) {
      // Move the emulator's handle in world space; it copies the pose into the device each frame.
      const world = handle.getWorldPosition(handle.position.clone());
      world.set(world.x + wx, world.y + wy, world.z + wz);
      handle.parent?.worldToLocal(world);
      handle.position.copy(world);
    }
    // Also move the device input itself: while the emulator is driven remotely (CLI) it stops
    // copying the handles, and otherwise this is simply overwritten by the same pose.
    const hand = input();
    if (!hand) return;
    const p = hand.position;
    p.set(p.x + wx, p.y + wy, p.z + wz);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Digit1') held = 'left';
    if (e.code === 'Digit2') held = 'right';
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if ((e.code === 'Digit1' && held === 'left') || (e.code === 'Digit2' && held === 'right')) held = null;
  };
  // Capture phase, so the emulator's own mouse-look never sees these moves while a hand is held.
  const onMouseMove = (e: MouseEvent) => {
    if (!held) return;
    e.stopImmediatePropagation();
    move(e.movementX * PER_PIXEL, -e.movementY * PER_PIXEL, 0);
  };
  const onWheel = (e: WheelEvent) => {
    if (!held) return;
    e.stopImmediatePropagation();
    e.preventDefault();
    move(0, 0, -Math.sign(e.deltaY) * PER_NOTCH);
  };
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  window.addEventListener('mousemove', onMouseMove, true);
  window.addEventListener('wheel', onWheel, { capture: true, passive: false });
  console.log('[DEV] hold 1 or 2 and move the mouse to move the left or right hand');
}
