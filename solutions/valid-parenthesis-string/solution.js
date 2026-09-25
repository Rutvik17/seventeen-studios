/**
 * @param {string} s
 * @return {boolean}
 */
function checkValidString(s) {
  // Track the range of possible counts of unclosed "(": each "*" may be "(", ")" or nothing.
  let lo = 0;
  let hi = 0;
  for (const c of s) {
    lo += c === '(' ? 1 : -1;
    hi += c === ')' ? -1 : 1;
    if (hi < 0) return false; // even reading every "*" as "(" leaves too many ")"
    lo = Math.max(lo, 0); // a count below zero is not a real reading; drop it
  }
  return lo === 0; // some reading closes everything
}
