import { createComponent, defineComponents, Types } from '@iwsdk/core';

/**
 * Coarse first-session milestones exposed through ECS so emulator and remote Quest
 * testers can prove that the hand-first loop reached its important moments.
 */
export const FirstFiveState = createComponent('FirstFiveState', {
  step: { type: Types.Int8, default: 0 },
  interventions: { type: Types.Int8, default: 0 },
  failedGestures: { type: Types.Int16, default: 0 },
  lowestFps: { type: Types.Float32, default: 0 },
  /** 0 none, 1 squeeze, 2 stretch, 3 twist, 4 tilt. */
  lastArenaForge: { type: Types.Int8, default: 0 },
  /** Signed immediate momentum swing: positive means the player's top benefited. */
  arenaForgeSwing: { type: Types.Float32, default: 0 },
  /** Live visual yaw applied while two hands twist the arena. */
  arenaMorphTwist: { type: Types.Float32, default: 0 },
  /** Live visual roll applied while two hands tilt the arena. */
  arenaMorphTilt: { type: Types.Float32, default: 0 },
  /** Two-hand grabs safely cancelled before a deliberate arena deformation. */
  arenaForgeCancels: { type: Types.Int16, default: 0 },
  /** DESK KO presentation: 0 idle, 1 rim impact, 2 airborne, 3 scored. */
  deskKoStage: { type: Types.Int8, default: 0 },
  /** Two open palms currently span a defensive rail across the live arena. */
  crossguardActive: { type: Types.Boolean, default: false },
  /** Number of tops redirected by a player-authored Crossguard this session. */
  crossguardHits: { type: Types.Int16, default: 0 },
});

export default defineComponents([FirstFiveState]);
