'use client';

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from 'react';
import { TICK_INTERVAL_MS } from '@/game/constants';
import { reducer } from '@/game/reducer';
import { initialState, type Action, type PetModel } from '@/game/state';
import { useTick } from '@/hooks/useTick';

interface TamagotchiContextValue {
  state: PetModel;
  dispatch: Dispatch<Action>;
}

const TamagotchiContext = createContext<TamagotchiContextValue | null>(null);

interface TamagotchiProviderProps {
  children: ReactNode;
  tickIntervalMs?: number;
}

export function TamagotchiProvider({
  children,
  tickIntervalMs = TICK_INTERVAL_MS,
}: TamagotchiProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  useTick(dispatch, tickIntervalMs);
  return (
    <TamagotchiContext.Provider value={{ state, dispatch }}>{children}</TamagotchiContext.Provider>
  );
}

export function useTamagotchi(): TamagotchiContextValue {
  const ctx = useContext(TamagotchiContext);
  if (ctx === null) {
    throw new Error('useTamagotchi must be used inside <TamagotchiProvider>');
  }
  return ctx;
}
