/**
 * THE CAMERA — a real pinhole, projecting a real 3D city onto a flat page.
 *
 * ==================================================================
 * WHY THE DEPTH IS REAL AND NOT DRAWN
 * ==================================================================
 *
 * Put two identical AA cells at opposite ends of a drawing of a corridor and
 * the far one looks bigger. Slide it down beside the near one and they are the
 * same. That is the Ponzo illusion, and the reason it works is worth being
 * precise about: converging lines are the signature of a *perspective
 * projection*, and your visual system inverts that projection automatically. It
 * reads the convergence as distance, and having decided the far cell is
 * further away, it concludes that a cell subtending the same angle from further
 * away must be physically larger.
 *
 * The illusion is not a trick of draughtsmanship. It is your brain doing
 * correct arithmetic on an image that happens to be flat. Which means the way
 * to get it is not to fake convergence — it is to do the projection properly
 * and let perception do the rest.
 *
 * So the city is modelled in three dimensions, in metres, and every frame is a
 * genuine pinhole projection of it:
 *
 *     f  = (H/2) / tan(fov/2)          focal length, in pixels
 *     sx = W/2 + f · xᶜ / zᶜ
 *     sy = H/2 − f · yᶜ / zᶜ
 *
 * The 1/z is the whole thing. It is what makes an avenue converge, what makes a
 * car shrink as it drives away, and what makes a tower ten blocks off read as a
 * tower ten blocks off rather than a small tower.
 *
 * ==================================================================
 * THREE PROPERTIES WORTH KNOWING, BECAUSE THEY ARE CHECKABLE
 * ==================================================================
 *
 * **The horizon depends only on where the lens points.** Not on how high the
 * camera is. Climb from the pavement to a helicopter and the horizon does not
 * move a pixel — it sits at `H/2 + shift + f·tan(pitch)` whatever your
 * altitude. Everything else in the frame changes; that line does not. If it
 * drifts when the camera rises, the projection is wrong.
 *
 * **Parallel lines meet at one point.** Every line parallel to the view
 * direction converges on the horizon at the frame's centre column, regardless
 * of where in the city it starts. Lines at any other bearing vanish somewhere
 * else — which is what lets a street turn a corner and still look right.
 *
 * **Apparent size is exactly inversely proportional to depth.** Two identical
 * towers at 200 m and 400 m differ in drawn height by a factor of two, not by
 * an artistic judgement.
 *
 * **Verticals stay plumb if, and only if, the camera is not pitched.** See
 * `shiftY` — this is the property that decides whether the drawing looks like
 * an architect's elevation or a tourist's photograph.
 *
 * ==================================================================
 * THE NEAR PLANE IS NOT OPTIONAL
 * ==================================================================
 *
 * A segment with one end behind the camera cannot be projected: `zᶜ` passes
 * through zero, the coordinates blow up, and the line whips across the frame in
 * the wrong direction. Every renderer that has ever had geometry tear across
 * the screen when you walked into a wall was missing this.
 *
 * So segments are clipped against the near plane before projection, and
 * polygons are clipped with Sutherland–Hodgman against it. A polygon straddling
 * the plane comes back as a smaller polygon that is entirely in front of the
 * camera, which is the only kind that can be drawn.
 */

export type Vec3 = { x: number; y: number; z: number };

export type Camera = {
  /** Position in world metres. y is up, z runs north up the avenue. */
  x: number;
  y: number;
  z: number;
  /** Radians. Negative looks down, positive looks up. */
  pitch: number;
  /** Radians. 0 looks along +z. */
  yaw: number;
  /** Vertical field of view, radians. */
  fov: number;
  /**
   * Principal-point shift, in pixels. A rising front.
   *
   * ---
   *
   * THE ONE THING THAT MAKES IT LOOK LIKE THE SKETCHES
   *
   * Tilt a camera up at a skyscraper and the vertical edges converge — the
   * building appears to lean back. That is correct perspective and it is what a
   * phone does. It is also what almost no architectural drawing does, and every
   * hand-drawn New York skyline keeps its towers dead plumb.
   *
   * That is not the artist ignoring perspective. It is a **shift lens**: keep
   * the sensor plane vertical, parallel to the facades, and move the optical
   * centre up instead of tilting the whole camera. Verticals stay parallel to
   * the sensor, so they stay parallel on the page, and you still see the tops of
   * the buildings. It is real optics — a PC-E lens, a view camera's rising
   * front — and it is why architectural photographs look upright and holiday
   * snaps do not.
   *
   * So: **shift to look up at a skyline, pitch to look down at a map.** Shift
   * keeps towers plumb, which is what the street-level and skyline views want.
   * Pitch converges them, which is correct and wanted when the camera is a
   * helicopter looking down at Central Park, where nobody expects otherwise.
   *
   * Positive moves the horizon down the frame, putting more sky and more tower
   * in view.
   */
  shiftY: number;
  /** Lateral shift, same idea. Rarely wanted; kept for symmetry. */
  shiftX: number;
  /** Viewport, in CSS pixels. */
  width: number;
  height: number;
  /** Nothing closer than this can be drawn. Metres. */
  near: number;
};

