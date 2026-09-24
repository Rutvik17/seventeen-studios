import type { ReactNode } from 'react';
import { DrawIn } from '@/components/DrawIn';
import { TransitionLink } from '@/components/Transition';

/**
 * A page of the sketchbook: gridded paper, a margin rule, a handwritten note at
 * the top and a title under it. Every simple page on the site is one of these,
 * so the notebook and the 404 read as leaves of the same book as the landing
 * and the founder page.
 */
export function Sheet({
  kicker,
  title,
  lead,
  back,
  children,
}: {
  kicker: string;
  title: ReactNode;
  lead?: ReactNode;
  /** A way back to the page this one belongs to — a notebook entry's to the notebook. */
  back?: { href: string; label: string };
  children?: ReactNode;
}) {
  return (
    <div className="sheet">
      <header className="sheet__head">
        {back && (
          <TransitionLink href={back.href} className="sheet__back" data-cursor={back.label}>
            <svg viewBox="0 0 34 16" aria-hidden="true">
              <path d="M32 8.4C24 7.6 13 8.3 3 8M8.5 2.2C6.4 4.4 4.6 6.2 2.4 8c2.3 1.7 4.2 3.5 6.3 5.8" />
            </svg>
            {back.label}
          </TransitionLink>
        )}
        <p className="sheet__kicker">{kicker}</p>
        <h1 className="sheet__title">{title}</h1>
        {lead && (
          <div className="sheet__lead">
            <div>{lead}</div>
            <DrawIn className="sheet__arrow" viewBox="0 0 70 60" delay={0.5}>
              <path pathLength={1} d="M4 8C24 2 44 8 50 22S46 48 36 54M28 44c2.4 4 5.4 7.2 8.4 10 3.6-2.6 7-5.6 10.6-7.4" />
            </DrawIn>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
