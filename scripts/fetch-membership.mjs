#!/usr/bin/env node
/**
 * POINT-IN-TIME INDEX MEMBERSHIP, RECOVERED.
 *
 * ---
 *
 * WHY THIS IS POSSIBLE AT ALL
 *
 * Every note in this repo says historical S&P 500 membership is unrecoverable
 * and that the weekly `archive/constituents/` snapshots are the only fix,
 * working forward from August 2026. That was wrong.
 *
 * The constituents list this project already fetches lives in a GIT REPOSITORY,
 * and a git repository is a point-in-time database of its own file. Reading
 * `data/constituents.csv` at each commit that touched it gives the index as it
 * stood on that date — 194 snapshots between 2012-12-27 and 2026-08-20, which
 * covers the whole backtest rather than the three years going forward.
 *
 * ---
 * WHAT IT IS NOT
 *
 * The snapshots are UNEVEN. Dense lately, sparse in the middle:
 *
 *     2013: 7   2014: 7   2015: 2   2016: 5   2017: 1   2018: 1   2019: 0
 *     2020: 10  2021: 28  2022: 1   2023: 41  2024: 52  2025: 15  2026: 23
 *
 * Between snapshots membership is carried forward, so 2017 to 2019 is held
 * from a single 2017 reading for roughly two years. Changes inside that window
 * are invisible, which means the correction this produces is a FLOOR on the
 * bias in exactly the years where the model looked strongest.
 *
 * It also cannot resurrect a delisted company's prices. A name dropped from the
 * index after failing leaves the membership list here, correctly — but its
 * price history was never fetched, so the book still cannot have traded it.
 * This fixes the ADDITIONS half of survivorship, not the deletions half.
 *
 * Run: node scripts/fetch-membership.mjs   (cached; --refresh to re-fetch)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'data', 'membership.json');
const REPO = 'datasets/s-and-p-500-companies';
const FILE = 'data/constituents.csv';

const REFRESH = process.argv.includes('--refresh');

const UA = {
  'User-Agent': 'seventeen-studios-membership/1.0 (+https://github.com/Rutvik17/seventeen-studios)',
  Accept: 'application/vnd.github+json',
};

async function commits() {
  const found = [];
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.github.com/repos/${REPO}/commits?path=${FILE}&per_page=100&page=${page}`;
    const res = await fetch(url, { headers: UA });
    if (!res.ok) throw new Error(`commits page ${page}: HTTP ${res.status}`);
    const batch = await res.json();
    if (!batch.length) break;
    for (const c of batch) found.push({ sha: c.sha, date: c.commit.author.date.slice(0, 10) });
    if (batch.length < 100) break;
  }
  // Oldest first, so carrying forward is a single pass.
  return found.sort((a, b) => (a.date < b.date ? -1 : 1));
}

/**
 * Symbols from one revision of the CSV.
 *
 * Fetched from raw.githubusercontent at the commit SHA rather than through the
 * API: raw content is CDN-served and not counted against the 60-per-hour
 * unauthenticated API budget, which 194 revisions would otherwise exhaust three
 * times over.
 */
async function snapshot(sha) {
  const res = await fetch(`https://raw.githubusercontent.com/${REPO}/${sha}/${FILE}`, {
    headers: { 'User-Agent': UA['User-Agent'] },
  });
  if (!res.ok) throw new Error(`snapshot ${sha.slice(0, 8)}: HTTP ${res.status}`);
  const text = await res.text();

  const [header, ...rows] = text.trim().split('\n');
  const cols = header.split(',').map((c) => c.trim().replace(/^"|"$/g, '').toLowerCase());
  const at = cols.indexOf('symbol');
  if (at < 0) throw new Error(`snapshot ${sha.slice(0, 8)}: no "symbol" column — the schema moved`);

  const symbols = [];
  for (const row of rows) {
    // The name column is quoted and contains commas, so a naive split is wrong
    // for later fields — but symbol is first and never quoted, which is why
    // this only ever reads column 0.
    const cell = row.split(',')[at];
    if (cell) symbols.push(cell.trim().replace(/^"|"$/g, '').toUpperCase());
  }
  if (symbols.length < 400) throw new Error(`snapshot ${sha.slice(0, 8)}: only ${symbols.length} names`);
  return symbols;
}

if (existsSync(OUT) && !REFRESH) {
  const cached = JSON.parse(readFileSync(OUT, 'utf8'));
  console.log(`membership: cached — ${cached.snapshots.length} snapshots, ${cached.first} to ${cached.last}`);
  console.log('membership: pass --refresh to re-fetch');
  process.exit(0);
}

const list = await commits();
console.log(`membership: ${list.length} revisions, ${list[0].date} to ${list[list.length - 1].date}`);

const snapshots = [];
for (const [i, c] of list.entries()) {
  try {
    const symbols = await snapshot(c.sha);
    snapshots.push({ date: c.date, symbols });
    if ((i + 1) % 25 === 0) console.log(`  ${i + 1}/${list.length}…`);
  } catch (error) {
    // One unreadable revision is survivable — the previous one carries forward,
    // which is what happens between snapshots anyway.
    console.warn(`  ! ${c.date}: ${error.message}`);
  }
}

// Collapse consecutive identical lists. Most commits touch formatting or a
// single name; storing 194 near-copies of 500 symbols is 40x the data for
// nothing.
const kept = [];
for (const s of snapshots) {
  const previous = kept[kept.length - 1];
  if (previous && previous.symbols.length === s.symbols.length
    && previous.symbols.every((v, i) => v === s.symbols[i])) continue;
  kept.push(s);
}

mkdirSync(path.dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify({
  source: `https://github.com/${REPO} @ ${FILE}`,
  fetchedAt: new Date().toISOString(),
  first: kept[0].date,
  last: kept[kept.length - 1].date,
  note: 'Membership is exact on each snapshot date and carried forward until the next.',
  snapshots: kept,
})}\n`);

const bytes = readFileSync(OUT).length;
console.log(`membership: ${snapshots.length} read, ${kept.length} distinct after collapsing`);
console.log(`membership: wrote ${(bytes / 1024).toFixed(0)} KB to data/membership.json`);
