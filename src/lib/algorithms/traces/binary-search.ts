import { Rec, arr, grid, map, vars, marks, range, type Tracer, type Role } from '../trace';

/** An array with lo..hi in play, everything else faded, and the three pointers. */
function view(nums: number[], lo: number, hi: number, mid: number | null, o: { label?: string; hot?: [number | number[], Role][] } = {}) {
  const out = nums.map((_, i) => i).filter((i) => i < lo || i > hi);
  return arr(nums, {
    label: o.label ?? 'nums',
    faded: out,
    range: hi >= lo ? { from: lo, to: hi, role: 'window' } : undefined,
    marks: marks(...(o.hot ?? []), [mid, mid === null ? 'active' : 'active']),
    ptrs: [{ at: lo, label: 'lo', role: 'compare' }, ...(mid !== null ? [{ at: mid, label: 'mid' }] : []), { at: hi, label: 'hi', role: 'compare' }],
  });
}

export const traces: Record<string, Tracer> = {
  'binary-search': ([nums, target]: [number[], number]) => {
    const R = new Rec();
    let lo = 0;
    let hi = nums.length - 1;
    R.add(`Look for ${target}. The whole array is in play.`, view(nums, lo, hi, null), vars({ target }));
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] === target) {
        R.add(`The middle of ${lo}..${hi} is index ${mid}: nums[${mid}] = ${target}. Found.`, view(nums, lo, hi, mid, { hot: [[mid, 'found']] }), vars({ answer: [mid, 'found'] }));
        return R.done(mid);
      }
      if (nums[mid] < target) {
        R.add(`The middle is index ${mid}: ${nums[mid]} < ${target}, so the target can only be to its right. Discard ${lo}..${mid}.`, view(nums, lo, hi, mid), vars({ target }));
        lo = mid + 1;
      } else {
        R.add(`The middle is index ${mid}: ${nums[mid]} > ${target}, so the target can only be to its left. Discard ${mid}..${hi}.`, view(nums, lo, hi, mid), vars({ target }));
        hi = mid - 1;
      }
    }
    R.add(`The range is empty: ${target} is not in the array.`, view(nums, lo, hi, null), vars({ answer: [-1, 'bad'] }));
    return R.done(-1);
  },

  'search-a-2d-matrix': ([matrix, target]: [number[][], number]) => {
    const R = new Rec();
    const rows = matrix.length;
    const cols = matrix[0].length;
    const paint = (lo: number, hi: number, mid: number | null, role: Role = 'active') => {
      const m: Record<string, Role> = {};
      for (let k = 0; k < rows * cols; k++) {
        const key = `${Math.floor(k / cols)},${k % cols}`;
        m[key] = k >= lo && k <= hi ? 'window' : 'done';
      }
      if (mid !== null) m[`${Math.floor(mid / cols)},${mid % cols}`] = role;
      return grid(matrix, { label: 'matrix — read row by row, one sorted list', marks: m });
    };
    let lo = 0;
    let hi = rows * cols - 1;
    R.add(`Read row by row, the ${rows} × ${cols} matrix is one sorted list of ${rows * cols} numbers. Binary search it for ${target}.`, paint(lo, hi, null), vars({ lo, hi }));
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const r = Math.floor(mid / cols);
      const c = mid % cols;
      const v = matrix[r][c];
      if (v === target) {
        R.add(`Position ${mid} is row ${mid} ÷ ${cols} = ${r}, column ${mid} mod ${cols} = ${c}: ${v}. Found.`, paint(lo, hi, mid, 'found'), vars({ answer: [true, 'found'] }));
        return R.done(true);
      }
      R.add(`Position ${mid} is row ${r}, column ${c}: ${v} ${v < target ? '<' : '>'} ${target}, so keep the ${v < target ? 'later' : 'earlier'} half.`, paint(lo, hi, mid), vars({ lo, mid, hi }));
      if (v < target) lo = mid + 1;
      else hi = mid - 1;
    }
    R.add(`Nothing left to search: ${target} is not in the matrix.`, paint(lo, hi, null), vars({ answer: [false, 'bad'] }));
    return R.done(false);
  },

  'koko-eating-bananas': ([piles, h]: [number[], number]) => {
    const R = new Rec();
    let lo = 1;
    let hi = Math.max(...piles);
    const hoursAt = (k: number) => piles.map((p) => Math.ceil(p / k));
    R.add(`Speeds from 1 to ${hi} (the largest pile, one hour each). Too slow below the answer, fast enough from it up — binary search for the line.`, arr(piles, { label: 'piles' }), vars({ lo, hi, h }));
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      const hs = hoursAt(mid);
      const total = hs.reduce((a, b) => a + b, 0);
      const ok = total <= h;
      R.add(`At ${mid} bananas an hour the piles take ${hs.join(' + ')} = ${total} hours. ${ok ? `Within ${h}: fast enough, so the answer is ${mid} or slower.` : `More than ${h}: too slow, so the answer is faster than ${mid}.`}`, arr(piles, { label: 'piles' }), arr(hs, { label: `hours per pile at speed ${mid}`, marks: marks([range(0, hs.length - 1), ok ? 'found' : 'bad']) }), vars({ lo, mid: [mid, ok ? 'found' : 'bad'], hi, total, h }));
      if (ok) hi = mid;
      else lo = mid + 1;
    }
    R.add(`lo and hi meet at ${lo}: the slowest speed that finishes in ${h} hours.`, arr(piles, { label: 'piles' }), arr(hoursAt(lo), { label: `hours per pile at speed ${lo}` }), vars({ answer: [lo, 'found'] }));
    return R.done(lo);
  },

  'find-minimum-in-rotated-sorted-array': ([nums]: [number[]]) => {
    const R = new Rec();
    let lo = 0;
    let hi = nums.length - 1;
    R.add('The minimum is just after the one place the values drop. Compare the middle with the end of the range to find which side the drop is on.', view(nums, lo, hi, null));
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] > nums[hi]) {
        R.add(`nums[mid] = ${nums[mid]} > nums[hi] = ${nums[hi]}: the drop is between them, so the minimum is right of mid.`, view(nums, lo, hi, mid, { hot: [[hi, 'compare']] }));
        lo = mid + 1;
      } else {
        R.add(`nums[mid] = ${nums[mid]} ≤ nums[hi] = ${nums[hi]}: mid..hi is sorted, so the minimum is at mid or to its left.`, view(nums, lo, hi, mid, { hot: [[range(mid, hi), 'found']] }));
        hi = mid;
      }
    }
    R.add(`One element left: the minimum is ${nums[lo]}.`, view(nums, lo, hi, null, { hot: [[lo, 'found']] }), vars({ answer: [nums[lo], 'found'] }));
    return R.done(nums[lo]);
  },

  'search-in-rotated-sorted-array': ([nums, target]: [number[], number]) => {
    const R = new Rec();
    let lo = 0;
    let hi = nums.length - 1;
    R.add(`Look for ${target}. At every split, at least one half is sorted — and a sorted half can be tested by its ends.`, view(nums, lo, hi, null), vars({ target }));
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (nums[mid] === target) {
        R.add(`nums[${mid}] = ${target}. Found.`, view(nums, lo, hi, mid, { hot: [[mid, 'found']] }), vars({ answer: [mid, 'found'] }));
        return R.done(mid);
      }
      if (nums[lo] <= nums[mid]) {
        const inside = nums[lo] <= target && target < nums[mid];
        R.add(`${nums[lo]} ≤ ${nums[mid]}: the left half is sorted, spanning ${nums[lo]}..${nums[mid]}. ${target} is ${inside ? 'inside it — keep the left' : 'not inside it — keep the right'}.`, view(nums, lo, hi, mid, { hot: [[range(lo, mid - 1), 'found']] }), vars({ target }));
        if (inside) hi = mid - 1;
        else lo = mid + 1;
      } else {
        const inside = nums[mid] < target && target <= nums[hi];
        R.add(`${nums[lo]} > ${nums[mid]}: the drop is on the left, so the right half is sorted, spanning ${nums[mid]}..${nums[hi]}. ${target} is ${inside ? 'inside it — keep the right' : 'not inside it — keep the left'}.`, view(nums, lo, hi, mid, { hot: [[range(mid + 1, hi), 'found']] }), vars({ target }));
        if (inside) lo = mid + 1;
        else hi = mid - 1;
      }
    }
    R.add(`The range is empty: ${target} is not in the array.`, view(nums, lo, hi, null), vars({ answer: [-1, 'bad'] }));
    return R.done(-1);
  },

  'time-based-key-value-store': ({ ops, args }: { ops: string[]; args: (string | number)[][] }) => {
    const R = new Rec();
    const store = new Map<string, [number, string][]>();
    const out: (string | null)[] = [];
    const storeView = (hot?: string) => map([...store.entries()].map(([k, v]) => [k, v.map(([t, x]) => `${t}:${x}`).join('  ')]), { label: 'store: key → time:value', marks: hot ? { [hot]: 'active' } : {} });
    ops.forEach((op, k) => {
      const a = args[k];
      if (op === 'TimeMap') {
        out.push(null);
        R.add('An empty store. Each key keeps its (time, value) pairs in the order they were set — which is time order.', storeView());
      } else if (op === 'set') {
        const [key, value, t] = a as [string, string, number];
        if (!store.has(key)) store.set(key, []);
        store.get(key)!.push([t, value]);
        out.push(null);
        R.add(`set("${key}", "${value}", ${t}): append to ${key}'s list. It stays sorted, since times only increase.`, storeView(key));
      } else {
        const [key, t] = a as [string, number];
        const entries = store.get(key) ?? [];
        let lo = 0;
        let hi = entries.length;
        const times = entries.map(([x]) => x);
        if (!entries.length) {
          out.push('');
          R.add(`get("${key}", ${t}): nothing has ever been set for ${key}. Return "".`, storeView(), vars({ returns: ['""', 'found'] }));
          return;
        }
        R.add(`get("${key}", ${t}): binary search ${key}'s times for the first one later than ${t}.`, storeView(key), arr(times, { label: `${key}'s times`, ptrs: [{ at: lo, label: 'lo', role: 'compare' }, { at: hi, label: 'hi', role: 'compare' }] }));
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          const le = times[mid] <= t;
          R.add(`Time ${times[mid]} is ${le ? `at or before ${t}: the first later one is further right` : `after ${t}: it could be the first later one`}.`, arr(times, { label: `${key}'s times`, marks: marks([mid, le ? 'found' : 'bad']), ptrs: [{ at: lo, label: 'lo', role: 'compare' }, { at: mid, label: 'mid' }, { at: hi, label: 'hi', role: 'compare' }] }));
          if (le) lo = mid + 1;
          else hi = mid;
        }
        const val = lo > 0 ? entries[lo - 1][1] : '';
        out.push(val);
        R.add(lo > 0 ? `The entry before it, at time ${times[lo - 1]}, is the latest at or before ${t}: "${val}".` : `Every time is after ${t}: return "".`, arr(times, { label: `${key}'s times`, marks: lo > 0 ? marks([lo - 1, 'found']) : {} }), vars({ returns: [`"${val}"`, 'found'] }));
      }
    });
    return R.done(out);
  },

  'median-of-two-sorted-arrays': ([n1, n2]: [number[], number[]]) => {
    const R = new Rec();
    const [a, b, an, bn] = n1.length <= n2.length ? [n1, n2, 'nums1', 'nums2'] : [n2, n1, 'nums2', 'nums1'];
    const m = a.length;
    const n = b.length;
    const half = Math.floor((m + n + 1) / 2);
    let lo = 0;
    let hi = m;
    const cut = (xs: number[], k: number, label: string, role: Role) => arr(xs.length ? xs : ['∅'], { label, index: false, marks: xs.length ? marks([range(0, k - 1), role], [range(k, xs.length - 1), 'done']) : {}, ptrs: xs.length ? [{ at: k, label: 'cut', role: 'path' }] : [] });
    R.add(`${m + n} numbers in all, so the left half holds ${half}. Choose how many come from ${an} (the shorter); the rest come from ${bn}.`, cut(a, 0, `${an} (shorter)`, 'window'), cut(b, 0, bn, 'window'), vars({ half, lo, hi }));
    for (;;) {
      const i = (lo + hi) >> 1;
      const j = half - i;
      const aL = i > 0 ? a[i - 1] : -Infinity;
      const aR = i < m ? a[i] : Infinity;
      const bL = j > 0 ? b[j - 1] : -Infinity;
      const bR = j < n ? b[j] : Infinity;
      const f = (x: number) => (x === Infinity ? '∞' : x === -Infinity ? '−∞' : String(x));
      if (aL <= bR && bL <= aR) {
        const med = (m + n) % 2 ? Math.max(aL, bL) : (Math.max(aL, bL) + Math.min(aR, bR)) / 2;
        R.add(`${i} from ${an} and ${j} from ${bn}: ${f(aL)} ≤ ${f(bR)} and ${f(bL)} ≤ ${f(aR)}, so every number on the left is ≤ every number on the right. ${(m + n) % 2 ? `An odd total: the median is the largest on the left, ${med}.` : `An even total: the median is (${Math.max(aL, bL)} + ${Math.min(aR, bR)}) ÷ 2 = ${med}.`}`, cut(a, i, `${an} (shorter)`, 'found'), cut(b, j, bn, 'found'), vars({ answer: [med, 'found'] }));
        return R.done(med);
      }
      if (aL > bR) {
        R.add(`${i} from ${an}: its left side ends at ${f(aL)}, bigger than ${f(bR)} on ${bn}'s right. Too many from ${an}.`, cut(a, i, `${an} (shorter)`, 'bad'), cut(b, j, bn, 'window'), vars({ i, j, lo, hi }));
        hi = i - 1;
      } else {
        R.add(`${i} from ${an}: ${bn}'s left side ends at ${f(bL)}, bigger than ${f(aR)} on ${an}'s right. Too few from ${an}.`, cut(a, i, `${an} (shorter)`, 'window'), cut(b, j, bn, 'bad'), vars({ i, j, lo, hi }));
        lo = i + 1;
      }
    }
  },
};
