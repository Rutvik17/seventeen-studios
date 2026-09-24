/**
 * Writes the drawn globe's two data files, from two public-domain sources:
 *
 *   src/lib/globe/land.ts     the coastlines, for the pencil
 *   src/lib/globe/colours.ts  which paint each half-degree of the world gets
 *
 *   curl -sSLO https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson
 *   curl -sSLO https://eoimages.gsfc.nasa.gov/images/imagerecords/57000/57752/land_shallow_topo_2048.jpg
 *   node scripts/make-globe-data.mjs ne_110m_land.geojson land_shallow_topo_2048.jpg
 *
 * COASTLINES — Natural Earth's 1:110m land (naturalearthdata.com), thinned
 * with Douglas–Peucker to a third of a degree, which is about as much as a
 * pencil shows on a globe this size, rounded to a tenth of a degree. Islands
 * smaller than about half a square degree are left out.
 *
 * COLOURS — NASA's Blue Marble (Visible Earth), a picture of the whole Earth
 * put together from satellite photographs, without clouds. Every half-degree
 * cell is averaged and given the paint it looks most like:
 *
 * - Land or sea is decided by the coastlines above, not by the picture, so a
 *   paint can never disagree with the pencil line.
 * - A land cell's paint is the nearest, in CIE Lab colour, of reference
 *   colours read off the same picture at places whose ground is known — the
 *   Amazon is rainforest, the Sahara desert, Greenland ice — so the paints
 *   come from the picture, not from a guess at what it shows.
 * - The sea is one navy in the picture, so its paint follows the distance to
 *   land instead: pale along the coasts, cerulean over the shelves, deep
 *   further out — the way maps and globes have always coloured it — and the
 *   picture's own light shallows (the Bahamas, the reefs) stay pale.
 *
 * Node cannot decode a JPEG, so the picture is read in headless Chrome
 * (`chrome.mjs`). Run again only if a source changes; the output is committed.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './chrome.mjs';

const [, , geojson, picture] = process.argv;
if (!geojson || !picture) {
  console.error('usage: node scripts/make-globe-data.mjs ne_110m_land.geojson land_shallow_topo_2048.jpg');
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = (name) => path.join(root, 'src/lib/globe', name);

/* ------------------------------------------------------------------ *
 * Coastlines
 * ------------------------------------------------------------------ */

const TOLERANCE = 0.33;
const MIN_AREA = 0.45;

