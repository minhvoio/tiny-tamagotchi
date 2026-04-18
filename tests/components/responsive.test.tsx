import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Home from '@/app/page';

describe('responsive structural guards', () => {
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

  it('uses the responsive w-full + sm:w-64 width on every StatBar', async () => {
    await act(async () => {
      render(<Home />);
    });
    const bars = await screen.findAllByRole('progressbar');
    for (const bar of bars) {
      const wrapper = bar.parentElement;
      expect(wrapper).not.toBeNull();
      const cls = wrapper?.className ?? '';
      expect(cls).toMatch(/\bw-full\b/);
      expect(cls).toMatch(/\bsm:w-64\b/);
      expect(cls).not.toMatch(/(^|\s)w-64(\s|$)/);
    }
  });

  it('uses a responsive title (text-2xl + sm:text-3xl, never a bare text-3xl)', async () => {
    await act(async () => {
      render(<Home />);
    });
    const heading = screen.getByRole('heading', { level: 1, name: 'Tiny Tamagotchi' });
    const cls = heading.className;
    expect(cls).toMatch(/\btext-2xl\b/);
    expect(cls).toMatch(/\bsm:text-3xl\b/);
    expect(cls).not.toMatch(/(^|\s)text-3xl(\s|$)/);
  });

  it('uses a responsive 2-col grid -> sm:flex on the actions region', async () => {
    await act(async () => {
      render(<Home />);
    });
    const actions = await screen.findByRole('region', { name: 'Pet actions' });
    const cls = actions.className;
    expect(cls).toMatch(/\bgrid\b/);
    expect(cls).toMatch(/\bgrid-cols-2\b/);
    expect(cls).toMatch(/\bsm:flex\b/);
  });

  it('renders no element with a hardcoded w-64 class (structural overflow guard)', async () => {
    await act(async () => {
      render(<Home />);
    });
    const offenders = document.querySelectorAll('[class]');
    for (const el of Array.from(offenders)) {
      const cls = el.getAttribute('class') ?? '';
      expect(cls).not.toMatch(/(^|\s)w-64(\s|$)/);
    }
  });
});
