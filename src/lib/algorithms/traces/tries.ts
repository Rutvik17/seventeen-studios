import { Rec, arr, grid, graph, vars, results, marks, range, type Tracer, type Role, type GNode, type GEdge } from '../trace';

/** A trie node, named so the drawing can follow it. */
interface TN {
  id: string;
  ch: string;
  kids: Map<string, TN>;
  end: boolean;
  word?: string | null;
}
class Trie {
  seq = 0;
  root: TN = { id: 'r', ch: '·', kids: new Map(), end: false };
  /** Inserts a word; returns the ids along its path, root first. */
  insert(word: string): string[] {
    let n = this.root;
    const path = [n.id];
    for (const c of word) {
      if (!n.kids.has(c)) n.kids.set(c, { id: `n${this.seq++}`, ch: c, kids: new Map(), end: false });
      n = n.kids.get(c)!;
      path.push(n.id);
    }
    n.end = true;
    n.word = word;
    return path;
  }
}

/**
 * The trie as a graph laid out like a tree: each leaf gets its own column,
 * each parent sits over its children, depth runs down the page. A tick marks
 * a node where a word ends.
 */
function draw(t: Trie, o: { label?: string; roles?: Record<string, Role>; path?: string[] } = {}) {
  const at = new Map<string, { x: number; d: number }>();
  let leaves = 0;
  let deepest = 0;
  const place = (n: TN, d: number): number => {
    deepest = Math.max(deepest, d);
    const kids = [...n.kids.values()].sort((a, b) => a.ch.localeCompare(b.ch));
    const x = kids.length ? kids.map((k) => place(k, d + 1)).reduce((a, b, _, all) => a + b / all.length, 0) : leaves++;
    at.set(n.id, { x, d });
    return x;
  };
  place(t.root, 0);
  const nodes: GNode[] = [];
  const edges: GEdge[] = [];
  const onPath = new Set(o.path ?? []);
  const walk = (n: TN) => {
    const p = at.get(n.id)!;
    nodes.push({ id: n.id, label: n.ch, x: leaves > 1 ? p.x / (leaves - 1) : 0.5, y: deepest ? p.d / deepest : 0.5, role: o.roles?.[n.id] ?? (onPath.has(n.id) ? 'path' : undefined), badge: n.end ? '✓' : undefined });
    for (const k of n.kids.values()) {
      edges.push({ a: n.id, b: k.id, role: onPath.has(n.id) && onPath.has(k.id) ? 'path' : undefined });
      walk(k);
    }
  };
  walk(t.root);
  return graph(nodes, edges, { label: o.label ?? 'the trie — ✓ where a word ends' });
}

type Design = { ops: string[]; args: string[][] };

