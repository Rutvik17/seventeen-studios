/**
 * WHAT A COMPANY SAYS ABOUT ITS OWN QUARTER.
 *
 * Features from the earnings press release — the 8-K item 2.02 exhibit that
 * goes out the moment results are announced.
 *
 * ---
 * WHY A DICTIONARY AND NOT A LANGUAGE MODEL
 *
 * An LLM would read these better. It would also be a black box inside a project
 * whose whole argument is that every number shows its working, and it would
 * make the features unreproducible the moment the model version changed.
 *
 * The dictionary approach is Loughran & McDonald (2011), who showed that
 * general-purpose sentiment lists are actively wrong on financial text —
 * "liability", "vice", "crude" and "cancer" are all negative in a standard
 * lexicon and all neutral in a filing. The word lists below follow their
 * finding: financial tone needs a financial dictionary.
 *
 * ---
 * WHY THE FEATURES ARE ALL COMPARISONS
 *
 * A release's absolute tone is mostly a fact about the company's house style.
 * Some firms write "outstanding results" every quarter and some write "results
 * were in line" after a record year, and a cross-sectional model would learn
 * the style rather than the news.
 *
 * So every feature here is a CHANGE against the same company's previous
 * release. That is the quantity with a chance of carrying information: not that
 * the tone is positive, but that it moved.
 */

/**
 * A scored release.
 *
 * The shipped file holds SCORES rather than prose: 14,065 releases are 658 MB
 * of text, which JSON.stringify cannot even serialise. Scoring happens at fetch
 * time and the raw text stays cached per company, so changing the dictionary
 * means re-scoring rather than re-fetching.
 */
export type Release = {
  symbol: string;
  /** Filing date. The 8-K goes out the day results are announced. */
  date: string;
  tone: number;
  hedging: number;
  guidance: number;
  length: number;
};

/*
  Loughran-McDonald in miniature. The full lists run to thousands of words; these
  are the high-frequency members, which is what a press release uses.

  Words are matched with boundaries, so "gain" does not fire on "bargaining"
  and "loss" does not fire on "closs" — stemming would catch more and would also
  catch "losses" in "closses", which is the trade nobody mentions.
*/
const POSITIVE = ['record', 'strong', 'growth', 'grew', 'increase', 'increased', 'improved',
  'improvement', 'gain', 'gains', 'exceeded', 'exceeding', 'outperform', 'outperformed',
  'accelerate', 'accelerated', 'accelerating', 'robust', 'momentum', 'expansion', 'expanded',
  'profitable', 'success', 'successful', 'confident', 'opportunity', 'opportunities',
  'achieved', 'delivered', 'best', 'highest', 'favourable', 'favorable'];

const NEGATIVE = ['decline', 'declined', 'decrease', 'decreased', 'loss', 'losses', 'weak',
  'weakness', 'weakened', 'challenging', 'challenges', 'difficult', 'headwind', 'headwinds',
  'pressure', 'pressured', 'impairment', 'restructuring', 'shortfall', 'below', 'missed',
  'disappointing', 'deteriorate', 'deteriorated', 'adverse', 'unfavourable', 'unfavorable',
  'slowdown', 'slowing', 'lower', 'reduced', 'writedown', 'charge', 'charges'];

/*
  HEDGING is its own axis, not a negative word.

  "May", "could" and "subject to" say nothing about direction and everything
  about confidence. A release that is positive AND heavily hedged is a different
  statement from one that is positive and plain, and collapsing the two into one
  tone score loses exactly that.
*/
const HEDGING = ['may', 'might', 'could', 'potentially', 'possibly', 'uncertain',
  'uncertainty', 'uncertainties', 'depends', 'depending', 'subject to', 'if ', 'assuming',
  'estimate', 'estimates', 'estimated', 'approximately', 'anticipate', 'anticipated',
  'believe', 'believes', 'expect', 'expects', 'expected', 'risk', 'risks'];

/* Guidance language, which is where a release says something about the FUTURE. */
const GUIDANCE_UP = ['raising', 'raised', 'increasing our', 'increased our', 'upgrading',
  'higher than previously', 'above prior', 'improving our outlook'];
