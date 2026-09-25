/**
 * @param {string} s
 * @param {number} k
 * @return {number}
 */
function characterReplacement(s, k) {
  const count = new Array(26).fill(0);
  let l = 0;
  let most = 0; // the highest count of one letter the window has reached
  for (let r = 0; r < s.length; r++) {
    most = Math.max(most, ++count[s.charCodeAt(r) - 65]);
    // Letters to replace = window length - most common letter. Too many? Slide.
    if (r - l + 1 - most > k) count[s.charCodeAt(l++) - 65]--;
  }
  return s.length - l; // the window never shrinks, so its final size is the best
}
