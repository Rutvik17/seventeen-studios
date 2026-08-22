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
  routePath,
  toE12,
  traceWidthMm,
} from '@/lib/board';
import { PANEL, expressionFor, faceCells } from '@/lib/pixel';
import { boardActs, hero } from '@/content/studio';
import { assetBySymbol, market, sigmasFor } from '@/content/market';
import { nextArrival, shortStop, transit } from '@/content/transit';

/* The drawing's frame: the board, plus room above it for the display. */
const VIEW = { x: -8, y: -50, w: 104, h: 116 };

/** Where the display panel sits, in board millimetres. */
const DISPLAY = {
  w: 79,
  h: 36,
  x: 44 - 79 / 2,
  y: -44,
};

/*
  What the display shows is REAL, and that is the point of it.

  `NVDA` is the last adjusted close and its move, fetched at build time by
  `scripts/fetch-market.mjs`. The arrival is a genuine TTC prediction for a real
  stop, from `scripts/fetch-transit.mjs`. Neither can be fetched in the browser
  — this is a static export and both feeds are same-origin-blocked — so both are
  captured at build and the readout beside the board says when.

  The face is not decoration either: `expressionFor` is handed the move measured
  in units of NVDA's OWN daily volatility, so a 2% day on a 45%-vol name reads
  differently from a 2% day on a 30%-vol one. It is the same function the
  firmware would call.
*/
const NVDA = assetBySymbol('NVDA');
const ARRIVAL = nextArrival();
const NVDA_CHANGE = NVDA?.changeDay ?? 0;
const NVDA_SIGMAS = NVDA ? sigmasFor(NVDA, NVDA_CHANGE, market.tradingDays) : 0;

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
      gsap.set(q('[data-display]'), { opacity: 0, y: 26 });
      // The ribbon DRAWS rather than fading in. A cable that materialises at
      // full length reads as a layer being switched on; one that unrolls reads
      // as being plugged in, which is the thing actually happening.
      const ribbon = el.querySelector<SVGPathElement>('[data-ribbon]');
      const ribbonLen = ribbon?.getTotalLength?.() ?? 60;
      gsap.set(ribbon, {
        opacity: 1,
        strokeDasharray: ribbonLen,
        strokeDashoffset: ribbonLen,
      });
      gsap.set(q('[data-osc]'), { opacity: 0 });

      // Traces are drawn with dashoffset rather than a plugin: the length is
      // already known from `pathLength`, so this needs no DrawSVG licence.
      q('[data-trace]').forEach((node) => {
        const len = Number((node as unknown as SVGPathElement).dataset.length ?? 0);
        gsap.set(node, { strokeDasharray: len, strokeDashoffset: len });
      });

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
        ribbon,
        { strokeDashoffset: 0, duration: 0.8, ease: 'power2.inOut' },
        3.85,
      )
        // The panel starts arriving only once the cable has most of the way to
        // go, so it reads as being pulled up on the end of it.
        .to('[data-display]', { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, 4.35)
        .from(q('[data-pixel]'), { opacity: 0, duration: 0.02, stagger: 0.004 }, 4.5);

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
            <path
              data-ribbon
              d={`M 74 20.2 C 74 6, 66 -2, 58 ${DISPLAY.y + DISPLAY.h}`}
              className="board-story__ribbon"
            />

            <g data-display>
              <rect
                x={DISPLAY.x}
                y={DISPLAY.y}
                width={DISPLAY.w}
                height={DISPLAY.h}
                rx={1.2}
                fill="var(--pcb-bezel)"
              />
              <rect
                x={DISPLAY.x + 3}
                y={DISPLAY.y + 3}
                width={PANEL.mmWidth}
                height={PANEL.mmHeight}
                fill="url(#epaper)"
              />
              <Face x={DISPLAY.x + 6} y={DISPLAY.y + 7} />
              <text x={DISPLAY.x + 28} y={DISPLAY.y + 12} className="board-story__epd-big">
                {NVDA?.symbol ?? 'NVDA'}
              </text>
              <text x={DISPLAY.x + 28} y={DISPLAY.y + 20} className="board-story__epd-accent">
                {NVDA_CHANGE >= 0 ? '+' : ''}
                {NVDA_CHANGE.toFixed(2)}%
              </text>
              <text x={DISPLAY.x + 28} y={DISPLAY.y + 26} className="board-story__epd-small">
                ${NVDA?.price?.toFixed(2) ?? '—'} · {NVDA_SIGMAS >= 0 ? '+' : ''}
                {NVDA_SIGMAS.toFixed(1)}σ
              </text>
              {ARRIVAL && (
                <>
                  <text
                    x={DISPLAY.x + 28}
                    y={DISPLAY.y + 32}
                    className="board-story__epd-small"
                  >
                    {ARRIVAL.route} · {ARRIVAL.minutes[0]} min
                  </text>
                  <text
                    x={DISPLAY.x + 28}
                    y={DISPLAY.y + 36}
                    className="board-story__epd-tiny"
                  >
                    {shortStop(ARRIVAL.stopTitle)}
                  </text>
                </>
              )}
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
              <Working act={act} />
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
      // The arrow travels and fades at the bottom — a hint of the motion being
      // asked for, not a bouncing icon.
      gsap.to('[data-cue-arrow]', {
        y: 9,
        opacity: 0.25,
        duration: 1.15,
        ease: 'power1.inOut',
        repeat: -1,
        yoyo: true,
      });
      gsap.to(el, {
        autoAlpha: 0,
        duration: 0.4,
        scrollTrigger: { trigger: document.body, start: 'top -40', toggleActions: 'play none none reverse' },
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return (
    <div className="board-cue" ref={ref}>
      <span className="mono-label">Scroll to build it</span>
      <svg viewBox="0 0 12 22" className="board-cue__arrow" data-cue-arrow aria-hidden="true">
        <path d="M6 0 L6 19 M1 14 L6 19 L11 14" />
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

function Face({ x, y }: { x: number; y: number }) {
  /*
    The expression is driven by the REAL move, measured in units of NVDA's own
    daily volatility rather than in raw percent. A fixed threshold cannot be
    honest across assets — 3% is an ordinary day for a 90%-vol name and a
    significant one for a 30%-vol name — so the companion would be permanently
    alarmed about one and asleep through the other.
  */
  const cells = faceCells(expressionFor(NVDA_SIGMAS));
  const px = 1.1;
  return (
    <g>
      {cells.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          data-pixel
          x={x + c.x * px}
          y={y + c.y * px}
          width={px}
          height={px}
          fill={c.ink === 'accent' ? 'var(--accent)' : '#161616'}
        />
      ))}
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
        <dt className="mono-label">Power budget · duty-cycled</dt>
        <dd>
          average <strong>{AVERAGE_MA.toFixed(2)} mA</strong> · peak {PEAK_MA} mA
          <br />
          {BATTERY_MAH} mAh × 0.85 ÷ {AVERAGE_MA.toFixed(2)} mA ={' '}
          <strong>{batteryDays(BATTERY_MAH).toFixed(0)} days</strong>
          <br />
          <span className="board-story__note">
            Peak sizes the regulator. Average sizes the battery. Confusing the
            two is the classic way to ship a device that dies in a week.
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
              {NVDA.symbol} ${NVDA.price.toFixed(2)}, close {NVDA.asOf}
              <br />
            </>
          ) : null}
          {ARRIVAL ? (
            <>
              {ARRIVAL.routeTitle} · {shortStop(ARRIVAL.stopTitle)}
              <br />
            </>
          ) : null}
          <span className="board-story__note">
            Both fetched when this page was built, not when you opened it — a
            static export has no server to call an API on your behalf, and
            neither feed permits a request from a browser. The device itself
            would poll them directly over Wi-Fi, which is why they are what it
            shows. Captured {new Date(transit.capturedAt).toISOString().slice(0, 10)}.
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
