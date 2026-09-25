import { Rec, arr, list, map, vars, marks, range, type Tracer, type Role, type Ptr, type LNode } from '../trace';

/**
 * Nodes kept by id, so a tracer can relink them exactly as the solution does
 * while the drawing keeps each node where it started — a turned arrow is then
 * seen turning, not the nodes shuffling.
 */
interface N {
  id: string;
  val: number | string;
  next: string | null;
  random?: string | null;
}
class Nodes {
  n = new Map<string, N>();
  seq = 0;
  mk(val: number | string, next: string | null = null, pre = 'n'): string {
    const id = `${pre}${this.seq++}`;
    this.n.set(id, { id, val, next });
    return id;
  }
  from(vals: number[], pre = 'n'): string | null {
    let head: string | null = null;
    for (let i = vals.length - 1; i >= 0; i--) head = this.mk(vals[i], head, pre);
    // ids in list order
    return head;
  }
  get(id: string) {
    return this.n.get(id)!;
  }
  next(id: string | null) {
    return id === null ? null : this.get(id).next;
  }
  val(id: string | null) {
    return id === null ? '∅' : String(this.get(id).val);
  }
  /** Ids from `head` along next, stopping at the end or a repeat. */
  walk(head: string | null): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (let c = head; c !== null && !seen.has(c); c = this.get(c).next) {
      seen.add(c);
      out.push(c);
    }
    return out;
  }
  values(head: string | null) {
    return this.walk(head).map((id) => this.get(id).val as number);
  }
  panel(order: string[], o: { label?: string; roles?: Record<string, Role>; ptrs?: Ptr[] } = {}) {
    const nodes: LNode[] = order.map((id) => ({ ...this.get(id), role: o.roles?.[id] }));
    return list(nodes, { label: o.label, order, ptrs: o.ptrs });
  }
}
const roles = (...groups: [Iterable<string> | string | null | undefined, Role][]) => {
  const out: Record<string, Role> = {};
  for (const [ids, r] of groups) {
    if (ids === null || ids === undefined) continue;
    if (typeof ids === 'string') out[ids] = r;
    else for (const id of ids) out[id] = r;
  }
  return out;
};
const P = (at: string | null, label: string, role?: Role): Ptr => ({ at, label, role });

