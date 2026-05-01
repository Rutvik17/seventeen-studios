# Seventeen Studios — Developer Handoff

> **This folder is a design handoff package.** The HTML files inside are high-fidelity design references created as prototypes — not production code to copy directly. Your task is to **recreate these designs from scratch** in a Next.js 14 + TypeScript codebase using GSAP, Three.js, and Lenis, following the architecture and implementation guidance below.

---

## Project overview

**Client:** Seventeen Studios  
**Type:** Creative agency marketing website  
**Fidelity:** High-fidelity — pixel-perfect implementation expected  
**Stack:** Next.js 14 (App Router), TypeScript, GSAP 3, Three.js r134+, Lenis smooth scroll, Tailwind CSS (optional — design tokens listed below)

---

## Design tokens

### Colors
```ts
export const tokens = {
  bg:      '#09090b',   // near-black background
  fg:      '#f0ede8',   // warm off-white foreground
  muted:   '#4a4a52',   // secondary text
  border:  '#1e1e24',   // subtle dividers
  accent:  '#b8f53d',   // acid-lime primary accent
}
```

### Typography
| Role | Family | Weight | Notes |
|------|--------|--------|-------|
| Display / headings | Syne | 700, 800, 900 | Google Fonts |
| Body / UI | DM Sans | 300, 400, 500 | Google Fonts |

### Spacing scale
Base unit: 8px. Key values: 12, 20, 24, 28, 32, 40, 48, 60, 72, 80, 100, 120, 140, 160px.

### Border radius
- Cards: 4px  
- Pills / tags: 100px (fully rounded)  
- Modals: 8px

### Letter spacing
- Display headings: -0.04em  
- Hero title: -5.92px (fixed, not relative)  
- All-caps labels: 0.12–0.18em  
- Body: default

---

## Sections (in order)

### 1. Nav
- Fixed, full-width, z-index 100
- Logo left: "SEVENTEEN." — period in accent color
- Center: links (Services, Work, Approach, Contact) — 13px, uppercase, 0.1em tracking, 0.45 opacity, hover → 1.0
- Right: "Start a project" CTA — pill border button, hover fills with accent
- Gradient fade-to-transparent beneath (not a solid bar)
- GSAP entrance: fade + translateY(-30px) on load

### 2. Hero
- Full 100vh
- Three.js WebGL canvas fills the full section (see Three.js spec below)
- Background: large "17" text, near-invisible stroke only (-webkit-text-stroke: 1px rgba(240,237,232,0.03))
- H1: "Seventeen" / "Studios" on two separate lines
  - font-size: clamp(56px, 9.5vw, 148px), letter-spacing: -5.92px, text-align: left
  - Each line is a clip container (overflow:hidden). Characters split and animated individually on load
  - GSAP: each char animates from y:'110%' opacity:0, stagger 0.04, ease power4.out
- Below title: left = subtitle paragraph, right = status badges (pill shaped, border-only)
- Subtitle: "A new kind of engineering studio…" — 300 weight, 0.55 opacity
- Scroll hint: centered at bottom, animated line

### 3. Marquee
- Infinite horizontal scroll, 22s duration, pauses on hover
- Items: "Software Engineering", "Creative Engineering", "AI Architecture", etc.
- Each item preceded by a 6px accent-color dot
- font: Syne 700, uppercase, 0.12em tracking, 0.25 opacity

### 4. Manifesto (#manifesto)
- 2-column grid (1fr 2fr), 120px vertical padding
- Left: section label ("Who we are")
- Right: large statement text (Syne 800, clamp 28–52px) with `<em>` in accent color + body paragraph

### 5. Services (#services)
- 3-column grid of cards separated by 1px borders
- Each card: number, title, body, tags (pills), arrow button (bottom right, rotated -45deg, rotates to 0 on hover)
- Card hover: full-height accent color fill sweeps up from bottom (scaleY transform)
- Arrow button opens a modal with service detail (see Modal spec)

### 6. Capabilities (#capabilities)
- 4-column grid, 8 items
- Each item: bold title + short description
- Grid separated by 1px borders (achieved by 1px gap + border on container)

