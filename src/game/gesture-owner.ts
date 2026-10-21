/**
 * Gesture ownership: which hand verb owns a hand this frame.
 *
 * Several verbs share one open hand near the bowl floor (Flick, Spin Rub, Finger Groove, Cup,
 * Forge Gust, Crossguard posts, the open-palm slap) and several more finish with a pinch letting
 * go (ramp, Rim Spring, sling, Arena Forge, Ember Rivet, overforge seal, Forge Wheel). Each verb's
 * detector keeps its own geometry (height bands, speeds, radii); this module is the ONE place that
 * says which claims stop which verbs. Pure: match-system feeds it facts, it never reads the scene.
 *
 * A detector consults it twice: `mayListen` before it tracks the hand at all (a blocked detector
 * resets its samples) and `mayCommit` before it spends a charge or fires. `gestureOwner` names the
 * single verb holding the hand: the highest-priority active claim, or null for a free hand.
 *
 * Priority (first active claim owns the hand) and what each claim blocks:
 *
 * | #  | claim      | active while                                   | owner     | blocks listen                       | blocks commit |
 * |----|------------|------------------------------------------------|-----------|-------------------------------------|---------------|
 * |  1 | held       | a tool is held (seal, rivet, wheel, forge,     | that tool | every verb outside the tool's       |               |
 * |    |            | rim grip, sling, ramp)                         |           | family (Arena Forge: both hands)    |               |
 * |  2 | release    | RELEASE_LOCK / SHAPING_RELEASE_LOCK after a    | 'release' | gust, crossguard, flick, rub        |               |
 * |    |            | pinch lets go (the open-palm lock)             |           |                                     |               |
 * |  3 | shaping    | SHAPING_RELEASE_LOCK after a tool finished,    | 'release' | ramp, grip, sling, cup, groove      |               |
 * |    |            | then until the fingertip clears the floor      |           |                                     |               |
 * |  4 | follow     | FLICK_AFTER_RELEASE after any pinch lets go,   | 'release' |                                     | flick, cup    |
 * |    |            | FLICK_FOLLOW_THROUGH after a flick             |           |                                     |               |
 * |  5 | rail       | this hand holds a Crossguard post, or the      | crossguard| flick, rub, slap                    |               |
 * |    |            | Crossguard beam is up (either hand)            |           |                                     |               |
 * |  6 | press      | a fingertip press (cup) is down                | cup       | flick, rub                          |               |
 * |  7 | gust       | this hand's Forge Gust is still sweeping       | gust      | flick, rub                          |               |
 * |  8 | rubWindow  | a paid Spin Rub window is open                 | rub       | gust, crossguard, groove            |               |
 * |  9 | rubTouch   | fingertip within RUB_TOUCH_SLACK of own top's  | rub       | groove                              | gust (only    |
 * |    |            | rub ring                                       |           |                                     | within RUB_TIP_GUST) |
 * | 10 | grip       | open hand over a glowing Forge grip            | grip      | crossguard                          |               |
 * | 11 | slap       | strike ready, palm down at the table outside   | slap      |                                     | cup           |
 * |    |            | the rim                                        |           |                                     |               |
 * |  - | closed     | the hand is pinching                           | (none)    | every open-hand verb                |               |
 *
 * Within a frame the detectors run shaping (cup, groove) → crossguard → gust → flick (rub rides on
 * the flick's fingertip listener); a commit sets the claim that stops the rest from the next check.
 */

/** Every hand verb that can own a hand. */
export type HandVerb =
  | 'overforge' | 'ember' | 'wheel' | 'forge' | 'grip' | 'sling' | 'ramp'
  | 'cup' | 'groove' | 'crossguard' | 'gust' | 'rub' | 'flick' | 'slap';
/** Verbs a hand holds with a pinch (Arena Forge holds both hands). */
export type HeldTool = 'overforge' | 'ember' | 'wheel' | 'forge' | 'grip' | 'sling' | 'ramp';
/** The verb holding the hand; 'release' is a finished gesture's lockout; null is a free hand. */
export type GestureOwner = HandVerb | 'release' | null;
export type Claim = 'untracked' | 'held' | 'release' | 'shaping' | 'follow' | 'rail' | 'press' | 'gust' | 'rubWindow' | 'rubTouch' | 'grip' | 'slap' | 'closed';

/** The shared open-palm lock after any pinch lets go, and after Arena Forge's release (s). */
export const RELEASE_LOCK = 0.35;
/** One finished tool owns its follow-through this long (and until the fingertip clears) (s). */
export const SHAPING_RELEASE_LOCK = 0.65;
/** After a pinch lets go, that hand cannot flick or cup this long (the release pull-back) (s). */
export const FLICK_AFTER_RELEASE = 0.45;
/** After a flick, the same hand cannot flick (or cup) again this long (its follow-through) (s). */
export const FLICK_FOLLOW_THROUGH = 0.4;
/** A lifted Finger Groove waits this long for a pinch that makes it a reach for a ramp (s). */
export const GROOVE_COMMIT_DELAY = 0.25;
/** A fingertip this far beyond its own top's rub ring is still a Spin Rub, never a groove (arena m). */
export const RUB_TOUCH_SLACK = 0.012;
/** A Forge Gust stands down only while the fingertip is this close to its own top's centre, so a
 * sweep that crosses the top still fires once past it (arena m). */
// A fingertip on any top's rim (top radius up to 0.03 + FINGER_RADIUS 0.009) is a rub, not a sweep.
export const RUB_TIP_GUST = 0.045;

