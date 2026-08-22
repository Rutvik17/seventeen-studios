/**
 * THE ROUTE — the road the camera drives, and the road the traffic drives on.
 *
 * ==================================================================
 * A DRIVE, NOT A SEQUENCE OF VIEWPOINTS
 * ==================================================================
 *
 * The camera does not cut between places. It drives: down an avenue, right at
 * a corner, up onto a bridge, back off it, on uptown. Scroll is *distance
 * travelled*, so the whole page is one continuous journey and every turn is a
 * turn you take rather than a transition you watch.
 *
 * That has one non-obvious consequence worth stating, because it is most of why
 * this reads as driving: **heading is derived, never authored**. The camera
 * looks along the road because it is on the road. There is no yaw keyframe
 * anywhere, so the view can never disagree with the direction of travel — which
 * is the thing that makes scripted camera paths feel like they are on rails.
 *
 * ==================================================================
 * CORNERS ARE ARCS, BECAUSE A VEHICLE CANNOT PIVOT
 * ==================================================================
 *
 * A polyline turns instantly at its vertices. A car cannot: it has a minimum
 * turning radius, and it sweeps through the corner. Snapping the heading at a
 * vertex looks exactly like what it is — the whole world spinning about the
 * driver's nose in one frame.
 *
 * So every interior vertex is cut with a circular arc tangent to both legs. The
 * radius is 11 m, which is roughly what a car actually needs for a city
 * intersection, and it is clamped to half the shorter leg so a tight zigzag
 * cannot produce an arc longer than the road it is turning off.
 *
 * ==================================================================
 * PARAMETERISED BY ARC LENGTH
 * ==================================================================
 *
 * The path is sampled evenly and a cumulative distance is kept, so `at(d)`
 * takes metres rather than a fraction. Without that, the camera speeds up on
 * long straights and crawls through corners — the sections are not the same
 * length, so equal fractions are not equal distances.
 *
 * It also means the traffic and the camera can share one coordinate. A car is
 * at 4,120 m along the route; so is the camera; the gap between them is a
 * subtraction.
 */

export type Waypoint = {
  x: number;
  z: number;
  /** Road surface height. Defaults to street level; a bridge deck is not. */
  y?: number;
  /** For the story, and for debugging a route that has gone wrong. */
  name?: string;
  /**
   * The road from here on runs one way.
   *
   * Almost every numbered avenue in Manhattan does, in alternating directions,
   * and it is most of what makes an avenue feel unlike a two-way street: four
   * lanes all going the same way at once. It also decides which way the parked
   * cars face.
   */
  oneWay?: boolean;
};

export type RoutePoint = {
  /** Metres from the start. */
  d: number;
  x: number;
  y: number;
  z: number;
  /** Direction of travel, radians, in the same convention as camera yaw. */
  heading: number;
  /** Whether this stretch is one-way. */
  oneWay: boolean;
};

export type Route = {
  points: RoutePoint[];
  length: number;
  /** Named waypoints with the distance at which they are reached. */
  marks: { name: string; d: number }[];
};

/** Corner radius, metres. About what a car needs at a city intersection. */
const CORNER = 11;

/** Sample spacing. Fine enough that a corner is smooth, coarse enough to be cheap. */
const STEP = 4;

/**
 * Build a drivable route through a list of waypoints.
 *
 * Corners are rounded; the result is sampled evenly by arc length.
 */
