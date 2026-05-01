/**
 * Design tokens for Seventeen Studios.
 * Kept in sync with CSS custom properties defined in `src/app/globals.css`.
 *
 * Prefer the CSS variables in stylesheets; import this module only when a
 * JS/TS consumer (e.g. a Three.js material) needs the raw value.
 */

export const tokens = {
  bg: '#09090b',
  fg: '#f0ede8',
  muted: '#4a4a52',
  border: '#1e1e24',
  accent: '#b8f53d',
} as const;

export type DesignToken = keyof typeof tokens;

/** Accent color as a Three.js-compatible numeric hex (0xRRGGBB). */
export const ACCENT_HEX_NUMERIC = 0xb8f53d;
