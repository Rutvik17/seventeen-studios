'use client';

import { useEffect, useRef } from 'react';
import { scramble } from '@/lib/text';
import { prefersReducedMotion } from '@/lib/gsap';

/**
 * Letter-scramble on hover. Used sparingly — on nav items and index rows,
 * where the effect reads as a system responding rather than as decoration.
 */
export function Scramble({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const cancel = useRef<(() => void) | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    // The scramble is triggered by the nearest interactive ancestor so the
    // whole row responds, not just the glyphs under the cursor.
    const host = el.closest('a, button') ?? el;

    const run = () => {
      cancel.current?.();
      cancel.current = scramble(el, text);
    };
    const stop = () => {
      cancel.current?.();
      cancel.current = null;
    };

    host.addEventListener('pointerenter', run);
    host.addEventListener('pointerleave', stop);
    host.addEventListener('focus', run);
    host.addEventListener('blur', stop);
    return () => {
      host.removeEventListener('pointerenter', run);
      host.removeEventListener('pointerleave', stop);
      host.removeEventListener('focus', run);
      host.removeEventListener('blur', stop);
      stop();
    };
  }, [text]);

  return (
    <span ref={ref} className={className}>
      {text}
    </span>
  );
}