/** Per-hand facts for one frame. Times are seconds left on each window (<= 0 when closed). */
export interface HandFacts {
  tracked: boolean;
  pinching: boolean;
  /** The tool this hand holds, if any (Arena Forge marks both hands). */
  held: HeldTool | null;
  releaseLock: number;
  shapingLock: number;
  /** A finished tool's fingertip has not yet left the floor. */
  needsClearance: boolean;
  followLock: number;
  /** This hand holds a Crossguard post, or the beam between both posts is up. */
  railPost: boolean;
  crossguardUp: boolean;
  /** A cup press is down under this fingertip. */
  pressing: boolean;
  /** This hand's Forge Gust effect is still running. */
  gustSweep: boolean;
  /** A paid Spin Rub window is open (it belongs to your top, so to either hand). */
  rubWindow: boolean;
  /** Fingertip to your own top's centre (Infinity when it is down), and that top's rub ring
   * (its radius + the finger + rub slack). */
  tipToOwnTop: number;
  ownTopRing: number;
  /** The open palm is over a reserved Forge grip. */
  onForgeGrip: boolean;
  /** The ultimate is ready and the palm is down at the table outside the rim. */
  slapPose: boolean;
}

/** A free, tracked, open hand far from everything (the base for tests and defaults). */
export const FREE_HAND: Readonly<HandFacts> = {
  tracked: true, pinching: false, held: null, releaseLock: 0, shapingLock: 0, needsClearance: false, followLock: 0,
  railPost: false, crossguardUp: false, pressing: false, gustSweep: false, rubWindow: false,
  tipToOwnTop: Infinity, ownTopRing: 0, onForgeGrip: false, slapPose: false,
};

const OPEN_HAND: readonly HandVerb[] = ['cup', 'groove', 'crossguard', 'gust', 'rub', 'flick', 'slap'];
/** updateShaping runs these together: holding one of them does not lock out the others' upkeep. */
const SHAPING_FAMILY: readonly HandVerb[] = ['ramp', 'grip', 'sling', 'cup', 'groove'];
const family = (v: HandVerb): readonly HandVerb[] => (SHAPING_FAMILY.includes(v) ? SHAPING_FAMILY : [v]);

interface Rule {
  claim: Claim;
  owner: (f: HandFacts) => GestureOwner;
  active: (f: HandFacts) => boolean;
  listen: (v: HandVerb, f: HandFacts) => boolean;
  commit?: (v: HandVerb, f: HandFacts) => boolean;
}
const among = (...vs: HandVerb[]) => (v: HandVerb) => vs.includes(v);

/** The priority table above, in order. */
const RULES: readonly Rule[] = [
  { claim: 'untracked', owner: () => null, active: (f) => !f.tracked, listen: () => true },
  { claim: 'held', owner: (f) => f.held, active: (f) => f.held !== null, listen: (v, f) => !family(f.held!).includes(v) },
  { claim: 'release', owner: () => 'release', active: (f) => f.releaseLock > 0, listen: among('gust', 'crossguard', 'flick', 'rub') },
  { claim: 'shaping', owner: () => 'release', active: (f) => f.shapingLock > 0 || f.needsClearance, listen: among(...SHAPING_FAMILY) },
  { claim: 'follow', owner: () => 'release', active: (f) => f.followLock > 0, listen: () => false, commit: among('flick', 'cup') },
  { claim: 'rail', owner: () => 'crossguard', active: (f) => f.railPost || f.crossguardUp, listen: (v, f) => v === 'slap' || (f.railPost && (v === 'flick' || v === 'rub')) },
  { claim: 'press', owner: () => 'cup', active: (f) => f.pressing, listen: among('flick', 'rub') },
  { claim: 'gust', owner: () => 'gust', active: (f) => f.gustSweep, listen: among('flick', 'rub') },
  { claim: 'rubWindow', owner: () => 'rub', active: (f) => f.rubWindow, listen: among('gust', 'crossguard', 'groove') },
  {
    claim: 'rubTouch', owner: () => 'rub', active: (f) => f.tipToOwnTop <= f.ownTopRing + RUB_TOUCH_SLACK,
    listen: among('groove'), commit: (v, f) => v === 'gust' && f.tipToOwnTop < RUB_TIP_GUST,
  },
  { claim: 'grip', owner: () => 'grip', active: (f) => f.onForgeGrip, listen: among('crossguard') },
  { claim: 'slap', owner: () => 'slap', active: (f) => f.slapPose, listen: () => false, commit: among('cup') },
  { claim: 'closed', owner: () => null, active: (f) => f.pinching, listen: (v) => OPEN_HAND.includes(v) },
];

/** The single verb that owns this hand this frame (the first active claim), or null when free. */
export function gestureOwner(f: HandFacts): GestureOwner {
  for (const r of RULES) if (r.active(f) && r.claim !== 'closed') return r.owner(f);
  return null;
}

/** The first claim stopping `verb` from tracking this hand, or null when it may listen. */
export function listenBlocker(f: HandFacts, verb: HandVerb): Claim | null {
  for (const r of RULES) if (r.active(f) && r.listen(verb, f)) return r.claim;
  return null;
}

/** The first claim stopping `verb` from firing (listen blocks count too), or null when it may. */
export function commitBlocker(f: HandFacts, verb: HandVerb): Claim | null {
  for (const r of RULES) if (r.active(f) && (r.listen(verb, f) || r.commit?.(verb, f))) return r.claim;
  return null;
}

export const mayListen = (f: HandFacts, verb: HandVerb) => listenBlocker(f, verb) === null;
export const mayCommit = (f: HandFacts, verb: HandVerb) => commitBlocker(f, verb) === null;

/** True when a tool updated outside updateShaping (seal, rivet, wheel, forge) holds the hand. */
export const heldElsewhere = (f: HandFacts) => f.held !== null && !SHAPING_FAMILY.includes(f.held);
