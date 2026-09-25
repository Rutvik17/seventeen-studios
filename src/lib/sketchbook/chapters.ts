/**
 * The drawings on the right-hand page of each chapter that is not part of the
 * spark-and-bridge story in `geometry.ts`.
 *
 * Each is authored in a 600 x 600 box and fitted to the page by the renderer.
 * Lines are listed back to front — the order the pencil draws them in — and
 * every drawing depicts something real from the chapter it sits in: the three
 * screens of a communications suite, a Ford in front of the Brooklyn Bridge and
 * Lower Manhattan, a repair shop and the app its technicians carry, the mark of
 * this sketchbook, and the pocket the résumé is kept in.
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
 * Ford and New York City, 2021 — an F-150 Raptor on the Brooklyn
 * waterfront, the bridge behind it and Lower Manhattan behind that
 * ------------------------------------------------------------------ */

/**
 * Maps a car's own proportions — `u` along its length from the rear bumper,
 * `v` up from the road, both as fractions of its length — onto the page, so a
 * profile can be written once in real-car ratios and placed anywhere.
 */
function carFrame(rearX: number, road: number, length: number, facing: 1 | -1) {
  return (u: number, v: number): Pt => ({ x: rearX + facing * u * length, y: road - v * length });
}

/** A wheel: tyre, rim, hub, and paired spokes. */
function wheel(c: Pt, r: number, spokes: number, pen: Pen = 'charcoal', w = 2.2): SketchLine[] {
  const out = [L(circle(c, r, 36), pen, w), L(circle(c, r * 0.72, 30), pen, w * 0.6), L(circle(c, r * 0.16, 10), pen, w * 0.5)];
  const at = (a: number, k: number): Pt => ({ x: c.x + Math.cos(a) * r * k, y: c.y + Math.sin(a) * r * k });
  for (let k = 0; k < spokes; k += 1) {
    const a = (k / spokes) * Math.PI * 2 - Math.PI / 2;
    for (const d of [-0.11, 0.11]) out.push(L(line(at(a + d, 0.2), at(a + d * 0.5, 0.68), 4), 'graphite', w * 0.45));
  }
  return out;
}

/** Straight segments through `pts`, subdivided so the pencil's wobble follows them. */
function path(pts: Pt[], per = 4): Pt[] {
  const out: Pt[] = [pts[0]];
  for (let i = 1; i < pts.length; i += 1) out.push(...line(pts[i - 1], pts[i], per).slice(1));
  return out;
}

/** A little water: a stroke that rises and falls as it goes. */
function ripple(x: number, y: number, len: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= 10; i += 1) out.push({ x: x + (len * i) / 10, y: y + Math.sin(i * 1.3) * 1.6 });
  return out;
}

