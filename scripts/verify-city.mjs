#!/usr/bin/env node
/**
 * Check the city's arithmetic.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * The city is drawn to a canvas, so unlike the circuit board there is no
 * rendered path data in the export to inspect. What can be checked is the layer
 * underneath: the projection, the geography, and the rules that generate the
 * buildings. All three are pure functions, and all three have already been
 * wrong in ways that were invisible in the source:
 *
 *   - the horizon moved when the camera climbed, which is not what a horizon
 *     does
 *   - a vertex clipped to the near plane projected twenty-one million pixels
 *     off-screen, which is arithmetically correct and fatal in practice
 *   - `blockZ(-25)` put City Hall five kilometres out in the harbour, because
 *     lower Manhattan is not on the numbered grid
 *   - the Verrazzano-Narrows Bridge started and ended in open water
 *
 * Not one of those was findable by reading the code, and every one of them is a
 * one-line assertion. So they are assertions.
 *
 * The city modules are TypeScript with no runtime dependencies, so this
 * transpiles them to a temporary directory and imports the result rather than
 * duplicating the arithmetic here — a second copy of a formula is a second
 * formula to get wrong.
 *
 * Run: npm run city
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

let failures = 0;
function check(label, condition, detail = '') {
  if (!condition) failures += 1;
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;

/* ---- build the modules ---- */

const out = mkdtempSync(join(tmpdir(), 'city-verify-'));
const src = new URL('../src/lib/city/', import.meta.url);

try {
  // The local compiler, invoked directly. Going through `npx` needs a shell on
  // Windows and fails with EINVAL when spawned without one.
  const tsc = new URL('../node_modules/typescript/lib/tsc.js', import.meta.url);
  execFileSync(
    process.execPath,
    [tsc.pathname.slice(process.platform === 'win32' ? 1 : 0),
      ...readdirSync(src).filter((f) => f.endsWith('.ts')).map((f) => join(src.pathname.slice(process.platform === 'win32' ? 1 : 0), f)),
      '--outDir', out, '--module', 'esnext', '--target', 'es2022', '--moduleResolution', 'bundler'],
    { stdio: 'pipe' },
  );
} catch (error) {
  console.error('! the city modules do not compile');
  console.error(error.stdout?.toString() ?? error.message);
  process.exit(1);
}

writeFileSync(join(out, 'package.json'), '{"type":"module"}');
// tsc emits extensionless relative imports; Node needs them explicit.
for (const file of readdirSync(out).filter((f) => f.endsWith('.js'))) {
  const p = join(out, file);
  writeFileSync(p, readFileSync(p, 'utf8').replace(/from '\.\/([a-z]+)'/g, "from './$1.js'"));
}

const load = (name) => import(pathToFileURL(join(out, name)).href);
const { makeCamera, focal, horizon, project, projectSegment, projectPolygon, lookAt, scaleAt, clipToFrame } = await load('camera.js');
const W = await load('world.js');
const B = await load('blocks.js');
const M = await load('massing.js');

/* ================================================================== */

