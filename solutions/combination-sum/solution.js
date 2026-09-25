/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
function combinationSum(candidates, target) {
  candidates.sort((a, b) => a - b); // so a candidate too big means every later one is too
  const out = [];
  const cur = [];
  // Add candidates from index start on; left: what is still needed.
  const pick = (start, left) => {
    if (left === 0) return out.push([...cur]);
    for (let i = start; i < candidates.length && candidates[i] <= left; i++) {
      cur.push(candidates[i]);
      pick(i, left - candidates[i]); // i, not i + 1: the same number may be used again
      cur.pop();
    }
  };
  pick(0, target);
  return out;
}
