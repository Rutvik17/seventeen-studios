'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { splitChars, splitWords } from '@/lib/text';
import { useUi } from '@/lib/store';

interface SplitTextProps {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** Character split reads better for short display lines. */
  mode?: 'chars' | 'words';
  /** `load` waits for the preloader; `scroll` waits for the viewport. */
  trigger?: 'load' | 'scroll';
  delay?: number;
  stagger?: number;
  duration?: number;
  /** Scrub the reveal against scroll position rather than playing it once. */
  scrub?: boolean;
}

/**
 * Masked line reveal.
 *
 * The unsplit text is rendered on the server for crawlers and no-JS visitors;
 * the split happens in a layout effect and the original string is preserved on
 * `aria-label` so screen readers never hear it letter by letter.
 */
export function SplitText({
  children,
  as: Tag = 'span',
  className,
  mode = 'chars',
  trigger = 'scroll',
  delay = 0,
  stagger = 0.035,
  duration = 1.1,
  scrub = false,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const entered = useUi((state) => state.entered);
  const gate = trigger === 'load' ? entered : true;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el || !gate) return;
    if (prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const parts = mode === 'chars' ? splitChars(el) : splitWords(el);
      if (parts.length === 0) return;

      gsap.set(parts, { yPercent: 115, opacity: 0 });

      const to: gsap.TweenVars = {
        yPercent: 0,
        opacity: 1,
        duration,
        ease: 'power4.out',
        stagger,
        delay,
      };

      if (scrub) {
        to.scrollTrigger = {
          trigger: el,
          start: 'top 92%',
          end: 'bottom 55%',
          scrub: 0.8,
        };
        to.delay = 0;
      } else if (trigger === 'scroll') {
        to.scrollTrigger = { trigger: el, start: 'top 88%', once: true };
      }

      gsap.to(parts, to);
    }, el);

    return () => ctx.revert();
  }, [gate, mode, trigger, delay, stagger, duration, scrub]);

  return (
    <Tag ref={ref as React.Ref<HTMLSpanElement>} className={className}>
      {children}
    </Tag>
  );
}
