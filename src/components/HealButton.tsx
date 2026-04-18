'use client';

import { ActionButton } from '@/components/ActionButton';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function HealButton() {
  const { state, dispatchWithNow } = useTamagotchi();
  if (state.state !== 'Sick') return null;
  return (
    <span className="col-span-2 flex justify-center sm:contents">
      <ActionButton label="Heal" onPress={() => dispatchWithNow({ type: 'HEAL' })} />
    </span>
  );
}
