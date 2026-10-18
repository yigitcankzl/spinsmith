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
  onLaunch: ((round: number, arena: string, layout?: unknown, builds?: [string, string]) => void) | null = null;
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

  readonly role: Role;
  readonly code: string;
  readonly transport: Transport;
  private readonly build: string;
  private readonly name: string;

  constructor(role: Role, code: string, transport: Transport, build: string, name: string) {
    this.role = role;
    this.code = code;
    this.transport = transport;
    this.build = build;
    this.name = name;
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
      // Untrusted: anything that is not a short string is ignored.
      this.peerName = typeof m.name === 'string' ? m.name.slice(0, 40) : '';
      this.peerBuild = typeof m.build === 'string' ? m.build.slice(0, 64) : '';
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
      if (!validSnapshot(m)) return;
      this.buffer.push(m, now);
      if (this.buffer.shapesVersion !== this.shapesVersion) {
        this.shapesVersion = this.buffer.shapesVersion;
        this.shapes = this.buffer.shapes;
      }
    } else if (m.type === 'start' && this.role === 'guest') {
      // A new round: last round's final positions must not show at its start.
      if (m.round >= 0) this.buffer = new SnapshotBuffer();
      const builds = Array.isArray(m.builds) && m.builds.length === 2 && m.builds.every((b) => typeof b === 'string' && b.length <= 64) ? m.builds : undefined;
      this.onLaunch?.(m.round, m.arena, m.layout, builds);
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
  launched(round: number, arena: string, layout?: unknown, builds?: [string, string]) {
    this.transport.send({ type: 'start', arena, seed: 0, round, ...(layout ? { layout } : {}), ...(builds ? { builds } : {}) });
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

/**
 * Host: a guest's launch spot, kept finite, inside the launch ring (max) and `gap` clear of the
 * host's own spot; null when it is not a number at all.
 */
export function clampGuestSpot(at: [number, number], sx: number, sz: number, max: number, gap: number): [number, number] | null {
  if (!Array.isArray(at) || at.length < 2) return null;
  let [x, z] = at;
  if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
  const r = Math.hypot(x, z);
  if (r > max) [x, z] = [(x / r) * max, (z / r) * max];
  const d = Math.hypot(x - sx, z - sz);
  if (d < gap) {
    const ux = d > 1e-6 ? (x - sx) / d : 0;
    const uz = d > 1e-6 ? (z - sz) / d : -1;
    [x, z] = [sx + ux * gap, sz + uz * gap];
  }
  return [x, z];
}

/**
 * Guest: the score to stand at before finish() adds this round's points, so it ends equal to the
 * host's post-round heat seen from this side. v: 1 the guest won the round, -1 lost, 2 a draw.
 */
export function guestPointsBefore(heat: [number, number], v: 1 | -1 | 2, points: number): [number, number] {
  if (v === 2) return [heat[1], heat[0]];
  return [heat[1] - (v === 1 ? points : 0), heat[0] - (v === -1 ? points : 0)];
}

const FORGE_ACTIONS = ['squeeze', 'stretch', 'twist', 'tilt'];
const SEAL_NAMES = ['anvil', 'rush', 'magnet', 'tilt', 'hammer', 'ward'];

/**
 * Host: a guest's event made safe before it touches the simulation (a buggy or hostile peer). Every
 * number must be finite and is clamped to what a hand could do in this arena (`radius`, arena-local);
 * unknown kinds, actions or seals are dropped. Returns null when the event cannot be used at all.
 */
export function sanitizeGuestEvent(ev: GuestEvent, radius: number, maxAim: number): GuestEvent | null {
  if (!ev || typeof ev !== 'object') return null;
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const reach = radius * 1.5;
  const pos = (v: number) => clamp(v, -reach, reach);
  const pair = (p: unknown): [number, number] | undefined => (Array.isArray(p) && p.length >= 2 && num(p[0]) && num(p[1]) ? [pos(p[0]), pos(p[1])] : undefined);
  switch (ev.kind) {
    case 'rip': {
      if (!num(ev.power) || !num(ev.aim)) return null;
      const at = pair(ev.at);
      // A direction, not a place: normalised, never clamped to the arena.
      const d = Array.isArray(ev.dir) && ev.dir.length >= 2 && num(ev.dir[0]) && num(ev.dir[1]) ? Math.hypot(ev.dir[0], ev.dir[1]) : 0;
      const dir: [number, number] | undefined = d > 1e-6 ? [ev.dir![0] / d, ev.dir![1] / d] : undefined;
      const build = typeof ev.build === 'string' ? ev.build.slice(0, 64) : undefined;
      return { kind: 'rip', power: clamp(ev.power, 0, 1), aim: clamp(ev.aim, -maxAim, maxAim), steep: num(ev.steep) ? clamp(ev.steep, 0, 1) : 0, twist: num(ev.twist) ? clamp(ev.twist, -1, 1) : 0, ...(build ? { build } : {}), ...(at ? { at } : {}), ...(dir ? { dir } : {}) };
    }
    case 'ramp':
      if (![ev.x, ev.z, ev.dx, ev.dz].every(num)) return null;
      return { kind: 'ramp', x: pos(ev.x), z: pos(ev.z), dx: clamp(ev.dx, -1, 1), dz: clamp(ev.dz, -1, 1) };
    case 'rim':
      if (![ev.sx, ev.sz, ev.x, ev.z, ev.f].every(num)) return null;
      return { kind: 'rim', sx: pos(ev.sx), sz: pos(ev.sz), x: pos(ev.x), z: pos(ev.z), f: clamp(ev.f, 0, 1.5) };
    case 'cup':
      if (!num(ev.x) || !num(ev.z)) return null;
      return { kind: 'cup', x: pos(ev.x), z: pos(ev.z) };
    case 'sling':
      if (!num(ev.px) || !num(ev.pz)) return null;
      return { kind: 'sling', px: clamp(ev.px, -reach, reach), pz: clamp(ev.pz, -reach, reach) };
    case 'strike':
      if (!num(ev.x) || !num(ev.z)) return null;
      return { kind: 'strike', x: pos(ev.x), z: pos(ev.z), ...(typeof ev.seal === 'string' && SEAL_NAMES.includes(ev.seal) ? { seal: ev.seal } : {}) };
    case 'forge': {
      if (typeof ev.action !== 'string' || !FORGE_ACTIONS.includes(ev.action) || ![ev.pull, ev.twist, ev.tilt].every(num)) return null;
      const sx = num(ev.sx) ? clamp(ev.sx as number, -1, 1) : undefined;
      const sz = num(ev.sz) ? clamp(ev.sz as number, -1, 1) : undefined;
      return { kind: 'forge', action: ev.action, pull: clamp(ev.pull, -0.3, 0.3), twist: clamp(ev.twist, -0.4, 0.4), tilt: clamp(ev.tilt, -0.12, 0.12), sign: ev.sign < 0 ? -1 : 1, ...(sx !== undefined ? { sx } : {}), ...(sz !== undefined ? { sz } : {}), force: num(ev.force) ? clamp(ev.force as number, 0, 1.5) : 1 };
    }
    default:
      return null;
  }
}

/** Guest: a host snapshot is used only when every number in it is finite (a bad packet never reaches the view). */
export function validSnapshot(m: { t: unknown; seq: unknown; tops: unknown; tilt: unknown; shapes?: unknown }): boolean {
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
  const nums = (a: unknown, n: number) => Array.isArray(a) && a.length >= n && a.slice(0, n).every(num);
  if (!num(m.t) || !num(m.seq) || !Array.isArray(m.tops) || m.tops.length < 2 || !m.tops.every((t) => nums(t, 10)) || !nums(m.tilt, 2)) return false;
  return m.shapes === undefined || (Array.isArray(m.shapes) && m.shapes.every((p) => nums(p, 7)));
}
