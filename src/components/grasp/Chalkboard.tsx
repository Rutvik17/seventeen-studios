'use client';

/**
 * THE BOARD.
 *
 * Grasp's whole claim is that you understand calculus by watching it happen
 * rather than by being told it. A landing page that opens with three paragraphs
 * asking to be believed is that claim failing on its own front door — so this
 * page does not describe the product. It teaches the thing the product teaches,
 * on a green board, in chalk, as you scroll.
 *
 * Five acts, and the board is rubbed off between each: a function is a rule,
 * steepness is rise over run, close the gap, derive it properly, check it. By
 * the bottom the reader has watched `f'(x) = 2x` come out of first principles.
 * Then the demonstration below lets them drag it.
 *
 * ---
 *
 * TWO KINDS OF REVEAL, AND THEY ARE NOT THE SAME
 *
 * Handwriting is uncovered left to right by a clip rectangle — the way a line
 * arrives when a hand is moving across a board. Drawn geometry is revealed with
 * `stroke-dashoffset`, so a curve is genuinely traced from one end to the
 * other. Using one mechanism for both would make either the writing appear all
 * at once or the curve wipe in like a bar, and both read as animation rather
 * than as someone working.
 *
 * ---
 *
 * WHY NOT A DISPLACEMENT FILTER FOR THE CHALK
 *
 * The obvious way to get a chalk edge is `feTurbulence` into
 * `feDisplacementMap`. It looks right and it re-evaluates over the whole
 * 1600 x 900 board every frame that any clip rectangle moves — which, on a
 * scrubbed timeline, is every frame. The texture here is done with geometry
 * instead: every stroke is drawn twice, a soft wide pass under a tight bright
 * one, which gives the dusty edge for the cost of one more path and no filter
 * at all. The grain over the top is a single static rect.
 */

import { Fragment, useRef, useState, type ReactNode } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { ACTS, BOARD, type Act, type Ink } from '@/lib/grasp/board';
import styles from '@/components/grasp/Grasp.module.css';

/* ------------------------------------------------------------------ *
 * Handwritten maths
 * ------------------------------------------------------------------ */

/**
 * Turn `x^2` into a raised tspan.
 *
 * Handwriting faces carry thin coverage outside basic latin, and a missing
 * glyph does not fail loudly — the browser quietly substitutes a different font
 * for that one character, so `x²` arrives as a handwritten x followed by a
 * typeset 2. Composing the exponent out of ordinary digits sidesteps the whole
 * question and is closer to how the character is actually formed by hand.
 *
 * The `dy` has to be paid back. SVG `dy` is relative to the previous glyph, so
 * a raised tspan shifts everything after it up as well unless the next run
 * lowers itself by the same amount.
 */
function maths(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let run = '';
  let owed = 0;
  let key = 0;

  const flush = () => {
    if (!run) return;
    out.push(
      <tspan key={key++} dy={owed ? `${owed}em` : undefined}>
        {run}
      </tspan>,
    );
    owed = 0;
    run = '';
  };

  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '^' && i + 1 < text.length) {
      flush();
      out.push(
        <tspan key={key++} dy="-0.42em" fontSize="0.62em">
          {text[i + 1]}
        </tspan>,
      );
      owed = 0.42;
      i += 1;
      continue;
    }
    run += text[i];
  }
  flush();
  return out;
}

const inkClass = (ink: Ink = 'chalk'): string =>
  ink === 'accent' ? styles.accent : ink === 'dim' ? styles.dim : styles.chalk;

/* ------------------------------------------------------------------ *
 * One act's marks
 * ------------------------------------------------------------------ */

function ActMarks({ act, index }: { act: Act; index: number }) {
  return (
    <>
      {/* The line a teacher would say while writing the rest. */}
      <text
        className={`${styles.write} ${styles.dim}`}
        x={120}
        y={96}
        fontSize={34}
        data-caption
      >
        {act.caption}
      </text>

      {act.strokes.map((stroke, i) => (
        <Fragment key={`s${i}`}>
          {/*
            The dusty pass. Wider, faint, and drawn under the bright one — chalk
            sheds either side of the line it lays down, and this is that.
          */}
          <path
            className={`${styles.stroke} ${styles.dust} ${inkClass(stroke.ink)}`}
            d={stroke.d}
            strokeWidth={(stroke.width ?? 3) * 2.6}
            strokeDasharray={stroke.dashed ? '14 12' : undefined}
            data-stroke={`${index}-${i}`}
          />
          <path
            className={`${styles.stroke} ${inkClass(stroke.ink)}`}
            d={stroke.d}
            strokeWidth={stroke.width ?? 3}
            strokeDasharray={stroke.dashed ? '14 12' : undefined}
            data-stroke={`${index}-${i}`}
          />
        </Fragment>
      ))}

      {act.marks.map((mark, i) => (
        <g key={`m${i}`} data-mark={`${index}-${i}`}>
          <circle
            className={`${styles.point} ${inkClass(mark.ink)}`}
            cx={mark.cx}
            cy={mark.cy}
            r={9}
          />
          {mark.label ? (
            <text
              className={`${styles.write} ${inkClass(mark.ink)}`}
              x={mark.cx + 20}
              y={mark.cy - 16}
              fontSize={30}
            >
              {maths(mark.label)}
            </text>
          ) : null}
        </g>
      ))}

      {act.writes.map((write, i) => (
        <g key={`w${i}`} clipPath={`url(#pen-${index}-${i})`}>
          <text
            className={`${styles.write} ${inkClass(write.ink)}`}
            x={write.x}
            y={write.y}
            fontSize={write.size}
            textAnchor={write.anchor}
          >
            {maths(write.text)}
          </text>
        </g>
      ))}
    </>
  );
}