### 7. Work / Concept Cases (#work)
- Horizontally pinned scroll section (100vh pinned)
- GSAP ScrollTrigger pins the section and translates the track horizontally
- 5 equal-size cards: width clamp(360px, 28vw, 440px), height clamp(460px, 58vh, 580px)
- Each card: placeholder image area (58% height), accent top-bar reveal on hover, body with tag/year/title/desc, "Explore brief →" CTA (fades in on hover)
- Card hover: 3D tilt via rotateY/rotateX based on mouse position
- Click opens case study modal

### 8. Approach (#approach)
- 2-column sticky layout: left column sticky (approach headline + body), right column scrolls (step list)
- 4 numbered steps, each in a row with border-bottom

### 9. Philosophy (#philosophy)
- Centered, full-width
- Large quote: "We don't ship features. We ship conviction." — Syne 900, clamp 32–84px
- Word-reveal animation on scroll (each word clips up from below)
- `<em>` "conviction." in accent color

### 10. Contact (#contact)
- 2-column: left = headline + CTA button, right = info rows
- Headline: "Let's build something great." with "great." in accent
- CTA: filled accent pill button, hover lightens + gap increases
- Info rows: label left, value right, border-bottom per row
- Footer: copyright left, tagline center, social links right

---

## Three.js WebGL Spec (Hero Canvas)

```
Scene: transparent background
Camera: PerspectiveCamera, fov 60, z = 22

Particles: 160 points
- Random positions within ±16x, ±10y, ±5z bounds
- Each particle has vx/vy/vz velocity, bounces at bounds
- Rendered as THREE.Points, size 0.12, color #b8f53d, opacity 0.85

Connections: LineSegments
- For every pair within distance 5.5, draw a line
- Color #b8f53d, opacity 0.12
- Pre-allocated buffer (N*N segments), use setDrawRange each frame

Mouse parallax:
- Track mouse as normalized -1 to +1
- Lerp camera.position.x/y toward mouse offset (factor 0.04)

Resize: update camera.aspect + renderer.setSize on window resize
```

---

## GSAP Animation Spec

### Load sequence (timeline)
```
delay: 0.2s
1. nav: from y:-30, opacity:0, duration:0.8, ease:power3.out
2. hero line 1 chars: from y:'110%', opacity:0, duration:1.1, stagger:0.04, ease:power4.out  (offset -0.3)
3. hero line 2 chars: same, offset -0.85 (overlaps with line 1)
4. hero-sub: from y:30, opacity:0, duration:0.9, ease:power3.out  (offset -0.5)
5. hero-meta/badges: from y:20, opacity:0, duration:0.8  (offset -0.6)
6. scroll-hint: opacity:0, duration:1
```

### Scroll reveals
- `.reveal-up`: y:50→0, opacity:0→1, 1s, power3.out, start:'top 88%'
- `.reveal-stagger`: children stagger 0.1s, y:50→0
- `.reveal-words`: split text into word spans inside overflow:hidden wrapper, animate y:'105%'→0, stagger 0.07

### Horizontal scroll
```
gsap.to(workTrack, {
  x: -totalScrollWidth,
  ease: 'none',
  scrollTrigger: {
    trigger: '.work-section',
    start: 'top top',
    end: () => `+=${totalScrollWidth + window.innerWidth * 0.5}`,
    scrub: 1.2,
    pin: true,
    anticipatePin: 1,
    invalidateOnRefresh: true,
  }
})
```

### Magnetic buttons
```
// on mousemove: translate by 30% of cursor offset from center
// on mouseleave: elastic.out(1, 0.4) snap back
```

### Card 3D tilt
```
// on mousemove inside card:
rotateY: (relativeX - 0.5) * 10deg
rotateX: -(relativeY - 0.5) * 6deg
// on mouseleave: elastic.out(1, 0.5) to 0
```

### Letter scramble
On mouseenter of [data-scramble] elements: iterate through characters, randomly replacing un-revealed chars with alphanumerics until the original string is fully revealed (iter += 1/2.5 per 30ms tick).

---

## Modal system

8 modals total: 3 service modals + 5 case study modals.

**Trigger:**
- Service arrow buttons: `data-modal="svc-software"` etc.
- Work cards: `data-modal="cs-pulse"` etc.

