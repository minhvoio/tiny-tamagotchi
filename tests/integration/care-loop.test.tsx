import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
import { CARE_AMOUNTS, MAX_STAT, MIN_STAT, TICK_INTERVAL_MS } from '@/game/constants';

function valueOf(label: string): number {
  return Number(screen.getByRole('progressbar', { name: label }).getAttribute('aria-valuenow'));
}

function advanceTicks(n: number) {
  act(() => {
    vi.advanceTimersByTime(TICK_INTERVAL_MS * n);
  });
}

function allVitals(): { hunger: number; happiness: number; energy: number } {
  return {
    hunger: valueOf('Hunger'),
    happiness: valueOf('Happiness'),
    energy: valueOf('Energy'),
  };
}

function assertNeverOutOfRange() {
  const { hunger, happiness, energy } = allVitals();
  for (const v of [hunger, happiness, energy]) {
    expect(v).toBeGreaterThanOrEqual(MIN_STAT);
    expect(v).toBeLessThanOrEqual(MAX_STAT);
  }
}

describe('care-loop integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs feed -> play -> rest -> auto-wake without stats leaving [0, 100]', () => {
    render(<Home />);

    expect(allVitals()).toEqual({ hunger: 100, happiness: 100, energy: 100 });
    expect(screen.getByRole('button', { name: 'Feed' })).toBeDisabled();

    advanceTicks(2);
    expect(allVitals()).toEqual({ hunger: 98, happiness: 98, energy: 98 });
    assertNeverOutOfRange();

    fireEvent.click(screen.getByRole('button', { name: 'Feed' }));
    expect(valueOf('Hunger')).toBe(MAX_STAT);
    expect(valueOf('Happiness')).toBe(Math.min(98 + CARE_AMOUNTS.feed.happiness, MAX_STAT));

    const beforePlay = allVitals();
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(valueOf('Happiness')).toBe(
      Math.min(beforePlay.happiness + CARE_AMOUNTS.play.happiness, MAX_STAT),
    );
    expect(valueOf('Energy')).toBe(beforePlay.energy + CARE_AMOUNTS.play.energy);
    assertNeverOutOfRange();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(valueOf('Energy')).toBeLessThan(70);

    fireEvent.click(screen.getByRole('button', { name: 'Rest' }));
    expect(screen.getByRole('button', { name: 'Wake' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Feed' })).toHaveAttribute('title', 'Pet is resting');
    expect(screen.getByRole('button', { name: 'Play' })).toHaveAttribute('title', 'Pet is resting');

    const restingStart = allVitals();
    advanceTicks(3);
    const restingAfter = allVitals();
    expect(restingAfter.hunger).toBe(restingStart.hunger);
    expect(restingAfter.happiness).toBe(restingStart.happiness);
    expect(restingAfter.energy).toBe(restingStart.energy + 30);
    expect(screen.getByRole('button', { name: 'Wake' })).toBeInTheDocument();
    assertNeverOutOfRange();

    while (valueOf('Energy') < MAX_STAT) {
      advanceTicks(1);
    }
    expect(valueOf('Energy')).toBe(MAX_STAT);
    expect(screen.getByRole('button', { name: 'Rest' })).toBeInTheDocument();
    assertNeverOutOfRange();
  });

  it('Wake mid-recovery immediately resumes awake decay', () => {
    render(<Home />);
    advanceTicks(20);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    fireEvent.click(screen.getByRole('button', { name: 'Rest' }));
    advanceTicks(2);
    const hungerDuringRest = valueOf('Hunger');

    fireEvent.click(screen.getByRole('button', { name: 'Wake' }));
    advanceTicks(1);
    expect(valueOf('Hunger')).toBe(hungerDuringRest - 1);
    expect(screen.getByRole('button', { name: 'Rest' })).toBeInTheDocument();
  });
});
