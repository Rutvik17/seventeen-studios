/**
 * A small, honest physics kit.
 *
 * Everything the site moves — the companion's body, its floating hands, the
 * wind chimes, the lanterns — is integrated from forces rather than authored as
 * a keyframe curve. That is a deliberate choice and it is the difference the
 * eye actually catches: an easing curve always takes the same path from A to B,
 * so a second interruption looks identical to the first. A simulated body
 * carries its velocity through the interruption, so it overshoots when it was
 * moving fast and barely moves when it was not. Nothing looks *alive* until
 * that is true.
 *
 * ---
 *
 * NO DEPENDENCIES, ON PURPOSE
 *
 * This is a few hundred lines against ~600KB for a general rigid-body engine we
 * would use four features of. Everything here is closed-form or one Euler step;
 * none of it needs broadphase, contacts, islands or a solver.
 *
 * ---
 *
 * FIXED TIMESTEP
 *
 * `stepAccumulated` exists because integrating with a variable `dt` is the
 * classic way to get a simulation that behaves differently on a 60Hz laptop and
 * a 120Hz phone — and, worse, explodes when the tab is backgrounded and returns
 * a two-second frame. Real engines fix the step and accumulate the remainder;
 * so does this one.
 *
 * None of this is on the UI thread's critical path for layout: it writes to a
 * canvas, never to the DOM.
 */

export const clamp = (v: number, lo: number, hi: number): number =>
  v < lo ? lo : v > hi ? hi : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Frame-rate independent exponential smoothing.
 *
 * `lerp(current, target, 0.1)` in a RAF loop is the single most common motion
 * bug on the web: it is a fixed fraction PER FRAME, so it converges twice as
 * fast at 120Hz as at 60Hz. This takes a half-life in seconds instead, which is
 * a property of the motion rather than of the hardware.
 */
export function damp(
  current: number,
  target: number,
  halfLife: number,
  dt: number,
): number {
  if (halfLife <= 0) return target;
  return target + (current - target) * Math.pow(2, -dt / halfLife);
}

/** Two-pi, wrapped to (−π, π]. Keeps angular error from winding up. */
export function wrapAngle(a: number): number {
  const t = ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
  return t - Math.PI;
}

export type Vec2 = { x: number; y: number };

/* ------------------------------------------------------------------ *
 * Fixed-timestep driver
 * ------------------------------------------------------------------ */

const FIXED_DT = 1 / 120;
/**
 * Ceiling on how much simulated time one frame may request.
 *
 * Without it, a tab restored after thirty seconds asks for thirty seconds of
 * simulation in a single frame — thousands of steps, a locked main thread, and
 * springs that have long since gone unstable. Dropping the excess means the
 * simulation is *wrong* after a long pause, which is fine: nobody was watching.
 */
const MAX_FRAME = 0.25;

export class StepDriver {
  private accumulator = 0;

