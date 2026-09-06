#!/usr/bin/env node
/**
 * HOW MUCH OF THE PANEL EACH SKY LIGHTS.
 *
 * ---
 * WHY THIS IS A TEST AND NOT A NOTE
 *
 * `oled.ts` sets SCENE_DRIVE to 0.271 — the mean per-subpixel drive of the
 * brightest backdrop — and the entire battery figure descends from it. At full
 * contrast that scene pulls 113 mA and the cell lasts 4.3 days, so the panel
 * runs at 34% contrast and lasts 10.7. The notebook states all four numbers.
 *
 * That constant was measured once, by hand, off the artwork as it stood. It is
 * the kind of number that goes quietly wrong: add a brighter sky and nothing
 * fails, no test goes red, and the published battery life simply becomes
 * fiction. An OLED draws in proportion to what it lights, so the art sets the
 * power budget — and art changes more often than constants get re-measured.
 *
 * So the measurement is repeatable. This renders every sky at the panel's real
 * 128 x 128 and reports what each one actually draws.
 *
 * ---
 * HOW IT MEASURES
 *
 * The panel is drawn to a canvas IN THE BROWSER and read back with
 * `getImageData`, rather than screenshotted and decoded here. Node has no PNG
 * decoder without a dependency, and the browser already has the pixels — this
 * is the same quantity either way: the mean of the three subpixels across all
 * 16,384 of them, which is what the driver's current scales with.
 *
 * Run: npm run drive   (needs a build in out/ and Chrome)
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';

import { SCENE_DRIVE, PANEL_CONTRAST } from '../src/lib/oled.ts';
import { TIMES_OF_DAY } from '../src/lib/backdrop.ts';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'out');
const PORT = 8123;

if (!existsSync(OUT)) {
  console.error('drive: no out/ — run `npm run build` first');
  process.exit(1);
}

/* The base path the build was made with, read off the build rather than the env. */
function detectBase(dir) {
  for (const entry of readFileSync(path.join(dir, 'index.html'), 'utf8').matchAll(/["'(]([^"'()]*)\/_next\//g)) {
    return entry[1];
  }
  return '';
}
const BASE = detectBase(OUT);

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.txt': 'text/plain', '.xml': 'application/xml',
};

const server = createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (BASE && url.startsWith(BASE)) url = url.slice(BASE.length) || '/';
  let file = path.join(OUT, url);
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404); return res.end('404');
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(PORT, r));

