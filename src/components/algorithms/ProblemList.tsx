'use client';

/**
 * The list of problems down the left: every problem, grouped by the pattern
 * it teaches, each with a dot for how hard it is. A search box narrows it.
 * The open problem is marked and scrolled into view.
 *
 * On a narrow screen the list is a drawer, opened from a button at the top of
 * the page and closed by choosing a problem.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Algorithms.module.css';

interface Group {
  slug: string;
  title: string;
  problems: { slug: string; title: string; difficulty: 'Easy' | 'Medium' | 'Hard' }[];
}

export function ProblemList({ groups }: { groups: Group[] }) {
  const pathname = usePathname();
  const current = pathname.replace(/\/$/, '').split('/').pop() ?? '';
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const total = groups.reduce((s, g) => s + g.problems.length, 0);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return groups;
    return groups.map((g) => ({ ...g, problems: g.problems.filter((p) => p.title.toLowerCase().includes(t) || g.title.toLowerCase().includes(t)) })).filter((g) => g.problems.length);
  }, [groups, q]);

  // Keep the open problem in view in the list.
  useEffect(() => {
    const el = list.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!el || !list.current) return;
    const box = list.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (r.top < box.top + 60 || r.bottom > box.bottom - 20) list.current.scrollTop += r.top - box.top - box.height / 3;
  }, [current]);

  useEffect(() => setOpen(false), [pathname]);

  const now = groups.flatMap((g) => g.problems).find((p) => p.slug === current);

  return (
    <>
      <button type="button" className={styles.drawerButton} onClick={() => setOpen(true)} aria-expanded={open}>
        <span>☰</span> {now ? now.title : 'All problems'}
      </button>
      <nav className={`${styles.list} ${open ? styles.listOpen : ''}`} aria-label="Problems">
        <div className={styles.listHead}>
          <Link href="/algorithms/" className={styles.listTitle} prefetch={false}>
            Algorithms <span>{total}</span>
          </Link>
          <button type="button" className={styles.drawerClose} onClick={() => setOpen(false)} aria-label="Close the list">
            ✕
          </button>
          <input className={styles.search} type="search" placeholder="Find a problem…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Find a problem" />
        </div>
        <div className={styles.listBody} ref={list} data-lenis-prevent>
          {shown.map((g) => (
            <section key={g.slug} className={styles.group}>
              <h2 className={styles.groupTitle}>
                {g.title} <span>{g.problems.length}</span>
              </h2>
              <ol>
                {g.problems.map((p) => (
                  <li key={p.slug}>
                    <Link href={`/algorithms/${p.slug}/`} prefetch={false} className={styles.item} aria-current={p.slug === current ? 'page' : undefined}>
                      <i className={styles[p.difficulty.toLowerCase()]} aria-label={p.difficulty} title={p.difficulty} />
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {!shown.length && <p className={styles.none}>No problem matches “{q}”.</p>}
        </div>
      </nav>
      {open && <button type="button" className={styles.scrim} aria-label="Close the list" onClick={() => setOpen(false)} />}
    </>
  );
}
