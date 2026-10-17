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
          color: p.handColor ?? 0xd09a7d,
          roughness: 0.66,
          metalness: 0,
          transparent: false,
          depthWrite: true,
        });
        object.renderOrder = 10;
        object.frustumCulled = false;
        object.visible = true;
        patched += 1;
      });
      // Quest needs the game's invisible depth-only hand proxy because the real hand comes from
      // passthrough. IWER already renders a synthetic hand; leaving both active cuts holes through
      // that visible mesh where the proxy and skin occupy the same depth.
      if (game.handOccluder) {
        game.handOccluder.joints.visible = false;
        game.handOccluder.bones.visible = false;
      }
      result.handsPatched = patched;
    }

    if (p.devTable) {
      const game = window.__game;
      const scene = game.world?.scene ?? game.scene;
      game.__captureTable?.traverse?.((object) => {
        object.geometry?.dispose?.();
        object.material?.dispose?.();
      });
      game.__captureTable?.removeFromParent();
      let MeshConstructor = null;
      let BoxGeometryConstructor = null;
      let StandardMaterialConstructor = null;
      let TextureConstructor = null;
      scene.traverse((object) => {
        if (!MeshConstructor && object.isMesh) MeshConstructor = object.constructor;
        if (!BoxGeometryConstructor && object.geometry?.type === 'BoxGeometry') BoxGeometryConstructor = object.geometry.constructor;
        if (!StandardMaterialConstructor && object.material?.isMeshStandardMaterial) StandardMaterialConstructor = object.material.constructor;
        if (!TextureConstructor && object.material?.map?.isTexture) TextureConstructor = object.material.map.constructor;
      });
      if (!MeshConstructor || !BoxGeometryConstructor || !StandardMaterialConstructor || !TextureConstructor) {
        throw new Error('Could not resolve constructors for the capture table.');
      }

      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 512;
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 0, 512);
      gradient.addColorStop(0, '#835337');
      gradient.addColorStop(0.5, '#5f3825');
      gradient.addColorStop(1, '#76472e');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 512, 512);
      let seed = 29;
      const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 150; i += 1) {
        const y = random() * 512;
        const bend = (random() - 0.5) * 24;
        context.strokeStyle = `rgba(${random() > 0.5 ? '35,14,7' : '235,170,112'},${0.035 + random() * 0.08})`;
        context.lineWidth = 0.6 + random() * 2;
        context.beginPath();
        context.moveTo(0, y);
        context.bezierCurveTo(150, y + bend, 360, y - bend, 512, y + bend * 0.35);
        context.stroke();
      }
      const wood = new TextureConstructor(canvas);
      wood.colorSpace = 'srgb';
      wood.needsUpdate = true;

      const table = new game.root.constructor();
      const base = new MeshConstructor(
        new BoxGeometryConstructor(1.13, 0.045, 0.79, 1, 1, 1),
        new StandardMaterialConstructor({ color: 0x18120f, metalness: 0.04, roughness: 0.78 }),
      );
      const top = new MeshConstructor(
        new BoxGeometryConstructor(1.1, 0.014, 0.76, 1, 1, 1),
        new StandardMaterialConstructor({ color: 0xffffff, map: wood, metalness: 0.04, roughness: 0.62 }),
      );
      base.position.y = game.root.position.y - 0.1165;
      top.position.y = game.root.position.y - 0.087;
      table.add(base, top);
      table.name = 'capture-dev-table';
      table.position.set(game.root.position.x, 0, game.root.position.z + 0.015);
      table.rotation.y = game.root.rotation.y;
      scene.add(table);
      game.__captureTable = table;
      result.devTable = true;
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
