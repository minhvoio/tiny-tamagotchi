import {
  CARE_AMOUNTS,
  DECAY_PER_TICK,
  EVOLVE_VITAL_THRESHOLD,
  HEAL_SAFE_BAND,
  MAX_STAT,
  MIN_STAT,
  PLAY_MIN_ENERGY,
  REST_RECOVERY_PER_TICK,
  SICK_NEGLECT_TICKS,
  SICK_VITAL_THRESHOLD,
  TICK_INTERVAL_MS,
} from '@/game/constants';
import type { Action, NeglectCounters, PetModel, SeedPreset, Vitals } from '@/game/state';
import { nextState } from '@/game/states';
import { clamp } from '@/game/util';

// Scope contract: `state` and `hasEvolved` are written ONLY from the value
// returned by states.nextState(). The two exceptions are the HEAL branch
// (direct write per the Heal recovery rule) and the __SEED__ branch (test
// harness with three hard-coded presets); see their branches for anchors.

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

function neglectTicksEqual(a: NeglectCounters, b: NeglectCounters): boolean {
  return a.hunger === b.hunger && a.happiness === b.happiness && a.energy === b.energy;
}

const SEED_PRESETS: Record<SeedPreset, Partial<PetModel>> = {
  'evolve-near': {
    vitals: { hunger: 80, happiness: 80, energy: 80 },
    neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
    careTicks: 59,
    state: 'Normal',
    hasEvolved: false,
    isResting: false,
  },
  'sick-near': {
    vitals: { hunger: 5, happiness: 50, energy: 50 },
    neglectTicks: { hunger: SICK_NEGLECT_TICKS - 1, happiness: 0, energy: 0 },
    careTicks: 0,
    state: 'Normal',
    hasEvolved: false,
    isResting: false,
  },
  'evolved-near-sick': {
    vitals: { hunger: 5, happiness: 50, energy: 50 },
    neglectTicks: { hunger: SICK_NEGLECT_TICKS - 1, happiness: 0, energy: 0 },
    careTicks: 0,
    state: 'Evolved',
    hasEvolved: true,
    isResting: false,
  },
};

function isKnownSeed(name: string): name is SeedPreset {
  return name === 'evolve-near' || name === 'sick-near' || name === 'evolved-near-sick';
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
    case 'HEAL': {
      // Exception to the "states.nextState is the only writer" rule: HEAL is
      // the sole recovery path out of Sick, scoped to this branch only.
      if (state.state !== 'Sick') return state;
      const healed = clampVitals({
        hunger: Math.max(state.vitals.hunger, HEAL_SAFE_BAND),
        happiness: Math.max(state.vitals.happiness, HEAL_SAFE_BAND),
        energy: Math.max(state.vitals.energy, HEAL_SAFE_BAND),
      });
      return {
        ...state,
        vitals: healed,
        state: state.hasEvolved ? 'Evolved' : 'Normal',
        neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
        careTicks: 0,
      };
    }
    case '__SEED__': {
      // Exception to the "states.nextState is the only writer" rule: the seed
      // harness exhaustively maps three preset names to hard-coded PetModel
      // slices and has no UI surface of its own.
      if (!isKnownSeed(action.preset)) return state;
      const preset = SEED_PRESETS[action.preset];
      return { ...state, ...preset };
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
        // Neglect and care counters pause during rest (not reset).
        return {
          ...state,
          vitals: { ...state.vitals, energy: nextEnergy },
          isResting: atMax ? false : state.isResting,
        };
      }
      const decay = ticks * DECAY_PER_TICK;
      const nextVitals = clampVitals({
        hunger: state.vitals.hunger - decay,
        happiness: state.vitals.happiness - decay,
        energy: state.vitals.energy - decay,
      });
      const nextNeglect: NeglectCounters = {
        hunger: nextVitals.hunger <= SICK_VITAL_THRESHOLD ? state.neglectTicks.hunger + ticks : 0,
        happiness:
          nextVitals.happiness <= SICK_VITAL_THRESHOLD ? state.neglectTicks.happiness + ticks : 0,
        energy: nextVitals.energy <= SICK_VITAL_THRESHOLD ? state.neglectTicks.energy + ticks : 0,
      };
      const allHighForCare =
        nextVitals.hunger >= EVOLVE_VITAL_THRESHOLD &&
        nextVitals.happiness >= EVOLVE_VITAL_THRESHOLD &&
        nextVitals.energy >= EVOLVE_VITAL_THRESHOLD &&
        state.state === 'Normal' &&
        !state.hasEvolved;
      const nextCareTicks = allHighForCare ? state.careTicks + ticks : 0;
      const machine = nextState({
        prev: state.state,
        hasEvolved: state.hasEvolved,
        neglectTicks: nextNeglect,
        careTicks: nextCareTicks,
      });
      const vitalsUnchanged = vitalsEqual(nextVitals, state.vitals);
      const neglectUnchanged = neglectTicksEqual(nextNeglect, state.neglectTicks);
      const careUnchanged = nextCareTicks === state.careTicks;
      const stateUnchanged = machine.state === state.state;
      const evolvedUnchanged = machine.hasEvolved === state.hasEvolved;
      if (
        vitalsUnchanged &&
        neglectUnchanged &&
        careUnchanged &&
        stateUnchanged &&
        evolvedUnchanged
      ) {
        return state;
      }
      return {
        ...state,
        vitals: nextVitals,
        neglectTicks: nextNeglect,
        careTicks: nextCareTicks,
        state: machine.state,
        hasEvolved: machine.hasEvolved,
      };
    }
    default:
      return state;
  }
}
