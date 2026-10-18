/**
 * Headless check for the online duel protocol. Run: npm run check:net
 * A host moves two tops along known curves at 120 Hz and streams 30 Hz snapshots over a lossy,
 * jittery loopback link (200 ms RTT, +-30 ms, 5% loss); the guest's interpolated view must stay
 * on the curves, survive an outage, and every guest event must be applied exactly once, in order.
 */
import { clampGuestSpot, guestPointsBefore, sanitizeGuestEvent, validSnapshot } from '../src/game/online.ts';
import assert from 'node:assert/strict';
import {
  EventReceiver, EventSender, HandsReceiver, isRoomCode, loopbackPair, mirror, newRoomCode, parseMsg, prng,
  ROOM_ALPHABET, SnapshotBuffer, SnapshotEncoder, unpackTop,
} from '../src/game/net.ts';
import type { GuestEvent, NetMsg, TopLike } from '../src/game/net.ts';
import type { FloorShape } from '../src/game/sim.ts';

const HOST_HZ = 120;
const SNAP_EVERY = HOST_HZ / 30;
const DT_MS = 1000 / HOST_HZ;
/**
 * Allowed guest error (m, arena-local). A top's footprint is about 2 cm across arena-local, so 1.5 cm
 * keeps the drawn top overlapping its true spot; quantization (0.1 mm) and chord error at 30 Hz are
 * far below it, so what is left is extrapolation through a lost packet.
 */
const MAX_ERR = 0.015;

/** Top A: a 12 cm circle at 0.3 m/s (a typical sim speed). Top B: a figure eight peaking near 0.6 m/s. */
function curve(i: 0 | 1, tMs: number): TopLike {
  const t = tMs / 1000;
  let x: number, z: number, vx: number, vz: number;
  if (i === 0) {
    const w = 0.3 / 0.12;
    [x, z, vx, vz] = [0.12 * Math.cos(w * t), 0.12 * Math.sin(w * t), -0.3 * Math.sin(w * t), 0.3 * Math.cos(w * t)];
  } else {
    const w = 2;
    [x, z, vx, vz] = [0.15 * Math.sin(w * t), 0.08 * Math.sin(2 * w * t), 0.3 * Math.cos(w * t), 0.32 * Math.cos(2 * w * t)];
  }
  return { x, z, vx, vz, spin: 1 - t / 60, angle: 20 * t, wobble: 0, damage: 0, state: 'spinning', finish: null };
}

// Room codes and mirror -------------------------------------------------------------------------
{
  const rand = prng(7);
  for (let i = 0; i < 2000; i++) assert.ok(isRoomCode(newRoomCode(rand)));
  for (const bad of ['0ABCD', 'OABCD', '1ABCD', 'IABCD', 'abcde', 'ABCD', 'ABCDEF', '']) assert.ok(!isRoomCode(bad), bad);
  assert.ok(!/[01OI]/.test(ROOM_ALPHABET));
  for (const [x, z] of [[0.1, -0.2], [0, 0], [-0.05, 0.13]]) {
    const [mx, mz] = mirror(x, z);
    assert.deepEqual([mx, mz], [-x, -z]);
    assert.deepEqual(mirror(mx, mz), [x, z]);
  }
  assert.equal(parseMsg('{"type":"nope"}'), null);
  assert.equal(parseMsg('not json'), null);
  assert.equal(parseMsg('{"type":"bye"}')?.type, 'bye');
}

