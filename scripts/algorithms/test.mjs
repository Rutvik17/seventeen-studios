/**
 * Tests every solution in `solutions/`, in every language, against its spec.
 *
 *   npm run test:algorithms                  — everything
 *   npm run test:algorithms -- two-sum lru-cache --lang=rs,cs
 *
 * Each problem's `spec.json` states its signature once, in a small language of
 * types (`int[]`, `ListNode`, `list<list<int>>` …), and its test cases as JSON.
 * From that this script writes a test program in each of the six languages —
 * building the inputs as that language's own literals, calling the solution
 * the way LeetCode would, and printing each answer back as JSON — then
 * compiles it, runs it, and compares every answer with the expected one.
 *
 * Python and JavaScript run a file per problem. C++ compiles a translation
 * unit per problem, in parallel. Java, C# and Rust compile every problem into
 * one program each (a package, a namespace or a module per problem), because
 * their compilers are slow to start and fast once running.
 */

import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, cpSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const SOLUTIONS = path.join(root, 'solutions');
const RUNTIME = path.join(here, 'runtime');
const BUILD = path.join(root, '.algo-build');

export const LANGS = ['py', 'js', 'java', 'cpp', 'cs', 'rs'];
export const FILES = { py: 'solution.py', js: 'solution.js', java: 'Solution.java', cpp: 'solution.cpp', cs: 'Solution.cs', rs: 'solution.rs' };

/* ------------------------------------------------------------------ *
 * Names                                                               *
 * ------------------------------------------------------------------ */

const snake = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toLowerCase();
const pascal = (s) => s[0].toUpperCase() + s.slice(1);
const ident = (slug) => 'p_' + slug.replace(/[^a-z0-9]/gi, '_');
const methodName = (lang, m, spec) => (lang === 'rs' ? spec?.rustNames?.[m] ?? snake(m) : lang === 'cs' ? pascal(m) : m);

/* ------------------------------------------------------------------ *
 * Literals: a JSON value of a spec type, as each language writes it   *
 * ------------------------------------------------------------------ */

const q = (s) => JSON.stringify(s);
const chr = (c) => (c === "'" ? "'\\''" : c === '\\' ? "'\\\\'" : `'${c}'`);
const num = (v) => String(v);
const dbl = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));
const tree = (v) => v.map((x) => (x === null ? '"null"' : `"${x}"`));

