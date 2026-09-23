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
 * fits, and it is the same one `build-resume.mjs` uses for the résumé.
 *
 * ---
 *
 * WHY THE ARTWORK IS COMPUTED RATHER THAN DRAWN
 *
 * Every plate below is produced by the same code the page it advertises uses —
 * `Spring` integrates the spring card, `simulateRisk` bins the risk card,
 * `CURVES[0]` draws the parabola, the landing's pendulums are integrated by
 * `tracePair`, and the founder card's bridge is the sketchbook's own geometry.
 * Nothing is traced by eye.
 *
 * That is not craft for its own sake. A share image is the one asset nobody
 * looks at again after the day it is made, and a hand-drawn approximation of a
 * curve would sit there misrepresenting the page for years. Deriving it means
 * the picture is wrong only if the page is wrong.
 *
 * NO LIVE MARKET FIGURE APPEARS ON ANY CARD. `market.json` is refetched in
 * `prebuild`, so a dollar amount baked into a committed PNG would be stale
 * within a week and there is no build step that would ever catch it. The risk
 * cards show the distribution and the constants that produced it — the path
 * count and the confidence level — which do not move.
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync, statSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { founder } from '../src/content/founder.ts';
import { site } from '../src/content/studio.ts';
import { entries } from '../src/content/notebook.ts';
import { products } from '../src/content/products.ts';
import { policies } from '../src/content/policies.ts';
import { graspModule } from '../src/content/grasp.ts';
import { CURVES } from '../src/lib/calculus.ts';
import { simulateRisk } from '../src/lib/quant.ts';
import { CARD_BOOK, expectedLoss } from '../src/lib/credit.ts';
import { Spring } from '../src/lib/physics.ts';
import { tracePair, L1, L2 } from '../src/lib/pendulum.ts';
import { bridge, cableY, PAGE, SUN } from '../src/lib/sketchbook/geometry.ts';
import { NOTEBOOK_CARD } from '../src/lib/og.ts';

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

const PAPER = '#eceae4';
const GRAPHITE = '#14161a';
const ACCENT = '#1b4fe0';
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

/* ------------------------------------------------------------------ *
 * Plates — the artwork, one per kind of page
 * ------------------------------------------------------------------ *
 *
 * Each returns SVG markup sized to the box it is handed. They are pure
 * functions of the site's own data, so a plate changes when the page does.
 */

/**
 * A plot frame: maths coordinates in, pixel coordinates out.
 *
 * Every curve plate shares it so they all sit on the same optical grid, which
 * is what makes six different diagrams read as one family.
 */
function frame(box, domain, range, pad = 26) {
  const [x0, x1] = domain;
  const [y0, y1] = range;
  const w = box - pad * 2;
  const h = box - pad * 2;
  return {
    x: (v) => pad + ((v - x0) / (x1 - x0)) * w,
    y: (v) => pad + h - ((v - y0) / (y1 - y0)) * h,
  };
}

function polyline(pts, stroke, width = 3, extra = '') {
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${n(p[0])} ${n(p[1])}`).join(' ');
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`;
}

/** Axes with ticks, drawn only where the data actually sits. */
function axes(f, domain, range, ink, ticks = {}) {
  const dim = `${ink}38`;
  const parts = [
    `<line x1="${n(f.x(domain[0]))}" y1="${n(f.y(0))}" x2="${n(f.x(domain[1]))}" y2="${n(f.y(0))}" stroke="${dim}" stroke-width="2"/>`,
    `<line x1="${n(f.x(0))}" y1="${n(f.y(range[0]))}" x2="${n(f.x(0))}" y2="${n(f.y(range[1]))}" stroke="${dim}" stroke-width="2"/>`,
  ];
  for (const t of ticks.x ?? []) {
    parts.push(
      `<line x1="${n(f.x(t))}" y1="${n(f.y(0) - 5)}" x2="${n(f.x(t))}" y2="${n(f.y(0) + 5)}" stroke="${dim}" stroke-width="2"/>`,
    );
  }
  for (const t of ticks.y ?? []) {
    parts.push(
      `<line x1="${n(f.x(0) - 5)}" y1="${n(f.y(t))}" x2="${n(f.x(0) + 5)}" y2="${n(f.y(t))}" stroke="${dim}" stroke-width="2"/>`,
    );
  }
  return parts.join('');
}

