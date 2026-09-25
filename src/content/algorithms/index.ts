import type { Category, Problem } from './types';
import { arraysHashing } from './arrays-hashing';
import { twoPointers } from './two-pointers';
import { slidingWindow } from './sliding-window';
import { stack } from './stack';
import { binarySearch } from './binary-search';
import { linkedList } from './linked-list';
import { trees } from './trees';
import { tries } from './tries';
import { heap } from './heap';
import { backtracking } from './backtracking';
import { graphs } from './graphs';

export type { Category, Problem, Difficulty } from './types';

/** Every category, in NeetCode's order. */
export const categories: Category[] = [arraysHashing, twoPointers, slidingWindow, stack, binarySearch, linkedList, trees, tries, heap, backtracking, graphs];

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
