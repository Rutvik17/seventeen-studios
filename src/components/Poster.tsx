/**
 * Generative poster.
 *
 * Server-rendered SVG built from a seed, so every brief and essay has its own
 * permanent piece of artwork with no image assets, no network requests and no
 * layout shift. Hover animation is pure CSS on the wrapper — see `.poster` in
 * globals.css — so this stays a server component.
 */

import { buildPoster, VIEW, type PosterFamily } from '@/lib/generative';

const TONE_CLASS = ['poster__ink--line', 'poster__ink--fg', 'poster__ink--accent'];

export function Poster({
  family,
  seed,
  className,
  label,
}: {
  family: PosterFamily;
  seed: number;
  className?: string;
  label?: string;
}) {
  const shapes = buildPoster(family, seed);

  return (
    <svg
      className={`poster ${className ?? ''}`.trim()}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid slice"
      role={label ? 'img' : 'presentation'}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {shapes.map((shape, index) => {
        const common = {
          className: `poster__ink ${TONE_CLASS[shape.tone]}`,
          style: { '--delay': `${(shape.offset * 0.6).toFixed(3)}s` } as React.CSSProperties,
          fill: shape.fill ? 'currentColor' : 'none',
          stroke: shape.fill ? 'none' : 'currentColor',
          strokeWidth: shape.width,
          strokeLinecap: 'round' as const,
          vectorEffect: 'non-scaling-stroke' as const,
        };

        switch (shape.kind) {
          case 'path':
            return <path key={index} d={shape.d} {...common} />;
          case 'circle':
            return (
              <circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} {...common} />
            );
          case 'rect':
            return (
              <rect
                key={index}
                x={shape.x}
                y={shape.y}
                width={shape.w}
                height={shape.h}
                {...common}
              />
            );
          case 'line':
            return (
              <line
                key={index}
                x1={shape.x1}
                y1={shape.y1}
                x2={shape.x2}
                y2={shape.y2}
                {...common}
              />
            );
          default:
            return null;
        }
      })}
    </svg>
  );
}
