'use client';

/**
 * Velocity-reactive marquee.
 *
 * The strip loops continuously, but scroll velocity feeds its timeScale and
 * flips its direction — so the band accelerates with the page and reverses
 * when you scroll back up. It is the cheapest way to make a whole page feel
 * physically connected to the input.
 */

import { useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { onLenis } from '@/lib/lenis';

export function Marquee({
  items,
  duration = 26,
  className,
}: {
  items: readonly string[];
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    const track = el.querySelector<HTMLElement>('.marquee__track');
    if (!track) return;

    let detach = () => {};

    const ctx = gsap.context(() => {
      // Two identical halves; translating one full half loops seamlessly.
      const tween = gsap.to(track, {
        xPercent: -50,
        duration,
        ease: 'none',
        repeat: -1,
      });

      let direction = 1;
      let velocity = 0;

      const onScroll = () => {
        const nextDirection = velocity < -0.1 ? -1 : velocity > 0.1 ? 1 : direction;
        if (nextDirection !== direction) {
          direction = nextDirection;
        }
        gsap.to(tween, {
          timeScale: direction * (1 + Math.min(Math.abs(velocity) / 9, 3.4)),
          duration: 0.5,
          overwrite: true,
        });
      };

      const unsubscribe = onLenis((lenis) => {
        const handler = () => {
          velocity = lenis.velocity;
          onScroll();
        };
        lenis.on('scroll', handler);
        detach = () => lenis.off('scroll', handler);
      });

      return () => {
        unsubscribe();
        detach();
      };
    }, el);

    return () => ctx.revert();
  }, [duration]);

  const half = (key: string) => (
    <div className="marquee__half" key={key} aria-hidden={key === 'b'}>
      {items.map((item) => (
        <span className="marquee__item" key={`${key}-${item}`}>
          <i className="marquee__dot" aria-hidden="true" />
          {item}
        </span>
      ))}
    </div>
  );

  return (
    <div className={`marquee ${className ?? ''}`.trim()} ref={ref}>
      <div className="marquee__track">
        {half('a')}
        {half('b')}
      </div>
    </div>
  );
}
