'use client';

/**
 * Draws one step of a trace (`lib/algorithms/trace.ts`): each panel as its
 * own small painting, stacked down the column.
 *
 * Everything is SVG, in the site's two hands. Cells, nodes and bars are
 * washes — a pale fill through a displacement filter, so edges wander as
 * watercolour does — with a pencil line over them; labels and values are
 * written in the caption hand. A mark's role picks its paint from the box
 * (`PAINT`): what is being looked at is cadmium yellow, what it is compared
 * with ultramarine, the answer sap green, a rejection cadmium red, what has
 * been seen violet.
 *
 * Every element that persists between steps is keyed by what it is (a cell
 * by its index, a node by its id, a pointer by its label), so moving from one
 * step to the next animates: pointers slide, nodes move, paint changes
 * colour. Under reduced motion the CSS drops the transitions.
 */

import type { ReactNode } from 'react';
import type { Panel, Role, Val, LNode, TNode } from '@/lib/algorithms/trace';
import styles from './Viz.module.css';

export const PAINT: Record<Role | 'base', { fill: string; ink: string }> = {
  base: { fill: '#fbf8f1', ink: '#3b3a40' },
  active: { fill: '#f7d27f', ink: '#a8680f' },
  compare: { fill: '#b4c4ee', ink: '#2b3f9e' },
  found: { fill: '#b7d9a5', ink: '#2f6b2b' },
  bad: { fill: '#f1b1a4', ink: '#b8321f' },
  visited: { fill: '#d6c8ec', ink: '#5a3a8e' },
  window: { fill: '#d9e7f6', ink: '#4f73a6' },
  done: { fill: '#e5e1d8', ink: '#8f8a80' },
  path: { fill: '#f6c38f', ink: '#b85f10' },
  new: { fill: '#daefc9', ink: '#4f8f33' },
};
const paint = (r?: Role) => PAINT[r ?? 'base'];

const W = 520;
const PAD = 14;
const text = (v: Val) => (v === null ? '∅' : typeof v === 'boolean' ? (v ? 'T' : 'F') : String(v));
/** A rough width for text in the caption hand. */
const tw = (s: string, size: number) => s.length * size * 0.46 + 4;

/** The filters every panel shares: the wandering wash edge and a softer pencil. */
export function VizDefs() {
  return (
    <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <filter id="alg-wash" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="alg-pencil" x="-2%" y="-2%" width="104%" height="104%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3" result="g" />
          <feDisplacementMap in="SourceGraphic" in2="g" scale="1.2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <marker id="alg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#3b3a40" strokeWidth="1.4" />
        </marker>
        <marker id="alg-arrow-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9" fill="none" stroke="#5a3a8e" strokeWidth="1.4" />
        </marker>
      </defs>
    </svg>
  );
}

function Frame({ label, h, children }: { label?: string; h: number; children: ReactNode }) {
  const top = label ? 26 : 4;
  return (
    <svg className={styles.panel} viewBox={`0 0 ${W} ${h + top + 6}`} role="presentation">
      {label && (
        <text x={PAD} y={18} className={styles.label}>
          {label}
        </text>
      )}
      <g transform={`translate(0 ${top})`}>{children}</g>
    </svg>
  );
}

/** A wash-filled box with a pencil outline. */
function Cell({ x, y, w, h, role, r = 6 }: { x: number; y: number; w: number; h: number; role?: Role; r?: number }) {
  const p = paint(role);
  return (
    <g className={styles.move} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <rect width={w} height={h} rx={r} fill={p.fill} className={styles.wash} />
      <rect width={w} height={h} rx={r} fill="none" stroke={p.ink} className={styles.pencil} />
    </g>
  );
}

function Label({ x, y, children, size = 20, role, anchor = 'middle', weight = 700 }: { x: number; y: number; children: ReactNode; size?: number; role?: Role; anchor?: 'start' | 'middle' | 'end'; weight?: number }) {
  return (
    <text x={x} y={y} textAnchor={anchor} fontSize={size} fontWeight={weight} fill={role ? paint(role).ink : PAINT.base.ink} className={styles.value}>
      {children}
    </text>
  );
}

