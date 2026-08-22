/**
 * THE RENDERER — the world, through the camera, onto a canvas.
 *
 * ==================================================================
 * PAINTER'S ALGORITHM, AND WHY IT IS ENOUGH HERE
 * ==================================================================
 *
 * There is no depth buffer. Everything is sorted by distance and drawn far to
 * near, so nearer things paint over further ones.
 *
 * That is the wrong answer in general — it fails for interpenetrating geometry
 * and for long thin objects seen end-on. It is the right answer *here* because
 * a city is a set of boxes that stand on the ground and do not pass through one
 * another. Buildings on the same block cannot overlap; buildings on different
 * blocks are separated by a street. The one case that needs care is a bridge,
 * which is long, thin and crosses in front of things, so bridges are split into
 * spans and sorted individually rather than as one object.
 *
 * ==================================================================
 * DISTANCE REMOVES DETAIL — THAT IS WHAT MAKES IT READABLE
 * ==================================================================
 *
 * Four bands, and the boundaries are in metres because that is what the eye is
 * actually responding to:
 *
 *      < 250 m     individual windows, doors, water towers, two ink passes
 *      < 900 m     floor banding instead of windows, one ink pass
 *      < 3 km      silhouette and a wash, no detail
 *      beyond      silhouette only, heavily hazed, no ink
 *
 * This is not only a performance decision, though it is that too. A drawing
 * that renders a window on a building two kilometres away does not look more
 * detailed, it looks like noise — the marks are smaller than the line weight and
 * they turn the facade grey. Every hand-drawn skyline in the world does exactly
 * this, and it is the reason they read.
 *
 * ==================================================================
 * AERIAL PERSPECTIVE DOES THE REST
 * ==================================================================
 *
 * Colour is mixed toward the sky's own colour with distance, exponentially, the
 * way extinction actually behaves. After convergence it is the strongest depth
 * cue available to a flat image — stronger than size, which the projection has
 * already taken care of.
 */

import {
  boxVisible,
  horizon,
  project,
  projectPolygon,
  scaleAt,
  toCamera,
  clipPolyline,
  type Camera,
  type Point2,
  type Vec3,
} from './camera';
import {
  AVENUE_WIDTH,
  STREET_WIDTH,
  blockAt,
  blocksNear,
  STOREY,
  type Building,
} from './blocks';
import {
  AVENUE,
  BATTERY_Z,
  BLOCK,
  blockZ,
  BOROUGH,
  BRIDGES,
  GOVERNORS,
  JERSEY,
  LANDMARKS,
  LIBERTY_ISLAND,
  MANHATTAN,
  PARK,
  PARK_GREEN,
  PARK_WATER,
  ROOSEVELT,
  DISTRICTS,
  type Landmark,
  type Ring,
} from './world';
import { massing, type Mass } from './massing';
import {
  flat,
  hatch,
  hazeAt,
  hazed,
  noise,
  stroke,
  wash,
  type P2,
  type Palette,
} from './sketch';

/* ------------------------------------------------------------------ *
 * Detail bands
 * ------------------------------------------------------------------ */

const NEAR = 250;
const MID = 900;
const FAR = 3000;

/**
 * The most buildings a single frame may draw.
 *
 * Chosen from what actually fits on a screen rather than from what a machine
 * can manage: past about a thousand, every further building is behind another
 * one or smaller than the line used to draw it. Raising it costs frames and
 * changes nothing you can see.
 */
const ITEM_BUDGET = 1100;

/** The most windows one face may be drawn with before it becomes banding. */
const WINDOW_BUDGET = 420;

/** How much of a block's building list to draw, by distance. */
function budgetFor(distance: number): number {
  if (distance < NEAR) return 40;
  if (distance < MID) return 14;
  if (distance < FAR) return 6;
  return 3;
}

/* ------------------------------------------------------------------ *
 * The frame
 * ------------------------------------------------------------------ */

export type RenderOptions = {
  palette: Palette;
  /** Seconds, for anything that moves. */
  time: number;
  /** 0 to 1. Above zero, it is raining. */
  rain?: number;
  /** Draw the roadway and traffic. Only worth it near the ground. */
  streets?: boolean;
  /** How far individual buildings are drawn. */
  radius?: number;
  /** How far coarse massing carries the city out to. */
  massRadius?: number;
};

