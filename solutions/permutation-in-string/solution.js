/**
 * @param {string} s1
 * @param {string} s2
 * @return {boolean}
 */
function checkInclusion(s1, s2) {
  const n = s1.length;
  if (n > s2.length) return false;
  const need = new Array(26).fill(0); // how many more of each letter the window still needs
  for (let i = 0; i < n; i++) need[s1.charCodeAt(i) - 97]++;
  let missing = n; // letters of s1 not yet matched by the window
  for (let r = 0; r < s2.length; r++) {
    if (need[s2.charCodeAt(r) - 97]-- > 0) missing--;
    if (r >= n && ++need[s2.charCodeAt(r - n) - 97] > 0) missing++; // drop the window's first letter
    if (missing === 0) return true;
  }
  return false;
}
