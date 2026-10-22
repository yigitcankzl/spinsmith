// Desktop-IWER smoke check. This proves which renderer the managed browser uses and samples the
// game's own one-second FPS windows. It is not a substitute for a physical Quest performance test.
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
    const renderer = game.world?.renderer ?? game.renderer;
    const gl = renderer?.getContext?.();
    if (!gl) throw new Error('WebGL renderer unavailable');
    const info = gl.getExtension('WEBGL_debug_renderer_info');

    // Ignore startup/HMR history and measure five fresh one-second windows in the live game loop.
    game.lowestFps = 0;
    game.fpsWindowFrames = 0;
    game.fpsWindowTime = 0;
    // CPU cost of the game's own per-frame update (simulation, hands, FX; not WebGL submission).
    // Heap growth is not reported: Chromium buckets performance.memory without a precise-memory flag.
    const original = game.update;
    const updateMs = [];
    game.update = function (...args) {
      const t0 = performance.now();
      const r = original.apply(this, args);
      updateMs.push(performance.now() - t0);
      return r;
    };
    await new Promise((resolve) => setTimeout(resolve, 5200));
    game.update = original;
    const sortedMs = updateMs.slice().sort((a, b) => a - b);
    const pct = (q) => Math.round((sortedMs[Math.min(sortedMs.length - 1, Math.floor(sortedMs.length * q))] ?? 0) * 100) / 100;

    const diagnostics = window.spinsmithDiagnostics?.();
    // Without multiview each eye is its own camera pass, so the renderer's count covers both eyes.
    const xr = renderer.xr;
    const views = xr?.isPresenting ? (xr.getCamera?.()?.cameras?.length ?? 1) : 1;
    const multiview = !!xr?.isMultiview;
    const perEye = multiview ? renderer.info.render.calls : Math.round(renderer.info.render.calls / views);
    const BUDGET = 150;
    if (perEye > BUDGET) throw new Error(`draw calls per eye ${perEye} over the ${BUDGET} budget (phase ${game.phase})`);
    return {
      environment: 'desktop IWER emulator',
      renderer: info
        ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
      vendor: info
        ? gl.getParameter(info.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.VENDOR),
      phase: game.phase,
      lowestFpsOverFiveSeconds: diagnostics?.lowestFps ?? null,
      liteMode: diagnostics?.liteMode ?? null,
      updateFrames: updateMs.length,
      updateMs: { p50: pct(0.5), p95: pct(0.95), max: pct(1) },
      drawCalls: renderer.info.render.calls,
      views,
      multiview,
      drawCallsPerEye: perEye,
      budgetPerEye: BUDGET,
      triangles: renderer.info.render.triangles,
      recorderCodecs: {
        h264: MediaRecorder.isTypeSupported('video/mp4;codecs=avc1.42E01E'),
        vp8: MediaRecorder.isTypeSupported('video/webm;codecs=vp8'),
        vp9: MediaRecorder.isTypeSupported('video/webm;codecs=vp9'),
      },
    };
  });
}
