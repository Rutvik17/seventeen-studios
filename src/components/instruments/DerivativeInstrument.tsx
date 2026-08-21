'use client';

/**
 * Grasp's central idea, playable in the browser.
 *
 * Drag the point. The tangent turns under your finger, the rise-over-run
 * triangle redraws, the working shows your own numbers substituted into it —
 * and every slope you visit is dropped onto the panel below, until the
 * collected slopes turn out to be a curve of their own. That last step is the
 * moment the whole subject opens up, and it is very hard to have it by reading.
 *
 * ---
 *
 * WHY THIS IS ON THE PRODUCT PAGE
 *
 * The page previously described the app. A page about an app whose entire claim
 * is "you will understand this because you moved it" cannot be a page you only
 * read — that is the claim failing on its own front door. So the argument is
 * made the way the product makes it, and the copy underneath explains what just
 * happened rather than promising it.
 *
 * ---
 *
 * THE RULES THE APP HOLDS, HELD HERE TOO
 *
 * - Every number shows its working with the live values substituted. Never a
 *   bare `2.80` — always `rise ÷ run = 1.40 ÷ 0.50 = 2.80`.
 * - The dragged point SNAPS, so the value displayed is the value in use and the
 *   printed arithmetic reproduces the printed answer on a calculator.
 * - The numeric estimate is shown beside the exact derivative, with the error,
 *   so nothing has to be taken on trust.
 *
 * ---
 *
 * KEYBOARD AND REDUCED MOTION
 *
 * The point is a real focusable control with arrow-key stepping and proper
 * `aria-valuetext`, because a drag-only demonstration excludes exactly the
 * people who most need the working shown. Nothing here animates on a timer, so
 * reduced motion needs no separate branch — it is interactive, not animated,
 * and it holds still until it is asked to move.
 */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  CURVES,
  STEP,
  fixed,
  round2,
  sample,
  snap,
  workingAt,
  type Curve,
} from '@/lib/calculus';

const W = 640;
const H = 380;
const PAD = 34;

