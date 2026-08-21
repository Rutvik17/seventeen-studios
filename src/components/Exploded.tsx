'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import {
  leaderAnchor,
  planeCurve,
  planeGrid,
  planePath,
} from '@/lib/axonometric';

/**
 * An exploded axonometric that separates on scroll.
 *
 * It begins as ONE drawing — every layer coincident, reading as a single
 * plotted plane — and comes apart as the section is scrolled, each layer
 * lifting to its own height and tagging itself with a leader line and a label.
 *
 * That order is the argument. A stack of labelled cards says "here is a list of
 * parts"; a drawing that separates in front of you says "this is one thing, and
 * these are the layers it was made from" — which is a claim about how the work
 * is built, made by the interface rather than by the copy.
 *
 * ---
 *
 * WHY SVG AND NOT WEBGL
 *
 * The projection is four multiplications per point (`lib/axonometric.ts`), so
 * the cost of a GPU context buys nothing. SVG in exchange gives resolution
 * independence at any zoom, real text in the labels — selectable, translatable,
 * and read correctly by a screen reader — and a diagram that renders on a
 * device with no WebGL at all. A technical drawing should be the most robust
 * thing on the page, not the most fragile.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * The layers are drawn ALREADY separated, with the labels already showing, and
 * nothing scrubs. The information the animation carries — that these are
 * layers, how many, and what each one is — arrives complete; only the
 * separating is dropped. §5 of the studio rules: an alternative expression, not
 * an absence. Scrubbed lifting is exactly the vestibular offender that rule
 * names, so it is removed rather than shortened.
 */

export type ExplodedLayer = {
  id: string;
  /** The name on the callout. */
  label: string;
  /** One line under it. Kept short — this is a drawing, not a paragraph. */
  note: string;
  /**
   * Samples in −1…1 plotted across this layer's plane.
   *
   * Optional: a layer with no curve is ruled ground with nothing on it yet,
   * which is a meaningful thing for the first layer of a stack to be.
   */
  curve?: readonly number[];
  /** Draw this layer's curve in the second pen. */
  alt?: boolean;
};

export type ExplodedProps = {
  layers: readonly ExplodedLayer[];
  /** Sits above the drawing, in the mono label voice. */
  caption?: string;
  className?: string;
};

/** Half-width of the shared footprint, in user units. */
const SIZE = 150;
/** How far apart the layers stand when fully separated. */
const SEPARATION = 132;
/** Rulings across each plane. Matches the page grid's five-to-one feel. */
const DIVISIONS = 10;

export function Exploded({ layers, caption, className }: ExplodedProps) {
  const root = useRef<HTMLDivElement>(null);

  /**
   * The viewBox has to hold the stack at FULL separation, not at rest.
   *
   * Sizing it to the collapsed drawing and letting the layers grow past it is
   * the obvious mistake: SVG does not reflow, so the top layer simply leaves
   * the frame. Computed from the layer count so adding a sixth cannot silently
   * crop the fifth.
   */
  const spread = SEPARATION * (layers.length - 1);
  const halfHeight = SIZE + spread * 0.5 + 90;
  const viewBox = `${-SIZE * 1.05 - 40} ${-halfHeight} ${SIZE * 2.1 + 300} ${halfHeight * 2}`;

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const planes = gsap.utils.toArray<SVGGElement>('[data-layer]');
      const callouts = gsap.utils.toArray<SVGGElement>('[data-callout]');

      if (prefersReducedMotion()) {
        // Already apart, already labelled. Nothing to scrub.
        planes.forEach((plane, i) => {
          gsap.set(plane, { y: -restingLift(i, layers.length) });
        });
        gsap.set(callouts, { opacity: 1 });
        return;
      }

      // Hidden state applied by JS, never CSS (§4): if the bundle never runs,
      // the drawing is present and readable — merely not separated.
      gsap.set(planes, { y: 0 });
      gsap.set(callouts, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top 78%',
          end: 'bottom 42%',
          scrub: 0.6,
        },
      });

      planes.forEach((plane, i) => {
        tl.to(
          plane,
          { y: -restingLift(i, layers.length), ease: 'none' },
          0
        );
      });

      // Callouts arrive AFTER their layer has travelled, staggered up the
      // stack, so the eye is led from the bottom rather than shown everything
      // at once.
      callouts.forEach((callout, i) => {
        tl.to(callout, { opacity: 1, ease: 'none', duration: 0.25 }, 0.35 + i * 0.1);
      });
    }, el);

    // The section changes height on nothing, but pinned sections elsewhere on
    // the page measure against it.
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [layers.length]);

  return (
    <div className={`exploded${className ? ` ${className}` : ''}`} ref={root}>
      {caption && <p className="exploded__caption">{caption}</p>}

      <svg
        className="exploded__svg"
        viewBox={viewBox}
        role="img"
        aria-label={`Exploded diagram: ${layers.map((l) => l.label).join(', ')}`}
      >
        {/*
          Painted bottom-up so a higher layer overlaps the one beneath it.
          SVG has no z-buffer — paint order IS depth — so reversing this list
          would have the bottom layer drawn over the top one and the stack
          would read inside out.
        */}
        {layers.map((layer, i) => {
          const lift = 0;
          const anchor = leaderAnchor(SIZE, lift);
          return (
            <g key={layer.id} data-layer className="exploded__layer">
              <path className="exploded__plane" d={planePath(SIZE, lift)} />
              <path
                className="exploded__grid"
                d={planeGrid(SIZE, lift, DIVISIONS)}
              />
              {layer.curve && (
                <path
                  className={`exploded__curve${layer.alt ? ' exploded__curve--alt' : ''}`}
                  d={planeCurve(SIZE, lift, layer.curve)}
                />
              )}

              <g data-callout className="exploded__callout">
                <path
                  className="exploded__leader"
                  d={`M ${anchor.x} ${anchor.y} L ${anchor.x + 54} ${anchor.y - 26}`}
                />
                <circle
                  className="exploded__node"
                  cx={anchor.x}
                  cy={anchor.y}
                  r={3}
                />
                <text
                  className="exploded__index"
                  x={anchor.x + 62}
                  y={anchor.y - 36}
                >
                  {String(i + 1).padStart(2, '0')}
                </text>
                <text
                  className="exploded__label"
                  x={anchor.x + 62}
                  y={anchor.y - 18}
                >
                  {layer.label}
                </text>
                <text
                  className="exploded__note"
                  x={anchor.x + 62}
                  y={anchor.y + 1}
                >
                  {layer.note}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * Where layer `i` comes to rest.
 *
 * Centred on the stack so the drawing does not drift up the frame as layers
 * are added — the middle layer stays put and the others move away from it in
 * both directions.
 */
function restingLift(i: number, count: number): number {
  return (i - (count - 1) / 2) * SEPARATION;
}
