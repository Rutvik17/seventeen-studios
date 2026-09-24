/**
 * Paints the ground every page is laid on, once, and saves it as the pictures
 * the stylesheet loads:
 *
 *   src/assets/ground/wide.webp   for landscape screens
 *   src/assets/ground/tall.webp   for portrait ones
 *
 *   node scripts/make-ground.mjs
 *
 * The painting is the site's own brush (`paintPageGround` in
 * `src/lib/sketchbook/ground.ts`), run in headless Chrome, in the colours
 * `src/app/globals.css` declares — `--bg` under `--ground-1` … `-5` — the one
 * place they are written. Run it again whenever those change.
 *
 * The pictures live under `src/` rather than `public/` so the stylesheet can
 * name them with a relative `url()`: Next then serves them from `_next/`, with
 * the site's base path, which a literal path into `public/` would not get.
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './chrome.mjs';
import { serveScenes } from './scene-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'src/assets/ground');
const SIZES = { wide: [2400, 1500], tall: [1200, 2100] };

/** The ground's colours, as the stylesheet declares them. */
export function groundColours() {
  const css = readFileSync(path.join(root, 'src/app/globals.css'), 'utf8');
  const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`))?.[1];
  const tints = [1, 2, 3, 4, 5].map((i) => token(`ground-${i}`));
  const base = token('bg');
  if (!base || tints.some((t) => !t)) throw new Error('globals.css must declare --bg and --ground-1 … --ground-5 as #rrggbb');
  return { base, tints };
}

async function main() {
  const { base, tints } = groundColours();
  const page = `<!doctype html><html><head>
<script type="importmap">{"imports":{"@/":"/src/"}}</script></head><body><script type="module">
import { paintPageGround } from '@/lib/sketchbook/ground';
window.paint = (w, h) => paintPageGround(w, h, ${JSON.stringify(base)}, ${JSON.stringify(tints)}).toDataURL('image/webp', 0.78);
window.ready = true;
</script></body></html>`;
  const server = await serveScenes({ '/ground.html': page });
  const browser = await openPage({ width: 400, height: 300 });
  try {
    await browser.navigate(`${server.url}/ground.html`);
    for (let i = 0; i < 100 && !(await browser.evaluate('window.ready === true')); i += 1) await new Promise((r) => setTimeout(r, 100));
    if (browser.errors.length) throw new Error(browser.errors.join('\n'));
    mkdirSync(out, { recursive: true });
    for (const [name, [w, h]] of Object.entries(SIZES)) {
      const url = await browser.evaluate(`window.paint(${w}, ${h})`);
      const file = path.join(out, `${name}.webp`);
      writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log(`  ${path.relative(root, file)}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
