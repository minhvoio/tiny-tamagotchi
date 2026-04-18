'use client';

import { ActionButton } from '@/components/ActionButton';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function RestButton() {
  const { state, dispatchWithNow } = useTamagotchi();
  const label = state.isResting ? 'Wake' : 'Rest';

  return <ActionButton label={label} onPress={() => dispatchWithNow({ type: 'REST' })} />;
}
