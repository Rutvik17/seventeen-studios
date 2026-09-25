import { Rec, arr, grid, graph, map, queue, vars, results, ring, type Tracer, type Role, type Val, type GNode, type GEdge } from '../trace';

type Cell = [number, number];
const key = ([r, c]: Cell) => `${r},${c}`;
const around = ([r, c]: Cell): Cell[] => [
  [r + 1, c],
  [r - 1, c],
  [r, c + 1],
  [r, c - 1],
];
/** Marks for a grid: a role per cell. */
const paint = (...groups: [Iterable<Cell>, Role][]) => {
  const m: Record<string, Role> = {};
  for (const [cells, role] of groups) for (const c of cells) m[key(c)] = role;
  return m;
};
const INF = 2147483647;

/** Nodes 0..n−1 (or 1..n) round a circle, with the given edges. */
function circle(labels: string[], edges: [string, string, Role?][], roles: Record<string, Role> = {}, o: { directed?: boolean; label?: string; badges?: Record<string, string> } = {}) {
  const pts = ring(labels.length);
  const nodes: GNode[] = labels.map((l, i) => ({ id: l, label: l, x: pts[i].x, y: pts[i].y, role: roles[l], badge: o.badges?.[l] }));
  const es: GEdge[] = edges.map(([a, b, role]) => ({ a, b, role }));
  return graph(nodes, es, { directed: o.directed, label: o.label });
}

/** Union-find, recording its parent pointers for the drawing. */
class DSU {
  parent: number[];
  size: number[];
  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);
    this.size = new Array(n).fill(1);
  }
  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]];
      x = this.parent[x];
    }
    return x;
  }
}

