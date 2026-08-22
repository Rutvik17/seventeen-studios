/**
 * OVERHEAD SIGNS — the variable-message boards the story is told on.
 *
 * ==================================================================
 * WHY A SIGN AND NOT A CARD
 * ==================================================================
 *
 * A card floating over a drawing is a caption: it sits outside the world,
 * belongs to the interface rather than the scene, and has to be tethered to
 * something with a line to explain what it is about. A gantry sign is *in* the
 * city. It is lit by the same clock, hazed by the same air, foreshortened by
 * the same projection, and it arrives the way road signs arrive — legible from
 * far off, unreadable at an angle, gone once you are under it.
 *
 * ==================================================================
 * THE HARDWARE IS REAL
 * ==================================================================
 *
 * A Variable Message Sign on a US arterial is three lines of amber LED on a
 * black face, mounted on a butterfly or full-span gantry with **5.2 m of
 * clearance** over the roadway — enough for a 4.1 m legal load with room to
 * spare. Panels are typically 2.4 m tall and 6 to 9 m wide, and the character
 * cell is a 5x7 dot matrix, which is why VMS text has that particular blocky
 * look no font choice will reproduce.
 *
 * The 5x7 grid is not a stylistic decision here either — it is the same
 * `pixelfont` the e-ink companion uses, because that is the same reason: at
 * this size, a matrix of round dots is what a character is.
 *
 * ==================================================================
 * ONE PIXEL IS ONE QUAD
 * ==================================================================
 *
 * Every lit dot is projected as its own small quad on the sign's plane, rather
 * than the sign being drawn flat and text stamped on it. That costs more and it
 * is the only way the sign can be read at an angle: the dots have to converge
 * with the panel, or the text slides off the board as the camera passes.
 */

import { GLYPH_W, GLYPH_H, TRACKING, Bitmap } from '../pixelfont';
import type { Vec3 } from './camera';

/** Clearance under the sign, metres. Above the 4.1 m legal load height. */
export const CLEARANCE = 5.2;

/** Panel height, and the dot pitch that follows from the line count. */
export const PANEL_H = 2.4;

/** How far the gantry legs stand outside the kerb. */
export const LEG_OFFSET = 1.2;

export type Sign = {
  id: string;
  /** Where the gantry stands. */
  z: number;
  x: number;
  /**
   * Which way the road runs here.
   *
   * A sign spans the road, so its panel is perpendicular to the direction of
   * travel. Assuming the road runs north — which it does for most of this
   * drive — puts the board edge-on the moment you turn onto Wall Street, and an
   * edge-on sign is an invisible sign.
   */
  heading: number;
  /** Half-width of the panel. */
  halfWidth: number;
  /** Up to three lines of text. Rendered 5x7, so keep them short. */
  lines: string[];
  /** A smaller line under the message, in the amber-on-black style. */
  footer?: string;
};

/**
 * A sign's lit dots, as unit coordinates on the panel face.
 *
 * Returned in panel space — u across from the left edge, v down from the top,
 * both 0..1 — so the caller can place the panel wherever it likes and the text
 * follows without any of this knowing about the world.
 */
export function signDots(sign: Sign): { u: number; v: number; w: number; h: number }[] {
  const lines = sign.lines.slice(0, 3);
  const footer = sign.footer ? 1 : 0;
  const rows = lines.length + footer;
  if (rows === 0) return [];

  // The widest line sets the scale, so the board is filled rather than
  // centred inside a margin chosen by the longest word.
  const widest = Math.max(
    ...lines.map((l) => l.length),
    sign.footer ? Math.ceil(sign.footer.length * 0.72) : 0,
    1,
  );
  const cellW = 1 / (widest * (GLYPH_W + TRACKING));
  // Lines get a blank row between them, which is what makes three lines read as
  // three lines rather than as a block of dots.
  const cellH = 1 / (rows * (GLYPH_H + 2));

  const out: { u: number; v: number; w: number; h: number }[] = [];

  const emit = (text: string, row: number, scale: number) => {
    const bitmap = new Bitmap(
      Math.max(1, Math.round(text.length * (GLYPH_W + TRACKING))),
      GLYPH_H,
    );
    bitmap.text(0, 0, text.toUpperCase(), 1);

    const w = cellW * scale;
    const h = cellH * scale;
    // Centred on the board.
    const textW = bitmap.width * w;
    const left = (1 - textW) / 2;
    const top = row * (GLYPH_H + 2) * cellH + cellH;

    for (let y = 0; y < bitmap.height; y += 1) {
      for (let x = 0; x < bitmap.width; x += 1) {
        if (!bitmap.get(x, y)) continue;
        out.push({ u: left + x * w, v: top + y * h, w, h });
      }
    }
  };

  lines.forEach((line, i) => emit(line, i, 1));
  if (sign.footer) emit(sign.footer, lines.length, 0.72);

  return out;
}

/**
 * The four corners of a sign's face, in world coordinates.
 *
 * Order is bottom-left, bottom-right, top-right, top-left, looking at the face
 * from the side traffic approaches — so `u` runs left to right as a driver sees
 * it and `v` runs down from the top.
 */
export function panelCorners(sign: Sign): [Vec3, Vec3, Vec3, Vec3] {
  return [
    panelPoint(sign, 0, 1),
    panelPoint(sign, 1, 1),
    panelPoint(sign, 1, 0),
    panelPoint(sign, 0, 0),
  ];
}

/** The road's normal here — the direction the panel spans. */
export function across(sign: Sign): { x: number; z: number } {
  return { x: Math.cos(sign.heading), z: -Math.sin(sign.heading) };
}

/** A point on the panel face, from unit panel coordinates. */
export function panelPoint(sign: Sign, u: number, v: number): Vec3 {
  const top = CLEARANCE + PANEL_H;
  const n = across(sign);
  const lateral = (u - 0.5) * sign.halfWidth * 2;
  return {
    x: sign.x + n.x * lateral,
    y: top - v * PANEL_H,
    z: sign.z + n.z * lateral,
  };
}
