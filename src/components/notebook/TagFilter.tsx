'use client';

/**
 * Filter the lesson index by subject.
 *
 * ---
 *
 * WHY THE ROWS ARE NOT UNMOUNTED
 *
 * Filtering by removing elements is the obvious implementation and it makes the
 * list jump: rows below a removed one snap upward with nothing connecting where
 * they were to where they are, and a reader loses their place instantly.
 *
 * So nothing is removed. Every row stays mounted and the excluded ones collapse
 * to zero height, which means the survivors travel to their new positions rather
 * than teleporting. It also means a row that comes back does so from where it
 * went, and the filter reads as one continuous object being sorted rather than
 * as a page being replaced.
 *
 * ---
 *
 * THE URL CARRIES THE FILTER
 *
 * `?tag=hardware` is real state: it can be linked, shared, opened in a new tab
 * and reached by the back button. A filter that lives only in React is a filter
 * that cannot be sent to anybody, which for a page whose purpose is being found
 * and passed around is most of the value gone.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/gsap';
import { useIsomorphicLayoutEffect } from '@/hooks/useIsomorphicLayoutEffect';
import { TAGS, type Tag } from '@/content/notebook';

export type TagFilterProps = {
  /** Tag ids present on at least one lesson, with their counts. */
  counts: Partial<Record<Tag, number>>;
  onChange: (tag: Tag | null) => void;
  active: Tag | null;
};

export function TagFilter({ counts, onChange, active }: TagFilterProps) {
  const root = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  useIsomorphicLayoutEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el || reduced) return;

    const ctx = gsap.context(() => {
      /*
        The pill's fill grows from the left rather than fading. A colour that
        fades in reads as a state change; one that sweeps reads as a selection
        being made, which is what actually happened.
      */
      gsap.set('[data-pill-fill]', { scaleX: 0, transformOrigin: 'left center' });
      gsap.from('[data-pill]', {
        y: 10,
        opacity: 0,
        duration: 0.45,
        ease: 'power3.out',
        stagger: 0.035,
      });
    }, el);

    return () => ctx.revert();
  }, [reduced]);

  useIsomorphicLayoutEffect(() => {
    const el = root.current;
    if (!el || reduced) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-pill]').forEach((pill) => {
        const on = pill.dataset.tag === (active ?? '');
        gsap.to(pill.querySelector('[data-pill-fill]'), {
          scaleX: on ? 1 : 0,
          duration: 0.4,
          ease: 'power3.out',
          overwrite: 'auto',
        });
      });
    }, el);
    return () => ctx.revert();
  }, [active, reduced]);

  const pick = useCallback(
    (tag: Tag | null) => {
      onChange(tag);
      // Written to the URL without a navigation, so the back button steps
      // through filters and a link can carry one.
      const url = new URL(window.location.href);
      if (tag) url.searchParams.set('tag', tag);
      else url.searchParams.delete('tag');
      window.history.replaceState(null, '', url);
    },
    [onChange],
  );

  const available = TAGS.filter((t) => counts[t.id]);

  return (
    <div className="tagbar" ref={root}>
      <button
        type="button"
        data-pill
        data-tag=""
        className={`tagbar__pill${active === null ? ' is-active' : ''}`}
        onClick={() => pick(null)}
        aria-pressed={active === null}
      >
        <span data-pill-fill className="tagbar__fill" />
        <span className="tagbar__label">
          All
          <em>{Object.values(counts).reduce((s, n) => s + (n ?? 0), 0)}</em>
        </span>
      </button>

      {available.map((tag) => (
        <button
          key={tag.id}
          type="button"
          data-pill
          data-tag={tag.id}
          className={`tagbar__pill${active === tag.id ? ' is-active' : ''}`}
          onClick={() => pick(active === tag.id ? null : tag.id)}
          aria-pressed={active === tag.id}
          title={tag.blurb}
        >
          <span data-pill-fill className="tagbar__fill" />
          <span className="tagbar__label">
            {tag.label}
            <em>{counts[tag.id]}</em>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Read the tag out of the URL on first paint, so a shared link lands filtered. */
export function useTagFromUrl(): [Tag | null, (t: Tag | null) => void] {
  const [tag, setTag] = useState<Tag | null>(null);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('tag');
    if (fromUrl && TAGS.some((t) => t.id === fromUrl)) setTag(fromUrl as Tag);
  }, []);

  return [tag, setTag];
}
