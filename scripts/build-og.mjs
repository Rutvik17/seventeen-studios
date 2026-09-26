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
 * Writes `public/og/<name>.jpg`, one per route, committed to the repo. Wired
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
import { algorithmsPage, problem } from '../src/content/algorithms/index.ts';
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

/*
  JPEG, not PNG. A watercolour is all soft gradients, which PNG stores
  losslessly and badly: the landing's card was a megabyte, and WhatsApp and
  others drop a preview image much over 300 KB and show no picture at all. At
  this quality the paper and washes are indistinguishable at a fifth of the size.
*/
const JPEG = { format: 'jpeg', quality: 86 };

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
      // The landing itself: the campus painted in autumn, the leaf mark, and his name signed in the corner in paint.
      film: '/',
      css: LANDING_CSS,
      shot: 'autumn',
      // The first name alone, the way a painter signs.
      signature: founder.name.split(' ')[0],
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
      file: 'algorithms-drawn',
      // Every problem page: not one problem, but what the section does — six
      // different drawings, each photographed part-way through its own page.
      collage: [
        { slug: 'two-sum', steps: 3 },
        { slug: 'number-of-islands', steps: 6 },
        { slug: 'invert-binary-tree', steps: 3 },
        { slug: 'reverse-linked-list', steps: 3 },
        { slug: 'network-delay-time', steps: 4 },
        { slug: 'trapping-rain-water', steps: 9 },
      ],
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
  .nav, .preloader, .curtain, .cursor-wash, .cursor-brush, .endpaper,
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
  .preloader, .curtain, .cursor-wash, .cursor-brush, .nav__tabs, [class*="Film_controls"], [class*="Film_plate"] { display: none !important; }
  /* The mark, as the header carries it, only larger: the leaf repaints itself at its new size. */
  .nav__logo { width: 104px !important; }
  .nav__mark:hover .nav__logo { transform: none; }
`;

/* The algorithms cards: the page as it is, less the header. */
const ALGORITHMS_CSS = `
  .nav, .preloader, .curtain, .cursor-wash, .cursor-brush { display: none !important; }
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

