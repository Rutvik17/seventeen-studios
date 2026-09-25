import { Rec, arr, tree, queue, stack, vars, results, marks, range, buildTree, treeNodes, treeLevel, type BT, type Tracer, type Role, type Ptr } from '../trace';

/** A tree panel with a role and a badge per node id. */
function T(root: BT | null, o: { label?: string; roles?: Record<string, Role>; badges?: Record<string, string>; ptrs?: Ptr[] } = {}) {
  return tree(treeNodes(root, o.roles ?? {}, o.badges ?? {}), root?.id ?? null, { label: o.label ?? 'the tree', ptrs: o.ptrs });
}
/** Every node of a tree, in preorder. */
function all(root: BT | null): BT[] {
  return root ? [root, ...all(root.left), ...all(root.right)] : [];
}
const ids = (nodes: BT[]) => nodes.map((n) => n.id);
const fill = (idList: Iterable<string>, role: Role, into: Record<string, Role> = {}) => {
  for (const id of idList) into[id] = role;
  return into;
};

export const traces: Record<string, Tracer> = {
  'invert-binary-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const done = new Set<string>();
    if (!root) {
      R.add('The tree is empty. An empty tree is its own mirror.', vars({ root: 'null' }));
      return R.done([]);
    }
    R.add('Mirror the tree: at every node, swap the left and right children, then mirror each child the same way.', T(root));
    const go = (n: BT | null) => {
      if (!n) return;
      const had = [n.left?.val ?? 'nothing', n.right?.val ?? 'nothing'];
      [n.left, n.right] = [n.right, n.left];
      R.add(!n.left && !n.right ? `${n.val} is a leaf: swapping two empty children changes nothing.` : `At ${n.val}: swap its children — ${had[0]} moves right, ${had[1]} moves left. Everything below them travels with them.`, T(root, { roles: fill(done, 'done', { [n.id]: 'active' }) }));
      go(n.left);
      go(n.right);
      done.add(n.id);
    };
    go(root);
    R.add('Every node has been swapped: the tree is its own mirror image.', T(root, { roles: fill(ids(all(root)), 'found') }));
    return R.done(treeLevel(root));
  },

  'maximum-depth-of-binary-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const depth: Record<string, string> = {};
    const roles: Record<string, Role> = {};
    if (!root) {
      R.add('An empty tree has depth 0.', vars({ answer: [0, 'found'] }));
      return R.done(0);
    }
    R.add('Each node’s depth is 1 plus the deeper of its two subtrees; an empty subtree counts 0. The numbers come back up from the leaves.', T(root));
    const go = (n: BT | null): number => {
      if (!n) return 0;
      roles[n.id] = 'path';
      const l = go(n.left);
      const r = go(n.right);
      const d = 1 + Math.max(l, r);
      depth[n.id] = String(d);
      roles[n.id] = 'done';
      R.add(`${n.val}: left ${l}, right ${r}, so its depth is 1 + ${Math.max(l, r)} = ${d}.`, T(root, { roles: { ...roles, [n.id]: 'active' }, badges: depth }));
      return d;
    };
    const d = go(root);
    R.add(`The root reports ${d}: the tree is ${d} deep.`, T(root, { roles: { [root.id]: 'found' }, badges: depth }), vars({ answer: [d, 'found'] }));
    return R.done(d);
  },

  'diameter-of-binary-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const h: Record<string, string> = {};
    const roles: Record<string, Role> = {};
    let best = 0;
    let bestAt = '';
    R.add('Every path bends at one highest node. The longest path bending at a node is its left height plus its right height. Heights (badges) come back up from the leaves.', T(root), vars({ best }));
    const go = (n: BT | null): number => {
      if (!n) return 0;
      const l = go(n.left);
      const r = go(n.right);
      const better = l + r > best;
      if (better) {
        best = l + r;
        bestAt = n.id;
      }
      h[n.id] = String(1 + Math.max(l, r));
      roles[n.id] = 'done';
      R.add(`${n.val}: heights ${l} and ${r}, so a path bending here has ${l} + ${r} = ${l + r} edge${l + r === 1 ? '' : 's'}${better ? ' — the longest yet' : ''}. Its own height is ${h[n.id]}.`, T(root, { roles: { ...roles, [n.id]: better ? 'found' : 'active' }, badges: h }), vars({ best: [best, better ? 'found' : 'done'] }));
      return 1 + Math.max(l, r);
    };
    go(root);
    R.add(`The longest path has ${best} edge${best === 1 ? '' : 's'}.`, T(root, { roles: bestAt ? { [bestAt]: 'found' } : {}, badges: h }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },

  'balanced-binary-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const h: Record<string, string> = {};
    const roles: Record<string, Role> = {};
    if (!root) {
      R.add('An empty tree is balanced.', vars({ answer: [true, 'found'] }));
      return R.done(true);
    }
    R.add('Compute each height once, from the leaves up. A node whose children differ by more than 1 — or with an unbalanced child — reports −1, and that reaches the root.', T(root));
    const go = (n: BT | null): number => {
      if (!n) return 0;
      const l = go(n.left);
      const r = go(n.right);
      if (l < 0 || r < 0 || Math.abs(l - r) > 1) {
        h[n.id] = '✗';
        roles[n.id] = 'bad';
        R.add(l < 0 || r < 0 ? `${n.val}: a subtree below is already unbalanced — pass −1 up.` : `${n.val}: heights ${l} and ${r} differ by ${Math.abs(l - r)}, more than 1. Unbalanced — report −1.`, T(root, { roles, badges: h }));
        return -1;
      }
      h[n.id] = String(1 + Math.max(l, r));
      roles[n.id] = 'done';
      R.add(`${n.val}: heights ${l} and ${r} differ by ${Math.abs(l - r)} — fine. Height ${h[n.id]}.`, T(root, { roles: { ...roles, [n.id]: 'active' }, badges: h }));
      return 1 + Math.max(l, r);
    };
    const ok = go(root) >= 0;
    R.add(ok ? 'The root got a real height: every node is balanced.' : 'The root got −1: the tree is not balanced.', T(root, { roles: ok ? fill(ids(all(root)), 'found') : roles, badges: h }), vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },

  'same-tree': ([pv, qv]: [(number | null)[], (number | null)[]]) => {
    const R = new Rec();
    const p = buildTree(pv);
    const q = buildTree(qv);
    const rp: Record<string, Role> = {};
    const rq: Record<string, Role> = {};
    const view = (note: string, extra?: ReturnType<typeof vars>) => R.add(note, T(p, { label: 'p', roles: rp }), T(q, { label: 'q', roles: rq }), extra);
    view('Walk both trees together, comparing the nodes in the same places.');
    const go = (a: BT | null, b: BT | null): boolean => {
      if (!a || !b) {
        const same = a === b;
        if (!same) {
          if (a) rp[a.id] = 'bad';
          if (b) rq[b.id] = 'bad';
          view(`${a ? `p has ${a.val}` : 'p has nothing'} where ${b ? `q has ${b.val}` : 'q has nothing'}: different shapes.`);
        }
        return same;
      }
      if (a.val !== b.val) {
        rp[a.id] = 'bad';
        rq[b.id] = 'bad';
        view(`${a.val} against ${b.val}: different values.`);
        return false;
      }
      rp[a.id] = 'found';
      rq[b.id] = 'found';
      view(`${a.val} and ${b.val} match. Now compare their left subtrees, then their right.`);
      return go(a.left, b.left) && go(a.right, b.right);
    };
    const ok = go(p, q);
    view(ok ? (p ? 'Every pair matched: the trees are the same.' : 'Both trees are empty: the same.') : 'One mismatch is enough: not the same tree.', vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },

  'subtree-of-another-tree': ([rv, sv]: [(number | null)[], (number | null)[]]) => {
    const R = new Rec(420);
    const root = buildTree(rv);
    const sub = buildTree(sv);
    const write = (n: BT | null, out: string[]) => {
      if (!n) return out.push('#');
      out.push('^', ...String(n.val));
      write(n.left, out);
      write(n.right, out);
    };
    const text: string[] = [];
    const pat: string[] = [];
    write(root, text);
    write(sub, pat);
    R.add('Write each tree in preorder: “^” before each value, “#” for each missing child. A subtree is exactly a run of its tree’s text.', T(root, { label: 'root' }), T(sub, { label: 'subRoot' }), arr(text, { label: 'root as text' }), arr(pat, { label: 'subRoot as text' }));
    const fail = new Array(pat.length).fill(0);
    for (let i = 1, k = 0; i < pat.length; i++) {
      while (k && pat[i] !== pat[k]) k = fail[k - 1];
      if (pat[i] === pat[k]) k++;
      fail[i] = k;
    }
    R.add('Knuth–Morris–Pratt: for each position of the pattern, how many of the characters just matched could also start a new match. On a mismatch, the search falls back that far instead of starting over.', arr(pat, { label: 'pattern' }), arr(fail, { label: 'fall back to', index: true }));
    let k = 0;
    for (let i = 0; i < text.length; i++) {
      const before = k;
      while (k && text[i] !== pat[k]) k = fail[k - 1];
      const matched = text[i] === pat[k];
      if (matched) k++;
      const hit = k === pat.length;
      const note = matched ? `“${text[i]}” matches: ${k} of ${pat.length} characters in a row.` : `“${text[i]}” does not continue the match${before ? `; fall back from ${before} to ${k}` : ''}.`;
      R.add(
        hit ? `${note} The whole pattern matched: subRoot is a subtree.` : note,
        arr(text, { label: 'root as text', marks: marks([range(i - k + 1, i), hit ? 'found' : 'window'], [k ? null : i, 'bad']), ptrs: [{ at: i, label: 'i' }] }),
        arr(pat, { label: 'subRoot as text', marks: marks([range(0, k - 1), hit ? 'found' : 'window']), ptrs: [{ at: Math.min(k, pat.length - 1), label: 'k', role: 'compare' }] }),
      );
      if (hit) return R.done(true);
    }
    R.add('The text ran out without a full match: subRoot is not a subtree.', vars({ answer: [false, 'bad'] }));
    return R.done(false);
  },

  'lowest-common-ancestor-of-a-binary-search-tree': ([vals, pv, qv]: [(number | null)[], number, number]) => {
    const R = new Rec();
    const root = buildTree(vals)!;
    const nodes = all(root);
    const pid = nodes.find((n) => n.val === pv)!.id;
    const qid = nodes.find((n) => n.val === qv)!.id;
    const walked: string[] = [];
    const view = (note: string, at: BT | null, role: Role = 'active') => R.add(note, T(root, { roles: { ...fill(walked, 'path'), [pid]: 'compare', [qid]: 'compare', ...(at ? { [at.id]: role } : {}) } }), vars({ p: pv, q: qv }));
    view(`Find the deepest node with both ${pv} and ${qv} below it. Smaller values live on the left, larger on the right.`, null);
    let n: BT | null = root;
    while (n) {
      if (pv < n.val && qv < n.val) {
        view(`${pv} and ${qv} are both smaller than ${n.val}: both are in its left subtree. Go left.`, n);
        walked.push(n.id);
        n = n.left;
      } else if (pv > n.val && qv > n.val) {
        view(`${pv} and ${qv} are both larger than ${n.val}: both are in its right subtree. Go right.`, n);
        walked.push(n.id);
        n = n.right;
      } else {
        view(n.val === pv || n.val === qv ? `${n.val} is one of the two, and the other is below it: this is the answer.` : `${Math.min(pv, qv)} < ${n.val} < ${Math.max(pv, qv)}: they split here, one each side. ${n.val} is the answer.`, n, 'found');
        return R.done(n.val);
      }
    }
    return R.done(null);
  },

  'binary-tree-level-order-traversal': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const out: number[][] = [];
    const seen: string[] = [];
    let q: BT[] = root ? [root] : [];
    const view = (note: string, level: BT[] = []) =>
      R.add(note, T(root, { roles: { ...fill(seen, 'done'), ...fill(ids(q), 'window'), ...fill(ids(level), 'active') } }), queue(q.map((n) => n.val), { label: 'queue — front on the left' }), results('levels', out.map((l) => `[${l.join(', ')}]`)));
    if (!root) {
      view('The tree is empty: there are no levels.');
      return R.done([]);
    }
    view('Start with the root in the queue.');
    while (q.length) {
      const level = q;
      view(`The queue holds ${level.length} node${level.length === 1 ? '' : 's'}: exactly this level. Take them all.`, level);
      const next: BT[] = [];
      for (const n of level) {
        if (n.left) next.push(n.left);
        if (n.right) next.push(n.right);
      }
      out.push(level.map((n) => n.val));
      seen.push(...ids(level));
      q = next;
      view(`Record [${level.map((n) => n.val).join(', ')}]. Their children, left to right, join the back of the queue.`);
    }
    view('The queue is empty: every level is recorded.');
    return R.done(out);
  },

  'binary-tree-right-side-view': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const out: number[] = [];
    const seen: string[] = [];
    const shown: string[] = [];
    let level: BT[] = root ? [root] : [];
    const view = (note: string, hot: BT[] = []) => R.add(note, T(root, { roles: { ...fill(seen, 'done'), ...fill(ids(level), 'window'), ...fill(ids(hot), 'active'), ...fill(shown, 'found') } }), results('seen from the right', out.map(String)));
    if (!root) {
      view('An empty tree: nothing to see.');
      return R.done([]);
    }
    while (level.length) {
      const last = level[level.length - 1];
      out.push(last.val);
      shown.push(last.id);
      view(`This level, left to right: ${level.map((n) => n.val).join(', ')}. From the right only the last, ${last.val}, is visible.`, level);
      seen.push(...ids(level));
      const next: BT[] = [];
      for (const n of level) {
        if (n.left) next.push(n.left);
        if (n.right) next.push(n.right);
      }
      level = next;
    }
    view(`Top to bottom: ${out.join(', ')}.`);
    return R.done(out);
  },

  'count-good-nodes-in-binary-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals)!;
    const roles: Record<string, Role> = {};
    let count = 0;
    R.add('Walk down carrying best, the largest value on the path so far (the badge). A node is good if it is at least best.', T(root), vars({ good: count }));
    const go = (n: BT | null, best: number) => {
      if (!n) return;
      const good = n.val >= best;
      if (good) count++;
      roles[n.id] = good ? 'found' : 'bad';
      R.add(good ? `${n.val} ≥ ${best}, the largest above it: good.` : `${n.val} < ${best}: a larger value lies above it. Not good.`, T(root, { roles: { ...roles, [n.id]: good ? 'found' : 'bad' }, badges: { [n.id]: `max ${best}` } }), vars({ good: [count, good ? 'found' : 'done'] }));
      const nb = Math.max(best, n.val);
      go(n.left, nb);
      go(n.right, nb);
    };
    go(root, root.val);
    R.add(`${count} good node${count === 1 ? '' : 's'}.`, T(root, { roles }), vars({ answer: [count, 'found'] }));
    return R.done(count);
  },

  'validate-binary-search-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals)!;
    const roles: Record<string, Role> = {};
    const s = (x: number) => (x === -Infinity ? '−∞' : x === Infinity ? '+∞' : String(x));
    R.add('Each node must lie strictly inside the range its ancestors allow. The root may be anything.', T(root));
    const go = (n: BT | null, lo: number, hi: number): boolean => {
      if (!n) return true;
      const ok = lo < n.val && n.val < hi;
      roles[n.id] = ok ? 'found' : 'bad';
      R.add(ok ? `${s(lo)} < ${n.val} < ${s(hi)}: inside its range. Its left side must now stay below ${n.val}, its right side above.` : `${n.val} must be between ${s(lo)} and ${s(hi)} — it is not. Not a valid search tree.`, T(root, { roles, badges: { [n.id]: `${s(lo)}..${s(hi)}` } }), vars({ lo: s(lo), value: [n.val, ok ? 'found' : 'bad'], hi: s(hi) }));
      if (!ok) return false;
      return go(n.left, lo, n.val) && go(n.right, n.val, hi);
    };
    const ok = go(root, -Infinity, Infinity);
    if (ok) R.add('Every node was inside its range: a valid binary search tree.', T(root, { roles }), vars({ answer: [true, 'found'] }));
    return R.done(ok);
  },

  'kth-smallest-element-in-a-bst': ([vals, k0]: [(number | null)[], number]) => {
    const R = new Rec();
    const root = buildTree(vals)!;
    const st: BT[] = [];
    const counted: string[] = [];
    let node: BT | null = root;
    let k = k0;
    const view = (note: string, hot?: BT, role: Role = 'active') => R.add(note, T(root, { roles: { ...fill(counted, 'done'), ...fill(ids(st), 'path'), ...(hot ? { [hot.id]: role } : {}) } }), stack(st.map((n) => n.val), { label: 'stack — the way back up' }), vars({ counted: counted.length, k: k0 }));
    view(`In order (left, node, right), a search tree’s values come out smallest first. Count to ${k0}.`);
    for (;;) {
      while (node) {
        st.push(node);
        view(`Push ${node.val} and keep going left.`, node);
        node = node.left;
      }
      const n = st.pop()!;
      counted.push(n.id);
      k--;
      if (k === 0) {
        view(`Pop ${n.val}: number ${k0} in order. That is the answer.`, n, 'found');
        return R.done(n.val);
      }
      view(`Nothing further left: pop ${n.val}, the next smallest — number ${counted.length}. Then try its right subtree.`, n);
      node = n.right;
    }
  },

  'construct-binary-tree-from-preorder-and-inorder-traversal': ([pre, ino]: [number[], number[]]) => {
    const R = new Rec();
    const where = new Map(ino.map((v, i) => [v, i]));
    let next = 0;
    let root: BT | null = null;
    let seq = 0;
    const made: string[] = [];
    const view = (note: string, lo: number, hi: number, m: number | null, hot?: string) =>
      R.add(
        note,
        arr(pre, { label: 'preorder', faded: range(0, next - 1), ptrs: next < pre.length ? [{ at: next, label: 'next' }] : [] }),
        arr(ino, { label: 'inorder', range: hi > lo ? { from: lo, to: hi - 1, role: 'window' } : undefined, marks: marks([m, 'active']) }),
        T(root, { label: 'built so far', roles: { ...fill(made, 'done'), ...(hot ? { [hot]: 'new' } : {}) } }),
      );
    view('The first preorder value is the root. In inorder, the root sits between its left subtree and its right.', 0, ino.length, null);
    const build = (lo: number, hi: number, attach: (n: BT) => void): BT | null => {
      if (lo >= hi) return null;
      const v = pre[next++];
      const m = where.get(v)!;
      const n: BT = { id: `b${seq++}`, val: v, left: null, right: null };
      attach(n);
      view(`Next in preorder: ${v}, the root of inorder[${lo}..${hi - 1}]. It is at position ${m}: ${m - lo} value${m - lo === 1 ? '' : 's'} to its left form its left subtree, ${hi - m - 1} to its right its right subtree.`, lo, hi, m, n.id);
      made.push(n.id);
      build(lo, m, (c) => (n.left = c));
      build(m + 1, hi, (c) => (n.right = c));
      return n;
    };
    build(0, ino.length, (n) => (root = n));
    R.add('Every value is placed: this is the tree both lists were read from.', arr(pre, { label: 'preorder', faded: range(0, pre.length - 1) }), arr(ino, { label: 'inorder' }), T(root, { label: 'the tree', roles: fill(ids(all(root)), 'found') }));
    return R.done(treeLevel(root));
  },

  'binary-tree-maximum-path-sum': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals)!;
    const gains: Record<string, string> = {};
    const roles: Record<string, Role> = {};
    let best = root.val;
    let bestAt = root.id;
    R.add('Each node’s gain (badge) is the best sum going straight down from it; a negative branch counts as 0 — better to stop. The best path bending at a node is value + left gain + right gain.', T(root), vars({ best }));
    const go = (n: BT | null): number => {
      if (!n) return 0;
      const lg = go(n.left);
      const rg = go(n.right);
      const l = Math.max(lg, 0);
      const r = Math.max(rg, 0);
      const through = n.val + l + r;
      const better = through > best;
      if (better) {
        best = through;
        bestAt = n.id;
      }
      const g = n.val + Math.max(l, r);
      gains[n.id] = String(g);
      roles[n.id] = 'done';
      R.add(`${n.val}: left gain ${lg < 0 ? `${lg} → 0` : l}, right gain ${rg < 0 ? `${rg} → 0` : r}. Bending here: ${n.val} + ${l} + ${r} = ${through}${better ? ' — the best yet' : ''}. Gain passed up: ${n.val} + ${Math.max(l, r)} = ${g}.`, T(root, { roles: { ...roles, [n.id]: better ? 'found' : 'active' }, badges: gains }), vars({ best: [best, better ? 'found' : 'done'] }));
      return g;
    };
    go(root);
    R.add(`The best path sums to ${best}, bending at ${all(root).find((n) => n.id === bestAt)!.val}.`, T(root, { roles: { [bestAt]: 'found' }, badges: gains }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },

  'serialize-and-deserialize-binary-tree': ([vals]: [(number | null)[]]) => {
    const R = new Rec();
    const root = buildTree(vals);
    const tokens: string[] = [];
    const written: string[] = [];
    R.add('Serialize: preorder — a node, then its whole left subtree, then its right — with # for every missing child.', T(root));
    const walk = (n: BT | null) => {
      if (!n) {
        tokens.push('#');
        return;
      }
      tokens.push(String(n.val));
      written.push(n.id);
      R.add(`Write ${n.val}.`, T(root, { roles: { ...fill(written, 'done'), [n.id]: 'active' } }), arr(tokens, { label: 'the string, token by token', marks: marks([tokens.length - 1, 'new']) }));
      walk(n.left);
      walk(n.right);
    };
    walk(root);
    R.add(`The string: “${tokens.join(',')}”. Now read it back.`, arr(tokens, { label: 'the string' }));
    let i = 0;
    let rebuilt: BT | null = null;
    let seq = 0;
    const build = (attach: (n: BT) => void, where: string): BT | null => {
      const t = tokens[i++];
      if (t === '#') {
        R.add(`“#”: ${where} is empty.`, arr(tokens, { label: 'the string', faded: range(0, i - 2), marks: marks([i - 1, 'done']) }), T(rebuilt, { label: 'rebuilt' }));
        return null;
      }
      const n: BT = { id: `d${seq++}`, val: Number(t), left: null, right: null };
      attach(n);
      R.add(`“${t}”: a node for ${where}. The tokens after it build its left subtree, then its right.`, arr(tokens, { label: 'the string', faded: range(0, i - 2), marks: marks([i - 1, 'active']) }), T(rebuilt, { label: 'rebuilt', roles: { [n.id]: 'new' } }));
      build((c) => (n.left = c), `${n.val}’s left`);
      build((c) => (n.right = c), `${n.val}’s right`);
      return n;
    };
    build((n) => (rebuilt = n), 'the root');
    R.add(rebuilt ? 'Every token used: the rebuilt tree is the original.' : 'The one token was “#”: the empty tree, as it began.', T(rebuilt, { label: 'rebuilt', roles: fill(ids(all(rebuilt)), 'found') }));
    return R.done(treeLevel(rebuilt));
  },
};