console.log('\nTHE PROJECTION');
{
  const cam = makeCamera({ width: 1440, height: 900 });
  check('f = (H/2) / tan(fov/2)', near(focal(cam), 450 / Math.tan(cam.fov / 2)), `${focal(cam).toFixed(1)} px`);

  // The horizon is where the lens points, and nothing else. Climbing must not
  // move it — if it does, the projection is wrong.
  for (const [pitch, shiftY] of [[0, 0], [-0.35, 0], [0, 280], [-0.2, 180]]) {
    const ys = [1.7, 60, 900, 7000].map((y) => horizon(makeCamera({ y, pitch, shiftY })));
    check(
      `horizon fixed from pavement to 7 km (pitch ${pitch}, shift ${shiftY})`,
      ys.every((y) => near(y, ys[0])),
      `y = ${ys[0].toFixed(2)}`,
    );
  }

  // Every line parallel to the view meets the horizon at one pixel, and it is
  // the centre column. Lines at other bearings must not.
  const c = makeCamera({ y: 1.7, shiftY: 260 });
  const hz = horizon(c);
  const vp = [-18, 18, -60, 200].map((x) => {
    const a = project(c, { x, y: 0, z: 20 });
    const b = project(c, { x, y: 0, z: 400 });
    return a.x + (b.x - a.x) * ((hz - a.y) / (b.y - a.y));
  });
  check('parallel lines meet at one point', vp.every((v) => near(v, vp[0], 1e-6)));
  check('and it is on the centre column', near(vp[0], c.width / 2, 1e-6));

  // Ponzo: apparent size is exactly inversely proportional to depth.
  const h = (z) => project(c, { x: 0, y: 0, z }).y - project(c, { x: 0, y: 100, z }).y;
  check('a tower at 200 m draws twice the one at 400 m', near(h(200) / h(400), 2, 1e-9));
  check('and four times the one at 800 m', near(h(200) / h(800), 4, 1e-9));
  check('scaleAt agrees with the projection', near(scaleAt(c, 200) * 100, h(200), 1e-9));

  // Shift keeps verticals plumb; pitch leans them, as a photograph does.
  for (const shiftY of [0, 180, 420]) {
    const s = makeCamera({ y: 1.7, shiftY });
    const bot = project(s, { x: 120, y: 0, z: 300 });
    const top = project(s, { x: 120, y: 180, z: 300 });
    check(`towers stand plumb under ${shiftY} px of shift`, near(bot.x, top.x, 1e-9));
  }
  const p = makeCamera({ y: 1.7, pitch: 0.25 });
  check(
    'and lean when the camera is pitched',
    Math.abs(project(p, { x: 120, y: 0, z: 300 }).x - project(p, { x: 120, y: 180, z: 300 }).x) > 5,
  );

  check('lookAt centres its target', (() => {
    const l = lookAt(makeCamera({ x: 0, y: 60, z: 0 }), { x: 120, y: 5, z: 300 });
    const hit = project(l, { x: 120, y: 5, z: 300 });
    return near(hit.x, l.width / 2, 1e-6) && near(hit.y, l.height / 2, 1e-6);
  })());
}

