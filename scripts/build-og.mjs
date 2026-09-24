/**
 * Generates the Open Graph share images.
 *
 *   npm run og            — all of them
 *   npm run og -- grasp   — only the cards whose file name contains "grasp"
 *
 * Writes `public/og/<name>.png`, one per route, committed to the repo. Wired
 * into metadata by `src/lib/og.ts`, which is the file that decides which route
 * gets which image.
 *
 * ---
 *
 * WHY THESE ARE BUILT AHEAD OF TIME RATHER THAN ON REQUEST
 *
 * The site is `output: 'export'` — a directory of files on GitHub Pages with
 * nothing running behind it. `opengraph-image.tsx` and `next/og` both want a
 * request to render on, so neither is available. Generating ahead of time and
 * committing the result is not a workaround here; it is the only shape that
 * fits.
 *
 * ---
 *
 * WHY THE ARTWORK IS COMPUTED RATHER THAN DRAWN
 *
 * Every plate below is produced by the same code the page it advertises uses —
 * `CURVES[0]` draws the parabola, the landing's card lists the landing's own
 * chapters, and the founder card's bridge is the sketchbook's own geometry.
 * Nothing is traced by eye.
 *
 * That is not craft for its own sake. A share image is the one asset nobody
 * looks at again after the day it is made, and a hand-drawn approximation of a
 * curve would sit there misrepresenting the page for years. Deriving it means
 * the picture is wrong only if the page is wrong.
 */

import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { careerStart, founder } from '../src/content/founder.ts';
import { site, chapters } from '../src/content/studio.ts';
import { graspInfo, graspModule } from '../src/content/grasp.ts';
import { notebook } from '../src/content/notebook.ts';
import { formatDate, spell } from '../src/lib/time.ts';
import { CURVES } from '../src/lib/calculus.ts';
import { bridge, cableY, PAGE, SUN } from '../src/lib/sketchbook/geometry.ts';
import { SITE_HOST } from '../src/lib/url.ts';
import { fileUrl, openPage } from './chrome.mjs';
import { serveScenes } from './scene-server.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'og');

/* ------------------------------------------------------------------ *
 * The canvas
 * ------------------------------------------------------------------ */

/*
  1200 x 630 at a device pixel ratio of 1.

  The Facebook/LinkedIn/Slack recommendation, and every one of them scales the
  image DOWN to display it — so rendering at 2x would double the bytes committed
  to the repository to sharpen an image nobody sees at full size. Flat vector
  artwork at 1x stays crisp because there is no photographic detail to lose.
*/
const W = 1200;
const H = 630;

const PAPER = '#f2e7d2';
const GRAPHITE = '#1d1d21';
const ACCENT = '#1f3a8a';
const SLATE = '#2d4a3f';
const SLATE_DEEP = '#243c33';
const CHALK = '#eef1e6';
const CHALK_ACCENT = '#f0d266';

/** The 17 mark, from `components/Logo.tsx`. */
const LOGO = {
  viewBox: '0 0 36 26',
  one: 'M13 0V26H6.5V6.5L1.5 9.5V3L7.5 0Z',
  seven: 'M19 0H36V5.5L27 26H20L29 6H19Z',
};

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const n = (v) => Number(v.toFixed(2));
const capitalise = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ------------------------------------------------------------------ *
 * Plates — the artwork, one per kind of page
 * ------------------------------------------------------------------ *
 *
 * Each returns SVG markup sized to the box it is handed. They are pure
 * functions of the site's own data, so a plate changes when the page does.
 */

function polyline(pts, stroke, width = 3, extra = '') {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}

/* ------------------------------------------------------------------ *
 * The contents page
 * ------------------------------------------------------------------ */

/**
 * The landing's own contents, from the same `chapters` the page lists: a
 * handwritten heading, then each chapter's number and title on a dashed rule.
 */
