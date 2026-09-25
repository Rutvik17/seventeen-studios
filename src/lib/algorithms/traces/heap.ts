import { Rec, arr, tree, map, graph, grid, vars, results, marks, range, type Tracer, type Role, type Val, type TNode } from '../trace';

/**
 * A binary heap whose items keep their names, so the drawing can show one
 * rising or sinking through the tree rather than values changing in place.
 * `before(a, b)` is true when a belongs nearer the top.
 */
interface Item {
  id: string;
  key: number;
  label: Val;
  data?: unknown;
}
class Heap {
  a: Item[] = [];
  seq = 0;
  before: (x: Item, y: Item) => boolean;
  constructor(before: (x: Item, y: Item) => boolean) {
    this.before = before;
  }
  get size() {
    return this.a.length;
  }
  top() {
    return this.a[0];
  }
  push(key: number, label: Val = key, data?: unknown): Item {
    const it = { id: `h${this.seq++}`, key, label, data };
    const a = this.a;
    a.push(it);
    for (let i = a.length - 1; i > 0; ) {
      const p = (i - 1) >> 1;
      if (!this.before(a[i], a[p])) break;
      [a[i], a[p]] = [a[p], a[i]];
      i = p;
    }
    return it;
  }
  pop(): Item {
    const a = this.a;
    const top = a[0];
    const last = a.pop()!;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1;
        let m = i;
        if (l < a.length && this.before(a[l], a[m])) m = l;
        if (l + 1 < a.length && this.before(a[l + 1], a[m])) m = l + 1;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
  /** The heap drawn as the tree it is: item i's children are items 2i + 1 and 2i + 2. */
  draw(label: string, roles: Record<string, Role> = {}) {
    const a = this.a;
    const nodes: TNode[] = a.map((it, i) => ({ id: it.id, val: it.label, left: a[2 * i + 1]?.id ?? null, right: a[2 * i + 2]?.id ?? null, role: roles[it.id] ?? (i === 0 ? 'active' : undefined) }));
    return tree(nodes, a[0]?.id ?? null, { label });
  }
}
const minHeap = () => new Heap((x, y) => x.key < y.key);
const maxHeap = () => new Heap((x, y) => x.key > y.key);

/** A small seeded generator, so a trace that picks at random is the same every time. */
function rng(seed = 2463534242) {
  let s = seed >>> 0;
  return (n: number) => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s % n;
  };
}

type Design = { ops: string[]; args: any[][] };

