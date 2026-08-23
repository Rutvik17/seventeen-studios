/**
 * What the 2.9" panel shows, and how it is painted.
 *
 * The composition rule is borrowed wholesale from `sections/EinkPanel.tsx`: every
 * position is an INTEGER NUMBER OF PANEL PIXELS, computed from the measured
 * width of a bitmap string. Nothing is centred by eye and nothing lands on a
 * half pixel. On a 296 x 128 panel there is no room to be approximately right —
 * one pixel of drift is most of a stroke.
 *
 * ---
 *
 * WHAT IT SAYS
 *
 * Who built it, and what time it is where he is. That is the whole card.
 *
 * It used to also carry the landing page's market readout — a ticker, a price
 * and the trained-model face. That is the LANDING's job and repeating it here
 * said nothing new about either page, so it is gone.
 *
 * ---
 *
 * WHY THERE IS NO FLICKER
 *
 * A FULL e-ink refresh slams the whole display to black and back several times
 * before drawing, to shake the pigment loose from its last position. That is
 * why these panels visibly flicker, and it is what the seven-colour part on the
 * landing page has to do — for about thirty seconds, every time.
 *
 * This part does not. Two pigments buys PARTIAL REFRESH (see `device.ts`),
 * which drives only the capsules that are changing and never inverts the panel
 * to get there. So the sequence here is three states with nothing between them:
 * unpowered, the card, the photograph.
 *
 * Two earlier versions did flicker — four inversions, then one — and both were
 * wrong for this part rather than merely busy. An unpowered panel is dark grey;
 * flashing it to black on the way to white is a transition through a state the
 * hardware was never in, and putting another one between the card and the
 * photograph animates a full refresh on a panel that would do it partially.
 */

import { Bitmap, INK } from '@/lib/pixelfont';
import { site } from '@/content/studio';
import { PANEL } from './device';

/* ------------------------------------------------------------------ *
 * What is on screen
 * ------------------------------------------------------------------ */

export type PanelPhase =
  | { kind: 'blank' }
  | { kind: 'card' }
  | { kind: 'portrait' };

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

/**
 * The refresh sequence, as a function of progress through the final act.
 *
 * Blank while the module is still travelling, one inversion to clear the
 * pigment, then the card — which then HOLDS for the rest of the act, because a
 * display that has settled is the point of the whole page.
 */
export function phaseAt(t: number): PanelPhase {
  if (t < 0.22) return { kind: 'blank' };
  if (t < 0.6) return { kind: 'card' };
  return { kind: 'portrait' };
}

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

/**
 * Compose one frame of the panel.
 *
 * `portrait` is the dithered photograph, prepared once by `portrait.ts` — it is
 * passed in rather than composed here because turning a JPEG into one bit is
 * asynchronous and this function has to stay synchronous and pure, so it can be
 * called from the render loop.
 *
 * When it has not arrived the portrait phase falls back to the card. A panel
 * that has powered on and then gone blank because a fetch was slow looks
 * broken; one still showing the previous frame does not.
 */
export function composePanel(
  phase: PanelPhase,
  data: PanelData,
  portrait?: Bitmap | null,
): Bitmap {
  const bmp = new Bitmap(PANEL.width, PANEL.height);
  if (phase.kind === 'blank') return bmp;
  if (phase.kind === 'portrait' && portrait) return portrait;
  composeCard(bmp, data);
  return bmp;
}

/* ------------------------------------------------------------------ *
 * Painting
 * ------------------------------------------------------------------ */

/**
 * Scale from panel pixels to texture pixels.
 *
 * The panel is 296 x 128 and the camera ends up close enough to read it, so the
 * texture is drawn at four times the panel's resolution — 1184 x 512. Not for
 * detail there is none of: an e-ink pixel is a hard square and stays a hard
 * square. It is so that the square EDGES survive the GPU's filtering when the
 * panel is seen at an angle, which at 1:1 they do not.
 */
const SCALE = 4;

/*
  E-ink is not black on white and pretending otherwise is the tell.

  A real panel's white is the colour of the titanium dioxide suspension — a
  light warm grey around 65% reflectance — and its black is charcoal, not ink.
  The contrast ratio is roughly 15:1, against 1000:1 or more for any emissive
  screen. Drawing #000 on #fff produces something that looks like a PNG of a
  display rather than a display, and next to the warm paper of this site it
  looks like a hole.
*/
const PAPER: [number, number, number] = [214, 213, 205];
const CHARCOAL: [number, number, number] = [38, 39, 43];

/*
  AN UNPOWERED PANEL IS NOT WHITE.

  The white of an e-ink display is titanium dioxide that has been DRIVEN to the
  viewing surface, and driving it takes a controller, a power rail and a
  waveform. A module lying on the bench with nothing plugged into it has had
  none of those: what shows through the front laminate is the dark pigment
  suspension and the backplane behind it.

  This matters here because of the order the page assembles things in. The
  panel used to paint its blank state as paper, so the display arrived already
  glowing white, floated across the bench like that, and only afterwards ran a
  power-on sequence — a screen that was on before it was connected to anything.
  Dark until the cable is fitted, then the refresh, then white, and it stays
  white because that is the whole point of the technology.
*/
const UNPOWERED: [number, number, number] = [46, 49, 52];

/**
 * A stable hash. Same input, same output, forever.
 *
 * `Math.random()` here would re-roll the grain on every repaint and the panel
 * would visibly boil — a mistake this repo has made before, in the city drawing
 * that preceded this page.
 */
function noise(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Paint a composed bitmap onto a canvas, as electrophoretic ink.
 *
 * Written straight into one ImageData at the output resolution rather than
 * drawn small and scaled up. Scaling would hand the decision about edges to the
 * browser's smoothing — which softens them — and the whole point of a bitmap
 * font on a bitmap display is that a pixel has a boundary.
 */
export function paintPanel(
  canvas: HTMLCanvasElement,
  bitmap: Bitmap,
  phase: PanelPhase,
): void {
  // Nothing has been driven yet, so there is no image to draw — only the dark
  // suspension behind the glass.
  const surface = phase.kind === 'blank' ? UNPOWERED : PAPER;
  const width = bitmap.width * SCALE;
  const height = bitmap.height * SCALE;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const image = ctx.createImageData(width, height);
  const out = image.data;

  for (let y = 0; y < height; y += 1) {
    const sy = (y / SCALE) | 0;
    for (let x = 0; x < width; x += 1) {
      const sx = (x / SCALE) | 0;
      const inked = bitmap.get(sx, sy) !== 0;
      const base = inked ? CHARCOAL : surface;

      /*
        Two grains, at two scales, and they do different jobs.

        The capsule grain is per PANEL pixel: the microcapsules are physical
        spheres of slightly varying size and fill, so no two pixels driven to
        the same state end up quite the same. The paper grain is per TEXTURE
        pixel and much finer — it is the diffuser film over the front, and it is
        what stops a flat fill reading as a rectangle of colour.
      */
      const capsule = (noise(sx, sy) - 0.5) * (inked ? 9 : 7);
      const paperGrain = (noise(x * 7 + 11, y * 13 + 5) - 0.5) * 3.4;
      const shift = capsule + paperGrain;

      const i = (y * width + x) * 4;
      for (let c = 0; c < 3; c += 1) {
        const value = base[c] + shift;
        out[i + c] = value < 0 ? 0 : value > 255 ? 255 : value;
      }
      out[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}
