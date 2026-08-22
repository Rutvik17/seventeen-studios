/**
 * Structured data — JSON-LD.
 *
 * ---
 *
 * WHY THIS AND NOT MORE META TAGS
 *
 * Meta description and Open Graph control how a page LOOKS once someone has
 * already found it. Structured data is about being found: it tells a search
 * engine what kind of thing the page is, so a lesson can be understood as a
 * lesson rather than as an undifferentiated article.
 *
 * For teaching material that matters more than usual. Marking an entry up as
 * `Course` with a stated `teaches` and `educationalLevel` is how it becomes
 * eligible to appear as learning content rather than competing on generic blog
 * signals — and it is the difference between ranking for "IPC-2221 trace width
 * calculator" and ranking for nothing.
 *
 * ---
 *
 * EVERY CLAIM HERE HAS TO BE TRUE
 *
 * Structured data that does not match the visible page is a manual-action risk,
 * not a clever trick. So each field is derived from the entry itself: `teaches`
 * is the lesson's stated outcome, `wordCount` is counted, `datePublished` is the
 * real date. Nothing is asserted that a reader could not verify by reading.
 */

import type { Entry } from '@/content/notebook';
import { entryWordCount, tagLabel } from '@/content/notebook';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://seventeenstudios.co').replace(
  /\/$/,
  '',
);

const PERSON = {
  '@type': 'Person',
  name: 'Rutvik Patel',
  url: `${SITE}/founder/`,
} as const;

/**
 * A lesson, marked up as both an Article and a Course.
 *
 * `@graph` rather than a single node because it genuinely is two things: a
 * piece of writing with an author and a date, and a unit of instruction with an
 * outcome and prerequisites. Search engines read the pair; picking one loses
 * whichever half it did not describe.
 */
export function lessonSchema(entry: Entry) {
  const url = `${SITE}/notebook/${entry.slug}/`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TechArticle',
        '@id': `${url}#article`,
        headline: entry.title,
        description: entry.standfirst,
        url,
        datePublished: entry.date,
        dateModified: entry.date,
        author: PERSON,
        publisher: PERSON,
        inLanguage: 'en',
        wordCount: entryWordCount(entry),
        keywords: entry.tags.map(tagLabel).join(', '),
        // The level is a real claim about the writing: every lesson starts from
        // no prior knowledge, and that is enforced by the notebook's own rules.
        proficiencyLevel: 'Beginner',
        isAccessibleForFree: true,
      },
      {
        '@type': 'Course',
        '@id': `${url}#course`,
        name: entry.title,
        description: entry.standfirst,
        url,
        provider: {
          '@type': 'Organization',
          name: 'Seventeen Studios',
          url: SITE,
        },
        teaches: entry.outcome,
        educationalLevel: 'Beginner',
        isAccessibleForFree: true,
        coursePrerequisites: entry.prerequisites,
        about: entry.tags.map((t) => ({ '@type': 'Thing', name: tagLabel(t) })),
        hasCourseInstance: {
          '@type': 'CourseInstance',
          // Self-paced reading. Saying so is required for a valid Course and is
          // also simply what it is.
          courseMode: 'online',
          courseWorkload: `PT${Math.max(5, Math.round(entryWordCount(entry) / 200))}M`,
        },
      },
    ],
  };
}

/** The index, as a list search engines can read as a curriculum. */
export function notebookSchema(entries: Entry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Seventeen Studios lessons',
    description:
      'Free engineering lessons that start from no prior knowledge and end with a working result.',
    itemListElement: entries.map((entry, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${SITE}/notebook/${entry.slug}/`,
      name: entry.title,
    })),
  };
}

/**
 * Serialise for a `<script type="application/ld+json">`.
 *
 * `<` is escaped because a `</script>` sequence appearing inside a JSON string
 * would close the tag early and dump the rest of the payload into the document
 * as markup. It is the one genuine injection risk in embedding JSON in HTML.
 */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
