/**
 * Derived time values.
 *
 * Anything on this site that changes with the calendar is computed from a fixed
 * anchor here rather than typed into the copy. Nothing needs editing when a
 * year turns over.
 *
 * These evaluate at build time, because the site is statically exported. A
 * scheduled monthly rebuild in `.github/workflows/deploy.yml` keeps them fresh
 * between pushes, so the site cannot sit on a stale figure for long.
 *
 * Availability is deliberately *not* here. A derived "booking for Q4 2026" is
 * still a claim about inventory that only the studio knows the truth of — it
 * would keep itself current and be wrong. The copy says "Accepting new
 * engagements" instead, which is true until Rutvik decides otherwise.
 *
 * What stays static, deliberately:
 *   - the studio's founding year, and each concept brief's year: those are
 *     facts about when something happened, not durations
 *   - essay publication dates, for the same reason
 *   - employment start and end dates on the résumé
 */

/** Rutvik's first professional engineering role — Mitel, November 2018. */
export const CAREER_START = new Date('2018-11-01T00:00:00Z');

/** The studio's founding. */
export const STUDIO_FOUNDED = new Date('2026-01-01T00:00:00Z');

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

/** "7+" — the form used in the résumé summary and the stats block. */
export function yearsOfExperienceLabel(at: Date = now()): string {
  return `${yearsOfExperience(at)}+`;
}

export function currentYear(at: Date = now()): number {
  return at.getUTCFullYear();
}

export function foundedYear(): number {
  return STUDIO_FOUNDED.getUTCFullYear();
}

/**
 * Reading time from a word count.
 *
 * 200 words per minute, not the 250–265 a general-interest publication assumes:
 * this is architecture and systems writing with code in it, and people read it
 * slower than they read features. Rounded to whole minutes, floored at one.
 */
export function readingTime(words: number): string {
  return `${Math.max(1, Math.round(words / 200))} min`;
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
