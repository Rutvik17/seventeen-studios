import type { Metadata } from 'next';
import { Syne, DM_Sans } from 'next/font/google';
import { SmoothScrollProvider } from '@/components/SmoothScrollProvider';
import { Cursor } from '@/components/Cursor';
import { NoiseOverlay } from '@/components/NoiseOverlay';
import { Loader } from '@/components/Loader';
import './globals.css';

/**
 * Root layout.
 *
 * Responsibilities:
 * - Load Syne (display) and DM Sans (body) via `next/font/google` and expose
 *   them as CSS variables (`--font-syne`, `--font-dm-sans`) that globals.css
 *   resolves inside `--font-display` / `--font-body`.
 * - Mount the smooth-scroll + GSAP provider at the top of the tree.
 * - Render the custom cursor and noise overlay once, globally.
 */

// Google Fonts' Syne tops out at weight 800; the design reference's request
// for weight 900 would fail at build time, so we pin to the available axis
// and let CSS fall through when 900 is referenced.
const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-syne',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Seventeen Studios — Software · Creative · AI Engineering',
  description:
    'A new kind of engineering studio. We build software, creative, and AI systems for companies with ambition that outpaces what ordinary agencies can deliver.',
  metadataBase: new URL('https://seventeenstudios.com'),
  openGraph: {
    title: 'Seventeen Studios',
    description:
      'Software, creative, and AI engineering. Small by design, senior by default.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable}`}>
      <body>
        <SmoothScrollProvider>
          {/* Loader renders first in the tree so it covers every section
              on initial paint. It pulls itself offstage once ready. */}
          <Loader />
          <Cursor />
          <NoiseOverlay />
          {children}
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
