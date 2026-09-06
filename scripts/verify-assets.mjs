#!/usr/bin/env node
/**
 * Every local asset the exported HTML asks for must actually be there.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * This site is served from a GitHub PROJECT page, so it lives under `/<repo>`
 * rather than at a domain root. Next rewrites `basePath` for its own output and
 * for `next/link` / `next/image`, but NOT for a `src`, `href` or `fetch` string
 * written by hand. Those resolve against the root and 404 in production —
 * while working perfectly in dev, because dev has no base path to miss.
 *
 * `lib/asset.ts` is the fix and every hand-written public path is supposed to
 * go through it. That has now been forgotten twice: first the founder portrait
 * and the resume downloads, then the OLED sprite sheets, which left the panel
 * blank in production and correct on every local check.
 *
 * A rule nobody can see being broken is not a rule, so this stops relying on
 * remembering. It reads the built HTML, pulls out every local URL, and asserts
 * the file is on disk — which catches the missing prefix and also plain typos,
 * renames and deletions, regardless of how they got there.
 *
 * Run: node scripts/verify-assets.mjs   (part of `npm run postbuild`)
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'out');

/*
  Detect the base path from the BUILD, not from the environment.

  Reading NEXT_PUBLIC_BASE_PATH here would make the check depend on the shell
  that happens to run it: point it at an `out/` built with a prefix while the
  variable is unset and every single asset reports missing, which is a false
  alarm loud enough to train someone to ignore the script.

  The artifact already knows. Next emits its own chunks under `_next/`, which is
  always at the root of `out/`, so whatever precedes `/_next/` in the HTML is
  the prefix this build was made with.
*/
function detectBase(files) {
  for (const file of files) {
    const m = readFileSync(file, 'utf8').match(/["'(]([^"'()]*)\/_next\//);
    if (m) return m[1];
  }
  return '';
}

if (!existsSync(OUT)) {
  console.error('assets: no out/ directory — run `npm run build` first');
  process.exit(1);
}

function htmlFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (entry.endsWith('.html')) found.push(full);
  }
  return found;
}

/*
  Attribute values that name a file we shipped. Deliberately not a parser: the
  export is generated markup, and the shapes here are the ones Next and our own
  components emit.
*/
const ATTR = /(?:src|href|xlink:href)\s*=\s*"([^"]+)"/g;

const pages = htmlFiles(OUT);
const BASE = detectBase(pages);

const missing = new Map();
const unprefixed = new Map();
let checked = 0;

for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const page = path.relative(OUT, file);

  for (const [, url] of html.matchAll(ATTR)) {
    // Skip anything that is not a path to a file we shipped.
    if (!url.startsWith('/')) continue;                 // relative, anchor, or bare
    if (url.startsWith('//')) continue;                 // protocol-relative

    /*
      ROUTES ARE CHECKED FOR THE PREFIX, THEN SKIPPED.

      This used to `continue` on anything without a file extension, which meant
      it only ever looked at assets. A hand-written `<a href="/book/method/">`
      has no extension, so it sailed past — and on a project page that resolves
      against the domain ROOT and 404s.

      That is the same missing-prefix bug this script was written to catch,
      arriving through a route instead of an asset. The extension test now
      happens AFTER the prefix test rather than before it.
    */
    if (!path.extname(url)) {
      if (BASE && !url.startsWith(`${BASE}/`) && url !== BASE) {
        if (!unprefixed.has(url)) unprefixed.set(url, new Set());
        unprefixed.get(url).add(page);
      }
      continue;
    }

    /*
      Decode before touching the filesystem. Next emits dynamic-route chunks
      with the segment percent-encoded — `app/notebook/%5Bslug%5D/page-*.js` —
      while the file on disk is literally `[slug]`. Comparing the encoded form
      reports three files missing that are all present.
    */
    let clean = url.split('?')[0].split('#')[0];
    try {
      clean = decodeURIComponent(clean);
    } catch {
      // A malformed escape is not something to resolve — check it as written.
    }

    checked++;

    /*
      Two different failures, and conflating them is why the first version of
      this script passed the very bug it was written for.

      MISSING PREFIX is about the URL, not the disk. Under a base path the site
      is served from `/<repo>`, so a bare `/sprites/x.png` resolves to the
      DOMAIN ROOT and 404s -- while `out/sprites/x.png` sits there perfectly,
      present on disk and never reached. Checking existence alone therefore
      passes it, which it did. The prefix has to be asserted on its own.
    */
    if (BASE && !clean.startsWith(`${BASE}/`)) {
      if (!unprefixed.has(clean)) unprefixed.set(clean, new Set());
      unprefixed.get(clean).add(page);
      continue;
    }

    // MISSING FILE: correctly addressed, but not shipped.
    const rel = BASE ? clean.slice(BASE.length) : clean;
    if (existsSync(path.join(OUT, rel))) continue;

    if (!missing.has(clean)) missing.set(clean, new Set());
    missing.get(clean).add(page);
  }
}

function report(map, headline, hint) {
  console.error(`
assets: ${headline}
`);
  for (const [url, where] of map) {
    const list = [...where].slice(0, 3).join(', ');
    console.error(`  x ${url}`);
    console.error(`      referenced by ${list}${where.size > 3 ? ` (+${where.size - 3} more)` : ''}`);
    if (hint) console.error(`      ${hint}`);
  }
}

if (unprefixed.size) {
  report(
    unprefixed,
    `${unprefixed.size} URL(s) are missing the "${BASE}" prefix and will 404 in production`,
    'route it through asset() from lib/asset.ts',
  );
}
if (missing.size) report(missing, `${missing.size} referenced file(s) are not in out/`);
if (unprefixed.size || missing.size) {
  console.error('');
  process.exit(1);
}

console.log(
  `assets: ${checked} referenced files all present in out/` +
    (BASE ? ` (base path "${BASE}")` : ' (no base path)'),
);