/**
 * f(x) = x² with the tangent at x = 1.
 *
 * The curve, the domain and the slope all come from `CURVES[0]` and its `exact`
 * derivative, so the tangent's gradient is the one the lesson teaches: f′(1) = 2.
 */
function plateCurve(box, ink, accent = ACCENT) {
  const curve = CURVES[0];
  const domain = [-3, 3];
  const range = [-1.4, 9.4];
  const f = frame(box, domain, range);

  const pts = [];
  for (let x = domain[0]; x <= domain[1] + 1e-9; x += 0.05) {
    pts.push([f.x(x), f.y(curve.f(x))]);
  }

  const at = 1;
  const slope = curve.exact(at);
  const span = 1.5;
  const tangent = [
    [f.x(at - span), f.y(curve.f(at) - slope * span)],
    [f.x(at + span), f.y(curve.f(at) + slope * span)],
  ];

  return [
    axes(f, domain, range, ink, { x: [-2, -1, 1, 2], y: [1, 4, 9] }),
    polyline(tangent, accent, 3),
    polyline(pts, ink, 4),
    `<circle cx="${n(f.x(at))}" cy="${n(f.y(curve.f(at)))}" r="7" fill="${accent}"/>`,
  ].join('');
}

/**
 * The Monte Carlo terminal-value distribution.
 *
 * Run here with parameters written into this file rather than read from
 * `market.json` — see the note at the top about why no live figure appears on a
 * committed image. The shape is the point.
 */
function plateHistogram(box, ink, accent = ACCENT) {
  const result = simulateRisk({
    notional: 1_000_000,
    drift: 0.06,
    volatility: 0.19,
    horizonDays: 63,
    alpha: 0.05,
    paths: 25_000,
    seed: 20260822,
  });

  const bins = result.histogram;
  const peak = Math.max(...bins.map((b) => b.count));
  const lo = bins[0].x0;
  const hi = bins[bins.length - 1].x1;

  const pad = 26;
  const w = box - pad * 2;
  const h = box - pad * 2;
  const px = (v) => pad + ((v - lo) / (hi - lo)) * w;

  /* The quantile the loss is measured at, in the same units as the bins. */
  const cut = result.terminal[Math.floor(result.terminal.length * 0.05)];

  const bars = bins
    .map((b) => {
      const bh = (b.count / peak) * (h - 8);
      const x = px(b.x0);
      const bw = Math.max(1, px(b.x1) - px(b.x0) - 1.5);
      const tail = b.x1 <= cut;
      return `<rect x="${n(x)}" y="${n(pad + h - bh)}" width="${n(bw)}" height="${n(bh)}" fill="${tail ? accent : ink}" opacity="${tail ? 0.95 : 0.28}"/>`;
    })
    .join('');

  return [
    bars,
    `<line x1="${n(px(cut))}" y1="${pad - 6}" x2="${n(px(cut))}" y2="${pad + h}" stroke="${accent}" stroke-width="3" stroke-dasharray="7 6"/>`,
    `<line x1="${pad}" y1="${pad + h}" x2="${pad + w}" y2="${pad + h}" stroke="${ink}55" stroke-width="2"/>`,
  ].join('');
}

/**
 * A damped spring, integrated by the class the rig actually runs on.
 *
 * Semi-implicit Euler at a fixed 1/60 step — the same integrator, the same
 * constants, so the overshoot and settle drawn here are the ones on the page.
 */
