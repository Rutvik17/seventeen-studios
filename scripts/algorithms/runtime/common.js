// Runtime for testing the JavaScript solutions.
class ListNode { constructor(val = 0, next = null) { this.val = val; this.next = next; } }
class TreeNode { constructor(val = 0, left = null, right = null) { this.val = val; this.left = left; this.right = right; } }
class RandomNode { constructor(val, next = null, random = null) { this.val = val; this.next = next; this.random = random; } }
class GraphNode { constructor(val = 0, neighbors = []) { this.val = val; this.neighbors = neighbors; } }
const mkList = (vals) => { const d = new ListNode(); let c = d; for (const v of vals) { c.next = new ListNode(v); c = c.next; } return d.next; };
const mkCycle = ([vals, pos]) => { const ns = vals.map((v) => new ListNode(v)); ns.forEach((n, i) => (n.next = ns[i + 1] ?? null)); if (pos >= 0 && ns.length) ns[ns.length - 1].next = ns[pos]; return ns[0] ?? null; };
const mkTree = (vals) => {
  if (!vals.length || vals[0] === null) return null;
  const root = new TreeNode(vals[0]); const q = [root]; let i = 1, h = 0;
  while (h < q.length && i < vals.length) {
    const n = q[h++];
    if (i < vals.length && vals[i] !== null) { n.left = new TreeNode(vals[i]); q.push(n.left); } i++;
    if (i < vals.length && vals[i] !== null) { n.right = new TreeNode(vals[i]); q.push(n.right); } i++;
  }
  return root;
};
const findNode = (root, val) => { const st = [root]; while (st.length) { const n = st.pop(); if (!n) continue; if (n.val === val) return n; st.push(n.left, n.right); } return null; };
const mkRandom = (pairs) => { const ns = pairs.map(([v]) => new RandomNode(v)); ns.forEach((n, i) => { n.next = ns[i + 1] ?? null; n.random = pairs[i][1] === null ? null : ns[pairs[i][1]]; }); return ns[0] ?? null; };
const mkGraph = (adj) => { if (!adj.length) return null; const ns = adj.map((_, i) => new GraphNode(i + 1)); adj.forEach((a, i) => (ns[i].neighbors = a.map((j) => ns[j - 1]))); return ns[0]; };
const conv = (x) => {
  if (x instanceof ListNode) { const o = []; let n = x, k = 0; while (n && k++ < 10000) { o.push(n.val); n = n.next; } return o; }
  if (x instanceof TreeNode) { const o = []; const q = [x]; let h = 0; while (h < q.length) { const n = q[h++]; if (!n) o.push(null); else { o.push(n.val); q.push(n.left, n.right); } } while (o.length && o[o.length - 1] === null) o.pop(); return o; }
  if (x instanceof RandomNode) { const ns = []; for (let n = x; n; n = n.next) ns.push(n); return ns.map((n) => [n.val, n.random ? ns.indexOf(n.random) : null]); }
  if (x instanceof GraphNode) { const by = new Map(); const st = [x]; while (st.length) { const n = st.pop(); if (by.has(n.val)) continue; by.set(n.val, n); st.push(...n.neighbors); } return [...Array(by.size)].map((_, i) => by.get(i + 1).neighbors.map((m) => m.val)); }
  if (Array.isArray(x)) return x.map(conv);
  if (x === undefined) return null;
  return x;
};
const toJson = (x) => JSON.stringify(conv(x));
const toJsonNode = (x) => toJson(x ?? []); // an empty list, tree or graph is written []
