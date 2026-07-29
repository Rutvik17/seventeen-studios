# Seventeen Studios

The studio site: a statically exported Next.js 14 application with a WebGL hero,
GSAP-driven choreography, Lenis smooth scroll and generative SVG artwork.

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
    studio/                the studio: principles, engagements, FAQ
    founder/               the founder: record, independent work, tools
    work/                  concept-brief index + [slug] detail
    thinking/              essay index + [slug] detail
    start/                 the brief builder
    globals.css            the entire design system
  components/
    Providers.tsx          Lenis + GSAP frame loop, ScrollTrigger sync
    Transition.tsx         curtain page transitions + TransitionLink
    Preloader.tsx          first-visit counter and column sweep
    Cursor.tsx             dot / ring / contextual label
    Nav.tsx, MenuOverlay   header and full-screen index
    Field.tsx              mounts the WebGL hero (dynamic import)
    Poster.tsx             generative SVG artwork
    founder/               portrait shader, career timeline, counters
    Prose.tsx              renders authored content blocks
    motion/                Reveal, SplitText, Magnetic, Scramble
    sections/              the home-page sections
  content/                 all copy, as typed data (types.ts is the model)
  lib/
    webgl/field.ts         GLSL particle field
    generative.ts          seeded poster geometry
    gsap.ts, lenis.ts      animation and scroll singletons
    text.ts, inline.tsx    split-text and inline markup helpers
  hooks/                   useMagnetic, useTilt, useReducedMotion, …
```

### Content

Every word on the site lives in `src/content` as typed data, not JSX. Adding an
essay means appending an `Essay` to `src/content/thinking.ts`; the index page,
the footer, the site index overlay, the sitemap and the static route are all
generated from it. The same is true of concept briefs (`work.ts`) and services.

Inline emphasis inside content strings uses a three-token subset resolved by
`lib/inline.tsx`: `*accent*`, `_italic_` and `` `mono` ``.

### Artwork

Every poster is generated from a seed by `lib/generative.ts` and rendered as SVG
on the server, so the same brief always produces the same artwork, with no
requests and no layout shift. The only raster asset on the site is the founder
portrait in `public/founder`, which is graded in a shader at runtime
(`lib/webgl/portrait.ts`) with the plain `<img>` underneath as the fallback.

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

## Notes on the content

The concept briefs are self-initiated, speculative engagements — labelled as
such everywhere they appear. Every projected figure is published with the method
that would produce it. Nothing on the site is presented as delivered client
work.

`design-reference/` holds the original static prototype the current site was
rebuilt from. It is not part of the build.
