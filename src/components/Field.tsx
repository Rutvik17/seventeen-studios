'use client';

/**
 * Mounts the hero WebGL field.
 *
 * Loaded through a dynamic import inside the effect so Three.js never reaches
 * the server bundle and never blocks first paint — the hero type is readable
 * before the canvas has initialised, and stays readable if WebGL is
 * unavailable.
 */

import { useEffect, useRef } from 'react';
import { useUi } from '@/lib/store';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { FieldHandle } from '@/lib/webgl/field';

export function Field({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<FieldHandle | null>(null);
  const entered = useUi((state) => state.entered);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    // Bail out cleanly on machines without WebGL rather than throwing.
    const probe = document.createElement('canvas');
    const supported = Boolean(
      probe.getContext('webgl2') || probe.getContext('webgl'),
    );
    if (!supported) return;

    import('@/lib/webgl/field')
      .then(({ createField }) => {
        if (disposed) return;
        handleRef.current = createField(canvas, { reducedMotion: reduced });
        // The preloader may have finished before Three.js resolved.
        if (useUi.getState().entered) handleRef.current.setReveal(1);
      })
      .catch(() => {
        /* WebGL context creation failed — the hero works without it. */
      });

    const onResize = () => handleRef.current?.resize();
    const onPointer = (event: PointerEvent) => {
      handleRef.current?.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };
    const onScroll = () => {
      const progress = Math.min(window.scrollY / window.innerHeight, 1.4);
      handleRef.current?.setScroll(progress);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [reduced]);

  // The field builds in only once the preloader has handed over.
  useEffect(() => {
    if (entered) handleRef.current?.setReveal(1);
  }, [entered]);

  return (
    <canvas
      ref={canvasRef}
      className={`field ${className ?? ''}`.trim()}
      aria-hidden="true"
    />
  );
}
