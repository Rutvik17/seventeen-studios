'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';

interface RevealProps {
  children: ReactNode;
  /** Rendered element. Defaults to a div. */
  as?: ElementType;
  className?: string;
  /** Animate direct children in sequence instead of the wrapper itself. */
  stagger?: boolean;
  /** Seconds between staggered children. */
  interval?: number;
  delay?: number;
  /** Travel distance in pixels. */
  distance?: number;
  /** ScrollTrigger start position. */
  start?: string;
  id?: string;
}

/**
 * Scroll-triggered entrance.
 *
 * The hidden state is applied by JavaScript rather than CSS so that content
 * remains visible if the bundle never executes — a reveal animation should
 * never be able to hide content permanently. Reduced-motion visitors get the
 * content immediately with no transform at all.
 */
export function Reveal({
  children,
  as: Tag = 'div',
  className,
  stagger = false,
  interval = 0.09,
  delay = 0,
  distance = 46,
  start = 'top 86%',
  id,
}: RevealProps) {
  const ref = useRef<HTMLElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const targets = stagger ? Array.from(el.children) : [el];
    if (targets.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: distance });
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 1,
        delay,
        ease: 'power3.out',
        stagger: stagger ? interval : 0,
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, interval, delay, distance, start]);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={className}
      id={id}
    >
      {children}
    </Tag>
  );
}
