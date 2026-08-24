/**
 * A tank of water, simulated.
 *
 * The surface is a one-dimensional height field solved as the wave equation.
 * Nothing here is a sine wave chosen because it looked wet.
 *
 * ---
 *
 * THE SURFACE
 *
 * Water in a shallow container obeys
 *
 *     ∂²h/∂t² = c² ∂²h/∂x²
 *
 * — the second time derivative of the surface height is proportional to its
 * curvature. A hump is pulled down by its own steepness, overshoots, and the
 * disturbance travels outward at speed c. Everything people recognise as "water
 * moving" falls out of that one line: waves propagate, they reflect off the
 * walls, and two of them crossing add rather than collide.
 *
 * Discretised on N evenly spaced columns, the curvature at column i is
 *
 *     h[i-1] - 2·h[i] + h[i+1]
 *
 * over dx², and the whole thing integrates with semi-implicit Euler — velocity
 * first, then position from the NEW velocity. The explicit form adds energy on
 * every step and a lightly damped surface winds itself up until it explodes;
 * this is the same integrator, and the same reason for it, as `Spring` in
 * `lib/physics.ts`.
 *
 * STABILITY IS NOT OPTIONAL HERE. An explicit wave solver is only stable while
 *
 *     c · dt / dx ≤ 1                                    (the CFL condition)
 *
 * — a wave may not cross more than one cell per step, or the scheme diverges
 * within a second. `dt` is therefore fixed and the frame's elapsed time is
 * consumed in whole steps, rather than passing a variable frame delta straight
 * into the integrator. A long frame must never become a long timestep.
 *
 * The whole thing is deterministic: no noise, no random seeding. The loader
 * looks the same every time it is seen, which is what a mark should do.
 *
 * ---
 *
 * THE WALLS
 *
 * Neumann boundaries: the height gradient at each wall is zero, which is what a
 * rigid wall does — it reflects a wave without inverting it. Implemented by
 * treating the cell outside the tank as a copy of the cell inside it. Waves
 * bounce off the ends and come back, and the interference that follows is why
 * the surface never settles into an obvious repeat.
 *
 * ---
 *
 * WHAT IS DELIBERATELY NOT MODELLED
 *
 * Falling drops and the crown they throw up. Both were built here — drops under
 * gravity, splash droplets as projectiles rejoining the surface where they
 * landed — and both were cut after seeing them: at the size the mark is drawn
 * they read as specks rather than as water, and they cluttered the one thing
 * that does read, which is the surface. The wave stayed.
 *
 * Surface tension, and therefore the meniscus that climbs the side of a real
 * glass. The walls here are the edges of a numeral rather than a container, so
 * there is nothing for the water to climb; a curve drawn at the canvas edge
 * would not line up with anything a viewer can see.
 *
 * Viscosity, as a real stress term. The damping is a velocity-proportional loss
 * instead — the right shape of behaviour and the wrong derivation.
 *
 * Any of this in two dimensions. The surface is a line, not a sheet, which is
 * the standard height-field simplification and is exactly right for a body of
 * water seen side-on.
 */

/**
 * Columns across the tank.
 *
 * 128 because the surface is handed to the shader as a uniform float array and
 * indexed dynamically, which GLSL ES 3.00 allows: 128 floats is 32 vec4 slots
 * against a guaranteed minimum of 224, so there is room for everything else.
 */
const N = 128;

/**
 * Wave speed, in tank widths per second.
 *
 * With N = 128 and dt = 1/240 the CFL number is 0.42·(1/240)·127 = 0.22, so
 * there is comfortable margin. Raising c much past 1.4 here starts to ring.
 */
const C = 0.42;

/** Fixed integration step. Frame time is consumed in whole multiples of this. */
const DT = 1 / 240;

/** Never take more than this many steps for one frame — see the note above. */
const MAX_STEPS = 8;

/** Energy lost per second, standing in for viscosity. */
const DAMPING = 0.9;

/**
 * Neighbour-velocity smoothing.
 *
 * A small amount of momentum shared sideways each step. Without it the shortest
 * wavelength the grid can hold — one cell up, one cell down — is undamped by the
 * scheme and shows up as a shimmer along the surface. This is numerical rather
 * than physical, and it is why it is small.
 */
const SMOOTHING = 0.14;

export class Water {
  readonly n = N;
  /** Surface displacement from the rest level, per column. */
  readonly height = new Float32Array(N);
  /** Vertical velocity of each column. */
  readonly velocity = new Float32Array(N);

  /** The rest level: how full the tank is, 0 to 1. */
  level = 0;

  private carry = 0;
  private readonly scratch = new Float32Array(N);

