import { AdditiveBlending, BufferGeometry, CanvasTexture, DoubleSide, RepeatWrapping, SRGBColorSpace, Vector2, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, RingGeometry, Vector3 } from '@iwsdk/core';
import { playDeskKo, playLocked, playPick, playDash, playSwish, playTick } from './audio.js';
import { SAFE_COLORS, warnColor } from './comfort.js';
import { Side } from './hands.js';
import { maxRim, normRadius, rimRadius } from './layout.js';
import { DESK_DROP_HALF_MAX, STEP } from './sim.js';
import type { DropSide } from './sim.js';
import { LESSON } from './lessons.js';
import { edgeDistance, insidePoly } from './room.js';
import { deskSectors, deskWrenchAngle, deskWrenchSteer, inSector, wrenchSector } from './desk-edge.js';
import type { DeskSector } from './desk-edge.js';
import type { XZ } from './room.js';
import { mergeByMaterial, OPPONENT_COLOR, ROOM, TopView, WALL_HEIGHT } from './visuals.js';
import { CALL } from './calls.js';
import { PEDESTAL } from './placement.js';
import { FirstFiveState } from '../components.js';
import { PALM_CATCH_RADIUS } from './hand-tools.js';
import { DESK_KO_BONUS, ARENA_SCALE, HAND_LOSS_GRACE } from './match-constants.js';
import type { MatchSystem } from './match-system.js';

/** One desk rescue per round: catch the still-spinning top and draw it back to the rim. */
const OUTER_RING_TIME = 5;
const OUTER_RAIL_POINTS = 48;
const OUTER_RAIL_STEP = 0.008;
const OUTER_RAIL_WIDTH = 0.0045;
/** Maximum real seconds to wait for a thrown rival to settle on, or leave, the detected table. */
const DESK_VERDICT_TIME = 3.5;

