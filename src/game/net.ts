/**
 * Online 1v1 duel (beta): transports, wire protocol and the guest-side helpers.
 * The host runs the only sim and streams snapshots at 30 Hz; the guest renders them through a short
 * interpolation buffer and sends its moves as numbered events that are resent until acked.
 * Coordinates on the wire are always the host's arena-local frame; the guest view is the same arena
 * turned 180 degrees (see mirror). No three.js or DOM here, so it runs headless in node.
 */
import type { MessageAction, Room } from 'trystero';
import type { Finish, FloorShape, Outcome } from './sim.ts';

export const NET_VERSION = 2;
export const APP_ID = 'spinsmith-duel-v1';
export const SNAPSHOT_HZ = 30;

// ---------------------------------------------------------------------------------------------
// Protocol

export type Vec3 = [number, number, number];
/** x, z, vx, vz, spin, angle, wobble, damage, state index, finish index. */
export type PackedTop = [number, number, number, number, number, number, number, number, number, number];
/** id, kind index, x, z, dx, dz, amp, owner. */
export type PackedShape = [number, number, number, number, number, number, number, string];

export type GuestEvent =
  | { kind: 'rip'; power: number; aim: number; steep: number; twist: number; build?: string; at?: [number, number]; dir?: [number, number] }
  | { kind: 'ramp'; x: number; z: number; dx: number; dz: number }
  | { kind: 'cup'; x: number; z: number }
  | { kind: 'sling'; px: number; pz: number }
  | { kind: 'forge'; action: string; pull: number; twist: number; tilt: number; sign: number; sx?: number; sz?: number; force?: number }
  | { kind: 'strike'; x: number; z: number; seal?: string }
  | { kind: 'rim'; sx: number; sz: number; x: number; z: number; f: number };

export interface SnapshotMsg {
  type: 'snapshot';
  /** Host sim time (ms). */
  t: number;
  seq: number;
  tops: [PackedTop, PackedTop];
  tilt: [number, number];
  /** Shapes version; `shapes` rides along only for a few snapshots after a change and as a periodic refresh. */
  sv: number;
  shapes?: PackedShape[];
}

export interface EventMsg {
  type: 'event';
  seq: number;
  ev: GuestEvent;
}

/** Hands stream continuously, so they are latest-wins rather than reliable. */
export interface HandsMsg {
  type: 'hands';
  seq: number;
  l: Vec3 | null;
  r: Vec3 | null;
  lp: boolean;
  rp: boolean;
}

export type NetMsg =
  | { type: 'hello'; v: number; build: string; name: string }
  | { type: 'start'; arena: string; seed: number; round: number; layout?: unknown; builds?: [string, string] }
  | SnapshotMsg
  | EventMsg
  | HandsMsg
  | { type: 'ack'; seq: number }
  | { type: 'result'; winner: number; heat: [number, number] }
  | { type: 'bye' };

const MSG_TYPES = new Set(['hello', 'start', 'snapshot', 'event', 'hands', 'ack', 'result', 'bye']);