export const traces: Record<string, Tracer> = {
  'reverse-linked-list': ([vals]: [number[]]) => {
    const R = new Rec();
    const L = new Nodes();
    const head = L.from(vals);
    const order = L.walk(head);
    const label = 'the list — nodes stay put, arrows turn';
    if (head === null) {
      R.add('The list is empty: there is nothing to reverse, and the answer is the empty list.', vars({ head: '∅' }));
      return R.done([]);
    }
    let prev: string | null = null;
    let cur: string | null = head;
    const done: string[] = [];
    R.add('prev starts at nothing (∅) and cur at the head. Each step turns one arrow round.', L.panel(order, { label, ptrs: [P(cur, 'cur', 'active'), P(prev, 'prev', 'compare')] }));
    while (cur !== null) {
      const nxt: string | null = L.next(cur);
      R.add(`Save cur.next (${L.val(nxt)}) first — once ${L.val(cur)}’s arrow turns, it is the only way to the rest.`, L.panel(order, { label, roles: roles([done, 'done'], [cur, 'active']), ptrs: [P(cur, 'cur', 'active'), P(prev, 'prev', 'compare'), P(nxt, 'next')] }));
      L.get(cur).next = prev;
      done.push(cur);
      R.add(`Point ${L.val(cur)} back at ${L.val(prev)}. Then prev moves to ${L.val(cur)} and cur to ${L.val(nxt)}.`, L.panel(order, { label, roles: roles([done, 'done'], [cur, 'found']), ptrs: [P(cur, 'cur', 'active'), P(prev, 'prev', 'compare'), P(nxt, 'next')] }));
      prev = cur;
      cur = nxt;
    }
    const res = L.values(prev);
    R.add(`cur has run off the end. prev, ${L.val(prev)}, is the new head: ${res.join(' → ')}.`, L.panel(L.walk(prev), { label: 'reversed', roles: roles([L.walk(prev), 'found']), ptrs: [P(prev, 'head', 'found')] }));
    return R.done(res);
  },

  'merge-two-sorted-lists': ([a, b]: [number[], number[]]) => {
    const R = new Rec();
    const L = new Nodes();
    const d = L.mk('·', null, 'd');
    let tail = d;
    let i = 0;
    let j = 0;
    const view = (note: string, hotA?: Role, hotB?: Role) =>
      R.add(
        note,
        arr(a, { label: 'list1', faded: range(0, i - 1), marks: marks([i < a.length ? i : null, hotA ?? 'active']), ptrs: i < a.length ? [{ at: i, label: 'front', role: 'compare' }] : [] }),
        arr(b, { label: 'list2', faded: range(0, j - 1), marks: marks([j < b.length ? j : null, hotB ?? 'active']), ptrs: j < b.length ? [{ at: j, label: 'front', role: 'compare' }] : [] }),
        L.panel(L.walk(d), { label: 'merged — after the dummy (·)', roles: roles([d, 'done'], [tail !== d ? tail : null, 'new']), ptrs: [P(tail, 'tail', 'active')] }),
      );
    view(!a.length && !b.length ? 'Both lists are empty, so the answer is too.' : 'A dummy node (·) stands at the start of the answer; tail is where the next node is hung.');
    while (i < a.length && j < b.length) {
      const takeA = a[i] <= b[j];
      const note = takeA ? `${a[i]} ≤ ${b[j]}: list1’s front is the smallest left. Hang it after tail.` : `${b[j]} < ${a[i]}: list2’s front is the smallest left. Hang it after tail.`;
      view(note, takeA ? 'found' : 'compare', takeA ? 'compare' : 'found');
      const id = L.mk(takeA ? a[i++] : b[j++], null, takeA ? 'a' : 'b');
      L.get(tail).next = id;
      tail = id;
    }
    if (i < a.length || j < b.length) {
      const rest = i < a.length ? a.slice(i) : b.slice(j);
      view(`${i < a.length ? 'list2' : 'list1'} has run out. The rest of ${i < a.length ? 'list1' : 'list2'} (${rest.join(', ')}) is already sorted: attach it in one step.`);
      for (const v of rest) {
        const id = L.mk(v, null, 'r');
        L.get(tail).next = id;
        tail = id;
      }
      i = a.length;
      j = b.length;
    }
    const res = L.values(L.next(d));
    if (res.length) R.add(`The answer starts after the dummy: ${res.join(' → ')}.`, L.panel(L.walk(L.next(d)), { label: 'merged', roles: roles([L.walk(L.next(d)), 'found']) }));
    return R.done(res);
  },

  'reorder-list': ([vals]: [number[]]) => {
    const R = new Rec();
    const L = new Nodes();
    const head = L.from(vals)!;
    const order = L.walk(head);
    const label = 'the list';
    if (order.length < 3) {
      R.add(`With ${order.length} node${order.length === 1 ? '' : 's'}, first-last-second… is already the order it is in.`, L.panel(order, { label, roles: roles([order, 'found']) }));
      return R.done(vals);
    }
    // 1. The middle.
    let slow = head;
    let fast: string | null = L.next(head);
    R.add('Step 1, find the middle. slow moves one node a step, fast two.', L.panel(order, { label, ptrs: [P(slow, 'slow', 'active'), P(fast, 'fast', 'compare')] }));
    while (fast !== null && L.next(fast) !== null) {
      slow = L.next(slow)!;
      fast = L.next(L.next(fast));
      R.add(`slow to ${L.val(slow)}, fast to ${L.val(fast)}.`, L.panel(order, { label, ptrs: [P(slow, 'slow', 'active'), P(fast, 'fast', 'compare')] }));
    }
    let second = L.next(slow);
    L.get(slow).next = null;
    const back = L.walk(second);
    const front = L.walk(head);
    R.add(`fast is at the end, so slow (${L.val(slow)}) ends the first half. Cut after it; the second half starts at ${L.val(second)}.`, L.panel(order, { label, roles: roles([front, 'window'], [back, 'compare']), ptrs: [P(slow, 'slow', 'active'), P(second, 'second')] }));
    // 2. Reverse the second half.
    let prev: string | null = null;
    while (second !== null) {
      const nxt: string | null = L.next(second);
      L.get(second).next = prev;
      prev = second;
      second = nxt;
      R.add(`Step 2, reverse the second half: ${L.val(prev)} now points back at ${L.val(L.next(prev))}.`, L.panel(order, { label, roles: roles([front, 'window'], [back, 'compare'], [prev, 'active']), ptrs: [P(prev, 'prev', 'active'), P(second, 'cur')] }));
    }
    // 3. Weave.
    let a: string | null = head;
    let b: string | null = prev;
    R.add(`Step 3, weave: first half from ${L.val(a)}, reversed second half from ${L.val(b)}.`, L.panel(order, { label, roles: roles([front, 'window'], [back, 'compare']), ptrs: [P(a, 'first', 'active'), P(b, 'second', 'compare')] }));
    while (b !== null) {
      const n1: string | null = L.next(a);
      const n2: string | null = L.next(b);
      L.get(a!).next = b;
      L.get(b).next = n1;
      R.add(`${L.val(a)} → ${L.val(b)} → ${L.val(n1)}: one from the front, then one from the back.`, L.panel(order, { label, roles: roles([front, 'window'], [back, 'compare'], [a, 'active'], [b, 'active']), ptrs: [P(n1, 'first', 'active'), P(n2, 'second', 'compare')] }));
      a = n1;
      b = n2;
    }
    const res = L.values(head);
    R.add(`The second half is used up. Read in its new order: ${res.join(' → ')}.`, L.panel(L.walk(head), { label: 'reordered', roles: roles([L.walk(head), 'found']) }));
    return R.done(res);
  },

  'remove-nth-node-from-end-of-list': ([vals, n]: [number[], number]) => {
    const R = new Rec();
    const L = new Nodes();
    const head = L.from(vals);
    const d = L.mk('·', head, 'd');
    const order = L.walk(d);
    const label = 'the list, after a dummy (·)';
    let fast: string | null = d;
    let slow = d;
    R.add(`Remove the ${n}${n === 1 ? 'st' : n === 2 ? 'nd' : n === 3 ? 'rd' : 'th'} node from the end. Both pointers start on a dummy node before the head.`, L.panel(order, { label, ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }));
    for (let k = 1; k <= n + 1; k++) {
      fast = L.next(fast);
      R.add(`fast steps ahead: ${k} of ${n + 1}. That leaves a gap of ${n + 1} nodes between them.`, L.panel(order, { label, ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }));
    }
    while (fast !== null) {
      fast = L.next(fast);
      slow = L.next(slow)!;
      R.add(`Both step together, keeping the gap: slow ${L.val(slow)}, fast ${L.val(fast)}.`, L.panel(order, { label, ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }));
    }
    const gone = L.next(slow)!;
    R.add(`fast is past the end, so slow stands just before the node to remove: ${L.val(gone)}.`, L.panel(order, { label, roles: roles([gone, 'bad']), ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }));
    L.get(slow).next = L.next(gone);
    const res = L.values(L.next(d));
    R.add(`slow.next skips it. The answer is what follows the dummy: ${res.length ? res.join(' → ') : 'the empty list'}.`, L.panel(L.walk(d), { label: 'after removing', roles: roles([d, 'done'], [L.walk(L.next(d)), 'found']) }));
    return R.done(res);
  },

  'copy-list-with-random-pointer': ([spec]: [[number, number | null][]]) => {
    const R = new Rec();
    const L = new Nodes();
    if (!spec.length) {
      R.add('An empty list copies to an empty list.', vars({ head: '∅' }));
      return R.done([]);
    }
    const orig = spec.map(([v]) => L.mk(v, null, 'o'));
    orig.forEach((id, i) => {
      L.get(id).next = orig[i + 1] ?? null;
      L.get(id).random = spec[i][1] === null ? null : orig[spec[i][1] as number];
    });
    const head = orig[0];
    const copyOf = new Map<string, string>();
    R.add('The original: solid arrows are next, dashed violet ones random.', L.panel(L.walk(head), { label: 'original' }));
    // 1. Weave copies in.
    for (let cur: string | null = head; cur !== null; cur = L.next(L.next(cur))) {
      const c = L.mk(L.get(cur).val, L.next(cur), 'c');
      L.get(c).random = null;
      L.get(cur).next = c;
      copyOf.set(cur, c);
      R.add(`Make a copy of ${L.val(cur)} and slot it right after the original.`, L.panel(L.walk(head), { label: 'originals with their copies woven in', roles: roles([[...copyOf.values()], 'new'], [c, 'active']) }));
    }
    // 2. Randoms.
    for (let cur: string | null = head; cur !== null; cur = L.next(L.next(cur))) {
      const c = L.next(cur)!;
      const r = L.get(cur).random ?? null;
      L.get(c).random = r === null ? null : L.next(r);
      R.add(
        r === null ? `${L.val(cur)}’s random is nothing, so its copy’s is too.` : `${L.val(cur)}’s random is ${L.val(r)}; the copy of ${L.val(r)} is the node right after it — so that is where the copy’s random goes.`,
        L.panel(L.walk(head), { label: 'originals with their copies woven in', roles: roles([[...copyOf.values()], 'new'], [cur, 'compare'], [c, 'active'], [r === null ? null : L.next(r), 'found']) }),
      );
    }
    // 3. Unweave.
    const d = L.mk('·', null, 'd');
    let tail = d;
    for (let cur: string | null = head; cur !== null; cur = L.next(cur)) {
      const c = L.next(cur)!;
      L.get(cur).next = L.next(c);
      L.get(tail).next = c;
      tail = c;
    }
    const copies = L.walk(L.next(d));
    R.add('Unweave: each original points past its copy again, and the copies are chained together. The original is exactly as it was.', L.panel(orig, { label: 'original, restored' }), L.panel(copies, { label: 'the copy — every arrow between new nodes', roles: roles([copies, 'found']) }));
    const idx = new Map(copies.map((id, i) => [id, i]));
    return R.done(copies.map((id) => [L.get(id).val, L.get(id).random ? idx.get(L.get(id).random!)! : null]));
  },

  'add-two-numbers': ([a, b]: [number[], number[]]) => {
    const R = new Rec();
    const L = new Nodes();
    const d = L.mk('·', null, 'd');
    let tail = d;
    let carry = 0;
    const n = Math.max(a.length, b.length);
    const num = (xs: number[]) => [...xs].reverse().join('');
    const view = (note: string, i: number, extra: Record<string, number | string | [number | string, Role]> = {}) =>
      R.add(
        note,
        arr(a, { label: `l1 = ${num(a)}, ones first`, faded: range(0, i - 1), marks: marks([i < a.length ? i : null, 'active']) }),
        arr(b, { label: `l2 = ${num(b)}, ones first`, faded: range(0, i - 1), marks: marks([i < b.length ? i : null, 'active']) }),
        L.panel(L.walk(L.next(d)), { label: 'sum, ones first', roles: roles([tail !== d ? tail : null, 'new']) }),
        vars({ carry, ...extra }),
      );
    view(`Add ${num(a)} + ${num(b)} column by column, from the ones, as on paper.`, 0);
    for (let i = 0; i < n || carry; i++) {
      const x = a[i] ?? 0;
      const y = b[i] ?? 0;
      const s = x + y + carry;
      const note = `${i < a.length ? x : '(ended) 0'} + ${i < b.length ? y : '(ended) 0'} + carry ${carry} = ${s}: write ${s} mod 10 = ${s % 10}, carry ${s} ÷ 10 = ${Math.floor(s / 10)}.`;
      carry = Math.floor(s / 10);
      const id = L.mk(s % 10, null, 's');
      L.get(tail).next = id;
      tail = id;
      view(i >= n ? `Both lists have ended but a carry is left: ${note}` : note, i, { sum: [s, 'active'] });
    }
    const res = L.values(L.next(d));
    R.add(`Done: ${num(a)} + ${num(b)} = ${num(res)}, stored ones first as ${res.join(' → ')}.`, L.panel(L.walk(L.next(d)), { label: 'sum', roles: roles([L.walk(L.next(d)), 'found']) }));
    return R.done(res);
  },

  'linked-list-cycle': ([[vals, pos]]: [[number[], number]]) => {
    const R = new Rec();
    const L = new Nodes();
    const head = L.from(vals);
    const order = L.walk(head);
    if (pos >= 0) L.get(order[order.length - 1]).next = order[pos];
    const label = pos >= 0 ? `the list — the last node points back to position ${pos}` : 'the list';
    if (head === null) {
      R.add('An empty list has no cycle.', vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    let slow = head;
    let fast: string | null = head;
    R.add('slow (the tortoise) moves one node a step; fast (the hare) moves two. Both start at the head.', L.panel(order, { label, ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }));
    let step = 0;
    while (fast !== null && L.next(fast) !== null) {
      slow = L.next(slow)!;
      fast = L.next(L.next(fast));
      step++;
      if (slow === fast) {
        R.add(`Step ${step}: they meet at ${L.val(slow)}. fast could only catch slow by going round a loop — there is a cycle.`, L.panel(order, { label, roles: roles([slow, 'found']), ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }), vars({ answer: [true, 'found'] }));
        return R.done(true);
      }
      R.add(`Step ${step}: slow at ${L.val(slow)}, fast at ${L.val(fast)}.`, L.panel(order, { label, ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }));
    }
    R.add('fast has reached the end of the list. A list with an end has no cycle.', L.panel(order, { label, ptrs: [P(slow, 'slow', 'compare'), P(fast, 'fast', 'active')] }), vars({ answer: [false, 'bad'] }));
    return R.done(false);
  },

  'find-the-duplicate-number': ([nums]: [number[]]) => {
    const R = new Rec();
    // The chain 0 → nums[0] → … as list nodes named by index.
    const chain: number[] = [];
    const seen = new Set<number>();
    for (let i = 0; !seen.has(i); i = nums[i]) {
      seen.add(i);
      chain.push(i);
    }
    const nodes: LNode[] = chain.map((i) => ({ id: `i${i}`, val: i, next: `i${nums[i]}` }));
    const view = (note: string, slow: number, fast: number, hot: Record<string, Role> = {}) =>
      R.add(
        note,
        arr(nums, { label: 'nums', index: true, marks: marks([fast, 'compare'], [slow, 'active']), ptrs: [{ at: slow, label: 'slow', role: 'active' }, { at: fast, label: 'fast', role: 'compare' }] }),
        list(
          nodes.map((n) => ({ ...n, role: hot[n.id] })),
          { label: 'index i → index nums[i], starting from 0', ptrs: [P(`i${slow}`, 'slow', 'active'), P(`i${fast}`, 'fast', 'compare')] },
        ),
      );
    let slow = 0;
    let fast = 0;
    view('Read each index i as a node whose arrow goes to index nums[i]. From 0 the walk must loop — and the loop’s entrance is the repeated value.', slow, fast);
    do {
      slow = nums[slow];
      fast = nums[nums[fast]];
      view(slow === fast ? `slow and fast meet at index ${slow}, somewhere inside the loop.` : `slow takes one step (to ${slow}), fast two (to ${fast}).`, slow, fast, slow === fast ? { [`i${slow}`]: 'visited' } : {});
    } while (slow !== fast);
    slow = 0;
    view('Phase two: slow goes back to 0. Now both move one step at a time; they will meet exactly at the loop’s entrance.', slow, fast);
    while (slow !== fast) {
      slow = nums[slow];
      fast = nums[fast];
      view(slow === fast ? `They meet at ${slow}: two different indices point here, so ${slow} is the repeated value.` : `slow to ${slow}, fast to ${fast}.`, slow, fast, slow === fast ? { [`i${slow}`]: 'found' } : {});
    }
    R.add(`The duplicate is ${slow}.`, vars({ answer: [slow, 'found'] }));
    return R.done(slow);
  },

  'lru-cache': ({ ops, args }: { ops: string[]; args: number[][] }) => {
    const R = new Rec();
    let cap = 0;
    const vals = new Map<number, number>();
    let order: number[] = []; // least recent first
    const out: (number | null)[] = [];
    const view = (note: string, hot: Record<number, Role> = {}, extra?: ReturnType<typeof vars>) => {
      const nodes: LNode[] = order.map((k, i) => ({ id: `k${k}`, val: `${k}:${vals.get(k)}`, next: i + 1 < order.length ? `k${order[i + 1]}` : null, role: hot[k] }));
      R.add(
        note,
        map(
          order.map((k) => [k, `node ${k}:${vals.get(k)}`]),
          { label: `hash map: key → node (${order.length} of ${cap})`, marks: Object.fromEntries(Object.entries(hot).map(([k, r]) => [k, r])) },
        ),
        list(nodes, { label: 'use order, least recent → most recent (key:value)', ptrs: order.length ? [P(`k${order[0]}`, 'LRU', 'bad'), P(`k${order[order.length - 1]}`, 'MRU', 'found')] : [] }),
        extra,
      );
    };
    ops.forEach((op, j) => {
      const a = args[j];
      if (op === 'LRUCache') {
        cap = a[0];
        out.push(null);
        view(`An empty cache with room for ${cap}.`);
      } else if (op === 'get') {
        const k = a[0];
        if (!vals.has(k)) {
          out.push(-1);
          view(`get(${k}): the map has no ${k}. Return −1.`, {}, vars({ returns: [-1, 'bad'] }));
          return;
        }
        view(`get(${k}): the map finds its node in one step.`, { [k]: 'active' });
        order = [...order.filter((x) => x !== k), k];
        out.push(vals.get(k)!);
        view(`It has just been used: unlink it and move it to the most-recent end. Return ${vals.get(k)}.`, { [k]: 'found' }, vars({ returns: [vals.get(k)!, 'found'] }));
      } else {
        const [k, v] = a;
        const had = vals.has(k);
        vals.set(k, v);
        order = [...order.filter((x) => x !== k), k];
        out.push(null);
        view(had ? `put(${k}, ${v}): ${k} is already cached — update its value and move it to the most-recent end.` : `put(${k}, ${v}): a new node at the most-recent end, and an entry in the map.`, { [k]: 'new' });
        if (order.length > cap) {
          const lru = order[0];
          view(`That is ${order.length} keys, one more than the ${cap} allowed. The least recently used is ${lru}, at the other end.`, { [lru]: 'bad', [k]: 'new' });
          order = order.slice(1);
          vals.delete(lru);
          view(`Remove ${lru} from the list and from the map.`, { [k]: 'new' });
        }
      }
    });
    return R.done(out);
  },

  'merge-k-sorted-lists': ([lists]: [number[][]]) => {
    const R = new Rec();
    const L = new Nodes();
    const d = L.mk('·', null, 'd');
    let tail = d;
    const at = lists.map(() => 0);
    type H = [number, number]; // value, list
    const heap: H[] = [];
    const less = (x: H, y: H) => x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]);
    const push = (h: H) => {
      heap.push(h);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (!less(heap[i], heap[p])) break;
        [heap[i], heap[p]] = [heap[p], heap[i]];
        i = p;
      }
    };
    const pop = (): H => {
      const top = heap[0];
      const last = heap.pop()!;
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && less(heap[l], heap[m])) m = l;
          if (r < heap.length && less(heap[r], heap[m])) m = r;
          if (m === i) break;
          [heap[i], heap[m]] = [heap[m], heap[i]];
          i = m;
        }
      }
      return top;
    };
    const view = (note: string, from?: number) =>
      R.add(
        note,
        ...lists.slice(0, 6).map((xs, k) => arr(xs.length ? xs : ['∅'], { label: `list ${k}`, faded: range(0, at[k] - 1), marks: marks([from === k ? at[k] - 1 : null, 'found']) })),
        arr(heap.map(([v, k]) => `${v}·${k}`), { label: 'min-heap: value·list, smallest first' }),
        L.panel(L.walk(L.next(d)), { label: 'merged', roles: roles([tail !== d ? tail : null, 'new']) }),
      );
    if (!lists.length) {
      R.add('There are no lists, so the merged list is empty.', vars({ k: 0 }));
      return R.done([]);
    }
    lists.forEach((xs, k) => {
      if (xs.length) push([xs[0], k]);
    });
    view(heap.length ? `Put the front of each non-empty list in a min-heap: ${heap.length} entr${heap.length === 1 ? 'y' : 'ies'}, the smallest on top.` : 'Every list is empty, so the merged list is empty.');
    while (heap.length) {
      const [v, k] = pop();
      at[k]++;
      const id = L.mk(v, null, 'm');
      L.get(tail).next = id;
      tail = id;
      const more = at[k] < lists[k].length;
      if (more) push([lists[k][at[k]], k]);
      view(`Take the smallest, ${v} from list ${k}, and attach it. ${more ? `List ${k}’s next node, ${lists[k][at[k]]}, goes into the heap.` : `List ${k} is used up.`}`, k);
    }
    const res = L.values(L.next(d));
    if (res.length) R.add(`The heap is empty: every node has been placed. ${res.join(' → ')}.`, L.panel(L.walk(L.next(d)), { label: 'merged', roles: roles([L.walk(L.next(d)), 'found']) }));
    return R.done(res);
  },

  'reverse-nodes-in-k-group': ([vals, k]: [number[], number]) => {
    const R = new Rec();
    const L = new Nodes();
    const head = L.from(vals);
    const d = L.mk('·', head, 'd');
    const order = L.walk(d);
    const label = `the list, after a dummy (·) — groups of ${k}`;
    const flipped = new Set<string>();
    let before = d;
    R.add(`Reverse ${k} nodes at a time. before is the node just ahead of the next group — the dummy, to start.`, L.panel(order, { label, ptrs: [P(before, 'before', 'compare')] }));
    for (;;) {
      let end: string | null = before;
      for (let i = 0; i < k && end !== null; i++) end = L.next(end);
      if (end === null) {
        R.add(`Fewer than ${k} nodes are left after ${L.val(before)}: they stay as they are.`, L.panel(order, { label, roles: roles([[...flipped], 'done']), ptrs: [P(before, 'before', 'compare')] }));
        break;
      }
      const after = L.next(end);
      const first = L.next(before)!;
      const group = L.walk(first).slice(0, k);
      R.add(`A full group: ${group.map((g) => L.val(g)).join(', ')}. The node after it is ${L.val(after)}.`, L.panel(order, { label, roles: roles([[...flipped], 'done'], [group, 'window']), ptrs: [P(before, 'before', 'compare'), P(end, 'end', 'active'), P(after, 'after')] }));
      let prev: string | null = after;
      let cur: string | null = first;
      while (cur !== after) {
        const nxt: string | null = L.next(cur);
        L.get(cur!).next = prev;
        R.add(`Turn ${L.val(cur)} to point at ${L.val(prev)}${prev === after ? ' — the node after the group, so the tail stays attached' : ''}.`, L.panel(order, { label, roles: roles([[...flipped], 'done'], [group, 'window'], [cur, 'active']), ptrs: [P(before, 'before', 'compare'), P(cur, 'cur', 'active'), P(prev, 'prev')] }));
        prev = cur;
        cur = nxt;
      }
      L.get(before).next = end;
      group.forEach((g) => flipped.add(g));
      R.add(`before now points at ${L.val(end)}, the group’s new first node. before moves to ${L.val(first)}, now the group’s last.`, L.panel(order, { label, roles: roles([[...flipped], 'done'], [end, 'found']), ptrs: [P(first, 'before', 'compare')] }));
      before = first;
    }
    const res = L.values(L.next(d));
    R.add(`Read in its new order: ${res.join(' → ')}.`, L.panel(L.walk(L.next(d)), { label: 'result', roles: roles([L.walk(L.next(d)), 'found']) }));
    return R.done(res);
  },
};
