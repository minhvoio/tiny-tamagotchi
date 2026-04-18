import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { KonamiListener } from '@/components/KonamiListener';
import { CONFETTI_DURATION_MS } from '@/game/constants';

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

function pressAll(keys: readonly string[]) {
  for (const key of keys) {
    fireEvent.keyDown(document.body, { key });
  }
}

function mockMatchMedia(reduced: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

describe('<KonamiListener />', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockMatchMedia(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reveals confetti on the full 10-key sequence', () => {
    render(<KonamiListener />);
    pressAll(SEQUENCE);
    expect(screen.getByTestId('konami-confetti')).toBeInTheDocument();
  });

  it('does not reveal confetti on a 9-key partial sequence', () => {
    render(<KonamiListener />);
    pressAll(SEQUENCE.slice(0, 9));
    expect(screen.queryByTestId('konami-confetti')).not.toBeInTheDocument();
  });

  it('clears confetti after CONFETTI_DURATION_MS', () => {
    render(<KonamiListener />);
    pressAll(SEQUENCE);
    expect(screen.getByTestId('konami-confetti')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(CONFETTI_DURATION_MS + 50);
    });
    expect(screen.queryByTestId('konami-confetti')).not.toBeInTheDocument();
  });

  it('renders a static asterisk flash under prefers-reduced-motion', () => {
    mockMatchMedia(true);
    render(<KonamiListener />);
    pressAll(SEQUENCE);
    const el = screen.getByTestId('konami-confetti');
    expect(el.textContent).toBe('*');
  });

  it('removes the listener on unmount', () => {
    const view = render(<KonamiListener />);
    view.unmount();
    pressAll(SEQUENCE);
    expect(screen.queryByTestId('konami-confetti')).not.toBeInTheDocument();
  });

  it('resets progress when a wrong key is pressed mid-sequence', () => {
    render(<KonamiListener />);
    pressAll(['ArrowUp', 'ArrowUp', 'ArrowDown', 'x']);
    pressAll(SEQUENCE.slice(1));
    expect(screen.queryByTestId('konami-confetti')).not.toBeInTheDocument();
  });
});
