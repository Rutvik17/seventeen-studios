/**
 * What the 2.9" panel says.
 *
 * The composition rule is borrowed wholesale from `sections/EinkPanel.tsx`: every
 * position is an INTEGER NUMBER OF PANEL PIXELS, computed from the measured
 * width of a bitmap string. Nothing is centred by eye and nothing lands on a
 * half pixel. On a 296 x 128 panel there is no room to be approximately right —
 * one pixel of drift is most of a stroke.
 *
 * Who built it, and what time it is where he is. That is the whole card. Its
 * one caller is the landing's share image (`scripts/build-og.mjs`).
 */

import { Bitmap, INK } from '@/lib/pixelfont';
import { site } from '@/content/studio';

/** The 2.9" module's addressable pixels. */
export const PANEL = { width: 296, height: 128 } as const;

/* ------------------------------------------------------------------ *
 * What is on screen
 * ------------------------------------------------------------------ */

export type PanelData = {
  name: string;
  role: string;
  employer: string;
  location: string;
  /** Milliseconds, or null before the clock has started on the client. */
  at: number | null;
  /** ISO instant captured at build — what the panel reads before the clock starts. */
  stamp: string;
};

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

/*
  Five pixels, and it is a measured value rather than a taste.

  The longest line the panel has to set is the role, and at scale 2 the bitmap
  font needs 24 chars x 12 px - 2 px of tracking = 286 px for it. The panel is
  296 wide, so the margin can be at most 5 px a side if that line is to stay at
  a legible scale. On a 66.9 mm panel 5 px is 1.1 mm of border, which is about
  what the bezel already covers.

  Every line still goes through `fitText`, so a longer title steps down a scale
  on its own instead of running off the glass.
*/
const MARGIN = 5;
const STRIP_SCALE = 2;
const STRIP_Y = 6;
const RULE_Y = 26;

/**
 * The clock, in the timezone the device would actually sit in.
 *
 * `America/Toronto` and not a fixed offset, because the offset changes twice a
 * year: the zone is EST (UTC−5) in winter and EDT (UTC−4) in summer, and
 * hard-coding either one prints the wrong time for half of every year. The
 * label is `site.timezoneLabel` — "ET" — which is correct in both halves and is
 * already what the clock in the site header says, so the two cannot disagree.
 *
 * The font has no lowercase, so the month comes back as a three-letter code.
 */
function formatStamp(at: number | string): { date: string; time: string } {
  const d = typeof at === 'number' ? new Date(at) : at ? new Date(at) : new Date(0);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };

  const zone = { timeZone: site.timezone } as const;
  const day = new Intl.DateTimeFormat('en-GB', { ...zone, day: '2-digit' }).format(d);
  const month = new Intl.DateTimeFormat('en-GB', { ...zone, month: 'short' })
    .format(d)
    .toUpperCase();
  const time = new Intl.DateTimeFormat('en-GB', {
    ...zone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);

  return { date: `${day} ${month}`, time: `${time} ${site.timezoneLabel}` };
}

/**
 * The status strip: something small at each end, and a hairline under it.
 *
 * The two ends are laid out so they CANNOT collide. The first version simply
 * drew the left string at the margin and right-aligned the other, and with a
 * location of "Toronto, Canada" the two ran into each other and the panel read
 * "TORONTO, CANADA07:46 ET". The right-hand string is the clock and is the one
 * worth protecting, so it is measured first and whatever is left over is what
 * the left-hand string gets to fit inside.
 */
function drawStrip(bmp: Bitmap, left: string, right: string): void {
  const rightWidth = Bitmap.measure(right, STRIP_SCALE);
  bmp.text(PANEL.width - MARGIN - rightWidth, STRIP_Y, right, INK.black, STRIP_SCALE);

  // One clear character of gap, so they read as two fields rather than one run.
  const room = PANEL.width - MARGIN * 2 - rightWidth - 12;
  if (room > 0) bmp.fitText(MARGIN, STRIP_Y, left, INK.black, STRIP_SCALE, room);

  bmp.fillRect(MARGIN, RULE_Y, PANEL.width - MARGIN * 2, 1, INK.black);
}

/**
 * The card: who built it, and the time where he is.
 *
 * The name is set at the largest scale that fits the panel's full width, which
 * for a 12-character name is exactly scale 4 — 284 px against 286 of room. That
 * is a coincidence worth NOT relying on, which is why it goes through
 * `fitText`: a longer name steps down to scale 3 on its own.
 */
function composeCard(bmp: Bitmap, data: PanelData): void {
  const stamped = formatStamp(data.at ?? data.stamp);
  drawStrip(bmp, data.location, stamped.time);

  const room = PANEL.width - MARGIN * 2;
  bmp.fitText(MARGIN, 38, data.name, INK.black, 4, room);
  bmp.fitText(MARGIN, 76, data.role, INK.black, 2, room);
  bmp.fitText(MARGIN, 98, data.employer, INK.black, 2, room);
}

/** Compose the panel's card. */
export function composePanel(data: PanelData): Bitmap {
  const bmp = new Bitmap(PANEL.width, PANEL.height);
  composeCard(bmp, data);
  return bmp;
}
