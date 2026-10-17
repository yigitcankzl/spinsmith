// Repeatable desktop-IWER render budget snapshot. This is a comparative signal, not a Quest FPS
// claim: the emulator renders through Chromium and may count stereo work differently from hardware.
export default async function run({ page, frame }) {
  let target = null;
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => typeof window.__game === 'object').catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) throw new Error('window.__game not found: enter the emulated XR session first');

  return target.evaluate(async () => {
    const game = window.__game;
    const renderer = game.world?.renderer;
    if (!renderer) throw new Error('renderer unavailable');
    const samples = [];
    for (let i = 0; i < 45; i++) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      samples.push({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
    }
    const sorted = (key) => samples.map((sample) => sample[key]).sort((a, b) => a - b);
    const summary = (key) => {
      const values = sorted(key);
      return { min: values[0], median: values[Math.floor(values.length / 2)], max: values.at(-1) };
    };
    const visibleMeshes = (root) => {
      let meshes = 0;
      let instances = 0;
      if (!root) return { meshes, instances };
      root.traverseVisible((object) => {
        if (!object.isMesh) return;
        meshes++;
        if (object.isInstancedMesh) instances += object.count;
      });
      return { meshes, instances };
    };
    return {
      environment: 'desktop IWER emulator',
      phase: game.phase,
      liteMode: game.liteMode,
      render: {
        calls: summary('calls'),
        // Desktop IWER submits both eyes separately; Quest multiview can share that work. Keep this
        // explicitly labelled as an estimate rather than pretending it is a headset measurement.
        approximateCallsPerEye: Math.round(summary('calls').median / 2),
        triangles: summary('triangles'),
      },
      visibleMeshes: {
        wholeGame: visibleMeshes(game.root),
        arena: visibleMeshes(game.stage),
        hub: visibleMeshes(game.hub?.root),
        roomMemory: visibleMeshes(game.roomImprints?.root),
        impacts: visibleMeshes(game.impacts?.root),
      },
    };
  });
}
