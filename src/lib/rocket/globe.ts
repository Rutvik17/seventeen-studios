/**
 * The rocket entry's orbit scene: the whole Earth, drawn to scale, with
 * Newton's cannon on a mountain at the top — where the ball will go while it
 * is loaded, and where it went once it is fired.
 *
 * The same three layers as the sky scene (`sky.ts`), in the same pencil.
 */

import { circle, rng, smooth, type Pt } from '@/lib/sketchbook/geometry';
import { colourIn, fill, hatch, label, sketch } from '@/lib/sketch/pencil';
import { EARTH } from './physics';
import type { Body } from './orbit';
import type { Palette } from './palette';

export type GlobeLayout = {
  w: number;
  h: number;
  cx: number;
  cy: number;
  /** The Earth's radius on the page, px. */
  r: number;
  /** Pixels per metre. */
  k: number;
  /** Where the cannon stands, metres up. */
  height: number;
  /** How far from the centre a path is followed, metres: a little past the corners. */
  reach: number;
};

export function globeLayout(w: number, h: number, height: number): GlobeLayout {
  const r = Math.min(w, h) * 0.27;
  const k = r / EARTH.radius;
  const cx = w / 2;
  const cy = h * 0.53;
  return { w, h, cx, cy, r, k, height, reach: (Math.hypot(w, h) / k) * 0.75 };
}

/** A point in space (metres from Earth's centre, y up) on the page. */
export function toPage(L: GlobeLayout, b: { x: number; y: number }): Pt {
  return { x: L.cx + b.x * L.k, y: L.cy - b.y * L.k };
}

/** The land on the drawn Earth: made-up continents, so the planet reads as one at a glance. */
const LANDS: readonly (readonly [number, number])[][] = [
  [[-0.62, -0.35], [-0.3, -0.5], [-0.05, -0.32], [-0.12, 0.02], [-0.38, 0.12], [-0.6, -0.05]],
  [[0.2, -0.6], [0.52, -0.46], [0.6, -0.12], [0.36, 0.02], [0.18, -0.22]],
  [[0.05, 0.3], [0.38, 0.24], [0.5, 0.52], [0.22, 0.7], [0.02, 0.56]],
  [[-0.5, 0.42], [-0.25, 0.38], [-0.3, 0.62], [-0.48, 0.6]],
];

function land(L: GlobeLayout): Pt[][] {
  return LANDS.map((shape) =>
    smooth(
      shape.map(([u, v]) => ({ x: L.cx + u * L.r, y: L.cy + v * L.r })),
      6,
      true,
    ),
  );
}

