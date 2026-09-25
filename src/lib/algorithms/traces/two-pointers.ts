import { Rec, arr, bars, vars, marks, results, fmt, range, type Tracer, type Role } from '../trace';

export const traces: Record<string, Tracer> = {
  'valid-palindrome': ([s]: [string]) => {
    const R = new Rec();
    const chars = [...s].map((c) => (c === ' ' ? '␣' : c));
    const skipped = new Set<number>();
    const matched = new Set<number>();
    const alnum = (c: string) => /[a-z0-9]/i.test(c);
    const view = (l: number, r: number, extra: [number[], Role][] = []) => arr(chars, { label: 's', marks: marks([[...skipped], 'done'], [[...matched], 'found'], ...extra), ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] });
    let l = 0;
    let r = s.length - 1;
    R.add('One pointer at each end. Skip anything that is not a letter or digit; compare the rest, ignoring case.', view(l, r));
    while (l < r) {
      if (!alnum(s[l])) {
        skipped.add(l);
        R.add(`'${chars[l]}' is not a letter or digit: step l past it.`, view(l, r, [[[l], 'bad']]));
        l++;
      } else if (!alnum(s[r])) {
        skipped.add(r);
        R.add(`'${chars[r]}' is not a letter or digit: step r past it.`, view(l, r, [[[r], 'bad']]));
        r--;
      } else if (s[l].toLowerCase() !== s[r].toLowerCase()) {
        R.add(`'${s[l]}' and '${s[r]}' differ. Not a palindrome.`, view(l, r, [[[l, r], 'bad']]), vars({ answer: [false, 'bad'] }));
        return R.done(false);
      } else {
        matched.add(l);
        matched.add(r);
        R.add(`'${s[l]}' and '${s[r]}' match. Move both inward.`, view(l, r, [[[l, r], 'active']]));
        l++;
        r--;
      }
    }
    R.add('The pointers met: every pair matched. A palindrome.', view(l, r), vars({ answer: [true, 'found'] }));
    return R.done(true);
  },

  'two-sum-ii-input-array-is-sorted': ([nums, target]: [number[], number]) => {
    const R = new Rec();
    let l = 0;
    let r = nums.length - 1;
    const out = new Set<number>();
    const view = (m: [number[], Role][] = []) => arr(nums, { label: 'numbers (sorted)', marks: marks([[...out], 'done'], ...m), ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] });
    R.add(`Start with the smallest and largest. Target ${target}.`, view());
    while (l < r) {
      const sum = nums[l] + nums[r];
      if (sum === target) {
        R.add(`${nums[l]} + ${nums[r]} = ${target}. Found: positions ${l + 1} and ${r + 1}, counting from 1.`, view([[[l, r], 'found']]), vars({ sum: [sum, 'found'], target }));
        return R.done([l + 1, r + 1]);
      }
      if (sum < target) {
        R.add(`${nums[l]} + ${nums[r]} = ${sum}, too small. ${nums[l]} plus even the largest is too small, so ${nums[l]} is out: l moves right.`, view([[[l], 'bad'], [[r], 'compare']]), vars({ sum: [sum, 'bad'], target }));
        out.add(l);
        l++;
      } else {
        R.add(`${nums[l]} + ${nums[r]} = ${sum}, too big. ${nums[r]} plus even the smallest is too big, so ${nums[r]} is out: r moves left.`, view([[[l], 'active'], [[r], 'bad']]), vars({ sum: [sum, 'bad'], target }));
        out.add(r);
        r--;
      }
    }
    return R.done([]);
  },

  '3sum': ([input]: [number[]]) => {
    const R = new Rec();
    const nums = [...input].sort((a, b) => a - b);
    const out: number[][] = [];
    const found = () => results('triplets found', out.map((t) => fmt(t)));
    R.add(`Sort the numbers: ${fmt(nums)}. Then fix a first number and find the other two with two pointers.`, arr(nums, { label: 'nums (sorted)' }), found());
    for (let i = 0; i < nums.length - 2; i++) {
      if (nums[i] > 0) {
        R.add(`nums[${i}] = ${nums[i]} is positive: three numbers this large cannot sum to 0. Stop.`, arr(nums, { label: 'nums (sorted)', marks: marks([range(i, nums.length - 1), 'done']), ptrs: [{ at: i, label: 'i' }] }), found());
        break;
      }
      if (i > 0 && nums[i] === nums[i - 1]) {
        R.add(`nums[${i}] = ${nums[i]} is the same as the previous first number — it would find the same triplets. Skip.`, arr(nums, { label: 'nums (sorted)', marks: marks([i, 'done']), ptrs: [{ at: i, label: 'i' }] }), found());
        continue;
      }
      let l = i + 1;
      let r = nums.length - 1;
      R.add(`Fix ${nums[i]}. Now look for two numbers after it adding to ${-nums[i]}.`, arr(nums, { label: 'nums (sorted)', marks: marks([i, 'path']), ptrs: [{ at: i, label: 'i', role: 'path' }, { at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] }), found());
      while (l < r) {
        const sum = nums[i] + nums[l] + nums[r];
        const view = (m: Role) => arr(nums, { label: 'nums (sorted)', marks: marks([i, 'path'], [[l, r], m]), ptrs: [{ at: i, label: 'i', role: 'path' }, { at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] });
        if (sum < 0) {
          R.add(`${nums[i]} + ${nums[l]} + ${nums[r]} = ${sum}, below 0: move l right for a bigger number.`, view('active'), found());
          l++;
        } else if (sum > 0) {
          R.add(`${nums[i]} + ${nums[l]} + ${nums[r]} = ${sum}, above 0: move r left for a smaller number.`, view('active'), found());
          r--;
        } else {
          out.push([nums[i], nums[l], nums[r]]);
          R.add(`${nums[i]} + ${nums[l]} + ${nums[r]} = 0. Record it, then move l past any copies of ${nums[l]}.`, view('found'), results('triplets found', out.map((t) => fmt(t)), { marks: { [out.length - 1]: 'new' } }));
          l++;
          while (l < r && nums[l] === nums[l - 1]) l++;
        }
      }
    }
    R.add(`Done: ${out.length} triplet${out.length === 1 ? '' : 's'}, none repeated.`, arr(nums, { label: 'nums (sorted)' }), results('triplets found', out.map((t) => fmt(t)), { marks: Object.fromEntries(out.map((_, k) => [k, 'found'])) }));
    return R.done(out);
  },

  'container-with-most-water': ([h]: [number[]]) => {
    const R = new Rec();
    let l = 0;
    let r = h.length - 1;
    let best = 0;
    let bestAt: [number, number] = [0, 0];
    R.add('Start with the widest container: the two outermost lines.', bars(h, { label: 'height', ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] }), vars({ best }));
    while (l < r) {
      const water = (r - l) * Math.min(h[l], h[r]);
      const better = water > best;
      if (better) {
        best = water;
        bestAt = [l, r];
      }
      const short = h[l] < h[r] ? l : r;
      R.add(`Width ${r - l} × height min(${h[l]}, ${h[r]}) = ${water}.${better ? ' A new best.' : ''} The shorter wall is at ${short}; moving the taller one could only lose, so move ${short === l ? 'l' : 'r'}.`, bars(h, { label: 'height', marks: marks([[l, r], 'active'], [short, 'bad']), ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }], area: { from: l, to: r, h: Math.min(h[l], h[r]), role: better ? 'found' : 'window' } }), vars({ water, best: [best, better ? 'found' : 'active'] }));
      if (h[l] < h[r]) l++;
      else r--;
    }
    R.add(`The pointers met. The most water is ${best}, between lines ${bestAt[0]} and ${bestAt[1]}.`, bars(h, { label: 'height', marks: marks([bestAt, 'found']), area: { from: bestAt[0], to: bestAt[1], h: Math.min(h[bestAt[0]], h[bestAt[1]]), role: 'found' } }), vars({ answer: [best, 'found'] }));
    return R.done(best);
  },

  'trapping-rain-water': ([h]: [number[]]) => {
    const R = new Rec();
    const water = new Array(h.length).fill(0);
    let l = 0;
    let r = h.length - 1;
    let leftMax = 0;
    let rightMax = 0;
    let total = 0;
    R.add('Water above a bar rises to the lower of the tallest walls on its left and right. Walk in from both ends.', bars(h, { label: 'height', water, ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] }), vars({ leftMax, rightMax, total }));
    while (l < r) {
      if (h[l] < h[r]) {
        leftMax = Math.max(leftMax, h[l]);
        water[l] = leftMax - h[l];
        total += water[l];
        R.add(`height[l] = ${h[l]} < height[r] = ${h[r]}: there is a taller wall on the right, so the left level is leftMax = ${leftMax}. Bar ${l} holds ${leftMax} − ${h[l]} = ${water[l]}.`, bars(h, { label: 'height', water: [...water], marks: marks([l, 'active']), ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] }), vars({ leftMax: [leftMax, 'active'], rightMax, total }));
        l++;
      } else {
        rightMax = Math.max(rightMax, h[r]);
        water[r] = rightMax - h[r];
        total += water[r];
        R.add(`height[r] = ${h[r]} ≤ height[l] = ${h[l]}: there is a wall as tall on the left, so the right level is rightMax = ${rightMax}. Bar ${r} holds ${rightMax} − ${h[r]} = ${water[r]}.`, bars(h, { label: 'height', water: [...water], marks: marks([r, 'active']), ptrs: [{ at: l, label: 'l' }, { at: r, label: 'r', role: 'compare' }] }), vars({ leftMax, rightMax: [rightMax, 'active'], total }));
        r--;
      }
    }
    R.add(`The pointers met. ${total} unit${total === 1 ? '' : 's'} of water trapped.`, bars(h, { label: 'height', water }), vars({ answer: [total, 'found'] }));
    return R.done(total);
  },
};