export function renderCity(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  options: RenderOptions,
): void {
  const { palette } = options;

  ctx.save();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  drawSky(ctx, cam, options);
  drawWater(ctx, cam, palette);
  drawLand(ctx, cam, palette);
  drawGrid(ctx, cam, options);
  drawPark(ctx, cam, palette);
  drawBridges(ctx, cam, palette);
  drawBuildings(ctx, cam, options);
  if (options.rain) drawRain(ctx, cam, options);

  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Sky
 * ------------------------------------------------------------------ */

function drawSky(ctx: CanvasRenderingContext2D, cam: Camera, o: RenderOptions): void {
  const { palette } = o;
  const hz = horizon(cam);

  const g = ctx.createLinearGradient(0, 0, 0, Math.max(hz, cam.height * 0.4));
  g.addColorStop(0, palette.skyTop);
  g.addColorStop(1, palette.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, cam.width, cam.height);

  drawClouds(ctx, cam, o);
  if (palette.name === 'night') drawStars(ctx, cam, palette);
}

/**
 * Clouds, as banks of overlapping blobs at a fixed altitude.
 *
 * Placed in the *world* rather than on the screen, at 900 m — a real cumulus
 * base — so they sit still while the camera pans and get smaller toward the
 * horizon like everything else. Screen-space clouds slide against the city the
 * moment the camera turns, and it is instantly obvious.
 */
function drawClouds(ctx: CanvasRenderingContext2D, cam: Camera, o: RenderOptions): void {
  const { palette, time } = o;
  const alt = 900;
  const drift = time * 1.4;
  ctx.save();
  ctx.globalAlpha = palette.name === 'night' ? 0.22 : 0.5;

  for (let i = 0; i < 26; i += 1) {
    const wx = noise(i, 1, 5) * 9000 + drift;
    const wz = 2000 + Math.abs(noise(i, 2, 6)) * 16000;
    const centre = project(cam, { x: wx, y: alt + noise(i, 3, 7) * 200, z: wz });
    if (!centre || centre.y > horizon(cam) + 60) continue;

    const s = scaleAt(cam, centre.z);
    const r = (260 + Math.abs(noise(i, 4, 8)) * 420) * s;
    if (r < 3 || r > cam.width * 2) continue;

    ctx.fillStyle = palette.name === 'night' ? palette.inkFar : '#ffffff';
    for (let b = 0; b < 5; b += 1) {
      const ox = noise(i, b, 20) * r * 1.1;
      const oy = noise(i, b, 21) * r * 0.22;
      ctx.beginPath();
      ctx.ellipse(centre.x + ox, centre.y + oy, r * (0.4 + Math.abs(noise(i, b, 22)) * 0.5), r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawStars(ctx: CanvasRenderingContext2D, cam: Camera, palette: Palette): void {
  const hz = horizon(cam);
  ctx.save();
  ctx.fillStyle = '#e8eeff';
  for (let i = 0; i < 130; i += 1) {
    // Anchored to the camera's heading so they do not swim when it pans.
    const a = noise(i, 9, 31) * Math.PI + cam.yaw * 0.4;
    const x = ((a * 1400) % cam.width + cam.width) % cam.width;
    const y = (Math.abs(noise(i, 10, 32)) * 0.9) * Math.max(hz, 0);
    ctx.globalAlpha = 0.25 + Math.abs(noise(i, 11, 33)) * 0.6;
    ctx.fillRect(x, y, 1.4, 1.4);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * Ground
 * ------------------------------------------------------------------ */

/**
 * The water is the base plane; land is islands drawn on top of it.
 *
 * Simpler and more robust than cutting rivers out of a landmass: the rivers are
 * then whatever is left over, which means they are automatically the right
 * shape and can never disagree with the shorelines.
 */
function drawWater(ctx: CanvasRenderingContext2D, cam: Camera, palette: Palette): void {
  const hz = horizon(cam);
  if (hz >= cam.height) return;
  ctx.fillStyle = palette.water;
  ctx.fillRect(0, Math.max(0, hz), cam.width, cam.height - Math.max(0, hz));
}

function fillRing(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  ring: Ring,
  y: number,
  colour: string,
): Point2[] | null {
  const pts = projectPolygon(cam, ring.map(([x, z]) => ({ x, y, z })));
  if (!pts || pts.length < 3) return null;
  flat(ctx, pts, colour);
  return pts;
}

function drawLand(ctx: CanvasRenderingContext2D, cam: Camera, palette: Palette): void {
  // Furthest first. Jersey and the outer boroughs are the far bank.
  const far = hazed(palette.ground, palette, 0.55);
  fillRing(ctx, cam, JERSEY, 0, far);
  for (const b of Object.values(BOROUGH)) fillRing(ctx, cam, b.ring, 0, far);
  fillRing(ctx, cam, LIBERTY_ISLAND, 0, hazed(palette.green, palette, 0.5));
  fillRing(ctx, cam, GOVERNORS, 0, hazed(palette.green, palette, 0.5));
  fillRing(ctx, cam, ROOSEVELT, 0, hazed(palette.ground, palette, 0.4));

  const island = fillRing(ctx, cam, MANHATTAN, 0, palette.ground);
  if (island) {
    stroke(ctx, island, {
      seed: 4211,
      colour: hazed(palette.ink, palette, 0.5),
      width: 1.1,
      wobble: 1.6,
      close: true,
    });
  }
}

/**
 * THE GRID.
 *
 * The single most recognisable thing about New York from the air, and the thing
 * whose absence made every aerial view read as a beige field with boxes on it.
 * Not decoration — the 1811 Commissioners' Plan is the reason the city looks
 * the way it does, and drawing the buildings without the streets between them
 * is drawing the figure and leaving out the ground.
 *
 * Avenues are 30 m and run the length of the island; cross streets are 18 m and
 * run its width. Both are drawn as real roadways on the ground plane rather
 * than as hairlines, so they narrow with distance the way everything else does
 * and disappear on their own when they stop being legible.
 *
 * Only within the detail radius. Past that the streets are thinner than the
 * line used to draw them, and drawing them anyway turns the whole island grey —
 * the exact failure that makes a distant city look like a circuit board.
 */
function drawGrid(ctx: CanvasRenderingContext2D, cam: Camera, o: RenderOptions): void {
  const { palette } = o;
  const reach = Math.min(o.radius ?? 1500, 3200) * 2.4;
  const road = hazed(palette.asphalt, palette, 0.15);

  const quad = (a: Vec3, b: Vec3, c: Vec3, d: Vec3, depth: number) => {
    const pts = projectPolygon(cam, [a, b, c, d]);
    if (!pts) return;
    flat(ctx, pts, hazed(road, palette, hazeAt(depth)));
  };

  // Avenues, the length of the island.
  const z0 = Math.max(BATTERY_Z, cam.z - reach);
  const z1 = Math.min(blockZ(222), cam.z + reach);
  if (z1 > z0) {
    for (const x of Object.values(AVENUE)) {
      if (Math.abs(x - cam.x) > reach) continue;
      const h = AVENUE_WIDTH / 2;
      quad(
        { x: x - h, y: 0.2, z: z0 },
        { x: x + h, y: 0.2, z: z0 },
        { x: x + h, y: 0.2, z: z1 },
        { x: x - h, y: 0.2, z: z1 },
        Math.abs(x - cam.x) + 60,
      );
    }
  }

  // Cross streets, only the ones near enough to read.
  const first = Math.floor((cam.z - reach) / BLOCK) + 42;
  const last = Math.ceil((cam.z + reach) / BLOCK) + 42;
  const west = Math.max(-1900, cam.x - reach);
  const east = Math.min(1450, cam.x + reach);
  if (east > west) {
    for (let n = first; n <= last; n += 1) {
      const z = blockZ(n);
      if (z < BATTERY_Z + 2600 || z > blockZ(222)) continue;
      const h = STREET_WIDTH / 2;
      quad(
        { x: west, y: 0.2, z: z - h },
        { x: east, y: 0.2, z: z - h },
        { x: east, y: 0.2, z: z + h },
        { x: west, y: 0.2, z: z + h },
        Math.abs(z - cam.z) + 60,
      );
    }
  }
}

function drawPark(ctx: CanvasRenderingContext2D, cam: Camera, palette: Palette): void {
  const ring: Ring = [
    [PARK.west, PARK.south],
    [PARK.east, PARK.south],
    [PARK.east, PARK.north],
    [PARK.west, PARK.north],
  ];
  const pts = fillRing(ctx, cam, ring, 0.3, palette.green);
  if (!pts) return;

  for (const g of PARK_GREEN) fillRing(ctx, cam, g.ring, 0.5, palette.greenDeep);
  for (const w of PARK_WATER) {
    const wp = fillRing(ctx, cam, w.ring, 0.4, palette.water);
    if (wp && wp.length > 2) {
      stroke(ctx, wp, {
        seed: 7700 + w.name.length,
        colour: hazed(palette.ink, palette, 0.4),
        width: 0.9,
        wobble: 1.2,
        close: true,
      });
    }
  }

  drawTrees(ctx, cam, palette);
}

/**
 * The park's tree canopy.
 *
 * Not individual trees — a canopy, as overlapping blobs on a jittered grid,
 * which is what a forest looks like from anywhere but inside it. Spaced at 34 m,
 * which is roughly the crown of a mature London plane, the tree Olmsted planted
 * most of.
 */
function drawTrees(ctx: CanvasRenderingContext2D, cam: Camera, palette: Palette): void {
  // Canopy spacing grows with distance from the camera: drawing every tree in a
  // four-kilometre park and discarding the ones under a pixel is most of a
  // frame's budget spent on nothing.
  const away = Math.max(
    0,
    Math.min(Math.abs(cam.z - (PARK.south + PARK.north) / 2), Math.abs(cam.x - (PARK.west + PARK.east) / 2)),
  );
  const step = 34 * Math.max(1, Math.round(away / 900));
  const inWater = (x: number, z: number) =>
    PARK_WATER.some((w) => pointInRing(w.ring, x, z)) ||
    PARK_GREEN.some((g) => pointInRing(g.ring, x, z));

  ctx.save();
  for (let z = PARK.south; z < PARK.north; z += step) {
    for (let x = PARK.west; x < PARK.east; x += step) {
      const jx = x + noise(x | 0, z | 0, 1) * step * 0.5;
      const jz = z + noise(x | 0, z | 0, 2) * step * 0.5;
      if (inWater(jx, jz)) continue;

      const h = 11 + Math.abs(noise(x | 0, z | 0, 3)) * 8;
      const top = project(cam, { x: jx, y: h, z: jz });
      if (!top || top.x < -60 || top.x > cam.width + 60 || top.y < -60 || top.y > cam.height + 60) continue;
      if (top.z > 5200) continue;

      const s = scaleAt(cam, top.z);
      const r = h * 0.62 * s;
      if (r < 0.7) continue;

      const fade = hazeAt(top.z);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = hazed(noise(x | 0, z | 0, 4) > 0 ? palette.green : palette.greenDeep, palette, fade);
      ctx.beginPath();
      ctx.ellipse(top.x, top.y, r, r * 0.86, 0, 0, Math.PI * 2);
      ctx.fill();

      // A trunk, only when it would be more than a pixel.
      if (r > 5) {
        const base = project(cam, { x: jx, y: 0, z: jz });
        if (base) {
          ctx.strokeStyle = hazed(palette.ink, palette, fade);
          ctx.globalAlpha = 0.5;
          ctx.lineWidth = Math.max(0.5, r * 0.13);
          ctx.beginPath();
          for (const run of clipPolyline(cam, [base, { ...top, y: top.y + r * 0.5 }])) {
            ctx.moveTo(run[0].x, run[0].y);
            ctx.lineTo(run[run.length - 1].x, run[run.length - 1].y);
          }
          ctx.stroke();
        }
      }
    }
  }
  ctx.restore();
}

function pointInRing(ring: Ring, x: number, z: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, zi] = ring[i];
    const [xj, zj] = ring[j];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}

/* ------------------------------------------------------------------ *
 * Bridges
 * ------------------------------------------------------------------ */

/**
 * A suspension bridge, at its real span.
 *
 * The main cable is a **catenary**, not a parabola — but only when it carries
 * nothing but itself. Loaded uniformly along the horizontal, which is exactly
 * what a suspended deck does, it becomes a parabola. So the deck cables here are
 * parabolic and that is the correct curve, not an approximation of the
 * "correct" catenary.
 *
 * Sag is a tenth of the span, which is the usual design ratio and the reason
 * every suspension bridge looks like the same bridge at a different size.
 */
function drawBridges(ctx: CanvasRenderingContext2D, cam: Camera, palette: Palette): void {
  for (const b of BRIDGES) {
    const [x0, z0] = b.from;
    const [x1, z1] = b.to;
    const total = Math.hypot(x1 - x0, z1 - z0);
    const mid = { x: (x0 + x1) / 2, y: b.deck, z: (z0 + z1) / 2 };
    const c = toCamera(cam, mid);
    if (c.z <= cam.near || c.z > 24000) continue;

    const fade = hazeAt(c.z);
    const ink = hazed(palette.ink, palette, fade);
    const deckColour = hazed(palette.asphalt, palette, fade);

    // The deck, as a ribbon that rises to the middle.
    const N = 22;
    const left: Vec3[] = [];
    const right: Vec3[] = [];
    const ux = (x1 - x0) / total;
    const uz = (z1 - z0) / total;
    const half = b.width / 2;
    for (let i = 0; i <= N; i += 1) {
      const t = i / N;
      const rise = Math.sin(t * Math.PI) * b.deck * 0.22;
      const px = x0 + (x1 - x0) * t;
      const pz = z0 + (z1 - z0) * t;
      left.push({ x: px - uz * half, y: b.deck + rise, z: pz + ux * half });
      right.push({ x: px + uz * half, y: b.deck + rise, z: pz - ux * half });
    }
    const deck = projectPolygon(cam, [...left, ...right.reverse()]);
    if (deck) {
      flat(ctx, deck, deckColour);
      stroke(ctx, deck, { seed: b.name.length * 71, colour: ink, width: 1, wobble: 0.9, close: true });
    }

    if (b.kind === 'suspension') {
      const sag = b.span * 0.1;
      const towerT = [0.5 - b.span / total / 2, 0.5 + b.span / total / 2];

      // Towers.
      for (const t of towerT) {
        const px = x0 + (x1 - x0) * t;
        const pz = z0 + (z1 - z0) * t;
        for (const s of [-1, 1]) {
          const seg = [
            project(cam, { x: px - uz * half * s, y: 0, z: pz + ux * half * s }),
            project(cam, { x: px - uz * half * s, y: b.tower, z: pz + ux * half * s }),
          ];
          if (seg[0] && seg[1]) {
            for (const run of clipPolyline(cam, seg as Point2[])) {
              stroke(ctx, run, { seed: 900 + t * 1000, colour: ink, width: Math.max(1.2, 5 * scaleAt(cam, c.z)), wobble: 0.7 });
            }
          }
        }
      }

      // The main cable: parabolic between the towers, straight to the anchors.
      const cable: (Point2 | null)[] = [];
      for (let i = 0; i <= 28; i += 1) {
        const t = i / 28;
        let y: number;
        if (t < towerT[0]) y = b.deck + (b.tower - b.deck) * (t / towerT[0]);
        else if (t > towerT[1]) y = b.deck + (b.tower - b.deck) * ((1 - t) / (1 - towerT[1]));
        else {
          const u = (t - towerT[0]) / (towerT[1] - towerT[0]);
          // 4u(1−u) is the unit parabola: zero at both towers, one in the middle.
          y = b.tower - sag * 4 * u * (1 - u);
        }
        cable.push(project(cam, { x: x0 + (x1 - x0) * t, y, z: z0 + (z1 - z0) * t }));
      }
      const pts = cable.filter(Boolean) as Point2[];
      for (const run of clipPolyline(cam, pts)) {
        if (run.length > 3) {
          stroke(ctx, run, { seed: 611, colour: ink, width: Math.max(0.8, 2.4 * scaleAt(cam, c.z)), wobble: 0.5 });
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ *
 * Buildings
 * ------------------------------------------------------------------ */

type Item = {
  depth: number;
  building: Building | null;
  landmark: Landmark | null;
};

function drawBuildings(ctx: CanvasRenderingContext2D, cam: Camera, o: RenderOptions): void {
  const radius = o.radius ?? 1500;
  const items: Item[] = [];

  /*
    The far city first, as mass.

    Drawn before anything detailed and never sorted against it: every one of
    these is beyond the detail radius, so it is behind every individual
    building by construction. Sorting them together would be several thousand
    comparisons a frame to arrive at the order they are already in.
  */
  drawMassing(ctx, cam, o, radius);

  for (const { bx, bz, distance } of blocksNear(cam.x, cam.z, radius)) {
    const list = blockAt(bx, bz);
    const budget = budgetFor(distance);
    for (let i = 0; i < Math.min(list.length, budget); i += 1) {
      const b = list[i];
      const c = toCamera(cam, { x: b.x, y: b.height / 2, z: b.z });
      if (c.z <= cam.near) continue;
      if (
        !boxVisible(
          cam,
          { x: b.x - b.width / 2, y: 0, z: b.z - b.depth / 2 },
          { x: b.x + b.width / 2, y: b.height, z: b.z + b.depth / 2 },
        )
      ) {
        continue;
      }
      items.push({ depth: c.z, building: b, landmark: null });
    }
  }

  for (const L of LANDMARKS) {
    const c = toCamera(cam, { x: L.x, y: L.height / 2, z: L.z });
    if (c.z <= cam.near || c.z > 26000) continue;
    if (
      !boxVisible(
        cam,
        { x: L.x - L.width / 2, y: 0, z: L.z - L.depth / 2 },
        { x: L.x + L.width / 2, y: L.tip ?? L.height, z: L.z + L.depth / 2 },
      )
    ) {
      continue;
    }
    items.push({ depth: c.z, building: null, landmark: L });
  }

  /*
    A hard ceiling on how much of the city one frame may contain.

    Sorted NEAREST first to choose what survives, then reversed to draw. Those
    are two different orders and both are needed: the things worth keeping are
    the close ones, and the order they must be painted in is the opposite.
    Taking the first N of a far-to-near list would keep the horizon and throw
    away the street you are standing on.
  */
  items.sort((a, b) => a.depth - b.depth);
  if (items.length > ITEM_BUDGET) items.length = ITEM_BUDGET;
  items.reverse();

  for (const item of items) {
    if (item.landmark) drawLandmark(ctx, cam, item.landmark, item.depth, o);
    else if (item.building) drawBuilding(ctx, cam, item.building, item.depth, o);
  }
}

/**
 * The city past the detail radius: silhouettes, no windows, no ink up close.
 *
 * Sorted far to near among themselves, which matters where a tower stands proud
 * of the mass around it.
 */
function drawMassing(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
  from: number,
): void {
  const to = o.massRadius ?? 26000;
  if (to <= from) return;

  const volumes = massing(cam.x, cam.z, from, to);
  const withDepth: { m: Mass; depth: number }[] = [];
  for (const m of volumes) {
    const c = toCamera(cam, { x: m.x, y: m.height / 2, z: m.z });
    if (c.z <= cam.near) continue;
    if (!boxVisible(cam, { x: m.x - m.width, y: 0, z: m.z - m.depth }, { x: m.x + m.width, y: m.height, z: m.z + m.depth })) continue;
    withDepth.push({ m, depth: c.z });
  }
  withDepth.sort((a, b) => b.depth - a.depth);

  for (const { m, depth } of withDepth) {
    drawBox(
      ctx, cam, m.x, m.z, m.width, m.depth, 0, m.height,
      m.seed, o.palette[DISTRICTS[m.district].tone], depth, o, 'plain', 0,
    );
  }
}

/** Face brightness. The sun is low in the southeast, so +z and +x faces are lit. */
function faceTone(base: string, palette: Palette, lit: boolean, top: boolean): string {
  const rgb = toRgb(base);
  if (!rgb) return base;
  const k = top ? 1.09 : lit ? 1.0 : 0.82;
  const wash = palette.name === 'night' ? 0.55 : 1;
  return `rgb(${clamp255(rgb[0] * k * wash)},${clamp255(rgb[1] * k * wash)},${clamp255(rgb[2] * k * wash)})`;
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toRgb(c: string): [number, number, number] | null {
  if (c.startsWith('rgb')) {
    const m = c.match(/\d+/g);
    return m && m.length >= 3 ? [Number(m[0]), Number(m[1]), Number(m[2])] : null;
  }
  if (c[0] !== '#') return null;
  const n = parseInt(c.slice(1, 7), 16);
  return Number.isNaN(n) ? null : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * One box: the two visible side faces and, if the camera is above it, the roof.
 *
 * Never more than three of the six. A box has three faces you can possibly see
 * from any one point, and testing which is a sign test per axis — far cheaper
 * than projecting all six and sorting them.
 */
function drawBox(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  cx: number,
  cz: number,
  w: number,
  d: number,
  y0: number,
  y1: number,
  seed: number,
  base: string,
  depth: number,
  o: RenderOptions,
  detail: 'full' | 'bands' | 'plain',
  floors = 0,
): void {
  const { palette } = o;
  const fade = hazeAt(depth);
  const ink = hazed(palette.ink, palette, fade * 0.9);
  const hw = w / 2;
  const hd = d / 2;

  const faces: { pts: Vec3[]; lit: boolean; top: boolean; axis: 'x' | 'z' | 'y'; span: number }[] = [];

  if (cam.z < cz - hd) {
    faces.push({
      pts: [
        { x: cx - hw, y: y0, z: cz - hd },
        { x: cx + hw, y: y0, z: cz - hd },
        { x: cx + hw, y: y1, z: cz - hd },
        { x: cx - hw, y: y1, z: cz - hd },
      ],
      lit: false,
      top: false,
      axis: 'z',
      span: w,
    });
  } else if (cam.z > cz + hd) {
    faces.push({
      pts: [
        { x: cx + hw, y: y0, z: cz + hd },
        { x: cx - hw, y: y0, z: cz + hd },
        { x: cx - hw, y: y1, z: cz + hd },
        { x: cx + hw, y: y1, z: cz + hd },
      ],
      lit: true,
      top: false,
      axis: 'z',
      span: w,
    });
  }

  if (cam.x < cx - hw) {
    faces.push({
      pts: [
        { x: cx - hw, y: y0, z: cz + hd },
        { x: cx - hw, y: y0, z: cz - hd },
        { x: cx - hw, y: y1, z: cz - hd },
        { x: cx - hw, y: y1, z: cz + hd },
      ],
      lit: false,
      top: false,
      axis: 'x',
      span: d,
    });
  } else if (cam.x > cx + hw) {
    faces.push({
      pts: [
        { x: cx + hw, y: y0, z: cz - hd },
        { x: cx + hw, y: y0, z: cz + hd },
        { x: cx + hw, y: y1, z: cz + hd },
        { x: cx + hw, y: y1, z: cz - hd },
      ],
      lit: true,
      top: false,
      axis: 'x',
      span: d,
    });
  }

  if (cam.y > y1) {
    faces.push({
      pts: [
        { x: cx - hw, y: y1, z: cz - hd },
        { x: cx + hw, y: y1, z: cz - hd },
        { x: cx + hw, y: y1, z: cz + hd },
        { x: cx - hw, y: y1, z: cz + hd },
      ],
      lit: true,
      top: true,
      axis: 'y',
      span: w,
    });
  }

  for (const face of faces) {
    const pts = projectPolygon(cam, face.pts);
    if (!pts || pts.length < 3) continue;

    const colour = hazed(faceTone(base, palette, face.lit, face.top), palette, fade);
    if (detail === 'full') wash(ctx, pts, colour, seed, 1.6);
    else flat(ctx, pts, colour);

    // The shaded side gets hatching, the way a pen shades rather than fills.
    if (detail === 'full' && !face.lit && !face.top && palette.name !== 'night') {
      hatch(ctx, pts, ink, seed + 3, 7, 0.1);
    }

    if (!face.top && floors > 0 && detail !== 'plain') {
      drawFacade(ctx, cam, face.pts, floors, face.span, y1 - y0, seed, depth, o, detail, face.lit);
    }

    if (detail !== 'plain' || depth < FAR) {
      stroke(ctx, pts, {
        seed,
        colour: ink,
        width: detail === 'full' ? 1.25 : 1,
        wobble: detail === 'full' ? 1.3 : 0.7,
        overshoot: detail === 'full' ? 2.2 : 0,
        passes: detail === 'full' ? 2 : 1,
        close: true,
      });
    }
  }
}

/**
 * The face of a building: windows if it is close, floor banding if it is not.
 *
 * The switch is on the drawn height of a storey, not on distance, which is the
 * honest test — a 200 m tower a kilometre away has bigger storeys on the page
 * than a brownstone across the street. Below about five pixels a window stops
 * being a window and starts being grey.
 */
function drawFacade(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  face: Vec3[],
  floors: number,
  span: number,
  height: number,
  seed: number,
  depth: number,
  o: RenderOptions,
  detail: 'full' | 'bands',
  lit: boolean,
): void {
  const { palette } = o;
  const s = scaleAt(cam, depth);
  const storeyPx = (height / floors) * s;
  if (storeyPx < 1.6) return;

  const fade = hazeAt(depth);
  const [bl, br, tr, tl] = face;

  /*
    Windows and floor lines are projected point by point rather than as
    polygons, so they miss the polygon clipper entirely. On the building you are
    standing next to, the top-floor windows land tens of thousands of pixels off
    the top of the frame — each one a rectangle the browser still has to
    rasterise. Anything outside a viewport of margin is dropped here instead.
  */
  const onFrame = (p: Point2 | null): p is Point2 =>
    p !== null &&
    p.x > -cam.width &&
    p.x < cam.width * 2 &&
    p.y > -cam.height &&
    p.y < cam.height * 2;

  // Bilinear across the face, so everything lands in perspective without
  // projecting each window's corners separately.
  const at = (u: number, v: number): Vec3 => ({
    x: bl.x + (br.x - bl.x) * u + (tl.x - bl.x) * v,
    y: bl.y + (tl.y - bl.y) * v,
    z: bl.z + (br.z - bl.z) * u + (tl.z - bl.z) * v,
  });

  if (detail === 'bands' || storeyPx < 5) {
    ctx.strokeStyle = hazed(palette.ink, palette, Math.min(1, fade + 0.25));
    ctx.globalAlpha = 0.32;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    const step = Math.max(1, Math.round(3 / Math.max(storeyPx, 0.4)));
    for (let f = step; f < floors; f += step) {
      const v = f / floors;
      const a = project(cam, at(0, v));
      const b = project(cam, at(1, v));
      if (onFrame(a) && onFrame(b)) {
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  // Individual windows. Columns from the frontage: about 3.4 m to a bay, which
  // is what an office module actually is.
  const cols = Math.max(1, Math.round(span / 3.4));
  if (floors * cols > WINDOW_BUDGET) {
    // A sixty-storey tower with twenty bays is 1,200 windows and 2,400
    // projections for one face. Past the budget it is drawn as banding, which
    // at that size is what it looks like anyway.
    drawFacade(ctx, cam, face, floors, span, height, seed, depth, o, 'bands', lit);
    return;
  }
  const litShare = palette.windowLit * (lit ? 0.8 : 1.25);

  ctx.fillStyle = hazed(palette.window, palette, fade);
  ctx.globalAlpha = palette.name === 'night' ? 0.28 : 0.5;
  ctx.beginPath();
  for (let f = 0; f < floors; f += 1) {
    for (let c = 0; c < cols; c += 1) {
      const u0 = (c + 0.28) / cols;
      const u1 = (c + 0.72) / cols;
      const v0 = (f + 0.3) / floors;
      const v1 = (f + 0.78) / floors;
      const p00 = project(cam, at(u0, v0));
      const p11 = project(cam, at(u1, v1));
      if (!onFrame(p00) || !onFrame(p11)) continue;
      ctx.rect(p00.x, p11.y, p11.x - p00.x, p00.y - p11.y);
    }
  }
  ctx.fill();

  // The lit ones, drawn over the top. Clustered by floor — a floor is one
  // tenant, and independent per-window coin flips look like static.
  if (litShare > 0.02) {
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.window;
    ctx.beginPath();
    for (let f = 0; f < floors; f += 1) {
      const floorLit = noise(seed, f, 41) * 0.5 + 0.5 < litShare * 2.4 ? 0.75 : 0.06;
      for (let c = 0; c < cols; c += 1) {
        if (noise(seed, f * 97 + c, 42) * 0.5 + 0.5 > floorLit) continue;
        const u0 = (c + 0.28) / cols;
        const u1 = (c + 0.72) / cols;
        const v0 = (f + 0.3) / floors;
        const v1 = (f + 0.78) / floors;
        const p00 = project(cam, at(u0, v0));
        const p11 = project(cam, at(u1, v1));
        if (!onFrame(p00) || !onFrame(p11)) continue;
        ctx.rect(p00.x, p11.y, p11.x - p00.x, p00.y - p11.y);
      }
    }
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBuilding(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  b: Building,
  depth: number,
  o: RenderOptions,
): void {
  const detail: 'full' | 'bands' | 'plain' =
    depth < NEAR ? 'full' : depth < MID ? 'bands' : 'plain';
  const tone = DISTRICTS[b.district].tone;
  const base = o.palette[tone];
  const seed = Math.round(b.seed * 100000);

  if (b.setbacks.length === 0) {
    drawBox(ctx, cam, b.x, b.z, b.width, b.depth, 0, b.height, seed, base, depth, o, detail, b.floors);
  } else {
    let y = 0;
    let inset = 0;
    for (const [frac, step] of b.setbacks) {
      const top = b.height * frac;
      drawBox(
        ctx, cam, b.x, b.z,
        b.width - inset * 2, b.depth - inset * 2,
        y, top, seed, base, depth, o, detail,
        Math.max(1, Math.round((top - y) / STOREY)),
      );
      y = top;
      inset += step;
    }
    drawBox(
      ctx, cam, b.x, b.z,
      b.width - inset * 2, b.depth - inset * 2,
      y, b.height, seed, base, depth, o, detail,
      Math.max(1, Math.round((b.height - y) / STOREY)),
    );
  }

  if (b.waterTower && depth < MID) drawWaterTower(ctx, cam, b, depth, o);
}

/**
 * A rooftop water tank: a cedar barrel on a steel frame with a conical lid.
 *
 * Six metres tall on a four-metre frame, which is the standard size. There are
 * around seventeen thousand of them in the city and they are the single most
 * New York silhouette after the skyline itself — a rooftop without one reads as
 * somewhere else.
 */
function drawWaterTower(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  b: Building,
  depth: number,
  o: RenderOptions,
): void {
  const { palette } = o;
  const fade = hazeAt(depth);
  const ink = hazed(palette.ink, palette, fade);
  const x = b.x + noise(Math.round(b.seed * 1e5), 1, 60) * b.width * 0.24;
  const z = b.z + noise(Math.round(b.seed * 1e5), 2, 61) * b.depth * 0.24;
  const legs = 4;
  const r = 1.9;
  const y0 = b.height;

  const barrel = projectPolygon(cam, [
    { x: x - r, y: y0 + legs, z },
    { x: x + r, y: y0 + legs, z },
    { x: x + r * 0.92, y: y0 + legs + 6, z },
    { x: x - r * 0.92, y: y0 + legs + 6, z },
  ]);
  if (!barrel) return;
  const s = scaleAt(cam, depth);
  if (r * 2 * s < 1.5) return;

  flat(ctx, barrel, hazed(palette.brick, palette, fade));
  stroke(ctx, barrel, { seed: 5150, colour: ink, width: 0.9, wobble: 0.6, close: true });

  // The conical lid, and the legs beneath.
  const capL = project(cam, { x: x - r * 0.92, y: y0 + legs + 6, z });
  const capR = project(cam, { x: x + r * 0.92, y: y0 + legs + 6, z });
  const capT = project(cam, { x, y: y0 + legs + 8.4, z });
  if (capL && capR && capT) {
    flat(ctx, [capL, capR, capT], hazed(palette.ink, palette, Math.min(1, fade + 0.2)));
  }
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.5, 0.5 * s);
  ctx.beginPath();
  for (const dx of [-r * 0.8, r * 0.8]) {
    const a = project(cam, { x: x + dx, y: y0, z });
    const c = project(cam, { x: x + dx, y: y0 + legs, z });
    if (a && c) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
    }
  }
  ctx.stroke();
}

/* ------------------------------------------------------------------ *
 * Landmarks
 * ------------------------------------------------------------------ */

function drawLandmark(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  L: Landmark,
  depth: number,
  o: RenderOptions,
): void {
  const { palette } = o;
  const detail: 'full' | 'bands' | 'plain' =
    depth < NEAR ? 'full' : depth < MID * 2 ? 'bands' : 'plain';
  const base = palette[DISTRICTS[L.district].tone];
  const seed = L.id.length * 7919;
  const fade = hazeAt(depth);
  const ink = hazed(palette.ink, palette, fade * 0.9);
  const floors = (h: number) => Math.max(1, Math.round(h / STOREY));

  const stack = (steps: [number, number][]) => {
    let y = 0;
    let inset = 0;
    for (const [top, step] of steps) {
      drawBox(
        ctx, cam, L.x, L.z,
        L.width - inset * 2, L.depth - inset * 2,
        y, top, seed, base, depth, o, detail, floors(top - y),
      );
      y = top;
      inset += step;
    }
  };

  switch (L.shape) {
    case 'artdeco':
      // A broad five-storey base, the shaft, then the crown and the mast.
      stack([
        [L.height * 0.16, L.width * 0.14],
        [L.height * 0.78, L.width * 0.06],
        [L.height * 0.94, L.width * 0.1],
        [L.height, 0],
      ]);
      if (L.tip) drawMast(ctx, cam, L, L.height, L.tip, ink, depth);
      break;

    case 'chrysler': {
      stack([
        [L.height * 0.2, L.width * 0.1],
        [L.height * 0.72, L.width * 0.05],
      ]);
      // The seven terraced arches. Nested, each narrower and taller — the thing
      // everyone can draw from memory without knowing what it is called.
      const y0 = L.height * 0.72;
      for (let i = 0; i < 7; i += 1) {
        const t = i / 7;
        const w = L.width * (1 - t) * 0.94;
        const y = y0 + (L.height - y0) * t;
        const yTop = y0 + (L.height - y0) * ((i + 1) / 7);
        drawBox(ctx, cam, L.x, L.z, w, w, y, yTop, seed + i, base, depth, o, 'plain', 0);
      }
      if (L.tip) drawMast(ctx, cam, L, L.height, L.tip, ink, depth);
      break;
    }

    case 'tapered': {
      // One WTC: a square base rotating into a square top, so the faces are
      // eight triangles. Approximated by stacking boxes that shrink and turn.
      const N = 10;
      for (let i = 0; i < N; i += 1) {
        const t = i / N;
        const w = L.width * (1 - t * 0.42);
        drawBox(
          ctx, cam, L.x, L.z, w, w,
          (L.height * i) / N, (L.height * (i + 1)) / N,
          seed + i, base, depth, o, detail === 'full' ? 'bands' : detail,
          floors(L.height / N),
        );
      }
      if (L.tip) drawMast(ctx, cam, L, L.height, L.tip, ink, depth);
      break;
    }

    case 'pencil':
      drawBox(ctx, cam, L.x, L.z, L.width, L.depth, 0, L.height, seed, base, depth, o, detail, floors(L.height));
      break;

    case 'setback':
      stack([
        [L.height * 0.4, L.width * 0.1],
        [L.height * 0.72, L.width * 0.08],
        [L.height, 0],
      ]);
      break;

    case 'flatiron': {
      // A wedge, because the block is a wedge — Broadway crossing Fifth at 23rd.
      const half = L.width / 2;
      const nose: Vec3[] = [
        { x: L.x, y: 0, z: L.z + L.depth / 2 },
        { x: L.x - half, y: 0, z: L.z - L.depth / 2 },
        { x: L.x + half, y: 0, z: L.z - L.depth / 2 },
      ];
      // The two long faces meeting at the point. The east one catches the sun.
      const walls: { a: Vec3; b: Vec3; lit: boolean }[] = [
        { a: nose[0], b: nose[1], lit: false },
        { a: nose[2], b: nose[0], lit: true },
      ];
      for (const wall of walls) {
        const quad = projectPolygon(cam, [
          wall.a,
          wall.b,
          { ...wall.b, y: L.height },
          { ...wall.a, y: L.height },
        ]);
        if (!quad) continue;
        flat(ctx, quad, hazed(faceTone(base, palette, wall.lit, false), palette, fade));
        stroke(ctx, quad, { seed, colour: ink, width: 1.2, wobble: 1, close: true });
      }
      break;
    }

    case 'statue': {
      // Pedestal, then figure, then the torch — the proportions everyone knows:
      // roughly half the height is the granite base it stands on.
      const ped = L.height * 0.49;
      drawBox(ctx, cam, L.x, L.z, L.width, L.depth, 0, ped, seed, base, depth, o, 'plain', 0);
      const body = projectPolygon(cam, [
        { x: L.x - 7, y: ped, z: L.z },
        { x: L.x + 7, y: ped, z: L.z },
        { x: L.x + 2.6, y: L.height * 0.92, z: L.z },
        { x: L.x - 2.6, y: L.height * 0.92, z: L.z },
      ]);
      if (body) {
        flat(ctx, body, hazed('#8fbfae', palette, fade));
        stroke(ctx, body, { seed, colour: ink, width: 1.1, wobble: 1.1, close: true });
      }
      const arm = [
        project(cam, { x: L.x + 1, y: L.height * 0.78, z: L.z }),
        project(cam, { x: L.x + 6, y: L.height, z: L.z }),
      ];
      if (arm[0] && arm[1]) stroke(ctx, arm as P2[], { seed, colour: ink, width: 2, wobble: 0.6 });
      break;
    }

    default:
      drawBox(ctx, cam, L.x, L.z, L.width, L.depth, 0, L.height, seed, base, depth, o, detail, floors(L.height));
  }
}

/** An antenna or spire: one tapering line, and a light on top after dark. */
function drawMast(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  L: Landmark,
  from: number,
  to: number,
  ink: string,
  depth: number,
): void {
  const a = project(cam, { x: L.x, y: from, z: L.z });
  const b = project(cam, { x: L.x, y: to, z: L.z });
  if (!a || !b) return;
  const s = scaleAt(cam, depth);
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(0.7, 2.2 * s);
  ctx.beginPath();
  for (const run of clipPolyline(cam, [a, b])) {
    ctx.moveTo(run[0].x, run[0].y);
    ctx.lineTo(run[run.length - 1].x, run[run.length - 1].y);
  }
  ctx.stroke();
}

/* ------------------------------------------------------------------ *
 * Weather
 * ------------------------------------------------------------------ */

/**
 * Rain, as streaks in screen space.
 *
 * The one thing deliberately not in the world: rain is between you and
 * everything, close enough that perspective on an individual drop would be
 * meaningless, and drawing a hundred thousand world-space drops to get the
 * hundred that land in frame would be absurd. It falls at a slight angle
 * because it always does.
 */
function drawRain(ctx: CanvasRenderingContext2D, cam: Camera, o: RenderOptions): void {
  const amount = o.rain ?? 0;
  if (amount <= 0) return;
  const count = Math.round(amount * 320);

  ctx.save();
  ctx.strokeStyle = o.palette.name === 'night' ? '#9fb6d8' : '#ffffff';
  ctx.globalAlpha = 0.3 * amount;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < count; i += 1) {
    const speed = 900 + Math.abs(noise(i, 1, 70)) * 700;
    const x = (noise(i, 2, 71) * 0.5 + 0.5) * cam.width;
    const y = ((o.time * speed + Math.abs(noise(i, 3, 72)) * cam.height * 3) % (cam.height + 120)) - 60;
    const len = 12 + Math.abs(noise(i, 4, 73)) * 20;
    ctx.moveTo(x, y);
    ctx.lineTo(x - len * 0.22, y + len);
  }
  ctx.stroke();
  ctx.restore();
}
