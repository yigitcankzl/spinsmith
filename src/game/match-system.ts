import { createSystem, Group, Vector3, VisibilityState, XRPlane } from '@iwsdk/core';
import { HandInput, HandState, Side } from './hands.js';
import { Arena, ARENA_RADIUS, LAUNCH_SPEED, NARROW, step, STEP, Top, verdict, WIDE } from './sim.js';
import { ArenaView, Label, LauncherView, NARROW_LOOK, Sparks, TopView, WIDE_LOOK } from './visuals.js';

/** The arena floor sits this far above the real table, leaving room to press dents. */
const PEDESTAL = 0.08;
/** How far in front of the seated player's head the arena goes (m, horizontal). */
const REACH = 0.42;
/** Without a table the arena floats on a tray this far below the head. */
const TRAY_DROP = 0.42;
const TABLE_MIN_H = 0.45;
const TABLE_MAX_H = 1.15;
const TABLE_MAX_DIST = 1.6;
/** Wait for planes to arrive before placing. */
const SETTLE = 2;
/** Launcher handle, arena-local (+Z faces the player). */
const LAUNCHER = new Vector3(0, 0.05, ARENA_RADIUS + 0.06);
const GRAB_RADIUS = 0.07;
/** Cord pull that counts as a full-power rip (m) and full-power pull speed (m/s). */
const FULL_PULL = 0.22;
const FULL_SPEED = 1.0;
/** Pulls shorter than this do not launch; the launcher just returns. */
const MIN_PULL = 0.05;
/** Pulling farther than this releases automatically. */
const MAX_PULL = 0.32;
/** Launch direction is clamped to this many radians off straight-at-center. */
const MAX_AIM = 0.6;
const SPAWN = ARENA_RADIUS * 0.72;
/** Pinches this close to the floor (vertically) grab it to raise a bump. */
const SHAPE_GRAB = 0.05;
const BUMP_MIN = 0.008;
const BUMP_MAX = 0.04;
const DENT_MAX = 0.03;
const RESULT_TIME = 4;

type Phase = 'placing' | 'ready' | 'pulling' | 'fight' | 'result';

type RawPlane = { orientation?: string; semanticLabel?: string };

/**
 * One match loop on the table: place the arena, rip-cord launch against an AI top,
 * steer the fight by pulling bumps up and pressing dents into the floor, show the result.
 */
