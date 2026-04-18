import { describe, expect, it } from 'vitest';
import { reducer } from '@/game/reducer';
import { initialState } from '@/game/state';
import {
  DECAY_PER_TICK,
  FEED_AMOUNT,
  MAX_STAT,
  MIN_STAT,
  TICK_INTERVAL_MS,
} from '@/game/constants';
import { clamp } from '@/game/util';

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
  it(`adds FEED_AMOUNT (${FEED_AMOUNT}) to hunger when below max`, () => {
    const start = { vitals: { hunger: 40 } };
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(40 + FEED_AMOUNT);
  });

  it('feeding from 0 adds exactly FEED_AMOUNT', () => {
    const start = { vitals: { hunger: MIN_STAT } };
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(MIN_STAT + FEED_AMOUNT);
  });

  it('clamps hunger at MAX_STAT when feeding near the cap', () => {
    const start = { vitals: { hunger: 95 } };
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(MAX_STAT);
  });

  it('is a no-op when hunger is already at MAX_STAT', () => {
    const start = { vitals: { hunger: MAX_STAT } };
    const next = reducer(start, { type: 'FEED' });
    expect(next.vitals.hunger).toBe(MAX_STAT);
  });
});

describe('reducer — TICK', () => {
  it(`decays by DECAY_PER_TICK (${DECAY_PER_TICK}) after one TICK_INTERVAL_MS (${TICK_INTERVAL_MS})`, () => {
    const start = { vitals: { hunger: 50 } };
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS });
    expect(next.vitals.hunger).toBe(50 - DECAY_PER_TICK);
  });

  it('is deterministic for a given elapsedMs', () => {
    const start = { vitals: { hunger: 50 } };
    const a = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 2 });
    const b = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 2 });
    expect(a.vitals.hunger).toBe(b.vitals.hunger);
    expect(a.vitals.hunger).toBe(50 - 2 * DECAY_PER_TICK);
  });

  it('clamps hunger at MIN_STAT instead of going negative', () => {
    const start = { vitals: { hunger: 0 } };
    const next = reducer(start, { type: 'TICK', elapsedMs: TICK_INTERVAL_MS * 10 });
    expect(next.vitals.hunger).toBe(MIN_STAT);
  });

  it('TICK with elapsedMs = 0 is a no-op', () => {
    const start = { vitals: { hunger: 50 } };
    const next = reducer(start, { type: 'TICK', elapsedMs: 0 });
    expect(next.vitals.hunger).toBe(50);
  });

  it('always returns an integer hunger (floors fractional decay)', () => {
    const start = { vitals: { hunger: 50 } };
    const next = reducer(start, {
      type: 'TICK',
      elapsedMs: Math.floor(TICK_INTERVAL_MS / 2),
    });
    expect(Number.isInteger(next.vitals.hunger)).toBe(true);
  });
});

describe('reducer — invariants', () => {
  it('returns the same state object when the action type is unknown', () => {
    expect(reducer(initialState, { type: 'UNKNOWN' } as unknown as never)).toBe(initialState);
  });
});
