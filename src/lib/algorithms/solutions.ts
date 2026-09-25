/**
 * Reading a problem's solution folder at build time (server only): its spec,
 * its examples written out as LeetCode writes them, and its code in every
 * language, coloured.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { highlight, type Lang } from './highlight';

export const LANGS: { id: Lang; label: string; file: string }[] = [
  { id: 'py', label: 'Python', file: 'solution.py' },
  { id: 'js', label: 'JavaScript', file: 'solution.js' },
  { id: 'java', label: 'Java', file: 'Solution.java' },
  { id: 'cpp', label: 'C++', file: 'solution.cpp' },
  { id: 'cs', label: 'C#', file: 'Solution.cs' },
  { id: 'rs', label: 'Rust', file: 'solution.rs' },
];

interface Param {
  name: string;
  type: string;
}
export interface Spec {
  method?: string;
  params?: Param[];
  returns?: string;
  design?: { class: string };
  roundtrip?: { class: string; type: string; param?: string };
  cases: { in?: unknown[]; ops?: string[]; args?: unknown[][]; out: unknown; example?: boolean }[];
}

const dir = (slug: string) => path.join(process.cwd(), 'solutions', slug);

export function readSpec(slug: string): Spec {
  return JSON.parse(readFileSync(path.join(dir(slug), 'spec.json'), 'utf8'));
}

export function readCode(slug: string) {
  return LANGS.flatMap((l) => {
    const f = path.join(dir(slug), l.file);
    if (!existsSync(f)) return [];
    const src = readFileSync(f, 'utf8').replace(/\s+$/, '');
    return [{ id: l.id, label: l.label, src, html: highlight(src, l.id) }];
  });
}

const j = (v: unknown) => JSON.stringify(v).replace(/,/g, ', ');

/** An example's input as LeetCode writes it: `nums = [2, 7, 11, 15], target = 9`. */
export function formatInput(spec: Spec, c: Spec['cases'][number]): string {
  if (spec.design || c.ops) return `${j(c.ops)}\n${j(c.args)}`;
  if (spec.roundtrip) return `${spec.roundtrip.param ?? 'root'} = ${j(c.in?.[0])}`;
  return (spec.params ?? [])
    .map((p, i) => {
      const v = c.in?.[i];
      if (p.type === 'ListCycle') {
        const [vals, pos] = v as [number[], number];
        return `head = ${j(vals)}, pos = ${pos}`;
      }
      return `${p.name} = ${j(v)}`;
    })
    .join(', ');
}

export function formatOutput(c: Spec['cases'][number]): string {
  return j(c.out);
}

/** The worked examples: the cases flagged as examples, or the first few. */
export function examples(spec: Spec) {
  const flagged = spec.cases.filter((c) => c.example);
  const chosen = flagged.length ? flagged : spec.cases.slice(0, 2);
  return chosen.map((c) => ({
    input: formatInput(spec, c),
    output: formatOutput(c),
    raw: c.ops ? { ops: c.ops, args: c.args } : c.in,
  }));
}