function simplify(points, tolerance) {
  if (points.length < 3) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = points[a];
    const [bx, by] = points[b];
    const len = Math.hypot(bx - ax, by - ay);
    let far = -1;
    let at = -1;
    for (let i = a + 1; i < b; i += 1) {
      const [px, py] = points[i];
      const d = len ? Math.abs((by - ay) * px - (bx - ax) * py + bx * ay - by * ax) / len : Math.hypot(px - ax, py - ay);
      if (d > far) {
        far = d;
        at = i;
      }
    }
    if (far > tolerance) {
      keep[at] = true;
      stack.push([a, at], [at, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** A closed ring starts and ends on one point: split it at the point furthest from there and thin each half. */
function simplifyRing(ring, tolerance) {
  const open = ring.slice(0, -1);
  let at = 0;
  open.forEach(([x, y], i) => {
    if (Math.hypot(x - open[0][0], y - open[0][1]) > Math.hypot(open[at][0] - open[0][0], open[at][1] - open[0][1])) at = i;
  });
  const one = simplify(open.slice(0, at + 1), tolerance);
  const two = simplify([...open.slice(at), open[0]], tolerance);
  return [...one, ...two.slice(1, -1)];
}

const area = (ring) => Math.abs(ring.reduce((s, [x0, y0], i) => {
  const [x1, y1] = ring[(i + 1) % ring.length];
  return s + x0 * y1 - x1 * y0;
}, 0) / 2);

const rings = [];
for (const feature of JSON.parse(readFileSync(geojson, 'utf8')).features) {
  const g = feature.geometry;
  for (const polygon of g.type === 'Polygon' ? [g.coordinates] : g.coordinates) {
    if (area(polygon[0]) < MIN_AREA) continue;
    const thin = simplifyRing(polygon[0], TOLERANCE).map(([lon, lat]) => [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
    if (thin.length >= 3) rings.push(thin);
  }
}

/* ------------------------------------------------------------------ *
 * Colours
 * ------------------------------------------------------------------ */

/** Half-degree cells. */
const COLS = 720;
const ROWS = 360;

/** The paints, in the order `colours.ts` numbers them. */
const PAINTS = ['deep', 'sea', 'shallow', 'forest', 'grass', 'savanna', 'desert', 'rock', 'tundra', 'ice'];
const SEA = new Set([0, 1, 2]);

/**
 * Places whose ground is known, and the paint for it: the picture's colour
 * there becomes that paint's reference. [lon, lat] of each box's middle.
 */
const REFERENCES = {
  forest: [[-63, -4], [22, 0], [-72, 2], [113, 0], [-95, 54], [105, 60]],
  grass: [[10, 50], [-86, 38], [115, 30], [30, 55], [-50, -25]],
  savanna: [[20, 12], [68, 48], [26, -20], [-45, -12], [135, -16], [-100, 38]],
  desert: [[12, 25], [50, 21], [26, 26], [-5, 23], [85, 40]],
  rock: [[132, -25], [122, -24], [58, 31], [-112, 36]],
  tundra: [[-100, 67], [80, 70], [140, 70], [-150, 69]],
  ice: [[-40, 74], [-42, 68], [0, -80], [120, -78]],
};

const page = await openPage({ width: 800, height: 600 });
let grid;
try {
  const image = `data:image/jpeg;base64,${readFileSync(picture).toString('base64')}`;
  await page.navigate('about:blank');
  grid = await page.evaluate(`(async () => {
    const img = new Image();
    img.src = ${JSON.stringify(image)};
    await img.decode();
    const c = document.createElement('canvas');
    c.width = ${COLS}; c.height = ${ROWS};
    const g = c.getContext('2d', { willReadFrequently: true });
    // Each cell's average colour: the picture scaled down to one pixel a cell.
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, ${COLS}, ${ROWS});
    const colour = Array.from(g.getImageData(0, 0, ${COLS}, ${ROWS}).data);
    // Land: the coastlines filled, read at each cell's middle.
    g.clearRect(0, 0, ${COLS}, ${ROWS});
    g.fillStyle = '#000';
    for (const ring of ${JSON.stringify(rings)}) {
      g.beginPath();
      ring.forEach(([lon, lat], i) => {
        const x = ((lon + 180) / 360) * ${COLS};
        const y = ((90 - lat) / 180) * ${ROWS};
        i ? g.lineTo(x, y) : g.moveTo(x, y);
      });
      g.closePath();
      g.fill();
    }
    const land = Array.from(g.getImageData(0, 0, ${COLS}, ${ROWS}).data).filter((_, i) => i % 4 === 3).map((a) => (a >= 128 ? 1 : 0));
    return { colour, land };
  })()`);
} finally {
  await page.close();
}

const cell = (col, row) => row * COLS + col;
const colOf = (lon) => Math.min(COLS - 1, Math.floor(((lon + 180) / 360) * COLS));
const rowOf = (lat) => Math.min(ROWS - 1, Math.floor(((90 - lat) / 180) * ROWS));

/** sRGB (0–255) to CIE Lab (D65). */
function lab(r, g, b) {
  const lin = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const f = (t) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047);
  const y = f(0.2126 * R + 0.7152 * G + 0.0722 * B);
  const z = f((0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

const labs = Array.from({ length: COLS * ROWS }, (_, i) => lab(grid.colour[4 * i], grid.colour[4 * i + 1], grid.colour[4 * i + 2]));
const isLand = (i) => grid.land[i] === 1;

// Each reference: the average Lab colour of the land cells in a 4° box.
const refs = [];
for (const [name, places] of Object.entries(REFERENCES)) {
  for (const [lon, lat] of places) {
    let sum = [0, 0, 0];
    let n = 0;
    for (let dy = -4; dy < 4; dy += 1) {
      for (let dx = -4; dx < 4; dx += 1) {
        const i = cell((colOf(lon) + dx + COLS) % COLS, Math.max(0, Math.min(ROWS - 1, rowOf(lat) + dy)));
        if (!isLand(i)) continue;
        sum = sum.map((s, k) => s + labs[i][k]);
        n += 1;
      }
    }
    if (!n) throw new Error(`reference ${name} at ${lon}, ${lat} has no land under it`);
    refs.push({ paint: PAINTS.indexOf(name), lab: sum.map((s) => s / n) });
  }
}

const classes = new Uint8Array(COLS * ROWS);
for (let i = 0; i < classes.length; i += 1) {
  if (!isLand(i)) continue;
  const row = Math.floor(i / COLS);
  // Antarctica is ice all over, whatever its shading in the picture.
  if (90 - (row + 0.5) * (180 / ROWS) < -60) {
    classes[i] = PAINTS.indexOf('ice');
    continue;
  }
  let best = Infinity;
  for (const r of refs) {
    const d = (labs[i][0] - r.lab[0]) ** 2 + (labs[i][1] - r.lab[1]) ** 2 + (labs[i][2] - r.lab[2]) ** 2;
    if (d < best) {
      best = d;
      classes[i] = r.paint;
    }
  }
}

// Tidy speckle on land: twice, each cell takes the paint most of its
// neighbourhood has, so the colouring comes in patches a paint could lay.
for (let pass = 0; pass < 2; pass += 1) {
  const next = classes.slice();
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const i = cell(col, row);
      if (!isLand(i)) continue;
      const count = new Map();
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const r = row + dy;
          if (r < 0 || r >= ROWS) continue;
          const j = cell((col + dx + COLS) % COLS, r);
          if (isLand(j)) count.set(classes[j], (count.get(classes[j]) ?? 0) + (dx || dy ? 1 : 1.5));
        }
      }
      next[i] = [...count.entries()].sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  classes.set(next);
}

// The sea: distance to the nearest land, in degrees along the ground — a
// cell's width shrinks with the cosine of its latitude — searched out to 6°.
const REACH = 12;
const distance = new Float32Array(COLS * ROWS).fill(Infinity);
for (let row = 0; row < ROWS; row += 1) {
  const lat = 90 - (row + 0.5) * (180 / ROWS);
  const k = Math.cos((lat * Math.PI) / 180);
  for (let col = 0; col < COLS; col += 1) {
    const i = cell(col, row);
    if (isLand(i)) {
      distance[i] = 0;
      continue;
    }
    let best = Infinity;
    for (let dy = -REACH; dy <= REACH; dy += 1) {
      const r = row + dy;
      if (r < 0 || r >= ROWS) continue;
      // Near the poles a cell is narrow, so the search reaches further round.
      const across = Math.min(COLS / 2, Math.ceil(REACH / Math.max(0.05, k)));
      for (let dx = -across; dx <= across; dx += 1) {
        if (!isLand(cell((col + dx + COLS) % COLS, r))) continue;
        const d = Math.hypot(dx * k, dy) / 2;
        if (d < best) best = d;
      }
    }
    distance[i] = best;
  }
}
// The open ocean's colour in the picture, and how far a cell must be from it to be a shallow.
const open = (() => {
  let sum = [0, 0, 0];
  let n = 0;
  for (let row = rowOf(20); row < rowOf(-20); row += 1) {
    const i = cell(colOf(-150), row);
    sum = sum.map((s, k) => s + labs[i][k]);
    n += 1;
  }
  return sum.map((s) => s / n);
})();
for (let i = 0; i < classes.length; i += 1) {
  if (isLand(i)) continue;
  const shallows = Math.hypot(labs[i][0] - open[0], labs[i][1] - open[1], labs[i][2] - open[2]) > 18;
  classes[i] = shallows || distance[i] <= 1.2 ? 2 : distance[i] <= 5 ? 1 : 0;
}

// Written a row at a time, as runs: a paint's letter, then the run's length in base 36.
const rows = [];
for (let row = 0; row < ROWS; row += 1) {
  let line = '';
  for (let col = 0; col < COLS; ) {
    const k = classes[cell(col, row)];
    let end = col + 1;
    while (end < COLS && classes[cell(end, row)] === k) end += 1;
    line += String.fromCharCode(97 + k) + (end - col).toString(36) + '.';
    col = end;
  }
  rows.push(line);
}

const counts = PAINTS.map((name, k) => `${name} ${classes.filter((c) => c === k).length}`).join(', ');
const points = rings.reduce((n, r) => n + r.length, 0);

writeFileSync(
  out('land.ts'),
  `/**
 * The world's land, as outlines of longitude and latitude in degrees:
 * [lon, lat, lon, lat, …] for each landmass. Generated by
 * \`scripts/make-globe-data.mjs\` from Natural Earth's 1:110m land (public
 * domain): ${rings.length} landmasses, ${points} points. Edit the script, not this file.
 */

export const LAND: readonly (readonly number[])[] = ${JSON.stringify(rings.map((r) => r.flat()))};
`,
);

writeFileSync(
  out('colours.ts'),
  `/**
 * Which paint each half-degree of the world is coloured with, from NASA's
 * Blue Marble. Generated by \`scripts/make-globe-data.mjs\`; edit the script,
 * not this file.
 *
 * ${COLS} columns from 180° W eastwards, ${ROWS} rows from 90° N southwards. Each row is
 * a list of runs, \`.\`-separated: a paint's letter (a = the first of
 * \`PAINTS\`) and how many cells it runs for, in base 36.
 *
 * Cells: ${counts}.
 */

export const PAINTS = ${JSON.stringify(PAINTS)} as const;

export const COLOUR_GRID: { cols: number; rows: number; runs: readonly string[] } = { cols: ${COLS}, rows: ${ROWS}, runs: ${JSON.stringify(rows)} };
`,
);

console.log(`land: ${rings.length} landmasses, ${points} points`);
console.log(`colours: ${counts}`);