export function makeCamera(partial: Partial<Camera> = {}): Camera {
  return {
    x: 0,
    y: 1.7,
    z: 0,
    pitch: 0,
    yaw: 0,
    // 50° vertical. Wide enough to feel like standing on an avenue, narrow
    // enough that the edges do not smear — past about 70° the stretching at the
    // frame edge that a real wide-angle lens produces starts to read as a bug.
    fov: (50 * Math.PI) / 180,
    shiftY: 0,
    shiftX: 0,
    width: 1440,
    height: 900,
    near: 0.35,
    ...partial,
  };
}

/** Focal length in pixels. Everything else is derived from this. */
export function focal(cam: Camera): number {
  return cam.height / 2 / Math.tan(cam.fov / 2);
}

/**
 * The horizon's screen y.
 *
 * Depends on pitch and focal length only — never on altitude. That invariance
 * is the load-bearing property of the whole projection, so it is computed here
 * once and used everywhere rather than re-derived per caller.
 */
export function horizon(cam: Camera): number {
  return cam.height / 2 + cam.shiftY + focal(cam) * Math.tan(cam.pitch);
}

/** World point into camera space. z is depth ahead of the lens. */
export function toCamera(cam: Camera, p: Vec3): Vec3 {
  const dx = p.x - cam.x;
  const dy = p.y - cam.y;
  const dz = p.z - cam.z;

  const cy_ = Math.cos(cam.yaw);
  const sy_ = Math.sin(cam.yaw);
  const rx = dx * cy_ - dz * sy_;
  const rz = dx * sy_ + dz * cy_;

  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  return {
    x: rx,
    y: dy * cp - rz * sp,
    z: dy * sp + rz * cp,
  };
}

export type Point2 = { x: number; y: number; z: number };

/**
 * Camera space to the page. `z` comes back with the point because the painter's
 * algorithm needs it and recomputing it later is how sort order drifts out of
 * step with what was drawn.
 */
export function toScreen(cam: Camera, c: Vec3): Point2 {
  const f = focal(cam);
  return {
    x: cam.width / 2 + cam.shiftX + (f * c.x) / c.z,
    y: cam.height / 2 + cam.shiftY - (f * c.y) / c.z,
    z: c.z,
  };
}

/** World straight to the page. Returns null when the point is behind the lens. */
export function project(cam: Camera, p: Vec3): Point2 | null {
  const c = toCamera(cam, p);
  if (c.z <= cam.near) return null;
  return toScreen(cam, c);
}

/**
 * Pixels per metre for something at a given camera depth.
 *
 * The one number that connects the world's units to the page's, and the reason
 * a stroke can be given a real width — a 100 mm road marking is 0.1·f/z pixels
 * wide, and stops being visible at the distance it would stop being visible.
 */
export function scaleAt(cam: Camera, depth: number): number {
  return focal(cam) / Math.max(depth, cam.near);
}

/* ------------------------------------------------------------------ *
 * Near-plane clipping
 * ------------------------------------------------------------------ */

/** Interpolate between two camera-space points at the near plane. */
function atNear(a: Vec3, b: Vec3, near: number): Vec3 {
  const t = (near - a.z) / (b.z - a.z);
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: near };
}

/**
 * A segment, clipped and projected. Null when it is entirely behind the lens.
 *
 * Without this a line from behind you to in front of you projects to two points
 * on opposite sides of the frame and draws a stripe across the sky.
 */
