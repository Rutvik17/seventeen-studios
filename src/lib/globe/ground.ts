/**
 * The ground the globe is painted on: a canvas brushed over in acrylic — the
 * ground's colour, with strokes a shade lighter and a shade darker laid across
 * it (`brush.ts`) — and the light of a desk lamp from the upper left falling
 * away into the corners. It is made once for each size of the drawing.
 */

import { paintGround, shade as tint, toRgb } from '@/lib/sketchbook/brush';

/**
 * The ground, `w` × `h` device pixels: `ground` is its colour, `shade` the warm
 * dark the lamp's light falls off into.
 */
export function makeGround(w: number, h: number, ground: string, shade: string): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const g = c.getContext('2d')!;
  const [sr, sg, sb] = toRgb(shade);
  g.fillStyle = ground;
  g.fillRect(0, 0, c.width, c.height);
  paintGround(g, c.width, c.height, tint(ground, 0.22), 41, { alpha: 0.55, rows: 7 });
  paintGround(g, c.width, c.height, tint(ground, -0.07), 43, { alpha: 0.45, rows: 5 });
  paintGround(g, c.width, c.height, tint(ground, 0.1), 47, { alpha: 0.5, rows: 9 });

  // The lamp: warm light from the upper left, falling off to the corners.
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
  const lamp = g.createRadialGradient(c.width * 0.22, c.height * 0.12, 0, c.width * 0.22, c.height * 0.12, Math.hypot(c.width, c.height) * 0.62);
  lamp.addColorStop(0, `rgba(255, 226, 170, 0.34)`);
  lamp.addColorStop(0.45, `rgba(255, 214, 150, 0.1)`);
  lamp.addColorStop(1, `rgba(255, 210, 140, 0)`);
  g.fillStyle = lamp;
  g.fillRect(0, 0, c.width, c.height);
  const dusk = g.createRadialGradient(c.width * 0.4, c.height * 0.38, Math.min(c.width, c.height) * 0.35, c.width * 0.5, c.height * 0.5, Math.hypot(c.width, c.height) * 0.72);
  dusk.addColorStop(0, `rgba(${sr}, ${sg}, ${sb}, 0)`);
  dusk.addColorStop(1, `rgba(${sr}, ${sg}, ${sb}, 0.3)`);
  g.fillStyle = dusk;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
