# Seventeen Studios

Rutvik Patel's portfolio, made as one sketchbook. A statically exported Next.js
14 application; everything drawn on it is drawn in code.

- **The cover and contents** — the landing: the title drawn in pencil and
  cross-hatched, and a contents page with a doodle beside each chapter.
- **The founder** — the book itself: a cover to open, a page per stretch of the
  career, turned like paper, and the résumé in a pocket inside the back cover.
- **The notebook** — blank pages, for now: a clean slate for what comes next.
- **Grasp** — a calculus course you learn by dragging, being built on this site.

The loader is a pencil drawing the 17. Every change of page is a sheet of paper
turning. The cursor is the pencil: it leaves a faint line behind it and circles
whatever you point at. The footer is the book's back endpaper — the bookplate
that says who to return it to.

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
    page.tsx               the cover and contents
    founder/               the book: cover, chapters, the résumé in the back pocket
    notebook/              blank pages — a clean slate
    grasp/                 Grasp: the chalkboard, the live derivative, the lessons
    start/                 contact (the page email links fall back to)
    legal/                 privacy + terms ([slug])
    globals.css            tokens, the chrome, and the shared page styles
  components/
    Nav.tsx                the top edge: the mark and three index tabs
    Footer.tsx             the back endpaper
    Sheet.tsx              the shell of every simple page
    Cursor.tsx             the pencil, its trail and its hover marks
    Preloader.tsx          first visit: a pencil draws the mark, the sheet turns away
    Transition.tsx         page-turn transitions + TransitionLink
    loader/                the pencil-drawn mark
    founder/               the book component and its styles
    grasp/                 the chalkboard
    instruments/           the derivative Grasp demonstrates
    sections/Contents.tsx  the landing
  content/                 all copy, as typed data
  lib/
    sketchbook/            the book's drawings — geometry, chapters, the canvas painter
    sketch/wordmark.ts     the landing's pencil-drawn, cross-hatched title
    pageTurn.ts            the sheet that turns between pages
    url.ts                 where the site lives — the one place it is written
    calculus.ts            Grasp's numeric and exact derivatives
scripts/
  build-og.mjs             share cards, drawn from the site's own data
  build-resume.mjs         the PDF and .docx résumé
```

### Content

Every word lives in `src/content` as typed data, not JSX. The founder's book is
`content/founder.ts`, and every fact in it comes from `content/resume.ts`.

### Anything that moves with the calendar

`lib/time.ts` derives it from a fixed anchor rather than having it typed into
the copy: years of experience and the copyright line. Dates of things that
*happened* stay literal. The values resolve at build time, so the deploy
workflow also runs weekly to keep a figure from going stale.

### The résumé

`src/content/resume.ts` is the source for the two files in `public/founder`: a
PDF to hand to a person, and a .docx for applicant tracking systems. The founder
page offers both for download, with each file's size read from disk at build
time. They are regenerated with:

```bash
npm i -D playwright        # only needed for the PDF step
CHROMIUM_PATH=/path/to/chrome \
  node --experimental-strip-types scripts/build-resume.mjs
```

The .docx is deliberately plain — single column, no tables, contact details in
the body rather than a header, conventional headings, MM/YYYY dates — because
it has to parse cleanly. The script fails loudly if either file is missing or
suspiciously small.

### Link previews

Every route names its own share card (`public/og/<name>.png`, drawn by
`scripts/build-og.mjs`), and `scripts/verify-og.mjs` fails the build if one is
missing. The address on the cards and in the sitemap comes from `lib/url.ts`.

---

## Notes on the content

Nothing is invented. No clients, no testimonials, no metric that was not
measured. The career in `src/content/resume.ts` is a personal employment record,
and every date and number in the founder's book comes from it.
