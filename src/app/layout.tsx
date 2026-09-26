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
import { share } from '@/lib/og';
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
 * It is the `<title>` default, the `og:title` and the X title, and those
 * three disagreeing is the ordinary way a share card ends up advertising
 * something the page does not say.
 */
const LANDING_TITLE = site.name;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  /*
    The landing is the studio's: its tab and its link preview say
    "Seventeen Studios", with "Imagined by Rutvik Patel" under it (the
    description, and the card). Every page inside is his, and its tab says
    so — "Algorithms — Rutvik Patel" — through the template.

    No agency keywords: "engineering studio", "software consultancy" and
    "creative engineering" bid for the reader this site is not for.
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
    THESE ARE THE LANDING'S, AND ANY PAGE THAT DOES NOT SET ITS OWN GETS THEM
    TOO — metadata is inherited in the App Router, and `openGraph` and
    `twitter` are replaced whole, never merged. So every page sets both,
    through `share()`, and `verify-og` fails the build if one does not.
  */
  ...share({
    title: LANDING_TITLE,
    description: site.description,
    path: '/',
    image: 'home',
    alt: `A watercolour of Nvidia's Voyager and Endeavor buildings in Santa Clara in autumn, with the maple leaf mark and “Nvidia, Santa Clara” in the corner`,
  }),
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
