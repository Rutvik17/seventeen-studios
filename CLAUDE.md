# Seventeen Studios — working notes

Rutvik Patel's engineering portfolio. Next.js 14 (App Router) + TypeScript,
statically exported to GitHub Pages. GSAP for choreography, Lenis for scroll,
canvas 2D for the drawings, zustand for the few pieces of global UI state.

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

## The style: one sketchbook

The whole site is one sketchbook, and every new piece should read as a leaf of
it rather than as a web page:

- **Everything is watercolour and pencil on paper.** Every page lies on the
  watercolour paper (`--paper`). The drawing goes on it in pencil and the
  washes over the drawing. There is no grid and no texture: graph paper made
  every page a worksheet, and a painted acrylic ground has gone too.
- **Pages are sheets.** Simple pages use `components/Sheet.tsx` — a crimson
  margin rule, a handwritten note above a title painted over a wash.
- **One hand, one style, everywhere.** Caveat is the only font on the site —
  titles, tabs, notes, reading text, labels, numbers, Grasp's board — and
  every font token points at it. It is the hand the film's captions are
  written in, and every title is written the way a caption is: bold, in the
  page's ink, with one straight pen underline. No painted titles, no
  uppercase tracked labels, no crimson squiggles. Caveat reads small, so
  nothing is set below 16px.
- **Colour comes from the paint box, a few at a time.** One paint for the
  cover's title and the mark (ultramarine), one per row down a list, three
  pencils a city. Never a whole spectrum in one place — a title with every
  letter a different colour read as a rainbow flag, not a sketchbook.
- **One brush and one pencil.** Everything painted is painted by
  `src/lib/film/wash.ts` (glazes of a wandering shape, a darker drying edge);
  everything drawn by `src/lib/film/pencil.ts`. The pencil and the brush seen
  at work are `src/lib/film/tools.ts`. A new drawing uses them rather than
  inventing a third hand.
- **The pencil is the cursor** (`components/Cursor.tsx`): it circles what it
  can act on in graphite, crimson only round the one thing to do next
  (`data-cursor-accent`); rows of a list (`data-row`) wash themselves in
  instead of being circled; over text it steps aside for the caret.
- **The page turn is the transition; the loader is
  the mark being made** — the maple leaf sketched in pencil and painted as
  the page gets ready, swaying a little (`loader/LeafCanvas.tsx`). **The mark
  is a maple leaf**,
  sketched and painted in autumn (`lib/film/leaf.ts`); the tab icon is the
  same outline, flat, on a paper tile.
- New motion should feel like drawing or turning paper, not like an
  interface animating.
- **The footer is the back endpaper**, and the nav is the book's three tabs —
  written in the film's caption hand (Caveat 600, the current tab 700 with a
  straight pen underline).
  Neither should grow into a site map.
- **One name per thing.** The section is *Algorithms* — it was the notebook,
  and `/notebook` no longer exists. Grasp lives on this site; it is not an app.

### Algorithms — the NeetCode 150, drawn

`/algorithms` is a full-viewport app, not a sheet: every problem down the left
(grouped by NeetCode's categories, in NeetCode's order, searchable, a drawer on
a phone), the open problem on the right — the statement in our own words,
worked examples, constraints, the idea, its complexity, the solution in six
languages (Python, JavaScript, Java, C++, C#, Rust) and, beside it, the
algorithm drawn step by step. The endpaper is hidden there (`data-app`), and
code is set in JetBrains Mono, the one face beside Caveat.

- **A problem is data in two places.** Its words are one object in its
  category's file in `src/content/algorithms/`; its solutions and test cases
  are the folder `solutions/<slug>/` (`spec.json` plus one file per language).
  The list, the pages, the sitemap and the examples all follow from those.
- **Every solution is run.** `npm run test:algorithms [slugs…]` compiles and
  runs every language against the spec's cases (`scripts/algorithms/test.mjs`;
  the node types and printers are in `scripts/algorithms/runtime/`). Answers
  that may come in any order, or have several right forms, are compared by the
  spec's `compare` mode. Expected answers are computed independently —
  brute force where it is feasible — never copied from a solution.
- **Every drawing is the algorithm running.** A tracer
  (`src/lib/algorithms/traces/<category>.ts`) is the solution, instrumented: it
  records panels (`src/lib/algorithms/trace.ts`) as it goes, and
  `npm run test:traces` runs every tracer on every case and checks it reaches
  the expected answer. A trace that draws a wrong answer is a failing test.
  `Rec.add` snapshots its panels, so a tracer may keep changing its working
  arrays after drawing them.
- **Statements are paraphrased**, never LeetCode's text, and the constraints
  are LeetCode's facts. Each idea obeys the teaching rule below.

### The film — the one place that is watercolour

