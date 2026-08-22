'use client';

/**
 * Tucked rows.
 *
 * A stack of very large titles, each clipped so a band through the middle of
 * the letterforms shows. Hovering one opens it to its full height, fills the
 * row edge-to-edge with that item's colour, and washes the page to match. The
 * rest of the stack slides to make room.
 *
 * ---
 *
 * WHY IT IS `height` AND NOT `transform`
 *
 * Transform is the usual advice because it is GPU-composited and skips layout.
 * It is the wrong tool here, and knowing when the usual advice does not apply is
 * the point: scaling a row would stretch its glyphs and — fatally — would not
 * move the rows beneath it. The entire effect is that the stack makes room, and
 * that requires real layout.
 *
 * The cost is bounded: one row animates at a time, they are block-level
 * siblings, and `contain: layout paint` stops the relayout escaping the list.
 *
 * ---
 *
 * WHY THE OPEN HEIGHT IS MEASURED RATHER THAN A CONSTANT
 *
 * A long title has to be allowed to wrap onto a second line when it opens, and
 * how many lines that takes depends on the title, the viewport and the font —
 * none of which are known when the CSS is written. So the row switches the title
 * to wrapping, measures what the content actually needs, and animates to that.
 *
 * Closed, the title is a single ellipsised line. A title that is cut off at rest
 * and complete on hover is the correct trade: the clip is the whole gesture, and
 * an ellipsis is how you say "there is more" without breaking it.
 *
 * ---
 *
 * ACCESSIBILITY
 *
 * The clip is decoration, not information — each row is a real link carrying its
 * full title as text, so a screen reader reads all of it and Ctrl-F finds it.
 * Focus opens a row exactly as hover does, so a keyboard user is never left
 * reading a sliver of a word.
 *
 * ---
 *
 * REDUCED MOTION
 *
 * Every row sits open at its natural height, colour shown as a quiet left
 * border rather than a wash, and nothing animates. All the information survives;
 * only the opening is dropped.
 */

import { useCallback, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TransitionLink } from '@/components/Transition';

export type RevealRow = {
  id: string;
  title: string;
  tag?: string;
  meta?: string;
  href: string;
  color: string;
  ink: string;
  trail?: string;
};

/**
 * How much of the letterform shows at rest, as a fraction of the font size.
 *
 * 0.6 was too little — the titles read as a band of fragments rather than as
 * words you could almost make out, which is the effect being aimed at. 0.72
 * shows enough of the x-height to recognise the word while still obviously
 * withholding something.
 */
const CLOSED = 0.72;

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
        const link = node.querySelector<HTMLElement>('[data-row-link]');
        const isOpen = row.id === id;
        const fontSize = parseFloat(getComputedStyle(node).fontSize) || 48;

        // The class flips the title between one ellipsised line and wrapping,
        // and must be applied BEFORE measuring or the measurement is of the
        // state we are leaving.
        node.classList.toggle('is-open', isOpen);
        const target = isOpen
          ? Math.max(link?.scrollHeight ?? 0, fontSize * 1.02)
          : fontSize * CLOSED;

        gsap.to(node, {
          height: target,
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
    // open and readable rather than clipped to a sliver forever.
    const ctx = gsap.context(() => {
      rows.forEach((row) => {
        const node = el.querySelector<HTMLElement>(`[data-row="${row.id}"]`);
        if (!node) return;
        const fontSize = parseFloat(getComputedStyle(node).fontSize) || 48;
        gsap.set(node, { height: fontSize * CLOSED });
        gsap.set(node.querySelector('[data-row-fill]'), {
          scaleX: 0,
          transformOrigin: 'left center',
        });
        gsap.set(node.querySelector('[data-row-meta]'), { autoAlpha: 0 });
      });
    }, el);

    // A resize changes the font size and therefore both heights. Without this
    // the rows keep whatever pixel height they were given at the old size.
    const onResize = () => {
      const openId = active.current;
      active.current = null;
      open(openId);
    };
    window.addEventListener('resize', onResize);

    return () => {
      ctx.revert();
      window.removeEventListener('resize', onResize);
    };
  }, [reduced, rows, open]);

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
            reduced ? ({ '--row-color': row.color } as React.CSSProperties) : undefined
          }
          onPointerEnter={() => open(row.id)}
          onFocus={() => open(row.id)}
        >
          <span data-row-fill className="rows__fill" style={{ background: row.color }} />
          <TransitionLink
            href={row.href}
            className="rows__link"
            data-row-link
            data-cursor={cursor}
          >
            <span className="rows__lead">
              <span data-row-title className="rows__title">
                {row.title}
              </span>
              {row.tag && <span className="rows__tag">{row.tag}</span>}
            </span>
            <span data-row-meta className="rows__meta" style={{ color: row.ink }}>
              {row.meta}
            </span>
            {row.trail && <span className="rows__trail">{row.trail}</span>}
          </TransitionLink>
        </li>
      ))}
    </ul>
  );
}

/**
 * The full-page wash the rows tint.
 *
 * Fixed and behind everything, so the colour reaches the viewport edges rather
 * than stopping at the list. Found by attribute rather than passed as a prop, so
 * it does not have to be a sibling of the list.
 */
export function RowWash() {
  return <div data-row-wash className="rows__wash" aria-hidden="true" />;
}
