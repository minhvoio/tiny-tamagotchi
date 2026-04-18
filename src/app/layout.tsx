import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tiny Tamagotchi',
  description: 'A tiny digital companion that lives in your browser.',
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