function plateContents(w, h, ink, accent) {
  const rowH = (h - 96) / chapters.length;
  const rows = chapters
    .map((c, i) => {
      const y = 96 + i * rowH + rowH / 2;
      return `
        <text x="0" y="${n(y + 10)}" fill="${accent}" font-family="Caveat, cursive" font-size="40">${i + 1}</text>
        <text x="64" y="${n(y + 10)}" fill="${ink}" font-family="Syne, sans-serif" font-weight="700" font-size="34" letter-spacing="-1">${esc(c.title)}</text>
        <line x1="0" y1="${n(y + rowH / 2)}" x2="${w}" y2="${n(y + rowH / 2)}" stroke="${ink}" stroke-opacity="0.3" stroke-width="1.5" stroke-dasharray="5 6"/>`;
    })
    .join('');
  return `
    <text x="0" y="52" fill="${ink}" font-family="Caveat, cursive" font-size="54">Contents</text>
    <line x1="0" y1="78" x2="${w}" y2="78" stroke="${ink}" stroke-opacity="0.5" stroke-width="2"/>
    ${rows}`;
}

/* ------------------------------------------------------------------ *
 * The sketchbook
 * ------------------------------------------------------------------ */

const SKETCH = { paper: '#f3ead5', ink: '#1f3a8a', graphite: '#34343a', accent: '#c8233f' };

/**
 * The founder card: the bridge the sketchbook ends on, from the same geometry,
 * with the same crimson wash on its cables and the sun behind the tower.
 */
