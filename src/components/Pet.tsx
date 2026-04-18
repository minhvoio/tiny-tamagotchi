'use client';

import { useEffect, useRef, useState } from 'react';
import { useTamagotchi } from '@/hooks/useTamagotchi';
import { petVariant } from '@/game/util';
import styles from '@/styles/pet.module.css';

const MOOD_LABELS = {
  Normal: 'idling',
  Sick: 'sick',
  Evolved: 'thriving',
} as const;

const IDLE_VARIANTS = ['yawn', 'blink', 'look-around'] as const;
const IDLE_POLL_MS = 1000;
const IDLE_CHANCE = 0.05;
const IDLE_DURATION_MS = 2000;
const OVERLAY_POLL_MS = 1000;

type IdleVariant = (typeof IDLE_VARIANTS)[number];
type Reaction = 'chomp' | 'hop' | 'sparkle' | '';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function Pet() {
  const { state } = useTamagotchi();
  const petState = state.state;
  const mood = MOOD_LABELS[petState];
  const variant = petVariant(state.name);

  const [idleAnim, setIdleAnim] = useState<IdleVariant | ''>('');
  const [reaction, setReaction] = useState<Reaction>('');
  const [overlayNow, setOverlayNow] = useState(() => Date.now());

  const prevFeed = useRef(state.feedStreak.lastFeedAt);
  const prevPlayCount = useRef({ happiness: state.vitals.happiness, energy: state.vitals.energy });
  const prevSick = useRef(state.state === 'Sick');

  useEffect(() => {
    if (state.feedStreak.lastFeedAt !== prevFeed.current && state.feedStreak.count > 0) {
      prevFeed.current = state.feedStreak.lastFeedAt;
      setReaction('chomp');
    }
  }, [state.feedStreak.lastFeedAt, state.feedStreak.count]);

  useEffect(() => {
    const playHappier =
      state.vitals.happiness !== prevPlayCount.current.happiness ||
      state.vitals.energy !== prevPlayCount.current.energy;
    if (playHappier && state.feedStreak.count === 0 && !state.isResting && reaction !== 'chomp') {
      const energyDropped = state.vitals.energy < prevPlayCount.current.energy;
      if (energyDropped) {
        setReaction('hop');
      }
    }
    prevPlayCount.current = { happiness: state.vitals.happiness, energy: state.vitals.energy };
  }, [
    state.vitals.happiness,
    state.vitals.energy,
    state.isResting,
    state.feedStreak.count,
    reaction,
  ]);

  useEffect(() => {
    const wasSick = prevSick.current;
    const isSickNow = state.state === 'Sick';
    if (wasSick && !isSickNow) {
      setReaction('sparkle');
    }
    prevSick.current = isSickNow;
  }, [state.state]);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const id = setInterval(() => {
      if (Math.random() < IDLE_CHANCE) {
        const pick = IDLE_VARIANTS[Math.floor(Math.random() * IDLE_VARIANTS.length)];
        if (pick !== undefined) {
          setIdleAnim(pick);
          if (clearTimer !== null) clearTimeout(clearTimer);
          clearTimer = setTimeout(() => setIdleAnim(''), IDLE_DURATION_MS);
        }
      }
    }, IDLE_POLL_MS);
    return () => {
      clearInterval(id);
      if (clearTimer !== null) clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setOverlayNow(Date.now());
    }, OVERLAY_POLL_MS);
    return () => clearInterval(id);
  }, []);

  const isQueasy = state.queasyUntil > overlayNow;
  const isSleepCap = state.sleepCapUntil > overlayNow;
  const showZz = state.isResting;

  const variantClass = styles[`petVariant${variant}` as keyof typeof styles];

  return (
    <>
      <svg
        role="img"
        aria-label={`Tiny tamagotchi, ${mood}`}
        data-state={petState}
        data-reaction={reaction || undefined}
        data-idle-animation={idleAnim || undefined}
        data-egg={isQueasy ? 'queasy' : undefined}
        viewBox="0 0 64 64"
        xmlns="http://www.w3.org/2000/svg"
        className={`${styles.pet} ${variantClass ?? ''}`.trim()}
        onAnimationEnd={() => setReaction('')}
      >
        <rect x="4" y="4" width="56" height="56" fill="var(--pet-tint)" opacity="0.18" rx="10" />
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
        {isSleepCap && (
          <path
            data-testid="sleep-cap"
            aria-hidden="true"
            d="M18 14 L32 6 L46 14 L44 18 L20 18 Z"
            fill="#6b8bff"
          />
        )}
      </svg>
      {showZz && (
        <span data-testid="zz-overlay" aria-hidden="true" className={styles.zzOverlay}>
          Zz
        </span>
      )}
    </>
  );
}
