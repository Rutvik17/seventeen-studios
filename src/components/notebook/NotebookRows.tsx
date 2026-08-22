'use client';

import { RevealRows, RowWash, type RevealRow } from '@/components/RevealRows';

/**
 * Client wrapper, so the notebook index itself can stay a server component and
 * keep its metadata and heading in the static render.
 */
export function NotebookRows({ rows }: { rows: RevealRow[] }) {
  return (
    <section className="section-rows section-rows--flush">
      <RowWash />
      <RevealRows rows={rows} cursor="Read" />
    </section>
  );
}
