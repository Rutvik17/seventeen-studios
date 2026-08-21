'use client';

import { useRef } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { leaderAnchor, planeCurve, planeGrid, planePath } from '@/lib/axonometric';

/**
 * An exploded axonometric that separates while it is held on screen.
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
 * WHY IT IS PINNED, WHICH IT WAS NOT AT FIRST
 *
 * The first version scrubbed against the section's own travel through the
 * viewport, and the labels landed after the drawing had already left the
 * screen — reported as "reveals labels after the scrolling has passed". The
 * cause was structural rather than a matter of tuning the numbers: a range that
 * ends when the element's BOTTOM reaches the upper viewport has, by definition,
 * spent most of its scroll distance pushing the drawing out of view. Any
 * timeline mapped onto it finishes late, because the range itself finishes late.
 *
 * Pinning removes the conflict instead of trading against it. The stage holds
 * still at `top top` and the page scroll drives only the separation, so every
 * label appears while the drawing is stationary and wholly visible. The outer
 * element supplies the scroll distance through its own height, which is why
 * `pinSpacing` is off — GSAP would otherwise insert a second copy of it.
 *
 * ---
 *
 * WHY THE SVG IS CAPPED IN HEIGHT
 *
 * Five layers at full separation is a tall drawing: the viewBox works out
 * around 615 × 1008, so at any sensible column width it rendered past 1100px
 * and could not be seen whole on a laptop. `preserveAspectRatio` plus a
 * viewport-relative `max-height` lets it letterbox down to fit rather than
 * overflow — the stack stays legible and the callouts keep their column.
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
 * The layers are drawn ALREADY separated, with the labels already showing,
 * nothing scrubs, and nothing pins. The information the animation carries —
 * that these are layers, how many, and what each one is — arrives complete;
 * only the separating is dropped. §5 of the studio rules: an alternative
 * expression, not an absence. Scrubbed lifting is exactly the vestibular
 * offender that rule names, so it is removed rather than shortened.
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
const SIZE = 160;
/** How far apart the layers stand when fully separated. */
const SEPARATION = 118;
/** Rulings across each plane. Matches the page grid's five-to-one feel. */
const DIVISIONS = 10;
/** Horizontal room reserved for the callout column. */
const CALLOUT_COLUMN = 330;

export function Exploded({ layers, caption, className }: ExplodedProps) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);

  /**
   * The viewBox has to hold the stack at FULL separation, not at rest.
   *
   * Sizing it to the collapsed drawing and letting the layers grow past it is
   * the obvious mistake: SVG does not reflow, so the top layer simply leaves
   * the frame. Computed from the layer count so adding a sixth cannot silently
   * crop the fifth.
   */
  const spread = SEPARATION * (layers.length - 1);
  const halfHeight = SIZE + spread * 0.5 + 76;
  const viewBox = [
    -SIZE * 1.05 - 36,
    -halfHeight,
    SIZE * 2.1 + CALLOUT_COLUMN,
    halfHeight * 2,
  ].join(' ');

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    if (!el || !stageEl) return;

    const ctx = gsap.context(() => {
      const planes = gsap.utils.toArray<SVGGElement>('[data-layer]');
      const callouts = gsap.utils.toArray<SVGGElement>('[data-callout]');

      if (prefersReducedMotion()) {
        // Already apart, already labelled. Nothing to scrub, nothing to pin.
        el.dataset.static = 'true';
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
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7,
          pin: stageEl,
          // The outer element already reserves the scroll distance with its own
          // height. Letting GSAP add spacing too would double it and leave a
          // viewport of dead space under the drawing.
          pinSpacing: false,
          anticipatePin: 1,
        },
      });

      /*
        Each layer gets its own slice of the timeline, and its callout lands at
        roughly two thirds of that slice — while the layer is still visibly
        moving, so the label reads as belonging to the thing that just arrived.

        The last callout finishes near 0.80 of the scrub rather than at 1.0.
        That tail is deliberate: it leaves the completed drawing held and
        readable for a beat before the pin releases, which is the moment the
        diagram is actually doing its job.
      */
      const slice = 0.5;
      const step = 0.08;

      planes.forEach((plane, i) => {
        tl.to(
          plane,
          { y: -restingLift(i, layers.length), ease: 'power2.out', duration: slice },
          i * step,
        );
      });

      callouts.forEach((callout, i) => {
        tl.to(
          callout,
          { opacity: 1, ease: 'none', duration: 0.14 },
          i * step + slice * 0.68,
        );
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, [layers.length]);

  return (
    <div className={`exploded${className ? ` ${className}` : ''}`} ref={root}>
      <div className="exploded__stage" ref={stage}>
        {caption && <p className="exploded__caption">{caption}</p>}

        <svg
          className="exploded__svg"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
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
                    d={`M ${anchor.x} ${anchor.y} L ${anchor.x + 48} ${anchor.y - 24} L ${anchor.x + 74} ${anchor.y - 24}`}
                  />
                  <circle
                    className="exploded__node"
                    cx={anchor.x}
                    cy={anchor.y}
                    r={3}
                  />
                  <text
                    className="exploded__index"
                    x={anchor.x + 82}
                    y={anchor.y - 30}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </text>
                  <text
                    className="exploded__label"
                    x={anchor.x + 82}
                    y={anchor.y - 12}
                  >
                    {layer.label}
                  </text>
                  <text
                    className="exploded__note"
                    x={anchor.x + 82}
                    y={anchor.y + 7}
                  >
                    {layer.note}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
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
