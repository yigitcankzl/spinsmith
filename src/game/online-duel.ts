import { playSling, playThock, playDash } from './audio.js';
import { decodeBuild, encodeBuild } from './challenge.js';
import { cloneLayout, validate } from './layout.js';
import { forgeGrips } from './reach.js';
import type { ArenaLayout } from './layout.js';
import { RUB_WINDOW_MAX, fingerContact, FINGER_RADIUS, palmGust, palmGustCrosses, sealStrike, SEALS, springRim, CUP_DEPTH, CUP_SIGMA, finishPoints, Top } from './sim.js';
import type { FloorShape, Seal } from './sim.js';
import { PRESETS, SEAL_NAMES, roleOf } from './parts.js';
import type { Rival } from './parts.js';
import { OPPONENT_COLOR, TEAM_RIVAL } from './visuals.js';
import { SHAPE_SIZE } from './shaping.js';
import { ARENA_FORGE_SHIELD, arenaForgeAim, arenaForgeImpulse, arenaForgeRivalAction } from './arena-forge.js';
import type { ArenaForgeAction, ArenaForgeGesture } from './arena-forge.js';
import { clampGuestSpot, guestPointsBefore, linkFromAddress, sanitizeGuestEvent } from './online.js';
import type { GuestEvent, PackedShape } from './net.js';
import { RUB_WINDOW, RUB_REOPEN, MAX_AIM, LAUNCH_MAX_N, LAUNCH_GAP, ARENA_FORGE_TITLE, SLING_SNAP } from './match-constants.js';
import type { MatchSystem } from './match-system.js';


/**
 * The online duel's match side (the link itself is online.ts / net.ts): opening the room and wiring
 * its messages, waiting for the peer, applying the guest's events on the host, the guest's own
 * fight loop and its copy of the host's floor shapes.
 */
export class OnlineDuel {
  constructor(private readonly m: MatchSystem) {}

  /** Host only: the guest's current rub window and the spin it has rubbed in it. */
  private guestRubUntil = -9;
  private guestRubSum = 0;
  private guestRubSaidAt = -9;
  netPending: Parameters<MatchSystem['launch']> | null = null;
  netGo = false;
  netShapes = new Map<number, FloorShape>();
  /** Host: the online guest's cup, held here until slung or its hold runs out. */
  netCup: { shape: FloorShape; at: number; caught?: boolean } | null = null;
  /** The address's online room was opened (it waits for the first session to end). */
  onlineTried = false;

