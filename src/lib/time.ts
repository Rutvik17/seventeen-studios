/**
 * Values that change with the calendar, and counts spelled out.
 *
 * Anything on this site that changes with the calendar is computed here rather
 * than typed into the copy, so nothing needs editing when a year turns over.
 *
 * These evaluate at build time, because the site is statically exported. The
 * deploy workflow (`.github/workflows/deploy.yml`) rebuilds every Monday as
 * well as on every push, so a derived figure is never more than a week late —
 * and the footer re-reads the year on the client besides.
 *
 * What stays static, deliberately: dates of things that happened, such as the
 * employment dates in `content/resume.ts`. Those are facts about the past, not
 * durations.
 */

export function currentYear(at: Date = new Date()): number {
  return at.getUTCFullYear();
}

/** Counts spelled out, so copy reads as prose rather than as a dashboard. */
const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

export function spell(count: number): string {
  return WORDS[count] ?? String(count);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-23" → "23 Sep 2026". The day something happened, written the same everywhere. */
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}
