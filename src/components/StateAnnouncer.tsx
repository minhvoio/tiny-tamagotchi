'use client';

import { useEffect, useRef, useState } from 'react';
import { useTamagotchi } from '@/hooks/useTamagotchi';

export function StateAnnouncer() {
  const { state } = useTamagotchi();
  const prev = useRef(state.state);
  const [text, setText] = useState('');
  useEffect(() => {
    if (prev.current !== state.state) {
      setText(`Pet is now ${state.state}`);
      prev.current = state.state;
    }
  }, [state.state]);
  return (
    <div role="status" aria-live="polite" data-testid="state-announcer">
      {text}
    </div>
  );
}
