/**
 * @param {number[][]} triplets
 * @param {number[]} target
 * @return {boolean}
 */
function mergeTriplets(triplets, target) {
  // A triplet with any value above the target's can never be used: merging only raises.
  // Merge every other one; the target is reachable exactly when each position is hit.
  const got = [false, false, false];
  for (const t of triplets) {
    if (t.some((v, i) => v > target[i])) continue;
    t.forEach((v, i) => {
      if (v === target[i]) got[i] = true;
    });
  }
  return got.every(Boolean);
}
