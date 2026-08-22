'use client';

import { useMemo } from 'react';
import { RevealRows, RowWash, type RevealRow } from '@/components/RevealRows';
import { TagFilter, useTagFromUrl } from '@/components/notebook/TagFilter';
import type { Entry, Tag } from '@/content/notebook';
import { tagLabel } from '@/content/notebook';

/**
 * The lesson index: a subject filter above the tucked rows.
 *
 * The filter narrows the row list rather than replacing the page, so the
 * component owns both — a filter that cannot see what it is filtering ends up
 * duplicating the list's data to count it.
 */
export function NotebookRows({ entries }: { entries: Entry[] }) {
  const [tag, setTag] = useTagFromUrl();

  const counts = useMemo(() => {
    const out: Partial<Record<Tag, number>> = {};
    for (const entry of entries) {
      for (const t of entry.tags) out[t] = (out[t] ?? 0) + 1;
    }
    return out;
  }, [entries]);

  const rows: RevealRow[] = useMemo(
    () =>
      entries
        .filter((e) => !tag || e.tags.includes(tag))
        .map((e) => ({
          id: e.slug,
          title: e.title,
          // The primary subject, not the free-text topic — so a row's pill and
          // the filter above it always agree on what a lesson is about.
          tag: tagLabel(e.tags[0]),
          meta: e.outcome,
          href: `/notebook/${e.slug}/`,
          color: e.color,
          ink: e.ink,
          trail: e.index,
        })),
    [entries, tag],
  );

  return (
    <section className="section-rows section-rows--flush">
      <RowWash />
      <TagFilter counts={counts} active={tag} onChange={setTag} />
      <RevealRows rows={rows} cursor="Learn" />
    </section>
  );
}
