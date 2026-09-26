# Seventeen Studios

Rutvik Patel's portfolio, made as one sketchbook. A statically exported Next.js
14 application; everything drawn on it is drawn in code.

- **The landing** — a film: Nvidia's campus in Santa Clara from the air,
  sketched, painted in watercolour and turned through a year.
- **The founder** — Rutvik, sketched in pencil and painted in watercolour from
  a photograph of him, with his name and what he does beside him, a way to
  write to him, and the résumé.
- **Algorithms** — the NeetCode 150: every problem restated, solved in Python,
  JavaScript, Java, C++, C# and Rust, and drawn step by step as it runs.
- **Grasp** — a calculus course you learn by dragging, on this site.

Every page lies on watercolour paper, with pencil and paint on top. Everything
is handwritten, in Caveat. The loader is the maple leaf being sketched and
painted. Every change of page is a sheet of paper
turning. The cursor is the films' brush, leaning as it moves, and it lays a
little watercolour wash under whatever you can click. The footer is the book's back endpaper — the bookplate
that says who to return it to.

Live: **https://rutvik17.github.io/seventeen-studios/**

---

## Running locally

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static export into ./out
npm run typecheck  # fails on anything unused, too
npm run deadcode   # no unused file, export or dependency (knip)
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
    page.tsx               the landing: one full-screen film — Nvidia's campus from the air, in watercolour, through a year
    founder/               the founder film, and the résumé's file sizes read at build time
    algorithms/            the problem list beside the open problem; a page per problem
    grasp/                 Grasp: the chalkboard, the live derivative, the lessons
    globals.css            tokens, the chrome, and the shared page styles
  components/
    Nav.tsx                the top edge: the mark and three index tabs
    Footer.tsx             the back endpaper
    Sheet.tsx              the shell of every simple page
    Cursor.tsx             the brush and the washes it lays on hover
    Preloader.tsx          every full load: a brush paints the mark until the page is ready
    Transition.tsx         page-turn transitions + TransitionLink
    loader/                the loader: the maple leaf, sketched and painted as the page gets ready
    LeafMark.tsx           the header's mark: a maple leaf, sketched and painted
    founder/FounderFilm.tsx the founder page: the portrait's canvas, his name and line beside it, the résumé
    grasp/                 the chalkboard
    instruments/           the derivative Grasp demonstrates
    algorithms/            the list, the player, the drawing panels (Viz), the code tabs
    film/Film.tsx          the landing's film: the canvas, its caption, the shots to jump between, a pause
    DrawIn.tsx             a little drawing — an underline, an arrow — that draws itself in
  content/                 all copy, as typed data
  lib/
    film/                  the watercolour engine — the leaf (mark and loader), and the film — wash, pencil, the campus, sky, people and traffic, weather, the director
    founder/               the founder portrait — portrait.ts (the photo, sketched and painted), director.ts (made, then alive)
    pageTurn.ts            the sheet that turns between pages
    ready.ts               holds the loader until every self-painting part has painted
    url.ts                 where the site lives — the one place it is written
    calculus.ts            Grasp's numeric and exact derivatives
    algorithms/            trace.ts (steps and panels), traces/ (a tracer per category), solutions.ts, highlight.ts
scripts/
  build-og.mjs             share cards: the built pages photographed, and Grasp's board drawn
  verify-og.mjs            postbuild: every page names a share card that exists
  verify-assets.mjs        postbuild: every file a page references is in out/
  chrome.mjs               headless Chrome, for the scripts that draw
  algorithms/              test.mjs (runs every solution in six languages), traces.mjs (checks every drawing)
solutions/                 a folder per problem: spec.json and a solution per language
```

### Algorithms

A problem is one object in its category's file in `src/content/algorithms/`
(the words) and a folder `solutions/<slug>/` (a `spec.json` with the signature
and test cases, and one solution per language). Its tracer — the algorithm,
recording what to draw — is in `src/lib/algorithms/traces/<category>.ts`.

```bash
npm run test:algorithms            # every solution, every language (Python, Node, JDK, g++, .NET 8, rustc)
npm run test:algorithms two-sum    # just some
npm run test:traces                # every drawing arrives at the expected answer
```

### Content

Every word lives in `src/content` as typed data, not JSX. The founder page's
words and photographs are `content/founder.ts`; the facts about Rutvik in it
are the résumé's own.

### Anything that moves with the calendar

`lib/time.ts` computes it rather than having it typed into the copy — today,
that is the copyright year. Dates of things that *happened* stay literal. The
values resolve at build time, so the deploy workflow also runs weekly to keep a
figure from going stale.

### The résumé

The two files in `public/founder` — a PDF to hand to a person and a .docx for
applicant tracking systems — are the résumé as Rutvik keeps it, in Word. The
founder page offers both, with each file's size read from disk at build time.
To change the résumé, edit the .docx and export the PDF from it.

### Link previews

Every route names its own share card (`public/og/<name>.jpg`, drawn by
`scripts/build-og.mjs`), and `scripts/verify-og.mjs` fails the build if one is
missing. The landing, founder and algorithms index cards are those pages,
photographed from the built export; the one card every problem page shares
is six drawings off six problem pages, laid out on paper (so it is never one
problem); and Grasp's is drawn in the site's own font files, so run `npm run build` before `npm run og`. Every page sets its
preview through `share()` in `lib/og.ts` — the Open Graph and X tags together —
and each card's URL ends in `?v=` and a hash of the file, so a redrawn card is a
new URL that no app has cached. The cards are JPEG so they stay well under the
size messaging apps accept. The address on the cards and in the sitemap comes from `lib/url.ts`.

---

## Notes on the content

Nothing is invented. No clients, no testimonials, no metric that was not
measured. Every fact about the career comes from the résumé itself.
