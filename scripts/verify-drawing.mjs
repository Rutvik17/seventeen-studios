#!/usr/bin/env node
/**
 * Check the built board drawing's geometry.
 *
 * ---
 *
 * WHY THIS EXISTS
 *
 * Every geometry bug on this site so far has been invisible in the source and
 * obvious in the output. The torii's lintel curved the wrong way while the
 * comment above it described the right way. Copper traces stopped a millimetre
 * short of every pad. The ribbon's ends met their edges side-on. And the display
 * was drawn 640 mm wide on an 88 mm board, because `PANEL.width` is pixels and
 * `PANEL.moduleWidth` is millimetres and nothing in either name says so.
 *
 * Not one of those was findable by reading the code. All of them were obvious
 * within seconds of reading the rendered path data. So the rendered path data is
 * what gets checked.
 *
 * It runs as `postbuild`, against `out/`, so nothing reaches a deploy without
 * passing. Types cannot catch a number in the wrong unit; this can.
 *
 * Run: node scripts/verify-drawing.mjs
 */

import { readFileSync } from 'node:fs';

let failures = 0;

function check(label, condition, detail = '') {
  if (!condition) failures += 1;
  console.log(`  ${condition ? 'ok  ' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
}

const html = readFileSync(new URL('../out/index.html', import.meta.url), 'utf8');

const marker = html.indexOf('board-story__svg');
if (marker === -1) {
  console.error('! the board drawing is not in the export');
  process.exit(1);
}
const svg = html.slice(html.lastIndexOf('<svg', marker), html.indexOf('</svg>', marker) + 6);

/* ---------- the frame ---------- */

const viewBox = /viewBox="([^"]+)"/.exec(svg)[1].split(/\s+/).map(Number);
const [vx, vy, vw, vh] = viewBox;
const frame = { left: vx, right: vx + vw, top: vy, bottom: vy + vh };

/* ---------- everything must be inside it ---------- */

const attrs = (tag) => {
  const out = {};
  for (const [, k, v] of tag.matchAll(/([\w-]+)="(-?[\d.]+)"/g)) out[k] = Number(v);
  return out;
};

// The display, via its clip rectangle — the element that was 644 units wide.
const clip = /<clipPath id="display-clip"[^>]*>\s*<rect([^>]+)>/.exec(svg);
check('display clip exists', Boolean(clip));
if (clip) {
  const r = attrs(clip[1]);
  check(
    'display fits the frame',
    r.x >= frame.left && r.x + r.width <= frame.right,
    `x ${r.x}..${(r.x + r.width).toFixed(1)} in ${frame.left}..${frame.right}`,
  );
  /*
    A physical dimension on this drawing is millimetres and this board is 88 mm
    across. Anything past 200 is a pixel count that has been used as a length —
    the exact mistake that drew a 640 mm display.
  */
  check('display width is a length, not a pixel count', r.width < 200, `${r.width}`);
}

/* ---------- copper ---------- */

const traces = [...svg.matchAll(/data-trace="true"[^>]*d="([^"]+)"/g)].map((m) => m[1]);
check('traces present', traces.length > 5, `${traces.length} nets`);

let rightAngles = 0;
let offFrame = 0;
for (const d of traces) {
  const pts = [...d.matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  for (const [x, y] of pts) {
    if (x < frame.left || x > frame.right || y < frame.top || y > frame.bottom) offFrame += 1;
  }
  /*
    Every segment must be axis-aligned or exactly 45°. Right-angle copper traps
    etchant at the acute inside corner and over-etches; every fabricator's design
    rules forbid it, and it is the detail that would expose the whole drawing as
    decoration.
  */
  for (let i = 1; i < pts.length; i++) {
    const dx = Math.abs(pts[i][0] - pts[i - 1][0]);
    const dy = Math.abs(pts[i][1] - pts[i - 1][1]);
    if (dx < 1e-6 || dy < 1e-6) continue;
    if (Math.abs(dx - dy) > 1e-3) rightAngles += 1;
  }
}
check('every trace segment is axis-aligned or 45°', rightAngles === 0, `${rightAngles} bad`);
check('no trace leaves the frame', offFrame === 0, `${offFrame} points outside`);

/* ---------- the ribbon ---------- */

const body = /class="board-story__ribbon-body"[^>]*d="([^"]+)"/.exec(svg)
  ?? /d="([^"]+)"\s+class="board-story__ribbon-body"/.exec(svg);
check('ribbon present', Boolean(body));
if (body) {
  const pts = [...body[1].matchAll(/[ML]\s*(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
  const half = pts.length / 2;
  // The band's two edges at each end must be the cable's width apart, and the
  // end must be flat — both edges at the same y — or it meets a horizontal edge
  // side-on and appears to slice into it.
  const startSpan = Math.abs(pts[0][0] - pts[pts.length - 1][0]);
  const endSpan = Math.abs(pts[half - 1][0] - pts[half][0]);
  check('ribbon starts at its full width', startSpan > 3 && startSpan < 7, startSpan.toFixed(2));
  check('ribbon ends at its full width', endSpan > 3 && endSpan < 7, endSpan.toFixed(2));
  check(
    'ribbon meets the connector squarely',
    Math.abs(pts[0][1] - pts[pts.length - 1][1]) < 0.01,
  );
  check('ribbon meets the display squarely', Math.abs(pts[half - 1][1] - pts[half][1]) < 0.01);
}

console.log();
if (failures > 0) {
  console.error(`${failures} drawing check(s) failed.`);
  process.exit(1);
}
console.log('The board drawing is geometrically sound.');