/** Wait for a problem page's player to draw, then click it along until its counter reads `steps` + 1. */
async function stepTo(page, ready, steps) {
  await page.evaluate(`new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      const next = document.querySelector('[aria-label="Next step"]');
      if (document.querySelector(${JSON.stringify(ready)}) && (!next || !next.disabled)) return document.fonts.ready.then(resolve);
      if (performance.now() - start > 20000) return reject(new Error('the page never drew'));
      setTimeout(check, 200);
    };
    check();
  })`);
  // The exported HTML already holds the player, so keep clicking until the counter
  // shows the step wanted: clicks made before React has attached do nothing.
  if (steps) await page.evaluate(`(async () => {
    const want = ${steps + 1};
    const at = () => Number((document.body.innerText.match(/(\\d+) \\/ \\d+/) || [])[1] || 0);
    const start = performance.now();
    while (at() < want && performance.now() - start < 20000) {
      document.querySelector('[aria-label="Next step"]')?.click();
      await new Promise((r) => setTimeout(r, 120));
    }
  })()`);
  await new Promise((r) => setTimeout(r, 900));
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
    if (card.ready) await stepTo(page, card.ready, card.steps ?? 0);
    // Otherwise a canvas: wait until it has paint on it, then a frame more.
    else await page.evaluate(`new Promise((resolve, reject) => {
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
    if (card.signature) await page.evaluate(signature(card.signature));
    if (page.errors.length) throw new Error(page.errors.join('\n'));
    const dest = path.join(outDir, `${card.file}.jpg`);
    writeFileSync(dest, await page.screenshot(undefined, JPEG));
    console.log(`  ${card.file}.jpg`.padEnd(46) + `${(statSync(dest).size / 1024).toFixed(0)} KB`);
  } finally {
    await page.close();
    server.close();
  }
}

/*
  A painter's signature, in the very corner of the paper, in paint.

  Signed, not written: Herr Von Muellerhoff, a signature's hand — steep,
  joined up and quick — the one face on any card that is not Caveat, because
  a signature is the one thing on it that is not the site talking. It is set
  about as small as 12pt type reads, on the bare paper below the painting.

  Painted as `lib/film/wash.ts` lays a wash: thin ultramarine glazes, each
  wandering a hair (the strokes are hairlines, so a hair is all they can
  wander), some held to patches so the colour pools, a darker drying edge
  every third, and the paper's tooth where the paint skipped. Seeded, so the
  card is the same every time it is made.
*/
const SIGNATURE_FONT = fileURLToPath(import.meta.resolve('@fontsource/herr-von-muellerhoff/files/herr-von-muellerhoff-latin-400-normal.woff2'));

function signature(name) {
  const face = readFileSync(SIGNATURE_FONT).toString('base64');
  return `(async () => {
    const SIZE = 28;
    const f = new FontFace('Signature', 'url(data:font/woff2;base64,${face})');
    document.fonts.add(await f.load());
    const font = SIZE + 'px Signature';
    const W = 130, H = 44, dpr = 4;
    const c = document.createElement('canvas');
    c.width = W * dpr; c.height = H * dpr;
    Object.assign(c.style, { position: 'fixed', left: '10px', bottom: '2px', width: W + 'px', height: H + 'px', zIndex: 10, pointerEvents: 'none' });
    document.body.append(c);
    const x = c.getContext('2d');
    x.scale(dpr, dpr);
    let seed = 17;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const g = () => (r() + r() + r() - 1.5) * 1.2;
    const PAINT = 'rgb(38,56,148)', DRY = 'rgb(22,32,96)';
    x.font = font;
    x.textBaseline = 'alphabetic';
    const text = ${JSON.stringify(name)};
    const tw = x.measureText(text).width;
    x.translate(8, 30);
    for (let i = 0; i < 26; i++) {
      x.save();
      if (i % 2) {
        x.beginPath();
        x.ellipse(r() * tw, -SIZE * 0.3 + r() * SIZE * 0.5, SIZE * (0.4 + r() * 0.8), SIZE * (0.25 + r() * 0.35), r() * 3, 0, Math.PI * 2);
        x.clip();
      }
      x.translate(g() * 0.3, g() * 0.25);
      x.globalAlpha = 0.14 + r() * 0.1;
      x.fillStyle = PAINT;
      x.fillText(text, 0, 0);
      if (i % 3 === 1) {
        x.globalAlpha = 0.22 + r() * 0.1;
        x.strokeStyle = DRY;
        x.lineWidth = 0.25;
        x.strokeText(text, 0, 0);
      }
      x.restore();
    }
    // The paper's tooth: a little of the paint skipped.
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 1400; i++) {
      x.globalAlpha = 0.1 + r() * 0.35;
      x.fillRect(r() * c.width, r() * c.height, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));
  })()`;
}

/* ------------------------------------------------------------------ *
 * The collage — what the algorithms section does, not one problem
 * ------------------------------------------------------------------ */

/*
  Every problem page shares one card, so it cannot be any one problem: a link
  to Contains Duplicate that previews Trapping Rain Water says the wrong thing.
  It is the section instead — six different kinds of drawing (an array and a
  hash map, a grid, a tree, a linked list, a graph, bars and water), each
  photographed off its own page part-way through, laid out on the paper under
  the section's name.
*/
async function shootCollage(card) {
  const site = path.join(root, 'out');
  const server = await serve(site);
  const page = await openPage({ width: 1512, height: 1000, reducedMotion: true });
  const tiles = [];
  try {
    for (const t of card.collage) {
      if (!existsSync(path.join(site, 'algorithms', t.slug, 'index.html'))) {
        throw new Error(`${card.file}: no /algorithms/${t.slug}/ in out/ — run \`npm run build\` (without a base path) first.`);
      }
      await page.navigate(`http://127.0.0.1:${server.address().port}/algorithms/${t.slug}/`);
      await page.evaluate(`(() => { const s = document.createElement('style'); s.textContent = ${JSON.stringify(ALGORITHMS_CSS)}; document.head.append(s); })()`);
      await stepTo(page, 'svg', t.steps);
      const box = await page.evaluate(`(() => { const r = document.querySelector('[class*="Visualizer_panels"]').getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; })()`);
      if (page.errors.length) throw new Error(page.errors.join('\n'));
      const png = await page.screenshot(box);
      tiles.push({ title: problem(t.slug).title, src: `data:image/png;base64,${png.toString('base64')}` });
    }
  } finally {
    await page.close();
    server.close();
  }

  const tmp = mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const card2 = await openPage({ width: W, height: H });
  try {
    const file = path.join(tmp, `${card.file}.html`);
    writeFileSync(file, collageHtml(tiles), 'utf8');
    await card2.navigate(fileUrl(file));
    await card2.evaluate('document.fonts.ready.then(() => window.trimmed).then(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))))');
    const dest = path.join(outDir, `${card.file}.jpg`);
    writeFileSync(dest, await card2.screenshot(undefined, JPEG));
    console.log(`  ${card.file}.jpg`.padEnd(46) + `${(statSync(dest).size / 1024).toFixed(0)} KB`);
  } finally {
    await card2.close();
    rmSync(tmp, { recursive: true, force: true });
  }
}

