'use client';

/**
 * Tucked rows.
 *
 * A stack of very large titles, each clipped so only a band through the middle
 * of the letterforms shows. Hovering one opens it to its full line height, fills
 * the row with that item's colour, and washes the whole page background to
 * match. The rest of the stack slides to make room.
 *
 * ---
 *
 * WHY IT IS `height` AND NOT `transform`
 *
 * Transform is the usual advice because it is GPU-composited and does not
 * relayout. It is the wrong tool here, and knowing when the usual advice does
 * not apply is the point: scaling a row would stretch its glyphs and, worse,
 * would not move the rows beneath it — the whole effect is that the stack makes
 * room. That requires real layout.
 *
 * The cost is bounded and known. One row animates at a time, it is a handful of
 * block-level siblings, and `contain: layout` on each row stops the relayout
 * escaping into the rest of the page.
 *
 * ---
 *
 * WHY THE CLIP IS `height` AND NOT `line-height`
 *
 * Animating `line-height` moves the glyphs relative to their box, so the type
 * appears to slide up and down inside the row. Holding line-height fixed and
 * animating the box's height keeps every letter exactly where it is and simply
 * reveals more of it, which is what "tucked in an envelope" actually looks like.
 *
 * ---
 *
 * ACCESSIBILITY
 *
 * The clip is decoration, not information: each row is a real link with its
 * full title as text, so a screen reader reads the whole thing and Ctrl-F finds
 * it. Focus opens a row exactly as hover does — `:focus-within` is on the same
 * handler — so a keyboard user is never left reading a sliver of a word.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * Every row sits open at full height, with its colour as a quiet left border
 * rather than a wash, and nothing animates on hover. All the information — the
 * titles, the groupings, the colour coding — is present; only the opening is
 * dropped.
 */

import { useCallback, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TransitionLink } from '@/components/Transition';

export type RevealRow = {
  id: string;
  /** The large type. */
  title: string;
  /** The small pill to the right of the title. */
  tag?: string;
  /** One line, revealed with the row. */
  meta?: string;
  href: string;
  /** The wash this row brings with it. */
  color: string;
  /** Ink to use on that wash — must pass contrast against `color`. */
  ink: string;
  /** Trailing marker: a status, a date, a number. */
  trail?: string;
};

export function RevealRows({
  rows,
  cursor = 'Open',
}: {
  rows: RevealRow[];
  cursor?: string;
}) {
  const root = useRef<HTMLUListElement>(null);
  const [reduced, setReduced] = useState(false);
  const active = useRef<string | null>(null);

  useIsomorphicLayoutEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  /**
   * Open one row and close the rest.
   *
   * Driven from a single handler rather than from CSS `:hover` because the page
   * wash and the row height have to move together and stay in step when the
   * pointer crosses quickly between rows — CSS transitions on separate elements
   * drift apart under fast movement and the background ends up on the wrong
   * colour.
   */
  const open = useCallback(
    (id: string | null) => {
      if (reduced) return;
      const el = root.current;
      if (!el || active.current === id) return;
      active.current = id;

      const wash = document.querySelector<HTMLElement>('[data-row-wash]');

      rows.forEach((row) => {
        const node = el.querySelector<HTMLElement>(`[data-row="${row.id}"]`);
        if (!node) return;
        const isOpen = row.id === id;
        gsap.to(node, {
          // `em`, so the open and closed heights track the responsive font size
          // rather than being pinned to whatever width the design was drawn at.
          height: isOpen ? '1.02em' : '0.6em',
          duration: 0.55,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        gsap.to(node.querySelector('[data-row-fill]'), {
          scaleX: isOpen ? 1 : 0,
          duration: 0.55,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        gsap.to(node.querySelector('[data-row-title]'), {
          color: isOpen ? row.ink : 'var(--fg)',
          x: isOpen ? 18 : 0,
          duration: 0.45,
          ease: 'power3.out',
          overwrite: 'auto',
        });
        gsap.to(node.querySelector('[data-row-meta]'), {
          autoAlpha: isOpen ? 1 : 0,
          duration: 0.35,
          overwrite: 'auto',
        });
      });

      if (wash) {
        const row = rows.find((r) => r.id === id);
        gsap.to(wash, {
          backgroundColor: row ? row.color : 'var(--bg)',
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
        });
      }
    },
    [reduced, rows],
  );

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    const el = root.current;
    if (!el) return;

    // Hidden state by JS, never CSS (rule 4): with no bundle the rows stand
    // fully open and readable rather than clipped to a sliver forever.
    const ctx = gsap.context(() => {
      rows.forEach((row) => {
        const node = el.querySelector<HTMLElement>(`[data-row="${row.id}"]`);
        if (!node) return;
        gsap.set(node, { height: '0.6em' });
        gsap.set(node.querySelector('[data-row-fill]'), {
          scaleX: 0,
          transformOrigin: 'left center',
        });
        gsap.set(node.querySelector('[data-row-meta]'), { autoAlpha: 0 });
      });
    }, el);

    return () => ctx.revert();
  }, [reduced, rows]);

  return (
    <ul
      className={`rows${reduced ? ' rows--static' : ''}`}
      ref={root}
      onPointerLeave={() => open(null)}
    >
      {rows.map((row) => (
        <li
          key={row.id}
          data-row={row.id}
          className="rows__row"
          style={
            reduced
              ? ({ '--row-color': row.color } as React.CSSProperties)
              : undefined
          }
          onPointerEnter={() => open(row.id)}
          onFocus={() => open(row.id)}
        >
          <span data-row-fill className="rows__fill" style={{ background: row.color }} />
          <TransitionLink href={row.href} className="rows__link" data-cursor={cursor}>
            <span data-row-title className="rows__title">
              {row.title}
            </span>
            {row.tag && <span className="rows__tag">{row.tag}</span>}
            <span data-row-meta className="rows__meta" style={{ color: row.ink }}>
              {row.meta}
            </span>
            {row.trail && (
              <span className="rows__trail" style={reduced ? undefined : { color: 'inherit' }}>
                {row.trail}
              </span>
            )}
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * The full-page wash the rows tint.
 *
 * Fixed and behind everything, so the colour reaches the edges of the viewport
 * rather than stopping at the list. Rendered once by whichever page uses
 * `RevealRows`; the component finds it by attribute rather than by prop so the
 * two do not have to be siblings.
 */
export function RowWash() {
  return <div data-row-wash className="rows__wash" aria-hidden="true" />;
}
