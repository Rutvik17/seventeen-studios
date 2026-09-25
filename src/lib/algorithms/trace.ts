/**
 * A TRACE: an algorithm, run on one example, written down a step at a time.
 *
 * Every visualisation on the algorithms page is one of these. A problem's
 * tracer (`traces/<category>.ts`) is the same algorithm as its solutions,
 * instrumented: as it runs it records a snapshot — what the data looks like,
 * where the pointers are, what has just been decided and why — and at the end
 * the answer it computed. The renderer (`components/algorithms/Viz.tsx`) draws
 * any snapshot; the player steps through them.
 *
 * Because the pictures come from running the algorithm rather than from being
 * drawn by hand, they cannot show a step the algorithm does not take. And every
 * tracer is run against its problem's test cases by `scripts/algorithms/traces.mjs`:
 * the answer it arrives at must match the expected one, as the solutions' must.
 *
 * Framework-free and DOM-free, so the test script can import it directly.
 */

/** What a mark means. Each is one paint from the box (`Viz.tsx` maps them). */
export type Role =
  | 'active' // being looked at now — cadmium yellow
  | 'compare' // being compared with the active one — ultramarine
  | 'found' // part of the answer, or a success — sap green
  | 'bad' // rejected, a conflict, a failure — cadmium red
  | 'visited' // seen before — violet
  | 'window' // inside the current range — pale blue
  | 'done' // finished with — grey
  | 'path' // on the current path — orange
  | 'new'; // just created — pale green

export type Val = string | number | boolean | null;

export interface Ptr {
  /** The index (or node id) it points at; null points nowhere. */
  at: number | string | null;
  label: string;
  role?: Role;
}

export type Panel =
  | { t: 'array'; label?: string; items: Val[]; marks?: Record<number, Role>; ptrs?: Ptr[]; range?: { from: number; to: number; role?: Role }; index?: boolean; faded?: number[] }
  | { t: 'bars'; label?: string; heights: number[]; marks?: Record<number, Role>; ptrs?: Ptr[]; water?: number[]; area?: { from: number; to: number; h: number; role?: Role } }
  | { t: 'grid'; label?: string; cells: Val[][]; marks?: Record<string, Role>; rows?: string[]; cols?: string[]; ptrs?: { r: number; c: number; label: string; role?: Role }[] }
  | { t: 'map'; label?: string; entries: [Val, Val][]; marks?: Record<string, Role>; set?: boolean }
  | { t: 'stack'; label?: string; items: Val[]; marks?: Record<number, Role> }
  | { t: 'queue'; label?: string; items: Val[]; marks?: Record<number, Role> }
  | { t: 'list'; label?: string; nodes: LNode[]; ptrs?: Ptr[]; order?: string[] }
  | { t: 'tree'; label?: string; nodes: TNode[]; root: string | null; ptrs?: Ptr[] }
  | { t: 'graph'; label?: string; nodes: GNode[]; edges: GEdge[]; directed?: boolean }
  | { t: 'intervals'; label?: string; rows: { s: number; e: number; role?: Role; label?: string }[]; min?: number; max?: number; cursor?: number }
  | { t: 'bits'; label?: string; rows: { label: string; bits: number[]; marks?: Record<number, Role> }[] }
  | { t: 'vars'; items: { k: string; v: Val; role?: Role }[] }
  | { t: 'results'; label: string; items: string[]; marks?: Record<number, Role> };

export interface LNode {
  id: string;
  val: Val;
  next: string | null;
  random?: string | null;
  role?: Role;
}
export interface TNode {
  id: string;
  val: Val;
  left?: string | null;
  right?: string | null;
  role?: Role;
  badge?: string;
}
export interface GNode {
  id: string;
  label: string;
  /** Position in the unit square. */
  x: number;
  y: number;
  role?: Role;
  badge?: string;
}
export interface GEdge {
  a: string;
  b: string;
  w?: number | string;
  role?: Role;
}

export interface Step {
  /** One or two sentences: what happens in this step, and why. */
  note: string;
  panels: Panel[];
}

export interface Trace {
  steps: Step[];
  /** The answer the algorithm arrived at — checked against the expected output. */
  result: unknown;
}

/** One problem's tracer: given a test case's input, the trace of solving it. */
export type Tracer = (input: any) => Trace;

/** Records steps as a tracer runs. */
export class Rec {
  steps: Step[] = [];
  /** A hard ceiling, so a large input cannot make a trace nobody would step through. */
  max: number;
  constructor(max = 400) {
    this.max = max;
  }
  add(note: string, ...panels: (Panel | false | null | undefined)[]) {
    // A snapshot: a tracer keeps changing its working arrays after drawing them,
    // and a step must show them as they were when it was taken.
    if (this.steps.length < this.max) this.steps.push({ note, panels: structuredClone(panels.filter(Boolean) as Panel[]) });
  }
  done(result: unknown): Trace {
    return { steps: this.steps, result };
  }
}

/* ------------------------------------------------------------------ *
 * Panel builders — shorthand for tracers                             *
 * ------------------------------------------------------------------ */

type Opts<T extends Panel['t']> = Omit<Extract<Panel, { t: T }>, 't'>;

