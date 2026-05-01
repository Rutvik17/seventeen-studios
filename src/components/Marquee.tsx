/**
 * Infinite marquee strip of discipline names.
 *
 * The track is duplicated so the CSS `@keyframes marquee` can translate it
 * -50% — by the time the first copy has scrolled off, the second is in
 * position and the loop appears seamless.
 */

const ITEMS = [
  'Software Engineering',
  'Creative Engineering',
  'AI Architecture',
  'Generative Systems',
  'Interactive Experiences',
  'WebGL & Three.js',
  'ML Engineering',
  'Product Development',
];

function Item({ label }: { label: string }) {
  return (
    <div className="marquee-item">
      <span className="dot" />
      {label}
    </div>
  );
}

export function Marquee() {
  // Render twice for the infinite-loop illusion.
  return (
    <div className="marquee-section" aria-hidden="true">
      <div className="marquee-track">
        {ITEMS.map((label, i) => (
          <Item key={`a-${i}`} label={label} />
        ))}
        {ITEMS.map((label, i) => (
          <Item key={`b-${i}`} label={label} />
        ))}
      </div>
    </div>
  );
}