export function projectSegment(cam: Camera, a: Vec3, b: Vec3): [Point2, Point2] | null {
  let ca = toCamera(cam, a);
  let cb = toCamera(cam, b);

  const aIn = ca.z > cam.near;
  const bIn = cb.z > cam.near;
  if (!aIn && !bIn) return null;
  if (!aIn) ca = atNear(cb, ca, cam.near);
  if (!bIn) cb = atNear(ca, cb, cam.near);

  return [toScreen(cam, ca), toScreen(cam, cb)];
}

/**
 * A polygon, clipped against the near plane and projected.
 *
 * Sutherland–Hodgman against the single plane z = near. Convex or not, the
 * result is entirely in front of the lens, which is the only requirement the
 * perspective divide has.
 */
export function projectPolygon(cam: Camera, points: Vec3[]): Point2[] | null {
  if (points.length < 3) return null;

  const cameraSpace = points.map((p) => toCamera(cam, p));
  const clipped: Vec3[] = [];

  for (let i = 0; i < cameraSpace.length; i += 1) {
    const current = cameraSpace[i];
    const previous = cameraSpace[(i - 1 + cameraSpace.length) % cameraSpace.length];
    const currentIn = current.z > cam.near;
    const previousIn = previous.z > cam.near;

    if (currentIn) {
      if (!previousIn) clipped.push(atNear(previous, current, cam.near));
      clipped.push(current);
    } else if (previousIn) {
      clipped.push(atNear(previous, current, cam.near));
    }
  }

  if (clipped.length < 3) return null;
  return clipToFrame(cam, clipped.map((c) => toScreen(cam, c)));
}

/**
 * The margin the drawing is clipped to, as a multiple of the viewport.
 *
 * Not the viewport itself: the clip introduces edges that were not in the
 * original shape, and those must fall outside the frame or they show up as
 * straight lines ruled along the screen border. A full viewport of margin puts
 * them comfortably out of sight while still bounding every coordinate.
 */
const FRAME_MARGIN = 1;

/**
 * Clip a projected polygon to a rectangle around the frame.
 *
 * ---
 *
 * WHY THIS IS NOT OPTIONAL, AND NOT THE SAME AS NEAR-PLANE CLIPPING
 *
 * Near-plane clipping guarantees every vertex is *in front of* the lens. It
 * says nothing about where those vertices land on the page — and a vertex
 * sitting exactly on the near plane, 20 m off-axis, projects to
 * `f · 20 / 0.35`, which is about 55,000 pixels out.
 *
 * That is arithmetically correct and practically fatal. Walking up to a
 * building produced path coordinates in the tens of millions: geometry the
 * browser must still transform, rasterise and clip, for shapes whose visible
 * part is a few hundred pixels. It is the difference between a scene that runs
 * and one that stalls whenever the camera gets close to anything.
 *
 * So the projected polygon is clipped again, in two dimensions, against a
 * generous rectangle. Sutherland–Hodgman against four edges — the same
 * algorithm as the near plane, one dimension down.
 */
export function clipToFrame(cam: Camera, pts: Point2[]): Point2[] | null {
  const mx = cam.width * FRAME_MARGIN;
  const my = cam.height * FRAME_MARGIN;
  const edges: [(p: Point2) => boolean, (a: Point2, b: Point2) => Point2][] = [
    [(p) => p.x >= -mx, (a, b) => lerpPoint(a, b, (-mx - a.x) / (b.x - a.x))],
    [(p) => p.x <= cam.width + mx, (a, b) => lerpPoint(a, b, (cam.width + mx - a.x) / (b.x - a.x))],
    [(p) => p.y >= -my, (a, b) => lerpPoint(a, b, (-my - a.y) / (b.y - a.y))],
    [(p) => p.y <= cam.height + my, (a, b) => lerpPoint(a, b, (cam.height + my - a.y) / (b.y - a.y))],
  ];

  let poly = pts;
  for (const [inside, cross] of edges) {
    if (poly.length === 0) return null;
    const next: Point2[] = [];
    for (let i = 0; i < poly.length; i += 1) {
      const current = poly[i];
      const previous = poly[(i - 1 + poly.length) % poly.length];
      const currentIn = inside(current);
      const previousIn = inside(previous);
      if (currentIn) {
        if (!previousIn) next.push(cross(previous, current));
        next.push(current);
      } else if (previousIn) {
        next.push(cross(previous, current));
      }
    }
    poly = next;
  }

  return poly.length >= 3 ? poly : null;
}

