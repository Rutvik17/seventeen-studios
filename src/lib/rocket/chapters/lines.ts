/**
 * The working lines the upright chapters share — weight, push against pull,
 * escape speed, speed and height — written once, each with its numbers put in.
 */

import { rocketCopy } from '@/content/rocket';
import { distanceFromCentre, escapeSpeedAt, gravityAt } from '../physics';
import * as fmt from '../format';

/** "10,000 kg × 9.81 m/s² = 98.1 kN" */
export function weightLine(mass: number, height: number): string {
  const g = gravityAt(height);
  return `${fmt.kilograms(mass)} × ${fmt.gravity(g)} = ${fmt.kilonewtons(mass * g)}`;
}

/** "0.0 kN (300.0 kN at full power)" */
export function thrustLine(thrust: number, full: number): string {
  return `${fmt.kilonewtons(thrust)} (${fmt.kilonewtons(full)} ${rocketCopy.fullPower})`;
}

/**
 * "268.9 kN − 97.7 kN = 171.2 kN up". Standing on the ground with the push
 * below the pull, the ground makes up the difference, and says so.
 */
export function netLine(thrust: number, weight: number, onGround: boolean): string {
  const net = thrust - weight;
  const held = onGround && net <= 0 ? ` — ${rocketCopy.groundHolds}` : '';
  return `${fmt.kilonewtons(thrust)} − ${fmt.kilonewtons(weight)} = ${fmt.kilonewtons(Math.abs(net))} ${net >= 0 ? rocketCopy.up : rocketCopy.down}${held}`;
}

/** "√(2 × 9.81 m/s² × 6,371,009 m) = 11.18 km/s" */
export function escapeLine(height: number): string {
  return `√(2 × ${fmt.gravity(gravityAt(height))} × ${fmt.metres(distanceFromCentre(height))}) = ${fmt.speed(escapeSpeedAt(height))}`;
}

/** "529 m/s up · 25 km", with anything to add after it. */
export function motionLine(speed: number, height: string, after = ''): string {
  const direction = Math.abs(speed) < 0.5 ? '' : ` ${speed < 0 ? rocketCopy.down : rocketCopy.up}`;
  return `${fmt.speed(speed)}${direction} · ${height}${after}`;
}