export const traces: Record<string, Tracer> = {
  'number-of-islands': ([g0]: [string[][]]) => {
    const R = new Rec();
    const g = g0.map((r) => [...r]);
    const rows = g.length;
    const cols = g[0].length;
    let islands = 0;
    const sunk: Cell[] = [];
    const view = (note: string, hot: Cell[] = [], st: Cell[] = []) =>
      R.add(note, grid(g.map((r, i) => r.map((v, j) => (g0[i][j] === '1' ? (v === '1' ? '▲' : '~') : ''))), { label: '▲ land still standing, ~ sunk', marks: paint([sunk, 'done'], [st, 'window'], [hot, 'active']) }), vars({ islands }));
    view('Scan the map row by row. The first land of each island is where it is counted; then the whole island is sunk so it cannot be counted again.');
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (g[r][c] !== '1') continue;
        islands++;
        g[r][c] = '0';
        sunk.push([r, c]);
        const st: Cell[] = [[r, c]];
        view(`Land at (${r}, ${c}) that nothing has sunk: island number ${islands}. Sink it and spread.`, [[r, c]], st);
        while (st.length) {
          const p = st.pop()!;
          const grew: Cell[] = [];
          for (const [x, y] of around(p)) {
            if (x >= 0 && x < rows && y >= 0 && y < cols && g[x][y] === '1') {
              g[x][y] = '0';
              sunk.push([x, y]);
              st.push([x, y]);
              grew.push([x, y]);
            }
          }
          if (grew.length) view(`From (${p[0]}, ${p[1]}), sink ${grew.length} land neighbour${grew.length === 1 ? '' : 's'}.`, grew, st);
        }
        view(`Island ${islands} is completely sunk. Keep scanning.`);
      }
    view(`The scan is done: ${islands} island${islands === 1 ? '' : 's'}.`);
    return R.done(islands);
  },

  'clone-graph': ([adj]: [number[][]]) => {
    const R = new Rec();
    if (!adj.length) {
      R.add('There is no graph: the copy is empty too.', vars({ node: 'null' }));
      return R.done([]);
    }
    const labels = adj.map((_, i) => String(i + 1));
    const edges: [string, string][] = [];
    adj.forEach((ns, i) => ns.forEach((j) => i + 1 < j && edges.push([String(i + 1), String(j)])));
    const copies = new Map<number, number[]>();
    const copyEdges = () => {
      const out: [string, string][] = [];
      for (const [v, ns] of copies) for (const j of ns) if (copies.has(j) && v < j) out.push([`${v}′`, `${j}′`]);
      return out;
    };
    const view = (note: string, hot?: number) =>
      R.add(
        note,
        circle(labels, edges, Object.fromEntries([...copies.keys()].map((v) => [String(v), v === hot ? 'active' : 'visited'])) as Record<string, Role>, { label: 'original' }),
        graph(
          [...copies.keys()].map((v) => {
            const p = ring(labels.length)[v - 1];
            return { id: `${v}′`, label: `${v}′`, x: p.x, y: p.y, role: (v === hot ? 'new' : 'found') as Role };
          }),
          copyEdges().map(([a, b]) => ({ a, b })),
          { label: 'the copy' },
        ),
        map([...copies.keys()].map((v) => [v, `${v}′`]), { label: 'original → copy' }),
      );
    view('Copy the graph by walking it. A map from each original to its copy stops a cycle from being copied twice.');
    const clone = (v: number) => {
      if (copies.has(v)) return;
      copies.set(v, []);
      view(`Node ${v} has no copy yet: make ${v}′ and record it in the map before its neighbours — so a path back to ${v} finds it.`, v);
      for (const j of adj[v - 1]) {
        const had = copies.has(j);
        clone(j);
        copies.get(v)!.push(j);
        view(had ? `${v}’s neighbour ${j} already has a copy: join ${v}′ to ${j}′.` : `Join ${v}′ to its neighbour’s new copy, ${j}′.`, v);
      }
    };
    clone(1);
    view(`Every node copied, every edge rebuilt between the copies.`);
    return R.done(adj.map((_, i) => copies.get(i + 1)!));
  },

  'max-area-of-island': ([g0]: [number[][]]) => {
    const R = new Rec();
    const g = g0.map((r) => [...r]);
    const rows = g.length;
    const cols = g[0].length;
    let best = 0;
    const sunk: Cell[] = [];
    let now: Cell[] = [];
    const view = (note: string, hot: Cell[] = [], extra: Record<string, Val | [Val, Role]> = {}) => R.add(note, grid(g0.map((r) => r.map((v) => (v ? '▲' : ''))), { label: 'the map', marks: paint([sunk, 'done'], [now, 'window'], [hot, 'active']) }), vars({ ...extra, best }));
    view('Scan for land. Each island met is sunk cell by cell, counting as it goes.');
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        if (g[r][c] !== 1) continue;
        g[r][c] = 0;
        now = [[r, c]];
        const st: Cell[] = [[r, c]];
        let area = 0;
        while (st.length) {
          const p = st.pop()!;
          area++;
          for (const [x, y] of around(p)) {
            if (x >= 0 && x < rows && y >= 0 && y < cols && g[x][y] === 1) {
              g[x][y] = 0;
              st.push([x, y]);
              now.push([x, y]);
            }
          }
        }
        const better = area > best;
        best = Math.max(best, area);
        view(`An island at (${r}, ${c}): ${area} cell${area === 1 ? '' : 's'}${better ? ' — the largest so far' : ''}.`, [], { area: [area, better ? 'found' : 'done'] });
        sunk.push(...now);
        now = [];
      }
    view(`The largest island has area ${best}.`);
    return R.done(best);
  },

  'pacific-atlantic-water-flow': ([h]: [number[][]]) => {
    const R = new Rec();
    const rows = h.length;
    const cols = h[0].length;
    const pac = new Set<string>();
    const atl = new Set<string>();
    const view = (note: string, hot: Cell[] = []) => {
      const m: Record<string, Role> = {};
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const k = `${r},${c}`;
          if (pac.has(k) && atl.has(k)) m[k] = 'found';
          else if (pac.has(k)) m[k] = 'compare';
          else if (atl.has(k)) m[k] = 'visited';
        }
      for (const c of hot) m[key(c)] = 'active';
      R.add(note, grid(h, { label: 'heights — blue reaches the Pacific, violet the Atlantic, green both', marks: m }), vars({ pacific: pac.size, atlantic: atl.size }));
    };
    const climb = (starts: Cell[], seen: Set<string>, name: string) => {
      const st = starts.filter((c) => !seen.has(key(c)));
      st.forEach((c) => seen.add(key(c)));
      view(`The ${name} touches ${st.length} edge cells. Climb from them: a neighbour as high or higher can drain down here, and so on into the ${name}.`, st);
      while (st.length) {
        const p = st.pop()!;
        const up: Cell[] = [];
        for (const [x, y] of around(p)) {
          if (x >= 0 && x < rows && y >= 0 && y < cols && !seen.has(`${x},${y}`) && h[x][y] >= h[p[0]][p[1]]) {
            seen.add(`${x},${y}`);
            st.push([x, y]);
            up.push([x, y]);
          }
        }
        if (up.length) view(`From height ${h[p[0]][p[1]]} at (${p[0]}, ${p[1]}), climb to ${up.map(([x, y]) => h[x][y]).join(', ')}.`, up);
      }
    };
    const all: Cell[] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) all.push([r, c]);
    climb(all.filter(([r, c]) => r === 0 || c === 0), pac, 'Pacific');
    climb(all.filter(([r, c]) => r === rows - 1 || c === cols - 1), atl, 'Atlantic');
    const both = all.filter((c) => pac.has(key(c)) && atl.has(key(c)));
    view(`${both.length} cell${both.length === 1 ? '' : 's'} can reach both oceans.`);
    return R.done(both);
  },

  'surrounded-regions': ([b0]: [string[][]]) => {
    const R = new Rec();
    const b = b0.map((r) => [...r]);
    const rows = b.length;
    const cols = b[0].length;
    const view = (note: string, hot: Cell[] = []) => {
      const m: Record<string, Role> = {};
      b.forEach((row, r) => row.forEach((v, c) => (m[`${r},${c}`] = v === 'S' ? 'found' : v === 'O' ? 'window' : 'done')));
      for (const c of hot) m[key(c)] = 'active';
      R.add(note, grid(b.map((row) => row.map((v) => (v === 'S' ? 'O' : v))), { label: 'green: joined to the edge, safe', marks: m }));
    };
    view('A region of O survives only if it reaches the edge. Start from every O on the edge and mark its whole region safe.');
    const st: Cell[] = [];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if ((r === 0 || r === rows - 1 || c === 0 || c === cols - 1) && b[r][c] === 'O') {
          b[r][c] = 'S';
          st.push([r, c]);
        }
    view(st.length ? `${st.length} O${st.length === 1 ? '' : 's'} on the edge: safe.` : 'No O touches the edge: every region is surrounded.', [...st]);
    while (st.length) {
      const p = st.pop()!;
      const grew: Cell[] = [];
      for (const [x, y] of around(p))
        if (x >= 0 && x < rows && y >= 0 && y < cols && b[x][y] === 'O') {
          b[x][y] = 'S';
          st.push([x, y]);
          grew.push([x, y]);
        }
      if (grew.length) view(`Joined to (${p[0]}, ${p[1]}), so safe too.`, grew);
    }
    const caught: Cell[] = [];
    b.forEach((row, r) => row.forEach((v, c) => v === 'O' && caught.push([r, c])));
    view(caught.length ? `The ${caught.length} O${caught.length === 1 ? '' : 's'} left unmarked are surrounded: capture them.` : 'Nothing is left unmarked: nothing to capture.', caught);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) b[r][c] = b[r][c] === 'S' ? 'O' : 'X';
    view('Captured regions become X; the safe ones are O again.');
    return R.done(b);
  },

  'rotting-oranges': ([g0]: [number[][]]) => {
    const R = new Rec();
    const g = g0.map((r) => [...r]);
    const rows = g.length;
    const cols = g[0].length;
    let rotten: Cell[] = [];
    let fresh = 0;
    g.forEach((row, r) => row.forEach((v, c) => (v === 2 ? rotten.push([r, c]) : v === 1 && fresh++)));
    let minutes = 0;
    const view = (note: string, hot: Cell[] = []) => {
      const m: Record<string, Role> = {};
      g.forEach((row, r) => row.forEach((v, c) => v && (m[`${r},${c}`] = v === 2 ? 'bad' : 'found')));
      for (const c of hot) m[key(c)] = 'active';
      R.add(note, grid(g.map((row) => row.map((v) => (v === 0 ? '' : v === 1 ? '●' : '✶'))), { label: '● fresh, ✶ rotten', marks: m }), vars({ minute: minutes, fresh }));
    };
    view(`${rotten.length} rotten orange${rotten.length === 1 ? '' : 's'}, ${fresh} fresh. The rot spreads a ring at a time — breadth-first from every rotten orange at once.`, rotten);
    while (rotten.length && fresh) {
      const next: Cell[] = [];
      for (const p of rotten)
        for (const [x, y] of around(p))
          if (x >= 0 && x < rows && y >= 0 && y < cols && g[x][y] === 1) {
            g[x][y] = 2;
            fresh--;
            next.push([x, y]);
          }
      rotten = next;
      minutes++;
      view(`Minute ${minutes}: ${next.length} more rot.`, next);
    }
    const ans = fresh ? -1 : minutes;
    view(fresh ? `The rot has stopped with ${fresh} fresh orange${fresh === 1 ? '' : 's'} unreachable: −1.` : `No fresh orange left after ${minutes} minute${minutes === 1 ? '' : 's'}.`);
    return R.done(ans);
  },

  'walls-and-gates': ([g0]: [number[][]]) => {
    const R = new Rec();
    const g = g0.map((r) => [...r]);
    const rows = g.length;
    const cols = g[0].length;
    let level: Cell[] = [];
    g.forEach((row, r) => row.forEach((v, c) => v === 0 && level.push([r, c])));
    const view = (note: string, hot: Cell[] = []) => {
      const m: Record<string, Role> = {};
      g.forEach((row, r) => row.forEach((v, c) => v !== INF && (m[`${r},${c}`] = v === -1 ? 'done' : v === 0 ? 'found' : 'window')));
      for (const c of hot) m[key(c)] = 'active';
      R.add(note, grid(g.map((row) => row.map((v) => (v === -1 ? '▓' : v === INF ? '∞' : v))), { label: '▓ wall, 0 gate, ∞ not yet reached', marks: m }));
    };
    view(`${level.length} gate${level.length === 1 ? '' : 's'}. Spread from all of them at once, a step at a time: the first time a room is reached, it is from its nearest gate.`, level);
    let d = 0;
    while (level.length) {
      const next: Cell[] = [];
      for (const p of level)
        for (const [x, y] of around(p))
          if (x >= 0 && x < rows && y >= 0 && y < cols && g[x][y] === INF) {
            g[x][y] = g[p[0]][p[1]] + 1;
            next.push([x, y]);
          }
      d++;
      if (next.length) view(`Distance ${d}: ${next.length} room${next.length === 1 ? '' : 's'} reached.`, next);
      level = next;
    }
    view('Nothing more to reach. Any ∞ left has no route to a gate.');
    return R.done(g);
  },

  'course-schedule': ([n, pre]: [number, number[][]]) => {
    const R = new Rec();
    const after: number[][] = Array.from({ length: n }, () => []);
    const need = new Array(n).fill(0);
    for (const [a, b] of pre) {
      after[b].push(a);
      need[a]++;
    }
    const labels = Array.from({ length: n }, (_, i) => String(i));
    const edges = pre.map(([a, b]) => [String(b), String(a)] as [string, string]);
    const taken = new Set<number>();
    const ready: number[] = [];
    for (let c = 0; c < n; c++) if (need[c] === 0) ready.push(c);
    const view = (note: string, hot?: number) =>
      R.add(
        note,
        circle(labels, edges, Object.fromEntries(labels.map((l, i) => [l, i === hot ? 'active' : taken.has(i) ? 'found' : need[i] === 0 ? 'window' : 'bad'])) as Record<string, Role>, { directed: true, label: 'arrow b → a: take b before a; badge: prerequisites still missing', badges: Object.fromEntries(labels.map((l, i) => [l, String(need[i])])) }),
        queue(ready.slice(h), { label: 'ready to take' }),
        vars({ taken: taken.size, of: n }),
      );
    let h = 0;
    view(`Each course’s badge counts the prerequisites it is still waiting for. ${ready.length ? `Course${ready.length === 1 ? '' : 's'} ${ready.join(', ')} wait${ready.length === 1 ? 's' : ''} for none.` : 'Every course waits for something.'}`);
    while (h < ready.length) {
      const c = ready[h++];
      taken.add(c);
      const freed: number[] = [];
      for (const x of after[c]) if (--need[x] === 0) {
        ready.push(x);
        freed.push(x);
      }
      view(`Take course ${c}. ${after[c].length ? `Courses ${after[c].join(', ')} need one prerequisite fewer${freed.length ? `; ${freed.join(', ')} can now be taken` : ''}.` : 'Nothing was waiting on it.'}`, c);
    }
    const ok = taken.size === n;
    view(ok ? 'Every course taken: possible.' : `${n - taken.size} course${n - taken.size === 1 ? ' is' : 's are'} still waiting, each on another in a cycle: impossible.`);
    return R.done(ok);
  },

  'course-schedule-ii': ([n, pre]: [number, number[][]]) => {
    const R = new Rec();
    const after: number[][] = Array.from({ length: n }, () => []);
    const need = new Array(n).fill(0);
    for (const [a, b] of pre) {
      after[b].push(a);
      need[a]++;
    }
    const labels = Array.from({ length: n }, (_, i) => String(i));
    const edges = pre.map(([a, b]) => [String(b), String(a)] as [string, string]);
    const order: number[] = [];
    for (let c = 0; c < n; c++) if (need[c] === 0) order.push(c);
    let h = 0;
    const view = (note: string, hot?: number) =>
      R.add(
        note,
        circle(labels, edges, Object.fromEntries(labels.map((l, i) => [l, i === hot ? 'active' : order.indexOf(i) >= 0 && order.indexOf(i) < h ? 'found' : need[i] === 0 ? 'window' : 'bad'])) as Record<string, Role>, { directed: true, label: 'arrow b → a: b first; badge: prerequisites still missing', badges: Object.fromEntries(labels.map((l, i) => [l, String(need[i])])) }),
        results('order', order.slice(0, h).map(String)),
        queue(order.slice(h), { label: 'ready to take' }),
      );
    view('Take courses as their prerequisites run out, and write them down in that order.');
    while (h < order.length) {
      const c = order[h++];
      const freed: number[] = [];
      for (const x of after[c]) if (--need[x] === 0) {
        order.push(x);
        freed.push(x);
      }
      view(`Take ${c}.${freed.length ? ` ${freed.join(', ')} ${freed.length === 1 ? 'is' : 'are'} now ready.` : ''}`, c);
    }
    const ok = order.length === n;
    view(ok ? `An order: ${order.join(', ')}.` : 'Some courses never became ready — they are on a cycle. No order exists.');
    return R.done(ok ? order : []);
  },

  'redundant-connection': ([edges]: [number[][]]) => {
    const R = new Rec();
    const n = edges.length;
    const d = new DSU(n + 1);
    const labels = Array.from({ length: n }, (_, i) => String(i + 1));
    const added: [string, string, Role?][] = [];
    const view = (note: string, hot?: [number, number], role: Role = 'active') =>
      R.add(note, circle(labels, [...added, ...(hot ? [[String(hot[0]), String(hot[1]), role] as [string, string, Role]] : [])], {}, { label: 'edges added so far' }), arr(d.parent.slice(1), { label: 'parent — each node points toward its group’s representative', index: false, marks: {} }), vars({ edges: added.length }));
    view('Add the edges one by one, tracking which nodes are already connected with union-find.');
    for (const [a, b] of edges) {
      const ra = d.find(a);
      const rb = d.find(b);
      if (ra === rb) {
        view(`${a} and ${b} are already connected (both lead to ${ra}): the edge [${a}, ${b}] closes the cycle. Remove it.`, [a, b], 'bad');
        return R.done([a, b]);
      }
      let [x, y] = [ra, rb];
      if (d.size[x] < d.size[y]) [x, y] = [y, x];
      d.parent[y] = x;
      d.size[x] += d.size[y];
      added.push([String(a), String(b)]);
      view(`[${a}, ${b}]: ${a}’s group and ${b}’s group were separate. Join them — ${y}’s group now points to ${x}.`, [a, b], 'found');
    }
    return R.done([]);
  },

  'number-of-connected-components-in-an-undirected-graph': ([n, edges]: [number, number[][]]) => {
    const R = new Rec();
    const d = new DSU(n);
    const labels = Array.from({ length: n }, (_, i) => String(i));
    const added: [string, string, Role?][] = [];
    let groups = n;
    const colour = (): Record<string, Role> => {
      const roles: Role[] = ['compare', 'found', 'visited', 'active', 'path', 'window', 'new'];
      const reps = [...new Set(labels.map((_, i) => d.find(i)))];
      return Object.fromEntries(labels.map((l, i) => [l, roles[reps.indexOf(d.find(i)) % roles.length]]));
    };
    const view = (note: string, hot?: [number, number], role: Role = 'active') => R.add(note, circle(labels, [...added, ...(hot ? [[String(hot[0]), String(hot[1]), role] as [string, string, Role]] : [])], colour(), { label: 'one colour per group' }), arr(d.parent, { label: 'parent', index: true }), vars({ groups }));
    view(`Every node starts as its own group: ${n}.`);
    for (const [a, b] of edges) {
      const ra = d.find(a);
      const rb = d.find(b);
      if (ra === rb) {
        added.push([String(a), String(b)]);
        view(`[${a}, ${b}] is inside one group already: no change.`, [a, b], 'done');
        continue;
      }
      let [x, y] = [ra, rb];
      if (d.size[x] < d.size[y]) [x, y] = [y, x];
      d.parent[y] = x;
      d.size[x] += d.size[y];
      groups--;
      added.push([String(a), String(b)]);
      view(`[${a}, ${b}] joins two groups into one: ${groups} left.`, [a, b], 'found');
    }
    view(`${groups} connected component${groups === 1 ? '' : 's'}.`);
    return R.done(groups);
  },

  'graph-valid-tree': ([n, edges]: [number, number[][]]) => {
    const R = new Rec();
    const labels = Array.from({ length: n }, (_, i) => String(i));
    if (edges.length !== n - 1) {
      R.add(`A tree on ${n} nodes has exactly ${n - 1} edges; this graph has ${edges.length}. Not a tree.`, circle(labels, edges.map(([a, b]) => [String(a), String(b)] as [string, string])), vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    const d = new DSU(n);
    const added: [string, string, Role?][] = [];
    const view = (note: string, hot?: [number, number], role: Role = 'active') => R.add(note, circle(labels, [...added, ...(hot ? [[String(hot[0]), String(hot[1]), role] as [string, string, Role]] : [])]), arr(d.parent, { label: 'parent', index: true }));
    view(`${edges.length} edges for ${n} nodes: the right number. Now it is a tree exactly when no edge closes a cycle.`);
    for (const [a, b] of edges) {
      const ra = d.find(a);
      const rb = d.find(b);
      if (ra === rb) {
        view(`${a} and ${b} are already connected: [${a}, ${b}] makes a cycle. Not a tree.`, [a, b], 'bad');
        return R.done(false);
      }
      d.parent[ra] = rb;
      added.push([String(a), String(b)]);
      view(`[${a}, ${b}] joins two separate groups.`, [a, b], 'found');
    }
    view('No cycle, with n − 1 edges: a tree.');
    return R.done(true);
  },

  'word-ladder': ([begin, end, list]: [string, string, string[]]) => {
    const R = new Rec();
    const words = new Set(list);
    const all = [...new Set([begin, ...list])];
    const oneApart = (a: string, b: string) => a.length === b.length && [...a].filter((ch, i) => ch !== b[i]).length === 1;
    const edges: [string, string][] = [];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (oneApart(all[i], all[j])) edges.push([all[i], all[j]]);
    const seen = new Map<string, number>();
    const view = (note: string, frontier: string[], extra?: ReturnType<typeof vars>) =>
      R.add(
        note,
        graph(
          all.map((w, i) => {
            const p = ring(all.length)[i];
            return { id: w, label: w, x: p.x, y: p.y, role: (w === end && seen.has(w) ? 'found' : frontier.includes(w) ? 'active' : seen.has(w) ? 'visited' : w === end ? 'compare' : undefined) as Role, badge: seen.has(w) ? String(seen.get(w)) : undefined };
          }),
          edges.map(([a, b]) => ({ a, b })),
          { label: 'words one letter apart are joined; badge: ladder length to reach it' },
        ),
        queue(frontier, { label: 'this round' }),
        extra,
      );
    if (!words.has(end)) {
      view(`“${end}” is not in the word list, so no ladder can end there.`, [], vars({ answer: [0, 'bad'] }));
      return R.done(0);
    }
    let frontier = [begin];
    seen.set(begin, 1);
    words.delete(begin);
    view(`Breadth-first from “${begin}”: round k reaches exactly the words k − 1 changes away.`, frontier);
    for (let steps = 1; frontier.length; steps++) {
      if (frontier.includes(end)) {
        view(`“${end}” is reached in round ${steps}: the shortest ladder has ${steps} words.`, frontier, vars({ answer: [steps, 'found'] }));
        return R.done(steps);
      }
      const next: string[] = [];
      for (const w of frontier)
        for (let i = 0; i < w.length; i++)
          for (let c = 97; c <= 122; c++) {
            const cand = w.slice(0, i) + String.fromCharCode(c) + w.slice(i + 1);
            if (words.has(cand)) {
              words.delete(cand);
              next.push(cand);
              seen.set(cand, steps + 1);
            }
          }
      frontier = next;
      view(next.length ? `Try every one-letter change of each word: ${next.map((x) => `“${x}”`).join(', ')} ${next.length === 1 ? 'is' : 'are'} new — ladder length ${steps + 1}.` : 'No new words can be reached.', frontier);
    }
    view(`“${end}” was never reached: no ladder.`, [], vars({ answer: [0, 'bad'] }));
    return R.done(0);
  },
};
