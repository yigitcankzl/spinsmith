/** One slice of the top report, run by scripts/top-report.ts in a worker thread. */
import { parentPort, workerData } from 'node:worker_threads';
import { playBuilds } from '../src/game/top-report.ts';

const { start, end, opponents } = workerData as { start: number; end: number; opponents: number };
parentPort!.postMessage(playBuilds(start, end, opponents));
