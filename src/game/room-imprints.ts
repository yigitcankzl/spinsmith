import {
  AdditiveBlending,
  BufferAttribute,
  DoubleSide,
  Group,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  PlaneGeometry,
  RingGeometry,
  Shape,
  ShapeGeometry,
} from '@iwsdk/core';
import { mergeByMaterial } from './visuals.js';

export type RoomSeal = 'anvil' | 'rush' | 'magnet' | 'tilt' | 'hammer' | 'ward';

interface ImprintRecord {
  seal: RoomSeal;
  angle: number;
  seed: number;
  date: string;
}

const KEY = 'spinsmith.room-imprints.v1';
const MAX = 8;
const COLOR: Record<RoomSeal, number> = {
  anvil: 0xff8a2a,
  rush: 0xff4a3a,
  magnet: 0xc85cff,
  tilt: 0x7de07d,
  hammer: 0xffe066,
  ward: 0xd9d4ff,
};

function load(): ImprintRecord[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]') as Partial<ImprintRecord>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((r) => {
      if (!r || typeof r.seal !== 'string' || !(r.seal in COLOR) || !Number.isFinite(r.angle) || !Number.isFinite(r.seed) || typeof r.date !== 'string') return [];
      return [{ seal: r.seal as RoomSeal, angle: Number(r.angle), seed: Number(r.seed), date: r.date }];
    }).slice(-MAX);
  } catch {
    return [];
  }
}

function material(color: number, opacity: number, glow = true) {
  return new MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    side: DoubleSide,
    blending: glow ? AdditiveBlending : NormalBlending,
  });
}

/** Persistent, seal-specific traces painted just above the player's real table. */
export class RoomImprints {
  readonly root = new Group();
  private records = load();
  /** All luminous traces share one vertex-coloured material, so eight memories still draw once. */
  private readonly glowMaterial = new MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
  });
  /** The scorched underprint is deliberately uniform and costs one further draw call. */
  private readonly darkMaterial = new MeshBasicMaterial({
    color: 0x170d08,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: DoubleSide,
    blending: NormalBlending,
  });

  constructor(private readonly tableY: number) {
    this.root.name = 'persistent-room-imprints';
    this.root.position.y = tableY;
    this.rebuild();
  }

  record(seal: RoomSeal, angle: number, date = new Date()): void {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const seed = ((date.getTime() >>> 3) % 997) / 997;
    this.records.push({ seal, angle: Number.isFinite(angle) ? angle : 0, seed, date: day });
    this.records = this.records.slice(-MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(this.records));
    } catch {
      // The match continues when persistence is unavailable.
    }
    this.rebuild();
  }

  private rebuild(): void {
    const geometries = new Set<{ dispose(): void }>();
    const materials = new Set<{ dispose(): void }>();
    this.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      geometries.add(object.geometry);
      const mats = Array.isArray(object.material) ? object.material : [object.material];
      for (const mat of mats) materials.add(mat);
    });
    for (const geometry of geometries) geometry.dispose();
    for (const mat of materials) if (mat !== this.glowMaterial && mat !== this.darkMaterial) mat.dispose();
    this.root.clear();
    this.records.forEach((record, index) => this.build(record, 0.34 + 0.5 * ((index + 1) / this.records.length)));
    this.batch();
  }

  /** Bakes every saved mark into one glow mesh plus one dark underprint. */
  private batch(): void {
    if (this.root.children.length === 0) return;
    const sourceGeometries = new Set<{ dispose(): void }>();
    const sourceMaterials = new Set<{ dispose(): void }>();
    this.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      sourceGeometries.add(object.geometry);
      const source = object.material as MeshBasicMaterial;
      sourceMaterials.add(source);
      if (source.blending === AdditiveBlending) {
        const color = source.color;
        const intensity = source.opacity;
        const count = object.geometry.getAttribute('position').count;
        const rgb = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          rgb[i * 3] = color.r * intensity;
          rgb[i * 3 + 1] = color.g * intensity;
          rgb[i * 3 + 2] = color.b * intensity;
        }
        object.geometry.setAttribute('color', new BufferAttribute(rgb, 3));
        object.material = this.glowMaterial;
      } else object.material = this.darkMaterial;
    });
    const merged = mergeByMaterial(this.root);
    this.root.clear();
    this.root.add(merged);
    for (const geometry of sourceGeometries) geometry.dispose();
    for (const mat of sourceMaterials) mat.dispose();
  }

  private build(record: ImprintRecord, alpha: number): void {
    const group = new Group();
    const color = COLOR[record.seal];
    group.rotation.y = -record.angle;
    group.rotation.z = (record.seed - 0.5) * 0.08;
    if (record.seal === 'anvil') {
      for (let i = -2; i <= 2; i++) {
        const length = 0.07 + 0.025 * ((record.seed * 13 + i * 0.31 + 2) % 1);
        const crack = new Mesh(new PlaneGeometry(0.0022, length).rotateX(-Math.PI / 2).translate(0, 0, -length / 2), material(color, alpha));
        crack.position.z = -0.165;
        crack.rotation.y = i * 0.15 + (record.seed - 0.5) * 0.08;
        group.add(crack);
      }
    } else if (record.seal === 'rush') {
      const arrow = new Shape().moveTo(0, -0.018).lineTo(-0.015, 0.012).lineTo(-0.006, 0.009).lineTo(0, -0.004).lineTo(0.006, 0.009).lineTo(0.015, 0.012).closePath();
      for (let i = 0; i < 3; i++) {
        const mesh = new Mesh(new ShapeGeometry(arrow).rotateX(-Math.PI / 2), material(color, alpha * (0.7 + i * 0.12)));
        mesh.position.z = -0.18 - i * 0.045;
        group.add(mesh);
      }
    } else if (record.seal === 'magnet') {
      for (let i = 0; i < 3; i++) {
        const ring = new Mesh(new RingGeometry(0.012 + i * 0.013, 0.0145 + i * 0.013, 48).rotateX(-Math.PI / 2), material(color, alpha * (1 - i * 0.18)));
        ring.position.z = -0.215;
        group.add(ring);
      }
    } else if (record.seal === 'tilt') {
      for (let i = -1; i <= 1; i++) {
        const lane = new Mesh(new PlaneGeometry(0.012, 0.105).rotateX(-Math.PI / 2), material(color, alpha * 0.7));
        lane.position.set(i * 0.028, 0, -0.215);
        group.add(lane);
      }
    } else if (record.seal === 'hammer') {
      for (let i = 0; i < 3; i++) {
        const crater = new Mesh(new RingGeometry(0.016, 0.019, 40).rotateX(-Math.PI / 2), material(color, alpha * (1 - i * 0.13), i === 0));
        crater.position.set((i - 1) * 0.035, 0, -0.205 - Math.abs(i - 1) * 0.018);
        group.add(crater);
      }
    } else {
      const ward = new Mesh(new RingGeometry(0.205, 0.211, 64, 1, -0.65, 1.3).rotateX(-Math.PI / 2), material(color, alpha));
      group.add(ward);
    }
    const dark = group.clone(true);
    dark.position.y = -0.0008;
    dark.traverse((object) => {
      if (object instanceof Mesh) object.material = material(0x170d08, alpha * 0.42, false);
    });
    this.root.add(dark, group);
  }
}
