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
import { VEHICLES, axles, outline, type VehicleKind } from './vehicles';
import { at, inCorridor, offsetFrom, type Corridor, type Route, type RoutePoint } from './route';
import {
  LANE,
  WINDOW,
  carPlacement,
  furnitureAlong,
  signalPhase,
  type Traffic,
} from './street';
import {
  CLEARANCE,
  LEG_OFFSET,
  across,
  PANEL_H,
  panelCorners,
  panelPoint,
  signDots,
  type Sign,
} from './signs';
import {
  DISTRICT_BIAS,
  facadeFor,
  flat,
  hatch,
  paperTexture,
  shaded,
  sunlit,
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
  /** The road being driven, and how far along it the camera is. */
  route?: Route;
  distance?: number;
  /**
   * The ground the road occupies. Nothing is built on it.
   *
   * The generator only knows the 1811 grid; the drive uses roads older than it,
   * so without this the camera drives through the inside of buildings standing
   * in the middle of Wall Street.
   */
  corridor?: Corridor;
  /** Live traffic state, stepped by the caller. */
  traffic?: Traffic;
  /** The gantry signs, already placed in the world. */
  signs?: Sign[];
  /** Draw signals at the cross streets. */
  signals?: boolean;
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
  if (options.streets !== false) drawPavementPass(ctx, cam, options);

  /*
    ONE depth-sorted list, for everything that stands up off the ground.

    This was three passes — bridges, then buildings, then the street — and each
    pass painted entirely over the one before it. That is not the painter's
    algorithm, it is three painter's algorithms in a trench coat, and it means
    every car is drawn in front of every building whatever is actually between
    them. Cars showed through walls; a bridge tower stood in front of the tower
    it was behind.

    The fix is not to reorder the passes. There is no order that works, because
    the correct answer differs per object and per frame. It has to be one list,
    sorted once, by depth.
  */
  const scene: Item[] = [];
  collectMassing(scene, ctx, cam, options);
  collectBuildings(scene, ctx, cam, options);
  collectBridges(scene, ctx, cam, options);
  if (options.streets !== false) collectStreet(scene, ctx, cam, options);

  scene.sort((a, b) => b.depth - a.depth);
  for (const item of scene) item.draw();
  if (options.rain) drawRain(ctx, cam, options);
  drawPaper(ctx, cam);

  ctx.restore();
}

/**
 * The tooth of the paper, multiplied over the finished frame.
 *
 * Last, and over everything, because paper is under the pigment in reality but
 * multiplying is commutative and doing it once at the end costs one draw call
 * instead of one per fill.
 */
function drawPaper(ctx: CanvasRenderingContext2D, cam: Camera): void {
  const sheet = paperTexture(cam.width, cam.height);
  if (!sheet) return;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(sheet, 0, 0, cam.width, cam.height);
  ctx.restore();
}

/**
 * One thing to draw, and how far away it is.
 *
 * A closure rather than a tagged union: the sort only cares about `depth`, and
 * every producer already knows how to draw its own kind. A union would move
 * that knowledge into a switch far away from the geometry it belongs with.
 */
type Item = { depth: number; draw: () => void };

/* ------------------------------------------------------------------ *
 * Street level
 * ------------------------------------------------------------------ */

/**
 * The road under the camera: surface, markings, kerbs, lamps, signals, traffic,
 * and the gantry signs the story is told on.
 *
 * Everything here is placed by distance along the route, so it works the same
 * on an avenue, on a cross street, and on the deck of a bridge. Nothing needs
 * to know which of those it is on.
 */
/** The road surface, drawn with the ground rather than with the scene. */
function drawPavementPass(ctx: CanvasRenderingContext2D, cam: Camera, o: RenderOptions): void {
  const { route, distance } = o;
  if (!route || distance === undefined || route.points.length === 0) return;
  const here = at(route, distance);
  drawPavement(ctx, cam, o, route, distance - WINDOW.back, distance + WINDOW.front, here.oneWay);
}

/**
 * Everything standing on the road, contributed to the one sorted list.
 *
 * Contributed, not drawn: a lamp post can be in front of the car beside it and
 * behind the building behind it, and only one list sorted across all three can
 * express that.
 */
function collectStreet(
  scene: Item[],
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
): void {
  const { route, distance, traffic } = o;
  if (!route || distance === undefined || route.points.length === 0) return;

  const here = at(route, distance);
  const from = distance - WINDOW.back;
  const to = distance + WINDOW.front;

  const push = (x: number, z: number, y: number, draw: () => void) => {
    const c = toCamera(cam, { x, y, z });
    if (c.z <= cam.near || c.z > WINDOW.front + 160) return;
    scene.push({ depth: c.z, draw });
  };

  if (traffic) {
    for (const car of traffic.cars) {
      const place = carPlacement(route, car);
      push(place.x, place.z, 1, () => {
        drawVehicle(ctx, cam, place.x, place.z, place.y, place.heading, car.kind, car.seed, o);
      });
    }
  }

  for (const item of furnitureAlong(from, to, here.oneWay)) {
    const point = at(route, item.s);
    const spot = offsetFrom(point, item.lateral);
    if (item.kind === 'parked' && item.vehicle) {
      const heading = item.dir === 1 ? point.heading : point.heading + Math.PI;
      push(spot.x, spot.z, 1, () => {
        drawVehicle(ctx, cam, spot.x, spot.z, point.y, heading, item.vehicle!, item.seed, o);
      });
    } else if (item.kind === 'lamp') {
      push(spot.x, spot.z, 4, () => {
        drawLamp(ctx, cam, spot.x, spot.z, point.y, point.heading, item.lateral > 0 ? -1 : 1, o);
      });
    } else if (item.kind === 'tree') {
      push(spot.x, spot.z, 3, () => drawTree(ctx, cam, spot.x, spot.z, point.y + 0.15, item.seed, o));
    } else if (item.kind === 'hydrant') {
      push(spot.x, spot.z, 0.4, () => drawHydrant(ctx, cam, spot.x, spot.z, point.y + 0.15, o));
    }
  }

  if (o.signals !== false) {
    for (const signal of signalsAlong(route, from, to, o.time)) {
      push(signal.x, signal.z, 5, () => drawSignal(ctx, cam, signal, o));
    }
  }

  if (o.signs) {
    for (const sign of o.signs) {
      const c = toCamera(cam, { x: sign.x, y: CLEARANCE + PANEL_H / 2, z: sign.z });
      if (c.z <= cam.near || c.z > 900) continue;
      scene.push({ depth: c.z, draw: () => drawSign(ctx, cam, sign, c.z, o) });
    }
  }
}

