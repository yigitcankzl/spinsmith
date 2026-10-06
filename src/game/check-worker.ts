/**
 * The arena workshop's check, off the main thread: plays one round per type pair on the draft and
 * answers with the report (75-160 ms on a desktop, several times that on a headset).
 */
import { reportArena } from './arena-report.ts';
import type { ArenaLayout } from './layout.ts';

self.onmessage = (e: MessageEvent<{ id: number; layout: ArenaLayout }>) => {
  (self as unknown as Worker).postMessage({ id: e.data.id, report: reportArena(e.data.layout, 1) });
};
