import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import Home from '@/app/page';

describe('landmark regions', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'tiny-tamagotchi:v1',
      JSON.stringify({
        version: 1,
        name: 'Pixel',
        vitals: { hunger: 50, happiness: 50, energy: 50 },
        isResting: false,
        state: 'Normal',
        hasEvolved: false,
        neglectTicks: { hunger: 0, happiness: 0, energy: 0 },
        careTicks: 0,
        lastTickAt: Date.now(),
        feedStreak: { count: 0, lastFeedAt: 0 },
        queasyUntil: 0,
        sleepCapUntil: 0,
      }),
    );
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('exposes a named Pet vitals region containing exactly three progressbars', async () => {
    await act(async () => {
      render(<Home />);
    });
    const vitals = await screen.findByRole('region', { name: 'Pet vitals' });
    const bars = within(vitals).getAllByRole('progressbar');
    expect(bars).toHaveLength(3);
    expect(bars.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Hunger',
      'Happiness',
      'Energy',
    ]);
  });

  it('exposes a named Pet actions region containing at least one button', async () => {
    await act(async () => {
      render(<Home />);
    });
    const actions = await screen.findByRole('region', { name: 'Pet actions' });
    expect(actions).toHaveAttribute('id', 'pet-actions');
    const buttons = within(actions).getAllByRole('button');
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it('renders a skip-link pointing at the Pet actions region', async () => {
    await act(async () => {
      render(<Home />);
    });
    const link = await screen.findByRole('link', { name: 'Skip to actions' });
    expect(link).toHaveAttribute('href', '#pet-actions');
  });
});
