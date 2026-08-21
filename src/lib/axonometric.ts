/**
 * Axonometric projection — the geometry behind the exploded view.
 *
 * A true perspective camera is the wrong tool for a technical drawing. Under
 * perspective, two layers of the same size measure differently depending on
 * depth, so a reader cannot compare them — and comparison is the entire reason
 * the parts are being separated. **Axonometric projection keeps parallel lines
 * parallel and scale constant with depth**, which is why every exploded diagram
 * in every engineering manual ever printed uses it.
 *
 * It also costs nothing: this is four multiplications per point, on the CPU, in
 * SVG. No WebGL context, no shader compile, no device that cannot run it.
 *
 * ---
 *
 * THE PROJECTION
 *
 * A dimetric variant — the two horizontal axes are dropped by the same angle,
 * so the plan reads as a rhombus rather than a square:
 *
 *     screenX = (x − z) · cos θ
 *     screenY = y + (x + z) · sin θ
 *
 * `y` is the ONLY term carrying separation, which is what makes the explode a
 * single scalar: raise a layer's `y` and it lifts straight up the page while
 * its footprint stays exactly where it was, so the eye can still line the
 * layers up. Lifting along the view axis instead would slide the footprints
 * apart and lose the correspondence.
 */

/** 30° — shallow enough to read as a plan, steep enough to read as depth. */
const THETA = Math.PI / 6;
const COS_T = Math.cos(THETA);
const SIN_T = Math.sin(THETA);

export type Point3 = { x: number; y: number; z: number };
export type Point2 = { x: number; y: number };

export function project({ x, y, z }: Point3): Point2 {
  return {
    x: (x - z) * COS_T,
    y: y + (x + z) * SIN_T,
  };
}

/**
 * The four corners of a layer's plane, projected, as an SVG path.
 *
 * `size` is the half-width of a square footprint centred on the origin, so
 * every layer in a stack shares one footprint and the reader can see straight
 * down through them.
 */
export function planePath(size: number, lift: number): string {
  const corners: Point3[] = [
    { x: -size, y: lift, z: -size },
    { x: size, y: lift, z: -size },
    { x: size, y: lift, z: size },
    { x: -size, y: lift, z: size },
  ];
  const [a, b, c, d] = corners.map(project);
  return `M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)} L ${f(c.x)} ${f(c.y)} L ${f(d.x)} ${f(d.y)} Z`;
}

/**
 * A grid ruled across one layer's plane, as an SVG path.
 *
 * The plane is the site's own motif — see `--plane` in the stylesheet — carried
 * into three dimensions. It is what makes a layer read as a *measured surface*
 * rather than a coloured card floating in space.
 */
export function planeGrid(size: number, lift: number, divisions: number): string {
  const step = (size * 2) / divisions;
  let d = '';
  for (let i = 0; i <= divisions; i++) {
    const at = -size + i * step;
    const a = project({ x: at, y: lift, z: -size });
    const b = project({ x: at, y: lift, z: size });
    const c = project({ x: -size, y: lift, z: at });
    const e = project({ x: size, y: lift, z: at });
    d += ` M ${f(a.x)} ${f(a.y)} L ${f(b.x)} ${f(b.y)}`;
    d += ` M ${f(c.x)} ${f(c.y)} L ${f(e.x)} ${f(e.y)}`;
  }
  return d.trim();
}

/**
 * A curve plotted ON a layer's plane, as an SVG path.
 *
 * The samples are function values in the range −1…1, laid along the plane's
 * x axis and raised off it in `z`. That is the point of the whole component for
 * this studio: what separates out of the stack is not an abstract slab, it is a
 * plotted function sitting on ruled ground.
 */
export function planeCurve(
  size: number,
  lift: number,
  samples: readonly number[]
): string {
  return samples
    .map((value, i) => {
      const t = samples.length === 1 ? 0 : i / (samples.length - 1);
      const p = project({
        x: -size + t * size * 2,
        y: lift,
        z: clamp(value, -1, 1) * size * 0.72,
      });
      return `${i === 0 ? 'M' : 'L'} ${f(p.x)} ${f(p.y)}`;
    })
    .join(' ');
}

/**
 * Where a layer's leader line should start — the far corner of its plane.
 *
 * Always the same corner on every layer, so the labels stack into a clean
 * column instead of scattering. A diagram whose callouts wander is harder to
 * read than one with no callouts at all.
 */
export function leaderAnchor(size: number, lift: number): Point2 {
  return project({ x: size, y: lift, z: -size });
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Two decimals. SVG paths do not need more, and shorter paths parse faster. */
function f(n: number): number {
  return Math.round(n * 100) / 100;
}
