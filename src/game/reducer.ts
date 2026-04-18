import {
  CARE_AMOUNTS,
  DECAY_PER_TICK,
  MAX_STAT,
  MIN_STAT,
  PLAY_MIN_ENERGY,
  REST_RECOVERY_PER_TICK,
  TICK_INTERVAL_MS,
} from '@/game/constants';
import type { Action, PetModel, Vitals } from '@/game/state';
import { clamp } from '@/game/util';

// clamps because stats are integer 0-100 by scope contract
function clampVitals(v: Vitals): Vitals {
  return {
    hunger: clamp(v.hunger, MIN_STAT, MAX_STAT),
    happiness: clamp(v.happiness, MIN_STAT, MAX_STAT),
    energy: clamp(v.energy, MIN_STAT, MAX_STAT),
  };
}

function vitalsEqual(a: Vitals, b: Vitals): boolean {
  return a.hunger === b.hunger && a.happiness === b.happiness && a.energy === b.energy;
}

export function reducer(state: PetModel, action: Action): PetModel {
  switch (action.type) {
    case 'FEED': {
      if (state.isResting) return state;
      const next = clampVitals({
        hunger: state.vitals.hunger + CARE_AMOUNTS.feed.hunger,
        happiness: state.vitals.happiness + CARE_AMOUNTS.feed.happiness,
        energy: state.vitals.energy,
      });
      if (vitalsEqual(next, state.vitals)) return state;
      return { ...state, vitals: next };
    }
    case 'PLAY': {
      if (state.isResting) return state;
      if (state.vitals.energy < PLAY_MIN_ENERGY) return state;
      const next = clampVitals({
        hunger: state.vitals.hunger,
        happiness: state.vitals.happiness + CARE_AMOUNTS.play.happiness,
        energy: state.vitals.energy + CARE_AMOUNTS.play.energy,
      });
      if (vitalsEqual(next, state.vitals)) return state;
      return { ...state, vitals: next };
    }
    case 'REST': {
      return { ...state, isResting: !state.isResting };
    }
    case 'TICK': {
      const ticks = Math.floor(action.elapsedMs / TICK_INTERVAL_MS);
      if (ticks === 0) return state;
      if (state.isResting) {
        const nextEnergy = clamp(
          state.vitals.energy + ticks * REST_RECOVERY_PER_TICK,
          MIN_STAT,
          MAX_STAT,
        );
        if (nextEnergy === state.vitals.energy) return state;
        const atMax = nextEnergy >= MAX_STAT;
        // Auto-wake: clear isResting on the same returned state where energy hits MAX_STAT.
        return {
          ...state,
          vitals: { ...state.vitals, energy: nextEnergy },
          isResting: atMax ? false : state.isResting,
        };
      }
      const decay = ticks * DECAY_PER_TICK;
      const next = clampVitals({
        hunger: state.vitals.hunger - decay,
        happiness: state.vitals.happiness - decay,
        energy: state.vitals.energy - decay,
      });
      if (vitalsEqual(next, state.vitals)) return state;
      return { ...state, vitals: next };
    }
    default:
      return state;
  }
}