The landing IS a film, and nothing else — one scene filling the viewport,
no contents, no footer, no scrolling; the header's tabs are the way into the
rest of the book. It shows Nvidia's campus in Santa Clara from the air
(Voyager and Endeavor) drawn in pencil, laid in with watercolour washes, and
turned through a year of shots — seasons, times of day, weather — with people
walking, pods on the streets, drones and an air taxi overhead. It is the
deliberate exception to "acrylic, a few paints at a time": a painting of a
place carries that place's colours.

- **The engine is `src/lib/film`, framework-free canvas 2D.** `wash.ts` is
  the watercolour (glazes of a deformed polygon, a darkened drying edge),
  `pencil.ts` the hand-drawn line, `campus.ts` the geometry — described once,
  sorted into ink, the `build` layer and the four seasons' layers — and
  `film.ts` the director: acts, shots, camera, compositing. Keep new drawing in
  those two hands rather than inventing a third.
- **The campus is drawn to NVIDIA's own aerial photograph** ("Aerial View of
  NVIDIA Voyager and Endeavor", Gensler / Jason O'Rear, NVIDIA newsroom) and
  the buildings' published facts. Endeavor front left, Voyager behind it to
  the right; both beveled triangles under white, crystalline, faceted roofs
  set with triangular skylights, dark sloped glass beneath a deep overhang;
  the trellis — white steel trees under a star of dark solar panels — in
  front of Voyager's southwest face; San Tomas Expressway sweeping up the
  right with a covered footbridge over it; a lawn wedge with a diagonal path
  from the junction to Endeavor. Everything is placed on a plan in metres and
  projected through one camera (`proj` in `campus.ts`); never place a thing
  by eye on screen. Buildings hide what is behind them (`occluders`). Before
  changing the buildings, check the change against that photograph.
- **Shots are content.** Each is one object in `src/content/film.ts`: season,
  sky, glaze, how dark, how busy, what is falling, where the camera rests.
  Adding a shot must not need an engine change.
- **Paint once, composite every frame.** Anything that does not move is baked
  into a layer; the frame is a stack of `drawImage`s plus what moves. The
  night is a `multiply` glaze over everything, and the lights go on top in
  `screen` — never darken the layers themselves.
- **A change of season bleeds, it does not cross-fade.** The new season's layer
  spreads in through a mask of growing blots while the old one is lifted out
  through the same mask.
- **The canvas is transparent** over the film's own sheet; the film fades into
  the page at its foot.
- **Reduced motion:** no pencil, brush or timelapse — the finished painting,
  still, with every shot a button. Nothing in the engine is started without
  checking.

### The founder page — one painting

The founder page is one scene filling the viewport, made the way the landing's
film is and in the same two hands: Rutvik sketched in pencil and painted, then
left alive on the page, with his name and what he does now written beside him
(`now` in `src/content/founder.ts`), a way to write to him and the résumé. No
scenes to choose between, no pause, no scrolling, no footer. It used to be a
four-scene story (the 0s and 1s, the GPU); that went, and the page is only the
portrait.

- **The portrait is drawn from a photograph**, a different one of Rutvik on
  each visit (`founderFilm.photos` in `content/founder.ts`, the files in
  `public/founder`; `?photo=<id>` asks for one). `src/lib/founder/portrait.ts`
  paints it as line and wash, never as a filtered photograph: the picture is
  squinted down to a few paints (k-means), the pencil follows where those
  shapes meet and the fine tones of the face, and each shape is laid in its
  own paint — lights left as paper, darker rims where paints meet, the grain
  of the paper, frayed edges and a little spatter. The face and hands (boxes
  given per photo) keep more of the photograph's tones, feathered in; a photo
  where he is small gets a `crop`, so the painting frames him, not the view. If a
  portrait starts to look like a photo again, it has lost its shapes.
- **`src/lib/founder/director.ts` runs it**: making, then alive; the camera
  fits the portrait into the room the words leave. Reduced motion gets the
  painting finished and still.
- **What moves comes in with the paint.** The `live` layer (the lights in the
  photograph flickering, 0s and 1s rising off the page) is drawn on its own
  sheet and faded up as the washes go down, so nothing pops onto a half-made
  page.

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
3. **Content is data, not markup.** All copy lives in `src/content/*.ts`, typed
   where it is declared. Pages compose; they do not author. An algorithms
   problem is one object in one file (plus its solutions folder), with the
   list, the pages and the sitemap following automatically.
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
   - Grasp's demo shows the numeric derivative beside the exact one, with the
     error (`src/lib/calculus.ts`).
   - Every algorithm drawing is the algorithm running on the example, and
     every solution is executed in all six languages before it ships.

   A figure that cannot be checked by a reader who knows the subject is worth
   less than no figure at all. Never hard-code a result that a formula in the
   repository could produce.
8. **Nothing invented.** No clients, no testimonials, no metrics that were not
   measured, and no role described bigger than it was — presenting an intention
   as shipped, or "worked on" as "led", is the fastest way to lose a technical
   reader. The career's titles and dates live in
   `src/content/resume.ts`; the résumé itself is the Word document in
   `public/founder` (PDF and .docx), kept by hand. Everything in both is real.
