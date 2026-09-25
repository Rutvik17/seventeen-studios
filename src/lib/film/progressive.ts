/**
 * A drawing that can be shown at any stage, from a blank sheet to finished:
 * the pencil over the first part of its progress, the washes over the rest.
 * The studio (`studio.ts`) and the notebook's drawings are shown through it.
 *
 * Both stages only ever add to what is on the sheet — progress moves forward,
 * a glaze once laid stays laid — so a frame never repaints what it has
 * already painted.
 */

import { clamp, smooth } from './random';
import { drawStroke, pointAt, type Stroke } from './pencil';
import type { Glazed, Pt } from './wash';

export class Progressive {
  private inkDrawn = 0;
  private done: number[];
  private effort: number[];
  private total: number;
  progress = 0;
  /** Where the pencil's point is while it is drawing, or null. */
  pencilAt: Pt | null = null;
  /** Where the brush is while it is laying a wash, or null. */
  brushAt: Pt | null = null;

  constructor(
    private drawing: { ink: Stroke[]; washes: Glazed[] },
    private inkCtx: CanvasRenderingContext2D,
    private paintCtx: CanvasRenderingContext2D,
    /** Share of the progress the pencil has before the brush starts, and when it stops. */
    private split = { inkEnd: 0.55, paintStart: 0.4 },
  ) {
    this.done = drawing.washes.map(() => 0);
    this.effort = drawing.ink.map((s) => s.length + 14);
    this.total = this.effort.reduce((a, b) => a + b, 0);
  }

  set(p: number) {
    this.progress = Math.max(this.progress, clamp(p));
    const q = this.progress;
    this.ink(this.total * smooth(0, this.split.inkEnd, q));
    const paint = clamp((q - this.split.paintStart) / (1 - this.split.paintStart));
    const n = this.drawing.washes.length;
    this.brushAt = null;
    this.drawing.washes.forEach((w, k) => {
      const start = (k / n) * 0.85;
      const due = Math.floor(clamp((paint - start) / 0.15) * w.layers);
      while (this.done[k] < due) w.pass(this.paintCtx, this.done[k]++);
      if (this.done[k] > 0 && this.done[k] < w.layers && Number.isFinite(w.cx)) this.brushAt = [w.cx, w.cy];
    });
    if (q >= 1) {
      this.pencilAt = null;
      this.brushAt = null;
    }
  }

  private ink(target: number) {
    let acc = 0;
    this.pencilAt = null;
    for (let i = 0; i < this.drawing.ink.length; i++) {
      const s = this.drawing.ink[i];
      const a = acc;
      const b = acc + this.effort[i];
      acc = b;
      if (b <= this.inkDrawn) continue;
      if (a >= target) break;
      const from = Math.max(0, this.inkDrawn - a - 14);
      const to = Math.min(s.length, target - a - 14);
      if (to > from) drawStroke(this.inkCtx, s, from, to);
      if (target < b) this.pencilAt = pointAt(s, Math.max(0, to));
    }
    this.inkDrawn = Math.max(this.inkDrawn, target);
  }
}
