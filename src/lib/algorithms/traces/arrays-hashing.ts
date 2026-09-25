import { Rec, arr, grid, map, set, vars, marks, results, fmt, type Tracer, type Role } from '../trace';

const letters = 'abcdefghijklmnopqrstuvwxyz';

export const traces: Record<string, Tracer> = {
  'contains-duplicate': ([nums]: [number[]]) => {
    const R = new Rec();
    const seen = new Set<number>();
    R.add('Walk the array once, keeping every number seen so far in a set.', arr(nums, { label: 'nums' }), set(seen, { label: 'seen' }));
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      if (seen.has(x)) {
        R.add(`${x} is already in the set — it appeared before. Duplicate found.`, arr(nums, { label: 'nums', marks: marks([nums.indexOf(x), 'found'], [i, 'bad']), ptrs: [{ at: i, label: 'i', role: 'bad' }] }), set(seen, { label: 'seen', marks: { [x]: 'bad' } }), vars({ answer: [true, 'found'] }));
        return R.done(true);
      }
      seen.add(x);
      R.add(`${x} is new: add it to the set.`, arr(nums, { label: 'nums', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), set(seen, { label: 'seen', marks: { [x]: 'new' } }));
    }
    R.add('The walk ended and every number was new. No duplicate.', arr(nums, { label: 'nums', marks: marks([nums.map((_, i) => i), 'done']) }), set(seen, { label: 'seen' }), vars({ answer: [false, 'found'] }));
    return R.done(false);
  },

  'valid-anagram': ([s, t]: [string, string]) => {
    const R = new Rec();
    const count = new Array(26).fill(0);
    const used = () => [...new Set([...s, ...t])].sort();
    const show = (hot: string[] = [], role: Role = 'active') => map(used().map((c) => [c, count[c.charCodeAt(0) - 97]]), { label: 'count per letter (s adds, t subtracts)', marks: Object.fromEntries(hot.map((c) => [c, role])) });
    if (s.length !== t.length) {
      R.add(`s has ${s.length} letters and t has ${t.length}. Different lengths can never be anagrams.`, arr([...s], { label: 's' }), arr([...t], { label: 't' }), vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    R.add('Count letters: each letter of s adds one, each letter of t takes one away.', arr([...s], { label: 's' }), arr([...t], { label: 't' }), show());
    for (let i = 0; i < s.length; i++) {
      count[s.charCodeAt(i) - 97]++;
      count[t.charCodeAt(i) - 97]--;
      R.add(`s[${i}] = '${s[i]}' adds one; t[${i}] = '${t[i]}' takes one away.`, arr([...s], { label: 's', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), arr([...t], { label: 't', marks: marks([i, 'compare']), ptrs: [{ at: i, label: 'i', role: 'compare' }] }), show([s[i], t[i]]));
    }
    const off = used().filter((c) => count[c.charCodeAt(0) - 97] !== 0);
    const ok = off.length === 0;
    R.add(ok ? 'Every counter is back to zero: the same letters, the same number of times. An anagram.' : `Not every counter is zero (${off.join(', ')}): the letters differ. Not an anagram.`, arr([...s], { label: 's' }), arr([...t], { label: 't' }), show(ok ? used() : off, ok ? 'found' : 'bad'), vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },

  'two-sum': ([nums, target]: [number[], number]) => {
    const R = new Rec();
    const seen = new Map<number, number>();
    R.add(`We want two numbers adding to ${target}. Walk left to right, remembering each number's index in a hash map.`, arr(nums, { label: 'nums' }), map(seen, { label: 'seen: value → index' }));
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      const need = target - x;
      R.add(`At index ${i}, x = ${x}. Its partner would be ${target} − ${x} = ${need}. Have we seen ${need}?`, arr(nums, { label: 'nums', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), map(seen, { label: 'seen: value → index', marks: seen.has(need) ? { [need]: 'found' } : {} }), vars({ x, need: [need, 'compare'] }));
      if (seen.has(need)) {
        const j = seen.get(need)!;
        R.add(`Yes — ${need} was at index ${j}. ${need} + ${x} = ${target}, so the answer is [${j}, ${i}].`, arr(nums, { label: 'nums', marks: marks([[j, i], 'found']), ptrs: [{ at: j, label: 'j', role: 'found' }, { at: i, label: 'i', role: 'found' }] }), map(seen, { label: 'seen: value → index', marks: { [need]: 'found' } }));
        return R.done([j, i]);
      }
      seen.set(x, i);
      R.add(`No. Store ${x} → ${i} so a later number can find it, and move on.`, arr(nums, { label: 'nums', marks: marks([i, 'visited']), ptrs: [{ at: i, label: 'i' }] }), map(seen, { label: 'seen: value → index', marks: { [x]: 'new' } }));
    }
    return R.done([]);
  },

  'group-anagrams': ([strs]: [string[]]) => {
    const R = new Rec();
    const groups = new Map<string, string[]>();
    const sig = (w: string) => {
      const c = new Array(26).fill(0);
      for (const ch of w) c[ch.charCodeAt(0) - 97]++;
      return c.map((n, i) => (n ? `${letters[i]}${n}` : '')).join('') || '∅';
    };
    const show = (hot?: string, role: Role = 'new') => map([...groups.entries()].map(([k, v]) => [k, `[${v.join(', ')}]`]), { label: 'signature → group', marks: hot ? { [hot]: role } : {} });
    R.add('Give each word a signature — how many of each letter it has. Anagrams share a signature.', arr(strs.map((w) => w || '""'), { label: 'strs' }), show());
    strs.forEach((w, i) => {
      const k = sig(w);
      const existed = groups.has(k);
      if (!existed) groups.set(k, []);
      groups.get(k)!.push(w);
      R.add(`"${w}" has letters ${k === '∅' ? '(none)' : k.replace(/([a-z])(\d+)/g, '$1×$2 ').trim()}. ${existed ? 'That signature exists — join its group.' : 'A new signature — start a group.'}`, arr(strs.map((x) => x || '""'), { label: 'strs', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'word' }] }), show(k, existed ? 'found' : 'new'));
    });
    const out = [...groups.values()];
    R.add(`Every word placed: ${out.length} group${out.length === 1 ? '' : 's'}.`, results('groups', out.map((g) => fmt(g))));
    return R.done(out);
  },

  'top-k-frequent-elements': ([nums, k]: [number[], number]) => {
    const R = new Rec();
    const count = new Map<number, number>();
    R.add(`Find the ${k} most frequent value${k > 1 ? 's' : ''}. First, count every value.`, arr(nums, { label: 'nums' }), map(count, { label: 'count' }));
    nums.forEach((x, i) => {
      count.set(x, (count.get(x) ?? 0) + 1);
      R.add(`${x} has now been seen ${count.get(x)} time${count.get(x) === 1 ? '' : 's'}.`, arr(nums, { label: 'nums', marks: marks([i, 'active']), ptrs: [{ at: i, label: 'i' }] }), map(count, { label: 'count', marks: { [x]: 'new' } }));
    });
    const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
    for (const [x, f] of count) buckets[f].push(x);
    const bucketRow = () => buckets.map((b) => (b.length ? b.join(',') : '·'));
    R.add('Now bucket sort: bucket f holds the values seen exactly f times. No count can exceed n, so n + 1 buckets always suffice.', arr(bucketRow(), { label: 'buckets[f]' }), map(count, { label: 'count' }));
    const out: number[] = [];
    for (let f = buckets.length - 1; f > 0 && out.length < k; f--) {
      if (!buckets[f].length) continue;
      for (const x of buckets[f]) {
        if (out.length === k) break;
        out.push(x);
        R.add(`Reading buckets from the top: bucket ${f} gives ${x}.`, arr(bucketRow(), { label: 'buckets[f]', marks: marks([f, 'active']), ptrs: [{ at: f, label: 'f' }] }), results('answer', out.map(String), { marks: { [out.length - 1]: 'new' } }));
      }
    }
    R.add(`The ${k} most frequent: ${fmt(out)}.`, arr(bucketRow(), { label: 'buckets[f]' }), results('answer', out.map(String), { marks: Object.fromEntries(out.map((_, i) => [i, 'found'])) }));
    return R.done(out);
  },

  'product-of-array-except-self': ([nums]: [number[]]) => {
    const R = new Rec();
    const n = nums.length;
    const out: (number | null)[] = new Array(n).fill(null);
    let prefix = 1;
    R.add('answer[i] = (product of everything left of i) × (product of everything right of i). First pass: left to right.', arr(nums, { label: 'nums' }), arr(out, { label: 'answer' }), vars({ prefix }));
    for (let i = 0; i < n; i++) {
      out[i] = prefix;
      R.add(`Everything left of index ${i} multiplies to ${prefix}. Write it, then multiply in nums[${i}] = ${nums[i]}.`, arr(nums, { label: 'nums', marks: marks([[...Array(i).keys()], 'window'], [i, 'active']), ptrs: [{ at: i, label: 'i' }] }), arr(out, { label: 'answer', marks: marks([i, 'new']) }), vars({ prefix: [prefix, 'active'] }));
      prefix *= nums[i];
    }
    let suffix = 1;
    R.add('Second pass, right to left, multiplying in the product of everything to the right.', arr(nums, { label: 'nums' }), arr(out, { label: 'answer' }), vars({ suffix }));
    for (let i = n - 1; i >= 0; i--) {
      const before = out[i] as number;
      out[i] = before * suffix + 0;
      R.add(`Everything right of index ${i} multiplies to ${suffix}: answer[${i}] = ${before} × ${suffix} = ${out[i]}.`, arr(nums, { label: 'nums', marks: marks([[...Array(n - i - 1).keys()].map((k) => i + 1 + k), 'window'], [i, 'active']), ptrs: [{ at: i, label: 'i' }] }), arr(out, { label: 'answer', marks: marks([i, 'found']) }), vars({ suffix: [suffix, 'active'] }));
      suffix *= nums[i];
    }
    R.add(`Done, with no division: ${fmt(out)}.`, arr(nums, { label: 'nums' }), arr(out, { label: 'answer', marks: marks([[...out.keys()], 'found']) }));
    return R.done(out);
  },

  'valid-sudoku': ([board]: [string[][]]) => {
    const R = new Rec(260);
    const rows = Array.from({ length: 9 }, () => new Set<string>());
    const cols = Array.from({ length: 9 }, () => new Set<string>());
    const boxes = Array.from({ length: 9 }, () => new Set<string>());
    const cells = board.map((r) => r.map((c) => (c === '.' ? null : c)));
    const boxShade = (r: number, c: number): Role | undefined => ((Math.floor(r / 3) + Math.floor(c / 3)) % 2 ? undefined : 'done');
    const base = (): Record<string, Role> => {
      const m: Record<string, Role> = {};
      for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) if (boxShade(r, c)) m[`${r},${c}`] = boxShade(r, c)!;
      return m;
    };
    R.add('Scan every filled cell. Each belongs to one row, one column and one 3 × 3 box; none may already hold its digit.', grid(cells, { label: 'board', marks: base() }));
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++) {
        const d = board[r][c];
        if (d === '.') continue;
        const b = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        const m = base();
        for (let k = 0; k < 9; k++) {
          m[`${r},${k}`] = 'window';
          m[`${k},${c}`] = 'window';
        }
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) m[`${Math.floor(r / 3) * 3 + i},${Math.floor(c / 3) * 3 + j}`] = 'window';
        m[`${r},${c}`] = 'active';
        const clash = rows[r].has(d) ? 'row' : cols[c].has(d) ? 'column' : boxes[b].has(d) ? 'box' : null;
        if (clash) {
          for (let k = 0; k < 9; k++) {
            if (clash === 'row' && board[r][k] === d) m[`${r},${k}`] = 'bad';
            if (clash === 'column' && board[k][c] === d) m[`${k},${c}`] = 'bad';
          }
          if (clash === 'box') for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) if (board[Math.floor(r / 3) * 3 + i][Math.floor(c / 3) * 3 + j] === d) m[`${Math.floor(r / 3) * 3 + i},${Math.floor(c / 3) * 3 + j}`] = 'bad';
          R.add(`${d} at row ${r}, column ${c}: its ${clash} already has a ${d}. The board is invalid.`, grid(cells, { label: 'board', marks: m }), vars({ answer: [false, 'bad'] }));
          return R.done(false);
        }
        rows[r].add(d);
        cols[c].add(d);
        boxes[b].add(d);
        R.add(`${d} at row ${r}, column ${c} (box ${b}): new to its row, column and box. Record it in all three.`, grid(cells, { label: 'board', marks: m }), vars({ [`row ${r}`]: [...rows[r]].sort().join(''), [`col ${c}`]: [...cols[c]].sort().join(''), [`box ${b}`]: [...boxes[b]].sort().join('') }));
      }
    R.add('Every filled cell checked, and no row, column or box repeats a digit. Valid.', grid(cells, { label: 'board', marks: base() }), vars({ answer: [true, 'found'] }));
    return R.done(true);
  },

  'encode-and-decode-strings': ([strs]: [string[]]) => {
    const R = new Rec();
    let enc = '';
    R.add('Encode: write each string as its length, a #, then the string itself.', arr(strs.map((s) => `"${s}"`), { label: 'strs' }), vars({ encoded: '""' }));
    strs.forEach((s, i) => {
      enc += `${s.length}#${s}`;
      R.add(`"${s}" has ${s.length} character${s.length === 1 ? '' : 's'}: append "${s.length}#${s}".`, arr(strs.map((x) => `"${x}"`), { label: 'strs', marks: marks([i, 'active']) }), arr([...enc], { label: 'encoded', index: false, marks: marks([[...Array(`${s.length}#${s}`.length).keys()].map((k) => enc.length - `${s.length}#${s}`.length + k), 'new']) }));
    });
    const out: string[] = [];
    let i = 0;
    R.add('Decode: read digits up to the first #, which gives the length n; the next n characters are the string — whatever they contain.', arr([...enc], { label: 'encoded' }), results('decoded', []));
    while (i < enc.length) {
      const j = enc.indexOf('#', i);
      const n = Number(enc.slice(i, j));
      R.add(`Digits "${enc.slice(i, j)}" before the # at ${j}: the next string has ${n} character${n === 1 ? '' : 's'}.`, arr([...enc], { label: 'encoded', marks: marks([[...Array(j - i).keys()].map((k) => i + k), 'compare'], [j, 'active']), ptrs: [{ at: i, label: 'i' }, { at: j, label: '#', role: 'compare' }] }), results('decoded', out.map((s) => `"${s}"`)));
      out.push(enc.slice(j + 1, j + 1 + n));
      R.add(`Take "${out[out.length - 1]}", then continue after it.`, arr([...enc], { label: 'encoded', marks: marks([[...Array(n).keys()].map((k) => j + 1 + k), 'found']), ptrs: [{ at: j + 1 + n, label: 'next' }] }), results('decoded', out.map((s) => `"${s}"`), { marks: { [out.length - 1]: 'new' } }));
      i = j + 1 + n;
    }
    R.add(strs.length ? 'The list comes back exactly as it went in.' : 'An empty list encodes to an empty string, and decodes back to an empty list.', results('decoded', out.map((s) => `"${s}"`), { marks: Object.fromEntries(out.map((_, k) => [k, 'found'])) }));
    return R.done(out);
  },

  'longest-consecutive-sequence': ([nums]: [number[]]) => {
    const R = new Rec();
    const have = new Set(nums);
    const sorted = [...have].sort((a, b) => a - b);
    let best = 0;
    R.add('Put every number in a set, so “is x here?” is one step. (Shown in order only to make runs easy to see.)', set(sorted, { label: 'the set' }), vars({ best }));
    for (const x of have) {
      if (have.has(x - 1)) {
        R.add(`${x}: ${x - 1} is present, so ${x} is not the start of a run. Skip it — its run is counted from the start.`, set(sorted, { label: 'the set', marks: { [x]: 'done', [x - 1]: 'compare' } }), vars({ best }));
        continue;
      }
      let len = 1;
      const m: Record<string, Role> = { [x]: 'active' };
      R.add(`${x}: ${x - 1} is absent, so a run starts here. Count upward.`, set(sorted, { label: 'the set', marks: m }), vars({ run: len, best }));
      while (have.has(x + len)) {
        m[x + len] = 'window';
        len++;
        R.add(`${x + len - 1} is present: the run is ${len} long.`, set(sorted, { label: 'the set', marks: { ...m } }), vars({ run: len, best }));
      }
      const improved = len > best;
      best = Math.max(best, len);
      R.add(`${x + len} is absent: this run ends at length ${len}.${improved ? ' A new best.' : ''}`, set(sorted, { label: 'the set', marks: Object.fromEntries(Object.keys(m).map((k) => [k, improved ? 'found' : 'visited'])) }), vars({ run: len, best: [best, improved ? 'found' : 'active'] }));
    }
    R.add(`The longest run has length ${best}.`, set(sorted, { label: 'the set' }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },
};
