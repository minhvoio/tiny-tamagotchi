'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from 'react';
import { MAX_OFFLINE_MS, TICK_INTERVAL_MS } from '@/game/constants';
import { reducer } from '@/game/reducer';
import { initialState, type Action, type PetModel } from '@/game/state';
import * as storage from '@/game/storage';
import { useTick } from '@/hooks/useTick';

type ActionWithoutNow = { type: 'FEED' } | { type: 'PLAY' } | { type: 'REST' } | { type: 'HEAL' };

interface TamagotchiContextValue {
  state: PetModel;
  dispatch: Dispatch<Action>;
  dispatchWithNow: (action: ActionWithoutNow) => void;
}

const TamagotchiContext = createContext<TamagotchiContextValue | null>(null);

interface TamagotchiProviderProps {
  children: ReactNode;
  tickIntervalMs?: number;
  getNow?: () => Date;
}

export function TamagotchiProvider({
  children,
  tickIntervalMs = TICK_INTERVAL_MS,
  getNow = () => new Date(),
}: TamagotchiProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  useTick(dispatch, tickIntervalMs);
  const hydrated = useRef(false);
  const getNowRef = useRef(getNow);

  useLayoutEffect(() => {
    getNowRef.current = getNow;
  }, [getNow]);

  const dispatchWithNow = useCallback(
    (action: ActionWithoutNow) => {
      const nowMs = getNowRef.current().getTime();
      dispatch({ ...action, nowMs } as Action);
    },
    [dispatch],
  );

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    const stored = storage.read();
    if (stored && stored.name !== '') {
      dispatch({ type: '__HYDRATE__', state: stored });
      const now = getNowRef.current().getTime();
      const elapsed = Math.max(0, Math.min(now - stored.lastTickAt, MAX_OFFLINE_MS));
      dispatch({ type: 'TICK', elapsedMs: elapsed, nowMs: now });
    }
    if (typeof window !== 'undefined') {
      const seed = new URLSearchParams(window.location.search).get('__seed');
      if (seed !== null) {
        dispatch({ type: '__SEED__', preset: seed });
      }
    }
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    if (state.name !== '') {
      storage.write(state);
    } else {
      storage.clear();
    }
  }, [state]);

  const contextValue = useMemo(
    () => ({ state, dispatch, dispatchWithNow }),
    [state, dispatch, dispatchWithNow],
  );

  return <TamagotchiContext.Provider value={contextValue}>{children}</TamagotchiContext.Provider>;
}

export function useTamagotchi(): TamagotchiContextValue {
  const ctx = useContext(TamagotchiContext);
  if (ctx === null) {
    throw new Error('useTamagotchi must be used inside <TamagotchiProvider>');
  }
  return ctx;
}
