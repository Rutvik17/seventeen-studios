/**
 * The archive: append-only, plain CSV, partitioned by year.
 *
 *   npm run archive
 *
 * Run after the fetchers. Everything they pulled into `data/` is transient and
 * gitignored; this promotes the parts that cannot be re-fetched later into
 * `archive/`, which IS committed.
 *
 * ---
 * WHY ANY OF THIS, WHEN THE FETCHERS ALREADY WORK
 *
 * Because three of the four sources quietly destroy history.
 *
 * Yahoo purges delisted symbols outright — SIVB, FRC, ATVI, XLNX, TWTR, CERN,
 * ANSS and NLOK were all tested and all eight return 404. The day a holding is
 * acquired, its entire price history stops existing, and a backtest run
 * afterwards silently loses it. That is survivorship bias arriving in real time.
 *
 * The constituent list only ever describes TODAY. There is no endpoint for
 * "who was in the index in 2019", which is exactly why the backtest cannot fix
 * survivorship retroactively. It is entirely fixable going forward, and only by
 * writing the list down every week.
 *
 * XBRL restatements overwrite. The frames API returns what a company says NOW
 * about 2019, not what it said in 2019.
 *
 * ---
 * WHY PLAIN CSV AND EXPLICITLY NOT GZIP
 *
 * Git already zlib-compresses every object it stores, so compressing first buys
 * nothing — and it destroys the property that matters. Git delta-compresses TEXT
 * between versions, storing only what changed, so appending 503 rows to a plain
 * CSV costs about 23 KB in the pack. The same append to a gzipped file rewrites
 * the whole opaque blob: a 25 MB commit, every day, forever.
 *
 * Partitioned by year for the same reason. Only the current year's file is ever
 * touched; the other sixteen are frozen and cost nothing after their first
 * commit.
 *
 * ---
 * WHY ROWS ARE ONLY EVER ADDED
 *
 * Nothing here updates or deletes. A restatement, a revision, or an index change
 * appends a new row carrying the date we SAW it, next to the old one.
 *
 * That is what makes the archive point-in-time rather than merely a backup:
 * "what did we know on 2019-03-14" becomes a query instead of something we had
 * to have been careful about at write time. It also means a bug in tonight's
 * fetch cannot destroy what was correctly recorded last year — the worst it can
 * do is add a wrong row that is visibly dated.
 */

import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync, appendFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const archiveDir = path.join(root, 'archive');

const today = new Date().toISOString().slice(0, 10);

function read(name) {
  const file = path.join(dataDir, name);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

/** Dates already present in a year's price file, so appends never duplicate. */
function existingDates(file) {
  if (!existsSync(file)) return new Set();
  const seen = new Set();
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const comma = line.indexOf(',');
    if (comma > 0) seen.add(line.slice(0, comma));
  }
  return seen;
}

function archivePrices(prices) {
  const dir = path.join(archiveDir, 'prices');
  mkdirSync(dir, { recursive: true });

  /*
    Grouped by year, then by date, so each year's file is written once. Bars are
    keyed date-first because that is the column an append checks against and the
    order a human reads.
  */
  const byYear = new Map();
  for (const [symbol, bars] of Object.entries(prices.bars)) {
    for (const b of bars) {
      const y = b.d.slice(0, 4);
      let rows = byYear.get(y);
      if (!rows) byYear.set(y, (rows = []));
      rows.push(`${b.d},${symbol},${b.o ?? ''},${b.h ?? ''},${b.l ?? ''},${b.c},${b.v},${b.dv ?? ''}`);
    }
  }

  let added = 0;
  let files = 0;
  for (const [year, rows] of [...byYear.entries()].sort()) {
    const file = path.join(dir, `${year}.csv`);
    rows.sort();

    if (!existsSync(file)) {
      writeFileSync(file, `date,symbol,open,high,low,close,volume,dollar_volume\n${rows.join('\n')}\n`);
      added += rows.length;
      files++;
      continue;
    }

    /*
      Append only the DATES that are new, never individual rows.

      Checking row-by-row would let a partially-written session leave a year half
      populated for one day and then never notice, because the dates that did
      land would look complete. A date is either fully archived or not archived.
    */
    const have = existingDates(file);
    const fresh = rows.filter((r) => !have.has(r.slice(0, r.indexOf(','))));
    if (!fresh.length) continue;
    appendFileSync(file, `${fresh.join('\n')}\n`);
    added += fresh.length;
    files++;
  }
  return { added, files, years: byYear.size };
}