export const arr = (items: Val[], o: Partial<Opts<'array'>> = {}): Panel => ({ t: 'array', items, ...o });
export const bars = (heights: number[], o: Partial<Opts<'bars'>> = {}): Panel => ({ t: 'bars', heights, ...o });
export const grid = (cells: Val[][], o: Partial<Opts<'grid'>> = {}): Panel => ({ t: 'grid', cells, ...o });
export const map = (entries: [Val, Val][] | Map<any, any>, o: Partial<Opts<'map'>> = {}): Panel => ({ t: 'map', entries: entries instanceof Map ? [...entries.entries()].map(([k, v]) => [show(k), show(v)]) : entries, ...o });
export const set = (items: Iterable<Val>, o: Partial<Opts<'map'>> = {}): Panel => ({ t: 'map', set: true, entries: [...items].map((k) => [show(k), null]), ...o });
export const stack = (items: Val[], o: Partial<Opts<'stack'>> = {}): Panel => ({ t: 'stack', items, ...o });
export const queue = (items: Val[], o: Partial<Opts<'queue'>> = {}): Panel => ({ t: 'queue', items, ...o });
export const list = (nodes: LNode[], o: Partial<Opts<'list'>> = {}): Panel => ({ t: 'list', nodes, ...o });
export const tree = (nodes: TNode[], root: string | null, o: Partial<Opts<'tree'>> = {}): Panel => ({ t: 'tree', nodes, root, ...o });
export const graph = (nodes: GNode[], edges: GEdge[], o: Partial<Opts<'graph'>> = {}): Panel => ({ t: 'graph', nodes, edges, ...o });
export const intervals = (rows: Opts<'intervals'>['rows'], o: Partial<Opts<'intervals'>> = {}): Panel => ({ t: 'intervals', rows, ...o });
export const bits = (rows: Opts<'bits'>['rows'], o: Partial<Opts<'bits'>> = {}): Panel => ({ t: 'bits', rows, ...o });
export const vars = (o: Record<string, Val | [Val, Role]>): Panel => ({
  t: 'vars',
  items: Object.entries(o).map(([k, v]) => (Array.isArray(v) ? { k, v: v[0], role: v[1] } : { k, v })),
});
export const results = (label: string, items: string[], o: Partial<Opts<'results'>> = {}): Panel => ({ t: 'results', label, items, ...o });

/** A value as it is written on the page. */
export function show(v: unknown): Val {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return Number.isInteger(v) ? v : Math.round(v * 1000) / 1000;
  if (typeof v === 'string' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return `[${v.map((x) => fmt(x)).join(', ')}]`;
  return String(v);
}
/** A value as text, arrays in brackets, strings quoted. */
export function fmt(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'string') return `"${v}"`;
  if (Array.isArray(v)) return `[${v.map(fmt).join(', ')}]`;
  return String(v);
}

/** Marks for several indices at once. */
export function marks(...groups: [Iterable<number> | number | null | undefined, Role][]): Record<number, Role> {
  const out: Record<number, Role> = {};
  for (const [idx, role] of groups) {
    if (idx === null || idx === undefined) continue;
    if (typeof idx === 'number') out[idx] = role;
    else for (const i of idx) out[i] = role;
  }
  return out;
}
export const range = (a: number, b: number) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

/* ------------------------------------------------------------------ *
 * Structures                                                          *
 * ------------------------------------------------------------------ */

/** A binary tree given in LeetCode's level order (nulls for gaps), as tracer nodes. */
export interface BT {
  id: string;
  val: number;
  left: BT | null;
  right: BT | null;
}
export function buildTree(vals: (number | null)[]): BT | null {
  if (!vals.length || vals[0] === null) return null;
  let n = 0;
  const mk = (v: number): BT => ({ id: `t${n++}`, val: v, left: null, right: null });
  const root = mk(vals[0]);
  const q = [root];
  let i = 1;
  let h = 0;
  while (h < q.length && i < vals.length) {
    const node = q[h++];
    if (i < vals.length && vals[i] !== null) q.push((node.left = mk(vals[i] as number)));
    i++;
    if (i < vals.length && vals[i] !== null) q.push((node.right = mk(vals[i] as number)));
    i++;
  }
  return root;
}
/** A tracer tree as panel nodes, with a role (and badge) per node id. */
export function treeNodes(root: BT | null, roles: Record<string, Role> = {}, badges: Record<string, string> = {}): TNode[] {
  const out: TNode[] = [];
  const walk = (t: BT | null) => {
    if (!t) return;
    out.push({ id: t.id, val: t.val, left: t.left?.id ?? null, right: t.right?.id ?? null, role: roles[t.id], badge: badges[t.id] });
    walk(t.left);
    walk(t.right);
  };
  walk(root);
  return out;
}
export function treeLevel(root: BT | null): (number | null)[] {
  const out: (number | null)[] = [];
  const q: (BT | null)[] = [root];
  let h = 0;
  while (h < q.length) {
    const t = q[h++];
    if (!t) out.push(null);
    else {
      out.push(t.val);
      q.push(t.left, t.right);
    }
  }
  while (out.length && out[out.length - 1] === null) out.pop();
  return out;
}

/** Points spread round a circle, for graphs with no natural layout. */
export function ring(n: number, cx = 0.5, cy = 0.5, r = 0.38): { x: number; y: number }[] {
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / Math.max(1, n)) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
  });
}
