/**
 * Split-text hook — wraps each word of the target element in an
 * overflow-hidden span and runs a scroll-triggered reveal animation.
 *
 * Intended to be attached to any element marked visually as a "reveal-words"
 * block in the design reference (e.g. manifesto text, services title).
 */

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { splitWords } from '@/lib/gsap-animations';

export function useSplitWordsReveal(ref: RefObject<HTMLElement>): void {
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
  }, [ref]);
}
