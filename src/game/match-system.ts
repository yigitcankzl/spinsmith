import { AdditiveBlending, CircleGeometry, createSystem, Group, Matrix4, Mesh, MeshBasicMaterial, TorusGeometry, Vector3, VisibilityState, XRPlane } from '@iwsdk/core';
import { CordTone, playBurst, playClash, playDash, playLaunch, playOver, playPocket, playResult, playTopple, SpinHum } from './audio.js';
import { HandInput, HandState, Side } from './hands.js';
import { Arena, ARENA_RADIUS, finishPoints, LAUNCH_SPEED, LAUNCH_TILT, step, STEP, Top, TopSpec, TYPES, verdict } from './sim.js';
import { ANVIL_SHAPE, ArenaView, Cord, Label, NEEDLE_SHAPE, OPPONENT_COLOR, PLAYER_COLOR, Sparks, STRIKER_SHAPE, TopView } from './visuals.js';

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
/** Cord pull that counts as a full-power rip (m) and full-power pull speed (m/s). */
const FULL_PULL = 0.22;
const FULL_SPEED = 1.0;
/** Pulls shorter than this count as no pull (hand jitter). */
const MIN_PULL = 0.05;
/** Below this power nothing launches (a quick tap). */
const MIN_POWER = 0.15;
/** Pinches farther than this from the arena are ignored (a hand outside the play space). */
const LAUNCH_REACH = 1.0;
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
/** Points needed to win a match (pocket and over finishes score 2, spin finishes 1). */
const MATCH_POINTS = 4;
/** Launch power at or above this is a perfect rip: extra starting spin. */
const PERFECT = 0.92;
const PERFECT_SPIN = 1.1;
/** Far bumps grow at this rate (m/s) while the pinch is held. */
const RAY_BUMP_RATE = 0.05;

