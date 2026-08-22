# Seventeen Studios — working notes

Rutvik Patel's engineering portfolio. Next.js 14 (App Router) + TypeScript,
statically exported to GitHub Pages. GSAP for choreography, Lenis for scroll,
Three.js where a thing genuinely needs a GPU, zustand for the few pieces of
global UI state.

`README.md` covers running it, deploying it, and the file layout. This file is
the set of rules to keep in mind when changing it.

---

## What this site is

**A portfolio, read by hiring managers and staff engineers.** Not an agency, not
a consultancy, not a studio touting for freelance work.

That distinction was learned the hard way. The site spent a phase as an agency —
services, a process diagram, six principles, concept briefs for engagements
nobody had commissioned, an availability line offering "two at a time", and a
five-step brief builder that made a visitor pick a budget band before they could
say hello. All of it is deleted, and none of it should come back:

- A candidate who appears to be running a consultancy on the side reads as
  divided attention.
- A reviewer scanning for evidence of ability had to wade through sales copy to
  find any.
- Speculative "concept briefs" invited the reader to mistake fiction for
  delivery, and hedging that on every card cost more space than the work.

**The work is the evidence. Words exist only to label it.**

---

## Non-negotiables

1. **The export must stay static.** No server components that need a runtime, no
   route handlers, no `next/image` optimisation, no middleware. Every route is
   prerendered into `out/`. Dynamic routes need `generateStaticParams`.
2. **Every path into `public/` goes through `asset()`** (`src/lib/asset.ts`).
   Next applies `basePath` to `next/link`, `next/image` and its own `_next/`
   output, but not to a literal `src`, `href` or `fetch` — those resolve against
   the domain root and 404 on the project page, which is served from
   `/seventeen-studios`. This shipped: the founder portrait and both résumé
   downloads were dead in production while every stylesheet loaded. Route paths
   do not need it; `TransitionLink` wraps `next/link`.
3. **Content is data, not markup.** All copy lives in `src/content/*.ts` typed by
   `src/content/types.ts`. Pages compose; they do not author. Adding a project or
   a notebook entry is one object in one file — indexes, the footer, the site
   index and the sitemap all follow automatically.
4. **Never let an animation be able to hide content permanently.** Hidden states
   are applied by JavaScript, never by CSS, so content is visible if the bundle
   fails or never runs.
5. **Reduced motion is an alternative expression, not an absence.** Check
   `prefersReducedMotion()` before starting anything; give the same information
   through a different mechanism. Vestibular offenders (parallax, pinning,
   large-scale movement) are removed outright.
6. **A sentence earns its place by saying something the demonstration cannot.**
   If a paragraph explains what a project does, the project is not doing enough
   on screen — fix the project and delete the paragraph. Nobody reads a
   portfolio; they scan it and then play with whatever moves.
7. **Every number on the site is computed, and its working is shown.** This is
   the site's whole differentiator and it is not negotiable:
   - the board's trace widths come from IPC-2221A, its crystal capacitors from
     the oscillator's load spec, its battery life from a duty-cycled average
     (`src/lib/board.ts`);
   - the risk desk prints its own disagreement with the closed-form answer
     (`src/lib/quant.ts`);
   - Grasp's demo shows the numeric derivative beside the exact one, with the
     error (`src/lib/calculus.ts`).

   A figure that cannot be checked by a reader who knows the subject is worth
   less than no figure at all. Never hard-code a result that a formula in the
   repository could produce.
8. **Nothing invented.** No clients, no testimonials, no metrics that were not
   measured. `status` on a project says `Designing` or `In progress` when that is
   the truth; presenting an intention as a shipped product is the fastest way to
   lose a technical reader. The founder page is a personal employment record and
   everything on it is real.
9. **Never type a calendar-dependent value into the copy.** Durations, "now"
   years, counts of things in a collection and reading times all come from
   `src/lib/time.ts` or are derived from the data itself. Dates of events that
   happened stay literal. If you add a value that would be wrong next January,
   derive it.

---

## The teaching rule — applies to everything explanatory

Borrowed wholesale from Grasp, whose §15 gate this is:

> **Assume the reader has never studied any of this.** Not "rusty" — none. Read
> what you wrote as someone who knows nothing, and find the first word you would
> have had to look up.

Concretely, in the notebook and in any explanatory copy:

