import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Cab Marketplace',
  description:
    'Cab Marketplace — built on Replit. Update this description to reflect the app.',
  robots: 'index, follow',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Cab Marketplace',
    description:
      'Cab Marketplace — built on Replit. Update this description to reflect the app.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cab Marketplace',
    description:
      'Cab Marketplace — built on Replit. Update this description to reflect the app.',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