export const traces: Record<string, Tracer> = {
  'kth-largest-element-in-a-stream': ({ ops, args }: Design) => {
    const R = new Rec();
    const h = minHeap();
    let k = 0;
    const out: (number | null)[] = [];
    const label = () => `min-heap of the ${k} largest — the top is the ${k}${k === 1 ? 'st' : k === 2 ? 'nd' : k === 3 ? 'rd' : 'th'} largest`;
    const add = (v: number, quiet = false) => {
      const it = h.push(v);
      if (h.size > k) {
        const gone = h.pop();
        if (!quiet) R.add(`Add ${v}. That makes ${k + 1}; the smallest, ${gone.label}, cannot be among the ${k} largest — remove it from the top.`, h.draw(label(), { [it.id]: 'new' }));
      } else if (!quiet) R.add(`Add ${v}. The heap holds ${h.size} of ${k}.`, h.draw(label(), { [it.id]: 'new' }));
    };
    ops.forEach((op, j) => {
      if (op === 'KthLargest') {
        k = args[j][0];
        const nums: number[] = args[j][1];
        out.push(null);
        R.add(`k = ${k}. Keep only the ${k} largest numbers seen, in a min-heap: its top, the smallest of them, is the ${k}-th largest.`, arr(nums, { label: 'nums' }));
        for (const v of nums) add(v, true);
        R.add(`After the starting numbers the heap holds the ${h.size} largest.`, h.draw(label()));
        return;
      }
      add(args[j][0]);
      out.push(h.top().key);
      R.add(`add(${args[j][0]}) returns the top: ${h.top().key}.`, h.draw(label(), { [h.top().id]: 'found' }), vars({ returns: [h.top().key, 'found'] }));
    });
    return R.done(out);
  },

  'last-stone-weight': ([stones]: [number[]]) => {
    const R = new Rec();
    const h = maxHeap();
    for (const s of stones) h.push(s);
    const label = 'max-heap of stones — the heaviest on top';
    R.add('Put every stone in a max-heap: the heaviest is always on top.', h.draw(label));
    while (h.size > 1) {
      const y = h.top();
      const yv = y.key;
      h.pop();
      const x = h.top();
      const xv = x.key;
      R.add(`The two heaviest: ${yv} and ${xv}. Smash them.`, h.draw(label, { [x.id]: 'bad' }), vars({ y: [yv, 'bad'], x: [xv, 'bad'] }));
      h.pop();
      if (yv > xv) {
        const it = h.push(yv - xv);
        R.add(`${yv} − ${xv} = ${yv - xv}: a smaller stone goes back into the heap.`, h.draw(label, { [it.id]: 'new' }));
      } else R.add(`${yv} = ${xv}: both are destroyed.`, h.draw(label));
    }
    const last = h.size ? h.top().key : 0;
    R.add(h.size ? `One stone is left, weighing ${last}.` : 'No stones are left: 0.', h.draw(label, h.size ? { [h.top().id]: 'found' } : {}), vars({ answer: [last, 'found'] }));
    return R.done(last);
  },

  'k-closest-points-to-origin': ([points, k]: [number[][], number]) => {
    const R = new Rec();
    const h = maxHeap();
    const name = (i: number) => String.fromCharCode(65 + (i % 26));
    const span = Math.max(1, ...points.flat().map(Math.abs));
    const inHeap = new Set<number>();
    const plane = (hot?: number, role: Role = 'active') =>
      graph(
        [
          { id: 'o', label: 'O', x: 0.5, y: 0.5, role: 'done' as Role },
          ...points.map(([x, y], i) => ({ id: `p${i}`, label: name(i), x: 0.5 + (x / span) * 0.46, y: 0.5 - (y / span) * 0.46, role: i === hot ? role : inHeap.has(i) ? ('window' as Role) : undefined, badge: String(x * x + y * y) })),
        ],
        [],
        { label: 'the points — badge: x² + y²' },
      );
    const label = `max-heap of the ${k} closest so far — the farthest on top`;
    R.add('Compare squared distances x² + y²: the square root would not change which is smaller.', plane());
    points.forEach(([x, y], i) => {
      const d = x * x + y * y;
      const it = h.push(d, name(i), i);
      inHeap.add(i);
      if (h.size > k) {
        const gone = h.pop();
        inHeap.delete(gone.data as number);
        R.add(`${name(i)} = (${x}, ${y}): ${x}² + ${y}² = ${d}. That is ${k + 1} points; the farthest, ${gone.label} (${gone.key}), is not among the ${k} closest — remove it.`, plane(i), h.draw(label, { [it.id]: 'new' }));
      } else R.add(`${name(i)} = (${x}, ${y}): ${x}² + ${y}² = ${d}. Into the heap.`, plane(i), h.draw(label, { [it.id]: 'new' }));
    });
    const res = h.a.map((it) => points[it.data as number]);
    R.add(`The heap holds the ${k} closest: ${h.a.map((it) => it.label).join(', ')}.`, plane(), h.draw(label, Object.fromEntries(h.a.map((it) => [it.id, 'found' as Role]))));
    return R.done(res);
  },

  'kth-largest-element-in-an-array': ([nums, k]: [number[], number]) => {
    const R = new Rec();
    const a = [...nums];
    const target = a.length - k;
    const pick = rng();
    let lo = 0;
    let hi = a.length - 1;
    R.add(`The ${k}-th largest is the value that would sit at index n − k = ${a.length} − ${k} = ${target} if the array were sorted. Quickselect finds it without sorting.`, arr(a, { label: 'nums', index: true, ptrs: [{ at: target, label: 'target', role: 'found' }] }));
    for (;;) {
      const p = lo + pick(hi - lo + 1);
      const pivot = a[p];
      R.add(`Pick a pivot at random from ${lo}..${hi}: ${pivot}.`, arr([...a], { label: 'nums', index: true, range: { from: lo, to: hi, role: 'window' }, faded: [...range(0, lo - 1), ...range(hi + 1, a.length - 1)], marks: marks([p, 'active']), ptrs: [{ at: target, label: 'target', role: 'found' }] }));
      let lt = lo;
      let i = lo;
      let gt = hi;
      while (i <= gt) {
        if (a[i] < pivot) {
          [a[lt], a[i]] = [a[i], a[lt]];
          lt++;
          i++;
        } else if (a[i] > pivot) {
          [a[gt], a[i]] = [a[i], a[gt]];
          gt--;
        } else i++;
      }
      const m = marks([range(lo, lt - 1), 'compare'], [range(lt, gt), 'active'], [range(gt + 1, hi), 'visited']);
      const where = target < lt ? `index ${target} is in the smaller block: keep ${lo}..${lt - 1}` : target > gt ? `index ${target} is in the larger block: keep ${gt + 1}..${hi}` : `index ${target} is in the block equal to ${pivot}: that is the answer`;
      R.add(`Partition into smaller than ${pivot} (blue), equal (yellow), larger (violet). ${where[0].toUpperCase()}${where.slice(1)}.`, arr([...a], { label: 'nums', index: true, faded: [...range(0, lo - 1), ...range(hi + 1, a.length - 1)], marks: m, ptrs: [{ at: target, label: 'target', role: 'found' }] }));
      if (target < lt) hi = lt - 1;
      else if (target > gt) lo = gt + 1;
      else {
        R.add(`The ${k}-th largest is ${pivot}.`, vars({ answer: [pivot, 'found'] }));
        return R.done(pivot);
      }
    }
  },

  'task-scheduler': ([tasks, n]: [string[], number]) => {
    const R = new Rec();
    const count = new Map<string, number>();
    for (const t of tasks) count.set(t, (count.get(t) ?? 0) + 1);
    const most = Math.max(...count.values());
    const top = [...count.entries()].filter(([, c]) => c === most).map(([t]) => t).sort();
    const tied = top.length;
    const width = Math.max(n + 1, tied);
    R.add('Count each task.', map([...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, c]) => [t, c]), { label: 'task → count', marks: Object.fromEntries(top.map((t) => [t, 'active' as Role])) }), vars({ most, tied }));
    const frames: Val[][] = Array.from({ length: most }, (_, r) => Array.from({ length: width }, (_, c) => (c < tied ? top[c] : r < most - 1 && c <= n ? '·' : '')));
    const slots = (most - 1) * (n + 1) + tied;
    const free = frames.flat().filter((v) => v === '·').length;
    const others = tasks.length - most * tied;
    R.add(
      `${top.join(', ')} occur${tied === 1 ? 's' : ''} ${most} times. Each run of them needs ${n} unit${n === 1 ? '' : 's'} before the next, so lay out ${most - 1} frame${most - 1 === 1 ? '' : 's'} of n + 1 = ${n + 1} slots, then a last row for the final run: (${most} − 1) × ${n + 1} + ${tied} = ${slots} units.`,
      grid(frames, { label: 'frames — one row per run, · a free slot', marks: Object.fromEntries(frames.flatMap((row, r) => row.map((v, c) => [`${r},${c}`, (v === '·' ? 'window' : v ? 'active' : undefined) as Role]).filter(([, x]) => x))) }),
      vars({ units: slots }),
    );
    const ans = Math.max(tasks.length, slots);
    R.add(
      others <= free
        ? `The other ${others} task${others === 1 ? '' : 's'} fit into the ${free} free slot${free === 1 ? '' : 's'}; the rest stay idle. Answer: ${slots}.`
        : `The other ${others} tasks overflow the ${free} free slots, so the frames stretch and nothing need idle: every unit runs a task. Answer: the ${tasks.length} tasks themselves.`,
      vars({ tasks: tasks.length, frames: slots, answer: [ans, 'found'] }),
    );
    return R.done(ans);
  },

  'design-twitter': ({ ops, args }: Design) => {
    const R = new Rec();
    let time = 0;
    const tweets = new Map<number, [number, number][]>();
    const follows = new Map<number, Set<number>>();
    const out: (number[] | null)[] = [];
    const state = (hot?: number) => [
      map([...tweets.entries()].map(([u, l]) => [`user ${u}`, l.map(([t, id]) => `${id}@${t}`).join('  ')]), { label: 'tweets: id@time, oldest first', marks: hot !== undefined ? { [`user ${hot}`]: 'active' } : {} }),
      map([...follows.entries()].map(([u, s]) => [`user ${u}`, [...s].join(', ') || '—']), { label: 'follows' }),
    ];
    ops.forEach((op, j) => {
      const a = args[j] as number[];
      if (op === 'Twitter') {
        out.push(null);
        R.add('A clock that rises with every tweet, each user’s tweets in order, and who follows whom.', ...state());
      } else if (op === 'postTweet') {
        time++;
        if (!tweets.has(a[0])) tweets.set(a[0], []);
        tweets.get(a[0])!.push([time, a[1]]);
        out.push(null);
        R.add(`User ${a[0]} posts tweet ${a[1]} at time ${time}.`, ...state(a[0]));
      } else if (op === 'follow' || op === 'unfollow') {
        if (op === 'follow' && a[0] !== a[1]) {
          if (!follows.has(a[0])) follows.set(a[0], new Set());
          follows.get(a[0])!.add(a[1]);
        }
        if (op === 'unfollow') follows.get(a[0])?.delete(a[1]);
        out.push(null);
        R.add(a[0] === a[1] ? `User ${a[0]} ${op}s themself — a user always sees their own tweets, so nothing changes.` : `User ${a[0]} ${op}s user ${a[1]}.`, ...state());
      } else {
        const users = [...new Set([a[0], ...(follows.get(a[0]) ?? [])])];
        const h = maxHeap();
        for (const u of users) {
          const l = tweets.get(u);
          if (l?.length) h.push(l[l.length - 1][0], l[l.length - 1][1], [u, l.length - 1]);
        }
        const feed: number[] = [];
        R.add(`getNewsFeed(${a[0]}): users ${users.join(', ')}. Each one’s newest tweet goes into a max-heap by time.`, ...state(), h.draw('heap: newest on top (tweet ids)'), results('feed', []));
        while (h.size && feed.length < 10) {
          const it = h.pop();
          const [u, i] = it.data as [number, number];
          feed.push(it.label as number);
          let added: string | undefined;
          if (i > 0) {
            const [t, id] = tweets.get(u)![i - 1];
            added = h.push(t, id, [u, i - 1]).id;
          }
          R.add(`Take ${it.label} (time ${it.key}), the newest left.${i > 0 ? ` User ${u}’s next older tweet takes its place in the heap.` : ` User ${u} has nothing older.`}`, h.draw('heap: newest on top (tweet ids)', added ? { [added]: 'new' } : {}), results('feed', feed.map(String)));
        }
        out.push(feed);
        R.add(feed.length ? `The feed: ${feed.join(', ')}${feed.length === 10 ? ' — ten, the most it shows' : ''}.` : 'No tweets to show.', results('feed', feed.map(String), { marks: Object.fromEntries(feed.map((_, i) => [i, 'found' as Role])) }));
      }
    });
    return R.done(out);
  },

  'find-median-from-data-stream': ({ ops, args }: Design) => {
    const R = new Rec();
    const low = maxHeap();
    const high = minHeap();
    const out: (number | null)[] = [];
    const view = (note: string, roles: Record<string, Role> = {}, extra?: ReturnType<typeof vars>) => R.add(note, low.draw('low half — max-heap, largest on top', roles), high.draw('high half — min-heap, smallest on top', roles), extra);
    ops.forEach((op, j) => {
      if (op === 'MedianFinder') {
        out.push(null);
        view('Two heaps: the smaller half of the numbers, largest on top, and the larger half, smallest on top. Their tops are the middle.');
      } else if (op === 'addNum') {
        const v = args[j][0] as number;
        low.push(v);
        const up = low.pop();
        const moved = high.push(up.key);
        let note = `Add ${v} to the low half, then move the low half’s largest (${up.key}) up, so everything low stays below everything high.`;
        const roles: Record<string, Role> = { [moved.id]: 'new' };
        if (high.size > low.size) {
          const back = high.pop();
          const it = low.push(back.key);
          roles[it.id] = 'new';
          note += ` The high half is now bigger, so its smallest (${back.key}) moves back down.`;
        }
        out.push(null);
        view(note, roles);
      } else {
        const m = low.size > high.size ? low.top().key : (low.top().key + high.top().key) / 2;
        out.push(m);
        view(low.size > high.size ? `An odd count: the median is the low top, ${m}.` : `An even count: the median is (${low.top().key} + ${high.top().key}) ÷ 2 = ${m}.`, { [low.top().id]: 'found', ...(low.size > high.size ? {} : { [high.top().id]: 'found' }) }, vars({ median: [m, 'found'] }));
      }
    });
    return R.done(out);
  },
};
