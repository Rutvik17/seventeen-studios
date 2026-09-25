import { Rec, arr, intervals as strips, results, vars, marks, type Tracer, type Role } from '../trace';

type Row = { s: number; e: number; role?: Role; label?: string };
const span = (...lists: number[][][]) => {
  const all = lists.flat();
  return all.length ? { min: Math.min(...all.map((x) => x[0])), max: Math.max(...all.map((x) => x[1])) } : { min: 0, max: 1 };
};
const iv = ([s, e]: number[], role?: Role, label?: string): Row => ({ s, e, role, label });

export const traces: Record<string, Tracer> = {
  'insert-interval': ([list, add]: [number[][], number[]]) => {
    const R = new Rec();
    const box = span(list, [add]);
    const out: number[][] = [];
    const view = (note: string, i: number, s: number, e: number) =>
      R.add(note, strips([...list.map((x, k) => iv(x, k < i ? 'done' : k === i ? 'active' : undefined)), iv([s, e], 'new', `new [${s}, ${e}]`)], { ...box, label: 'intervals, and the new one below' }), results('result so far', out.map((x) => `[${x.join(', ')}]`)));
    let [s, e] = add;
    let i = 0;
    view('The list is sorted: intervals before the new one, those it overlaps, those after.', -1, s, e);
    while (i < list.length && list[i][1] < s) {
      out.push(list[i]);
      view(`[${list[i].join(', ')}] ends before ${s}: keep it as it is.`, i, s, e);
      i++;
    }
    while (i < list.length && list[i][0] <= e) {
      const [ns, ne] = [Math.min(s, list[i][0]), Math.max(e, list[i][1])];
      view(`[${list[i].join(', ')}] overlaps [${s}, ${e}]: absorb it — [${ns}, ${ne}].`, i, ns, ne);
      [s, e] = [ns, ne];
      i++;
    }
    out.push([s, e]);
    view(`Nothing else overlaps: add [${s}, ${e}].`, i, s, e);
    for (; i < list.length; i++) out.push(list[i]);
    R.add('The rest start after it: keep them as they are.', strips(out.map((x) => iv(x, 'found')), { ...box, label: 'the result' }), results('result', out.map((x) => `[${x.join(', ')}]`)));
    return R.done(out);
  },

  'merge-intervals': ([list]: [number[][]]) => {
    const R = new Rec();
    const sorted = [...list].map((x) => [...x]).sort((a, b) => a[0] - b[0]);
    const box = span(sorted);
    const out: number[][] = [];
    const view = (note: string, i: number) => R.add(note, strips(sorted.map((x, k) => iv(x, k === i ? 'active' : k < i ? 'done' : undefined)), { ...box, label: 'sorted by start' }), strips(out.map((x, k) => iv(x, k === out.length - 1 ? 'new' : 'found')), { ...box, label: 'merged' }));
    view('Sorted by start, an interval can only overlap the merged one just before it.', -1);
    sorted.forEach((x, i) => {
      const last = out[out.length - 1];
      if (last && x[0] <= last[1]) {
        const was = last[1];
        last[1] = Math.max(last[1], x[1]);
        view(`[${x.join(', ')}] starts at ${x[0]}, before [${last[0]}, ${was}] ends: stretch it to ${last[1]}.`, i);
      } else {
        out.push([...x]);
        view(last ? `[${x.join(', ')}] starts after ${last[1]}: a new merged interval.` : `[${x.join(', ')}] begins the first merged interval.`, i);
      }
    });
    return R.done(out);
  },

  'non-overlapping-intervals': ([list]: [number[][]]) => {
    const R = new Rec();
    const sorted = [...list].sort((a, b) => a[1] - b[1]);
    const box = span(sorted);
    const fate: (Role | undefined)[] = sorted.map(() => undefined);
    let end = -Infinity;
    let kept = 0;
    const view = (note: string, i: number) => R.add(note, strips(sorted.map((x, k) => iv(x, k === i ? (fate[k] === 'bad' ? 'bad' : 'active') : fate[k], fate[k] === 'bad' ? 'remove' : undefined)), { ...box, label: 'sorted by end — keep the earliest-ending that fits', cursor: end === -Infinity ? undefined : end }), vars({ kept, removed: fate.filter((f) => f === 'bad').length }));
    view('Sort by end. Keeping whatever ends first always leaves the most room for the rest.', -1);
    sorted.forEach((x, i) => {
      if (x[0] >= end) {
        fate[i] = 'found';
        kept++;
        end = x[1];
        view(`[${x.join(', ')}] starts at or after the last end: keep it. The line moves to ${end}.`, i);
      } else {
        fate[i] = 'bad';
        view(`[${x.join(', ')}] starts before ${end}: it clashes. Remove it.`, i);
      }
    });
    return R.done(sorted.length - kept);
  },

  'meeting-rooms': ([list]: [number[][]]) => {
    const R = new Rec();
    const sorted = [...list].sort((a, b) => a[0] - b[0]);
    const box = span(sorted);
    if (!sorted.length) {
      R.add('No meetings: nothing to clash.', vars({ answer: [true, 'found'] }));
      return R.done(true);
    }
    const view = (note: string, i: number, bad = false) => R.add(note, strips(sorted.map((x, k) => iv(x, k === i || k === i - 1 ? (bad ? 'bad' : 'active') : k < i ? 'found' : undefined)), { ...box, label: 'meetings, in order of start' }));
    view('In order of start, a clash can only be between neighbours.', -1);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][0] < sorted[i - 1][1]) {
        view(`[${sorted[i].join(', ')}] starts at ${sorted[i][0]}, before [${sorted[i - 1].join(', ')}] ends at ${sorted[i - 1][1]}: a clash.`, i, true);
        return R.done(false);
      }
      view(`[${sorted[i - 1].join(', ')}] ends by the time [${sorted[i].join(', ')}] begins.`, i);
    }
    R.add('No neighbours overlap: one person can attend them all.', vars({ answer: [true, 'found'] }));
    return R.done(true);
  },

  'meeting-rooms-ii': ([list]: [number[][]]) => {
    const R = new Rec();
    const starts = list.map((x) => x[0]).sort((a, b) => a - b);
    const ends = list.map((x) => x[1]).sort((a, b) => a - b);
    const box = span(list);
    const byStart = [...list].sort((a, b) => a[0] - b[0]);
    let busy = 0;
    let best = 0;
    let j = 0;
    const view = (note: string, t: number, i: number) =>
      R.add(note, strips(byStart.map((x, k) => iv(x, k === i ? 'active' : x[0] <= t && x[1] > t ? 'window' : x[1] <= t ? 'done' : undefined)), { ...box, label: 'meetings — the dashed line is now', cursor: t }), arr(starts, { label: 'starts, sorted', marks: marks([i, 'active']) }), arr(ends, { label: 'ends, sorted', marks: marks([Array.from({ length: j }, (_, k) => k), 'done']), ptrs: j < ends.length ? [{ at: j, label: 'next end', role: 'compare' }] : [] }), vars({ busy, best }));
    starts.forEach((s, i) => {
      let freed = 0;
      while (ends[j] <= s) {
        busy--;
        j++;
        freed++;
      }
      busy++;
      best = Math.max(best, busy);
      view(`At ${s} a meeting starts${freed ? `; ${freed} ended by then and gave back ${freed === 1 ? 'its room' : 'their rooms'}` : ''}. Rooms in use: ${busy}.`, s, i);
    });
    R.add(`At the busiest moment ${best} meeting${best === 1 ? '' : 's'} ran at once: ${best} room${best === 1 ? '' : 's'}.`, vars({ answer: [best, 'found'] }));
    return R.done(best);
  },

  'minimum-interval-to-include-each-query': ([list, queries]: [number[][], number[]]) => {
    const R = new Rec();
    const sorted = [...list].sort((a, b) => a[0] - b[0]);
    const box = span(sorted, queries.map((q) => [q, q]));
    const answer = new Array(queries.length).fill(-1);
    const order = queries.map((_, k) => k).sort((a, b) => queries[a] - queries[b]);
    const heap: [number, number, number][] = []; // size, right, index in sorted
    const push = (x: [number, number, number]) => {
      heap.push(x);
      heap.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    };
    const gone = new Set<number>();
    let i = 0;
    const view = (note: string, x: number, pick?: number) =>
      R.add(note, strips(sorted.map((v, k) => iv(v, k === pick ? 'found' : gone.has(k) ? 'done' : heap.some((h) => h[2] === k) ? 'window' : undefined, `size ${v[1] - v[0] + 1}`)), { ...box, label: 'intervals by left end — the line is the query', cursor: x }), arr(heap.map((h) => `${h[0]}→${h[1]}`), { label: 'heap: size→right end, smallest first' }), arr(answer.map((a) => (a < 0 ? '−1' : a)), { label: 'answers, in the queries’ order', marks: marks([queries.indexOf(x), 'active']) }));
    for (const q of order) {
      const x = queries[q];
      const added: string[] = [];
      while (i < sorted.length && sorted[i][0] <= x) {
        push([sorted[i][1] - sorted[i][0] + 1, sorted[i][1], i]);
        added.push(`[${sorted[i].join(', ')}]`);
        i++;
      }
      const dropped: string[] = [];
      while (heap.length && heap[0][1] < x) {
        const h = heap.shift()!;
        gone.add(h[2]);
        dropped.push(`[${sorted[h[2]].join(', ')}]`);
      }
      if (heap.length) answer[q] = heap[0][0];
      view(`Query ${x}.${added.length ? ` ${added.join(', ')} start${added.length === 1 ? 's' : ''} by ${x}: into the heap.` : ''}${dropped.length ? ` ${dropped.join(', ')} ended before ${x}: dropped for good.` : ''} ${heap.length ? `Smallest holding it: size ${heap[0][0]}.` : 'Nothing holds it: −1.'}`, x, heap.length ? heap[0][2] : undefined);
    }
    return R.done(answer);
  },
};