export class MatchSystem extends createSystem({
  planes: { required: [XRPlane] },
}) {
  private phase: Phase = 'placing';
  private settle = 0;
  private hands = new HandInput();
  private root = new Group();
  private arena = new Arena();
  private arenaView = new ArenaView(PEDESTAL);
  private wide = new Top(WIDE);
  private narrow = new Top(NARROW);
  private wideView = new TopView(WIDE_LOOK, WIDE);
  private narrowView = new TopView(NARROW_LOOK, NARROW);
  private launcher = new LauncherView();
  private sparks = new Sparks();
  private label = new Label();
  private round = 0;
  private wins = 0;
  private losses = 0;
  private elapsed = 0;
  private accumulator = 0;
  private resultTimer = 0;
  private time = 0;
  /** Which hand holds the cord, and pull bookkeeping. */
  private puller: Side | null = null;
  private maxPull = 0;
  private peakSpeed = 0;
  private lastPull = 0;
  /** Per-hand bump being held: arena-local anchor and the pinch height when grabbed. */
  private shaping: Record<Side, { x: number; z: number; y0: number } | null> = { left: null, right: null };
  private clashes = 0;
  private head = new Vector3();
  private fwd = new Vector3();
  private p = new Vector3();
  private local = new Vector3();
  private handleWorld = new Vector3();
  private pullEnd = new Vector3();

  init() {
    this.root.name = 'spinsmith-arena';
    this.root.visible = false;
    this.wideView.root.name = 'top-wide';
    this.narrowView.root.name = 'top-narrow';
    this.label.mesh.position.set(0, 0.17, -0.03);
    this.launcher.root.position.copy(LAUNCHER);
    this.root.add(
      this.arenaView.root,
      this.wideView.root,
      this.narrowView.root,
      this.wideView.shadowMesh,
      this.narrowView.shadowMesh,
      this.launcher.root,
      this.sparks.points,
      this.label.mesh,
    );
    this.world.createTransformEntity(this.root);
    // The cord spans from the launcher to the hand in world space, so it is not parented to the arena.
    this.world.createTransformEntity(this.launcher.cord);

    if (import.meta.env.DEV) {
      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'KeyR') this.toReady();
        if (e.code === 'KeyP') this.phase = 'placing';
        if (e.code === 'KeyL' && (this.phase === 'ready' || this.phase === 'result')) this.launch(0.8, 0);
      };
      window.addEventListener('keydown', onKey);
      this.cleanupFuncs.push(() => window.removeEventListener('keydown', onKey));
    }
  }

  update(delta: number) {
    const xr = this.world.renderer.xr;
    const frame = xr.getFrame();
    const ref = xr.getReferenceSpace();
    const session = xr.getSession();
    if (!frame || !ref || !session || this.world.visibilityState.peek() === VisibilityState.NonImmersive) return;
    const dt = Math.min(delta, 0.05);
    this.time += dt;
    this.hands.update(frame, ref, session, this.player);

    switch (this.phase) {
      case 'placing':
        this.settle += dt;
        if (this.settle >= SETTLE) this.place();
        return;
      case 'ready':
      case 'result':
        if (this.phase === 'result') {
          this.resultTimer -= dt;
          if (this.resultTimer <= 0) this.toReady();
        }
        this.updateLauncherGrab();
        break;
      case 'pulling':
        this.updatePull(dt);
        break;
      case 'fight':
        this.updateShaping();
        this.updateFight(dt);
        break;
    }
    this.arenaView.sync(this.arena);
    this.wideView.sync(this.wide, this.arena, this.time);
    this.narrowView.sync(this.narrow, this.arena, this.time);
    this.sparks.update(dt);
  }

  /** Player's top this round (alternates so both shapes get played). */
  private get mine() {
    return this.round % 2 === 0 ? this.wide : this.narrow;
  }

  private get theirs() {
    return this.round % 2 === 0 ? this.narrow : this.wide;
  }

  private place() {
    const head = this.player.head;
    head.getWorldPosition(this.head);
    head.getWorldDirection(this.fwd);
    // getWorldDirection returns +Z of the object; the camera looks down -Z.
    this.fwd.negate().setY(0);
    if (this.fwd.lengthSq() < 1e-6) this.fwd.set(0, 0, -1);
    this.fwd.normalize();
    const center = this.p.copy(this.head).addScaledVector(this.fwd, REACH);
    const table = this.findTable();
    center.y = table !== null ? table + PEDESTAL : this.head.y - TRAY_DROP;
    this.root.position.copy(center);
    // Local +Z points back at the player.
    this.root.rotation.set(0, Math.atan2(this.head.x - center.x, this.head.z - center.z), 0);
    this.root.visible = true;
    console.log(`[MATCH] arena on ${table !== null ? 'table' : 'tray'} at ${center.toArray().map((v) => v.toFixed(2)).join(',')}`);
    this.phase = 'ready';
    this.toReady();
  }

  /** Height of the nearest table/desk plane within reach, or null. */
  private findTable(): number | null {
    let best: number | null = null;
    let bestDist = TABLE_MAX_DIST;
    for (const e of this.queries.planes.entities) {
      const plane = e.getValue(XRPlane, '_plane') as RawPlane | undefined;
      if (plane?.orientation !== 'horizontal' || !/table|desk/.test(plane.semanticLabel ?? '')) continue;
      e.object3D!.getWorldPosition(this.local);
      if (this.local.y < TABLE_MIN_H || this.local.y > TABLE_MAX_H) continue;
      const d = Math.hypot(this.local.x - this.head.x, this.local.z - this.head.z);
      if (d < bestDist) {
        bestDist = d;
        best = this.local.y;
      }
    }
    return best;
  }

  private toReady() {
    if (this.phase === 'placing') return;
    this.phase = 'ready';
    this.arena.clear();
    // Both tops wait upright at their spawn points.
    this.mine.launch(0, SPAWN, 0, 0, 1, 1);
    this.theirs.launch(0, -SPAWN, 0, 0, 1, -1);
    this.puller = null;
    this.launcher.setCord(null);
    this.label.set(`Round ${this.round + 1}  ·  ${this.wins} - ${this.losses}\nPinch the gold ring, pull back, let go`);
  }

  private toLocal(world: Vector3) {
    return this.root.worldToLocal(this.local.copy(world));
  }

  /** In ready/result: a pinch near the handle starts pulling the cord. */
  private updateLauncherGrab() {
    this.root.localToWorld(this.handleWorld.copy(LAUNCHER));
    let near = false;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked) continue;
      const d = h.pinch.distanceTo(this.handleWorld);
      if (d < GRAB_RADIUS) near = true;
      if (import.meta.env.DEV && h.justPinched) {
        console.log(`[MATCH] ${side} pinch at ${h.pinch.toArray().map((v) => v.toFixed(3)).join(',')}, ${d.toFixed(3)} m from launcher`);
      }
      if (h.justPinched && d < GRAB_RADIUS) {
        if (this.phase === 'result') this.toReady();
        this.phase = 'pulling';
        this.puller = side;
        this.maxPull = 0;
        this.peakSpeed = 0;
        this.lastPull = 0;
        this.label.set('');
        return;
      }
    }
    this.launcher.highlight(near);
  }

  private updatePull(dt: number) {
    const h = this.hands[this.puller!];
    this.root.localToWorld(this.handleWorld.copy(LAUNCHER));
    // Measure only while the pinch holds: opening the fingers moves the pinch point and would fake a pull.
    if (h.pinching) {
      const dist = h.pinch.distanceTo(this.handleWorld);
      this.launcher.setCord(this.handleWorld, h.pinch);
      this.maxPull = Math.max(this.maxPull, dist);
      // Decaying peak so one jittery frame cannot fake a strong rip.
      const speed = (dist - this.lastPull) / Math.max(dt, 1e-3);
      this.peakSpeed = Math.max(this.peakSpeed * 0.9, speed);
      this.lastPull = dist;
      this.pullEnd.copy(h.pinch);
      if (h.tracked && dist < MAX_PULL) return;
    }

    this.launcher.setCord(null);
    if (this.maxPull < MIN_PULL) {
      // Too weak: nothing happens, the launcher is ready again.
      this.toReady();
      return;
    }
    const power = Math.min(1, 0.55 * Math.min(1, this.maxPull / FULL_PULL) + 0.45 * Math.min(1, this.peakSpeed / FULL_SPEED));
    // Slingshot: the top flies opposite to the horizontal pull, aimed into the arena.
    const pull = this.toLocal(this.pullEnd).sub(LAUNCHER);
    const aim = Math.hypot(pull.x, pull.z) < 0.02 ? 0 : Math.max(-MAX_AIM, Math.min(MAX_AIM, Math.atan2(-pull.x, pull.z)));
    this.launch(power, aim);
  }

  /** Launches both tops. aim: radians off straight-at-center for the player's top. */
  private launch(power: number, aim: number) {
    if (this.phase === 'result') this.toReady();
    const speed = LAUNCH_SPEED * (0.5 + 0.5 * power);
    this.mine.launch(0, SPAWN, Math.sin(aim) * speed, -Math.cos(aim) * speed, 0.55 + 0.45 * power, 1);
    const aiPower = 0.6 + Math.random() * 0.35;
    const aiAim = (Math.random() - 0.5) * 1.0;
    const aiSpeed = LAUNCH_SPEED * (0.5 + 0.5 * aiPower);
    this.theirs.launch(0, -SPAWN, Math.sin(aiAim) * aiSpeed, Math.cos(aiAim) * aiSpeed, 0.55 + 0.45 * aiPower, -1);
    this.phase = 'fight';
    this.elapsed = 0;
    this.accumulator = 0;
    this.clashes = 0;
    this.label.set('');
    console.log(`[MATCH] launch power ${power.toFixed(2)} aim ${aim.toFixed(2)} vs AI ${aiPower.toFixed(2)}`);
  }

  /** Pinch near the floor and lift to raise a bump; press a fingertip into the floor to dent it. */
  private updateShaping() {
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked) {
        this.shaping[side] = null;
        continue;
      }
      if (h.pinching) {
        const l = this.toLocal(h.pinch);
        let held = this.shaping[side];
        if (!held && h.justPinched && Math.hypot(l.x, l.z) < ARENA_RADIUS && Math.abs(l.y - this.arena.height(l.x, l.z)) < SHAPE_GRAB) {
          held = this.shaping[side] = { x: l.x, z: l.z, y0: l.y };
        }
        if (held) {
          const amplitude = Math.min(BUMP_MAX, Math.max(BUMP_MIN, 0.012 + (l.y - held.y0)));
          this.arena.stamp(held.x, held.z, amplitude);
        }
        continue;
      }
      this.shaping[side] = null;
      this.pressDent(h);
    }
  }

  private pressDent(h: HandState) {
    const l = this.toLocal(h.index);
    if (Math.hypot(l.x, l.z) > ARENA_RADIUS) return;
    const depth = this.arena.height(l.x, l.z) - l.y;
    if (depth > 0.004) this.arena.stamp(l.x, l.z, -Math.min(DENT_MAX, depth));
  }

  private updateFight(dt: number) {
    this.accumulator += dt;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 8) {
      this.accumulator -= STEP;
      steps++;
      this.elapsed += STEP;
      this.arena.relax(STEP);
      const clash = step(this.arena, this.mine, this.theirs);
      if (clash) {
        this.clashes++;
        this.sparks.burst(clash.x, this.arena.height(clash.x, clash.z), clash.z, clash.strength);
      }
      const v = verdict(this.mine, this.theirs, this.elapsed);
      if (v !== 0) {
        this.finish(v);
        return;
      }
    }
  }

  private finish(v: -1 | 1 | 2) {
    this.phase = 'result';
    this.resultTimer = RESULT_TIME;
    const how = (t: Top) => (t.state === 'out' ? 'knocked out' : t.state === 'toppled' ? 'toppled' : 'outspun');
    let text: string;
    if (v === 1) {
      this.wins++;
      text = `You win!\nTheir top ${how(this.theirs)}`;
    } else if (v === -1) {
      this.losses++;
      text = `You lose\nYour top ${how(this.mine)}`;
    } else {
      text = 'Draw\nReplay';
    }
    this.label.set(text);
    console.log(`[MATCH] ${text.replace('\n', ' - ')} after ${this.elapsed.toFixed(1)} s, ${this.clashes} clash steps`);
    if (v !== 2) this.round++;
  }
}
