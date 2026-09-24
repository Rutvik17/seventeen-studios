/**
 * Colours the globe's world map in crayon, once, and saves it as the pictures
 * the page loads:
 *
 *   public/notebook/earth/crayon-3072.webp   for large screens
 *   public/notebook/earth/crayon-2048.webp   for small ones
 *   public/notebook/earth/crayons.json       the crayon colours they were coloured with
 *
 *   node scripts/make-globe-sheet.mjs
 *
 * The colouring is the page's own code (`paintSheet` in `src/lib/globe/sheet.ts`,
 * with the marks from `marks.ts`), run in headless Chrome, with the crayon
 * colours read from `Globe.module.css` — the one place they are written. It
 * is the same every time, so there is no reason for every visitor's browser
 * to spend seconds doing it. Run it again whenever the marks, the colour data
 * or the crayon colours change; `verify-globe.mjs` fails the build if the
 * colours in the stylesheet no longer match the ones the pictures were made with.
 */

import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './chrome.mjs';
import { serveScenes } from './scene-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public/notebook/earth');
const WIDTHS = [3072, 2048];

/** The crayon colours, as the stylesheet declares them. */
export function crayonColours() {
  const css = readFileSync(path.join(root, 'src/components/notebook/Globe.module.css'), 'utf8');
  const colours = {};
  for (const [, name, value] of css.matchAll(/--globe-([a-z]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) colours[name] = value.toLowerCase();
  return colours;
}

async function main() {
  const colours = crayonColours();
  const page = `<!doctype html><html><head>
<script type="importmap">{"imports":{"@/":"/src/"}}</script></head><body><script type="module">
import { CRAYONS } from '@/lib/globe/colours';
import { marks } from '@/lib/globe/marks';
import { paintSheet } from '@/lib/globe/sheet';
const colours = ${JSON.stringify(colours)};
window.paint = (width) => {
  const sheet = paintSheet(width, marks().patches, CRAYONS.map((c) => colours[c]));
  // Laid on the paper, so the picture needs no see-through parts: flecks of
  // transparency cost far more to store than the same flecks in paper colour.
  const c = document.createElement('canvas');
  c.width = sheet.width;
  c.height = sheet.height;
  const g = c.getContext('2d');
  g.fillStyle = colours.paper;
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(sheet, 0, 0);
  return c.toDataURL('image/webp', 0.72);
};
window.ready = true;
</script></body></html>`;
  const server = await serveScenes({ '/sheet.html': page });
  const browser = await openPage({ width: 400, height: 300 });
  try {
    await browser.navigate(`${server.url}/sheet.html`);
    for (let i = 0; i < 100 && !(await browser.evaluate('window.ready === true')); i += 1) await new Promise((r) => setTimeout(r, 100));
    if (browser.errors.length) throw new Error(browser.errors.join('\n'));
    mkdirSync(out, { recursive: true });
    for (const width of WIDTHS) {
      const url = await browser.evaluate(`window.paint(${width})`);
      const file = path.join(out, `crayon-${width}.webp`);
      writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
      console.log(`  ${path.relative(root, file)}  ${(statSync(file).size / 1024).toFixed(0)} KB`);
    }
    writeFileSync(path.join(out, 'crayons.json'), `${JSON.stringify(colours, null, 2)}\n`);
  } finally {
    await browser.close();
    await server.close();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
