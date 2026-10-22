import { AdditiveBlending, BoxGeometry, BufferGeometry, DoubleSide, Vector2, Float32BufferAttribute, CylinderGeometry, Group, Mesh, MeshBasicMaterial, OctahedronGeometry, RingGeometry, TorusGeometry, Vector3 } from '@iwsdk/core';
import { playLand, playPick, playThock, playDash, playTick } from './audio.js';
import { Side } from './hands.js';
import { maxRim, normRadius, rimRadius } from './layout.js';
import { EMBER_POST_TIME, palmGust, palmGustCrosses, TUNING } from './sim.js';
import type { CrossguardRail } from './sim.js';
import { CALL } from './calls.js';
import { FirstFiveState } from '../components.js';
import { mayCommit, mayListen } from './gesture-owner.js';
import { HAND_LOSS_GRACE } from './match-constants.js';
import { VERB_TINT } from './visuals.js';
import type { MatchSystem } from './match-system.js';

/** An open palm must sweep this fast above the bowl before it becomes a deliberate forge gust. */
const PALM_GUST_SPEED = 0.34;
/** A palm must settle in the bowl before its next motion can count as a deliberate gust. */
const PALM_GUST_ARM_TIME = 0.12;
const PALM_GUST_ARM_SPEED = 0.16;
/** A gust is a committed move, not a free per-frame force; this keeps it tactical and readable. */
const PALM_GUST_COOLDOWN = 1.8;
/** Long enough to survive a slow emulator frame and still leave the hand's direction readable. */
const PALM_GUST_FX_TIME = 0.65;

/** Crossguard (two flat palms on the rim), Forge Gust (an open-palm sweep) and Ember (the hot rivet caught and planted as a bumper): the match's free-hand verbs, their state and their meshes. */
/** Fastest a palm may move (real m/s) and still count as set down for a Crossguard rail, and how long it must stay so. */
const RAIL_STILL = 0.29;
const RAIL_DWELL = 0.2;

export class HandVerbs {
  constructor(private readonly m: MatchSystem) {}

