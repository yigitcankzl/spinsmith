// Room matrix: where does the arena land in rooms other than the default office?
//
// Run against the dev server with an XR session already entered (scripts/emu.sh enter):
//   npm run check:room-matrix
//
// Cases: office_small and living_room are IWER's own captured rooms (living_room is fetched from
// the IWER CDN, like the devui room picker does). IWER has no API to author planes, so the other
// three are SYNTHESISED at the JS level: the probe edits the emulator's synthetic-environment
// plane set (IWER_DEVICE.sem.trackedPlanes, which IWER's session turns into XRPlanes every frame)
// starting from office_small's real table plane:
//   no_table         every horizontal plane except floor and ceiling removed
//   small_table      the table's outline replaced by a 50 x 40 cm top, still labelled 'table'
//   unlabelled_table the same table plane with its label changed to 'other' (Space Setup skipped)
// For each case the head is seated in front of the room's table (if any) and the game's own
// placement (placeRoot, which also runs setRoom for ROOM.poly) is called; the probe then checks
// table vs tray, reach, and desk-edge sectors computed by the game's deskSectors on the outline.
// The environment raycast hit is hidden during placement so the plane path is what is measured.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => !!window.__game && !!window.IWER_DEVICE?.sem).catch(() => false);
    if (!found) continue;
    const report = await candidate.evaluate(async () => {
      const g = window.__game;
      const dev = window.IWER_DEVICE;
      const sem = dev.sem;
      const { deskSectors } = await import('/src/game/desk-edge.ts');
      const { maxRim } = await import('/src/game/layout.ts');
      const { insidePoly } = await import('/src/game/room.ts');
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const REACH = 0.68;
      const label = (p) => String(p.semanticLabel ?? '');
      const isTable = (p) => /table|desk/.test(label(p));
      // A plane's world center and outline from its column-major pose matrix.
      const world = (p) => {
        const m = p.transform.matrix;
        const at = (q) => ({ x: m[0] * q.x + m[4] * q.y + m[8] * q.z + m[12], z: m[2] * q.x + m[6] * q.y + m[10] * q.z + m[14] });
        return { x: m[12], y: m[13], z: m[14], up: m[5], poly: [...p.polygon].map(at) };
      };
      const rect = (w, d) => [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([x, z]) => new DOMPointReadOnly(x, 0, z, 1));
      const fake = (from, semanticLabel, polygon = from.polygon) => ({ transform: from.transform, polygon, semanticLabel });

      async function load(env) {
        await sem.loadDefaultEnvironment(env);
        await wait(1500);
      }
      function nearestTable() {
        let best = null;
        for (const p of sem.trackedPlanes) {
          if (!isTable(p)) continue;
          const w = world(p);
          if (w.up < 0.9 || w.y < 0.45 || w.y > 1.15) continue;
          if (!best || Math.hypot(w.x, w.z) < Math.hypot(best.w.x, best.w.z)) best = { p, w };
        }
        return best;
      }
      // Seat the head facing the table so the arena's spot is over it and the head is off its top.
      function seat(t) {
        let dx = 0;
        let dz = -1;
        let ty = 0.74;
        let back = REACH;
        if (t) {
          const len = Math.hypot(t.w.x, t.w.z);
          if (len > 0.05) {
            dx = t.w.x / len;
            dz = t.w.z / len;
          }
          ty = t.w.y;
          // Far enough back that the head is not above the top (a chair, to the classifier).
          let ext = 0;
          for (const q of t.w.poly) ext = Math.max(ext, -((q.x - t.w.x) * dx + (q.z - t.w.z) * dz));
          back = Math.max(REACH, ext + 0.12);
        }
        const cx = t ? t.w.x : 0;
        const cz = t ? t.w.z : -REACH;
        dev.position.set(cx - dx * back, ty + 0.5, cz - dz * back);
        const yaw = Math.atan2(-dx, -dz);
        const pitch = (-32 * Math.PI) / 180;
        const [sy, cy, sp, cp] = [Math.sin(yaw / 2), Math.cos(yaw / 2), Math.sin(pitch / 2), Math.cos(pitch / 2)];
        dev.quaternion.set(cy * sp, sy * cp, -sy * sp, cy * cp); // yaw(Y) * pitch(X)
      }
      async function measure(name, expectTable) {
        await wait(800);
        const seen = g.queries.planes.entities.size ?? [...g.queries.planes.entities].length;
        const raycastHit = !!g.placementProbe.visible;
        const keepProbe = g.placementProbe.visible;
        g.placementProbe.visible = false;
        g.placeRoot();
        g.placementProbe.visible = keepProbe;
        const head = g.player.head.getWorldPosition(g.p.clone());
        const at = g.root.position.clone();
        const reach = Math.hypot(at.x - head.x, at.z - head.z);
        const drop = head.y - at.y;
        const shape = g.tableShape();
        let sectors = [];
        let insideTable = null;
        if (shape) {
          g.root.updateWorldMatrix(true, false);
          const local = shape.poly.map((q) => {
            const l = g.root.worldToLocal(g.p.clone().set(q.x, shape.y, q.z));
            return { x: l.x, z: l.z };
          });
          sectors = deskSectors(local, maxRim(g.arena.layout), 0.25 / g.root.scale.x, 2);
          insideTable = insidePoly(shape.poly, at.x, at.z);
        }
        const fails = [];
        if (g.onTable !== expectTable) fails.push(`expected ${expectTable ? 'table' : 'tray'}, got ${g.onTable ? 'table' : 'tray'}`);
        if (reach < 0.3 || reach > 0.9) fails.push(`arena ${reach.toFixed(2)} m away (want 0.3-0.9)`);
        if (drop < 0.15 || drop > 0.85) fails.push(`arena ${drop.toFixed(2)} m below the eyes (want 0.15-0.85)`);
        if (expectTable && !shape) fails.push('on a table but no table outline (ROOM.poly would be the DEV stand-in)');
        if (expectTable && shape && !insideTable) fails.push('arena center is off the table outline');
        if (expectTable && shape && !sectors.length) fails.push('no desk-edge sectors on a table');
        return {
          name,
          pass: fails.length === 0,
          fails,
          placedOn: g.onTable ? 'table' : 'tray',
          raycastHitHidden: raycastHit,
          planesSeenByGame: seen,
          head: [head.x, head.y, head.z].map((v) => +v.toFixed(2)),
          arena: [at.x, at.y, at.z].map((v) => +v.toFixed(2)),
          reach: +reach.toFixed(2),
          belowEyes: +drop.toFixed(2),
          table: shape ? { y: +shape.y.toFixed(3), corners: shape.poly.length } : null,
          deskEdgeSectors: sectors.map((s) => ({ deg: Math.round((s.angle * 180) / Math.PI), m: +(s.distance * g.root.scale.x).toFixed(2) })),
        };
      }

      const results = [];
      for (const env of ['office_small', 'living_room']) {
        try {
          await load(env);
          const t = nearestTable();
          seat(t);
          results.push(await measure(env, !!t));
        } catch (err) {
          results.push({ name: env, pass: false, fails: [`could not load: ${err?.message ?? err}`] });
        }
      }
      // office_small with its table plane edited: drop planes, put a replacement in its place.
      async function variant(name, expectTable, drop, replace) {
        await load('office_small');
        const base = nearestTable();
        if (!base) return { name, pass: false, fails: ['office_small has no table plane to start from'] };
        for (const p of [...sem.trackedPlanes]) if (p === base.p || drop(p)) sem.trackedPlanes.delete(p);
        const next = replace ? replace(base.p) : null;
        if (next) sem.trackedPlanes.add(next);
        seat(next ? { p: next, w: world(next) } : base);
        return measure(name, expectTable);
      }
      const horizontalNotFloor = (p) => world(p).up > 0.5 && !/floor|ceiling/.test(label(p));
      results.push(await variant('no_table', false, horizontalNotFloor, null));
      results.push(await variant('small_table', true, isTable, (p) => fake(p, 'table', rect(0.5, 0.4))));
      results.push(await variant('unlabelled_table', true, isTable, (p) => fake(p, 'other')));
      // Leave the default room and the seated capture pose behind (scripts/emu.sh front).
      await load('office_small');
      dev.position.set(0, 1.45, 0.12);
      dev.quaternion.set(Math.sin((-16 * Math.PI) / 180), 0, 0, Math.cos((-16 * Math.PI) / 180));
      await wait(500);
      g.placeRoot();
      return { pass: results.every((r) => r.pass), results };
    });
    if (!report.pass) throw new Error(`room matrix failed:\n${JSON.stringify(report, null, 2)}`);
    return report;
  }
  throw new Error('game or IWER synthetic environment not found');
}
