/**
 * What every chapter of the rocket entry is to the page that shows it.
 *
 * A chapter owns its physics, its drawing and its words; the page owns the
 * canvas, the button, the sound and the loop, and runs whichever chapter is
 * open through this interface. A new chapter is a module that implements it
 * and a line in `index.ts` — the page does not change.
 *
 * Chapters are plain objects with no React and no DOM beyond the canvas they
 * are handed, so each can be stepped and checked on its own.
 */

import type { Palette } from '../palette';

/** A colour key beside a working line, matching the arrows in the drawing. */
export type Tone = 'pull' | 'push' | 'escape';

/** One line of the working: what the quantity is, in words, and its key. */
export type WorkingLine = { key: string; label: string; tone?: Tone };

export type Sound = 'chime' | 'clunk' | 'thud';

/** The button, this frame: held down, and whether it went down or up since the last one. */
export type Input = { held: boolean; pressed: boolean; released: boolean };

export type Frame = {
  /** Seconds since the chapter opened, for flicker and drift; frozen under reduced motion. */
  t: number;
  /** The pencil's wobble: changes when the drawing boils. */
  seed: number;
  reduced: boolean;
};

export interface Chapter {
  /** The working panel's lines, in order. */
  readonly lines: readonly WorkingLine[];
  /** Moves the chapter on by `dt` real seconds; returns the sounds to play. */
  step(dt: number, input: Input): Sound[];
  /** The line under the button. */
  status(): string;
  /** What the button says. */
  button(): string;
  /** Each working line's value, with the numbers put in, by key. */
  working(): Record<string, string>;
  /** How loud the engine is, 0 to 1. */
  engine(): number;
  /** The drawing's size in CSS pixels. */
  resize(w: number, h: number): void;
  backdrop(ctx: CanvasRenderingContext2D, pal: Palette): void;
  still(ctx: CanvasRenderingContext2D, pal: Palette, seed: number): void;
  moment(ctx: CanvasRenderingContext2D, pal: Palette, frame: Frame): void;
}
