import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tiny Tamagotchi — a pet that lives in your browser',
  description: 'Feed, play, rest, and grow a pixel companion. Lives entirely on this device.',
  openGraph: {
    title: 'Tiny Tamagotchi — a pet that lives in your browser',
    description: 'Feed, play, rest, and grow a pixel companion. Lives entirely on this device.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
