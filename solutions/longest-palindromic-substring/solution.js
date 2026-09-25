/**
 * @param {string} s
 * @return {string}
 */
function longestPalindrome(s) {
  // Manacher's algorithm. Put "#" between the letters so every palindrome has a middle:
  // "abba" becomes "#a#b#b#a#". p[i] is how far the palindrome centred at i reaches.
  const t = `#${[...s].join('#')}#`;
  const n = t.length;
  const p = new Array(n).fill(0);
  let center = 0; // the palindrome reaching furthest right so far
  let right = 0;
  let best = 0;
  for (let i = 0; i < n; i++) {
    if (i < right) p[i] = Math.min(right - i, p[2 * center - i]); // its mirror image already knows this much
    while (i - p[i] - 1 >= 0 && i + p[i] + 1 < n && t[i - p[i] - 1] === t[i + p[i] + 1]) p[i]++;
    if (i + p[i] > right) [center, right] = [i, i + p[i]];
    if (p[i] > p[best]) best = i;
  }
  const start = (best - p[best]) / 2; // back from "#" positions to positions in s
  return s.slice(start, start + p[best]);
}
