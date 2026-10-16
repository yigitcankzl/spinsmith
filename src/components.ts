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
});

export default defineComponents([FirstFiveState]);
