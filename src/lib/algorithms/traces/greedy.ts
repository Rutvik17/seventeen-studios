import { Rec, arr, bars, grid, map, vars, results, marks, range, type Tracer, type Role } from '../trace';

export const traces: Record<string, Tracer> = {
  'maximum-subarray': ([nums]: [number[]]) => {
    const R = new Rec();
    let here = nums[0];
    let best = nums[0];
    let start = 0;
    let span: [number, number] = [0, 0];
    const view = (note: string, i: number) => R.add(note, arr(nums, { label: 'nums', index: true, range: { from: start, to: i, role: 'window' }, marks: marks([range(span[0], span[1]), 'found'], [i, 'active']) }), vars({ here, best }));
    view(`Start with ${nums[0]}: the only run ending at index 0.`, 0);
    for (let i = 1; i < nums.length; i++) {
      const x = nums[i];
      const fresh = x > here + x;
      const note = fresh ? `${here} + ${x} = ${here + x} is worse than ${x} alone — the run so far only drags it down. Start again at ${i}.` : `Extend the run: ${here} + ${x} = ${here + x}.`;
      if (fresh) start = i;
      here = Math.max(x, here + x);
      if (here > best) {
        best = here;
        span = [start, i];
      }
      view(note + (best === here && span[1] === i ? ' The best yet.' : ''), i);
    }
    return R.done(best);
  },

  'jump-game': ([nums]: [number[]]) => {
    const R = new Rec();
    let reach = 0;
    const view = (note: string, i: number, bad = false) => R.add(note, bars(nums, { label: 'jump length at each index', marks: marks([range(0, Math.min(reach, nums.length - 1)), 'window'], [i, bad ? 'bad' : 'active'], [nums.length - 1, reach >= nums.length - 1 ? 'found' : 'compare']), ptrs: [{ at: i, label: 'i' }, { at: Math.min(reach, nums.length - 1), label: 'reach', role: 'found' }] }), vars({ reach }));
    view('Everything up to `reach` can be reached. Start: only index 0.', 0);
    for (let i = 0; i < nums.length; i++) {
      if (i > reach) {
        view(`Index ${i} is past reach ${reach}: nothing can jump this gap.`, i, true);
        return R.done(false);
      }
      const before = reach;
      reach = Math.max(reach, i + nums[i]);
      view(reach > before ? `From ${i}, jump up to ${nums[i]}: reach grows to ${reach}.` : `From ${i}, ${i} + ${nums[i]} = ${i + nums[i]} adds nothing.`, i);
      if (reach >= nums.length - 1) {
        view(`Reach ${reach} covers the last index, ${nums.length - 1}.`, i);
        return R.done(true);
      }
    }
    return R.done(true);
  },

  'jump-game-ii': ([nums]: [number[]]) => {
    const R = new Rec();
    let jumps = 0;
    let end = 0;
    let far = 0;
    let from = 0;
    const view = (note: string, i: number) => R.add(note, bars(nums, { label: 'jump length at each index', marks: marks([range(from, Math.min(end, nums.length - 1)), 'window'], [i, 'active'], [nums.length - 1, 'compare']), ptrs: [{ at: i, label: 'i' }, { at: Math.min(end, nums.length - 1), label: 'end', role: 'compare' }, { at: Math.min(far, nums.length - 1), label: 'far', role: 'found' }] }), vars({ jumps }));
    view('Round by round: the window holds the indices reached with the jumps so far. Scanning it finds how far one more jump goes.', 0);
    for (let i = 0; i < nums.length - 1; i++) {
      far = Math.max(far, i + nums[i]);
      if (i === end) {
        jumps++;
        from = end + 1;
        end = far;
        view(`The window ends at ${i}. One more jump: the next window reaches ${end}. Jumps: ${jumps}.`, i);
      } else view(`${i} + ${nums[i]} = ${i + nums[i]}: far is ${far}.`, i);
    }
    R.add(`The last index is inside the window after ${jumps} jump${jumps === 1 ? '' : 's'}.`, vars({ answer: [jumps, 'found'] }));
    return R.done(jumps);
  },

  'gas-station': ([gas, cost]: [number[], number[]]) => {
    const R = new Rec();
    const diff = gas.map((g, i) => g - cost[i]);
    const total = diff.reduce((a, b) => a + b, 0);
    let tank = 0;
    let start = 0;
    const view = (note: string, i: number, bad = false) => R.add(note, arr(gas, { label: 'gas', index: true }), arr(cost, { label: 'cost to the next' }), arr(diff, { label: 'gas − cost', marks: marks([range(start, i), 'window'], [i, bad ? 'bad' : 'active']), ptrs: [{ at: Math.min(start, gas.length - 1), label: 'start', role: 'found' }] }), vars({ tank, total }));
    view(`In total the stations give ${total >= 0 ? `${total} more than the trip costs` : `${-total} less than the trip costs`}.${total < 0 ? ' No start can work.' : ''}`, -1);
    if (total < 0) return R.done(-1);
    for (let i = 0; i < gas.length; i++) {
      tank += diff[i];
      if (tank < 0) {
        view(`At ${i} the tank is ${tank}: a start anywhere from ${start} to ${i} runs dry here. Try ${i + 1}.`, i, true);
        start = i + 1;
        tank = 0;
      } else view(`At ${i}: tank ${tank}.`, i);
    }
    R.add(`The total is enough, so the last restart works: station ${start}.`, vars({ answer: [start, 'found'] }));
    return R.done(start);
  },

  'hand-of-straights': ([hand, g]: [number[], number]) => {
    const R = new Rec();
    if (hand.length % g) {
      R.add(`${hand.length} cards cannot make groups of ${g}.`, arr(hand, { label: 'hand' }), vars({ answer: [false, 'bad'] }));
      return R.done(false);
    }
    const count = new Map<number, number>();
    for (const c of hand) count.set(c, (count.get(c) ?? 0) + 1);
    const keys = [...count.keys()].sort((a, b) => a - b);
    const groups: string[] = [];
    const view = (note: string, hot: number[] = [], role: Role = 'active') => R.add(note, map(keys.map((k) => [k, count.get(k)!]), { label: 'card → copies left', marks: Object.fromEntries(hot.map((k) => [k, role])) }), results('groups', groups));
    view(`Count the cards. The smallest left must always start a group of ${g}.`);
    for (const card of keys) {
      const n = count.get(card)!;
      if (!n) continue;
      const need = range(card, card + g - 1);
      const short = need.find((x) => (count.get(x) ?? 0) < n);
      if (short !== undefined) {
        view(`${n} group${n === 1 ? '' : 's'} must start at ${card}, needing ${n} × ${short} — there ${(count.get(short) ?? 0) === 1 ? 'is' : 'are'} only ${count.get(short) ?? 0}.`, need, 'bad');
        return R.done(false);
      }
      for (const x of need) count.set(x, count.get(x)! - n);
      for (let k = 0; k < n; k++) groups.push(need.join('-'));
      view(`${card} is the smallest left, with ${n} cop${n === 1 ? 'y' : 'ies'}: ${n} group${n === 1 ? '' : 's'} ${need.join(', ')}.`, need, 'found');
    }
    return R.done(true);
  },

  'merge-triplets-to-form-target-triplet': ([ts, target]: [number[][], number[]]) => {
    const R = new Rec();
    const got = [false, false, false];
    const status: string[] = ts.map(() => '');
    const view = (note: string, i: number) => {
      const m: Record<string, Role> = {};
      ts.forEach((t, r) =>
        t.forEach((v, c) => {
          if (status[r] === 'skip') m[`${r},${c}`] = v > target[c] ? 'bad' : 'done';
          else if (status[r] === 'use') m[`${r},${c}`] = v === target[c] ? 'found' : 'window';
        }),
      );
      R.add(note, grid(ts, { label: 'triplets', marks: m, rows: ts.map((_, r) => (status[r] === 'skip' ? '✗' : status[r] === 'use' ? '✓' : String(r))) }), arr(target, { label: 'target', marks: marks([[0, 1, 2].filter((k) => got[k]), 'found']) }));
    };
    view('Merging only raises values, so a triplet above the target anywhere is useless. Every other one is safe to merge.', -1);
    ts.forEach((t, i) => {
      if (t.some((v, k) => v > target[k])) {
        status[i] = 'skip';
        view(`[${t.join(', ')}] goes above the target — merging it would overshoot. Skip.`, i);
        return;
      }
      status[i] = 'use';
      const hits = [0, 1, 2].filter((k) => t[k] === target[k]);
      hits.forEach((k) => (got[k] = true));
      view(`[${t.join(', ')}] is safe.${hits.length ? ` It supplies position${hits.length === 1 ? '' : 's'} ${hits.join(', ')}.` : ' It matches no position, but does no harm.'}`, i);
    });
    const ok = got.every(Boolean);
    R.add(ok ? 'All three positions are supplied: the target can be made.' : `Position${got.filter((x) => !x).length === 1 ? '' : 's'} ${[0, 1, 2].filter((k) => !got[k]).join(', ')} never reached: no.`, vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },

  'partition-labels': ([s]: [string]) => {
    const R = new Rec();
    const last = new Map<string, number>();
    [...s].forEach((c, i) => last.set(c, i));
    const sizes: number[] = [];
    let start = 0;
    let end = 0;
    const cuts: number[] = [];
    R.add('First, where each letter appears for the last time.', map([...last.entries()].sort((a, b) => a[1] - b[1]), { label: 'letter → last position' }));
    [...s].forEach((c, i) => {
      const grew = last.get(c)! > end;
      end = Math.max(end, last.get(c)!);
      const cut = i === end;
      if (cut) {
        sizes.push(end - start + 1);
        cuts.push(i);
      }
      R.add(cut ? `Reached ${end}: every letter in this part is finished. Cut — a part of ${end - start + 1}.` : grew ? `“${c}” appears again at ${last.get(c)}: the part must stretch to ${end}.` : `“${c}”: its last appearance is inside the part already.`, arr([...s], { label: 's', index: true, range: { from: start, to: end, role: cut ? 'found' : 'window' }, marks: marks([i, 'active'], [range(0, start - 1), 'done']), ptrs: [{ at: i, label: 'i' }, { at: end, label: 'end', role: 'compare' }] }), results('part sizes', sizes.map(String)));
      if (cut) start = i + 1;
    });
    return R.done(sizes);
  },

  'valid-parenthesis-string': ([s]: [string]) => {
    const R = new Rec();
    let lo = 0;
    let hi = 0;
    const view = (note: string, i: number, role: Role = 'active') => R.add(note, arr([...s], { label: 's', index: true, marks: marks([i, role], [range(0, i - 1), 'done']) }), vars({ lo, hi }));
    view('lo and hi bound how many ( could still be open: lo if every * closes, hi if every * opens.', -1);
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      lo += c === '(' ? 1 : -1;
      hi += c === ')' ? -1 : 1;
      if (hi < 0) {
        view(`“${c}”: even with every * as “(”, a “)” has nothing to close. Impossible.`, i, 'bad');
        return R.done(false);
      }
      const clipped = lo < 0;
      lo = Math.max(lo, 0);
      view(`“${c}”: ${c === '(' ? 'both go up' : c === ')' ? 'both go down' : 'lo down (as “)”), hi up (as “(”)'}.${clipped ? ' lo below 0 is no real reading — back to 0.' : ''}`, i);
    }
    const ok = lo === 0;
    R.add(ok ? '0 is in the range: some reading closes everything.' : `Even at best, ${lo} “(” stay open.`, vars({ answer: [ok, ok ? 'found' : 'bad'] }));
    return R.done(ok);
  },
};
