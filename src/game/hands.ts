import { Matrix4, Object3D, Quaternion, Vector3 } from '@iwsdk/core';
import { OneEuro3, OneEuroParams } from './one-euro.js';
import { TUNE } from './tuning.js';

/** Thumb-to-index distance hysteresis (m): close below ON, open above OFF (tunable on a headset). */
const PINCH_ON = TUNE.pinchOn;
const PINCH_OFF = TUNE.pinchOff;

export type Side = 'left' | 'right';

/** The joints a palm pressed on a table touches with. */
const LOW_JOINTS: XRHandJoint[] = ['index-finger-tip', 'middle-finger-tip', 'middle-finger-metacarpal'];

export interface HandState {
  /** Hand (or controller) is tracked this frame. */
  tracked: boolean;
  pinching: boolean;
  justPinched: boolean;
  justReleased: boolean;
  /** Midpoint between thumb and index tips, world space. */
  pinch: Vector3;
  /**
   * pinch and index One-Euro filtered (one-euro.ts): steady points for aim, hover and hit tests.
   * Anything that measures a speed or a swing (rip, flick, rub, gust, slap) reads the raw ones.
   */
  pinchSmooth: Vector3;
  indexSmooth: Vector3;
  /** Thumb-to-index distance (m), for the pinch ring (Infinity for controllers). */
  gap: number;
  /** Index fingertip, world space (grip position for controllers). */
  index: Vector3;
  /** The hand's lowest point (world y): the lowest of the index tip, middle tip and palm, minus its radius. */
  low: number;
  /** Wrist, world space (grip position for controllers): where hand-held menus attach. */
  wrist: Vector3;
  /** Pointing ray (the system target ray), world space. */
  rayOrigin: Vector3;
  rayDir: Vector3;
  /** Orientation of the pointing ray (for turning a held object with the hand). */
  rayQuat: Quaternion;
  hasRay: boolean;
}

const newHand = (): HandState => ({
  tracked: false,
  pinching: false,
  justPinched: false,
  justReleased: false,
  pinch: new Vector3(),
  pinchSmooth: new Vector3(),
  indexSmooth: new Vector3(),
  gap: Infinity,
  index: new Vector3(),
  low: 0,
  wrist: new Vector3(),
  rayOrigin: new Vector3(),
  rayDir: new Vector3(),
  rayQuat: new Quaternion(),
  hasRay: false,
});

/**
 * Reads both hands from raw WebXR joints each frame. Hand-tracking pinch is the
 * primary input; a pressed select button (controllers, or the emulator) also counts.
 */
export class HandInput {
  readonly left = newHand();
  readonly right = newHand();
  private seen = { left: false, right: false };
  private mat = new Matrix4();
  private quat = new Quaternion();
  private v = new Vector3();
  private euroParams: OneEuroParams = { minCutoff: TUNE.euroCutoff, beta: TUNE.euroBeta, dCutoff: TUNE.euroDCutoff };
  private euro = {
    left: { pinch: new OneEuro3(this.euroParams), index: new OneEuro3(this.euroParams) },
    right: { pinch: new OneEuro3(this.euroParams), index: new OneEuro3(this.euroParams) },
  };
  private lastFrameTime = -1;

  /** fallbackDt (s) is used only when the XR frame carries no predicted display time. */
  update(frame: XRFrame, ref: XRReferenceSpace, session: XRSession, player: Object3D, fallbackDt = 1 / 72) {
    // The filter's dt comes from the XR frame clock, so a dropped frame reads as a longer step.
    const t = (frame as XRFrame & { predictedDisplayTime?: number }).predictedDisplayTime;
    let dt = fallbackDt;
    if (typeof t === 'number' && Number.isFinite(t)) {
      if (this.lastFrameTime >= 0 && t > this.lastFrameTime) dt = Math.min(0.1, (t - this.lastFrameTime) / 1000);
      this.lastFrameTime = t;
    }
    this.seen.left = false;
    this.seen.right = false;
    for (const source of session.inputSources) {
      const side = source.handedness;
      if (side !== 'left' && side !== 'right') continue;
      const h = this[side];
      const was = h.pinching;
      const pinching = this.read(frame, ref, source, h, player);
      if (pinching === null) continue;
      this.readRay(frame, ref, source, h, player);
      this.seen[side] = true;
      h.tracked = true;
      h.pinching = pinching;
      h.justPinched = pinching && !was;
      h.justReleased = !pinching && was;
      const f = this.euro[side];
      const p = f.pinch.update(h.pinch.x, h.pinch.y, h.pinch.z, dt);
      h.pinchSmooth.set(p.x, p.y, p.z);
      const i = f.index.update(h.index.x, h.index.y, h.index.z, dt);
      h.indexSmooth.set(i.x, i.y, i.z);
    }
    for (const side of ['left', 'right'] as const) {
      if (this.seen[side]) continue;
      const h = this[side];
      h.justReleased = h.pinching;
      h.justPinched = false;
      h.pinching = false;
      h.tracked = false;
      // Re-acquired tracking starts fresh: no glide from where the hand was lost.
      this.euro[side].pinch.reset();
      this.euro[side].index.reset();
      // No stale ray (or reticle) from where the hand was last seen.
      h.hasRay = false;
    }
  }

