import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { FeedButton } from '@/components/FeedButton';
import { RestButton } from '@/components/RestButton';
import { StatBar } from '@/components/StatBar';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import { CARE_AMOUNTS, MAX_STAT, TICK_INTERVAL_MS } from '@/game/constants';

function ProbeBar() {
  const { state } = useTamagotchi();
  return <StatBar label="Hunger" value={state.vitals.hunger} />;
}

function renderApp() {
  return render(
    <TamagotchiProvider>
      <ProbeBar />
      <FeedButton />
      <RestButton />
    </TamagotchiProvider>,
  );
}

function hungerValue(): number {
  return Number(screen.getByRole('progressbar', { name: 'Hunger' }).getAttribute('aria-valuenow'));
}

function advanceBy(points: number) {
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

  it('starts disabled with reason "Pet is full" when hunger is at MAX_STAT', () => {
    renderApp();
    const btn = screen.getByRole('button', { name: 'Feed' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Pet is full');
  });

  it('dispatches FEED and raises hunger by CARE_AMOUNTS.feed.hunger when below max', () => {
    renderApp();
    advanceBy(30);
    const before = hungerValue();
    expect(before).toBeLessThan(MAX_STAT);

    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));

    const after = hungerValue();
    expect(after).toBe(Math.min(before + CARE_AMOUNTS.feed.hunger, MAX_STAT));
  });

  it('re-disables with reason "Pet is full" once feeding pushes hunger back to MAX_STAT', () => {
    renderApp();
    advanceBy(CARE_AMOUNTS.feed.hunger);
    expect(hungerValue()).toBe(MAX_STAT - CARE_AMOUNTS.feed.hunger);

    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(hungerValue()).toBe(MAX_STAT);
    const btn = screen.getByRole('button', { name: 'Feed' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Pet is full');
  });

  it('is disabled with reason "Pet is resting" while isResting (resting takes priority over full)', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'Rest' }));
    const btn = screen.getByRole('button', { name: 'Feed' });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'Pet is resting');

    const before = hungerValue();
    fireEvent.click(btn);
    expect(hungerValue()).toBe(before);
  });
});