function archiveConstituents(prices) {
  const dir = path.join(archiveDir, 'constituents');
  mkdirSync(dir, { recursive: true });

  /*
    One snapshot per day the archive runs, and the filename IS the timestamp.

    Cheap — about 30 KB — and the single highest-value row in this whole file.
    This is not the ONLY way to recover point-in-time membership — the
    constituents repository is a git repo, so reading its file at past commits
    gives 110 states back to 2012, and `scripts/fetch-membership.mjs` does
    exactly that. But that history is uneven, with one snapshot in 2017 and none
    in 2019, and it is somebody else's repository to rewrite. This archive is
    ours, weekly, and every week without
    a snapshot is a week permanently missing from a dataset that only gets more
    valuable with age.
  */
  const file = path.join(dir, `${today}.csv`);
  if (existsSync(file)) return { written: false, count: 0 };

  const rows = prices.universe.map((u) => `${u.symbol},${u.cik},"${u.name}","${u.sector}","${u.industry}"`);
  writeFileSync(file, `symbol,cik,name,sector,industry\n${rows.join('\n')}\n`);
  return { written: true, count: rows.length };
}

function archiveFundamentals(fundamentals) {
  const dir = path.join(archiveDir, 'fundamentals');
  mkdirSync(dir, { recursive: true });

  /*
    Keyed by the quarter the FACT describes, with `seen` recording when we
    observed it. A restatement therefore lands as a second row for the same
    period rather than replacing the first, which is the whole point — the
    difference between the two IS the restatement, and it is invisible to
    anyone who only ever kept the latest value.
  */
  const byQuarter = new Map();
  for (const [symbol, roles] of Object.entries(fundamentals.facts)) {
    for (const [role, list] of Object.entries(roles)) {
      for (const f of list) {
        const q = `${f.end.slice(0, 4)}Q${Math.ceil(Number(f.end.slice(5, 7)) / 3)}`;
        let rows = byQuarter.get(q);
        if (!rows) byQuarter.set(q, (rows = new Map()));
        rows.set(`${symbol},${role}`, `${symbol},${role},${f.end},${f.val},${f.from},${f.tag},${today}`);
      }
    }
  }

  let added = 0;
  for (const [quarter, rows] of [...byQuarter.entries()].sort()) {
    const file = path.join(dir, `${quarter}.csv`);
    const lines = [...rows.values()].sort();

    if (!existsSync(file)) {
      writeFileSync(file, `symbol,role,period_end,value,available_from,tag,seen\n${lines.join('\n')}\n`);
      added += lines.length;
      continue;
    }
    // A row is new if this exact observation is not already recorded. Same fact
    // with a different value is a restatement and SHOULD append.
    const have = new Set(readFileSync(file, 'utf8').split('\n'));
    const fresh = lines.filter((l) => !have.has(l));
    if (!fresh.length) continue;
    appendFileSync(file, `${fresh.join('\n')}\n`);
    added += fresh.length;
  }
  return added;
}

function main() {
  mkdirSync(archiveDir, { recursive: true });

  const prices = read('prices.json');
  if (!prices) throw new Error('data/prices.json missing — run `npm run data:prices` first');

  const p = archivePrices(prices);
  console.log(`  prices        ${p.added.toLocaleString()} rows added across ${p.files} of ${p.years} year files`);

  const c = archiveConstituents(prices);
  console.log(`  constituents  ${c.written ? `snapshot ${today}, ${c.count} names` : `already snapshotted today`}`);

  const fundamentals = read('fundamentals.json');
  if (fundamentals) {
    const n = archiveFundamentals(fundamentals);
    console.log(`  fundamentals  ${n.toLocaleString()} observations added`);
  }

  let bytes = 0;
  let count = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else { bytes += statSync(full).size; count++; }
    }
  };
  walk(archiveDir);
  console.log(`\n  archive/ now ${count} files, ${(bytes / 1024 / 1024).toFixed(1)} MB of plain CSV`);
  console.log('  (git zlib-compresses this in the pack; do not gzip it here or daily deltas break)');
}

try {
  main();
} catch (error) {
  console.error(`archive failed: ${error.message}`);
  process.exit(1);
}
