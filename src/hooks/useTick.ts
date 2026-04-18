'use client';

import { useEffect } from 'react';
import type { Action } from '@/game/state';

export function useTick(dispatch: (action: Action) => void, intervalMs: number): void {
  useEffect(() => {
    const id = setInterval(() => {
      dispatch({ type: 'TICK', elapsedMs: intervalMs, nowMs: Date.now() });
    }, intervalMs);
    return () => {
      clearInterval(id);
    };
  }, [dispatch, intervalMs]);
}