export const traces: Record<string, Tracer> = {
  'implement-trie-prefix-tree': ({ ops, args }: Design) => {
    const R = new Rec();
    const t = new Trie();
    const out: (boolean | null)[] = [];
    ops.forEach((op, k) => {
      if (op === 'Trie') {
        out.push(null);
        R.add('An empty trie: just the root. Each word will be a path of letters down from it.', draw(t));
        return;
      }
      const w = args[k][0];
      if (op === 'insert') {
        const before = t.seq;
        const path = t.insert(w);
        const made = t.seq - before;
        out.push(null);
        R.add(`insert("${w}"): follow its letters from the root${made ? `, adding ${made} new node${made === 1 ? '' : 's'} where the path runs out` : ' — the path already exists'}, and tick the last node as the end of a word.`, draw(t, { path, roles: { [path[path.length - 1]]: 'found' } }), arr([...w], { label: w }));
        return;
      }
      let n: (typeof t)['root'] | undefined = t.root;
      const path = [n.id];
      let i = 0;
      for (; i < w.length && n; i++) {
        n = n.kids.get(w[i]);
        if (n) path.push(n.id);
      }
      const ok = op === 'search' ? !!n && n.end : !!n;
      out.push(ok);
      const why = !n ? `the path breaks at “${w[i - 1]}” — no stored word goes this way` : op === 'search' ? (n.end ? 'the path exists and its last node is ticked: the word was inserted' : 'the path exists, but its last node is not ticked — it is only the start of a longer word') : 'the path exists, so some word begins this way';
      R.add(`${op}("${w}"): ${why}. Answer: ${ok}.`, draw(t, { path, roles: { [path[path.length - 1]]: ok ? 'found' : 'bad' } }), arr([...w], { label: w, marks: marks([range(0, path.length - 2), ok ? 'found' : 'window'], [!n ? i - 1 : null, 'bad']) }), vars({ returns: [ok, ok ? 'found' : 'bad'] }));
    });
    return R.done(out);
  },

  'design-add-and-search-words-data-structure': ({ ops, args }: Design) => {
    const R = new Rec();
    const t = new Trie();
    const out: (boolean | null)[] = [];
    ops.forEach((op, k) => {
      if (op === 'WordDictionary') {
        out.push(null);
        R.add('An empty trie. Words are stored as paths of letters.', draw(t));
        return;
      }
      const w = args[k][0];
      if (op === 'addWord') {
        const path = t.insert(w);
        out.push(null);
        R.add(`addWord("${w}"): its path, ending in a tick.`, draw(t, { path, roles: { [path[path.length - 1]]: 'found' } }));
        return;
      }
      const tried = new Set<string>();
      const find = (n: TN, i: number, path: string[]): boolean => {
        tried.add(n.id);
        if (i === w.length) {
          R.add(n.end ? `All of "${w}" matched, and this node is ticked: a stored word.` : `All of "${w}" matched, but no word ends here.`, draw(t, { path, roles: { ...Object.fromEntries([...tried].map((id) => [id, 'visited' as Role])), [n.id]: n.end ? 'found' : 'bad' } }), arr([...w], { label: w, marks: marks([range(0, i - 1), 'window']) }));
          return n.end;
        }
        const c = w[i];
        const next = c === '.' ? [...n.kids.values()] : n.kids.has(c) ? [n.kids.get(c)!] : [];
        R.add(
          c === '.' ? `“.” matches any letter: try each of ${next.length ? next.map((x) => x.ch).join(', ') : 'the children — there are none'}.` : next.length ? `“${c}”: follow it.` : `“${c}”: no such branch here — a dead end.`,
          draw(t, { path, roles: { ...Object.fromEntries([...tried].map((id) => [id, 'visited' as Role])), [n.id]: 'active' } }),
          arr([...w], { label: w, marks: marks([range(0, i - 1), 'window'], [i, 'active']) }),
        );
        return next.some((x) => find(x, i + 1, [...path, x.id]));
      }
      const ok = find(t.root, 0, [t.root.id]);
      out.push(ok);
      R.add(`search("${w}") returns ${ok}.`, draw(t), vars({ returns: [ok, ok ? 'found' : 'bad'] }));
    });
    return R.done(out);
  },

  'word-search-ii': ([board, words]: [string[][], string[]]) => {
    const R = new Rec(420);
    const t = new Trie();
    for (const w of words) t.insert(w);
    const rows = board.length;
    const cols = board[0].length;
    const found: string[] = [];
    const cells = board.map((r) => [...r]);
    const view = (note: string, path: [number, number][], ids: string[], hot?: Role) => {
      const m: Record<string, Role> = {};
      path.forEach(([r, c], i) => (m[`${r},${c}`] = i === path.length - 1 ? (hot ?? 'active') : 'path'));
      R.add(note, grid(cells, { label: 'board', marks: m }), draw(t, { path: ids, roles: ids.length ? { [ids[ids.length - 1]]: hot ?? 'active' } : {} }), results('found', found));
    };
    view(`Every word goes into one trie. Then walk the board once: from each cell, follow letters only while they spell a path in the trie.`, [], []);
    const dfs = (r: number, c: number, parent: TN, path: [number, number][], ids: string[]) => {
      const ch = cells[r][c];
      const node = parent.kids.get(ch)!;
      path = [...path, [r, c]];
      ids = [...ids, node.id];
      if (node.word) {
        found.push(node.word);
        view(`“${node.word}” ends here: found. Take it off the node so it is reported once.`, path, ids, 'found');
        node.word = null;
        node.end = false;
      } else view(`${path.map(([a, b]) => cells[a][b]).join('')} — still a path in the trie. Keep going.`, path, ids);
      cells[r][c] = '#';
      for (const [nr, nc] of [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ]) {
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && node.kids.has(cells[nr][nc])) dfs(nr, nc, node, path, ids);
      }
      cells[r][c] = ch;
      if (!node.kids.size && !node.word) {
        parent.kids.delete(ch);
        view(`Nothing is left to find below “${ch}”: cut the branch off, so later walks stop sooner.`, path.slice(0, -1), ids.slice(0, -1));
      }
    };
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (t.root.kids.has(cells[r][c])) dfs(r, c, t.root, [], [t.root.id]);
    view(found.length ? `Done: ${found.join(', ')}.` : 'Done: none of the words can be traced.', [], []);
    return R.done(found);
  },
};
