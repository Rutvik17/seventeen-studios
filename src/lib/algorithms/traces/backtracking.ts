import { Rec, arr, grid, graph, vars, results, marks, range, fmt, type Tracer, type Role, type GNode, type GEdge, type Val } from '../trace';

/**
 * The tree of choices a backtracking search walks, grown as it walks it: each
 * node is one choice, laid out like a family tree (leaves in columns, parents
 * over their children). Nodes keep their names, so the tree is seen to grow.
 */
class Choices {
  kids = new Map<string, string[]>([['c0', []]]);
  label = new Map<string, string>([['c0', '·']]);
  role = new Map<string, Role>();
  badge = new Map<string, string>();
  seq = 1;
  add(parent: string, label: string, role?: Role): string {
    const id = `c${this.seq++}`;
    this.kids.get(parent)!.push(id);
    this.kids.set(id, []);
    this.label.set(id, label);
    if (role) this.role.set(id, role);
    return id;
  }
  draw(path: string[], label = 'the tree of choices') {
    const at = new Map<string, { x: number; d: number }>();
    let leaves = 0;
    let deepest = 0;
    const place = (id: string, d: number): number => {
      deepest = Math.max(deepest, d);
      const ks = this.kids.get(id)!;
      const x = ks.length ? ks.map((k) => place(k, d + 1)).reduce((a, b) => a + b, 0) / ks.length : leaves++;
      at.set(id, { x, d });
      return x;
    };
    place('c0', 0);
    const on = new Set(path);
    const nodes: GNode[] = [];
    const edges: GEdge[] = [];
    for (const [id, p] of at) {
      const last = id === path[path.length - 1];
      nodes.push({ id, label: this.label.get(id)!, x: leaves > 1 ? p.x / (leaves - 1) : 0.5, y: deepest ? p.d / deepest : 0, role: last ? (this.role.get(id) ?? 'active') : (this.role.get(id) ?? (on.has(id) ? 'path' : 'done')), badge: this.badge.get(id) });
      for (const k of this.kids.get(id)!) edges.push({ a: id, b: k, role: on.has(id) && on.has(k) ? 'path' : undefined });
    }
    return graph(nodes, edges, { label });
  }
}

const list = (xs: unknown[]) => fmt(xs);

