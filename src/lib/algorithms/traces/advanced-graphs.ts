import { Rec, arr, grid, graph, stack, vars, results, ring, marks, type Tracer, type Role, type GNode, type GEdge } from '../trace';

/** A small binary min-heap on the first element of each entry. */
class MinHeap<T extends unknown[]> {
  a: T[] = [];
  get size() {
    return this.a.length;
  }
  push(x: T) {
    const a = this.a;
    a.push(x);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if ((a[p][0] as number) <= (a[i][0] as number)) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
  }
  pop(): T {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        let m = i;
        if (l < a.length && (a[l][0] as number) < (a[m][0] as number)) m = l;
        if (l + 1 < a.length && (a[l + 1][0] as number) < (a[m][0] as number)) m = l + 1;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

/** Labelled nodes round a circle. */
function circle(labels: string[], edges: GEdge[], roles: Record<string, Role> = {}, o: { directed?: boolean; label?: string; badges?: Record<string, string> } = {}) {
  const pts = ring(labels.length);
  const nodes: GNode[] = labels.map((l, i) => ({ id: l, label: l, x: pts[i].x, y: pts[i].y, role: roles[l], badge: o.badges?.[l] }));
  return graph(nodes, edges, { directed: o.directed, label: o.label });
}

export const traces: Record<string, Tracer> = {
  'reconstruct-itinerary': ([tickets]: [string[][]]) => {
    const R = new Rec();
    const airports = [...new Set(tickets.flat())].sort();
    const outOf = new Map<string, string[]>();
    for (const [a, b] of [...tickets].sort().reverse()) {
      if (!outOf.has(a)) outOf.set(a, []);
      outOf.get(a)!.push(b);
    }
    const used: [string, string][] = [];
    const route: string[] = [];
    const st = ['JFK'];
    const view = (note: string, hot?: string) => {
      const left = tickets.map(([a, b]) => [a, b]);
      for (const [a, b] of used) {
        const i = left.findIndex(([x, y]) => x === a && y === b);
        if (i >= 0) left.splice(i, 1);
      }
      R.add(
        note,
        circle(airports, [...left.map(([a, b]) => ({ a, b })), ...used.map(([a, b]) => ({ a, b, role: 'done' as Role }))], { ...Object.fromEntries(route.map((x) => [x, 'found' as Role])), ...(hot ? { [hot]: 'active' as Role } : {}) }, { directed: true, label: 'tickets — grey once used' }),
        stack([...st], { label: 'the flight so far' }),
        results('route, written from the end', [...route].reverse()),
      );
    };
    view('Always fly the alphabetically first unused ticket. An airport with no tickets left must be where the rest of the route ends: write it down and step back.', 'JFK');
    while (st.length) {
      const top = st[st.length - 1];
      const next = outOf.get(top);
      if (next?.length) {
        const to = next.pop()!;
        used.push([top, to]);
        st.push(to);
        view(`From ${top}, the first ticket left goes to ${to}. Fly it.`, to);
      } else {
        route.push(st.pop()!);
        view(`${top} has no tickets left: it ends what remains of the route. Write it down and step back.`, top);
      }
    }
    const out = route.reverse();
    view(`Read forwards: ${out.join(' → ')}.`);
    return R.done(out);
  },

  'min-cost-to-connect-all-points': ([pts]: [number[][]]) => {
    const R = new Rec();
    const n = pts.length;
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const sx = (x: number) => (x1 === x0 ? 0.5 : 0.05 + (0.9 * (x - x0)) / (x1 - x0));
    const sy = (y: number) => (y1 === y0 ? 0.5 : 0.95 - (0.9 * (y - y0)) / (y1 - y0));
    const dist = (i: number, j: number) => Math.abs(pts[i][0] - pts[j][0]) + Math.abs(pts[i][1] - pts[j][1]);
    const cost = new Array(n).fill(Infinity);
    const from = new Array(n).fill(-1);
    cost[0] = 0;
    const inside = new Array(n).fill(false);
    const tree: GEdge[] = [];
    let total = 0;
    const view = (note: string, hot?: number) =>
      R.add(
        note,
        graph(
          pts.map((p, i) => ({ id: `p${i}`, label: String(i), x: sx(p[0]), y: sy(p[1]), role: (i === hot ? 'active' : inside[i] ? 'found' : undefined) as Role, badge: inside[i] ? undefined : cost[i] === Infinity ? '∞' : String(cost[i]) })),
          tree,
          { label: 'points — badge: cheapest link to the tree' },
        ),
        vars({ total }),
      );
    view('Grow one tree from point 0. Each outside point keeps the price of its cheapest link to the tree.');
    for (let k = 0; k < n; k++) {
      let u = -1;
      for (let i = 0; i < n; i++) if (!inside[i] && (u < 0 || cost[i] < cost[u])) u = i;
      inside[u] = true;
      total += cost[u];
      if (from[u] >= 0) tree.push({ a: `p${from[u]}`, b: `p${u}`, w: cost[u], role: 'found' });
      for (let v = 0; v < n; v++)
        if (!inside[v] && dist(u, v) < cost[v]) {
          cost[v] = dist(u, v);
          from[v] = u;
        }
      view(k === 0 ? `Start the tree with point 0 at (${pts[0].join(', ')}), and price every other point’s link to it.` : `Point ${u} has the cheapest link, ${cost[u]}: add it. Running total ${total}. Its neighbours may now have cheaper links.`, u);
    }
    view(`Every point is joined: total ${total}.`);
    return R.done(total);
  },

  'network-delay-time': ([times, n, k]: [number[][], number, number]) => {
    const R = new Rec();
    const labels = Array.from({ length: n }, (_, i) => String(i + 1));
    const outOf: [number, number][][] = Array.from({ length: n + 1 }, () => []);
    for (const [u, v, w] of times) outOf[u].push([v, w]);
    const arrive = new Array(n + 1).fill(-1);
    const heap = new MinHeap<[number, number]>();
    heap.push([0, k]);
    const view = (note: string, hot?: number, extra?: ReturnType<typeof vars>) =>
      R.add(
        note,
        circle(labels, times.map(([u, v, w]) => ({ a: String(u), b: String(v), w, role: arrive[u] >= 0 && arrive[v] >= 0 && arrive[v] === arrive[u] + w ? ('found' as Role) : undefined })), Object.fromEntries(labels.map((l, i) => [l, i + 1 === hot ? 'active' : arrive[i + 1] >= 0 ? 'found' : undefined])) as Record<string, Role>, { directed: true, label: 'badge: when the signal arrives', badges: Object.fromEntries(labels.map((l, i) => [l, arrive[i + 1] >= 0 ? String(arrive[i + 1]) : ''])) }),
        arr(heap.a.map(([t, u]) => `${u}@${t}`), { label: 'min-heap: node@time' }),
        extra,
      );
    view(`The signal leaves node ${k} at time 0. Always settle the earliest arrival still waiting.`);
    let last = 0;
    let settled = 0;
    while (heap.size) {
      const [t, u] = heap.pop();
      if (arrive[u] >= 0) {
        view(`Node ${u} at time ${t} is stale — it was already reached at ${arrive[u]}. Skip.`);
        continue;
      }
      arrive[u] = t;
      settled++;
      last = t;
      const offers: string[] = [];
      for (const [v, w] of outOf[u])
        if (arrive[v] < 0) {
          heap.push([t + w, v]);
          offers.push(`${v} at ${t} + ${w} = ${t + w}`);
        }
      view(`Node ${u} hears the signal at ${t} — nothing waiting is earlier, so that is final.${offers.length ? ` Offer ${offers.join(', ')}.` : ''}`, u);
    }
    const ans = settled === n ? last : -1;
    view(ans < 0 ? `${n - settled} node${n - settled === 1 ? '' : 's'} never heard it: −1.` : `Every node has it; the last hears it at ${ans}.`, undefined, vars({ answer: [ans, ans < 0 ? 'bad' : 'found'] }));
    return R.done(ans);
  },

  'swim-in-rising-water': ([g]: [number[][]]) => {
    const R = new Rec();
    const n = g.length;
    const heap = new MinHeap<[number, number, number]>();
    heap.push([g[0][0], 0, 0]);
    const seen = new Set(['0,0']);
    const done: string[] = [];
    const view = (note: string, hot?: [number, number], t?: number) => {
      const m: Record<string, Role> = {};
      for (const k of seen) m[k] = 'window';
      for (const k of done) m[k] = t !== undefined && g[+k.split(',')[0]][+k.split(',')[1]] <= t ? 'found' : 'compare';
      if (hot) m[`${hot[0]},${hot[1]}`] = 'active';
      R.add(note, grid(g, { label: 'heights — blue: swum through; pale: on the frontier', marks: m }), vars({ water: t ?? g[0][0], frontier: heap.size }));
    };
    view(`Start on height ${g[0][0]}. Always extend to the frontier square whose route has the lowest highest point.`);
    while (heap.size) {
      const [t, r, c] = heap.pop();
      done.push(`${r},${c}`);
      if (r === n - 1 && c === n - 1) {
        view(`The far corner comes off the heap with ${t}: the water must reach ${t}, and no route does better.`, [r, c], t);
        return R.done(t);
      }
      for (const [x, y] of [
        [r + 1, c],
        [r - 1, c],
        [r, c + 1],
        [r, c - 1],
      ])
        if (x >= 0 && x < n && y >= 0 && y < n && !seen.has(`${x},${y}`)) {
          seen.add(`${x},${y}`);
          heap.push([Math.max(t, g[x][y]), x, y]);
        }
      view(`Swim to (${r}, ${c}): the route there needs water ${t} deep.`, [r, c], t);
    }
    return R.done(-1);
  },

  'alien-dictionary': ([words]: [string[]]) => {
    const R = new Rec();
    const letters = [...new Set(words.join(''))];
    const after = new Map(letters.map((c) => [c, new Set<string>()]));
    const need = new Map(letters.map((c) => [c, 0]));
    const rules: GEdge[] = [];
    const view = (note: string, hotWords?: number, done: string[] = []) =>
      R.add(
        note,
        arr(words, { label: 'words, in the alien order', marks: marks([hotWords !== undefined ? [hotWords, hotWords + 1] : null, 'active']) }),
        circle(letters, rules, { ...Object.fromEntries(letters.map((c) => [c, need.get(c) === 0 ? 'window' : undefined])), ...Object.fromEntries(done.map((c) => [c, 'found'])) } as Record<string, Role>, { directed: true, label: 'arrow x → y: x comes before y; badge: letters still required first', badges: Object.fromEntries(letters.map((c) => [c, String(need.get(c))])) }),
        results('alphabet', done),
      );
    view('Compare each word with the next. Their first different letter is one rule of the alphabet.');
    for (let i = 0; i + 1 < words.length; i++) {
      const [a, b] = [words[i], words[i + 1]];
      const k = [...a].findIndex((c, j) => c !== b[j]);
      if (k === -1 || k >= b.length) {
        if (a.length > b.length) {
          view(`“${a}” comes before its own prefix “${b}” — no alphabet sorts it that way. Impossible.`, i);
          return R.done('');
        }
        view(`“${a}” is a prefix of “${b}”: that says nothing about letters.`, i);
        continue;
      }
      const [x, y] = [a[k], b[k]];
      if (!after.get(x)!.has(y)) {
        after.get(x)!.add(y);
        need.set(y, need.get(y)! + 1);
        rules.push({ a: x, b: y });
      }
      view(`“${a}” before “${b}”: they first differ at “${x}” and “${y}”, so ${x} comes before ${y}.`, i);
    }
    const order = letters.filter((c) => need.get(c) === 0);
    for (let h = 0; h < order.length; h++) {
      const c = order[h];
      for (const y of after.get(c)!) {
        need.set(y, need.get(y)! - 1);
        if (need.get(y) === 0) order.push(y);
      }
      view(`${c} has nothing left before it: it is next in the alphabet.`, undefined, order.slice(0, h + 1));
    }
    const ok = order.length === letters.length;
    view(ok ? `An alphabet consistent with every rule: “${order.join('')}”.` : 'Some letters wait on each other in a cycle: no alphabet works.', undefined, ok ? order : order);
    return R.done(ok ? order.join('') : '');
  },

  'cheapest-flights-within-k-stops': ([n, flights, src, dst, k]: [number, number[][], number, number, number]) => {
    const R = new Rec();
    const labels = Array.from({ length: n }, (_, i) => String(i));
    let cost = new Array(n).fill(Infinity);
    cost[src] = 0;
    const view = (note: string, round: number, changed: number[] = [], extra?: ReturnType<typeof vars>) =>
      R.add(
        note,
        circle(labels, flights.map(([u, v, p]) => ({ a: String(u), b: String(v), w: p })), { [String(src)]: 'found', [String(dst)]: 'compare', ...Object.fromEntries(changed.map((v) => [String(v), 'active'])) } as Record<string, Role>, { directed: true, label: `flights and prices; badge: cheapest in at most ${round} flight${round === 1 ? '' : 's'}`, badges: Object.fromEntries(labels.map((l, i) => [l, cost[i] === Infinity ? '∞' : String(cost[i])])) }),
        arr(cost.map((c) => (c === Infinity ? '∞' : c)), { label: 'cost', index: true, marks: marks([changed, 'active'], [dst, 'compare']) }),
        extra,
      );
    view(`From ${src} to ${dst} with at most ${k} stop${k === 1 ? '' : 's'}: at most ${k + 1} flight${k + 1 === 1 ? '' : 's'}. Each round lets every route take one more flight.`, 0);
    for (let r = 1; r <= k + 1; r++) {
      const before = cost;
      cost = [...before];
      const changed: number[] = [];
      for (const [u, v, p] of flights)
        if (before[u] + p < cost[v]) {
          cost[v] = before[u] + p;
          if (!changed.includes(v)) changed.push(v);
        }
      view(changed.length ? `Round ${r}: using last round’s prices only, ${changed.map((v) => `${v} drops to ${cost[v]}`).join(', ')}.` : `Round ${r}: nothing gets cheaper.`, r, changed);
    }
    const ans = cost[dst] === Infinity ? -1 : cost[dst];
    view(ans < 0 ? `${dst} cannot be reached in ${k + 1} flights: −1.` : `The cheapest price to ${dst} within ${k} stop${k === 1 ? '' : 's'} is ${ans}.`, k + 1, [], vars({ answer: [ans, ans < 0 ? 'bad' : 'found'] }));
    return R.done(ans);
  },
};
