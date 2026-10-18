/**
 * The online duel (beta): one host, one guest, the host's simulation the only one. The host sends
 * snapshots of both tops and the floor at 30 Hz and says when a round launches and how it ended;
 * the guest sends what its hands did (a rip, a ramp, a forge) as events, applied once each.
 * Opened from the address: ?online=host makes a room and shows its code, ?online=CODE joins one;
 * &net=bc keeps it inside one browser (two tabs) for testing. No three.js here.
 */
import { BroadcastChannelTransport, EventReceiver, HandsReceiver, EventSender, isRoomCode, NET_VERSION, newRoomCode, SnapshotBuffer, SnapshotEncoder, SNAPSHOT_HZ, TrysteroTransport } from './net.ts';
import type { GuestEvent, NetMsg, PackedShape, TopLike, Transport, Vec3 } from './net.ts';
import type { FloorShape } from './sim.ts';

export type Role = 'host' | 'guest';

export class OnlineLink {
  /** A peer has said hello with a matching protocol. */
  peer = false;
  peerName = '';
  peerBuild = '';
  buffer = new SnapshotBuffer();
  /** The floor as the host last sent it (guest), with its version. */
  shapes: PackedShape[] = [];
  shapesVersion = -1;
  onHello: (() => void) | null = null;
  onEvent: ((ev: GuestEvent) => void) | null = null;
  onLaunch: ((round: number, arena: string, layout?: unknown) => void) | null = null;
  onResult: ((winner: number, heat: [number, number]) => void) | null = null;
  onLeft: (() => void) | null = null;
  private encoder = new SnapshotEncoder();
  private sender: EventSender | null = null;
  private receiver: EventReceiver | null = null;
  private lastSnap = -1e9;
  /** The other smith's hands, latest wins (arena-local, in their frame), and when they came. */
  hands = new HandsReceiver();
  handsAt = -1e9;
  private handsSeq = 0;
  private lastHands = -1e9;

  constructor(
    readonly role: Role,
    readonly code: string,
    readonly transport: Transport,
    private readonly build: string,
    private readonly name: string,
  ) {
    const send = (m: NetMsg) => transport.send(m);
    if (role === 'guest') this.sender = new EventSender(send);
    else this.receiver = new EventReceiver((ev) => this.onEvent?.(ev), send);
    transport.onMessage((m) => this.handle(m));
    transport.onPeer((joined) => {
      if (joined) this.hello();
      else {
        this.peer = false;
        this.onLeft?.();
      }
    });
    this.hello();
  }

  /** Fresh counters, buffers and floor for a new peer. */
  private reset() {
    const send = (m: NetMsg) => this.transport.send(m);
    if (this.role === 'guest') this.sender = new EventSender(send);
    else this.receiver = new EventReceiver((ev) => this.onEvent?.(ev), send);
    this.encoder = new SnapshotEncoder();
    this.buffer = new SnapshotBuffer();
    this.hands = new HandsReceiver();
    this.shapes = [];
    this.shapesVersion = -1;
  }

  private hello() {
    this.transport.send({ type: 'hello', v: NET_VERSION, build: this.build, name: this.name });
  }

  private handle(m: NetMsg) {
    const now = performance.now();
    if (m.type === 'hello') {
      if (m.v !== NET_VERSION) return;
      const fresh = !this.peer;
      // A new peer numbers everything from 1 again: start the counters over for them.
      if (fresh) this.reset();
      this.peer = true;
      this.peerName = m.name;
      this.peerBuild = m.build;
      // Answer once so a peer that joined late still hears us.
      if (fresh) {
        this.hello();
        this.onHello?.();
      }
    } else if (m.type === 'event' && this.receiver) this.receiver.receive(m);
    else if (m.type === 'ack' && this.sender) this.sender.ack(m.seq);
    else if (m.type === 'hands') {
      if (this.hands.receive(m)) this.handsAt = now;
    }
    else if (m.type === 'snapshot' && this.role === 'guest') {
      this.buffer.push(m, now);
      if (this.buffer.shapesVersion !== this.shapesVersion) {
        this.shapesVersion = this.buffer.shapesVersion;
        this.shapes = this.buffer.shapes;
      }
    } else if (m.type === 'start' && this.role === 'guest') {
      // A new round: last round's final positions must not show at its start.
      if (m.round >= 0) this.buffer = new SnapshotBuffer();
      this.onLaunch?.(m.round, m.arena, m.layout);
    } else if (m.type === 'result' && this.role === 'guest') this.onResult?.(m.winner, m.heat);
    else if (m.type === 'bye') {
      this.peer = false;
      this.onLeft?.();
    }
  }

  /** Guest: one thing the hands did, resent until the host has it. */
  sendEvent(ev: GuestEvent) {
    this.sender?.push(ev, performance.now());
  }

  /** Both sides: your hands' pinch points (arena-local, your frame) at most 20 times a second, so the other table sees them. */
  sendHands(l: Vec3 | null, r: Vec3 | null, lp: boolean, rp: boolean) {
    const now = performance.now();
    if (!this.peer || now - this.lastHands < 50) return;
    this.lastHands = now;
    const q = (v: Vec3 | null): Vec3 | null => (v ? [Math.round(v[0] * 1e4) / 1e4, Math.round(v[1] * 1e4) / 1e4, Math.round(v[2] * 1e4) / 1e4] : null);
    this.transport.send({ type: 'hands', seq: ++this.handsSeq, l: q(l), r: q(r), lp, rp });
  }

  /** Every frame: resends what is unacknowledged. */
  tick() {
    this.sender?.tick(performance.now());
  }

  /** Host: both tops (host's first) and the floor, at most 30 times a second. */
  snapshot(tMs: number, tops: [TopLike, TopLike], tilt: [number, number], shapes: readonly FloorShape[], force = false) {
    const now = performance.now();
    if (!this.peer || (!force && now - this.lastSnap < 1000 / SNAPSHOT_HZ)) return;
    this.lastSnap = now;
    this.transport.send(this.encoder.encode(tMs, tops, tilt, shapes));
  }

  /** Host: the round's tops have left the launchers (round -1: a match begins in this arena). */
  launched(round: number, arena: string, layout?: unknown) {
    this.transport.send({ type: 'start', arena, seed: 0, round, ...(layout ? { layout } : {}) });
  }

  /** Host: the round ended; winner 1 is the host, -1 the guest, 2 a draw. */
  result(winner: number, heat: [number, number]) {
    this.transport.send({ type: 'result', winner, heat });
  }

  close() {
    this.transport.send({ type: 'bye' });
    this.transport.close();
  }
}

/** The link the address asks for, or null: ?online=host (a new room) or ?online=CODE, &net=bc for one browser. */
export function linkFromAddress(search: string, build: string, name: string): OnlineLink | null {
  const q = new URLSearchParams(search);
  const want = (q.get('online') ?? '').toUpperCase();
  if (!want) return null;
  const host = want === 'HOST';
  if (!host && !isRoomCode(want)) return null;
  const code = host ? newRoomCode() : want;
  // The host waits for a friend for up to ten minutes; a guest gives up on a dead code after 30 s.
  const transport = q.get('net') === 'bc' ? new BroadcastChannelTransport(code) : new TrysteroTransport(code, host ? 600_000 : 30_000);
  return new OnlineLink(host ? 'host' : 'guest', code, transport, build, name);
}
