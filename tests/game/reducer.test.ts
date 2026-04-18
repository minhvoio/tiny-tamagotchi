import { describe, expect, it } from 'vitest';
import { reducer } from '@/game/reducer';
import { initialState, type NeglectCounters, type PetModel, type PetState } from '@/game/state';
import {
  CARE_AMOUNTS,
  DECAY_PER_TICK,
  EVOLVE_CARE_TICKS,
  HEAL_SAFE_BAND,
  MAX_STAT,
  MIN_STAT,
  PLAY_MIN_ENERGY,
  REST_RECOVERY_PER_TICK,
  SICK_NEGLECT_TICKS,
  TICK_INTERVAL_MS,
} from '@/game/constants';
import { clamp } from '@/game/util';

function make(partial: {
  name?: string;
  hunger?: number;
  happiness?: number;
  energy?: number;
  isResting?: boolean;
  state?: PetState;
  hasEvolved?: boolean;
  neglectTicks?: Partial<NeglectCounters>;
  careTicks?: number;
  lastTickAt?: number;
}): PetModel {
  return {
    name: partial.name ?? '',
    vitals: {
      hunger: partial.hunger ?? MAX_STAT,
      happiness: partial.happiness ?? MAX_STAT,
      energy: partial.energy ?? MAX_STAT,
    },
    isResting: partial.isResting ?? false,
    state: partial.state ?? 'Normal',
    hasEvolved: partial.hasEvolved ?? false,
    neglectTicks: {
      hunger: partial.neglectTicks?.hunger ?? 0,
      happiness: partial.neglectTicks?.happiness ?? 0,
      energy: partial.neglectTicks?.energy ?? 0,
    },
    careTicks: partial.careTicks ?? 0,
    lastTickAt: partial.lastTickAt ?? 0,
  };
}

describe('clamp (util)', () => {
  it('returns value unchanged when inside the range', () => {
    expect(clamp(42, 0, 100)).toBe(42);
  });

  it('snaps below-min values up to min', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });

  it('snaps above-max values down to max', () => {
    expect(clamp(250, 0, 100)).toBe(100);
  });
});

describe('reducer — FEED', () => {
  it('adds feed deltas (hunger +20, happiness +5) when awake and below cap', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50 });
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(40 + CARE_AMOUNTS.feed.hunger);
    expect(next.vitals.happiness).toBe(40 + CARE_AMOUNTS.feed.happiness);
    expect(next.vitals.energy).toBe(50);
  });

  it('clamps both affected vitals at MAX_STAT', () => {
    const start = make({ hunger: 95, happiness: 98, energy: 50 });
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(MAX_STAT);
    expect(next.vitals.happiness).toBe(MAX_STAT);
  });

  it('is a no-op when both hunger and happiness are already at MAX_STAT', () => {
    const start = make({ hunger: MAX_STAT, happiness: MAX_STAT, energy: 50 });
    const next = reducer(start, { type: 'FEED' });
    expect(next).toBe(start);
  });

  it('is a no-op while isResting', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50, isResting: true });
    const next = reducer(start, { type: 'FEED' });
    expect(next).toBe(start);
  });

  it('still feeds while Sick (Sick does not disable Feed)', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50, state: 'Sick' });
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(40 + CARE_AMOUNTS.feed.hunger);
    expect(next.state).toBe('Sick');
  });
});

describe('reducer — PLAY', () => {
  it('adds play deltas (happiness +20, energy -15) when awake and energy >= PLAY_MIN_ENERGY', () => {
    const start = make({ hunger: 80, happiness: 40, energy: 50 });
    const next = reducer(start, { type: 'PLAY' });
    expect(next.vitals.happiness).toBe(40 + CARE_AMOUNTS.play.happiness);
    expect(next.vitals.energy).toBe(50 + CARE_AMOUNTS.play.energy);
    expect(next.vitals.hunger).toBe(80);
  });

  it('clamps happiness at MAX_STAT', () => {
    const start = make({ happiness: 90, energy: 80 });
    const next = reducer(start, { type: 'PLAY' });
    expect(next.vitals.happiness).toBe(MAX_STAT);
  });

  it('clamps energy at MIN_STAT rather than going negative', () => {
    const start = make({ happiness: 50, energy: PLAY_MIN_ENERGY });
    const next = reducer(start, { type: 'PLAY' });
    expect(next.vitals.energy).toBe(MIN_STAT);
  });

  it('is a no-op when energy < PLAY_MIN_ENERGY', () => {
    const start = make({ energy: PLAY_MIN_ENERGY - 1 });
    const next = reducer(start, { type: 'PLAY' });
    expect(next).toBe(start);
  });

  it('is a no-op while isResting', () => {
    const start = make({ energy: 80, isResting: true });
    const next = reducer(start, { type: 'PLAY' });
    expect(next).toBe(start);
  });
});

