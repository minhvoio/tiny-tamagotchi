import { MAX_STAT } from '@/game/constants';

export type Stat = number;

export interface Vitals {
  hunger: Stat;
}

export interface PetModel {
  vitals: Vitals;
}

export type Action = { type: 'FEED' } | { type: 'TICK'; elapsedMs: number };

export const initialState: PetModel = {
  vitals: {
    hunger: MAX_STAT,
  },
};