- **Every symbol is introduced before it is used.** `σ` is never written without
  first saying it is the standard deviation and what a standard deviation is.
- **Every equation is stated in words first, then in symbols**, and then with
  real numbers substituted — never a bare result. `w = A ÷ (t × 1.378)` is
  followed by the same line with the actual figures in it.
- **No undefined jargon.** "Decoupling capacitor", "duty cycle", "log return",
  "value at risk" all get a plain-English sentence at first use.
- **No filler.** The failure mode of technical blogging is padding — a thousand
  words of preamble before the first useful sentence. Get to the thing.

A notebook entry is not done if a reader who has never seen a circuit board or a
derivative cannot follow it end to end.

---

## Design tokens

Defined once in `src/app/globals.css` as custom properties; mirrored in
`src/lib/tokens.ts` only for consumers that cannot read CSS (WebGL materials).
**That mirror fails silently when the two drift — change both together.**

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#eceae4` | page, warm paper grey |
| `--bg-raise` | `#f8f7f4` | cards, panels |
| `--bg-sunk` | `#e0ded6` | wells, code, insets |
| `--fg` | `#14161a` | text, graphite |
| `--fg-dim` | `rgba(20,22,26,.66)` | body copy |
| `--muted` | `#767a82` | mono labels |
| `--line` | `rgba(20,22,26,.12)` | hairlines |
| `--accent` | `#1b4fe0` | plotter blue — the one accent |
| `--accent-2` | `#b4622a` | copper, only where a drawing needs two readings |

`--pcb-*` are the landing board's own colours (soldermask, copper, silkscreen)
and must not leak into the interface.

Light theme: elevation is carried by `--shadow`, not by brightness. In a dark
theme a raised surface is *lighter* than its ground; in a light one it is whiter
and **casts**. Swapping colours without swapping that rule produces flat,
illegible cards — it has happened here once.

Type: **Syne** (display, 500–800), **DM Sans** (body, 300–500), **JetBrains
Mono** (labels, indices, metadata). All loaded via `next/font`, so the export
makes no third-party font requests.

Layout: `--gutter` for page padding, `--max` (1680px) for content width. Mono
labels are 11px / 0.16em / uppercase — that pairing is the site's signature and
should not drift.

---

## Market data

`scripts/fetch-market.mjs` runs as `prebuild` and writes `src/content/market.json`
— two years of adjusted daily closes for six tickers, with annualised drift and
volatility computed from **log** returns.

**It cannot be fetched in the browser.** The export is static with no server, and
Yahoo sends no CORS headers, so a call from the page is blocked before our code
runs. Every "live ticker on a static site" tutorial either proxies through a
server or is quietly broken.

Rules:

- **The fetch must never fail the build.** Any error logs a warning, leaves the
  committed fixture in place and exits zero. A portfolio that fails to deploy
  because a third party rate-limited us is worse than one showing yesterday's
  prices.
- **A partial fetch is discarded.** The risk desk compares assets; a table where
  two names silently vanished invites a wrong conclusion.
- The deploy workflow reruns each weekday at 22:30 UTC, after the US close.
- Drift and volatility are **backward-looking descriptions, not forecasts**, and
  anything consuming them says so.

---

## Animation rules

- Import `gsap` and `ScrollTrigger` from `@/lib/gsap` — never from the package
  directly; that module owns plugin registration.
- Wrap every timeline in `gsap.context(fn, scopeEl)` and `revert()` on unmount.
- **A pinned scroll story needs a track and a stage.** The outer element carries
  the height (the scroll distance); the inner one pins with `pinSpacing: false`.
  Scrubbing against a section's own travel through the viewport instead means
  the animation finishes while the subject is already leaving the screen — the
  exploded diagram shipped that way and the labels arrived after the drawing had
  gone.
- **Anything that must keep moving while the reader is still needs its own
  repeating tween**, not a place on the scrubbed timeline. A scrubbed loop only
  advances while the wheel is turning, so current flow on the board would freeze
  the moment someone stopped to read.
- **Watch for transform stacking.** `x`/`y` and `xPercent`/`yPercent` are
  separate channels: setting one never clears the other. Two ways this bites,
  both of which have shipped bugs here —
  1. a CSS `transform` on the element (the curtain columns and menu panels
     carry one so they stay hidden without JS) is resolved by GSAP into a
     pixel `y` that stacks under a `yPercent` tween;
  2. an *earlier tween* left a pixel `y` behind (the index overlay's close
     animation exits items to `y: -16`), and the open animation's `yPercent`
     does not undo it — the items stayed shifted up and their ascenders were
     sliced off by the reveal mask.

  Always pass an explicit `y: 0` in the `from` vars of a percent-based tween.
