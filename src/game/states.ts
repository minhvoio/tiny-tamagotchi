import { EVOLVE_CARE_TICKS, SICK_NEGLECT_TICKS } from '@/game/constants';
import type { NeglectCounters, PetState } from '@/game/state';

// Pure state machine. The reducer is the only caller; no timing, no vital
// inspection, no I/O. Counters are supplied by the reducer.
export function nextState(args: {
  prev: PetState;
  hasEvolved: boolean;
  neglectTicks: NeglectCounters;
  careTicks: number;
}): { state: PetState; hasEvolved: boolean } {
  const { prev, hasEvolved, neglectTicks, careTicks } = args;

  // Sick is only exited by HEAL, which lives in the reducer.
  if (prev === 'Sick') {
    return { state: 'Sick', hasEvolved };
  }

  if (
    neglectTicks.hunger >= SICK_NEGLECT_TICKS ||
    neglectTicks.happiness >= SICK_NEGLECT_TICKS ||
    neglectTicks.energy >= SICK_NEGLECT_TICKS
  ) {
    return { state: 'Sick', hasEvolved };
  }

  if (prev === 'Normal' && !hasEvolved && careTicks >= EVOLVE_CARE_TICKS) {
    return { state: 'Evolved', hasEvolved: true };
  }

  return { state: prev, hasEvolved };
}
