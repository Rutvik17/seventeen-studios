import type { Metadata } from 'next';
import { entries } from '@/content/notebook';
import { SplitText } from '@/components/motion/SplitText';
import { Reveal } from '@/components/motion/Reveal';
import { NotebookRows } from '@/components/notebook/NotebookRows';
import { jsonLd, notebookSchema } from '@/lib/schema';

export const metadata: Metadata = {
  title: 'Notebook',
  description:
    'Free engineering lessons that start from nothing: circuit board design and IPC-2221 trace width, Monte Carlo simulation and value at risk, spring physics and inverse kinematics, derivatives from scratch, credit risk, and training a classifier by gradient descent.',
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(notebookSchema(entries)) }}
      />
      <div className="page page--head-only">
        <header className="page-head page-head--flush">
          <span className="mono-label">Notebook</span>
          <SplitText as="h1" className="page-head__title" stagger={0.03} depth>
            Lessons
          </SplitText>
          <Reveal className="page-head__lead">
            {/*
              "Lessons, not write-ups" was the site defending itself against a
              charge nobody had made. What a reader needs here is what these
              are and what they assume.
            */}
            <p>
              Each one starts from nothing and ends with the thing built — the
              maths, the physics and the code that produced it. No prior
              knowledge is assumed beyond arithmetic.
            </p>
          </Reveal>
        </header>
      </div>

      <NotebookRows entries={entries} />
    </>
  );
}