- Anything that changes page height (an accordion, a filter) must call
  `ScrollTrigger.refresh()` afterwards or pinned sections below will mis-measure.
- Do not read `getLenis()` during a child's mount effect — child effects run
  before the provider's. Use `onLenis()` from `@/lib/lenis`, or a native
  `scroll` listener (Lenis scrolls the window).
- Entrance animations gate on `useUi(state => state.entered)`, which the
  preloader sets. Without that gate they play behind the curtain.
- **Never `setPointerCapture` on pointerdown** in a drag interaction. Capture
  retargets the following `click` event to the capturing element, so every link
  underneath silently stops working. Capture only once the pointer has moved
  past a drag threshold. This has also bitten us once.
- **Never measure an element you are about to restyle.** The reduced-motion
  block sets `transition-duration` on `*`, and `transition-property` defaults to
  `all` — so *every* property is transitioned, including `font-size`. Setting a
  reference size and reading the width straight back returns a value part-way
  through the tween, and setting `transition: none` inline does not cancel one
  already running. `FitText` did this and converged on the geometric mean of the
  container and the true width, overflowing the footer wordmark by up to 257px
  for every reduced-motion visitor. Measure a freshly-inserted clone instead: a
  new node has no transition in flight.
- **A mask with leading below 1 clips descenders.** `overflow: hidden` on a
  heading (there to mask the line reveal) cuts the tails off g, y and p, because
  sub-1 `line-height` puts them outside the line box. Pair the mask with
  `padding-bottom` of ~0.2em and an equal negative `margin-bottom`. A line
  entering from a full line-height below is still clear of that padding.
- **A scroll container inside a flex column needs `min-height: 0`.** A flex
  item's `min-height` resolves to `auto` — its content height — so it can never
  shrink below the content and `overflow-y` has nothing to act on. The résumé
  sheet was unscrollable for this reason. It also needs `data-lenis-prevent`:
  a stopped Lenis still swallows wheel and touch events.
- **Removing a hovered element does not fire `pointerout`.** Closing a dialog
  from its own close button left the custom cursor stuck reading "Close" over
  the page behind it. `Cursor` re-derives its hover state from every
  `pointermove` so it self-corrects, and `resetCursor()` (`@/lib/cursor`) clears
  it immediately — call that whenever a labelled control unmounts under the
  pointer.

---

## SVG rules

- **React hoists `<title>` to the document head.** Any `<title>` rendered inside
  an SVG becomes page metadata and its children vanish — the board shipped with
  fourteen empty title tags and no tooltips. Use `<desc>`, which is not hoisted
  and is still announced by assistive technology.
- **An `<svg>` clips to its viewBox.** Content authored at negative coordinates
  is simply not drawn. The chime rig was invisible for exactly this reason.
- **`preserveAspectRatio="… slice"` crops.** Anything that must stay on screen
  regardless of viewport shape needs its own element pinned to the edge, not a
  position inside a sliced scene.
- **Verify drawings by reading the rendered path data out of `out/`,** not by
  looking at the source. Four real bugs in the board and three in the torii were
  found that way and would not have been found any other way.

---

## Workflow

Every change ships as a pull request — push the branch and open the PR without
waiting to be asked, then merge it so the deploy runs. If the branch's previous
PR has already been merged, restart the branch from `main` and open a new one
rather than pushing onto merged history.

---

## Checks before committing

```bash
npm run typecheck
npm run build          # runs the market fetch, then must produce out/
```

Then look at it in a browser at 1512px and 390px, with and without
`prefers-reduced-motion`. Screenshots catch layout regressions that types do
not — particularly the landing, whose wordmark is sized so it never wraps.

Also grep the export before shipping:

```bash
grep -rl "mailto:" out/ --include=*.html      # must be empty
```

The contact address is assembled on the client (`src/lib/contact.ts`) so it
never lands in the static files. Putting `contactHref()` in a render path
defeats this — under static export that call runs at build time and the address
is serialised straight into the HTML. It has happened once.
