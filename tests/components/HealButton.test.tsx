import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useEffect } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { HealButton } from '@/components/HealButton';
import { StatBar } from '@/components/StatBar';
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

function Vitals() {
  const { state } = useTamagotchi();
  return (
    <>
      <StatBar label="Hunger" value={state.vitals.hunger} />
      <StatBar label="Happiness" value={state.vitals.happiness} />
      <StatBar label="Energy" value={state.vitals.energy} />
    </>
  );
}

function renderAt(preset: SeedPreset | null) {
  return render(
    <TamagotchiProvider>
      {preset && <SeedOnMount preset={preset} />}
      <Vitals />
      <HealButton />
    </TamagotchiProvider>,
  );
}

function valueOf(label: string): number {
  return Number(screen.getByRole('progressbar', { name: label }).getAttribute('aria-valuenow'));
}

describe('<HealButton />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders no DOM when state is Normal', () => {
    renderAt(null);
    expect(screen.queryByRole('button', { name: 'Heal' })).not.toBeInTheDocument();
  });

  it('renders an enabled Heal button when Sick, and clicking it heals to safe band', () => {
    renderAt('sick-near');
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 1));
    });
    const btn = screen.getByRole('button', { name: 'Heal' });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(valueOf('Hunger')).toBeGreaterThanOrEqual(50);
    expect(valueOf('Happiness')).toBeGreaterThanOrEqual(50);
    expect(valueOf('Energy')).toBeGreaterThanOrEqual(50);
    expect(screen.queryByRole('button', { name: 'Heal' })).not.toBeInTheDocument();
  });
});
