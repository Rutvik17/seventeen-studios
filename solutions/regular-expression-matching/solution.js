/**
 * @param {string} s
 * @param {string} p
 * @return {boolean}
 */
function isMatch(s, p) {
  const m = s.length;
  const n = p.length;
  // match[i][j]: does s[i..] match p[j..]? Filled from the ends back to the start.
  const match = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(false));
  match[m][n] = true; // nothing matches nothing
  for (let i = m; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      const first = i < m && (p[j] === s[i] || p[j] === '.'); // does s[i] match the pattern's next letter?
      if (j + 1 < n && p[j + 1] === '*') {
        // "x*": use it zero times (skip it), or match one letter and stay on it
        match[i][j] = match[i][j + 2] || (first && match[i + 1][j]);
      } else {
        match[i][j] = first && match[i + 1][j + 1];
      }
    }
  }
  return match[0][0];
}