function lit(lang, type, v) {
  const inner = (t) => (x) => lit(lang, t, x);
  switch (type) {
    case 'int':
      if (lang === 'cpp' && v === -2147483648) return '(-2147483647 - 1)';
      return num(v);
    case 'long':
      return { java: `${v}L`, cs: `${v}L`, cpp: `${v}LL`, rs: `${v}i64` }[lang] ?? num(v);
    case 'double':
      return dbl(v);
    case 'bool':
      return String(v);
    case 'u32':
      return { java: `(int) ${v}L`, cs: `${v}u`, cpp: `(uint32_t) ${v}u`, rs: `${v}u32` }[lang] ?? num(v);
    case 'string':
      return { cpp: `string(${q(v)})`, rs: `${q(v)}.to_string()` }[lang] ?? q(v);
    case 'char':
      return chr(v);
    case 'int[]':
      return { java: `new int[]{${v.join(', ')}}`, cs: `new int[]{${v.join(', ')}}`, cpp: `vector<int>{${v.join(', ')}}`, rs: `vec![${v.join(', ')}]` }[lang];
    case 'double[]':
      return { java: `new double[]{${v.map(dbl).join(', ')}}`, cs: `new double[]{${v.map(dbl).join(', ')}}`, cpp: `vector<double>{${v.map(dbl).join(', ')}}`, rs: `vec![${v.map(dbl).join(', ')}]` }[lang];
    case 'char[]':
      return { java: `new char[]{${v.map(chr).join(', ')}}`, cs: `new char[]{${v.map(chr).join(', ')}}`, cpp: `vector<char>{${v.map(chr).join(', ')}}`, rs: `vec![${v.map(chr).join(', ')}]` }[lang];
    case 'string[]': {
      const s = v.map(inner('string'));
      return { java: `new String[]{${s.join(', ')}}`, cs: `new string[]{${s.join(', ')}}`, cpp: `vector<string>{${s.join(', ')}}`, rs: `vec![${s.join(', ')}]` }[lang];
    }
    case 'list<int>':
      return { java: `new ArrayList<Integer>(List.of(${v.join(', ')}))`, cs: `new List<int>{${v.join(', ')}}`, cpp: `vector<int>{${v.join(', ')}}`, rs: `vec![${v.join(', ')}]` }[lang];
    case 'list<string>': {
      const s = v.map(inner('string'));
      return { java: `new ArrayList<String>(List.of(${s.join(', ')}))`, cs: `new List<string>{${s.join(', ')}}`, cpp: `vector<string>{${s.join(', ')}}`, rs: `vec![${s.join(', ')}]` }[lang];
    }
    case 'int[][]': {
      const rows = v.map((r) => r.join(', '));
      if (lang === 'java') return v.length ? `new int[][]{${rows.map((r) => `{${r}}`).join(', ')}}` : 'new int[0][0]';
      if (lang === 'cs') return v.length ? `new int[][]{${rows.map((r) => `new int[]{${r}}`).join(', ')}}` : 'new int[0][]';
      if (lang === 'cpp') return `vector<vector<int>>{${rows.map((r) => `{${r}}`).join(', ')}}`;
      return `vec![${rows.map((r) => `vec![${r}]`).join(', ')}]`;
    }
    case 'char[][]': {
      const rows = v.map((r) => r.map(chr).join(', '));
      if (lang === 'java') return `new char[][]{${rows.map((r) => `{${r}}`).join(', ')}}`;
      if (lang === 'cs') return `new char[][]{${rows.map((r) => `new char[]{${r}}`).join(', ')}}`;
      if (lang === 'cpp') return `vector<vector<char>>{${rows.map((r) => `{${r}}`).join(', ')}}`;
      return `vec![${rows.map((r) => `vec![${r}]`).join(', ')}]`;
    }
    case 'list<list<int>>': {
      if (lang === 'java') return `new ArrayList<List<Integer>>(List.of(${v.map((r) => lit(lang, 'list<int>', r)).join(', ')}))`;
      if (lang === 'cs') return `new List<IList<int>>{${v.map((r) => lit(lang, 'list<int>', r)).join(', ')}}`;
      return lit(lang, 'int[][]', v);
    }
    case 'list<list<string>>': {
      if (lang === 'java') return `new ArrayList<List<String>>(List.of(${v.map((r) => lit(lang, 'list<string>', r)).join(', ')}))`;
      if (lang === 'cs') return `new List<IList<string>>{${v.map((r) => lit(lang, 'list<string>', r)).join(', ')}}`;
      if (lang === 'cpp') return `vector<vector<string>>{${v.map((r) => `{${r.map(q).join(', ')}}`).join(', ')}}`;
      return `vec![${v.map((r) => lit(lang, 'string[]', r)).join(', ')}]`;
    }
    case 'ListNode':
      return { java: `H.mkList(${lit(lang, 'int[]', v)})`, cs: `H.MkList(${lit(lang, 'int[]', v)})`, cpp: `mkList(${lit(lang, 'int[]', v)})`, rs: `mk_list(${lit(lang, 'int[]', v)})` }[lang];
    case 'ListNode[]': {
      const ls = v.map(inner('ListNode'));
      return { java: `new ListNode[]{${ls.join(', ')}}`, cs: `new ListNode[]{${ls.join(', ')}}`, cpp: `vector<ListNode*>{${ls.join(', ')}}`, rs: `vec![${ls.join(', ')}]` }[lang];
    }
    case 'ListCycle':
      return { java: `H.mkCycle(${lit(lang, 'int[]', v[0])}, ${v[1]})`, cs: `H.MkCycle(${lit(lang, 'int[]', v[0])}, ${v[1]})`, cpp: `mkCycle(${lit(lang, 'int[]', v[0])}, ${v[1]})`, rs: `crate::common::rc::mk_cycle(${lit(lang, 'int[]', v[0])}, ${v[1]})` }[lang];
    case 'TreeNode':
      return { java: `H.mkTree(new String[]{${tree(v).join(', ')}})`, cs: `H.MkTree(new string[]{${tree(v).join(', ')}})`, cpp: `mkTree({${tree(v).join(', ')}})`, rs: `mk_tree(&[${tree(v).join(', ')}])` }[lang];
    case 'RandomList': {
      const rows = v.map(([a, b]) => [a, b === null ? -1 : b]);
      return { java: `H.mkRandom(${lit(lang, 'int[][]', rows)})`, cs: `H.MkRandom(${lit(lang, 'int[][]', rows)})`, cpp: `mkRandom(vector<pair<int,int>>{${rows.map(([a, b]) => `{${a}, ${b}}`).join(', ')}})`, rs: `crate::common::random::mk_random(vec![${rows.map(([a, b]) => `(${a}, ${b})`).join(', ')}])` }[lang];
    }
    case 'Graph':
      return { java: `H.mkGraph(${lit(lang, 'int[][]', v)})`, cs: `H.MkGraph(${lit(lang, 'int[][]', v)})`, cpp: `mkGraph(${lit(lang, 'int[][]', v)})`, rs: `crate::common::graph::mk_graph(${lit(lang, 'int[][]', v)})` }[lang];
  }
  throw new Error(`no literal for type ${type} in ${lang}`);
}

