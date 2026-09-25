import { Rec, arr, map, vars, marks, queue, range, fmt, type Tracer, type Role } from '../trace';

const chars = (s: string) => [...s].map((c) => (c === ' ' ? '␣' : c));

export const traces: Record<string, Tracer> = {
  'best-time-to-buy-and-sell-stock': ([prices]: [number[]]) => {
    const R = new Rec();
    let low = 0;
    let best = 0;
    let bestPair: [number, number] | null = null;
    R.add('Walk the days, remembering the cheapest day so far. Selling today earns today’s price minus that.', arr(prices, { label: 'prices' }), vars({ lowest: prices[0], best }));
    for (let i = 0; i < prices.length; i++) {
      if (prices[i] < prices[low]) {
        low = i;
        R.add(`Day ${i}: ${prices[i]} is the cheapest yet. Any later sale is best bought here.`, arr(prices, { label: 'prices', marks: marks([i, 'compare']), ptrs: [{ at: i, label: 'buy', role: 'compare' }] }), vars({ lowest: [prices[low], 'compare'], best }));
        continue;
      }
      const profit = prices[i] - prices[low];
      const better = profit > best;
      if (better) {
        best = profit;
        bestPair = [low, i];
      }
      R.add(`Day ${i}: sell at ${prices[i]}, bought at ${prices[low]}: profit ${profit}.${better ? ' The best so far.' : ''}`, arr(prices, { label: 'prices', marks: marks([range(low, i), 'window'], [low, 'compare'], [i, better ? 'found' : 'active']), ptrs: [{ at: low, label: 'buy', role: 'compare' }, { at: i, label: 'sell' }] }), vars({ profit, best: [best, better ? 'found' : 'active'] }));
    }
    R.add(bestPair ? `Best: buy on day ${bestPair[0]} at ${prices[bestPair[0]]}, sell on day ${bestPair[1]} at ${prices[bestPair[1]]}, for ${best}.` : 'Prices only fell: no trade makes money, so the answer is 0.', arr(prices, { label: 'prices', marks: bestPair ? marks([bestPair, 'found']) : {} }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },

  'longest-substring-without-repeating-characters': ([s]: [string]) => {
    const R = new Rec();
    const last = new Map<string, number>();
    let l = 0;
    let best = 0;
    let bestAt = [0, -1];
    const c = chars(s);
    if (!s.length) {
      R.add('The string is empty: the longest substring has length 0.', vars({ answer: [0, 'found'] }));
      return R.done(0);
    }
    R.add('Grow a window to the right. If the new character is already inside it, move the left edge past the earlier copy.', arr(c, { label: 's' }), map(last, { label: 'last seen at' }));
    for (let r = 0; r < s.length; r++) {
      const ch = s[r];
      const prev = last.get(ch);
      let note: string;
      if (prev !== undefined && prev >= l) {
        note = `'${c[r]}' is already in the window, at ${prev}. Move l to ${prev + 1}, just past it.`;
        l = prev + 1;
      } else note = `'${c[r]}' is not in the window. Extend it.`;
      last.set(ch, r);
      const len = r - l + 1;
      const better = len > best;
      if (better) {
        best = len;
        bestAt = [l, r];
      }
      R.add(`${note} The window "${s.slice(l, r + 1)}" has length ${len}.${better ? ' A new best.' : ''}`, arr(c, { label: 's', range: { from: l, to: r, role: better ? 'found' : 'window' }, marks: marks([r, 'active'], [prev !== undefined && prev + 1 === l ? prev : null, 'bad']), ptrs: [{ at: l, label: 'l', role: 'compare' }, { at: r, label: 'r' }] }), map(last, { label: 'last seen at', marks: { [ch]: 'new' } }), vars({ length: len, best: [best, better ? 'found' : 'active'] }));
    }
    R.add(`The longest substring without a repeat is "${s.slice(bestAt[0], bestAt[1] + 1)}", length ${best}.`, arr(c, { label: 's', range: { from: bestAt[0], to: bestAt[1], role: 'found' } }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },

  'longest-repeating-character-replacement': ([s, k]: [string, number]) => {
    const R = new Rec();
    const count = new Map<string, number>();
    let l = 0;
    let most = 0;
    R.add(`A window is fine if it needs at most k = ${k} changes: its length minus the count of its most common letter.`, arr([...s], { label: 's' }), map(count, { label: 'counts in window' }), vars({ most, k }));
    for (let r = 0; r < s.length; r++) {
      count.set(s[r], (count.get(s[r]) ?? 0) + 1);
      most = Math.max(most, count.get(s[r])!);
      const len = r - l + 1;
      const changes = len - most;
      if (changes > k) {
        R.add(`Adding '${s[r]}': length ${len} − most common ${most} = ${changes} changes, more than ${k}. Slide the window: drop '${s[l]}' from the left.`, arr([...s], { label: 's', range: { from: l, to: r, role: 'window' }, marks: marks([r, 'active'], [l, 'bad']), ptrs: [{ at: l, label: 'l', role: 'compare' }, { at: r, label: 'r' }] }), map(count, { label: 'counts in window', marks: { [s[l]]: 'bad' } }), vars({ most, changes: [changes, 'bad'], k }));
        count.set(s[l], count.get(s[l])! - 1);
        l++;
      } else {
        R.add(`Adding '${s[r]}': length ${len} − most common ${most} = ${changes} change${changes === 1 ? '' : 's'}, within ${k}. The window grows to ${len}.`, arr([...s], { label: 's', range: { from: l, to: r, role: 'found' }, marks: marks([r, 'active']), ptrs: [{ at: l, label: 'l', role: 'compare' }, { at: r, label: 'r' }] }), map(count, { label: 'counts in window', marks: { [s[r]]: 'new' } }), vars({ most, changes: [changes, 'found'], k }));
      }
    }
    const ans = s.length - l;
    R.add(`The window never shrank below its best size, so its final size, ${ans}, is the answer.`, arr([...s], { label: 's', range: { from: l, to: s.length - 1, role: 'found' } }), vars({ answer: [ans, 'found'] }));
    return R.done(ans);
  },

  'permutation-in-string': ([s1, s2]: [string, string]) => {
    const R = new Rec();
    const n = s1.length;
    const need = new Map<string, number>();
    for (const c of s1) need.set(c, (need.get(c) ?? 0) + 1);
    if (n > s2.length) {
      R.add(`s1 is longer than s2, so no stretch of s2 can hold it.`, arr([...s2], { label: 's2' }), vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    let missing = n;
    const needView = (hot?: string, role: Role = 'active') => map([...need.entries()], { label: 'still needed', marks: hot ? { [hot]: role } : {} });
    R.add(`Slide a window of exactly ${n} letters over s2. It is a rearrangement of "${s1}" when nothing is missing.`, arr([...s1], { label: 's1', index: false }), arr([...s2], { label: 's2' }), needView(), vars({ missing }));
    for (let r = 0; r < s2.length; r++) {
      const c = s2[r];
      const wanted = (need.get(c) ?? 0) > 0;
      if (wanted) missing--;
      need.set(c, (need.get(c) ?? 0) - 1);
      let note = `'${c}' enters: ${wanted ? 'it was needed' : 'not needed'}.`;
      let out: string | null = null;
      if (r >= n) {
        out = s2[r - n];
        need.set(out, need.get(out)! + 1);
        if (need.get(out)! > 0) {
          missing++;
          note += ` '${out}' leaves, and is needed again.`;
        } else note += ` '${out}' leaves.`;
      }
      const l = Math.max(0, r - n + 1);
      const hit = missing === 0;
      R.add(`${note} ${hit ? 'Nothing is missing — this window is a rearrangement of s1.' : `${missing} still missing.`}`, arr([...s1], { label: 's1', index: false }), arr([...s2], { label: 's2', range: { from: l, to: r, role: hit ? 'found' : 'window' }, marks: marks([r, 'active'], [out !== null ? r - n : null, 'done']), ptrs: [{ at: r, label: 'r' }] }), needView(c, wanted ? 'found' : 'bad'), vars({ missing: [missing, hit ? 'found' : 'active'] }));
      if (hit) return R.done(true);
    }
    R.add('The window reached the end without ever matching. No rearrangement of s1 appears in s2.', arr([...s2], { label: 's2' }), vars({ answer: [false, 'bad'] }));
    return R.done(false);
  },

  'minimum-window-substring': ([s, t]: [string, string]) => {
    const R = new Rec();
    const need = new Map<string, number>();
    for (const c of t) need.set(c, (need.get(c) ?? 0) + 1);
    const tracked = [...new Set(t)].sort();
    const needView = (hot?: string) => map(tracked.map((c) => [c, need.get(c)!]), { label: `still needed from "${t}"`, marks: hot && need.has(hot) ? { [hot]: 'active' } : {} });
    let missing = t.length;
    let best: [number, number] | null = null;
    let l = 0;
    R.add('Expand the window to the right until it covers every character of t; then shrink it from the left while it still does.', arr([...s], { label: 's' }), needView(), vars({ missing }));
    for (let r = 0; r < s.length; r++) {
      const c = s[r];
      const wanted = (need.get(c) ?? 0) > 0;
      if (need.has(c)) need.set(c, need.get(c)! - 1);
      if (wanted) missing--;
      R.add(`'${c}' enters${wanted ? ' — one that t needs' : ''}. ${missing} character${missing === 1 ? '' : 's'} of t still uncovered.`, arr([...s], { label: 's', range: { from: l, to: r, role: 'window' }, marks: marks([r, 'active']), ptrs: [{ at: l, label: 'l', role: 'compare' }, { at: r, label: 'r' }] }), needView(c), vars({ missing, best: best ? `"${s.slice(best[0], best[1] + 1)}"` : '—' }));
      while (missing === 0) {
        const better = !best || r - l < best[1] - best[0];
        if (better) best = [l, r];
        const d = s[l];
        R.add(`The window "${s.slice(l, r + 1)}" covers t.${better ? ' The smallest so far.' : ''} Try shrinking: drop '${d}'.`, arr([...s], { label: 's', range: { from: l, to: r, role: 'found' }, marks: marks([l, 'bad']), ptrs: [{ at: l, label: 'l', role: 'compare' }, { at: r, label: 'r' }] }), needView(d), vars({ missing, best: [`"${s.slice(best![0], best![1] + 1)}"`, 'found'] }));
        if (need.has(d)) {
          need.set(d, need.get(d)! + 1);
          if (need.get(d)! > 0) missing++;
        }
        l++;
      }
    }
    const ans = best ? s.slice(best[0], best[1] + 1) : '';
    R.add(ans ? `The smallest window covering t is "${ans}".` : 'No window ever covered t, so the answer is "".', arr([...s], { label: 's', range: best ? { from: best[0], to: best[1], role: 'found' } : undefined }), vars({ answer: [`"${ans}"`, 'found'] }));
    return R.done(ans);
  },

  'sliding-window-maximum': ([nums, k]: [number[], number]) => {
    const R = new Rec();
    const dq: number[] = [];
    const out: number[] = [];
    const dqView = (role?: Role) => queue(dq.map((i) => `${nums[i]} @${i}`), { label: 'deque (values decrease, front is max)', marks: role && dq.length ? { 0: role } : {} });
    R.add(`A window of ${k} slides right. The deque keeps candidate indices, largest value at the front.`, arr(nums, { label: 'nums' }), dqView(), arr(out, { label: 'answer', index: false }));
    for (let i = 0; i < nums.length; i++) {
      const popped: number[] = [];
      while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) popped.push(dq.pop()!);
      dq.push(i);
      let note = popped.length ? `${nums[i]} arrives and beats ${popped.map((j) => nums[j]).join(', ')} at the back — they can never be a maximum again. Push ${nums[i]}.` : `${nums[i]} arrives. Push it at the back.`;
      if (dq[0] <= i - k) {
        const gone = dq.shift()!;
        note += ` The front, index ${gone}, has left the window: drop it.`;
      }
      const l = Math.max(0, i - k + 1);
      if (i >= k - 1) {
        out.push(nums[dq[0]]);
        note += ` The window's maximum is the front: ${nums[dq[0]]}.`;
      }
      R.add(note, arr(nums, { label: 'nums', range: { from: l, to: i, role: 'window' }, marks: marks([i, 'active'], [dq[0], 'found']), ptrs: [{ at: i, label: 'i' }] }), dqView('found'), arr(out, { label: 'answer', index: false, marks: i >= k - 1 ? marks([out.length - 1, 'new']) : {} }));
    }
    R.add(`Every window seen: ${fmt(out)}.`, arr(nums, { label: 'nums' }), arr(out, { label: 'answer', index: false, marks: marks([range(0, out.length - 1), 'found']) }));
    return R.done(out);
  },
};