/** Pointer labels under a row of cells, stacked when several share one. */
function Pointers({ ptrs, at, y }: { ptrs: { at: number | string | null; label: string; role?: Role }[]; at: (p: number | string | null) => number; y: number }) {
  const stackAt = new Map<string, number>();
  return (
    <>
      {ptrs.map((p) => {
        const x = at(p.at);
        const key = String(p.at);
        const k = stackAt.get(key) ?? 0;
        stackAt.set(key, k + 1);
        const c = paint(p.role ?? 'active').ink;
        return (
          <g key={p.label} className={styles.move} style={{ transform: `translate(${x}px, ${y + k * 22}px)` }}>
            {k === 0 && <path d="M 0 2 L -5 11 M 0 2 L 5 11 M 0 2 L 0 16" stroke={c} strokeWidth={1.8} fill="none" strokeLinecap="round" />}
            <text y={k === 0 ? 34 : 16} textAnchor="middle" fontSize={18} fontWeight={700} fill={c} className={styles.value}>
              {p.label}
            </text>
          </g>
        );
      })}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Panels                                                              *
 * ------------------------------------------------------------------ */

function ArrayPanel({ p }: { p: Extract<Panel, { t: 'array' }> }) {
  const n = Math.max(1, p.items.length);
  const cw = Math.min(64, (W - PAD * 2) / n);
  const x0 = (W - cw * n) / 2;
  const size = cw < 34 ? 16 : 22;
  const ptrs = p.ptrs ?? [];
  const depth = ptrs.length ? 40 + 22 * Math.max(0, maxStack(ptrs) - 1) : 0;
  const idx = p.index !== false;
  const h = 50 + (idx ? 22 : 0) + depth;
  return (
    <Frame label={p.label} h={h}>
      {p.range && p.range.to >= p.range.from && (
        <rect x={x0 + p.range.from * cw - 4} y={-4} width={(p.range.to - p.range.from + 1) * cw + 8} height={58} rx={10} fill={paint(p.range.role ?? 'window').fill} opacity={0.75} className={`${styles.wash} ${styles.shape}`} />
      )}
      {p.items.map((v, i) => (
        <g key={i} opacity={p.faded?.includes(i) ? 0.35 : 1} className={styles.fade}>
          <Cell x={x0 + i * cw + 2} y={2} w={cw - 4} h={46} role={p.marks?.[i]} />
          <Label x={x0 + i * cw + cw / 2} y={32} size={size} role={p.marks?.[i] === 'done' ? 'done' : undefined}>
            {text(v)}
          </Label>
          {idx && (
            <text x={x0 + i * cw + cw / 2} y={68} textAnchor="middle" fontSize={16} className={styles.index}>
              {i}
            </text>
          )}
        </g>
      ))}
      <Pointers ptrs={ptrs} at={(a) => x0 + (typeof a === 'number' ? a : n) * cw + cw / 2} y={idx ? 72 : 52} />
    </Frame>
  );
}

function maxStack(ptrs: { at: number | string | null }[]) {
  const c = new Map<string, number>();
  ptrs.forEach((p) => c.set(String(p.at), (c.get(String(p.at)) ?? 0) + 1));
  return Math.max(1, ...c.values());
}

function BarsPanel({ p }: { p: Extract<Panel, { t: 'bars' }> }) {
  const n = Math.max(1, p.heights.length);
  const cw = Math.min(52, (W - PAD * 2) / n);
  const x0 = (W - cw * n) / 2;
  const top = Math.max(1, ...p.heights, ...(p.water ?? []).map((w, i) => w + p.heights[i]), p.area?.h ?? 0);
  const H = 150;
  const u = H / top;
  const ptrs = p.ptrs ?? [];
  const depth = ptrs.length ? 40 + 22 * Math.max(0, maxStack(ptrs) - 1) : 0;
  return (
    <Frame label={p.label} h={H + 26 + depth}>
      {p.area && (
        <rect x={x0 + p.area.from * cw} y={H - p.area.h * u} width={(p.area.to - p.area.from + 1) * cw} height={p.area.h * u} fill={paint(p.area.role ?? 'found').fill} opacity={0.7} className={`${styles.wash} ${styles.shape}`} />
      )}
      {p.heights.map((v, i) => (
        <g key={i}>
          {p.water && p.water[i] > 0 && <rect x={x0 + i * cw + 1} y={H - (v + p.water[i]) * u} width={cw - 2} height={p.water[i] * u} fill="#9cc3ea" opacity={0.85} className={`${styles.wash} ${styles.shape}`} />}
          <rect x={x0 + i * cw + 4} y={H - v * u} width={cw - 8} height={Math.max(1, v * u)} rx={3} fill={paint(p.marks?.[i]).fill === PAINT.base.fill ? '#e9dfcb' : paint(p.marks?.[i]).fill} className={`${styles.wash} ${styles.shape}`} />
          <rect x={x0 + i * cw + 4} y={H - v * u} width={cw - 8} height={Math.max(1, v * u)} rx={3} fill="none" stroke={paint(p.marks?.[i]).ink} className={`${styles.pencil} ${styles.shape}`} />
          <text x={x0 + i * cw + cw / 2} y={H + 20} textAnchor="middle" fontSize={17} className={styles.value}>
            {v}
          </text>
        </g>
      ))}
      <line x1={x0 - 6} x2={x0 + n * cw + 6} y1={H} y2={H} stroke="#3b3a40" strokeWidth={1.2} className={styles.pencil} />
      <Pointers ptrs={ptrs} at={(a) => x0 + (typeof a === 'number' ? a : 0) * cw + cw / 2} y={H + 26} />
    </Frame>
  );
}

function GridPanel({ p }: { p: Extract<Panel, { t: 'grid' }> }) {
  const R = p.cells.length;
  const C = Math.max(1, ...p.cells.map((r) => r.length));
  const head = p.cols ? 24 : 0;
  const side = p.rows ? 36 : 0;
  const s = Math.min(52, (W - PAD * 2 - side) / C, 420 / Math.max(1, R));
  const x0 = (W - side - s * C) / 2 + side;
  const size = s < 32 ? 16 : s < 42 ? 18 : 21;
  return (
    <Frame label={p.label} h={head + R * s + 4}>
      {p.cols?.map((c, j) => (
        <text key={`c${j}`} x={x0 + j * s + s / 2} y={16} textAnchor="middle" fontSize={16} className={styles.index}>
          {c}
        </text>
      ))}
      {p.rows?.map((r, i) => (
        <text key={`r${i}`} x={x0 - 10} y={head + i * s + s / 2 + 6} textAnchor="end" fontSize={16} className={styles.index}>
          {r}
        </text>
      ))}
      {p.cells.map((row, i) =>
        row.map((v, j) => {
          const role = p.marks?.[`${i},${j}`];
          return (
            <g key={`${i},${j}`}>
              <Cell x={x0 + j * s + 1.5} y={head + i * s + 1.5} w={s - 3} h={s - 3} role={role} r={4} />
              <Label x={x0 + j * s + s / 2} y={head + i * s + s / 2 + size * 0.34} size={size}>
                {v === null ? '' : text(v)}
              </Label>
            </g>
          );
        }),
      )}
      {p.ptrs?.map((q) => (
        <g key={q.label} className={styles.move} style={{ transform: `translate(${x0 + q.c * s + s - 4}px, ${head + q.r * s + 14}px)` }}>
          <text textAnchor="end" fontSize={16} fontWeight={700} fill={paint(q.role ?? 'active').ink} className={styles.value}>
            {q.label}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/** Chips that wrap onto new rows: a hash map's entries, a set's members, found answers. */
function Chips({ items, label, marks }: { items: { key: string; text: string }[]; label?: string; marks?: Record<string, Role> }) {
  const size = 19;
  let x = PAD;
  let y = 0;
  const placed = items.map((it) => {
    const w = tw(it.text, size) + 18;
    if (x + w > W - PAD && x > PAD) {
      x = PAD;
      y += 40;
    }
    const at = { ...it, x, y, w };
    x += w + 8;
    return at;
  });
  const h = items.length ? y + 36 : 34;
  return (
    <Frame label={label} h={h}>
      {!items.length && (
        <text x={PAD} y={22} fontSize={18} className={styles.index}>
          (empty)
        </text>
      )}
      {placed.map((c) => (
        <g key={c.key} className={`${styles.move} ${styles.appear}`} style={{ transform: `translate(${c.x}px, ${c.y}px)` }}>
          <rect width={c.w} height={32} rx={16} fill={paint(marks?.[c.key]).fill} className={styles.wash} />
          <rect width={c.w} height={32} rx={16} fill="none" stroke={paint(marks?.[c.key]).ink} className={styles.pencil} />
          <text x={c.w / 2} y={22} textAnchor="middle" fontSize={size} fontWeight={700} className={styles.value}>
            {c.text}
          </text>
        </g>
      ))}
    </Frame>
  );
}

function MapPanel({ p }: { p: Extract<Panel, { t: 'map' }> }) {
  const items = p.entries.map(([k, v]) => ({ key: String(k), text: p.set ? text(k) : `${text(k)} → ${text(v)}` }));
  return <Chips items={items} label={p.label} marks={p.marks} />;
}

function ResultsPanel({ p }: { p: Extract<Panel, { t: 'results' }> }) {
  const marks: Record<string, Role> = {};
  Object.entries(p.marks ?? {}).forEach(([i, r]) => (marks[`${i}`] = r));
  return <Chips items={p.items.map((t, i) => ({ key: String(i), text: t }))} label={p.label} marks={marks} />;
}

function VarsPanel({ p }: { p: Extract<Panel, { t: 'vars' }> }) {
  const marks: Record<string, Role> = {};
  p.items.forEach((it) => it.role && (marks[it.k] = it.role));
  return <Chips items={p.items.map((it) => ({ key: it.k, text: `${it.k} = ${text(it.v)}` }))} marks={marks} />;
}

function StackPanel({ p, queue }: { p: Extract<Panel, { t: 'stack' | 'queue' }>; queue?: boolean }) {
  const n = p.items.length;
  const cw = Math.min(64, (W - PAD * 2 - 80) / Math.max(1, n));
  const x0 = PAD + 44;
  return (
    <Frame label={p.label} h={64}>
      <path d={queue ? `M ${x0 - 8} 4 L ${x0 + Math.max(1, n) * cw + 8} 4 M ${x0 - 8} 52 L ${x0 + Math.max(1, n) * cw + 8} 52` : `M ${x0 + Math.max(1, n) * cw + 10} 4 L ${x0 - 6} 4 L ${x0 - 6} 52 L ${x0 + Math.max(1, n) * cw + 10} 52`} fill="none" stroke="#3b3a40" strokeWidth={1.3} className={styles.pencil} />
      <text x={PAD} y={34} fontSize={16} className={styles.index}>
        {queue ? 'front' : 'bottom'}
      </text>
      {!n && (
        <text x={x0 + 8} y={34} fontSize={17} className={styles.index}>
          (empty)
        </text>
      )}
      {p.items.map((v, i) => {
        const role = p.marks?.[i];
        return (
          <g key={i} className={styles.appear}>
            <Cell x={x0 + i * cw + 3} y={8} w={cw - 6} h={40} role={role} />
            <Label x={x0 + i * cw + cw / 2} y={35} size={cw < 40 ? 16 : 20}>
              {text(v)}
            </Label>
          </g>
        );
      })}
      {n > 0 && (
        <text x={x0 + n * cw + 16} y={34} fontSize={16} className={styles.index}>
          {queue ? 'back' : '← top'}
        </text>
      )}
    </Frame>
  );
}

function ListPanel({ p }: { p: Extract<Panel, { t: 'list' }> }) {
  const order = p.order ?? p.nodes.map((n) => n.id);
  const byId = new Map(p.nodes.map((n) => [n.id, n]));
  const n = order.length;
  const gap = Math.min(96, (W - PAD * 2) / Math.max(1, n + 0.6));
  const bw = Math.min(56, gap - 26);
  const x0 = (W - gap * (n - 1) - bw) / 2;
  const pos = new Map(order.map((id, i) => [id, x0 + i * gap]));
  const hasRandom = p.nodes.some((m) => m.random);
  const top = 40;
  const ptrs = p.ptrs ?? [];
  const depth = ptrs.length ? 40 + 22 * Math.max(0, maxStack(ptrs) - 1) : 0;
  const nullX = x0 + n * gap - 10;
  const arrow = (from: LNode) => {
    const a = pos.get(from.id);
    if (a === undefined) return null;
    const sx = a + bw;
    if (from.next === null) return <text x={sx + 10} y={top + 26} fontSize={18} className={styles.index}>∅</text>;
    const b = pos.get(from.next);
    if (b === undefined) return null;
    if (b > a && b - a < gap * 1.5) return <line x1={sx + 2} y1={top + 20} x2={b - 3} y2={top + 20} stroke="#3b3a40" strokeWidth={1.5} markerEnd="url(#alg-arrow)" className={styles.pencil} />;
    // Back (or skipping) links arc over the top.
    const mid = (sx + b + bw / 2) / 2;
    const lift = 18 + Math.min(34, Math.abs(b - a) / 6);
    return <path d={`M ${sx - 6} ${top} Q ${mid} ${top - lift * 1.6} ${b + bw / 2} ${top - 2}`} fill="none" stroke="#3b3a40" strokeWidth={1.5} markerEnd="url(#alg-arrow)" className={styles.pencil} />;
  };
  return (
    <Frame label={p.label} h={top + 44 + (hasRandom ? 46 : 0) + depth}>
      {p.nodes.map((m) => (
        <g key={`a${m.id}-${m.next}`} className={styles.fade}>
          {arrow(m)}
        </g>
      ))}
      {hasRandom &&
        p.nodes.map((m) => {
          if (!m.random) return null;
          const a = pos.get(m.id);
          const b = pos.get(m.random);
          if (a === undefined || b === undefined) return null;
          const y = top + 42;
          const dip = 26 + Math.abs(b - a) / 10;
          return <path key={`r${m.id}`} d={`M ${a + bw / 2} ${y} Q ${(a + b) / 2 + bw / 2} ${y + dip} ${b + bw / 2 + (a === b ? 12 : 0)} ${y + 2}`} fill="none" stroke="#5a3a8e" strokeWidth={1.3} strokeDasharray="4 3" markerEnd="url(#alg-arrow-v)" />;
        })}
      {order.map((id) => {
        const m = byId.get(id);
        if (!m) return null;
        return (
          <g key={id}>
            <Cell x={pos.get(id)!} y={top} w={bw} h={40} role={m.role} />
            <g className={styles.move} style={{ transform: `translate(${pos.get(id)! + bw / 2}px, ${top + 27}px)` }}>
              <text textAnchor="middle" fontSize={20} fontWeight={700} className={styles.value}>
                {text(m.val)}
              </text>
            </g>
          </g>
        );
      })}
      <Pointers ptrs={ptrs} at={(a) => (a === null ? nullX + 8 : (pos.get(String(a)) ?? nullX) + bw / 2)} y={top + 44 + (hasRandom ? 46 : 0)} />
    </Frame>
  );
}

function TreePanel({ p }: { p: Extract<Panel, { t: 'tree' }> }) {
  const by = new Map(p.nodes.map((n) => [n.id, n]));
  const order: string[] = [];
  const depth = new Map<string, number>();
  let maxD = 0;
  const walk = (id: string | null | undefined, d: number) => {
    if (!id || !by.has(id)) return;
    const n = by.get(id)!;
    walk(n.left, d + 1);
    order.push(id);
    depth.set(id, d);
    maxD = Math.max(maxD, d);
    walk(n.right, d + 1);
  };
  walk(p.root, 0);
  const n = Math.max(1, order.length);
  const gx = Math.min(56, (W - PAD * 2 - 40) / n);
  const x0 = (W - gx * (n - 1)) / 2;
  const gy = 64;
  const pos = new Map(order.map((id, i) => [id, { x: x0 + i * gx, y: 28 + depth.get(id)! * gy }]));
  const r = Math.min(20, gx / 2 - 2);
  const ptrs = p.ptrs ?? [];
  const h = 28 + maxD * gy + r + 12 + (ptrs.length ? 44 : 0);
  if (!p.root)
    return (
      <Frame label={p.label} h={30}>
        <text x={PAD} y={22} fontSize={18} className={styles.index}>
          (empty tree)
        </text>
      </Frame>
    );
  return (
    <Frame label={p.label} h={h}>
      {order.map((id) => {
        const a = pos.get(id)!;
        const t = by.get(id)!;
        return [t.left, t.right].map((c) => {
          const b = c ? pos.get(c) : null;
          return b ? <line key={`${id}-${c}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#3b3a40" strokeWidth={1.4} className={`${styles.pencil} ${styles.shape}`} /> : null;
        });
      })}
      {order.map((id) => {
        const a = pos.get(id)!;
        const t = by.get(id) as TNode;
        const c = paint(t.role);
        return (
          <g key={id} className={styles.move} style={{ transform: `translate(${a.x}px, ${a.y}px)` }}>
            <circle r={r} fill={c.fill} className={styles.wash} />
            <circle r={r} fill="none" stroke={c.ink} className={styles.pencil} />
            <text y={r < 16 ? 5 : 7} textAnchor="middle" fontSize={r < 16 ? 16 : 20} fontWeight={700} className={styles.value}>
              {text(t.val)}
            </text>
            {t.badge && (
              <text x={r + 3} y={-r + 4} fontSize={16} fontWeight={700} fill={PAINT.compare.ink} className={styles.value}>
                {t.badge}
              </text>
            )}
          </g>
        );
      })}
      <Pointers ptrs={ptrs} at={(id) => (id !== null && pos.get(String(id))?.x) || 0} y={28 + maxD * gy + r + 4} />
    </Frame>
  );
}

function GraphPanel({ p }: { p: Extract<Panel, { t: 'graph' }> }) {
  const H = 300;
  const by = new Map(p.nodes.map((n) => [n.id, { ...n, px: PAD + 24 + n.x * (W - PAD * 2 - 48), py: 24 + n.y * (H - 48) }]));
  const r = p.nodes.length > 14 ? 15 : 20;
  return (
    <Frame label={p.label} h={H}>
      {p.edges.map((e, i) => {
        const a = by.get(e.a);
        const b = by.get(e.b);
        if (!a || !b) return null;
        const dx = b.px - a.px;
        const dy = b.py - a.py;
        const d = Math.hypot(dx, dy) || 1;
        const [x1, y1, x2, y2] = [a.px + (dx / d) * r, a.py + (dy / d) * r, b.px - (dx / d) * (r + 3), b.py - (dy / d) * (r + 3)];
        const c = e.role ? paint(e.role).ink : '#3b3a40';
        return (
          <g key={`${e.a}-${e.b}-${i}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={e.role ? 3 : 1.4} markerEnd={p.directed ? 'url(#alg-arrow)' : undefined} className={`${styles.pencil} ${styles.shape}`} />
            {e.w !== undefined && (
              <text x={(a.px + b.px) / 2 + 6} y={(a.py + b.py) / 2 - 6} fontSize={17} fontWeight={700} fill={PAINT.path.ink} className={styles.value}>
                {e.w}
              </text>
            )}
          </g>
        );
      })}
      {[...by.values()].map((n) => {
        const c = paint(n.role);
        return (
          <g key={n.id} className={styles.move} style={{ transform: `translate(${n.px}px, ${n.py}px)` }}>
            <circle r={r} fill={c.fill} className={styles.wash} />
            <circle r={r} fill="none" stroke={c.ink} className={styles.pencil} />
            <text y={6} textAnchor="middle" fontSize={n.label.length > 3 ? 14 + 2 : 19} fontWeight={700} className={styles.value}>
              {n.label}
            </text>
            {n.badge && (
              <text x={r + 3} y={-r + 2} fontSize={16} fontWeight={700} fill={PAINT.compare.ink} className={styles.value}>
                {n.badge}
              </text>
            )}
          </g>
        );
      })}
    </Frame>
  );
}

function IntervalsPanel({ p }: { p: Extract<Panel, { t: 'intervals' }> }) {
  const lo = p.min ?? Math.min(0, ...p.rows.map((r) => r.s));
  const hi = p.max ?? Math.max(1, ...p.rows.map((r) => r.e));
  const X = (v: number) => PAD + 20 + ((v - lo) / Math.max(1, hi - lo)) * (W - PAD * 2 - 40);
  const rowH = 30;
  const H = p.rows.length * rowH + 34;
  const ticks = hi - lo <= 24 ? Array.from({ length: hi - lo + 1 }, (_, i) => lo + i) : Array.from({ length: 7 }, (_, i) => Math.round(lo + ((hi - lo) * i) / 6));
  return (
    <Frame label={p.label} h={H}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={X(t)} x2={X(t)} y1={0} y2={H - 26} stroke="#3b3a40" strokeOpacity={0.12} />
          <text x={X(t)} y={H - 6} textAnchor="middle" fontSize={16} className={styles.index}>
            {t}
          </text>
        </g>
      ))}
      {p.rows.map((r, i) => {
        const c = paint(r.role);
        const x = X(r.s);
        const w = Math.max(6, X(r.e) - X(r.s));
        return (
          <g key={i} className={styles.appear}>
            <rect x={x} y={i * rowH + 4} width={w} height={rowH - 8} rx={8} fill={c.fill} className={`${styles.wash} ${styles.shape}`} />
            <rect x={x} y={i * rowH + 4} width={w} height={rowH - 8} rx={8} fill="none" stroke={c.ink} className={`${styles.pencil} ${styles.shape}`} />
            <text x={x + w + 6} y={i * rowH + 21} fontSize={16} fontWeight={700} fill={c.ink} className={styles.value}>
              {r.label ?? `[${r.s}, ${r.e}]`}
            </text>
          </g>
        );
      })}
      {p.cursor !== undefined && <line x1={X(p.cursor)} x2={X(p.cursor)} y1={-4} y2={H - 26} stroke={PAINT.bad.ink} strokeWidth={2} strokeDasharray="5 4" className={styles.shape} />}
    </Frame>
  );
}

function BitsPanel({ p }: { p: Extract<Panel, { t: 'bits' }> }) {
  const n = Math.max(1, ...p.rows.map((r) => r.bits.length));
  const side = 96;
  const cw = Math.min(40, (W - PAD * 2 - side) / n);
  const x0 = W - PAD - cw * n;
  const rowH = cw + 8;
  return (
    <Frame label={p.label} h={p.rows.length * rowH}>
      {p.rows.map((r, i) => (
        <g key={i}>
          <text x={x0 - 10} y={i * rowH + cw * 0.68} textAnchor="end" fontSize={18} fontWeight={700} className={styles.value}>
            {r.label}
          </text>
          {r.bits.map((b, j) => {
            const x = x0 + (n - r.bits.length + j) * cw;
            return (
              <g key={j}>
                <Cell x={x + 1.5} y={i * rowH} w={cw - 3} h={cw} role={r.marks?.[j] ?? (b ? 'window' : undefined)} r={4} />
                <Label x={x + cw / 2} y={i * rowH + cw * 0.68} size={cw < 26 ? 16 : 19}>
                  {b}
                </Label>
              </g>
            );
          })}
        </g>
      ))}
    </Frame>
  );
}

export function PanelView({ p }: { p: Panel }) {
  switch (p.t) {
    case 'array':
      return <ArrayPanel p={p} />;
    case 'bars':
      return <BarsPanel p={p} />;
    case 'grid':
      return <GridPanel p={p} />;
    case 'map':
      return <MapPanel p={p} />;
    case 'stack':
      return <StackPanel p={p} />;
    case 'queue':
      return <StackPanel p={p} queue />;
    case 'list':
      return <ListPanel p={p} />;
    case 'tree':
      return <TreePanel p={p} />;
    case 'graph':
      return <GraphPanel p={p} />;
    case 'intervals':
      return <IntervalsPanel p={p} />;
    case 'bits':
      return <BitsPanel p={p} />;
    case 'vars':
      return <VarsPanel p={p} />;
    case 'results':
      return <ResultsPanel p={p} />;
  }
}
