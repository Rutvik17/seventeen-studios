'use client';

/**
 * Fixed navigation bar.
 *
 * - Renders the wordmark, section links, and the "Start a project" CTA.
 * - Active link is set by ScrollTrigger on each `<section>` id (see
 *   `useEffect` below).
 * - The CTA is both magnetic (follows the cursor on hover) and runs a
 *   letter-scramble on mouseenter.
 * - Entrance animation: the `useEffect` tweens the bar in from y:-30.
 *   We keep it here rather than the Hero so the nav animates independently.
 */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { useMagnet } from '@/hooks/useMagnet';
import { scrambleText } from '@/lib/gsap-animations';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { useLoaderStore } from '@/lib/loader-store';

const LINKS: Array<{ href: string; label: string }> = [
  { href: '#services', label: 'Services' },
  { href: '#work', label: 'Work' },
  { href: '#approach', label: 'Approach' },
  { href: '#contact', label: 'Contact' },
];

export function Nav() {
  const navRef = useRef<HTMLElement | null>(null);
  const ctaRef = useRef<HTMLAnchorElement | null>(null);
  useMagnet(ctaRef);

  const ready = useLoaderStore((s) => s.ready);

  // Hide the nav pre-paint so it doesn't flash over the loader curtains.
  useIsomorphicLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    gsap.set(nav, { y: -30, opacity: 0 });
  }, []);

  // Entrance fires when the loader signals ready (mid-curtain-exit).
  useEffect(() => {
    if (!ready) return;
    const nav = navRef.current;
    if (!nav) return;
    const ctx = gsap.context(() => {
      gsap.to(nav, {
        y: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power3.out',
      });
    }, nav);
    return () => ctx.revert();
  }, [ready]);

  // Active-section highlighting — independent of the loader.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const triggers: ScrollTrigger[] = [];
    document.querySelectorAll<HTMLElement>('section[id]').forEach((sec) => {
      const st = ScrollTrigger.create({
        trigger: sec,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: ({ isActive }) => {
          const link = nav.querySelector<HTMLAnchorElement>(
            `a[href="#${sec.id}"]`,
          );
          if (link) link.classList.toggle('active', isActive);
        },
      });
      triggers.push(st);
    });
    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, []);

  // Letter-scramble on the CTA (reset handled on mouseleave via listener).
  useEffect(() => {
    const el = ctaRef.current?.querySelector<HTMLSpanElement>(
      '[data-scramble-target]',
    );
    if (!el) return;
    const original = el.textContent ?? '';
    const onEnter = () => scrambleText(el, original);
    el.addEventListener('mouseenter', onEnter);
    return () => {
      el.removeEventListener('mouseenter', onEnter);
    };
  }, []);

  return (
    <nav ref={navRef} className="nav">
      <a href="#hero" className="nav-logo">
        SEVENTEEN<span>.</span>
      </a>
      <ul className="nav-links">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href}>{l.label}</a>
          </li>
        ))}
      </ul>
      <a ref={ctaRef} href="#contact" className="nav-cta magnetic">
        <span data-scramble-target>Start a project</span>
      </a>
    </nav>
  );
}
