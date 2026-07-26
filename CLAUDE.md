# Seventeen Studios — working notes

The studio's own site. Next.js 14 (App Router) + TypeScript, statically exported
and published to GitHub Pages. GSAP for choreography, Lenis for scroll, Three.js
for the hero field, zustand for the three pieces of global UI state.

`README.md` covers running it, deploying it, and the file layout. This file is
the set of rules to keep in mind when changing it.

---

## Non-negotiables

1. **The export must stay static.** No server components that need a runtime, no
   route handlers, no `next/image` optimisation, no middleware. Every route is
   prerendered into `out/`. Dynamic routes need `generateStaticParams`.
2. **Content is data, not markup.** All copy lives in `src/content/*.ts` typed by
   `src/content/types.ts`. Pages compose; they do not author. Adding an essay or
   a brief is one object in one file — indexes, the footer, the site index and
   the sitemap all follow automatically.
3. **Never let an animation be able to hide content permanently.** Hidden states
   are applied by JavaScript, never by CSS, so content is visible if the bundle
   fails or never runs.
4. **Reduced motion is an alternative expression, not an absence.** Check
   `prefersReducedMotion()` before starting anything; give the same information
   through a different mechanism. Vestibular offenders (parallax, pinning,
   large-scale movement) are removed outright.
5. **Honesty in the copy.** The concept briefs are speculative and labelled as
   such; every projected number is published with its measurement method. Do not
   introduce language implying delivered client work, and do not invent clients,
   testimonials or metrics.

---

## Design tokens

Defined once in `src/app/globals.css` as custom properties; mirrored in
`src/lib/tokens.ts` only for consumers that cannot read CSS (WebGL materials).

| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#07070a` | page |
| `--bg-raise` | `#0c0c11` | cards, panels |
| `--fg` | `#f4f1ea` | text |
| `--fg-dim` | `rgba(244,241,234,.62)` | body copy |
| `--muted` | `#79798a` | mono labels |
| `--line` | `rgba(244,241,234,.11)` | hairlines |
| `--accent` | `#d4ff3f` | one accent, used sparingly |

Type: **Syne** (display, 500–800), **DM Sans** (body, 300–500), **JetBrains
Mono** (labels, indices, metadata). All loaded via `next/font`, so the export
makes no third-party font requests.

Layout: `--gutter` for page padding, `--max` (1680px) for content width. Mono
labels are 11px / 0.16em / uppercase — that pairing is the site's signature and
should not drift.

---

## Animation rules

- Import `gsap` and `ScrollTrigger` from `@/lib/gsap` — never from the package
  directly; that module owns plugin registration.
- Wrap every timeline in `gsap.context(fn, scopeEl)` and `revert()` on unmount.
- **Watch for transform stacking.** If an element carries a CSS `transform`
  (the curtain columns and menu panels do, so they stay hidden without JS),
  GSAP resolves it into a pixel `x`/`y` that stacks under an `xPercent`/`yPercent`
  tween. Pass an explicit `y: 0` in the `from` vars. This has bitten us once.
- Anything that changes page height (an accordion, a filter) must call
  `ScrollTrigger.refresh()` afterwards or pinned sections below will mis-measure.
- Do not read `getLenis()` during a child's mount effect — child effects run
  before the provider's. Use `onLenis()` from `@/lib/lenis`, or a native
  `scroll` listener (Lenis scrolls the window).
- Entrance animations gate on `useUi(state => state.entered)`, which the
  preloader sets. Without that gate they play behind the curtain.

---

## Checks before committing

```bash
npm run typecheck
npm run build          # must produce out/ with every route
```

Then look at it in a browser at 1512px and 390px, with and without
`prefers-reduced-motion`. Screenshots catch layout regressions that types do
not — particularly the hero, which is sized so its longest word never wraps.

`design-reference/` holds the original static prototype this site was rebuilt
from. It is excluded from the build and is kept only for reference.
