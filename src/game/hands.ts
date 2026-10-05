import { Matrix4, Object3D, Quaternion, Vector3 } from '@iwsdk/core';

/** Thumb-to-index distance hysteresis (m): close below ON, open above OFF. */
const PINCH_ON = 0.02;
const PINCH_OFF = 0.035;

export type Side = 'left' | 'right';

export interface HandState {
  /** Hand (or controller) is tracked this frame. */
  tracked: boolean;
  pinching: boolean;
  justPinched: boolean;
  justReleased: boolean;
  /** Midpoint between thumb and index tips, world space. */
  pinch: Vector3;
  /** Index fingertip, world space (grip position for controllers). */
  index: Vector3;
  /** Pointing ray (the system target ray), world space. */
  rayOrigin: Vector3;
  rayDir: Vector3;
  hasRay: boolean;
}

const newHand = (): HandState => ({
  tracked: false,
  pinching: false,
  justPinched: false,
  justReleased: false,
  pinch: new Vector3(),
  index: new Vector3(),
  rayOrigin: new Vector3(),
  rayDir: new Vector3(),
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

  update(frame: XRFrame, ref: XRReferenceSpace, session: XRSession, player: Object3D) {
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
    }
    for (const side of ['left', 'right'] as const) {
      if (this.seen[side]) continue;
      const h = this[side];
      h.justReleased = h.pinching;
      h.justPinched = false;
      h.pinching = false;
      h.tracked = false;
    }
  }

  private read(frame: XRFrame, ref: XRReferenceSpace, source: XRInputSource, h: HandState, player: Object3D): boolean | null {
    const pressed = source.gamepad?.buttons[0]?.pressed ?? false;
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
        player.localToWorld(h.pinch.set((t.x + i.x) / 2, (t.y + i.y) / 2, (t.z + i.z) / 2));
        player.localToWorld(h.index.set(i.x, i.y, i.z));
        return pressed || (h.pinching ? d < PINCH_OFF : d < PINCH_ON);
      }
    }
    if (!source.gripSpace) return null;
    const pose = frame.getPose(source.gripSpace, ref);
    if (!pose) return null;
    const p = pose.transform.position;
    player.localToWorld(h.pinch.set(p.x, p.y, p.z));
    h.index.copy(h.pinch);
    return pressed;
  }

  private readRay(frame: XRFrame, ref: XRReferenceSpace, source: XRInputSource, h: HandState, player: Object3D) {
    const pose = frame.getPose(source.targetRaySpace, ref);
    h.hasRay = !!pose;
    if (!pose) return;
    this.mat.fromArray(pose.transform.matrix).premultiply(player.matrixWorld);
    h.rayOrigin.setFromMatrixPosition(this.mat);
    this.quat.setFromRotationMatrix(this.mat);
    h.rayDir.set(0, 0, -1).applyQuaternion(this.quat);
  }
}
