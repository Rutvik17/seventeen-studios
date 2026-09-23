/**
 * Checks the rocket entry's physics against published figures and against
 * itself, so a change to `src/lib/rocket/` cannot quietly make the page wrong.
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/verify-rocket.mjs
 *
 * Runs in `postbuild`, beside the share-card and asset checks.
 *
 * - Escape speed at the surface: 11.186 km/s (Wikipedia, "Escape velocity").
 * - Gravity at the space station's height, 400 km: "nearly 90%" of the
 *   surface's (Wikipedia, "Gravity of Earth") — the inverse square gives 88.5%.
 * - Energy is kept: a rocket that coasts up and falls back lands at the speed
 *   the energy equation gives for its highest point, v = √(2GM(1/R − 1/r)).
 * - Burning fuel follows the rocket equation: the speed a burn buys, plus
 *   what gravity took back meanwhile, is vₑ × ln(m₀ ÷ m₁) (Wikipedia,
 *   "Tsiolkovsky rocket equation") — and two stages beat one with the same
 *   fuel, which is the staging chapter's whole claim.
 * - Orbits: the speed to circle at 400 km against the station's own, 7.67
 *   km/s, and the time once round at the station's height, 413–422 km,
 *   against its 92.9 minutes (Wikipedia, "International Space Station"). The
 *   cannon's three outcomes land where they should, and a flown orbit keeps
 *   its energy and comes back to where it started.
 * - The rules of each chapter hold: a tap that never beats the pull stays on
 *   the pad; a long hold escapes; a short one falls back; firing on the way
 *   down lands slower; and the booster can be landed softly by a reader who
 *   watches the distance it needs to stop.
 */

import {
  EARTH,
  GM,
  advance,
  circleSpeedAt,
  escapeSpeedAt,
  gravityAt,
  inTheAir,
  massOf,
  onThePad,
  wouldEscape,
} from '../src/lib/rocket/physics.ts';
import { heightOf, outcomeOf, step, thrown } from '../src/lib/rocket/orbit.ts';
import { BOOSTER, BOOSTER_DROP, CANNON, LIFT_OFF, ONE_STAGE, SOFT_LANDING, TWO_STAGES } from '../src/lib/rocket/crafts.ts';

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};
const near = (value, target, tolerance) => Math.abs(value - target) / Math.abs(target) <= tolerance;
const FRAME = 1 / 60;

/**
 * Holds the button for `hold` seconds at 60 frames a second, then lets go —
 * and, given `burnAt`, holds it again once the rocket is falling faster than
 * `burnAt` m/s.
 */
function fly(hold, limit = 120, burnAt = Infinity) {
  let f = onThePad(LIFT_OFF);
  let t = 0;
  let leftPad = false;
  while (t < limit) {
    const on = t < hold || f.speed < -burnAt;
    f = advance(LIFT_OFF, f, FRAME, on);
    t += FRAME;
    if (!f.onPad) leftPad = true;
    if (f.touchdownSpeed !== null) return { outcome: 'fell back', f, leftPad };
    if (!on && wouldEscape(f.height, f.speed)) return { outcome: 'escaped', f, leftPad };
    if (!on && f.onPad && f.throttle === 0 && !leftPad) return { outcome: 'never left the pad', f, leftPad };
  }
  return { outcome: 'still flying', f, leftPad };
}

/* ---- gravity and escape ---- */

const surface = escapeSpeedAt(0);
check(near(surface, 11_186, 0.002), `escape speed at the surface is ${surface.toFixed(0)} m/s, not 11,186 m/s ± 0.2%`);

const station = gravityAt(400_000) / gravityAt(0);
check(station > 0.87 && station < 0.9, `gravity at 400 km is ${(station * 100).toFixed(1)}% of the surface's, not "nearly 90%"`);

/* ---- chapter one: lift-off ---- */

for (const hold of [1.5, 2.5, 3.5]) {
  const { outcome, f } = fly(hold);
  check(outcome === 'fell back', `a ${hold} s hold should fall back, but ${outcome}`);
  if (outcome === 'fell back') {
    const R = EARTH.radius;
    const exact = Math.sqrt(2 * GM * (1 / R - 1 / (R + f.highest)));
    check(near(f.touchdownSpeed, exact, 0.005), `a ${hold} s flight lands at ${f.touchdownSpeed.toFixed(0)} m/s; its energy says ${exact.toFixed(0)} m/s`);
  }
}
check(fly(0.4).outcome === 'never left the pad', 'a 0.4 s tap should not beat the pull');
check(fly(4.5).outcome === 'escaped', 'a 4.5 s hold should escape');

const free = fly(1.5);
const burned = fly(1.5, 120, 100);
check(burned.outcome === 'fell back' && burned.f.touchdownSpeed < free.f.touchdownSpeed / 2,
  `a burn on the way down should at least halve the landing speed: ${burned.f.touchdownSpeed?.toFixed(0)} m/s against ${free.f.touchdownSpeed?.toFixed(0)} m/s`);

/* ---- chapter two: staging ---- */

/** Holds from the pad until the last tank is dry; returns the speed then and what gravity took along the way. */
function fullBurn(craft) {
  let f = onThePad(craft);
  let lost = 0;
  const start = massOf(craft, f);
  for (let i = 0; i < 60 * 60; i += 1) {
    const before = f;
    f = advance(craft, f, FRAME, true);
    // What gravity took this frame: g at the height, for the simulated time the frame covered.
    if (!f.onPad) lost += gravityAt(before.height) * FRAME * craft.timeScale(before.height);
    if (f.fuel[f.stage] === 0 && f.stage === craft.stages.length - 1) return { f, lost, start };
  }
  throw new Error('the burn never ended');
}

