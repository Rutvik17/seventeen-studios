import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { TransitionProvider } from '@/components/Transition';
import { Preloader } from '@/components/Preloader';
import { Cursor } from '@/components/Cursor';
import { Grain } from '@/components/Grain';
import { Nav } from '@/components/Nav';
import { MenuOverlay } from '@/components/MenuOverlay';
import { Footer } from '@/components/Footer';
import { site } from '@/content/studio';
import { currentYear } from '@/lib/time';
import './globals.css';

/**
 * Root layout.
 *
 * Three typefaces, each with a job: Syne for display, DM Sans for reading,
 * JetBrains Mono for the labels, indices and metadata that give the site its
 * technical register. All three are self-hosted by `next/font` at build time,
 * so the static export has no third-party font requests.
 */

const syne = Syne({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  variable: '--font-body',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seventeenstudios.co';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  keywords: [
    'engineering studio',
    'software consultancy',
    'creative engineering',
    'AI systems',
    'WebGL',
    'platform modernisation',
  ],
  authors: [{ name: site.name }],
  openGraph: {
    title: site.name,
    description: site.description,
    type: 'website',
    locale: 'en_CA',
    siteName: site.name,
  },
  twitter: {
    card: 'summary_large_image',
    title: site.name,
    description: site.description,
  },
  robots: { index: true, follow: true },
};

/*
  Both of these were left over from the original dark palette and were wrong for
  months: `colorScheme: 'dark'` tells the browser to render form controls and
  scrollbars dark on a page that is paper, and the theme colour tinted the
  mobile browser chrome near-black above a washi background.
*/
export const viewport: Viewport = {
  themeColor: '#f2ede1',
  colorScheme: 'light',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${mono.variable}`}
    >
      <body>
        <Providers>
          <TransitionProvider>
            <Preloader />
            <Cursor />
            <Grain />
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <Nav />
            <MenuOverlay />
            <main id="main">{children}</main>
            <Footer buildYear={currentYear()} />
          </TransitionProvider>
        </Providers>
      </body>
    </html>
  );
}