/** Python and JavaScript read the JSON directly; only node types need building. */
function dynBuild(lang, type, expr) {
  const py = lang === 'py';
  switch (type) {
    case 'ListNode':
      return py ? `mk_list(${expr})` : `mkList(${expr})`;
    case 'ListNode[]':
      return py ? `[mk_list(x) for x in ${expr}]` : `${expr}.map(mkList)`;
    case 'ListCycle':
      return py ? `mk_cycle(${expr})` : `mkCycle(${expr})`;
    case 'TreeNode':
      return py ? `mk_tree(${expr})` : `mkTree(${expr})`;
    case 'RandomList':
      return py ? `mk_random(${expr})` : `mkRandom(${expr})`;
    case 'Graph':
      return py ? `mk_graph(${expr})` : `mkGraph(${expr})`;
    case 'u32':
      return expr;
    default:
      return expr;
  }
}

/** How each language prints a value of a spec type as JSON. */
function show(lang, type, expr) {
  switch (lang) {
    case 'py':
      return `to_json(${expr})`;
    case 'js':
      return type === 'u32' ? `toJson((${expr}) >>> 0)` : `toJson(${expr})`;
    case 'java':
      return type === 'u32' ? `H.json(Integer.toUnsignedLong(${expr}))` : `H.json(${expr})`;
    case 'cs':
      return `H.Json(${expr})`;
    case 'cpp':
      return `J(${expr})`;
    case 'rs':
      if (type === 'ListNode') return `list_j(&${expr})`;
      if (type === 'TreeNode') return `tree_j(&${expr})`;
      if (type === 'Graph') return `crate::common::graph::graph_j(&${expr})`;
      if (type === 'RandomList') return `crate::common::random::random_j(&${expr})`;
      return `(${expr}).j()`;
  }
}

/* ------------------------------------------------------------------ *
 * Harnesses                                                           *
 * ------------------------------------------------------------------ */

const usesType = (spec, t) => JSON.stringify(spec).includes(`"${t}"`);

/** The statements that run one function-style case and print its answer. */
function functionCase(lang, spec, c, k) {
  const out = [];
  const args = spec.params.map((p, i) => `a${k}_${i}`);
  const firstTree = spec.params.findIndex((p) => p.type === 'TreeNode');
  spec.params.forEach((p, i) => {
    const name = args[i];
    const v = c.in[i];
    if (p.type === 'TreeRef') {
      const r = args[firstTree];
      out.push(
        {
          py: `${name} = find_node(${r}, ${v})`,
          js: `const ${name} = findNode(${r}, ${v});`,
          java: `var ${name} = H.findNode(${r}, ${v});`,
          cs: `var ${name} = H.FindNode(${r}, ${v});`,
          cpp: `auto ${name} = findNode(${r}, ${v});`,
          rs: `let ${name} = find_node(&${r}, ${v});`,
        }[lang],
      );
      return;
    }
    if (lang === 'py') out.push(`${name} = ${dynBuild(lang, p.type, `json.loads(${q(JSON.stringify(v))})`)}`);
    else if (lang === 'js') out.push(`let ${name} = ${dynBuild(lang, p.type, JSON.stringify(v))};`);
    else if (lang === 'java' || lang === 'cs') out.push(`var ${name} = ${lit(lang, p.type, v)};`);
    else if (lang === 'cpp') out.push(`auto ${name} = ${lit(lang, p.type, v)};`);
    else out.push(`let mut ${name} = ${lit(lang, p.type, v)};`);
  });
  const m = methodName(lang, spec.method, spec);
  const passed = spec.params.map((p, i) => (lang === 'rs' && p.mut ? `&mut ${args[i]}` : lang === 'rs' && p.ref ? `&${args[i]}` : args[i])).join(', ');
  const call = {
    py: `Solution().${m}(${passed})`,
    js: `${m}(${passed})`,
    java: `new Solution().${m}(${passed})`,
    cs: `new Solution().${m}(${passed})`,
    cpp: `Solution().${m}(${passed})`,
    rs: `Solution::${m}(${passed})`,
  }[lang];
  const mi = spec.mutates ? spec.params.findIndex((p) => p.name === spec.mutates) : -1;
  if (mi >= 0 || spec.returns === 'void') {
    out.push(lang === 'py' ? call : `${call};`);
    const target = mi >= 0 ? args[mi] : null;
    const type = mi >= 0 ? spec.params[mi].type : 'void';
    out.push(print(lang, target ? show(lang, type, target) : null));
  } else {
    const r = `r${k}`;
    out.push({ py: `${r} = ${call}`, js: `const ${r} = ${call};`, java: `var ${r} = ${call};`, cs: `var ${r} = ${call};`, cpp: `auto ${r} = ${call};`, rs: `let ${r} = ${call};` }[lang]);
    out.push(print(lang, show(lang, spec.returns, r)));
  }
  return out;
}

