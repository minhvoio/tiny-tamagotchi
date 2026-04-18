import type { ReactNode } from 'react';
import styles from '@/styles/pet.module.css';

interface PetStageProps {
  children: ReactNode;
}

/** Mount point for the pet and future stat overlays. */
export function PetStage({ children }: PetStageProps) {
  return <div className={styles.stage}>{children}</div>;
}
