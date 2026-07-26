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

/**
 * Hairline column grid, revealed with the `g` key. A small nod to the fact
 * that the layout is built on one — and a genuinely useful debugging aid.
 */
export function GridOverlay() {
  return (
    <div className="grid-overlay" aria-hidden="true">
      {Array.from({ length: 12 }).map((_, index) => (
        <span key={index} />
      ))}
    </div>
  );
}