function print(lang, expr) {
  const e = expr ?? { py: '"null"', js: '"null"', java: '"null"', cs: '"null"', cpp: '"null"', rs: '"null"' }[lang];
  return { py: `print(${e})`, js: `console.log(${e});`, java: `System.out.println(${e});`, cs: `Console.WriteLine(${e});`, cpp: `cout << ${e} << "\\n";`, rs: `println!("{}", ${e});` }[lang];
}

/** A design problem: construct, then call each operation in turn, and print every result as one JSON array. */
function designCase(lang, spec, c, k) {
  const d = spec.design;
  const out = [];
  const o = `o${k}`;
  const acc = `out${k}`;
  out.push({ py: `${acc} = []`, js: `const ${acc} = [];`, java: `var ${acc} = new ArrayList<String>();`, cs: `var ${acc} = new List<string>();`, cpp: `vector<string> ${acc};`, rs: `let mut ${acc}: Vec<String> = vec![];` }[lang]);
  c.ops.forEach((op, i) => {
    const args = c.args[i];
    if (i === 0) {
      const types = d.ctor ?? [];
      const a = args.map((v, j) => argLit(lang, types[j], v)).join(', ');
      out.push({ py: `${o} = ${d.class}(${a})`, js: `const ${o} = new ${d.class}(${a});`, java: `var ${o} = new ${d.class}(${a});`, cs: `var ${o} = new ${d.class}(${a});`, cpp: `${d.class} ${o}${a ? `(${a})` : ''};`, rs: `let mut ${o} = ${d.class}::new(${a});` }[lang]);
      out.push(push(lang, acc, null));
      return;
    }
    const m = d.methods[op];
    if (!m) throw new Error(`${spec.slug}: unknown op ${op}`);
    const a = args.map((v, j) => argLit(lang, m.params[j], v)).join(', ');
    const name = methodName(lang, op, spec);
    const call = lang === 'cpp' ? `${o}.${name}(${a})` : `${o}.${name}(${a})`;
    if (m.returns === 'void') {
      out.push(lang === 'py' ? call : `${call};`);
      out.push(push(lang, acc, null));
    } else out.push(push(lang, acc, show(lang, m.returns, call)));
  });
  out.push(print(lang, { py: `"[" + ",".join(${acc}) + "]"`, js: `"[" + ${acc}.join(",") + "]"`, java: `"[" + String.join(",", ${acc}) + "]"`, cs: `"[" + string.Join(",", ${acc}) + "]"`, cpp: `"[" + join(${acc}) + "]"`, rs: `format!("[{}]", ${acc}.join(","))` }[lang]));
  return out;
}

function argLit(lang, type, v) {
  if (lang === 'py') return dynBuild(lang, type, `json.loads(${q(JSON.stringify(v))})`);
  if (lang === 'js') return dynBuild(lang, type, JSON.stringify(v));
  return lit(lang, type, v);
}

function push(lang, acc, expr) {
  const e = expr ?? { py: '"null"', js: '"null"', java: '"null"', cs: '"null"', cpp: 'string("null")', rs: '"null".to_string()' }[lang];
  return { py: `${acc}.append(${e})`, js: `${acc}.push(${e});`, java: `${acc}.add(${e});`, cs: `${acc}.Add(${e});`, cpp: `${acc}.push_back(${e});`, rs: `${acc}.push(${e});` }[lang];
}

