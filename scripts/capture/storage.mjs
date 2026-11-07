// Saves/restores every SpinSmith localStorage key around destructive demo captures.
import { readFileSync, writeFileSync } from 'node:fs';

export default async function run({ page, frame }) {
  const target = frame ?? page.mainFrame();
  const file = process.env.SPINSMITH_STORAGE_FILE;
  const mode = process.env.SPINSMITH_STORAGE_MODE;
  if (!file || !['save', 'restore'].includes(mode)) throw new Error('Set SPINSMITH_STORAGE_FILE and SPINSMITH_STORAGE_MODE=save|restore.');
  if (mode === 'save') {
    const data = await target.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.startsWith('spinsmith.'))));
    writeFileSync(file, JSON.stringify(data));
    return { saved: Object.keys(data).length };
  }
  const data = JSON.parse(readFileSync(file, 'utf8'));
  return target.evaluate((saved) => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key?.startsWith('spinsmith.')) localStorage.removeItem(key);
    }
    for (const [key, value] of Object.entries(saved)) localStorage.setItem(key, String(value));
    return { restored: Object.keys(saved).length };
  }, data);
}
