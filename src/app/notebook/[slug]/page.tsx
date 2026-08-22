import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { entries, entryBySlug, entryWordCount } from '@/content/notebook';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ReadingProgress } from '@/components/ReadingProgress';
import { readingTime } from '@/lib/time';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return entries.map((entry) => ({ slug: entry.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const entry = entryBySlug(params.slug);
  if (!entry) return { title: 'Not found' };
  return {
    title: entry.title,
    description: entry.standfirst,
    openGraph: {
      title: entry.title,
      description: entry.standfirst,
      type: 'article',
      publishedTime: entry.date,
    },
  };
}

/**
 * One notebook entry.
 *
 * A single measure of prose with instruments dropped into it at full width.
 * There is no sidebar and no table of contents: these are read start to finish
 * or not at all, and a nav rail beside a 62-character column mostly steals
 * width from the thing being read.
 *
 * The entry's colour tints only the header, not the body. A full-page wash is
 * right for choosing between entries and wrong for reading one — long-form text
 * on a tinted ground is measurably harder to read, and the colour has already
 * done its job by the time someone is here.
 */
export default function NotebookEntryPage({ params }: Params) {
  const entry = entryBySlug(params.slug);
  if (!entry) notFound();

  return (
    <article className="entry">
      <ReadingProgress />

      <header
        className="entry__head"
        style={{ ['--entry-color' as string]: entry.color, ['--entry-ink' as string]: entry.ink }}
      >
        <div className="entry__head-inner">
          <TransitionLink href="/notebook/" className="link-back" data-cursor="Back">
            <i aria-hidden="true">←</i> Notebook
          </TransitionLink>

          <span className="mono-label entry__meta">
            {entry.index} · {entry.topic} · {readingTime(entryWordCount(entry))}
          </span>

          <SplitText as="h1" className="entry__title" stagger={0.03} depth>
            {entry.title}
          </SplitText>

          <Reveal className="entry__standfirst" delay={0.08}>
            <p>{entry.standfirst}</p>
          </Reveal>
        </div>
      </header>

      <Prose blocks={entry.blocks} className="entry__body" />

      <footer className="entry__foot">
        <TransitionLink href="/notebook/" className="link-arrow" data-cursor="Back">
          Everything else <i aria-hidden="true">→</i>
        </TransitionLink>
      </footer>
    </article>
  );
}
