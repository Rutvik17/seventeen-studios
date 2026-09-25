'use client';

/**
 * The loader's painting: the mark — an autumn maple leaf — sketched in pencil
 * and then painted, a glaze at a time, as the page gets ready
 * (`lib/film/leaf.ts` is the drawing, `lib/film/progressive.ts` the stages).
 *
 * `progress` (0–100) moves it from a blank sheet to the finished leaf. While
 * it is on screen the leaf sways a little, like one about to let go of its
 * branch. Under reduced motion it is shown finished and still.
 */

import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { mapleLeaf, LEAF_OUTLINE } from '@/lib/film/leaf';
import { Progressive } from '@/lib/film/progressive';

export function LeafCanvas({ progress = 100, className }: { progress?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const stages = useRef<Progressive | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    reduced.current = prefersReducedMotion();
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    const size = Math.min(canvas.width, canvas.height);
    const k = size / 100;
    const layer = () => {
      const c = document.createElement('canvas');
      c.width = size;
      c.height = size;
      const x = c.getContext('2d')!;
      x.setTransform(k, 0, 0, k, 0, 0);
      return { c, x };
    };
    const ink = layer();
    const wash = layer();
    // The paint stays inside the pencil line, a hair over it as a wash does.
    wash.x.beginPath();
    LEAF_OUTLINE.forEach(([x, y], i) => {
      const px = 50 + (x - 50) * 1.04;
      const py = 45 + (y - 45) * 1.04;
      if (i) wash.x.lineTo(px, py);
      else wash.x.moveTo(px, py);
    });
    wash.x.closePath();
    wash.x.rect(44, 76, 10, 24);
    wash.x.clip();
    const p = new Progressive(mapleLeaf(), ink.x, wash.x, { inkEnd: 0.5, paintStart: 0.35 });
    stages.current = p;
    p.set(reduced.current ? 1 : progress / 100);

    const ctx = canvas.getContext('2d')!;
    let raf = 0;
    const start = performance.now();
    const frame = (now: number) => {
      const t = (now - start) / 1000;
      const sway = reduced.current ? 0 : Math.sin(t * 1.3) * 0.06 + Math.sin(t * 0.7) * 0.03;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // It hangs from its stalk, so it swings about the stalk's tip.
      const px = canvas.width / 2;
      const py = (canvas.height - size) / 2 + size * 0.98;
      ctx.translate(px, py);
      ctx.rotate(sway);
      ctx.translate(-px, -py);
      const ox = (canvas.width - size) / 2;
      const oy = (canvas.height - size) / 2;
      ctx.drawImage(wash.c, ox, oy);
      ctx.drawImage(ink.c, ox, oy);
      if (!reduced.current) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!reduced.current) stages.current?.set(progress / 100);
  }, [progress]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