function stageSketch() {
  const s = 0.54;
  const ox = W - PAGE.w * s + 30;
  const oy = (H - PAGE.h * s) / 2 - 10;
  const parts = bridge();
  const lines = parts
    .map((p) => {
      const faint = p.id.startsWith('water') || p.id.startsWith('dim');
      return `<polyline points="${p.pts.map((q) => `${n(q.x)},${n(q.y)}`).join(' ')}" fill="none" stroke="${faint ? SKETCH.graphite : SKETCH.ink}" stroke-width="${n(1.5 * p.weight)}" stroke-linecap="round" stroke-linejoin="round" opacity="${faint ? 0.5 : 0.95}"/>`;
    })
    .join('');
  const wash = parts
    .filter((p) => p.id.startsWith('cable'))
    .map((p) => `<polyline points="${p.pts.map((q) => `${n(q.x)},${n(q.y - 3)}`).join(' ')}" fill="none" stroke="${SKETCH.accent}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.14"/>`)
    .join('');
  const gridLines = [];
  for (let x = 0; x <= W; x += 28) gridLines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="${SKETCH.graphite}" stroke-opacity="${x % 140 === 0 ? 0.09 : 0.045}"/>`);
  for (let y = 0; y <= H; y += 28) gridLines.push(`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="${SKETCH.graphite}" stroke-opacity="${y % 140 === 0 ? 0.09 : 0.045}"/>`);
  // Asserting the geometry the card relies on, so a change to the bridge cannot
  // quietly leave the sun hanging somewhere other than behind the tower.
  if (!(cableY(600) > SUN.y)) throw new Error('bridge geometry changed: cable no longer sags below the sun');
  return `
    <rect width="${W}" height="${H}" fill="${SKETCH.paper}"/>
    ${gridLines.join('')}
    <line x1="72.5" y1="0" x2="72.5" y2="${H}" stroke="${SKETCH.ink}" stroke-opacity="0.2"/>
    <g transform="translate(${n(ox)}, ${n(oy)}) scale(${s})">
      <circle cx="${SUN.x}" cy="${SUN.y}" r="${SUN.r}" fill="${SKETCH.accent}" opacity="0.14" stroke="${SKETCH.accent}" stroke-opacity="0.2" stroke-width="3"/>
      ${wash}
      ${lines}
    </g>`;
}

/* ------------------------------------------------------------------ *
 * Stage plates — artwork that fills the whole card
 * ------------------------------------------------------------------ */

/** The Grasp course: the chalkboard, mid-derivation. */
function stageChalkboard() {
  const curve = CURVES[0];
  const domain = [-2.6, 2.6];
  const range = [-1, 7.5];
  const ox = 660;
  const oy = 120;
  const bw = 470;
  const bh = 400;

  const fx = (v) => ox + ((v - domain[0]) / (domain[1] - domain[0])) * bw;
  const fy = (v) => oy + bh - ((v - range[0]) / (range[1] - range[0])) * bh;

  const pts = [];
  for (let x = domain[0]; x <= domain[1] + 1e-9; x += 0.05) {
    pts.push([fx(x), fy(curve.f(x))]);
  }

  const at = 1.4;
  const slope = curve.exact(at);
  const span = 1.15;

  return `
    <rect width="${W}" height="${H}" fill="${SLATE}"/>
    <rect width="${W}" height="${H}" fill="url(#slateWash)"/>
    <line x1="${n(fx(domain[0]))}" y1="${n(fy(0))}" x2="${n(fx(domain[1]))}" y2="${n(fy(0))}" stroke="${CHALK}" stroke-width="2" opacity="0.45"/>
    <line x1="${n(fx(0))}" y1="${n(fy(range[0]))}" x2="${n(fx(0))}" y2="${n(fy(range[1]))}" stroke="${CHALK}" stroke-width="2" opacity="0.45"/>
    ${polyline(
      [
        [fx(at - span), fy(curve.f(at) - slope * span)],
        [fx(at + span), fy(curve.f(at) + slope * span)],
      ],
      CHALK_ACCENT,
      3,
      'opacity="0.95"',
    )}
    ${polyline(pts, CHALK, 4, 'opacity="0.95"')}
    <circle cx="${n(fx(at))}" cy="${n(fy(curve.f(at)))}" r="7" fill="${CHALK_ACCENT}"/>
    <text x="${n(fx(at) + 18)}" y="${n(fy(curve.f(at)) - 16)}" fill="${CHALK_ACCENT}" font-family="Caveat, cursive" font-size="34" opacity="0.95">slope = 2x</text>`;
}

/** The mark, for pages whose subject is the site itself. */
/** The notebook: a ruled page, blank, with a pencil resting across it. */
function plateBlank(w, h, ink, accent) {
  const lines = [];
  for (let y = 70; y < h - 20; y += 44) lines.push(`<line x1="0" y1="${y}" x2="${w}" y2="${y}" stroke="${accent}" stroke-opacity="0.3" stroke-width="1.5"/>`);
  return `
    <rect width="${w}" height="${h}" fill="#faf3e5" stroke="${ink}" stroke-opacity="0.2"/>
    <line x1="40" y1="0" x2="40" y2="${h}" stroke="#c8233f" stroke-opacity="0.35" stroke-width="1.5"/>
    ${lines.join('')}
    <g transform="translate(${w * 0.28}, ${h * 0.72}) rotate(-24)">
      <path d="M0 0 L22 -9 L22 9 Z" fill="${ink}"/>
      <path d="M22 -9 L56 -18 L56 18 L22 9 Z" fill="#e6c89a" stroke="${ink}" stroke-width="2"/>
      <rect x="56" y="-18" width="210" height="36" fill="${accent}" stroke="${ink}" stroke-width="2"/>
      <rect x="266" y="-18" width="20" height="36" fill="#b9b3a2" stroke="${ink}" stroke-width="2"/>
      <rect x="286" y="-18" width="26" height="36" rx="6" fill="#c8233f" stroke="${ink}" stroke-width="2"/>
    </g>
    <text x="${w - 16}" y="${h - 22}" text-anchor="end" fill="${ink}" fill-opacity="0.5" font-family="Caveat, cursive" font-size="30">p. 1</text>`;
}

/**
 * Every plate takes the same arguments so the renderer never special-cases one.
 * `(width, height, ink, accent)`.
 */
const PLATES = {
  contents: (w, h, ink, accent) => plateContents(w, h, ink, accent),
  blank: (w, h, ink, accent) => plateBlank(w, h, ink, accent),
  'earth-we-live-on': (w, h) => `<image href="${globePicture}" x="0" y="0" width="${w}" height="${h}"/>`,
};

/* ------------------------------------------------------------------ *
 * The globe
 * ------------------------------------------------------------------ */

/** A frame of the notebook's globe, set by `main` before the cards are drawn. */
let globePicture = '';

/**
 * The globe as the entry draws it — its own code (`src/lib/globe/render.ts`),
 * its own crayon map and its own colours, read from its stylesheet — turned
 * to Africa and Europe, `size` pixels square, as a PNG data URL.
 */
async function drawGlobe(size) {
  const css = readFileSync(path.join(root, 'src/components/notebook/Globe.module.css'), 'utf8');
  const vars = Object.fromEntries([...css.matchAll(/--globe-([a-z]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
  const sheet = `data:image/webp;base64,${readFileSync(path.join(root, 'public/notebook/earth/crayon-2048.webp')).toString('base64')}`;
  const page = `<!doctype html><html><head><script type="importmap">{"imports":{"@/":"/src/"}}</script></head>
<body style="margin:0"><canvas id="back"></canvas><canvas id="globe"></canvas><script type="module">
import { CRAYONS } from '@/lib/globe/colours';
import { createScene } from '@/lib/globe/render';
import { sheetFrom } from '@/lib/globe/sheet';
const vars = ${JSON.stringify(vars)};
const picture = new Image();
picture.src = ${JSON.stringify(sheet)};
await picture.decode();
const globe = document.getElementById('globe');
const scene = createScene(document.getElementById('back'), globe, { paper: vars.paper, dusk: vars.dusk, graphite: vars.graphite, shadow: vars.shadow, crayons: CRAYONS.map((c) => vars[c]) }, sheetFrom(picture, 2048));
scene.resize(${size}, ${size}, 2);
scene.draw(-20);
window.picture = globe.toDataURL('image/png');
</script></body></html>`;
  const server = await serveScenes({ '/globe.html': page });
  const browser = await openPage({ width: size, height: size });
  try {
    await browser.navigate(`${server.url}/globe.html`);
    for (let i = 0; i < 100; i += 1) {
      const url = await browser.evaluate('window.picture || null');
      if (url) return url;
      if (browser.errors.length) throw new Error(browser.errors.join('\n'));
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error('the globe was not drawn');
  } finally {
    await browser.close();
    await server.close();
  }
}

/** Plates that want a landscape box rather than the square the diagrams use. */
const PLATE_BOX = {
  contents: { w: 470, h: 440 },
  blank: { w: 470, h: 420 },
};

/* A faint plane grid, the same one the site lays under its pages. */
function grid() {
  return `<rect width="${W}" height="${H}" fill="url(#plane)"/>`;
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

function defs(ink) {
  return `
    <defs>
      <pattern id="plane" width="48" height="48" patternUnits="userSpaceOnUse">
        <path d="M48 0H0V48" fill="none" stroke="${ink}" stroke-opacity="0.06" stroke-width="1"/>
      </pattern>
      <linearGradient id="slateWash" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${SLATE_DEEP}" stop-opacity="0"/>
        <stop offset="1" stop-color="${SLATE_DEEP}" stop-opacity="0.75"/>
      </linearGradient>
      <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${PAPER}" stop-opacity="0"/>
        <stop offset="0.55" stop-color="${PAPER}" stop-opacity="0.9"/>
        <stop offset="1" stop-color="${PAPER}" stop-opacity="1"/>
      </linearGradient>
    </defs>`;
}

function markSvg(ink, height = 30) {
  const w = (height / 26) * 36;
  return `<svg width="${n(w)}" height="${height}" viewBox="${LOGO.viewBox}" fill="${ink}" aria-hidden="true"><path d="${LOGO.one}"/><path d="${LOGO.seven}"/></svg>`;
}

/**
 * Type size from title length.
 *
 * Set by hand at first, and every card whose title grew past the guess ran into
 * the artwork or pushed the standfirst off the bottom. Deriving it means a
 * retitled lesson re-typesets itself, which matters because the titles on this
 * site have already been rewritten once wholesale.
 */
function titleSize(card, hasPlate) {
  if (card.titleSize) return card.titleSize;
  const len = card.title.length;
  const scale = hasPlate ? 1 : 1.2;
  /*
    Calibrated against Syne 800, which is far wider than its point size
    suggests — the first table here was built on a guess at the advance width
    and put "Lessons" at 96px straight through the notebook artwork. A
    single-word title has no wrapping opportunity, so an over-generous size does
    not wrap, it overflows.
  */
  const base = len <= 10 ? 70 : len <= 16 ? 62 : len <= 24 ? 54 : len <= 34 ? 46 : 40;
  return Math.round(base * scale);
}

function html(card) {
  const ink = card.ink ?? GRAPHITE;
  const ground = card.ground ?? PAPER;
  const onDark = card.onDark ?? false;
  const textInk = onDark ? CHALK : ink;
  const dim = onDark ? `${CHALK}b0` : `${ink}a8`;
  // The scrim fades from the card's own ground, so text sits on the same paper
  // the artwork does rather than on a patch of the site's grey.
  const scrimRgb = [1, 3, 5].map((i) => parseInt(ground.slice(i, i + 2), 16)).join(',');

  const stage = card.stage
    ? `<svg class="stage" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(ink)}${card.stage()}</svg>`
    : '';

  const box = PLATE_BOX[card.plate] ?? { w: 420, h: 420 };
  const accent = card.accent ?? ACCENT;
  const plate = card.plate
    ? `<svg class="plate" width="${box.w}" height="${box.h}" viewBox="0 0 ${box.w} ${box.h}" style="flex: 0 0 ${box.w}px">${defs(ink)}${PLATES[card.plate](box.w, box.h, ink, accent)}</svg>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=JetBrains+Mono:wght@500&family=Caveat:wght@600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; }
  body {
    background: ${ground};
    color: ${textInk};
    font-family: 'DM Sans', system-ui, sans-serif;
    position: relative;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .stage { position: absolute; inset: 0; }
  .scrim {
    position: absolute; inset: 0;
    background: linear-gradient(
      100deg,
      ${onDark ? 'rgba(36,60,51,0.96)' : `rgba(${scrimRgb},0.97)`} 0%,
      ${onDark ? 'rgba(36,60,51,0.86)' : `rgba(${scrimRgb},0.88)`} 38%,
      ${onDark ? 'rgba(36,60,51,0)' : `rgba(${scrimRgb},0)`} 62%
    );
  }
  .card {
    position: relative;
    width: 100%; height: 100%;
    padding: 62px 70px;
    display: flex; flex-direction: column;
  }
  .top { display: flex; align-items: center; gap: 18px; }
  .label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 17px; font-weight: 500;
    letter-spacing: 0.22em; text-transform: uppercase;
    color: ${dim};
  }
  .body { flex: 1; display: flex; align-items: center; gap: 46px; }
  .text { flex: 1 1 auto; min-width: 0; }
  .title {
    font-family: 'Syne', system-ui, sans-serif;
    font-weight: 800;
    font-size: ${titleSize(card, Boolean(card.plate))}px;
    line-height: 1.02;
    letter-spacing: -0.022em;
    text-wrap: balance;
    /* Last line of defence: wrap rather than run into the artwork. */
    overflow-wrap: break-word;
  }
  .standfirst {
    margin-top: 22px;
    font-size: 25px; line-height: 1.38;
    color: ${dim};
    max-width: 22ch;
  }
  .foot {
    display: flex; justify-content: space-between; align-items: baseline;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px; letter-spacing: 0.14em; text-transform: uppercase;
    color: ${dim};
    border-top: 1px solid ${onDark ? `${CHALK}30` : `${ink}22`};
    padding-top: 20px;
  }
  .wide .standfirst { max-width: 30ch; }
