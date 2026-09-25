'use client';

/**
 * The header's mark: an autumn maple leaf, sketched and painted
 * (`lib/film/leaf.ts`). Painted once, finished, when the header mounts; on
 * hover it turns a little, like a leaf caught by the air.
 */

import { useEffect, useRef } from 'react';
import { mapleLeaf, LEAF_OUTLINE } from '@/lib/film/leaf';
import { drawStroke } from '@/lib/film/pencil';

export function LeafMark({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const paint = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(3, window.devicePixelRatio || 1);
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      const ctx = canvas.getContext('2d')!;
      const k = Math.min(canvas.width, canvas.height) / 100;
      ctx.setTransform(k, 0, 0, k, (canvas.width - 100 * k) / 2, (canvas.height - 100 * k) / 2);
      const leaf = mapleLeaf();
      // The paint stays (nearly) inside the pencil line: a hair over it, as a
      // wash does, but no blots out beyond the leaf.
      ctx.save();
      ctx.beginPath();
      LEAF_OUTLINE.forEach(([x, y], i) => {
        const px = 50 + (x - 50) * 1.04;
        const py = 45 + (y - 45) * 1.04;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.rect(44, 76, 10, 24);
      ctx.clip();
      for (const w of leaf.washes) w.paint(ctx);
      ctx.restore();
      for (const s of leaf.ink) drawStroke(ctx, s);
    };
    paint();
    const ro = new ResizeObserver(paint);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