  /** Opens the online duel the address asks for (after the first session), and wires its messages. */
  openOnline(open?: 'host') {
    if (this.m.progress.guide !== 'done') return;
    if (!open) this.onlineTried = true;
    // The hello only proves protocol compatibility. Exact parts travel with the committed rip, so
    // neither table can counter-pick after seeing the other's deck choice.
    const link = linkFromAddress(open ? `?online=host${new URLSearchParams(location.search).get('net') === 'bc' ? '&net=bc' : ''}` : location.search, encodeBuild(PRESETS[0].build), this.m.progress.rank);
    if (!link) return;
    this.m.online = link;
    const say = (text: string, hold = 8) => {
      this.m.label.set(text);
      this.m.labelTimer = hold;
    };
    // The room code stays up until someone joins (on the card now, and on the board's front while home).
    this.m.hub.roomCode = link.role === 'host' ? link.code : null;
    if (this.m.phase === 'hub') this.m.toHub();
    say(link.role === 'host' ? `Online room ${link.code}\nFriend opens ?online=${link.code} · pegs close` : `Joining room ${link.code}…`, 600);
    link.onHello = () => {
      this.m.hub.roomCode = null;
      if (import.meta.env.DEV) console.log(`[ONLINE] ${link.role}: ${link.peerName} joined ${link.code}`);
      if (link.role === 'host') {
        const start = () => {
          if (this.m.online !== link || !link.peer) return;
          this.m.toHub();
          this.m.startMatch(this.remoteRival());
        };
        // Never pull the host out of the forge or the workshop (unsaved work): start when they are home.
        if (this.m.phase === 'placing') this.m.afterPlace = start;
        else if (this.m.phase === 'build' || this.m.phase === 'forge' || this.m.demo) {
          this.m.afterHome = start;
          say(`${link.peerName || 'A smith'} joined\nThe duel starts when you are home`);
        } else start();
      } else say(`In room ${link.code}\n${link.peerName} starts the match`);
    };
    link.onLaunch = (round, arena, layout, builds) => {
      if (round < 0 && this.m.phase === 'placing') {
        this.m.afterPlace = () => {
          if (this.m.online === link && link.peer) link.onLaunch?.(round, arena, layout, builds);
        };
        return;
      }
      if (round < 0 && (this.m.phase === 'build' || this.m.phase === 'forge' || this.m.demo)) {
        this.m.afterHome = () => {
          if (this.m.online === link && link.peer) link.onLaunch?.(round, arena, layout, builds);
        };
        say(`${link.peerName || 'The host'} is ready\nThe duel starts when you are home`);
        return;
      }
      if (round < 0) {
        // A match begins: the host's arena (by name, or whole when it was built in the workshop), against the host's top.
        // Home first: going home picks this device's own next bout and arena, which the host's replaces.
        this.m.toHub();
        const index = this.m.arenas.findIndex((a) => a.name === arena);
        // Untrusted input: a layout that fails to clone or validate falls back to the name.
        let sent: ArenaLayout | null = null;
        try {
          sent = layout && typeof layout === 'object' ? cloneLayout(layout as ArenaLayout) : null;
          if (sent && validate(sent)) sent = null;
        } catch {
          sent = null;
        }
        let placed = false;
        if (sent) {
          try {
            this.m.setArena(sent);
            placed = true;
          } catch {
            placed = false;
          }
        }
        if (placed) {
          // Kept: going home inside the session must not swap in the guest's own arena.
          this.m.arenas = [...this.m.arenas.filter((a) => a.name !== sent!.name), sent!];
          this.m.arenaIndex = this.m.arenas.length - 1;
        } else if (index >= 0) {
          this.m.arenaIndex = index;
          this.m.setArena(this.m.arenas[index]);
        }
        this.m.startMatch(this.remoteRival());
        return;
      }
      // The host has launched: whatever this side is doing with the cord, its sent rip is the one that flies.
      this.m.puller = null;
      this.m.cord.set(null);
      this.m.cordTone.update(null);
      this.m.chargeRing.visible = false;
      this.netGo = true;
      if (builds) {
        const hostBuild = decodeBuild(builds[0]);
        const guestBuild = decodeBuild(builds[1]);
        if (hostBuild && guestBuild) {
          this.m.myBuild = this.m.forge.allowed({ ...guestBuild });
          this.m.setBuilds(this.m.myBuild, { ...hostBuild, color: OPPONENT_COLOR });
          this.m.stamp.show('DECKS REVEALED', `${roleOf(this.m.mine.spec).toUpperCase()} VS ${roleOf(this.m.theirs.spec).toUpperCase()}`, 'neutral', 0.65);
        }
      }
      const [power, aim, from, dir, steep] = this.netPending ?? [0.75, 0, null, null, 0];
      this.m.launch(power, aim, from, dir, steep);
      this.netGo = false;
    };
    link.onEvent = (ev) => this.applyGuestEvent(ev);
    link.onResult = (winner, heat) => {
      if (this.m.phase !== 'fight') return;
      this.guestFight(0, true);
      const v = winner === 2 ? 2 : winner === 1 ? -1 : 1;
      const loser = v === 1 ? this.m.theirs : this.m.mine;
      if (v !== 2 && !loser.finish) loser.finish = 'spin';
      // Take the host's heat (seen from this side), less the points finish() is about to add.
      if (v !== 2) [this.m.myPoints, this.m.theirPoints] = guestPointsBefore(heat, v, finishPoints(loser, this.m.progress.matches === 0, false));
      this.m.finish(v);
    };
    link.onLeft = () => {
      // Close first, redraw home, then say it (a redraw would wipe the card).
      this.endOnline();
      if (this.m.phase === 'hub') this.m.toHub();
      say(`${link.peerName || 'Your opponent'} left\nThe online duel is over`);
    };
    // WebRTC through public relays: a room nobody reaches, or a strict network, ends with a plain reason.
    const t = link.transport as { onState?: (cb: (s: string) => void) => void; error?: string };
    t.onState?.((state) => {
      if (state === 'failed' && !link.peer) {
        this.endOnline();
        if (this.m.phase === 'hub') this.m.toHub();
        say(`Room ${link.code}: no one connected\n${t.error ?? 'Check the code, or try another network'}`, 12);
      }
    });
  }