describe('reducer — REST', () => {
  it('sets isResting to true from false, leaving vitals untouched', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const next = reducer(start, { type: 'REST' });
    expect(next.isResting).toBe(true);
    expect(next.vitals).toEqual(start.vitals);
  });

  it('toggles isResting back to false (acts as Wake), leaving vitals untouched', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50, isResting: true });
    const next = reducer(start, { type: 'REST' });
    expect(next.isResting).toBe(false);
    expect(next.vitals).toEqual(start.vitals);
  });
});

describe('reducer — HEAL', () => {
  it('is identity from Normal (unchanged state, object referential equality)', () => {
    const start = make({ hunger: 30, happiness: 30, energy: 30, state: 'Normal' });
    const next = reducer(start, { type: 'HEAL' });
    expect(next).toBe(start);
  });

  it('is identity from Evolved (unchanged, object referential equality)', () => {
    const start = make({
      hunger: 30,
      happiness: 30,
      energy: 30,
      state: 'Evolved',
      hasEvolved: true,
    });
    const next = reducer(start, { type: 'HEAL' });
    expect(next).toBe(start);
  });

  it('from Sick clamps vitals <50 up to HEAL_SAFE_BAND and leaves >=50 untouched', () => {
    const start = make({
      hunger: 5,
      happiness: 70,
      energy: 20,
      state: 'Sick',
    });
    const next = reducer(start, { type: 'HEAL' });
    expect(next.vitals.hunger).toBe(HEAL_SAFE_BAND);
    expect(next.vitals.happiness).toBe(70);
    expect(next.vitals.energy).toBe(HEAL_SAFE_BAND);
  });

  it('from Sick with hasEvolved=false returns state=Normal and resets counters', () => {
    const start = make({
      hunger: 5,
      happiness: 5,
      energy: 5,
      state: 'Sick',
      hasEvolved: false,
      neglectTicks: { hunger: 10, happiness: 4, energy: 2 },
      careTicks: 0,
    });
    const next = reducer(start, { type: 'HEAL' });
    expect(next.state).toBe('Normal');
    expect(next.hasEvolved).toBe(false);
    expect(next.neglectTicks).toEqual({ hunger: 0, happiness: 0, energy: 0 });
    expect(next.careTicks).toBe(0);
  });

  it('from Sick with hasEvolved=true returns state=Evolved (crown returns)', () => {
    const start = make({
      hunger: 5,
      happiness: 5,
      energy: 5,
      state: 'Sick',
      hasEvolved: true,
      neglectTicks: { hunger: 10, happiness: 0, energy: 0 },
    });
    const next = reducer(start, { type: 'HEAL' });
    expect(next.state).toBe('Evolved');
    expect(next.hasEvolved).toBe(true);
  });
});