</style></head>
<body>
  ${stage}
  ${card.stage ? '<div class="scrim"></div>' : ''}
  <div class="card">
    <div class="top">${markSvg(textInk, 30)}<span class="label">${esc(card.label)}</span></div>
    <div class="body${card.plate ? '' : ' wide'}">
      <div class="text">
        <h1 class="title">${esc(card.title)}</h1>
        ${card.standfirst ? `<p class="standfirst">${esc(card.standfirst)}</p>` : ''}
      </div>
      ${plate}
    </div>
    <div class="foot"><span>${esc(card.footLeft ?? SITE_HOST)}</span><span>${esc(card.footRight ?? '')}</span></div>
  </div>
</body></html>`;
}

/* ------------------------------------------------------------------ *
 * What gets made
 * ------------------------------------------------------------------ */

function cards() {
  const list = [
    {
      file: 'home',
      label: site.location,
      title: founder.name,
      standfirst: `${founder.title} at ${founder.employer}, ${founder.focus}.`,
      plate: 'contents',
      titleSize: 58,
      footRight: 'Sketchbook No. 17',
    },
    {
      file: 'founder',
      label: 'Founder',
      title: founder.name,
      standfirst: `${founder.title} at ${founder.employer}. Every role since ${careerStart}, and the résumé to download.`,
      stage: stageSketch,
      ground: SKETCH.paper,
      ink: '#1d1d21',
      titleSize: 64,
      footRight: 'PDF · DOCX',
    },
    {
      file: 'notebook',
      label: 'Notebook',
      title: 'Something new, every day.',
      standfirst: `${founder.name.split(' ')[0]}’s notebook: what he is learning, worked through one entry at a time.`,
      plate: 'blank',
      footRight: 'Sketchbook No. 17',
    },
    {
      file: 'grasp',
      label: graspInfo.name,
      title: graspInfo.name,
      standfirst: `${graspInfo.tagline}. ${capitalise(spell(graspModule.lessons.length))} lessons, from the steepness of a line to velocity.`,
      stage: stageChalkboard,
      ground: SLATE,
      onDark: true,
      titleSize: 96,
      footRight: `${graspModule.position} · ${graspModule.title}`,
    },
    ...notebook.map((entry) => ({
      file: `notebook-${entry.slug}`,
      label: 'Notebook',
      title: entry.title,
      standfirst: entry.summary,
      plate: entry.slug in PLATES ? entry.slug : 'blank',
      footRight: formatDate(entry.date),
    })),
  ];

  return list;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

async function main() {
  const filter = process.argv[2];
  const all = cards();
  const wanted = filter ? all.filter((c) => c.file.includes(filter)) : all;

  if (wanted.length === 0) {
    console.error(`No cards match "${filter}".`);
    process.exit(1);
  }

  mkdirSync(outDir, { recursive: true });
  if (wanted.some((c) => c.plate === 'earth-we-live-on')) globePicture = await drawGlobe(420);
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const page = await openPage({ width: W, height: H });

  let failures = 0;
  try {
    for (const card of wanted) {
      const file = path.join(tmp, `${card.file}.html`);
      writeFileSync(file, html(card), 'utf8');
      await page.navigate(fileUrl(file));

      /*
        Webfonts load asynchronously and a screenshot taken before they arrive
        is set in the fallback face — which looks close enough in a thumbnail to
        ship by accident. Waiting on `document.fonts.ready` is the only reliable
        gate; the extra frame is for the SVG to paint.
      */
      await page.evaluate('document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))))');

      const dest = path.join(outDir, `${card.file}.png`);
      writeFileSync(dest, await page.screenshot());
      const kb = (statSync(dest).size / 1024).toFixed(0);
      console.log(`  ${card.file}.png`.padEnd(46) + `${kb} KB`);
    }
  } catch (error) {
    failures++;
    console.error(error);
  } finally {
    await page.close();
    rmSync(tmp, { recursive: true, force: true });
  }

  if (failures) process.exit(1);
  console.log(`
${wanted.length} card${wanted.length === 1 ? '' : 's'} -> public/og/`);
}

main();