  /** Host: a guest's launch spot, kept finite, inside the launch ring and LAUNCH_GAP clear of yours. */
  guestSpot(at: [number, number], sx: number, sz: number): [number, number] {
    return clampGuestSpot(at, sx, sz, LAUNCH_MAX_N * this.m.arena.radius, LAUNCH_GAP) ?? this.m.rivalSpot();
  }

  /** Online: your rip is sent and held; drop the cord and wait in ready (MENU is there) until the other side rips. */
  waitForPeer() {
    this.m.puller = null;
    this.m.chargeRing.visible = false;
    this.m.cord.set(null);
    this.m.cordTone.update(null);
    this.m.phase = 'ready';
  }

  /** Closes the online duel and returns to offline play (the pegs light for the seats again). */
  endOnline() {
    // Whatever waited for the other smith (placement, home) is void with them gone.
    this.m.afterPlace = this.m.afterHome = null;
    this.netCup = null;
    this.m.hub.roomCode = null;
    if (!this.m.online) return;
    this.m.online.close();
    this.m.online = null;
    this.m.netRip = null;
    this.netPending = null;
    this.netShapes.clear();
    this.m.hub.setBrawl(this.m.seats);
  }

  /** The other smith's top, as a rival for the online duel. */
  remoteRival(): Rival {
    const link = this.m.online!;
    const build = decodeBuild(link.peerBuild) ?? { ...PRESETS[0].build };
    const name = link.role === 'host' ? 'Guest' : 'Host';
    return { name, move: 'charge', style: 'another smith, live', title: link.peerName || 'online', intro: 'Live from another table.', win: 'GG.', lose: 'GG.', tip: 'Watch their ramps; forge before they do', build: { ...build, color: OPPONENT_COLOR }, level: 1 };
  }

