/**
 * Magnetic-button behaviour.
 *
 * Attaches to a ref and translates the element by a fraction of the cursor
 * offset from its centre, snapping back with an elastic ease on leave.
 */

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';

interface Options {
  /** Multiplier for how strongly the element follows the cursor. */
  strength?: number;
  /** Duration of the follow tween. */
  durationIn?: number;
  /** Duration of the elastic snap-back. */
  durationOut?: number;
}

export function useMagnet(
  ref: RefObject<HTMLElement>,
  { strength = 0.3, durationIn = 0.4, durationOut = 0.6 }: Options = {},
): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(el, {
        x: dx * strength,
        y: dy * strength,
        duration: durationIn,
        ease: 'power2.out',
      });
    };
    const onLeave = () => {
      gsap.to(el, {
        x: 0,
        y: 0,
        duration: durationOut,
        ease: 'elastic.out(1,0.4)',
      });
    };

    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [ref, strength, durationIn, durationOut]);
}