/** Encode, decode, and print what came back — the round trip is the test. */
function roundtripCase(lang, spec, c, k) {
  const r = spec.roundtrip;
  const out = [];
  const a = `a${k}`;
  if (lang === 'py') out.push(`${a} = ${dynBuild(lang, r.type, `json.loads(${q(JSON.stringify(c.in[0]))})`)}`);
  else if (lang === 'js') out.push(`const ${a} = ${dynBuild(lang, r.type, JSON.stringify(c.in[0]))};`);
  else if (lang === 'java' || lang === 'cs') out.push(`var ${a} = ${lit(lang, r.type, c.in[0])};`);
  else if (lang === 'cpp') out.push(`auto ${a} = ${lit(lang, r.type, c.in[0])};`);
  else out.push(`let ${a} = ${lit(lang, r.type, c.in[0])};`);
  const enc = methodName(lang, r.encode, spec);
  const dec = methodName(lang, r.decode, spec);
  const expr = {
    py: `${r.class}().${dec}(${r.class}().${enc}(${a}))`,
    js: `new ${r.class}().${dec}(new ${r.class}().${enc}(${a}))`,
    java: `new ${r.class}().${dec}(new ${r.class}().${enc}(${a}))`,
    cs: `new ${r.class}().${dec}(new ${r.class}().${enc}(${a}))`,
    cpp: `${r.class}().${dec}(${r.class}().${enc}(${a}))`,
    rs: `{ let c = ${r.class}::new(); let e = c.${enc}(${a}); c.${dec}(e) }`,
  }[lang];
  out.push(print(lang, show(lang, r.type, expr)));
  return out;
}

function caseLines(lang, spec, c, k) {
  if (spec.design) return designCase(lang, spec, c, k);
  if (spec.roundtrip) return roundtripCase(lang, spec, c, k);
  return functionCase(lang, spec, c, k);
}

function body(lang, spec) {
  return spec.cases.flatMap((c, k) => caseLines(lang, spec, c, k));
}

/* ------------------------------------------------------------------ *
 * Programs                                                            *
 * ------------------------------------------------------------------ */

function node(spec) {
  return usesType(spec, 'Graph') ? 'graph' : usesType(spec, 'RandomList') ? 'random' : null;
}

function pyProgram(spec, src) {
  const alias = { graph: 'Node = GraphNode', random: 'Node = RandomNode' }[node(spec)] ?? '';
  return [readFileSync(path.join(RUNTIME, 'common.py'), 'utf8'), alias, src, ...body('py', spec)].join('\n');
}
function jsProgram(spec, src) {
  const alias = { graph: 'const Node = GraphNode;', random: 'const Node = RandomNode;' }[node(spec)] ?? '';
  return [readFileSync(path.join(RUNTIME, 'common.js'), 'utf8'), alias, src, ...body('js', spec)].join('\n');
}
function cppProgram(spec, src) {
  const alias = { graph: 'using graph::Node;', random: 'using rnd::Node;' }[node(spec)] ?? '';
  const join = 'static string join(const vector<string>& v) { string s; for (size_t i = 0; i < v.size(); i++) { if (i) s += ","; s += v[i]; } return s; }';
  return [`#include "${path.join(RUNTIME, 'common.hpp')}"`, alias, join, src, 'int main() {', ...body('cpp', spec).map((l) => '  ' + l), '  return 0;', '}'].join('\n');
}
function javaFiles(spec, src) {
  const pkg = ident(spec.slug);
  const imp = ['import java.util.*;', 'import java.util.stream.*;', 'import common.*;', { graph: 'import common.graph.Node;', random: 'import common.random.Node;' }[node(spec)] ?? ''].join('\n');
  return {
    [`${pkg}/Solution.java`]: `package ${pkg};\n${imp}\n${src}`,
    [`${pkg}/Main.java`]: `package ${pkg};\n${imp}\npublic class Main {\n  public static void main(String[] argv) {\n${body('java', spec).map((l) => '    ' + l).join('\n')}\n  }\n}\n`,
  };
}
function csFile(spec, src) {
  const ns = 'P' + ident(spec.slug).slice(1);
  const imp = { graph: 'using Common.Graph;', random: 'using Common.Random;' }[node(spec)] ?? '';
  // A solution's own `using` lines must come first inside the namespace.
  const lines = src.split('\n');
  const usings = lines.filter((l) => /^using [\w.]+;\s*$/.test(l));
  const rest = lines.filter((l) => !/^using [\w.]+;\s*$/.test(l));
  return `namespace ${ns} {\n${imp}\n${usings.join('\n')}\n${rest.join('\n')}\npublic static class Runner {\n  public static void Run() {\n${body('cs', spec).map((l) => '    ' + l).join('\n')}\n  }\n}\n}\n`;
}
function rsFile(spec, src) {
  const imp = { graph: 'use crate::common::graph::Node;', random: 'use crate::common::random::Node;' }[node(spec)] ?? (usesType(spec, 'ListCycle') ? 'use crate::common::rc::ListNode;' : '');
  return `#![allow(dead_code, unused_imports, unused_variables, unused_mut, non_snake_case, clippy::all)]\nuse crate::common::*;\n${imp}\npub struct Solution;\n${src}\npub fn run() {\n${body('rs', spec).map((l) => '    ' + l).join('\n')}\n}\n`;
}

