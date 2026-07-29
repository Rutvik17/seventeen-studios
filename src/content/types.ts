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
  | { type: 'code'; language: string; code: string };

/**
 * Inline emphasis inside `text` uses a tiny markup subset resolved by
 * `lib/inline.ts`: `*accented*` renders in the accent colour, `_italic_`
 * renders as `<em>`, and `` `mono` `` renders as inline code.
 */

export interface Service {
  id: string;
  index: string;
  title: string;
  /** One-line positioning used on cards. */
  summary: string;
  /** Two or three sentences used on the detail panel. */
  body: string;
  /** Short capability pills shown on the card. */
  tags: string[];
  /** "Call us when…" — the buying signals for this service. */
  signals: string[];
  deliverables: string[];
  /** Typical engagement shape. */
  engagement: { shape: string; duration: string; team: string };
  stack: string[];
  /** Slugs of concept briefs that demonstrate this service. */
  related: string[];
}

export interface Capability {
  title: string;
  description: string;
}

export interface ProcessStep {
  index: string;
  title: string;
  duration: string;
  description: string;
  outputs: string[];
}

export interface ConceptMetric {
  label: string;
  value: string;
  /** How the number would actually be measured — keeps projections honest. */
  method: string;
}

export interface Concept {
  slug: string;
  index: string;
  /** Codename, e.g. "Pulse". */
  name: string;
  /** Headline description. */
  title: string;
  sector: string;
  discipline: string;
  year: string;
  /** Estimated build window if commissioned. */
  timeline: string;
  /** Card blurb. */
  excerpt: string;
  /** Seed for the generative poster — same seed always renders the same art. */
  seed: number;
  /** Poster geometry family. */
  poster: 'flow' | 'grid' | 'orbit' | 'strata' | 'bloom';
  /** The one-sentence thesis, shown large at the top of the case study. */
  premise: string;
  sections: { label: string; heading: string; blocks: Block[] }[];
  metrics: ConceptMetric[];
  stack: { group: string; items: string[] }[];
  risks: { risk: string; mitigation: string }[];
}

export interface Essay {
  slug: string;
  index: string;
  title: string;
  /** Deck / standfirst. */
  excerpt: string;
  date: string;
  topic: string;
  seed: number;
  blocks: Block[];
}
