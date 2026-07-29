'use client';

/**
 * Counts from zero to the target when the figure scrolls into view.
 *
 * The final value is what the server renders, so the number is correct before
 * any script runs and for anyone with motion reduced — the animation only ever
 * replaces a correct value with the same correct value.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const target = Number.parseFloat(value);
    if (Number.isNaN(target)) return;

    const ctx = gsap.context(() => {
      const counter = { value: 0 };
      gsap.to(counter, {
        value: target,
        duration: 1.4,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onUpdate: () => {
          el.textContent = String(Math.round(counter.value));
        },
      });
      gsap.set(el, { textContent: '0' });
    }, el);

    return () => ctx.revert();
  }, [value]);

  return (
    <span className={className} ref={ref}>
      {value}
    </span>
  );
}
