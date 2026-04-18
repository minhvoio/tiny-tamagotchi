'use client';

import type { Dispatch } from 'react';
import type { Action } from '@/game/state';

interface ResetButtonProps {
  dispatch: Dispatch<Action>;
}

export function ResetButton({ dispatch }: ResetButtonProps) {
  function onClick() {
    const confirmed = window.confirm('Reset your pet? This cannot be undone.');
    if (!confirmed) return;
    dispatch({ type: 'RESET' });
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-sm text-neutral-600 underline decoration-dotted underline-offset-4 hover:text-red-600"
    >
      Reset pet
    </button>
  );
}
