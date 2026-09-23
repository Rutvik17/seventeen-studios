/**
 * The drawings on the right-hand page of each chapter that is not part of the
 * spark-and-bridge story in `geometry.ts`.
 *
 * Each is authored in a 600 x 600 box and fitted to the page by the renderer.
 * Lines are listed back to front — the order the pencil draws them in — and
 * every drawing depicts something real from the chapter it sits in: the three
 * screens of a communications suite, a car and a city, a phone taken from an
 * empty repository to an acquisition, the mark of this sketchbook, and the
 * pocket the résumé is kept in.
 */

import { circle, line, smooth, type Pt } from './geometry';

export const SKETCH_BOX = { w: 600, h: 600 } as const;

export type Pen = 'charcoal' | 'graphite' | 'ink' | 'accent';
export type SketchLine = { pts: Pt[]; pen: Pen; w: number };
export type SketchLabel = { text: string; x: number; y: number; pen: Pen; size: number; rot?: number };
export type Drawing = { lines: SketchLine[]; labels: SketchLabel[] };

const L = (pts: Pt[], pen: Pen = 'charcoal', w = 2.2): SketchLine => ({ pts, pen, w });

function rect(x: number, y: number, w: number, h: number): Pt[] {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
}

function roundRect(x: number, y: number, w: number, h: number, r: number): Pt[] {
  const out: Pt[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= 6; i += 1) {
      const a = a0 + (i / 6) * (Math.PI / 2);
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
    }
  };
  arc(x + w - r, y + r, -Math.PI / 2);
  arc(x + w - r, y + h - r, 0);
  arc(x + r, y + h - r, Math.PI / 2);
  arc(x + r, y + r, Math.PI);
  out.push({ ...out[0] });
  return out;
}

function rotate(pts: Pt[], c: Pt, a: number): Pt[] {
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  return pts.map((p) => ({
    x: c.x + (p.x - c.x) * cos - (p.y - c.y) * sin,
    y: c.y + (p.x - c.x) * sin + (p.y - c.y) * cos,
  }));
}

function arc(c: Pt, r: number, from: number, to: number, steps = 16): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const a = from + (to - from) * (i / steps);
    out.push({ x: c.x + Math.cos(a) * r, y: c.y + Math.sin(a) * r });
  }
  return out;
}

