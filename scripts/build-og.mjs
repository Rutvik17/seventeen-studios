/**
 * Generates the Open Graph share images.
 *
 *   npm run og            — all of them
 *   npm run og -- grasp   — only the cards whose file name contains "grasp"
 *
 * Most cards are photographs of the built pages themselves, and the drawn one
 * is written in the site's own font files, so `npm run build` (without a base
 * path) has to have run first.
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
 * `CURVES[0]` draws the parabola, and the landing, founder and algorithms
 * cards are those pages, photographed.
 * Nothing is traced by eye.
 *
 * That is not craft for its own sake. A share image is the one asset nobody
 * looks at again after the day it is made, and a hand-drawn approximation of a
 * curve would sit there misrepresenting the page for years. Deriving it means
 * the picture is wrong only if the page is wrong.
 */

import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync, statSync } from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { founder } from '../src/content/founder.ts';
import { graspInfo, graspModule } from '../src/content/grasp.ts';
import { spell } from '../src/lib/time.ts';
import { CURVES } from '../src/lib/calculus.ts';
import { SITE_HOST } from '../src/lib/url.ts';
import { fileUrl, openPage } from './chrome.mjs';

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
const SLATE = '#2d4a3f';
const SLATE_DEEP = '#243c33';
const CHALK = '#eef1e6';
const CHALK_ACCENT = '#f0d266';


const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const n = (v) => Number(v.toFixed(2));

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
    <text x="${n(fx(at) + 18)}" y="${n(fy(curve.f(at)) - 16)}" fill="${CHALK_ACCENT}" font-family="Caveat, cursive" font-weight="600" font-size="38" opacity="0.95">slope = 2x</text>`;
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

function defs(ink) {
  return `
    <defs>
      <linearGradient id="slateWash" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${SLATE_DEEP}" stop-opacity="0"/>
        <stop offset="1" stop-color="${SLATE_DEEP}" stop-opacity="0.75"/>
      </linearGradient>
    </defs>`;
}

/**
 * The site's own Caveat, from the built export's stylesheets — the files
 * `next/font` serves — so a drawn card is written in exactly the hand the site
 * is, and needs no network to be made.
 */
function siteHand() {
  const dir = path.join(root, 'out', '_next', 'static', 'css');
  if (!existsSync(dir)) throw new Error('no out/ — run `npm run build` (without a base path) first.');
  const media = pathToFileURL(path.join(root, 'out', '_next', 'static', 'media')).href;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.css'))
    .flatMap((f) => readFileSync(path.join(dir, f), 'utf8').match(/@font-face\{font-family:__Caveat_[^}]*\}/g) ?? [])
    .map((rule) => rule.replace(/font-family:__Caveat_\w+/, "font-family:'Caveat'").replace(/url\(\/_next\/static\/media/g, `url(${media}`))
    .join('\n');
}

/**
 * A drawn card, in the site's one hand: Caveat throughout, the title bold with
 * one straight pen underline, as every title on the site is written — the
 * artwork on the right, the words on the left over a scrim of the card's own
 * ground.
 */
function html(card) {
  const ink = card.ink ?? GRAPHITE;
  const ground = card.ground ?? PAPER;
  const onDark = card.onDark ?? false;
  const textInk = onDark ? CHALK : ink;
  const dim = onDark ? `${CHALK}b8` : `${ink}b0`;

  const stage = card.stage
    ? `<svg class="stage" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${defs(ink)}${card.stage()}</svg>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  ${siteHand()}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; }
  body {
    background: ${ground};
    color: ${textInk};
    font-family: 'Caveat', cursive;
    position: relative;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }
  .stage { position: absolute; inset: 0; }
  .scrim {
    position: absolute; inset: 0;
    background: linear-gradient(100deg, rgba(36,60,51,0.96) 0%, rgba(36,60,51,0.86) 38%, rgba(36,60,51,0) 62%);
  }
  .card {
    position: relative;
    width: 100%; height: 100%;
    padding: 58px 70px;
    display: flex; flex-direction: column;
  }
  .label { font-size: 30px; font-weight: 600; color: ${dim}; }
  .body { flex: 1; display: flex; align-items: center; }
  .text { max-width: 520px; }
  .title {
    display: inline-block;
    font-weight: 700;
    font-size: ${card.titleSize ?? 110}px;
    line-height: 1;
    padding-bottom: 6px;
    border-bottom: 3px solid currentColor;
  }
  .standfirst {
    margin-top: 26px;
    font-size: 36px; font-weight: 600; line-height: 1.2;
    color: ${dim};
  }
  .foot {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 26px; font-weight: 600;
    color: ${dim};
  }
