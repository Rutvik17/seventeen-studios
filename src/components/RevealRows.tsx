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
 * How much of the LINE BOX shows at rest, as a fraction of the font size.
 *
 * The line box is about 1.16 here, so anything below that clips — and the clip
 * is the whole gesture. Half-leading puts the cap-tops at roughly 0.08 and the
 * baseline at roughly 0.83, so 0.8 cuts just above the baseline: the letters
 * lose their feet and stay readable, which is what "tucked into an envelope"
 * actually looks like.
 *
 * Walked out four times. 0.6 was a band of fragments; 0.72 was words you could
 * almost make out; 0.9 combined with padding below stopped clipping ENTIRELY
 * and the effect disappeared.
 */
const SHOW = 0.8;

/**
 * Space above the type, as a fraction of the font size.
 *
 * ABOVE ONLY, and that is the correction. The previous version padded both
 * sides, which made the row taller than the line box needed — so the bottom of
 * every letter fitted comfortably inside and nothing was cut. Air below and a
 * tuck are mutually exclusive: the row's bottom edge IS the cut.
 *
 * So the rhythm comes from the gap between one row's severed letters and the
 * next row's letter-tops, which is exactly the space an envelope's edge leaves.
 */
const AIR = 0.3;

/** Resting height of a row, in pixels, for a given font size. */
const closedHeight = (fontSize: number) => fontSize * (AIR + SHOW);

export function RevealRows({
  rows,
  cursor = 'Open',
}: {
  rows: RevealRow[];
  cursor?: string;
}) {
  const root = useRef<HTMLUListElement>(null);
  /**
   * Rows sit open, unclipped and wrapping instead of tucking.
   *
   * Two conditions, one treatment. Reduced motion is the obvious one. The other
   * is a device with no hover: the tuck is opened BY hovering, and this
   * component deliberately ignores non-mouse pointers (see the pointermove
   * handler), so on a phone a row could never open at all — every title stayed
   * truncated mid-word behind an ellipsis, which on the notebook index meant
   * the reader could not tell one lesson from another.
   */
  const [staticRows, setStaticRows] = useState(false);
  const active = useRef<string | null>(null);
  /** Last known mouse position, so hover can be re-derived after a scroll. */
  const pointer = useRef<{ x: number; y: number } | null>(null);

  useIsomorphicLayoutEffect(() => {
    setStaticRows(
      prefersReducedMotion() ||
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches,
    );
  }, []);

  const open = useCallback(
    (id: string | null) => {
      if (staticRows) return;
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
        // The floor allows for a full line box plus its descenders. Measuring
        // alone is not enough on the first frame after a font swaps in, when
        // `scrollHeight` can briefly report the fallback's metrics.
        // The floor allows for a full line box plus its descenders and the
        // breathing room. Measuring alone is not enough on the first frame
        // after a font swaps in, when `scrollHeight` can briefly report the
        // fallback's metrics.
        // Open, the row has to clear a full line box plus the air above it and
        // the descenders below. Measuring alone is not enough on the first
        // frame after a font swaps in, when `scrollHeight` can briefly report
        // the fallback's metrics.
        const target = isOpen
          ? Math.max(link?.scrollHeight ?? 0, fontSize * (AIR + 1.16 + 0.08))
          : closedHeight(fontSize);

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
    [staticRows, rows],
  );

  useIsomorphicLayoutEffect(() => {
    if (staticRows) return;
    const el = root.current;
    if (!el) return;

    // Hidden state by JS, never CSS (rule 4): with no bundle the rows stand
    // open and readable rather than clipped to a sliver forever.
    const ctx = gsap.context(() => {
      rows.forEach((row) => {
        const node = el.querySelector<HTMLElement>(`[data-row="${row.id}"]`);
        if (!node) return;
        const fontSize = parseFloat(getComputedStyle(node).fontSize) || 48;
        gsap.set(node, { height: closedHeight(fontSize) });
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

    /*
      HOVER HAS TO BE RE-DERIVED DURING SCROLL, and this is not a nicety.

      `pointerenter` and `pointerleave` fire on pointer MOVEMENT. Scrolling moves
      the page under a stationary cursor, so rows slide beneath it and not a
      single event is dispatched — the row under the pointer stays closed, and it
      stays closed after the scroll stops too, until the mouse is nudged. Every
      hover-driven list on the web has this bug; most ship with it.

      The fix is to stop treating hover as an event and treat it as a QUERY: keep
      the last pointer position, and whenever the page moves, ask what is under
      it now.

      Throttled to one animation frame. `elementFromPoint` forces a layout flush,
      and scroll can fire far more often than the screen refreshes, so calling it
      per event would be doing the same expensive work several times for one
      painted frame.
    */
    let queued = false;
    const syncHover = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        const point = pointer.current;
        if (!point) return;
        const under = document.elementFromPoint(point.x, point.y);
        const row = under?.closest('[data-row]') ?? null;
        // Only this list's rows. Another `RevealRows` on the same page must not
        // be able to drive this one's state.
        const mine = row && el.contains(row) ? row.getAttribute('data-row') : null;
        open(mine);
      });
    };

    const onPointerMove = (e: PointerEvent) => {
      // Mouse only. A touch leaves its last position behind for good, which
      // would pin a row open long after the finger was lifted.
      if (e.pointerType !== 'mouse') return;
      pointer.current = { x: e.clientX, y: e.clientY };
    };
    const forgetPointer = () => {
      pointer.current = null;
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerleave', forgetPointer);
    window.addEventListener('blur', forgetPointer);
    window.addEventListener('scroll', syncHover, { passive: true });

    return () => {
      ctx.revert();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerleave', forgetPointer);
      window.removeEventListener('blur', forgetPointer);
      window.removeEventListener('scroll', syncHover);
    };
  }, [staticRows, rows, open]);

  return (
    <ul
      className={`rows${staticRows ? ' rows--static' : ''}`}
      ref={root}
      /* Kept alongside the scroll-driven hit test: this fires on the very
         first hover, before any scroll has happened to trigger a sync. */
      onPointerLeave={() => open(null)}
    >
      {rows.map((row) => (
        <li
          key={row.id}
          data-row={row.id}
          className="rows__row"
          style={
            staticRows ? ({ '--row-color': row.color } as React.CSSProperties) : undefined
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