describe('reducer — TICK while awake', () => {
  it('decays all three vitals by DECAY_PER_TICK per interval', () => {
    const start = make({ hunger: 50, happiness: 60, energy: 70 });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.vitals.hunger).toBe(50 - DECAY_PER_TICK);
    expect(next.vitals.happiness).toBe(60 - DECAY_PER_TICK);
    expect(next.vitals.energy).toBe(70 - DECAY_PER_TICK);
    expect(next.isResting).toBe(false);
  });

  it('is deterministic for a given elapsedMs', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const a = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 2, nowMs: 0 });
    const b = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 2, nowMs: 0 });
    expect(a.vitals).toEqual(b.vitals);
    expect(a.vitals.hunger).toBe(50 - 2 * DECAY_PER_TICK);
  });

  it('clamps every vital at MIN_STAT rather than going negative', () => {
    const start = make({ hunger: 0, happiness: 0, energy: 0 });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 10, nowMs: 0 });
    expect(next.vitals.hunger).toBe(MIN_STAT);
    expect(next.vitals.happiness).toBe(MIN_STAT);
    expect(next.vitals.energy).toBe(MIN_STAT);
  });

  it('TICK with elapsedMs = 0 is a no-op', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const next = reducer(start, { type: 'TICK', elapsedMs: 0, nowMs: 0 });
    expect(next).toBe(start);
  });

  it('always returns integer vitals (floors fractional decay)', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const next = reducer(start, {
      type: 'TICK',
      elapsedMs: Math.floor(TICK_INTERVAL_MS / 2),
      nowMs: 0,
    });
    expect(Number.isInteger(next.vitals.hunger)).toBe(true);
    expect(Number.isInteger(next.vitals.happiness)).toBe(true);
    expect(Number.isInteger(next.vitals.energy)).toBe(true);
  });

  it('increments neglect counter when a vital is at or below SICK_VITAL_THRESHOLD', () => {
    const start = make({ hunger: 11, happiness: 50, energy: 50 });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.vitals.hunger).toBe(10);
    expect(next.neglectTicks.hunger).toBe(1);
    expect(next.neglectTicks.happiness).toBe(0);
    expect(next.neglectTicks.energy).toBe(0);
  });

  it('resets a neglect counter to 0 when the vital recovers above threshold', () => {
    const start = make({
      hunger: 20,
      happiness: 50,
      energy: 50,
      neglectTicks: { hunger: 5, happiness: 0, energy: 0 },
    });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.vitals.hunger).toBe(19);
    expect(next.neglectTicks.hunger).toBe(0);
  });

  it('atomically transitions Normal → Sick on the crossing tick (same returned object)', () => {
    const start = make({
      hunger: 8,
      happiness: 50,
      energy: 50,
      neglectTicks: { hunger: SICK_NEGLECT_TICKS - 1, happiness: 0, energy: 0 },
      state: 'Normal',
    });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.state).toBe('Sick');
    expect(next.neglectTicks.hunger).toBeGreaterThanOrEqual(SICK_NEGLECT_TICKS);
  });

  it('atomically transitions Evolved → Sick on the crossing tick, keeping hasEvolved true', () => {
    const start = make({
      hunger: 8,
      happiness: 50,
      energy: 50,
      neglectTicks: { hunger: SICK_NEGLECT_TICKS - 1, happiness: 0, energy: 0 },
      state: 'Evolved',
      hasEvolved: true,
    });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.state).toBe('Sick');
    expect(next.hasEvolved).toBe(true);
  });

  it('atomically transitions Normal → Evolved on the crossing tick (same returned object)', () => {
    const start = make({
      hunger: 80,
      happiness: 80,
      energy: 80,
      careTicks: EVOLVE_CARE_TICKS - 1,
      state: 'Normal',
      hasEvolved: false,
    });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.state).toBe('Evolved');
    expect(next.hasEvolved).toBe(true);
  });

  it('hasEvolved never flips back to false across many mixed TICKs', () => {
    let s = make({
      hunger: 80,
      happiness: 80,
      energy: 80,
      state: 'Evolved',
      hasEvolved: true,
    });
    for (let i = 0; i < 200; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
      expect(s.hasEvolved).toBe(true);
    }
  });

  it('Evolved does not re-evolve: careTicks stays 0 from Evolved', () => {
    let s = make({
      hunger: 100,
      happiness: 100,
      energy: 100,
      state: 'Evolved',
      hasEvolved: true,
      careTicks: 0,
    });
    for (let i = 0; i < EVOLVE_CARE_TICKS + 5; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
      expect(s.careTicks).toBe(0);
      expect(s.state).toBe('Evolved');
    }
  });
});

