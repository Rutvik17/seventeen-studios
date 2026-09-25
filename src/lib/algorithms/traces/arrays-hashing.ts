import { Rec, arr, map, vars, marks, type Tracer } from '../trace';

export const traces: Record<string, Tracer> = {
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
};
