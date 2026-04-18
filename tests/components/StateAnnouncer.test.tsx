import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, render, screen } from '@testing-library/react';
import { StateAnnouncer } from '@/components/StateAnnouncer';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import type { SeedPreset } from '@/game/state';
import { TICK_INTERVAL_MS, SICK_NEGLECT_TICKS } from '@/game/constants';

function SeedOnMount({ preset }: { preset: SeedPreset }) {
  const { dispatch } = useTamagotchi();
  useEffect(() => {
    dispatch({ type: '__SEED__', preset });
  }, [dispatch, preset]);
  return null;
}

function HealTrigger() {
  const { dispatch } = useTamagotchi();
  return (
    <button type="button" onClick={() => dispatch({ type: 'HEAL', nowMs: 0 })}>
      test-heal
    </button>
  );
}

function renderWith(preset: SeedPreset | null) {
  return render(
    <TamagotchiProvider>
      {preset && <SeedOnMount preset={preset} />}
      <HealTrigger />
      <StateAnnouncer />
    </TamagotchiProvider>,
  );
}

describe('<StateAnnouncer />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('has role=status and aria-live=polite, and starts with empty text on initial mount', () => {
    renderWith(null);
    const el = screen.getByTestId('state-announcer');
    expect(el).toHaveAttribute('role', 'status');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el.textContent).toBe('');
  });

  it('announces "Pet is now Sick" when the pet transitions to Sick', () => {
    renderWith('sick-near');
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 1));
    });
    expect(screen.getByTestId('state-announcer').textContent).toBe('Pet is now Sick');
  });

  it('announces "Pet is now Normal" after HEAL from Sick (non-evolved)', () => {
    renderWith('sick-near');
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 1));
    });
    expect(screen.getByTestId('state-announcer').textContent).toBe('Pet is now Sick');
    act(() => {
      screen.getByRole('button', { name: 'test-heal' }).click();
    });
    expect(screen.getByTestId('state-announcer').textContent).toBe('Pet is now Normal');
  });

  it('announces "Pet is now Evolved" on the Normal → Evolved transition', () => {
    renderWith('evolve-near');
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
    });
    expect(screen.getByTestId('state-announcer').textContent).toBe('Pet is now Evolved');
  });
});
