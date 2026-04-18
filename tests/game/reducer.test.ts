import { describe, expect, it } from 'vitest';
import { reducer } from '@/game/reducer';
import { initialState, type PetModel } from '@/game/state';
import {
  CARE_AMOUNTS,
  DECAY_PER_TICK,
  MAX_STAT,
  MIN_STAT,
  PLAY_MIN_ENERGY,
  REST_RECOVERY_PER_TICK,
  TICK_INTERVAL_MS,
} from '@/game/constants';
import { clamp } from '@/game/util';

function make(partial: {
  hunger?: number;
  happiness?: number;
  energy?: number;
  isResting?: boolean;
}): PetModel {
  return {
    vitals: {
      hunger: partial.hunger ?? MAX_STAT,
      happiness: partial.happiness ?? MAX_STAT,
      energy: partial.energy ?? MAX_STAT,
    },
    isResting: partial.isResting ?? false,
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

describe('reducer — TICK while awake', () => {
  it('decays all three vitals by DECAY_PER_TICK per interval', () => {
    const start = make({ hunger: 50, happiness: 60, energy: 70 });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS });
    expect(next.vitals.hunger).toBe(50 - DECAY_PER_TICK);
    expect(next.vitals.happiness).toBe(60 - DECAY_PER_TICK);
    expect(next.vitals.energy).toBe(70 - DECAY_PER_TICK);
    expect(next.isResting).toBe(false);
  });

  it('is deterministic for a given elapsedMs', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const a = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 2 });
    const b = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 2 });
    expect(a.vitals).toEqual(b.vitals);
    expect(a.vitals.hunger).toBe(50 - 2 * DECAY_PER_TICK);
  });

  it('clamps every vital at MIN_STAT rather than going negative', () => {
    const start = make({ hunger: 0, happiness: 0, energy: 0 });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 10 });
    expect(next.vitals.hunger).toBe(MIN_STAT);
    expect(next.vitals.happiness).toBe(MIN_STAT);
    expect(next.vitals.energy).toBe(MIN_STAT);
  });

  it('TICK with elapsedMs = 0 is a no-op', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const next = reducer(start, { type: 'TICK', elapsedMs: 0 });
    expect(next).toBe(start);
  });

  it('always returns integer vitals (floors fractional decay)', () => {
    const start = make({ hunger: 50, happiness: 50, energy: 50 });
    const next = reducer(start, {
      type: 'TICK',
      elapsedMs: Math.floor(TICK_INTERVAL_MS / 2),
    });
    expect(Number.isInteger(next.vitals.hunger)).toBe(true);
    expect(Number.isInteger(next.vitals.happiness)).toBe(true);
    expect(Number.isInteger(next.vitals.energy)).toBe(true);
  });
});

describe('reducer — TICK while resting', () => {
  it('adds REST_RECOVERY_PER_TICK to energy only; hunger and happiness are frozen', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS });
    expect(next.vitals.energy).toBe(50 + REST_RECOVERY_PER_TICK);
    expect(next.vitals.hunger).toBe(40);
    expect(next.vitals.happiness).toBe(40);
    expect(next.isResting).toBe(true);
  });

  it('clamps energy at MAX_STAT and clears isResting atomically when energy reaches 100', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 95, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS });
    // Atomic auto-wake: energy=MAX_STAT AND isResting=false on the same returned state,
    // not across two dispatches.
    expect(next.vitals.energy).toBe(MAX_STAT);
    expect(next.isResting).toBe(false);
    expect(next.vitals.hunger).toBe(40);
    expect(next.vitals.happiness).toBe(40);
  });

  it('does not clear isResting when energy is still below MAX_STAT after the tick', () => {
    const start = make({ hunger: 40, happiness: 40, energy: 50, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS });
    expect(next.vitals.energy).toBeLessThan(MAX_STAT);
    expect(next.isResting).toBe(true);
  });

  it('TICK with elapsedMs = 0 is a no-op while resting', () => {
    const start = make({ energy: 50, isResting: true });
    const next = reducer(start, { type: 'TICK', elapsedMs: 0 });
    expect(next).toBe(start);
  });
});

describe('reducer — invariants', () => {
  it('returns the same state object when the action type is unknown', () => {
    expect(reducer(initialState, { type: 'UNKNOWN' } as unknown as never)).toBe(initialState);
  });

  it('initialState has all three vitals at MAX_STAT and isResting=false', () => {
    expect(initialState.vitals.hunger).toBe(MAX_STAT);
    expect(initialState.vitals.happiness).toBe(MAX_STAT);
    expect(initialState.vitals.energy).toBe(MAX_STAT);
    expect(initialState.isResting).toBe(false);
  });
});