const SHAPES = [STRIKER_SHAPE, ANVIL_SHAPE, NEEDLE_SHAPE];
const TYPE_ROLE = ['attack', 'defense', 'stamina'];

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
  /** The player's top and the opponent's; their type (spec) changes between rounds. */
  private mine = new Top(TYPES[0]);
  private theirs = new Top(TYPES[1]);
  private tops = [this.mine, this.theirs];
  private hums = [new SpinHum(230), new SpinHum(190)];
  private cordTone = new CordTone();
  /** Seconds since the last clash sound, to keep grinding contacts from machine-gunning. */
  private sinceClashSound = 1;
  /** Types for the coming round are chosen once per round, not on every reset. */
  private typesPicked = false;
  /** One view per type for each side: shape from the type, color from the owner. */
  private myViews = TYPES.map((t, i) => new TopView(SHAPES[i], t, PLAYER_COLOR));
  private theirViews = TYPES.map((t, i) => new TopView(SHAPES[i], t, OPPONENT_COLOR));
  private cord = new Cord();
  private sparks = new Sparks();
  private label = new Label();
  private round = 0;
  /** Match score: first to MATCH_POINTS wins the match. */
  private myPoints = 0;
  private theirPoints = 0;
  private elapsed = 0;
  private accumulator = 0;
  private resultTimer = 0;
  private time = 0;
  private frameDt = 0;
  /** Which hand holds the cord, and pull bookkeeping. */
  private puller: Side | null = null;
  private maxPull = 0;
  private peakSpeed = 0;
  private lastPull = 0;
  /** Per-hand bump being held: arena-local anchor and the pinch height when grabbed. */
  private shaping: Record<Side, { x: number; z: number; y0: number; t: number; far: boolean } | null> = { left: null, right: null };
  private clashes = 0;
  private head = new Vector3();
  private fwd = new Vector3();
  private p = new Vector3();
  private local = new Vector3();
  private pullStart = new Vector3();
  private cordStart = new Vector3();
  /** Seconds left before a transient fight message clears. */
  private labelTimer = 0;
  private pullEnd = new Vector3();
  /** Dev-only keyboard + gaze controls so the prototype can be played in the emulator without pinching. */
  private keys = new Set<string>();
  private charge = 0;
  private gazeHit = { ok: false, x: 0, z: 0 };
  private gazeDir = new Vector3();
  private rootInverse = new Matrix4();
  private rayHit = { ok: false, x: 0, z: 0 };
  private rayLocalO = new Vector3();
  private rayLocalD = new Vector3();
  private chargeRing = new Mesh(
    new TorusGeometry(0.036, 0.003, 8, 48).rotateX(Math.PI / 2),
    new MeshBasicMaterial({ color: 0xff8a2a, transparent: true, blending: AdditiveBlending, depthWrite: false }),
  );
  private reticle = new Mesh(
    new CircleGeometry(0.006, 20).rotateX(-Math.PI / 2),
    new MeshBasicMaterial({ color: 0x3fd0ff, transparent: true, opacity: 0.85, depthTest: false }),
  );

  init() {
    this.root.name = 'spinsmith-arena';
    this.reticle.visible = false;
    this.root.visible = false;
    TYPES.forEach((t, i) => {
      this.myViews[i].root.name = `my-${t.name}`;
      this.theirViews[i].root.name = `their-${t.name}`;
    });
    this.label.mesh.position.set(0, 0.17, -0.03);
    this.reticle.renderOrder = 10;
    this.chargeRing.visible = false;
    this.root.add(
      this.chargeRing,
      this.reticle,
      this.arenaView.root,
      ...[...this.myViews, ...this.theirViews].flatMap((v) => [v.root, v.shadowMesh, v.debris]),
      this.sparks.points,
      this.label.mesh,
    );
    this.world.createTransformEntity(this.root);
    // The cord spans from the launcher to the hand in world space, so it is not parented to the arena.
    this.world.createTransformEntity(this.cord.line);

    if (import.meta.env.DEV) {
      const onKey = (e: KeyboardEvent) => {
        if (e.repeat) return;
        this.keys.add(e.code);
        if (e.code === 'KeyR') this.toReady();
        if (e.code === 'KeyP') this.phase = 'placing';
        if (e.code === 'KeyL' && (this.phase === 'ready' || this.phase === 'result')) this.launch(0.8, 0);
        if (e.code === 'KeyK' && this.phase === 'fight') {
          // Burst the opponent now, to see the burst finish.
          this.theirs.state = 'out';
          this.theirs.finish = 'burst';
        }
      };
      const onKeyUp = (e: KeyboardEvent) => {
        this.keys.delete(e.code);
        if (e.code === 'Space' && this.charge > 0 && (this.phase === 'ready' || this.phase === 'result')) {
          // Aim toward where the player is looking, like the slingshot aim.
          const aim = this.gazeHit.ok ? Math.max(-MAX_AIM, Math.min(MAX_AIM, Math.atan2(this.gazeHit.x, SPAWN - this.gazeHit.z))) : 0;
          this.launch(this.charge, aim);
        }
        if (e.code === 'Space') this.charge = 0;
      };
      window.addEventListener('keydown', onKey);
      window.addEventListener('keyup', onKeyUp);
      this.cleanupFuncs.push(
        () => window.removeEventListener('keydown', onKey),
        () => window.removeEventListener('keyup', onKeyUp),
      );

    }
  }

  update(delta: number) {
    const xr = this.world.renderer.xr;
    const frame = xr.getFrame();
    const ref = xr.getReferenceSpace();
    const session = xr.getSession();
    if (!frame || !ref || !session || this.world.visibilityState.peek() === VisibilityState.NonImmersive) return;
    const dt = Math.min(delta, 0.05);
    this.frameDt = dt;
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
        this.updateReadyPinch();
        break;
      case 'pulling':
        this.updatePull(dt);
        break;
      case 'fight':
        if (this.labelTimer > 0 && (this.labelTimer -= dt) <= 0) this.label.set('');
        this.updateShaping();
        this.updateFight(dt);
        break;
    }
    if (import.meta.env.DEV) this.devControls(dt);
    this.updateReticle();
    this.arenaView.sync(this.arena);
    const live = this.phase === 'fight';
    this.tops.forEach((t, i) => this.hums[i].update(live && t.alive ? Math.max(0, t.spin) : 0, Math.hypot(t.vx, t.vz), t.wobble, this.time));
    this.sinceClashSound += dt;
    this.syncViews(this.myViews, this.mine, dt);
    this.syncViews(this.theirViews, this.theirs, dt);
    this.sparks.update(dt);
    this.arenaView.update(dt);
  }

  /** Player's top this round (alternates so both shapes get played). */
  /** Shows the view for the top's current type and hides the others. */
  private syncViews(views: TopView[], top: Top, dt: number) {
    views.forEach((v, i) => (TYPES[i] === top.spec ? v.sync(top, this.arena, this.time, dt) : v.hide()));
  }

  /**
   * Picks this round's types: the player cycles through all three so each gets played,
   * the opponent is random.
   */
  private pickTypes() {
    this.mine.spec = TYPES[this.round % TYPES.length];
    this.theirs.spec = TYPES[Math.floor(Math.random() * TYPES.length)];
  }

  private describe(t: TopSpec) {
    return `${t.name} (${TYPE_ROLE[TYPES.indexOf(t)]})`;
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
    if (!this.typesPicked) this.pickTypes();
    this.typesPicked = true;
    this.mine.launch(0, SPAWN, 0, 0, 1, 1);
    this.theirs.launch(0, -SPAWN, 0, 0, 1, -1);
    this.puller = null;
    this.cord.set(null);
    this.label.set(`${this.describe(this.mine.spec)} vs ${this.describe(this.theirs.spec)}\nYou ${this.myPoints} - ${this.theirPoints} · first to ${MATCH_POINTS} · pinch, pull, let go`);
  }

  private toLocal(world: Vector3) {
    return this.root.worldToLocal(this.local.copy(world));
  }

  /**
   * In ready/result: a pinch anywhere starts the pull. No target to hit. If both hands pinch in
   * the same frame (the emulator's click does), the hand closer to the arena wins.
   */
  private updateReadyPinch() {
    let pick: Side | null = null;
    let best = Infinity;
    for (const side of ['left', 'right'] as const) {
      const h = this.hands[side];
      if (!h.tracked || !h.justPinched) continue;
      const d = h.pinch.distanceTo(this.root.position);
      if (d < best && d < LAUNCH_REACH) {
        best = d;
        pick = side;
      }
    }
    if (!pick) return;
    const h = this.hands[pick];
    if (this.phase === 'result') this.toReady();
    this.phase = 'pulling';
    this.puller = pick;
    this.pullStart.copy(h.pinch);
    this.maxPull = 0;
    this.peakSpeed = 0;
    this.lastPull = 0;
  }

  /**
   * The cord runs from your top to your pinch; rip it back and let go. Power comes only from the
   * motion: how far the hand travelled and how fast it was still moving at release, so a rip that
   * stops before letting go loses power. A sideways rip aims like a slingshot, otherwise the launch
   * goes where the hand points on the floor.
   */
  private updatePull(dt: number) {
    const h = this.hands[this.puller!];
    // Measure only while the pinch holds: opening the fingers moves the pinch point and would fake a pull.
    if (h.pinching && h.tracked) {
      const dist = h.pinch.distanceTo(this.pullStart);
      this.maxPull = Math.max(this.maxPull, dist);
      // Decays within ~0.1 s, so only a rip that is still moving at release keeps its speed.
      const speed = (dist - this.lastPull) / Math.max(dt, 1e-3);
      this.peakSpeed = Math.max(this.peakSpeed * 0.9, speed);
      this.lastPull = dist;
      this.pullEnd.copy(h.pinch);
      const power = this.pullPower();
      this.showCharge(power, dt);
      this.label.set(power >= PERFECT ? `RIP IT! ${Math.round(power * 100)}%` : power > 0 ? `${Math.round(power * 100)}%` : 'Pull back and let go');
      if (dist < MAX_PULL) return;
    }

    this.cord.set(null);
    this.cordTone.update(null);
    this.chargeRing.visible = false;
    const power = this.pullPower();
    if (power < MIN_POWER) {
      // A tap or a hold without a pull does nothing; the top is ready again.
      this.toReady();
      return;
    }
    const end = this.p.copy(this.toLocal(this.pullEnd));
    const pull = end.sub(this.toLocal(this.pullStart));
    let aim = 0;
    if (Math.hypot(pull.x, pull.z) >= 0.03) aim = Math.atan2(-pull.x, pull.z);
    else if (this.rayFloor(h)) aim = Math.atan2(this.rayHit.x, SPAWN - this.rayHit.z);
    this.launch(power, Math.max(-MAX_AIM, Math.min(MAX_AIM, aim)));
  }

  /** Rip power from the motion alone: distance travelled and speed at the moment of release. */
  private pullPower() {
    if (this.maxPull < MIN_PULL) return 0;
    return Math.min(1, 0.4 * Math.min(1, this.maxPull / FULL_PULL) + 0.6 * Math.min(1, this.peakSpeed / FULL_SPEED));
  }

  /** While ripping: the top spins up, the cord heats from white to orange, a glow ring grows under it. */
  private showCharge(power: number, dt: number) {
    const y = this.arena.height(this.mine.x, this.mine.z);
    this.root.localToWorld(this.cordStart.set(this.mine.x, y + 0.03, this.mine.z));
    this.cord.set(this.cordStart, this.hands[this.puller!].pinch, power, dt);
    this.cordTone.update(power);
    this.mine.angle += (6 + 70 * power) * dt;
    this.chargeRing.visible = power > 0;
    this.chargeRing.position.set(this.mine.x, y + 0.001, this.mine.z);
    this.chargeRing.scale.setScalar(0.7 + 0.9 * power);
    (this.chargeRing.material as MeshBasicMaterial).opacity = 0.25 + 0.75 * power;
  }

  /** Launches both tops. aim: radians off straight-at-center for the player's top. */
  private launch(power: number, aim: number) {
    if (this.phase === 'result') this.toReady();
    const speed = LAUNCH_SPEED * (0.5 + 0.5 * power);
    const perfect = power >= PERFECT;
    playLaunch(power, perfect);
    const dir = aim + LAUNCH_TILT;
    this.mine.launch(0, SPAWN, Math.sin(dir) * speed, -Math.cos(dir) * speed, perfect ? PERFECT_SPIN : 0.55 + 0.45 * power, 1);
    this.sparks.burst(0, this.arena.height(0, SPAWN), SPAWN, perfect ? 1 : power * 0.6);
    const aiPower = 0.6 + Math.random() * 0.35;
    const aiAim = (Math.random() - 0.5) * 1.0;
    const aiSpeed = LAUNCH_SPEED * (0.5 + 0.5 * aiPower);
    const aiDir = aiAim + LAUNCH_TILT;
    this.theirs.launch(0, -SPAWN, -Math.sin(aiDir) * aiSpeed, Math.cos(aiDir) * aiSpeed, 0.55 + 0.45 * aiPower, -1);
    this.phase = 'fight';
    this.elapsed = 0;
    this.accumulator = 0;
    this.clashes = 0;
    this.label.set(perfect ? 'Perfect rip!\nExtra spin' : '');
    this.labelTimer = perfect ? 1.5 : 0;
    console.log(`[MATCH] launch power ${power.toFixed(2)}${perfect ? ' PERFECT' : ''} aim ${aim.toFixed(2)} vs AI ${aiPower.toFixed(2)}`);
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
        if (!held && h.justPinched) {
          if (Math.hypot(l.x, l.z) < ARENA_RADIUS && Math.abs(l.y - this.arena.height(l.x, l.z)) < SHAPE_GRAB) {
            held = this.shaping[side] = { x: l.x, z: l.z, y0: l.y, t: 0, far: false };
          } else if (this.rayFloor(h)) {
            // Far bump: point at the floor and pinch; it rises while the pinch is held.
            held = this.shaping[side] = { x: this.rayHit.x, z: this.rayHit.z, y0: l.y, t: 0, far: true };
          }
        }
        if (held) {
          held.t += this.frameDt;
          const lift = held.far ? held.t * RAY_BUMP_RATE : l.y - held.y0;
          const amplitude = Math.min(BUMP_MAX, Math.max(BUMP_MIN, 0.012 + lift));
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
        if (this.sinceClashSound > 0.06) {
          playClash(clash.strength);
          this.sinceClashSound = 0;
        }
      }
      for (const t of this.tops) {
        if (t.sinceDash !== 0) continue;
        this.arenaView.flashRail(t.x, t.z);
        playDash();
        this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 0.8);
      }
      const v = verdict(this.mine, this.theirs, this.elapsed);
      if (v !== 0) {
        for (const t of this.tops) if (t.finish === 'burst') this.sparks.burst(t.x, this.arena.height(t.x, t.z), t.z, 1);
        this.finish(v);
        return;
      }
    }
  }

  private finish(v: -1 | 1 | 2) {
    this.phase = 'result';
    this.resultTimer = RESULT_TIME;
    const name = (t: Top) =>
      t.finish === 'pocket' ? 'Pocket finish' : t.finish === 'over' ? 'Over finish' : t.finish === 'burst' ? 'BURST' : 'Spin finish';
    for (const t of this.tops) {
      if (t.finish === 'pocket') playPocket();
      else if (t.finish === 'over') playOver();
      else if (t.finish === 'burst') playBurst();
      else if (t.finish === 'spin') playTopple();
    }
    if (v !== 2) playResult(v === 1);
    let text: string;
    if (v === 2) {
      text = 'Draw\nReplay the round';
    } else {
      const loser = v === 1 ? this.theirs : this.mine;
      const points = finishPoints(loser);
      if (v === 1) this.myPoints += points;
      else this.theirPoints += points;
      const score = `You ${this.myPoints} - ${this.theirPoints}`;
      if (this.myPoints >= MATCH_POINTS || this.theirPoints >= MATCH_POINTS) {
        text = `${this.myPoints > this.theirPoints ? 'You win the match!' : 'You lose the match'}\n${score}`;
        this.myPoints = 0;
        this.theirPoints = 0;
      } else {
        text = `${name(loser)}! ${v === 1 ? 'You' : 'They'} +${points}\n${score}`;
      }
    }
    this.label.set(text);
    console.log(`[MATCH] ${text.replace('\n', ' - ')} after ${this.elapsed.toFixed(1)} s, ${this.clashes} clash steps`);
    if (v !== 2) {
      this.round++;
      this.typesPicked = false;
    }
  }

  /** A small dot where the pointing hand's ray (or, in dev, the gaze) meets the floor. */
  private updateReticle() {
    const h = this.hands.right.hasRay ? this.hands.right : this.hands.left;
    const hit = this.rayFloor(h) ? this.rayHit : this.gazeHit;
    this.reticle.visible = hit.ok;
    if (hit.ok) this.reticle.position.set(hit.x, this.arena.height(hit.x, hit.z) + 0.002, hit.z);
  }

  /**
   * Dev only: Space charges and launches toward the gaze, B raises a bump and N presses a dent
   * where the head is looking. Lets the prototype be played in the emulator's mouse-look mode.
   */
  private devControls(dt: number) {
    this.gaze();
    if (this.keys.has('Space') && (this.phase === 'ready' || this.phase === 'result')) {
      this.charge = Math.min(1, this.charge + dt / 1.2);
      this.label.set(`Power ${Math.round(this.charge * 100)}%\nRelease Space to launch`);
    }
    if (this.phase !== 'fight' || !this.gazeHit.ok) return;
    const { x, z } = this.gazeHit;
    if (this.keys.has('KeyB')) this.arena.stamp(x, z, 0.03);
    if (this.keys.has('KeyN')) this.arena.stamp(x, z, -0.025);
  }

  /** Intersects the head's view ray with the arena floor (arena-local). */
  private gaze() {
    const head = this.player.head;
    head.getWorldPosition(this.p);
    head.getWorldDirection(this.gazeDir).negate();
    this.floorHit(this.p, this.gazeDir, this.gazeHit);
  }

  /** Where the hand's pointing ray meets the arena floor (into this.rayHit). */
  private rayFloor(h: HandState): boolean {
    if (!h.hasRay) return (this.rayHit.ok = false);
    return this.floorHit(h.rayOrigin, h.rayDir, this.rayHit);
  }

  /** Marches a world-space ray to the arena floor; writes an arena-local hit inside the rim. */
  private floorHit(origin: Vector3, dir: Vector3, out: { ok: boolean; x: number; z: number }): boolean {
    out.ok = false;
    const o = this.root.worldToLocal(this.rayLocalO.copy(origin));
    const d = this.rayLocalD.copy(dir).transformDirection(this.rootInverse.copy(this.root.matrixWorld).invert());
    for (let t = 0.02; t < 2; t += 0.004) {
      const x = o.x + d.x * t;
      const y = o.y + d.y * t;
      const z = o.z + d.z * t;
      if (y <= this.arena.height(x, z)) {
        if (Math.hypot(x, z) <= ARENA_RADIUS) Object.assign(out, { ok: true, x, z });
        return out.ok;
      }
    }
    return false;
  }
}