  /** Host: what the guest's hands did, from the far side. */
  private applyGuestEvent(raw: GuestEvent) {
    // A trust boundary: a guest's event is checked and clamped before it can touch the simulation.
    const ev = sanitizeGuestEvent(raw, this.m.arena.radius, MAX_AIM);
    if (!ev) return;
    if (ev.kind === 'rip') {
      // A rip that arrives mid-fight belongs to no round: the next one starts from a fresh rip.
      if (this.m.phase === 'fight') return;
      this.m.netRip = { power: ev.power, aim: ev.aim, ...(ev.build ? { build: ev.build } : {}), ...(ev.at ? { at: ev.at } : {}), ...(ev.dir ? { dir: ev.dir } : {}) };
      // Only from ready: a host mid-pull finishes their own new rip, which then finds this one waiting.
      if (this.netPending && this.m.phase === 'ready') {
        const [power, aim, from, dir, steep] = this.netPending;
        this.netGo = true;
        this.m.launch(power, aim, from, dir, steep);
        this.netGo = false;
      }
      return;
    }
    if (this.m.phase !== 'fight') return;
    if (ev.kind === 'ramp') {
      this.m.arena.addShape('ramp', ev.x, ev.z, SHAPE_SIZE.ramp, 'rival', ev.dx, ev.dz);
      this.m.rivalHandMove(ev.x, ev.z, ev.dx, ev.dz);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'RAMP';
      playThock();
    } else if (ev.kind === 'groove') {
      const shape = this.m.arena.addGroove(ev.sx, ev.sz, ev.ex, ev.ez, 'rival');
      if (!shape) return;
      this.m.rivalHandMove(ev.ex, ev.ez, shape.dx, shape.dz);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'GROOVE';
      playThock();
    } else if (ev.kind === 'cup') {
      // The guest's cup, held here for them: it catches the first top in, then lets go after the hold.
      if (this.netCup && this.m.arena.shapes.includes(this.netCup.shape)) this.m.arena.free(this.netCup.shape);
      const shape = this.m.arena.addShape('well', ev.x, ev.z, CUP_DEPTH, 'rival-cup', 0, 0, CUP_SIGMA);
      shape.trap = shape.held = true;
      this.netCup = { shape, at: this.m.elapsed };
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'CUP';
      playThock();
    } else if (ev.kind === 'sling') {
      const cup = this.netCup?.shape;
      const t = cup?.caught;
      if (!cup || !t || !this.m.arena.shapes.includes(cup)) return;
      let a = Math.atan2(-ev.pz, -ev.px);
      let gap = SLING_SNAP;
      for (const p of this.m.arena.layout.pockets) {
        const b = Math.atan2(Math.sin(p.angle) * this.m.arena.radius - t.z, Math.cos(p.angle) * this.m.arena.radius - t.x);
        const d = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
        if (d < gap) {
          gap = d;
          a = b;
        }
      }
      this.m.arena.sling(cup, Math.cos(a), Math.sin(a));
      this.netCup = null;
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'SLING';
      this.m.stamp.show('THEIR SLING', 'LIVE HANDS', 'rival', 0.6);
      playSling(t.x, t.z);
    } else if (ev.kind === 'rim') {
      const hits = springRim(this.m.arena, this.m.theirs, [this.m.mine], ev.sx, ev.sz, ev.x, ev.z, Math.max(0, Math.min(1.5, ev.f)));
      this.m.arenaView.flashRail(ev.sx, ev.sz);
      this.m.impacts.shock(ev.sx, this.m.arena.height(ev.sx, ev.sz), ev.sz, hits ? 0.75 : 0.35);
      if (hits) this.m.stamp.show('THEIR RIM SPRING', 'LIVE HANDS', 'rival', 0.6);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'RIM SPRING';
      playThock();
    } else if (ev.kind === 'gust') {
      const targets = ev.target === 'mine' ? [this.m.theirs] : ev.target === 'rival' ? [this.m.mine] : this.m.tops;
      // An untargeted (paid) guest gust steers around the guest's own top, as it does locally.
      const own = ev.target ? null : this.m.theirs;
      const struck = targets.filter((top) => top !== own && palmGustCrosses(this.m.arena, top, ev.sx, ev.sz, ev.ex, ev.ez));
      const hits = palmGust(this.m.arena, targets, ev.sx, ev.sz, ev.ex, ev.ez, ev.f, own);
      this.m.rivalHandMove(ev.ex, ev.ez, ev.ex - ev.sx, ev.ez - ev.sz);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'FORGE GUST';
      this.m.impacts.shock((ev.sx + ev.ex) * 0.5, this.m.arena.floorHeight(0.6), (ev.sz + ev.ez) * 0.5, hits ? 0.6 : 0.3, TEAM_RIVAL);
      for (const top of struck) {
        const view = top === this.m.mine ? this.m.myView : top === this.m.theirs ? this.m.theirView : null;
        view?.flash();
        this.m.impacts.hit(top.x, this.m.arena.height(top.x, top.z), top.z, 0.75);
      }
      if (hits) this.m.stamp.show('THEIR FORGE GUST', 'LIVE HANDS', 'rival', 0.6);
      playDash(ev.ex);
    } else if (ev.kind === 'flick') {
      // Guest-side 'mine' is the host's rival top.
      const top = ev.target === 'mine' ? this.m.theirs : this.m.mine;
      const reach = top.spec.radius + FINGER_RADIUS - 0.002;
      top.sinceTouch = 99;
      fingerContact(top, top.x - ev.dx * reach, top.z - ev.dz * reach, top.vx + ev.dx * ev.s, top.vz + ev.dz * ev.s, ev.f);
      const y = this.m.arena.height(top.x, top.z);
      (top === this.m.mine ? this.m.myView : this.m.theirView).flash();
      this.m.impacts.hit(top.x, y, top.z, 0.8);
      this.m.sparks.burst(top.x, y, top.z, 0.7);
      this.m.stamp.show('THEIR FLICK', 'LIVE HANDS', 'rival', 0.55);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'FLICK';
      this.m.hitStop = Math.max(this.m.hitStop, 0.07);
      playThock(top.x, top.z);
    } else if (ev.kind === 'rub') {
      // Guest-side 'mine' is the host's rival top; one window's worth of spin per RUB_WINDOW at most.
      const top = this.m.theirs;
      if (!top.alive) return;
      if (this.m.time >= this.guestRubUntil) {
        this.guestRubUntil = this.m.time + RUB_WINDOW + RUB_REOPEN;
        this.guestRubSum = 0;
      }
      const gain = Math.min(ev.gain, RUB_WINDOW_MAX - this.guestRubSum);
      this.guestRubSum += Math.max(0, gain);
      top.spin = gain > 0 ? Math.max(top.spin, Math.min(1, top.spin + gain)) : Math.max(0, top.spin + gain);
      if (gain > 0 && this.m.time - this.guestRubSaidAt >= 1) {
        this.guestRubSaidAt = this.m.time;
        this.m.theirView.flash();
        this.m.stamp.show('THEIR SPIN RUB', 'LIVE HANDS', 'rival', 0.45);
        this.m.rivalShapeAt = this.m.elapsed;
        this.m.rivalShapeKind = 'SPIN RUB';
      }
    } else if (ev.kind === 'strike') {
      // The guest's palm comes down: their seal (Anvil when unknown), centred where they slapped, their top the striker.
      const seal = (SEALS as readonly string[]).includes(ev.seal ?? '') ? (ev.seal as Seal) : 'anvil';
      sealStrike(this.m.arena, this.m.theirs, this.m.mine, seal, ev.x, ev.z);
      const y = this.m.arena.height(ev.x, ev.z);
      this.m.impacts.shock(ev.x, y, ev.z, 1, TEAM_RIVAL);
      this.m.sparks.burst(ev.x, y, ev.z, 1);
      this.m.stamp.show(`THEIR ${SEAL_NAMES[seal].toUpperCase()}`, 'LIVE HANDS', 'rival', 0.9);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = 'STRIKE';
      this.m.hitStop = Math.max(this.m.hitStop, 0.12);
      playThock();
    } else if (ev.kind === 'forge') {
      const action = ev.action as ArenaForgeAction;
      const gesture: ArenaForgeGesture = { pull: ev.pull, twist: ev.twist, tilt: ev.tilt };
      // The guest forged: its top (theirs, here on the host) is the forger, ours is the target.
      const forger = this.m.theirs;
      const target = this.m.mine;
      const aim = arenaForgeAim(target.x, target.z, target.vx, target.vz, this.m.arena.radius);
      if (forger.alive) forger.shieldUntil = Math.max(forger.shieldUntil, this.m.arena.elapsed + ARENA_FORGE_SHIELD);
      for (const top of this.m.tops) {
        if (!top.alive) continue;
        const own = top === forger;
        const impulse = arenaForgeImpulse(own ? action : arenaForgeRivalAction(action), gesture, top.x, top.z, this.m.arena.radius, ev.sx ?? -ev.sign, ev.sz ?? 0, (ev.force ?? 1) * (own ? 0.4 : aim));
        top.vx += impulse.x;
        top.vz += impulse.z;
        top.kick = Math.max(top.kick, 0.55);
        top.kickX = impulse.x;
        top.kickZ = impulse.z;
      }
      if (action === 'tilt' && ev.sx !== undefined) {
        this.m.arenaMorphShove.x = ev.sx;
        this.m.arenaMorphShove.z = ev.sz ?? 0;
        this.m.arenaMorphShove.t = 1.35;
        this.m.arena.shove = this.m.arenaMorphShove;
      }
      const [, g] = forgeGrips(this.m.arena.layout);
      const d = Math.hypot(g.x, g.z) || 1;
      this.m.rivalHandMove(-g.x, -g.z, g.x / d, g.z / d);
      this.m.rivalShapeAt = this.m.elapsed;
      this.m.rivalShapeKind = action.toUpperCase();
      this.m.stamp.show(`THEIR ${ARENA_FORGE_TITLE[action]}`, 'LIVE HANDS', 'rival', 0.9);
      this.m.impacts.shock(0, this.m.arena.height(0, 0), 0, 0.6);
      playThock();
    }
  }

