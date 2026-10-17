// Read-only snapshot of the repeatable emulator driver's public state.
export default async function run({ page, frame }) {
  for (const candidate of [frame, ...page.frames()].filter(Boolean)) {
    const found = await candidate.evaluate(() => typeof window.drive === 'object').catch(() => false);
    if (found) return candidate.evaluate(() => ({ ...window.drive.state(), probe: window.__deskProbe ?? null }));
  }
  throw new Error('window.drive not found: enter the emulated XR session first');
}
