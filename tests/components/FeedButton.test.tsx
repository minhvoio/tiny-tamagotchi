import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FeedButton } from '@/components/FeedButton';
import { StatBar } from '@/components/StatBar';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import { FEED_AMOUNT, MAX_STAT, TICK_INTERVAL_MS } from '@/game/constants';

function ProbeBar() {
  const { state } = useTamagotchi();
  return <StatBar label="Hunger" value={state.vitals.hunger} />;
}

function renderApp() {
  return render(
    <TamagotchiProvider>
      <ProbeBar />
      <FeedButton />
    </TamagotchiProvider>,
  );
}

function hungerValue(): number {
  return Number(screen.getByRole('progressbar', { name: 'Hunger' }).getAttribute('aria-valuenow'));
}

function advanceHungerDownBy(points: number) {
  act(() => {
    vi.advanceTimersByTime(TICK_INTERVAL_MS * points);
  });
}

describe('<FeedButton />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts disabled when hunger is already at MAX_STAT', () => {
    renderApp();
    expect(screen.getByRole('button', { name: 'Feed' })).toBeDisabled();
  });

  it('dispatches FEED and raises hunger by FEED_AMOUNT when below max', () => {
    renderApp();
    advanceHungerDownBy(30);
    const before = hungerValue();
    expect(before).toBeLessThan(MAX_STAT);

    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));

    const after = hungerValue();
    expect(after).toBe(Math.min(before + FEED_AMOUNT, MAX_STAT));
  });

  it('re-disables once feeding pushes hunger back to MAX_STAT', () => {
    renderApp();
    // Decay exactly FEED_AMOUNT points so a single FEED lands on MAX_STAT.
    advanceHungerDownBy(FEED_AMOUNT);
    expect(hungerValue()).toBe(MAX_STAT - FEED_AMOUNT);

    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(hungerValue()).toBe(MAX_STAT);
    expect(screen.getByRole('button', { name: 'Feed' })).toBeDisabled();
  });
});