export function buildRoute(waypoints: Waypoint[]): Route {
  if (waypoints.length < 2) {
    return { points: [], length: 0, marks: [] };
  }

  /* ---- round the corners ---- */
  const spine: { x: number; y: number; z: number; name?: string; oneWay: boolean }[] = [];
  const y = (w: Waypoint) => w.y ?? 0;

  spine.push({ x: waypoints[0].x, y: y(waypoints[0]), z: waypoints[0].z, name: waypoints[0].name, oneWay: waypoints[0].oneWay ?? false });

  for (let i = 1; i < waypoints.length - 1; i += 1) {
    const prev = waypoints[i - 1];
    const here = waypoints[i];
    const next = waypoints[i + 1];

    const inLen = Math.hypot(here.x - prev.x, here.z - prev.z);
    const outLen = Math.hypot(next.x - here.x, next.z - here.z);
    if (inLen < 1e-6 || outLen < 1e-6) continue;

    const ux = (here.x - prev.x) / inLen;
    const uz = (here.z - prev.z) / inLen;
    const vx = (next.x - here.x) / outLen;
    const vz = (next.z - here.z) / outLen;

    // Straight through: nothing to round.
    const turn = Math.abs(Math.atan2(vx * uz - vz * ux, vx * ux + vz * uz));
    if (turn < 0.05) {
      spine.push({ x: here.x, y: y(here), z: here.z, name: here.name, oneWay: here.oneWay ?? false });
      continue;
    }

    // Never cut back further than half a leg, or a tight zigzag produces an arc
    // longer than the road it is turning off.
    const r = Math.min(CORNER, inLen / 2, outLen / 2);
    const flag = here.oneWay ?? false;
    const start = { x: here.x - ux * r, y: y(here), z: here.z - uz * r, oneWay: flag };
    const end = { x: here.x + vx * r, y: y(here), z: here.z + vz * r, oneWay: flag };

    spine.push({ ...start, name: here.name });
    // A quadratic Bézier through the vertex is tangent to both legs at the cut
    // points, which is all the arc has to be — and it is three multiplies
    // rather than a trigonometric construction.
    const segments = Math.max(3, Math.round((turn * r) / 1.5));
    for (let s = 1; s < segments; s += 1) {
      const t = s / segments;
      const m = 1 - t;
      spine.push({
        x: m * m * start.x + 2 * m * t * here.x + t * t * end.x,
        y: y(here),
        z: m * m * start.z + 2 * m * t * here.z + t * t * end.z,
        oneWay: flag,
      });
    }
    spine.push(end);
  }

  const last = waypoints[waypoints.length - 1];
  spine.push({ x: last.x, y: y(last), z: last.z, name: last.name, oneWay: last.oneWay ?? false });

  /* ---- walk it at a fixed spacing ---- */
  const points: RoutePoint[] = [];
  const marks: { name: string; d: number }[] = [];
  let d = 0;

  for (let i = 0; i < spine.length - 1; i += 1) {
    const a = spine[i];
    const b = spine[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (a.name) marks.push({ name: a.name, d });
    if (len < 1e-6) continue;

    const heading = Math.atan2(b.x - a.x, b.z - a.z);
    const steps = Math.max(1, Math.round(len / STEP));
    for (let s = 0; s < steps; s += 1) {
      const t = s / steps;
      points.push({
        d: d + len * t,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        z: a.z + (b.z - a.z) * t,
        heading,
        oneWay: a.oneWay,
      });
    }
    d += len;
  }

  const tail = spine[spine.length - 1];
  points.push({
    d,
    x: tail.x,
    y: tail.y,
    z: tail.z,
    heading: points.length ? points[points.length - 1].heading : 0,
    oneWay: tail.oneWay,
  });
  if (tail.name) marks.push({ name: tail.name, d });

  /*
    Smooth the heading over a short window.

    Even with rounded corners the sampled heading is piecewise constant — each
    straight segment has one value — so it still steps at every sample. A car's
    heading is continuous, and a five-sample box filter over twenty metres of
    road is enough to make it so. Longer and the camera starts turning before
    the corner, which reads as drifting.
  */
  const smoothed = points.map((p, i) => {
    let sx = 0;
    let sz = 0;
    for (let k = -2; k <= 2; k += 1) {
      const q = points[Math.max(0, Math.min(points.length - 1, i + k))];
      // Averaged as vectors, not as angles: the mean of 179° and −179° is 0°,
      // which points the camera backwards.
      sx += Math.sin(q.heading);
      sz += Math.cos(q.heading);
    }
    return { ...p, heading: Math.atan2(sx, sz) };
  });

  return { points: smoothed, length: d, marks };
}

/**
 * The route at a given distance, interpolated between samples.
 *
 * Clamped rather than wrapped: a drive has two ends, and running off one of
 * them should stop, not teleport you to the other.
 */
export function at(route: Route, distance: number): RoutePoint {
  const { points } = route;
  if (points.length === 0) return { d: 0, x: 0, y: 0, z: 0, heading: 0, oneWay: false };
  if (distance <= 0) return points[0];
  if (distance >= route.length) return points[points.length - 1];

  // Samples are evenly spaced, so the index is arithmetic rather than a search.
  const i = Math.min(points.length - 2, Math.floor((distance / route.length) * (points.length - 1)));
  let j = i;
  while (j < points.length - 2 && points[j + 1].d < distance) j += 1;
  while (j > 0 && points[j].d > distance) j -= 1;

  const a = points[j];
  const b = points[j + 1];
  const span = b.d - a.d;
  const t = span > 1e-6 ? (distance - a.d) / span : 0;

  return {
    d: distance,
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
    heading: a.heading + shortestTurn(a.heading, b.heading) * t,
    oneWay: a.oneWay,
  };
}

/** The signed turn from a to b, taken the short way round. */
export function shortestTurn(a: number, b: number): number {
  const TAU = Math.PI * 2;
  return (((b - a) % TAU) + TAU + Math.PI) % TAU - Math.PI;
}

/**
 * A point offset sideways from the route — a lane, or a kerb.
 *
 * Positive is to the right of the direction of travel, which is the side a
 * right-hand-drive country parks on and the side the near lane runs in.
 */
export function offsetFrom(point: RoutePoint, lateral: number): { x: number; z: number } {
  // The route's normal: heading rotated a quarter turn.
  return {
    x: point.x + Math.cos(point.heading) * lateral,
    z: point.z - Math.sin(point.heading) * lateral,
  };
}

/* ------------------------------------------------------------------ *
 * The corridor
 * ------------------------------------------------------------------ */

/**
 * The ground the road occupies, as a set of grid cells.
 *
 * ---
 *
 * WHY THIS IS NECESSARY
 *
 * The block generator builds on every buildable lot, and it only knows about
 * the 1811 street grid. The drive does not stay on that grid: Wall Street,
 * Broadway, the Bowery and both bridge approaches are all older than the grid
 * and are not in it. So the generator cheerfully puts buildings in the middle of
 * the road, and the camera drives through the inside of them — which looks
 * exactly like the renderer has failed, and is in fact the world being wrong.
 *
 * Rather than teach the generator about every road, the road is subtracted from
 * it: anything standing in this corridor is not built. That is the correct
 * relationship — a road is a thing you clear a path for — and it holds for any
 * route without the generator having to know what the route is.
 *
 * Stored as a hash set of cells so the test is O(1). The route is fixed, so
 * this is built once; testing several hundred buildings a frame against four
 * thousand route samples would not be.
 */
export type Corridor = { cells: Set<number>; size: number };

/** Cell size. Small enough to follow a corner, large enough to stay cheap. */
const CORRIDOR_CELL = 12;

export function buildCorridor(route: Route, halfWidth: number): Corridor {
  const cells = new Set<number>();
  const reach = Math.ceil(halfWidth / CORRIDOR_CELL);

  for (const point of route.points) {
    const cx = Math.floor(point.x / CORRIDOR_CELL);
    const cz = Math.floor(point.z / CORRIDOR_CELL);
    // A square block of cells around each sample. Cheaper than a swept
    // rectangle and, at this cell size, indistinguishable from one.
    for (let dz = -reach; dz <= reach; dz += 1) {
      for (let dx = -reach; dx <= reach; dx += 1) {
        cells.add(key(cx + dx, cz + dz));
      }
    }
  }
  return { cells, size: CORRIDOR_CELL };
}

export function inCorridor(corridor: Corridor, x: number, z: number): boolean {
  return corridor.cells.has(key(Math.floor(x / corridor.size), Math.floor(z / corridor.size)));
}

/** Two 16-bit cell coordinates in one integer, so the Set holds numbers. */
function key(x: number, z: number): number {
  return ((x & 0xffff) << 16) | (z & 0xffff);
}
