/**
 * Paints the sketchbook onto a 2D canvas.
 *
 * `draw(t)` renders the whole page as it stands `t` seconds into the story. It
 * keeps no state between frames beyond things computed once — the paper, the
 * wobble of each line — so any `t` can be drawn at any moment, in any order.
 *
 * Its lines are drawn with the sketchbook's pencil (`pencil.ts`).
 */

import {
  BOOK,
  bridge,
  clamp01,
  CRANIUM,
  drops,
  easeInOut,
  easeOut,
  easeOutBack,
  END,
  PAGE,
  PARTICLES,
  pointAlong,
  rng,
  sampleAlong,
  scribbles,
  span,
  SUN,
  T,
  thinker,
  type BridgePart,
  type Pt,
  type Stroke,
} from './geometry';
import { SKETCH_BOX, type Drawing, type Pen, type SketchLabel } from './chapters';
import { grain, makeCanvas, prepare, sketchNow, stroke, type Prepared } from './pencil';

export type Palette = {
  paper: string;
  paperEdge: string;
  graphite: string;
  charcoal: string;
  ink: string;
  accent: string;
};

/** A screen rectangle the page is drawn into, CSS pixels. */
export type View = { x: number; y: number; w: number; h: number };

/* ------------------------------------------------------------------ *
 * The renderer
 * ------------------------------------------------------------------ */

type Particle = { from: Pt; to: Pt; vx: number; vy: number; spin: number; delay: number };

export type RendererOptions = {
  /** The handwriting face's CSS font-family, for labels and the cover title. */
  hand: string;
  /** Written on the cover of the closed book: a title and a line under it. */
  coverTitle: [string, string];
};