/* ------------------------------------------------------------------ *
 * Comparing                                                           *
 * ------------------------------------------------------------------ */

const canon = (x) => JSON.stringify(x);
function near(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-5 * Math.max(1, Math.abs(b));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => near(x, b[i]));
  return canon(a) === canon(b);
}
const sortBy = (xs) => [...xs].sort((a, b) => (canon(a) < canon(b) ? -1 : canon(a) > canon(b) ? 1 : 0));

function validators(mode, got, want, input) {
  if (mode === 'topo') {
    // Course Schedule II: any order that respects every prerequisite, or [] when none exists.
    const [n, pre] = input;
    if (want.length === 0) return got.length === 0;
    if (got.length !== n || new Set(got).size !== n) return false;
    const at = new Map(got.map((c, i) => [c, i]));
    return pre.every(([a, b]) => at.get(b) < at.get(a));
  }
  if (mode === 'alien') {
    // Alien Dictionary: any ordering of every letter consistent with the sorted words, or "" when none exists.
    const [words] = input;
    if (want === '') return got === '';
    const letters = new Set(words.join(''));
    if (typeof got !== 'string' || got.length !== letters.size || new Set(got).size !== got.length || [...got].some((c) => !letters.has(c))) return false;
    const rank = new Map([...got].map((c, i) => [c, i]));
    for (let i = 0; i + 1 < words.length; i++) {
      const [a, b] = [words[i], words[i + 1]];
      const k = [...a].findIndex((c, j) => c !== b[j]);
      if (k === -1 || k >= b.length) continue;
      if (rank.get(a[k]) > rank.get(b[k])) return false;
    }
    return true;
  }
  return null;
}

export function same(mode = 'exact', got, want, input) {
  const v = validators(mode, got, want, input);
  if (v !== null) return v;
  if (mode === 'sorted') return near(sortBy(got), sortBy(want));
  if (mode === 'unordered') return near(sortBy(got), sortBy(want));
  if (mode === 'unordered-deep') return near(sortBy(got.map((x) => (Array.isArray(x) ? sortBy(x) : x))), sortBy(want.map((x) => (Array.isArray(x) ? sortBy(x) : x))));
  return near(got, want);
}

/* ------------------------------------------------------------------ *
 * Running                                                             *
 * ------------------------------------------------------------------ */

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', timeout: opts.timeout ?? 20000, maxBuffer: 64 << 20, cwd: opts.cwd });
  return { ok: r.status === 0, out: r.stdout ?? '', err: (r.stderr ?? '') + (r.error ? String(r.error) : '') };
}

function runAsync(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(cmd, args, { cwd: opts.cwd });
    let out = '';
    let err = '';
    p.stdout.on('data', (d) => (out += d));
    p.stderr.on('data', (d) => (err += d));
    const t = setTimeout(() => p.kill('SIGKILL'), opts.timeout ?? 60000);
    p.on('close', (code) => {
      clearTimeout(t);
      resolve({ ok: code === 0, out, err });
    });
  });
}

async function pool(items, n, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k]);
      }
    }),
  );
  return out;
}

