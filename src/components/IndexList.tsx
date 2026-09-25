import type { ReactNode, Ref } from 'react';
import { TransitionLink } from '@/components/Transition';

/**
 * A list of pages to turn to — the contents on the landing — every row the
 * same way: each row in its own paint, its number
 * outlined in pencil and painted in a little off register, its title painted in
 * that colour over a wash of it, and the row washed with it when you point at
 * it. The paints take turns down the list (`--paint-1` … `-5`), unless an item
 * names its own.
 */

export type IndexItem = {
  key: string;
  href: string;
  /** The row's number or numeral. */
  mark: string;
  title: string;
  note?: string;
  /** Small print above the title — a date. */
  label?: string;
  /** A little drawing at the end of the row. */
  art?: ReactNode;
  /** Which paint (`--paint-n`) the row is in, when it means something — otherwise they take turns. */
  paint?: number;
};

/** How many paints the rows take turns with. */
const PAINTS = 5;

export function IndexList({ items, cursor, listRef }: { items: IndexItem[]; cursor: string; listRef?: Ref<HTMLOListElement> }) {
  return (
    <ol className="index" ref={listRef}>
      {items.map((item, i) => (
        <li key={item.key} style={{ ['--c' as string]: `var(--paint-${item.paint ?? (i % PAINTS) + 1})` }}>
          <TransitionLink href={item.href} className="index__row" data-row data-cursor={cursor}>
            <span className="index__mark">
              <span className="index__ink" aria-hidden="true">
                {item.mark}
              </span>
              {item.mark}
            </span>
            <span className="index__text">
              {item.label && <span className="index__label">{item.label}</span>}
              <span className="index__title">{item.title}</span>
              {item.note && <span className="index__note">{item.note}</span>}
            </span>
            {item.art && <span className="index__art">{item.art}</span>}
            <svg className="index__arrow" viewBox="0 0 40 18" aria-hidden="true">
              <path d="M2 9.6C11 8.8 23 9.4 36 9M30 2.6c2.4 2.4 4.4 4.3 6.8 6.3-2.5 1.9-4.6 3.9-7 6.5" />
            </svg>
          </TransitionLink>
        </li>
      ))}
    </ol>
  );
}
