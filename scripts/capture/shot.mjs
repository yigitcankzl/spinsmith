import { readFile, writeFile } from 'node:fs/promises';

const paramsPath = process.env.SPINSMITH_CAPTURE_PARAMS;

export default async function run({ page, frame, cdp }) {
  if (!paramsPath) throw new Error('SPINSMITH_CAPTURE_PARAMS must point to capture parameters JSON.');

  const p = JSON.parse(await readFile(paramsPath, 'utf8'));
  const width = p.width ?? 1920;
  const height = p.height ?? 1080;
  await page.setViewportSize({ width, height });
  await page.addStyleTag({
    content: `
      #workspace-runtime-frame {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 2147483000 !important;
        border: 0 !important;
      }
      .workspace-view-switcher,
      .workspace-icon-button { display: none !important; }
      #spinsmith-capture-disclosure {
        position: fixed;
        z-index: 2147483647;
        right: 22px;
        bottom: 18px;
        padding: 7px 10px;
        border: 1px solid rgba(255,255,255,.24);
        border-radius: 6px;
        color: rgba(255,255,255,.82);
        background: rgba(5,8,12,.72);
        font: 600 11px/1.2 system-ui, sans-serif;
        letter-spacing: .08em;
        pointer-events: none;
      }
    `,
  });

  if (p.disclosure !== false) {
    await page.evaluate(() => {
      document.querySelector('#spinsmith-capture-disclosure')?.remove();
      const badge = document.createElement('div');
      badge.id = 'spinsmith-capture-disclosure';
      badge.textContent = 'IWER EMULATOR · CC0 360° ENVIRONMENT · NO HEADSET FOOTAGE';
      document.body.appendChild(badge);
    });
  }

  let backgroundData = null;
  if (p.background) {
    backgroundData = `data:image/jpeg;base64,${(await readFile(p.background)).toString('base64')}`;
  }

  const info = await frame.evaluate(async ({ p, backgroundData }) => {
    const device = window.IWER_DEVICE;
    if (!device) throw new Error('IWER device was not found. Enter emulated XR before capture.');
    const internal = device[Object.getOwnPropertySymbols(device)[0]];
    const result = {};

    if (internal.devui) {
      internal.devui.devUIContainer.style.display = 'none';
      internal.devui.devUICanvas.style.display = 'none';
    }

    const sem = internal.sem;
    if (sem) {
      sem.meshesVisible = false;
      sem.planesVisible = false;
      sem.boundingBoxesVisible = false;
      sem.scene.children.forEach((child) => {
        if (child.type === 'GridHelper') child.visible = false;
      });

      if (backgroundData) {
        const image = new Image();
        image.src = backgroundData;
        await image.decode();
        let TextureConstructor = null;
        sem.scene.traverse((object) => {
          const texture = object.material?.matcap ?? object.material?.map;
          if (!TextureConstructor && texture?.isTexture && !texture.isDataTexture) {
            TextureConstructor = texture.constructor;
          }
        });
        if (!TextureConstructor) {
          const game = window.__game;
          (game.world?.scene ?? game.scene).traverse((object) => {
            const texture = object.material?.map;
            if (!TextureConstructor && texture?.isTexture && !texture.isDataTexture && !texture.isCompressedTexture) {
              TextureConstructor = texture.constructor;
            }
          });
        }
        if (!TextureConstructor) throw new Error('Could not resolve the runtime Texture constructor.');
        const texture = new TextureConstructor(image);
        texture.mapping = 303;
        texture.colorSpace = 'srgb';
        texture.needsUpdate = true;
        sem.scene.background = texture;
        sem.scene.backgroundRotation?.set(0, (p.backgroundYaw ?? 0) * Math.PI / 180, 0);
        sem.scene.backgroundBlurriness = p.backgroundBlur ?? 0;
        sem.scene.backgroundIntensity = p.backgroundIntensity ?? 1;
      }
    }

    if (p.skinHands !== false) {
      const game = window.__game;
      const scene = game.world?.scene ?? game.scene;
      let standardMaterial = null;
      scene.traverse((object) => {
        if (!standardMaterial && object.material?.isMeshStandardMaterial) standardMaterial = object.material;
      });
      if (!standardMaterial) throw new Error('Could not resolve the runtime MeshStandardMaterial constructor.');

      let patched = 0;
      scene.traverse((object) => {
        if (!object.isSkinnedMesh || !object.geometry?.attributes?.wristDist) return;
        if (object.material?.uniforms?.outlineColor) {
          object.visible = false;
          return;
        }
        object.material = new standardMaterial.constructor({
          color: p.handColor ?? 0xb98269,
          roughness: 0.72,
          metalness: 0,
          transparent: false,
          depthWrite: true,
        });
        object.renderOrder = 10;
        object.frustumCulled = false;
        object.visible = true;
        patched += 1;
      });
      result.handsPatched = patched;
    }

    result.size = [innerWidth, innerHeight];
    return result;
  }, { p, backgroundData });

  for (let i = 0; i < (p.settleFrames ?? 4); i += 1) {
    await frame.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  }

  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(p.output, Buffer.from(screenshot.data, 'base64'));
  return { output: p.output, info };
}
