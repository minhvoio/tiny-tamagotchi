'use client';

import { ActionButton } from '@/components/ActionButton';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function HealButton() {
  const { state, dispatch } = useTamagotchi();
  if (state.state !== 'Sick') return null;
  return <ActionButton label="Heal" onPress={() => dispatch({ type: 'HEAL' })} />;
}
