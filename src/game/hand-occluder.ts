/**
 * Real hands in front of the game: an invisible copy of each tracked hand (a sphere per joint, a
 * rod per bone at the joints' tracked radii, and a flat palm slab) drawn first, into depth only.
 * Virtual content behind it fails the depth test and leaves those pixels clear, so passthrough
 * shows the real fingers on top of the arena, the tops and the forge parts. No depth sensing
 * needed: any Quest with hands. Two draw calls in all (both hands share each mesh), never picked.
 *
 * Hand UI that must stay on top of the real hand (pinch ring, flick glow, wrist bar) is drawn with
 * depthTest off; IWSDK's own hand visual is a depth mask plus a rim outline at 1.05x the hand,
 * outside these 0.95x proxies, so its rim still shows and its alpha-0 mask cannot z-fight visibly.
 */
import { CylinderGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Object3D, SphereGeometry, Vector3 } from '@iwsdk/core';
import { BONES, boneMatrix, JOINTS, PALM, palmMatrix } from './hand-proxy.js';

export class HandOccluder {
  readonly joints: InstancedMesh;
  readonly bones: InstancedMesh;
  /** Off outside passthrough, under real depth occlusion, or with ?nohandocclude (hand-proxy.ts). */
  enabled = true;
  /** How full the hand shape is, against the joints' tracked radii. */
  scale = 0.95;
  private pos: Vector3[] = JOINTS.map(() => new Vector3());
  private rad = new Float32Array(JOINTS.length);
  private ok = new Uint8Array(JOINTS.length);
  private readonly m = new Matrix4();
  private readonly arr: number[] = new Array(16);

  constructor() {
    // Depth only: the colour buffer (and its alpha, which is what keeps passthrough visible) is untouched.
    const mask = new MeshBasicMaterial({ colorWrite: false, depthWrite: true });
    // Joints plus one palm per hand share the sphere mesh.
    this.joints = new InstancedMesh(new SphereGeometry(1, 8, 6), mask, (JOINTS.length + 1) * 2);
    this.bones = new InstancedMesh(new CylinderGeometry(1, 1, 1, 6), mask, BONES.length * 2);
    for (const mesh of [this.joints, this.bones]) {
      mesh.name = 'hand-occluder';
      mesh.renderOrder = -10;
      mesh.frustumCulled = false;
      mesh.count = 0;
      // Never a pointer or ray target.
      mesh.raycast = () => {};
    }
  }

  /** Rebuilds both hands from this frame's joints (world space through the player's transform). */
  update(frame: XRFrame, ref: XRReferenceSpace, session: XRSession, player: Object3D) {
    let nj = 0;
    let nb = 0;
    if (this.enabled && frame.getJointPose) {
      const k = this.scale;
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
          this.m.makeScale(r, r, r).setPosition(this.pos[i]);
          this.joints.setMatrixAt(nj++, this.m);
        }
        for (const [a, b] of BONES) {
          if (!this.ok[a] || !this.ok[b]) continue;
          if (!boneMatrix(this.pos[a], this.pos[b], Math.min(this.rad[a], this.rad[b]), this.arr)) continue;
          this.bones.setMatrixAt(nb++, this.m.fromArray(this.arr));
        }
        // The palm between the metacarpal rods, as thick as the wrist joint.
        const { wrist, index, middle, pinky } = PALM;
        if (this.ok[wrist] && this.ok[index] && this.ok[middle] && this.ok[pinky]
          && palmMatrix(this.pos[wrist], this.pos[index], this.pos[middle], this.pos[pinky], this.rad[wrist], this.arr)) {
          this.joints.setMatrixAt(nj++, this.m.fromArray(this.arr));
        }
      }
    }
    this.joints.count = nj;
    this.bones.count = nb;
    this.joints.instanceMatrix.needsUpdate = true;
    this.bones.instanceMatrix.needsUpdate = true;
  }
}
