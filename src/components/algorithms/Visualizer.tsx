'use client';

/**
 * The player: runs a problem's tracer on the chosen example and steps
 * through what it recorded — play and pause, one step either way, a scrubber,
 * the speed, and which example. The arrow keys step and the space bar plays
 * while the player has focus.
 *
 * The tracer module for the problem's category is loaded on demand
 * (`lib/algorithms/traces`), so a page carries only its own category's
 * tracers, not all of them.
 *
 * Reduced motion: it never plays by itself, and nothing inside it slides —
 * each step is drawn in place, turned by the buttons.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { loadTracer } from '@/lib/algorithms/traces';
import type { Trace, Tracer } from '@/lib/algorithms/trace';
import { PanelView, VizDefs } from './Viz';
import styles from './Visualizer.module.css';

export interface Example {
  label: string;
  input: unknown;
}

const SPEEDS = [0.5, 1, 2, 4];

export function Visualizer({ slug, category, examples }: { slug: string; category: string; examples: Example[] }) {
  const [tracer, setTracer] = useState<Tracer | null>(null);
  const [failed, setFailed] = useState(false);
  const [which, setWhich] = useState(0);
  const [i, setI] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const reduced = useRef(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    reduced.current = prefersReducedMotion();
    let live = true;
    setTracer(null);
    setFailed(false);
    loadTracer(category, slug)
      .then((t) => {
        if (!live) return;
        if (t) setTracer(() => t);
        else setFailed(true);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [category, slug]);

  const trace: Trace | null = useMemo(() => {
    if (!tracer || !examples[which]) return null;
    try {
      return tracer(structuredClone(examples[which].input));
    } catch {
      return null;
    }
  }, [tracer, examples, which]);

  // A new trace starts from the top, and plays by itself unless motion is reduced.
  useEffect(() => {
    setI(0);
    setPlaying(!!trace && !reduced.current);
  }, [trace]);

  const n = trace?.steps.length ?? 0;
  useEffect(() => {
    if (!playing || !n) return;
    if (i >= n - 1) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => setI((k) => Math.min(n - 1, k + 1)), 1400 / speed);
    return () => window.clearTimeout(t);
  }, [playing, i, n, speed]);

  const go = useCallback(
    (k: number) => {
      setPlaying(false);
      setI(Math.max(0, Math.min(n - 1, k)));
    },
    [n],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      go(i + 1);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      go(i - 1);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (i >= n - 1) setI(0);
      setPlaying((p) => !p);
    }
  };

  const step = trace?.steps[i];

  return (
    <div ref={root} className={styles.viz} tabIndex={0} onKeyDown={onKey} aria-label="Step-by-step visualisation" data-lenis-prevent>
      <VizDefs />
      <div className={styles.head}>
        {examples.length > 1 && (
          <label className={styles.example}>
            <span>example</span>
            <select value={which} onChange={(e) => setWhich(Number(e.target.value))}>
              {examples.map((ex, k) => (
                <option key={k} value={k}>
                  {k + 1}. {ex.label.length > 46 ? ex.label.slice(0, 44) + '…' : ex.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {examples.length === 1 && <p className={styles.single}>{examples[0].label}</p>}
      </div>

      <div className={styles.stage}>
        {!trace && !failed && <p className={styles.wait}>setting up…</p>}
        {failed && <p className={styles.wait}>The visualisation could not be loaded.</p>}
        {step && (
          <>
            <p className={styles.note} aria-live="polite">
              <span className={styles.count}>
                {i + 1} / {n}
              </span>{' '}
              {step.note}
            </p>
            <div className={styles.panels}>
              {step.panels.map((p, k) => (
                <PanelView key={`${k}-${p.t}`} p={p} />
              ))}
            </div>
          </>
        )}
      </div>

      {trace && (
        <div className={styles.controls}>
          <button type="button" onClick={() => go(0)} aria-label="First step" disabled={i === 0}>
            ⏮
          </button>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous step" disabled={i === 0}>
            ◀
          </button>
          <button
            type="button"
            className={styles.play}
            onClick={() => {
              if (i >= n - 1) setI(0);
              setPlaying((p) => !p);
            }}
            aria-label={playing ? 'Pause' : 'Play'}
          >
            {playing ? '❚❚' : '▶'}
          </button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next step" disabled={i >= n - 1}>
            ▶
          </button>
          <button type="button" onClick={() => go(n - 1)} aria-label="Last step" disabled={i >= n - 1}>
            ⏭
          </button>
          <input className={styles.scrub} type="range" min={0} max={Math.max(0, n - 1)} value={i} onChange={(e) => go(Number(e.target.value))} aria-label="Step" />
          <button type="button" className={styles.speed} onClick={() => setSpeed((s) => SPEEDS[(SPEEDS.indexOf(s) + 1) % SPEEDS.length])} aria-label="Speed">
            {speed}×
          </button>
        </div>
      )}
    </div>
  );
}
