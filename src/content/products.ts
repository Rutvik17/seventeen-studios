import type { Block } from './types';

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
  /** Where it can be got, once it can be got. */
  links?: { label: string; href: string }[];
  /**
   * An interactive demonstration to mount on the page, by id.
   *
   * A slot rather than a boolean, and rendered through a lookup rather than a
   * conditional on the slug: a second product will want its own instrument, and
   * `slug === 'grasp'` in the renderer is how a data-driven page quietly becomes
   * a bespoke one.
   */
  demo?: 'derivative';
  /** The scroll-driven exploded drawing. */
  layers: {
    id: string;
    label: string;
    note: string;
    curve?: number[];
    alt?: boolean;
  }[];
  sections: { label: string; heading: string; blocks: Block[] }[];
}

/** A sampled sine, for the layers that carry a plotted curve. */
const sample = (fn: (t: number) => number, n = 48): number[] =>
  Array.from({ length: n }, (_, i) => fn(i / (n - 1)));

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
    layers: [
      {
        id: 'plane',
        label: 'The plane',
        note: 'Ruled ground. Axes that say what they measure.',
      },
      {
        id: 'curve',
        label: 'The function',
        note: 'A rule, drawn. Every point is a pair you could work out.',
        curve: sample((t) => Math.sin(t * Math.PI * 1.6 - 0.4)),
      },
      {
        id: 'tangent',
        label: 'The measurement',
        note: 'Two points, a triangle, a division you can check.',
        curve: sample((t) => -0.55 + t * 1.1),
        alt: true,
      },
      {
        id: 'derivative',
        label: 'The derivative',
        note: 'Every slope, collected — and it is a curve of its own.',
        curve: sample((t) => Math.cos(t * Math.PI * 1.6 - 0.4) * 0.8),
      },
      {
        id: 'working',
        label: 'The working',
        note: 'The arithmetic, with your values in it. Always.',
      },
    ],
    sections: [
      {
        label: 'The problem',
        heading: 'Everyone is taught the procedure and nobody is taught the idea',
        blocks: [
          {
            type: 'p',
            text: 'Ask an adult who did well at school what a derivative is and you will usually get a procedure back — *bring the power down, take one off* — delivered fluently by someone who could not tell you what the answer measures. That is not a failure of memory. It is what happens when a subject is taught as a sequence of moves to reproduce under time pressure, and it is why "I was fine until calculus" is one of the most common sentences in English.',
          },
          {
            type: 'p',
            text: 'The gap is not rigour. Every textbook has the rigour. The gap is that a derivative is a *geometric* fact — how steep something is, right here — and almost nobody meets it geometrically before they meet it symbolically. By the time the notation arrives there is nothing underneath it to attach to.',
          },
        ],
      },
      {
        label: 'The approach',
        heading: 'Nine lessons, and you drag your way through every one',
        blocks: [
          {
            type: 'p',
            text: 'Grasp never states a result before you have produced it. Each lesson opens on a canvas with something to move — a line, a point on a curve, two points closing on each other, a slider through a family of functions — and the numbers on screen change under your finger. Only once the shape of the idea is in your hand does the reading arrive to name it.',
          },
          {
            type: 'defs',
            items: [
              {
                term: 'Explore',
                description:
                  'The canvas. A challenge with one checkable answer, and a live panel showing the arithmetic with your own values substituted into it.',
              },
              {
                term: 'Read',
                description:
                  'Prose at the depth of someone who has never studied any mathematics at all, with a diagram and a named misconception in every section.',
              },
              {
                term: 'Worked',
                description:
                  'A professor at a whiteboard. Every step shows the substitution and the arithmetic, and every example ends with the calculation written out for marks.',
              },
              {
                term: 'Practice',
                description:
                  'Problems worked line by line by you, checked as each line lands, with a three-rung hint ladder that costs nothing to use.',
              },
            ],
          },
        ],
      },
      {
        label: 'The rule',
        heading: 'Every number on screen shows where it came from',
        blocks: [
          {
            type: 'p',
            text: 'This is the constraint the whole product is built around, and it is stricter than it sounds. A readout may not print a value unless the arithmetic that produced it is visible beside it, with the live numbers substituted — `rise ÷ run = 3 ÷ 4 = 0.75`, never a bare `0.75`.',
          },
          {
            type: 'p',
            text: 'It got stricter three times, each time because device testing found a number that satisfied the previous version and still could not be checked. Values had to become *traceable* to something readable off the axes; then they had to become *reproducible*, so that retyping the working into a calculator gives what the screen shows. Dragged controls snap to a grid for that reason: the value displayed is the value in use, so a chain of two-decimal numbers is exact rather than a rounding of something else.',
          },
          {
            type: 'note',
            label: 'Verified, not proofread',
            text: 'Every numeric assertion in the content is a typed claim checked against the real function in the test suite — 887 tests at the last count. Wrong arithmetic in a teaching app is worse than no app, and proofreading has already let a wrong value through once.',
          },
        ],
      },
      {
        label: 'The build',
        heading: 'Everything is on the device',
        blocks: [
          {
            type: 'p',
            text: 'No backend, no accounts, no API, no analytics beyond what payments require. That is a decision with a measurement behind it rather than an inherited constraint: a complete lesson costs 67 KB of bundle, so the entire eight-module curriculum would be about 5% of an app that starts at 30–60 MB before any content. Serving it would have bought nothing and cost the interaction model.',
          },
          {
            type: 'p',
            text: 'The drag path holds 120fps on device because none of it touches React. Every per-frame value is a shared value on the UI thread, the maths runs in worklets, and Skia draws from those directly — a single state update inside a gesture handler is visible as a stutter, so there are none.',
          },
        ],
      },
    ],
  },
];

export const productBySlug = (slug: string): Product | undefined =>
  products.find((p) => p.slug === slug);