function nuvalence(): Drawing {
  const lines: SketchLine[] = [];

  // Lower Manhattan, across the river: furthest back, so drawn first and light.
  const shore = 300;
  const block = (x: number, w: number, h: number): Pt[] => [
    { x, y: shore },
    { x, y: shore - h },
    { x: x + w, y: shore - h },
    { x: x + w, y: shore },
  ];
  const blocks: [number, number, number][] = [
    [192, 30, 118],
    [224, 24, 152],
    [250, 36, 104],
    [346, 30, 170],
    [378, 38, 126],
    [530, 34, 110],
    [566, 30, 138],
  ];
  blocks.forEach(([x, w, h], i) => {
    lines.push(L(block(x, w, h), 'graphite', 1.3));
    if (i % 2 === 0) {
      for (let y = shore - h + 14; y < shore - 8; y += 18) lines.push(L(line({ x: x + 5, y }, { x: x + w - 5, y }, 3), 'graphite', 0.8));
    }
  });
  // One World Trade Center: a square base, then the tapering tower whose
  // crossed facets make its silhouette, and the spire.
  lines.push(
    L([{ x: 296, y: shore }, { x: 296, y: 212 }, { x: 307, y: 62 }, { x: 329, y: 62 }, { x: 340, y: 212 }, { x: 340, y: shore }], 'graphite', 1.5),
    L(line({ x: 296, y: 212 }, { x: 329, y: 62 }, 8), 'graphite', 0.9),
    L(line({ x: 340, y: 212 }, { x: 307, y: 62 }, 8), 'graphite', 0.9),
    L(line({ x: 318, y: 62 }, { x: 318, y: 18 }, 6), 'graphite', 1.2),
  );
  // 8 Spruce Street, its steel rippling down the side.
  const spruce: Pt[] = [];
  for (let y = shore; y >= shore - 188; y -= 8) spruce.push({ x: 420 + Math.sin(y * 0.09) * 3, y });
  lines.push(L(spruce, 'graphite', 1.3), L([{ x: 420, y: shore - 188 }, { x: 446, y: shore - 188 }, { x: 446, y: shore }], 'graphite', 1.3));
  // The Woolworth Building's pointed crown.
  lines.push(
    L(
      [
        { x: 500, y: shore },
        { x: 500, y: shore - 146 },
        { x: 506, y: shore - 164 },
        { x: 513, y: shore - 184 },
        { x: 520, y: shore - 164 },
        { x: 526, y: shore - 146 },
        { x: 526, y: shore },
      ],
      'graphite',
      1.3,
    ),
  );
  lines.push(L(line({ x: 176, y: shore }, { x: 600, y: shore }, 20), 'graphite', 1.2));

  // The Brooklyn Bridge. The deck first, with its stiffening truss.
  const deck = (x: number) => 276 + (x / 600) * 6;
  lines.push(L(line({ x: 0, y: deck(0) }, { x: 600, y: deck(600) }, 30), 'charcoal', 1.8));
  lines.push(L(line({ x: 0, y: deck(0) + 9 }, { x: 600, y: deck(600) + 9 }, 30), 'charcoal', 1.4));
  const truss: Pt[] = [];
  for (let x = 0; x <= 600; x += 9) truss.push({ x, y: deck(x) + ((x / 9) % 2 ? 9 : 0) });
  lines.push(L(truss, 'graphite', 0.8));

  // Its towers: granite, each pierced by two pointed Gothic arches.
  type Arch = { half: number; apex: number; spring: number; foot: number; gap: number };
  const tower = (cx: number, half: number, top: number, base: number, arch: Arch) => {
    lines.push(L([{ x: cx - half - 3, y: base }, { x: cx - half, y: top }, { x: cx + half, y: top }, { x: cx + half + 3, y: base }], 'charcoal', 2.4));
    lines.push(L(line({ x: cx - half - 5, y: top }, { x: cx + half + 5, y: top }, 8), 'charcoal', 1.8));
    lines.push(L(line({ x: cx - half, y: top + 8 }, { x: cx + half, y: top + 8 }, 8), 'graphite', 1.1));
    for (const side of [-1, 1]) {
      const ax = cx + side * arch.gap;
      const mid = (arch.spring + arch.apex) / 2 - 3;
      lines.push(
        L(
          [
            { x: ax - arch.half, y: arch.foot },
            ...smooth([{ x: ax - arch.half, y: arch.spring }, { x: ax - arch.half * 0.55, y: mid }, { x: ax, y: arch.apex }], 6),
            ...smooth([{ x: ax, y: arch.apex }, { x: ax + arch.half * 0.55, y: mid }, { x: ax + arch.half, y: arch.spring }], 6).slice(1),
            { x: ax + arch.half, y: arch.foot },
          ],
          'charcoal',
          1.8,
        ),
      );
    }
    // The shadowed side, blocked in.
    for (let k = 1; k <= 3; k += 1) {
      lines.push(L(line({ x: cx + half - k * 3.5, y: top + 12 }, { x: cx + half + 2 - k * 3.5, y: base - 4 }, 10), 'graphite', 0.8));
    }
  };
  tower(130, 40, 92, 372, { half: 13, apex: 176, spring: 204, foot: 300, gap: 20 });
  tower(475, 18, 172, 318, { half: 5.5, apex: 214, spring: 226, foot: 292, gap: 8 });

  // The main cables: a deep catenary between the towers, shallower spans outside.
  const cable = (x0: number, y0: number, x1: number, y1: number, sag: number) => (x: number) => {
    const u = (x - x0) / (x1 - x0);
    return y0 + (y1 - y0) * u + sag * 4 * u * (1 - u);
  };
  const spans: [number, number, (x: number) => number][] = [
    [0, 130, cable(0, 212, 130, 96, 22)],
    [130, 475, cable(130, 96, 475, 175, 114)],
    [475, 600, cable(475, 175, 600, 238, 14)],
  ];
  for (const offset of [0, 5]) {
    const pts: Pt[] = [];
    spans.forEach(([a, b, y], i) => {
      for (let x = a; x <= b; x += 5) if (!(i && x === a)) pts.push({ x, y: y(x) + offset });
    });
    lines.push(L(pts, 'charcoal', offset ? 1.1 : 1.6));
  }
  // Suspenders hang straight down from the cables to the deck...
  spans.forEach(([a, b, y]) => {
    for (let x = a + 12; x < b - 10; x += 12) {
      if (Math.abs(x - 130) > 44 && Math.abs(x - 475) > 22) lines.push(L(line({ x, y: y(x) + 5 }, { x, y: deck(x) }, 4), 'graphite', 0.8));
    }
  });
  // ...and the diagonal stays fan out from each tower top: the bridge's web.
  const stays: [Pt, number[]][] = [
    [{ x: 138, y: 108 }, [182, 204, 226, 248, 270]],
    [{ x: 122, y: 108 }, [80, 58, 36, 14]],
    [{ x: 481, y: 182 }, [506, 526, 546, 566, 586]],
    [{ x: 469, y: 182 }, [444, 424, 404, 384]],
  ];
  stays.forEach(([top, feet]) => feet.forEach((x) => lines.push(L(line(top, { x, y: deck(x) }, 8), 'graphite', 0.8))));

  // The East River.
  const water: [number, number, number][] = [
    [20, 316, 50], [200, 314, 60], [296, 322, 44], [380, 314, 50], [530, 320, 46],
    [36, 336, 70], [214, 334, 44], [396, 340, 60], [520, 342, 50],
    [8, 358, 40], [186, 360, 56], [420, 364, 70], [540, 362, 40],
  ];
  water.forEach(([x, y, len]) => lines.push(L(ripple(x, y, len), 'graphite', 1)));
  lines.push(L(ripple(64, 374, 132), 'graphite', 1.2));

  // The waterfront railing the truck is parked along — kept above its roof,
  // since a line drawing has no way to hide one thing behind another.
  lines.push(L(line({ x: 0, y: 382 }, { x: 600, y: 382 }, 30), 'graphite', 1.3));
  for (let x = 14; x < 600; x += 36) lines.push(L(line({ x, y: 382 }, { x, y: 390 }, 2), 'graphite', 1.1));

  // An F-150 Raptor, in profile, facing right, in real proportions: a tall
  // cab, a short bed, squared-off fender flares over big off-road tyres.
  const road = 548;
  const length = 450;
  const at = carFrame(100, road, length, 1);
  const P = (pts: [number, number][]) => pts.map(([u, v]) => at(u, v));
  const wheelR = 0.078 * length;
  const rear = at(0.2, 0.078);
  const front = at(0.826, 0.078);
  lines.push(L(line({ x: 20, y: road }, { x: 585, y: road }, 30), 'graphite', 1.4));
  lines.push(
    L(
      path(
        P([
          [0.012, 0.1], [0, 0.1], [0, 0.135], [0.012, 0.135], [0.012, 0.245], [0.375, 0.245], [0.378, 0.33],
          [0.39, 0.338], [0.63, 0.338], [0.645, 0.333], [0.715, 0.268], [0.93, 0.262], [0.965, 0.255],
          [0.985, 0.235], [0.99, 0.16], [1, 0.155], [1, 0.1], [0.975, 0.085],
        ]),
      ),
      'charcoal',
      2.6,
    ),
  );
  // The flares, and the body's lower edge between them.
  const flareR = wheelR + 9;
  const flare = (c: Pt): Pt[] =>
    path([
      { x: c.x - flareR - 4, y: c.y + 2 },
      { x: c.x - flareR + 2, y: c.y - flareR * 0.75 },
      { x: c.x - flareR * 0.55, y: c.y - flareR - 2 },
      { x: c.x + flareR * 0.55, y: c.y - flareR - 2 },
      { x: c.x + flareR - 2, y: c.y - flareR * 0.75 },
      { x: c.x + flareR + 4, y: c.y + 2 },
    ]);
  lines.push(
    L(flare(rear), 'charcoal', 2.6),
    L(flare(front), 'charcoal', 2.6),
    L(arc(rear, wheelR + 4, 0, -Math.PI, 16), 'charcoal', 1.4),
    L(arc(front, wheelR + 4, 0, -Math.PI, 16), 'charcoal', 1.4),
    L(line(at(0.012, 0.1), { x: rear.x - flareR - 4, y: rear.y + 2 }, 4), 'charcoal', 2.4),
    L(line({ x: rear.x + flareR + 4, y: rear.y + 2 }, { x: front.x - flareR - 4, y: front.y + 2 }, 12), 'charcoal', 2.4),
    L(line({ x: front.x + flareR + 4, y: front.y + 2 }, at(0.975, 0.085), 3), 'charcoal', 2.4),
    // The step bar under the doors.
    L(line({ x: rear.x + flareR + 10, y: rear.y + 9 }, { x: front.x - flareR - 10, y: front.y + 9 }, 10), 'graphite', 1.6),
  );
  // Glass, pillars, doors, the tow mirror.
  lines.push(
    L(path(P([[0.395, 0.262], [0.395, 0.322], [0.515, 0.322], [0.515, 0.262], [0.395, 0.262]])), 'charcoal', 1.8),
    L(path(P([[0.53, 0.262], [0.53, 0.322], [0.628, 0.322], [0.695, 0.266], [0.53, 0.262]])), 'charcoal', 1.8),
    L(line(at(0.387, 0.25), at(0.387, 0.1), 8), 'graphite', 1.3),
    L(line(at(0.522, 0.33), at(0.522, 0.1), 8), 'graphite', 1.3),
    L(smooth(P([[0.703, 0.262], [0.7, 0.18], [0.712, 0.12]]), 6), 'graphite', 1.3),
    L(line(at(0.492, 0.232), at(0.508, 0.232), 2), 'charcoal', 1.6),
    L(line(at(0.63, 0.232), at(0.646, 0.232), 2), 'charcoal', 1.6),
    L(path(P([[0.69, 0.262], [0.694, 0.292], [0.718, 0.292], [0.715, 0.262], [0.69, 0.262]])), 'charcoal', 1.6),
  );
  // The bed's side, the hood vents, the cab's marker lights, the lamps — the
  // tail light in red.
  lines.push(
    L(line(at(0.02, 0.212), at(0.37, 0.212), 12), 'graphite', 1.2),
    L(line(at(0.02, 0.236), at(0.37, 0.236), 12), 'graphite', 0.9),
    L(line(at(0.8, 0.262), at(0.815, 0.268), 2), 'graphite', 1.4),
    L(line(at(0.83, 0.262), at(0.845, 0.268), 2), 'graphite', 1.4),
    L(path(P([[0.955, 0.245], [0.99, 0.232], [0.99, 0.215], [0.96, 0.228], [0.955, 0.245]])), 'charcoal', 1.6),
    L(line(at(0.93, 0.13), at(0.995, 0.13), 4), 'graphite', 1.1),
  );
  [0.585, 0.6, 0.615].forEach((u) => lines.push(L(line(at(u, 0.338), at(u, 0.346), 2), 'charcoal', 2.2)));
  lines.push(L(path(P([[0.014, 0.17], [0.014, 0.232], [0.026, 0.232], [0.026, 0.17], [0.014, 0.17]])), 'accent', 2));
  // Off-road tyres: tread blocks all the way round.
  for (const c of [rear, front]) {
    lines.push(...wheel(c, wheelR, 6));
    for (let k = 0; k < 26; k += 1) {
      const a = (k / 26) * Math.PI * 2;
      lines.push(L(line({ x: c.x + Math.cos(a) * wheelR, y: c.y + Math.sin(a) * wheelR }, { x: c.x + Math.cos(a) * (wheelR - 4), y: c.y + Math.sin(a) * (wheelR - 4) }, 1), 'graphite', 1));
    }
  }
  // Its shadow on the road, and a little speed behind it.
  for (let x = 124; x < 540; x += 8) lines.push(L(line({ x, y: road + 8 }, { x: x + 10, y: road + 1 }, 2), 'graphite', 0.9));
  lines.push(
    L(line({ x: 20, y: 440 }, { x: 84, y: 440 }, 6), 'graphite', 1.2),
    L(line({ x: 34, y: 464 }, { x: 88, y: 464 }, 6), 'graphite', 1.2),
    L(line({ x: 14, y: 488 }, { x: 80, y: 488 }, 6), 'graphite', 1.2),
  );
  // Connected: the truck talking to the platform.
  const roofTop = at(0.51, 0.352);
  [14, 26, 38].forEach((r) => lines.push(L(arc(roofTop, r, -Math.PI * 0.78, -Math.PI * 0.22, 10), 'ink', 1.8)));

  return {
    lines,
    labels: [
      { text: 'Brooklyn Bridge', x: 130, y: 66, pen: 'graphite', size: 22 },
      { text: 'New York City', x: 472, y: 40, pen: 'graphite', size: 26 },
      { text: 'Ford — connected vehicle', x: 330, y: 584, pen: 'graphite', size: 26 },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Shop-Ware, 2022 — the app in a repair shop, and an acquisition
 * ------------------------------------------------------------------ */

function shopware(): Drawing {
  const lines: SketchLine[] = [];

  // The shop, behind: a bay with its door rolled up, tools on the wall, and a
  // car up on a two-post lift.
  lines.push(L(rect(292, 56, 296, 44), 'graphite', 1.8));
  [67, 78, 89].forEach((y) => lines.push(L(line({ x: 292, y }, { x: 588, y }, 12), 'graphite', 0.9)));
  lines.push(L(line({ x: 292, y: 100 }, { x: 292, y: 470 }, 16), 'graphite', 1.8), L(line({ x: 588, y: 100 }, { x: 588, y: 470 }, 16), 'graphite', 1.8));
  lines.push(L(line({ x: 280, y: 470 }, { x: 600, y: 470 }, 16), 'graphite', 1.4));
  lines.push(L(rect(360, 112, 168, 84), 'graphite', 1.2));
  // A wrench, a screwdriver and a hammer on their hooks.
  [392, 434.5, 480].forEach((x) => lines.push(L(line({ x: x - 5, y: 117 }, { x: x + 5, y: 117 }, 2), 'graphite', 1.4)));
  lines.push(
    L([...line({ x: 392, y: 184 }, { x: 392, y: 136 }, 6), ...arc({ x: 392, y: 128 }, 9, Math.PI * 0.62, Math.PI * 2.38, 14)], 'charcoal', 1.6),
    L(rect(430, 128, 9, 22), 'charcoal', 1.4),
    L(line({ x: 434.5, y: 150 }, { x: 434.5, y: 186 }, 4), 'charcoal', 1.4),
    L(line({ x: 480, y: 128 }, { x: 480, y: 184 }, 6), 'charcoal', 1.6),
    L(roundRect(466, 124, 32, 12, 3), 'charcoal', 1.6),
  );
  // The lift: two posts, arms reaching under the sills.
  lines.push(L(rect(312, 150, 14, 320), 'charcoal', 2), L(rect(554, 150, 14, 320), 'charcoal', 2));
  lines.push(L(line({ x: 306, y: 150 }, { x: 332, y: 150 }, 4), 'charcoal', 2), L(line({ x: 548, y: 150 }, { x: 574, y: 150 }, 4), 'charcoal', 2));
  lines.push(L(line({ x: 326, y: 312 }, { x: 376, y: 316 }, 6), 'charcoal', 2), L(line({ x: 554, y: 312 }, { x: 504, y: 316 }, 6), 'charcoal', 2));
  // A rolling tool chest on the floor beneath it.
  lines.push(L(rect(400, 392, 92, 70), 'charcoal', 1.8));
  [410, 428, 446].forEach((y) => {
    lines.push(L(line({ x: 400, y }, { x: 492, y }, 6), 'graphite', 1.1), L(line({ x: 436, y: y + 9 }, { x: 456, y: y + 9 }, 2), 'charcoal', 1.4));
  });
  lines.push(L(circle({ x: 410, y: 466 }, 4, 10), 'charcoal', 1.4), L(circle({ x: 482, y: 466 }, 4, 10), 'charcoal', 1.4));
  // The car on it, facing left, its wheels hanging a little.
  const at = carFrame(540, 322, 200, -1);
  const P = (pts: [number, number][]) => pts.map(([u, v]) => at(u, v));
  const back = at(0.2, 0.085);
  const nose = at(0.8, 0.085);
  lines.push(
    L(
      smooth(P([[0.01, 0.1], [0, 0.17], [0.04, 0.2], [0.2, 0.215], [0.3, 0.27], [0.42, 0.3], [0.6, 0.3], [0.7, 0.25], [0.85, 0.22], [0.97, 0.19], [1, 0.14], [0.99, 0.1]]), 6),
      'charcoal',
      1.9,
    ),
    L(arc(back, 21, 0, -Math.PI, 12), 'charcoal', 1.8),
    L(arc(nose, 21, 0, -Math.PI, 12), 'charcoal', 1.8),
    L(line(at(0.01, 0.1), { x: back.x + 21, y: back.y }, 3), 'charcoal', 1.8),
    L(line({ x: back.x - 21, y: back.y }, { x: nose.x + 21, y: nose.y }, 8), 'charcoal', 1.8),
    L(line({ x: nose.x - 21, y: nose.y }, at(0.99, 0.1), 3), 'charcoal', 1.8),
    L(P([[0.33, 0.25], [0.43, 0.285], [0.59, 0.285], [0.67, 0.25], [0.33, 0.25]]), 'charcoal', 1.4),
    L(line(at(0.5, 0.25), at(0.5, 0.285), 2), 'charcoal', 1.2),
  );
  lines.push(...wheel({ x: back.x, y: back.y + 4 }, 17, 5, 'charcoal', 1.8), ...wheel({ x: nose.x, y: nose.y + 4 }, 17, 5, 'charcoal', 1.8));

  // The phone, in front: the app a technician carries round the car — an
  // inspection, item by item, with the one that needs attention in red.
  const tilt = (pts: Pt[]) => rotate(pts, { x: 170, y: 318 }, -0.07);
  const T = (pts: Pt[], pen: Pen, w: number) => lines.push(L(tilt(pts), pen, w));
  T(roundRect(75, 118, 190, 400, 28), 'charcoal', 2.6);
  T(roundRect(89, 150, 162, 336, 10), 'graphite', 1.4);
  T(line({ x: 145, y: 134 }, { x: 195, y: 134 }), 'graphite', 1.6);
  T(scribbleText(103, 176, 84), 'charcoal', 1.4);
  T(smooth([{ x: 200, y: 182 }, { x: 204, y: 172 }, { x: 216, y: 170 }, { x: 222, y: 164 }, { x: 236, y: 164 }, { x: 242, y: 172 }, { x: 240, y: 182 }], 4), 'ink', 1.4);
  T(line({ x: 200, y: 182 }, { x: 240, y: 182 }, 4), 'ink', 1.4);
  T(circle({ x: 209, y: 183 }, 3.5, 10), 'ink', 1.2);
  T(circle({ x: 231, y: 183 }, 3.5, 10), 'ink', 1.2);
  T(line({ x: 89, y: 198 }, { x: 251, y: 198 }, 10), 'graphite', 1);
  [224, 270, 316, 362, 408].forEach((y, i) => {
    const urgent = i === 2;
    T(circle({ x: 110, y }, 10, 16), urgent ? 'accent' : 'ink', 1.6);
    if (urgent) {
      T(line({ x: 110, y: y - 5 }, { x: 110, y: y + 2 }, 2), 'accent', 1.8);
      T(circle({ x: 110, y: y + 5.5 }, 0.8, 5), 'accent', 1.6);
    } else {
      T([{ x: 105, y }, { x: 109, y: y + 4 }, { x: 116, y: y - 5 }], 'ink', 1.6);
    }
    T(scribbleText(130, y - 5, 100), 'graphite', 1.1);
    T(scribbleText(130, y + 8, 58), 'graphite', 1);
  });
  T(roundRect(105, 438, 130, 34, 10), 'ink', 2.2);
  T(scribbleText(128, 455, 84), 'ink', 1.2);
  T(line({ x: 140, y: 502 }, { x: 200, y: 502 }, 6), 'graphite', 1.4);

  // The stamp.
  lines.push(L(rotate(roundRect(322, 500, 246, 64, 10), { x: 445, y: 532 }, -0.12), 'accent', 3));
  return {
    lines,
    labels: [
      { text: 'ACQUIRED', x: 445, y: 534, pen: 'accent', size: 44, rot: -0.12 },
      { text: 'iOS · Android', x: 170, y: 568, pen: 'graphite', size: 28 },
      { text: 'from an empty repo', x: 440, y: 30, pen: 'ink', size: 26, rot: 0.04 },
    ],
  };
}

/* ------------------------------------------------------------------ *
 * Now — this sketchbook
 * ------------------------------------------------------------------ */

/** The handwritten 17, as straight-line outlines, in its 36 x 26 units. */
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
