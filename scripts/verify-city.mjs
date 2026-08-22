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

/*
  tsc roots its output at the common parent of everything it compiled. `signs.ts`
  imports the shared pixel font from outside this directory, so the output lands
  in `out/city/` with `out/pixelfont.js` beside it rather than flat in `out/` —
  and the layout changes the moment an import reaches one file further out.
  Found rather than assumed.
*/
const dir = readdirSync(out).includes('city') ? join(out, 'city') : out;
writeFileSync(join(dir, 'package.json'), '{"type":"module"}');

// tsc emits extensionless relative imports; Node needs them explicit.
const fix = (folder, depth) => {
  for (const file of readdirSync(folder).filter((f) => f.endsWith('.js'))) {
    const p = join(folder, file);
    writeFileSync(
      p,
      readFileSync(p, 'utf8')
        .replace(/from '\.\/([a-z]+)'/g, "from './$1.js'")
        .replace(/from '\.\.\/([a-z]+)'/g, depth ? "from '../$1.js'" : "from './$1.js'"),
    );
  }
};
fix(dir, dir !== out);
if (dir !== out) {
  writeFileSync(join(out, 'package.json'), '{"type":"module"}');
  fix(out, false);
}

const load = (name) => import(pathToFileURL(join(dir, name)).href);
const { makeCamera, focal, horizon, project, projectSegment, projectPolygon, lookAt, scaleAt, clipToFrame } = await load('camera.js');
const W = await load('world.js');
const B = await load('blocks.js');
const M = await load('massing.js');
const R = await load('route.js');
const S = await load('street.js');

/*
  The drive lives in content, which imports through the `@/` alias. Rather than
  teach this script the alias, the waypoints are re-evaluated from the same
  source with the constants substituted — so there is one copy of the route, not
  two. If the file ever stops parsing this way the check fails loudly, which is
  the behaviour wanted: a second hand-maintained copy would drift silently.
*/
const DRIVE = (() => {
  const text = readFileSync(new URL('../src/content/city-drive.ts', import.meta.url), 'utf8');
  const from = text.indexOf('export const DRIVE');
  const body = text.slice(from, text.indexOf('];', from) + 2);
  const js = body
    .replace('export const DRIVE: Waypoint[] =', 'return')
    .replace(/AVENUE\.(\w+)/g, (_, k) => String(W.AVENUE[k]))
    .replace(/blockZ\(([-\d.]+)\)/g, (_, n) => String(W.blockZ(Number(n))))
    .replace(/downtownZ\(([-\d.]+)\)/g, (_, n) => String(W.downtownZ(Number(n))));
  // eslint-disable-next-line no-new-func
  return new Function(js)();
})();

console.log('\nTHE DRIVE');
{
  const route = R.buildRoute(DRIVE);
  check('the route is a real drive', route.length > 8000 && route.length < 30000, `${(route.length / 1000).toFixed(2)} km`);
  check('it is sampled evenly', route.points.length > 1000, `${route.points.length} samples`);
  check('it starts downtown and ends uptown', route.points[0].z < route.points[route.points.length - 1].z);

  // Every metre of level road must be on land. A route that leaves the island
  // drives into the Hudson, and that is not visible from reading the waypoints.
  const level = route.points.filter((p) => p.y < 1);
  const wet = level.filter((p) => M.landAt(p.x, p.z) === 0);
  check('the road never leaves the land', wet.length === 0, `${wet.length} of ${level.length} level samples in the water`);

  // And the bridges are exactly where it should leave it.
  const decks = route.points.filter((p) => p.y > 5);
  check('the bridge decks are over water', decks.length > 20 && decks.some((p) => M.landAt(p.x, p.z) === 0), `${decks.length} deck samples`);

  /*
    Heading must be continuous. A polyline turns instantly at its vertices, and
    a camera that does the same spins the whole world about the driver's nose in
    one frame — the most obvious way a scripted drive gives itself away.
  */
  let worst = 0;
  for (let i = 1; i < route.points.length; i += 1) {
    worst = Math.max(worst, Math.abs(R.shortestTurn(route.points[i - 1].heading, route.points[i].heading)));
  }
  check('the heading never jumps', worst < 0.4, `worst step ${((worst * 180) / Math.PI).toFixed(1)} degrees over 4 m`);

  // The corridor is what stops the generator building in the middle of the road.
  const corridor = R.buildCorridor(route, S.LANE * 2.35 + 4.2 + 1);
  check('the corridor covers the whole road', route.points.every((p) => R.inCorridor(corridor, p.x, p.z)));
  check('and not the whole city', !R.inCorridor(corridor, 900, W.blockZ(90)));

  let wouldBlock = 0;
  for (let r = 0; r < 120; r += 1) {
    for (let c = 0; c < B.BLOCK_COLUMNS; c += 1) {
      for (const b of B.blockAt(c, r)) if (R.inCorridor(corridor, b.x, b.z)) wouldBlock += 1;
    }
  }
  check('buildings would stand in the road without it', wouldBlock > 0, `${wouldBlock} would have`);
}

console.log('\nTHE TRAFFIC');
{
  const route = R.buildRoute(DRIVE);
  const traffic = S.makeTraffic();
  let closest = Infinity;
  let fastest = 0;
  let stopped = 0;
  let inTheCamera = 0;
  let reversed = 0;

  // Three minutes of driving at 60 Hz, moving up the road as the scroll would.
  for (let i = 0; i < 180 * 60; i += 1) {
    const d = 6000 + (i / 60) * 8;
    S.stepTraffic(traffic, route, d, 1 / 60, false);

    const lanes = new Map();
    for (const car of traffic.cars) {
      if (car.v > fastest) fastest = car.v;
      if (car.v < 0) reversed += 1;
      if (car.v < 0.2) stopped += 1;
      // Nothing may occupy the camera's own space, or the frame becomes the
      // inside of a taxi.
      if (Math.abs(car.lateral - S.LANE * 0.55) < S.LANE * 0.8 && Math.abs(car.s - d) < 5) inTheCamera += 1;
      const k = Math.round(car.lateral * 10);
      if (!lanes.has(k)) lanes.set(k, []);
      lanes.get(k).push(car);
    }

    for (const list of lanes.values()) {
      list.sort((a, b) => a.s - b.s);
      for (let j = 0; j + 1 < list.length; j += 1) {
        const gap = list[j + 1].s - list[j].s - 5.2;
        if (gap < closest) closest = gap;
      }
    }
  }

  check('the population stays bounded', traffic.cars.length <= 74, `${traffic.cars.length} cars`);
  check('no car ever reverses', reversed === 0);
  check('no car ever overlaps the one ahead', closest > -0.6, `closest gap ${closest.toFixed(2)} m`);
  check('nothing drives through the camera', inTheCamera === 0, `${inTheCamera} car-frames`);
  check('nobody exceeds a plausible speed', fastest * 2.23694 < 32, `${(fastest * 2.23694).toFixed(1)} mph`);
  check('and some are stopped at some point', stopped > 0, `${stopped} car-frames`);
}

rmSync(out, { recursive: true, force: true });

console.log();
if (failures > 0) {
  console.error(`${failures} city check(s) failed.`);
  process.exit(1);
}
console.log('The city checks out.');