  /** Guest: the fight as the host's snapshots show it, turned half round so your top is near you. */
  guestFight(dt: number, newest = false) {
    const link = this.m.online!;
    link.tick();
    const s = link.buffer.sample(performance.now() + (newest ? 10000 : 0));
    // Snapshot time is the host's game clock (monotonic across rounds); the fight clock runs here.
    this.m.elapsed += dt;
    if (!s) return;
    if (newest) dt = 0;
    // The stage is turned half round on the guest, so the host's own coordinates are drawn as they are.
    const put = (t: Top, p: (typeof s.tops)[0]) => {
      t.x = p.x;
      t.z = p.z;
      t.vx = p.vx;
      t.vz = p.vz;
      t.spin = p.spin;
      t.angle = p.angle;
      t.wobble = p.wobble;
      t.damage = p.damage;
      t.state = p.state;
      t.finish = p.finish;
    };
    put(this.m.mine, s.tops[1]);
    put(this.m.theirs, s.tops[0]);
    this.m.arena.tiltX = s.tilt[0];
    this.m.arena.tiltZ = s.tilt[1];
    this.syncGuestShapes(link.shapes, dt);
    // The guest's own charges and strike bar refill here (the host's sim loop does it there).
    this.m.charges.update(dt);
    this.m.forgeBar.update(dt, false);
  }

