import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { TamagotchiProvider, useTamagotchi } from '@/hooks/useTamagotchi';
import { FEED_AMOUNT, MAX_STAT, TICK_INTERVAL_MS } from '@/game/constants';

function StateReader() {
  const { state, dispatch } = useTamagotchi();
  return (
    <div>
      <span data-testid="hunger">{state.vitals.hunger}</span>
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

  it('exposes initial state with hunger at MAX_STAT', () => {
    render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );
    expect(screen.getByTestId('hunger').textContent).toBe(String(MAX_STAT));
  });

  it('updates state when consumers dispatch FEED', () => {
    render(
      <TamagotchiProvider>
        <StateReader />
      </TamagotchiProvider>,
    );

    // One full tick drops hunger below max so FEED produces a visible delta.
    act(() => {
      vi.advanceTimersByTime(TICK_INTERVAL_MS);
    });
    const beforeFeed = Number(screen.getByTestId('hunger').textContent);
    expect(beforeFeed).toBeLessThan(MAX_STAT);

    fireEvent.click(screen.getByRole('button', { name: 'feed-from-test' }));

    const afterFeed = Number(screen.getByTestId('hunger').textContent);
    expect(afterFeed).toBe(Math.min(beforeFeed + FEED_AMOUNT, MAX_STAT));
  });

  it('throws a helpful error when used outside the provider', () => {
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<StateReader />)).toThrowError(
      /useTamagotchi must be used inside <TamagotchiProvider>/,
    );
    consoleErr.mockRestore();
  });
});
