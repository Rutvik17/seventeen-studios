'use client';

/**
 * The board, turnable, with every part labelled and explained.
 *
 * Drag to rotate. Click any component — or tab to it and press enter — and the
 * panel explains what it is in plain language, assuming the reader has never
 * seen a circuit board.
 *
 * ---
 *
 * THE HOTSPOTS ARE REAL BUTTONS
 *
 * They are HTML positioned each frame from a 3D projection, not sprites drawn
 * into the canvas. That costs a little — a transform write per hotspot per
 * frame — and buys the only things that matter for an explainer: they take
 * keyboard focus in a sensible order, a screen reader announces them, and their
 * text is selectable and findable.
 *
 * A canvas-drawn label is invisible to every one of those. For a piece whose
 * entire purpose is the labels, that is not a trade worth making at any price.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * One static frame at a readable angle, no animation loop, and the full list of
 * parts rendered as plain text beneath it. Everything the interactive version
 * teaches is present; only the turning is gone.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import type { Board3DHandle } from '@/lib/webgl/board3d';
import { boardParts, partByRef } from '@/content/board-parts';

export function BoardExplorer() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const handle = useRef<Board3DHandle | null>(null);

  const [selected, setSelected] = useState<string>('U1');
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false);

  const select = useCallback((ref: string) => {
    setSelected(ref);
    handle.current?.focus(ref);
  }, []);

  useIsomorphicLayoutEffect(() => {
    const wrapEl = wrap.current;
    const canvas = canvasRef.current;
    const layerEl = layer.current;
    if (!wrapEl || !canvas || !layerEl) return;

    const low = prefersReducedMotion();
    setReduced(low);

    let disposed = false;
    let api: Board3DHandle | null = null;
    let raf = 0;

    // Dynamic import: three.js is ~150 KB and the article above it must be
    // readable long before any of it arrives.
    import('@/lib/webgl/board3d')
      .then(({ createBoard3D }) => {
        if (disposed) return;
        const css = getComputedStyle(document.documentElement);
        const token = (n: string, f: string) => css.getPropertyValue(n).trim() || f;

        api = createBoard3D(canvas, {
          mask: token('--pcb-soldermask', '#14483a'),
          copper: token('--pcb-copper', '#c9962f'),
          body: token('--pcb-body', '#23262b'),
          accent: token('--accent', '#1b4fe0'),
        });
        handle.current = api;

        const size = () => {
          const rect = wrapEl.getBoundingClientRect();
          api?.resize(rect.width, rect.height);
          return rect;
        };
        size();
        api.focus('U1');

        const observer = new ResizeObserver(size);
        observer.observe(wrapEl);

        /*
          Hotspot positions are written straight to the DOM in a RAF loop rather
          than through React state. Sixty renders a second for fourteen
          transforms would dominate the frame; this is one style write each.
        */
        const positionLabels = () => {
          const rect = wrapEl.getBoundingClientRect();
          api?.project(rect.width, rect.height);
          for (const spot of api?.hotspots ?? []) {
            const node = layerEl.querySelector<HTMLElement>(`[data-spot="${spot.ref}"]`);
            if (!node) continue;
            node.style.transform = `translate(-50%, -50%) translate(${spot.screen.x}px, ${spot.screen.y}px)`;
            node.style.opacity = spot.screen.visible ? '1' : '0';
            node.style.pointerEvents = spot.screen.visible ? 'auto' : 'none';
          }
          raf = requestAnimationFrame(positionLabels);
        };

        if (low) {
          api.renderOnce();
          const rect = wrapEl.getBoundingClientRect();
          api.project(rect.width, rect.height);
        } else {
          api.start();
          raf = requestAnimationFrame(positionLabels);
        }

        setReady(true);

        return () => {
          observer.disconnect();
        };
      })
      .catch(() => {
        // No WebGL, or the chunk failed. The list below still teaches.
        wrapEl.dataset.failed = 'true';
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      api?.dispose();
      handle.current = null;
    };
  }, []);

  // Clicking the board picks a part. Kept off the canvas element's own handler
  // so a drag that ends over a component does not also select it.
  const onClick = (e: React.MouseEvent) => {
    const api = handle.current;
    const wrapEl = wrap.current;
    if (!api || !wrapEl) return;
    const rect = wrapEl.getBoundingClientRect();
    const ref = api.pick(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
    if (ref) select(ref);
  };

  const part = partByRef(selected) ?? boardParts[0];

  return (
    <div className="explorer">
      <div className="explorer__stage" ref={wrap} onClick={onClick}>
        <canvas ref={canvasRef} className="explorer__canvas" aria-hidden="true" />
        <div className="explorer__spots" ref={layer}>
          {boardParts.map((p) => (
            <button
              key={p.ref}
              type="button"
              data-spot={p.ref}
              className={`explorer__spot${selected === p.ref ? ' is-active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                select(p.ref);
              }}
              aria-pressed={selected === p.ref}
            >
              <span className="explorer__spot-dot" aria-hidden="true" />
              <span className="explorer__spot-label">{p.ref}</span>
              <span className="sr-only"> — {p.name}</span>
            </button>
          ))}
        </div>
        {!reduced && ready && (
          <p className="explorer__hint mono-label">Drag to turn · click a part</p>
        )}
      </div>

      <aside className="explorer__panel" aria-live="polite">
        <span className="mono-label explorer__ref">{part.ref}</span>
        <h3 className="explorer__name">{part.name}</h3>
        <p className="explorer__is">{part.is}</p>

        <dl className="explorer__facts">
          <div>
            <dt className="mono-label">What it does here</dt>
            <dd>{part.does}</dd>
          </div>
          <div>
            <dt className="mono-label">Why it has to be there</dt>
            <dd>{part.why}</dd>
          </div>
          {part.analogy && (
            <div>
              <dt className="mono-label">Put another way</dt>
              <dd>{part.analogy}</dd>
            </div>
          )}
        </dl>

        {part.spec && (
          <p className="explorer__spec">
            <span className="mono-label">{part.spec.label}</span>
            <strong>{part.spec.value}</strong>
          </p>
        )}
      </aside>

      {/*
        The same content as plain text. This is not a fallback that only appears
        when something breaks — it is always in the document, so the article can
        be read end to end without WebGL, without a pointer, and by a screen
        reader that will never see the canvas.
      */}
      <details className="explorer__all">
        <summary className="mono-label">Every part, as a list</summary>
        <dl>
          {boardParts.map((p) => (
            <div key={p.ref}>
              <dt>
                {p.ref} — {p.name}
              </dt>
              <dd>
                {p.is} {p.does}
              </dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
