'use client';

import { ActionButton } from '@/components/ActionButton';
import { MAX_STAT } from '@/game/constants';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function FeedButton() {
  const { state, dispatch } = useTamagotchi();
  const resting = state.isResting;
  const full = state.vitals.hunger >= MAX_STAT;
  const disabled = resting || full;
  const disabledReason = resting ? 'Pet is resting' : full ? 'Pet is full' : undefined;

  return (
    <ActionButton
      label="Feed"
      onPress={() => dispatch({ type: 'FEED' })}
      disabled={disabled}
      disabledReason={disabledReason}
    />
  );
}
