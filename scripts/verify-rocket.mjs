/**
 * Checks the rocket entry's trip — pad to Moon, and the booster home —
 * against what real flights did and against the laws it runs on, so a change
 * to `src/lib/rocket/` cannot quietly make the page wrong.
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/verify-rocket.mjs
 *
 * Runs in `postbuild`, beside the share-card and asset checks.
 *
 * Published figures it is held to:
 * - Escape speed at the surface, 11.186 km/s; gravity at 400 km "nearly 90%"
 *   of the surface's (Wikipedia, "Escape velocity", "Gravity of Earth").
 * - Starship Flight 5 (Wikipedia, "Starship flight test 5"): hot staging at
 *   T+2:40; the booster caught by the tower at T+6:54; ship engine cut-off at
 *   T+8:27. Stage separation happens around 70 km up.
 * - The space station: 7.67 km/s, and 92.9 minutes once round at 413–422 km
 *   (Wikipedia, "International Space Station").
 * - Apollo 11 (Wikipedia, "Apollo 11"): the Moon burn took it from 7.8 to
 *   10.8 km/s; about 73 hours from that burn to Moon orbit; a Moon orbit of
 *   about 100 km taking 2 hours a lap; a powered descent of 756 seconds.
 */

import { EARTH, GM, circleSpeedAt, escapeSpeedAt, gravityAt } from '../src/lib/rocket/physics.ts';
import { MOON, MOON_GM } from '../src/lib/rocket/mission/bodies.ts';
import { flyMission } from '../src/lib/rocket/mission/mission.ts';
import { BOOSTER, SHIP } from '../src/lib/rocket/mission/vehicle.ts';

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};
const near = (value, target, tolerance) => Math.abs(value - target) / Math.abs(target) <= tolerance;
const within = (value, lo, hi) => value >= lo && value <= hi;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

/* ---- gravity and escape ---- */

check(near(escapeSpeedAt(0), 11_186, 0.002), `escape speed at the surface is ${escapeSpeedAt(0).toFixed(0)} m/s, not 11,186 m/s ± 0.2%`);
const station = gravityAt(400_000) / gravityAt(0);
check(within(station, 0.87, 0.9), `gravity at 400 km is ${(station * 100).toFixed(1)}% of the surface's, not "nearly 90%"`);
check(near(circleSpeedAt(400_000), 7_670, 0.01), `circling speed at 400 km is ${circleSpeedAt(400_000).toFixed(0)} m/s, not the station's 7,670 m/s ± 1%`);
{
  const r = EARTH.radius + (413_000 + 422_000) / 2;
  const minutes = (2 * Math.PI * Math.sqrt((r * r * r) / GM)) / 60;
  check(near(minutes, 92.9, 0.005), `once round at the station's height takes ${minutes.toFixed(1)} min, not its 92.9 min ± 0.5%`);
}
check(near(MOON_GM / MOON.radius ** 2, 1.622, 1e-9), "the Moon's GM should give back its surface gravity");

/* ---- the trip ---- */

const t0 = performance.now();
const m = flyMission();
const ms = performance.now() - t0;
const { events: e, facts: f } = m;

check(ms < 2000, `flying the trip took ${ms.toFixed(0)} ms; the page does this while the loader is up`);

// Separation (Flight 5: T+2:40, ~70 km).
check(near(e.separation, 160, 0.02), `separation at T+${clock(e.separation)}, not T+2:40`);
check(within(f.separation.h, 60_000, 80_000), `separation ${(f.separation.h / 1000).toFixed(0)} km up, not 60–80 km`);

// The booster home, caught (Flight 5: T+6:54).
check(within(e.caught, 6 * 60 + 30, 7 * 60 + 30), `booster caught at T+${clock(e.caught)}, not around T+7`);
check(f.caught.miss < 2, `booster caught ${f.caught.miss.toFixed(1)} m from the arms, not within 2 m`);
check(f.caught.speed < 1, `booster moving at ${f.caught.speed.toFixed(2)} m/s when caught, not under 1 m/s`);
check(f.caught.fuelLeft > 0, 'booster ran its tanks dry on the way home');
check(Math.min(...m.booster.filter((s) => s.t > e.separation).map((s) => Math.hypot(s.x, s.y) - EARTH.radius)) > 0, 'booster went below the ground');

