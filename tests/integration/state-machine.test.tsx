import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import Home from '@/app/page';
import {
  EVOLVE_CARE_TICKS,
  MAX_STAT,
  PLAY_MIN_ENERGY,
  SICK_NEGLECT_TICKS,
  TICK_INTERVAL_MS,
} from '@/game/constants';

function valueOf(label: string): number {
  return Number(screen.getByRole('progressbar', { name: label }).getAttribute('aria-valuenow'));
}

function advanceTicks(n: number) {
  act(() => {
    vi.advanceTimersByTime(TICK_INTERVAL_MS * n);
  });
}

function setSeed(preset: string | null) {
  const url = preset ? `http://localhost/?__seed=${preset}` : 'http://localhost/';
  window.history.replaceState({}, '', url);
}

describe('state-machine integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.localStorage.setItem(
      'tiny-tamagotchi:v1',
      JSON.stringify({
        version: 1,
        name: 'Pixel',
        vitals: { hunger: 100, happiness: 100, energy: 100 },
        isResting: false,
        state: 'Normal',
        hasEvolved: false,
        neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
        careTicks: 0,
        lastTickAt: Date.now(),
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    setSeed(null);
    window.localStorage.clear();
  });

  it('Normal → Sick → HEAL → Normal via the sick-near seed', () => {
    setSeed('sick-near');
    render(<Home />);
    advanceTicks(SICK_NEGLECT_TICKS + 1);
    const announcer = screen.getByTestId('state-announcer');
    expect(announcer.textContent).toBe('Pet is now Sick');
    const pet = screen.getByRole('img', { name: /tiny tamagotchi, sick/i });
    expect(pet).toHaveAttribute('data-state', 'Sick');
    expect(screen.getByTestId('sick-indicator')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Heal' }));

    expect(screen.getByRole('img', { name: /tiny tamagotchi, idling/i })).toHaveAttribute(
      'data-state',
      'Normal',
    );
    expect(screen.queryByTestId('sick-indicator')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Heal' })).not.toBeInTheDocument();
    expect(valueOf('Hunger')).toBeGreaterThanOrEqual(50);
    expect(announcer.textContent).toBe('Pet is now Normal');
  });

  it('Normal → Evolved via the evolve-near seed (atomic on one TICK)', () => {
    setSeed('evolve-near');
    render(<Home />);
    advanceTicks(1);
    expect(screen.getByRole('img', { name: /tiny tamagotchi, thriving/i })).toHaveAttribute(
      'data-state',
      'Evolved',
    );
    expect(screen.getByTestId('crown')).toBeInTheDocument();
    expect(screen.getByTestId('state-announcer').textContent).toBe('Pet is now Evolved');
  });

  it('Evolved → Sick → HEAL → Evolved (crown returns, not Normal)', () => {
    setSeed('evolved-near-sick');
    render(<Home />);
    advanceTicks(SICK_NEGLECT_TICKS + 1);
    expect(screen.getByRole('img', { name: /tiny tamagotchi, sick/i })).toHaveAttribute(
      'data-state',
      'Sick',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Heal' }));

    const finalPet = screen.getByRole('img', { name: /tiny tamagotchi, thriving/i });
    expect(finalPet).toHaveAttribute('data-state', 'Evolved');
    expect(screen.getByTestId('crown')).toBeInTheDocument();
    expect(screen.getByTestId('state-announcer').textContent).toBe('Pet is now Evolved');
  });

  it('hasEvolved is one-way across many mixed dispatches from evolved-near-sick', () => {
    setSeed('evolved-near-sick');
    render(<Home />);
    for (let i = 0; i < 50; i++) {
      advanceTicks(1);
      if (i % 5 === 0 && screen.queryByRole('button', { name: 'Heal' })) {
        fireEvent.click(screen.getByRole('button', { name: 'Heal' }));
      }
      const labels = screen.getAllByRole('img');
      const petLabel = labels[0]?.getAttribute('aria-label') ?? '';
      expect(petLabel).toMatch(/(idling|sick|thriving)/i);
    }
    const finalPet = screen.getByRole('img', { name: /tiny tamagotchi/i });
    expect(
      finalPet.getAttribute('data-state') === 'Evolved' ||
        finalPet.getAttribute('data-state') === 'Sick',
    ).toBe(true);
  });

  it('the full demo: play to exhaustion is consistent with the Sick transition timing', () => {
    setSeed(null);
    render(<Home />);
    for (let i = 0; i < 10; i++) {
      const play = screen.queryByRole('button', { name: 'Play' });
      if (!play || play.hasAttribute('disabled')) break;
      fireEvent.click(play);
    }
    expect(valueOf('Energy')).toBeLessThan(PLAY_MIN_ENERGY);
    advanceTicks(SICK_NEGLECT_TICKS + 2);
    const pet = screen.getByRole('img', { name: /tiny tamagotchi/i });
    expect(pet.getAttribute('data-state')).toBe('Sick');
  });

  it('evolve-near seed advances to Evolved within a single EVOLVE_CARE_TICKS-sized jump', () => {
    setSeed('evolve-near');
    render(<Home />);
    advanceTicks(EVOLVE_CARE_TICKS);
    const pet = screen.getByRole('img', { name: /tiny tamagotchi/i });
    expect(pet.getAttribute('data-state')).toBe('Evolved');
    expect(valueOf('Hunger')).toBeLessThanOrEqual(MAX_STAT);
  });
});