describe('reducer — TICK while resting', () => {
  it('adds REST_RECOVERY_PER_TICK to energy only; hunger and happiness are frozen', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.vitals.energy).toBe(50 + REST_RECOVERY_PER_TICK);
    expect(next.vitals.hunger).toBe(40);
    expect(next.vitals.happiness).toBe(40);
    expect(next.isResting).toBe(true);
  });

  it('clamps energy at MAX_STAT and clears isResting atomically when energy reaches 100', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 95, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.vitals.energy).toBe(MAX_STAT);
    expect(next.isResting).toBe(false);
    expect(next.vitals.hunger).toBe(40);
    expect(next.vitals.happiness).toBe(40);
  });

  it('does not clear isResting when energy is still below MAX_STAT after the tick', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    expect(next.vitals.energy).toBeLessThan(MAX_STAT);
    expect(next.isResting).toBe(true);
  });

  it('TICK with elapsedMs = 0 is a no-op while resting', () => {
    const start = make({ energy: 50, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: 0, nowMs: 0 });
    expect(next).toBe(start);
  });

  it('pauses (does not reset) neglect counters while resting', () => {
    let s = make({
      hunger: 5,
      happiness: 50,
      energy: 50,
      isResting: true,
      neglectTicks: { hunger: 3, happiness: 0, energy: 0 },
    });
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    }
    expect(s.neglectTicks.hunger).toBe(3);
    expect(s.vitals.hunger).toBe(5);
  });

  it('pauses (does not reset) care counter while resting', () => {
    let s = make({
      hunger: 80,
      happiness: 80,
      energy: 30,
      isResting: true,
      state: 'Normal',
      careTicks: 10,
    });
    for (let i = 0; i < 5; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
    }
    expect(s.isResting).toBe(true);
    expect(s.careTicks).toBe(10);
  });
});

describe('reducer — forbidden transitions', () => {
  it('Evolved never regresses to Normal via TICK alone', () => {
    let s = make({
      hunger: 100,
      happiness: 100,
      energy: 100,
      state: 'Evolved',
      hasEvolved: true,
    });
    for (let i = 0; i < 100; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
      expect(s.state === 'Evolved' || s.state === 'Sick').toBe(true);
    }
  });

  it('Sick never transitions to Normal via TICK alone (only via HEAL)', () => {
    let s = make({
      hunger: 100,
      happiness: 100,
      energy: 100,
      state: 'Sick',
      hasEvolved: false,
    });
    for (let i = 0; i < 50; i++) {
      s = reducer(s, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 });
      expect(s.state).toBe('Sick');
    }
  });

  it('HEAL outside Sick never changes state or hasEvolved', () => {
    const fromNormal = make({ hunger: 5, state: 'Normal', hasEvolved: false });
    const afterNormal = reducer(fromNormal, { type: 'HEAL' });
    expect(afterNormal.state).toBe('Normal');
    expect(afterNormal.hasEvolved).toBe(false);

    const fromEvolved = make({ hunger: 5, state: 'Evolved', hasEvolved: true });
    const afterEvolved = reducer(fromEvolved, { type: 'HEAL' });
    expect(afterEvolved.state).toBe('Evolved');
    expect(afterEvolved.hasEvolved).toBe(true);
  });

  it('PetState never escapes {Normal, Sick, Evolved} across randomized dispatches', () => {
    const rng = mulberry32(42);
    let s = initialState;
    const actions: Array<
      () =>
        | { type: 'FEED' }
        | { type: 'PLAY' }
        | { type: 'REST' }
        | { type: 'HEAL' }
        | { type: 'TICK'; elapsedMs: number; nowMs: number }
    > = [
      () => ({ type: 'FEED' }) as const,
      () => ({ type: 'PLAY' }) as const,
      () => ({ type: 'REST' }) as const,
      () => ({ type: 'HEAL' }) as const,
      () => ({ type: 'TICK', elapsedMs: TICK_INTERVAL_MS, nowMs: 0 }) as const,
    ];
    for (let i = 0; i < 200; i++) {
      const pick = actions[Math.floor(rng() * actions.length)];
      if (!pick) continue;
      s = reducer(s, pick());
      expect(['Normal', 'Sick', 'Evolved']).toContain(s.state);
    }
  });
});