**Behaviour:**
- Overlay: rgba(9,9,11,0.92) + backdrop-filter blur(12px)
- Modal box: slides up from translateY(32px) scale(0.97) → neutral
- Scroll locked on body while open (lenis.stop())
- Close: X button, click backdrop, Escape key
- Scroll to top of modal box on open

**Modal anatomy:** sticky header (tag + title + close), scrollable body with: hero image placeholder, sections with label + paragraph, metrics grid (3-up), tech stack tags.

---

## Custom cursor

Two DOM elements: `.cursor-dot` (6px, accent-filled) and `.cursor-ring` (36px, semi-transparent border).
- Dot: follows mouse exactly (transform updated every frame)
- Ring: lerps toward mouse at factor 0.12
- On hoverable elements: ring expands to 56px, border turns accent, slight bg fill
- Set `cursor: none` on body

---

## Lenis smooth scroll

```ts
const lenis = new Lenis({ lerp: 0.08, smoothWheel: true })
gsap.ticker.add((t) => lenis.raf(t * 1000))
gsap.ticker.lagSmoothing(0)
```

---

## Noise texture overlay

Fixed, full-screen pseudo-element on `body::after`. SVG feTurbulence filter rendered as a background-image, tiled at 200px×200px, opacity ~0.032. Pointer-events: none, z-index 9998.

---

## Suggested Next.js file structure

```
src/
  app/
    layout.tsx          # fonts, metadata, cursor mount
    page.tsx            # section composition
  components/
    Nav.tsx
    Hero.tsx            # mounts Three.js canvas
    Marquee.tsx
    Manifesto.tsx
    Services.tsx
    ServiceCard.tsx
    Capabilities.tsx
    Work.tsx            # horizontal scroll
    WorkCard.tsx
    Approach.tsx
    Philosophy.tsx
    Contact.tsx
    Footer.tsx
    Modal.tsx           # generic modal shell
    ServiceModal.tsx
    CaseStudyModal.tsx
    Cursor.tsx
    Tweaks.tsx          # design tweak panel
  lib/
    three-scene.ts      # WebGL particle system
    gsap-animations.ts  # all GSAP timelines
    lenis.ts            # smooth scroll singleton
    modal-store.ts      # zustand or context for modal state
    tokens.ts           # design tokens
  hooks/
    useModal.ts
    useMagnet.ts
    useSplitText.ts
    useHorizontalScroll.ts
```

---

## Implementation notes for Claude Code

1. **Three.js in Next.js**: mount the canvas in a `useEffect` inside the Hero component. Return a cleanup function that disposes the renderer, geometry, and materials. Use `typeof window !== 'undefined'` guards.

2. **GSAP + ScrollTrigger in Next.js**: register plugin once at module level. Use `useIsomorphicLayoutEffect` for GSAP context. Wrap all ScrollTrigger instances in a `gsap.context()` and revert on unmount.

3. **Lenis + GSAP ticker**: initialise Lenis in a layout-level effect, expose via context so components can call `lenis.stop()` / `lenis.start()` for modals.

4. **Word split animation**: do not use innerHTML manipulation in SSR. Implement splitting client-side in a useEffect, with the unsplit text rendered server-side and invisible until JS runs.

5. **Horizontal scroll pin**: the work section must have an explicit height set (100vh). The inner track width must be measured after fonts and images load (`invalidateOnRefresh: true`).

6. **Fonts**: load Syne and DM Sans via `next/font/google` and apply as CSS variables.

7. **Performance**: lazy-load Three.js behind a dynamic import with `{ ssr: false }`. Reduce particle count on mobile (`window.innerWidth < 768 ? 80 : 160`).

8. **Noise texture**: implement as a fixed `<div>` with an SVG data-URI background, not as a canvas, to avoid compositing cost.

---

## Reference files

| File | Purpose |
|------|---------|
| `design-reference/index.html` | Full design reference — open in browser to see all sections, animations, and modals |
| `design-reference/site.js` | All GSAP animations, cursor, modal, scramble, and scroll logic |
| `design-reference/three-scene.js` | Three.js WebGL particle system |

Open `index.html` in a modern browser (Chrome / Firefox) to experience the full design before implementing.

---

*Handoff prepared by Seventeen Studios design system — April 2026*
