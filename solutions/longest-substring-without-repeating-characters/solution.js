/**
 * @param {string} s
 * @return {number}
 */
function lengthOfLongestSubstring(s) {
  const last = new Map(); // character -> index where it was last seen
  let best = 0;
  let l = 0;
  for (let r = 0; r < s.length; r++) {
    const c = s[r];
    if (last.has(c) && last.get(c) >= l) l = last.get(c) + 1; // jump past the earlier copy
    last.set(c, r);
    best = Math.max(best, r - l + 1);
  }
  return best;
}
