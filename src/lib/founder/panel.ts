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
 * THE POWER-ON IS A REAL REFRESH, NOT A FADE
 *
 * An e-ink panel does not fade up. Driving a capsule from one state to another
 * leaves residue of the old image — "ghosting" — so a full refresh deliberately
 * slams the entire display to black, then to white, then back, several times,
 * to shake the pigment loose before drawing anything. It is the reason these
 * displays visibly FLICKER when they change, and it is the single most
 * recognisable thing about the technology.
 *
 * So that is what act five does. It is not a flourish invented for the page; it
 * is the waveform, and it happens to be the most dramatic two seconds available
 * precisely because it is what the hardware really does.
 *
 * ---
 *
 * WHY THIS PANEL SHOWS A CLOCK AND THE LANDING PAGE'S DOES NOT
 *
 * See the long note in `device.ts`. Short version: two pigments instead of
 * seven buys partial refresh, partial refresh buys a clock, and the price is
 * every colour. The mood that the landing page carries in red and green has to
 * be carried here by the face alone.
 */

import { Bitmap, INK } from '@/lib/pixelfont';
import { FACE_SIZE, expressionFor, faceCells } from '@/lib/face';
import { PANEL } from './device';

/* ------------------------------------------------------------------ *
 * What is on screen
 * ------------------------------------------------------------------ */

export type PanelPhase =
  | { kind: 'blank' }
  | { kind: 'flash'; ink: 'black' | 'paper' }
  | { kind: 'card' }
  | { kind: 'readout' };

export type PanelData = {
  name: string;
  role: string;
  location: string;
  years: string;
  employer: string;
  symbol: string;
  price: number;
  changePercent: number;
  percentile: number;
  /** Milliseconds, or null before the clock has started on the client. */
  at: number | null;
  /** ISO instant the market data was captured — the pre-clock fallback. */
  stamp: string;
};

/**
 * The refresh sequence, as a function of progress through the final act.
 *
 * The four inversions are not decoration and their COUNT is not arbitrary:
 * driver waveforms for this class of panel run two to four full inversions
 * before the image, and four is what makes the effect read at scroll speed.
 * Their timings are uneven on purpose — a real waveform's black phases are
 * longer than its white ones, because driving pigment down to the viewing
 * surface takes longer than pulling it back.
 */
export function phaseAt(t: number): PanelPhase {
  if (t < 0.16) return { kind: 'blank' };
  if (t < 0.28) return { kind: 'flash', ink: 'black' };
  if (t < 0.35) return { kind: 'flash', ink: 'paper' };
  if (t < 0.44) return { kind: 'flash', ink: 'black' };
  if (t < 0.5) return { kind: 'flash', ink: 'paper' };
  if (t < 0.76) return { kind: 'card' };
  return { kind: 'readout' };
}

/* ------------------------------------------------------------------ *
 * Layout
 * ------------------------------------------------------------------ */

const MARGIN = 8;
/** The status strip: two lines of small type and a rule under them. */
const STRIP_SCALE = 2;
const STRIP_Y = 6;
const RULE_Y = 26;

/**
 * Uppercase, abbreviated, 24-hour, UTC.
 *
 * UTC because the panel is rendered in a browser but describes a device on a
 * shelf; a local time would be whichever machine happened to draw it, which is
 * nobody's. The font has no lowercase, so the month is a three-letter code
 * rather than a name.
 */
function formatStamp(at: number | string): { date: string; time: string } {
  const d = typeof at === 'number' ? new Date(at) : at ? new Date(at) : new Date(0);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const day = String(d.getUTCDate()).padStart(2, '0');
  const month = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getUTCMonth()];
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return { date: `${day} ${month}`, time: `${hh}:${mm} UTC` };
}

/** The strip both compositions share: where it is, and a hairline under it. */
function drawStrip(bmp: Bitmap, left: string, right: string): void {
  bmp.text(MARGIN, STRIP_Y, left, INK.black, STRIP_SCALE);
  const width = Bitmap.measure(right, STRIP_SCALE);
  bmp.text(PANEL.width - MARGIN - width, STRIP_Y, right, INK.black, STRIP_SCALE);
  bmp.fillRect(MARGIN, RULE_Y, PANEL.width - MARGIN * 2, 1, INK.black);
}