/** Accepts a decoded wire message only if it looks like ours; anything else is dropped. */
export function parseMsg(data: unknown): NetMsg | null {
  const m = typeof data === 'string' ? safeJson(data) : data;
  if (!m || typeof m !== 'object' || !MSG_TYPES.has((m as { type?: string }).type ?? '')) return null;
  return m as NetMsg;
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

/** A peer speaking another protocol version cannot play this build. */
export function helloCompatible(msg: NetMsg): boolean {
  return msg.type === 'hello' && msg.v === NET_VERSION;
}

export const STATES: Outcome[] = ['spinning', 'out', 'toppled'];
export const FINISHES: Finish[] = [null, 'pocket', 'over', 'burst', 'spin'];
export const SHAPE_KINDS = ['ramp', 'well', 'cup'] as const;

const r4 = (v: number) => Math.round(v * 1e4) / 1e4;
const r3 = (v: number) => Math.round(v * 1e3) / 1e3;

export interface TopLike {
  x: number;
  z: number;
  vx: number;
  vz: number;
  spin: number;
  angle: number;
  wobble: number;
  damage: number;
  state: Outcome;
  finish: Finish;
}

export function packTop(t: TopLike): PackedTop {
  return [r4(t.x), r4(t.z), r4(t.vx), r4(t.vz), r4(t.spin), r3(t.angle), r3(t.wobble), r3(t.damage),
    Math.max(0, STATES.indexOf(t.state)), Math.max(0, FINISHES.indexOf(t.finish))];
}

export function unpackTop(p: PackedTop): TopLike {
  return { x: p[0], z: p[1], vx: p[2], vz: p[3], spin: p[4], angle: p[5], wobble: p[6], damage: p[7],
    state: STATES[p[8]] ?? 'spinning', finish: FINISHES[p[9]] ?? null };
}

/** Builds snapshots on the host; versions the shape list itself and decides when to resend it. */
export class SnapshotEncoder {
  private seq = 0;
  private sv = 0;
  private lastKey = '[]';
  private sendLeft = 0;
  private ids = new WeakMap<object, number>();
  private nextId = 1;

  private repeat: number;
  private refreshEvery: number;

  constructor(repeat = 3, refreshEvery = 10) {
    this.repeat = repeat;
    this.refreshEvery = refreshEvery;
  }

  encode(t: number, tops: [TopLike, TopLike], tilt: [number, number], shapes: readonly FloorShape[]): SnapshotMsg {
    const packed = shapes.map((s) => this.packShape(s));
    const key = JSON.stringify(packed);
    if (key !== this.lastKey) {
      this.lastKey = key;
      this.sv++;
      this.sendLeft = this.repeat;
    }
    const seq = ++this.seq;
    const msg: SnapshotMsg = { type: 'snapshot', t: Math.round(t), seq, tops: [packTop(tops[0]), packTop(tops[1])],
      tilt: [r4(tilt[0]), r4(tilt[1])], sv: this.sv };
    if (this.sendLeft > 0 || seq % this.refreshEvery === 0) {
      msg.shapes = packed;
      this.sendLeft = Math.max(0, this.sendLeft - 1);
    }
    return msg;
  }

  private packShape(s: FloorShape): PackedShape {
    let id = this.ids.get(s);
    if (!id) this.ids.set(s, (id = this.nextId++));
    // 3: a cup holding a top (the guest may only sling a cup that has caught one).
    const kind = s.trap ? (s.caught ? 3 : 2) : s.kind === 'well' ? 1 : 0;
    return [id, kind, r4(s.x), r4(s.z), r3(s.dx), r3(s.dz), r4(s.amp), s.owner];
  }
}

/** The guest's view: the same arena turned 180 degrees. Its own inverse. */
export function mirror(x: number, z: number): [number, number] {
  return [-x, -z];
}

// ---------------------------------------------------------------------------------------------
// Snapshot interpolation (guest)

export interface Sampled {
  /** Host time the sample shows (ms). */
  t: number;
  tops: [TopLike, TopLike];
  tilt: [number, number];
  /** How far past the newest snapshot this sample was extrapolated (ms). */
  extrapolated: number;
}

/**
 * Holds recent snapshots and renders them `delayMs` behind the host clock, so jitter and a lost
 * packet are absorbed. The clock offset follows the fastest arrival seen and creeps up slowly so a
 * lasting latency rise is picked up. Past the newest snapshot it extrapolates by velocity, capped.
 */
export class SnapshotBuffer {
  private snaps: SnapshotMsg[] = [];
  private offset = NaN;
  private lastNow = 0;
  private newestSeq = 0;
  shapes: PackedShape[] = [];
  shapesVersion = -1;
  /** Newest shapes version the host has announced; above shapesVersion means the list is stale. */
  announcedShapes = 0;

  delayMs: number;
  maxExtrapMs: number;
  private keep = 32;
  /** How fast the clock offset may drift up when no faster packet shows up (ms per s). */
  private creepPerS = 2;

  constructor(delayMs = 100, maxExtrapMs = 100) {
    this.delayMs = delayMs;
    this.maxExtrapMs = maxExtrapMs;
  }

  push(snap: SnapshotMsg, nowMs: number): void {
    if (this.snaps.some((s) => s.seq === snap.seq)) return;
    const sample = nowMs - snap.t;
    if (Number.isNaN(this.offset)) this.offset = sample;
    else this.offset = Math.min(sample, this.offset + (Math.max(0, nowMs - this.lastNow) / 1000) * this.creepPerS);
    this.lastNow = Math.max(this.lastNow, nowMs);
    this.announcedShapes = Math.max(this.announcedShapes, snap.sv);
    if (snap.shapes && snap.sv > this.shapesVersion) {
      this.shapes = snap.shapes;
      this.shapesVersion = snap.sv;
    }
    if (snap.seq < this.newestSeq - this.keep) return;
    this.newestSeq = Math.max(this.newestSeq, snap.seq);
    this.snaps.push(snap);
    this.snaps.sort((a, b) => a.t - b.t);
    if (this.snaps.length > this.keep) this.snaps.shift();
  }

  /** Host time currently rendered at local time `nowMs`. */
  renderTime(nowMs: number): number {
    return nowMs - this.offset - this.delayMs;
  }

  sample(nowMs: number): Sampled | null {
    const n = this.snaps.length;
    if (!n) return null;
    const rt = this.renderTime(nowMs);
    const first = this.snaps[0];
    if (rt <= first.t) return this.at(first, first, 0, first.t, 0);
    for (let i = 1; i < n; i++) {
      const b = this.snaps[i];
      if (rt <= b.t) {
        const a = this.snaps[i - 1];
        return this.at(a, b, (rt - a.t) / Math.max(1, b.t - a.t), rt, 0);
      }
    }
    const last = this.snaps[n - 1];
    const ex = Math.min(rt - last.t, this.maxExtrapMs);
    return this.at(last, last, 0, last.t + ex, ex);
  }

  private at(a: SnapshotMsg, b: SnapshotMsg, u: number, t: number, ex: number): Sampled {
    const lerp = (p: number, q: number) => p + (q - p) * u;
    const top = (i: 0 | 1): TopLike => {
      const p = a.tops[i];
      const q = b.tops[i];
      const s = unpackTop(p);
      if (s.state !== 'spinning') return s;
      const dt = ex / 1000;
      return { ...s, x: lerp(p[0], q[0]) + p[2] * dt, z: lerp(p[1], q[1]) + p[3] * dt, vx: lerp(p[2], q[2]), vz: lerp(p[3], q[3]),
        spin: lerp(p[4], q[4]), angle: lerp(p[5], q[5]), wobble: lerp(p[6], q[6]), damage: lerp(p[7], q[7]) };
    };
    return { t, tops: [top(0), top(1)], tilt: [lerp(a.tilt[0], b.tilt[0]), lerp(a.tilt[1], b.tilt[1])], extrapolated: ex };
  }
}

// ---------------------------------------------------------------------------------------------
// Reliable guest events

/** Numbers guest events and resends each one (at most every `resendMs`) until the host acks it. */
export class EventSender {
  private seq = 0;
  private pending: { msg: EventMsg; sentAt: number }[] = [];

  private send: (msg: NetMsg) => void;
  resendMs: number;

  constructor(send: (msg: NetMsg) => void, resendMs = 150) {
    this.send = send;
    this.resendMs = resendMs;
  }

  push(ev: GuestEvent, nowMs: number): number {
    const msg: EventMsg = { type: 'event', seq: ++this.seq, ev };
    this.pending.push({ msg, sentAt: nowMs });
    this.send(msg);
    return msg.seq;
  }

  /** Acks are cumulative: everything up to `seq` has been applied. */
  ack(seq: number): void {
    this.pending = this.pending.filter((p) => p.msg.seq > seq);
  }

  tick(nowMs: number): void {
    for (const p of this.pending) {
      if (nowMs - p.sentAt < this.resendMs) continue;
      p.sentAt = nowMs;
      this.send(p.msg);
    }
  }

  get unacked(): number {
    return this.pending.length;
  }
}

/** Applies each event exactly once, in seq order, and acks the highest contiguous seq. */
export class EventReceiver {
  private applied = 0;
  private early = new Map<number, GuestEvent>();

  private apply: (ev: GuestEvent, seq: number) => void;
  private send: (msg: NetMsg) => void;

  constructor(apply: (ev: GuestEvent, seq: number) => void, send: (msg: NetMsg) => void) {
    this.apply = apply;
    this.send = send;
  }

  receive(msg: EventMsg): void {
    // Only a short window ahead is held: a peer skipping sequence numbers cannot grow this without bound.
    if (Number.isInteger(msg.seq) && msg.seq > this.applied && msg.seq <= this.applied + 256) this.early.set(msg.seq, msg.ev);
    // An empty slot still counts (a bad event is skipped, never a jam for the ones behind it).
    while (this.early.has(this.applied + 1)) {
      const ev = this.early.get(this.applied + 1);
      this.early.delete(++this.applied);
      if (ev) this.apply(ev, this.applied);
    }
    this.send({ type: 'ack', seq: this.applied });
  }

  get count(): number {
    return this.applied;
  }
}

/** Drops hands frames older than the newest one seen. */
export class HandsReceiver {
  private last = 0;
  latest: HandsMsg | null = null;

  receive(msg: HandsMsg): boolean {
    if (msg.seq <= this.last) return false;
    this.last = msg.seq;
    this.latest = msg;
    return true;
  }
}

// ---------------------------------------------------------------------------------------------
// Room codes

/** No 0/O, 1/I/L, so a code read aloud or off a headset screen is not misheard. */
export const ROOM_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const ROOM_CODE_LENGTH = 5;

export function newRoomCode(rand: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) s += ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length)];
  return s;
}

