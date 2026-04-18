'use client';

import { MAX_STAT } from '@/game/constants';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function FeedButton() {
  const { state, dispatch } = useTamagotchi();
  const disabled = state.vitals.hunger >= MAX_STAT;

  return (
    <button
      type="button"
      disabled={disabled}
      aria-disabled={disabled}
      onClick={() => dispatch({ type: 'FEED' })}
      className="inline-flex items-center rounded-full bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
    >
      Feed
    </button>
  );
}
