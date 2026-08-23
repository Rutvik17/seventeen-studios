import { career, founder, founderPage } from '@/content/founder';
import { ContactLink } from '@/components/ContactLink';
import styles from '@/components/founder/Founder.module.css';

/**
 * The employment record.
 *
 * The assembly above this is the demonstration. This is the part of the page
 * a hiring manager can take away: where he has worked, what he did, and the
 * two files an applicant tracking system will actually parse. Every date and
 * figure is from `content/founder.ts`. Nothing here is invented.
 *
 * Server-rendered on purpose. If the WebGL bundle never runs, this is still
 * in the HTML — studio rule 4. The contact address is not: `ContactLink`
 * attaches it after mount so it never lands in the export.
 */
export function Record() {
  return (
    <section className={styles.record} aria-labelledby="founder-record">
      <header className={styles.identity}>
        <img
          src={founder.portrait}
          alt={founder.portraitAlt}
          className={styles.portrait}
          width={96}
          height={96}
        />
        <div className={styles.identityBody}>
          <span className="mono-label">{founderPage.recordLabel}</span>
          <h2 id="founder-record" className={styles.identityName}>
            {founder.name}
          </h2>
          <p className={styles.identityRole}>
            {founder.role}. {founder.location}.
          </p>
          <p className={styles.identityLinks}>
            <a
              href={founder.resume}
              className="link-arrow"
              data-cursor="Résumé"
              download
            >
              Résumé <i>↓</i>
            </a>
            <a
              href={founder.resumeDocx}
              className="link-arrow"
              data-cursor="Word"
              download
            >
              Word <i>↓</i>
            </a>
            <a
              href={founder.github}
              className="link-arrow"
              data-cursor="GitHub"
              target="_blank"
              rel="noreferrer noopener"
            >
              GitHub <i>↗</i>
            </a>
            <ContactLink className="link-arrow" data-cursor="Write">
              Write <i>→</i>
            </ContactLink>
          </p>
        </div>
      </header>

      <ol className={styles.career}>
        {career.map((entry) => (
          <li className={styles.entry} key={entry.index}>
            <span className={`mono-label ${styles.entryIndex}`}>{entry.index}</span>
            <div>
              <div className={styles.entryHead}>
                <h3 className={styles.entryRole}>{entry.role}</h3>
                <p className={styles.entryOrg}>{entry.org}</p>
                <p className={`mono-label ${styles.entryMeta}`}>
                  <span>{entry.period}</span>
                  <span>{entry.location}</span>
                </p>
              </div>
              <p className={styles.entrySummary}>{entry.summary}</p>
              {entry.highlights.length > 0 ? (
                <ul className={styles.entryHighlights}>
                  {entry.highlights.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {entry.stack.length > 0 ? (
                <p className={styles.entryStack}>
                  {entry.stack.map((item) => (
                    <span className="tag" key={item}>
                      {item}
                    </span>
                  ))}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