export function loadSpecs(filter = []) {
  const slugs = readdirSync(SOLUTIONS).filter((d) => existsSync(path.join(SOLUTIONS, d, 'spec.json')));
  return slugs
    .filter((s) => !filter.length || filter.includes(s))
    .map((slug) => ({ slug, ...JSON.parse(readFileSync(path.join(SOLUTIONS, slug, 'spec.json'), 'utf8')) }));
}
const source = (spec, lang) => {
  const f = path.join(SOLUTIONS, spec.slug, FILES[lang]);
  return existsSync(f) ? readFileSync(f, 'utf8') : null;
};

/** Every language's raw output, per problem: { [slug]: { [lang]: { out, err } } }. */
async function execute(specs, langs) {
  const res = Object.fromEntries(specs.map((s) => [s.slug, {}]));
  const dir = (l) => path.join(BUILD, l);
  for (const l of langs) {
    rmSync(dir(l), { recursive: true, force: true });
    mkdirSync(dir(l), { recursive: true });
  }
  const have = (lang) => specs.filter((s) => source(s, lang) !== null);

  const jobs = [];
  if (langs.includes('py'))
    jobs.push(
      pool(have('py'), 8, async (s) => {
        const f = path.join(dir('py'), `${ident(s.slug)}.py`);
        writeFileSync(f, pyProgram(s, source(s, 'py')));
        res[s.slug].py = await runAsync('python3', [f], { timeout: 20000 });
      }),
    );
  if (langs.includes('js'))
    jobs.push(
      pool(have('js'), 8, async (s) => {
        const f = path.join(dir('js'), `${ident(s.slug)}.js`);
        writeFileSync(f, jsProgram(s, source(s, 'js')));
        res[s.slug].js = await runAsync('node', [f], { timeout: 20000 });
      }),
    );
  if (langs.includes('cpp'))
    jobs.push(
      pool(have('cpp'), Math.max(2, os.cpus().length), async (s) => {
        const f = path.join(dir('cpp'), `${ident(s.slug)}.cpp`);
        const exe = f.replace(/\.cpp$/, '');
        writeFileSync(f, cppProgram(s, source(s, 'cpp')));
        const c = await runAsync('g++', ['-std=c++17', '-O1', '-w', '-o', exe, f], { timeout: 120000 });
        res[s.slug].cpp = c.ok ? await runAsync(exe, [], { timeout: 20000 }) : { ok: false, out: '', err: 'compile: ' + c.err };
      }),
    );

  if (langs.includes('java') && have('java').length) {
    const d = dir('java');
    cpSync(path.join(RUNTIME, 'java'), path.join(d, 'src'), { recursive: true });
    const files = [];
    for (const s of have('java'))
      for (const [rel, text] of Object.entries(javaFiles(s, source(s, 'java')))) {
        const f = path.join(d, 'src', rel);
        mkdirSync(path.dirname(f), { recursive: true });
        writeFileSync(f, text);
        files.push(f);
      }
    const all = readdirSync(path.join(d, 'src'), { recursive: true }).filter((f) => f.endsWith('.java')).map((f) => path.join(d, 'src', f));
    const c = run('javac', ['-nowarn', '-d', path.join(d, 'out'), ...all], { timeout: 600000 });
    jobs.push(
      pool(have('java'), 6, async (s) => {
        res[s.slug].java = c.ok ? await runAsync('java', ['-Xss64m', '-cp', path.join(d, 'out'), `${ident(s.slug)}.Main`], { timeout: 30000 }) : { ok: false, out: '', err: 'compile: ' + filterErr(c.err, ident(s.slug)) };
      }),
    );
  }

  if (langs.includes('cs') && have('cs').length) {
    const d = dir('cs');
    writeFileSync(
      path.join(d, 'Tests.csproj'),
      `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>disable</Nullable><NoWarn>CS8632;CS0168;CS0219;CS8981;CS0162</NoWarn><TreatWarningsAsErrors>false</TreatWarningsAsErrors></PropertyGroup></Project>`,
    );
    cpSync(path.join(RUNTIME, 'Common.cs'), path.join(d, 'Common.cs'));
    const cases = [];
    for (const s of have('cs')) {
      writeFileSync(path.join(d, `${ident(s.slug)}.cs`), csFile(s, source(s, 'cs')));
      cases.push(`      case "${s.slug}": P${ident(s.slug).slice(1)}.Runner.Run(); break;`);
    }
    writeFileSync(path.join(d, 'Program.cs'), `public static class Program {\n  public static void Main(string[] a) {\n    System.Globalization.CultureInfo.DefaultThreadCurrentCulture = System.Globalization.CultureInfo.InvariantCulture;\n    switch (a[0]) {\n${cases.join('\n')}\n    }\n  }\n}\n`);
    const c = run('dotnet', ['build', '-c', 'Release', '-o', path.join(d, 'bin'), '--nologo', '-v', 'q'], { cwd: d, timeout: 600000 });
    jobs.push(
      pool(have('cs'), 6, async (s) => {
        res[s.slug].cs = c.ok ? await runAsync(path.join(d, 'bin', 'Tests'), [s.slug], { timeout: 30000 }) : { ok: false, out: '', err: 'compile: ' + filterErr(c.out + c.err, ident(s.slug)) };
      }),
    );
  }

  if (langs.includes('rs') && have('rs').length) {
    const d = dir('rs');
    cpSync(path.join(RUNTIME, 'common.rs'), path.join(d, 'common.rs'));
    const mods = [];
    for (const s of have('rs')) {
      writeFileSync(path.join(d, `${ident(s.slug)}.rs`), rsFile(s, source(s, 'rs')));
      mods.push(ident(s.slug));
    }
    writeFileSync(
      path.join(d, 'main.rs'),
      `#![allow(dead_code, unused_imports)]\nmod common;\n${mods.map((m) => `mod ${m};`).join('\n')}\nfn main() {\n  let a: Vec<String> = std::env::args().collect();\n  match a[1].as_str() {\n${mods.map((m) => `    "${m}" => ${m}::run(),`).join('\n')}\n    _ => {}\n  }\n}\n`,
    );
    const c = run('rustc', ['--edition', '2021', '-O', '-A', 'warnings', '-o', path.join(d, 'tests'), path.join(d, 'main.rs')], { timeout: 900000 });
    jobs.push(
      pool(have('rs'), 6, async (s) => {
        res[s.slug].rs = c.ok ? await runAsync(path.join(d, 'tests'), [ident(s.slug)], { timeout: 30000 }) : { ok: false, out: '', err: 'compile: ' + filterErr(c.err, ident(s.slug)) };
      }),
    );
  }
  await Promise.all(jobs);
  return res;
}

