import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import { CARE_AMOUNTS, MAX_STAT, TICK_INTERVAL_MS } from '@/game/constants';

function StateReader() {
  const { state, dispatch } = useTamagotchi();
  return (
    <div>
      <span data-testid="hunger">{state.vitals.hunger}</span>
      <span data-testid="happiness">{state.vitals.happiness}</span>
      <span data-testid="energy">{state.vitals.energy}</span>
      <span data-testid="resting">{String(state.isResting)}</span>
      <button type="button" onClick={() => dispatch({ type: 'FEED' })}>
        feed-from-test
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
});
