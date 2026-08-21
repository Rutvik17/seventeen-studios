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
    scope: 'What seventeenstudios.co does and does not collect.',
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
    slug: 'grasp-privacy',
    title: 'Privacy — Grasp',
    scope: 'What the Grasp iOS app does and does not collect.',
    updated: '21 August 2026',
    blocks: [
      {
        type: 'note',
        label: 'The short version',
        text: 'Grasp has no accounts, no servers and no analytics. Everything you do in the app stays on your device. The only information that leaves it is what Apple needs to process a subscription, and that goes to Apple and to RevenueCat — never to us in a form that identifies you.',
      },
      { type: 'h2', text: 'What stays on your device' },
      {
        type: 'p',
        text: 'All of your learning does. Which lessons you have opened, which challenges you have completed, the problems you have worked through, your position on a canvas, your streak — all of it is written to your phone&rsquo;s own storage and read back from there. It is never transmitted, because there is nowhere for it to be transmitted to.',
      },
      {
        type: 'p',
        text: 'The same is true of your settings, and of the crash log. If the app fails, it writes a record of that failure to your device and shows it to you in Settings. **That record is not sent anywhere.** You can read it, you can share it deliberately using the button provided, and you can delete it. Nothing happens automatically.',
      },
      {
        type: 'note',
        label: 'What this costs you, stated plainly',
        text: 'Because nothing is synced, your progress lives on one device. Delete the app or lose the phone and the progress goes with it. That is a real trade-off and we chose it knowingly: the alternative is an account system, and an account system means holding your data.',
      },
      { type: 'h2', text: 'Subscriptions' },
      {
        type: 'p',
        text: 'Grasp offers an optional subscription. Payment is handled entirely by Apple — we never see your card details, your name or your billing address, and there is no point at which they pass through anything we operate.',
      },
      {
        type: 'p',
        text: 'Subscription status is managed through RevenueCat, which tells the app whether a subscription is active. RevenueCat receives an anonymous identifier generated on your device and information about the purchase itself. It does not receive your name, your email, or anything about how you use the app. Their handling of that data is covered by RevenueCat&rsquo;s own privacy policy.',
      },
      { type: 'h2', text: 'What is never collected' },
      {
        type: 'list',
        items: [
          'Your name, email address or any account details — there are no accounts',
          'Your location',
          'Your contacts, photos, microphone or camera — the app requests none of these permissions',
          'Analytics of any kind: no screen views, no session recording, no usage funnels, no advertising identifiers',
          'Anything at all about how you answer a practice problem',
        ],
      },
      { type: 'h2', text: 'Children' },
      {
        type: 'p',
        text: 'Grasp is suitable for learners of any age and collects no personal information from anyone, which includes children. There is no account to create, no profile to fill in, and no way for one user to contact another.',
      },
      { type: 'h2', text: 'Changes' },
      {
        type: 'p',
        text: 'If a future version of Grasp collects something, this page will say so before that version ships, and the date at the top will change. We will not quietly broaden it — a policy that reserves rights the product does not use is a description of software nobody built.',
      },
      { type: 'h2', text: 'Contact' },
      {
        type: 'p',
        text: 'Questions about any of this can go to the studio using the contact link on this site.',
      },
    ],
  },

  {
    slug: 'terms',
    title: 'Terms',
    scope: 'The terms covering this website and the studio’s software.',
    updated: '21 August 2026',
    blocks: [
      { type: 'h2', text: 'This website' },
      {
        type: 'p',
        text: 'The writing, drawings and code published here are the studio&rsquo;s. You are welcome to read, quote and link to any of it with attribution. Republishing an essay in full, or using the studio&rsquo;s name or marks to suggest an endorsement or a working relationship that does not exist, is not permitted.',
      },
      {
        type: 'p',
        text: 'The concept briefs in the Work section are explicitly speculative and labelled as such on every page they appear. They describe engagements the studio has not been commissioned to deliver, and nothing in them should be read as a claim of completed client work.',
      },
      { type: 'h2', text: 'Grasp' },
      {
        type: 'p',
        text: 'Grasp is licensed to you for personal use, not sold. A subscription grants access to the paid lessons for as long as it is active. It renews until cancelled, and it is cancelled through your Apple ID settings rather than through us — cancelling stops the next payment and does not refund the current period. Refunds are handled by Apple under their own policy, because Apple is the merchant of record.',
      },
      {
        type: 'p',
        text: 'The free lesson stays free and stays complete. It is a whole lesson rather than a sample, and a lapsed subscription does not remove it.',
      },
      { type: 'h2', text: 'What we do not promise' },
      {
        type: 'p',
        text: 'The teaching material is prepared with considerable care and every numeric claim in it is verified mechanically against the mathematics it describes. It is not a substitute for a syllabus, an instructor, or an examination board&rsquo;s own specification, and no outcome in any assessment is promised.',
      },
      {
        type: 'p',
        text: 'The software is provided as it is. It is not offered as fit for any particular purpose beyond the one described, and the studio&rsquo;s liability is limited to what you paid for it.',
      },
      { type: 'h2', text: 'Engagements' },
      {
        type: 'p',
        text: 'Nothing on this site is an offer or a contract. Client work is governed by a signed agreement covering scope, ownership, confidentiality and payment, agreed before anything begins.',
      },
    ],
  },
];

export const policyBySlug = (slug: string): Policy | undefined =>
  policies.find((p) => p.slug === slug);
