import {
  DECAY_PER_TICK,
  FEED_AMOUNT,
  MAX_STAT,
  MIN_STAT,
  TICK_INTERVAL_MS,
} from '@/game/constants';
import type { Action, PetModel } from '@/game/state';
import { clamp } from '@/game/util';

export function reducer(state: PetModel, action: Action): PetModel {
  switch (action.type) {
    case 'FEED': {
      const nextHunger = clamp(state.vitals.hunger + FEED_AMOUNT, MIN_STAT, MAX_STAT);
      if (nextHunger === state.vitals.hunger) return state;
      return { ...state, vitals: { ...state.vitals, hunger: nextHunger } };
    }
    case 'TICK': {
      const decay = Math.floor((action.elapsedMs / TICK_INTERVAL_MS) * DECAY_PER_TICK);
      if (decay === 0) return state;
      const nextHunger = clamp(state.vitals.hunger - decay, MIN_STAT, MAX_STAT);
      return { ...state, vitals: { ...state.vitals, hunger: nextHunger } };
    }
    default:
      return state;
  }
}
