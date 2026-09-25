/**
 * @param {string} s
 * @param {string} t
 * @return {number}
 */
function numDistinct(s, t) {
  // ways[j]: ways to pick t[0..j) from the part of s read so far. Each new letter of s can
  // either be skipped, or — if it equals t[j - 1] — end a copy of t[0..j).
  // Only the final answer is sure to fit in 32 bits, so add modulo 2^32 (>>> 0): additions
  // wrapped that way still give the right final value.
  const ways = new Array(t.length + 1).fill(0);
  ways[0] = 1; // the empty t is picked one way
  for (const ch of s) {
    for (let j = t.length; j >= 1; j--) if (t[j - 1] === ch) ways[j] = (ways[j] + ways[j - 1]) >>> 0; // downwards, so this letter is used once
  }
  return ways[t.length];
}
