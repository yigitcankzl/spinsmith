import type { Object3D } from '@iwsdk/core';

const POSE_KEY = 'spinsmith.spatial-pose.v1';

export interface SpatialPose {
  version: 1;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  onTable: boolean;
}

function finite(values: number[]): boolean {
  return values.every(Number.isFinite);
}

/** The smithy pose is stored in the persistent XR anchor's local space. */
export function loadSpatialPose(storage: Storage = localStorage): SpatialPose | null {
  try {
    const raw = JSON.parse(storage.getItem(POSE_KEY) ?? 'null') as Partial<SpatialPose> | null;
    if (!raw || raw.version !== 1 || !Array.isArray(raw.position) || raw.position.length !== 3 || !Array.isArray(raw.quaternion) || raw.quaternion.length !== 4) return null;
    const position = raw.position.map(Number) as [number, number, number];
    const quaternion = raw.quaternion.map(Number) as [number, number, number, number];
    if (!finite(position) || !finite(quaternion)) return null;
    return { version: 1, position, quaternion, onTable: raw.onTable !== false };
  } catch {
    return null;
  }
}

export function applySpatialPose(object: Object3D, pose: SpatialPose): void {
  object.position.fromArray(pose.position);
  object.quaternion.fromArray(pose.quaternion).normalize();
}

export function saveSpatialPose(object: Object3D, onTable: boolean, storage: Storage = localStorage): void {
  const pose: SpatialPose = {
    version: 1,
    position: object.position.toArray() as [number, number, number],
    quaternion: object.quaternion.toArray() as [number, number, number, number],
    onTable,
  };
  try {
    storage.setItem(POSE_KEY, JSON.stringify(pose));
  } catch {
    // Private browsing or a full storage quota must not block play.
  }
}

