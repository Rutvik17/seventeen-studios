'use client';

/**
 * Founder portrait.
 *
 * The `<img>` is the real element: it is what the server renders, what a
 * crawler indexes, and what a visitor sees if WebGL is unavailable or motion is
 * reduced. The shader canvas is layered over it and only fades in once the
 * texture has been uploaded — so the portrait is never missing, it just gets
 * better.
 */

import { useEffect, useRef, useState } from 'react';
import { founder } from '@/content/founder';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useUi } from '@/lib/store';
import type { PortraitHandle } from '@/lib/webgl/portrait';

export function Portrait({ src, alt }: { src: string; alt: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<PortraitHandle | null>(null);
  const [shaded, setShaded] = useState(false);
  const reduced = useReducedMotion();
  const entered = useUi((state) => state.entered);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    let disposed = false;

    const probe = document.createElement('canvas');
    if (!probe.getContext('webgl2') && !probe.getContext('webgl')) return;

    import('@/lib/webgl/portrait')
      .then(({ createPortrait }) => {
        if (disposed) return;
        const handle = createPortrait(canvas, src, { reducedMotion: reduced });
        // A failed shader link leaves the plain image in place rather than an
        // empty frame.
        if (!handle.ok) return;
        handleRef.current = handle;
        setShaded(true);
        if (useUi.getState().entered) handle.setReveal(1);
      })
      .catch(() => {
        /* The plain image is already on screen; nothing to recover. */
      });

    const onMove = (event: PointerEvent) => {
      const rect = wrap.getBoundingClientRect();
      handleRef.current?.setPointer(
        (event.clientX - rect.left) / rect.width,
        1 - (event.clientY - rect.top) / rect.height,
      );
    };
    const onEnter = () => handleRef.current?.setHover(true);
    const onLeave = () => handleRef.current?.setHover(false);
    const onResize = () => handleRef.current?.resize();

    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerenter', onEnter);
    wrap.addEventListener('pointerleave', onLeave);
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerenter', onEnter);
      wrap.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('resize', onResize);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [src, reduced]);

  useEffect(() => {
    if (entered) handleRef.current?.setReveal(1);
  }, [entered]);

  return (
    <div className={`portrait${shaded ? ' is-shaded' : ''}`} ref={wrapRef}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="portrait__img" src={src} alt={alt} width={880} height={1168} />
      <canvas className="portrait__canvas" ref={canvasRef} aria-hidden="true" />
      <span className="portrait__frame" aria-hidden="true" />
      <span className="portrait__tag mono-label" aria-hidden="true">
        {founder.initials} · {founder.location}
      </span>
    </div>
  );
}
