/**
 * Pin-and-translate horizontal scroll for the Work section.
 *
 * The outer section is pinned to the viewport while the inner track
 * translates horizontally, driven by scroll progress. Uses GSAP
 * ScrollTrigger's `invalidateOnRefresh` so measurements are recomputed
 * after fonts/images load.
 */

import { useEffect, type RefObject } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

interface Options {
  /** Scroll-to-motion lag — larger values feel heavier. */
  scrub?: number;
  /** Extra scroll distance past the track's width. */
  endPadding?: number;
}

export function useHorizontalScroll(
  sectionRef: RefObject<HTMLElement>,
  trackRef: RefObject<HTMLElement>,
  { scrub = 1.2, endPadding = 0.5 }: Options = {},
): void {
  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;

    const ctx = gsap.context(() => {
      const getDistance = () =>
        Math.max(0, track.scrollWidth - window.innerWidth);

      gsap.to(track, {
        x: () => -getDistance(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${getDistance() + window.innerWidth * endPadding}`,
          scrub,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
        },
      });
    }, section);

    return () => {
      ctx.revert();
    };
  }, [sectionRef, trackRef, scrub, endPadding]);
}
