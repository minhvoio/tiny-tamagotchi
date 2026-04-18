'use client';

import { useTamagotchi } from '@/hooks/useTamagotchi';
import styles from '@/styles/pet.module.css';

const MOOD_LABELS = {
  Normal: 'idling',
  Sick: 'sick',
  Evolved: 'thriving',
} as const;

export function Pet() {
  const { state } = useTamagotchi();
  const petState = state.state;
  const mood = MOOD_LABELS[petState];
  return (
    <svg
      role="img"
      aria-label={`Tiny tamagotchi, ${mood}`}
      data-state={petState}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.pet}
    >
      <ellipse cx="32" cy="36" rx="20" ry="18" fill="currentColor" />
      <ellipse cx="32" cy="22" rx="14" ry="10" fill="currentColor" />
      <circle cx="26" cy="22" r="2.2" fill="var(--pet-eye)" />
      <circle cx="38" cy="22" r="2.2" fill="var(--pet-eye)" />
      <path
        d="M28 30 Q32 33 36 30"
        stroke="var(--pet-mouth)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {petState === 'Evolved' && (
        <path
          data-testid="crown"
          aria-hidden="true"
          d="M22 14 L26 10 L32 13 L38 10 L42 14 L42 17 L22 17 Z"
          fill="var(--pet-crown)"
        />
      )}
    </svg>
  );
}