</style></head>
<body>
  ${stage}
  ${card.stage && onDark ? '<div class="scrim"></div>' : ''}
  <div class="card">
    <div class="label">${esc(card.label)}</div>
    <div class="body">
      <div class="text">
        <h1 class="title">${esc(card.title)}</h1>
        ${card.standfirst ? `<p class="standfirst">${esc(card.standfirst)}</p>` : ''}
      </div>
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
      // The landing itself: the campus painted in autumn, with his name written over the sky.
      film: '/',
      css: LANDING_CSS,
      shot: 'autumn',
      overlay: { title: founder.name, line: `${founder.title} at ${founder.employer}` },
    },
    {
      file: 'founder',
      // The painting itself: the founder page's portrait, finished, with his name beside it.
      film: '/founder/?photo=evening',
    },
    {
      file: 'algorithms',
      // The index: every category of the NeetCode 150 beside the list of problems.
      film: '/algorithms/',
      css: ALGORITHMS_CSS,
      ready: 'main h1',
    },
    {
      file: 'algorithms-problem',
      // A problem page: the list of problems beside one being drawn, part-way through.
      film: '/algorithms/trapping-rain-water/',
      css: ALGORITHMS_CSS,
      ready: 'svg',
      steps: 9,
    },
    {
      file: 'grasp',
      label: 'Calculus, on a chalkboard',
      title: graspInfo.name,
      standfirst: `${graspInfo.tagline}: ${spell(graspModule.lessons.length)} lessons, from the steepness of a line to velocity.`,
      stage: stageChalkboard,
      ground: SLATE,
      onDark: true,
      footRight: `${graspModule.position} · ${graspModule.title}`,
    },
  ];

  return list;
}

/* ------------------------------------------------------------------ *
 * Film cards — the page's own painting
 * ------------------------------------------------------------------ */

/*
  A film page's card is not drawn here at all: it is the page. The built
  export is served, the page opened at the card's size with reduced motion
  (so the painting is there finished, at once), everything that is interface
  rather than painting hidden, and the result photographed. The card is the
  artwork because it is made by the artwork's own code.
*/
const FILM_CSS = `
  .nav, .preloader, .curtain, .cursor-marks, .endpaper,
  [class*="FounderFilm_downloads"],
  p[class*="FounderFilm_line"] ~ p { display: none !important; }
  /* A taller canvas, so the portrait fills the card's height. */
  canvas[role="img"] { top: -81px !important; height: 824px !important; bottom: auto !important; }
  [class*="FounderFilm_plate"] { left: 70px !important; bottom: auto !important; top: 50% !important; transform: translateY(-50%); width: 500px !important; }
  [class*="FounderFilm_title"] { font-size: 86px !important; margin-bottom: 18px !important; }
  [class*="FounderFilm_line"] { font-size: 32px !important; color: var(--fg) !important; opacity: 0.75; }
`;

/* The landing's card: the painting, less the header and the list of shots, with his name over the sky. */
const LANDING_CSS = `
  .nav, .preloader, .curtain, .cursor-marks, [class*="Film_controls"] { display: none !important; }
  .og-name { position: fixed; left: 24px; top: 8px; z-index: 10; padding: 40px 110px 60px 40px; font-family: var(--font-hand), cursive; color: var(--fg);
    background: radial-gradient(closest-side, rgba(245,240,230,0.9), rgba(245,240,230,0.72) 60%, rgba(245,240,230,0)); }
  .og-name b { display: inline-block; font-size: 84px; line-height: 1; padding-bottom: 4px; border-bottom: 3px solid currentColor; }
  .og-name span { display: block; margin-top: 12px; font-size: 36px; font-weight: 600; opacity: 0.8; }
`;

