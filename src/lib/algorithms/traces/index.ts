/**
 * Where each category's tracers are. Each is its own chunk, loaded when a
 * problem in it is opened.
 */
import type { Tracer } from '../trace';

const loaders: Record<string, () => Promise<{ traces: Record<string, Tracer> }>> = {
  'arrays-hashing': () => import('./arrays-hashing'),
  'two-pointers': () => import('./two-pointers'),
  stack: () => import('./stack'),
};

export async function loadTracer(category: string, slug: string): Promise<Tracer | null> {
  const load = loaders[category];
  if (!load) return null;
  const m = await load();
  return m.traces[slug] ?? null;
}
