import type { Metadata, Viewport } from 'next';
import TransitionLayer from '@/components/TransitionLayer';
import '@fontsource-variable/instrument-sans/wdth.css';
import './globals.css';

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: "Ameil's Desk — Ameil Sheridan, Product Designer",
  description: 'A cozy interactive workspace where you explore the work of product designer Ameil Sheridan.',
  openGraph: {
    type: 'website',
    title: "Ameil's Desk — Ameil Sheridan, Product Designer",
    description: 'Pull up a chair at a café desk and explore enterprise, AI and healthcare product design work.',
    images: [{ url: '/og.jpg', width: 1200, height: 630, alt: 'A cozy café desk with a laptop, a phone and a latte' }],
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: '#140d0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
        <TransitionLayer />
      </body>
    </html>
  );
}
