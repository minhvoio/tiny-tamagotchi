export const MAX_STAT = 100;
export const MIN_STAT = 0;
export const TICK_INTERVAL_MS = 3000;
export const DECAY_PER_TICK = 1;
export const PLAY_MIN_ENERGY = 10;
export const REST_RECOVERY_PER_TICK = 10;

// Per-action vital deltas. Values are clamped to [MIN_STAT, MAX_STAT] by the reducer.
export const CARE_AMOUNTS = {
  feed: { hunger: 20, happiness: 5 },
  play: { happiness: 20, energy: -15 },
} as const;

export const SICK_VITAL_THRESHOLD = 10;
export const SICK_NEGLECT_TICKS = 10;
export const EVOLVE_VITAL_THRESHOLD = 70;
export const EVOLVE_CARE_TICKS = 60;
export const HEAL_SAFE_BAND = 50;

export const MAX_OFFLINE_MS = 8 * 60 * 60 * 1000;
