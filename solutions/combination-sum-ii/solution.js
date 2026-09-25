/**
 * @param {number[]} candidates
 * @param {number} target
 * @return {number[][]}
 */
function combinationSum2(candidates, target) {
  candidates.sort((a, b) => a - b); // equal values side by side, and too big means every later one is too
  const out = [];
  const cur = [];
  const pick = (start, left) => {
    if (left === 0) return out.push([...cur]);
    for (let i = start; i < candidates.length && candidates[i] <= left; i++) {
      if (i > start && candidates[i] === candidates[i - 1]) continue; // the same value in the same place would repeat a combination
      cur.push(candidates[i]);
      pick(i + 1, left - candidates[i]); // each candidate used at most once
      cur.pop();
    }
  };
  pick(0, target);
  return out;
}