  /**
   * Runs `step` at a fixed rate, consuming `frameDt` seconds of real time.
   * Returns the leftover fraction of a step, for callers that want to
   * interpolate rendering between two simulation states.
   */
  advance(frameDt: number, step: (dt: number) => void): number {
    this.accumulator += Math.min(frameDt, MAX_FRAME);
    let guard = 0;
    while (this.accumulator >= FIXED_DT && guard++ < 64) {
      step(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
    return this.accumulator / FIXED_DT;
  }

  reset(): void {
    this.accumulator = 0;
  }
}

/* ------------------------------------------------------------------ *
 * Spring
 * ------------------------------------------------------------------ */

export type SpringConfig = {
  /** How hard it pulls toward the target. Higher is snappier. */
  stiffness?: number;
  /** Resistance proportional to velocity. Higher settles sooner. */
  damping?: number;
  mass?: number;
};

/**
 * A damped harmonic oscillator, integrated with semi-implicit Euler.
 *
 * Semi-implicit — velocity updated first, then position from the NEW velocity —
 * rather than the explicit form, which quietly adds energy every step and lets
 * a lightly-damped spring wind itself up until it flies off screen. One line
 * different, and it is the line that decides whether this is stable.
 */
export class Spring {
  value: number;
  velocity = 0;
  target: number;
  stiffness: number;
  damping: number;
  mass: number;

  constructor(initial = 0, config: SpringConfig = {}) {
    this.value = initial;
    this.target = initial;
    this.stiffness = config.stiffness ?? 120;
    this.damping = config.damping ?? 14;
    this.mass = config.mass ?? 1;
  }

  step(dt: number): number {
    const force =
      -this.stiffness * (this.value - this.target) - this.damping * this.velocity;
    this.velocity += (force / this.mass) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }

  /** Teleport without a settle — for first paint and for resets. */
  snap(to: number): void {
    this.value = to;
    this.target = to;
    this.velocity = 0;
  }

  /** An instantaneous kick, in units per second. */
  impulse(v: number): void {
    this.velocity += v;
  }
}

/** Two independent springs travelling as a point. */
export class Spring2 {
  readonly x: Spring;
  readonly y: Spring;

  constructor(initial: Vec2 = { x: 0, y: 0 }, config: SpringConfig = {}) {
    this.x = new Spring(initial.x, config);
    this.y = new Spring(initial.y, config);
  }

  get value(): Vec2 {
    return { x: this.x.value, y: this.y.value };
  }

  get speed(): number {
    return Math.hypot(this.x.velocity, this.y.velocity);
  }

  setTarget(t: Vec2): void {
    this.x.target = t.x;
    this.y.target = t.y;
  }

  step(dt: number): void {
    this.x.step(dt);
    this.y.step(dt);
  }

  snap(to: Vec2): void {
    this.x.snap(to.x);
    this.y.snap(to.y);
  }
}

/* ------------------------------------------------------------------ *
 * Pendulum
 * ------------------------------------------------------------------ */

/**
 * A rigid pendulum on a pivot that is allowed to accelerate.
 *
 *     θ'' = −(g/L)·sin θ − (a/L)·cos θ − c·θ'
 *
 * The middle term is the one worth having and the one most implementations
 * skip. It is the pivot's own horizontal acceleration entering the rotating
 * frame — physically, why a hanging chime swings when you move the beam it
 * hangs from rather than only when wind hits the chime. On this site `a` is fed
 * from scroll acceleration, so the chimes react to the page being moved, which
 * is a far better coupling than mapping angle directly to scroll position: that
 * mapping is reversible and dead, this one carries momentum and keeps ringing
 * after the scroll has stopped.
 *
 * `sin θ` is kept rather than small-angle-approximated to θ. The approximation
 * is good to about 20°, and a chime that has just been shoved goes well past it.
 */
export class Pendulum {
  angle: number;
  angularVelocity = 0;
  length: number;
  gravity: number;
  damping: number;

  constructor(
    angle = 0,
    options: { length?: number; gravity?: number; damping?: number } = {},
  ) {
    this.angle = angle;
    this.length = options.length ?? 1;
    this.gravity = options.gravity ?? 9.81;
    this.damping = options.damping ?? 0.9;
  }

  /** `pivotAccel` is the pivot's horizontal acceleration, same units as g. */
  step(dt: number, pivotAccel = 0): number {
    const alpha =
      -(this.gravity / this.length) * Math.sin(this.angle) -
      (pivotAccel / this.length) * Math.cos(this.angle) -
      this.damping * this.angularVelocity;
    this.angularVelocity += alpha * dt;
    this.angle += this.angularVelocity * dt;
    return this.angle;
  }

  impulse(v: number): void {
    this.angularVelocity += v;
  }

  /** Speed at the bob, for deciding whether a chime is ringing hard enough. */
  get tipSpeed(): number {
    return Math.abs(this.angularVelocity) * this.length;
  }
}

/* ------------------------------------------------------------------ *
 * Inverse kinematics
 * ------------------------------------------------------------------ */

export type ArmSolution = {
  /** The joint between the two bones. */
  elbow: Vec2;
  /** Where the hand actually ended up — the target, or as near as it reaches. */
  hand: Vec2;
  /** True when the target was beyond reach and the arm is straight. */
  overextended: boolean;
};

/**
 * Analytic two-bone IK — the law of cosines, not an iterative solver.
 *
 * For exactly two bones there is a closed form, so FABRIK and friends are
 * strictly more code for strictly worse results: they converge over several
 * iterations and jitter near the reach limit, and both of those are visible on
 * a character's arm. This lands exactly, in one step, every frame.
 *
 * `flip` picks which of the two mirror solutions to use — an elbow can bend two
 * ways and the maths does not care which. Holding it constant per limb is what
 * stops an elbow snapping inside-out as the target crosses the shoulder line.
 */
export function solveArm(
  root: Vec2,
  target: Vec2,
  upper: number,
  fore: number,
  flip = false,
): ArmSolution {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const raw = Math.hypot(dx, dy);

  // Epsilons matter here. At exactly `upper + fore` the cosine is exactly 1 and
  // floating point routinely lands a hair above it, which makes `acos` NaN and
  // the whole limb vanish. Backing off a thousandth of a unit costs nothing
  // visible and removes the failure entirely.
  const min = Math.abs(upper - fore) + 1e-3;
  const max = upper + fore - 1e-3;
  const overextended = raw > max;
  const dist = clamp(raw, min, max);

  const base = Math.atan2(dy, dx);
  const cosShoulder = (upper * upper + dist * dist - fore * fore) / (2 * upper * dist);
  const shoulder = base + (flip ? 1 : -1) * Math.acos(clamp(cosShoulder, -1, 1));

  const elbow = {
    x: root.x + Math.cos(shoulder) * upper,
    y: root.y + Math.sin(shoulder) * upper,
  };

  // When the target is out of reach the hand goes as far along the line as the
  // bones allow, rather than to the unreachable target — otherwise the forearm
  // visibly detaches from the elbow.
  const hand = overextended
    ? { x: root.x + (dx / raw) * (upper + fore), y: root.y + (dy / raw) * (upper + fore) }
    : { x: target.x, y: target.y };

  return { elbow, hand, overextended };
}

/* ------------------------------------------------------------------ *
 * Verlet chain
 * ------------------------------------------------------------------ */

/**
 * A rope, simulated as points with distance constraints.
 *
 * Position Verlet: velocity is implied by the gap between the current and
 * previous position, so a constraint can simply MOVE a point and the velocity
 * follows for free. That property is why cloth and rope solvers are written
 * this way — with explicit velocities every constraint would have to correct
 * the velocity too, and they fight.
 *
 * Used for the lantern cords and the chime's paper tail.
 */
export class VerletChain {
  points: Vec2[] = [];
  private prev: Vec2[] = [];
  readonly segment: number;
  gravity: number;
  drag: number;

  constructor(
    anchor: Vec2,
    count: number,
    segment: number,
    options: { gravity?: number; drag?: number } = {},
  ) {
    this.segment = segment;
    this.gravity = options.gravity ?? 900;
    this.drag = options.drag ?? 0.012;
    for (let i = 0; i < count; i++) {
      const p = { x: anchor.x, y: anchor.y + i * segment };
      this.points.push(p);
      this.prev.push({ ...p });
    }
  }

  step(dt: number, anchor: Vec2, wind = 0): void {
    for (let i = 1; i < this.points.length; i++) {
      const p = this.points[i];
      const old = this.prev[i];
      const vx = (p.x - old.x) * (1 - this.drag);
      const vy = (p.y - old.y) * (1 - this.drag);
      old.x = p.x;
      old.y = p.y;
      // Wind scales with index so the free end whips more than the top.
      p.x += vx + wind * dt * dt * i;
      p.y += vy + this.gravity * dt * dt;
    }

    // Constraints are relaxed, not solved. Each pass reduces the error; a few
    // passes is indistinguishable from exact and costs a fraction of the work.
    for (let pass = 0; pass < 6; pass++) {
      this.points[0].x = anchor.x;
      this.points[0].y = anchor.y;
      for (let i = 0; i < this.points.length - 1; i++) {
        const a = this.points[i];
        const b = this.points[i + 1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const d = Math.hypot(dx, dy) || 1e-6;
        const correction = (d - this.segment) / d / 2;
        const cx = dx * correction;
        const cy = dy * correction;
        // The anchor is immovable, so its half of the correction is given to
        // the other point — otherwise the whole chain creeps off the hook.
        if (i === 0) {
          b.x -= cx * 2;
          b.y -= cy * 2;
        } else {
          a.x += cx;
          a.y += cy;
          b.x -= cx;
          b.y -= cy;
        }
      }
    }
  }

  get tip(): Vec2 {
    return this.points[this.points.length - 1];
  }
}
