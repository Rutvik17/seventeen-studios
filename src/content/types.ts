/**
 * Content model.
 *
 * Every piece of prose on this site is authored as typed data rather than JSX
 * so that pages stay layout-only and the writing can be re-used across the
 * home page, index pages, detail pages and metadata without duplication.
 *
 * `Block` is a deliberately small rich-text vocabulary — enough for editorial
 * long-form, small enough that the renderer stays a single switch statement
 * (see `components/Prose.tsx`).
 */

export type Block =
  | { type: 'p'; text: string }
  | { type: 'h2'; text: string }
  | { type: 'h3'; text: string }
  | { type: 'quote'; text: string; attribution?: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  /** Label + body pairs — used for decision logs and definition lists. */
  | { type: 'defs'; items: { term: string; description: string }[] }
  /** A boxed aside. `label` renders as the small mono caption. */
  | { type: 'note'; label: string; text: string }
  | { type: 'code'; language: string; code: string }
  /**
   * A word the reader is not assumed to know.
   *
   * Every piece of jargon gets one of these at first use. It exists as its own
   * block type rather than as a parenthetical because a parenthetical is easy
   * to skip writing — a required field is not.
   */
  | { type: 'term'; word: string; plain: string }
  /**
   * An equation, in the order the teaching rule demands.
   *
   * This is the most important type in the file. The rule — state it in words,
   * then in symbols, then with real numbers substituted — is a discipline that
   * everyone agrees with and nobody keeps, so it is enforced by the shape of
   * the data instead: `words` and `where` are not optional, and a symbolic form
   * cannot be authored without naming every symbol in it.
   *
   * `substituted` and `result` are separate fields so the arithmetic can be
   * checked against the printed operands. A reader retyping `substituted` into
   * a calculator must get `result`.
   */
  | {
      type: 'equation';
      /** The whole thing said in plain English, before any symbol appears. */
      words: string;
      /** The symbolic form. */
      symbols: string;
      /** Every symbol above, named. Required — no exceptions. */
      where: { symbol: string; means: string }[];
      /** The same expression with the real numbers in it. */
      substituted?: string;
      result?: string;
      /** What the answer means, once you have it. */
      soWhat?: string;
    }
  /**
   * An interactive component, mounted inside the prose.
   *
   * A slot keyed by id rather than a rendered node, because content is data and
   * must stay serialisable — see rule 3. `components/notebook/Embed.tsx` owns
   * the id-to-component lookup.
   */
  | { type: 'embed'; component: EmbedId; caption?: string };

/** Interactive pieces a notebook entry can mount. */
export type EmbedId =
  | 'board3d'
  | 'trace-width'
  | 'derivative'
  | 'risk'
  | 'credit'
  | 'spring'
  | 'coin-flips';

/**
 * Inline emphasis inside `text` uses a tiny markup subset resolved by
 * `lib/inline.ts`: `*accented*` renders in the accent colour, `_italic_`
 * renders as `<em>`, and `` `mono` `` renders as inline code.
 */
