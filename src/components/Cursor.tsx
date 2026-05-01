'use client';

/**
 * Custom two-part cursor.
 *
 * The `.cursor-dot` follows the mouse 1:1; the `.cursor-ring` lerps
 * behind it to give the impression of a trailing pointer. Hoverable
 * elements (`a, button, .magnetic, .work-card, ...`) toggle a
 * `.hovered` class on the ring to expand it.
 */

import { useEffect, useRef } from 'react';

export function Cursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let cx = 0;
    let cy = 0;
    let rx = 0;
    let ry = 0;
    let rafId = 0;

    const onMove = (e: MouseEvent) => {
      cx = e.clientX;
      cy = e.clientY;
    };

    const tick = () => {
      rx += (cx - rx) * 0.12;
      ry += (cy - ry) * 0.12;
      dot.style.transform = `translate(${cx}px, ${cy}px)`;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      rafId = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMove);
    rafId = requestAnimationFrame(tick);

    // Delegate hover detection to a single listener so this works for
    // elements added or removed after mount (modals, etc.).
    const HOVER_SELECTOR =
      'a, button, .magnetic, .work-card, .svc-arrow, .modal-close, .tweak-accent';
    const onOver = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(HOVER_SELECTOR)) {
        ring.classList.add('hovered');
      }
    };
    const onOut = (e: MouseEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.(HOVER_SELECTOR)) {
        ring.classList.remove('hovered');
      }
    };
    document.addEventListener('mouseover', onOver);
    document.addEventListener('mouseout', onOut);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('mouseout', onOut);
    };
  }, []);

  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      <div ref={ringRef} className="cursor-ring" aria-hidden="true" />
    </>
  );
}
