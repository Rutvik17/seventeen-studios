import type { Metadata } from 'next';
import { entries } from '@/content/notebook';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';
import { NotebookRows } from '@/components/notebook/NotebookRows';

export const metadata: Metadata = {
  title: 'Notebook',
  description:
    'How the things on this site work, explained from nothing — circuit boards, simulation, motion, calculus and credit risk.',
};

/**
 * The notebook index.
 *
 * Tucked rows, the same component the work index uses. The whole page washes to
 * an entry's colour on hover, so the subject announces itself before a word of
 * the standfirst is read.
 */
export default function NotebookPage() {
  /*
    The header sits in a `.page` container and the rows do NOT. `.page` carries
    a max-width and a gutter, so anything inside it can never reach the viewport
    edge — the list has to be a sibling to run full bleed.
  */
  return (
    <>
      <div className="page page--head-only">
        <header className="page-head page-head--flush">
          <span className="mono-label">Notebook</span>
          <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
            How these work
          </SplitText>
          <Reveal className="page-head__lead">
            <p>
              Written for someone who has never studied any of it. Every symbol
              is explained before it is used, and anything that can be operated
              is.
            </p>
          </Reveal>
        </header>
      </div>

      <NotebookRows
        rows={entries.map((e) => ({
          id: e.slug,
          title: e.title,
          tag: e.topic,
          meta: e.standfirst,
          href: `/notebook/${e.slug}/`,
          color: e.color,
          ink: e.ink,
          trail: e.index,
        }))}
      />
    </>
  );
}