  /** Guest: the host's floor shapes, turned half round; a shape keeps its age while it lasts. */
  private syncGuestShapes(packed: PackedShape[], dt: number) {
    const live = new Set<number>();
    const out: FloorShape[] = [];
    for (const [id, kind, x, z, dx, dz, amp, owner, length] of packed) {
      live.add(id);
      let shape = this.netShapes.get(id);
      // The host's 'rival' shapes are this guest's own; the host's hands' shapes are the rival's here.
      const mine = owner === 'rival' || owner === 'rival-cup' || owner === 'rival-groove';
      if (!shape) {
        shape = { kind: kind === 0 ? 'ramp' : kind === 4 ? 'groove' : 'well', x, z, dx, dz, amp, age: 0, owner: mine ? 'left' : 'rival', ...(length === undefined ? {} : { length }), ...(kind === 4 ? { boost: -1 } : {}) };
        this.netShapes.set(id, shape);
        this.m.arenaDirty = true;
      } else if (shape.dx !== dx || shape.dz !== dz || shape.amp !== amp || shape.length !== length) {
        Object.assign(shape, { x, z, dx, dz, amp, length });
        this.m.arenaDirty = true;
      }
      // A cup (2), or a cup holding a top (3), as the host says now: let go there, let go here.
      const trap = kind === 2 || kind === 3;
      if (!!shape.trap !== trap) this.m.arenaDirty = true;
      shape.trap = shape.held = trap;
      // The top it holds: the one nearest the cup (this side only needs it for the sling cord).
      shape.caught = kind === 3 ? [this.m.mine, this.m.theirs].reduce((a, b) => (Math.hypot(a.x - x, a.z - z) <= Math.hypot(b.x - x, b.z - z) ? a : b)) : null;
      shape.age += dt;
      out.push(shape);
    }
    for (const id of [...this.netShapes.keys()]) if (!live.has(id)) {
      this.netShapes.delete(id);
      this.m.arenaDirty = true;
    }
    this.m.arena.shapes = out;
    if (dt > 0) this.m.arenaDirty = true;
  }
}