export function drawGlobeBackdrop(ctx: CanvasRenderingContext2D, L: GlobeLayout, pal: Palette) {
  // Space, deepest at the edges.
  const space = ctx.createRadialGradient(L.cx, L.cy, L.r, L.cx, L.cy, Math.hypot(L.w, L.h) * 0.6);
  space.addColorStop(0, pal.skyHigh);
  space.addColorStop(1, pal.space);
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = space;
  ctx.fillRect(0, 0, L.w, L.h);
  ctx.globalAlpha = 1;
  hatch(ctx, { x: 0, y: 0, w: L.w, h: L.h }, 7, -Math.PI / 6, { seed: 11, color: pal.skyHigh, width: 1, jitter: 0.8, alpha: 0.16 });

  // A thin halo of air, then the planet: ocean, and land coloured over it.
  const globe = circle({ x: L.cx, y: L.cy }, L.r, 96);
  fill(ctx, circle({ x: L.cx, y: L.cy }, L.r + 5, 96), pal.air, 0.55);
  fill(ctx, globe, pal.paper);
  ctx.save();
  ctx.beginPath();
  ctx.arc(L.cx, L.cy, L.r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = pal.ocean;
  ctx.fillRect(L.cx - L.r, L.cy - L.r, L.r * 2, L.r * 2);
  ctx.globalAlpha = 1;
  hatch(ctx, { x: L.cx - L.r, y: L.cy - L.r, w: L.r * 2, h: L.r * 2 }, 6, Math.PI / 4, { seed: 700, color: pal.ocean, width: 1.1, jitter: 0.8, alpha: 0.7 });
  land(L).forEach((shape, i) => {
    fill(ctx, shape, pal.paper);
    colourIn(ctx, shape, pal.land, 760 + i * 13, 5);
  });
  ctx.restore();
}

export function drawGlobeStill(
  ctx: CanvasRenderingContext2D,
  L: GlobeLayout,
  pal: Palette,
  seed: number,
  words: { ring: string; cannon: string },
) {
  const small = L.w < 520 ? 12 : 14;

  // Stars, clear of the planet.
  const stars = rng(1729);
  const count = Math.round((L.w * L.h) / 5200);
  for (let i = 0; i < count; i += 1) {
    const x = 10 + stars() * (L.w - 20);
    const y = 10 + stars() * (L.h - 20);
    const s = 1.6 + stars() * 2.4;
    if (Math.hypot(x - L.cx, y - L.cy) < L.r * 1.25) continue;
    sketch(ctx, [{ x: x - s, y }, { x: x + s, y }], { seed: seed + i * 3, color: pal.star, width: 1.4, jitter: 0.3 });
    sketch(ctx, [{ x, y: y - s }, { x, y: y + s }], { seed: seed + i * 3 + 1, color: pal.star, width: 1.4, jitter: 0.3 });
  }

  // The planet's outline and its coasts.
  sketch(ctx, circle({ x: L.cx, y: L.cy }, L.r, 96), { seed: seed + 800, color: pal.charcoal, width: 2.4, jitter: 0.8, closed: true });
  land(L).forEach((shape, i) => sketch(ctx, shape, { seed: seed + 810 + i, color: pal.charcoal, width: 1.2, jitter: 0.6, alpha: 0.7, closed: true }));

  // The cannon's height, all the way round, dashed.
  const ring = L.r + L.height * L.k;
  ctx.setLineDash([3, 7]);
  sketch(ctx, circle({ x: L.cx, y: L.cy }, ring, 120), { seed: seed + 500, color: pal.mark, width: 1.2, jitter: 0.4, alpha: 0.75, closed: true });
  ctx.setLineDash([]);
  label(ctx, words.ring, L.cx + ring * 0.74, L.cy - ring * 0.74 - small, pal, { size: small, color: pal.mark });

  // Newton's mountain, to scale, and the cannon on its peak, pointing east.
  const peak = { x: L.cx, y: L.cy - ring };
  const foot = L.r * 0.16;
  const mountain = [{ x: L.cx - foot, y: L.cy - L.r + 2 }, peak, { x: L.cx + foot, y: L.cy - L.r + 2 }];
  fill(ctx, mountain, pal.metal, 0.5);
  sketch(ctx, mountain, { seed: seed + 900, color: pal.charcoal, width: 1.6, jitter: 0.4 });
  const s = Math.max(5, L.r * 0.035);
  const barrel = [{ x: peak.x - s * 0.6, y: peak.y - s * 0.9 }, { x: peak.x + s * 2.2, y: peak.y - s * 1.3 }, { x: peak.x + s * 2.2, y: peak.y - s * 0.5 }, { x: peak.x - s * 0.6, y: peak.y - s * 0.2 }];
  colourIn(ctx, barrel, pal.charcoal, seed + 910, 2);
  sketch(ctx, barrel, { seed: seed + 911, color: pal.charcoal, width: 1.4, jitter: 0.3, closed: true });
  const wheel = circle({ x: peak.x, y: peak.y - s * 0.35 }, s * 0.55, 12);
  fill(ctx, wheel, pal.dust, 0.9);
  sketch(ctx, wheel, { seed: seed + 912, color: pal.charcoal, width: 1.2, jitter: 0.3, closed: true });
  label(ctx, words.cannon, peak.x - s * 1.4, peak.y - s * 2.6, pal, { size: small, color: pal.charcoal, align: 'right' });
}

export type Shot = {
  /** Where a throw at the loaded speed would go, while loading; coloured by where it ends up. */
  aim: { points: readonly Body[]; kind: 'falls' | 'orbits' | 'escapes' } | null;
  /** Where the ball has been. */
  trail: readonly Body[];
  ball: Body | null;
  /** Where it came down, and how long ago, seconds. */
  impact: { at: Body; since: number } | null;
  /** Seconds since the cannon fired, or null. */
  sinceFire: number | null;
  seed: number;
};

function line(L: GlobeLayout, points: readonly Body[]): Pt[] {
  const out: Pt[] = [];
  let last: Pt | null = null;
  for (const b of points) {
    const p = toPage(L, b);
    // Drop points closer than a few pixels: the pencil wobble is per point.
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 4) out.push(p);
    last = out[out.length - 1];
  }
  return out;
}

export function drawShot(ctx: CanvasRenderingContext2D, L: GlobeLayout, pal: Palette, shot: Shot) {
  const colour = { falls: pal.red, orbits: pal.mark, escapes: pal.push } as const;
  if (shot.aim) {
    ctx.setLineDash([5, 6]);
    sketch(ctx, line(L, shot.aim.points), { seed: shot.seed + 20, color: colour[shot.aim.kind], width: 2, jitter: 0.5 });
    ctx.setLineDash([]);
  }
  if (shot.trail.length > 1) {
    sketch(ctx, line(L, shot.trail), { seed: shot.seed + 30, color: pal.flame, width: 2.2, jitter: 0.4, alpha: 0.9 });
  }

  const peak = toPage(L, { x: 0, y: EARTH.radius + L.height });
  const s = Math.max(5, L.r * 0.035);
  if (shot.sinceFire !== null && shot.sinceFire < 0.35) {
    // The flash and smoke at the muzzle.
    const u = shot.sinceFire / 0.35;
    const muzzle = { x: peak.x + s * 2.6, y: peak.y - s * 0.9 };
    fill(ctx, circle(muzzle, s * (0.8 + u * 1.6), 14), pal.flameMid, 0.9 * (1 - u));
    fill(ctx, circle(muzzle, s * (0.4 + u * 0.8), 12), pal.flameCore, 0.9 * (1 - u));
  }

  if (shot.impact && shot.impact.since < 1.2) {
    const u = shot.impact.since / 1.2;
    const at = toPage(L, shot.impact.at);
    for (let i = 0; i < 3; i += 1) {
      sketch(ctx, circle(at, s * (0.8 + u * 3) * (1 + i * 0.4), 18), {
        seed: shot.seed + 60 + i, color: pal.dust, width: 1.5, jitter: 0.8, alpha: 1 - u, closed: true,
      });
    }
  }

  if (shot.ball) {
    const p = toPage(L, shot.ball);
    const ball = circle(p, Math.max(3.5, s * 0.5), 12);
    fill(ctx, ball, pal.charcoal);
    fill(ctx, circle({ x: p.x - s * 0.15, y: p.y - s * 0.15 }, Math.max(1, s * 0.14), 8), pal.body, 0.9);
  }
}
