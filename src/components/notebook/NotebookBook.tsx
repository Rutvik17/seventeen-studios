'use client';

/**
 * THE NOTEBOOK'S INDEX — a watercolour sketchbook turned by scrolling
 * (`lib/notebook/book.ts` paints and turns it).
 *
 * A tall track holds a stage the height of the screen; the stage stays put
 * while the track scrolls past it (`position: sticky` — a track and a stage),
 * and how far the track has scrolled is how far the book has turned. When a
 * spread lies open on an entry, a link to the entry lies over it.
 *
 * WITHOUT THE SCRIPT the entries are a plain list, which is also what a screen
 * reader reads; once the book has painted, the list is taken out of sight
 * (not out of the document) by the script.
 *
 * REDUCED MOTION: no scroll-driven turning. The book lies open, and two
 * buttons turn to the previous and next spread at once.
 */

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '@/lib/gsap';
import { useUi } from '@/lib/store';
import { holdLoader } from '@/lib/ready';
import { TransitionLink } from '@/components/Transition';
import { Book, type BookCopy, type BookEntry } from '@/lib/notebook/book';
import styles from './NotebookBook.module.css';

export function NotebookBook({ entries, copy }: { entries: BookEntry[]; copy: BookCopy & { label: string } }) {
  const track = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const link = useRef<HTMLDivElement>(null);
  const book = useRef<Book | null>(null);
  const entered = useUi((s) => s.entered);
  const [still, setStill] = useState(false);
  const [armed, setArmed] = useState(false);
  const [spread, setSpread] = useState(2);
  const [open, setOpen] = useState(-1);
  const introStart = useRef(0);

  useEffect(() => {
    const el = canvas.current;
    const root = track.current;
    if (!el || !root) return;
    const release = holdLoader();
    const reduced = prefersReducedMotion();
    setStill(reduced);
    let b: Book | null = null;
    let raf = 0;
    let visible = true;
    let alive = true;

    const place = () => {
      const a = link.current;
      if (!a || !b) return;
      const s = b.spread;
      const i = s - 2;
      if (i >= 0 && i < entries.length) {
        const r = b.spreadRect;
        a.style.transform = `translate(${r.x}px, ${r.y}px)`;
        a.style.width = `${r.w}px`;
        a.style.height = `${r.h}px`;
      }
      setOpen((was) => (was === i && i >= 0 ? was : i >= 0 && i < entries.length ? i : -1));
    };

    const progress = () => {
      const rect = root.getBoundingClientRect();
      const run = rect.height - window.innerHeight;
      return run > 0 ? Math.min(1, Math.max(0, -rect.top / run)) : 0;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!b) return;
      if (!reduced) {
        const start = introStart.current;
        b.setIntro(start ? (now - start) / 2200 : 0);
        b.setScroll(progress());
      }
      b.render(now);
      place();
      if (visible && alive) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf && alive) raf = requestAnimationFrame(frame);
    };

    const style = getComputedStyle(document.documentElement);
    const hand = style.getPropertyValue('--font-hand').trim() || 'cursive';
    const write = style.getPropertyValue('--font-write').trim() || 'sans-serif';
    // The book's words are written in the site's hands, so wait for them.
    void (document.fonts?.ready ?? Promise.resolve()).then(() => {
      if (!alive) return;
      b = new Book(el, entries, copy, { hand, write });
      book.current = b;
      if (reduced) {
        b.setIntro(1);
        b.setSpread(2);
      }
      b.render(performance.now());
      place();
      setArmed(true);
      release();
      kick();
    });

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible) kick();
    });
    io.observe(root);
    const onScroll = () => kick();
    window.addEventListener('scroll', onScroll, { passive: true });
    let pending = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(() => {
        b?.resize();
        kick();
      });
    });
    ro.observe(el);
    return () => {
      alive = false;
      release();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(pending);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      book.current = null;
    };
  }, [entries, copy]);

  // The cover is drawn once the loader has gone, not behind it.
  useEffect(() => {
    if (entered && !introStart.current) introStart.current = performance.now();
  }, [entered]);

  const turnTo = (s: number) => {
    const b = book.current;
    if (!b) return;
    const next = Math.max(0, Math.min(b.turnCount, s));
    setSpread(next);
    b.setSpread(next);
    b.render(performance.now());
    setOpen(next - 2 >= 0 && next - 2 < entries.length ? next - 2 : -1);
  };

  const entry = open >= 0 ? entries[open] : null;

  return (
    <section
      ref={track}
      className={styles.track}
      data-still={still ? '' : undefined}
      style={still ? undefined : { height: `${(entries.length + 2) * 120 + 60}svh` }}
      aria-label={copy.label}
    >
      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        {entry && (
          <div ref={link} className={styles.open}>
            <TransitionLink href={`/notebook/${entry.slug}/`} className={styles.hit} data-cursor="Read">
              <span className={styles.sr}>
                {entry.title} — {copy.read}
              </span>
            </TransitionLink>
          </div>
        )}
        {still && armed && (
          <div className={styles.turns}>
            <button type="button" onClick={() => turnTo(spread - 1)} disabled={spread <= 0}>
              previous page
            </button>
            <button type="button" onClick={() => turnTo(spread + 1)} disabled={spread >= entries.length + 1}>
              next page
            </button>
          </div>
        )}
      </div>
      <ol className={armed ? styles.sr : styles.list}>
        {entries.map((e) => (
          <li key={e.slug}>
            <TransitionLink href={`/notebook/${e.slug}/`}>
              {e.title} — {e.date}. {e.summary}
            </TransitionLink>
          </li>
        ))}
      </ol>
    </section>
  );
}
