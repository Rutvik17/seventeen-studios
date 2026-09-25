import type { Category, Problem } from './types';
import { arraysHashing } from './arrays-hashing';
import { stack } from './stack';

export type { Category, Problem, Difficulty } from './types';

/** Every category, in NeetCode's order. */
export const categories: Category[] = [arraysHashing, stack];

export interface Listed extends Problem {
  category: string;
  categoryTitle: string;
}

/** Every problem, in order, with its category. */
export const problems: Listed[] = categories.flatMap((c) => c.problems.map((p) => ({ ...p, category: c.slug, categoryTitle: c.title })));

export function problem(slug: string): Listed {
  const p = problems.find((x) => x.slug === slug);
  if (!p) throw new Error(`No problem "${slug}"`);
  return p;
}

/** The section itself: what it is called, and the words on its first page. */
export const algorithmsPage = {
  title: 'Algorithms',
  lead: 'The NeetCode 150 — every problem restated, solved in six languages, and drawn step by step as it runs.',
  languages: 'Python · JavaScript · Java · C++ · C# · Rust',
};