/**
 * The card: who built it.
 *
 * The name is set at the largest scale that fits the panel's full width, which
 * on a 296-pixel panel with a 12-character name is exactly scale 4 — 284 pixels
 * against 284 of room. That is a coincidence worth NOT relying on, which is why
 * it goes through `fitText`: a longer name steps down to scale 3 on its own
 * rather than running off the glass.
 */
function composeCard(bmp: Bitmap, data: PanelData): void {
  const stamped = formatStamp(data.at ?? data.stamp);
  drawStrip(bmp, data.location, stamped.time);

  const room = PANEL.width - MARGIN * 2;
  bmp.fitText(MARGIN, 36, data.name, INK.black, 4, room);
  bmp.fitText(MARGIN, 74, data.role, INK.black, 2, room);
  bmp.fitText(MARGIN, 98, `${data.years} YRS · ${data.employer}`, INK.black, 2, room);
}

/**
 * The readout: what the device is for.
 *
 * The same firmware the landing page's board runs, targeting a smaller panel
 * with fewer pigments. The face is on the left, a rule divides, and the figures
 * are stacked on the right at whatever scale each one fits in.
 *
 * The face is the ONLY thing carrying the mood here. On the seven-colour panel
 * a fall is red and a rise is green; this panel has one pigment and cannot say
 * it in colour, so the expression has to do all of the work — which is a real
 * consequence of a real part, and the readout beside the drawing says so.
 */
function composeReadout(bmp: Bitmap, data: PanelData): void {
  const stamped = formatStamp(data.at ?? data.stamp);
  drawStrip(bmp, stamped.date, stamped.time);

  /* ---- the face ---- */
  const CELL = 3;
  const faceX = MARGIN + 2;
  const faceY = 32;
  for (const cell of faceCells(expressionFor(data.percentile))) {
    bmp.fillRect(faceX + cell.x * CELL, faceY + cell.y * CELL, CELL, CELL, INK.black);
  }

  /* ---- the rule ---- */
  const railX = faceX + FACE_SIZE * CELL + 10;
  bmp.fillRect(railX, faceY, 2, FACE_SIZE * CELL, INK.black);

  /* ---- the figures ---- */
  const textX = railX + 12;
  const room = PANEL.width - textX - MARGIN;
  const move = `${data.changePercent >= 0 ? '+' : '-'}${Math.abs(data.changePercent).toFixed(2)}%`;

  bmp.fitText(textX, faceY, data.symbol, INK.black, 4, room);
  bmp.fitText(textX, faceY + 34, move, INK.black, 4, room);
  bmp.fitText(textX, faceY + 68, `$${data.price.toFixed(2)}`, INK.black, 3, room);
}

/** Compose one frame of the panel. */
export function composePanel(phase: PanelPhase, data: PanelData): Bitmap {
  const bmp = new Bitmap(PANEL.width, PANEL.height);
  if (phase.kind === 'flash') {
    if (phase.ink === 'black') bmp.fillRect(0, 0, PANEL.width, PANEL.height, INK.black);
    return bmp;
  }
  if (phase.kind === 'blank') return bmp;
  if (phase.kind === 'card') composeCard(bmp, data);
  else composeReadout(bmp, data);
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
/** How much of a previous image survives a refresh. Small, and never zero. */
const GHOST_STRENGTH = 0.085;

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

export type PaintOptions = {
  /** The image being replaced, whose residue survives the refresh. */
  ghost?: Bitmap | null;
};

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
  options: PaintOptions = {},
): void {
  const width = bitmap.width * SCALE;
  const height = bitmap.height * SCALE;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const image = ctx.createImageData(width, height);
  const out = image.data;
  const ghost = options.ghost ?? null;

  for (let y = 0; y < height; y += 1) {
    const sy = (y / SCALE) | 0;
    for (let x = 0; x < width; x += 1) {
      const sx = (x / SCALE) | 0;

      const inked = bitmap.get(sx, sy) !== 0;
      /*
        The residue only shows where the OLD image had ink and the new one does
        not. Ghosting is pigment that failed to travel all the way back, so it
        can only ever darken paper — it cannot lighten ink, and drawing it as a
        symmetric difference gives a halo that no panel produces.
      */
      const haunted = !inked && ghost !== null && ghost.get(sx, sy) !== 0;

      let base = inked ? CHARCOAL : PAPER;
      let mix = haunted ? GHOST_STRENGTH : 0;

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
        const value = base[c] + (CHARCOAL[c] - base[c]) * mix + shift;
        out[i + c] = value < 0 ? 0 : value > 255 ? 255 : value;
      }
      out[i + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
}
