import type { ReactNode } from 'react';
import { JetBrains_Mono } from 'next/font/google';
import { categories } from '@/content/algorithms';
import { ProblemList } from '@/components/algorithms/ProblemList';
import styles from '@/components/algorithms/Algorithms.module.css';

/*
  Code needs a fixed-width face: in the caption hand, indentation and
  alignment — which carry meaning in code — fall apart. So this section alone
  loads a mono, as Grasp's board once did.
*/
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-code', display: 'swap' });

/**
 * The algorithms section: every problem down the left, grouped by the
 * pattern it teaches; the open problem on the right. The list stays put as
 * problems change, and keeps its scroll.
 */
export default function AlgorithmsLayout({ children }: { children: ReactNode }) {
  const groups = categories.map((c) => ({
    slug: c.slug,
    title: c.title,
    problems: c.problems.map((p) => ({ slug: p.slug, title: p.title, difficulty: p.difficulty })),
  }));
  return (
    <div className={`${styles.app} ${mono.variable}`} data-app>
      <ProblemList groups={groups} />
      <main className={styles.main} data-lenis-prevent>
        {children}
      </main>
    </div>
  );
}
