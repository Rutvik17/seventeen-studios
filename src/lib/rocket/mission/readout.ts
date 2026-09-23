/**
 * What the page says at each moment of the trip: the line under the button,
 * and the working — which quantities, in words, and their values with the
 * numbers put in. Pure, so the page and the checks read the same words.
 */

import { rocketCopy } from '@/content/rocket';
import { EARTH, GM, MOON, MOON_GM, moonAt } from './bodies';
import type { Mission, Sample } from './mission';
import { shipAt, stateAt } from './timeline';
import { BOOSTER, SHIP } from './vehicle';
import * as fmt from '../format';

const w = rocketCopy.working;

export type Tone = 'pull' | 'push' | 'escape';
export type Line = { key: string; label: string; tone?: Tone };

/** The working panel's lines, one set per stretch of the trip. */
export const GROUPS = {
  launch: [
    { key: 'weight', label: w.weight, tone: 'pull' },
    { key: 'thrust', label: w.thrust, tone: 'push' },
    { key: 'net', label: w.net },
    { key: 'motion', label: w.motion },
  ],
  ascent: [
    { key: 'motion', label: w.motion },
    { key: 'circle', label: w.circle, tone: 'escape' },
    { key: 'sideways', label: w.sideways, tone: 'push' },
    { key: 'booster', label: w.booster },
  ],
  orbit: [
    { key: 'motion', label: w.motion },
    { key: 'circle', label: w.circle, tone: 'escape' },
    { key: 'fuel', label: w.fuel, tone: 'push' },
  ],
  out: [
    { key: 'speed', label: w.speed, tone: 'push' },
    { key: 'escape', label: w.escape, tone: 'escape' },
    { key: 'toMoon', label: w.toMoon },
  ],
  moon: [
    { key: 'moonHeight', label: w.moonHeight },
    { key: 'circleMoon', label: w.circleMoon, tone: 'escape' },
    { key: 'moonGravity', label: w.moonGravity, tone: 'pull' },
  ],
  landing: [
    { key: 'moonHeight', label: w.moonHeight },
    { key: 'fuel', label: w.fuel, tone: 'push' },
    { key: 'moonGravity', label: w.moonGravity, tone: 'pull' },
  ],
} as const satisfies Record<string, readonly Line[]>;

export type Group = keyof typeof GROUPS;

export function groupAt(m: Mission, t: number): Group {
  const e = m.events;
  if (t < e.separation) return 'launch';
  if (t < e.orbit) return 'ascent';
  if (t < e.moonBurn) return 'orbit';
  if (t < e.perilune - 2 * 3600) return 'out';
  if (t < e.descent) return 'moon';
  return 'landing';
}

/** The line under the button at mission time `t`; `started` is false before lift-off. */
export function statusAt(m: Mission, t: number, started: boolean): string {
  const e = m.events;
  const b = rocketCopy.beats;
  if (!started) return b.ready;
  if (t >= e.touchdown) return b.landed(fmt.span(e.touchdown));
  if (t >= e.caught && t < e.caught + 20) return b.caught;
  if (t < 20) return b.liftoff;
  if (t < e.separation) return b.climb;
  if (t < e.separation + 25) return b.separation(fmt.height(m.facts.separation.h));
  if (t < e.orbit) return b.toOrbit;
  if (t < e.docked) return b.orbit;
  if (t < e.refuelled) return b.refuel;
  if (t < e.moonBurnEnd + 120) return b.moonBurn;
  if (t < e.perilune - 2 * 3600) return b.coast;
  if (t < e.moonOrbit + 120) return b.arrive;
  if (t < e.dip) return b.moonOrbit(fmt.lap(m.facts.moonOrbit.period));
  if (t < e.descent) return b.dip;
  return b.descent;
}

const around = (s: Sample) => {
  const r = Math.hypot(s.x, s.y);
  const ux = s.x / r;
  const uy = s.y / r;
  return { r, h: r - EARTH.radius, up: s.vx * ux + s.vy * uy, across: s.vx * uy - s.vy * ux, v: Math.hypot(s.vx, s.vy) };
};

/** Each working line's value at mission time `t`, with the numbers put in. */
export function workingAt(m: Mission, t: number): Record<string, string> {
  const e = m.events;
  const s = shipAt(m, t);
  const a = around(s);
  const g = GM / (a.r * a.r);
  const direction = (v: number) => (Math.abs(v) < 0.5 ? '' : ` ${v < 0 ? rocketCopy.down : rocketCopy.up}`);
  const motion = `${fmt.speed(a.v)} · ${fmt.height(a.h)}`;
  const shipFuel = fmt.tonnes(Math.max(0, s.m - SHIP.dry));

  if (t < e.separation) {
    const thrust = BOOSTER.thrust * s.throttle;
    const weight = s.m * g;
    const net = thrust - weight;
    // On the pad before the engines light, the ground holds it up.
    const held = t <= 0;
    return {
      weight: `${fmt.tonnes(s.m)} × ${fmt.gravity(g)} = ${fmt.meganewtons(weight)}`,
      thrust: fmt.meganewtons(held ? 0 : thrust),
      net: held ? `${fmt.meganewtons(0)} — ${rocketCopy.groundHolds}` : `${fmt.meganewtons(Math.abs(net))}${direction(net)}`,
      motion,
    };
  }
  if (t < e.orbit) {
    const b = around(stateAt(m.booster, Math.min(t, e.caught)));
    return {
      motion,
      circle: `√(${fmt.gravity(g)} × ${fmt.distance(a.r)}) = ${fmt.speed(Math.sqrt(g * a.r))}`,
      sideways: fmt.speed(a.across),
      booster: t >= e.caught ? w.caughtAt(fmt.clock(e.caught)) : `${fmt.speed(b.v)} · ${fmt.height(b.h)}`,
    };
  }
  if (t < e.moonBurn) {
    return { motion, circle: `√(${fmt.gravity(g)} × ${fmt.distance(a.r)}) = ${fmt.speed(Math.sqrt(g * a.r))}`, fuel: shipFuel };
  }
  const moon = moonAt(t, m.moonPhase);
  if (t < e.perilune - 2 * 3600) {
    const toMoon = Math.hypot(s.x - moon.x, s.y - moon.y) - MOON.radius;
    return {
      speed: fmt.speed(a.v),
      escape: `√(2 × ${fmt.gravity(g)} × ${fmt.distance(a.r)}) = ${fmt.speed(Math.sqrt(2 * g * a.r))}`,
      toMoon: fmt.distance(toMoon),
    };
  }
  const rx = s.x - moon.x;
  const ry = s.y - moon.y;
  const rm = Math.hypot(rx, ry);
  const gm = MOON_GM / (rm * rm);
  const vm = Math.hypot(s.vx - moon.vx, s.vy - moon.vy);
  const onGround = t >= e.touchdown;
  const share = MOON_GM / MOON.radius ** 2 / EARTH.g0;
  return {
    moonHeight: `${fmt.speed(onGround ? 0 : vm)} · ${fmt.height(onGround ? 0 : rm - MOON.radius)}`,
    circleMoon: `√(${fmt.gravity(gm)} × ${fmt.distance(rm)}) = ${fmt.speed(Math.sqrt(gm * rm))}`,
    moonGravity: `${fmt.gravity(MOON_GM / MOON.radius ** 2)}, ${w.share(`${Math.round(share * 100)}%`)}`,
    fuel: shipFuel,
  };
}