/**
 * The clip rectangles the writing is uncovered by, one per line.
 *
 * The rectangle has to START left of the glyphs, and where that is depends on
 * how the text is anchored: a `start` line grows rightwards from its x, but an
 * `end`-anchored axis number sits entirely to the LEFT of it. Anchoring the
 * clip at `write.x` for those would place the whole label outside its own clip
 * and it would never appear at all.
 */
const LEAD: Record<'start' | 'middle' | 'end', number> = {
  start: 12,
  middle: 300,
  end: 600,
};

function Pens({ act, index }: { act: Act; index: number }) {
  return (
    <>
      {act.writes.map((write, i) => (
        <clipPath key={i} id={`pen-${index}-${i}`}>
          <rect
            x={write.x - LEAD[write.anchor ?? 'start']}
            y={write.y - write.size * 1.15}
            width={BOARD.width}
            height={write.size * 1.8}
            data-pen={`${index}-${i}`}
          />
        </clipPath>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The board
 * ------------------------------------------------------------------ */

/** How much of each act's slice is writing; the rest is the rub-out. */
const WRITE_SHARE = 0.74;

export function Chalkboard() {
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion()) {
      // No pin and no scrub. The static branch below renders every act in full,
      // down the page — the same lesson, read rather than watched.
      setReduced(true);
      return;
    }

    const el = track.current;
    const stageEl = stage.current;
    if (!el || !stageEl) return;

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);

      /*
        Hidden states are set here and never in the stylesheet — studio rule 4.
        If this bundle never runs, the board arrives fully written instead of
        blank. It is a worse drawing and it is not a missing page.
      */
      q('[data-pen]').forEach((pen) => gsap.set(pen, { attr: { width: 0 } }));
      q('[data-mark]').forEach((mark) => gsap.set(mark, { opacity: 0 }));
      q('[data-caption]').forEach((c) => gsap.set(c, { opacity: 0 }));

      /*
        EVERY ACT STARTS SHUT, AND IS OPENED WHEN ITS TURN COMES.

        All five acts occupy the same board, stacked. The first version left
        every act's clip open from the start and relied on each individual mark
        to hide itself until its moment — which meant one item with a reveal
        state that did not take was enough to leak the next act onto this one,
        and act two's secant duly drew itself across act one.

        Gating at the act level makes that impossible rather than unlikely: what
        is not this act's turn is clipped to nothing, whatever its own marks
        think they are doing.
      */
      q('[data-act]').forEach((act, index) =>
        gsap.set(act, { attr: { x: 0, width: index === 0 ? BOARD.width : 0 } }),
      );

      /*
        Every drawn path is measured and then hidden by its own length, which is
        what makes `stroke-dashoffset` trace it rather than fade it. A dashed
        construction line already carries a dash array, so its offset is animated
        against a second, longer dash pattern applied here.
      */
      q('[data-stroke]').forEach((node) => {
        // `gsap.utils.selector` is typed for HTML; these are SVG paths.
        const path = node as unknown as SVGPathElement;
        const length = path.getTotalLength();
        path.dataset.length = String(length);
        /*
          THE OFFSET OVERSHOOTS THE LENGTH ON PURPOSE.

          At `strokeDashoffset: length` the visible run of the dash is exactly
          zero — which draws nothing, unless the line has round caps. It does:
          chalk has round caps. A zero-length segment with a round cap renders
          as a DOT, so every axis, curve and tangent on this board announced
          itself with a chalk full stop sitting at its start point long before
          it was drawn, and the graph was covered in them.

          Pushing the offset past the end of the dash pattern moves the whole
          run into the gap, where there is no cap to draw. The stroke width is
          the right amount to overshoot by, because that is how far a round cap
          extends beyond the point it is centred on.
        */
        /*
          `parseFloat`, not `Number`. `getComputedStyle` returns "10.4px", and
          `Number("10.4px")` is NaN — which fell through to the default of 4 and
          left the wide dusty pass (up to 13px) overshooting by less than half
          its own cap. A faint chalk dot survived at the start of every accent
          line, which is exactly the artefact this whole block exists to remove.
        */
        const width = parseFloat(getComputedStyle(path).strokeWidth) || 4;
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length + width,
        });
      });

      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.7,
          pin: stageEl,
          // The track's own height is the travel; letting GSAP add spacing too
          // would double it and leave a dead screen underneath.
          pinSpacing: false,
        },
      });

      ACTS.forEach((act, index) => {
        const base = index;

        /*
          Open this act's board. Instant, not eased: the previous act has just
          been swept off to the right and a fresh surface does not fade in.
          Act one is already open, so it is skipped — tweening it here would
          re-close it on the way back up.
        */
        if (index > 0) {
          timeline.set(
            q(`[data-act="${index}"]`),
            { attr: { x: 0, width: BOARD.width } },
            base,
          );
        }

        timeline.to(
          q(`[data-caption]`)[index],
          { opacity: 1, duration: 0.06 },
          base + 0.01,
        );

        act.writes.forEach((write, i) => {
          timeline.to(
            q(`[data-pen="${index}-${i}"]`),
            {
              attr: { width: BOARD.width },
              duration: 0.1,
              ease: 'none',
            },
            base + write.at * WRITE_SHARE,
          );
        });

        act.strokes.forEach((stroke, i) => {
          timeline.to(
            q(`[data-stroke="${index}-${i}"]`),
            { strokeDashoffset: 0, duration: 0.13, ease: 'power1.out' },
            base + stroke.at * WRITE_SHARE,
          );
        });

        act.marks.forEach((mark, i) => {
          timeline.fromTo(
            q(`[data-mark="${index}-${i}"]`),
            { opacity: 0, scale: 0.4, transformOrigin: `${mark.cx}px ${mark.cy}px` },
            { opacity: 1, scale: 1, duration: 0.08, ease: 'back.out(2.4)' },
            base + mark.at * WRITE_SHARE,
          );
        });

        /*
          The rub-out. The act's clip collapses to the right, which takes the
          writing off the board in the direction a hand sweeps — the last act
          is spared, because it is the answer and the page ends on it.
        */
        if (index < ACTS.length - 1) {
          timeline.to(
            q(`[data-act="${index}"]`),
            { attr: { x: BOARD.width, width: 0 }, duration: 0.16, ease: 'power2.in' },
            base + 0.82,
          );
        }
      });

      /*
        A beat at the end, and it is not padding.

        ScrollTrigger scrubs the pin across the timeline's whole duration, so
        without this the last mark of the last act lands on the same frame the
        board unpins and slides away. The reveal the entire page is built toward
        — that the slopes are themselves a curve — was on screen for no time at
        all. Half an act's worth of empty timeline holds the finished board
        still while the reader catches up with it.
      */
      timeline.to({}, { duration: 0.55 });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  /* ---- reduced motion: the same lesson, standing still ---- */
  if (reduced) {
    return (
      <div className={`${styles.track} ${styles.trackStatic}`}>
        {ACTS.map((act, index) => (
          <div className={styles.staticBoard} key={act.id}>
            <svg
              viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
              className={styles.svg}
              role="img"
              aria-label={act.caption}
            >
              <Grain />
              <Pens act={act} index={index} />
              <ActMarks act={act} index={index} />
            </svg>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className={styles.track} ref={track} aria-label="A calculus lesson, on a board">
      <div className={styles.stage} ref={stage}>
        <svg
          viewBox={`0 0 ${BOARD.width} ${BOARD.height}`}
          className={styles.svg}
          role="img"
          aria-label="A chalkboard deriving the derivative of x squared from first principles."
        >
          <defs>
            {ACTS.map((act, index) => (
              <Fragment key={act.id}>
                <clipPath id={`act-${index}`}>
                  <rect x={0} y={0} width={BOARD.width} height={BOARD.height} data-act={index} />
                </clipPath>
                <Pens act={act} index={index} />
              </Fragment>
            ))}
          </defs>

          <Grain />

          {ACTS.map((act, index) => (
            <g key={act.id} clipPath={`url(#act-${index})`}>
              <ActMarks act={act} index={index} />
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}

/**
 * The board's own surface.
 *
 * One static turbulence rect, multiplied over the green. It is what stops the
 * board reading as a flat rectangle of colour — a real slate is unevenly worn
 * and holds the ghost of everything ever written on it. Static, so it is
 * rasterised once and costs nothing on a scrubbed timeline.
 */
function Grain() {
  return (
    <>
      <defs>
        <filter id="slate" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="17" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
      </defs>
      <rect
        x={0}
        y={0}
        width={BOARD.width}
        height={BOARD.height}
        filter="url(#slate)"
        className={styles.grain}
      />
    </>
  );
}
