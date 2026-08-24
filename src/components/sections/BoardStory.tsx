'use client';

/**
 * THE BOARD — the landing page.
 *
 * A two-layer PCB assembling itself as the page is scrolled, in five acts:
 * bare substrate, components placed, copper routed, power applied, and finally
 * an e-ink companion waking up on the end of a ribbon cable.
 *
 * It is the portfolio's thesis with almost no words in it. The device is one
 * Rutvik wants to build; the site builds it in front of you.
 *
 * ---
 *
 * WHY SVG AND NOT THREE.JS
 *
 * A PCB is a flat, hard-edged, dimensioned drawing — the exact thing SVG is
 * best at and the exact thing WebGL is worst at. In three.js this would need a
 * camera, a lighting rig and an extrusion pass to end up looking like a
 * screenshot of what SVG draws directly, and every trace would stop being
 * crisp. SVG also keeps the reference designators as real selectable text and
 * renders identically on a machine with no GPU.
 *
 * The earlier version of this page WAS a WebGL piece — a cloud of instanced
 * cubes — and it was abstract in a way that said nothing about the person whose
 * portfolio it is. A board says what he builds.
 *
 * ---
 *
 * EVERY NUMBER ON THIS PAGE IS COMPUTED
 *
 * Trace widths come out of IPC-2221A. The crystal's load capacitors come out of
 * the oscillator's load spec. Battery life is the duty-cycled average current
 * divided into the derated capacity. All of it is in `lib/board.ts` and all of
 * it is shown in the readout beside the drawing, because a portfolio for an
 * engineering role should be checkable by an engineer.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * The finished board, complete, with the display awake and every caption listed
 * at once. Nothing pins and nothing scrubs. The whole story is present as a
 * drawing; only the assembly is dropped.
 */

import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import {
  BOARD,
  COMPONENTS,
  NETS,
  averageCurrentMa,
  batteryDays,
  drawnWidthMm,
  formatFarads,
  formatOhms,
  loadCapPf,
  pathLength,
  peakCurrentMa,
  resistorBands,
  ribbon,
  routePath,
  toE12,
  traceWidthMm,
} from '@/lib/board';
import { EinkPanel } from '@/components/sections/EinkPanel';
import { PANEL as PANEL_MODULE } from '@/lib/pixel';
import { boardActs, hero } from '@/content/studio';
import { assetBySymbol, market, sigmasFor } from '@/content/market';

/*
  The drawing's frame: the board, plus room above it for the display.

  Sized from the module rather than chosen — the 4.01" ACeP is 91 x 60.4 mm
  overall, which is genuinely WIDER than the 88 mm board it drives. That is
  normal for e-ink (the driver board hides behind the panel) and the frame has to
  make room for it rather than the panel being trimmed to fit the drawing.
*/
const DISPLAY = {
  /*
    MILLIMETRES, not pixels — `moduleWidth`, never `width`.

    `PANEL.width` is 640 and `PANEL.moduleWidth` is 91, and this drawing is in
    millimetres. Reaching for the wrong one drew the display 640 mm across on an
    88 mm board: a grey rectangle wider than the entire scene, which is exactly
    what it looked like.

    The two units live on the same object because the panel genuinely has both —
    a pixel grid the firmware addresses and a physical size the enclosure has to
    fit. Nothing about the names says which is which, so `mm` is the prefix on
    every physical one.
  */
  w: PANEL_MODULE.moduleWidth,
  h: PANEL_MODULE.moduleHeight,
  x: BOARD.width / 2 - PANEL_MODULE.moduleWidth / 2,
  y: -76,
};

const VIEW = {
  x: -10,
  y: DISPLAY.y - 8,
  w: BOARD.width + 20,
  h: BOARD.height + Math.abs(DISPLAY.y) + 20,
};

/*
  What the display shows is REAL: the last adjusted close for NVDA and its move,
  fetched at build time by `scripts/fetch-market.mjs`. Yahoo sends no CORS
  headers, so a browser cannot make that call and it has to happen at build.

  The face is not decoration either — `expressionFor` is handed the move measured
  in units of NVDA's OWN daily volatility, so a 2% day on a 45%-vol name reads
  differently from a 2% day on a 30%-vol one. It is the same function the
  firmware would call.
*/
const NVDA = assetBySymbol('NVDA');
const NVDA_CHANGE = NVDA?.changeDay ?? 0;
const NVDA_SIGMAS = NVDA ? sigmasFor(NVDA, NVDA_CHANGE, market.tradingDays) : 0;
/*
  The face is driven by the sentiment model's reading, not by today's move — see
  `lib/face.ts`. 0.5 is the neutral fallback for the case where training failed
  and no model shipped, which must degrade to a blank expression rather than to
  a permanently alarmed one.
*/
const NVDA_PERCENTILE = NVDA?.sentiment?.percentile ?? 0.5;

