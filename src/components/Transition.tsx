'use client';

/**
 * Page transitions.
 *
 * Internal navigation is routed through `useNavigate()` so a curtain can cover
 * the viewport *before* the route changes, rather than after — the difference
 * between a deliberate transition and a flash. The curtain is four columns
 * that sweep up in sequence, with the studio mark riding the last one.
 *
 * Reduced-motion visitors and modifier-clicks (new tab, middle click) bypass
 * the whole mechanism and navigate normally.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { gsap, ScrollTrigger, prefersReducedMotion } from '@/lib/gsap';
import { getLenis } from '@/lib/lenis';

const COLUMNS = 4;

type NavigateFn = (href: string) => void;
const NavigateContext = createContext<NavigateFn>(() => {});

export function useNavigate(): NavigateFn {
  return useContext(NavigateContext);
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const curtainRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const [covering, setCovering] = useState(false);
  const pendingRef = useRef<string | null>(null);

  const navigate = useCallback<NavigateFn>(
    (href) => {
      if (href === pathname) return;

      if (prefersReducedMotion() || !curtainRef.current) {
        router.push(href);
        return;
      }

      pendingRef.current = href;
      setCovering(true);

      const columns = curtainRef.current.querySelectorAll('.curtain__col');
      gsap.killTweensOf([columns, markRef.current]);
      gsap
        .timeline({
          onComplete: () => {
            // Jump to the top while the screen is covered so the new page
            // never appears mid-scroll.
            getLenis()?.scrollTo(0, { immediate: true });
            window.scrollTo(0, 0);
            router.push(pendingRef.current ?? href);
          },
        })
        .set(curtainRef.current, { pointerEvents: 'auto' })
        // `y: 0` clears the CSS `translateY(100%)` that GSAP would otherwise
        // resolve to a pixel offset and stack under `yPercent`.
        .fromTo(
          columns,
          { yPercent: 100, y: 0 },
          {
            yPercent: 0,
            duration: 0.55,
            ease: 'power4.inOut',
            stagger: 0.055,
          },
        )
        .fromTo(
          markRef.current,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
          '-=0.25',
        );
    },
    [pathname, router],
  );

  // Uncover once the new route has committed.
  useEffect(() => {
    if (!covering || !curtainRef.current) return;

    const columns = curtainRef.current.querySelectorAll('.curtain__col');
    const timeline = gsap.timeline({
      delay: 0.08,
      onComplete: () => {
        setCovering(false);
        pendingRef.current = null;
        gsap.set(curtainRef.current, { pointerEvents: 'none' });
        ScrollTrigger.refresh();
      },
    });

    timeline
      .to(markRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' })
      .to(
        columns,
        {
          yPercent: -100,
          y: 0,
          duration: 0.6,
          ease: 'power4.inOut',
          stagger: 0.05,
        },
        '-=0.1',
      );

    return () => {
      timeline.kill();
    };
    // Runs on pathname change only — `covering` is read, not depended on.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <NavigateContext.Provider value={navigate}>
      {children}
      <div className="curtain" ref={curtainRef} aria-hidden="true">
        {Array.from({ length: COLUMNS }).map((_, index) => (
          <div className="curtain__col" key={index} />
        ))}
        <span className="curtain__mark" ref={markRef}>
          17
        </span>
      </div>
    </NavigateContext.Provider>
  );
}

/**
 * Drop-in replacement for `next/link` that plays the curtain. Falls back to a
 * normal link for external URLs, hash targets and modified clicks.
 */
export function TransitionLink({
  href,
  children,
  className,
  onClick,
  ...rest
}: {
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
} & Omit<React.ComponentPropsWithoutRef<'a'>, 'href' | 'onClick'>) {
  const navigate = useNavigate();
  const external = /^(https?:|mailto:|tel:)/.test(href);

  if (external) {
    return (
      <a
        href={href}
        className={className}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noreferrer noopener' : undefined}
        onClick={onClick}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.();
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }
    event.preventDefault();
    navigate(href);
  };

  return (
    <Link href={href} className={className} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
