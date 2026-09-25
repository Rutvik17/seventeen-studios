import { Rec, arr, vars, results, marks, range, type Tracer, type Role, type Val } from '../trace';

/** Manacher's reach for every centre of "#s0#s1#…#", recorded step by step when asked. */
function manacher(s: string, R?: Rec, label = 's with # between the letters') {
  const t = ['#', ...[...s].flatMap((c) => [c, '#'])];
  const n = t.length;
  const p = new Array(n).fill(0);
  let center = 0;
  let right = 0;
  for (let i = 0; i < n; i++) {
    const mirror = 2 * center - i;
    let from = 0;
    if (i < right) from = p[i] = Math.min(right - i, p[mirror]);
    while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] === t[i + p[i] + 1]) p[i]++;
    if (R && t[i] !== '#' || (R && p[i] > 0)) {
      R.add(
        i < right && from > 0 ? `Centre ${i} lies inside the palindrome around ${center}, whose mirror ${mirror} reaches ${p[mirror]}: start at ${from}, not 0. It reaches ${p[i]}.` : `Centre ${i}: grow outwards while both sides match — reach ${p[i]}.`,
        arr(t, { label, index: true, range: p[i] ? { from: i - p[i], to: i + p[i], role: 'found' } : undefined, marks: marks([i, 'active'], [i < right && from > 0 ? mirror : null, 'compare']), ptrs: [{ at: i, label: 'i' }, ...(right > 0 ? [{ at: Math.min(right, n - 1), label: 'right', role: 'visited' as Role }] : [])] }),
        arr(p.map((v, k) => (k <= i ? v : '')), { label: 'reach p[i]', marks: marks([i, 'active']) }),
      );
    }
    if (i + p[i] > right) {
      center = i;
      right = i + p[i];
    }
  }
  return { t, p };
}

