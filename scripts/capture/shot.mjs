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
  // IWER keeps its compositor canvases at a compact editor-friendly size even when the outer
  // managed iframe is enlarged. Scale the live compositor to viewport height without distorting
  // its aspect ratio; the narrow side mattes are preferable to a stretched or postage-stamp XR view.
  await frame.addStyleTag({
    content: `
      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        overflow: hidden !important;
        background: #080b0e !important;
      }
      canvas[style*="z-index: 1"],
      canvas[style*="z-index: 2"] {
        position: fixed !important;
        top: 0 !important;
        left: 50vw !important;
        width: auto !important;
        height: 100vh !important;
        max-width: none !important;
        transform: translateX(-50%) !important;
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
        // Repeated presentation captures share one IWER scene. Count and preserve an already
        // patched skin hand instead of reporting zero hands on every capture after the first.
        if (object.material?.customProgramCacheKey?.() === 'spinsmith-capture-wrist-fade-v2') {
          object.visible = true;
          object.frustumCulled = false;
          patched += 1;
          return;
        }
        const material = new standardMaterial.constructor({
          color: p.handColor ?? 0xc98f73,
          roughness: 0.72,
          metalness: 0,
          transparent: true,
          depthWrite: true,
          alphaTest: 0,
        });
        // IWER exposes a distance-from-wrist vertex attribute on its hand mesh. Fade only that
        // short cuff instead of showing the synthetic hand end as a hard amputated plane.
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute float wristDist;\nvarying float vWristFade;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWristFade = smoothstep(0.008, 0.05, wristDist);');
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vWristFade;')
            .replace('#include <dithering_fragment>', 'diffuseColor.a *= vWristFade;\n#include <dithering_fragment>');
        };
        material.customProgramCacheKey = () => 'spinsmith-capture-wrist-fade-v2';
        object.material = material;
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

    if (p.pose === 'arena-forge') {
      const game = window.__game;
      if (game.phase !== 'fight') throw new Error(`Arena Forge hero pose needs a fight, got ${game.phase}`);
      // Keep one readable information surface (the score bar). The gesture, deformed bowl and
      // moving tops should own the frame rather than a stack of tutorial cards.
      game.label.mesh.visible = false;
      game.printLabel.mesh.visible = false;
      game.stamp.mesh.visible = false;
      game.menuButton.mesh.visible = false;
      game.rematchButton.mesh.visible = false;
      game.firstClashPending = false;
      game.launchGuide.visible = false;
      window.__capturePoseError = '';
      window.__capturePosePromise = window.drive.arenaForge({ squeeze: 0.034, twist: 20, tilt: 0.052, hold: 10 })
        .catch((error) => { window.__capturePoseError = String(error?.message ?? error); });
      // Reach, close both pinches and arrive at the maximum deformation. The long hold above
      // keeps this deterministic while Chromium writes a high-resolution frame.
      const startedAt = performance.now();
      while (
        performance.now() - startedAt < 12000
        && Math.abs((game.arenaMorph?.scaleX ?? 1) - 1) < 0.04
        && Math.abs(game.arenaMorphTwist ?? 0) < 0.05
      ) await new Promise((resolve) => setTimeout(resolve, 50));
      // The threshold above means both grips are active; keep following the smooth hand motion to
      // its apex so the still shows the full deformation rather than its first readable frame.
      await new Promise((resolve) => setTimeout(resolve, 500));
      // The fight loop may refresh contextual copy during the reach; enforce the one-panel frame
      // once more at the exact held pose.
      game.label.mesh.visible = false;
      game.printLabel.mesh.visible = false;
      game.stamp.mesh.visible = false;
      game.menuButton.mesh.visible = false;
      game.rematchButton.mesh.visible = false;
      game.launchGuide.visible = false;
      result.pose = 'arena-forge';
      result.morph = {
        scaleX: game.arenaMorph?.scaleX ?? 1,
        scaleZ: game.arenaMorph?.scaleZ ?? 1,
        tilt: game.arenaMorph?.tilt ?? 0,
        twist: game.arenaMorphTwist ?? 0,
      };
      result.poseError = window.__capturePoseError;
    }

    if (p.pose === 'desk-ko') {
      const game = window.__game;
      if (!game.deskKoScored || game.lastRoundHeat !== 3) {
        throw new Error('DESK KO hero pose requires the verified +3 result');
      }
      // Freeze the verified consequence, not the later unlock carousel. The score panel and the
      // top beyond the physical table edge are enough to explain the rule in one frame.
      game.reveal?.obj?.removeFromParent?.();
      game.reveal = null;
      game.reveals.splice(0);
      game.rewardHold = 0;
      game.levelUpText = '';
      game.replay = null;
      game.replayCount = 0;
      game.koFreeze = 0;
      game.slowMo = 0;
      game.label.mesh.visible = false;
      game.printLabel.mesh.visible = false;
      game.menuButton.mesh.visible = false;
      game.rematchButton.mesh.visible = false;
      game.bar.mesh.visible = true;
      game.stamp.show('DESK KO!', 'REAL EDGE · +1', 'mine', 8, 1.5);
      result.pose = 'desk-ko';
      result.score = [...game.barPoints];
    }

    result.size = [innerWidth, innerHeight];
    return result;
  }, { p, backgroundData });

  for (let i = 0; i < (p.settleFrames ?? 4); i += 1) {
    await frame.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  }

  if (p.pose) {
    await frame.evaluate((pose) => {
      const game = window.__game;
      for (const surface of [game.label.mesh, game.printLabel.mesh, game.menuButton.mesh, game.rematchButton.mesh]) {
        surface.visible = false;
      }
      if (pose === 'arena-forge') game.stamp.mesh.visible = false;
      if (pose === 'desk-ko') {
        // updateSize normally lifts result words above the card. This hero frame deliberately has
        // no card, so reclaim that space and keep the full stamp inside the seated camera.
        game.stamp.mesh.position.y = game.label.mesh.position.y + 0.04;
      }
    }, p.pose);
  }

  const proof = await frame.evaluate((pose) => {
    const game = window.__game;
    const trackedHands = Number(game.hands?.left?.tracked) + Number(game.hands?.right?.tracked);
    const deformation = Math.max(
      Math.abs((game.arenaMorph?.scaleX ?? 1) - 1),
      Math.abs((game.arenaMorph?.scaleZ ?? 1) - 1),
      Math.abs(game.arenaMorph?.tilt ?? 0),
      Math.abs(game.arenaMorphTwist ?? 0),
    );
    const state = {
      phase: game.phase,
      trackedHands,
      deformation,
      rootVisible: game.root?.visible === true,
      // The label is a child of the placement group and may keep its own flag while its parent is
      // hidden. Only the effective parent visibility can leak the placement prompt into a frame.
      placementVisible: game.print?.visible === true,
      contactRings: game.handContactRings?.filter((ring) => ring.visible).length ?? 0,
      launchGuideVisible: game.launchGuide?.visible === true,
      handPresentation: game.handPresentationCode,
      handEmphasis: game.handEmphasisValue,
    };
    if (pose === 'arena-forge') {
      if (state.phase !== 'fight') throw new Error(`Capture guard: expected fight, got ${state.phase}`);
      if (state.trackedHands < 2) throw new Error(`Capture guard: expected two tracked hands, got ${state.trackedHands}`);
      if (state.deformation < 0.035) throw new Error(`Capture guard: Arena Forge is not visually deformed (${state.deformation.toFixed(3)})`);
      if (!state.rootVisible) throw new Error('Capture guard: arena root is hidden');
      if (state.placementVisible) throw new Error('Capture guard: placement UI leaked into Arena Forge frame');
      if (state.contactRings < 2) throw new Error(`Capture guard: expected two surface contacts, got ${state.contactRings}`);
      if (state.launchGuideVisible) throw new Error('Capture guard: opening arrows compete with Arena Forge');
    }
    return state;
  }, p.pose);
  if (p.pose === 'arena-forge' && info.handsPatched < 2) {
    throw new Error(`Capture guard: expected two rendered skin hands, got ${info.handsPatched}`);
  }

  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: false,
  });
  await writeFile(p.output, Buffer.from(screenshot.data, 'base64'));
  return { output: p.output, info, proof };
}