// Full duel over a bad link ---------------------------------------------------------------------
{
  const link = loopbackPair({ latencyMs: 100, jitterMs: 30, loss: 0.05, seed: 42 });
  const host = link.a;
  const guest = link.b;
  const enc = new SnapshotEncoder();
  const buf = new SnapshotBuffer();
  const shapes: FloorShape[] = [];

  // Guest events: host applies them; guest learns about acks.
  const applied: { seq: number; ev: GuestEvent }[] = [];
  const recv = new EventReceiver((ev, seq) => applied.push({ seq, ev }), (m) => host.send(m));
  const sender = new EventSender((m) => guest.send(m));
  const hands = new HandsReceiver();
  let staleHands = 0;
  host.onMessage((m: NetMsg) => {
    if (m.type === 'event') recv.receive(m);
    if (m.type === 'hands' && !hands.receive(m)) staleHands++;
  });
  guest.onMessage((m: NetMsg) => {
    if (m.type === 'snapshot') buf.push(m, link.now);
    if (m.type === 'ack') sender.ack(m.seq);
  });
  let joined = 0;
  host.onPeer((j) => j && joined++);
  guest.onPeer((j) => j && joined++);

  const errs: number[] = [];
  let maxDelay = 0;
  let maxExtrap = 0;
  let sent = 0;
  const pushed: GuestEvent[] = [];
  const outageAt = 6000;
  const outageMs = 400;
  const recoverErrs: number[] = [];
  let shapesSeenAt = -1;
  const SECONDS = 20;

  for (let step = 0; step < SECONDS * HOST_HZ; step++) {
    const now = step * DT_MS;
    if (Math.abs(now - outageAt) < DT_MS / 2) link.blackout(outageMs);
    // A ramp appears during the outage: its only change-carrying snapshots are lost, so the refresh must deliver it.
    if (Math.abs(now - (outageAt + 50)) < DT_MS / 2) {
      shapes.push({ kind: 'ramp', x: 0.05, z: -0.04, dx: 0, dz: 1, amp: 0.004, age: 0, owner: 'player' });
    }
    if (step % SNAP_EVERY === 0) host.send(enc.encode(now, [curve(0, now), curve(1, now)], [0.01, -0.02], shapes));
    if (step % 37 === 5 && sent < 120) {
      const ev: GuestEvent = sent % 3 === 0 ? { kind: 'ramp', x: 0.01 * sent, z: 0, dx: 1, dz: 0 }
        : sent % 3 === 1 ? { kind: 'strike', x: 0, z: 0.001 * sent } : { kind: 'cup', x: -0.01, z: 0.002 * sent };
      pushed.push(ev);
      sender.push(ev, now);
      sent++;
    }
    if (step % 4 === 0) guest.send({ type: 'hands', seq: step, l: [0, 1, 0], r: null, lp: false, rp: step % 8 === 0 });
    sender.tick(now);
    link.tick(DT_MS);

    if (buf.shapesVersion >= 1 && shapesSeenAt < 0) shapesSeenAt = link.now;
    const s = buf.sample(link.now);
    if (!s || link.now < 1000) continue;
    maxExtrap = Math.max(maxExtrap, s.extrapolated);
    let e = 0;
    for (const i of [0, 1] as const) {
      const truth = curve(i, s.t);
      e = Math.max(e, Math.hypot(s.tops[i].x - truth.x, s.tops[i].z - truth.z));
    }
    const inOutage = link.now >= outageAt && link.now < outageAt + outageMs + 400;
    if (inOutage) {
      // During the outage the view freezes after the extrapolation cap rather than flying off.
      assert.ok(s.extrapolated <= buf.maxExtrapMs);
    } else {
      errs.push(e);
      maxDelay = Math.max(maxDelay, link.now - s.t);
      if (link.now >= outageAt + outageMs + 400 && link.now < outageAt + outageMs + 1400) recoverErrs.push(e);
    }
  }
  // Drain the link so resends finish.
  for (let i = 0; i < 400; i++) {
    sender.tick(SECONDS * 1000 + i * 10);
    link.tick(10);
  }

  errs.sort((a, b) => a - b);
  const p50 = errs[Math.floor(errs.length * 0.5)];
  const p99 = errs[Math.floor(errs.length * 0.99)];
  const max = errs[errs.length - 1];
  console.log(`interp error (m): p50 ${p50.toFixed(5)}  p99 ${p99.toFixed(5)}  max ${max.toFixed(5)}  (limit ${MAX_ERR})`);
  console.log(`render delay max (outside the outage) ${maxDelay.toFixed(0)} ms, extrapolation max ${maxExtrap.toFixed(0)} ms`);
  console.log(`after outage: max error ${Math.max(...recoverErrs).toFixed(5)} m; shapes v1 seen at ${shapesSeenAt.toFixed(0)} ms`);
  console.log(`events: ${sent} sent, ${applied.length} applied, stale hands dropped ${staleHands}`);
  console.log(`host upstream ${(host.bytes / SECONDS / 1024).toFixed(1)} KiB/s over ${host.packets} packets; guest ${(guest.bytes / SECONDS / 1024).toFixed(1)} KiB/s`);

  assert.equal(joined, 2);
  assert.ok(max < MAX_ERR, `interpolation error ${max} >= ${MAX_ERR}`);
  assert.ok(recoverErrs.length > 50 && Math.max(...recoverErrs) < MAX_ERR, 'view recovers after a dropped stretch');
  // Render delay: one-way latency (<= 130) + buffer (100) + the offset's slow creep.
  assert.ok(maxDelay < 260, `render delay ${maxDelay}`);
  assert.ok(shapesSeenAt > 0 && shapesSeenAt < outageAt + outageMs + 1100, 'shape change arrives within a few refreshes after the outage');
  assert.equal(buf.shapes.length, 1);
  assert.equal(buf.shapes[0][1], 0);
  assert.equal(applied.length, sent, 'every event applied');
  applied.forEach((a, i) => {
    assert.equal(a.seq, i + 1, 'applied in seq order, once each');
    assert.deepEqual(a.ev, pushed[i]);
  });
  assert.equal(sender.unacked, 0, 'all events acked');
}