/*
  The cable, built as a real flat-flex: a band with seven conductors running down
  it rather than one fat stroke, which read as a rope. See `ribbon()`.

  BOTH CONTROL POINTS SIT DIRECTLY ABOVE THEIR ENDPOINTS, and that is what makes
  the joins work. A ribbon of this construction is a band offset along the
  curve's NORMAL, so the band is perpendicular to the tangent at every point —
  including the two ends. Leaving each end vertically makes the band horizontal
  exactly where it meets a horizontal edge, which is the only way the two line up.

  The width matches J2's 5 mm body rather than exceeding it.
*/
const RIBBON = ribbon(
  [74, 20.2],                        // J2's top edge, on its centreline
  [74, 8],                           // straight up out of the connector
  [58, DISPLAY.y + DISPLAY.h + 12],  // then across
  [58, DISPLAY.y + DISPLAY.h],       // and vertically into the display's bottom edge
  4.6,
  7,
);

const AVERAGE_MA = averageCurrentMa();
const PEAK_MA = peakCurrentMa();
const BATTERY_MAH = 1200;

export function BoardStory() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const [act, setAct] = useState(0);
  const [reduced, setReduced] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    const stageEl = stage.current;
    if (!el || !stageEl) return;

    const low = prefersReducedMotion();
    setReduced(low);

    const ctx = gsap.context(() => {
      const q = gsap.utils.selector(el);

      if (low) {
        setAct(4);
        return;
      }

      /*
        Hidden states are set by JS, never in the stylesheet (studio rule 4).
        If the bundle never runs, the board is present and complete rather than
        an empty rectangle waiting for a script that failed.
      */
      gsap.set(q('[data-part]'), { opacity: 0, y: -14, scale: 0.9 });
      gsap.set(q('[data-trace]'), { drawSVG: undefined, opacity: 0 });
      gsap.set(q('[data-flow]'), { opacity: 0 });
      /*
        The panel does not travel. It used to start 26 units below its resting
        place — down over the board — and slide up, which read as the display
        emerging from inside the PCB. It is revealed in place instead, by a clip
        that grows from its bottom edge upward, so the end of the ribbon is
        attached from the first frame it is visible.
      */
      gsap.set('[data-display-clip] rect', { attr: { y: DISPLAY.y + DISPLAY.h, height: 0 } });
      /*
        The cable is revealed by a CLIP rectangle that grows UPWARD from the
        connector, so the ribbon unrolls out of J2 toward the display.

        It previously grew downward from the display's edge — which meant the
        cable appeared to extend from a panel that had not arrived yet, hanging
        in space with nothing at its far end. Plugged in at the board and
        reaching upward is the order the thing is actually assembled in.

        Growing upward in SVG needs BOTH `y` and `height` animated together: a
        rect's origin is its top edge, so raising the top while extending the
        height is the only way to keep the bottom pinned at the connector.
      */
      gsap.set('[data-ribbon-clip] rect', { attr: { y: 21, height: 0 } });

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: el,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.6,
          pin: stageEl,
          // The track reserves the scroll distance with its own height; letting
          // GSAP add spacing too would double it and leave dead space beneath.
          pinSpacing: false,
          onUpdate: (self) => {
            // Five acts across the scrub. Floor rather than round, so a caption
            // names the act that is currently running rather than the one it is
            // closest to finishing.
            setAct(Math.min(4, Math.floor(self.progress * 5)));
          },
        },
      });

      /* 01 — substrate */
      tl.from('[data-substrate]', { opacity: 0, duration: 0.5 }, 0)
        .from('[data-silk]', { opacity: 0, duration: 0.4 }, 0.15);

      /* 02 — placement, in assembly order */
      tl.to(
        q('[data-part]'),
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          ease: 'back.out(1.7)',
          stagger: 0.07,
        },
        0.7,
      );

      /* 03 — routing */
      tl.to(q('[data-trace]'), { opacity: 1, duration: 0.1, stagger: 0.04 }, 2.0).to(
        q('[data-trace]'),
        { strokeDashoffset: 0, duration: 0.7, ease: 'none', stagger: 0.04 },
        2.0,
      );

      /* 04 — power */
      tl.to('[data-flow]', { opacity: 1, duration: 0.4 }, 3.1)
        .to('[data-osc]', { opacity: 1, duration: 0.4 }, 3.3);

      /* 05 — the display wakes */
      tl.to(
        '[data-ribbon-clip] rect',
        // Bottom stays at y = 21 (the connector); the top rises to −10, which
        // clears the display's edge at −8.
        // Bottom stays at the connector; the top rises past the panel's lower
        // edge. Derived from DISPLAY so it cannot fall out of step again.
        {
          attr: {
            y: DISPLAY.y + DISPLAY.h - 3,
            height: 21 - (DISPLAY.y + DISPLAY.h - 3),
          },
          duration: 0.8,
          ease: 'power2.inOut',
        },
        3.85,
      )
        /*
          The panel begins only once the cable has ARRIVED, not while it is
          still travelling. The ribbon tween starts at 3.85 and runs 0.8, so it
          lands at 4.65 — anything earlier had the display appearing at the end
          of a cable that did not yet reach it.
        */
        .to(
          '[data-display-clip] rect',
          { attr: { y: DISPLAY.y, height: DISPLAY.h }, duration: 0.5, ease: 'power2.out' },
          4.65,
        )
        /*
          The panel fades rather than drawing pixel by pixel. A three-colour
          e-ink refresh does not sweep — it flashes the whole area black and
          white several times and then settles, which is not a thing worth
          reproducing on a landing page. A clean fade is the honest abstraction.
        */
        .from('[data-display]', { opacity: 0, duration: 0.28 }, 4.65);

      /*
        Current flow and the oscillator run on their own repeating tweens rather
        than on the scrubbed timeline. A scrubbed loop only advances while the
        wheel is moving, so the board would freeze the instant the reader stops
        — and a powered circuit that stops when you stop reading is the one
        thing on this page that would look broken.
      */
      gsap.to(q('[data-flow]'), {
        strokeDashoffset: -12,
        duration: 1.1,
        ease: 'none',
        repeat: -1,
      });
      gsap.to('[data-osc-wave]', {
        attr: { transform: 'translate(-8 0)' },
        duration: 0.9,
        ease: 'none',
        repeat: -1,
      });
    }, el);

    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  const current = boardActs[act] ?? boardActs[0];

  return (
    <section
      className="board-story"
      ref={root}
      id="top"
      data-static={reduced ? 'true' : undefined}
    >
      <div className="board-story__stage" ref={stage}>
        {/* ---- the wordmark, pinned to the frame ---- */}
        <h1 className="board-story__wordmark board-story__wordmark--top">
          {hero.wordmarkTop}
        </h1>
        <h2 className="board-story__wordmark board-story__wordmark--bottom">
          {hero.wordmarkBottom}
        </h2>
        <p className="board-story__eyebrow mono-label">{hero.eyebrow}</p>
        <p className="board-story__line">{hero.line}</p>

        <div className="board-story__canvas">
          <svg
            viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}
            className="board-story__svg"
            role="img"
            aria-label="A two-layer circuit board assembling itself: substrate, components, copper routing, power, and an e-ink display waking up."
          >
            <defs>
              <linearGradient id="fr4" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--pcb-soldermask-hi)" />
                <stop offset="100%" stopColor="var(--pcb-soldermask)" />
              </linearGradient>
              <linearGradient id="epaper" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f7f6f1" />
                <stop offset="100%" stopColor="#e6e4dc" />
              </linearGradient>
              {/* The waveform is two scope-widths long so it can translate by a
                  whole period and loop seamlessly — which means it MUST be
                  clipped, or it runs straight out across the board. */}
              <clipPath id="scope-clip">
                <rect x={45} y={5} width={16} height={5} rx={0.6} />
              </clipPath>
            </defs>

            {/* ---------- 01 substrate ---------- */}
            <g data-substrate>
              <rect
                x={0}
                y={0}
                width={BOARD.width}
                height={BOARD.height}
                rx={BOARD.radius}
                fill="url(#fr4)"
                stroke="var(--pcb-edge)"
                strokeWidth={0.3}
              />
              {/* Mounting holes — real ones, 2.2 mm for an M2 */}
              {[
                [4.5, 4.5],
                [BOARD.width - 4.5, 4.5],
                [4.5, BOARD.height - 4.5],
                [BOARD.width - 4.5, BOARD.height - 4.5],
              ].map(([cx, cy]) => (
                <g key={`${cx}-${cy}`}>
                  <circle cx={cx} cy={cy} r={1.1} fill="var(--pcb-hole)" />
                  <circle cx={cx} cy={cy} r={1.7} fill="none" stroke="var(--pcb-copper)" strokeWidth={0.5} />
                </g>
              ))}
            </g>

            <g data-silk>
              <text x={BOARD.width - 5} y={BOARD.height - 2.4} className="board-story__silk" textAnchor="end">
                SEVENTEEN STUDIOS
              </text>
              <text x={5} y={BOARD.height - 2.4} className="board-story__silk">
                COMPANION · REV A
              </text>
            </g>

            {/* ---------- 03 routing (under the parts, as copper is) ---------- */}
            <g data-layer="traces">
              {NETS.map((net) => {
                const d = routePath(net.points);
                const len = pathLength(net.points);
                const w = drawnWidthMm(net);
                return (
                  <g key={net.id}>
                    <path
                      data-trace
                      data-length={len.toFixed(2)}
                      d={d}
                      className={`board-story__trace board-story__trace--${net.kind}`}
                      strokeWidth={w}
                    />
                    {net.kind !== 'signal' && (
                      <path
                        data-flow
                        d={d}
                        className="board-story__flow"
                        strokeWidth={Math.max(0.12, w * 0.4)}
                        strokeDasharray="1.5 10.5"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* ---------- 02 components ---------- */}
            <g data-layer="parts">
              {COMPONENTS.map((c) => (
                <Part key={c.ref} c={c} />
              ))}
            </g>

            {/* ---------- 04 the oscillator ---------- */}
            <g data-osc>
              <rect x={45} y={5} width={16} height={5} rx={0.6} className="board-story__scope" />
              <g clipPath="url(#scope-clip)">
                <g data-osc-wave transform="translate(0 0)">
                  <path d={oscPath()} className="board-story__wave" />
                </g>
              </g>
              <text x={45} y={4} className="board-story__silk">32.768 kHz</text>
            </g>

            {/* ---------- 05 ribbon + display ---------- */}
            <g data-ribbon>
              {/* Grows upward from the panel's own bottom edge, so it is
                  uncovered where it sits rather than arriving from elsewhere. */}
              <clipPath id="display-clip" data-display-clip>
                <rect
                  x={DISPLAY.x - 2}
                  y={DISPLAY.y + DISPLAY.h}
                  width={DISPLAY.w + 4}
                  height={0}
                />
              </clipPath>
              <clipPath id="ribbon-clip" data-ribbon-clip>
                {/* Anchored at the connector and grown upward — see the note
                    on the timeline. Wide enough to clear the cable's full
                    horizontal travel from J2 across to the display. */}
                <rect x={50} y={21} width={34} height={0} />
              </clipPath>
              <g clipPath="url(#ribbon-clip)">
                <path d={RIBBON.outline} className="board-story__ribbon-body" />
                {RIBBON.conductors.map((d, i) => (
                  <path key={i} d={d} className="board-story__ribbon-wire" />
                ))}
              </g>
            </g>

            <g data-display clipPath="url(#display-clip)">
              <EinkPanel
                x={DISPLAY.x}
                y={DISPLAY.y}
                width={DISPLAY.w}
                height={DISPLAY.h}
                symbol={NVDA?.symbol ?? 'NVDA'}
                price={NVDA?.price ?? 0}
                changePercent={NVDA_CHANGE}
                sigmas={NVDA_SIGMAS}
                percentile={NVDA_PERCENTILE}
                asOf={NVDA?.asOf ?? ''}
                stamp={market.fetchedAt}
              />
            </g>
          </svg>
        </div>

        {!reduced && <ScrollCue />}

        {/* ---- the readout: what is being calculated, right now ---- */}
        <aside className="board-story__readout" aria-live="polite">
          {reduced ? (
            <ul className="board-story__acts">
              {boardActs.map((a) => (
                <li key={a.index}>
                  <span className="mono-label">{a.index}</span> {a.title} — {a.caption}
                </li>
              ))}
            </ul>
          ) : (
            <>
              <p className="mono-label board-story__act">
                <span>{current.index}</span> {current.title}
              </p>
              <p className="board-story__caption">{current.caption}</p>
              {/*
                Every act's working is rendered, and all but the current one is
                hidden. On a phone the readout sits UNDER the drawing in a single
                column, so its height is subtracted from the drawing's row — and
                the working block ranges from 192px on act 01 to 384px on act 05.
                Swapping one for another therefore moved the board up by ~96px
                mid-scroll and shrank it, until at act 05 it painted straight over
                both wordmarks.

                Stacking them in one grid cell makes the block as tall as the
                TALLEST act at every act, so nothing moves as the story runs, and
                the reserved height stays correct on its own if the copy changes —
                no measured constant to go stale.

                On desktop the readout is a side column that never sizes the
                drawing's row, and a permanently tall panel would stretch its
                border for no reason, so there the inactive slots are removed from
                layout entirely (see `.board-story__slot` in globals.css).
              */}
              <div className="board-story__working">
                {boardActs.map((a, index) => (
                  <div
                    className="board-story__slot"
                    key={a.index}
                    data-current={index === act ? '' : undefined}
                    aria-hidden={index === act ? undefined : true}
                  >
                    <Working act={index} />
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The scroll cue.
 *
 * A pinned landing has one real usability problem: the page does not move on
 * the first wheel notch — the board changes instead — so a visitor can conclude
 * the site is broken and leave. This says which way to go.
 *
 * It fades out on the first scroll and does not come back. A cue that keeps
 * telling you to do the thing you are already doing is nagging, and once the
 * board is visibly responding the instruction has been served.
 */
function ScrollCue() {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      /*
        Only the dismissal is scripted now. The arrow draws itself in CSS —
        see `.board-cue__arrow` in globals.css.
      */
      gsap.to(el, {
        autoAlpha: 0,
        duration: 0.4,
        scrollTrigger: { trigger: document.body, start: 'top -40', toggleActions: 'play none none reverse' },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  /*
    THE SAME ARROW THE GRASP BOARD DRAWS.

    This was a segment travelling down a hairline rail — a different mechanism
    saying the same thing in a different accent, on a site with exactly two
    scroll cues on it. They are one cue now: shaft, then head, then both fade,
    on a `stroke-dashoffset` loop.

    It keeps its POSITION, though. The arrow version of this cue was centred at
    the bottom of the frame once and sat on top of the STUDIOS wordmark, which
    is why it moved to the left edge in the first place. Same drawing, still out
    of the composition.
  */
  return (
    <div className="board-cue" ref={ref}>
      <span className="mono-label board-cue__label">Scroll to build it</span>
      <svg viewBox="0 0 28 72" className="board-cue__arrow" aria-hidden="true">
        <path className="board-cue__shaft" d="M14 6 V 54" />
        <path className="board-cue__head" d="M5 45 L 14 58 L 23 45" />
      </svg>
    </div>
  );
}

function Part({ c }: { c: (typeof COMPONENTS)[number] }) {
  const w = c.rot === 90 ? c.h : c.w;
  const h = c.rot === 90 ? c.w : c.h;
  const x = c.x - w / 2;
  const y = c.y - h / 2;
  const big = w * h > 12;

  return (
    <g data-part>
      {/* Pads first — copper under the body, the way a real footprint sits. */}
      <rect
        x={x - 0.5}
        y={y - 0.5}
        width={w + 1}
        height={h + 1}
        rx={0.2}
        className="board-story__pad"
      />
      <rect x={x} y={y} width={w} height={h} rx={big ? 0.5 : 0.12} className="board-story__body" />

      {c.polarised && <circle cx={x + 1.1} cy={y + 1.1} r={0.42} className="board-story__pin1" />}

      {/* Resistors carry bands that actually encode their value. */}
      {c.ohms !== undefined &&
        resistorBands(c.ohms).map((colour, i) => (
          <rect
            key={i}
            x={x + 0.16 + i * 0.18}
            y={y + 0.06}
            width={0.1}
            height={h - 0.12}
            fill={colour}
          />
        ))}

      {big && (
        <text x={c.x} y={c.y + 0.9} className="board-story__ref" textAnchor="middle">
          {c.ref}
        </text>
      )}
      {!big && (
        <text x={c.x} y={y - 0.5} className="board-story__ref-small" textAnchor="middle">
          {c.ref}
        </text>
      )}
      {/*
        `<desc>`, not `<title>`. React hoists any `<title>` element it renders to
        the document head as page metadata, so the SVG shipped with fourteen
        EMPTY title tags and no tooltip on anything. `<desc>` is not hoisted and
        is still read by assistive technology.
      */}
      <desc>
        {c.ref} — {c.part} ({c.package})
        {c.ohms !== undefined ? ` · ${formatOhms(c.ohms)}` : ''}
        {c.picofarads !== undefined ? ` · ${formatFarads(c.picofarads)}` : ''}
      </desc>
    </g>
  );
}

/**
 * The oscillator trace on the little scope.
 *
 * Drawn two scope-widths long and clipped, so translating it by exactly one
 * period loops without a seam. Four cycles across 32 mm makes one period 8 mm,
 * which is the same 8 mm the animation translates by — the two numbers have to
 * agree or the wave visibly jumps once per cycle.
 *
 * The frequency on screen is obviously not 32.768 kHz; nothing at that rate is
 * visible on a display. The label states the real figure and the drawing is a
 * slowed representation of it, which is the honest way round.
 */
function oscPath(): string {
  const pts: string[] = [];
  const SPAN = 32;
  const CYCLES = 4;
  for (let i = 0; i <= 128; i++) {
    const t = i / 128;
    const px = 45 + t * SPAN;
    const py = 7.5 + Math.sin(t * Math.PI * 2 * CYCLES) * 1.6;
    pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(2)} ${py.toFixed(2)}`);
  }
  return pts.join(' ');
}

/**
 * The working, act by act.
 *
 * This is the part that makes the drawing a portfolio piece rather than an
 * illustration: at every stage it shows the calculation that decided what is on
 * screen, in the same register Grasp uses. An engineer reading this page can
 * check it.
 */
function Working({ act }: { act: number }) {
  if (act === 2) {
    const w = traceWidthMm(0.5);
    return (
      <dl className="board-story__calc">
        <dt className="mono-label">IPC-2221A · 0.5 A, 10 °C rise, 1 oz external</dt>
        <dd>
          A = (I ÷ k·ΔT<sup>b</sup>)<sup>1/c</sup> = {(w / 0.0254 * 1.378).toFixed(2)} mil²
          <br />
          w = A ÷ (t · 1.378) = <strong>{w.toFixed(3)} mm</strong>
          <br />
          <span className="board-story__note">
            Routed at 0.35 mm — the standard is a thermal floor, not a target.
          </span>
        </dd>
      </dl>
    );
  }
  if (act === 3) {
    const exact = loadCapPf(12.5);
    const fitted = toE12(exact);
    return (
      <dl className="board-story__calc">
        <dt className="mono-label">Crystal load · C_L 12.5 pF, 3 pF stray</dt>
        <dd>
          C1 = C2 = 2(C_L − C_stray) = {exact.toFixed(1)} pF
          <br />
          nearest E12 = <strong>{fitted} pF</strong>
          <br />
          <span className="board-story__note">
            Gives {(((fitted * fitted) / (fitted + fitted)) + 3).toFixed(1)} pF against 12.5 —
            the error you accept because you cannot buy 19 pF.
          </span>
        </dd>
      </dl>
    );
  }
  if (act === 4) {
    return (
      <dl className="board-story__calc">
        <dt className="mono-label">On the panel · real data</dt>
        <dd>
          {NVDA ? (
            <>
              {NVDA.symbol} ${NVDA.price.toFixed(2)} · close {NVDA.asOf}
              <br />
              {NVDA_CHANGE >= 0 ? '+' : ''}
              {NVDA_CHANGE.toFixed(2)}% = {NVDA_SIGMAS >= 0 ? '+' : ''}
              {NVDA_SIGMAS.toFixed(2)}σ of its own daily move
              <br />
            </>
          ) : null}
          The face is a trained model, not the move: a logistic regression
          fitted on two years of returns, currently reading{' '}
          {Math.round(NVDA_PERCENTILE * 100)} out of 100 on its own scale.
          <br />
          <span className="board-story__note">
            Prices are fetched when this page is built, not when you open it —
            Yahoo sends no CORS headers, so a browser is not allowed to make
            that call. The device would poll it directly over Wi-Fi, which is
            why it is what the panel shows. The model does not beat guessing
            &ldquo;up&rdquo;, and the lesson says so.
          </span>
        </dd>
      </dl>
    );
  }
  return (
    <dl className="board-story__calc">
      <dt className="mono-label">
        {BOARD.width} × {BOARD.height} mm · {BOARD.thickness} mm FR-4 · {BOARD.copperOz} oz
      </dt>
      <dd>
        <span className="board-story__note">
          Every dimension below is a real package. Every electrical figure is
          calculated, not chosen.
        </span>
      </dd>
    </dl>
  );
}