const GUIDANCE_DOWN = ['lowering', 'lowered', 'reducing our', 'reduced our', 'withdrawing',
  'withdrew', 'suspending', 'below prior', 'lower than previously'];

export const LANGUAGE_COLUMNS = [
  'lang_tone',
  'lang_tone_change',
  'lang_hedging',
  'lang_hedging_change',
  'lang_guidance',
  'lang_length_change',
  'lang_days_since',
] as const;

export type LanguageColumn = (typeof LANGUAGE_COLUMNS)[number];

/** Occurrences of any phrase in the list, per thousand words. */
function rate(text: string, words: string[]): number {
  const lower = ` ${text.toLowerCase()} `;
  const total = lower.split(/\s+/).length;
  if (total < 50) return 0;

  let hits = 0;
  for (const w of words) {
    // Phrases contain a space and are matched literally; single words get
    // boundaries so "gain" does not fire inside "bargaining".
    if (w.includes(' ')) {
      let at = lower.indexOf(w);
      while (at >= 0) { hits += 1; at = lower.indexOf(w, at + w.length); }
    } else {
      const re = new RegExp(`\\b${w}\\b`, 'g');
      hits += (lower.match(re) ?? []).length;
    }
  }
  return (hits / total) * 1000;
}

/**
 * Tone: positive minus negative, per thousand words.
 *
 * A difference rather than a ratio, because a release with neither is neutral
 * and a ratio would be undefined there — and "no strong language either way" is
 * a real and common thing for a release to be.
 */
export function tone(text: string): number {
  return rate(text, POSITIVE) - rate(text, NEGATIVE);
}

export function hedging(text: string): number {
  return rate(text, HEDGING);
}

/**
 * Guidance direction: +1 raised, -1 lowered, 0 neither, and it can be both.
 *
 * A company that raises revenue guidance and lowers margin guidance in the same
 * release nets to zero here, which is honest — the release genuinely said both,
 * and picking one would be the reader's judgement rather than the text's.
 */
export function guidance(text: string): number {
  const up = rate(text, GUIDANCE_UP);
  const down = rate(text, GUIDANCE_DOWN);
  if (up === down) return 0;
  return up > down ? 1 : -1;
}

/**
 * Features for one company on every calendar date.
 *
 * NO LAG IS ADDED, and none is needed: an 8-K item 2.02 is filed the day the
 * results are announced, so the filing date IS the availability date. That is
 * unusual in this project — the 13F needed a statutory deadline and the
 * fundamentals needed a published-by check — and it is worth saying rather than
 * leaving as an absence.
 *
 * Values persist until the next release, so for most of a quarter the model is
 * reading what was said up to three months ago. That is what a participant
 * sees.
 */
export function languageRows(
  releases: Release[],
  symbol: string,
  dates: string[],
): number[][] {
  const blank = LANGUAGE_COLUMNS.map(() => NaN);

  const mine = releases
    .filter((r) => r.symbol === symbol)
    .sort((a, b) => (a.date < b.date ? -1 : 1))
    .map((r) => ({
      date: r.date,
      tone: r.tone,
      hedging: r.hedging,
      guidance: r.guidance,
      length: r.length,
    }));

  if (!mine.length) return dates.map(() => blank.slice());

  const out: number[][] = [];
  let cursor = -1;

  for (const date of dates) {
    while (cursor + 1 < mine.length && mine[cursor + 1].date <= date) cursor += 1;
    if (cursor < 0) { out.push(blank.slice()); continue; }

    const now = mine[cursor];
    const prev = mine[cursor - 1];
    const days = Math.round((Date.parse(date) - Date.parse(now.date)) / 86_400_000);

    out.push([
      now.tone,
      prev ? now.tone - prev.tone : NaN,
      now.hedging,
      prev ? now.hedging - prev.hedging : NaN,
      now.guidance,
      /*
        A release that is suddenly much longer or shorter than the last one is
        saying something — usually that there is more to explain. Expressed as a
        ratio so a wordy company and a terse one are on the same scale.
      */
      prev && prev.length > 0 ? now.length / prev.length - 1 : NaN,
      days,
    ]);
  }
  return out;
}
