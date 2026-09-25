import type { Metadata, Viewport } from 'next';
import { Caveat } from 'next/font/google';
import { Providers } from '@/components/Providers';
import { TransitionProvider } from '@/components/Transition';
import { Preloader } from '@/components/Preloader';
import { Cursor } from '@/components/Cursor';
import { Grain } from '@/components/Grain';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { site } from '@/content/studio';
import { founder } from '@/content/founder';
import { currentYear } from '@/lib/time';
import { ogImage } from '@/lib/og';
import { SITE_URL } from '@/lib/url';
import { LOADING_CLASS, LOADING_FAILSAFE_MS } from '@/lib/ready';
import './globals.css';

/*
  ONE HAND FOR THE WHOLE SITE: Caveat — the hand the film's captions are
  written in. Titles, tabs, notes, reading text, labels, numbers and the chalk
  on Grasp's board are all in it; `globals.css` points every font token at it.

  Caveat rather than one of the scratchier handwriting faces: a lesson has to be
  READ, and the rougher hands lose legibility at the size algebra needs. It is
  self-hosted by `next/font`, so the export makes no third-party font request.
*/
const hand = Caveat({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-hand',
  display: 'swap',
});

const siteUrl = SITE_URL;

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
  `${founder.name} — the contents page of a hand-drawn sketchbook: the founder, instruments, lessons and Grasp`,
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
    header.

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
    'full-stack engineer',
    'forward-deployed AI engineer',
    'agentic AI',
    'engineering portfolio',
    'React',
    'TypeScript',
  ],
  authors: [{ name: site.name }],
  /*
    THESE ARE THE LANDING'S, AND EVERY PAGE THAT DOES NOT OVERRIDE THEM GETS
    THEM TOO. That is how metadata inheritance works in the App Router: a route
    that set a `title` and no `openGraph` once shared as "Seventeen Studios",
    because its own title never reached the share card.

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
  themeColor: '#f2e7d2',
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
      className={hand.variable}
      suppressHydrationWarning
    >
      <head>
        {/*
          Runs before the first paint, so the loader covers the page from the
          first frame instead of arriving after the page has been seen in
          pieces. It is the only thing that shows the loader: without
          JavaScript this never runs and the page is simply there, and if the
          bundle fails the class comes off on its own — content is never
          hidden for good (rule 4).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(d){d.classList.add('${LOADING_CLASS}');setTimeout(function(){d.classList.remove('${LOADING_CLASS}')},${LOADING_FAILSAFE_MS})})(document.documentElement)`,
          }}
        />
      </head>
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
            <main id="main">{children}</main>
            <Footer buildYear={currentYear()} />
          </TransitionProvider>
        </Providers>
      </body>
    </html>
  );
}
