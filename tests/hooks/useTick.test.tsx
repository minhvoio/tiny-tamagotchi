import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useTick } from '@/hooks/useTick';
import type { Action } from '@/game/state';

function TickHarness({
  dispatch,
  intervalMs,
}: {
  dispatch: (a: Action) => void;
  intervalMs: number;
}) {
  useTick(dispatch, intervalMs);
  return null;
}

describe('useTick', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dispatches one TICK per interval with the configured elapsedMs', () => {
    const dispatch = vi.fn<(a: Action) => void>();
    render(<TickHarness dispatch={dispatch} intervalMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'TICK', elapsedMs: 1000 });
    expect(dispatch).toHaveBeenNthCalledWith(3, { type: 'TICK', elapsedMs: 1000 });
  });

  it('stops dispatching after the component unmounts', () => {
    const dispatch = vi.fn<(a: Action) => void>();
    const view = render(<TickHarness dispatch={dispatch} intervalMs={1000} />);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(dispatch).toHaveBeenCalledTimes(2);

    view.unmount();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
