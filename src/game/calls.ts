/**
 * Fight-phase calls to action share one instruction card. Each call has a priority so a
 * lower call cannot overwrite a higher one that is still fresh, and the same call does not
 * flash back every few seconds.
 */
export const CALL = {
  /** A tip: ambient match state (sudden-death pressure). */
  ambient: 1,
  /** A tactical tip: RIVAL IS TIRED, RIM OPEN, HOT RIVET, REAL EDGE. */
  tactic: 2,
  /** Your ultimate is ready (the strike lesson card). */
  ultimate: 3,
  /** Lesson / tutorial text; any timed card not shown through the call helper counts as this. */
  lesson: 4,
  /** Danger: a rival tell or feint. */
  danger: 5,
} as const;

/** Seconds before the same call key may be shown again after it left the card. */
export const CALL_REPEAT = 6;

/** What the card shows now. */
export interface CallSlot {
  key: string;
  priority: number;
  /** Time the current card stops being fresh (a persistent card is never fresh). */
  until: number;
  /** False once the card was cleared or overwritten. */
  onScreen: boolean;
}

/** Whether a new call may take the card at `now`; `lastSeen` is when its key was last on screen. */
export function callAllowed(slot: CallSlot, now: number, key: string, priority: number, lastSeen: number | undefined): boolean {
  if (slot.onScreen && slot.key === key) return false;
  if (lastSeen !== undefined && now - lastSeen < CALL_REPEAT) return false;
  return !(slot.onScreen && now < slot.until && slot.priority >= priority);
}
