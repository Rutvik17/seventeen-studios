/**
 * The rocket lesson's physics: a rocket fired straight up from Earth's
 * surface, and what gravity does to it.
 *
 * Pure functions of numbers — no canvas, no DOM — so the page, the share card
 * and the checks in `scripts` all run the same model.
 *
 * ---
 *
 * THE MODEL, AND WHERE EACH PART COMES FROM
 *
 * - Gravity weakens with height as the inverse square of the distance from
 *   Earth's centre: g(h) = g₀ × (R ÷ (R + h))². g₀ is standard gravity,
 *   9.80665 m/s², a defined value; R is the IUGG mean radius, 6,371,008.8 m.
 *   (Wikipedia, "Gravity of Earth".)
 * - Weight is mass × gravity: W = m × g(h).
 * - Going straight up, the net force is thrust minus weight, so the rocket
 *   accelerates at a = (T − W) ÷ m. It cannot leave the pad until T > W.
 *   (NASA Glenn Research Center, "Acceleration at Liftoff".)
 * - Escape speed at distance r from the centre is √(2GM ÷ r). With GM = g₀R²
 *   that is √(2 × g(h) × r): gravity where you are, times how far you are from
 *   the centre. At the surface it comes to 11.18 km/s; the published figure is
 *   11.186 km/s — the small gap is because standard gravity already includes
 *   the effect of Earth's spin, which this model otherwise leaves out.
 *   (Wikipedia, "Escape velocity".)
 * - Escape speed only matters once the engine is off. A rocket that keeps
 *   pushing can leave at any speed; one that stops pushing escapes only if its
 *   speed is at least escape speed for its height — equivalently, its energy
 *   of motion outweighs gravity's hold on it. Below that, it falls back.
 *
 * WHAT IT LEAVES OUT, DELIBERATELY: air, Earth's spin, and the fuel the
 * rocket burns (a real rocket gets lighter as it climbs). The page says so.
 */

/** Earth, as the model sees it. */
export const EARTH = {
  /** Standard gravity, m/s². A defined constant. */
  g0: 9.80665,
  /** Mean radius, metres (IUGG). */
  radius: 6_371_008.8,
} as const;

/** The lesson's rocket. Small and punchy, so a child's hold of a few seconds is enough. */
export const ROCKET = {
  /** kg. Kept constant — see "what it leaves out". */
  mass: 10_000,
  /** Full-power thrust, newtons: a little over three times the rocket's weight on the pad. */
  maxThrust: 300_000,
  /** How long the engine takes to come up to full power, real seconds. */
  spoolSeconds: 1.6,
  /** How long it takes to die away when the button is let go, real seconds. */
  cutSeconds: 0.2,
} as const;

/** Gravity's strength at height `h` metres, m/s². */
export function gravityAt(h: number): number {
  const ratio = EARTH.radius / (EARTH.radius + h);
  return EARTH.g0 * ratio * ratio;
}

/** The rocket's weight at height `h`, newtons. */
export function weightAt(h: number): number {
  return ROCKET.mass * gravityAt(h);
}

/** Distance from Earth's centre at height `h`, metres. */
export function distanceFromCentre(h: number): number {
  return EARTH.radius + h;
}

/** Escape speed at height `h`, m/s: √(2 × gravity here × distance from the centre). */
export function escapeSpeedAt(h: number): number {
  return Math.sqrt(2 * gravityAt(h) * distanceFromCentre(h));
}

/** True when a rocket at height `h` moving up at `v` would never fall back with its engine off. */
export function wouldEscape(h: number, v: number): boolean {
  return v > 0 && v >= escapeSpeedAt(h);
}

/**
 * How much faster than real life the drawing runs, at height `h`.
 *
 * Real flights take minutes near the ground and hours out in space; a child
 * watches for a few seconds. So time is sped up, and sped up more the higher
 * the rocket is, where everything happens slowly. It changes how fast the
 * drawing moves, never any number the page shows.
 */
export function timeScale(h: number): number {
  return 55 * (1 + h / 150_000);
}

export type Flight = {
  /** Height above the pad, metres. */
  height: number;
  /** Upward speed, m/s (negative when falling). */
  speed: number;
  /** Engine power, 0 to 1. */
  throttle: number;
  /** Still sitting on the pad: weight has not yet been beaten. */
  onPad: boolean;
  /** The highest point reached this flight, metres. */
  highest: number;
  /** Set on the frame the rocket comes back down onto the pad: the speed it hit at, m/s. */
  touchdownSpeed: number | null;
};

export function onThePad(): Flight {
  return { height: 0, speed: 0, throttle: 0, onPad: true, highest: 0, touchdownSpeed: null };
}

/** The rocket's thrust at its current throttle, newtons. */
export function thrustOf(flight: Flight): number {
  return flight.throttle * ROCKET.maxThrust;
}

/**
 * Longest step of simulated time taken in one go near the ground, seconds.
 * Steps lengthen with height, where everything changes slowly, so a long coast
 * costs a few hundred steps rather than tens of thousands.
 */
const MAX_STEP = 0.25;

/** Upward acceleration at height `h` with thrust `thrust`: a = (T − W) ÷ m. */
function accelerationAt(h: number, thrust: number): number {
  return (thrust - weightAt(h)) / ROCKET.mass;
}

/**
 * Moves the flight on by `realSeconds` of wall-clock time, with the engine on
 * or off, and returns the new state. Pure: the argument is not changed.
 */
export function advance(flight: Flight, realSeconds: number, engineOn: boolean): Flight {
  const next: Flight = { ...flight, touchdownSpeed: null };

  // The engine comes up to power, or dies away, in real time.
  next.throttle = engineOn
    ? Math.min(1, next.throttle + realSeconds / ROCKET.spoolSeconds)
    : Math.max(0, next.throttle - realSeconds / ROCKET.cutSeconds);

  let remaining = realSeconds * timeScale(next.height);
  while (remaining > 0) {
    const dt = Math.min(MAX_STEP * (1 + next.height / 150_000), remaining);
    remaining -= dt;

    const thrust = next.throttle * ROCKET.maxThrust;

    if (next.onPad) {
      // The pad holds the rocket up until the push beats the pull.
      if (thrust <= weightAt(0)) {
        next.speed = 0;
        continue;
      }
      next.onPad = false;
    }

    // Velocity Verlet: move with the acceleration here, then correct the speed
    // with the average of the acceleration here and where the rocket arrived.
    // Second-order, so a coast up and back down keeps its energy to well under
    // a tenth of a percent — the speeds the page prints stay honest.
    const before = accelerationAt(next.height, thrust);
    next.height += next.speed * dt + 0.5 * before * dt * dt;
    const after = accelerationAt(Math.max(0, next.height), thrust);
    next.speed += 0.5 * (before + after) * dt;
    next.highest = Math.max(next.highest, next.height);

    if (next.height <= 0) {
      next.touchdownSpeed = -next.speed;
      next.height = 0;
      next.speed = 0;
      next.onPad = true;
      break;
    }
  }
  return next;
}