console.log('\nCLIPPING');
{
  const cam = makeCamera({ y: 1.7 });
  check('a point behind the lens does not project', project(cam, { x: 0, y: 1.7, z: -10 }) === null);
  const seg = projectSegment(cam, { x: 0, y: 1.7, z: -10 }, { x: 0, y: 1.7, z: 50 });
  check('a segment crossing the lens is clipped, not flipped', seg !== null && near(seg[0].z, cam.near, 1e-9));
  check('a segment wholly behind is dropped', projectSegment(cam, { x: 0, y: 1, z: -9 }, { x: 0, y: 1, z: -2 }) === null);

  // The failure this whole section exists for: geometry at the near plane must
  // not produce coordinates in the millions.
  // A facade running from behind the camera out to 60 m: the near end is
  // clipped, the far end is genuinely on screen.
  const wall = projectPolygon(cam, [
    { x: -14, y: 0, z: -5 }, { x: -14, y: 0, z: 60 },
    { x: -14, y: 120, z: 60 }, { x: -14, y: 120, z: -5 },
  ]);
  check('a polygon at the lens comes back finite', wall !== null && wall.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
  check(
    'and bounded to a viewport of margin',
    wall.every((p) => p.x >= -cam.width - 1 && p.x <= cam.width * 2 + 1 && p.y >= -cam.height - 1 && p.y <= cam.height * 2 + 1),
    `x ${Math.min(...wall.map((p) => p.x)).toFixed(0)} .. ${Math.max(...wall.map((p) => p.x)).toFixed(0)}`,
  );
  check('a shape wholly off-frame is dropped', clipToFrame(cam, [
    { x: 9e4, y: 0, z: 5 }, { x: 9e4 + 10, y: 0, z: 5 }, { x: 9e4, y: 10, z: 5 },
  ]) === null);
  // A wall entirely above the frame really is nothing to draw, and saying so is
  // not the same bug as losing one that crosses it.
  check('a shape entirely above the frame is dropped', projectPolygon(cam, [
    { x: -30, y: 180, z: 0.4 }, { x: 30, y: 180, z: 0.4 }, { x: 30, y: 200, z: 0.4 },
  ]) === null);
}

console.log('\nTHE GEOGRAPHY');
{
  check('twenty blocks to the mile', near(W.BLOCK * 20, 1609.344), `${W.BLOCK.toFixed(2)} m`);
  check('Times Square is the origin', W.blockZ(42) === 0);

  const pw = W.PARK.east - W.PARK.west;
  const pl = W.PARK.north - W.PARK.south;
  check('Central Park runs 59th to 110th', near(pl, 4104, 6), `${(pl / 1000).toFixed(3)} km`);
  check('and Fifth Avenue to Central Park West', W.PARK.west === W.AVENUE.eighth && W.PARK.east === W.AVENUE.fifth, `${pw} m`);
  check('which is the famous 843 acres', near((pw * pl) / 4046.86, 843, 25), `${((pw * pl) / 4046.86).toFixed(0)} acres`);
  check('every park water body is inside the park', W.PARK_WATER.every((b) =>
    b.ring.every(([x, z]) => x > W.PARK.west && x < W.PARK.east && z > W.PARK.south && z < W.PARK.north)));

  const bounds = W.ringBounds(W.MANHATTAN);
  check('the island runs about 21 km', near(bounds.maxZ - bounds.minZ, 21100, 700), `${((bounds.maxZ - bounds.minZ) / 1000).toFixed(2)} km`);
  check('and is about 3.2 km across', near(bounds.maxX - bounds.minX, 3350, 400), `${((bounds.maxX - bounds.minX) / 1000).toFixed(2)} km`);

  // A shoreline that crosses itself fills wrong and cannot be trusted for
  // point-in-polygon, which everything else depends on.
  const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  const crosses = (p, q, r, s) => side(p, q, r) !== side(p, q, s) && side(r, s, p) !== side(r, s, q);
  let selfCrossings = 0;
  const ring = W.MANHATTAN;
  for (let i = 0; i < ring.length; i += 1) {
    for (let j = i + 2; j < ring.length; j += 1) {
      if (i === 0 && j === ring.length - 1) continue;
      if (crosses(ring[i], ring[(i + 1) % ring.length], ring[j], ring[(j + 1) % ring.length])) selfCrossings += 1;
    }
  }
  check('the shoreline does not cross itself', selfCrossings === 0);
  check('Times Square is on the island', W.inRing(W.MANHATTAN, -180, 0));
  check('the Battery is on the island', W.inRing(W.MANHATTAN, -100, W.downtownZ(300)));
  check('the Hudson is not', !W.inRing(W.MANHATTAN, -2100, 0));
  check('Roosevelt Island is in the river, not on Manhattan', W.ROOSEVELT.every(([x, z]) => !W.inRing(W.MANHATTAN, x, z)));
}

console.log('\nLANDMARKS');
{
  for (const L of W.LANDMARKS) {
    if (L.id === 'liberty') {
      check('the Statue of Liberty is offshore', !W.inRing(W.MANHATTAN, L.x, L.z));
      continue;
    }
    check(`${L.name} stands on Manhattan`, W.inRing(W.MANHATTAN, L.x, L.z));
    check(`${L.name} is not in the park`, !W.inPark(L.x, L.z));
    if (L.tip) check(`${L.name}: the tip clears the roof`, L.tip > L.height, `${L.height} m roof, ${L.tip} m tip`);
  }
  const es = W.LANDMARKS.find((l) => l.id === 'empire-state');
  check('the Empire State mast is 62 m of it', es.height === 381 && es.tip === 443);
  check('One WTC tips out at 1776 feet', near(W.LANDMARKS.find((l) => l.id === 'one-wtc').tip * 3.28084, 1776, 2));
  // Billionaires' Row is defined by slenderness, so the shape must earn its name.
  for (const p of W.LANDMARKS.filter((l) => l.shape === 'pencil')) {
    check(`${p.name} is genuinely a needle`, p.height / Math.min(p.width, p.depth) > 9,
      `${(p.height / Math.min(p.width, p.depth)).toFixed(1)} : 1`);
  }
  check('the Empire State is not', es.height / Math.min(es.width, es.depth) < 9);
}

console.log('\nBRIDGES');
{
  const LANDS = [
    ['Manhattan', W.MANHATTAN], ['Brooklyn', W.BOROUGH.brooklyn.ring], ['Queens', W.BOROUGH.queens.ring],
    ['the Bronx', W.BOROUGH.bronx.ring], ['Staten Island', W.BOROUGH.statenIsland.ring], ['New Jersey', W.JERSEY],
  ];
  const landAt = (x, z) => LANDS.find(([, r]) => W.inRing(r, x, z))?.[0] ?? null;
  for (const b of W.BRIDGES) {
    const from = landAt(b.from[0], b.from[1]);
    const to = landAt(b.to[0], b.to[1]);
    check(`${b.name} joins two shores`, from !== null && to !== null && from !== to, `${from} to ${to}`);
    const total = Math.hypot(b.to[0] - b.from[0], b.to[1] - b.from[1]);
    check(`${b.name}: the crossing exceeds its main span`, total > b.span, `${total.toFixed(0)} m across, ${b.span} m span`);
    if (b.kind === 'suspension') check(`${b.name}: the towers clear the deck`, b.tower > b.deck);
  }
  const brooklyn = W.BRIDGES.find((b) => b.name.startsWith('Brooklyn'));
  const gw = W.BRIDGES.find((b) => b.name.startsWith('George'));
  check('the George Washington more than doubles the Brooklyn Bridge', gw.span / brooklyn.span > 2, `${(gw.span / brooklyn.span).toFixed(2)}x`);
}

console.log('\nTHE BLOCKS');
{
  // A hash, not a sequence: a block must not depend on what was asked for first.
  const first = JSON.stringify(B.blockAt(6, 44));
  B.clearBlockCache();
  B.blockAt(2, 10); B.blockAt(9, 80); B.blockAt(-1, 3);
  check('a block is the same however you arrive at it', JSON.stringify(B.blockAt(6, 44)) === first);

  let all = [];
  for (let r = 30; r < 70; r += 1) for (let c = 0; c < B.BLOCK_COLUMNS; c += 1) all = all.concat(B.blockAt(c, r));
  check('midtown generates thousands of buildings', all.length > 2000, `${all.length} across 40 rows`);
  check('every building sits inside its own block', (() => {
    for (let r = 30; r < 70; r += 1) {
      for (let c = 0; c < B.BLOCK_COLUMNS; c += 1) {
        const [w, e] = B.columnBounds(c);
        const [s, n] = B.rowBounds(r);
        for (const b of B.blockAt(c, r)) {
          if (b.x - b.width / 2 < w - 0.01 || b.x + b.width / 2 > e + 0.01) return false;
          if (b.z - b.depth / 2 < s - 0.01 || b.z + b.depth / 2 > n + 0.01) return false;
        }
      }
    }
    return true;
  })());
  check('blocks come back tallest first', (() => {
    const list = B.blockAt(B.columnOf(-400), 44);
    return list.every((b, i) => i === 0 || list[i - 1].height >= b.height);
  })());
  check('nothing is built in Central Park', (() => {
    for (let r = 60; r < 109; r += 1) {
      for (let c = 0; c < B.BLOCK_COLUMNS; c += 1) {
        const [w, e] = B.columnBounds(c);
        const [s, n] = B.rowBounds(r);
        if (W.inPark((w + e) / 2, (s + n) / 2) && B.blockAt(c, r).length > 0) return false;
      }
    }
    return true;
  })());
  check('no building has zero extent', all.every((b) => b.width > 0 && b.depth > 0 && b.height > 0));
  check('setbacks only above 60 m', all.every((b) => b.setbacks.length === 0 || b.height >= 60));
  check('setbacks never eat the whole frontage', all.every((b) => b.setbacks.reduce((s, [, i]) => s + i, 0) < b.width / 2));
  const towers = all.filter((b) => b.waterTower);
  check('water towers only on 6-20 storey buildings', towers.every((b) => b.floors >= 6 && b.floors <= 20), `${towers.length} of ${all.length}`);

  let village = [];
  for (let r = 2; r < 14; r += 1) for (let c = 0; c < B.BLOCK_COLUMNS; c += 1) village = village.concat(B.blockAt(c, r));
  const mean = (a) => a.reduce((s, b) => s + b.height, 0) / a.length;
  check('midtown towers over the Village', mean(all) > mean(village) * 2.2, `${mean(all).toFixed(0)} m vs ${mean(village).toFixed(0)} m`);
}

console.log('\nMASSING');
{
  check('the land raster covers the city', M.rasterCells() > 20000, `${M.rasterCells()} cells`);
  check('Times Square is land', M.landAt(-180, 0) === 1);
  check('the Hudson is not', M.landAt(-2200, 0) === 0);
  check('Brooklyn is its own landmass', M.landAt(2600, W.blockZ(-40)) === 2);

  const volumes = M.massing(-300, 0, 1500, 26000);
  check('massing fills the far city', volumes.length > 500, `${volumes.length} volumes`);
  check('nothing is massed in the park', !volumes.some((m) => W.inPark(m.x, m.z)));
  check('nothing is massed on water', volumes.every((m) => M.landAt(m.x, m.z) !== 0));
  check('every volume has real extent', volumes.every((m) => m.width > 0 && m.depth > 0 && m.height > 0));
  // The count must not run away with distance, or the far view stalls.
  check('the count stays bounded to 34 km', M.massing(-300, 0, 1500, 34000).length < 9000,
    `${M.massing(-300, 0, 1500, 34000).length} at 34 km`);
}

rmSync(out, { recursive: true, force: true });

console.log();
if (failures > 0) {
  console.error(`${failures} city check(s) failed.`);
  process.exit(1);
}
console.log('The city checks out.');
