import type { Block } from './types';

/**
 * Legal pages.
 *
 * ---
 *
 * **There are two privacy policies and that is deliberate.** The website and
 * the app are different products that handle different things, and one document
 * covering both would have to hedge every sentence until it said nothing. App
 * Store review reads the app's policy against the app's actual behaviour; a
 * policy that describes a website's cookies alongside it invites a rejection
 * for describing collection the app does not do.
 *
 * **Every claim here is checkable against the source.** Grasp has no backend,
 * no accounts and no analytics — that is a recorded architectural decision with
 * a measurement behind it, not a marketing line — and the policy says so
 * plainly rather than reserving rights the product does not exercise. Reserving
 * unused rights is the industry habit and it is dishonest: it describes a
 * product nobody built.
 *
 * **If the app ever starts collecting something, this file changes in the same
 * commit.** A policy that lags the software is worse than none, because it is
 * a specific false statement rather than an absent one.
 */

export interface Policy {
  slug: string;
  title: string;
  /** What this document covers, in one line, for the header and metadata. */
  scope: string;
  /**
   * The date the text last changed.
   *
   * Literal, not derived — this is the date of an event that happened, which
   * rule 8 exempts. A policy whose "last updated" moves on its own is lying
   * about having been reviewed.
   */
  updated: string;
  blocks: Block[];
}

export const policies: Policy[] = [
  {
    slug: 'privacy',
    title: 'Privacy — this website',
    scope: 'What this website does and does not collect.',
    updated: '21 August 2026',
    blocks: [
      {
        type: 'p',
        text: 'This site is a set of static files. There is no server application behind it, no database, and no account you can create.',
      },
      { type: 'h2', text: 'What is collected' },
      {
        type: 'p',
        text: 'Nothing, by us. The site sets no cookies, runs no analytics, embeds no tracking pixels, and loads no third-party scripts. Fonts are bundled with the site rather than fetched from a font service, so visiting a page makes no request to anyone but the host.',
      },
      {
        type: 'p',
        text: 'The site is served by GitHub Pages, which keeps standard server logs — IP address, user agent, the page requested — as any web host does. Those logs are GitHub&rsquo;s, retained under their policy, and we neither read them nor have access to them.',
      },
      { type: 'h2', text: 'If you write to us' },
      {
        type: 'p',
        text: 'The contact link opens your own email client. Nothing is submitted through this site, so the only thing we receive is the message you choose to send. It is kept for as long as the conversation is useful and is never added to a mailing list, because there is no mailing list.',
      },
      { type: 'h2', text: 'Your rights' },
      {
        type: 'p',
        text: 'Since we hold nothing about you beyond correspondence you initiated, there is normally nothing to access, correct or erase. If you have written to us and would like that correspondence deleted, ask and it will be.',
      },
    ],
  },

  {
    slug: 'terms',
    title: 'Terms',
    scope: 'The terms covering this website, including Grasp.',
    updated: '23 September 2026',
    blocks: [
      { type: 'h2', text: 'This website' },
      {
        type: 'p',
        text: 'The writing, drawings and code published here are Rutvik Patel&rsquo;s. You are welcome to read, quote and link to any of it with attribution. Republishing it in full, or using the name or marks to suggest an endorsement or a working relationship that does not exist, is not permitted.',
      },
      { type: 'h2', text: 'Grasp' },
      {
        type: 'p',
        text: 'Grasp lives on this website and is free to use. There are no accounts and nothing to buy. It is being built in the open, so lessons arrive one at a time and may change as they do.',
      },
      { type: 'h2', text: 'What is not promised' },
      {
        type: 'p',
        text: 'The teaching material is prepared with care, but it is not a substitute for a syllabus, an instructor or an examination board&rsquo;s own specification, and no outcome in any assessment is promised. The site and its software are provided as they are.',
      },
    ],
  },
];

export const policyBySlug = (slug: string): Policy | undefined =>
  policies.find((p) => p.slug === slug);