/** A flat band just outside a rim from angle a0 to a1 (root frame), its radius read per angle; planar UVs over `span`. */
function rimBand(a0: number, a1: number, radiusAt: (a: number) => number, span: number): BufferGeometry {
  const segs = 24;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  for (let k = 0; k <= segs; k++) {
    const a = a0 + ((a1 - a0) * k) / segs;
    const rr = radiusAt(a);
    for (const f of [1.02, 1.1]) {
      const x = Math.cos(a) * rr * f;
      const z = Math.sin(a) * rr * f;
      pos.push(x, 0, z);
      uv.push((x / span + 1) / 2, (z / span + 1) / 2);
    }
    if (k < segs) {
      const i = k * 2;
      index.push(i, i + 1, i + 2, i + 1, i + 3, i + 2);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  return g;
}

/** Diagonal hazard stripes (white and dark; the arc's colour tints the white), tiled across the planar ring UVs. */
const HAZARD = (() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#1a1416';
  for (let i = -64; i < 128; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i + 14, 0);
    g.lineTo(i + 14 + 64, 64);
    g.lineTo(i + 64, 64);
    g.fill();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(16, 16);
  return t;
})();

/**
 * Real-room play on the physical table: the desk-edge arcs and drop sides, the staged first DESK KO
 * (desk wrench), the desk verdict that waits for the real table to accept a thrown top, the
 * Outer Ring rescue rail, the off-desk pickup and the trophy row of rivals thrown off the desk.
 */
export class DeskPlay {
  constructor(private readonly m: MatchSystem) {}

  /** The last three rivals thrown across the physical desk edge, batched into a small trophy row. */
  deskMemory = new Group();
  /**
   * Real-edge cue: up to two warm arcs on the rim facing where the real table edge is close, so a
   * DESK KO can be aimed. Sectors are in the arena root's local frame (see updateDeskEdge).
   */
  deskArcs = [0, 1].map(() => {
    // Hazard tape: diagonal dark stripes over the warning colour, so the real edge differs from the
    // team-orange rim by pattern as well as hue (and still reads in the colour-safe palette).
    const m = new Mesh<BufferGeometry, MeshBasicMaterial>(new RingGeometry(0.1, 0.11, 8), new MeshBasicMaterial({ color: 0xff5a1e, map: HAZARD, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide, toneMapped: false }));
    m.name = 'desk-edge-arc';
    m.visible = false;
    m.renderOrder = 3;
    return m;
  });
  deskEdgeSectors: DeskSector[] = [];
  /** The sim's drop sides (Arena.drops), one per red arc, reused every frame. */
  private deskDrops: DropSide[] = [{ angle: 0, half: 0 }, { angle: 0, half: 0 }];
  /** The detected desk's outline in arena-local space (dev throws aim at the most desk). */
  deskEdgePoly: XZ[] | null = null;
  private deskEdgeKey = '';
  /**
   * The first match's staged DESK KO: armed for the forge-lesson round, the rival is steered to
   * the rim facing the nearest real edge and the first forge throws it straight across that edge.
   * `fired` lengthens that DESK KO's slow motion.
   */
  deskWrench = { armed: false, fired: false };
  /** progress.matches value of the match whose REAL EDGE hint has been shown. */
  private deskEdgeHintMatch = -1;
  private deskMemoryBatch: Group | null = null;
  private deskMemoryViews: TopView[] = [];
  private deskMemoryKey = '';
  private outerRailLost = 0;
  /** This round's off-the-desk moment has been shown. */
  offDeskShown = false;
  /** A rival ring-out whose final score waits for the real table to accept or reject the top. */
  deskVerdict: { v: 1; left: number; edge?: boolean } | null = null;
  /** Observable after the result: this round really earned the extra desk-edge heat. */
  deskKoScored = false;
  /** 0 idle, 1 rim hit, 2 crossing the desk, 3 real edge crossed. */
  deskKoStage = 0;
  private deskKoTrailT = 0;
  /** Reused output of the rival's table-edge prediction; avoids allocating in the fight loop. */
  deskAvoidX = 0;
  deskAvoidZ = 0;
  /** Real-table second chance: a rail drawn from a thrown top back into the arena. */
  outerRingState: 'idle' | 'rescue' | 'palm' | 'returned' | 'failed' = 'idle';
  outerRingUsed = false;
  outerRingCompleted = false;
  outerRingLeft = 0;
  private outerRingSpin = 0;
  outerRailSide: Side | null = null;
  outerRailCount = 0;
  outerRailLength = 0;
  private outerRailPath = new Float32Array(OUTER_RAIL_POINTS * 2);
  outerRailPositions = new Float32Array((OUTER_RAIL_POINTS - 1) * 6 * 3);
  outerRailGeometry = new BufferGeometry();
  outerRail = Object.assign(new Group(), { visible: false });
  outerRailMesh = new Mesh(
    this.outerRailGeometry,
    new MeshBasicMaterial({ color: 0xff5a10, transparent: true, opacity: 0.86, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
  );
  outerRailHead = new Mesh(
    new RingGeometry(0.012, 0.017, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0xffd090, transparent: true, opacity: 0.95, blending: AdditiveBlending, depthWrite: false }),
  );
  /** Root-local rescue target and rim goal, exposed to the emulator driver without allocating. */
  outerRingAt = new Vector3();
  outerRingGoal = new Vector3();
  private readonly wrenchHead = new Vector3();

  /**
   * Where the staged first DESK KO aims (stage frame), or null when it is not live: armed for the
   * forge-lesson round, on a real table with a desk edge in reach (no table: a plain ring-out).
   */
  deskWrenchAt(): number | null {
    if (!this.deskWrench.armed || this.m.phase !== 'fight' || !ROOM.poly || !this.m.onTable || !this.m.theirs.alive) return null;
    const sec = this.wrenchSector();
    if (!sec) return null;
    // Sectors are root-local; the tops and pockets live on the stage, turned by its yaw.
    return deskWrenchAngle({ ...sec, angle: sec.angle + this.m.stage.rotation.y }, this.m.arena.layout.pockets);
  }

  /**
   * The edge the staged KO goes over: never the player's own side (a top in the lap) and never an
   * edge with a detected wall right behind it. Root-local, like the sectors.
   */
  private wrenchSector(): DeskSector | null {
    const root = this.m.root;
    root.updateWorldMatrix(true, false);
    const head = root.worldToLocal(this.wrenchHead.copy(this.m.headWorld()));
    const playerAngle = Math.hypot(head.x, head.z) > 0.05 ? Math.atan2(head.z, head.x) : null;
    const walls = this.m.wallPlanes();
    const s = root.scale.x || 1;
    return wrenchSector(this.deskEdgeSectors, playerAngle, (sec) => {
      if (!walls.length) return false;
      // The real point just past the edge, in world space: a wall within 15 cm of it blocks the fall.
      const p = root.localToWorld(this.wrenchHead.set(Math.cos(sec.angle) * (sec.distance + 0.02 / s), 0, Math.sin(sec.angle) * (sec.distance + 0.02 / s)));
      return walls.some((w) => Math.abs((p.x - w.x) * w.nx + (p.z - w.z) * w.nz) < 0.15);
    });
  }

  /** Until the staged forge fires, the rival drifts to the rim facing the nearest real edge. */
  steerToDeskEdge() {
    const angle = this.deskWrenchAt();
    if (angle === null) return;
    deskWrenchSteer(this.m.theirs, angle, rimRadius(this.m.arena.layout, angle), STEP);
  }

  /** A ray from the arena centre to the known table polygon, pulled inward to keep the trophy on wood. */
  private deskEdgePoint(angle: number, inward = 0.04, tangent = 0): Vector2 | null {
    const poly = ROOM.poly;
    if (!poly || poly.length < 3) return null;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    let best = Infinity;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const ex = b.x - a.x;
      const ez = b.z - a.z;
      const den = dx * ez - dz * ex;
      if (Math.abs(den) < 1e-6) continue;
      const t = (a.x * ez - a.z * ex) / den;
      const u = (a.x * dz - a.z * dx) / den;
      if (t > 0 && u >= 0 && u <= 1) best = Math.min(best, t);
    }
    if (!Number.isFinite(best)) return null;
    const r = Math.max(0.18, best - inward);
    return new Vector2(dx * r - dz * tangent, dz * r + dx * tangent);
  }

  /** Rebuilds the visible desk history only when the saved trophies or table outline change. */
  rebuildDeskMemory() {
    const polyKey = ROOM.poly?.map((p) => `${p.x.toFixed(2)},${p.z.toFixed(2)}`).join(';') ?? '';
    const key = `${polyKey}|${JSON.stringify(this.m.progress.deskTrophies)}`;
    if (key === this.deskMemoryKey) return;
    this.deskMemoryKey = key;
    if (this.deskMemoryBatch) {
      this.deskMemoryBatch.traverse((object) => { if (object instanceof Mesh) object.geometry.dispose(); });
      this.deskMemoryBatch.removeFromParent();
      this.deskMemoryBatch = null;
    }
    for (const view of this.deskMemoryViews) view.dispose();
    this.deskMemoryViews = [];
    if (!ROOM.poly || this.m.progress.deskTrophies.length === 0) return;
    const source = new Group();
    const count = this.m.progress.deskTrophies.length;
    this.m.progress.deskTrophies.forEach((trophy, i) => {
      const point = this.deskEdgePoint(trophy.angle, 0.04, (i - (count - 1) / 2) * 0.052);
      if (!point) return;
      const view = new TopView({ ...trophy.build, color: OPPONENT_COLOR }, OPPONENT_COLOR);
      view.root.position.set(point.x, 0.006, point.y);
      view.root.rotation.set(0, -trophy.angle, i % 2 ? -1.05 : 1.05);
      view.root.scale.setScalar(0.72);
      this.deskMemoryViews.push(view);
      source.add(view.root);
    });
    if (source.children.length === 0) return;
    this.deskMemoryBatch = mergeByMaterial(source);
    this.deskMemoryBatch.name = 'batched-defeated-rivals';
    this.deskMemory.add(this.deskMemoryBatch);
  }

  /**
   * Your top, thrown out and resting on the desk, can be picked up: a pinch on it takes it back
   * (it goes from the desk; the next round starts it in the arena as always).
   */
  pickOffDesk() {
    const at = this.m.myView.restingAt;
    if (!at || this.m.myView.picked) return;
    this.m.stage.localToWorld(this.m.handAt.copy(at));
    for (const side of ['left', 'right'] as const) {
      const h = this.m.hands[side];
      if (!h.justPinched || h.pinchSmooth.distanceTo(this.m.handAt) > 0.07) continue;
      this.m.myView.picked = true;
      playPick();
      this.m.stamp.show('BACK IN HAND', '', 'mine', 0.4);
      return;
    }
  }

  /**
   * The real-edge cue. The danger sectors are computed in the arena ROOT's local frame (the frame
   * ROOM.poly and the tops share before the stage's own turn): each table corner goes world ->
   * root-local through root.worldToLocal, exactly like setRoom, and only when the table outline or
   * the root's pose/scale changes. The arcs live on the stage, so each one counter-rotates by the
   * stage's yaw (replay turn, forge twist, an online guest's half turn) to stay on the real edge.
   */
  updateDeskEdge(stageYaw: number) {
    const arcs = this.deskArcs;
    const show = this.m.phase === 'fight' && this.m.onTable && !!ROOM.poly && !this.m.photo && !this.m.extras.length && !this.m.demo;
    // The drop side (sim.ts DESK_DROP_ESCAPE) plays only where both tops share one real desk: off
    // on the tray, online (each peer has its own desk; the host's sim is the only one) and in brawls.
    this.m.arena.drops.length = 0;
    if (!show) {
      arcs[0].visible = arcs[1].visible = false;
      return;
    }
    const L = this.m.arena.layout;
    const root = this.m.root;
    // Only a settled root (risen, at match size) has the pose the fight is played in.
    if (this.m.rise >= 1 && this.m.sizeSettled) {
      const s = root.scale.x;
      const key = `${root.position.x.toFixed(3)},${root.position.z.toFixed(3)},${root.rotation.y.toFixed(3)},${s.toFixed(4)},${L.name},${ROOM.poly!.length},${ROOM.poly![0].x.toFixed(3)},${ROOM.poly![0].z.toFixed(3)}`;
      if (key !== this.deskEdgeKey) {
        this.deskEdgeKey = key;
        const table = this.m.tableShape();
        let poly: XZ[];
        if (table) {
          root.updateWorldMatrix(true, false);
          poly = table.poly.map((p) => {
            const l = root.worldToLocal(this.m.p.set(p.x, table.y, p.z));
            return { x: l.x, z: l.z };
          });
        } else poly = ROOM.poly!; // DEV stand-in desk: already arena-local.
        // 25 cm of real desk beyond the rim still counts as "soon off the edge".
        this.deskEdgePoly = poly;
        this.deskEdgeSectors = deskSectors(poly, maxRim(L), 0.25 / s, arcs.length);
        this.deskEdgeSectors.forEach((sec, i) => {
          // RingGeometry turned flat (rotateX(-PI/2)) maps its theta to atan2 angle -theta.
          // rimRadius/height read the stage's own frame: root angle + stage yaw.
          const sa = sec.angle + stageYaw;
          const r = rimRadius(L, sa);
          const half = Math.min(sec.halfWidth, DESK_DROP_HALF_MAX);
          arcs[i].geometry.dispose();
          // The band follows the rim's own radius at every angle (a square or oval rim is not a
          // circle), so it never cuts through the wall. UVs stay planar for the hazard stripes.
          arcs[i].geometry = rimBand(sec.angle - half, sec.angle + half, (a) => rimRadius(L, a + stageYaw), r * 1.1);
          arcs[i].position.y = this.m.arena.height(Math.cos(sa) * r * 0.97, Math.sin(sa) * r * 0.97) + WALL_HEIGHT[L.wall] + 0.002;
        });
        if (import.meta.env.DEV) console.log(`[DESK EDGE] ${this.deskEdgeSectors.map((d) => `${((d.angle * 180) / Math.PI).toFixed(0)}deg +-${((d.halfWidth * 180) / Math.PI).toFixed(0)} at ${(d.distance * s).toFixed(2)} m`).join('; ') || 'none'}`);
      }
    }
    const sectors = this.deskEdgeSectors;
    const top = this.m.theirs;
    // The rival's direction in the root frame: the stage turns its local angles by -stageYaw.
    const rivalAngle = Math.atan2(top.z, top.x) - stageYaw;
    const rivalNear = top.alive && normRadius(L, top.x, top.z) > 0.75;
    for (let i = 0; i < arcs.length; i++) {
      const sec = sectors[i];
      const arc = arcs[i];
      arc.visible = !!sec;
      if (!sec) continue;
      arc.rotation.y = -stageYaw;
      // The red arc IS the drop side: same middle, same capped width, in the sim (stage) frame.
      // Not in the first match: its lessons (and the staged wrench, which throws on its own) teach
      // the moves before the room starts changing the rim.
      if (!this.m.online?.peer && this.m.progress.matches > 0) {
        const d = this.deskDrops[i];
        d.angle = sec.angle + stageYaw;
        d.half = Math.min(sec.halfWidth, DESK_DROP_HALF_MAX);
        this.m.arena.drops.push(d);
      }
      const now = (rivalNear && inSector(sec, rivalAngle)) || (this.deskWrench.armed && this.deskWrenchAt() !== null && sec === this.wrenchSector());
      const m = arc.material;
      // Painted, not glowing (it sits on the light enamel): solid enough to read, throbbing when it is the move.
      m.opacity = now ? 0.8 + 0.2 * Math.sin(this.m.time * 9) : 0.55 + 0.1 * Math.sin(this.m.time * 1.8 + i);
      // Red, not the bowl's orange: the warning must not melt into the rim it sits on. When it is the
      // move, it is not paler (cream vanished on the sand enamel) but solid and throbbing.
      m.color.setHex(warnColor(now ? 0xff1424 : 0xff2a3a, SAFE_COLORS.edge));
    }
    if (sectors.length && this.m.progress.matches > 0 && this.deskEdgeHintMatch !== this.m.progress.matches && this.m.labelTimer <= 0) {
      this.deskEdgeHintMatch = this.m.progress.matches;
      this.m.call(this.m.arena.drops.length ? 'REAL EDGE: LOW RIM\nTHROW THEM OFF YOUR DESK' : 'REAL EDGE\nTHROW THEM OFF YOUR DESK', CALL.tactic, 2);
    }
  }

  /** Mirrors the readable DESK KO sequence into ECS for emulator and remote-device proof. */
  setDeskKoStage(stage: 0 | 1 | 2 | 3) {
    if (this.deskKoStage === stage) return;
    this.deskKoStage = stage;
    this.m.rootEntity?.setValue(FirstFiveState, 'deskKoStage', stage);
  }

  /**
   * Predicts whether the rival's present line is carrying it toward a dangerous part of the real
   * table. On success deskAvoidX/Z point back toward safe wood for the visible defensive ramp.
   */
  rivalNeedsDeskGuard(): boolean {
    const poly = ROOM.poly;
    const top = this.m.theirs;
    if (!poly || poly.length < 3 || !top.alive || normRadius(this.m.arena.layout, top.x, top.z) < 0.68) return false;
    const speed = Math.hypot(top.vx, top.vz);
    if (speed < 0.025) return false;
    let cx = 0;
    let cz = 0;
    for (const p of poly) {
      cx += p.x / poly.length;
      cz += p.z / poly.length;
    }
    const safeX = cx - top.x;
    const safeZ = cz - top.z;
    const safeD = Math.hypot(safeX, safeZ) || 1;
    // Only react when it is moving away from the table's safe middle. Looking half a second ahead
    // makes the response early enough to read and late enough to be a real tactical tell.
    if ((top.vx * safeX + top.vz * safeZ) / (speed * safeD) > -0.12) return false;
    const px = top.x + top.vx * 0.5;
    const pz = top.z + top.vz * 0.5;
    // Heading for a drop side (the low rim facing the real edge) is reason enough on its own.
    const r = Math.hypot(top.x, top.z) || 1;
    const towardDrop = this.m.arena.dropAt(Math.atan2(pz, px)) && (top.vx * top.x + top.vz * top.z) / r > 0.05;
    if (!towardDrop && insidePoly(poly, px, pz) && edgeDistance(poly, px, pz) > 0.055) return false;
    this.deskAvoidX = safeX / safeD;
    this.deskAvoidZ = safeZ / safeD;
    return true;
  }

  /** Arms the one-per-round rescue only when the real table outline is known. */
  beginOuterRing(): boolean {
    // Plane discovery may finish after the arena's initial placement, or a dev/HMR session may
    // restore a ready match without replaying placement. Refresh once at the moment the boundary
    // becomes gameplay-critical; production still refuses the rescue when no table is known.
    if (!ROOM.poly) this.m.setRoom();
    if (this.outerRingUsed || this.m.demo || !ROOM.poly || this.m.mine.finish !== 'over') return false;
    this.m.cancelActiveGestures();
    this.outerRingUsed = true;
    this.outerRingState = 'rescue';
    this.outerRingLeft = OUTER_RING_TIME;
    this.outerRingSpin = this.m.mine.spin;
    this.outerRailSide = null;
    this.outerRailCount = 0;
    this.outerRailLength = 0;
    this.outerRailGeometry.setDrawRange(0, 0);
    this.outerRail.visible = true;
    this.outerRailHead.visible = false;
    (this.outerRailMesh.material as MeshBasicMaterial).opacity = 0.86;
    this.m.stamp.show('PALM CATCH!', 'YOUR TABLE IS THE ARENA', 'mine', 0.9, 1.2);
    this.m.label.set(LESSON.palmCatch);
    this.m.labelTimer = OUTER_RING_TIME;
    this.m.accumulator = 0;
    if (import.meta.env.DEV) console.log('[OUTER] rescue armed');
    return true;
  }

  /** Writes one thick, molten ribbon segment without allocating in the frame loop. */
  private appendOuterRail(x: number, z: number) {
    if (this.outerRailCount >= OUTER_RAIL_POINTS) return;
    const count = this.outerRailCount;
    if (count > 0) {
      const px = this.outerRailPath[(count - 1) * 2];
      const pz = this.outerRailPath[(count - 1) * 2 + 1];
      const dx = x - px;
      const dz = z - pz;
      const len = Math.hypot(dx, dz);
      if (len < OUTER_RAIL_STEP) return;
      this.outerRailLength += len;
      const nx = (-dz / len) * OUTER_RAIL_WIDTH;
      const nz = (dx / len) * OUTER_RAIL_WIDTH;
      const y = -PEDESTAL / ARENA_SCALE + 0.0025;
      const o = (count - 1) * 18;
      const p = this.outerRailPositions;
      // Two triangles, slightly above the physical table. The depth layer still lets real hands
      // and the table edge cover it, so the rail reads as forged onto the room rather than UI.
      p.set([
        px - nx, y, pz - nz, px + nx, y, pz + nz, x + nx, y, z + nz,
        px - nx, y, pz - nz, x + nx, y, z + nz, x - nx, y, z - nz,
      ], o);
      this.outerRailGeometry.setDrawRange(0, count * 6);
      (this.outerRailGeometry.getAttribute('position') as Float32BufferAttribute).needsUpdate = true;
    }
    this.outerRailPath[count * 2] = x;
    this.outerRailPath[count * 2 + 1] = z;
    this.outerRailCount++;
    this.outerRailHead.position.set(x, -PEDESTAL / ARENA_SCALE + 0.0032, z);
    this.outerRailHead.visible = true;
  }

  /** Returns the caught top through the rail with less spin and more damage than before. */
  private completeOuterRing() {
    const a = Math.atan2(this.outerRingGoal.z, this.outerRingGoal.x);
    const r = rimRadius(this.m.arena.layout, a) * 0.78;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const speed = 0.3;
    const me = this.m.mine;
    me.x = c * r;
    me.z = s * r;
    me.vx = -c * speed - s * me.hand * 0.08;
    me.vz = -s * speed + c * me.hand * 0.08;
    me.spin = Math.max(0.24, Math.min(0.58, this.outerRingSpin * 0.62));
    me.damage = Math.min(0.94, me.damage + 0.12);
    me.wobble = Math.max(me.wobble, 0.2);
    me.lifted = 0;
    me.finish = null;
    me.state = 'spinning';
    // The same open hand is still crossing the bowl when the rescue completes. Reserve its lift as
    // the tail of Palm Return; otherwise the index fingertip can immediately start a Cup and flash
    // a contradictory "NO CATCH" message after a visibly successful return.
    if (this.outerRailSide) this.m.blockShapingRelease(this.outerRailSide);
    this.outerRingState = 'returned';
    this.outerRingCompleted = true;
    this.m.recordIntervention();
    this.outerRingLeft = 1.2;
    this.outerRailSide = null;
    this.outerRailHead.visible = false;
    this.m.lastShape = { t: this.m.elapsed, kind: 'parry' };
    this.m.sparks.burst(me.x, this.m.arena.height(me.x, me.z), me.z, 1);
    this.m.impacts.shock(me.x, this.m.arena.height(me.x, me.z), me.z, 0.9, 0xff7a20);
    this.m.stamp.show('PALM RETURN!', 'CAUGHT ON YOUR REAL TABLE', 'mine', 0.9, 1.2);
    this.m.label.set('');
    this.m.labelTimer = 0;
    playDash(me.x);
    if (import.meta.env.DEV) console.log('[OUTER] forged return');
  }

  /** Handles the rescue gesture. True means the normal arena simulation stays paused this frame. */
  updateOuterRing(dt: number): boolean {
    if (this.outerRingState === 'returned') {
      this.outerRingLeft -= dt;
      (this.outerRailMesh.material as MeshBasicMaterial).opacity = 0.86 * Math.max(0, this.outerRingLeft / 1.2);
      if (this.outerRingLeft <= 0) {
        this.outerRingState = 'idle';
        this.outerRail.visible = false;
      }
      return false;
    }
    if (this.outerRingState !== 'rescue' && this.outerRingState !== 'palm') return false;
    this.outerRingLeft -= dt;
    this.m.myView.brakeForRescue(dt);
    const at = this.m.myView.rescueAt;
    // Before the catch, the real desk edge still decides the KO. Once the top is on a palm, that
    // palm is its physical surface; the old ballistic view may continue past the desk edge for one
    // frame, but it must no longer invalidate a successful catch.
    const waitingForPalm = this.outerRingState === 'rescue';
    if (this.outerRingLeft <= 0 || (waitingForPalm && (this.m.myView.offDesk || (!at && this.m.myView.restingAt !== null)))) {
      this.outerRingState = 'failed';
      this.outerRail.visible = false;
      this.m.label.set(LESSON.edgeKo);
      if (import.meta.env.DEV) console.log(`[OUTER] rescue failed: ${this.outerRingState} left ${this.outerRingLeft.toFixed(2)} offDesk ${this.m.myView.offDesk} resting ${this.m.myView.restingAt !== null} at ${!!at} rail ${this.outerRailLength.toFixed(3)}`);
      this.m.finish(-1);
      return true;
    }
    if (waitingForPalm) {
      // The top is still flying toward the table: keep the rescue clock visible, but wait for contact.
      if (!at) return true;
      this.m.stage.localToWorld(this.m.handAt.copy(at));
      this.m.root.worldToLocal(this.outerRingAt.copy(this.m.handAt));
      const angle = Math.atan2(this.outerRingAt.z, this.outerRingAt.x);
      const rim = rimRadius(this.m.arena.layout, angle) * 0.9;
      this.outerRingGoal.set(Math.cos(angle) * rim, -PEDESTAL / ARENA_SCALE + 0.003, Math.sin(angle) * rim);
      for (const side of ['left', 'right'] as const) {
        const h = this.m.hands[side];
        if (!h.tracked || h.pinching || Math.abs(h.wrist.y - h.index.y) > 0.08) continue;
        const palm = this.m.p.copy(h.wrist).lerp(h.index, 0.48);
        const catchDistance = palm.distanceTo(this.m.handAt);
        if (catchDistance > (import.meta.env.DEV ? PALM_CATCH_RADIUS * 1.8 : PALM_CATCH_RADIUS)) {
          if (import.meta.env.DEV) console.log(`[OUTER] ${side} catch missed by ${catchDistance.toFixed(3)} m`);
          continue;
        }
        this.outerRailSide = side;
        this.outerRingState = 'palm';
        this.outerRailCount = 0;
        this.outerRailLength = 0;
        this.outerRailGeometry.setDrawRange(0, 0);
        this.appendOuterRail(this.outerRingAt.x, this.outerRingAt.z);
        playTick();
        this.m.label.set(LESSON.palmCaught);
        if (import.meta.env.DEV) console.log(`[OUTER] ${side} open palm caught the top`);
        break;
      }
      return true;
    }
    // From here on the open palm, rather than the old off-arena flight, owns the top.
    if (this.outerRailSide === null) return true;
    const h = this.m.hands[this.outerRailSide];
    if (!h.tracked && (this.outerRailLost += dt) < HAND_LOSS_GRACE) return true;
    if (h.tracked) this.outerRailLost = 0;
    if (!h.tracked || h.pinching) {
      this.outerRailLost = 0;
      this.outerRailSide = null;
      this.outerRingState = 'rescue';
      this.outerRailCount = 0;
      this.outerRailLength = 0;
      this.outerRailHead.visible = false;
      this.outerRailGeometry.setDrawRange(0, 0);
      playLocked();
      this.m.label.set(LESSON.palmDropped);
      this.m.labelTimer = Math.max(1.6, this.outerRingLeft);
      return true;
    }
    const palmWorld = this.m.p.copy(h.wrist).lerp(h.index, 0.48);
    this.m.stage.worldToLocal(this.m.handAt.copy(palmWorld));
    this.m.myView.carryRescue(this.m.handAt);
    this.m.stage.localToWorld(this.m.handAt);
    const l = this.m.root.worldToLocal(this.m.local.copy(this.m.handAt));
    this.outerRingAt.copy(l);
    if (ROOM.poly && insidePoly(ROOM.poly, l.x, l.z)) this.appendOuterRail(l.x, l.z);
    if (this.outerRailLength > 0.055 && normRadius(this.m.arena.layout, l.x, l.z) <= 0.94) this.completeOuterRing();
    return true;
  }

  /**
   * A normal arena ring-out is provisional when a real table outline is known. The rendered top
   * gets one readable flight across the desk; the real edge, not a late text replacement, decides
   * whether the room-aware bonus was earned.
   */
  beginDeskVerdict(): boolean {
    if (this.m.demo || !ROOM.poly || this.m.theirs.finish !== 'over') return false;
    const cause = this.m.recentPlayerCause();
    this.deskVerdict = { v: 1, left: DESK_VERDICT_TIME };
    this.deskKoTrailT = 0;
    this.setDeskKoStage(1);
    this.m.accumulator = 0;
    const y = this.m.arena.height(this.m.theirs.x, this.m.theirs.z);
    this.m.arenaView.flashRail(this.m.theirs.x, this.m.theirs.z);
    this.m.impacts.hit(this.m.theirs.x, y, this.m.theirs.z, 1);
    this.m.impacts.shock(this.m.theirs.x, y, this.m.theirs.z, 1, 0xff8a2a);
    this.m.sparks.burst(this.m.theirs.x, y, this.m.theirs.z, 1);
    this.m.theirView.flash();
    this.m.theirView.shake(1);
    this.m.theirView.hit(1, this.m.theirs.vx, this.m.theirs.vz, 0.09);
    this.m.koFreeze = Math.max(this.m.koFreeze, 0.09);
    // The staged first DESK KO plays its whole flight across the desk in slow motion.
    if (this.deskWrench.fired) this.m.slowMo = Math.max(this.m.slowMo, 0.5);
    playSwish(1.2, this.m.theirs.x);
    this.m.roomLight.hit();
    if (cause && this.m.causeCue.stage) this.m.showCauseCue(3, cause, this.m.causeCue.sx, this.m.causeCue.sz, this.m.theirs.x, this.m.theirs.z);
    if (!this.m.quietFirst) this.m.stamp.show('EDGE RUN!', cause ? `YOUR ${cause} → REAL TABLE` : 'REAL TABLE DECIDES', 'mine', 0.65, 1.25);
    // The EDGE RUN stamp names the cause; the card says what crossing the edge is worth.
    this.m.label.set(this.m.quietFirst ? '' : LESSON.edgeRun);
    this.m.labelTimer = DESK_VERDICT_TIME;
    if (import.meta.env.DEV) console.log('[DESK_KO] table flight started; score is pending');
    return true;
  }

  /** True while a provisional rival ring-out owns the fight loop. */
  updateDeskVerdict(dt: number): boolean {
    const pending = this.deskVerdict;
    if (!pending) return false;
    if (pending.edge) {
      pending.left -= dt;
      if (pending.left <= 0) {
        this.deskVerdict = null;
        this.m.finish(pending.v, true);
      }
      return true;
    }
    pending.left -= dt;
    if (this.deskWrench.fired) this.m.slowMo = Math.max(this.m.slowMo, 0.1);
    if (this.deskKoStage === 1) this.setDeskKoStage(2);
    if ((this.deskKoTrailT -= dt) <= 0) {
      this.deskKoTrailT = 0.045;
      const p = this.m.theirView.root.position;
      this.m.sparks.flight(p.x, p.y, p.z);
    }
    if (this.m.theirView.offDesk) {
      pending.edge = true;
      // The staged first DESK KO holds its slow motion longer, and the verdict waits it out.
      const staged = this.deskWrench.fired;
      pending.left = staged ? 1.4 : 0.6;
      this.offDeskShown = true;
      this.setDeskKoStage(3);
      const p = this.m.theirView.root.position;
      const angle = Math.atan2(p.z, p.x);
      const edge = this.deskEdgePoint(angle, 0.006);
      this.m.progress.recordDeskKo(this.m.rival.name, this.m.rival.build, angle);
      this.m.roomImprints.record('desk', angle, new Date(), edge ? { x: edge.x, z: edge.y } : undefined);
      this.deskMemoryKey = '';
      this.rebuildDeskMemory();
      this.m.sparks.burst(p.x, p.y, p.z, 1);
      this.m.sparks.embers(p.x, p.y, p.z, 14, 0.26, 0.2, 1);
      this.m.impacts.hit(p.x, p.y, p.z, 1);
      this.m.impacts.shock(p.x, p.y, p.z, 1, 0xff8a2a);
      this.m.slowMo = Math.max(this.m.slowMo, staged ? 1.1 : 0.6);
      playDeskKo(p.x);
      const cause = this.m.recentPlayerCause();
      this.m.stamp.show(staged ? 'DESK KO!' : 'OFF THE DESK!', cause ? `YOUR ${cause} → REAL EDGE +1` : 'REAL EDGE · +1', 'mine', staged ? 1.2 : 0.75, 1.6);
      // The word hangs just over the real edge the top went off, not up by the card.
      this.m.stamp.pin = this.m.theirView.root.getWorldPosition(new Vector3()).add(new Vector3(0, 0.1, 0));
      this.m.featDone('offDesk');
      if (import.meta.env.DEV) console.log(`[DESK_KO] real edge crossed; +${DESK_KO_BONUS} bonus heat`);
      return true;
    }
    // Once it has stopped on the wood, or the bounded visual wait expires, the original arena
    // knockout stands. A missing/slow frame can never invent the bonus.
    if (this.m.theirView.restingAt || pending.left <= 0) {
      this.deskVerdict = null;
      if (import.meta.env.DEV) console.log(`[DESK_KO] ${this.m.theirView.restingAt ? 'top stayed on table' : 'visual timeout'}; normal heat`);
      this.m.finish(pending.v);
    }
    return true;
  }
}