function collageHtml(tiles) {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<style>
  ${siteHand()}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: ${W}px; height: ${H}px; }
  body {
    background: #f5f0e6;
    color: ${GRAPHITE};
    font-family: 'Caveat', cursive;
    overflow: hidden;
    display: grid;
    grid-template-columns: 330px 1fr;
    gap: 32px;
    padding: 34px 44px 34px 64px;
  }
  .text { display: flex; flex-direction: column; padding: 16px 0 12px; }
  .title { display: inline-block; align-self: flex-start; font-size: 92px; font-weight: 700; line-height: 1; padding-bottom: 6px; border-bottom: 3px solid currentColor; }
  .lead { margin-top: 24px; font-size: 33px; font-weight: 600; line-height: 1.2; }
  .langs { margin-top: 18px; text-wrap: balance; font-size: 25px; font-weight: 600; color: ${GRAPHITE}99; }
  .foot { margin-top: auto; font-size: 24px; font-weight: 600; color: ${GRAPHITE}99; }
  .grid { display: grid; grid-template-columns: repeat(2, 1fr); grid-template-rows: repeat(3, 1fr); gap: 12px; min-height: 0; }
  figure {
    display: flex; flex-direction: column; min-height: 0;
    background: #fffdf8; border-radius: 12px; padding: 6px 10px 2px;
    box-shadow: 0 12px 26px -20px rgba(29, 29, 33, 0.55);
  }
  figure div { flex: 1; min-height: 0; display: flex; align-items: center; justify-content: center; }
  img { max-width: 100%; max-height: 100%; object-fit: contain; }
  figcaption { font-size: 19px; font-weight: 600; text-align: center; padding-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style></head>
<body>
  <div class="text">
    <h1 class="title">${esc(algorithmsPage.title)}</h1>
    <p class="lead">The NeetCode 150, every problem drawn step by step as it runs.</p>
    <p class="langs">${esc(algorithmsPage.languages)}</p>
    <p class="foot">${esc(SITE_HOST)}</p>
  </div>
  <div class="grid">
    ${tiles.map((t) => `<figure><div><img src="${t.src}" alt=""></div><figcaption>${esc(t.title)}</figcaption></figure>`).join('\n    ')}
  </div>
  <script>
    // Each photograph is the whole panel strip, mostly empty paper: crop it to what is drawn, so the drawing fills its tile.
    window.trimmed = Promise.all([...document.images].map(async (img) => {
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, c.width, c.height).data;
      const bg = [d[0], d[1], d[2]];
      let l = c.width, t = c.height, r = 0, b = 0;
      for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) {
        const k = (y * c.width + i) * 4;
        if (Math.abs(d[k] - bg[0]) + Math.abs(d[k + 1] - bg[1]) + Math.abs(d[k + 2] - bg[2]) > 24) {
          if (i < l) l = i; if (i > r) r = i; if (y < t) t = y; if (y > b) b = y;
        }
      }
      if (r <= l || b <= t) return;
      const pad = 10;
      l = Math.max(0, l - pad); t = Math.max(0, t - pad); r = Math.min(c.width, r + pad); b = Math.min(c.height, b + pad);
      const o = document.createElement('canvas');
      o.width = r - l;
      o.height = b - t;
      o.getContext('2d').drawImage(c, l, t, o.width, o.height, 0, 0, o.width, o.height);
      img.src = o.toDataURL();
      await img.decode();
    }));
  </script>
</body></html>`;
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
      if (card.collage) {
        await shootCollage(card);
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

      const dest = path.join(outDir, `${card.file}.jpg`);
      writeFileSync(dest, await page.screenshot(undefined, JPEG));
      const kb = (statSync(dest).size / 1024).toFixed(0);
      console.log(`  ${card.file}.jpg`.padEnd(46) + `${kb} KB`);
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
