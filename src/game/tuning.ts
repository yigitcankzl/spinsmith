/**
 * Knobs for the first days on a headset, read from the address in dev builds only, so feel can be
 * tuned without rebuilding: ?reach=0.65&scale=2.2&pinchOn=0.018&fullPull=0.2 ... Production builds
 * always use the defaults.
 */
import { REACH } from './placement.ts';
import { ARENA_SCALE } from './reach.ts';

const query = import.meta.env.DEV ? new URLSearchParams(location.search) : null;

function knob(name: string, fallback: number): number {
  const raw = query?.get(name);
  const n = raw == null ? NaN : Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export const TUNE = {
  /** How far ahead the arena goes (m). */
  reach: knob('reach', REACH),
  /** How much larger than its simulation the arena is drawn. */
  scale: knob('scale', ARENA_SCALE),
  /** Thumb-to-index distance that starts and ends a pinch (m). */
  pinchOn: knob('pinchOn', 0.02),
  pinchOff: knob('pinchOff', 0.035),
  /** Cord pull that counts as full power (m) and the full-power pull speed (m/s). */
  fullPull: knob('fullPull', 0.22),
  fullSpeed: knob('fullSpeed', 1.0),
  /** Launch power from which a pull is white hot. */
  perfect: knob('perfect', 0.92),
  /** A well needs the fingertip moving down at least this fast as it presses in (m/s). */
  wellSpeed: knob('wellSpeed', 0.15),
  /** No well from a hand this soon after it set a ramp (s): the release dips the fingers. */
  wellAfterRamp: knob('wellAfterRamp', 0.3),
  /** How long a cup waits for a top, then holds it for a sling (s). */
  cupHold: knob('cupHold', 2),
  /** A far ramp is set only after a pinch held this long (s); a quick tap does nothing. */
  farHold: knob('farHold', 0.12),
  /** The real hands drawn over the game (0 turns it off), and how full the hand shape is. */
  occluder: knob('occluder', 1),
  occluderScale: knob('occluderScale', 0.95),
  /** How much the real room dims around the arena (0 turns it off). */
  dim: knob('dim', 1),
};
