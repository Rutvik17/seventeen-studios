/**
 * @param {string} s
 * @return {number}
 */
function countSubstrings(s) {
  // Manacher's algorithm (see Longest Palindromic Substring): p[i] is the reach of the
  // longest palindrome centred at i in "#a#b#...#". Every shorter one with the same
  // centre is a palindrome too, and there are floor((p[i] + 1) / 2) of them in s.
  const t = `#${[...s].join('#')}#`;
  const n = t.length;
  const p = new Array(n).fill(0);
  let center = 0;
  let right = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    if (i < right) p[i] = Math.min(right - i, p[2 * center - i]);
    while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] === t[i + p[i] + 1]) p[i]++;
    if (i + p[i] > right) [center, right] = [i, i + p[i]];
    count += (p[i] + 1) >> 1;
  }
  return count;
}
