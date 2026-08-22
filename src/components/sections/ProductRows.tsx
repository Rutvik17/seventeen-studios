'use client';

import { RevealRows, RowWash, type RevealRow } from '@/components/RevealRows';

/**
 * A client wrapper so the products index can stay a server component.
 *
 * `RevealRows` needs the browser (hover, GSAP, the page wash) and the page
 * around it does not. Splitting them here keeps the metadata, the heading and
 * the copy in the static render where they belong.
 */
export function ProductRows({ rows }: { rows: RevealRow[] }) {
  return (
    <section className="section-rows section-rows--flush">
      <RowWash />
      <RevealRows rows={rows} />
    </section>
  );
}
