import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { PlayButton } from '@/components/PlayButton';
import { RestButton } from '@/components/RestButton';
import { StatBar } from '@/components/StatBar';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import { CARE_AMOUNTS, PLAY_MIN_ENERGY, TICK_INTERVAL_MS } from '@/game/constants';

function Vitals() {
  const { state } = useTamagotchi();
  return (
    <>
      <StatBar label="Happiness" value={state.vitals.happiness} />
      <StatBar label="Energy" value={state.vitals.energy} />
    </>
  );
}

function renderApp() {
  return render(
    <TamagotchiProvider>
      <Vitals />
      <PlayButton />
      <RestButton />
    </TamagotchiProvider>,
  );
}

function valueOf(label: string): number {
  return Number(screen.getByRole('progressbar', { name: label }).getAttribute('aria-valuenow'));
}

function advanceBy(ticks: number) {
  act(() => {
    vi.advanceTimersByTime(TICK_INTERVAL_MS * ticks);
  });
}

describe('<PlayButton />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is enabled at full energy; click drops energy by 15 and raises happiness by 20 (clamped)', () => {
    renderApp();
    advanceBy(30);
    const happinessBefore = valueOf('Happiness');
    const energyBefore = valueOf('Energy');
    expect(energyBefore).toBeGreaterThanOrEqual(PLAY_MIN_ENERGY);

    const btn = screen.getByRole('button', { name: 'Play' });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);

    expect(valueOf('Energy')).toBe(energyBefore + CARE_AMOUNTS.play.energy);
    expect(valueOf('Happiness')).toBe(Math.min(happinessBefore + CARE_AMOUNTS.play.happiness, 100));
  });

  it('is disabled with reason "Too tired to play" when energy drops below PLAY_MIN_ENERGY', () => {
    renderApp();
    const btn = screen.getByRole('button', { name: 'Play' });
    for (let i = 0; i < 20; i++) {
      if (valueOf('Energy') < PLAY_MIN_ENERGY) break;
      fireEvent.click(btn);
    }
    expect(valueOf('Energy')).toBeLessThan(PLAY_MIN_ENERGY);
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Too tired to play');
  });

  it('is disabled with reason "Pet is resting" while isResting (resting takes priority)', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Rest' }));
    const btn = screen.getByRole('button', { name: 'Play' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Pet is resting');
  });
});
