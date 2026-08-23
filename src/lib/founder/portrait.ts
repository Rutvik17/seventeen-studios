/**
 * A photograph, on a display that has two pigments.
 *
 * ==================================================================
 * THIS IS WHY THE PANEL CAN SHOW A PHOTO AT ALL
 * ==================================================================
 *
 * The panel has no grey. A capsule is driven white or it is driven black, and
 * there is nothing in between — so a photograph cannot be "reduced to 1-bit" by
 * thresholding it, which is the obvious approach and produces a black silhouette
 * on a white ground with the face missing entirely.
 *
 * What produces a photograph is DITHERING: choosing black or white per pixel so
 * that the ERROR of each choice is pushed into the pixels not yet decided.
 * Averaged over any small area the density of black dots then tracks the
 * original brightness, and the eye integrates it back into a continuous tone.
 * It is the same trick a newspaper halftone plays with dot size, done with dot
 * position instead.
 *
 * Floyd–Steinberg is the classic diffusion kernel and it is what e-ink
 * firmware actually ships. Each pixel's error is spread over its four
 * not-yet-visited neighbours in these proportions:
 *
 *            (px)   7/16
 *     3/16   5/16   1/16
 *
 * The sixteenths matter: the weights sum to exactly 1, so the total brightness
 * of the image is conserved. A kernel that does not sum to 1 either darkens or
 * washes out the whole picture, and the error compounds down the image.
 *
 * ==================================================================
 * SERPENTINE, AND WHY
 * ==================================================================
 *
 * Alternate rows are traversed right-to-left. Scanning every row the same way
 * lets the residual error drift consistently in one direction and lays down
 * diagonal corduroy stripes across flat areas — very visible on a face, which
 * is mostly flat areas. Reversing every other row makes that drift cancel.
 */

import { Bitmap, INK } from '@/lib/pixelfont';

/**
 * Where the interesting part of the picture is, as a fraction of each axis.
 *
 * The panel is 2.3:1 and the photograph is 3:4, so most of the image has to be
 * cropped away and something has to decide what survives. Centring on the frame
 * would keep the middle of a tall portrait — a chest and a chin. This keeps the
 * face.
 */
export type Focus = { x: number; y: number };

/** Rec. 709 luma. Green dominates because the eye does. */
const luma = (r: number, g: number, b: number): number =>
  0.2126 * r + 0.7152 * g + 0.0722 * b;

/**
 * Load an image, crop it to the panel, and dither it to one bit.
 *
 * Returns null rather than throwing if the image cannot be fetched, so a
 * missing portrait costs the panel its last frame and nothing else.
 */
export async function ditherPortrait(
  url: string,
  width: number,
  height: number,
  focus: Focus = { x: 0.5, y: 0.5 },
  zoom = 1,
): Promise<Bitmap | null> {
  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => resolve(null);
    el.src = url;
  });
  if (!image) return null;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  /*
    Cover-crop around the focal point: scale so the image fills both axes, then
    slide the excess so `focus` lands where it should. The offsets are clamped
    so the crop can never run off the edge of the source and leave a blank band.
  */
  /*
    `zoom` above 1 crops in past what covering requires, and on this pairing it
    is not optional.

    The source is 3:4 and the panel is 2.3:1, so covering is decided entirely by
    the WIDTH: the scale that makes the image wide enough already makes it three
    times too tall. That leaves no horizontal freedom at all — the crop is the
    full width of the photograph whatever `focus.x` says — so a portrait with
    air around the subject arrives as a small head in a lot of empty ground.
    Scaling past cover is what buys the room to crop in on the face.
  */
  const scale = Math.max(width / image.width, height / image.height) * zoom;
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const x = Math.min(0, Math.max(width - drawWidth, width / 2 - drawWidth * focus.x));
  const y = Math.min(0, Math.max(height - drawHeight, height / 2 - drawHeight * focus.y));
  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  const { data } = ctx.getImageData(0, 0, width, height);

  /*
    Greyscale into a float buffer, not back into the byte array.

    Diffused error routinely pushes a value past 255 or below 0, and a Uint8
    array clamps silently at both ends — which throws away exactly the error the
    algorithm exists to carry, and shows up as banding in the highlights and
    blocked-up shadows. Floats cost 4 bytes a pixel on a 296 x 128 image.
  */
  const grey = new Float32Array(width * height);
  for (let i = 0; i < grey.length; i += 1) {
    const p = i * 4;
    /*
      A contrast curve before dithering, because the source is a soft, low-
      contrast portrait on a cream ground and one bit has no tonal subtlety to
      spend on it. Pulled around mid-grey so the jacket goes properly black and
      the background properly white, which is what gives the dithered face
      something to sit between.
    */
    const value = luma(data[p], data[p + 1], data[p + 2]) / 255;
    const curved = Math.min(1, Math.max(0, (value - 0.5) * 1.32 + 0.5));
    grey[i] = curved * 255;
  }

  /* ---- Floyd–Steinberg, serpentine ---- */
  const bmp = new Bitmap(width, height);
  const at = (px: number, py: number) => py * width + px;
  const spread = (px: number, py: number, error: number, weight: number) => {
    if (px < 0 || px >= width || py >= height) return;
    grey[at(px, py)] += error * weight;
  };

  for (let py = 0; py < height; py += 1) {
    const leftToRight = py % 2 === 0;
    for (let step = 0; step < width; step += 1) {
      const px = leftToRight ? step : width - 1 - step;
      const i = at(px, py);
      const old = grey[i];
      const black = old < 128;
      if (black) bmp.set(px, py, INK.black);

      // The error is what the chosen pigment failed to represent.
      const error = old - (black ? 0 : 255);
      const ahead = leftToRight ? 1 : -1;
      spread(px + ahead, py, error, 7 / 16);
      spread(px - ahead, py + 1, error, 3 / 16);
      spread(px, py + 1, error, 5 / 16);
      spread(px + ahead, py + 1, error, 1 / 16);
    }
  }

  return bmp;
}
