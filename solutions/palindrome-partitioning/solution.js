/**
 * @param {string} s
 * @return {string[][]}
 */
function partition(s) {
  const n = s.length;
  // pal[i][j]: is s[i..j] a palindrome? Its ends match and its inside is one.
  const pal = Array.from({ length: n }, () => new Array(n).fill(false));
  for (let i = n - 1; i >= 0; i--) for (let j = i; j < n; j++) pal[i][j] = s[i] === s[j] && (j - i < 2 || pal[i + 1][j - 1]);
  const out = [];
  const cur = [];
  // s[0..i) is already cut into palindromes.
  const cut = (i) => {
    if (i === n) return out.push([...cur]);
    for (let j = i; j < n; j++) {
      if (!pal[i][j]) continue;
      cur.push(s.slice(i, j + 1));
      cut(j + 1);
      cur.pop();
    }
  };
  cut(0);
  return out;
}