const CHROME = process.env.CHROME
  ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=9333',
  `--user-data-dir=${path.join(ROOT, 'node_modules', '.cache', 'drive-profile')}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--hide-scrollbars', '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let targets = null;
for (let i = 0; i < 80; i += 1) {
  try {
    targets = (await (await fetch('http://127.0.0.1:9333/json/list')).json()).filter((t) => t.type === 'page');
    if (targets.length) break;
  } catch { /* not up yet */ }
  await sleep(250);
}
if (!targets?.length) { console.error('drive: chrome never came up'); process.exit(1); }

const ws = new WebSocket(targets[0].webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) => new Promise((resolve) => {
  const n = ++id;
  pending.set(n, resolve);
  ws.send(JSON.stringify({ id: n, method, params }));
});

await send('Page.enable');
await send('Runtime.enable');

/*
  The hour is forced rather than waited for. `Date` is replaced before any of
  the page's own script runs, so the component's `new Date()` returns the hour
  under test — which is the only way to see four skies without running the
  check four times a day.
*/
const HOURS = { morning: 8, afternoon: 14, evening: 19, night: 23 };

const measured = [];
for (const time of TIMES_OF_DAY) {
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: `
      try { sessionStorage['seventeen:entered'] = '1'; } catch (e) {}
      (() => {
        const Real = Date;
        const fixed = new Real(2026, 0, 15, ${HOURS[time]}, 30, 0);
        function Fake(...args) {
          return args.length ? new Real(...args) : new Real(fixed);
        }
        Fake.prototype = Real.prototype;
        Fake.now = () => fixed.getTime();
        Fake.parse = Real.parse;
        Fake.UTC = Real.UTC;
        globalThis.Date = Fake;
      })();
    `,
  });

  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${BASE}/` });
  await sleep(3800);

  const { result } = await send('Runtime.evaluate', {
    awaitPromise: true,
    returnByValue: true,
    expression: `(async () => {
      /* The nested 128x128 viewBox is the panel itself. */
      const panel = document.querySelector('svg[viewBox="0 0 128 128"]');
      if (!panel) return JSON.stringify({ ok: false, why: 'panel not found' });

      const clone = panel.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('width', '128');
      clone.setAttribute('height', '128');

      /*
        THE GRADIENTS LIVE IN THE OUTER SVG AND MUST COME WITH IT.

        Every fill in the scene is a url(#id) into a <defs> on the housing SVG,
        one level up from the panel. Serialising the panel alone drops all of
        them, and an unresolved paint server renders as nothing — which read as
        a real measurement: 47% of the panel came back pure black and the sky
        scored 14.8% against the 27.1% on record. The number was not low
        because the artwork was dark, it was low because the sky was missing.
      */
      const root = panel.ownerSVGElement;
      if (!root) return JSON.stringify({ ok: false, why: 'panel has no outer svg' });
      const defs = root.querySelectorAll('defs');
      if (!defs.length) return JSON.stringify({ ok: false, why: 'no defs to carry over' });
      for (const d of defs) clone.insertBefore(d.cloneNode(true), clone.firstChild);

      /* Inline the sprite so the canvas is not tainted by an external href. */
      for (const img of clone.querySelectorAll('image')) {
        const href = img.getAttribute('href') || img.getAttribute('xlink:href');
        if (!href) continue;
        const blob = await (await fetch(href)).blob();
        const data = await new Promise((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result);
          fr.readAsDataURL(blob);
        });
        img.setAttribute('href', data);
        img.removeAttribute('xlink:href');
      }

      const svg = new XMLSerializer().serializeToString(clone);
      const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
      const bitmap = await new Promise((res, rej) => {
        const im = new Image();
        im.onload = () => res(im);
        im.onerror = () => rej(new Error('svg did not load'));
        im.src = url;
      });

      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(bitmap, 0, 0, 128, 128);
      const { data: px } = ctx.getImageData(0, 0, 128, 128);

      let sum = 0;
      let black = 0;
      for (let i = 0; i < px.length; i += 4) {
        const v = (px[i] + px[i + 1] + px[i + 2]) / 3;
        sum += v;
        if (v < 2) black += 1;
      }
      return JSON.stringify({
        ok: true,
        drive: sum / (128 * 128) / 255,
        blackShare: black / (128 * 128),
        png: c.toDataURL('image/png'),
      });
    })()`,
  });

  let parsed;
  try {
    parsed = JSON.parse(result.result.value);
  } catch {
    parsed = { ok: false, why: result.result.value ?? 'evaluate failed' };
  }
  if (parsed.png && process.argv.includes('--dump')) {
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync(path.join(ROOT, 'node_modules', '.cache', 'drive'), { recursive: true });
    writeFileSync(
      path.join(ROOT, 'node_modules', '.cache', 'drive', time + '.png'),
      Buffer.from(parsed.png.split(',')[1], 'base64'),
    );
  }
  delete parsed.png;
  measured.push({ time, ...parsed });
}

ws.close();
chrome.kill();
server.close();

console.log('\nmean per-subpixel drive, by sky\n');
console.log('sky          drive    at full contrast   at 34%');
console.log('-'.repeat(52));
let worst = 0;
let broken = 0;
for (const m of measured) {
  if (!m.ok) {
    console.log(`  x ${m.time.padEnd(10)} ${m.why}`);
    broken += 1;
    continue;
  }
  worst = Math.max(worst, m.drive);
  console.log(
    `  ${m.time.padEnd(11)}${(m.drive * 100).toFixed(1).padStart(5)}%`
    + `${(m.drive / SCENE_DRIVE * 113).toFixed(0).padStart(15)} mA`
    + `${(m.drive / SCENE_DRIVE * 38.4).toFixed(1).padStart(11)} mA`
    + `${(m.blackShare * 100).toFixed(0).padStart(9)}% unlit`,
  );
}

console.log('');
if (broken) {
  console.error(`drive: ${broken} sky/skies could not be measured`);
  process.exit(1);
}

/*
  The constant is a CEILING, not an average. It was measured off the brightest
  scene, and the battery figure holds only while no sky exceeds it.
*/
if (worst > SCENE_DRIVE + 0.005) {
  console.error(
    `drive: FAIL — the brightest sky draws ${(worst * 100).toFixed(1)}%, over the `
    + `${(SCENE_DRIVE * 100).toFixed(1)}% that oled.ts and the notebook are built on.`,
  );
  console.error('       Either darken the sky or re-measure SCENE_DRIVE and update the notebook with it.');
  process.exit(1);
}

console.log(
  `drive: ok — brightest sky is ${(worst * 100).toFixed(1)}%, within the `
  + `${(SCENE_DRIVE * 100).toFixed(1)}% SCENE_DRIVE the battery figure assumes `
  + `(panel runs at ${(PANEL_CONTRAST * 100).toFixed(0)}% contrast).`,
);
