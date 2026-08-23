import { founder, founderPage } from '@/content/founder';
import { Reveal } from '@/components/motion/Reveal';
import { Magnetic } from '@/components/motion/Magnetic';
import { OutroLine } from '@/components/founder/OutroLine';
import styles from '@/components/founder/Founder.module.css';

/**
 * The end of the page: one line, and the file.
 *
 * ---
 *
 * IT DOES NOT SAY HIS NAME
 *
 * It used to — name, job title, city — directly under a display that had just
 * spent a screen of scrolling printing exactly those three things. Repeating
 * them in HTML immediately afterwards threw away the only thing the assembly
 * had earned: that the device told you. The panel introduces him; this says the
 * one thing the panel cannot, which is what he actually does with the years.
 *
 * `yearsOfExperienceLabel()` rather than a number typed into the copy — studio
 * rule 9. A sentence with "seven" in it is wrong next January and nobody
 * notices for months.
 *
 * ---
 *
 * SERVER-RENDERED, AND THE FALLBACK FOR THE WHOLE PAGE
 *
 * No `use client` here. If WebGL is missing or the bundle never runs, the
 * assembly above renders nothing at all and this is the entire page — so the
 * heading, the sentence and both download links have to be in the static HTML,
 * which they are. Studio rule 4.
 *
 * `SplitText`, `Reveal` and `Magnetic` are the site's own primitives and each
 * applies its own hidden state from JavaScript rather than from CSS, so none of
 * them can leave this invisible if they never initialise.
 */
export function Resume() {
  return (
    <section className={styles.resume} aria-label="Résumé">
      <Reveal className={`mono-label ${styles.resumeEyebrow}`}>
        <span>{founderPage.outroLabel}</span>
      </Reveal>

      <OutroLine text={founderPage.outroLine} />

      <Reveal className={styles.resumeActions} delay={0.2}>
        <p>
          <Magnetic strength={0.35}>
            <a href={founder.resume} className="button" data-cursor="Résumé" download>
              Download résumé <i>↓</i>
            </a>
          </Magnetic>
          <a
            href={founder.resumeDocx}
            className={styles.resumeAlt}
            data-cursor="Word"
            download
          >
            Word (.docx) <i>↓</i>
          </a>
        </p>
      </Reveal>
    </section>
  );
}
