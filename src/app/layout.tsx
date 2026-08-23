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
import { founder } from '@/content/founder';
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
  /*
    THE TAB SAYS HIS NAME.

    It used to open with the studio's — "Seventeen Studios — The engineering
    notebook of Rutvik Patel." — which is the right way round for a company and
    the wrong way round for this. The people this site is built for are reading
    it with twenty tabs open, half of them other candidates, and the one string
    they need in order to know which tab is which is the name of the person
    whose work it is. The brand still owns the page: it is the mark in the
    header and the wordmark across the footer.

    The keywords went with it. "Engineering studio", "software consultancy" and
    "creative engineering" were bidding for agency traffic — the exact thing
    this site stopped being, and the exact reader it does not want.
  */
  title: {
    default: `${founder.name} — ${founder.role}, ${founder.location}`,
    template: `%s — ${founder.name}`,
  },
  description: site.description,
  keywords: [
    'software engineer',
    'frontend engineer',
    'engineering portfolio',
    'React',
    'TypeScript',
    'WebGL',
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
