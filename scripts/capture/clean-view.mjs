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
    return { clean: true };
  });
}
