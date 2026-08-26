#!/usr/bin/env node
/**
 * Check the sprite manifest against the actual PNG files.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * `lib/sprites.ts` hardcodes how many frames are in each strip, and the panel
 * slices the strip by that number. Get it wrong and there is no error anywhere:
 * the animation just plays a sliver of the neighbouring frame, or stutters on a
 * frame that does not exist, and it looks like a rendering bug rather than a
 * data one.
 *
 * The same rule the rest of this repo runs on — a number stated in code is
 * verified against the thing it describes, mechanically, because proofreading
 * has already let a wrong one through.
 *
 * It also enforces the two geometric facts the panel relies on:
 *   every frame is 128 x 128, so a frame maps onto the panel 1:1
 *   the strip's width is exactly frames * 128, so slicing is exact
 *
 * And it checks the claim the CHARACTER SELECTION rests on: that decomposing
 * the sentiment model's logit into per-feature contributions reproduces the
 * probability the model itself stored. If that drifts, the panel is showing a
 * character chosen for a reason the model no longer has.
 *
 * Run: node scripts/verify-sprites.mjs   (part of `npm run verify`)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const FRAME = 128;

/*
  Read the manifest out of the TypeScript source rather than importing it, so
  this script has no build step and no alias loader. The shapes it needs are
  plain object literals; anything cleverer in there should fail loudly here.
*/
const src = readFileSync(path.join(ROOT, 'src/lib/sprites.ts'), 'utf8');

function parseTable(name) {
  const start = src.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`${name} not found in sprites.ts`);
  const open = src.indexOf('{', src.indexOf('=', start));
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
  }
  const body = src.slice(open, end + 1);
  // Quote bare keys, strip trailing commas, then it is JSON.
  const json = body
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(json);
}

const FRAMES = parseTable('FRAMES');
const FPS = parseTable('FPS');

/** Width and height from a PNG's IHDR, which is always the first chunk. */
function pngSize(file) {
  const b = readFileSync(file);
  if (b.readUInt32BE(0) !== 0x89504e47) throw new Error(`${file} is not a PNG`);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

const failures = [];
let checked = 0;

for (const [character, anims] of Object.entries(FRAMES)) {
  for (const [animation, claimed] of Object.entries(anims)) {
    const file = path.join(ROOT, 'public/sprites', character, `${animation}.png`);
    const where = `${character}/${animation}`;

    if (!existsSync(file)) { failures.push(`${where}: file missing at public/sprites`); continue; }
    if (!(animation in FPS)) { failures.push(`${where}: no frame rate in FPS`); continue; }

    const { width, height } = pngSize(file);
    checked++;

    if (height !== FRAME) failures.push(`${where}: frame height ${height}, expected ${FRAME}`);
    if (width % FRAME !== 0) failures.push(`${where}: strip width ${width} is not a multiple of ${FRAME}`);

    const actual = width / FRAME;
    if (actual !== claimed) failures.push(`${where}: manifest says ${claimed} frames, strip holds ${actual}`);
  }
}

/*
  The character on the panel is chosen by which feature contributes most to the
  logit. That is only meaningful if the decomposition IS the model — so
  reconstruct every asset's probability from the parts and check it lands on the
  value the model stored.
*/
const market = JSON.parse(readFileSync(path.join(ROOT, 'src/content/market.json'), 'utf8'));
const model = market.sentiment;
let reconstructed = 0;

for (const asset of market.assets ?? []) {
  const f = asset.sentiment?.features;
  if (!f) { failures.push(`${asset.symbol}: no sentiment features`); continue; }

  let logit = model.bias;
  for (let i = 0; i < f.length; i++) logit += model.weights[i] * ((f[i] - model.mean[i]) / model.std[i]);
  const p = 1 / (1 + Math.exp(-logit));

  const drift = Math.abs(p - asset.sentiment.probability);
  if (drift > 5e-4) {
    failures.push(`${asset.symbol}: logit decomposition gives ${p.toFixed(5)}, model stored ${asset.sentiment.probability} (off by ${drift.toExponential(2)})`);
  } else reconstructed++;
}

if (failures.length) {
  console.error(`\nsprites: ${failures.length} problem(s)\n`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  console.error('');
  process.exit(1);
}

console.log(`sprites: ${checked} strips verified — every frame ${FRAME}x${FRAME}, every count matches the manifest`);
console.log(`sprites: ${reconstructed} sentiment probabilities reconstructed from the feature decomposition the character selection uses`);
