'use client';

import { ActionButton } from '@/components/ActionButton';
import { PLAY_MIN_ENERGY } from '@/game/constants';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function PlayButton() {
  const { state, dispatch } = useTamagotchi();
  const resting = state.isResting;
  const tooTired = state.vitals.energy < PLAY_MIN_ENERGY;
  const disabled = resting || tooTired;
  const disabledReason = resting ? 'Pet is resting' : tooTired ? 'Too tired to play' : undefined;

  return (
    <ActionButton
      label="Play"
      onPress={() => dispatch({ type: 'PLAY' })}
      disabled={disabled}
      disabledReason={disabledReason}
    />
  );
}
