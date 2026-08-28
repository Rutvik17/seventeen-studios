#!/usr/bin/env node
/**
 * WHAT THE MODEL IS WORTH ONCE IT CAN ONLY TRADE WHAT WAS IN THE INDEX.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * The tracker carried "-69%" as the cost of survivorship bias, and that number
 * came from a run nobody kept. It could not be re-derived, checked, or updated
 * when the model changed — which makes it a belief rather than a measurement,
 * and this repo's whole discipline is that those are different things.
 *
 * This recomputes it from artifacts that are on disk, so it can be run again
 * after any retrain and disagreed with by anyone.
 *
 * ---
 * WHAT IS MEASURED
 *
 * The information coefficient: the rank correlation, on each day, between what
 * the model said about a name and what that name actually did over the next 21
 * trading days relative to the market. Averaged across days, it is the cleanest
 * one-number answer to "does the score know anything".
 *
 * It is computed twice on identical scores:
 *
 *   ALL      every name the tape scores — the universe as it stands today
 *   MEMBERS  only names that were in the index ON THAT DAY
 *
 * The gap is the part of the apparent skill that came from hindsight about
 * which companies would later be worth including.
 *
 * ---
 * WHAT IT CANNOT SEE
 *
 * Deletions. A company dropped from the index after failing is correctly absent
 * from the later snapshots, but its prices were never fetched, so the book
 * could not have traded it either way. This measures the ADDITIONS half, which
 * makes every figure below a floor on the true bias.
 *
 * Run: node scripts/verify-survivorship.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const HORIZON = 21;

const tape = JSON.parse(readFileSync(path.join(ROOT, 'data', 'tape.json'), 'utf8'));
const membership = JSON.parse(readFileSync(path.join(ROOT, 'data', 'membership.json'), 'utf8'));
const { symbols, dates, scores, close, market } = tape;

/*
  Membership on every trading day, carried forward from the last snapshot.

  Carrying forward is the honest default: between two readings the index is
  whatever it last was, and assuming otherwise would invent changes. It also
  means the sparse middle years (one snapshot in 2017, one in 2018, none in
  2019) hold a stale list for a long time — which understates the correction
  there rather than overstating it.
*/
const snaps = membership.snapshots;
const memberAt = [];
let cursor = -1;
for (const date of dates) {
  while (cursor + 1 < snaps.length && snaps[cursor + 1].date <= date) cursor += 1;
  memberAt.push(cursor < 0 ? null : snaps[cursor].set ?? (snaps[cursor].set = new Set(snaps[cursor].symbols)));
}

/** Ranks, averaging ties. Spearman is Pearson on these. */
function rank(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
  const out = new Array(values.length);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1][0] === order[i][0]) j += 1;
    const shared = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) out[order[k][1]] = shared;
    i = j + 1;
  }
  return out;
}

function spearman(a, b) {
  if (a.length < 20) return null; // too few names to mean anything
  const ra = rank(a);
  const rb = rank(b);
  const n = ra.length;
  const ma = ra.reduce((s, v) => s + v, 0) / n;
  const mb = rb.reduce((s, v) => s + v, 0) / n;
  let num = 0; let da = 0; let db = 0;
  for (let i = 0; i < n; i++) {
    const x = ra[i] - ma;
    const y = rb[i] - mb;
    num += x * y; da += x * x; db += y * y;
  }
  return da && db ? num / Math.sqrt(da * db) : null;
}

const icAll = [];
const icMembers = [];
let rowsAll = 0;
let rowsMembers = 0;

