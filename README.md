# Seventeen Studios

Rutvik Patel's engineering portfolio: a statically exported Next.js 14
application built around interactive instruments rather than prose. A circuit
board that assembles itself as you scroll, a Monte Carlo risk desk on real
market data, a character rigged on springs and inverse kinematics, and a
calculus demo you operate by dragging.

Every figure on it is computed and shows its working — the board's trace widths
come out of IPC-2221A, the risk desk prints its disagreement with the
closed-form answer. Nothing is a screenshot.

Live: **https://rutvik17.github.io/seventeen-studios/**

---

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export into ./out
npm run typecheck
```

`npm run build` produces a complete static bundle in `out/`. To preview exactly
what gets deployed:

```bash
npm run build && npx serve out
```

---

## Deployment — GitHub Pages

### One-time setup

**Settings → Pages → Build and deployment → Source: "GitHub Actions".**

This step has to be done by a human, once. The workflow cannot do it: creating a
Pages site through the API needs repository-administration rights that a
workflow's automatic `GITHUB_TOKEN` deliberately does not have, so
`actions/configure-pages` with `enablement: true` fails with *"Resource not
accessible by integration"*. Once the source is set, every deploy after that is
automatic.

### After that

`.github/workflows/deploy.yml` builds and publishes on every push to `main`, and
can also be run by hand from the **Actions** tab (*Deploy to GitHub Pages → Run
workflow*). It:

1. derives the base path from the repository name — `/seventeen-studios` for a
   project page, empty for an `<owner>.github.io` user page — so the build never
   depends on the Pages API being reachable;
2. builds with `NEXT_PUBLIC_BASE_PATH` and `NEXT_PUBLIC_SITE_URL` set from that;
3. writes `out/.nojekyll` so GitHub does not strip the `_next/` directory;
4. uploads `out/` and deploys it.

If the deploy step fails with a 404 or a permissions error, Pages has not been
enabled yet — do the one-time setup above and re-run.

### Custom domain

Add the domain in **Settings → Pages**, and add a `public/CNAME` file containing
it. With a custom domain the site is served from the root, so also remove
`NEXT_PUBLIC_BASE_PATH` from the workflow's build step (or set it to an empty
string) — `next.config.js` already treats `/` and empty as "no base path".

---

## Architecture

```
src/
  app/                     routes (App Router, all statically exported)
    layout.tsx             fonts, metadata, global chrome
    page.tsx               home — section composition
    lab/                   working instruments — risk desk, companion rig
    notebook/              writing: index + [slug] detail
    products/              shipped software: index + [slug] detail
    founder/               MODEL A in 3D, then the employment record
    legal/                 privacy + terms ([slug])
    start/                 contact
    globals.css            the entire design system
  components/
    Providers.tsx          Lenis + GSAP frame loop, ScrollTrigger sync
    Transition.tsx         curtain page transitions + TransitionLink
    Preloader.tsx          first-visit counter and column sweep
    Cursor.tsx             dot / ring / contextual label
    Nav.tsx, MenuOverlay   header and full-screen index
    founder/               the 3D assembly and the employment record
    instruments/           the things that actually run
    Prose.tsx              renders authored content blocks
    motion/                Reveal, SplitText, Magnetic, Scramble
    sections/              the home-page sections
  content/                 all copy, as typed data (types.ts is the model)
    market.json            real closes, written by scripts/fetch-market.mjs
  lib/
    founder/               MODEL A — measured GLB, studio, panel firmware
    board.ts               PCB geometry + IPC-2221A trace maths
    pixel.ts               the e-ink companion sprite
    quant.ts               Monte Carlo, VaR, expected shortfall, Cholesky
    calculus.ts            central differences + exact derivatives
    physics.ts             springs, pendulums, two-bone IK, Verlet
    companion.ts           Mochi's rig
    gsap.ts, lenis.ts      animation and scroll singletons
    text.ts, inline.tsx    split-text and inline markup helpers