9. **Never type a calendar-dependent value into the copy.** Durations, "now"
   years and counts of things in a collection all come from `src/lib/time.ts`
   or are derived from the data itself. Dates of events that
   happened stay literal. If you add a value that would be wrong next January,
   derive it.
10. **Never write copy that describes the site's current state.** "Blank for
    now", "the first entry isn't written yet", "being built on this site" —
    each is wrong the day the state changes, and nobody remembers to go back
    and edit it. Say what a thing *is* and what it is for. Where the state
    genuinely has to show (which Grasp lessons are open), render it from the
    data, with a branch for every case, including "all done".

---

## The teaching rule — applies to everything explanatory

Borrowed wholesale from Grasp, whose §15 gate this is:

> **Assume the reader has never studied any of this.** Not "rusty" — none. Read
> what you wrote as someone who knows nothing, and find the first word you would
> have had to look up.

Concretely, in the algorithms pages and in any explanatory copy:

- **Every symbol is introduced before it is used.** `σ` is never written without
  first saying it is the standard deviation and what a standard deviation is.
- **Every equation is stated in words first, then in symbols**, and then with
  real numbers substituted — never a bare result. `w = A ÷ (t × 1.378)` is
  followed by the same line with the actual figures in it.
- **No undefined jargon.** "Decoupling capacitor", "duty cycle", "log return",
  "value at risk" all get a plain-English sentence at first use.
- **No filler.** The failure mode of technical blogging is padding — a thousand
  words of preamble before the first useful sentence. Get to the thing.

An algorithm's page is not done if a reader who has never seen a hash map or a
recursion cannot follow its idea end to end.

---

## Design tokens

Defined once in `src/app/globals.css` as custom properties. That stylesheet is
the single source of truth — there is no second copy to keep in step.

There used to be a mirror in `src/lib/tokens.ts` for consumers that cannot read
CSS. It is gone, and how it went is the point: its last consumer disappeared
with the founder portrait shader, and by then it had already drifted — it still
claimed `bg: #faf9f5` against the stylesheet's value at the time. It failed
exactly the way its own comment warned it would, silently, because both halves
were internally consistent. If a WebGL material needs a palette colour again,
read it once at runtime with `getComputedStyle(document.documentElement)
.getPropertyValue('--accent')` rather than writing the number down twice.

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#f2e7d2` | page, warm cream sketchbook paper |
| `--bg-raise` | `#faf3e5` | cards, panels |
| `--bg-sunk` | `#e6d9bf` | wells, code, insets |
| `--fg` | `#1d1d21` | text, charcoal |
| `--fg-dim` | `rgba(29,29,33,.68)` | body copy |
| `--muted` | `#7d7768` | mono labels |
| `--line` | `rgba(29,29,33,.12)` | hairlines |
| `--accent` | `#1f3a8a` | deep ink blue — the pen |
| `--accent-2` | `#c8233f` | crimson — the one thing to do next, or a drawing's second reading |
| `--paint-1` … `-5` | `#2b3f9e` `#eba42c` `#3f7d3a` `#cf3f2c` `#5a3a8e` | the paint box, acrylic: ultramarine (the mark and the title), cadmium yellow, sap green, cadmium red, dioxazine violet |
| `--paper` | `#f5f0e6` | the watercolour paper every page lies on |

Light theme: elevation is carried by `--shadow`, not by brightness. In a dark
theme a raised surface is *lighter* than its ground; in a light one it is whiter
and **casts**. Swapping colours without swapping that rule produces flat,
illegible cards — it has happened here once.

Type: **Caveat** (titles and notes, 500–700) and **Shantell Sans** (reading and
small print, variable, with its `BNCE` and `INFM` axes). **Syne** 800 only for
list numbers; **DM Sans** and **JetBrains Mono** only on Grasp. All loaded via
`next/font`, so the export makes no third-party font requests. Canvas text
cannot set a variable font's axes, so anything a canvas writes gets its
irregularity from the drawing (the cover turns, raises and sizes each letter
itself), not from the face.

Layout: `--gutter` for page padding, `--max` (1680px) for content width. Small
labels are 11px / 0.16em / uppercase.

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
  before the provider's. Use a native `scroll` listener (Lenis scrolls the
  window).
- Entrance animations gate on `useUi(state => state.entered)`, which the
  preloader sets. Without that gate they play behind the curtain.
- **Anything that paints itself holds the loader until it has.** A canvas
  drawing its first frame, or a layout that switches mode once the script runs,
  calls `holdLoader()` (`src/lib/ready.ts`) as it mounts and releases it once
  painted; the preloader and the page-turn curtain both wait. A reload of the
  founder page used to show its chapters piled on top of each other before the
  book took them in hand.
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
  `pointermove`, so it corrects itself on the next movement.

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
npm run test:algorithms   # when solutions change: every language, every case
npm run test:traces       # when tracers change: every drawing reaches the answer
npm run build             # must produce out/
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