function lerpPoint(a: Point2, b: Point2, t: number): Point2 {
  const u = Math.max(0, Math.min(1, t));
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, z: a.z + (b.z - a.z) * u };
}

/**
 * Clip an open polyline to the frame, returning the pieces that survive.
 *
 * Open lines cannot use the polygon clipper: it would join the ends and turn a
 * cable into a filled shape. Each segment is trimmed independently and runs of
 * surviving segments are stitched back together.
 */
export function clipPolyline(cam: Camera, pts: Point2[]): Point2[][] {
  const mx = cam.width * FRAME_MARGIN;
  const my = cam.height * FRAME_MARGIN;
  const inside = (p: Point2) =>
    p.x >= -mx && p.x <= cam.width + mx && p.y >= -my && p.y <= cam.height + my;

  const runs: Point2[][] = [];
  let run: Point2[] = [];
  for (const p of pts) {
    if (inside(p)) {
      run.push(p);
    } else if (run.length) {
      runs.push(run);
      run = [];
    }
  }
  if (run.length) runs.push(run);
  return runs.filter((r) => r.length >= 2);
}

/**
 * Depth of a polygon for sorting, taken as the distance to its centroid.
 *
 * The painter's algorithm needs one number per object, and a centroid is the
 * honest choice for the boxes and quads a city is made of. It is wrong for
 * long thin things seen end-on and for anything interpenetrating — neither of
 * which a city block does, which is why this holds up here and would not in a
 * general renderer.
 */
export function depthOf(cam: Camera, points: Vec3[]): number {
  let sx = 0;
  let sy = 0;
  let sz = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
    sz += p.z;
  }
  const n = points.length;
  const c = toCamera(cam, { x: sx / n, y: sy / n, z: sz / n });
  return c.z;
}

/**
 * Is any part of this bounding box possibly on screen?
 *
 * A cheap rejection before the expensive work. The city holds several thousand
 * volumes and at street level almost all of them are behind the camera or off
 * to the side; testing the eight corners of a box is far cheaper than
 * projecting its faces and finding out.
 */
export function boxVisible(
  cam: Camera,
  min: Vec3,
  max: Vec3,
  margin = 200,
): boolean {
  let anyInFront = false;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let i = 0; i < 8; i += 1) {
    const p = {
      x: i & 1 ? max.x : min.x,
      y: i & 2 ? max.y : min.y,
      z: i & 4 ? max.z : min.z,
    };
    const c = toCamera(cam, p);
    if (c.z > cam.near) {
      anyInFront = true;
      const s = toScreen(cam, c);
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
  }

  if (!anyInFront) return false;
  // A box straddling the near plane has corners that project nowhere useful, so
  // it is kept rather than tested — it is by definition close enough to matter.
  return (
    maxX > -margin &&
    minX < cam.width + margin &&
    maxY > -margin &&
    minY < cam.height + margin
  );
}

/* ------------------------------------------------------------------ *
 * Camera moves
 * ------------------------------------------------------------------ */

/**
 * Point the camera at a target from where it currently stands.
 *
 * Used by the story to look at a building while flying past it, rather than
 * having a yaw and a pitch authored for every waypoint and kept in sync with
 * positions by hand.
 */
export function lookAt(cam: Camera, target: Vec3): Camera {
  const dx = target.x - cam.x;
  const dy = target.y - cam.y;
  const dz = target.z - cam.z;
  const flat = Math.hypot(dx, dz);
  return {
    ...cam,
    yaw: Math.atan2(dx, dz),
    pitch: Math.atan2(dy, flat),
  };
}

/**
 * Blend two cameras.
 *
 * Angles are blended the short way round, so a move from 350° to 10° goes
 * forward through zero rather than spinning 340° backwards — the thing that
 * makes a camera appear to whip round for no reason.
 */
export function mixCamera(a: Camera, b: Camera, t: number): Camera {
  return {
    ...a,
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z, b.z, t),
    pitch: lerpAngle(a.pitch, b.pitch, t),
    yaw: lerpAngle(a.yaw, b.yaw, t),
    fov: lerp(a.fov, b.fov, t),
    shiftY: lerp(a.shiftY, b.shiftY, t),
    shiftX: lerp(a.shiftX, b.shiftX, t),
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lerpAngle(a: number, b: number, t: number): number {
  const TAU = Math.PI * 2;
  let d = ((b - a) % TAU + TAU + Math.PI) % TAU - Math.PI;
  return a + d * t;
}
