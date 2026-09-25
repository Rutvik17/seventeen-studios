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
 * What stays static, deliberately: dates of things that happened. Those are
 * facts about the past, not durations.
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

