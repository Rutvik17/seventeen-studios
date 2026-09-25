/**
 * Runs every tracer (`src/lib/algorithms/traces/*.ts`) on every test case of
 * its problem and checks that the answer it arrives at is the expected one —
 * the same check, with the same comparison modes, as the solutions get. A
 * trace that draws a wrong answer is a failing test, not a picture.
 *
 *   node --experimental-strip-types scripts/algorithms/traces.mjs [slugs…]
 */
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadSpecs, same } from './test.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../../src/lib/algorithms/traces');
const filter = process.argv.slice(2).filter((a) => !a.startsWith('--'));

const tracers = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
  const m = await import(pathToFileURL(path.join(dir, f)).href);
  Object.assign(tracers, m.traces);
}

let fails = 0;
let checked = 0;
const specs = loadSpecs(filter);
for (const s of specs) {
  const t = tracers[s.slug];
  if (!t) {
    console.log(`✗ ${s.slug}: no tracer`);
    fails++;
    continue;
  }
  s.cases.forEach((c, i) => {
    const input = c.ops ? { ops: c.ops, args: c.args } : c.in;
    let tr;
    try {
      tr = t(structuredClone(input));
    } catch (e) {
      console.log(`✗ ${s.slug} case ${i}: threw ${e.message}`);
      fails++;
      return;
    }
    checked++;
    const got = JSON.parse(JSON.stringify(tr.result ?? null));
    const mode = c.compare ?? s.compare;
    const ok = c.ops ? got.length === c.out.length && got.every((g, j) => same(mode, g, c.out[j], c.args[j])) : same(mode, got, c.out, c.in);
    if (!ok) {
      console.log(`✗ ${s.slug} case ${i}: trace answered ${JSON.stringify(got).slice(0, 200)}, want ${JSON.stringify(c.out).slice(0, 200)}`);
      fails++;
    }
    if (!tr.steps.length) {
      console.log(`✗ ${s.slug} case ${i}: no steps`);
      fails++;
    }
    const bad = tr.steps.find((st) => typeof st.note !== 'string' || !st.note || !Array.isArray(st.panels));
    if (bad) {
      console.log(`✗ ${s.slug} case ${i}: malformed step`);
      fails++;
    }
  });
}
console.log(`\n${specs.length} tracers, ${checked} cases — ${fails ? `${fails} failing` : 'all correct'}`);
process.exit(fails ? 1 : 0);
