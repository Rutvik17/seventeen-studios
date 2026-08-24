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
import { whenSettled } from '@/lib/settled';
import { LoaderScreen } from '@/components/loader/LoaderScreen';

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
  const markRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef({ value: 0 });
  const [covering, setCovering] = useState(false);
  const [progress, setProgress] = useState(0);
  const pendingRef = useRef<string | null>(null);

  const navigate = useCallback<NavigateFn>(
    (href) => {
      /*
        A LINK TO THE PAGE YOU ARE ALREADY ON STILL HAS TO DO SOMETHING.

        This used to `return` here, and `TransitionLink` has already called
        `preventDefault()` by the time it does — so the click was swallowed whole.
        In the header that reads as a dead link; in the full-screen index it
        reads as a broken app, because the overlay is still sitting there and
        nothing you press will move it.

        Scrolling back to the top is what the rest of the web does with a
        self-referential link, and it is honest: you asked for this page, and
        this is the top of it. Overlays close themselves — see `MenuOverlay`,
        which no longer waits for a route change that is not coming.
      */
      if (href === pathname) {
        const lenis = getLenis();
        if (lenis) lenis.scrollTo(0);
        else window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      if (prefersReducedMotion() || !curtainRef.current) {
        router.push(href);
        return;
      }

      pendingRef.current = href;
      setCovering(true);

      /*
        The counter climbs while the curtain closes, but only to 86.

        There is no byte count to report during a route change, and running a
        number to 100 on a timer would be a lie of exactly the kind the loader
        was built to avoid — it would hit 100 and then sit there while the page
        was still mounting. It stops short instead, and the last stretch is spent
        when the new route has actually committed and the thread has come back.
        The number reaching 100 is a real event.
      */
      setProgress(0);
      gsap.killTweensOf(counterRef.current);
      counterRef.current.value = 0;
      gsap.to(counterRef.current, {
        value: 86,
        duration: 1.1,
        ease: 'power2.out',
        onUpdate: () => setProgress(counterRef.current.value),
      });

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

  /*
    Uncover once the new route has committed AND the thread is free.

    Not on a delay. A heavy route — `/founder/` mounts an R3F canvas and parses a
    2.1 MB model — blocks the main thread for most of a second, and with
    `lagSmoothing(0)` the tick after that stall advances this timeline by more
    than its own duration. It ran to completion in one frame: the curtain did not
    lift, it disappeared, and the page arrived with no transition. Measured at
    764 ms on the worst frame.

    `whenSettled` holds the curtain up until frames are arriving on time again,
    which is exactly what a curtain is for.
  */
  useEffect(() => {
    if (!covering || !curtainRef.current) return;

    let timeline: gsap.core.Timeline | null = null;

    const cancel = whenSettled(() => {
      const curtain = curtainRef.current;
      if (!curtain) return;
      const columns = curtain.querySelectorAll('.curtain__col');

      timeline = gsap.timeline({
        onComplete: () => {
          setCovering(false);
          pendingRef.current = null;
          gsap.set(curtain, { pointerEvents: 'none' });
          ScrollTrigger.refresh();
        },
      });

      timeline
        // The page is ready. Spend the last of the counter, then leave.
        .to(counterRef.current, {
          value: 100,
          duration: 0.3,
          ease: 'power2.out',
          onUpdate: () => setProgress(counterRef.current.value),
        })
        .to(markRef.current, { opacity: 0, duration: 0.2, ease: 'power2.in' }, '-=0.1')
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
    });

    return () => {
      cancel();
      timeline?.kill();
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
        <div className="curtain__mark" ref={markRef}>
          <LoaderScreen progress={progress} />
        </div>
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
