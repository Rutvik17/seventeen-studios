'use client';

/**
 * Scroll-triggered reveal wrappers.
 *
 * - `<RevealUp>` animates y:50 → 0, opacity:0 → 1 once its trigger hits
 *   the 88% viewport mark.
 * - `<RevealStagger>` staggers the animation across its immediate children.
 * - `<RevealWords>` re-splits its text into words and tweens each one.
 *
 * Each wrapper renders a DOM element (defaulting to `<div>`) so callers
 * can pick the semantic tag. This is a more pragmatic alternative to
 * cloneElement-based ref injection and keeps the animation target
 * unambiguous.
 */

import {
  useEffect,
  useRef,
  type ElementType,
  type ReactNode,
  type HTMLAttributes,
} from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { splitWords } from '@/lib/gsap-animations';

type RevealProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  children: ReactNode;
};

type RevealStaggerProps = RevealProps & {
  /**
   * Optional CSS selector for the elements to animate. When set, the
   * stagger targets descendants matching this selector instead of the
   * direct children — useful when the cells themselves should stay
   * visible (so their bg/grid frame doesn't pop in) and only the
   * inner content fades up. Example: ".cap-title, .cap-body".
   */
  staggerTarget?: string;
};

function useRevealUp(ref: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      gsap.from(el, {
        y: 50,
        opacity: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      });
    }, el);
    return () => {
      ctx.revert();
    };
  }, [ref]);
}

export function RevealUp({ as: Tag = 'div', children, ...rest }: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  useRevealUp(ref);
  const Component = Tag as ElementType;
  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
}

export function RevealStagger({
  as: Tag = 'div',
  children,
  staggerTarget,
  ...rest
}: RevealStaggerProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const targets: Element[] | HTMLCollection = staggerTarget
        ? Array.from(el.querySelectorAll(staggerTarget))
        : el.children;
      if ('length' in targets && targets.length === 0) return;
      gsap.from(targets, {
        y: 50,
        opacity: 0,
        duration: 0.9,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    }, el);
    return () => {
      ctx.revert();
    };
  }, [staggerTarget]);

  const Component = Tag as ElementType;
  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
}

export function RevealWords({
  as: Tag = 'div',
  children,
  ...rest
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ctx = gsap.context(() => {
      const words = splitWords(el);
      gsap.from(words, {
        y: '105%',
        opacity: 0,
        duration: 1,
        stagger: 0.07,
        ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    }, el);
    return () => {
      ctx.revert();
      ScrollTrigger.refresh();
    };
  }, []);

  const Component = Tag as ElementType;
  return (
    <Component ref={ref} {...rest}>
      {children}
    </Component>
  );
}

/** Accent-coloured section label with the leading 32×1px rule. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return <div className="section-label">{children}</div>;
}