for (let t = 0; t + HORIZON < dates.length; t++) {
  const members = memberAt[t];
  if (!members) continue;

  const marketReturn = market[t + HORIZON].close / market[t].close - 1;

  const sAll = []; const rAll = [];
  const sMem = []; const rMem = [];

  for (let i = 0; i < symbols.length; i++) {
    const score = scores[t][i];
    if (score === null || !Number.isFinite(score)) continue;
    const p0 = close[t][i];
    const p1 = close[t + HORIZON][i];
    if (!(p0 > 0) || !(p1 > 0)) continue;

    // Excess over the market, which is what the model was trained to predict.
    const excess = p1 / p0 - 1 - marketReturn;
    sAll.push(score); rAll.push(excess);
    if (members.has(symbols[i])) { sMem.push(score); rMem.push(excess); }
  }

  rowsAll += sAll.length;
  rowsMembers += sMem.length;

  const a = spearman(sAll, rAll);
  const m = spearman(sMem, rMem);
  if (a !== null) icAll.push({ date: dates[t], ic: a });
  if (m !== null) icMembers.push({ date: dates[t], ic: m });
}

const mean = (xs) => xs.reduce((s, v) => s + v.ic, 0) / xs.length;
const meanAll = mean(icAll);
const meanMembers = mean(icMembers);
const drop = (meanMembers - meanAll) / meanAll;

const pct = (v) => `${(v * 100).toFixed(1)}%`;
const ic = (v) => `${v >= 0 ? '+' : ''}${v.toFixed(4)}`;

console.log('');
console.log(`survivorship: ${icAll.length} days scored, horizon ${HORIZON}d, excess of market`);
console.log(`survivorship: ${rowsAll.toLocaleString()} name-days in the full universe`);
console.log(`survivorship: ${rowsMembers.toLocaleString()} once membership is dated ` +
  `— ${pct(1 - rowsMembers / rowsAll)} dropped`);
console.log('');
console.log('  period        all names   index members   change');

/* Six equal periods, so the shape over time is visible rather than just a mean. */
const buckets = 6;
const size = Math.ceil(icAll.length / buckets);
const rows = [];
for (let b = 0; b < buckets; b++) {
  const sliceAll = icAll.slice(b * size, (b + 1) * size);
  if (!sliceAll.length) break;
  const from = sliceAll[0].date.slice(0, 7);
  const to = sliceAll[sliceAll.length - 1].date.slice(0, 7);
  const sliceMem = icMembers.filter((d) => d.date >= sliceAll[0].date && d.date <= sliceAll[sliceAll.length - 1].date);
  const a = mean(sliceAll);
  const m = mean(sliceMem);
  rows.push({ from, to, all: a, members: m, change: (m - a) / a });
  console.log(`  ${from}–${to}   ${ic(a).padStart(8)}   ${ic(m).padStart(11)}   ${pct((m - a) / a).padStart(7)}`);
}

console.log('  ' + '-'.repeat(52));
console.log(`  overall       ${ic(meanAll).padStart(8)}   ${ic(meanMembers).padStart(11)}   ${pct(drop).padStart(7)}`);
console.log('');

const positiveAll = icAll.filter((d) => d.ic > 0).length / icAll.length;
const positiveMem = icMembers.filter((d) => d.ic > 0).length / icMembers.length;
console.log(`survivorship: days positive ${pct(positiveAll)} -> ${pct(positiveMem)}`);
console.log('survivorship: a FLOOR — deletions cannot be measured, only additions');

const out = path.join(ROOT, 'data', 'survivorship-measured.json');
writeFileSync(out, `${JSON.stringify({
  measuredAt: new Date().toISOString(),
  method: `Spearman IC of score against ${HORIZON}-day excess return, daily, versus the same scores restricted to dated index membership`,
  membershipSource: membership.source,
  snapshots: snaps.length,
  membershipRange: [membership.first, membership.last],
  days: icAll.length,
  rowsAll,
  rowsMembers,
  rowsDroppedShare: +(1 - rowsMembers / rowsAll).toFixed(4),
  meanIC: { all: +meanAll.toFixed(5), members: +meanMembers.toFixed(5) },
  change: +drop.toFixed(4),
  daysPositive: { all: +positiveAll.toFixed(4), members: +positiveMem.toFixed(4) },
  periods: rows.map((r) => ({ ...r, all: +r.all.toFixed(5), members: +r.members.toFixed(5), change: +r.change.toFixed(4) })),
  isLowerBound: true,
}, null, 2)}\n`);
console.log(`survivorship: wrote data/survivorship-measured.json`);