export function isRoomCode(s: string): boolean {
  return s.length === ROOM_CODE_LENGTH && [...s].every((c) => ROOM_ALPHABET.includes(c));
}

// ---------------------------------------------------------------------------------------------
// Transports

export interface Transport {
  send(msg: NetMsg): void;
  onMessage(cb: (msg: NetMsg) => void): void;
  onPeer(cb: (joined: boolean) => void): void;
  close(): void;
  readonly peers: number;
}

/** Shared callback plumbing for the transports. */
abstract class BaseTransport implements Transport {
  protected msgCbs: ((msg: NetMsg) => void)[] = [];
  protected peerCbs: ((joined: boolean) => void)[] = [];
  peers = 0;

  abstract send(msg: NetMsg): void;
  abstract close(): void;

  onMessage(cb: (msg: NetMsg) => void): void {
    this.msgCbs.push(cb);
  }

  onPeer(cb: (joined: boolean) => void): void {
    this.peerCbs.push(cb);
  }

  protected deliver(data: unknown): void {
    const msg = parseMsg(data);
    if (msg) for (const cb of this.msgCbs) cb(msg);
  }

  protected setPeers(n: number): void {
    if (n === this.peers) return;
    const joined = n > this.peers;
    this.peers = n;
    for (const cb of this.peerCbs) cb(joined);
  }
}

