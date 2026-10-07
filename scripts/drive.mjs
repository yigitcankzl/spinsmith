// Runs the hand-driver steps in .drive.json on the running game (dev): see scripts/drive.sh.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export default async function run({ page, frame, workspaceRoot }) {
  const steps = JSON.parse(readFileSync(join(workspaceRoot, '.drive.json'), 'utf8'));
  // The game runs in the app frame; find the one with the driver.
  const frames = [frame, ...page.frames()].filter(Boolean);
  for (const f of frames) {
    const has = await f.evaluate(() => typeof window.drive === 'object').catch(() => false);
    if (has) return f.evaluate((s) => window.drive.run(s), steps);
  }
  throw new Error('window.drive not found: is this a dev build in XR?');
}
