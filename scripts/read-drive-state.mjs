// Prints the deterministic emulator driver's compact state. Useful after a failed hand probe.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => typeof window.drive === 'object').catch(() => false)) {
      return candidate.evaluate(() => {
        const state = window.drive.state();
        const g = window.__game;
        const hand = (side) => {
          const h = g.hands[side];
          const palm = h.wrist.clone().lerp(h.index, 0.5);
          const input = window.IWER_DEVICE?.hands?.[side];
          const handle = window.transformHandles?.get?.(side);
          const handleWorld = handle?.getWorldPosition ? handle.getWorldPosition(handle.position.clone()) : null;
          return {
            wrist: g.root.worldToLocal(h.wrist.clone()).toArray().map((n) => +n.toFixed(3)),
            index: g.root.worldToLocal(h.index.clone()).toArray().map((n) => +n.toFixed(3)),
            palm: g.root.worldToLocal(palm).toArray().map((n) => +n.toFixed(3)),
            input: input ? [input.position.x, input.position.y, input.position.z].map((n) => +n.toFixed(3)) : null,
            handle: handleWorld ? [handleWorld.x, handleWorld.y, handleWorld.z].map((n) => +n.toFixed(3)) : null,
          };
        };
        return {
          ...state,
          sizeSettled: g.sizeSettled,
          entrance: !!g.entrance,
          outerDebug: {
            railLength: +g.outerRailLength.toFixed(3),
            railCount: g.outerRailCount,
            railSide: g.outerRailSide,
          },
          debugHands: { left: hand('left'), right: hand('right') },
        };
      });
    }
  }
  throw new Error('window.drive not found: enter the emulated XR session first');
}
