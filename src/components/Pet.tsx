import styles from '@/styles/pet.module.css';

export function Pet() {
  return (
    <svg
      role="img"
      aria-label="Tiny tamagotchi, idling"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={styles.pet}
    >
      {/* body */}
      <ellipse cx="32" cy="36" rx="20" ry="18" fill="currentColor" />
      {/* head cap — slightly flatter top so body reads as a cute blob */}
      <ellipse cx="32" cy="22" rx="14" ry="10" fill="currentColor" />
      {/* left eye */}
      <circle cx="26" cy="22" r="2.2" fill="var(--pet-eye)" />
      {/* right eye */}
      <circle cx="38" cy="22" r="2.2" fill="var(--pet-eye)" />
      {/* mouth */}
      <path
        d="M28 30 Q32 33 36 30"
        stroke="var(--pet-mouth)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
