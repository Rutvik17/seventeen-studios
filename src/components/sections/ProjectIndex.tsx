'use client';

import { RevealRows, RowWash, type RevealRow } from '@/components/RevealRows';
import { projects } from '@/content/projects';

/**
 * The work.
 *
 * Tucked rows — clipped titles that open on hover and wash the page with that
 * project's colour. Same component as the notebook index, deliberately: they
 * are the same gesture and there should be one implementation of it.
 *
 * What this replaced was a five-column grid of name, line, metric, stack pills
 * and status, separated by hairlines. It carried more information and read as
 * less: at any width below a very wide desktop the columns collapsed into a
 * jumble, and the rules between rows plus the rule under the heading gave the
 * page two stray horizontal lines that belonged to nothing. The metric and the
 * stack now arrive on hover, when there is room for them and a reason to read
 * them.
 */
export function ProjectIndex() {
  const rows: RevealRow[] = projects.map((p) => ({
    id: p.slug,
    title: p.name,
    tag: p.stack[0],
    meta: p.metric ? `${p.line} — ${p.metric}` : p.line,
    href: p.href,
    color: p.color,
    ink: p.ink,
    trail: p.status,
  }));

  return (
    <section className="section-rows" id="work">
      <RowWash />
      <h2 className="section-rows__head mono-label">Work</h2>
      <RevealRows rows={rows} />
    </section>
  );
}
