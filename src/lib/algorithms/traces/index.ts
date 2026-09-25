/**
 * Where each category's tracers are. Each is its own chunk, loaded when a
 * problem in it is opened.
 */
import type { Tracer } from '../trace';

const loaders: Record<string, () => Promise<{ traces: Record<string, Tracer> }>> = {
  'arrays-hashing': () => import('./arrays-hashing'),
  'two-pointers': () => import('./two-pointers'),
  'sliding-window': () => import('./sliding-window'),
  stack: () => import('./stack'),
  'binary-search': () => import('./binary-search'),
  'linked-list': () => import('./linked-list'),
  trees: () => import('./trees'),
  tries: () => import('./tries'),
  heap: () => import('./heap'),
  backtracking: () => import('./backtracking'),
  graphs: () => import('./graphs'),
  'advanced-graphs': () => import('./advanced-graphs'),
  '1d-dp': () => import('./dp-1d'),
  '2d-dp': () => import('./dp-2d'),
  greedy: () => import('./greedy'),
  intervals: () => import('./intervals'),
  'math-geometry': () => import('./math-geometry'),
};

export async function loadTracer(category: string, slug: string): Promise<Tracer | null> {
  const load = loaders[category];
  if (!load) return null;
  const m = await load();
  return m.traces[slug] ?? null;
}
