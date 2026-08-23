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
 * THE GLASS IS PAPER UNTIL THE JOURNEY HAS SOMETHING TO PUT ON IT
 *
 * A full-refresh waveform (black, white, black, white) is what the hardware
 * does, and it is also unreadable at scroll speed. The panel arrives as paper.
 * Content comes later.
 */

import { Bitmap } from '@/lib/pixelfont';
import { PANEL } from './device';

/* ------------------------------------------------------------------ *
 * What is on screen
 * ------------------------------------------------------------------ */

export type PanelPhase = { kind: 'blank' } | { kind: 'on' };

/**
 * The glass, as a function of progress through the final act.
 *
 * No waveform. The black-white-black-white slam is what the hardware does on a
 * full refresh, and it is also what made this page unreadable at scroll speed.
 * The panel arrives as paper and stays paper until the journey content has
 * something honest to put on it.
 */
export function phaseAt(t: number): PanelPhase {
  return t < 0.4 ? { kind: 'blank' } : { kind: 'on' };
}

/** Compose one frame of the panel. Paper, until there is something to say. */
export function composePanel(_phase: PanelPhase): Bitmap {
  return new Bitmap(PANEL.width, PANEL.height);
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