// Duplicates and reordering ---------------------------------------------------------------------
{
  const buf = new SnapshotBuffer(100, 100);
  const enc = new SnapshotEncoder();
  const snaps = [0, 33, 67, 100].map((t) => enc.encode(t, [curve(0, t), curve(1, t)], [0, 0], []));
  for (const i of [2, 0, 3, 1, 1, 2]) buf.push(snaps[i], 1000 + snaps[i].t);
  const s = buf.sample(1000 + 50 + 100)!; // offset 1000, so render time 50 ms
  assert.ok(Math.abs(s.t - 50) < 0.5, `render time ${s.t}`); // offset creep adds 2 ms/s at most
  const truth = curve(0, 50);
  assert.ok(Math.hypot(s.tops[0].x - truth.x, s.tops[0].z - truth.z) < 0.001);

  const applied: number[] = [];
  const acks: number[] = [];
  const recv = new EventReceiver((_, seq) => applied.push(seq), (m) => m.type === 'ack' && acks.push(m.seq));
  for (const seq of [2, 1, 1, 3, 2, 5, 4, 5]) recv.receive({ type: 'event', seq, ev: { kind: 'cup', x: 0, z: 0 } });
  assert.deepEqual(applied, [1, 2, 3, 4, 5]);
  assert.deepEqual(acks, [0, 2, 2, 3, 3, 3, 5, 5]);

  const knocked = unpackTop(enc.encode(0, [{ ...curve(0, 0), state: 'out', finish: 'pocket' }, curve(1, 0)], [0, 0], []).tops[0]);
  assert.equal(knocked.state, 'out');
  assert.equal(knocked.finish, 'pocket');
}

console.log('net check: OK');

// Online helpers that live in the game: the guest's checked launch spot and the guest's score sync.
{
  assert.deepEqual(clampGuestSpot([0.05, -0.1], 0, 0.1, 0.136, 0.05), [0.05, -0.1], 'a fair guest spot stands');
  const far = clampGuestSpot([0, -1], 0, 0.1, 0.136, 0.05)!;
  assert.ok(Math.abs(Math.hypot(far[0], far[1]) - 0.136) < 1e-9, 'a spot past the launch ring is pulled in');
  const near = clampGuestSpot([0.01, 0.1], 0, 0.1, 0.136, 0.05)!;
  assert.ok(Math.hypot(near[0] - 0, near[1] - 0.1) >= 0.05 - 1e-9, 'a spot on top of the host is pushed clear');
  assert.equal(clampGuestSpot([NaN, 0], 0, 0.1, 0.136, 0.05), null, 'nonsense is refused');
  // Host heat [host, guest] after the round; the guest stands so that adding its points lands there.
  assert.deepEqual(guestPointsBefore([1, 3], 1, 2), [1, 1], 'guest won 2: it stood at 1 before, host at 1');
  assert.deepEqual(guestPointsBefore([3, 1], -1, 2), [1, 1], 'guest lost 2: host stood at 1 before');
  assert.deepEqual(guestPointsBefore([2, 2], 2, 0), [2, 2], 'a draw changes nothing');
  console.log('online helpers: ok');
}

