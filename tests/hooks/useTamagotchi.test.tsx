import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import { CARE_AMOUNTS, MAX_STAT, SICK_NEGLECT_TICKS, TICK_INTERVAL_MS } from '@/game/constants';

function StateReader() {
  const { state, dispatch } = useTamagotchi();
  return (
    <div>
      <span data-testid="hunger">{state.vitals.hunger}</span>
      <span data-testid="happiness">{state.vitals.happiness}</span>
      <span data-testid="energy">{state.vitals.energy}</span>
      <span data-testid="resting">{String(state.isResting)}</span>
      <span data-testid="pet-state">{state.state}</span>
      <button type="button" onClick={() => dispatch({ type: 'FEED' })}>
        feed-from-test
      </button>
      <button type="button" onClick={() => dispatch({ type: '__SEED__', preset: 'sick-near' })}>
        seed-sick-near
      </button>
    </div>
  );
}

describe('<TamagotchiProvider /> + useTamagotchi', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes initial state with all vitals at MAX_STAT and not resting', () => {
    render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );
    expect(screen.getByTestId('hunger').textContent).toBe(String(MAX_STAT));
    expect(screen.getByTestId('happiness').textContent).toBe(String(MAX_STAT));
    expect(screen.getByTestId('energy').textContent).toBe(String(MAX_STAT));
    expect(screen.getByTestId('resting').textContent).toBe('false');
  });

  it('updates state when consumers dispatch FEED', () => {
    render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );

    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
    });
    const beforeFeed = Number(screen.getByTestId('hunger').textContent);
    expect(beforeFeed).toBeLessThan(MAX_STAT);

    fireEvent.click(screen.getByRole('button', { name: 'feed-from-test' }));

    const afterFeed = Number(screen.getByTestId('hunger').textContent);
    expect(afterFeed).toBe(Math.min(beforeFeed + CARE_AMOUNTS.feed.hunger, MAX_STAT));
  });

  it('throws a helpful error when used outside the provider', () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<StateReader />)).toThrowError(
      /useTamagotchi must be used inside <TamagotchiProvider>/,
    );
    consoleErr.mockRestore();
  });

  it('propagates state.state = Sick to consumers after sustained low hunger', () => {
    render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'seed-sick-near' }));
    expect(screen.getByTestId('pet-state').textContent).toBe('Normal');
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * (SICK_NEGLECT_TICKS + 1));
    });
    expect(screen.getByTestId('pet-state').textContent).toBe('Sick');
  });

  it('reads ?__seed= on mount and ignores unknown preset names', () => {
    window.history.replaceState({}, '', 'http://localhost/?__seed=nope');
    render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );
    expect(screen.getByTestId('pet-state').textContent).toBe('Normal');
    window.history.replaceState({}, '', 'http://localhost/');
  });

  it('applies ?__seed=sick-near on mount exactly once', () => {
    window.history.replaceState({}, '', 'http://localhost/?__seed=sick-near');
    const { rerender } = render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );
    expect(Number(screen.getByTestId('hunger').textContent)).toBe(5);
    rerender(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );
    // Re-render must not re-apply the seed (would reset hunger back to 5 if decayed).
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS * 2);
    });
    expect(Number(screen.getByTestId('hunger').textContent)).toBe(3);
    window.history.replaceState({}, '', 'http://localhost/');
  });
});
