/**
 * The studio's contact address, assembled rather than written.
 *
 * **The address never appears as a literal string in the source, the HTML, or
 * the rendered page.** It is split into parts and joined at call time, and every
 * visible label is a word — "Email", "Write to the studio" — never the address
 * itself.
 *
 * ---
 *
 * WHY, AND WHAT THIS DOES AND DOES NOT BUY
 *
 * A `mailto:` in static HTML is harvested by the crawlers that feed spam lists
 * within days of a page being indexed; the address is then permanently on those
 * lists whatever the site does afterwards. Splitting it defeats the naive
 * scrapers, which are most of them, because they read the served HTML and do not
 * execute JavaScript.
 *
 * **It is not encryption and it is not claimed to be.** Anything that renders
 * the address for a human can be made to render it for a determined machine.
 * What this buys is that the address is not sitting in a static export waiting
 * to be grepped — which is the actual failure mode for a small site.
 *
 * **The link still works without JavaScript for a keyboard or a screen reader**,
 * because `ContactLink` assembles the `href` during render rather than in an
 * effect. A visitor with scripting disabled entirely sees the label and a
 * prompt, never a dead control that looks live.
 */

/**
 * The parts, deliberately unhelpful to read in order.
 *
 * Reversed, so a regex over the bundle looking for `something@something.tld`
 * finds nothing — the characters are present but never adjacent in that order.
 */
const PARTS: readonly string[] = ['moc', 'liamg', '2071kivtur', 'letap'];

/** The address, assembled. Call it; never store the result in a module field. */
export function contactAddress(): string {
  const [tld, host, tail, head] = PARTS;
  return `${reverse(head)}${reverse(tail)}@${reverse(host)}.${reverse(tld)}`;
}

/** A `mailto:` for it, with an optional subject. */
export function contactHref(subject?: string): string {
  const base = `mailto:${contactAddress()}`;
  return subject ? `${base}?subject=${encodeURIComponent(subject)}` : base;
}

function reverse(s: string): string {
  return s.split('').reverse().join('');
}

/**
 * What the page SAYS where an address would otherwise be printed.
 *
 * Used everywhere the old copy read `hello@seventeenstudios.co` — an address
 * that never existed and would have bounced every enquiry the site generated.
 */
export const CONTACT_LABEL = 'Write to the studio';
