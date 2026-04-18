import { MAX_STAT } from '@/game/constants';

export type Stat = number;

export interface Vitals {
  hunger: Stat;
  happiness: Stat;
  energy: Stat;
}

export type PetState = 'Normal' | 'Sick' | 'Evolved';

export interface NeglectCounters {
  hunger: number;
  happiness: number;
  energy: number;
}

export interface PetModel {
  name: string;
  vitals: Vitals;
  isResting: boolean;
  state: PetState;
  hasEvolved: boolean;
  neglectTicks: NeglectCounters;
  careTicks: number;
  lastTickAt: number;
}

export type SeedPreset = 'evolve-near' | 'sick-near' | 'evolved-near-sick';

export type Action =
  | { type: 'FEED' }
  | { type: 'PLAY' }
  | { type: 'REST' }
  | { type: 'HEAL' }
  | { type: 'TICK'; elapsedMs: number; nowMs: number }
  | { type: 'RESET' }
  | { type: 'SET_NAME'; name: string }
  | { type: '__HYDRATE__'; state: PetModel }
  | { type: '__SEED__'; preset: string };

export const initialState: PetModel = {
  name: '',
  vitals: {
    hunger: MAX_STAT,
    happiness: MAX_STAT,
    energy: MAX_STAT,
  },
  isResting: false,
  state: 'Normal',
  hasEvolved: false,
  neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
  careTicks: 0,
  lastTickAt: 0,
};