function plateSpring(box, ink, accent = ACCENT) {
  /*
    The rig's own defaults — the numbers its sliders start on. Picked out of the
    air at first, which made the claim above ("the same constants") untrue, and
    also made the plot wrong-looking: a stiffer, lighter-damped spring settled
    inside the first fifth of the frame and left four fifths of flat line.

    At stiffness 130 and damping 15 the ratio is about 0.66 — under one, so it
    overshoots once and comes back, which is the behaviour the entry is about.
    Sixty steps at 1/60s is the one second in which all of that happens.
  */
  const spring = new Spring(0, { stiffness: 130, damping: 15, mass: 1 });
  spring.target = 1;

  const steps = 60;
  const dt = 1 / 60;
  const values = [];
  for (let i = 0; i < steps; i++) {
    spring.step(dt);
    values.push(spring.value);
  }

  const domain = [0, steps - 1];
  const range = [-0.15, 1.5];
  const f = frame(box, domain, range);

  const pts = values.map((v, i) => [f.x(i), f.y(v)]);
  const rest = f.y(1);

  return [
    `<line x1="${n(f.x(domain[0]))}" y1="${n(rest)}" x2="${n(f.x(domain[1]))}" y2="${n(rest)}" stroke="${ink}38" stroke-width="2" stroke-dasharray="6 6"/>`,
    `<line x1="${n(f.x(0))}" y1="${n(f.y(range[0]))}" x2="${n(f.x(0))}" y2="${n(f.y(range[1]))}" stroke="${ink}38" stroke-width="2"/>`,
    polyline(pts, accent, 4),
  ].join('');
}

/**
 * Expected loss per tier of the card book.
 *
 * `expectedLoss` is PD x LGD x EAD; multiplying by the account count gives the
 * tier's contribution. Subprime is a tenth of the accounts and the tallest bar,
 * which is the entire point of the entry.
 */
function plateCredit(box, ink, accent = ACCENT) {
  const tiers = CARD_BOOK.map((b) => ({
    label: b.label,
    value: expectedLoss(b) * b.count,
  }));
  const peak = Math.max(...tiers.map((t) => t.value));

  const pad = 30;
  const w = box - pad * 2;
  const h = box - pad * 2;
  const slot = w / tiers.length;
  const bw = slot * 0.52;

  const bars = tiers
    .map((t, i) => {
      const bh = (t.value / peak) * (h - 40);
      const x = pad + slot * i + (slot - bw) / 2;
      // No tick marks under the bars: with three unlabelled bars a dot says
      // nothing the bar has not already said, and it read as dirt on the card.
      return `<rect x="${n(x)}" y="${n(pad + h - bh)}" width="${n(bw)}" height="${n(bh)}" fill="${i === 2 ? accent : ink}" opacity="${i === 2 ? 0.95 : 0.3}"/>`;
    })
    .join('');

  return `${bars}<line x1="${pad}" y1="${pad + h}" x2="${pad + w}" y2="${pad + h}" stroke="${ink}55" stroke-width="2"/>`;
}

/** The logistic function — the curve the classifier squashes through. */
function plateSigmoid(box, ink, accent = ACCENT) {
  const domain = [-6, 6];
  const range = [-0.12, 1.12];
  const f = frame(box, domain, range);

  const pts = [];
  for (let x = domain[0]; x <= domain[1] + 1e-9; x += 0.1) {
    pts.push([f.x(x), f.y(1 / (1 + Math.exp(-x)))]);
  }

  return [
    `<line x1="${n(f.x(domain[0]))}" y1="${n(f.y(0.5))}" x2="${n(f.x(domain[1]))}" y2="${n(f.y(0.5))}" stroke="${ink}30" stroke-width="2" stroke-dasharray="6 6"/>`,
    `<line x1="${n(f.x(domain[0]))}" y1="${n(f.y(1))}" x2="${n(f.x(domain[1]))}" y2="${n(f.y(1))}" stroke="${ink}30" stroke-width="2"/>`,
    `<line x1="${n(f.x(domain[0]))}" y1="${n(f.y(0))}" x2="${n(f.x(domain[1]))}" y2="${n(f.y(0))}" stroke="${ink}30" stroke-width="2"/>`,
    `<line x1="${n(f.x(0))}" y1="${n(f.y(range[0]))}" x2="${n(f.x(0))}" y2="${n(f.y(range[1]))}" stroke="${ink}38" stroke-width="2"/>`,
    polyline(pts, accent, 4),
    `<circle cx="${n(f.x(0))}" cy="${n(f.y(0.5))}" r="7" fill="${accent}"/>`,
  ].join('');
}

