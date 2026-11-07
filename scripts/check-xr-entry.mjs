// Regression probe: a denied immersive permission must return the landing page to a usable button.
export default async function run({ page, frame }) {
  const target = [frame, ...page.frames()].filter(Boolean).find((candidate) => candidate.url().includes('localhost:8081'));
  if (!target) throw new Error('SpinSmith application frame not found');
  const enter = target.locator('#enter');
  await enter.waitFor({ state: 'visible' });
  await target.evaluate(() => {
    const xr = navigator.xr;
    if (!xr) throw new Error('WebXR is unavailable');
    window.__xrRequestSession = xr.requestSession;
    Object.defineProperty(xr, 'requestSession', { configurable: true, value: () => Promise.reject(new Error('probe: permission denied')) });
  });
  try {
    await enter.click();
    await target.waitForFunction(() => {
      const button = document.querySelector('#enter');
      return button && !button.disabled && button.textContent === 'TRY AGAIN';
    });
    return { ok: true, text: await enter.textContent(), disabled: await enter.isDisabled() };
  } finally {
    await target.evaluate(() => {
      const xr = navigator.xr;
      if (xr && window.__xrRequestSession) Object.defineProperty(xr, 'requestSession', { configurable: true, value: window.__xrRequestSession });
      delete window.__xrRequestSession;
    });
  }
}
