import { describe, expect, it, vi } from 'vitest';
import { nextState } from '@/game/states';
import { EVOLVE_CARE_TICKS, SICK_NEGLECT_TICKS } from '@/game/constants';

const ZERO = { hunger: 0, happiness: 0, energy: 0 };

describe('nextState — purity and identity', () => {
  it('returns Normal unchanged when no counter trips', () => {
    const out = nextState({
      prev: 'Normal',
      hasEvolved: false,
      neglectTicks: ZERO,
      careTicks: 0,
    });
    expect(out).toEqual({ state: 'Normal', hasEvolved: false });
  });

  it('is pure: identical inputs produce structurally equal outputs', () => {
    const args = {
      prev: 'Normal' as const,
      hasEvolved: false,
      neglectTicks: ZERO,
      careTicks: 10,
    };
    expect(nextState(args)).toEqual(nextState(args));
  });

  it('does not read Date.now or Math.random', () => {
    const now = vi.spyOn(Date, 'now');
    const rand = vi.spyOn(Math, 'random');
    nextState({ prev: 'Normal', hasEvolved: false, neglectTicks: ZERO, careTicks: 10 });
    expect(now).not.toHaveBeenCalled();
    expect(rand).not.toHaveBeenCalled();
    now.mockRestore();
    rand.mockRestore();
  });
});

describe('nextState — sick trip', () => {
  it('Normal → Sick when any counter meets SICK_NEGLECT_TICKS', () => {
    const out = nextState({
      prev: 'Normal',
      hasEvolved: false,
      neglectTicks: { hunger: SICK_NEGLECT_TICKS, happiness: 0, energy: 0 },
      careTicks: 0,
    });
    expect(out).toEqual({ state: 'Sick', hasEvolved: false });
  });

  it('Evolved → Sick preserves hasEvolved=true', () => {
    const out = nextState({
      prev: 'Evolved',
      hasEvolved: true,
      neglectTicks: { hunger: 0, happiness: SICK_NEGLECT_TICKS, energy: 0 },
      careTicks: 0,
    });
    expect(out).toEqual({ state: 'Sick', hasEvolved: true });
  });

  it('Sick → Sick even when counters are 0 (only HEAL exits Sick)', () => {
    const out = nextState({
      prev: 'Sick',
      hasEvolved: false,
      neglectTicks: ZERO,
      careTicks: 0,
    });
    expect(out).toEqual({ state: 'Sick', hasEvolved: false });
  });
});

describe('nextState — evolve trip', () => {
  it('Normal → Evolved when careTicks meets EVOLVE_CARE_TICKS and !hasEvolved', () => {
    const out = nextState({
      prev: 'Normal',
      hasEvolved: false,
      neglectTicks: ZERO,
      careTicks: EVOLVE_CARE_TICKS,
    });
    expect(out).toEqual({ state: 'Evolved', hasEvolved: true });
  });

  it('does not re-evolve when hasEvolved is already true', () => {
    const out = nextState({
      prev: 'Normal',
      hasEvolved: true,
      neglectTicks: ZERO,
      careTicks: EVOLVE_CARE_TICKS,
    });
    expect(out).toEqual({ state: 'Normal', hasEvolved: true });
  });

  it('does not evolve from Evolved', () => {
    const out = nextState({
      prev: 'Evolved',
      hasEvolved: true,
      neglectTicks: ZERO,
      careTicks: EVOLVE_CARE_TICKS,
    });
    expect(out).toEqual({ state: 'Evolved', hasEvolved: true });
  });
});
