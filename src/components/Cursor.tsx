'use client';

/**
 * Custom cursor: an exact-tracking dot, a lagging ring, and a contextual
 * label driven by `data-cursor="…"` on whatever is hovered.
 *
 * Only mounts on fine-pointer devices with motion enabled; everything falls
 * back to the native cursor otherwise (and `cursor: none` is applied by the
 * same class so touch users never lose their pointer).
 */

import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { CURSOR_RESET_EVENT } from '@/lib/cursor';

const HOVER_SELECTOR = 'a, button, [data-cursor], input, textarea, select';

export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!dot || !ring || !label) return;

    document.documentElement.classList.add('has-custom-cursor');

    const dotX = gsap.quickSetter(dot, 'x', 'px');
    const dotY = gsap.quickSetter(dot, 'y', 'px');
    const ringX = gsap.quickTo(ring, 'x', { duration: 0.36, ease: 'power3.out' });
    const ringY = gsap.quickTo(ring, 'y', { duration: 0.36, ease: 'power3.out' });

    let visible = false;
    let hovered: Element | null = null;

    const clear = () => {
      hovered = null;
      ring.classList.remove('is-active', 'is-labelled');
      label.textContent = '';
    };

    /**
     * The hover state is derived from whatever is under the pointer, not
     * accumulated from over/out pairs. `pointerout` does not fire when the
     * hovered element is removed from the document, so a dialog closed from its
     * own close button used to leave the ring stuck on that button's label —
     * deriving instead means the next pointer event always corrects it.
     */
    const applyHover = (target: Element | null) => {
      if (target === hovered) return;
      if (!target) {
        clear();
        return;
      }
      hovered = target;
      const text = target.getAttribute('data-cursor');
      ring.classList.add('is-active');
      if (text) {
        label.textContent = text;
        ring.classList.add('is-labelled');
      } else {
        ring.classList.remove('is-labelled');
        label.textContent = '';
      }
    };

    const hoverTargetOf = (event: PointerEvent) =>
      (event.target as Element | null)?.closest(HOVER_SELECTOR) ?? null;

    const onMove = (event: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { opacity: 1, duration: 0.3 });
      }
      dotX(event.clientX);
      dotY(event.clientY);
      ringX(event.clientX);
      ringY(event.clientY);
      applyHover(hoverTargetOf(event));
    };

    const onOver = (event: PointerEvent) => applyHover(hoverTargetOf(event));

    const onOut = (event: PointerEvent) => {
      // Only clear when leaving the element actually being tracked; moving
      // between children of one link should not flicker the ring.
      if (hoverTargetOf(event) === hovered) clear();
    };

    const onLeaveWindow = () => {
      visible = false;
      gsap.to([dot, ring], { opacity: 0, duration: 0.2 });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver);
    window.addEventListener('pointerout', onOut);
    window.addEventListener(CURSOR_RESET_EVENT, clear);
    document.addEventListener('pointerleave', onLeaveWindow);

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener(CURSOR_RESET_EVENT, clear);
      document.removeEventListener('pointerleave', onLeaveWindow);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true">
      <div className="cursor-dot" ref={dotRef} />
      <div className="cursor-ring" ref={ringRef}>
        <span className="cursor-ring__label" ref={labelRef} />
      </div>
    </div>
  );
}
