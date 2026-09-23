/**
 * Derived time values.
 *
 * Anything on this site that changes with the calendar is computed from a fixed
 * anchor here rather than typed into the copy. Nothing needs editing when a
 * year turns over.
 *
 * These evaluate at build time, because the site is statically exported. The
 * deploy workflow (`.github/workflows/deploy.yml`) rebuilds every Monday as
 * well as on every push, so a derived figure is never more than a week late.
 *
 * What stays static, deliberately: dates of things that happened — employment
 * start and end dates on the résumé, the day a policy was last updated. Those
 * are facts about the past, not durations.
 */

/** Rutvik's first professional engineering role — Mitel, November 2018. */
export const CAREER_START = new Date('2018-11-01T00:00:00Z');

function now(): Date {
  return new Date();
}

/** Whole years elapsed since `from`. */
export function yearsSince(from: Date, at: Date = now()): number {
  let years = at.getUTCFullYear() - from.getUTCFullYear();
  const beforeAnniversary =
    at.getUTCMonth() < from.getUTCMonth() ||
    (at.getUTCMonth() === from.getUTCMonth() && at.getUTCDate() < from.getUTCDate());
  if (beforeAnniversary) years -= 1;
  return Math.max(0, years);
}

/** Years of professional engineering experience, e.g. 7. */
export function yearsOfExperience(at: Date = now()): number {
  return yearsSince(CAREER_START, at);
}

export function currentYear(at: Date = now()): number {
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

/** "Seven" — sentence-leading form. */
export function spellCapitalised(count: number): string {
  const word = spell(count);
  return word.charAt(0).toUpperCase() + word.slice(1);
}