export function createRenderer(canvas: HTMLCanvasElement, palette: Palette, options: RendererOptions) {
  const ctx = canvas.getContext('2d')!;
  let dpr = 1;
  let width = 0;
  let height = 0;
  let paper: HTMLCanvasElement | null = null;

  const paperGrain = grain('#8a7650', 11, 0.05);
  const graphite = ctx.createPattern(grain(palette.graphite, 21, 1.4), 'repeat')!;
  const charcoal = ctx.createPattern(grain(palette.charcoal, 31, 1.8), 'repeat')!;

  /* ---- scene 2 ---- */
  const strokes: (Stroke & { line: Prepared })[] = thinker().map((s, i) => ({
    ...s,
    line: prepare(s.pts, {
      seed: 200 + i,
      width: s.kind === 'line' ? 3.2 : s.kind === 'guide' ? 1.3 : 1.8,
      jitter: s.kind === 'idea' ? 0.7 : s.kind === 'guide' ? 1.3 : 1.8,
      passes: s.kind === 'line' ? 3 : 2,
    }),
  }));

  /* ---- scene 3 ---- */
  const swarm = scribbles().map((s, i) => ({
    ...s,
    line: prepare(s.pts, { seed: 500 + i, width: 2.4, jitter: 0.8, overshoot: 2 }),
  }));
  const splashes = drops();

  /* ---- scene 4 ---- */
  const parts: (BridgePart & { line: Prepared })[] = bridge().map((p, i) => ({
    ...p,
    line: prepare(p.pts, { seed: 800 + i, width: 1.5 * p.weight, jitter: 0.45, overshoot: 4, passes: 1 }),
  }));
  const cables = parts.filter((p) => p.id.startsWith('cable'));

  /* ---- the particles that carry the head into the bridge ---- */
  const sources = sampleAlong(
    strokes.map((s) => s.pts),
    PARTICLES,
  );
  const targets = sampleAlong(
    parts.filter((p) => p.structural).map((p) => p.pts),
    PARTICLES,
  );
  const particles: Particle[] = (() => {
    const rand = rng(2024);
    const impact = { x: 600, y: 420 };
    return sources.map((from, i) => {
      const a = Math.atan2(from.y - impact.y, from.x - impact.x) + (rand() - 0.5) * 1.2;
      const speed = 160 + rand() * 380;
      return {
        from,
        to: targets[i],
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 60,
        spin: (rand() - 0.5) * 8,
        delay: (i / PARTICLES) * 0.9,
      };
    });
  })();

  const K = 1.4;
  const SCATTER_T = T.scatter[1] - T.scatter[0];
  const scattered = (p: Particle, tau: number): Pt => {
    const drag = (1 - Math.exp(-K * tau)) / K;
    return { x: p.from.x + p.vx * drag, y: p.from.y + p.vy * drag + 36 * tau * tau };
  };

  /* ------------------------------------------------------------------ */

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    paper = null;
  }

  /** The sheet itself, built once per size: tone, a darker edge, and grain. */
  function sheet(): HTMLCanvasElement {
    if (paper) return paper;
    const c = makeCanvas(width * dpr, height * dpr);
    const g = c.getContext('2d')!;
    g.fillStyle = palette.paper;
    g.fillRect(0, 0, c.width, c.height);

    const r = Math.hypot(c.width, c.height) / 2;
    const vignette = g.createRadialGradient(c.width / 2, c.height / 2, r * 0.35, c.width / 2, c.height / 2, r);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, palette.paperEdge);
    g.globalAlpha = 0.32;
    g.fillStyle = vignette;
    g.fillRect(0, 0, c.width, c.height);

    g.globalAlpha = 0.18;
    g.fillStyle = g.createPattern(paperGrain, 'repeat')!;
    g.fillRect(0, 0, c.width, c.height);

    // Fibres: short, faint, curved.
    const rand = rng(77);
    g.strokeStyle = '#7a6848';
    g.lineWidth = 0.6 * dpr;
    const count = Math.round((c.width * c.height) / 9000);
    for (let i = 0; i < count; i += 1) {
      const x = rand() * c.width;
      const y = rand() * c.height;
      const a = rand() * Math.PI;
      const l = (4 + rand() * 12) * dpr;
      g.globalAlpha = 0.05 + rand() * 0.08;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rand() * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    g.globalAlpha = 1;
    paper = c;
    return c;
  }

  function grid(view: View, alpha: number) {
    if (alpha <= 0) return;
    const step = 28;
    ctx.lineWidth = 1;
    ctx.strokeStyle = palette.graphite;
    for (let i = 0, x = view.x + ((view.w / 2) % step); x < view.x + view.w; x += step, i += 1) {
      ctx.globalAlpha = alpha * (i % 5 === 0 ? 0.1 : 0.05);
      ctx.beginPath();
      ctx.moveTo(Math.round(x) + 0.5, view.y);
      ctx.lineTo(Math.round(x) + 0.5, view.y + view.h);
      ctx.stroke();
    }
    for (let i = 0, y = view.y + ((view.h / 2) % step); y < view.y + view.h; y += step, i += 1) {
      ctx.globalAlpha = alpha * (i % 5 === 0 ? 0.1 : 0.05);
      ctx.beginPath();
      ctx.moveTo(view.x, Math.round(y) + 0.5);
      ctx.lineTo(view.x + view.w, Math.round(y) + 0.5);
      ctx.stroke();
    }
    // The margin rule, in ink.
    ctx.globalAlpha = alpha * 0.22;
    ctx.strokeStyle = palette.ink;
    const mx = view.x + Math.min(72, view.w * 0.08);
    ctx.beginPath();
    ctx.moveTo(mx + 0.5, view.y);
    ctx.lineTo(mx + 0.5, view.y + view.h);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /** Map the virtual page into `view`, contained and centred. */
  function fit(view: View) {
    const s = Math.min(view.w / PAGE.w, view.h / PAGE.h);
    return { s, ox: view.x + (view.w - PAGE.w * s) / 2, oy: view.y + (view.h - PAGE.h * s) / 2 };
  }

  /* ---------------- scene 1: the book ---------------- */

  function book(t: number, view: View, s: number) {
    const drawn = span(t, 0, T.bookDrawn);
    const open = easeInOut(span(t, T.bookDrawn, T.bookOpen));
    const zoom = easeInOut(span(t, T.bookOpen, T.zoomEnd));
    const fade = 1 - span(zoom, 0.55, 1);
    if (fade <= 0) return;

    // Slides from centred-closed to centred-open while the cover swings.
    const spine = BOOK.spine - 150 * (1 - open);
    const { top, w, h } = BOOK;

    // Zoom about the centre until the spread covers the whole view.
    const cover = Math.max(view.w / s / (w * 2), view.h / s / h) * 1.1;
    const z = 1 + (cover - 1) * zoom;
    ctx.save();
    ctx.translate(600, 450);
    ctx.scale(z, z);
    ctx.translate(-600, -450);

    ctx.globalAlpha = fade;

    // The right-hand page, under the cover.
    if (open > 0) {
      ctx.fillStyle = palette.paper;
      ctx.fillRect(spine, top, w, h);
    }

    // The block of pages seen edge-on, while closed.
    const closed = 1 - open;
    if (closed > 0.02) {
      for (let i = 1; i <= 3; i += 1) {
        sketchNow(ctx, [
          { x: spine + w + i * 3, y: top + i * 2 },
          { x: spine + w + i * 3, y: top + h + i * 3 },
          { x: spine + i * 2, y: top + h + i * 3 },
        ], 40 + i, graphite, fade * closed * 0.6, 0.8, drawn);
      }
    }

    // The cover, hinged on the spine: its free edge swings through 180°.
    const angle = Math.PI * open;
    const freeX = spine + Math.cos(angle) * w;
    const lift = Math.sin(angle) * h * 0.07;
    const quad = [
      { x: spine, y: top },
      { x: freeX, y: top - lift },
      { x: freeX, y: top + h + lift },
      { x: spine, y: top + h },
    ];
    ctx.beginPath();
    quad.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    const outside = Math.cos(angle) > 0;
    ctx.fillStyle = outside ? palette.paperEdge : palette.paper;
    ctx.globalAlpha = fade * (outside ? 0.9 : 1);
    ctx.fill();

    // Hatching on the outside of the cover, clipped to it.
    if (outside) {
      ctx.save();
      ctx.clip();
      const hatch = drawn;
      for (let i = -12; i < 22; i += 1) {
        const x0 = spine + i * 22;
        sketchNow(ctx, [{ x: x0, y: top + h + 20 }, { x: x0 + 260, y: top - 20 }], 60 + i, graphite, fade * 0.18, 0.7, hatch);
      }
      ctx.restore();
    }

    // Outline, spine and the elastic band — drawn on in that order.
    sketchNow(ctx, [...quad, quad[0]], 7, charcoal, fade, 2.6, span(drawn, 0, 0.6));
    sketchNow(ctx, [{ x: spine + 10, y: top - 2 }, { x: spine + 10, y: top + h + 2 }], 8, charcoal, fade * 0.8, 1.6, span(drawn, 0.55, 0.75));
    const bandX = spine + Math.cos(angle) * w * 0.84;
    sketchNow(ctx, [{ x: bandX, y: top - lift * 0.84 - 4 }, { x: bandX, y: top + h + lift * 0.84 + 4 }], 9, charcoal, fade * closed, 2.2, span(drawn, 0.75, 1));

    // The title, written on the cover while it is closed.
    if (outside) {
      const title = span(drawn, 0.7, 1) * (1 - span(open, 0, 0.25));
      if (title > 0) {
        const cx = (spine + freeX) / 2 + 6;
        ctx.globalAlpha = fade * title;
        ctx.fillStyle = palette.charcoal;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `44px ${options.hand}`;
        ctx.fillText(options.coverTitle[0], cx, top + h * 0.4);
        ctx.font = `26px ${options.hand}`;
        ctx.fillStyle = palette.ink;
        ctx.fillText(options.coverTitle[1], cx, top + h * 0.4 + 44);
        ctx.globalAlpha = 1;
      }
    }

    // Once open, the gutter.
    if (open > 0.5) {
      sketchNow(ctx, [{ x: 600, y: top }, { x: 600, y: top + h }], 10, graphite, fade * span(open, 0.5, 1) * 0.5, 1.2);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------------- scene 2: the spark and the thinker ---------------- */

  function sparkAt(t: number): Pt | null {
    if (t < T.sparkIn[0] || t > T.swarm[0] + 0.6) return null;
    const first = strokes[0];
    if (t < first.from) {
      const u = easeInOut(span(t, first.from - 0.3, first.from));
      const to = first.line.passes[0].pts[0];
      return { x: 600 + (to.x - 600) * u, y: 450 + (to.y - 450) * u };
    }
    for (let i = 0; i < strokes.length; i += 1) {
      const st = strokes[i];
      if (t >= st.from && t <= st.to) return pointAlong(st.pts, span(t, st.from, st.to));
      const next = strokes[i + 1];
      if (next && t > st.to && t < next.from) {
        const a = st.pts[st.pts.length - 1];
        const b = next.pts[0];
        const u = easeInOut(span(t, st.to, next.from));
        return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
      }
    }
    const last = strokes[strokes.length - 1];
    const u = easeInOut(span(t, last.to, last.to + 0.3));
    const a = last.pts[last.pts.length - 1];
    return { x: a.x + (CRANIUM.x - a.x) * u, y: a.y + (CRANIUM.y - a.y) * u };
  }

  function spark(t: number) {
    const at = sparkAt(t);
    if (!at) return;
    const alpha = span(t, T.sparkIn[0], T.sparkIn[1]) * (1 - span(t, T.swarm[0], T.swarm[0] + 0.6));
    if (alpha <= 0) return;
    const pulse = 1 + 0.18 * Math.sin(t * 9);
    const r = 30 * pulse;
    const glow = ctx.createRadialGradient(at.x, at.y, 0, at.x, at.y, r);
    glow.addColorStop(0, 'rgba(255,255,255,0.95)');
    glow.addColorStop(0.18, palette.ink);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = alpha * 0.55;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(at.x, at.y, r, 0, Math.PI * 2);
    ctx.fill();
    // Four short rays, turning.
    ctx.globalAlpha = alpha * 0.8;
    ctx.strokeStyle = palette.ink;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 4; i += 1) {
      const a = t * 2.2 + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(at.x + Math.cos(a) * 7, at.y + Math.sin(a) * 7);
      ctx.lineTo(at.x + Math.cos(a) * 14 * pulse, at.y + Math.sin(a) * 14 * pulse);
      ctx.stroke();
    }
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(at.x, at.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function head(t: number) {
    if (t >= T.scatter[0]) return;
    for (const st of strokes) {
      const p = span(t, st.from, st.to);
      if (p <= 0) continue;
      if (st.kind === 'guide') stroke(ctx, st.line, p, graphite, 0.75);
      else if (st.kind === 'line') stroke(ctx, st.line, p, charcoal, 1);
      else {
        // The idea glows faintly while it is being drawn, then settles to ink.
        const live = 1 - span(t, st.to, st.to + 0.8);
        if (live > 0) {
          ctx.save();
          ctx.shadowColor = palette.ink;
          ctx.shadowBlur = 10 * live;
          stroke(ctx, st.line, p, palette.ink, 0.9);
          ctx.restore();
        } else stroke(ctx, st.line, p, palette.ink, 0.9);
      }
    }
  }

  /* ---------------- scene 3: the block ---------------- */

  function swarmAt(t: number) {
    if (t < T.swarm[0]) return;
    const blast = easeOut(span(t, T.gather[0], T.gather[0] + 0.9));
    const alpha = 1 - span(t, T.gather[0], T.gather[0] + 0.8);
    if (alpha <= 0) return;
    const boil = rng(Math.floor(t * 10));
    swarm.forEach((sc, i) => {
      const u = easeOut(span(t, T.swarm[0] + sc.delay, T.swarm[1] + sc.delay * 0.5));
      if (u <= 0) return;
      const wob = Math.sin(t * 3.1 + i) * 8;
      let x = sc.from.x + (sc.to.x - sc.from.x) * u + wob;
      let y = sc.from.y + (sc.to.y - sc.from.y) * u + Math.cos(t * 2.7 + i) * 6;
      if (blast > 0) {
        const dx = x - 600;
        const dy = y - 450;
        const d = Math.hypot(dx, dy) || 1;
        x += (dx / d) * blast * 700;
        y += (dy / d) * blast * 700;
      }
      ctx.save();
      ctx.translate(x + (boil() - 0.5) * 2, y + (boil() - 0.5) * 2);
      ctx.rotate(sc.spin * t);
      stroke(ctx, sc.line, 1, charcoal, alpha * 0.9);
      ctx.restore();
    });
  }

  function dropsAt(t: number) {
    const alpha = 1 - span(t, T.gather[0], T.gather[0] + 0.7);
    if (alpha <= 0) return;
    ctx.fillStyle = palette.charcoal;
    for (const d of splashes) {
      if (t < d.when) continue;
      const g = Math.max(0, easeOutBack(span(t, d.when, d.when + 0.22), 2.2));
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      d.edge.forEach((e, i) => {
        const a = (i / d.edge.length) * Math.PI * 2;
        const x = d.at.x + Math.cos(a) * d.r * e * g;
        const y = d.at.y + Math.sin(a) * d.r * e * g;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      ctx.closePath();
      ctx.fill();
      for (const sp of d.splats) {
        ctx.beginPath();
        ctx.arc(d.at.x + Math.cos(sp.a) * d.r * sp.d * g, d.at.y + Math.sin(sp.a) * d.r * sp.d * g, sp.r * g, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  /* ---------------- the particles: breaking, and coming back ---------------- */

  function particlesAt(t: number) {
    if (t < T.scatter[0]) return;
    const fade = 1 - span(t, 17.6, 18.4);
    if (fade <= 0) return;
    const glow = span(t, T.hang[0], T.hang[1]);

    ctx.lineCap = 'round';
    for (let pass = 0; pass < (glow > 0 ? 2 : 1); pass += 1) {
      const halo = glow > 0 && pass === 0;
      ctx.strokeStyle = halo || glow > 0.5 ? palette.accent : palette.charcoal;
      ctx.lineWidth = halo ? 7 : glow > 0 ? 1.8 : 1.4;
      ctx.globalAlpha = fade * (halo ? 0.13 * glow : 0.9);
      ctx.beginPath();
      for (const p of particles) {
        let a: Pt;
        let b: Pt;
        if (t < T.hang[0]) {
          const tau = t - T.scatter[0];
          b = scattered(p, tau);
          const ang = Math.atan2(p.vy, p.vx) + p.spin * tau;
          a = { x: b.x - Math.cos(ang) * 5, y: b.y - Math.sin(ang) * 5 };
        } else {
          const rest = scattered(p, SCATTER_T);
          const hover = { x: rest.x + Math.sin(t * 3 + p.spin) * 3, y: rest.y + Math.cos(t * 2.5 + p.spin) * 3 };
          const u = span(t, T.gather[0] + p.delay, T.gather[0] + p.delay + 0.9);
          const at = (v: number) => {
            const e = easeOutBack(clamp01(v));
            return { x: hover.x + (p.to.x - hover.x) * e, y: hover.y + (p.to.y - hover.y) * e };
          };
          b = at(u);
          a = u > 0 && u < 1 ? at(u - 0.07) : { x: b.x - 2.5, y: b.y };
        }
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // The shockwave that clears the block.
    const ring = span(t, T.gather[0], T.gather[0] + 0.8);
    if (ring > 0 && ring < 1) {
      ctx.strokeStyle = palette.accent;
      ctx.lineWidth = 3 * (1 - ring) + 0.5;
      ctx.globalAlpha = 0.55 * (1 - ring);
      ctx.beginPath();
      ctx.arc(600, 450, easeOut(ring) * 900, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------------- scene 4: the bridge ---------------- */

  // A soft, slightly irregular edge: two slow waves round the rim, not noise
  // per vertex — per-vertex noise reads as a cog, not as pooled paint.
  const washEdge = (() => {
    const rand = rng(313);
    const p1 = rand() * Math.PI * 2;
    const p2 = rand() * Math.PI * 2;
    return Array.from({ length: 72 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2;
      return 1 + 0.06 * Math.sin(3 * a + p1) + 0.035 * Math.sin(5 * a + p2);
    });
  })();

  function wash(t: number, alpha: number) {
    const w = span(t, T.wash[0], T.wash[0] + 1.4) * alpha;
    if (w <= 0) return;
    // Sun: a pale disc with a darker rim, which is what pooled watercolour does.
    ctx.fillStyle = palette.accent;
    ctx.beginPath();
    washEdge.forEach((e, i) => {
      const a = (i / washEdge.length) * Math.PI * 2;
      const x = SUN.x + Math.cos(a) * SUN.r * e;
      const y = SUN.y + Math.sin(a) * SUN.r * e;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.globalAlpha = 0.14 * w;
    ctx.fill();
    ctx.strokeStyle = palette.accent;
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.16 * w;
    ctx.stroke();

    // A band of colour laid along each cable, in three overlapping strokes.
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const c of cables) {
      for (let k = 0; k < 3; k += 1) {
        ctx.globalAlpha = 0.07 * w;
        ctx.lineWidth = 14 - k * 3;
        ctx.beginPath();
        c.pts.forEach((p, i) => (i ? ctx.lineTo(p.x + k, p.y - 3 + k * 2) : ctx.moveTo(p.x + k, p.y - 3 + k * 2)));
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function bridgeAt(t: number, alpha: number) {
    if (t < T.clean[0] || alpha <= 0) return;
    wash(t, alpha);
    for (const p of parts) {
      const u = span(t, p.from, p.to);
      if (u <= 0) continue;
      const paint = p.id.startsWith('water') || p.id.startsWith('dim') ? graphite : palette.ink;
      stroke(ctx, p.line, u, paint, alpha);
    }
  }

  /* ---------------- the page turn ---------------- */

  function turnPage(e: number) {
    if (e <= 0) return;
    const u = easeInOut(e);
    const fold = width * (1 - u);
    const curl = Math.sin(Math.PI * u) * 40;

    // The fresh page, revealed to the right of the fold.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fold + curl, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(fold - curl, height);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(sheet(), 0, 0, width, height);
    grid({ x: 0, y: 0, w: width, h: height }, 1);
    // The shadow the lifted page casts on it.
    const shade = ctx.createLinearGradient(fold, 0, fold + 120, 0);
    shade.addColorStop(0, 'rgba(40,30,15,0.28)');
    shade.addColorStop(1, 'rgba(40,30,15,0)');
    ctx.fillStyle = shade;
    ctx.fillRect(fold - curl, 0, 160 + curl * 2, height);
    ctx.restore();

    // The back of the turning page, folded over to the left of the fold.
    const flap = Math.min(width - fold, fold);
    ctx.beginPath();
    ctx.moveTo(fold + curl, 0);
    ctx.lineTo(fold + curl - flap, 0);
    ctx.lineTo(fold - curl - flap, height);
    ctx.lineTo(fold - curl, height);
    ctx.closePath();
    const back = ctx.createLinearGradient(fold - flap, 0, fold, 0);
    back.addColorStop(0, palette.paper);
    back.addColorStop(1, palette.paperEdge);
    ctx.fillStyle = back;
    ctx.fill();
    ctx.strokeStyle = palette.charcoal;
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------------- composition ---------------- */

  function scene(t: number, view: View) {
    const { s, ox, oy } = fit(view);

    // Knocked off true when the block lands.
    const shake = 1 - span(t, T.impact[0], T.impact[1]);
    const jolt = t >= T.impact[0] && shake > 0 ? 9 * shake : 0;

    ctx.save();
    ctx.translate(ox + Math.sin(t * 83) * jolt * s, oy + Math.cos(t * 67) * jolt * s);
    ctx.scale(s, s);

    if (t < T.zoomEnd + 0.1) book(t, view, s);

    // The whole drawing recedes to a watermark behind the closing card.
    bridgeAt(t, 1 - 0.86 * easeInOut(span(t, T.settle[0], T.settle[1])));

    head(t);
    spark(t);
    dropsAt(t);
    swarmAt(t);
    particlesAt(t);
    ctx.restore();
  }

  /* ---------------- the chapters' own drawings ---------------- */

  type PreparedDrawing = {
    lines: { line: Prepared; paint: string | CanvasPattern; from: number; to: number }[];
    labels: (SketchLabel & { at: number })[];
  };

  const paintFor = (pen: Pen): string | CanvasPattern =>
    pen === 'charcoal' ? charcoal : pen === 'graphite' ? graphite : pen === 'ink' ? palette.ink : palette.accent;

  /** Prepare a chapter drawing once: wobble fixed, and when each line is drawn. */
  function prepareDrawing(d: Drawing, seed: number): PreparedDrawing {
    const n = d.lines.length;
    return {
      lines: d.lines.map((l, i) => {
        const from = (i / Math.max(1, n)) * 2.6;
        return {
          line: prepare(l.pts, { seed: seed + i, width: l.w, jitter: 1.1, overshoot: 5, passes: 2 }),
          paint: paintFor(l.pen),
          from,
          to: from + 0.9,
        };
      }),
      labels: d.labels.map((l, i) => ({ ...l, at: 2.2 + i * 0.3 })),
    };
  }

  function sketch(d: PreparedDrawing, tau: number, view: View) {
    const s = Math.min(view.w / SKETCH_BOX.w, view.h / SKETCH_BOX.h);
    const ox = view.x + (view.w - SKETCH_BOX.w * s) / 2;
    const oy = view.y + (view.h - SKETCH_BOX.h * s) / 2;
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(s, s);
    for (const l of d.lines) stroke(ctx, l.line, span(tau, l.from, l.to), l.paint, 1);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const l of d.labels) {
      const a = span(tau, l.at, l.at + 0.5);
      if (a <= 0) continue;
      ctx.save();
      ctx.translate(l.x, l.y);
      ctx.rotate(l.rot ?? 0);
      ctx.globalAlpha = a;
      ctx.fillStyle = l.pen === 'accent' ? palette.accent : l.pen === 'ink' ? palette.ink : palette.graphite;
      ctx.font = `${l.size}px ${options.hand}`;
      ctx.fillText(l.text, 0, 0);
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  /* ---------------- the book's frame ---------------- */

  /** The fold down the middle of an open spread, and a hint of the page block. */
  function gutter() {
    const x = width / 2;
    const g = ctx.createLinearGradient(x - 60, 0, x + 60, 0);
    g.addColorStop(0, 'rgba(60, 45, 20, 0)');
    g.addColorStop(0.45, 'rgba(60, 45, 20, 0.1)');
    g.addColorStop(0.5, 'rgba(60, 45, 20, 0.22)');
    g.addColorStop(0.55, 'rgba(60, 45, 20, 0.1)');
    g.addColorStop(1, 'rgba(60, 45, 20, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 60, 0, 120, height);
  }

  /**
   * A page turning from a snapshot of the previous spread: the old page lies on
   * the side the fold has not reached yet, its underside curls over, and it
   * casts a shadow on the new one underneath.
   */
  function turnFrom(snap: HTMLCanvasElement, e: number, forward: boolean) {
    const u = easeInOut(clamp01(e));
    if (u >= 1) return;
    const fold = forward ? width * (1 - u) : width * u;
    const curl = Math.sin(Math.PI * u) * 46;
    ctx.save();
    ctx.beginPath();
    if (forward) {
      ctx.moveTo(0, 0);
      ctx.lineTo(fold + curl, 0);
      ctx.lineTo(fold - curl, height);
      ctx.lineTo(0, height);
    } else {
      ctx.moveTo(width, 0);
      ctx.lineTo(fold + curl, 0);
      ctx.lineTo(fold - curl, height);
      ctx.lineTo(width, height);
    }
    ctx.closePath();
    ctx.save();
    ctx.clip();
    ctx.drawImage(snap, 0, 0, width, height);
    ctx.restore();
    const dir = forward ? 1 : -1;
    const flap = Math.min(forward ? width - fold : fold, forward ? fold : width - fold) * 0.9;
    const back = ctx.createLinearGradient(fold, 0, fold + flap * dir, 0);
    back.addColorStop(0, palette.paperEdge);
    back.addColorStop(1, palette.paper);
    ctx.fillStyle = back;
    ctx.beginPath();
    ctx.moveTo(fold + curl, 0);
    ctx.lineTo(fold + curl + flap * dir, 0);
    ctx.lineTo(fold - curl + flap * dir * 0.92, height);
    ctx.lineTo(fold - curl, height);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = palette.charcoal;
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.globalAlpha = 1;
    const shade = ctx.createLinearGradient(fold, 0, fold - 100 * dir, 0);
    shade.addColorStop(0, 'rgba(60, 45, 20, 0.24)');
    shade.addColorStop(1, 'rgba(60, 45, 20, 0)');
    ctx.fillStyle = shade;
    ctx.fillRect(Math.min(fold, fold - 100 * dir) - curl, 0, 100 + curl * 2, height);
    ctx.restore();
  }

  return {
    resize,
    size: () => ({ width, height }),
    prepareDrawing,
    /** Start a frame: the sheet and its grid, filling the canvas. */
    paper(gridAlpha = 1) {
      if (!width || !height) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.drawImage(sheet(), 0, 0, width, height);
      grid({ x: 0, y: 0, w: width, h: height }, gridAlpha);
    },
    gutter,
    /** The spark-and-bridge story at its own clock `t`, fitted into `view`. */
    story(t: number, view: View) {
      scene(Math.min(t, END), view);
    },
    sketch,
    snapshot() {
      const c = makeCanvas(canvas.width, canvas.height);
      c.getContext('2d')!.drawImage(canvas, 0, 0);
      return c;
    },
    turnFrom,
  };
}

export type Renderer = ReturnType<typeof createRenderer>;
