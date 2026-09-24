'use client';

/**
 * The cursor is a pencil.
 *
 * The site is a sketchbook, so the pointer is the thing that draws in it: a
 * pencil whose point sits exactly on the pointer. It leans the way it is being
 * moved — the top trails behind the point, as a real pencil's does when you
 * drag it across paper — and stands back up when the hand stops.
 *
 * (It used to leave a fading graphite line behind it. That read as a smear on
 * every page rather than as drawing, and it went.)
 *
 * Over anything that does something, it does what a pencil does in a
 * sketchbook: it circles it. A quick crimson loop is drawn round a link or a
 * button, the pencil lifts and leans in, and a handwritten label appears
 * beside the point when the thing has a `data-cursor`. Pressing taps the
 * pencil down. Anything long or large — a row of a list, a drawing — gets no
 * mark: the rows colour themselves in (`IndexList`), and for a drawing the
 * label says enough. (Long things used to be underlined in crimson; a red rule
 * under every row read as a warning, not a pencil.)
 *
 * It used to be a blue dot inside a lagging ring — a good cursor for an
 * instrument panel, and a stranger in a notebook.
 *
 * Only mounts on fine-pointer devices with motion enabled; everything falls
 * back to the native cursor otherwise (and `cursor: none` is applied by the
 * same class, so touch users never lose their pointer).
 */

import { useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';

const HOVER_SELECTOR = 'a, button, [data-cursor], input, textarea, select';

/** How far the pencil leans at most, degrees, and how quickly it rights itself. */
const MAX_LEAN = 24;
const SETTLE_MS = 90;
/** How long the pencil takes to circle something, milliseconds. */
const CIRCLE_MS = 380;
const MARK = 'rgb(200, 35, 63)';

/** A stable number from an element's size, so each thing is circled the same way every time. */
function seedOf(r: DOMRect): number {
  return (Math.round(r.width) * 73856093) ^ (Math.round(r.height) * 19349663);
}
function wobble(seed: number, i: number): number {
  const h = Math.imul(seed ^ (i * 2654435761), 1597334677) >>> 0;
  return (h / 4294967296) - 0.5;
}

export function Cursor() {
  const [enabled, setEnabled] = useState(false);
  const pencilRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const leanRef = useRef<HTMLSpanElement>(null);
  const marksRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const pencil = pencilRef.current;
    const label = labelRef.current;
    const lean = leanRef.current;
    const marks = marksRef.current;
    if (!pencil || !label || !lean || !marks) return;
    const ctx = marks.getContext('2d');
    if (!ctx) return;

    document.documentElement.classList.add('has-custom-cursor');

    const setX = gsap.quickSetter(pencil, 'x', 'px');
    const setY = gsap.quickSetter(pencil, 'y', 'px');
    const tilt = gsap.quickTo(lean, 'rotation', { duration: 0.5, ease: 'power3.out' });
    let lastX = 0;
    let lastT = 0;
    let settle = 0;

    let visible = false;
    let hovered: Element | null = null;
    let raf = 0;
    let dpr = 1;
    let circledAt = 0;

    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      marks.width = Math.round(window.innerWidth * dpr);
      marks.height = Math.round(window.innerHeight * dpr);
    };
    size();

    /**
     * The mark round whatever is hovered: a loose loop that overshoots its own
     * start, as a hand does — for something small enough to circle.
     */
    const circle = (now: number) => {
      if (!hovered) return false;
      const r = hovered.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      const u = Math.min(1, (now - circledAt) / CIRCLE_MS);
      const p = 1 - (1 - u) ** 3;
      const seed = seedOf(r);
      ctx.strokeStyle = MARK;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (r.width > 420 || r.height > 130) return false;
      for (let pass = 0; pass < 2; pass += 1) {
        ctx.globalAlpha = pass ? 0.35 : 0.85;
        ctx.lineWidth = pass ? 1 : 1.7;
        ctx.beginPath();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const rx = r.width / 2 + 12;
        const ry = r.height / 2 + 9;
        const start = -2.5 + wobble(seed, 99) * 0.6;
        const turn = Math.PI * 2 * 1.1 * p;
        const steps = 48;
        for (let i = 0; i <= steps; i += 1) {
          const a = start + (turn * i) / steps;
          const k = 1 + wobble(seed + pass * 7, i) * 0.06 + (i / steps) * 0.05;
          const x = cx + Math.cos(a) * rx * k + pass * 1.5;
          const y = cy + Math.sin(a) * ry * k - pass;
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      return true;
    };

    /* One frame of the mark round whatever is hovered; the loop stops when nothing is. */
    const paint = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, marks.width, marks.height);
      raf = circle(performance.now()) ? requestAnimationFrame(paint) : 0;
    };

    const clear = () => {
      hovered = null;
      pencil.classList.remove('is-active', 'is-labelled', 'is-pressed');
      label.textContent = '';
      if (!raf) raf = requestAnimationFrame(paint);
    };

    /**
     * The hover state is derived from whatever is under the pointer, not
     * accumulated from over/out pairs. `pointerout` does not fire when the
     * hovered element is removed from the document, so a dialog closed from its
     * own close button used to leave the cursor stuck on that button's label —
     * deriving instead means the next pointer event always corrects it.
     */
    const applyHover = (target: Element | null) => {
      if (target === hovered) return;
      if (!target) {
        clear();
        return;
      }
      hovered = target;
      circledAt = performance.now();
      if (!raf) raf = requestAnimationFrame(paint);
      const text = target.getAttribute('data-cursor');
      pencil.classList.add('is-active');
      if (text) {
        label.textContent = text;
        pencil.classList.add('is-labelled');
      } else {
        pencil.classList.remove('is-labelled');
        label.textContent = '';
      }
    };

    const hoverTargetOf = (event: PointerEvent) =>
      (event.target as Element | null)?.closest(HOVER_SELECTOR) ?? null;

    const onMove = (event: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to(pencil, { opacity: 1, duration: 0.3 });
      }
      setX(event.clientX);
      setY(event.clientY);

      // Lean against the direction of travel, in proportion to the speed.
      const now = performance.now();
      const dt = Math.max(8, now - lastT);
      const vx = ((event.clientX - lastX) / dt) * 16;
      lastX = event.clientX;
      lastT = now;
      tilt(Math.max(-MAX_LEAN, Math.min(MAX_LEAN, -vx * 1.6)));
      window.clearTimeout(settle);
      settle = window.setTimeout(() => tilt(0), SETTLE_MS);

      applyHover(hoverTargetOf(event));
    };

    const onOver = (event: PointerEvent) => applyHover(hoverTargetOf(event));

    const onOut = (event: PointerEvent) => {
      // Only clear when leaving the element actually being tracked; moving
      // between children of one link should not flicker the label.
      if (hoverTargetOf(event) === hovered) clear();
    };

    const onDown = () => pencil.classList.add('is-pressed');
    const onUp = () => pencil.classList.remove('is-pressed');

    const onLeaveWindow = () => {
      visible = false;
      tilt(0);
      gsap.to(pencil, { opacity: 0, duration: 0.2 });
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver);
    window.addEventListener('pointerout', onOut);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('resize', size);
    document.addEventListener('pointerleave', onLeaveWindow);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerout', onOut);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('resize', size);
      document.removeEventListener('pointerleave', onLeaveWindow);
      document.documentElement.classList.remove('has-custom-cursor');
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div aria-hidden="true">
      <canvas className="cursor-marks" ref={marksRef} />
      <div className="cursor-pencil" ref={pencilRef}>
        {/* Leans about the point: the wrapper's origin is the pointer. */}
        <span className="cursor-pencil__lean" ref={leanRef}>
        {/* Drawn with its point at (0, 0), so the point is the pointer. */}
        <svg className="cursor-pencil__body" viewBox="-2 -44 46 46" width="46" height="46">
          <g transform="rotate(-45)">
            {/* graphite point */}
            <path d="M0 0 L5 -2.4 L5 2.4 Z" fill="#1d1d21" />
            {/* sharpened wood */}
            <path d="M5 -2.4 L14 -5.5 L14 5.5 L5 2.4 Z" fill="#e6c89a" stroke="#1d1d21" strokeWidth="0.9" strokeLinejoin="round" />
            {/* the painted body */}
            <rect x="14" y="-5.5" width="30" height="11" fill="var(--accent)" stroke="#1d1d21" strokeWidth="0.9" />
            <line x1="14" y1="0" x2="44" y2="0" stroke="#faf3e5" strokeOpacity="0.35" strokeWidth="1.2" />
            {/* ferrule and eraser */}
            <rect x="44" y="-5.5" width="5" height="11" fill="#b9b3a2" stroke="#1d1d21" strokeWidth="0.9" />
            <rect x="49" y="-5.5" width="6" height="11" rx="2" fill="var(--accent-2)" stroke="#1d1d21" strokeWidth="0.9" />
          </g>
        </svg>
        </span>
        <span className="cursor-pencil__label" ref={labelRef} />
      </div>
    </div>
  );
}
