'use client';

/**
 * The 17, written in crayon as the page loads.
 *
 * Progress is how much of the mark has been written: the 1 in the blue, then
 * the 7 in the marigold, each stroke drawn along its length by a crayon of its
 * colour whose point follows the line, and gone over once more, lightly, just
 * behind it — the wax building up. It is the sketchbook's first mark: the
 * mark the header carries, in the two crayons the cover's title is written in.
 *
 * It replaced a pencil tracing the mark's outline and hatching it in, and
 * before that a WebGL water simulation filling it. The site is written by hand
 * now, and on paper a number is written, not outlined.
 *
 * Pure SVG. The writing is `stroke-dashoffset` against `pathLength="1"`, and
 * the crayon's position is `getPointAtLength` on the same path, so the point
 * and the line cannot disagree. The strokes carry the paper's tooth
 * (`--crayon-tooth`); the crayon itself is drawn on a sheet over them, so the
 * tooth does not show through it.
 */

import { useEffect, useRef } from 'react';
import { LOGO_ONE, LOGO_SEVEN, LOGO_VIEWBOX, MARK_STROKE } from '@/components/Logo';

const PATHS = [LOGO_ONE, LOGO_SEVEN];
/** Each numeral's crayon, from the box. */
const CRAYONS = ['var(--crayon-1)', 'var(--crayon-2)'];

export function PencilMark({ progress }: { progress: number }) {
  const lines = useRef<(SVGPathElement | null)[]>([]);
  const tip = useRef<SVGGElement>(null);
  const p = Math.max(0, Math.min(1, progress / 100));

  // Each numeral takes half of the progress.
  const drawn = PATHS.map((_, i) => Math.max(0, Math.min(1, p * 2 - i)));
  const writing = drawn[1] > 0 ? 1 : 0;

  useEffect(() => {
    const g = tip.current;
    if (!g) return;
    const path = lines.current[writing];
    if (!path || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * drawn[writing]);
    g.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    g.style.opacity = p >= 1 ? '0' : '1';
  });

  return (
    <div className="pencil-mark" aria-hidden="true">
      <svg viewBox={LOGO_VIEWBOX} className="pencil-mark__svg pencil-mark__wax" overflow="visible">
        {/* The stroke, and the lighter pass going over it a moment behind. */}
        {PATHS.map((d, i) => (
          <path
            key={`a${d}`}
            ref={(el) => {
              lines.current[i] = el;
            }}
            d={d}
            pathLength={1}
            className="pencil-mark__line"
            stroke={CRAYONS[i]}
            strokeWidth={MARK_STROKE}
            style={{ strokeDasharray: 1, strokeDashoffset: 1 - drawn[i] }}
          />
        ))}
        {PATHS.map((d, i) => (
          <path
            key={`b${d}`}
            d={d}
            pathLength={1}
            transform="translate(0.4 -0.35)"
            className="pencil-mark__line pencil-mark__line--light"
            stroke={CRAYONS[i]}
            strokeWidth={MARK_STROKE * 0.45}
            style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, drawn[i] - 0.08) }}
          />
        ))}
      </svg>

      <svg viewBox={LOGO_VIEWBOX} className="pencil-mark__svg pencil-mark__hand" overflow="visible">
        {/* The crayon: point on the line, wrapped in its paper, leaning up and to the right. */}
        <g ref={tip} className="pencil-mark__tip">
          <g transform="rotate(-50) scale(0.2)" style={{ color: CRAYONS[writing] }}>
            <path d="M0 0 L7 -3.6 L7 3.6 Z" fill="currentColor" stroke="var(--fg)" strokeWidth="0.8" />
            <rect x="7" y="-4.4" width="40" height="8.8" rx="1.4" fill="currentColor" stroke="var(--fg)" strokeWidth="0.8" />
            <rect x="15" y="-4.7" width="24" height="9.4" fill="var(--bg-raise)" stroke="var(--fg)" strokeWidth="0.7" />
            <path d="M18 -4.7 V4.7 M36 -4.7 V4.7" stroke="currentColor" strokeWidth="1.4" />
          </g>
        </g>
      </svg>
    </div>
  );
}