  /** Open-palm horizontal sweep: short state for readable feedback and a per-hand motion sample. */
  palmGustTime = 0;
  palmGustCooldown = 0;
  palmGustSide: Side | null = null;
  palmGustDirection = new Vector2();
  private palmGustLength = 0;
  palmGustHits = 0;
  private palmGustLast: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  private palmGustOrigin: Record<Side, Vector3> = { left: new Vector3(), right: new Vector3() };
  palmGustAge: Record<Side, number> = { left: 0, right: 0 };
  palmGustSampled: Record<Side, boolean> = { left: false, right: false };
  palmGustCount = 0;
  /** Where each low, flat open hand rests on the rim (radians); two of them make a Crossguard. */
  palmRailAngles: Record<Side, number | null> = { left: null, right: null };
  private palmRailGrace: Record<Side, number> = { left: 0, right: 0 };
  /** After an Arena Forge release, a hand must leave the rim once before it counts as a rail post. */
  railNeedsClear: Record<Side, boolean> = { left: false, right: false };
  /** Last frame's palm position per hand (w = 0 until seen), for the rail's stillness test. */
  private railPrev: Record<Side, { x: number; z: number; w: number; speed: number; still: number }> = {
    left: { x: 0, z: 0, w: 0, speed: Infinity, still: 0 },
    right: { x: 0, z: 0, w: 0, speed: Infinity, still: 0 },
  };
  /** Two flat palms on the rim join into one finite, one-hit rail across the bowl. */
  crossguardActive = false;
  crossguardConsumed = false;
  /** A paid rail stays live until then (arena time): the rival can be slung across it once, and it refunds its charge once (sim.ts crossguardLive). */
  crossguardLiveUntil = -9;
  crossguardRail: CrossguardRail = { slung: false, refunded: false };
  crossguardHits = 0;
  crossguardBreak = 0;
  crossguardA = new Vector3();
  crossguardB = new Vector3();
  crossguardBeam = Object.assign(
    new Mesh(new BoxGeometry(1, 0.008, 0.006), new MeshBasicMaterial({ color: 0xffa12d, transparent: true, opacity: 0.82, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
    { visible: false },
  );
  crossguardGlow = Object.assign(
    new Mesh(new BoxGeometry(1, 0.016, 0.014), new MeshBasicMaterial({ color: 0xff5a0a, transparent: true, opacity: 0.22, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
    { visible: false },
  );
  crossguardPosts = (['left', 'right'] as const).map(() => Object.assign(
    new Mesh(new CylinderGeometry(0.01, 0.014, 0.032, 12), new MeshBasicMaterial({ color: 0xffc267, transparent: true, opacity: 0.86, blending: AdditiveBlending, depthWrite: false, toneMapped: false })),
    { visible: false },
  ));
  /** A hard clash throws one catchable rivet toward the player; carrying it back authors a bumper. */
  emberState: 0 | 1 | 2 | 3 = 0;
  private emberSpawned = false;
  emberHeld: Side | null = null;
  private emberFlight = 0;
  private emberLost = 0;
  private emberFrom = new Vector3();
  emberHome = new Vector3();
  private emberHandLocal = new Vector3();
  private emberWorld = new Vector3();
  emberBumperAt = new Vector3();
  emberPostUntil = 0;
  emberGrabGap = -1;
  emberPickup = (() => {
    const group = Object.assign(new Group(), { visible: false });
    const core = new Mesh(new OctahedronGeometry(0.01, 0), new MeshBasicMaterial({ color: 0xffd38a, toneMapped: false }));
    const halo = new Mesh(new TorusGeometry(0.017, 0.0025, 6, 24), new MeshBasicMaterial({ color: 0xff5a0a, transparent: true, opacity: 0.75, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    halo.name = 'EmberCatchHalo';
    core.renderOrder = halo.renderOrder = 10;
    group.add(core, halo);
    return group;
  })();
  emberBumperFx = (() => {
    const group = Object.assign(new Group(), { visible: false });
    const rivet = new Mesh(new CylinderGeometry(0.012, 0.017, 0.024, 12), new MeshBasicMaterial({ color: 0xb96822, toneMapped: false }));
    const ring = new Mesh(new RingGeometry(0.018, 0.025, 28).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.72, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
    ring.position.y = -0.01;
    rivet.renderOrder = ring.renderOrder = 9;
    group.add(rivet, ring);
    return group;
  })();
  /** One draw call: two true-width rails plus three chevrons show the exact gust corridor. */
  palmGustFx = (() => {
    const vertices: number[] = [];
    const bar = (ax: number, az: number, bx: number, bz: number, half: number) => {
      const dx = bx - ax;
      const dz = bz - az;
      const d = Math.hypot(dx, dz) || 1;
      const nx = (-dz / d) * half;
      const nz = (dx / d) * half;
      vertices.push(
        ax + nx, 0, az + nz, ax - nx, 0, az - nz, bx + nx, 0, bz + nz,
        bx + nx, 0, bz + nz, ax - nx, 0, az - nz, bx - nx, 0, bz - nz,
      );
    };
    bar(0, -0.065, 1, -0.065, 0.003);
    bar(0, 0.065, 1, 0.065, 0.003);
    for (const x of [0.28, 0.52, 0.76]) {
      bar(x - 0.035, -0.026, x + 0.018, 0, 0.004);
      bar(x - 0.035, 0.026, x + 0.018, 0, 0.004);
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(vertices, 3));
    return Object.assign(
      new Mesh(geometry, new MeshBasicMaterial({ color: 0xffad42, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false })),
      { visible: false },
    );
  })();
  /** A short rim pulse shows where the hand-authored force leaves the bowl. */
  palmGustRim = Object.assign(
    new Mesh(
      new RingGeometry(0.164, 0.172, 32, 1, -0.32, 0.64).rotateX(-Math.PI / 2),
      new MeshBasicMaterial({ color: 0xff7a20, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false }),
    ),
    { visible: false },
  );

  clearCrossguard() {
    this.palmRailAngles.left = this.palmRailAngles.right = null;
    this.palmRailGrace.left = this.palmRailGrace.right = 0;
    this.crossguardActive = false;
    this.crossguardConsumed = false;
    this.crossguardLiveUntil = -9;
    this.crossguardRail = { slung: false, refunded: false };
    this.crossguardBreak = 0;
    this.crossguardBeam.visible = this.crossguardGlow.visible = false;
    for (const post of this.crossguardPosts) post.visible = false;
    this.m.rootEntity?.setValue(FirstFiveState, 'crossguardActive', false);
  }

  setEmberState(state: 0 | 1 | 2 | 3) {
    this.emberState = state;
    this.m.rootEntity?.setValue(FirstFiveState, 'emberState', state);
  }

  resetEmber() {
    this.emberSpawned = false;
    this.emberHeld = null;
    this.emberFlight = 0;
    this.emberLost = 0;
    this.setEmberState(0);
    this.emberPickup.visible = this.emberBumperFx.visible = false;
  }

  /** The first hard clash throws a single earned rivet into reach instead of spawning random loot. */
  spawnEmber(x: number, z: number) {
    if (this.emberSpawned || this.emberState !== 0 || !this.m.taught('ember')) return;
    this.emberSpawned = true;
    this.emberFlight = 0;
    this.emberFrom.set(x, this.m.arena.height(x, z) + 0.025, z);
    const radius = maxRim(this.m.arena.layout);
    this.emberHome.set(Math.max(-0.08, Math.min(0.08, x)), this.m.arena.floorHeight(1) + 0.035, radius + 0.025);
    this.emberPickup.position.copy(this.emberFrom);
    this.emberPickup.visible = !this.m.photo;
    this.setEmberState(1);
    this.m.call('HOT RIVET!\nPINCH IT · PLANT IT IN THE BOWL', CALL.tactic, 1.7);
  }

  /** Catch the hot rivet, carry it through space, and release against the floor to forge a bumper. */
  updateEmber(dt: number) {
    if (this.emberState === 0) return;
    if (this.emberState === 1 && this.emberFlight < 0.65) {
      this.emberFlight = Math.min(0.65, this.emberFlight + dt);
      const t = this.emberFlight / 0.65;
      this.emberPickup.position.lerpVectors(this.emberFrom, this.emberHome, t);
      this.emberPickup.position.y += Math.sin(t * Math.PI) * 0.07;
      this.emberPickup.rotation.x += dt * 8;
      this.emberPickup.rotation.y += dt * 11;
      if (t < 1) return;
      playLand('table', this.emberHome.x, 0.45);
    }
    if (this.emberState === 1) {
      this.emberPickup.visible = !this.m.photo;
      this.emberPickup.rotation.z += dt * 2;
      const pulse = 1 + Math.sin(this.m.time * 8) * 0.12;
      this.emberPickup.scale.setScalar(pulse);
      this.emberPickup.updateWorldMatrix(true, true);
      this.emberPickup.getWorldPosition(this.emberWorld);
      for (const side of ['left', 'right'] as const) {
        const hand = this.m.hands[side];
        if (hand.tracked && hand.pinching) this.emberGrabGap = hand.pinchSmooth.distanceTo(this.emberWorld);
        // The waiting rivet is outside the bowl, so this Quest/IWER-tolerant catch volume cannot
        // steal a ramp or cup pinch. Contact while already pinching also works, so one low-fps
        // justPinched frame can never make the small airborne pickup feel intangible.
        if (!hand.tracked || !hand.pinching || hand.pinchSmooth.distanceTo(this.emberWorld) > 0.1) continue;
        this.emberHeld = side;
        this.emberLost = 0;
        this.setEmberState(2);
        this.m.label.set('RIVET CAUGHT\nPRESS IT INTO THE ARENA');
        this.m.labelTimer = 1.2;
        playPick();
        break;
      }
      return;
    }
    if (this.emberState === 2 && this.emberHeld) {
      const hand = this.m.hands[this.emberHeld];
      if (hand.tracked) {
        this.emberLost = 0;
        // Opening a tracked hand can move its reported pinch joint several centimetres in a
        // single frame. Keep the rivet at the last closed-hand sample for the release test;
        // otherwise a deliberate press into the bowl can jump above or outside it as the fingers
        // open and feel randomly rejected on both Quest and IWER.
        if (hand.pinching) {
          this.emberHandLocal.copy(hand.pinch);
          this.m.stage.worldToLocal(this.emberHandLocal);
          this.emberPickup.position.copy(this.emberHandLocal);
          return;
        }
        if (hand.justReleased) {
          const side = this.emberHeld;
          // Opening the hand after carrying the rivet moves IWER/Quest's reported index joint.
          // Keep that release owned by Ember, so its follow-through cannot also draw a free Groove.
          this.m.blockShapingRelease(side);
          this.emberHandLocal.copy(this.emberPickup.position);
          const floor = this.m.arena.height(this.emberHandLocal.x, this.emberHandLocal.z);
          if (this.m.arena.inside(this.emberHandLocal.x, this.emberHandLocal.z) && Math.abs(this.emberHandLocal.y - floor) <= 0.085) {
            this.emberBumperAt.set(this.emberHandLocal.x, floor, this.emberHandLocal.z);
            this.emberBumperFx.position.set(this.emberBumperAt.x, floor + 0.012, this.emberBumperAt.z);
            this.emberBumperFx.visible = !this.m.photo;
            this.emberPickup.visible = false;
            this.emberHeld = null;
            this.setEmberState(3);
            this.emberPostUntil = this.m.elapsed + EMBER_POST_TIME;
            this.m.recordIntervention();
            this.m.lastShape = { t: this.m.elapsed, kind: 'ramp' };
            this.m.stamp.show('RIVET PLANTED!', 'A HOT POST FOR 3 S: IT KICKS THEIRS OUT', 'mine', 0.72, 1.05);
            this.m.sparks.embers(this.emberBumperAt.x, floor, this.emberBumperAt.z, 8, 0.08, 0.08, 1);
            playThock();
            return;
          }
          this.emberHeld = null;
          this.setEmberState(1);
          this.emberPickup.position.copy(this.emberHome);
          this.m.label.set('PLANT IT LOW, INSIDE THE BOWL');
          this.m.labelTimer = 1.1;
          return;
        }
      } else if ((this.emberLost += dt) >= HAND_LOSS_GRACE) {
        this.emberHeld = null;
        this.setEmberState(1);
        this.emberPickup.position.copy(this.emberHome);
      }
      return;
    }
    if (this.emberState === 3) {
      this.emberBumperFx.visible = !this.m.photo;
      const pulse = 1 + 0.08 * Math.sin(this.m.time * 10);
      this.emberBumperFx.scale.setScalar(pulse);
    }
  }

  /** Two low, flat open hands on the rim become the Crossguard rail between them. */
  updateCrossguard() {
    const wasCrossguard = this.crossguardActive;
    this.crossguardActive = false;
    if (!this.m.taught('crossguard')) {
      this.palmRailAngles.left = this.palmRailAngles.right = null;
      this.crossguardBeam.visible = this.crossguardGlow.visible = false;
      for (const post of this.crossguardPosts) post.visible = false;
      this.m.rootEntity?.setValue(FirstFiveState, 'crossguardActive', false);
      return;
    }
    for (const side of ['left', 'right'] as const) {
      const h = this.m.hands[side];
      let accepted = false;
      // A hand that just released a pinch still looks like an open palm for a few frames. Without
      // this ownership window, releasing two-hand Arena Forge can accidentally build Crossguard
      // and spend a second charge on the same physical gesture.
      // A Spin Rub is one open hand low over the bowl too; while its window is open no rail is built.
      // A palm on a glowing Forge grip is reserved for that verb (gesture-owner.ts 'grip'); a hand
      // passing over the rim to the grips is not still long enough to post (RAIL_STILL, RAIL_DWELL).
      if (mayListen(this.m.handFacts(side), 'crossguard')) {
        const wrist = this.m.handAt.copy(this.m.toLocal(h.wrist));
        const index = this.m.root.worldToLocal(this.m.local.copy(h.index));
        const palm = wrist.lerp(index, 0.45);
        const n = normRadius(this.m.arena.layout, palm.x, palm.z);
        const floor = this.m.arena.height(palm.x, palm.z);
        // A rail post needs a low, flat open hand; a relaxed upright hand near the rim does not count.
        const onRim = n >= 0.78 && n <= 1.22 && palm.y >= floor - 0.025 && palm.y <= floor + 0.065 && Math.abs(wrist.y - index.y) <= 0.07;
        // Hands that just let go of the Arena Forge grips are open palms on the rim already: they
        // must leave the rim once before they can post a rail.
        if (!onRim) this.railNeedsClear[side] = false;
        // A rail post is a palm set down and held, not a hand passing over the rim on its way to a
        // grip (a forge grab pinches within ~0.15 s of arriving) or a top: it must stay nearly still
        // (real m/s, smoothed over ~80 ms against tracking jitter) for RAIL_DWELL.
        const prev = this.railPrev[side];
        const dt = this.m.frameDt;
        if (prev.w > 0 && dt > 0) {
          const raw = (Math.hypot(palm.x - prev.x, palm.z - prev.z) * this.m.root.scale.x) / dt;
          prev.speed = Number.isFinite(prev.speed) ? prev.speed + (raw - prev.speed) * Math.min(1, dt / 0.08) : raw;
        } else prev.speed = Infinity;
        prev.x = palm.x;
        prev.z = palm.z;
        prev.w = 1;
        prev.still = onRim && prev.speed < RAIL_STILL ? prev.still + dt : 0;
        accepted = onRim && !this.railNeedsClear[side] && prev.still >= RAIL_DWELL;
        if (accepted) {
          this.palmRailAngles[side] = Math.atan2(palm.z, palm.x);
          this.palmRailGrace[side] = 0.22;
        }
      } else {
        // Not listening (a release lock, a tool, a rub): the stillness test starts over when it resumes.
        this.railPrev[side].w = 0;
        this.railPrev[side].still = 0;
      }
      if (!accepted) {
        this.palmRailGrace[side] = Math.max(0, this.palmRailGrace[side] - this.m.frameDt);
        if (this.palmRailGrace[side] <= 0) this.palmRailAngles[side] = null;
      }
    }

    const left = this.palmRailAngles.left;
    const right = this.palmRailAngles.right;
    if (left !== null && right !== null) {
      const ar = rimRadius(this.m.arena.layout, left) * 0.88;
      const br = rimRadius(this.m.arena.layout, right) * 0.88;
      this.crossguardA.set(Math.cos(left) * ar, this.m.arena.floorHeight(1) + 0.026, Math.sin(left) * ar);
      this.crossguardB.set(Math.cos(right) * br, this.m.arena.floorHeight(1) + 0.026, Math.sin(right) * br);
      const dx = this.crossguardB.x - this.crossguardA.x;
      const dz = this.crossguardB.z - this.crossguardA.z;
      const length = Math.hypot(dx, dz);
      if (length >= 0.08 && !this.crossguardConsumed) {
        this.crossguardActive = true;
        const mx = (this.crossguardA.x + this.crossguardB.x) * 0.5;
        const mz = (this.crossguardA.z + this.crossguardB.z) * 0.5;
        const angle = -Math.atan2(dz, dx);
        const pulse = 1 + 0.06 * Math.sin(this.m.time * 11);
        for (const beam of [this.crossguardGlow, this.crossguardBeam]) {
          beam.visible = !this.m.photo;
          beam.position.set(mx, this.crossguardA.y, mz);
          beam.rotation.set(0, angle, 0);
          beam.scale.set(length, pulse, pulse);
        }
        this.crossguardPosts.forEach((post, i) => {
          post.visible = !this.m.photo;
          post.position.copy(i ? this.crossguardB : this.crossguardA);
          post.scale.setScalar(pulse);
        });
        if (!wasCrossguard) {
          this.m.label.set('CROSSGUARD\nHOLD BOTH PALMS · ONE RETURN');
          this.m.labelTimer = 1.1;
          playTick();
        }
      }
    } else {
      this.crossguardConsumed = false;
    }
    if (!this.crossguardActive && this.crossguardBreak <= 0) {
      this.crossguardBeam.visible = this.crossguardGlow.visible = false;
      for (const post of this.crossguardPosts) post.visible = false;
    }
    if (this.crossguardBreak > 0) {
      this.crossguardBreak = Math.max(0, this.crossguardBreak - this.m.frameDt);
      const fade = this.crossguardBreak / 0.28;
      this.crossguardBeam.visible = this.crossguardGlow.visible = !this.m.photo && fade > 0;
      (this.crossguardBeam.material as MeshBasicMaterial).opacity = 0.82 * fade;
      (this.crossguardGlow.material as MeshBasicMaterial).opacity = 0.3 * fade;
      for (const post of this.crossguardPosts) post.visible = false;
    } else {
      (this.crossguardBeam.material as MeshBasicMaterial).opacity = 0.82;
      (this.crossguardGlow.material as MeshBasicMaterial).opacity = 0.22;
    }
    this.m.rootEntity?.setValue(FirstFiveState, 'crossguardActive', this.crossguardActive);
  }

  updatePalmGust(dt: number) {
    this.palmGustCooldown = Math.max(0, this.palmGustCooldown - dt);
    if (this.palmGustTime > 0) {
      this.palmGustTime = Math.max(0, this.palmGustTime - dt);
      const life = this.palmGustTime / PALM_GUST_FX_TIME;
      const age = PALM_GUST_FX_TIME - this.palmGustTime;
      const open = Math.min(1, age / 0.12);
      const fade = age <= 0.12 ? 1 : Math.max(0, 1 - (age - 0.12) / (PALM_GUST_FX_TIME - 0.12));
      this.palmGustFx.visible = !this.m.photo && life > 0;
      this.palmGustFx.scale.set(this.palmGustLength * open, 1, 1);
      (this.palmGustFx.material as MeshBasicMaterial).opacity = fade * 0.82;
      const rimAge = age - 0.06;
      this.palmGustRim.visible = !this.m.photo && this.palmGustHits > 0 && rimAge >= 0 && rimAge < 0.24;
      if (this.palmGustRim.visible) {
        const t = rimAge / 0.24;
        const radius = maxRim(this.m.arena.layout) / 0.17;
        this.palmGustRim.scale.setScalar(radius * (0.96 + t * 0.07));
        (this.palmGustRim.material as MeshBasicMaterial).opacity = (1 - t) * 0.9;
      }
    } else {
      this.palmGustFx.visible = false;
      this.palmGustRim.visible = false;
    }

    for (const side of ['left', 'right'] as const) {
      const h = this.m.hands[side];
      const facts = this.m.handFacts(side);
      if (!this.m.taught('gust') || !mayListen(facts, 'gust')) {
        this.palmGustSampled[side] = false;
        this.palmGustAge[side] = 0;
        continue;
      }
      const wrist = this.m.handAt.copy(this.m.toLocal(h.wrist));
      const index = this.m.root.worldToLocal(this.m.local.copy(h.index));
      const palm = wrist.lerp(index, 0.48);
      const floor = this.m.arena.height(palm.x, palm.z);
      const n = normRadius(this.m.arena.layout, palm.x, palm.z);
      const valid = n < 0.74 && palm.y >= floor + 0.025 && palm.y <= floor + 0.12 && Math.abs(wrist.y - index.y) <= 0.075;
      if (!valid) {
        this.palmGustSampled[side] = false;
        this.palmGustAge[side] = 0;
        continue;
      }
      if (!this.palmGustSampled[side]) {
        this.palmGustSampled[side] = true;
        this.palmGustLast[side].copy(palm);
        this.palmGustOrigin[side].copy(palm);
        this.palmGustAge[side] = -PALM_GUST_ARM_TIME;
        continue;
      }
      const last = this.palmGustLast[side];
      const dx = palm.x - last.x;
      const dz = palm.z - last.z;
      // Real m/s: the live root scale (smaller on a fitted, shrunk arena), not the nominal ARENA_SCALE.
      const speed = (Math.hypot(dx, dz) * this.m.root.scale.x) / Math.max(1e-3, dt);
      last.copy(palm);
      const origin = this.palmGustOrigin[side];
      const wasArming = this.palmGustAge[side] < 0;
      this.palmGustAge[side] += dt;
      if (wasArming) {
        // Reaching across the bowl keeps moving the origin and never arms. A brief settled palm,
        // followed by a new sweep, is both more intentional and easier to read on camera.
        if (speed > PALM_GUST_ARM_SPEED) this.palmGustAge[side] = -PALM_GUST_ARM_TIME;
        origin.copy(palm);
        if (this.palmGustAge[side] < 0) continue;
        this.palmGustAge[side] = 0;
        continue;
      }
      const pathX = palm.x - origin.x;
      const pathZ = palm.z - origin.z;
      const path = Math.hypot(pathX, pathZ);
      if (this.palmGustAge[side] > 0.5) {
        origin.copy(palm);
        this.palmGustAge[side] = 0;
        continue;
      }
      if (this.palmGustCooldown > 0 || speed < PALM_GUST_SPEED || path * this.m.root.scale.x < 0.105) continue;
      // A fingertip arriving on your own top is a Spin Rub reaching in, not a sweep (a sweep that
      // crosses your top still fires once it is past it).
      if (!mayCommit(facts, 'gust')) continue;
      const strength = Math.max(0.65, Math.min(1.5, speed / 0.75));
      this.doPalmGust(side, origin.x, origin.z, palm.x, palm.z, strength);
      this.palmGustSampled[side] = false;
      this.palmGustAge[side] = 0;
    }
  }

  private doPalmGust(side: Side, sx: number, sz: number, ex: number, ez: number, strength: number) {
    // The sweep's fingertips skim the floor too: that stroke is not also a Finger Groove.
    this.m.quietGroove(side);
    const length = Math.hypot(ex - sx, ez - sz) || 1;
    const dirX = (ex - sx) / length;
    const dirZ = (ez - sz) / length;
    // The hand only needs a short, comfortable sweep to declare its direction. Project that
    // physical intent to the opposite rim so the player never has to reach across the whole table.
    const maxTravel = maxRim(this.m.arena.layout) * 2.5;
    let travel = maxTravel;
    for (let i = 1; i <= 24; i++) {
      const t = (maxTravel * i) / 24;
      if (normRadius(this.m.arena.layout, sx + dirX * t, sz + dirZ * t) >= 1.04) {
        travel = t;
        break;
      }
    }
    const gustEx = sx + dirX * travel;
    const gustEz = sz + dirZ * travel;
    const force = this.m.charges.spend(this.m.elapsed, TUNING.grace);
    if (!force) {
      this.palmGustCooldown = 0.35;
      this.m.locked('Forge Gust needs one charge\nCharges refill in a moment');
      return;
    }
    // The open index travels close to the bowl during the same physical sweep. Own that whole
    // stroke as a Gust; otherwise updateShaping can retain its fingertip trail and commit a paid
    // Finger Groove when the player lifts the hand after the sweep.
    this.m.blockShapingRelease(side);
    const power = Math.min(1.5, strength * force);
    const candidates = this.m.tops;
    // A gust steers around the player's own top.
    const own = this.m.mine;
    const struck = candidates.filter((top) => top !== own && palmGustCrosses(this.m.arena, top, sx, sz, gustEx, gustEz));
    this.palmGustDirection.set(dirX, dirZ);
    this.palmGustCooldown = PALM_GUST_COOLDOWN;
    this.palmGustTime = PALM_GUST_FX_TIME;
    this.palmGustLength = travel;
    this.palmGustHits = struck.length;
    this.palmGustSide = side;
    this.palmGustCount++;
    this.palmGustFx.visible = !this.m.photo;
    this.palmGustFx.position.set(sx, this.m.arena.height(sx, sz) + 0.006, sz);
    this.palmGustFx.rotation.y = -Math.atan2(this.palmGustDirection.y, this.palmGustDirection.x);
    this.palmGustFx.scale.set(0.001, 1, 1);
    (this.palmGustFx.material as MeshBasicMaterial).color.setHex(0xffad42);
    (this.palmGustFx.material as MeshBasicMaterial).opacity = 0.82;
    const exitAngle = Math.atan2(this.palmGustDirection.y, this.palmGustDirection.x);
    this.palmGustRim.position.set(0, this.m.arena.floorHeight(1) + 0.003, 0);
    this.palmGustRim.rotation.y = -exitAngle;
    (this.palmGustRim.material as MeshBasicMaterial).color.setHex(0xff7a20);
    if (this.m.online?.role === 'guest' && this.m.online.peer) {
      this.m.online.sendEvent({ kind: 'gust', sx: -sx, sz: -sz, ex: -gustEx, ez: -gustEz, f: power });
    } else palmGust(this.m.arena, candidates, sx, sz, gustEx, gustEz, power, own);
    for (const top of struck) {
      const y = this.m.arena.height(top.x, top.z);
      const view = top === this.m.mine ? this.m.myView : top === this.m.theirs ? this.m.theirView : null;
      view?.flash();
      view?.hit(Math.min(1, 0.55 + power * 0.25), this.palmGustDirection.x, this.palmGustDirection.y, 0.04);
      this.m.impacts.hit(top.x, y, top.z, Math.min(1, 0.5 + power * 0.25));
      this.m.sparks.burst(top.x, y, top.z, 0.45 + power * 0.2);
    }
    this.m.lastShape = { t: this.m.elapsed, kind: 'parry' };
    this.m.recordIntervention();
    if (struck.length) this.m.impacts.shock(struck[0].x, this.m.arena.height(struck[0].x, struck[0].z), struck[0].z, 0.5, VERB_TINT.gust);
    this.m.stamp.show(struck.length ? 'FORGE GUST!' : 'GUST MISSED', struck.length ? `${struck.length} TOP${struck.length === 1 ? '' : 'S'} IN THE CORRIDOR` : 'SWEEP THROUGH A TOP', struck.length ? 'mine' : 'neutral', 0.6, 0.9);
    this.m.label.set(struck.length ? 'YOUR HAND MOVED THE FIGHT' : 'THE CORRIDOR MISSED');
    this.m.labelTimer = 1.1;
    playDash(gustEx);
    if (import.meta.env.DEV) console.log(`[GUST] ${side} ${sx.toFixed(3)},${sz.toFixed(3)} → ${gustEx.toFixed(3)},${gustEz.toFixed(3)} ×${power.toFixed(2)} hits ${struck.length}`);
  }
}
