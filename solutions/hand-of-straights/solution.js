/**
 * @param {number[]} hand
 * @param {number} groupSize
 * @return {boolean}
 */
function isNStraightHand(hand, groupSize) {
  if (hand.length % groupSize) return false;
  const count = new Map();
  for (const c of hand) count.set(c, (count.get(c) ?? 0) + 1);
  // The smallest card left must start a run — nothing smaller is left to come before it.
  for (const card of [...count.keys()].sort((a, b) => a - b)) {
    const n = count.get(card);
    if (n === 0) continue;
    for (let x = card; x < card + groupSize; x++) {
      // n runs start here, each needing card..card+size-1
      if ((count.get(x) ?? 0) < n) return false;
      count.set(x, count.get(x) - n);
    }
  }
  return true;
}