// Orbit (Flight 5 engine cut-off T+8:27).
check(within(e.orbit, 7.5 * 60, 9.5 * 60), `engine cut-off at T+${clock(e.orbit)}, not around T+8:27`);
check(near(f.orbit.v, circleSpeedAt(f.orbit.h), 0.01), `speed at cut-off ${f.orbit.v.toFixed(0)} m/s is not circling speed ± 1%`);
check(f.orbit.low > 150_000 && f.orbit.high < 250_000, `orbit ${(f.orbit.low / 1000).toFixed(0)} × ${(f.orbit.high / 1000).toFixed(0)} km, not about 200 km`);
check(f.orbit.fuelLeft > 0, 'ship ran its tanks dry reaching orbit');

// The Moon burn (Apollo 11: 7.8 → 10.8 km/s), just under escape speed.
check(within(f.moonBurn.v, 10_750, 11_000), `Moon burn ends at ${f.moonBurn.v.toFixed(0)} m/s, not 10.8–11.0 km/s`);
check(f.moonBurn.v < f.moonBurn.escape, 'the Moon burn should stop short of escape speed');

// Three days out (Apollo 11: ~73 h from the burn to Moon orbit).
const out = (e.moonOrbit - e.moonBurnEnd) / 3600;
check(within(out, 60, 84), `${out.toFixed(0)} h from the Moon burn to Moon orbit, not about three days`);

// Moon orbit (Apollo 11: ~100 km, 2 h a lap).
check(f.moonOrbit.low > 30_000 && f.moonOrbit.high < 200_000, `Moon orbit ${(f.moonOrbit.low / 1000).toFixed(0)} × ${(f.moonOrbit.high / 1000).toFixed(0)} km, not about 100 km`);
check(within(f.moonOrbit.period / 3600, 1.8, 2.2), `a lap of the Moon takes ${(f.moonOrbit.period / 3600).toFixed(2)} h, not about 2 h`);

// Landing (Apollo 11: 756 s of powered descent).
const descent = e.touchdown - e.descent;
check(within(descent, 600, 900), `powered descent ${descent.toFixed(0)} s, not 10–15 minutes`);
check(f.touchdown.speed < 2, `touched down at ${f.touchdown.speed.toFixed(1)} m/s, not under 2 m/s`);
check(f.touchdown.fuelLeft > 0, 'ship ran its tanks dry landing');

// Nothing ever weighs less than its empty mass; no sample goes backwards in time.
check(m.ship.every((s) => s.m >= SHIP.dry - 1), 'ship mass went below its empty mass');
check(m.booster.every((s) => s.m >= BOOSTER.dry - 1), 'booster mass went below its empty mass');
check(m.ship.every((s, i) => i === 0 || s.t >= m.ship[i - 1].t), 'ship samples go backwards in time');

// Coasting keeps its energy: in orbit before the tanker arrives, with only the Earth pulling.
{
  const coast = m.ship.filter((s) => s.t > e.orbit + 10 && s.t < e.docked);
  const energy = (s) => (s.vx * s.vx + s.vy * s.vy) / 2 - GM / Math.hypot(s.x, s.y);
  const drift = Math.abs(energy(coast[coast.length - 1]) - energy(coast[0])) / Math.abs(energy(coast[0]));
  check(drift < 1e-5, `energy drifted by ${drift.toExponential(1)} of itself while coasting in orbit`);
}

if (failures.length) {
  console.error('rocket:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log(
  `rocket: the trip checks out — separation T+${clock(e.separation)}, booster caught T+${clock(e.caught)}, orbit T+${clock(e.orbit)}, ` +
    `${out.toFixed(0)} h to the Moon, touchdown at ${f.touchdown.speed.toFixed(1)} m/s (flown in ${ms.toFixed(0)} ms)`,
);