/** Mulberry32: small deterministic PRNG for the loopback link and tests. */
export function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface LoopbackOptions {
  /** One-way latency (ms); RTT is twice this. */
  latencyMs?: number;
  /** Uniform jitter of +-jitterMs on each packet; packets may reorder, as on UDP. */
  jitterMs?: number;
  /** Chance each packet is dropped. */
  loss?: number;
  seed?: number;
}

class LoopbackEnd extends BaseTransport {
  other!: LoopbackEnd;
  open = true;
  bytes = 0;
  packets = 0;

  private link: LoopbackLink;

  constructor(link: LoopbackLink) {
    super();
    this.link = link;
  }

  send(msg: NetMsg): void {
    if (!this.open) return;
    const wire = JSON.stringify(msg);
    this.bytes += wire.length;
    this.packets++;
    this.link.carry(this.other, wire);
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.setPeers(0);
    this.link.at(this.link.now, () => this.other.setPeers(0));
  }

  receive(wire: string): void {
    if (this.open) this.deliver(wire);
  }

  join(): void {
    this.setPeers(1);
  }
}

class LoopbackLink {
  now = 0;
  private queue: { at: number; n: number; fn: () => void }[] = [];
  private n = 0;
  private rand: () => number;
  /** Drop everything until this time (ms), to test an outage. */
  blackoutUntil = -1;

