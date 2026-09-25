import type { Metadata } from 'next';
import Link from 'next/link';
import { algorithmsPage, categories, problems } from '@/content/algorithms';
import { ogImage } from '@/lib/og';
import styles from '@/components/algorithms/Algorithms.module.css';

const DESCRIPTION = `${algorithmsPage.lead} ${algorithmsPage.languages}.`;

export const metadata: Metadata = {
  title: algorithmsPage.title,
  description: DESCRIPTION,
  openGraph: { title: algorithmsPage.title, description: DESCRIPTION, images: ogImage('algorithms', 'The NeetCode 150: every problem listed down the left, and its categories as cards') },
};

/** The section's first page: the patterns, each a way into its problems. */
export default function AlgorithmsIndex() {
  return (
    <div className={styles.index}>
      <h1 className={styles.title}>{algorithmsPage.title}</h1>
      <p className={styles.lead}>{algorithmsPage.lead}</p>
      <p className={styles.langs}>{algorithmsPage.languages}</p>
      <ol className={styles.patterns}>
        {categories.map((c, k) => {
          const counts = (['Easy', 'Medium', 'Hard'] as const).map((d) => [d, c.problems.filter((p) => p.difficulty === d).length] as const);
          return (
            <li key={c.slug} style={{ ['--k' as string]: k }}>
              <Link href={`/algorithms/${c.problems[0].slug}/`} prefetch={false} className={styles.pattern} data-row>
                <span className={styles.patternNo}>{String(k + 1).padStart(2, '0')}</span>
                <span className={styles.patternTitle}>{c.title}</span>
                <span className={styles.patternBlurb}>{c.blurb}</span>
                <span className={styles.patternCount}>
                  {c.problems.length} problems ·{' '}
                  {counts
                    .filter(([, n]) => n)
                    .map(([d, n]) => `${n} ${d.toLowerCase()}`)
                    .join(', ')}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className={styles.langs}>{problems.length} problems in all.</p>
    </div>
  );
}