/* The algorithms cards: the page as it is, less the header. */
const ALGORITHMS_CSS = `
  .nav, .preloader, .curtain, .cursor-marks { display: none !important; }
  [data-app] { --top: 12px !important; }
`;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain' };

function serve(root) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

async function shootFilm(card) {
  const site = path.join(root, 'out');
  if (!existsSync(path.join(site, card.film.split('?')[0].replace(/^\//, ''), 'index.html'))) {
    throw new Error(`${card.file}: no ${card.film} in out/ — run \`npm run build\` (without a base path) first.`);
  }
  const server = await serve(site);
  const page = await openPage({ width: W, height: H, reducedMotion: true });
  try {
    await page.navigate(`http://127.0.0.1:${server.address().port}${card.film}`);
    await page.evaluate(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(card.css ?? FILM_CSS)}; document.head.append(s); })()`);
    if (card.overlay) {
      await page.evaluate(`(() => {
        const o = document.createElement('div');
        o.className = 'og-name';
        o.innerHTML = '<b></b><span></span>';
        o.firstChild.textContent = ${JSON.stringify(card.overlay.title)};
        o.lastChild.textContent = ${JSON.stringify(card.overlay.line)};
        document.body.append(o);
      })()`);
    }
    if (card.ready) {
      // A page drawn in SVG: wait for the drawing and the fonts, then step it along.
      await page.evaluate(`new Promise((resolve, reject) => {
        const start = performance.now();
        const check = () => {
          const next = document.querySelector('[aria-label="Next step"]');
          if (document.querySelector(${JSON.stringify(card.ready)}) && (!next || !next.disabled)) return document.fonts.ready.then(resolve);
          if (performance.now() - start > 20000) return reject(new Error('the page never drew'));
          setTimeout(check, 200);
        };
        check();
      })`);
      // The exported HTML already holds the player, so keep clicking until the counter
      // shows the step wanted: clicks made before React has attached do nothing.
      if (card.steps) await page.evaluate(`(async () => {
        const want = ${(card.steps ?? 0) + 1};
        const at = () => Number((document.body.innerText.match(/(\\d+) \\/ \\d+/) || [])[1] || 0);
        const start = performance.now();
        while (at() < want && performance.now() - start < 20000) {
          document.querySelector('[aria-label="Next step"]')?.click();
          await new Promise((r) => setTimeout(r, 120));
        }
      })()`);
      await new Promise((r) => setTimeout(r, 900));
    } else
    // Wait until the canvas has paint on it, then a frame more.
    await page.evaluate(`new Promise((resolve, reject) => {
      const start = performance.now();
      const check = () => {
        const c = document.querySelector('canvas[role=img]');
        if (c && c.width > 1) {
          const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let n = 0;
          for (let i = 3; i < d.length; i += 4 * 97) if (d[i] > 0) n++;
          if (n > 200) return document.fonts.ready.then(() => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }
        if (performance.now() - start > 20000) return reject(new Error('the film never painted'));
        setTimeout(check, 200);
      };
      check();
    })`);
    if (card.shot) {
      // Turn the film to the shot wanted — under reduced motion every shot is a button — and let it paint.
      await page.evaluate(`[...document.querySelectorAll('button')].find((b) => b.textContent.trim() === ${JSON.stringify(card.shot)})?.click()`);
      await new Promise((r) => setTimeout(r, 3000));
    }
    if (page.errors.length) throw new Error(page.errors.join('\n'));
    const dest = path.join(outDir, `${card.file}.png`);
    writeFileSync(dest, await page.screenshot());
    console.log(`  ${card.file}.png`.padEnd(46) + `${(statSync(dest).size / 1024).toFixed(0)} KB`);
  } finally {
    await page.close();
    server.close();
  }
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
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const page = await openPage({ width: W, height: H });

  let failures = 0;
  try {
    for (const card of wanted) {
      if (card.film) {
        await shootFilm(card);
        continue;
      }
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
