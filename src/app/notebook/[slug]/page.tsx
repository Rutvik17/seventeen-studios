import type { Metadata } from 'next';
import { ogImage, NOTEBOOK_CARD } from '@/lib/og';
import { notFound } from 'next/navigation';
import { entries, entryBySlug, entryWordCount } from '@/content/notebook';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ReadingProgress } from '@/components/ReadingProgress';
import { readingTime } from '@/lib/time';
import { jsonLd, lessonSchema } from '@/lib/schema';
import { tagLabel } from '@/content/notebook';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return entries.map((entry) => ({ slug: entry.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const entry = entryBySlug(params.slug);
  if (!entry) return { title: 'Not found' };
  const url = `/notebook/${entry.slug}/`;
  /*
    One card per lesson, each carrying that lesson's own diagram — the spring's
    settle, the loss distribution, the logistic curve — drawn in the entry's own
    two colours. A new lesson needs a row in `NOTEBOOK_CARD` naming its plate,
    and then `npm run og`.
  */
  const image = ogImage(
    `notebook-${entry.slug}`,
    `${entry.title} — ${NOTEBOOK_CARD[entry.slug]?.alt ?? 'a diagram from the lesson'}`,
  );
  return {
    title: entry.title,
    /*
      The OUTCOME, not the standfirst. A search result is read as a promise, and
      "you will be able to work out how wide a wire has to be" is a far better
      one than a description of what the article is about. It is also the
      sentence the lesson is obliged to deliver on.
    */
    description: `${entry.outcome} ${entry.standfirst}`,
    keywords: entry.tags.map(tagLabel),
    authors: [{ name: 'Rutvik Patel' }],
    // Tells a search engine which URL is authoritative — without it, the same
    // lesson reachable with a query string counts as duplicate content.
    alternates: { canonical: url },
    openGraph: {
      title: entry.title,
      description: entry.outcome,
      type: 'article',
      publishedTime: entry.date,
      authors: ['Rutvik Patel'],
      tags: entry.tags.map(tagLabel),
      url,
      images: image,
    },
    twitter: {
      card: 'summary_large_image',
      title: entry.title,
      description: entry.outcome,
      images: image,
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
      {/*
        Structured data. It is what lets a search engine understand this as a
        LESSON with an outcome and prerequisites rather than as an
        undifferentiated article — see `lib/schema.ts`.
      */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(lessonSchema(entry)) }}
      />
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

          {/*
            A lesson opens by saying what you will be able to do and what you
            need first. Both are required fields on an entry, so neither can be
            quietly skipped — and the exercise of writing an outcome is what
            catches a write-up wearing a lesson's clothes.
          */}
          <Reveal className="entry__contract" delay={0.14}>
            <dl>
              <div>
                <dt className="mono-label">By the end</dt>
                <dd>{entry.outcome}</dd>
              </div>
              <div>
                <dt className="mono-label">You need first</dt>
                <dd>{entry.prerequisites.join(' ')}</dd>
              </div>
            </dl>
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
