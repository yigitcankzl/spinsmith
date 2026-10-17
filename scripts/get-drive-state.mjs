// Read-only snapshot of the repeatable emulator driver's public state.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => typeof window.drive === 'object').catch(() => false);
    if (found) return candidate.evaluate(() => {
      const g = window.__game;
      const right = g?.hands?.right;
      let handProbe = null;
      if (g && right) {
        const wrist = g.root.worldToLocal(g.handAt.copy(right.wrist)).toArray();
        const index = g.root.worldToLocal(g.local.copy(right.index)).toArray();
        handProbe = {
          tracked: right.tracked,
          low: right.low,
          wrist,
          index,
          palm: wrist.map((value, i) => (value + index[i]) * 0.5),
          tableY: g.root.position.y - 0.08 * g.rootK,
          touch: {
            y: g.touches?.right?.y ?? null,
            velocity: g.touches?.right?.v ?? null,
            downAt: g.touches?.right?.downAt ?? null,
            still: g.touches?.right?.still ?? null,
          },
        };
      }
      return {
        ...window.drive.state(),
        probe: window.__deskProbe ?? null,
        handProbe,
        strikeProbe: g ? {
          demo: !!g.demo,
          taught: !!g.taught?.('strike'),
          bar: g.forgeBar?.value ?? null,
          elapsed: g.elapsed,
          fullSince: g.fullSince,
          armed: !!g.forgeBar?.full && g.elapsed - g.fullSince > 0.5 && !g.demo,
        } : null,
      };
    });
  }
  throw new Error('window.drive not found: enter the emulated XR session first');
}
