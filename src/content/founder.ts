/**
 * Rutvik, as data.
 *
 * Who he is, where to find him, and the two files that carry the rest.
 *
 * ---
 *
 * WHERE THE EMPLOYMENT RECORD WENT
 *
 * There used to be a `career` array here — four roles, their dates, their
 * highlights and their stacks — and a section on the founder page that set it
 * out down the screen. Both are gone. The page is the device assembling itself
 * and then one button, because everything that list contained is inside the
 * résumé the button downloads.
 *
 * The facts were not deleted with it. They live in `resume.ts`, which is the
 * source `scripts/build-resume.mjs` generates the PDF and the .docx from — so
 * the record is now stated in exactly one place instead of two. That is worth
 * more than the duplicate was: this file's own header used to end "keep the two
 * in step", which is an instruction that only exists because something can
 * drift, and now nothing can.
 */

import { yearsOfExperience, spell } from '@/lib/time';
import { asset } from '@/lib/asset';

const years = yearsOfExperience();

export const founder = {
  name: 'Rutvik Patel',
  initials: 'RP',
  role: 'Software Engineer',
  location: 'Toronto, Canada',
  portrait: asset('/founder/rutvik-patel.jpg'),
  portraitAlt: 'Rutvik Patel',
  resume: asset('/founder/rutvik-patel-resume.pdf'),
  resumeDocx: asset('/founder/rutvik-patel-resume.docx'),
  github: 'https://github.com/Rutvik17',
  /** One line. Used for the page's metadata, so it has to stand alone. */
  summary: `Software engineer with ${spell(years)} years building interfaces and platforms at enterprise scale — agentic AI at Ernst & Young, a mobile product taken from zero to acquisition, connected-vehicle infrastructure at Ford.`,
} as const;

/**
 * The few strings the founder page needs that are not on the résumé.
 *
 * There is almost nothing here, and that is the design. The assembly carries
 * the page with no headline, no standfirst and no caption over it: the object
 * is the argument.
 */
export const founderPage = {
  cue: 'Scroll to assemble it',
  outroLabel: 'And the rest of it',
  /*
    The one sentence on the page, and it deliberately does not repeat the panel.

    The display has just spent a screen of scrolling printing his name, his
    title and his city. Setting the same three facts in HTML directly underneath
    throws away the thing the assembly earned — that the device told you. So
    this says what the device cannot: not who he is, but what he does with it.
  */
  outroLine: 'Building things. Making them worth taking apart.',
  /*
    What the panel prints, and it is deliberately not read from `founder.role`.
    That field is the site's own description of him and reads in sentence case;
    this is firmware output on a 5 x 7 bitmap font with no lowercase.

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

    The long form is not missing from the site — `founder.summary` above and the
    résumé's company header both carry it, which is where a reader meets the name
    cold. This is the short form after first reference.
  */
  panelRole: 'Senior Software Engineer',
  panelEmployer: 'EY',
} as const;
