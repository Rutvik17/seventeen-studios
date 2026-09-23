/**
 * Checks the rocket entry's physics against published figures and against
 * itself, so a change to `src/lib/rocket/physics.ts` cannot quietly make the
 * page wrong.
 *
 *   node --experimental-strip-types scripts/verify-rocket.mjs
 *
 * Runs in `postbuild`, beside the share-card and asset checks.
 *
 * - Escape speed at the surface: 11.186 km/s (Wikipedia, "Escape velocity").
 * - Gravity at the space station's height, 400 km: "nearly 90%" of the
 *   surface's (Wikipedia, "Gravity of Earth") — the inverse square gives 88.5%.
 * - Energy is kept: a rocket that coasts up and falls back lands at the speed
 *   the energy equation gives for its highest point, v = √(2GM(1/R − 1/r)).
 * - Orbital speed at the space station's height, √(g × r), against the
 *   station's own: 7.67 km/s (Wikipedia, "International Space Station"). It
 *   is escape speed divided by √2 — why the glossary can say satellites
 *   circle Earth more slowly than escape speed.
 * - The rules of the lesson hold: a tap that never beats the pull stays on the
 *   pad; a long hold escapes; a short one falls back; and firing again on the
 *   way down lands it slower than letting it fall.
 */

import { EARTH, advance, distanceFromCentre, escapeSpeedAt, gravityAt, onThePad, wouldEscape } from '../src/lib/rocket/physics.ts';

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};
const near = (value, target, tolerance) => Math.abs(value - target) / target <= tolerance;

/**
 * Holds the button for `hold` seconds at 60 frames a second, then lets go —
 * and, given `burnAt`, holds it again once the rocket is falling faster than
 * `burnAt` m/s.
 */
function fly(hold, limit = 120, burnAt = Infinity) {
  let f = onThePad();
  let t = 0;
  let leftPad = false;
  while (t < limit) {
    const on = t < hold || f.speed < -burnAt;
    f = advance(f, 1 / 60, on);
    t += 1 / 60;
    if (!f.onPad) leftPad = true;
    if (f.touchdownSpeed !== null) return { outcome: 'fell back', f, leftPad };
    if (!on && wouldEscape(f.height, f.speed)) return { outcome: 'escaped', f, leftPad };
    if (!on && f.onPad && f.throttle === 0 && !leftPad) return { outcome: 'never left the pad', f, leftPad };
  }
  return { outcome: 'still flying', f, leftPad };
}

const surface = escapeSpeedAt(0);
check(near(surface, 11_186, 0.002), `escape speed at the surface is ${surface.toFixed(0)} m/s, not 11,186 m/s ± 0.2%`);

const station = gravityAt(400_000) / gravityAt(0);
check(station > 0.87 && station < 0.9, `gravity at 400 km is ${(station * 100).toFixed(1)}% of the surface's, not "nearly 90%"`);

for (const hold of [1.5, 2.5, 3.5]) {
  const { outcome, f } = fly(hold);
  check(outcome === 'fell back', `a ${hold} s hold should fall back, but ${outcome}`);
  if (outcome === 'fell back') {
    const R = EARTH.radius;
    const exact = Math.sqrt(2 * EARTH.g0 * R * R * (1 / R - 1 / (R + f.highest)));
    check(near(f.touchdownSpeed, exact, 0.005), `a ${hold} s flight lands at ${f.touchdownSpeed.toFixed(0)} m/s; its energy says ${exact.toFixed(0)} m/s`);
  }
}

const orbit = Math.sqrt(gravityAt(400_000) * distanceFromCentre(400_000));
check(near(orbit, 7_670, 0.01), `orbital speed at 400 km is ${orbit.toFixed(0)} m/s, not the station's 7,670 m/s ± 1%`);
check(near(orbit * Math.SQRT2, escapeSpeedAt(400_000), 1e-9), 'escape speed should be orbital speed × √2');

const free = fly(1.5);
const burned = fly(1.5, 120, 100);
check(burned.outcome === 'fell back' && burned.f.touchdownSpeed < free.f.touchdownSpeed / 2,
  `a burn on the way down should at least halve the landing speed: ${burned.f.touchdownSpeed?.toFixed(0)} m/s against ${free.f.touchdownSpeed?.toFixed(0)} m/s`);

check(fly(0.4).outcome === 'never left the pad', 'a 0.4 s tap should not beat the pull');
check(fly(4.5).outcome === 'escaped', 'a 4.5 s hold should escape');

if (failures.length) {
  console.error('rocket physics:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('rocket: escape speed, orbital speed, gravity with height, energy and the lesson’s rules all check out');
