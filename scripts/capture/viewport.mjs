export default async function run({ page }) {
  await page.setViewportSize({ width: 1920, height: 1080 });
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
  return page.viewportSize();
}
