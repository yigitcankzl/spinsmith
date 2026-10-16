import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const forbiddenPath = /(^|\/)(\.agents|\.claude|\.codex|\.cursor|\.code-review-graph|opencode\.json|AGENTS\.md|CLAUDE\.md)(\/|$)/i;
const forbiddenText = /bey[\s-]?blade/i;
const failures = [];

async function inspect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    const publicPath = relative(dist, path).replaceAll('\\', '/');
    if (forbiddenPath.test(publicPath)) failures.push(`${publicPath}: development-only path`);
    if (entry.isDirectory()) {
      await inspect(path);
      continue;
    }
    const body = await readFile(path);
    if (forbiddenText.test(body.toString('utf8'))) failures.push(`${publicPath}: third-party brand residue`);
  }
}

await inspect(dist);
if (failures.length) throw new Error(`Public release check failed:\n${failures.join('\n')}`);
console.log('public-release-check: clean');
