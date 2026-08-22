/**
 * The career, as a side-scrolling walk.
 *
 * Each role is a platform. The character walks across each one and jumps to the
 * next, and the jump is a real ballistic arc — launch velocity solved so that
 * the projectile lands exactly on the far platform, under constant gravity.
 *
 * ---
 *
 * WHY SOLVE THE ARC INSTEAD OF DRAWING A CURVE
 *
 * A hand-drawn bezier between two platforms looks approximately right and is
 * wrong in a way people feel: its apex sits at the midpoint regardless of the
 * height difference, so jumping UP looks identical to jumping DOWN. Real
 * projectiles do not do that — jumping to a higher platform peaks late and
 * jumping to a lower one peaks early, because the same gravity acts on a
 * different initial velocity.
 *
 * Solving it is one line of algebra and gets that for free, which is the whole
 * argument for simulating rather than illustrating.
 *
 * ---
 *
 * THE MATHS
 *
 * Horizontal motion is uniform, so the flight time is fixed by the gap:
 *
 *     T = Δx / vₓ
 *
 * Vertical motion is uniform acceleration. Requiring the projectile to be at
 * Δy when t = T:
 *
 *     Δy = v₀·T − ½·g·T²      ⟹      v₀ = (Δy + ½·g·T²) / T
 *
 * Everything below falls out of those two lines.
 */

export type Platform = {
  id: string;
  label: string;
  detail: string;
  /** Left edge, in world units. */
  x: number;
  /** Width, in world units. */
  width: number;
  /** Top surface height above the baseline. Higher is further up the page. */
  y: number;
};

/** Gravity, in world units per second squared. Tuned for the arc's shape. */
export const GRAVITY = 1800;
/** Horizontal speed while walking and while airborne. */
export const SPEED = 260;

/**
 * Lay the roles out as platforms.
 *
 * Height encodes scope rather than time — a role with more responsibility sits
 * higher — so the walk reads as a climb rather than as a flat conveyor. The gap
 * between platforms is constant, which keeps every jump the same duration and
 * stops the pacing lurching between roles that happened to be adjacent.
 */
export function layout(
  roles: { id: string; label: string; detail: string; scope: number }[],
  options: { platformWidth?: number; gap?: number; rise?: number } = {},
): Platform[] {
  const platformWidth = options.platformWidth ?? 320;
  const gap = options.gap ?? 190;
  const rise = options.rise ?? 46;

  return roles.map((role, i) => ({
    id: role.id,
    label: role.label,
    detail: role.detail,
    x: i * (platformWidth + gap),
    width: platformWidth,
    y: role.scope * rise,
  }));
}

/** Total distance the walk covers, for mapping scroll onto it. */
export function journeyLength(platforms: Platform[]): number {
  if (platforms.length === 0) return 0;
  const last = platforms[platforms.length - 1];
  return last.x + last.width;
}

export type Pose = {
  x: number;
  y: number;
  /** True while airborne. Drives the jump pose and the landing squash. */
  airborne: boolean;
  /** 0 at launch, 1 at landing. Used for the tuck. */
  flight: number;
  /** Vertical velocity, so the sprite can lean into a rise or a fall. */
  vy: number;
  /** Index of the platform being walked, or the one just left. */
  index: number;
};

/**
 * Where the character is, given how far along the walk it has travelled.
 *
 * `distance` is in world units and comes straight from scroll progress, so the
 * whole thing is a pure function of scroll — no integration, no accumulated
 * state, and scrubbing backwards retraces the identical path. A simulation with
 * state would drift when scrubbed and would have to be reset.
 */
export function poseAt(platforms: Platform[], distance: number): Pose {
  if (platforms.length === 0) {
    return { x: 0, y: 0, airborne: false, flight: 0, vy: 0, index: 0 };
  }

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    const next = platforms[i + 1];

    // On this platform.
    if (distance <= p.x + p.width || !next) {
      return {
        x: Math.min(distance, p.x + p.width),
        y: p.y,
        airborne: false,
        flight: 0,
        vy: 0,
        index: i,
      };
    }

    // In the air between this one and the next.
    if (distance < next.x) {
      const dx = next.x - (p.x + p.width);
      const dy = next.y - p.y;
      const T = dx / SPEED;

      // Launch velocity that lands exactly on the next platform.
      const v0 = (dy + 0.5 * GRAVITY * T * T) / T;

      const travelled = distance - (p.x + p.width);
      const t = travelled / SPEED;

      return {
        x: distance,
        y: p.y + v0 * t - 0.5 * GRAVITY * t * t,
        airborne: true,
        flight: dx === 0 ? 0 : travelled / dx,
        // Velocity at time t, so the sprite can lean: positive is rising.
        vy: v0 - GRAVITY * t,
        index: i,
      };
    }
  }

  const last = platforms[platforms.length - 1];
  return {
    x: last.x + last.width,
    y: last.y,
    airborne: false,
    flight: 0,
    vy: 0,
    index: platforms.length - 1,
  };
}

/**
 * The peak height of the arc between two platforms.
 *
 * Used to size the viewport so a jump is never clipped. The apex is where
 * vertical velocity reaches zero, at t = v₀/g — which for an upward jump is
 * late in the flight and for a downward one may be before it even starts, in
 * which case the highest point IS the launch.
 */
export function arcPeak(from: Platform, to: Platform): number {
  const dx = to.x - (from.x + from.width);
  const dy = to.y - from.y;
  const T = dx / SPEED;
  const v0 = (dy + 0.5 * GRAVITY * T * T) / T;
  const tPeak = v0 / GRAVITY;
  if (tPeak <= 0) return Math.max(from.y, to.y);
  const clamped = Math.min(tPeak, T);
  return from.y + v0 * clamped - 0.5 * GRAVITY * clamped * clamped;
}

/** The tallest point anything reaches, so nothing is cropped. */
export function journeyCeiling(platforms: Platform[]): number {
  let ceiling = 0;
  for (let i = 0; i < platforms.length; i++) {
    ceiling = Math.max(ceiling, platforms[i].y);
    if (platforms[i + 1]) ceiling = Math.max(ceiling, arcPeak(platforms[i], platforms[i + 1]));
  }
  return ceiling;
}
