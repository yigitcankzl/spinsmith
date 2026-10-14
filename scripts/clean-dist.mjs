import { readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Nested AGENTS.md files guide development tools, but Vite copies everything under public/ into
// dist/. Keep those instructions in the repository without publishing them with the game.
const dist = fileURLToPath(new URL('../dist', import.meta.url));
async function removeInstructions(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await removeInstructions(path);
    else if (entry.name === 'AGENTS.md') await rm(path, { force: true });
  }
}
await removeInstructions(dist);
