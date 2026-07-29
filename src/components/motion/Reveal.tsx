'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useUi } from '@/lib/store';

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
  const entered = useUi((state) => state.entered);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const targets = stagger ? Array.from(el.children) : [el];
    if (targets.length === 0) return;

    // Content already on screen must not wait for a scroll that may never
    // come — a hero CTA one pixel below the trigger line would stay invisible
    // on arrival. Anything in the first viewport plays off the preloader
    // hand-off instead; everything else keeps its scroll trigger.
    const inFirstView = el.getBoundingClientRect().top < window.innerHeight;

    const ctx = gsap.context(() => {
      gsap.set(targets, { opacity: 0, y: distance });

      const vars: gsap.TweenVars = {
        opacity: 1,
        y: 0,
        duration: 1,
        delay,
        ease: 'power3.out',
        stagger: stagger ? interval : 0,
      };

      if (inFirstView) {
        if (!entered) return;
        gsap.to(targets, vars);
        return;
      }

      gsap.to(targets, {
        ...vars,
        scrollTrigger: { trigger: el, start, once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [stagger, interval, delay, distance, start, entered]);

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
