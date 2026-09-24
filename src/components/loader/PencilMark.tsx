'use client';

/**
 * The 17, painted as the page loads.
 *
 * Progress is how much of the mark has been painted: the 1, then the 7, each
 * stroke laid along its length in ultramarine by a brush whose tip follows the
 * line, and gone over once more, lightly, just behind it — the paint building
 * up. It is the sketchbook's first mark: the mark the header carries, in the
 * paint the cover's title is written in.
 *
 * It replaced a crayon writing the 1 and the 7 in two colours, a pencil tracing
 * the mark's outline before that, and a WebGL water simulation before that.
 *
 * Pure SVG. The painting is `stroke-dashoffset` against `pathLength="1"`, and
 * the brush's position is `getPointAtLength` on the same path, so the tip and
 * the line cannot disagree. A stroke not yet begun is hidden outright: a dash
 * of no length still paints its round end, and the 17 used to wait under two
 * dots. The strokes carry the bristles' streaks (`--paint-bristle`); the brush
 * itself is drawn on a sheet over them.
 */

import { useEffect, useRef } from 'react';
import { LOGO_ONE, LOGO_SEVEN, LOGO_VIEWBOX, MARK_STROKE } from '@/components/Logo';

const PATHS = [LOGO_ONE, LOGO_SEVEN];
/** The paint: ultramarine, from the box. */
const PAINT = 'var(--paint-1)';

export function PencilMark({ progress }: { progress: number }) {
  const lines = useRef<(SVGPathElement | null)[]>([]);
  const tip = useRef<SVGGElement>(null);
  const p = Math.max(0, Math.min(1, progress / 100));

  // Each numeral takes half of the progress.
  const drawn = PATHS.map((_, i) => Math.max(0, Math.min(1, p * 2 - i)));
  const stroking = drawn[1] > 0 ? 1 : 0;

  useEffect(() => {
    const g = tip.current;
    if (!g) return;
    const path = lines.current[stroking];
    if (!path || typeof path.getTotalLength !== 'function') return;
    const len = path.getTotalLength();
    const pt = path.getPointAtLength(len * drawn[stroking]);
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
            stroke={PAINT}
            strokeWidth={MARK_STROKE}
            style={{ strokeDasharray: 1, strokeDashoffset: 1 - drawn[i], visibility: drawn[i] > 0 ? 'visible' : 'hidden' }}
          />
        ))}
        {PATHS.map((d, i) => (
          <path
            key={`b${d}`}
            d={d}
            pathLength={1}
            transform="translate(0.4 -0.35)"
            className="pencil-mark__line pencil-mark__line--light"
            stroke={PAINT}
            strokeWidth={MARK_STROKE * 0.45}
            style={{ strokeDasharray: 1, strokeDashoffset: 1 - Math.max(0, drawn[i] - 0.08), visibility: drawn[i] > 0.08 ? 'visible' : 'hidden' }}
          />
        ))}
      </svg>

      <svg viewBox={LOGO_VIEWBOX} className="pencil-mark__svg pencil-mark__hand" overflow="visible">
        {/* The brush: bristles on the line, the ferrule and the handle leaning up and to the right. */}
        <g ref={tip} className="pencil-mark__tip">
          <g transform="rotate(-50) scale(0.2)">
            <path d="M0 0 C2 -3.4 6 -4.6 9 -4.2 L9 4.2 C6 4.6 2 3.4 0 0 Z" fill={PAINT} stroke="var(--fg)" strokeWidth="0.8" />
            <rect x="9" y="-4.6" width="9" height="9.2" rx="1" fill="#c9c3b4" stroke="var(--fg)" strokeWidth="0.8" />
            <path d="M18 -4.2 L52 -2.6 C54 -2.4 54 2.4 52 2.6 L18 4.2 Z" fill="#b5462c" stroke="var(--fg)" strokeWidth="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
}
