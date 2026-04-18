'use client';

import { useEffect, useRef, useState } from 'react';
import { CONFETTI_DURATION_MS } from '@/game/constants';
import styles from '@/styles/pet.module.css';

const SEQUENCE = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

const REDUCED_MOTION_FLASH_MS = 300;

function matchesExpected(expected: string, key: string): boolean {
  if (expected.startsWith('Arrow')) {
    return expected === key;
  }
  return expected.toLowerCase() === key.toLowerCase();
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function KonamiListener() {
  const [active, setActive] = useState(false);
  const progressRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handle(event: KeyboardEvent) {
      const expected = SEQUENCE[progressRef.current];
      if (expected === undefined) {
        progressRef.current = 0;
        return;
      }
      if (matchesExpected(expected, event.key)) {
        progressRef.current += 1;
        if (progressRef.current === SEQUENCE.length) {
          progressRef.current = 0;
          setActive(true);
          if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
          }
          const duration = prefersReducedMotion() ? REDUCED_MOTION_FLASH_MS : CONFETTI_DURATION_MS;
          timerRef.current = setTimeout(() => {
            setActive(false);
            timerRef.current = null;
          }, duration);
        }
        return;
      }
      const first = SEQUENCE[0];
      progressRef.current = first !== undefined && matchesExpected(first, event.key) ? 1 : 0;
    }
    document.body.addEventListener('keydown', handle);
    return () => {
      document.body.removeEventListener('keydown', handle);
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  if (!active) return null;
  if (prefersReducedMotion()) {
    return (
      <span data-testid="konami-confetti" aria-hidden="true">
        *
      </span>
    );
  }
  return <div data-testid="konami-confetti" aria-hidden="true" className={styles.confetti} />;
}
