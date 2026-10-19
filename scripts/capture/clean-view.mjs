// Presentation-only IWER view: keep the live game, hide emulator chrome and debug geometry.
export default async function run({ page, frame }) {
  await page.setViewportSize({ width: 1280, height: 720 });
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
    `,
  });
  await frame.addStyleTag({
    content: `
      html, body { width: 100% !important; height: 100% !important; margin: 0 !important; overflow: hidden !important; background: #080b0e !important; }
      canvas[style*="z-index: 1"], canvas[style*="z-index: 2"] {
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
  return frame.evaluate(() => {
    const device = window.IWER_DEVICE;
    if (!device) throw new Error('IWER device not found; enter emulated XR first');
    const internal = device[Object.getOwnPropertySymbols(device)[0]];
    if (internal.devui) {
      internal.devui.devUIContainer.style.display = 'none';
      internal.devui.devUICanvas.style.display = 'none';
    }
    if (internal.sem) {
      internal.sem.meshesVisible = false;
      internal.sem.planesVisible = false;
      internal.sem.boundingBoxesVisible = false;
      internal.sem.scene.children.forEach((child) => {
        if (child.type === 'GridHelper') child.visible = false;
      });
    }
    const game = window.__game;
    const scene = game?.world?.scene ?? game?.scene;
    let handsPatched = 0;
    let standardMaterial = null;
    scene?.traverse((object) => {
      if (!standardMaterial && object.material?.isMeshStandardMaterial) standardMaterial = object.material;
    });
    if (standardMaterial) {
      scene.traverse((object) => {
        if (!object.isSkinnedMesh || !object.geometry?.attributes?.wristDist) return;
        if (object.material?.uniforms?.outlineColor) {
          object.visible = false;
          return;
        }
        const material = new standardMaterial.constructor({
          color: 0xc98f73,
          roughness: 0.72,
          metalness: 0,
          transparent: true,
          depthWrite: true,
        });
        material.onBeforeCompile = (shader) => {
          shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nattribute float wristDist;\nvarying float vWristFade;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWristFade = smoothstep(0.008, 0.05, wristDist);');
          shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying float vWristFade;')
            .replace('#include <dithering_fragment>', 'diffuseColor.a *= vWristFade;\n#include <dithering_fragment>');
        };
        material.customProgramCacheKey = () => 'spinsmith-clean-hand-v2';
        object.material = material;
        object.renderOrder = 10;
        object.frustumCulled = false;
        object.visible = true;
        handsPatched += 1;
      });
    }
    if (game?.handOccluder) {
      game.handOccluder.joints.visible = false;
      game.handOccluder.bones.visible = false;
    }
    return { clean: true, handsPatched };
  });
}
