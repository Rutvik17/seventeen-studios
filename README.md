# Seventeen Studios

Rutvik Patel's portfolio, made as one sketchbook. A statically exported Next.js
14 application; everything drawn on it is drawn in code.

- **The cover and contents** — the landing: the title painted in ultramarine,
  the world's cities sketched in coloured pencil over painted skies beside it
  one after another, and a contents page with a doodle beside each chapter.
- **The founder** — the book itself: a cover to open, a page per stretch of the
  career, turned like paper, and the résumé in a pocket inside the back cover.
- **The notebook** — where Rutvik documents what he learns, day by day.
- **Grasp** — a calculus course you learn by dragging, on this site.

Every page lies on one painted ground, a canvas brushed over in soft acrylic,
with paint and pencil on top. Everything is handwritten — Caveat for titles
and notes, Shantell Sans for reading — except Grasp's chalkboard, which keeps
its own faces. The loader is a brush painting the 17. Every change of page is a sheet of paper
turning. The cursor is a pencil that leans as it moves and circles whatever you
can click. The footer is the book's back endpaper — the bookplate
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
    page.tsx               the landing: one full-screen film — Nvidia's campus from the air, in watercolour, through a year
    founder/               the book: cover, chapters, the résumé in the back pocket
    notebook/              the notebook, and a folder per entry (earth-we-live-on/)
    grasp/                 Grasp: the chalkboard, the live derivative, the lessons
    globals.css            tokens, the chrome, and the shared page styles
  components/
    Nav.tsx                the top edge: the mark and three index tabs
    Footer.tsx             the back endpaper
    Sheet.tsx              the shell of every simple page, with a way back for notebook entries
    Cursor.tsx             the pencil and its hover marks
    Preloader.tsx          every full load: a brush paints the mark until the page is ready
    Transition.tsx         page-turn transitions + TransitionLink
    loader/                the mark, painted
    founder/               the book component and its styles
    grasp/                 the chalkboard
    instruments/           the derivative Grasp demonstrates
    notebook/              the entries' drawings — the globe, and the continents sketched beside it
    film/Film.tsx          the landing's film: the canvas, its caption, the shots to jump between, a pause
    IndexList.tsx          every list of pages to turn to — the contents, the notebook
    DrawIn.tsx             a little drawing — an underline, an arrow — that draws itself in
  assets/ground/           the painted ground every page lies on (made by scripts/make-ground.mjs)
  content/                 all copy, as typed data
  lib/
    film/                  the watercolour film engine — wash, pencil, the campus, sky, people and traffic, weather, the director
    sketchbook/            the book's drawings — geometry, chapters, the canvas painter — and the pencil, the brush and the painted ground everything is made with
    sketch/skylines.ts     the cities, landmark by landmark, as pencil marks
    pageTurn.ts            the sheet that turns between pages
    ready.ts               holds the loader until every self-painting part has painted
    url.ts                 where the site lives — the one place it is written
    sketch/portrait.ts     the founder's photo, redrawn in pencil and coloured pencil
    calculus.ts            Grasp's numeric and exact derivatives
    globe/                 the Earth we live on: coastlines and colour data, the view, the painted map, the globe, the continents
scripts/
  build-og.mjs             share cards, drawn from the site's own data
  verify-og.mjs            postbuild: every page names a share card that exists
  verify-assets.mjs        postbuild: every file a page references is in out/
  verify-globe.mjs         postbuild: the globe's world is the real one, and its painted pictures are up to date
  make-globe-data.mjs      the globe's coastlines and colour map, from Natural Earth and NASA's Blue Marble (run by hand)
  make-globe-sheet.mjs     the globe's world, painted once, as the pictures the page loads (run by hand)
  make-ground.mjs          the painted ground every page lies on, from the `--ground-*` tints (run by hand)
  chrome.mjs               headless Chrome, for the scripts that draw
  scene-server.mjs         serves the site's own TypeScript to that browser, so scripts draw with the pages' code
```

### Notebook entries

An entry is one object in `src/content/notebook.ts` — title, summary, the date
it was written — and a folder at `app/notebook/<slug>/` for its page, which
passes `notebookBack` to its `Sheet` for the way back. The notebook page lists
it, the sitemap includes it and `npm run og` draws its share card, all from
that object.

### The globe's data

The globe draws the real world. Its coastlines are Natural Earth's 1:110m land
(public domain), and the colour of every half-degree of it is read from NASA's
Blue Marble (public domain); `scripts/make-globe-data.mjs` turns the two into
`src/lib/globe/land.ts` and `colours.ts`. The world is then painted in acrylic
once, by `scripts/make-globe-sheet.mjs`, into `public/notebook/earth/` — the
page loads that picture rather than spending seconds colouring the world on
every visit. Change the marks, the data or the `--globe-*` paint colours and
run it again; `verify-globe.mjs` fails the build until you do.

### Content

Every word lives in `src/content` as typed data, not JSX. The founder's book is
`content/founder.ts`; its titles and dates are read from `content/resume.ts`,
and every other fact in it is the résumé's own.

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

Every route names its own share card (`public/og/<name>.png`, drawn by
`scripts/build-og.mjs`), and `scripts/verify-og.mjs` fails the build if one is
missing. The address on the cards and in the sitemap comes from `lib/url.ts`.

---

## Notes on the content

Nothing is invented. No clients, no testimonials, no metric that was not
measured. Every date in the founder's book comes from `src/content/resume.ts`,
and every number from the résumé.
