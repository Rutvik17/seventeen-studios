/**
 * @param {number} n
 * @return {string[]}
 */
function generateParenthesis(n) {
  const out = [];
  const path = [];
  const build = (opened, closed) => {
    if (path.length === 2 * n) {
      out.push(path.join(''));
      return;
    }
    if (opened < n) {
      // an opener is allowed while any remain
      path.push('(');
      build(opened + 1, closed);
      path.pop();
    }
    if (closed < opened) {
      // a closer is allowed only if it has an opener to match
      path.push(')');
      build(opened, closed + 1);
      path.pop();
    }
  };
  build(0, 0);
  return out;
}