export const traces: Record<string, Tracer> = {
  'climbing-stairs': ([n]: [number]) => {
    const R = new Rec();
    const ways: Val[] = new Array(n + 1).fill('');
    ways[0] = 1;
    ways[1] = 1;
    R.add('ways(i): the number of ways to stand on step i. One way to be at the bottom, one way to reach step 1.', arr([...ways], { label: 'ways(i)', index: true, marks: marks([[0, 1], 'found']) }));
    for (let i = 2; i <= n; i++) {
      ways[i] = (ways[i - 1] as number) + (ways[i - 2] as number);
      if (i <= 20) R.add(`The last move to step ${i} was from ${i - 1} or from ${i - 2}: ${ways[i - 1]} + ${ways[i - 2]} = ${ways[i]}.`, arr(ways.slice(0, Math.min(n + 1, 21)), { label: 'ways(i)', index: true, marks: marks([[i - 1, i - 2], 'compare'], [i, 'active'], [range(0, i - 3), 'done']) }));
    }
    R.add(`${ways[n]} way${ways[n] === 1 ? '' : 's'} to climb ${n} step${n === 1 ? '' : 's'}.`, vars({ answer: [ways[n], 'found'] }));
    return R.done(ways[n]);
  },

  'min-cost-climbing-stairs': ([cost]: [number[]]) => {
    const R = new Rec();
    const n = cost.length;
    const reach: Val[] = new Array(n + 1).fill('');
    reach[0] = 0;
    reach[1] = 0;
    const view = (note: string, i: number) => R.add(note, arr([...cost, 'top'], { label: 'cost to leave each step', index: true, marks: marks([i >= 2 ? [i - 1, i - 2] : null, 'compare']) }), arr([...reach], { label: 'reach(i): cheapest way to stand on step i', index: true, marks: marks([i, 'active'], [i >= 2 ? [i - 1, i - 2] : null, 'compare']) }));
    view('Starting on step 0 or step 1 is free.', 1);
    for (let i = 2; i <= n; i++) {
      const a = (reach[i - 1] as number) + cost[i - 1];
      const b = (reach[i - 2] as number) + cost[i - 2];
      reach[i] = Math.min(a, b);
      view(`${i === n ? 'The top' : `Step ${i}`}: from ${i - 1} costs ${reach[i - 1]} + ${cost[i - 1]} = ${a}; from ${i - 2} costs ${reach[i - 2]} + ${cost[i - 2]} = ${b}. Take ${reach[i]}.`, i);
    }
    return R.done(reach[n]);
  },

  'house-robber': ([nums]: [number[]]) => {
    const R = new Rec();
    const best: Val[] = nums.map(() => '');
    let p2 = 0;
    let p1 = 0;
    R.add('best(i): the most from houses 0..i. At each house: leave it (best(i − 1)), or rob it and skip its neighbour (best(i − 2) + its money).', arr(nums, { label: 'money in each house', index: true }), arr([...best], { label: 'best(i)', index: true }));
    nums.forEach((x, i) => {
      const skip = p1;
      const take = p2 + x;
      const cur = Math.max(skip, take);
      best[i] = cur;
      R.add(`House ${i}: leave it → ${skip}; rob it → ${p2} + ${x} = ${take}. ${take > skip ? 'Rob it' : 'Leave it'}: ${cur}.`, arr(nums, { label: 'money in each house', index: true, marks: marks([i, take > skip ? 'found' : 'bad']) }), arr([...best], { label: 'best(i)', index: true, marks: marks([i, 'active'], [[i - 1, i - 2].filter((k) => k >= 0), 'compare']) }));
      p2 = p1;
      p1 = cur;
    });
    return R.done(p1);
  },

  'house-robber-ii': ([nums]: [number[]]) => {
    const R = new Rec();
    const n = nums.length;
    if (n === 1) {
      R.add(`One house: take its ${nums[0]}.`, arr(nums, { label: 'houses in a circle' }), vars({ answer: [nums[0], 'found'] }));
      return R.done(nums[0]);
    }
    const line = (from: number, to: number, name: string) => {
      let p2 = 0;
      let p1 = 0;
      const best: Val[] = nums.map(() => '');
      for (let i = from; i <= to; i++) {
        const cur = Math.max(p1, p2 + nums[i]);
        best[i] = cur;
        R.add(`${name}, house ${i}: max(${p1}, ${p2} + ${nums[i]}) = ${cur}.`, arr(nums, { label: 'houses — the first and last are neighbours', index: true, faded: range(0, n - 1).filter((k) => k < from || k > to), marks: marks([i, 'active']) }), arr([...best], { label: 'best so far', index: true, marks: marks([i, 'active']) }));
        p2 = p1;
        p1 = cur;
      }
      return p1;
    };
    R.add('The first and last houses touch, so at most one of them is robbed. Solve the street without the last house, then without the first.', arr(nums, { label: 'houses in a circle', index: true, marks: marks([[0, n - 1], 'bad']) }));
    const a = line(0, n - 2, 'Without the last');
    const b = line(1, n - 1, 'Without the first');
    const ans = Math.max(a, b);
    R.add(`Without the last: ${a}. Without the first: ${b}. The better is ${ans}.`, vars({ 'without last': a, 'without first': b, answer: [ans, 'found'] }));
    return R.done(ans);
  },

  'longest-palindromic-substring': ([s]: [string]) => {
    const R = new Rec();
    R.add(`Put # between the letters of “${s}” and at both ends: now every palindrome has a single middle character.`, arr(['#', ...[...s].flatMap((c) => [c, '#'])], { label: 's with # between the letters', index: true }));
    const { t, p } = manacher(s, R);
    let best = 0;
    for (let i = 0; i < t.length; i++) if (p[i] > p[best]) best = i;
    const start = (best - p[best]) / 2;
    const out = s.slice(start, start + p[best]);
    R.add(`The longest reach is ${p[best]}, around centre ${best}: in s that is ${p[best]} letters from position ${start}, “${out}”.`, arr([...s], { label: 's', index: true, range: { from: start, to: start + p[best] - 1, role: 'found' } }), vars({ answer: [`"${out}"`, 'found'] }));
    return R.done(out);
  },

  'palindromic-substrings': ([s]: [string]) => {
    const R = new Rec();
    R.add(`Put # between the letters of “${s}”. For each centre, find how far its palindrome reaches — every shorter one around the same centre counts too.`, arr(['#', ...[...s].flatMap((c) => [c, '#'])], { label: 's with # between the letters', index: true }));
    const { p } = manacher(s, R);
    const per = p.map((r) => (r + 1) >> 1);
    const total = per.reduce((a, b) => a + b, 0);
    R.add(`A centre reaching r gives ⌈r ÷ 2⌉ palindromes. Adding them all: ${per.filter(Boolean).join(' + ')} = ${total}.`, arr(p, { label: 'reach p[i]' }), arr(per, { label: 'palindromes around each centre', marks: marks([per.map((v, i) => (v ? i : -1)).filter((i) => i >= 0), 'found']) }), vars({ answer: [total, 'found'] }));
    return R.done(total);
  },

  'decode-ways': ([s]: [string]) => {
    const R = new Rec();
    const n = s.length;
    const ways: Val[] = new Array(n + 1).fill('');
    ways[n] = 1;
    const view = (note: string, i: number, two?: boolean) => R.add(note, arr([...s], { label: 'digits', index: true, marks: marks([two ? [i, i + 1] : i < n ? i : null, 'active']) }), arr([...ways], { label: 'ways(i): decodings of s[i..]', index: true, marks: marks([i, 'active'], [i + 1 <= n ? i + 1 : null, 'compare'], [two && i + 2 <= n ? i + 2 : null, 'compare']) }));
    view('ways(i) counts the decodings of the digits from i to the end. The empty end decodes exactly one way.', n);
    for (let i = n - 1; i >= 0; i--) {
      if (s[i] === '0') {
        ways[i] = 0;
        view(`“0” at ${i}: no letter starts with 0, so nothing can be read from here. 0 ways.`, i);
        continue;
      }
      let cur = ways[i + 1] as number;
      const two = i + 1 < n ? Number(s.slice(i, i + 2)) : 0;
      const pair = i + 1 < n && two >= 10 && two <= 26;
      if (pair) cur += ways[i + 2] as number;
      ways[i] = cur;
      view(pair ? `“${s[i]}” as one letter leaves ${ways[i + 1]} way${ways[i + 1] === 1 ? '' : 's'}; “${two}” as one letter leaves ${ways[i + 2]}. Total ${cur}.` : `“${s[i]}” as one letter leaves ${ways[i + 1]}.${i + 1 < n ? ` “${s.slice(i, i + 2)}” is over 26, not a letter.` : ''} Total ${cur}.`, i, pair);
    }
    return R.done(ways[0]);
  },

  'coin-change': ([coins, amount]: [number[], number]) => {
    const R = new Rec();
    const INF = amount + 1;
    const fewest = new Array(amount + 1).fill(INF);
    fewest[0] = 0;
    const show = (x: number, reads: number[] = []) => arr(fewest.map((v) => (v === INF ? '∞' : v)), { label: 'fewest[x]: coins to make x', index: true, marks: marks([x, 'active'], [reads, 'compare']) });
    R.add(`Coins ${coins.join(', ')}. Making 0 takes no coins; everything else starts at ∞ (not yet possible).`, show(0));
    for (let x = 1; x <= amount; x++) {
      const tries: string[] = [];
      const reads: number[] = [];
      for (const c of coins) {
        if (c > x) continue;
        reads.push(x - c);
        tries.push(`${c} → ${fewest[x - c] === INF ? '∞' : `1 + ${fewest[x - c]}`}`);
        if (fewest[x - c] + 1 < fewest[x]) fewest[x] = fewest[x - c] + 1;
      }
      if (R.steps.length < R.max) R.add(`${x}: the last coin could be ${tries.length ? tries.join(', ') : 'none — every coin is bigger'}. ${fewest[x] === INF ? 'Not possible yet.' : `Fewest: ${fewest[x]}.`}`, show(x, reads));
    }
    const ans = fewest[amount] === INF ? -1 : fewest[amount];
    R.add(ans < 0 ? `${amount} cannot be made: −1.` : `${amount} takes ${ans} coin${ans === 1 ? '' : 's'}.`, vars({ answer: [ans, ans < 0 ? 'bad' : 'found'] }));
    return R.done(ans);
  },

  'maximum-product-subarray': ([nums]: [number[]]) => {
    const R = new Rec();
    let hi = nums[0];
    let lo = nums[0];
    let best = nums[0];
    let from = 0;
    let bestRange: [number, number] = [0, 0];
    const his: Val[] = nums.map(() => '');
    const los: Val[] = nums.map(() => '');
    his[0] = hi;
    los[0] = lo;
    const view = (note: string, i: number) => R.add(note, arr(nums, { label: 'nums', index: true, marks: marks([i, 'active']), range: { from: bestRange[0], to: bestRange[1], role: 'found' } }), arr([...his], { label: 'hi: largest product ending here', marks: marks([i, 'active']) }), arr([...los], { label: 'lo: smallest product ending here', marks: marks([i, 'compare']) }), vars({ best }));
    view(`Start with ${nums[0]}: the only run ending at index 0.`, 0);
    for (let i = 1; i < nums.length; i++) {
      const x = nums[i];
      const [a, b] = [hi * x, lo * x];
      const nh = Math.max(x, a, b);
      const nl = Math.min(x, a, b);
      if (nh === x) from = i;
      hi = nh;
      lo = nl;
      his[i] = hi;
      los[i] = lo;
      if (hi > best) {
        best = hi;
        bestRange = [from, i];
      }
      view(`${x}: alone ${x}, hi × ${x} = ${a}, lo × ${x} = ${b}. New hi ${hi}, new lo ${lo}.${x < 0 ? ' The negative number swapped the largest and the smallest.' : ''}`, i);
    }
    return R.done(best);
  },

  'word-break': ([s, dict]: [string, string[]]) => {
    const R = new Rec();
    const words = new Set(dict);
    const longest = Math.max(...dict.map((w) => w.length));
    const ok: boolean[] = [true, ...new Array(s.length).fill(false)];
    const found: string[] = [];
    const show = (i: number, span?: [number, number], role: Role = 'active') =>
      R.add(
        span ? (role === 'found' ? `s[${span[0]}..${span[1]}) = “${s.slice(span[0], span[1])}” is a word, and the first ${span[0]} letters split: so do the first ${span[1]}.` : `Nothing ending at ${i} works.`) : 'ok[i]: can the first i letters be split into words? ok[0] is true — nothing needs no words.',
        arr([...s], { label: 's', index: true, range: span ? { from: span[0], to: span[1] - 1, role } : undefined }),
        arr(ok.map((v) => (v ? '✓' : '·')), { label: 'ok[i]', index: true, marks: marks([ok.map((v, k) => (v ? k : -1)).filter((k) => k >= 0), 'found'], [i, 'active']) }),
        results('words used', found),
      );
    show(0);
    for (let i = 1; i <= s.length; i++) {
      for (let j = Math.max(0, i - longest); j < i; j++) {
        if (ok[j] && words.has(s.slice(j, i))) {
          ok[i] = true;
          found.push(s.slice(j, i));
          show(i, [j, i], 'found');
          break;
        }
      }
    }
    R.add(ok[s.length] ? 'ok at the end of the string: it splits into words.' : 'The end of the string is not reachable: it cannot be split.', vars({ answer: [ok[s.length], ok[s.length] ? 'found' : 'bad'] }));
    return R.done(ok[s.length]);
  },

  'longest-increasing-subsequence': ([nums]: [number[]]) => {
    const R = new Rec();
    const tails: number[] = [];
    R.add('tails[k] is the smallest value an increasing run of length k + 1 can end with. A lower ending leaves more room to grow.', arr(nums, { label: 'nums', index: true }), arr(['∅'], { label: 'tails' }));
    nums.forEach((x, i) => {
      let lo = 0;
      let hi = tails.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (tails[mid] < x) lo = mid + 1;
        else hi = mid;
      }
      const grew = lo === tails.length;
      const old = tails[lo];
      tails[lo] = x;
      R.add(grew ? `${x} is bigger than every tail: it extends the longest run, now ${tails.length} long.` : `The first tail ≥ ${x} is ${old}, at ${lo}: a run of length ${lo + 1} can end at ${x} instead — lower is better.`, arr(nums, { label: 'nums', index: true, marks: marks([i, 'active'], [range(0, i - 1), 'done']) }), arr([...tails], { label: 'tails (binary search finds the place)', index: true, marks: marks([lo, grew ? 'found' : 'active']) }), vars({ length: tails.length }));
    });
    return R.done(tails.length);
  },

  'partition-equal-subset-sum': ([nums]: [number[]]) => {
    const R = new Rec();
    const total = nums.reduce((a, b) => a + b, 0);
    if (total % 2) {
      R.add(`The total is ${total}, which is odd: it cannot split into two equal halves.`, arr(nums, { label: 'nums' }), vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    const half = total / 2;
    const can = new Array(half + 1).fill(false);
    can[0] = true;
    const show = (note: string, i: number, fresh: number[] = []) => R.add(note, arr(nums, { label: 'nums', marks: marks([i, 'active'], [range(0, i - 1), 'done']) }), arr(can.map((v) => (v ? '✓' : '·')), { label: `can[s]: some of them add up to s (target ${half})`, index: true, marks: marks([can.map((v, k) => (v ? k : -1)).filter((k) => k >= 0), 'found'], [fresh, 'new'], [half, can[half] ? 'found' : 'compare']) }));
    show(`The total is ${total}, so each group must add up to ${half}. Which sums can some of the numbers make? Only 0, so far.`, -1);
    for (let i = 0; i < nums.length; i++) {
      const x = nums[i];
      const fresh: number[] = [];
      for (let s = half; s >= x; s--)
        if (!can[s] && can[s - x]) {
          can[s] = true;
          fresh.push(s);
        }
      show(`With ${x}: every reachable sum s gives s + ${x} too${fresh.length ? ` — new: ${fresh.sort((a, b) => a - b).join(', ')}` : ' — nothing new'}. (Updated from the top down, so ${x} is used once.)`, i, fresh);
      if (can[half]) {
        R.add(`${half} is reachable: the rest of the numbers make the other ${half}.`, vars({ answer: [true, 'found'] }));
        return R.done(true);
      }
    }
    R.add(`${half} is never reached: no equal split.`, vars({ answer: [false, 'bad'] }));
    return R.done(false);
  },
};
