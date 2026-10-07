/**
 * Real hands in front of the game: an invisible copy of each tracked hand (a sphere per joint and a
 * rod per bone, at the joints' tracked radii) drawn first, into depth only. Virtual content behind
 * it fails the depth test and leaves those pixels clear, so passthrough shows the real fingers on
 * top of the arena, the tops and the forge parts. No depth sensing needed: any Quest with hands.
 */
import { CylinderGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, Quaternion, SphereGeometry, Vector3 } from '@iwsdk/core';
import { TUNE } from './tuning.js';

/** The WebXR hand joints, in their standard order, and the bones between them. */
const FINGERS = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
const JOINTS: XRHandJoint[] = ['wrist'];
for (const f of FINGERS) {
  const parts = f === 'thumb' ? ['metacarpal', 'phalanx-proximal', 'phalanx-distal', 'tip'] : ['metacarpal', 'phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal', 'tip'];
  for (const p of parts) JOINTS.push(`${f}-${p}` as XRHandJoint);
}
const BONES: [number, number][] = [];
for (let i = 1; i < JOINTS.length; i++) {
  // Each joint links to the one before it in its finger, the first of a finger to the wrist.
  const first = JOINTS[i].endsWith('metacarpal');
  BONES.push([first ? 0 : i - 1, i]);
}

export class HandOccluder {
  readonly joints: InstancedMesh;
  readonly bones: InstancedMesh;
  private pos: Vector3[] = JOINTS.map(() => new Vector3());
  private rad = new Float32Array(JOINTS.length);
  private ok = new Uint8Array(JOINTS.length);
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly s = new Vector3();
  private readonly mid = new Vector3();
  private readonly dir = new Vector3();
  private readonly up = new Vector3(0, 1, 0);

  constructor() {
    // Depth only: the colour buffer (and its alpha, which is what keeps passthrough visible) is untouched.
    const mask = new MeshBasicMaterial({ colorWrite: false });
    this.joints = new InstancedMesh(new SphereGeometry(1, 8, 6), mask, JOINTS.length * 2);
    this.bones = new InstancedMesh(new CylinderGeometry(1, 1, 1, 6), mask, BONES.length * 2);
    for (const mesh of [this.joints, this.bones]) {
      mesh.renderOrder = -10;
      mesh.frustumCulled = false;
      mesh.count = 0;
    }
  }

  /** Rebuilds both hands from this frame's joints (world space through the player's transform). */
  update(frame: XRFrame, ref: XRReferenceSpace, session: XRSession, player: Object3D) {
    let nj = 0;
    let nb = 0;
    if (TUNE.occluder > 0 && frame.getJointPose) {
      const k = TUNE.occluderScale;
      for (const source of session.inputSources) {
        const hand = source.hand;
        if (!hand) continue;
        let any = false;
        for (let i = 0; i < JOINTS.length; i++) {
          const space = hand.get(JOINTS[i]);
          const pose = space && frame.getJointPose(space, ref);
          this.ok[i] = pose ? 1 : 0;
          if (!pose) continue;
          any = true;
          const p = pose.transform.position;
          player.localToWorld(this.pos[i].set(p.x, p.y, p.z));
          this.rad[i] = (pose.radius ?? 0.008) * k;
        }
        if (!any) continue;
        for (let i = 0; i < JOINTS.length; i++) {
          if (!this.ok[i]) continue;
          const r = this.rad[i];
          this.joints.setMatrixAt(nj++, this.m.compose(this.pos[i], this.q.identity(), this.s.set(r, r, r)));
        }
        for (const [a, b] of BONES) {
          if (!this.ok[a] || !this.ok[b]) continue;
          this.dir.subVectors(this.pos[b], this.pos[a]);
          const len = this.dir.length();
          if (len < 1e-4) continue;
          this.mid.addVectors(this.pos[a], this.pos[b]).multiplyScalar(0.5);
          this.q.setFromUnitVectors(this.up, this.dir.multiplyScalar(1 / len));
          const r = Math.min(this.rad[a], this.rad[b]);
          this.bones.setMatrixAt(nb++, this.m.compose(this.mid, this.q, this.s.set(r, len, r)));
        }
      }
    }
    this.joints.count = nj;
    this.bones.count = nb;
    this.joints.instanceMatrix.needsUpdate = true;
    this.bones.instanceMatrix.needsUpdate = true;
  }
}