/* ------------------------------------------------------------------ *
 * The pendulums
 * ------------------------------------------------------------------ */

/**
 * The landing's two double pendulums, integrated for sixteen seconds from the
 * page's own default release and drawn as the paths their tips took.
 *
 * Sixteen because that is just past the point where they separate: the two
 * traces lie on top of each other for most of the run and come apart at the
 * end, which is the whole of what the landing shows.
 */
function platePendulum(w, h, ink, accent) {
  const { a, b, pair } = tracePair(16);
  const reach = L1 + L2;
  const scale = (Math.min(w, h) / 2 / reach) * 0.92;
  const cx = w / 2;
  const cy = h / 2;
  const pts = (trail) => trail.map((p) => [cx + p.x * scale, cy + p.y * scale]);
  const copper = '#b4622a';
  const tip = (s) => {
    const x1 = cx + Math.sin(s.t1) * L1 * scale;
    const y1 = cy + Math.cos(s.t1) * L1 * scale;
    return { x1, y1, x2: x1 + Math.sin(s.t2) * L2 * scale, y2: y1 + Math.cos(s.t2) * L2 * scale };
  };
  const p = tip(pair.a);
  return [
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(reach * scale)}" fill="none" stroke="${ink}" stroke-opacity="0.14" stroke-width="1.5" stroke-dasharray="4 7"/>`,
    polyline(pts(a), accent, 1.6, 'opacity="0.85"'),
    polyline(pts(b), copper, 1.6, 'opacity="0.85"'),
    `<path d="M${n(cx)} ${n(cy)} L${n(p.x1)} ${n(p.y1)} L${n(p.x2)} ${n(p.y2)}" fill="none" stroke="${ink}" stroke-width="2.4"/>`,
    `<circle cx="${n(p.x1)}" cy="${n(p.y1)}" r="5" fill="${ink}"/>`,
    `<circle cx="${n(p.x2)}" cy="${n(p.y2)}" r="9" fill="${accent}"/>`,
  ].join('');
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

/**
 * The notebook index: one band per entry, in each entry's own colour.
 *
 * The titles are on the bands. Without them this was six coloured swatches —
 * decorative, and saying nothing a reader could act on. With them the card is
 * the table of contents, which is what the page is.
 */
function plateBands(w, h) {
  const gap = 9;
  const rows = entries.length;
  const bh = (h - gap * (rows - 1)) / rows;
  return entries
    .map((e, i) => {
      const y = i * (bh + gap);
      return `
        <rect x="0" y="${n(y)}" width="${w}" height="${n(bh)}" rx="3" fill="${e.color}"/>
        <rect x="0" y="${n(y)}" width="6" height="${n(bh)}" rx="2" fill="${e.ink}"/>
        <text x="20" y="${n(y + bh / 2 + 5)}" fill="${e.ink}" font-family="JetBrains Mono, monospace" font-size="15" letter-spacing="1.4" opacity="0.75">${esc(e.index)}</text>
        <text x="54" y="${n(y + bh / 2 + 6)}" fill="${e.ink}" font-family="DM Sans, sans-serif" font-size="19" font-weight="500">${esc(e.title)}</text>`;
    })
    .join('');
}

/** The mark, for pages whose subject is the site itself. */
function plateMark(box, ink) {
  const s = box * 0.62;
  const h = (s / 36) * 26;
  return `<g transform="translate(${(box - s) / 2}, ${(box - h) / 2}) scale(${s / 36})" fill="${ink}">
    <path d="${LOGO.one}"/><path d="${LOGO.seven}"/>
  </g>`;
}

/**
 * Every plate takes the same arguments so the renderer never special-cases one.
 * `(width, height, ink, accent)`.
 */
