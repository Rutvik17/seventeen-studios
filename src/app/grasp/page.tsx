import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { graspInfo, graspModule, onTheWeb } from '@/content/grasp';
import { spell } from '@/lib/time';
import { Chalkboard } from '@/components/grasp/Chalkboard';
import { DerivativeInstrument } from '@/components/instruments/DerivativeInstrument';
import { TransitionLink } from '@/components/Transition';
import styles from '@/components/grasp/Grasp.module.css';

const TITLE = `${graspInfo.name} — ${graspInfo.tagline}`;

export const metadata: Metadata = {
  title: TITLE,
  description: graspInfo.summary,
  openGraph: {
    title: TITLE,
    description: graspInfo.summary,
    images: ogImage('grasp', 'A chalkboard with the parabola f(x) = x squared and its tangent, labelled slope = 2x'),
  },
};

/**
 * Grasp — the whole of it, on one page.
 *
 * The chalkboard derives the idea; the demonstration puts it under the reader's
 * own hand; the contents say which of the nine lessons can be done here yet.
 * It used to be split across a product page and a course page, when Grasp was
 * an app with a website; now the website is where it lives.
 */
export default function GraspPage() {
  return (
    <article className={styles.world} data-slate>
      <header className={styles.head}>
        <TransitionLink href="/" className={styles.back} data-cursor="Back">
          <i aria-hidden="true">←</i> Contents
        </TransitionLink>
        <h1 className={styles.name}>{graspInfo.name}</h1>
        <p className={styles.tagline}>{graspInfo.tagline}</p>
        <div className={styles.cue} aria-hidden="true">
          <span className={styles.cueLabel}>scroll to learn</span>
          <svg viewBox="0 0 28 72" className={styles.cueArrow}>
            <path className={styles.cueShaft} d="M14 6 V 54" />
            <path className={styles.cueHead} d="M5 45 L 14 58 L 23 45" />
          </svg>
        </div>
      </header>

      <Chalkboard />

      {/*
        The board proves the derivative exists; this is where the reader does it
        with their own hand. It keeps its light palette on purpose — the one
        thing on the page meant to be touched should not look like the drawing.
      */}
      <section className={styles.demo}>
        <div className={styles.demoHead}>
          <span className={`mono-label ${styles.demoLabel}`}>Now you</span>
          <h2 className={styles.demoTitle}>Drag the point. Watch the slopes make a curve.</h2>
        </div>
        <DerivativeInstrument />
      </section>

      <section className={styles.syllabus} aria-label={`${graspModule.position} lessons`}>
        <p className={styles.tagline}>
          {graspModule.position} · {graspModule.title} · {graspModule.lessons.length} lessons
        </p>
        <ol className={styles.lessons}>
          {graspModule.lessons.map((lesson) => (
            <li className={styles.lesson} key={lesson.index} data-web={lesson.web ? '' : undefined}>
              <span className={styles.lessonIndex}>{lesson.index}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
              <span className={styles.lessonState}>{lesson.web ? 'open' : 'being drawn'}</span>
            </li>
          ))}
        </ol>
        <p className={styles.syllabusNote}>
          {onTheWeb === 0
            ? `The derivative above is the first working piece; the ${spell(graspModule.lessons.length)} lessons follow it, one at a time.`
            : onTheWeb < graspModule.lessons.length
              ? `${onTheWeb} of ${graspModule.lessons.length} lessons can be done here so far; the rest are being drawn.`
              : `All ${spell(graspModule.lessons.length)} lessons can be done here.`}
        </p>
      </section>
    </article>
  );
}
