'use client';

import type { ReactNode } from 'react';
import { useTamagotchi } from '@/hooks/useTamagotchi';
import styles from '@/styles/pet.module.css';

interface PetStageProps {
  children: ReactNode;
}

export function PetStage({ children }: PetStageProps) {
  const { state } = useTamagotchi();
  return (
    <div className={styles.stage}>
      {state.state === 'Sick' && (
        <span data-testid="sick-indicator" aria-hidden="true" className={styles.sickIndicator}>
          •••
        </span>
      )}
      {children}
    </div>
  );
}
