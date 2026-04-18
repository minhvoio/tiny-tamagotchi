import { MAX_STAT } from '@/game/constants';

export type Stat = number;

export interface Vitals {
  hunger: Stat;
  happiness: Stat;
  energy: Stat;
}

export interface PetModel {
  vitals: Vitals;
  isResting: boolean;
}

export type Action =
  | { type: 'FEED' }
  | { type: 'PLAY' }
  | { type: 'REST' }
  | { type: 'TICK'; elapsedMs: number };

export const initialState: PetModel = {
  vitals: {
    hunger: MAX_STAT,
    happiness: MAX_STAT,
    energy: MAX_STAT,
  },
  isResting: false,
};