const single = fullBurn(ONE_STAGE);
const s = ONE_STAGE.stages[0];
const equation = s.exhaust * Math.log(single.start / s.dry);
check(near(single.f.speed + single.lost, equation, 0.01),
  `one stage: speed ${single.f.speed.toFixed(0)} m/s plus gravity's ${single.lost.toFixed(0)} m/s should be the rocket equation's ${equation.toFixed(0)} m/s ± 1%`);

const staged = fullBurn(TWO_STAGES);
check(staged.f.speed > single.f.speed * 1.2,
  `two stages should beat one by a clear margin: ${staged.f.speed.toFixed(0)} m/s against ${single.f.speed.toFixed(0)} m/s`);
check(staged.f.speed < escapeSpeedAt(staged.f.height),
  'the staged rocket is meant to fall back — the chapter says it needs to go sideways, not faster');

/* ---- chapter three: orbit ---- */

const circle = circleSpeedAt(400_000);
check(near(circle, 7_670, 0.01), `circling speed at 400 km is ${circle.toFixed(0)} m/s, not the station's 7,670 m/s ± 1%`);
check(near(circle * Math.SQRT2, escapeSpeedAt(400_000), 1e-9), 'escape speed should be circling speed × √2');

const issHeight = (413_000 + 422_000) / 2;
const iss = outcomeOf(issHeight, circleSpeedAt(issHeight));
check(iss.kind === 'orbits' && near(iss.period / 60, 92.9, 0.005),
  `once round at the station's height takes ${iss.kind === 'orbits' ? (iss.period / 60).toFixed(1) : '—'} min, not its 92.9 min ± 0.5%`);

check(outcomeOf(CANNON.height, 7_000).kind === 'falls', 'a 7 km/s throw from 400 km should come down');
check(outcomeOf(CANNON.height, circle).kind === 'orbits', 'a throw at circling speed should orbit');
check(outcomeOf(CANNON.height, 11_000).kind === 'escapes', 'an 11 km/s throw from 400 km should escape');
check(outcomeOf(CANNON.height, 0).kind === 'falls', 'a throw at no speed should fall straight down');

// Fly one orbit of a stretched ellipse and check it keeps its energy and comes home.
{
  const speed = 8_500;
  const o = outcomeOf(CANNON.height, speed);
  let b = thrown(CANNON.height, speed);
  const energy = (x) => (x.vx * x.vx + x.vy * x.vy) / 2 - GM / Math.hypot(x.x, x.y);
  const e0 = energy(b);
  const steps = Math.round(o.period / 2);
  let lowest = Infinity;
  for (let i = 0; i < steps; i += 1) {
    b = step(b, o.period / steps);
    lowest = Math.min(lowest, heightOf(b));
  }
  check(near(energy(b), e0, 1e-5), `a flown orbit's energy drifted by ${(((energy(b) - e0) / e0) * 100).toFixed(4)}%`);
  check(Math.hypot(b.x, b.y - (EARTH.radius + CANNON.height)) < 20_000, 'a flown orbit should come back to the cannon after one period');
  check(near(lowest, o.low, 0.01), `a flown orbit's lowest point is ${(lowest / 1000).toFixed(0)} km, not the ${(o.low / 1000).toFixed(0)} km the vis-viva equation gives`);
}

/* ---- chapter four: landing ---- */

/**
 * A reader's landing: watch the distance the booster needs to stop at full
 * power, fire when it reaches `lead` × the height, let go once it drops below
 * `relax` × the height; near the deck, keep the fall to a walking pace; and
 * react `lag` seconds late.
 */
function land(lead, relax, lag = 0.2) {
  let f = inTheAir(BOOSTER, BOOSTER_DROP.height, BOOSTER_DROP.speed);
  let firing = false;
  let want = false;
  const pending = [];
  for (let t = 0; t < 120; t += FRAME) {
    const slowing = BOOSTER.stages[0].thrust / massOf(BOOSTER, f) - gravityAt(f.height);
    const needs = f.speed < 0 ? (f.speed * f.speed) / (2 * slowing) : 0;
    let decide = needs >= lead * f.height ? true : needs < relax * f.height ? false : want;
    if (f.height < 60) decide = -f.speed > 2 + f.height * 0.1;
    if (decide !== want) pending.push([t + lag, (want = decide)]);
    while (pending.length && pending[0][0] <= t) firing = pending.shift()[1];
    f = advance(BOOSTER, f, FRAME, firing && f.speed < 0.5);
    if (f.touchdownSpeed !== null) return f.touchdownSpeed;
  }
  return Infinity;
}

const falls = land(Infinity, Infinity);
check(falls > 100, `a booster that never fires should hit hard, not at ${falls.toFixed(0)} m/s`);
// Readers differ in how early they fire and how soon they let go: across a
// spread of both, some must land softly, or the chapter cannot be won.
const landings = [];
for (const lag of [0.2, 0.3]) for (let lead = 0.6; lead <= 1.001; lead += 0.1) for (let relax = 0.3; relax < lead; relax += 0.1) landings.push(land(lead, relax, lag));
const soft = landings.filter((v) => v < SOFT_LANDING).length;
check(soft >= landings.length / 4, `a careful reader should be able to land softly; ${soft} of ${landings.length} ways of flying it did, the best at ${Math.min(...landings).toFixed(1)} m/s`);
if (process.env.VERBOSE) console.log(`landing: ${soft} of ${landings.length} soft; ${landings.map((v) => v.toFixed(1)).join(' ')}`);

if (failures.length) {
  console.error('rocket physics:\n  ' + failures.join('\n  '));
  process.exit(1);
}
console.log('rocket: escape speed, gravity with height, energy, the rocket equation, orbits and every chapter’s rules all check out');
