# Seventeen Studios

Rutvik Patel's portfolio, made as one sketchbook. A statically exported Next.js
14 application; everything drawn on it is drawn in code.

- **The landing** — a film: Nvidia's campus in Santa Clara from the air,
  sketched, painted in watercolour and turned through a year.
- **The founder** — a film too: Rutvik sketched and painted from his
  photograph, then how a computer works from a single switch up to the AI he
  builds — bits, a byte, gates, a CPU, C++ down to machine code, a GPU, a
  matrix product, a neuron, learning, a language model, an agent — every
  number on screen computed. The résumé is always to hand.
- **The notebook** — where Rutvik documents what he learns, day by day.
- **Grasp** — a calculus course you learn by dragging, on this site.

Every page lies on watercolour paper, with pencil and paint on top. Everything
is handwritten, in Caveat. The loader is the maple leaf being sketched and
painted. Every change of page is a sheet of paper
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
    founder/               the founder film, and the résumé's file sizes read at build time
    notebook/              the notebook — a watercolour sketchbook turned by scrolling — and a folder per entry
    grasp/                 Grasp: the chalkboard, the live derivative, the lessons
    globals.css            tokens, the chrome, and the shared page styles
  components/
    Nav.tsx                the top edge: the mark and three index tabs
    Footer.tsx             the back endpaper
    Sheet.tsx              the shell of every simple page, with a way back for notebook entries
    Cursor.tsx             the pencil and its hover marks
    Preloader.tsx          every full load: a brush paints the mark until the page is ready
    Transition.tsx         page-turn transitions + TransitionLink
    loader/                the loader: the maple leaf, sketched and painted as the page gets ready
    LeafMark.tsx           the header's mark: a maple leaf, sketched and painted
    founder/FounderFilm.tsx the founder film: the canvas, each scene's caption, the scenes to jump between, a pause, the résumé
    grasp/                 the chalkboard
    instruments/           the derivative Grasp demonstrates
    notebook/              the notebook's book (NotebookBook)
    film/Film.tsx          the landing's film: the canvas, its caption, the shots to jump between, a pause
    IndexList.tsx          every list of pages to turn to — the contents, the notebook
    DrawIn.tsx             a little drawing — an underline, an arrow — that draws itself in
  content/                 all copy, as typed data
  lib/
    film/                  the watercolour engine — the leaf (mark and loader), and the film — wash, pencil, the campus, sky, people and traffic, weather, the director
    founder/               the founder film — facts.ts (every number, computed), portrait.ts (the photo, sketched and painted), scenes.ts (the drawings), director.ts
    pageTurn.ts            the sheet that turns between pages
    ready.ts               holds the loader until every self-painting part has painted
    url.ts                 where the site lives — the one place it is written
    calculus.ts            Grasp's numeric and exact derivatives
    notebook/              the sketchbook — its leaves, turns, scroll and the drawings on its pages (book.ts)
scripts/
  build-og.mjs             share cards, drawn from the site's own data
  verify-og.mjs            postbuild: every page names a share card that exists
  verify-assets.mjs        postbuild: every file a page references is in out/
  chrome.mjs               headless Chrome, for the scripts that draw
```

### Notebook entries

An entry is one object in `src/content/notebook.ts` — title, summary, the date
it was written — and a folder at `app/notebook/<slug>/` for its page, which
passes `notebookBack` to its `Sheet` for the way back. The notebook page lists
it, the sitemap includes it and `npm run og` draws its share card, all from
that object.

### Content

Every word lives in `src/content` as typed data, not JSX. The founder film's
script is `content/founder.ts`; the facts about Rutvik in it are the résumé's
own (`content/resume.ts`), and every number in it is computed by
`lib/founder/facts.ts`.

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
missing. The founder card is the founder film's finished portrait, photographed
from the built page, so run `npm run build` before `npm run og`. The address on the cards and in the sitemap comes from `lib/url.ts`.

---

## Notes on the content

Nothing is invented. No clients, no testimonials, no metric that was not
measured. Every fact about the career comes from `src/content/resume.ts` and
the résumé itself.