describe('reducer — __SEED__ harness', () => {
  it('applies the evolve-near preset into initialState', () => {
    const next = reducer(initialState, { type: '__SEED__', preset: 'evolve-near' });
    expect(next.vitals).toEqual({ hunger: 80, happiness: 80, energy: 80 });
    expect(next.state).toBe('Normal');
    expect(next.hasEvolved).toBe(false);
    expect(next.careTicks).toBe(EVOLVE_CARE_TICKS - 1);
  });

  it('applies the sick-near preset', () => {
    const next = reducer(initialState, { type: '__SEED__', preset: 'sick-near' });
    expect(next.vitals.hunger).toBe(5);
    expect(next.neglectTicks.hunger).toBe(SICK_NEGLECT_TICKS - 1);
    expect(next.state).toBe('Normal');
  });

  it('applies the evolved-near-sick preset', () => {
    const next = reducer(initialState, { type: '__SEED__', preset: 'evolved-near-sick' });
    expect(next.state).toBe('Evolved');
    expect(next.hasEvolved).toBe(true);
    expect(next.neglectTicks.hunger).toBe(SICK_NEGLECT_TICKS - 1);
  });

  it('is identity for an unknown preset name', () => {
    const next = reducer(initialState, { type: '__SEED__', preset: 'nope' });
    expect(next).toBe(initialState);
  });
});

describe('reducer — RESET / SET_NAME / __HYDRATE__ / TICK.lastTickAt', () => {
  it('TICK sets lastTickAt to action.nowMs on the returned state (awake)', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const next = reducer(start, {
      type: 'TICK',
      elapsedMs: TICK_INTERVAL_MS,
      nowMs: 12345678,
    });
    expect(next.lastTickAt).toBe(12345678);
  });

  it('TICK sets lastTickAt while resting too', () => {
    const start = make({
      hunger: 50,
      happiness: 50,
      energy: 20,
      isResting: true,
    });
    const next = reducer(start, {
      type: 'TICK',
      elapsedMs: TICK_INTERVAL_MS,
      nowMs: 99,
    });
    expect(next.lastTickAt).toBe(99);
  });

  it('RESET atomically returns the full initialState shape', () => {
    const degraded = make({
      name: 'Buddy',
      hunger: 10,
      happiness: 5,
      energy: 20,
      state: 'Sick',
      hasEvolved: true,
      neglectTicks: { hunger: 5, happiness: 0, energy: 2 },
      careTicks: 3,
      lastTickAt: 9999,
    });
    const next = reducer(degraded, { type: 'RESET' });
    expect(next.name).toBe('');
    expect(next.vitals).toEqual({ hunger: 100, happiness: 100, energy: 100 });
    expect(next.state).toBe('Normal');
    expect(next.hasEvolved).toBe(false);
    expect(next.neglectTicks).toEqual({ hunger: 0, happiness: 0, energy: 0 });
    expect(next.careTicks).toBe(0);
    expect(next.lastTickAt).toBe(0);
    expect(next.isResting).toBe(false);
  });

  it('SET_NAME sets name to the provided string and leaves other fields unchanged', () => {
    const next = reducer(initialState, { type: 'SET_NAME', name: 'Pixel' });
    expect(next.name).toBe('Pixel');
    expect(next.vitals).toEqual(initialState.vitals);
    expect(next.state).toBe('Normal');
  });

  it('SET_NAME is identity when the name is unchanged', () => {
    const named = { ...initialState, name: 'Pixel' };
    const next = reducer(named, { type: 'SET_NAME', name: 'Pixel' });
    expect(next).toBe(named);
  });

  it('__HYDRATE__ returns action.state directly', () => {
    const stored: PetModel = {
      ...initialState,
      name: 'Stored',
      vitals: { hunger: 42, happiness: 33, energy: 77 },
      lastTickAt: 5555,
    };
    const next = reducer(initialState, { type: '__HYDRATE__', state: stored });
    expect(next).toBe(stored);
  });
});

describe('reducer — invariants', () => {
  it('returns the same state object when the action type is unknown', () => {
    expect(reducer(initialState, { type: 'UNKNOWN' } as unknown as never)).toBe(initialState);
  });

  it('initialState has all three vitals at MAX_STAT, isResting=false, state=Normal, counters=0', () => {
    expect(initialState.vitals.hunger).toBe(MAX_STAT);
    expect(initialState.vitals.happiness).toBe(MAX_STAT);
    expect(initialState.vitals.energy).toBe(MAX_STAT);
    expect(initialState.isResting).toBe(false);
    expect(initialState.state).toBe('Normal');
    expect(initialState.hasEvolved).toBe(false);
    expect(initialState.neglectTicks).toEqual({ hunger: 0, happiness: 0, energy: 0 });
    expect(initialState.careTicks).toBe(0);
    expect(initialState.name).toBe('');
    expect(initialState.lastTickAt).toBe(0);
  });
});

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
