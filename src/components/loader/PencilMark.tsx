'use client';

/**
 * The 17, drawn by a pencil as the page loads.
 *
 * Progress is how much of the mark has been drawn: the outline of the 1, then
 * the outline of the 7, traced by a pencil point that follows the path, and at
 * the end the numeral is hatched in. It is the sketchbook's first line — the
 * same pencil the cursor is, drawing the same mark the header carries.
 *
 * It replaced a WebGL water simulation filling the mark. That was a lovely
 * shader and it belonged to a different site: this one is paper, and on paper
 * things are drawn, not poured.
 *
 * Pure SVG. The drawing is `stroke-dashoffset` against `pathLength="1"`, and
 * the pencil's position is `getPointAtLength` on the same path, so the point
 * and the line cannot disagree.
 */

import { useEffect, useRef } from 'react';
import { LOGO_ONE, LOGO_SEVEN, LOGO_VIEWBOX } from '@/components/Logo';

const PATHS = [LOGO_ONE, LOGO_SEVEN];

export function PencilMark({ progress }: { progress: number }) {
  const lines = useRef<(SVGPathElement | null)[]>([]);
  const tip = useRef<SVGGElement>(null);
  const p = Math.max(0, Math.min(1, progress / 100));

  // Each numeral takes half of the progress; the hatching arrives at the end.
  const drawn = PATHS.map((_, i) => Math.max(0, Math.min(1, p * 2 - i)));
  const hatch = Math.max(0, Math.min(1, (p - 0.82) / 0.18));

  useEffect(() => {
    const g = tip.current;
    if (!g) return;
    const i = drawn[1] > 0 ? 1 : 0;
    const path = lines.current[i];
    if (!path || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * drawn[i]);
    g.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    g.style.opacity = p >= 1 ? '0' : '1';
  });

  return (
    <div className="pencil-mark" aria-hidden="true">
      <svg viewBox={LOGO_VIEWBOX} className="pencil-mark__svg" overflow="visible">
        <defs>
          <pattern id="pencil-hatch" width="1.6" height="1.6" patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <line x1="0" y1="0" x2="0" y2="1.6" stroke="var(--fg)" strokeWidth="0.55" />
          </pattern>
        </defs>

        {/* The hatching, once the outline is closed. */}
        {PATHS.map((d) => (
          <path key={`h${d}`} d={d} fill="url(#pencil-hatch)" style={{ opacity: hatch * 0.85 }} />
        ))}

        {/* Two passes of the outline: a firm one and a lighter one a hair off. */}
        {PATHS.map((d, i) => (
          <path
            key={`a${d}`}
            ref={(el) => {
              lines.current[i] = el;
            }}
            d={d}
            pathLength={1}
            className="pencil-mark__line"
            style={{ strokeDasharray: 1, strokeDashoffset: 1 - drawn[i] }}
          />
        ))}
        {PATHS.map((d, i) => (
          <path
            key={`b${d}`}
            d={d}
            pathLength={1}
            transform="translate(0.18 -0.14)"
            className="pencil-mark__line pencil-mark__line--light"
            style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, drawn[i] - 0.04) }}
          />
        ))}

        {/* The pencil: point on the line, body up and to the right. */}
        <g ref={tip} className="pencil-mark__tip">
          <g transform="rotate(-45) scale(0.16)">
            <path d="M0 0 L5 -2.4 L5 2.4 Z" fill="var(--fg)" />
            <path d="M5 -2.4 L14 -5.5 L14 5.5 L5 2.4 Z" fill="#e6c89a" stroke="var(--fg)" strokeWidth="0.9" />
            <rect x="14" y="-5.5" width="30" height="11" fill="var(--accent)" stroke="var(--fg)" strokeWidth="0.9" />
            <rect x="44" y="-5.5" width="5" height="11" fill="#b9b3a2" stroke="var(--fg)" strokeWidth="0.9" />
            <rect x="49" y="-5.5" width="6" height="11" rx="2" fill="var(--accent-2)" stroke="var(--fg)" strokeWidth="0.9" />
          </g>
        </g>
      </svg>
    </div>
  );
}
