/**
 * @param {number[]} piles
 * @param {number} h
 * @return {number}
 */
function minEatingSpeed(piles, h) {
  const hours = (k) => piles.reduce((t, p) => t + Math.ceil(p / k), 0);
  let lo = 1;
  let hi = Math.max(...piles); // at max(piles) every pile takes one hour
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (hours(mid) <= h) hi = mid; // fast enough: maybe slower still works
    else lo = mid + 1; // too slow
  }
  return lo;
}