// The host's trust boundary: a guest's events are checked and clamped before the simulation sees them.
{
  const R = 0.17;
  assert.equal(sanitizeGuestEvent({ kind: 'rip', power: NaN, aim: 0, steep: 0, twist: 0 }, R, 0.6), null, 'NaN power is dropped');
  const rip = sanitizeGuestEvent({ kind: 'rip', power: 9, aim: -4, steep: 0, twist: 0, at: [5, -5] as [number, number] }, R, 0.6)!;
  assert.ok(rip.kind === 'rip' && rip.power === 1 && rip.aim === -0.6 && rip.at![0] === R * 1.5 && rip.at![1] === -R * 1.5, 'rip values are clamped');
  assert.equal((sanitizeGuestEvent({ kind: 'rip', power: 0.5, aim: 0, steep: 0, twist: 0, at: 5 as unknown as [number, number] }, R, 0.6) as { at?: unknown }).at, undefined, 'a malformed launch spot is dropped');
  assert.equal(sanitizeGuestEvent({ kind: 'rim', sx: 0, sz: 0.1, x: 0, z: 0.08, f: NaN }, R, 0.6), null, 'NaN rim strength is dropped');
  assert.equal(sanitizeGuestEvent({ kind: 'forge', action: 'explode', pull: 0, twist: 0, tilt: 0, sign: 1 }, R, 0.6), null, 'unknown forge action is dropped');
  const f = sanitizeGuestEvent({ kind: 'forge', action: 'tilt', pull: 0, twist: 0, tilt: 5, sign: 1, force: 1e9 }, R, 0.6)!;
  assert.ok(f.kind === 'forge' && f.tilt === 0.12 && f.force === 1.5, 'forge strength is capped');
  const st = sanitizeGuestEvent({ kind: 'strike', x: 0, z: 0, seal: 'nuke' }, R, 0.6)!;
  assert.ok(st.kind === 'strike' && !('seal' in st), 'unknown seal falls back to Anvil');
  assert.equal(sanitizeGuestEvent({ kind: 'teleport' } as unknown as Parameters<typeof sanitizeGuestEvent>[0], R, 0.6), null, 'unknown kinds are dropped');
  console.log('guest event sanitizer: ok');
}

// The guest's side of the boundary: only finite snapshots reach the view.
{
  const top = [0, 0.1, 0, 0, 1, 0, 0, 0, 0, 0];
  assert.ok(validSnapshot({ t: 1, seq: 1, tops: [top, top], tilt: [0, 0] }), 'a sound snapshot passes');
  assert.ok(!validSnapshot({ t: 1, seq: 1, tops: [top, [NaN, ...top.slice(1)]], tilt: [0, 0] }), 'a NaN top is refused');
  assert.ok(!validSnapshot({ t: 1, seq: 1, tops: [top], tilt: [0, 0] }), 'a missing top is refused');
  assert.ok(!validSnapshot({ t: 1, seq: 1, tops: [top, top], tilt: [0, 0], shapes: [[1, 0, 'x']] }), 'a broken shape is refused');
  console.log('snapshot check: ok');
}

// A launch direction is normalised, never clamped like a place; a bad event never jams the queue.
{
  const r = sanitizeGuestEvent({ kind: 'rip', power: 0.8, aim: 0, steep: 0, twist: 0, dir: [0.6, 0.8] as [number, number] }, 0.17, 0.6)!;
  assert.ok(r.kind === 'rip' && Math.abs(r.dir![0] - 0.6) < 1e-9 && Math.abs(r.dir![1] - 0.8) < 1e-9, 'a steep pull keeps its direction');
}
console.log('direction check: ok');