/** A row of pretend text: short wavy strokes, the way a sketch stands in for copy. */
function scribbleText(x: number, y: number, w: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 16; i += 1) {
    out.push({ x: x + (w * i) / 16, y: y + Math.sin(i * 1.9) * 2.2 });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Kanata, 2018 — one component library, three platforms
 * ------------------------------------------------------------------ */

function mitel(): Drawing {
  const lines: SketchLine[] = [];
  // The three platforms.
  lines.push(L(rect(40, 110, 250, 160)), L(line({ x: 165, y: 270 }, { x: 165, y: 310 }), 'charcoal'), L(line({ x: 110, y: 312 }, { x: 220, y: 312 })));
  lines.push(L(rect(320, 80, 240, 170)), L(line({ x: 320, y: 106 }, { x: 560, y: 106 }), 'graphite', 1.4));
  [334, 347, 360].forEach((x) => lines.push(L(circle({ x, y: 93 }, 3.5, 12), 'graphite', 1.2)));
  lines.push(L(roundRect(420, 300, 110, 190, 14)), L(line({ x: 460, y: 314 }, { x: 490, y: 314 }), 'graphite', 1.4));
  // The same button, in each — the thing built once.
  lines.push(L(roundRect(80, 200, 90, 28, 8), 'ink', 2), L(roundRect(350, 190, 90, 28, 8), 'ink', 2), L(roundRect(436, 420, 78, 26, 8), 'ink', 2));
  lines.push(L(scribbleText(80, 150, 170), 'graphite', 1.2), L(scribbleText(350, 140, 170), 'graphite', 1.2), L(scribbleText(436, 350, 70), 'graphite', 1.2));
  // The library, and a line from it to each use.
  lines.push(L(roundRect(90, 420, 200, 120, 14), 'charcoal', 2.4));
  [448, 480, 512].forEach((y) => lines.push(L(roundRect(112, y - 11, 110, 22, 7), 'ink', 1.6)));
  lines.push(
    L(smooth([{ x: 190, y: 420 }, { x: 170, y: 360 }, { x: 125, y: 232 }], 10), 'graphite', 1.3),
    L(smooth([{ x: 270, y: 440 }, { x: 330, y: 330 }, { x: 395, y: 222 }], 10), 'graphite', 1.3),
    L(smooth([{ x: 290, y: 480 }, { x: 370, y: 470 }, { x: 436, y: 440 }], 10), 'graphite', 1.3),
  );
  return {
    lines,
    labels: [
      { text: 'desktop', x: 165, y: 96, pen: 'graphite', size: 26 },
      { text: 'web', x: 440, y: 66, pen: 'graphite', size: 26 },
      { text: 'mobile', x: 560, y: 520, pen: 'graphite', size: 26 },
      { text: 'built once', x: 190, y: 572, pen: 'ink', size: 30 },
      { text: '−25% duplicate code', x: 420, y: 578, pen: 'accent', size: 28, rot: -0.04 },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Two cities, 2021 — a connected car and a city's paperwork
 * ------------------------------------------------------------------ */

function nuvalence(): Drawing {
  const lines: SketchLine[] = [];
  const ground = 470;
  lines.push(L(line({ x: 20, y: ground }, { x: 580, y: ground }, 30), 'graphite', 1.4));
  // The car.
  lines.push(
    L(
      smooth(
        [
          { x: 40, y: ground - 30 },
          { x: 52, y: ground - 62 },
          { x: 110, y: ground - 76 },
          { x: 150, y: ground - 112 },
          { x: 220, y: ground - 114 },
          { x: 262, y: ground - 78 },
          { x: 300, y: ground - 70 },
          { x: 312, y: ground - 38 },
          { x: 300, y: ground - 28 },
        ],
        8,
      ),
    ),
    L(line({ x: 40, y: ground - 28 }, { x: 300, y: ground - 28 }, 20)),
    L(line({ x: 158, y: ground - 106 }, { x: 150, y: ground - 78 }), 'graphite', 1.4),
    L(line({ x: 206, y: ground - 108 }, { x: 214, y: ground - 78 }), 'graphite', 1.4),
    L(circle({ x: 95, y: ground - 24 }, 22, 28)),
    L(circle({ x: 255, y: ground - 24 }, 22, 28)),
  );
  // Its signal.
  [22, 38, 54].forEach((r) => lines.push(L(arc({ x: 185, y: ground - 128 }, r, -Math.PI * 0.8, -Math.PI * 0.2), 'ink', 1.8)));
  // The city.
  const towers: [number, number, number][] = [
    [352, 110, 34],
    [390, 190, 40],
    [434, 250, 30],
    [468, 160, 36],
    [508, 220, 32],
    [544, 130, 30],
  ];
  towers.forEach(([x, h, w]) => {
    lines.push(L(rect(x, ground - h, w, h), 'charcoal', 2));
    for (let y = ground - h + 16; y < ground - 10; y += 22) lines.push(L(line({ x: x + 8, y }, { x: x + w - 8, y }, 3), 'graphite', 1));
  });
  lines.push(L(line({ x: 454, y: ground - 250 }, { x: 449, y: ground - 300 }, 6), 'charcoal', 1.6));
  // The link between them: the job.
  lines.push(L(smooth([{ x: 185, y: ground - 186 }, { x: 290, y: ground - 330 }, { x: 420, y: ground - 320 }, { x: 452, y: ground - 262 }], 14), 'accent', 2.4));
  return {
    lines,
    labels: [
      { text: 'Ford — connected vehicle', x: 176, y: ground + 44, pen: 'graphite', size: 26 },
      { text: 'New York City', x: 466, y: ground + 44, pen: 'graphite', size: 26 },
      { text: 'people ⇄ machinery', x: 300, y: 110, pen: 'accent', size: 30, rot: -0.05 },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * An empty repository, 2022 — one app, two stores, an acquisition
 * ------------------------------------------------------------------ */

function shopware(): Drawing {
  const lines: SketchLine[] = [];
  lines.push(L(roundRect(130, 50, 230, 470, 30), 'charcoal', 2.6));
  lines.push(L(roundRect(148, 86, 194, 400, 12), 'graphite', 1.4));
  lines.push(L(line({ x: 220, y: 66 }, { x: 270, y: 66 }), 'graphite', 1.6));
  // The app: a header, a list of jobs, a big button.
  lines.push(L(line({ x: 148, y: 132 }, { x: 342, y: 132 }), 'graphite', 1.2));
  lines.push(L(scribbleText(166, 112, 110), 'charcoal', 1.4));
  [170, 222, 274, 326].forEach((y) => {
    lines.push(L(circle({ x: 180, y: y + 12 }, 12, 16), 'ink', 1.5));
    lines.push(L(scribbleText(204, y + 6, 116), 'graphite', 1.1));
    lines.push(L(scribbleText(204, y + 20, 70), 'graphite', 1));
  });
  lines.push(L(roundRect(170, 400, 150, 44, 12), 'ink', 2.2));
  // The wrench: what the software is for.
  const wrench = [
    ...line({ x: 402, y: 470 }, { x: 500, y: 250 }, 12),
    ...arc({ x: 522, y: 212 }, 42, Math.PI * 0.62, Math.PI * 2.05, 24),
  ];
  lines.push(L(wrench, 'charcoal', 2.2));
  lines.push(L(line({ x: 424, y: 480 }, { x: 520, y: 262 }, 12), 'charcoal', 2.2));
  // The stamp.
  lines.push(L(rotate(roundRect(236, 250, 250, 76, 10), { x: 361, y: 288 }, -0.2), 'accent', 3));
  return {
    lines,
    labels: [
      { text: 'ACQUIRED', x: 361, y: 290, pen: 'accent', size: 46, rot: -0.2 },
      { text: 'iOS · Android', x: 245, y: 566, pen: 'graphite', size: 28 },
      { text: 'from an empty repo', x: 470, y: 90, pen: 'ink', size: 26, rot: 0.06 },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Now — this sketchbook
 * ------------------------------------------------------------------ */

/** The 17 mark from `Logo.tsx`, as straight-line outlines, in its 36 x 26 units. */
const ONE: [number, number][] = [
  [13, 0], [13, 26], [6.5, 26], [6.5, 6.5], [1.5, 9.5], [1.5, 3], [7.5, 0], [13, 0],
];
const SEVEN: [number, number][] = [
  [19, 0], [36, 0], [36, 5.5], [27, 26], [20, 26], [29, 6], [19, 6], [19, 0],
];

function studio(): Drawing {
  const s = 12;
  const ox = 84;
  const oy = 130;
  const toPts = (p: [number, number][]) => {
    const out: Pt[] = [];
    for (let i = 1; i < p.length; i += 1) {
      out.push(...line({ x: ox + p[i - 1][0] * s, y: oy + p[i - 1][1] * s }, { x: ox + p[i][0] * s, y: oy + p[i][1] * s }, 8).slice(i === 1 ? 0 : 1));
    }
    return out;
  };
  const lines: SketchLine[] = [L(toPts(ONE), 'charcoal', 3), L(toPts(SEVEN), 'charcoal', 3)];
  // Hatching inside the 1's stem and the 7's bar, as a letterer blocks in.
  for (let y = oy + 10; y < oy + 26 * s - 6; y += 12) lines.push(L(line({ x: ox + 6.5 * s + 4, y }, { x: ox + 13 * s - 4, y: y - 8 }, 3), 'graphite', 1));
  for (let x = ox + 19 * s + 6; x < ox + 36 * s - 4; x += 12) lines.push(L(line({ x, y: oy + 4 }, { x: x - 8, y: oy + 5.5 * s - 4 }, 3), 'graphite', 1));
  // Arrows out to what is in the book.
  lines.push(
    L(smooth([{ x: 120, y: 470 }, { x: 110, y: 520 }, { x: 150, y: 548 }], 8), 'ink', 1.6),
    L(smooth([{ x: 300, y: 470 }, { x: 300, y: 520 }, { x: 300, y: 546 }], 8), 'ink', 1.6),
    L(smooth([{ x: 480, y: 470 }, { x: 490, y: 520 }, { x: 452, y: 548 }], 8), 'ink', 1.6),
  );
  return {
    lines,
    labels: [
      { text: 'Grasp', x: 160, y: 578, pen: 'ink', size: 28 },
      { text: 'notebook', x: 300, y: 578, pen: 'ink', size: 28 },
      { text: 'this book', x: 440, y: 578, pen: 'ink', size: 28 },
      { text: 'p. 17', x: 520, y: 90, pen: 'accent', size: 30, rot: 0.08 },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * The back pocket — where the résumé is kept
 * ------------------------------------------------------------------ */

function pocket(): Drawing {
  const lines: SketchLine[] = [];
  // Two sheets, tucked in and sticking out.
  const sheetA = rotate(rect(110, 60, 190, 300), { x: 205, y: 210 }, -0.1);
  const sheetB = rotate(rect(300, 80, 190, 300), { x: 395, y: 230 }, 0.08);
  lines.push(L(sheetA, 'charcoal', 2), L(sheetB, 'charcoal', 2));
  [110, 140, 160, 180, 200].forEach((y, i) => lines.push(L(rotate(scribbleText(130, y, i === 0 ? 90 : 150), { x: 205, y: 210 }, -0.1), 'graphite', 1)));
  [130, 160, 180, 200, 220].forEach((y, i) => lines.push(L(rotate(scribbleText(320, y, i === 0 ? 90 : 150), { x: 395, y: 230 }, 0.08), 'graphite', 1)));
  // The pocket, glued inside the back cover.
  lines.push(L([{ x: 50, y: 290 }, { x: 550, y: 290 }, { x: 550, y: 560 }, { x: 50, y: 560 }, { x: 50, y: 290 }], 'charcoal', 2.6));
  lines.push(L([{ x: 50, y: 290 }, { x: 300, y: 400 }, { x: 550, y: 290 }], 'graphite', 1.6));
  lines.push(L(line({ x: 62, y: 548 }, { x: 538, y: 548 }, 20), 'graphite', 1));
  return {
    lines,
    labels: [
      { text: 'PDF', x: 200, y: 262, pen: 'accent', size: 44, rot: -0.1 },
      { text: 'DOCX', x: 400, y: 284, pen: 'ink', size: 44, rot: 0.08 },
      { text: 'the whole record', x: 300, y: 500, pen: 'graphite', size: 30 },
    ],
  };
}

export const DRAWINGS = { mitel, nuvalence, shopware, studio, pocket } as const;
export type DrawingId = keyof typeof DRAWINGS;
