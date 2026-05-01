'use client';

/**
 * Brand pre-loader.
 *
 * Covers the first paint on every hard reload so the user never sees the
 * hero in a half-ready state. The visual vocabulary is intentionally
 * studio-instrument rather than "spinner": a scrambling status word, a
 * phase counter, a frequency-dial tick row, a filling accent bar, and a
 * live progress readout.
 *
 * Progression model — `target` is a monotonic ceiling that jumps as real
 * readiness signals resolve:
 *   - first paint                 → target 6
 *   - `document.fonts.ready`      → target 48
 *   - `window.onload`             → target 80
 *   - guaranteed minimum elapsed  → target 100 (≈ 2.3s)
 * `displayed` lerps toward `target` each frame, so the counter never
 * backtracks and always moves — even when assets resolve instantly.
 *
 * Exit choreography — once `displayed` hits 100 a GSAP timeline:
 *   1. snaps the bar to full, flashes it to a thicker accent band
 *   2. flicks the content out (opacity + slight up-drift)
 *   3. calls `markReady()` — Hero/Nav entrance begins now
 *   4. draws a single accent seam across the centreline
 *   5. splits the panel into top + bottom halves and pulls them apart
 *      (`expo.inOut` for a heavy curtain feel)
 *   6. fades the seam as the halves clear
 *   7. hides the loader root entirely (display:none)
 *
 * Scroll is locked for the full loader lifetime via
 * `lenis.stop()` + `document.body.style.overflow`.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { useLoaderStore } from '@/lib/loader-store';
import { getLenis } from '@/lib/lenis';
import { scrambleText } from '@/lib/gsap-animations';

// Status words cycle as progress passes fixed thresholds.
const PHASES = [
  'AWAKENING',
  'TUNING SIGNAL',
  'SYNCING FIELDS',
  'ALIGNING GRID',
  'READY',
] as const;

const TICK_COUNT = 41; // visual flourish only — not progress-bound

export function Loader() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const statusRef = useRef<HTMLSpanElement | null>(null);
  const counterRef = useRef<HTMLSpanElement | null>(null);
  const phaseRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const ticksRef = useRef<HTMLSpanElement | null>(null);
  const seamRef = useRef<HTMLDivElement | null>(null);
  const topHalfRef = useRef<HTMLDivElement | null>(null);
  const bottomHalfRef = useRef<HTMLDivElement | null>(null);

  const markReady = useLoaderStore((s) => s.markReady);

  useEffect(() => {
    // Lock page scroll for the whole loader lifetime.
    const lenis = getLenis();
    lenis?.stop();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let target = 6;
    let displayed = 0;
    let rafId = 0;
    let finalized = false;
    let phaseIdx = -1;

    const setPhase = (idx: number) => {
      if (idx === phaseIdx) return;
      phaseIdx = idx;
      const status = statusRef.current;
      if (status) scrambleText(status, PHASES[idx]);
      const p = phaseRef.current;
      if (p) p.textContent = `PHASE ${String(idx + 1).padStart(2, '0')} / 05`;
    };

    setPhase(0);

    // Monotonic ceiling — only moves forward.
    const bump = (v: number) => {
      if (v > target) target = v;
    };

    // Real readiness signals.
    const fontsPromise =
      (document as { fonts?: { ready?: Promise<unknown> } }).fonts?.ready ??
      Promise.resolve();
    void fontsPromise.then(() => bump(48));

    if (document.readyState === 'complete') {
      bump(80);
    } else {
      window.addEventListener('load', () => bump(80), { once: true });
    }

    // Guaranteed choreography even when everything loads instantly.
    const t1 = window.setTimeout(() => bump(32), 550);
    const t2 = window.setTimeout(() => bump(62), 1050);
    const t3 = window.setTimeout(() => bump(90), 1650);
    const t4 = window.setTimeout(() => bump(100), 2200);

    const tick = () => {
      const diff = target - displayed;
      // Ease toward target but guarantee minimum forward motion so the
      // counter never stalls visibly.
      displayed += Math.max(0.35, diff * 0.06);
      if (displayed > target) displayed = target;
      if (displayed > 100) displayed = 100;

      const shown = Math.min(100, Math.floor(displayed));
      const counter = counterRef.current;
      if (counter) counter.textContent = String(shown).padStart(3, '0');
      const fill = fillRef.current;
      if (fill) fill.style.transform = `scaleX(${shown / 100})`;

      // Phase transitions map to progress bands.
      if (shown >= 92) setPhase(4);
      else if (shown >= 68) setPhase(3);
      else if (shown >= 42) setPhase(2);
      else if (shown >= 18) setPhase(1);

      if (shown >= 100 && !finalized) {
        finalized = true;
        cancelAnimationFrame(rafId);
        runExit();
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    const runExit = () => {
      const tl = gsap.timeline();
      tl
        // 1. settle the bar
        .to(fillRef.current, {
          scaleX: 1,
          duration: 0.25,
          ease: 'power2.out',
        })
        // 2. thicken the bar briefly — feels like a "lock" moment
        .to(
          fillRef.current,
          { scaleY: 4, duration: 0.28, ease: 'power2.inOut' },
          '>',
        )
        // 3. tick marks flare to accent — hex literal so GSAP can
        //    tween smoothly (CSS var() is non-interpolable).
        .to(
          ticksRef.current?.children ?? [],
          {
            backgroundColor: '#b8f53d',
            opacity: 1,
            duration: 0.35,
            stagger: { amount: 0.3, from: 'center' },
            ease: 'power2.out',
          },
          '-=0.2',
        )
        // 4. content flicks out
        .to(
          contentRef.current,
          { opacity: 0, y: -10, duration: 0.35, ease: 'power2.out' },
          '-=0.05',
        )
        // 5. HAND-OFF — hero timeline begins now, a hair before the curtains open
        .add(() => {
          markReady();
          lenis?.start();
          document.body.style.overflow = prevOverflow;
        })
        // 6. accent seam draws across the centre
        .fromTo(
          seamRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: 0.5, ease: 'power4.out' },
          '-=0.15',
        )
        // 7. panels part — heavy ease for a cinematic curtain
        .to(
          topHalfRef.current,
          { yPercent: -100, duration: 1.15, ease: 'expo.inOut' },
          '-=0.2',
        )
        .to(
          bottomHalfRef.current,
          { yPercent: 100, duration: 1.15, ease: 'expo.inOut' },
          '<',
        )
        // 8. seam dissolves as halves clear the viewport
        .to(
          seamRef.current,
          { opacity: 0, duration: 0.45, ease: 'power2.out' },
          '-=0.55',
        )
        .add(() => {
          const root = rootRef.current;
          if (root) root.style.display = 'none';
        });
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
      // Restore scroll in case the component unmounts early (e.g. HMR).
      lenis?.start();
      document.body.style.overflow = prevOverflow;
    };
  }, [markReady]);

  return (
    <div ref={rootRef} className="loader" aria-hidden="true">
      {/* Split curtains that retract on completion. */}
      <div ref={topHalfRef} className="loader-half loader-half-top" />
      <div ref={bottomHalfRef} className="loader-half loader-half-bottom" />

      {/* Accent seam that draws across the centre during the wipe. */}
      <div ref={seamRef} className="loader-seam" />

      <div ref={contentRef} className="loader-content">
        <div className="loader-top-row">
          <span className="loader-mark">
            SEVENTEEN<span className="loader-mark-dot">·</span>STUDIOS
          </span>
          <span className="loader-badge">
            <span className="loader-rec" aria-hidden="true" />
            SESSION · 2026
          </span>
        </div>

        <div className="loader-status-block">
          <span className="loader-status-pre">// transmission</span>
          <span ref={statusRef} className="loader-status">
            AWAKENING
          </span>
          <span className="loader-status-post">
            studio signal · <em>17.00 MHz</em>
          </span>
        </div>

        <div className="loader-bar-row">
          <div className="loader-bar">
            <span ref={fillRef} className="loader-bar-fill" />
            <span ref={ticksRef} className="loader-bar-ticks">
              {Array.from({ length: TICK_COUNT }).map((_, i) => (
                <span
                  key={i}
                  className={
                    i % 5 === 0 ? 'loader-tick loader-tick-major' : 'loader-tick'
                  }
                />
              ))}
            </span>
          </div>
        </div>

        <div className="loader-bottom-row">
          <span ref={phaseRef} className="loader-phase">
            PHASE 01 / 05
          </span>
          <span className="loader-counter-wrap">
            <span ref={counterRef} className="loader-counter">
              000
            </span>
            <span className="loader-pct">%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