scripts/
  fetch-market.mjs         build-time price fetch (see below)
  hooks/                   useMagnetic, useIsomorphicLayoutEffect
```

### Content

Every word on the site lives in `src/content` as typed data, not JSX. Adding a
notebook entry means appending one object to `src/content/notebook.ts`; the
index page, the footer, the site index overlay, the sitemap and the static route
are all generated from it. The same is true of projects and products.

Inline emphasis inside content strings uses a three-token subset resolved by
`lib/inline.tsx`: `*accent*`, `_italic_` and `` `mono` ``.

### Anything that moves with the calendar

`lib/time.ts` derives it from a fixed anchor rather than having it typed into
the copy: years of experience, the copyright line, counts of things in a
collection, and each notebook entry's reading time (measured from its own word
count). Nothing needs editing when a year turns over.

Dates of things that *happened* stay literal — the founding year, employment
start and end dates, publication dates — because those are facts, not
durations.

The values resolve at build time, so `deploy.yml` also runs on the 1st of each
month to keep a long-untouched site from sitting on a stale figure.

### The résumé

`src/content/resume.ts` is the source for the two files in `public/founder`: a
PDF to hand to a person, and a .docx for applicant tracking systems. Nothing on
the site links to them at the moment — the founder page that did was torn down
— so whatever replaces that page is where they surface again. They are
regenerated with:

```bash
npm i -D playwright        # only needed for the PDF step
CHROMIUM_PATH=/path/to/chrome \
  node --experimental-strip-types scripts/build-resume.mjs
```

The .docx is deliberately plain — single column, no tables, contact details in
the body rather than a header, conventional headings, MM/YYYY dates — because
it has to parse cleanly. The script fails loudly if either file is missing or
suspiciously small.

### Artwork

Everything drawn on this site is generated at runtime — the board as SVG, the
e-ink panel and the instruments on canvas — so there is nothing to optimise and
nothing to lay out late. The only raster assets are in `public/founder` (a portrait and the two résumé
files) and `public/models` (the Raspberry Pi GLB the founder page loads).

### Motion

- **Lenis** drives scroll from the GSAP ticker, so scroll and animation share
  one frame loop.
- **ScrollTrigger** handles reveals, the pinned horizontal gallery, the sticky
  process stack and the scrubbed philosophy statement.
- **Reduced motion is a first-class path**, not a switch-off: the preloader and
  curtain are skipped, the pinned gallery becomes a normal scroller, the WebGL
  field renders a single still frame, and content is never hidden behind an
  animation that will not play.

---

## Market data

`scripts/fetch-market.mjs` runs as `prebuild` and writes `src/content/market.json`
— two years of adjusted daily closes for six tickers, with annualised drift and
volatility from log returns.

It cannot run in the browser: the export is static with no server, and Yahoo
sends no CORS headers, so a call from the page is blocked before our code runs.
Fetching at build time is the only way to have real prices on a static host
without standing up a proxy.

The fetch never fails the build — any error keeps the committed fixture and
exits zero. The deploy workflow reruns each weekday at 22:30 UTC, after the US
close, so the figures refresh on their own.

```bash
npm run market      # refresh by hand
```

---

## Notes on the content

Nothing is invented. No clients, no testimonials, no metric that was not
measured; a project's `status` says `Designing` or `In progress` when that is
the truth. The founder page is a personal employment record, and every date in
`src/content/founder.ts` that the rebuilt page will draw on is real.

Explanatory writing follows one rule, borrowed from Grasp: assume the reader has
never studied any of this. Every symbol is introduced before it is used, every
equation is stated in words before symbols, and no jargon goes undefined.

The founder page is the same device as the landing, built rather than drawn:
a Raspberry Pi and 2.9" e-ink panel modelled in Blender, assembled by scroll,
with every figure in the working column computed from the mesh or from the
part. The employment record underneath is the factual career in
`src/content/founder.ts`. Styles, animation and the 3D stack live under
`src/components/founder` and `src/lib/founder` so the page can come out
without touching the rest of the site.
