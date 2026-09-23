/**
 * Content model.
 *
 * Every piece of prose on this site is authored as typed data rather than JSX
 * so that pages stay layout-only and the writing can be re-used across the
 * home page, index pages, detail pages and metadata without duplication.
 *
 * `Block` is the vocabulary of the legal pages: paragraphs and the headings
 * between them. It had eight more kinds — quotes, lists, code, defined terms,
 * worked equations — for the notebook's articles; they went with the articles,
 * and a new kind should come back with the first entry that needs it.
 */

export type Block = { type: 'p'; text: string } | { type: 'h2'; text: string };