/**
 * The roadway, its markings, its kerbs and its pavements.
 *
 * ==================================================================
 * THE DIMENSIONS ARE THE STANDARDS
 * ==================================================================
 *
 * Every width here is from the MUTCD or NYC DOT's street design geometry, and
 * that is not pedantry — it is the only way a road reads as a road. A lane line
 * drawn "a few pixels wide" is a different width at every distance; a 100 mm
 * line is 100 mm, and it thins with distance and vanishes when it should.
 *
 *   travel lane        3.35 m
 *   lane line          100 mm, 3 m of paint on a 9 m gap
 *   centre line        two 125 mm lines with 125 mm between them
 *   kerb reveal        150 mm
 *   pavement           4.2 m, in 5 ft flags — 1.524 m
 *   crosswalk bars     600 mm wide on 600 mm gaps, continental
 *   stop line          500 mm, set 1.2 m back from the crossing
 *
 * The 3-to-9 dash ratio matters more than it sounds. Drawn 50/50 a dashed line
 * reads as railway sleepers; it is the long gap that makes it read as a road at
 * speed.
 *
 * ==================================================================
 * THE ROAD IS CROWNED
 * ==================================================================
 *
 * Two per cent from the centreline down to each kerb, so water runs to the
 * gutter. Over a 13 m road that is 130 mm — invisible as a slope and quite
 * visible in its absence, because the markings and the wheels then sit on a
 * nominal flat plane while the kerbs are somewhere else.
 */
function drawPavement(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
  route: Route,
  from: number,
  to: number,
  oneWay: boolean,
): void {
  const { palette } = o;
  const lanes = oneWay ? 4 : 4;
  const halfRoad = (lanes * LANE) / 2;
  const walk = 4.2;
  const kerbUp = 0.15;
  const step = 10;

  const road = hazed(palette.asphalt, palette, 0.06);
  const flag = hazed(palette.ground, palette, 0.02);
  const white = palette.name === 'night' ? '#8e9099' : '#f6f3e8';
  const yellow = palette.name === 'night' ? '#8a7328' : '#e0ac26';

  /** Camber: the surface height at a lateral offset. */
  const crown = (lateral: number) => 0.02 * Math.max(0, halfRoad - Math.abs(lateral));

  const strip = (a: RoutePoint, b: RoutePoint, l0: number, l1: number, lift: number) => {
    const a0 = offsetFrom(a, l0);
    const a1 = offsetFrom(a, l1);
    const b0 = offsetFrom(b, l0);
    const b1 = offsetFrom(b, l1);
    return projectPolygon(cam, [
      { x: a0.x, y: a.y + crown(l0) + lift, z: a0.z },
      { x: b0.x, y: b.y + crown(l0) + lift, z: b0.z },
      { x: b1.x, y: b.y + crown(l1) + lift, z: b1.z },
      { x: a1.x, y: a.y + crown(l1) + lift, z: a1.z },
    ]);
  };

  const start = Math.max(0, from);
  const finish = Math.min(route.length, to);

  for (let s = start; s < finish; s += step) {
    const a = at(route, s);
    const b = at(route, Math.min(finish, s + step));
    const depth = toCamera(cam, { x: a.x, y: a.y, z: a.z }).z;
    if (depth <= cam.near || depth > WINDOW.front + 80) continue;
    const fade = hazeAt(depth) * 0.35;

    const surface = strip(a, b, -halfRoad, halfRoad, 0);
    if (surface) flat(ctx, surface, hazed(road, palette, fade));

    for (const side of [-1, 1] as const) {
      // The kerb: 150 mm of stone standing above the gutter, with its face
      // visible. A pavement drawn flush with the road is the thing that makes a
      // street look like a car park.
      const face = strip(a, b, side * halfRoad, side * halfRoad, kerbUp / 2);
      if (face) flat(ctx, face, hazed(shaded(flag, 0.8), palette, fade));

      const top = strip(a, b, side * halfRoad, side * (halfRoad + walk), kerbUp);
      if (top) flat(ctx, top, hazed(flag, palette, fade));
    }

    /* ---- markings ---- */
    // Only near enough to resolve: past a couple of hundred metres a 100 mm
    // line is thinner than the ink and turns the road grey.
    if (depth > 240) continue;

    const dash = s - Math.floor(s / 12) * 12 < 3;
    const line = (lateral: number, width: number, colour: string) => {
      const q = strip(a, b, lateral - width / 2, lateral + width / 2, 0.012);
      if (q) flat(ctx, q, hazed(colour, palette, fade));
    };

    if (oneWay) {
      // All one way: dashed white between every lane, and nothing in the middle.
      if (dash) for (let i = 1; i < lanes; i += 1) line(-halfRoad + i * LANE, 0.1, white);
    } else {
      // Two-way: a double yellow on the crown, dashed white within each side.
      line(-0.125, 0.125, yellow);
      line(0.125, 0.125, yellow);
      if (dash) for (const l of [-LANE, LANE]) line(l, 0.1, white);
    }
    // The edge line, at the gutter.
    for (const side of [-1, 1] as const) line(side * (halfRoad - 0.25), 0.1, white);
  }

  /* ---- crossings ---- */
  drawCrossings(ctx, cam, o, route, start, finish, halfRoad, crown, white);
}

/**
 * Crosswalks and stop lines, at the cross streets.
 *
 * Continental bars — 600 mm of paint on 600 mm gaps, running parallel to the
 * direction of traffic and spanning kerb to kerb. The stop line sits 1.2 m back
 * from the crossing, and only across the approaching side: one spanning both
 * directions is a common and very visible mistake.
 */
