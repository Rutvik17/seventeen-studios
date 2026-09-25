/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number[]}
 */
function topKFrequent(nums, k) {
  const count = new Map();
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
  // buckets[f] holds every number that appears exactly f times.
  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [x, f] of count) buckets[f].push(x);
  const out = [];
  for (let f = buckets.length - 1; f > 0 && out.length < k; f--) {
    for (const x of buckets[f]) {
      out.push(x);
      if (out.length === k) break;
    }
  }
  return out;
}