  private read(frame: XRFrame, ref: XRReferenceSpace, source: XRInputSource, h: HandState, player: Object3D): boolean | null {
    const pressed = source.gamepad?.buttons[0]?.pressed ?? false;
    // IWER's programmatic pinch closes its logical hand input but, unlike a physical Quest hand,
    // does not always move the synthetic thumb/index joints. Dev automation still travels through
    // the real hand-position path; only its explicit pinch value needs this emulator-only bridge.
    const emulatedValue = import.meta.env.DEV
      ? (window as unknown as { IWER_DEVICE?: { hands?: Partial<Record<'left' | 'right', { pinchValue?: number }>> } }).IWER_DEVICE?.hands?.[source.handedness as 'left' | 'right']?.pinchValue ?? 0
      : 0;
    const emulatedPinch = emulatedValue > 0.5;
    const hand = source.hand;
    if (hand && frame.getJointPose) {
      const thumbJoint = hand.get('thumb-tip');
      const indexJoint = hand.get('index-finger-tip');
      const tp = thumbJoint && frame.getJointPose(thumbJoint, ref);
      const ip = indexJoint && frame.getJointPose(indexJoint, ref);
      if (tp && ip) {
        const t = tp.transform.position;
        const i = ip.transform.position;
        const d = Math.hypot(t.x - i.x, t.y - i.y, t.z - i.z);
        h.gap = d;
        player.localToWorld(h.pinch.set((t.x + i.x) / 2, (t.y + i.y) / 2, (t.z + i.z) / 2));
        player.localToWorld(h.index.set(i.x, i.y, i.z));
        const wristJoint = hand.get('wrist');
        const wp = wristJoint && frame.getJointPose(wristJoint, ref);
        if (wp) player.localToWorld(h.wrist.set(wp.transform.position.x, wp.transform.position.y, wp.transform.position.z));
        else h.wrist.copy(h.index);
        h.low = Infinity;
        for (const j of LOW_JOINTS) {
          const space = hand.get(j);
          const pose = space && frame.getJointPose(space, ref);
          if (!pose) continue;
          const p = pose.transform.position;
          h.low = Math.min(h.low, player.localToWorld(this.v.set(p.x, p.y, p.z)).y - (pose.radius ?? 0.008));
        }
        return pressed || emulatedPinch || (h.pinching ? d < PINCH_OFF : d < PINCH_ON);
      }
    }
    if (!source.gripSpace) return null;
    const pose = frame.getPose(source.gripSpace, ref);
    if (!pose) return null;
    const p = pose.transform.position;
    player.localToWorld(h.pinch.set(p.x, p.y, p.z));
    h.index.copy(h.pinch);
    h.wrist.copy(h.pinch);
    h.low = h.pinch.y;
    return pressed || emulatedPinch;
  }

  private readRay(frame: XRFrame, ref: XRReferenceSpace, source: XRInputSource, h: HandState, player: Object3D) {
    const pose = frame.getPose(source.targetRaySpace, ref);
    h.hasRay = !!pose;
    if (!pose) return;
    this.mat.fromArray(pose.transform.matrix).premultiply(player.matrixWorld);
    h.rayOrigin.setFromMatrixPosition(this.mat);
    this.quat.setFromRotationMatrix(this.mat);
    h.rayQuat.copy(this.quat);
    h.rayDir.set(0, 0, -1).applyQuaternion(this.quat);
  }
}