const PLATES = {
  curve: (w, h, ink, accent) => plateCurve(Math.min(w, h), ink, accent),
  histogram: (w, h, ink, accent) => plateHistogram(Math.min(w, h), ink, accent),
  spring: (w, h, ink, accent) => plateSpring(Math.min(w, h), ink, accent),
  credit: (w, h, ink, accent) => plateCredit(Math.min(w, h), ink, accent),
  sigmoid: (w, h, ink, accent) => plateSigmoid(Math.min(w, h), ink, accent),
  pendulum: (w, h, ink, accent) => platePendulum(w, h, ink, accent),
  bands: (w, h) => plateBands(w, h),
  mark: (w, h, ink) => plateMark(Math.min(w, h), ink),
};

/** Plates that want a landscape box rather than the square the diagrams use. */
const PLATE_BOX = {
  pendulum: { w: 470, h: 470 },
  bands: { w: 500, h: 430 },
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
    <div class="foot"><span>${esc(card.footLeft ?? 'seventeenstudios.co')}</span><span>${esc(card.footRight ?? '')}</span></div>
  </div>
</body></html>`;
}

/* ------------------------------------------------------------------ *
 * What gets made
 * ------------------------------------------------------------------ */


function cards() {
  const grasp = products.find((p) => p.slug === 'grasp');

  const list = [
    {
      file: 'home',
      label: site.location,
      title: founder.name,
      standfirst: `${founder.role}. Interactive instruments, simulations, and software built to be taken apart.`,
      plate: 'pendulum',
      titleSize: 58,
      footRight: 'Portfolio',
    },
    {
      file: 'founder',
      label: 'Founder',
      title: founder.name,
      standfirst: `${founder.title}, ${founder.employer}. A sketchbook that draws its way to a résumé.`,
      stage: stageSketch,
      ground: SKETCH.paper,
      ink: '#1d1d21',
      titleSize: 64,
      footRight: 'PDF · DOCX',
    },
    {
      file: 'lab',
      label: 'Lab',
      title: 'Working instruments',
      standfirst: 'A Monte Carlo risk desk, a credit model and a physics rig. Move the inputs.',
      plate: 'histogram',
      footRight: '25,000 paths · 95%',
    },
    {
      file: 'grasp-course',
      label: `Grasp · ${graspModule.position}`,
      title: graspModule.title,
      standfirst: `${graspModule.lessons.length} lessons that build the derivative from steepness, one idea at a time.`,
      stage: stageChalkboard,
      ground: SLATE,
      onDark: true,
      titleSize: 84,
      footRight: 'Learn calculus',
    },
    {
      file: 'notebook',
      label: 'Notebook',
      title: 'Lessons',
      standfirst: 'Each one starts from nothing and ends with the thing built — the maths, the physics and the code.',
      plate: 'bands',
      footRight: `${entries.length} lessons`,
    },
    {
      file: 'products',
      label: 'Products',
      title: 'Shipped',
      standfirst: grasp ? `${grasp.name} — ${grasp.tagline}` : undefined,
      plate: 'curve',
      color: '#dce5fc',
      ink: '#12379c',
      footRight: grasp?.platform ?? '',
    },
    {
      file: 'products-grasp',
      label: 'Product',
      title: grasp?.name ?? 'Grasp',
      standfirst: grasp?.tagline,
      plate: 'curve',
      ground: '#dce5fc',
      ink: '#12379c',
      titleSize: 92,
      footRight: grasp?.platform ?? 'iOS',
    },
    {
      file: 'start',
      label: 'Contact',
      title: 'Roles, questions, second opinions.',
      standfirst: 'The mathematics, the simulations, or how a page was built.',
      plate: 'mark',
      titleSize: 60,
      footRight: site.location,
    },
  ];

  for (const entry of entries) {
    list.push({
      file: `notebook-${entry.slug}`,
      label: `Notebook · ${entry.index}`,
      title: entry.title,
      standfirst: entry.standfirst,
      plate: NOTEBOOK_CARD[entry.slug]?.plate ?? 'mark',
      ground: entry.color,
      ink: entry.ink,
      /*
        The entry's own ink, not the site's blue. Each notebook colour pair is
        chosen to sit together, and dropping a cobalt accent onto the warm
        Monte Carlo card was the one place the set stopped looking deliberate.
        Contrast still carries the highlight — the same hue at full strength
        against bars at a quarter.
      */
      accent: entry.ink,
      footRight: entry.topic,
    });
  }

  for (const policy of policies) {
    list.push({
      file: `legal-${policy.slug}`,
      label: 'Legal',
      title: policy.title,
      standfirst: policy.scope,
      plate: 'mark',
      titleSize: 58,
      footRight: site.name,
    });
  }

  return list;
}

/* ------------------------------------------------------------------ *
 * Rendering
 * ------------------------------------------------------------------ */

const CHROME_CANDIDATES = [
  process.env.CHROMIUM_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p));
  if (!found) {
    throw new Error(
      'No Chrome found. Set CHROMIUM_PATH to a Chrome or Chromium executable.',
    );
  }
  return found;
}

/** Minimal CDP client — one socket, promise per message id. */
class Devtools {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      const entry = this.pending.get(msg.id);
      if (!entry) return;
      this.pending.delete(msg.id);
      msg.error ? entry.reject(new Error(msg.error.message)) : entry.resolve(msg.result);
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
}

async function waitForEndpoint(port, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch {
      /* not listening yet */
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  throw new Error('Chrome did not open a debugging port.');
}

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
  const profile = mkdtempSync(path.join(os.tmpdir(), 'og-profile-'));
  const port = 9400 + Math.floor(Math.random() * 400);

  const chrome = spawn(
    findChrome(),
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions',
      '--hide-scrollbars',
      '--force-device-scale-factor=1',
      '--font-render-hinting=none',
      'about:blank',
    ],
    { stdio: 'ignore' },
  );

  let failures = 0;
  try {
    const wsUrl = await waitForEndpoint(port);
    const socket = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    const cdp = new Devtools(socket);

    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });

    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: W, height: H, deviceScaleFactor: 1, mobile: false }, sessionId);

    for (const card of wanted) {
      const file = path.join(tmp, `${card.file}.html`);
      writeFileSync(file, html(card), 'utf8');

      const loaded = new Promise((resolve) => {
        const onEvent = (event) => {
          const msg = JSON.parse(event.data);
          if (msg.sessionId === sessionId && msg.method === 'Page.loadEventFired') {
            socket.removeEventListener('message', onEvent);
            resolve();
          }
        };
        socket.addEventListener('message', onEvent);
      });

      await cdp.send('Page.navigate', { url: pathToUrl(file) }, sessionId);
      await loaded;

      /*
        Webfonts load asynchronously and a screenshot taken before they arrive
        is set in the fallback face — which looks close enough in a thumbnail to
        ship by accident. Waiting on `document.fonts.ready` is the only reliable
        gate; the extra frame is for the SVG to paint.
      */
      await cdp.send('Runtime.evaluate', {
        expression: `document.fonts.ready.then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))) `,
        awaitPromise: true,
      }, sessionId);

      const shot = await cdp.send('Page.captureScreenshot',
        { format: 'png', captureBeyondViewport: false }, sessionId);

      const dest = path.join(outDir, `${card.file}.png`);
      writeFileSync(dest, Buffer.from(shot.data, 'base64'));
      const kb = (statSync(dest).size / 1024).toFixed(0);
      console.log(`  ${card.file}.png`.padEnd(46) + `${kb} KB`);
    }

    socket.close();
  } catch (error) {
    failures++;
    console.error(error);
  } finally {
    chrome.kill();
    rmSync(tmp, { recursive: true, force: true });
    /*
      Best effort. Chrome's crash handler holds a lock on the profile for a
      moment after the process is signalled, and on Windows that surfaces as
      EBUSY — which would otherwise fail a run whose seventeen images had all
      been written successfully. It is a temp directory; the OS reclaims it.
    */
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* left for the OS */
    }
  }

  if (failures) process.exit(1);
  console.log(`\n${wanted.length} card${wanted.length === 1 ? '' : 's'} -> public/og/`);
}

function pathToUrl(p) {
  return 'file:///' + p.replace(/\\/g, '/').replace(/^\//, '');
}

main();
