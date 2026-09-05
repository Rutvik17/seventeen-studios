#!/usr/bin/env node
/**
 * HOW MUCH OF A SAMPLE COVARIANCE IS REAL?
 *
 * Marchenko-Pastur gives the band inside which eigenvalues are
 * indistinguishable from noise at a given sample size. This measures where the
 * engine's own returns actually fall.
 *
 * It is not a check that something works. It is a check on whether a covariance
 * is worth estimating at all — and the answer decides whether portfolio
 * optimisation, the vector form of Garleanu-Pedersen and risk parity are usable
 * here or are fitting noise.
 *
 * The implementation is validated against theory first: on pure Gaussian noise
 * the spectrum must fall inside the band with nothing above it. Without that
 * step the numbers below would be unfalsifiable.
 *
 * Run: npm run covariance   (part of `npm run verify`)
 */
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spectrum, noiseBand } from '../src/lib/engine/covariance.ts';

const ROOT = path.join(import.meta.dirname, '..');
const TAPE = path.join(ROOT, 'data', 'tape.json');
if (!existsSync(TAPE)) {
  console.log('covariance: no data/tape.json — skipping.');
  process.exit(0);
}

/*
  THE IMPLEMENTATION IS CHECKED AGAINST THEORY BEFORE IT IS BELIEVED.

  Pure Gaussian noise must produce a spectrum inside the Marchenko-Pastur band
  with nothing above it. If the Jacobi solver or the correlation were wrong, this
  is where it shows — and every number below would otherwise be a claim with no
  way to be false.
*/
function gauss() {
  let u = 0;
  let v = 0;
  while (!u) u = Math.random();
  while (!v) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
{
  const T = 500;
  const N = 100;
  const noise = Array.from({ length: T }, () => Array.from({ length: N }, gauss));
  const s = spectrum(noise);
  const b = noiseBand(T, N);
  console.log(`covariance: pure noise T=${T} N=${N} — band [${b.lower.toFixed(3)}, ${b.upper.toFixed(3)}], observed [${s.eigenvalues.at(-1).toFixed(3)}, ${s.eigenvalues[0].toFixed(3)}]`);
  if (s.signal > 2) {
    console.error(`covariance: FAIL — ${s.signal} noise eigenvalues above the band; the solver is wrong`);
    process.exit(1);
  }
}

const t = JSON.parse(readFileSync(TAPE, 'utf8'));
const { close, symbols, dates } = t;

/* A window of daily returns for names that printed every day in it. */
function window(end, days, maxNames) {
  const start = end - days;
  const cols = [];
  for (let s = 0; s < symbols.length && cols.length < maxNames; s++) {
    let ok = true;
    for (let d = start; d <= end; d++) if (!(close[d][s] > 0)) { ok = false; break; }
    if (ok) cols.push(s);
  }
  const rows = [];
  for (let d = start + 1; d <= end; d++) {
    rows.push(cols.map((s) => Math.log(close[d][s] / close[d-1][s])));
  }
  return rows;
}

console.log('');
console.log(`covariance: the engine’s own returns`);
console.log('  T     N    ratio   noise band        signal  share of variance  market eig');
let worst = null;
for (const [days, names] of [[250,100],[250,200],[500,200],[1000,300]]) {
  const rows = window(dates.length - 30, days, names);
  const s = spectrum(rows);
  if (!worst || s.signalShare < worst.share) worst = { share: s.signalShare, n: rows[0].length, t: rows.length, signal: s.signal };
  console.log(
    ' ' + String(rows.length).padStart(4), String(rows[0].length).padStart(5),
    s.band.ratio.toFixed(2).padStart(7),
    ('['+s.band.lower.toFixed(2)+', '+s.band.upper.toFixed(2)+']').padStart(15),
    String(s.signal).padStart(8),
    (s.signalShare*100).toFixed(1).padStart(15)+'%',
    s.market.toFixed(1).padStart(11));
}

console.log('');
console.log(`covariance: at T=${worst.t} and N=${worst.n}, ${worst.signal} eigenvalues carry ` +
  `${(worst.share * 100).toFixed(1)}% of variance — the other ${worst.n - worst.signal} directions ` +
  `(${((1 - worst.share) * 100).toFixed(1)}%) are indistinguishable from noise.`);
console.log('covariance: any method needing a full covariance is fitting that noise unless it clips first.');