function drawCrossings(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
  route: Route,
  from: number,
  to: number,
  halfRoad: number,
  crown: (lateral: number) => number,
  white: string,
): void {
  const { palette } = o;
  let last = Number.NaN;

  for (let s = from; s < to; s += 8) {
    const point = at(route, s);
    // Crossings live on the numbered grid, and on the level.
    if (point.z < blockZ(0) || point.y > 1.5) continue;
    const street = Math.round(point.z / BLOCK + 42);
    if (street === last) continue;
    if (Math.abs(point.z - blockZ(street)) > 8) continue;
    last = street;

    const depth = toCamera(cam, { x: point.x, y: 0, z: point.z }).z;
    if (depth <= cam.near || depth > 200) continue;
    const fade = hazeAt(depth) * 0.35;

    for (const sense of [-1, 1] as const) {
      const near = s + sense * (BLOCK * 0.11);
      const far = near + sense * 3;
      const a = at(route, Math.max(0, Math.min(route.length, Math.min(near, far))));
      const b = at(route, Math.max(0, Math.min(route.length, Math.max(near, far))));

      for (let l = -halfRoad + 0.3; l + 0.6 < halfRoad; l += 1.2) {
        const a0 = offsetFrom(a, l);
        const a1 = offsetFrom(a, l + 0.6);
        const b0 = offsetFrom(b, l);
        const b1 = offsetFrom(b, l + 0.6);
        const bar = projectPolygon(cam, [
          { x: a0.x, y: a.y + crown(l) + 0.014, z: a0.z },
          { x: b0.x, y: b.y + crown(l) + 0.014, z: b0.z },
          { x: b1.x, y: b.y + crown(l + 0.6) + 0.014, z: b1.z },
          { x: a1.x, y: a.y + crown(l + 0.6) + 0.014, z: a1.z },
        ]);
        if (bar) flat(ctx, bar, hazed(white, palette, fade));
      }

      // The stop line, 1.2 m back, across the approaching half only.
      const stopAt = near - sense * 1.2;
      const sa = at(route, Math.max(0, Math.min(route.length, stopAt)));
      const sb = at(route, Math.max(0, Math.min(route.length, stopAt - sense * 0.5)));
      const inner = sense > 0 ? 0.2 : -halfRoad;
      const outer = sense > 0 ? halfRoad : -0.2;
      const p0 = offsetFrom(sa, inner);
      const p1 = offsetFrom(sa, outer);
      const q0 = offsetFrom(sb, inner);
      const q1 = offsetFrom(sb, outer);
      const stop = projectPolygon(cam, [
        { x: p0.x, y: sa.y + crown(inner) + 0.014, z: p0.z },
        { x: q0.x, y: sb.y + crown(inner) + 0.014, z: q0.z },
        { x: q1.x, y: sb.y + crown(outer) + 0.014, z: q1.z },
        { x: p1.x, y: sa.y + crown(outer) + 0.014, z: p1.z },
      ]);
      if (stop) flat(ctx, stop, hazed(white, palette, fade));
    }
  }
}

/* ---- vehicles ---- */

