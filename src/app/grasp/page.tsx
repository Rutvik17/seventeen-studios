import type { Metadata } from 'next';
import { graspModule, onTheWeb } from '@/content/grasp';
import { productBySlug } from '@/content/products';
import { TransitionLink } from '@/components/Transition';
import styles from '@/components/grasp/Grasp.module.css';

const grasp = productBySlug('grasp');

export const metadata: Metadata = {
  title: `Learn calculus — ${graspModule.title}`,
  description:
    'Module 1 of Grasp: nine lessons that build the derivative from steepness, one idea at a time.',
};

/**
 * The course.
 *
 * Where "Learn calculus" on the landing page goes, and the shell the web
 * version of Grasp is being built into. Right now it is the contents of Module
 * 1 — the nine lessons, with the titles they carry in the app.
 *
 * ---
 *
 * IT SAYS WHAT IS NOT HERE
 *
 * None of the nine has a web surface yet; they run on iOS. A contents page that
 * listed them as though they were all one tap away would be the most damaging
 * thing on this site — the studio's entire argument is that what you can see has
 * been built. So the count comes from the data (`onTheWeb`), the state of each
 * lesson is on its own row, and the line at the top is the truth rather than a
 * launch announcement.
 *
 * As lessons come over, flipping `web: true` in `content/grasp.ts` is the whole
 * change: the count, the row and the link all follow.
 */
export default function GraspPage() {
  return (
    <article className={styles.world} data-slate>
      <header className={styles.head}>
        <TransitionLink href="/products/grasp/" className={styles.back} data-cursor="Back">
          <i aria-hidden="true">←</i> Grasp
        </TransitionLink>
        <h1 className={styles.name}>{graspModule.title}</h1>
        <p className={styles.tagline}>
          {graspModule.position} · {graspModule.lessons.length} lessons
        </p>
      </header>

      <section className={styles.syllabus} aria-label="Module 1 lessons">
        <ol className={styles.lessons}>
          {graspModule.lessons.map((lesson) => (
            <li className={styles.lesson} key={lesson.index} data-web={lesson.web ? '' : undefined}>
              <span className={styles.lessonIndex}>{lesson.index}</span>
              <span className={styles.lessonTitle}>{lesson.title}</span>
              <span className={styles.lessonState}>
                {lesson.web ? 'open' : grasp?.platform ?? 'iOS'}
              </span>
            </li>
          ))}
        </ol>

        {/*
          The one honest sentence. It is here because the demonstration cannot
          say it: a reader looking at nine lessons has no way to know which of
          them they can do from this browser, and guessing wrong is a worse
          experience than being told.
        */}
        <p className={styles.syllabusNote}>
          {onTheWeb === 0
            ? 'These run on iOS. The web versions are being built one at a time — the interactive derivative on the previous page is the first of them.'
            : `${onTheWeb} of ${graspModule.lessons.length} are playable here so far. The rest run on iOS while they are brought over.`}
        </p>
      </section>
    </article>
  );
}
