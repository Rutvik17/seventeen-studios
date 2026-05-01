/**
 * Film-grain noise layer.
 *
 * Rendered as a fixed DOM element with an SVG `feTurbulence` data-URI
 * background. Kept as a real DOM node (rather than a `::after` pseudo)
 * so the element can be explicitly ordered in the DOM tree and tweaked
 * at runtime if needed.
 */

export function NoiseOverlay() {
  return <div className="noise-overlay" aria-hidden="true" />;
}