  /** Surface height at a position across the tank, 0 to 1, interpolated. */
  surfaceAt(x: number): number {
    const t = Math.min(N - 1, Math.max(0, x * (N - 1)));
    const i = Math.floor(t);
    const f = t - i;
    const a = this.height[i];
    const b = this.height[Math.min(N - 1, i + 1)];
    return this.level + a + (b - a) * f;
  }

  /**
   * Push the surface, as a Gaussian centred on `x`.
   *
   * A disturbance with a soft edge rather than a single displaced column: one
   * column moved on its own is a step function, and a step contains every
   * wavelength the grid can represent, including the one-cell zigzag that the
   * solver cannot resolve. The result is a burst of grid noise instead of a
   * ripple. Real impacts have a width, and so does this.
   */
  impulse(x: number, strength: number, radius = 0.045): void {
    const centre = x * (N - 1);
    const spread = Math.max(1, radius * N);
    const from = Math.max(0, Math.floor(centre - spread * 3));
    const to = Math.min(N - 1, Math.ceil(centre + spread * 3));

    let total = 0;
    for (let i = from; i <= to; i++) {
      const d = (i - centre) / spread;
      const add = strength * Math.exp(-d * d);
      this.velocity[i] += add;
      total += add;
    }

    /*
      WATER IS NOT CREATED OR DESTROYED HERE.

      The scheme conserves the total surface height on its own — the discrete
      Laplacian sums to zero across mirrored boundaries — so the only thing that
      can change the volume is an impulse, and Σh drifts by ∫Σv dt. A stream
      pressing on the surface every frame is a persistent negative Σv, and the
      whole body of water sinks: measured at 30% full while the counter read 86,
      because the pour was quietly draining the tank it was filling.

      An impact does not remove water, it MOVES it — down under the point of
      contact, up everywhere else. Taking the mean back out is exactly that, and
      it is why the ring around a disturbance rises as its centre falls.

      All the mass is carried by `level`, which is the honest place for it: that
      is the number that says how full the tank is.
    */
    const correction = total / N;
    for (let i = 0; i < N; i++) this.velocity[i] -= correction;
  }

  /**
   * Advance by a frame's worth of time.
   *
   * `elapsed` is clamped before it is consumed: a tab that has been in the
   * background hands back a delta of many seconds, and simulating all of it at
   * once is both pointless and slow.
   */
  step(elapsed: number): void {
    this.carry += Math.min(elapsed, 0.25);

    let steps = 0;
    while (this.carry >= DT && steps < MAX_STEPS) {
      this.carry -= DT;
      steps++;
      this.integrate(DT);
    }

    // Whatever could not be simulated is dropped rather than banked, so a long
    // stall does not produce a burst of catch-up motion on the next frame.
    if (steps === MAX_STEPS) this.carry = 0;
  }

  private integrate(dt: number): void {
    const h = this.height;
    const v = this.velocity;

    /*
      c² / dx², with dx = 1 / (N - 1). Folding the grid spacing into the
      coefficient once is what keeps the inner loop to three reads and an add.
    */
    const dx = 1 / (N - 1);
    const k = (C * C) / (dx * dx);

    for (let i = 0; i < N; i++) {
      // Neumann walls: the cell beyond the end mirrors the one inside it, which
      // reflects a wave without inverting it.
      const left = h[i === 0 ? 0 : i - 1];
      const right = h[i === N - 1 ? N - 1 : i + 1];
      const curvature = left - 2 * h[i] + right;
      v[i] += k * curvature * dt;
    }

    // Exponential decay, evaluated per step so the rate is independent of how
    // many steps a frame happens to take.
    const decay = Math.exp(-DAMPING * dt);
    for (let i = 0; i < N; i++) v[i] *= decay;

    // Share a little momentum sideways — see SMOOTHING.
    const s = this.scratch;
    for (let i = 0; i < N; i++) {
      const left = v[i === 0 ? 0 : i - 1];
      const right = v[i === N - 1 ? N - 1 : i + 1];
      s[i] = v[i] + (left + right - 2 * v[i]) * SMOOTHING;
    }
    v.set(s);

    for (let i = 0; i < N; i++) h[i] += v[i] * dt;
  }

  /**
   * Water arriving from above, while the level is rising.
   *
   * A stream landing on a surface does two things: it raises the level, which
   * the caller does by moving `level`, and it presses down where it lands. Only
   * the second belongs here. `rate` is how fast the level is climbing, so a fast
   * fill digs a deeper hollow under the stream — which is what pouring looks
   * like, and why the surface is never flat until the pouring stops.
   *
   * This is now the ONLY thing that disturbs the surface, and it is the reason
   * the wave exists: the hollow it digs propagates outward, reflects off both
   * walls, and comes back across itself.
   */
  pour(x: number, rate: number, dt: number): void {
    if (rate <= 0) return;
    this.impulse(x, -rate * 9 * dt, 0.07);
  }
}