  private opts: Required<LoopbackOptions>;

  constructor(opts: Required<LoopbackOptions>) {
    this.opts = opts;
    this.rand = prng(opts.seed);
  }

  at(time: number, fn: () => void): void {
    this.queue.push({ at: time, n: this.n++, fn });
  }

  carry(to: LoopbackEnd, wire: string): void {
    const lost = this.rand() < this.opts.loss;
    const delay = this.opts.latencyMs + (this.rand() * 2 - 1) * this.opts.jitterMs;
    if (lost || this.now < this.blackoutUntil) return;
    this.at(this.now + Math.max(0, delay), () => to.receive(wire));
  }

  /** Advances the clock, delivering due packets in time order. */
  tick(ms: number): void {
    const end = this.now + ms;
    for (;;) {
      this.queue.sort((a, b) => a.at - b.at || a.n - b.n);
      const next = this.queue[0];
      if (!next || next.at > end) break;
      this.queue.shift();
      this.now = Math.max(this.now, next.at);
      next.fn();
    }
    this.now = end;
  }
}

export interface LoopbackPair {
  a: LoopbackEnd;
  b: LoopbackEnd;
  readonly now: number;
  tick(ms: number): void;
  blackout(ms: number): void;
}

/** Two connected in-memory ends on a manual clock: deterministic latency, jitter and loss. */
export function loopbackPair(options: LoopbackOptions = {}): LoopbackPair {
  const link = new LoopbackLink({ latencyMs: 0, jitterMs: 0, loss: 0, seed: 1, ...options });
  const a = new LoopbackEnd(link);
  const b = new LoopbackEnd(link);
  a.other = b;
  b.other = a;
  link.at(0, () => {
    a.join();
    b.join();
  });
  return {
    a,
    b,
    get now() {
      return link.now;
    },
    tick: (ms) => link.tick(ms),
    blackout: (ms) => {
      link.blackoutUntil = link.now + ms;
    },
  };
}

/** Two tabs on one origin (emulator testing). Presence by heartbeat, since a closed tab says nothing. */
export class BroadcastChannelTransport extends BaseTransport {
  private ch: BroadcastChannel;
  private id = Math.random().toString(36).slice(2);
  private peer: string | null = null;
  private seen = 0;
  private timer: ReturnType<typeof setInterval>;

  private beatMs: number;

  constructor(room: string, beatMs = 1000) {
    super();
    this.beatMs = beatMs;
    this.ch = new BroadcastChannel(`${APP_ID}:${room}`);
    this.ch.onmessage = (e: MessageEvent) => this.onData(e.data);
    this.beat();
    this.timer = setInterval(() => {
      this.beat();
      if (this.peer && Date.now() - this.seen > this.beatMs * 3.5) this.drop();
    }, this.beatMs);
  }

