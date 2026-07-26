'use client';

import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

/**
 * Subtle 3D tilt driven by cursor position within the element.
 *
 * The rotation is deliberately small — 8 degrees is enough to read as
 * dimensional; more reads as a gimmick and hurts text legibility.
 */
export function useTilt<T extends HTMLElement>(max = 8) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const rotY = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const rotX = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3.out' });

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const px = (event.clientX - rect.left) / rect.width - 0.5;
      const py = (event.clientY - rect.top) / rect.height - 0.5;
      rotY(px * max);
      rotX(-py * (max * 0.6));
    };

    const onLeave = () => {
      gsap.to(el, {
        rotationX: 0,
        rotationY: 0,
        duration: 1.2,
        ease: 'elastic.out(1, 0.5)',
      });
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      gsap.killTweensOf(el);
    };
  }, [max]);

  return ref;
}
