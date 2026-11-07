// Repeatable desktop-IWER render budget matrix. This is a comparative signal, not a Quest FPS
// claim: the emulator renders through Chromium and may count stereo work differently from hardware.
export default async function run({ page, frame }) {
  let target = null;
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    if (await candidate.evaluate(() => typeof window.__game === 'object' && typeof window.drive === 'object').catch(() => false)) {
      target = candidate;
      break;
    }
  }
  if (!target) throw new Error('window.__game / window.drive not found: enter the emulated XR session first');

  return target.evaluate(async () => {
    const game = window.__game;
    const drive = window.drive;
    const renderer = game.world?.renderer;
    if (!renderer) throw new Error('renderer unavailable');
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
    const waitFor = async (read, message) => {
      for (let i = 0; i < 240; i++) {
        if (read()) return;
        await nextFrame();
      }
      throw new Error(message);
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
    const views = renderer.xr?.isPresenting ? (renderer.xr.getCamera?.()?.cameras?.length ?? 1) : 1;
    const multiview = !!renderer.xr?.isMultiview;
    const perEye = (calls) => multiview ? calls : Math.round(calls / Math.max(1, views));
    const summarize = (values) => {
      const sorted = [...values].sort((a, b) => a - b);
      return { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], max: sorted.at(-1) };
    };
    const sample = async () => {
      for (let i = 0; i < 12; i++) await nextFrame();
      const samples = [];
      for (let i = 0; i < 45; i++) {
        await nextFrame();
        samples.push({ calls: renderer.info.render.calls, triangles: renderer.info.render.triangles });
      }
      return {
        calls: summarize(samples.map((value) => value.calls)),
        callsPerEye: summarize(samples.map((value) => perEye(value.calls))),
        triangles: summarize(samples.map((value) => value.triangles)),
        visibleMeshes: {
          wholeGame: visibleMeshes(game.root),
          arena: visibleMeshes(game.stage),
          hub: visibleMeshes(game.hub?.root),
          roomMemory: visibleMeshes(game.roomImprints?.root),
          impacts: visibleMeshes(game.impacts?.root),
        },
      };
    };
    const home = async () => {
      game.builder.close();
      game.forge.close();
      game.toHub();
      await waitFor(() => game.phase === 'hub', 'home did not open');
    };
    const launch = async () => {
      game.startMatch();
      await waitFor(() => game.phase === 'ready', 'match did not reach ready');
      drive.key('KeyL');
      await waitFor(() => game.phase === 'fight', 'match did not reach fight');
      drive.key('KeyU');
    };

    const saved = Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('spinsmith.')));
    const original = { guide: game.progress.guide, seats: game.seats, brawlMode: game.brawlMode };
    const phases = {};
    try {
      await home();
      phases.hub = await sample();

      game.hub.hide();
      game.openForge();
      await waitFor(() => game.phase === 'forge', 'forge did not open');
      phases.forge = await sample();

      await home();
      game.hub.hide();
      game.openWorkshop();
      await waitFor(() => game.phase === 'build', 'workshop did not open');
      phases.workshop = await sample();

      await home();
      game.progress.guide = 'done';
      game.seats = 2;
      await launch();
      phases.fight = await sample();

      await home();
      game.progress.guide = 'done';
      game.seats = 4;
      await launch();
      phases.brawl = await sample();

      const over = Object.entries(phases).filter(([, value]) => value.callsPerEye.max > 150);
      if (over.length) throw new Error(`render budget exceeded: ${over.map(([name, value]) => `${name} ${value.callsPerEye.max}`).join(', ')} calls/eye`);
      return {
        environment: 'desktop IWER emulator; comparative only, not Quest performance',
        budgetCallsPerEye: 150,
        views,
        multiview,
        phases,
      };
    } finally {
      game.seats = original.seats;
      game.brawlMode = original.brawlMode;
      game.progress.guide = original.guide;
      game.toHub();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key?.startsWith('spinsmith.')) localStorage.removeItem(key);
      }
      for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, value);
      setTimeout(() => location.reload(), 1000);
    }
  });
}
