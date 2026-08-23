/**
 * The studio's OWN products — shipped software, not client work and not a
 * speculative brief.
 *
 * ---
 *
 * **This is a third category and it exists to protect rule 6.** `work.ts` holds
 * concept briefs, which are speculative and labelled that way on every surface
 * they appear on. `founder.ts` holds a personal employment record. Neither
 * shape fits a product the studio built, shipped and sells — and filing Grasp
 * under either would be the exact dishonesty the rule guards against: listing
 * it beside the concepts would imply the concepts are real, and listing it as
 * client work would imply a client.
 *
 * The distinction is load-bearing in the copy too. Nothing here may describe
 * Grasp as commissioned, and nothing may imply a customer base that does not
 * exist yet.
 */

export interface Product {
  slug: string;
  index: string;
  name: string;
  /** The line under the name. */
  tagline: string;
  /** What it is, in one sentence, for cards and metadata. */
  summary: string;
  status: string;
  platform: string;
  /**
   * An interactive demonstration to mount on the page, by id.
   *
   * A slot rather than a boolean, and rendered through a lookup rather than a
   * conditional on the slug: a second product will want its own instrument, and
   * `slug === 'grasp'` in the renderer is how a data-driven page quietly becomes
   * a bespoke one.
   */
  demo?: 'derivative';
}

/*
  WHAT USED TO BE HERE

  `layers` — an exploded axonometric drawing of what a lesson is made of — and
  `sections`, four blocks of prose arguing for the product's approach. Both were
  the page talking ABOUT a product whose whole claim is that being talked to is
  the problem. Grasp's landing is now the lesson itself, taught on a board, and
  neither field had a reader left.

  `links` went with them: it was never rendered by anything.

  The prose is in git if a line of it is ever worth recovering —
  `git show 9c969d0 -- src/content/products.ts`.
*/

export const products: Product[] = [
  {
    slug: 'grasp',
    index: '001',
    name: 'Grasp',
    tagline: 'Math you can touch',
    summary:
      'An iOS app that teaches calculus by making every idea something you drag rather than something you memorise. Nine lessons, four surfaces each, and not one number on screen without the working that produced it.',
    status: 'In review',
    platform: 'iOS',
    demo: 'derivative',
  },
];

export const productBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);
