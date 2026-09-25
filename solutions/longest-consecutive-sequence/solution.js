/**
 * @param {number[]} nums
 * @return {number}
 */
function longestConsecutive(nums) {
  const have = new Set(nums);
  let best = 0;
  for (const x of have) {
    if (have.has(x - 1)) continue; // not the start of a run
    let length = 1;
    while (have.has(x + length)) length++;
    best = Math.max(best, length);
  }
  return best;
}