function filterErr(err, id) {
  const mine = err.split('\n').filter((l) => l.includes(id));
  return (mine.length ? mine : err.split('\n')).slice(0, 12).join('\n');
}

export function check(spec, raw) {
  if (!raw) return { ok: false, why: 'missing' };
  const lines = raw.out.trim().split('\n').filter(Boolean);
  if (lines.length !== spec.cases.length) return { ok: false, why: `expected ${spec.cases.length} answers, got ${lines.length}\n${raw.err.slice(0, 1500)}` };
  for (let i = 0; i < spec.cases.length; i++) {
    const c = spec.cases[i];
    let got;
    try {
      got = JSON.parse(lines[i]);
    } catch {
      return { ok: false, why: `case ${i}: unparseable output ${lines[i].slice(0, 200)}` };
    }
    const mode = c.compare ?? spec.compare;
    const ok = spec.design ? got.length === c.out.length && got.every((g, j) => same(mode, g, c.out[j], c.args[j])) : same(mode, got, c.out, c.in);
    if (!ok) return { ok: false, why: `case ${i}: got ${lines[i].slice(0, 300)}, want ${JSON.stringify(c.out).slice(0, 300)}` };
  }
  return { ok: true };
}

async function main() {
  const argv = process.argv.slice(2);
  const langArg = argv.find((a) => a.startsWith('--lang='));
  const langs = langArg ? langArg.slice(7).split(',') : LANGS;
  const filter = argv.filter((a) => !a.startsWith('--'));
  const specs = loadSpecs(filter);
  const t0 = Date.now();
  const res = await execute(specs, langs);
  let fails = 0;
  let total = 0;
  for (const s of specs) {
    const row = [];
    for (const l of langs) {
      if (source(s, l) === null) {
        row.push(`${l}:—`);
        fails++;
        continue;
      }
      total++;
      const c = check(s, res[s.slug][l]);
      row.push(`${l}:${c.ok ? 'ok' : 'FAIL'}`);
      if (!c.ok) {
        fails++;
        console.log(`✗ ${s.slug} [${l}] ${c.why}`);
      }
    }
    if (argv.includes('--verbose')) console.log(`${s.slug.padEnd(60)} ${row.join(' ')}`);
  }
  console.log(`\n${specs.length} problems × ${langs.length} languages — ${specs.length * langs.length - fails} passing, ${fails} failing or missing (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  process.exit(fails ? 1 : 0);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
