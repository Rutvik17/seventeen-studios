/**
 * @param {number[]} nums
 * @return {number}
 */
function maxCoins(nums) {
  const v = [1, ...nums, 1]; // the imaginary 1s at both ends
  const n = v.length;
  // best[l][r]: the most coins from bursting every balloon strictly between l and r.
  // Choose k, the LAST of them to burst: at that moment its neighbours are l and r.
  const best = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let gap = 2; gap < n; gap++) {
    // shorter ranges first
    for (let l = 0; l + gap < n; l++) {
      const r = l + gap;
      for (let k = l + 1; k < r; k++) best[l][r] = Math.max(best[l][r], best[l][k] + v[l] * v[k] * v[r] + best[k][r]);
    }
  }
  return best[0][n - 1];
}
