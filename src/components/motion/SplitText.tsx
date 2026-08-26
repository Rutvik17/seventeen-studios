'use client';

import { useRef, type ElementType, type ReactNode } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { splitChars, splitWords } from '@/lib/text';
import { useUi } from '@/lib/store';
import { onceInView } from '@/lib/inview';

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
  /**
   * Rotate each part up from the page plane instead of sliding it. Reads as
   * type physically hinging into place; used on display headings.
   */
  depth?: boolean;
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
  depth = false,
}: SplitTextProps) {
  const ref = useRef<HTMLElement>(null);
  const entered = useUi((state) => state.entered);
  const gate = trigger === 'load' ? entered : true;

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;

    let stop: (() => void) | undefined;

    // The split and the hidden state are applied on mount, *before* the gate
    // opens. Deferring them until the preloader finished meant the finished
    // text painted for a few frames, then snapped back to hidden and animated
    // in — the page appeared to land twice.
    const ctx = gsap.context(() => {
      const parts = mode === 'chars' ? splitChars(el) : splitWords(el);
      if (parts.length === 0) return;

      if (depth) {
        // A shared perspective on the container makes the parts rotate as one
        // plane rather than each having its own vanishing point.
        el.style.perspective = '900px';
        el.style.transformStyle = 'preserve-3d';
        gsap.set(parts, {
          yPercent: 120,
          opacity: 0,
          rotationX: -78,
          transformOrigin: '50% 0% -0.35em',
        });
      } else {
        gsap.set(parts, { yPercent: 115, opacity: 0 });
      }

      /*
        DROP THE COMPOSITING HINT ONCE THE REVEAL IS OVER.

        `.word` carries `will-change: transform`, which is the correct thing to
        have DURING a tween and a permanent cost afterwards: it promotes every
        word on the page to its own compositing layer, forever.

        That is what hid the founder page's closing heading. The heading paints
        a gradient clipped to its own text — `background-clip: text` with a
        transparent fill — and WebKit does not paint a parent's clipped
        background through a promoted descendant layer. The words were present,
        selectable, read by screen readers, and completely invisible, which is
        exactly what was reported: "I can only see it if I highlight it."

        The residual identity transform goes too. `matrix(1,0,0,1,0,0)` is not
        nothing — it still establishes a containing block and can hold the layer
        open on its own.

        Only for one-shot reveals. A scrubbed tween's transform IS a function of
        scroll position and must stay live.
      */
      const settle = () => {
        for (const part of parts) {
          const node = part as HTMLElement;
          node.style.willChange = 'auto';
          node.style.transform = 'none';
        }
      };

      const to: gsap.TweenVars = {
        yPercent: 0,
        opacity: 1,
        duration,
        ease: 'power4.out',
        stagger,
        delay,
        onComplete: settle,
      };

      if (depth) to.rotationX = 0;

      // Held hidden until the preloader hands over.
      if (!gate) return;

      /*
        Scrubbed reveals stay on ScrollTrigger — they ARE a function of scroll
        position, which is what it is for.

        The one-shot reveal does not. It only needs to know whether the text has
        appeared, and asking the browser that directly is both simpler and
        immune to the failure that hid this site's closing heading on a phone.
        See `lib/inview.ts`.
      */
      if (scrub) {
        to.scrollTrigger = {
          trigger: el,
          start: 'top 92%',
          end: 'bottom 55%',
          scrub: 0.8,
        };
        to.delay = 0;
        // A scrubbed transform is driven by scroll and never finished, so it
        // keeps both the hint and the transform.
        delete to.onComplete;
        gsap.to(parts, to);
        return;
      }

      if (trigger === 'scroll') {
        const tween = gsap.to(parts, { ...to, paused: true });
        stop = onceInView(el, () => tween.play());
        return;
      }

      gsap.to(parts, to);
    }, el);

    return () => {
      stop?.();
      ctx.revert();
    };
  }, [gate, mode, trigger, delay, stagger, duration, scrub, depth]);

  return (
    <Tag ref={ref as React.Ref<HTMLSpanElement>} className={className}>
      {children}
    </Tag>
  );
}
