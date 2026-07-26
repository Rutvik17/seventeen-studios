'use client';

/**
 * Mounts the hero WebGL scene.
 *
 * Three.js and the post-processing chain are pulled in through a dynamic
 * import inside the effect, so they never reach the server bundle and never
 * block first paint — the hero type is readable before the canvas initialises,
 * and stays readable if WebGL is unavailable or the import fails.
 *
 * This component owns the input plumbing: pointer position, scroll progress
 * and scroll velocity from Lenis.
 */

import { useEffect, useRef } from 'react';
import { useUi } from '@/lib/store';
import { onLenis } from '@/lib/lenis';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import type { SceneHandle } from '@/lib/webgl/scene';

export function Field({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const entered = useUi((state) => state.entered);
  const reduced = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;

    // Probe before importing 200kB of renderer we cannot use.
    const probe = document.createElement('canvas');
    const supported = Boolean(
      probe.getContext('webgl2') || probe.getContext('webgl'),
    );
    if (!supported) {
      canvas.classList.add('is-unsupported');
      return;
    }

    import('@/lib/webgl/scene')
      .then(({ createScene }) => {
        if (disposed) return;
        handleRef.current = createScene(canvas, { reducedMotion: reduced });
        canvas.classList.add('is-ready');
        // The preloader may have finished before Three.js resolved.
        if (useUi.getState().entered) handleRef.current.setReveal(1);
      })
      .catch(() => {
        /* Context creation failed — the hero works without it. */
      });

    const onResize = () => handleRef.current?.resize();
    const onPointer = (event: PointerEvent) => {
      handleRef.current?.setPointer(
        (event.clientX / window.innerWidth) * 2 - 1,
        -((event.clientY / window.innerHeight) * 2 - 1),
      );
    };
    const onScroll = () => {
      handleRef.current?.setScroll(
        Math.min(window.scrollY / window.innerHeight, 1.6),
      );
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });

    // Velocity comes from Lenis rather than differencing scrollY: it is
    // already smoothed, and it survives the frames where scrollY does not move.
    // `detach` is declared first — onLenis fires synchronously when the
    // instance already exists.
    let detach = () => {};
    const unsubscribe = onLenis((lenis) => {
      const handler = () => handleRef.current?.setVelocity(lenis.velocity / 14);
      lenis.on('scroll', handler);
      detach = () => lenis.off('scroll', handler);
    });

    return () => {
      disposed = true;
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      unsubscribe();
      detach();
      handleRef.current?.dispose();
      handleRef.current = null;
    };
  }, [reduced]);

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
