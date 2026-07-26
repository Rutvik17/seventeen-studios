/**
 * Design tokens.
 *
 * The CSS custom properties in `app/globals.css` are the source of truth for
 * anything rendered by the DOM. This module exists for the consumers that
 * cannot read CSS — the WebGL materials and the generative poster renderer.
 */

export const tokens = {
  bg: '#07070a',
  surface: '#0c0c11',
  fg: '#f4f1ea',
  muted: '#79798a',
  line: '#1c1c24',
  accent: '#d4ff3f',
  accentDeep: '#8fd400',
} as const;

/** Accent as a Three.js-compatible numeric hex. */
export const ACCENT_HEX = 0xd4ff3f;
export const BG_HEX = 0x07070a;

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
