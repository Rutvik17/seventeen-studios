/**
 * Playing the trip back: about seventy seconds of watching for three days of
 * mission, fast through the long coasts and slow at the moments that matter.
 *
 * Each moment of the mission is pinned to a moment of playback; between the
 * pins, a smooth curve (monotone cubic — it never runs backwards or
 * overshoots) sets how fast mission time runs, so the speed-ups ease in and
 * out rather than jumping.
 */

import { moonAt } from './bodies';
import type { EventId, Mission, Sample } from './mission';

/** Seconds of playback at which each moment of the mission is shown. */
const PINS: [EventId | 'end', number][] = [
  ['liftoff', 0],
  ['separation', 12],
  ['caught', 24],
  ['orbit', 28],
  ['docked', 31],
  ['refuelled', 36],
  ['moonBurnEnd', 39],
  ['perilune', 50],
  ['moonOrbit', 52],
  ['dip', 57],
  ['descent', 60],
  ['touchdown', 72],
  ['end', 76],
];

export type Timeline = {
  /** Seconds of playback, start to finish. */
  length: number;
  /** Mission time at playback second `p`. */
  missionAt(p: number): number;
  /** Playback second at mission time `t`. */
  playbackAt(t: number): number;
};

/** Monotone cubic interpolation through (xs, ys) (Fritsch–Carlson). */
function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = xs.map((_, i) => (i === 0 ? d[0] : i === n - 1 ? d[n - 2] : d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2));
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * d[i];
      m[i + 1] = k * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i += 1;
    const h = xs[i + 1] - xs[i];
    const u = (x - xs[i]) / h;
    const u2 = u * u;
    const u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

export function timelineFor(mission: Mission): Timeline {
  const ps = PINS.map(([, p]) => p);
  // Growing mission time spans nine orders of magnitude per step; interpolate
  // its logarithm, so each stretch eases smoothly whatever its length.
  const ts = PINS.map(([id]) => (id === 'end' ? mission.end : mission.events[id]));
  const logs = ts.map((t) => Math.log1p(t));
  const forward = monotone(ps, logs);
  const backward = monotone(logs, ps);
  return {
    length: ps[ps.length - 1],
    missionAt: (p) => Math.expm1(forward(p)),
    playbackAt: (t) => backward(Math.log1p(t)),
  };
}

/* ------------------------------------------------------------------ *
 * Where things were
 * ------------------------------------------------------------------ */

/** The last sample at or before `t` (binary search). */
function indexAt(track: Sample[], t: number): number {
  let lo = 0;
  let hi = track.length - 1;
  if (t <= track[0].t) return 0;
  if (t >= track[hi].t) return hi;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (track[mid].t <= t) lo = mid;
    else hi = mid;
  }
  return lo;
}

/** The angle from `a` to `b` the short way round. */
function turn(a: number, b: number): number {
  let d = (b - a) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

/**
 * A craft's state at mission time `t`, between samples: position by cubic
 * Hermite interpolation (it uses the velocities, so a coarse sample of an
 * orbit still traces the curve), everything else in a straight line.
 */
export function stateAt(track: Sample[], t: number): Sample {
  const i = indexAt(track, t);
  const a = track[i];
  const b = track[Math.min(i + 1, track.length - 1)];
  const h = b.t - a.t;
  if (h <= 0 || t <= a.t) return { ...a, t };
  const u = Math.min(1, (t - a.t) / h);
  const u2 = u * u;
  const u3 = u2 * u;
  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;
  const d00 = 6 * u2 - 6 * u;
  const d10 = 3 * u2 - 4 * u + 1;
  const d01 = -6 * u2 + 6 * u;
  const d11 = 3 * u2 - 2 * u;
  return {
    t,
    x: h00 * a.x + h10 * h * a.vx + h01 * b.x + h11 * h * b.vx,
    y: h00 * a.y + h10 * h * a.vy + h01 * b.y + h11 * h * b.vy,
    vx: (d00 * a.x + d10 * h * a.vx + d01 * b.x + d11 * h * b.vx) / h,
    vy: (d00 * a.y + d10 * h * a.vy + d01 * b.y + d11 * h * b.vy) / h,
    m: a.m + (b.m - a.m) * u,
    throttle: a.throttle + (b.throttle - a.throttle) * u,
    nose: a.nose + turn(a.nose, b.nose) * u,
  };
}

/**
 * The ship at mission time `t`. After touchdown it stands where it landed, and
 * the Moon carries it along its orbit.
 */
export function shipAt(m: Mission, t: number): Sample {
  const s = stateAt(m.ship, t);
  if (t < m.events.touchdown) return s;
  const moon = moonAt(t, m.moonPhase);
  return { ...s, t, x: moon.x + m.site.x, y: moon.y + m.site.y, vx: moon.vx, vy: moon.vy, throttle: 0, nose: Math.atan2(m.site.x, m.site.y) };
}

/** The samples between two mission times, for drawing a path. */
export function between(track: Sample[], from: number, to: number): Sample[] {
  const i = indexAt(track, from);
  const j = indexAt(track, to);
  return track.slice(i, j + 1);
}
