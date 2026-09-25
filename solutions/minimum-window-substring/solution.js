/**
 * @param {string} s
 * @param {string} t
 * @return {string}
 */
function minWindow(s, t) {
  const need = new Array(128).fill(0); // how many more of each character the window needs
  for (const c of t) need[c.charCodeAt(0)]++;
  let missing = t.length; // characters of t not yet covered by the window
  let start = 0;
  let len = Infinity;
  for (let l = 0, r = 0; r < s.length; r++) {
    if (need[s.charCodeAt(r)]-- > 0) missing--;
    while (missing === 0) {
      // The window covers t: record it, then shrink it from the left.
      if (r - l + 1 < len) {
        start = l;
        len = r - l + 1;
      }
      if (++need[s.charCodeAt(l++)] > 0) missing++;
    }
  }
  return len === Infinity ? '' : s.slice(start, start + len);
}
