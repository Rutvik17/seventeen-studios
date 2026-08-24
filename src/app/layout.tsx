import type { Metadata, Viewport } from 'next';
import { Syne, DM_Sans, JetBrains_Mono, Caveat } from 'next/font/google';
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
import { ogImage } from '@/lib/og';
import './globals.css';

/**
 * Root layout.
 *
 * Four typefaces, each with a job: Syne for display, DM Sans for reading,
 * JetBrains Mono for the labels, indices and metadata that give the site its
 * technical register — and Caveat, which is only ever chalk on Grasp's board.
 * All four are self-hosted by `next/font` at build time, so the static export
 * makes no third-party font requests.
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

/*
  Chalk. Used on exactly one page — Grasp's board — and loaded here because
  `next/font` has to run at module scope in a server component.

  Caveat rather than one of the scratchier handwriting faces: a lesson has to be
  READ, and the rougher hands lose legibility at the size algebra needs. The
  texture on the board comes from the drawing (a wide faint pass under every
  stroke) rather than from the letterforms, so the face can afford to be clear.
*/
const hand = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-hand',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://seventeenstudios.co';

/**
 * The landing's title, written once.
 *
 * It is the `<title>` default, the `og:title` and the Twitter title, and those
 * three disagreeing is the ordinary way a share card ends up advertising
 * something the page does not say.
 */
const LANDING_TITLE = `${founder.name} — ${founder.role}, ${founder.location}`;

/*
  The landing's card, and the fallback for any route that forgets its own.

  Every route below does set one — but `openGraph` is inherited whole, so if one
  ever stops, it inherits a real picture of this site rather than nothing. A
  missing `og:image` is the one metadata failure that degrades to a bare grey
  rectangle on every platform at once.
*/
const LANDING_IMAGE = ogImage(
  'home',
  `${founder.name} beside the companion device, its e-ink panel reading his name and title`,
);

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
    default: LANDING_TITLE,
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
  /*
    THESE ARE THE LANDING'S, AND EVERY PAGE THAT DOES NOT OVERRIDE THEM GETS
    THEM TOO. That is how metadata inheritance works in the App Router, and it
    is why `og:title` on the lab and on the Grasp course both read "Seventeen
    Studios" — those routes set a `title` and no `openGraph`, so their own title
    never reached the share card and the brand name overrode it.

    Fixed in two halves: this now carries the landing's real title rather than
    the brand's, and every static route below sets its own `openGraph` from the
    same constants it uses for `description`, so the two cannot disagree.
  */
  openGraph: {
    title: LANDING_TITLE,
    description: site.description,
    type: 'website',
    locale: 'en_CA',
    siteName: site.name,
    images: LANDING_IMAGE,
  },
  twitter: {
    card: 'summary_large_image',
    title: LANDING_TITLE,
    description: site.description,
    images: LANDING_IMAGE,
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
      className={`${syne.variable} ${dmSans.variable} ${mono.variable} ${hand.variable}`}
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
