export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const info = await candidate.evaluate(() => {
      const renderer = window.__game?.world?.renderer ?? window.__game?.renderer;
      const gl = renderer?.getContext?.();
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        version: gl.getParameter(gl.VERSION),
      };
    }).catch(() => null);
    if (info) return info;
  }
  throw new Error('WebGL renderer not found');
}