export const traces: Record<string, Tracer> = {
  subsets: ([nums]: [number[]]) => {
    const R = new Rec();
    const T = new Choices();
    const out: number[][] = [];
    const cur: number[] = [];
    const show = (note: string, path: string[], i: number) => R.add(note, T.draw(path), arr(nums, { label: 'nums', marks: marks([i < nums.length ? i : null, 'active'], [range(0, i - 1), 'done']) }), arr(cur.length ? cur : ['∅'], { label: 'subset so far' }), results('subsets', out.map(list)));
    show(`Each number is either in or out: ${nums.length} yes-or-no choices, 2^${nums.length} = ${2 ** nums.length} subsets. Walk the choices depth-first.`, ['c0'], 0);
    const choose = (i: number, node: string, path: string[]) => {
      if (i === nums.length) {
        out.push([...cur]);
        T.role.set(node, 'found');
        show(`Every number decided: ${list(cur)} is a subset.`, path, i);
        return;
      }
      cur.push(nums[i]);
      const yes = T.add(node, `+${nums[i]}`);
      show(`Take ${nums[i]}.`, [...path, yes], i);
      choose(i + 1, yes, [...path, yes]);
      cur.pop();
      const no = T.add(node, `−${nums[i]}`);
      show(`Undo: take ${nums[i]} back out, and try the branch without it.`, [...path, no], i);
      choose(i + 1, no, [...path, no]);
    };
    choose(0, 'c0', ['c0']);
    show(`All ${out.length} subsets found.`, [], nums.length);
    return R.done(out);
  },

  'combination-sum': ([cands, target]: [number[], number]) => {
    const R = new Rec();
    const c = [...cands].sort((a, b) => a - b);
    const T = new Choices();
    T.badge.set('c0', String(target));
    const out: number[][] = [];
    const cur: number[] = [];
    const show = (note: string, path: string[], left: number) => R.add(note, T.draw(path, 'choices — badge: still needed'), arr(cur.length ? cur : ['∅'], { label: 'combination so far' }), vars({ needed: left }), results('combinations', out.map(list)));
    show(`Sorted: ${list(c)}. Choose numbers in order — each choice may repeat the last one or move on, never go back — until exactly ${target} is reached.`, ['c0'], target);
    const pick = (start: number, left: number, node: string, path: string[]) => {
      if (left === 0) {
        out.push([...cur]);
        T.role.set(node, 'found');
        show(`Nothing left to make: ${list(cur)} adds up to ${target}.`, path, left);
        return;
      }
      for (let i = start; i < c.length; i++) {
        if (c[i] > left) {
          show(`${c[i]} is more than the ${left} still needed — and every later number is bigger. Back up.`, path, left);
          break;
        }
        cur.push(c[i]);
        const id = T.add(node, String(c[i]));
        T.badge.set(id, String(left - c[i]));
        show(`Take ${c[i]}: ${left} − ${c[i]} = ${left - c[i]} still needed.`, [...path, id], left - c[i]);
        pick(i, left - c[i], id, [...path, id]);
        cur.pop();
      }
      if (!T.kids.get(node)!.length && node !== 'c0') T.role.set(node, 'bad');
    };
    pick(0, target, 'c0', ['c0']);
    show(out.length ? `${out.length} combination${out.length === 1 ? '' : 's'}.` : `No combination makes ${target}.`, [], 0);
    return R.done(out);
  },

  permutations: ([nums]: [number[]]) => {
    const R = new Rec();
    const a = [...nums];
    const T = new Choices();
    const out: number[][] = [];
    const show = (note: string, path: string[], k: number, sw?: [number, number]) => R.add(note, T.draw(path, 'choices — what goes in each position'), arr([...a], { label: 'nums, rearranged in place', index: true, marks: marks([range(0, k - 1), 'done'], [sw ? sw : null, 'active']), ptrs: k < a.length ? [{ at: k, label: 'k' }] : [] }), results('permutations', out.map(list)));
    show(`Fill the positions left to right. Before k: settled. From k on: still to place. ${a.length}! = ${range(1, a.length).reduce((x, y) => x * y, 1)} orderings.`, ['c0'], 0);
    const place = (k: number, node: string, path: string[]) => {
      if (k === a.length) {
        out.push([...a]);
        T.role.set(node, 'found');
        show(`Every position filled: ${list(a)}.`, path, k);
        return;
      }
      for (let i = k; i < a.length; i++) {
        [a[k], a[i]] = [a[i], a[k]];
        const id = T.add(node, String(a[k]));
        show(i === k ? `Position ${k}: keep ${a[k]} where it is.` : `Position ${k}: swap ${a[k]} in from position ${i}.`, [...path, id], k, [k, i]);
        place(k + 1, id, [...path, id]);
        [a[k], a[i]] = [a[i], a[k]];
      }
    };
    place(0, 'c0', ['c0']);
    show(`All ${out.length} permutations.`, [], a.length);
    return R.done(out);
  },

  'subsets-ii': ([nums0]: [number[]]) => {
    const R = new Rec();
    const nums = [...nums0].sort((x, y) => x - y);
    const T = new Choices();
    T.label.set('c0', '∅');
    T.role.set('c0', 'found');
    const out: number[][] = [];
    const cur: number[] = [];
    const show = (note: string, path: string[], hot?: number) => R.add(note, T.draw(path, 'each node is a subset — its path spells it'), arr(nums, { label: 'nums, sorted', marks: marks([hot ?? null, 'active']) }), results('subsets', out.map(list)));
    const extend = (start: number, node: string, path: string[]) => {
      out.push([...cur]);
      show(`${cur.length ? list(cur) : 'The empty subset'} — record it. Now try adding each later number.`, path);
      for (let i = start; i < nums.length; i++) {
        if (i > start && nums[i] === nums[i - 1]) {
          const skip = T.add(node, String(nums[i]), 'bad');
          T.badge.set(skip, 'skip');
          show(`Another ${nums[i]} in the same spot would build the same subsets again: skip it.`, [...path, skip], i);
          continue;
        }
        cur.push(nums[i]);
        const id = T.add(node, String(nums[i]), 'found');
        extend(i + 1, id, [...path, id]);
        cur.pop();
      }
    };
    R.add(`Sorted, equal numbers sit together: ${list(nums)}.`, arr(nums, { label: 'nums, sorted' }));
    extend(0, 'c0', ['c0']);
    show(`${out.length} different subsets.`, []);
    return R.done(out);
  },

  'combination-sum-ii': ([cands, target]: [number[], number]) => {
    const R = new Rec();
    const c = [...cands].sort((a, b) => a - b);
    const T = new Choices();
    T.badge.set('c0', String(target));
    const out: number[][] = [];
    const cur: number[] = [];
    const show = (note: string, path: string[], hot?: number) => R.add(note, T.draw(path, 'choices — badge: still needed'), arr(c, { label: 'candidates, sorted', marks: marks([hot ?? null, 'active']) }), arr(cur.length ? cur : ['∅'], { label: 'combination so far' }), results('combinations', out.map(list)));
    show(`Sorted: ${list(c)}. Each number may be used once; equal numbers in the same spot are tried only once.`, ['c0']);
    const pick = (start: number, left: number, node: string, path: string[]) => {
      if (left === 0) {
        out.push([...cur]);
        T.role.set(node, 'found');
        show(`${list(cur)} adds up to ${target}.`, path);
        return;
      }
      for (let i = start; i < c.length; i++) {
        if (i > start && c[i] === c[i - 1]) {
          const skip = T.add(node, String(c[i]), 'bad');
          T.badge.set(skip, 'skip');
          show(`The same value again in the same spot would repeat a combination: skip.`, [...path, skip], i);
          continue;
        }
        if (c[i] > left) {
          show(`${c[i]} is more than the ${left} still needed, and so is everything after it. Back up.`, path, i);
          break;
        }
        cur.push(c[i]);
        const id = T.add(node, String(c[i]));
        T.badge.set(id, String(left - c[i]));
        show(`Take ${c[i]} (position ${i}): ${left - c[i]} still needed.`, [...path, id], i);
        pick(i + 1, left - c[i], id, [...path, id]);
        cur.pop();
      }
    };
    pick(0, target, 'c0', ['c0']);
    show(`${out.length} combination${out.length === 1 ? '' : 's'}.`, []);
    return R.done(out);
  },

  'word-search': ([board0, word]: [string[][], string]) => {
    const R = new Rec();
    const board = board0.map((r) => [...r]);
    const rows = board.length;
    const cols = board[0].length;
    const have = new Map<string, number>();
    for (const row of board) for (const ch of row) have.set(ch, (have.get(ch) ?? 0) + 1);
    const view = (note: string, path: [number, number][], hot?: [number, number], role: Role = 'active', i = path.length) => {
      const m: Record<string, Role> = {};
      for (const [r, c] of path) m[`${r},${c}`] = 'path';
      if (hot) m[`${hot[0]},${hot[1]}`] = role;
      R.add(note, grid(board0, { label: 'board', marks: m }), arr([...word], { label: 'word', marks: marks([range(0, i - 1), 'found'], [i < word.length ? i : null, role === 'bad' ? 'bad' : 'active']) }));
    };
    for (const ch of word) {
      if (!have.get(ch)) {
        view(`The board does not have enough “${ch}” for the word: it cannot be traced.`, []);
        return R.done(false);
      }
      have.set(ch, have.get(ch)! - 1);
    }
    view(`The board has every letter the word needs. Try each cell as the start.`, []);
    const trace = (r: number, c: number, i: number, path: [number, number][]): boolean => {
      if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
      if (board[r][c] !== word[i]) {
        if (board[r][c] !== '#' && i > 0) view(`(${r}, ${c}) holds “${board[r][c]}”, not “${word[i]}”.`, path, [r, c], 'bad', i);
        return false;
      }
      const p: [number, number][] = [...path, [r, c]];
      if (i === word.length - 1) {
        view(`“${word[i]}” at (${r}, ${c}) completes “${word}”.`, p, [r, c], 'found', word.length);
        return true;
      }
      view(`“${word[i]}” at (${r}, ${c}). Mark it in use, and look at its neighbours for “${word[i + 1]}”.`, p, [r, c], 'active', i + 1);
      board[r][c] = '#';
      const found = trace(r + 1, c, i + 1, p) || trace(r - 1, c, i + 1, p) || trace(r, c + 1, i + 1, p) || trace(r, c - 1, i + 1, p);
      board[r][c] = word[i];
      if (!found) view(`No neighbour continues from (${r}, ${c}). Unmark it and back up.`, path, [r, c], 'bad', i);
      return found;
    };
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (trace(r, c, 0, [])) return R.done(true);
      }
    view(`No starting cell works: “${word}” cannot be traced.`, []);
    return R.done(false);
  },

  'palindrome-partitioning': ([s]: [string]) => {
    const R = new Rec();
    const n = s.length;
    const pal = Array.from({ length: n }, () => new Array<boolean>(n).fill(false));
    for (let i = n - 1; i >= 0; i--) for (let j = i; j < n; j++) pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1]);
    const table: Val[][] = pal.map((row, i) => row.map((v, j) => (j < i ? '' : v ? '✓' : '·')));
    R.add('First, a table: row i, column j says whether s[i..j] is a palindrome — its end letters match and its inside is one. Filled from the bottom row up, the inside is always ready.', grid(table, { label: 'is s[i..j] a palindrome?', rows: [...s], cols: [...s], marks: Object.fromEntries(pal.flatMap((row, i) => row.map((v, j) => [`${i},${j}`, v ? 'found' : undefined]).filter(([, v]) => v))) }));
    const T = new Choices();
    const out: string[][] = [];
    const cur: string[] = [];
    const show = (note: string, path: string[], i: number) => R.add(note, T.draw(path, 'choices — each node is one piece'), arr([...s], { label: 's', marks: marks([range(0, i - 1), 'done']) }), results('ways to cut', out.map((x) => x.join(' | '))));
    const cut = (i: number, node: string, path: string[]) => {
      if (i === n) {
        out.push([...cur]);
        T.role.set(node, 'found');
        show(`The whole string is cut into palindromes: ${cur.join(' | ')}.`, path, i);
        return;
      }
      for (let j = i; j < n; j++) {
        if (!pal[i][j]) continue;
        const piece = s.slice(i, j + 1);
        cur.push(piece);
        const id = T.add(node, piece);
        show(`“${piece}” is a palindrome (the table says so): cut it off and cut the rest.`, [...path, id], j + 1);
        cut(j + 1, id, [...path, id]);
        cur.pop();
      }
    };
    cut(0, 'c0', ['c0']);
    show(`${out.length} way${out.length === 1 ? '' : 's'} to cut “${s}”.`, [], n);
    return R.done(out);
  },

  'letter-combinations-of-a-phone-number': ([digits]: [string]) => {
    const R = new Rec();
    const keys: Record<string, string> = { 2: 'abc', 3: 'def', 4: 'ghi', 5: 'jkl', 6: 'mno', 7: 'pqrs', 8: 'tuv', 9: 'wxyz' };
    if (!digits) {
      R.add('No digits: no strings.', vars({ answer: '[]' }));
      return R.done([]);
    }
    const T = new Choices();
    const out: string[] = [];
    const show = (note: string, path: string[], i: number) => R.add(note, T.draw(path, 'choices — one letter per digit'), arr([...digits].map((d) => `${d} ${keys[d]}`), { label: 'digits and their letters', marks: marks([range(0, i - 1), 'done'], [i < digits.length ? i : null, 'active']) }), results('strings', out));
    show(`${[...digits].map((d) => keys[d].length).join(' × ')} = ${[...digits].reduce((p, d) => p * keys[d].length, 1)} strings. Choose a letter per digit, depth-first.`, ['c0'], 0);
    const spell = (i: number, cur: string, node: string, path: string[]) => {
      if (i === digits.length) {
        out.push(cur);
        T.role.set(node, 'found');
        show(`“${cur}”.`, path, i);
        return;
      }
      for (const letter of keys[digits[i]]) {
        const id = T.add(node, letter);
        spell(i + 1, cur + letter, id, [...path, id]);
      }
    };
    spell(0, '', 'c0', ['c0']);
    return R.done(out);
  },

  'n-queens': ([n]: [number]) => {
    const R = new Rec(420);
    const cols = new Set<number>();
    const down = new Set<number>();
    const up = new Set<number>();
    const board: string[][] = Array.from({ length: n }, () => new Array(n).fill('.'));
    const out: string[][] = [];
    const view = (note: string, hot?: [number, number], role: Role = 'active') => {
      const m: Record<string, Role> = {};
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (cols.has(c) || down.has(r - c) || up.has(r + c)) m[`${r},${c}`] = 'window';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (board[r][c] === 'Q') m[`${r},${c}`] = 'found';
      if (hot) m[`${hot[0]},${hot[1]}`] = role;
      R.add(note, grid(board.map((row) => row.map((v) => (v === 'Q' ? '♛' : ''))), { label: 'the board — shaded squares are attacked', marks: m }), vars({ solutions: out.length }));
    };
    view(`One queen per row. Place them top to bottom, each on a square no earlier queen attacks.`);
    const place = (r: number) => {
      if (r === n) {
        out.push(board.map((row) => row.join('')));
        view(`All ${n} queens placed, none attacking another: solution ${out.length}.`);
        return;
      }
      let any = false;
      for (let c = 0; c < n; c++) {
        if (cols.has(c) || down.has(r - c) || up.has(r + c)) continue;
        any = true;
        cols.add(c);
        down.add(r - c);
        up.add(r + c);
        board[r][c] = 'Q';
        view(`Row ${r}: column ${c} is safe. Place a queen; its column and both diagonals are now attacked.`, [r, c], 'found');
        place(r + 1);
        board[r][c] = '.';
        cols.delete(c);
        down.delete(r - c);
        up.delete(r + c);
        view(`Take the queen at (${r}, ${c}) back and try the next column.`, [r, c], 'bad');
      }
      if (!any) view(`Every square in row ${r} is attacked: a dead end. Back up to row ${r - 1}.`, undefined);
    };
    place(0);
    view(out.length ? `${out.length} solution${out.length === 1 ? '' : 's'} for n = ${n}.` : `No arrangement works for n = ${n}.`);
    return R.done(out);
  },
};