export function DerivativeInstrument() {
  const [curveId, setCurveId] = useState(CURVES[1].id);
  const curve = CURVES.find((c) => c.id === curveId) ?? CURVES[0];

  const [x, setX] = useState(0.8);
  /** Every x the reader has visited, so the derivative curve draws itself. */
  const [visited, setVisited] = useState<number[]>([]);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const work = useMemo(() => workingAt(curve, x), [curve, x]);

  /* ---- projection --------------------------------------------------- */
  const proj = useMemo(() => {
    const [dx0, dx1] = curve.domain;
    const [ry0, ry1] = curve.range;
    const sx = (v: number) => PAD + ((v - dx0) / (dx1 - dx0)) * (W - PAD * 2);
    const sy = (v: number) => H - PAD - ((v - ry0) / (ry1 - ry0)) * (H - PAD * 2);
    return { sx, sy, dx0, dx1, ry0, ry1 };
  }, [curve]);

  /** Derivative panel shares the x projection, so the two line up vertically. */
  const dProj = useMemo(() => {
    const vals = sample(curve.exact, curve.domain, 120).map(([, v]) => v);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    const pad = (hi - lo) * 0.15 || 1;
    const y0 = lo - pad;
    const y1 = hi + pad;
    const sy = (v: number) => 150 - 18 - ((v - y0) / (y1 - y0)) * (150 - 36);
    return { sy, y0, y1 };
  }, [curve]);

  const setFromPointer = useCallback(
    (clientX: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const t = (clientX - rect.left) / rect.width;
      const raw = curve.domain[0] + t * (curve.domain[1] - curve.domain[0]);
      const clamped = Math.min(
        curve.domain[1] - STEP,
        Math.max(curve.domain[0] + STEP, raw),
      );
      const next = snap(clamped);
      setX(next);
      setVisited((prev) => (prev.includes(next) ? prev : [...prev, next]));
    },
    [curve],
  );

  const step = useCallback(
    (delta: number) => {
      setX((prev) => {
        const next = snap(
          Math.min(curve.domain[1] - STEP, Math.max(curve.domain[0] + STEP, prev + delta)),
        );
        setVisited((v) => (v.includes(next) ? v : [...v, next]));
        return next;
      });
    },
    [curve],
  );

  const changeCurve = (id: string) => {
    setCurveId(id);
    setVisited([]);
    setX(0.8);
  };

  /* ---- paths -------------------------------------------------------- */
  const curvePath = useMemo(
    () =>
      sample(curve.f, curve.domain)
        .map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${proj.sx(px).toFixed(1)} ${proj.sy(py).toFixed(1)}`)
        .join(' '),
    [curve, proj],
  );

  const exactDerivativePath = useMemo(
    () =>
      sample(curve.exact, curve.domain)
        .map(([px, py], i) => `${i === 0 ? 'M' : 'L'} ${proj.sx(px).toFixed(1)} ${dProj.sy(py).toFixed(1)}`)
        .join(' '),
    [curve, proj, dProj],
  );

  // The tangent, extended to the full triangle width and a little beyond.
  const tangent = useMemo(() => {
    const span = (curve.domain[1] - curve.domain[0]) * 0.16;
    const shown = round2(work.slope);
    return {
      x1: work.x - span,
      y1: work.y - shown * span,
      x2: work.x + span,
      y2: work.y + shown * span,
    };
  }, [work, curve]);

  const traced = useMemo(
    () => [...visited].sort((a, b) => a - b),
    [visited],
  );

  return (
    <div className="deriv">
      <div className="deriv__tabs" role="tablist" aria-label="Choose a function">
        {CURVES.map((c) => (
          <button
            key={c.id}
            type="button"
            role="tab"
            aria-selected={c.id === curveId}
            className={`deriv__tab${c.id === curveId ? ' is-active' : ''}`}
            onClick={() => changeCurve(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="deriv__stage">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="deriv__svg"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.target as Element).setPointerCapture?.(e.pointerId);
            setFromPointer(e.clientX);
          }}
          onPointerMove={(e) => dragging.current && setFromPointer(e.clientX)}
          onPointerUp={() => (dragging.current = false)}
          onPointerCancel={() => (dragging.current = false)}
          role="img"
          aria-label={`${curve.label} with a tangent line at x equals ${fixed(work.x)}`}
        >
          <Grid proj={proj} curve={curve} />

          <path d={curvePath} className="deriv__curve" />

          {/* rise / run triangle — drawn before the tangent so the line sits on top */}
          <path
            d={`M ${proj.sx(work.triangle.x0)} ${proj.sy(work.triangle.y0)}
                L ${proj.sx(work.triangle.x1)} ${proj.sy(work.triangle.y0)}
                L ${proj.sx(work.triangle.x1)} ${proj.sy(work.triangle.y1)} Z`}
            className="deriv__triangle"
          />
          <text
            x={proj.sx(work.x)}
            y={proj.sy(work.triangle.y0) + 15}
            className="deriv__tri-label"
            textAnchor="middle"
          >
            run {fixed(work.run)}
          </text>
          <text
            x={proj.sx(work.triangle.x1) + 7}
            y={proj.sy((work.triangle.y0 + work.triangle.y1) / 2)}
            className="deriv__tri-label"
          >
            rise {fixed(work.rise)}
          </text>

          <line
            x1={proj.sx(tangent.x1)}
            y1={proj.sy(tangent.y1)}
            x2={proj.sx(tangent.x2)}
            y2={proj.sy(tangent.y2)}
            className="deriv__tangent"
          />

          {/* The handle. A real button, so it takes focus and arrow keys. */}
          <g
            className="deriv__handle"
            tabIndex={0}
            role="slider"
            aria-valuemin={curve.domain[0]}
            aria-valuemax={curve.domain[1]}
            aria-valuenow={work.x}
            aria-valuetext={`x equals ${fixed(work.x)}, slope ${fixed(round2(work.slope))}`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); step(STEP); }
              if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); step(-STEP); }
              if (e.key === 'PageUp') { e.preventDefault(); step(STEP * 10); }
              if (e.key === 'PageDown') { e.preventDefault(); step(-STEP * 10); }
            }}
          >
            <circle cx={proj.sx(work.x)} cy={proj.sy(work.y)} r="16" className="deriv__halo" />
            <circle cx={proj.sx(work.x)} cy={proj.sy(work.y)} r="6.5" className="deriv__point" />
          </g>
        </svg>

        {/* ---- the derivative, traced as you go ---- */}
        <svg viewBox={`0 0 ${W} 150`} className="deriv__svg deriv__svg--lower" role="img"
             aria-label="The slopes you have visited, plotted as their own curve">
          <line x1={PAD} y1={dProj.sy(0)} x2={W - PAD} y2={dProj.sy(0)} className="deriv__axis" />
          <path d={exactDerivativePath} className="deriv__ghost" />
          {traced.map((vx) => (
            <circle
              key={vx}
              cx={proj.sx(vx)}
              cy={dProj.sy(curve.exact(vx))}
              r="2.6"
              className="deriv__dot"
            />
          ))}
          <line
            x1={proj.sx(work.x)} y1={18}
            x2={proj.sx(work.x)} y2={132}
            className="deriv__plumb"
          />
          <circle
            cx={proj.sx(work.x)}
            cy={dProj.sy(round2(work.slope))}
            r="6"
            className="deriv__point"
          />
          <text x={PAD} y={14} className="deriv__tri-label">
            the slope, plotted — {traced.length} point{traced.length === 1 ? '' : 's'} so far
          </text>
        </svg>
      </div>

      {/* ---- the working ---- */}
      <div className="deriv__panel">
        <span className="mono-label">The working, with your numbers in it</span>
        <p className="deriv__line">
          <span className="deriv__sym">{curve.label}</span>
          <span className="deriv__at">at x = {fixed(work.x)}</span>
        </p>
        <p className="deriv__line">
          f({fixed(work.x)}) = <strong>{fixed(work.y)}</strong>
          <span className="deriv__hint">— the height of the curve there</span>
        </p>
        <p className="deriv__line deriv__line--key">
          slope = rise ÷ run = {fixed(work.rise)} ÷ {fixed(work.run)} ={' '}
          <strong>{fixed(round2(work.slope))}</strong>
        </p>
        <p className="deriv__line">
          {curve.derivativeLabel} → exact <strong>{fixed(work.exact)}</strong>
          <span className="deriv__hint">
            — numeric estimate differs by {work.error.toExponential(1)}
          </span>
        </p>
        <p className="deriv__note">{curve.note}</p>
      </div>

      <p className="deriv__caveat">
        <strong>Why the point snaps.</strong> Every figure above has to be
        reproducible from the ones printed beside it — retype{' '}
        <code>{fixed(work.rise)} ÷ {fixed(work.run)}</code> into a calculator and
        you get exactly what the panel says. Let x drift to 1.4037 and the display
        rounds it to 1.40 while the arithmetic uses the float; the working is then
        perfectly traceable and impossible to check. The app enforces the same
        rule on itself, and it exists because a version that did not shipped a
        line reading <code>f(−1.82) = 3.29</code> that no reader could verify.
      </p>
    </div>
  );
}

function Grid({
  proj,
  curve,
}: {
  proj: { sx: (v: number) => number; sy: (v: number) => number };
  curve: Curve;
}) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let v = Math.ceil(curve.domain[0]); v <= curve.domain[1]; v++) xs.push(v);
  for (let v = Math.ceil(curve.range[0]); v <= curve.range[1]; v++) ys.push(v);

  return (
    <g aria-hidden="true">
      {xs.map((v) => (
        <line key={`x${v}`} x1={proj.sx(v)} y1={PAD} x2={proj.sx(v)} y2={H - PAD} className="deriv__grid" />
      ))}
      {ys.map((v) => (
        <line key={`y${v}`} x1={PAD} y1={proj.sy(v)} x2={W - PAD} y2={proj.sy(v)} className="deriv__grid" />
      ))}
      <line x1={PAD} y1={proj.sy(0)} x2={W - PAD} y2={proj.sy(0)} className="deriv__axis" />
      <line x1={proj.sx(0)} y1={PAD} x2={proj.sx(0)} y2={H - PAD} className="deriv__axis" />
      {xs.filter((v) => v !== 0).map((v) => (
        <text key={`xl${v}`} x={proj.sx(v)} y={proj.sy(0) + 14} className="deriv__tick" textAnchor="middle">
          {v}
        </text>
      ))}
    </g>
  );
}
