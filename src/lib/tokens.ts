/**
 * Design tokens.
 *
 * The CSS custom properties in `app/globals.css` are the source of truth for
 * anything rendered by the DOM. This module exists for the consumers that
 * cannot read CSS — the WebGL materials and the generative poster renderer.
 */

export const tokens = {
  bg: '#faf9f5',
  surface: '#ffffff',
  fg: '#101319',
  muted: '#7c7f88',
  line: '#e4e1d9',
  accent: '#1b4fe0',
  accentDeep: '#12379c',
  /** The second pen. Grasp's copper, so the two look related. */
  accent2: '#b4622a',
} as const;

/**
 * Three.js-compatible numeric hexes.
 *
 * **These must be flipped WITH the CSS, and there is no mechanism that makes
 * them.** The stylesheet is the source of truth for everything the DOM paints;
 * WebGL cannot read a custom property, so this file is a hand-kept mirror. A
 * palette change that updates one and not the other leaves the hero field
 * painting the old theme over the new page — and it fails silently, because
 * both halves are internally consistent.
 */
export const ACCENT_HEX = 0x1b4fe0;
export const ACCENT_2_HEX = 0xb4622a;
export const BG_HEX = 0xfaf9f5;

export const easing = {
  /** Long, confident deceleration — the studio's default entrance. */
  out: 'power4.out',
  /** Shorter exits. */
  in: 'power3.in',
  /** Bidirectional, for scrubbed sequences. */
  inOut: 'power2.inOut',
} as const;

export const duration = {
  fast: 0.4,
  base: 0.8,
  slow: 1.2,
} as const;
