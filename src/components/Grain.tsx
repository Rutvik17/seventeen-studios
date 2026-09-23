/**
 * Film-grain overlay.
 *
 * A fixed div with an inline SVG turbulence data URI, tiled small and held at
 * very low opacity. Implemented as a static background rather than an animated
 * canvas so it costs nothing per frame.
 */
export function Grain() {
  return <div className="grain" aria-hidden="true" />;
}
