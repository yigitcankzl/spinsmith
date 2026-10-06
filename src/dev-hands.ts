/**
 * Dev only: move one emulated hand with the mouse. Hold 1 (left hand) or 2 (right hand) and move
 * the mouse in the emulator's play mode: the hand moves across the view instead of the head
 * turning; the wheel moves it nearer or farther. Clicking still pinches. Uses the emulator device
 * the IWSDK dev runtime exposes as window.IWER_DEVICE.
 */
import { Quaternion, Vector3 } from '@iwsdk/core';

interface EmulatedVector {
  x: number;
  y: number;
  z: number;
  set(x: number, y: number, z: number): unknown;
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
    const hand = input();
    if (!d || !hand) return;
    q.set(d.quaternion.x, d.quaternion.y, d.quaternion.z, d.quaternion.w);
    right.set(1, 0, 0).applyQuaternion(q);
    up.set(0, 1, 0).applyQuaternion(q);
    forward.set(0, 0, -1).applyQuaternion(q);
    const p = hand.position;
    p.set(
      p.x + right.x * dx + up.x * dy + forward.x * dz,
      p.y + right.y * dx + up.y * dy + forward.y * dz,
      p.z + right.z * dx + up.z * dy + forward.z * dz,
    );
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
