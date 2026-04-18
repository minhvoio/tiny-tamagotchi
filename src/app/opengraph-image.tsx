import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Tiny Tamagotchi — a pet that lives in your browser';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        background: '#f0fdf4',
      }}
    >
      <svg viewBox="0 0 64 64" width={160} height={160}>
        <ellipse cx="32" cy="36" rx="20" ry="18" fill="#6ee7b7" />
        <ellipse cx="32" cy="22" rx="14" ry="10" fill="#6ee7b7" />
        <circle cx="26" cy="22" r="2.2" fill="#1f2937" />
        <circle cx="38" cy="22" r="2.2" fill="#1f2937" />
        <path
          d="M28 30 Q32 33 36 30"
          stroke="#1f2937"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
      <p
        style={{
          fontSize: 48,
          fontFamily: 'sans-serif',
          color: '#1f2937',
          marginTop: 32,
        }}
      >
        Tiny Tamagotchi
      </p>
    </div>,
    { ...size },
  );
}
