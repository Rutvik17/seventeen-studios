import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { essays, getEssay, essayReadingTime } from '@/content/thinking';
import { Poster } from '@/components/Poster';
import { Prose } from '@/components/Prose';
import { Reveal } from '@/components/motion/Reveal';
import { SplitText } from '@/components/motion/SplitText';
import { TransitionLink } from '@/components/Transition';
import { ReadingProgress } from '@/components/ReadingProgress';
import { site } from '@/content/studio';

interface Params {
  params: { slug: string };
}

export function generateStaticParams() {
  return essays.map((essay) => ({ slug: essay.slug }));
}

export function generateMetadata({ params }: Params): Metadata {
  const essay = getEssay(params.slug);
  if (!essay) return { title: 'Not found' };
  return {
    title: essay.title,
    description: essay.excerpt,
    openGraph: {
      title: essay.title,
      description: essay.excerpt,
      type: 'article',
      publishedTime: essay.date,
    },
  };
}

const formatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

export default function EssayPage({ params }: Params) {
  const essay = getEssay(params.slug);
  if (!essay) notFound();

  const position = essays.findIndex((item) => item.slug === essay.slug);
  const next = essays[(position + 1) % essays.length];

  return (
    <article className="page essay">
      <ReadingProgress />

      <header className="essay__head">
        <div className="essay__head-meta">
          <TransitionLink href="/thinking/" className="link-back" data-cursor="Back">
            <i aria-hidden="true">←</i> All writing
          </TransitionLink>
          <span className="mono-label">{essay.topic}</span>
        </div>

        <SplitText as="h1" className="essay__title" mode="words" stagger={0.035} depth>
          {essay.title}
        </SplitText>

        <Reveal className="essay__deck">
          <p>{essay.excerpt}</p>
        </Reveal>

        <Reveal className="essay__byline" stagger interval={0.06}>
          <span className="mono-label">{site.name}</span>
          <span className="mono-label">{formatter.format(new Date(essay.date))}</span>
          <span className="mono-label">{essayReadingTime(essay)} read</span>
        </Reveal>
      </header>

      <Reveal className="essay__art" distance={60}>
        <Poster family="flow" seed={essay.seed} />
      </Reveal>

      <div className="essay__body">
        <Prose blocks={essay.blocks} />
      </div>

      <Reveal className="essay__next">
        <TransitionLink
          href={`/thinking/${next.slug}/`}
          className="next-link"
          data-cursor="Read next"
        >
          <span className="mono-label">Next — {next.topic}</span>
          <span className="next-link__name">{next.title}</span>
          <span className="next-link__title">{next.excerpt}</span>
          <span className="link-arrow">
            Continue <i aria-hidden="true">→</i>
          </span>
        </TransitionLink>
      </Reveal>
    </article>
  );
}
