/**
 * Postbuild check for the globe (`src/lib/globe/`): that its world is the
 * real one — land and sea where they are, each crayon where the ground is
 * that colour — and that every city sketched with its continent is on the
 * right one, on either side of every line drawn between continents.
 *
 *   node --experimental-strip-types --import ./scripts/alias-register.mjs scripts/verify-globe.mjs
 *
 * It reads the same modules the page draws from, so it checks the drawing
 * that ships, not a description of it.
 */

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { coastOf, continentOf, CONTINENT_IDS } from '../src/lib/globe/continents.ts';
import { crayonAt, crayonIndex, isLand, marks } from '../src/lib/globe/marks.ts';

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

// Land and sea where they are.
const places = [
  ['London', -0.1, 51.5, true],
  ['Cairo', 31.2, 30.0, true],
  ['Canberra', 149.1, -35.3, true],
  ['Manaus', -60.0, -3.1, true],
  ['Madrid', -3.7, 40.4, true],
  ['the middle of the Pacific', -150, 0, false],
  ['the middle of the Atlantic', -30, 30, false],
  ['the Indian Ocean', 80, -20, false],
];
for (const [name, lon, lat, land] of places) check(isLand(lon, lat) === land, `${name} should be ${land ? 'land' : 'sea'}`);

// Each crayon where the ground really is that colour.
const colours = [
  ['the Sahara', 12, 23, ['desert']],
  ['central Australia', 133, -25, ['rock', 'desert']],
  ['the Amazon', -62, -4, ['forest']],
  ['the Congo', 22, 0, ['forest']],
  ['Greenland', -40, 72, ['ice']],
  ['Antarctica', 0, -80, ['ice']],
  ['the open Pacific', -150, 0, ['deep']],
];
for (const [name, lon, lat, want] of colours) {
  const got = crayonAt(lon, lat);
  check(want.some((w) => crayonIndex(w) === got), `${name} should be coloured ${want.join(' or ')}`);
}

// Cities on the continent they are on — close to every line between two.
const cities = [
  ['Paris', 2.35, 48.86, 'europe'],
  ['Moscow', 37.6, 55.75, 'europe'],
  ['Kazan', 49.1, 55.8, 'europe'],
  ['Yekaterinburg', 60.6, 56.84, 'asia'],
  ['Reykjavík', -21.9, 64.1, 'europe'],
  ['Nuuk', -51.7, 64.2, 'north-america'],
  ['Istanbul, European side', 28.95, 41.03, 'europe'],
  ['Ankara', 32.85, 39.93, 'asia'],
  ['Tbilisi', 44.8, 41.7, 'asia'],
  ['Palermo', 13.36, 38.12, 'europe'],
  ['Tunis', 10.18, 36.8, 'africa'],
  ['Cairo', 31.24, 30.04, 'africa'],
  ['the Sinai', 33.8, 29.5, 'asia'],
  ['Riyadh', 46.7, 24.7, 'asia'],
  ['Nairobi', 36.8, -1.3, 'africa'],
  ['Antananarivo', 47.5, -18.9, 'africa'],
  ['Tokyo', 139.7, 35.7, 'asia'],
  ['Jakarta', 106.8, -6.2, 'asia'],
  ['Port Moresby', 147.2, -9.4, 'oceania'],
  ['Sydney', 150.9, -33.8, 'oceania'],
  ['Wellington', 174.8, -41.2, 'oceania'],
  ['Panama City', -79.5, 9.0, 'north-america'],
  ['Bogotá', -74.1, 4.7, 'south-america'],
  ['New York', -74.0, 40.7, 'north-america'],
  ['Anchorage', -149.9, 61.2, 'north-america'],
  ['Chukotka', -175, 66, 'asia'],
  ['São Paulo', -46.6, -23.5, 'south-america'],
  ['McMurdo', 166.7, -77.8, 'antarctica'],
];
for (const [name, lon, lat, want] of cities) {
  const got = continentOf(lon, lat);
  check(got === want, `${name} should be in ${want}, not ${got}`);
}

// Every continent has a coast to sketch, and every coast point is on one continent.
for (const id of CONTINENT_IDS) check(coastOf(id).length > 0, `${id} has no coastline`);
const { coasts } = marks();
let lost = 0;
let points = 0;
for (const line of coasts) {
  for (let i = 0; i < line.length; i += 2) {
    points += 1;
    if (!continentOf(line[i], line[i + 1])) lost += 1;
  }
}
// A few specks of ocean islands (Hawaii, the Azores) belong to no continent.
check(lost / points < 0.02, `${lost} of ${points} coast points belong to no continent`);

// The crayon pictures the page loads: there, and coloured with today's crayons.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const width of [3072, 2048]) check(existsSync(path.join(root, `public/notebook/earth/crayon-${width}.webp`)), `public/notebook/earth/crayon-${width}.webp is missing — run node scripts/make-globe-sheet.mjs`);
const css = readFileSync(path.join(root, 'src/components/notebook/Globe.module.css'), 'utf8');
const now = Object.fromEntries([...css.matchAll(/--globe-([a-z]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)].map(([, name, value]) => [name, value.toLowerCase()]));
const then = JSON.parse(readFileSync(path.join(root, 'public/notebook/earth/crayons.json'), 'utf8'));
check(JSON.stringify(now) === JSON.stringify(then), 'the crayon colours in Globe.module.css have changed since the globe was coloured — run node scripts/make-globe-sheet.mjs');

if (failures.length) {
  console.error(`globe: ${failures.length} problem${failures.length === 1 ? '' : 's'}:\n  ${[...new Set(failures)].slice(0, 20).join('\n  ')}`);
  process.exit(1);
}
console.log(`globe: the world checks out — land, sea and crayons where they are, ${cities.length} cities on their continents, ${points - lost} of ${points} coast points on one`);