/**
 * A vehicle: its side profile, swept across its width.
 *
 * Two stacked boxes give a doorstop — no bonnet, no raked windscreen, and the
 * wheels bolted to the outside because there is nowhere for them to go. A swept
 * profile gives every one of those surfaces at once, correct from any angle,
 * with the wheels sitting in arches cut into the body.
 *
 * Faces are culled by their own outward normal, constructed rather than
 * inferred from winding. Winding depends on every face being listed in a
 * consistent rotational order and has no answer for a face seen edge-on; one
 * face listed wrong and the camera is inside the car.
 */
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  z: number,
  ground: number,
  heading: number,
  kind: VehicleKind,
  seed: number,
  o: RenderOptions,
): void {
  const spec = VEHICLES[kind];
  const c = toCamera(cam, { x, y: ground + spec.height / 2, z });
  if (c.z <= cam.near) return;
  const s = scaleAt(cam, c.z);
  // Below a couple of pixels a car is a smudge, and drawing it makes the road
  // grainy rather than busy.
  if (spec.length * s < 2.2) return;

  const { palette } = o;
  const fade = hazeAt(c.z);
  const ink = hazed(palette.ink, palette, fade * 0.75);
  const paint =
    kind === 'cab'
      ? palette.cab
      : kind === 'bus'
        ? (palette.name === 'night' ? '#3f4a5c' : '#cdd4da')
        : ['#c9633f', '#8fb0c4', '#3c414a', '#e8e6df', '#7fa9a2', '#e8c46a', '#b9556a', '#5f7f9a'][
            Math.abs(seed) % 8
          ];

  // The car's own axes: along the road, and across it.
  const ux = Math.sin(heading);
  const uz = Math.cos(heading);
  const px = Math.cos(heading);
  const pz = -Math.sin(heading);
  const half = spec.width / 2;

  /** A point in the car's frame: along from the rear bumper, across, up. */
  const at3 = (along: number, across: number, up: number): Vec3 => {
    const a = along - spec.length / 2;
    return {
      x: x + ux * a + px * across,
      y: ground + up,
      z: z + uz * a + pz * across,
    };
  };

  const shell = outline(spec);
  const detail = spec.length * s > 26;

  /*
    Wheels.

    Drawn BEFORE the body, so what shows is the tyre through the arch cut into
    the flank rather than a black disc sitting on top of it. Painted after, a
    wheel covers the arch that is supposed to contain it and the car ends up on
    tractor tyres.

    Only the near pair: the far ones are behind the car.
  */
  if (spec.length * s > 11) {
    const tyre = hazed(palette.name === 'night' ? '#0a0c12' : '#232630', palette, fade);
    for (const along of axles(spec)) {
      for (const side of [-1, 1] as const) {
        const hub = at3(along, side * half * 0.94, spec.wheelR);
        const toEye = { x: cam.x - hub.x, y: 0, z: cam.z - hub.z };
        if (px * side * toEye.x + pz * side * toEye.z <= 0) continue;
        const p = project(cam, hub);
        if (!p) continue;
        ctx.fillStyle = tyre;
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, Math.max(0.6, spec.wheelR * s * 0.9), Math.max(0.6, spec.wheelR * s), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  /*
    The flanks.

    Their normals are the sweep direction, so which one you can see is a single
    dot product and never a question of how the polygon happened to be listed.
  */
  for (const side of [-1, 1] as const) {
    const centre = at3(spec.length / 2, side * half, spec.height / 2);
    const toEye = { x: cam.x - centre.x, y: cam.y - centre.y, z: cam.z - centre.z };
    if (px * side * toEye.x + pz * side * toEye.z <= 0) continue;

    const face = projectPolygon(cam, shell.map(([a, h]) => at3(a, side * half, h)));
    if (!face) continue;
    flat(ctx, face, hazed(shaded(paint, 0.5), palette, fade));
    if (spec.length * s > 9) {
      stroke(ctx, face, { seed, colour: ink, width: 1.4, wobble: 0.8, close: true });
    }

    // Glass, on the flank you can see.
    if (detail) {
      for (const pane of spec.glass) {
        const glass = projectPolygon(cam, pane.map(([a, h]) => at3(a, side * half * 1.001, h)));
        if (glass) flat(ctx, glass, hazed(palette.name === 'night' ? '#16233c' : '#43536e', palette, fade));
      }
    }
  }

  /*
    The shell: one quad per profile edge, swept across.

    The outward normal of an edge running (da, dh) in the along-height plane is
    (-dh, da), because the profile is listed anticlockwise around the solid. In
    the world that is the heading direction scaled by -dh, plus straight up
    scaled by da — no cross products, and no way to get the sign wrong.
  */
  for (let i = 0; i < shell.length; i += 1) {
    const [a0, h0] = shell[i];
    const [a1, h1] = shell[(i + 1) % shell.length];
    const da = a1 - a0;
    const dh = h1 - h0;
    const len = Math.hypot(da, dh);
    if (len < 1e-6) continue;

    const nAlong = -dh / len;
    const nUp = da / len;
    const mid = at3((a0 + a1) / 2, 0, (h0 + h1) / 2);
    const toEye = { x: cam.x - mid.x, y: cam.y - mid.y, z: cam.z - mid.z };
    if ((ux * nAlong) * toEye.x + nUp * toEye.y + (uz * nAlong) * toEye.z <= 0) continue;

    const quad = projectPolygon(cam, [
      at3(a0, -half, h0),
      at3(a1, -half, h1),
      at3(a1, half, h1),
      at3(a0, half, h0),
    ]);
    if (!quad) continue;
    // A surface facing up catches the sun; one facing along the road does not.
    const tone = nUp > 0.4 ? sunlit(paint, 0.8) : nUp < -0.4 ? shaded(paint, 1.1) : paint;
    flat(ctx, quad, hazed(tone, palette, fade));
    if (spec.length * s > 16) {
      stroke(ctx, quad, { seed: seed + i, colour: ink, width: 1.1, wobble: 0.6, close: true });
    }
  }

  /*
    Lamps.

    A headlight is 200 mm across and, in daylight, OFF — a dark glass lens, not
    a white disc. Drawing them lit round the clock turned a row of parked cars
    into a row of headlamps; at midday nothing on the street is emitting
    anything.
  */
  if (detail) {
    const dark = palette.name === 'night' || palette.name === 'dusk';
    for (const [along, on, off] of [
      [0.04, '#ff5b3f', '#5f2620'],
      [spec.length - 0.04, '#fff3cf', '#3a3f47'],
    ] as const) {
      for (const side of [-1, 1] as const) {
        const lens = at3(along as number, side * half * 0.66, spec.sill + 0.34);
        const p = project(cam, lens);
        if (!p) continue;
        const r = Math.max(0.7, Math.min(0.2 * s, spec.width * 0.13 * s));
        ctx.fillStyle = hazed(dark ? (on as string) : (off as string), palette, fade);
        ctx.beginPath();
        ctx.ellipse(p.x, p.y, r, r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // A cab is a cab because of the roof light and the checker band.
    if (kind === 'cab') {
      const box = projectPolygon(cam, [
        at3(2.1, -half * 0.3, spec.height),
        at3(2.9, -half * 0.3, spec.height),
        at3(2.9, half * 0.3, spec.height),
        at3(2.1, half * 0.3, spec.height),
      ]);
      if (box) flat(ctx, box, hazed('#2b2e36', palette, fade));
    }
  }
}

/* ---- lamps, signals and street furniture ---- */

/**
 * NYC DOT's standard cobra head: 9.1 m to the lamp, on a 2.4 m mast arm that
 * reaches out over the roadway.
 *
 * The arm has to reach over the ROAD, which means it has to know which side the
 * pole stands on. An arm pointing at the buildings behind it is the sort of
 * thing that looks wrong immediately and is hard to name.
 *
 * The shaft tapers and the arm curves — a real one is a single bent tube, not a
 * post with a bracket, and the curve is most of its silhouette.
 */
function drawLamp(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  z: number,
  ground: number,
  heading: number,
  inward: 1 | -1,
  o: RenderOptions,
): void {
  const { palette } = o;
  const c = toCamera(cam, { x, y: ground + 5, z });
  if (c.z <= cam.near || c.z > 300) return;
  const s = scaleAt(cam, c.z);
  if (s * 9 < 5) return;

  const fade = hazeAt(c.z);
  const ink = hazed(palette.ink, palette, fade * 0.7);
  const px = Math.cos(heading) * inward;
  const pz = -Math.sin(heading) * inward;

  const H = 9.1;
  const REACH = 2.4;

  // Shaft, then the arm sweeping out. Sampled so the bend is a curve rather
  // than a corner.
  const run: Point2[] = [];
  const base = project(cam, { x, y: ground, z });
  if (base) run.push(base);
  for (let i = 0; i <= 8; i += 1) {
    const t = i / 8;
    // A quarter-ellipse from the top of the shaft out to the head: rises the
    // last 900 mm while reaching the full 2.4 m.
    const up = H - 0.9 + 0.9 * Math.sin((t * Math.PI) / 2);
    const out = REACH * (1 - Math.cos((t * Math.PI) / 2));
    const p = project(cam, { x: x + px * out, y: ground + up, z: z + pz * out });
    if (p) run.push(p);
  }
  if (run.length < 2) return;

  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, 0.24 * s);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  for (const piece of clipPolyline(cam, run)) {
    ctx.moveTo(piece[0].x, piece[0].y);
    for (let i = 1; i < piece.length; i += 1) ctx.lineTo(piece[i].x, piece[i].y);
  }
  ctx.stroke();

  // The head: a flattened wedge, wider at the back than the front, which is
  // what a cobra head is and why it is called that.
  const hx = x + px * REACH;
  const hz = z + pz * REACH;
  const nx = Math.sin(heading);
  const nz = Math.cos(heading);
  const head = projectPolygon(cam, [
    { x: hx - nx * 0.34 - px * 0.5, y: ground + H, z: hz - nz * 0.34 - pz * 0.5 },
    { x: hx + nx * 0.34 - px * 0.5, y: ground + H, z: hz + nz * 0.34 - pz * 0.5 },
    { x: hx + nx * 0.26 + px * 0.34, y: ground + H - 0.22, z: hz + nz * 0.26 + pz * 0.34 },
    { x: hx - nx * 0.26 + px * 0.34, y: ground + H - 0.22, z: hz - nz * 0.26 + pz * 0.34 },
  ]);
  if (head) {
    flat(ctx, head, hazed(palette.name === 'night' ? '#1a1d27' : '#3a3e48', palette, fade));
  }

  // The lamp, and after dark the pool it throws on the road.
  const lit = palette.name === 'night' || palette.name === 'dusk';
  if (lit) {
    const lamp = project(cam, { x: hx, y: ground + H - 0.24, z: hz });
    if (lamp) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffe6a8';
      ctx.beginPath();
      ctx.ellipse(lamp.x, lamp.y, Math.max(1, 0.5 * s), Math.max(0.6, 0.22 * s), 0, 0, Math.PI * 2);
      ctx.fill();
      // The pool is on the ground, so it is drawn on the ground — an ellipse in
      // world space, projected, not a circle stuck on the screen.
      const pool = projectPolygon(
        cam,
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2;
          return {
            x: hx + Math.cos(a) * 5.2 + px * 1.5,
            y: ground + 0.02,
            z: hz + Math.sin(a) * 5.2 + pz * 1.5,
          };
        }),
      );
      if (pool) {
        ctx.globalAlpha = 0.14;
        flat(ctx, pool, '#ffd98a');
      }
      ctx.restore();
    }
  }
}

type SignalPlace = { x: number; z: number; y: number; heading: number; state: 'green' | 'amber' | 'red' };

/** Signals at the cross streets the route passes, on the numbered grid. */
function signalsAlong(route: Route, from: number, to: number, time: number): SignalPlace[] {
  const out: SignalPlace[] = [];
  const step = 20;
  let lastStreet = Number.NaN;

  for (let s = Math.max(0, from); s < to; s += step) {
    const point = at(route, s);
    if (point.z < blockZ(0) || Math.abs(point.y) > 1.5) continue;
    const street = Math.round(point.z / BLOCK + 42);
    if (street === lastStreet) continue;
    if (Math.abs(point.z - blockZ(street)) > step) continue;
    lastStreet = street;
    const spot = offsetFrom(point, LANE * 2.5);
    out.push({
      x: spot.x,
      z: spot.z,
      y: point.y,
      heading: point.heading,
      state: signalPhase(point.z, time),
    });
  }
  return out;
}

/**
 * A mast-arm signal: three 300 mm lenses in a housing, hung 5.2 m over the
 * roadway.
 *
 * MUTCD's minimum clearance over a road is 4.6 m; 5.2 is what gets built, and
 * the lenses are 300 mm because that is the standard — a 200 mm lens is a
 * pedestrian signal and looks wrong over traffic.
 */
function drawSignal(ctx: CanvasRenderingContext2D, cam: Camera, place: SignalPlace, o: RenderOptions): void {
  const { palette } = o;
  const c = toCamera(cam, { x: place.x, y: place.y + 5, z: place.z });
  if (c.z <= cam.near || c.z > 300) return;
  const s = scaleAt(cam, c.z);
  if (s * 6 < 4) return;

  const fade = hazeAt(c.z);
  const ink = hazed(palette.ink, palette, fade * 0.7);
  const px = -Math.cos(place.heading);
  const pz = Math.sin(place.heading);
  const nx = Math.sin(place.heading);
  const nz = Math.cos(place.heading);

  const base = project(cam, { x: place.x, y: place.y, z: place.z });
  const top = project(cam, { x: place.x, y: place.y + 6.5, z: place.z });
  const arm = project(cam, { x: place.x + px * 5.4, y: place.y + 6.5, z: place.z + pz * 5.4 });
  if (!base || !top || !arm) return;

  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1, 0.26 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(base.x, base.y);
  ctx.lineTo(top.x, top.y);
  ctx.lineTo(arm.x, arm.y);
  ctx.stroke();

  // The housing, hanging under the arm and facing the traffic.
  const hx = place.x + px * 4.6;
  const hz = place.z + pz * 4.6;
  const housing = projectPolygon(cam, [
    { x: hx - nx * 0.23, y: place.y + 5.2, z: hz - nz * 0.23 },
    { x: hx + nx * 0.23, y: place.y + 5.2, z: hz + nz * 0.23 },
    { x: hx + nx * 0.23, y: place.y + 6.42, z: hz + nz * 0.23 },
    { x: hx - nx * 0.23, y: place.y + 6.42, z: hz - nz * 0.23 },
  ]);
  if (housing) {
    flat(ctx, housing, palette.name === 'night' ? '#101219' : '#252932');
    stroke(ctx, housing, { seed: 5511, colour: ink, width: 1.1, wobble: 0.5, close: true });
  }

  const lit = { red: 0, amber: 1, green: 2 }[place.state];
  const colours = ['#ef4a33', '#f5ad2c', '#3fc46e'];
  for (let i = 0; i < 3; i += 1) {
    const p = project(cam, { x: hx, y: place.y + 6.12 - i * 0.37, z: hz });
    if (!p) continue;
    const r = Math.max(0.8, 0.15 * s);
    const on = lit === i;
    ctx.fillStyle = on ? colours[i] : 'rgba(24,26,34,0.9)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
    if (on) {
      ctx.save();
      ctx.globalAlpha = 0.22;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 2.6, r * 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/**
 * A street tree in its pit.
 *
 * Planted at 7.6 m centres, which is what the city plants them at, with 2.6 m
 * of clear trunk so you can walk under one. The canopy is two overlapping
 * blobs rather than one, because a single ellipse reads as a lollipop.
 */
function drawTree(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  z: number,
  ground: number,
  seed: number,
  o: RenderOptions,
): void {
  const { palette } = o;
  const h = 6.5 + (Math.abs(seed % 100) / 100) * 2.6;
  const c = toCamera(cam, { x, y: ground + h * 0.6, z });
  if (c.z <= cam.near || c.z > 260) return;
  const s = scaleAt(cam, c.z);
  if (h * s < 8) return;

  const fade = hazeAt(c.z);
  const ink = hazed(palette.ink, palette, fade * 0.8);

  const pit = projectPolygon(cam, [
    { x: x - 0.7, y: ground + 0.02, z: z - 0.7 },
    { x: x + 0.7, y: ground + 0.02, z: z - 0.7 },
    { x: x + 0.7, y: ground + 0.02, z: z + 0.7 },
    { x: x - 0.7, y: ground + 0.02, z: z + 0.7 },
  ]);
  if (pit) flat(ctx, pit, hazed('#4a3a2c', palette, fade));

  const foot = project(cam, { x, y: ground, z });
  const fork = project(cam, { x, y: ground + 2.6, z });
  if (foot && fork) {
    ctx.strokeStyle = hazed('#6b543f', palette, fade);
    ctx.lineWidth = Math.max(1, 0.24 * s);
    ctx.beginPath();
    ctx.moveTo(foot.x, foot.y);
    ctx.lineTo(fork.x, fork.y);
    ctx.stroke();
  }

  for (const [dx, dy, r] of [
    [0, h * 0.72, h * 0.34],
    [-0.9, h * 0.6, h * 0.26],
    [1.0, h * 0.63, h * 0.24],
  ] as const) {
    const p = project(cam, { x: x + dx, y: ground + dy, z });
    if (!p) continue;
    ctx.fillStyle = hazed(dx === 0 ? palette.green : palette.greenDeep, palette, fade);
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, r * s, r * s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 750 mm of cast iron. There are over one hundred thousand of them. */
function drawHydrant(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  x: number,
  z: number,
  ground: number,
  o: RenderOptions,
): void {
  const { palette } = o;
  const c = toCamera(cam, { x, y: ground + 0.4, z });
  if (c.z <= cam.near || c.z > 120) return;
  const s = scaleAt(cam, c.z);
  if (s * 0.75 < 4) return;
  const fade = hazeAt(c.z);

  const body = projectPolygon(cam, [
    { x: x - 0.16, y: ground, z },
    { x: x + 0.16, y: ground, z },
    { x: x + 0.16, y: ground + 0.58, z },
    { x: x + 0.1, y: ground + 0.7, z },
    { x: x - 0.1, y: ground + 0.7, z },
    { x: x - 0.16, y: ground + 0.58, z },
  ]);
  if (body) {
    flat(ctx, body, hazed('#d8452f', palette, fade));
    stroke(ctx, body, { seed: 9001, colour: hazed(palette.ink, palette, fade), width: 1, wobble: 0.5, close: true });
  }
}

/* ---- the gantry signs ---- */

/**
 * A variable-message sign on a full-span gantry.
 *
 * Every lit dot is its own quad on the panel's plane, so the text converges
 * with the board as you approach and pass under it. Drawing the panel flat and
 * stamping text on it is cheaper and falls apart the moment you are not
 * square-on, which on a road you are driving down is almost always.
 */
function drawSign(
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  sign: Sign,
  depth: number,
  o: RenderOptions,
): void {
  const { palette } = o;
  const s = scaleAt(cam, depth);
  const fade = hazeAt(depth);
  const ink = hazed(palette.ink, palette, fade * 0.6);

  // The gantry: two legs and a truss over the road.
  const legTop = CLEARANCE + PANEL_H + 0.9;
  ctx.strokeStyle = ink;
  ctx.lineWidth = Math.max(1.2, 0.32 * s);
  const n = across(sign);
  const leg = sign.halfWidth + LEG_OFFSET;
  ctx.beginPath();
  for (const side of [-1, 1] as const) {
    const fx = sign.x + n.x * side * leg;
    const fz = sign.z + n.z * side * leg;
    const foot = project(cam, { x: fx, y: 0, z: fz });
    const shoulder = project(cam, { x: fx, y: legTop, z: fz });
    if (foot && shoulder) {
      ctx.moveTo(foot.x, foot.y);
      ctx.lineTo(shoulder.x, shoulder.y);
    }
  }
  const left = project(cam, { x: sign.x - n.x * leg, y: legTop, z: sign.z - n.z * leg });
  const right = project(cam, { x: sign.x + n.x * leg, y: legTop, z: sign.z + n.z * leg });
  if (left && right) {
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
  }
  ctx.stroke();

  // The board.
  const face = projectPolygon(cam, panelCorners(sign));
  if (!face) return;
  flat(ctx, face, palette.name === 'night' ? '#0a0c14' : '#16181f');
  stroke(ctx, face, { seed: sign.id.length * 71, colour: ink, width: 1.6, wobble: 0.7, close: true });

  // Below about this, the dots merge into a smear and the board reads better
  // dark and empty — which is also what a sign looks like from too far away.
  if (sign.halfWidth * 2 * s < 90) return;

  const amber = '#ffb427';
  ctx.fillStyle = amber;
  ctx.beginPath();
  for (const dot of signDots(sign)) {
    const a = panelPoint(sign, dot.u, dot.v);
    const b = panelPoint(sign, dot.u + dot.w, dot.v + dot.h);
    const pa = project(cam, a);
    const pb = project(cam, b);
    if (!pa || !pb) continue;
    const w = pb.x - pa.x;
    const h = pb.y - pa.y;
    if (Math.abs(w) < 0.35 || Math.abs(h) < 0.35) continue;
    ctx.rect(pa.x, pa.y, w, h);
  }
  ctx.fill();

  // The bloom a real LED board has against a dark face.
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.fillStyle = amber;
  ctx.fill();
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
function collectBridges(
  scene: Item[],
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
): void {
  const { palette } = o;

  for (const b of BRIDGES) {
    const [x0, z0] = b.from;
    const [x1, z1] = b.to;
    const total = Math.hypot(x1 - x0, z1 - z0);
    const mid = { x: (x0 + x1) / 2, y: b.deck, z: (z0 + z1) / 2 };
    const c = toCamera(cam, mid);
    if (c.z > 24000) continue;

    const ux = (x1 - x0) / total;
    const uz = (z1 - z0) / total;
    const half = b.width / 2;
    const sag = b.span * 0.1;
    const towerT = [0.5 - b.span / total / 2, 0.5 + b.span / total / 2];
    const gothic = b.name.startsWith('Brooklyn');

    /** Deck height at a fraction along, rising toward mid-span. */
    const deckAt = (t: number) => b.deck + Math.sin(t * Math.PI) * b.deck * 0.22;
    const point = (t: number, side: number, y: number): Vec3 => ({
      x: x0 + (x1 - x0) * t - uz * half * side,
      y,
      z: z0 + (z1 - z0) * t + ux * half * side,
    });

    /*
      The deck, in segments.

      Segments rather than one long ribbon, and it matters twice: a single
      polygon spanning a kilometre sorts as ONE object, so it is either wholly
      in front of a tower or wholly behind it — and no bridge looks like that.
      Segmenting also lets each piece take its own haze.

      Skipped where the drive is on this bridge. The route lays its own roadway,
      and drawing both put a second deck a metre above the first, which is the
      extra road that appeared to hang over the bridge.
    */
    if (!b.carriesRoute) {
      const N = 20;
      for (let i = 0; i < N; i += 1) {
        const t0 = i / N;
        const t1 = (i + 1) / N;
        const cd = toCamera(cam, point((t0 + t1) / 2, 0, deckAt(t0)));
        if (cd.z <= cam.near) continue;
        const quad = projectPolygon(cam, [
          point(t0, -1, deckAt(t0)),
          point(t1, -1, deckAt(t1)),
          point(t1, 1, deckAt(t1)),
          point(t0, 1, deckAt(t0)),
        ]);
        if (!quad) continue;
        const tone = hazed(palette.asphalt, palette, hazeAt(cd.z));
        scene.push({ depth: cd.z, draw: () => flat(ctx, quad, tone) });
      }
    }

    if (b.kind !== 'suspension') continue;

    /*
      The main cables.

      A cable carrying only itself is a catenary. One carrying a uniform load
      along the HORIZONTAL — which is exactly what a suspended deck is — is a
      parabola. So this is parabolic, and that is the correct curve rather than
      an approximation of the "correct" catenary.
    */
    const cableY = (t: number) => {
      if (t < towerT[0]) return b.deck + (b.tower - b.deck) * (t / towerT[0]);
      if (t > towerT[1]) return b.deck + (b.tower - b.deck) * ((1 - t) / (1 - towerT[1]));
      const u = (t - towerT[0]) / (towerT[1] - towerT[0]);
      // 4u(1-u): zero at both towers, one in the middle.
      return b.tower - sag * 4 * u * (1 - u);
    };

    for (const side of [-1, 1] as const) {
      const cd = toCamera(cam, point(0.5, side, b.tower));
      if (cd.z <= cam.near) continue;
      const run: Point2[] = [];
      for (let i = 0; i <= 40; i += 1) {
        const p = project(cam, point(i / 40, side, cableY(i / 40)));
        if (p) run.push(p);
      }
      const width = Math.max(0.9, 2.6 * scaleAt(cam, cd.z));
      const ink = hazed(palette.ink, palette, hazeAt(cd.z));
      scene.push({
        depth: cd.z - 1,
        draw: () => {
          for (const piece of clipPolyline(cam, run)) {
            stroke(ctx, piece, { seed: 611 + side, colour: ink, width, wobble: 0.5 });
          }
        },
      });
    }

    /*
      Suspenders, and the stays.

      The Brooklyn Bridge is the one everybody can draw from memory, and this
      web is why: Roebling hung vertical suspenders from the main cable AND ran
      diagonal stays radiating down from each tower, so the two cross in a
      lattice. No other bridge has it. Draw the verticals alone and you have
      drawn a generic suspension bridge that happens to have the right span.
    */
    const cd = toCamera(cam, mid);
    if (cd.z > cam.near && cd.z < 3200) {
      const ink = hazed(palette.ink, palette, hazeAt(cd.z) * 0.9);
      const hair = Math.max(0.5, 0.9 * scaleAt(cam, cd.z));
      scene.push({
        depth: cd.z + 2,
        draw: () => {
          ctx.strokeStyle = ink;
          ctx.lineWidth = hair;
          ctx.globalAlpha = 0.72;
          ctx.beginPath();
          for (const side of [-1, 1] as const) {
            for (let i = 1; i < 34; i += 1) {
              const t = towerT[0] + ((towerT[1] - towerT[0]) * i) / 34;
              const top = project(cam, point(t, side, cableY(t)));
              const foot = project(cam, point(t, side, deckAt(t)));
              if (top && foot) {
                ctx.moveTo(top.x, top.y);
                ctx.lineTo(foot.x, foot.y);
              }
            }
            if (!gothic) continue;
            for (const anchor of towerT) {
              const apex = project(cam, point(anchor, side, b.tower - 7));
              if (!apex) continue;
              for (let i = 1; i <= 9; i += 1) {
                const reach = (i / 9) * (towerT[1] - towerT[0]) * 0.46;
                for (const sense of [-1, 1] as const) {
                  const t = anchor + sense * reach;
                  if (t < 0.03 || t > 0.97) continue;
                  const foot = project(cam, point(t, side, deckAt(t)));
                  if (!foot) continue;
                  ctx.moveTo(apex.x, apex.y);
                  ctx.lineTo(foot.x, foot.y);
                }
              }
            }
          }
          ctx.stroke();
          ctx.globalAlpha = 1;
        },
      });
    }

    /*
      The towers.

      Masonry with two pointed openings on the Brooklyn Bridge, which is why it
      reads as a cathedral someone hung a road from — and why it looks nothing
      like the steel lattice of the Manhattan Bridge two hundred metres away.
    */
    for (const t of towerT) {
      const base = point(t, 0, 0);
      const ct = toCamera(cam, { ...base, y: b.tower / 2 });
      if (ct.z <= cam.near || ct.z > 8000) continue;
      const fade = hazeAt(ct.z);
      const stone = hazed(gothic ? '#c0aa93' : '#98a1ac', palette, fade);
      const ink = hazed(palette.ink, palette, fade * 0.9);
      const thick = gothic ? 10 : 5;
      const wide = half + (gothic ? 5 : 2);

      const face = projectPolygon(cam, [
        { x: base.x - uz * wide - ux * thick, y: 0, z: base.z + ux * wide - uz * thick },
        { x: base.x + uz * wide - ux * thick, y: 0, z: base.z - ux * wide - uz * thick },
        { x: base.x + uz * wide - ux * thick, y: b.tower, z: base.z - ux * wide - uz * thick },
        { x: base.x - uz * wide - ux * thick, y: b.tower, z: base.z + ux * wide - uz * thick },
      ]);
      if (!face) continue;

      const openings: (Point2[] | null)[] = gothic
        ? [-1, 1].map((sense) => {
            const cx = base.x + uz * wide * 0.44 * sense - ux * thick;
            const cz = base.z - ux * wide * 0.44 * sense - uz * thick;
            const w = wide * 0.24;
            return projectPolygon(cam, [
              { x: cx - uz * w, y: b.deck + 2, z: cz + ux * w },
              { x: cx + uz * w, y: b.deck + 2, z: cz - ux * w },
              { x: cx + uz * w, y: b.deck + 22, z: cz - ux * w },
              // The point of the arch, which is the whole character of it.
              { x: cx, y: b.deck + 30, z: cz },
              { x: cx - uz * w, y: b.deck + 22, z: cz + ux * w },
            ]);
          })
        : [];

      scene.push({
        depth: ct.z,
        draw: () => {
          flat(ctx, face, stone);
          stroke(ctx, face, { seed: 4400 + Math.round(t * 100), colour: ink, width: 1.7, wobble: 1.2, close: true });
          for (const gap of openings) {
            if (!gap) continue;
            flat(ctx, gap, hazed(shaded(stone, 1.5), palette, fade));
            stroke(ctx, gap, { seed: 4500, colour: ink, width: 1.1, wobble: 0.7, close: true });
          }
        },
      });
    }
  }
}

/* ------------------------------------------------------------------ *
 * Buildings
 * ------------------------------------------------------------------ */

function collectBuildings(
  scene: Item[],
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
): void {
  const radius = o.radius ?? 1500;
  const found: { depth: number; building: Building | null; landmark: Landmark | null }[] = [];

  for (const { bx, bz, distance } of blocksNear(cam.x, cam.z, radius)) {
    const list = blockAt(bx, bz);
    const budget = budgetFor(distance);
    for (let i = 0; i < Math.min(list.length, budget); i += 1) {
      const b = list[i];
      if (o.corridor && inCorridor(o.corridor, b.x, b.z)) continue;
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
      found.push({ depth: c.z, building: b, landmark: null });
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
    found.push({ depth: c.z, building: null, landmark: L });
  }

  /*
    A hard ceiling on how much of the city one frame may contain.

    Sorted NEAREST first to choose what survives — the things worth keeping are
    the close ones. The order they are drawn in is the opposite, and that is the
    outer sort's job, not this one's. Taking the first N of a far-to-near list
    would keep the horizon and throw away the street you are standing on.
  */
  found.sort((a, b) => a.depth - b.depth);
  if (found.length > ITEM_BUDGET) found.length = ITEM_BUDGET;

  for (const item of found) {
    if (item.landmark) {
      const L = item.landmark;
      scene.push({ depth: item.depth, draw: () => drawLandmark(ctx, cam, L, item.depth, o) });
    } else if (item.building) {
      const b = item.building;
      scene.push({ depth: item.depth, draw: () => drawBuilding(ctx, cam, b, item.depth, o) });
    }
  }
}

/**
 * The city past the detail radius: silhouettes, no windows, no ink up close.
 *
 * Sorted far to near among themselves, which matters where a tower stands proud
 * of the mass around it.
 */
function collectMassing(
  scene: Item[],
  ctx: CanvasRenderingContext2D,
  cam: Camera,
  o: RenderOptions,
): void {
  const from = o.radius ?? 1500;
  const to = o.massRadius ?? 26000;
  if (to <= from) return;

  const volumes = massing(cam.x, cam.z, from, to);
  for (const m of volumes) {
    if (o.corridor && inCorridor(o.corridor, m.x, m.z)) continue;
    const c = toCamera(cam, { x: m.x, y: m.height / 2, z: m.z });
    if (c.z <= cam.near) continue;
    if (!boxVisible(cam, { x: m.x - m.width, y: 0, z: m.z - m.depth }, { x: m.x + m.width, y: m.height, z: m.z + m.depth })) continue;
    const depth = c.z;
    scene.push({
      depth,
      draw: () =>
        drawBox(
          ctx, cam, m.x, m.z, m.width, m.depth, 0, m.height,
          m.seed, facadeFor(o.palette, m.seed, DISTRICT_BIAS[m.district] ?? 0), depth, o, 'plain', 0,
        ),
    });
  }
}

/** Face brightness. The sun is low in the southeast, so +z and +x faces are lit. */
function faceTone(base: string, palette: Palette, lit: boolean, top: boolean): string {
  const night = palette.name === 'night';
  if (top) return sunlit(base, night ? 0.4 : 1.1);
  if (lit) return sunlit(base, night ? 0.2 : 0.45);
  return shaded(base, night ? 0.5 : 1);
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
        // Heavier and looser than an architectural line. A crayon has a blunt
        // tip and a hand behind it, and a 1 px ruled outline is the fastest way
        // to make a coloured drawing look like a render of one.
        width: detail === 'full' ? 2.1 : detail === 'bands' ? 1.5 : 1.1,
        wobble: detail === 'full' ? 2.2 : 1.2,
        overshoot: detail === 'full' ? 3.4 : 1.2,
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
  const seed = Math.round(b.seed * 100000);
  const base = facadeFor(o.palette, seed, DISTRICT_BIAS[b.district] ?? 0);

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

  flat(ctx, barrel, hazed(palette.name === 'night' ? '#3a2e28' : '#9c6b4a', palette, fade));
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
  const seed = L.id.length * 7919;
  const base = facadeFor(palette, seed, DISTRICT_BIAS[L.district] ?? 0);
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
