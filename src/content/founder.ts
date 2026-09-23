/**
 * Rutvik, as data.
 *
 * The identity the rest of the site states — the tab title, the share cards and
 * the panel on the landing's share image all read it from here.
 *
 * The founder page that used to render this record has been cleared for a
 * rebuild. The career itself lives in `resume.ts`, which is the source
 * `scripts/build-resume.mjs` generates the PDF and the .docx from.
 */

export const founder = {
  name: 'Rutvik Patel',
  role: 'Software Engineer',
  location: 'Toronto, Canada',
} as const;

/**
 * What the e-ink panel prints on the landing's share image.
 *
 * Deliberately not read from `founder.role`. That field is the site's own
 * description of him and reads in sentence case; this is firmware output on a
 * 5 x 7 bitmap font with no lowercase.
 */
export const panelCard = {
  /*
    THE EMPLOYER IS "EY" ON EDITORIAL GROUNDS, NOT TECHNICAL ONES
    The firm rebranded in 2013. "EY" is not an abbreviation of the current name,
    it IS the current name — the one on their letterhead and on ey.com — and
    "Ernst & Young" is the older legal entity. So this is the correct label even
    where there is room for the longer one.

    Worth stating, because the font has no `&` glyph and unknown glyphs fall back
    to a space (`pixelfont.ts`), so the long form would print with a hole in it.
    That looks like the reason and is not: at scale 2 "ERNST & YOUNG" measures
    154 of the 286px available, so it would fit comfortably if an ampersand were
    drawn. Adding one would not make it the right thing to print here.

    The long form is not missing from the site — the résumé's company header
    carries it, which is where a reader meets the name cold. This is the short
    form after first reference.
  */
  role: 'Senior Software Engineer',
  employer: 'EY',
} as const;
