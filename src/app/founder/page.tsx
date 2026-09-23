import { statSync } from 'node:fs';
import path from 'node:path';
import type { Metadata } from 'next';
import { ogImage } from '@/lib/og';
import { founder, founderPage } from '@/content/founder';
import { resumeExperience } from '@/content/resume';
import { Sketchbook } from '@/components/founder/Sketchbook';
import styles from '@/components/founder/Founder.module.css';

/**
 * The founder page.
 *
 * A sketchbook that draws its way to a name and a button, then the record: the
 * résumé in both formats and the roles it lists.
 *
 * The route is also the `url` on the Person node every notebook lesson names
 * as its author, and the address printed on the résumé itself.
 */

const DESCRIPTION = `${founder.name} — ${founder.title}, ${founder.employer}. A sketchbook that draws its way to a résumé, in PDF and DOCX.`;

export const metadata: Metadata = {
  /*
    "Founder", not "Rutvik Patel — Founder". The root layout appends
    "— Rutvik Patel" to every child title.
  */
  title: 'Founder',
  description: DESCRIPTION,
  openGraph: {
    title: `${founder.name} — ${founder.title}, ${founder.employer}`,
    description: DESCRIPTION,
    type: 'profile',
    images: ogImage(
      'founder',
      'A pencil drawing of a suspension bridge on sketchbook paper, its cables washed in crimson',
    ),
  },
};

/*
  The file sizes are read from disk at build time — this is a server component
  and the export runs it once — so the figure beside each download is the size
  of the file actually shipped, and regenerating the résumé cannot leave it
  stale.
*/
function sizeOf(file: string): string {
  const bytes = statSync(path.join(process.cwd(), file)).size;
  return `${Math.round(bytes / 1024)} KB`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "11/2023" → "Nov 2023". Anything else (such as "Present") is left alone. */
function month(value: string): string {
  const m = /^(\d{2})\/(\d{4})$/.exec(value);
  return m ? `${MONTHS[Number(m[1]) - 1]} ${m[2]}` : value;
}

export default function FounderPage() {
  return (
    <>
      <Sketchbook />

      <section className={styles.resume} id="resume">
        <header className={styles.resumeHead}>
          <span className="mono-label">{founderPage.resumeLabel}</span>
          <h2>{founderPage.resumeTitle}</h2>
        </header>

        <div className={styles.downloads}>
          {founderPage.downloads.map((d) => (
            <a
              key={d.format}
              className={styles.download}
              href={d.href}
              download
              data-cursor="Download"
            >
              <span className={styles.format}>{d.format}</span>
              <span className={styles.arrow} aria-hidden="true">
                ↓
              </span>
              <span className={styles.meta}>
                <span>{d.note}</span>
                <span className="mono-label">{sizeOf(d.file)}</span>
              </span>
            </a>
          ))}
        </div>

        <ol className={styles.roles}>
          {resumeExperience.map((r) => (
            <li key={`${r.company}-${r.start}`} className={styles.role}>
              <span className={styles.roleTitle}>{r.role}</span>
              <span className={styles.roleCompany}>{r.company}</span>
              <span className={`${styles.roleDates} mono-label`}>
                {month(r.start)} — {month(r.end)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