  private beat(): void {
    this.ch.postMessage({ from: this.id, beat: 1 });
  }

  private drop(): void {
    this.peer = null;
    this.setPeers(0);
  }

  private onData(d: { from?: string; beat?: number; leave?: number; msg?: unknown }): void {
    if (!d?.from || (this.peer && d.from !== this.peer)) return;
    if (d.leave) return this.drop();
    if (!this.peer) {
      this.peer = d.from;
      this.beat();
      this.setPeers(1);
    }
    this.seen = Date.now();
    if (d.msg) this.deliver(d.msg);
  }

  send(msg: NetMsg): void {
    this.ch.postMessage({ from: this.id, msg });
  }

  close(): void {
    clearInterval(this.timer);
    this.ch.postMessage({ from: this.id, leave: 1 });
    this.ch.close();
    this.drop();
  }
}

export type ConnectState = 'joining' | 'waiting' | 'connected' | 'failed' | 'closed';

/**
 * Internet play over WebRTC, matched through trystero's default (Nostr relay) signaling. Only public
 * STUN is used (trystero's defaults), so peers behind symmetric NAT may not connect without TURN.
 * The library is loaded on demand so it stays out of the main bundle.
 */
export class TrysteroTransport extends BaseTransport {
  connectState: ConnectState = 'joining';
  error: string | null = null;
  /** Resolves when a peer joins; rejects on a join error or when nobody turns up in time. */
  readonly ready: Promise<void>;
  private room: Room | null = null;
  private action: MessageAction<string> | null = null;
  private peer: string | null = null;
  private stateCbs: ((s: ConnectState) => void)[] = [];

  constructor(code: string, timeoutMs = 30000) {
    super();
    this.ready = new Promise<void>((resolve, reject) => {
      const fail = (why: string) => {
        if (this.connectState === 'connected' || this.connectState === 'closed') return;
        this.error = why;
        this.setState('failed');
        void this.room?.leave();
        reject(new Error(why));
      };
      const timer = setTimeout(() => fail(`No one joined in ${Math.round(timeoutMs / 1000)} s`), timeoutMs);
      import('trystero')
        .then(({ joinRoom }) => {
          if (this.connectState !== 'joining') return;
          const room = joinRoom({ appId: APP_ID }, code, {
            onJoinError: (e) => fail(e.error),
          });
          this.room = room;
          const action = room.makeAction<string>('duel');
          this.action = action;
          action.onMessage = (data, ctx) => {
            if (ctx.peerId === this.peer) this.deliver(data);
          };
          room.onPeerJoin = (id) => {
            if (this.peer) return; // a duel has room for one opponent
            this.peer = id;
            clearTimeout(timer);
            this.setState('connected');
            this.setPeers(1);
            resolve();
          };
          room.onPeerLeave = (id) => {
            if (id !== this.peer) return;
            this.peer = null;
            this.setState('waiting');
            this.setPeers(0);
          };
          this.setState('waiting');
        })
        .catch((e: unknown) => fail(`Online is unavailable right now${e instanceof Error && e.message ? ` (${e.message.slice(0, 40)})` : ''}`));
    });
    this.ready.catch(() => {}); // callers that only watch connectState must not see an unhandled rejection
  }

  onState(cb: (s: ConnectState) => void): void {
    this.stateCbs.push(cb);
  }

  private setState(s: ConnectState): void {
    this.connectState = s;
    for (const cb of this.stateCbs) cb(s);
  }

  send(msg: NetMsg): void {
    if (this.peer) void this.action?.send(JSON.stringify(msg), { target: this.peer });
  }

  close(): void {
    if (this.connectState === 'closed') return;
    if (this.peer) this.send({ type: 'bye' });
    this.setState('closed');
    void this.room?.leave();
    this.peer = null;
    this.setPeers(0);
  }
}
