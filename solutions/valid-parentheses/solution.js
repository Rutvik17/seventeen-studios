/**
 * @param {string} s
 * @return {boolean}
 */
function isValid(s) {
  const pairs = { ')': '(', ']': '[', '}': '{' };
  const stack = []; // opening brackets still waiting for their closer
  for (const c of s) {
    if (c in pairs) {
      if (stack.pop() !== pairs[c]) return false;
    } else stack.push(c);
  }
  return stack.length === 0;
}
