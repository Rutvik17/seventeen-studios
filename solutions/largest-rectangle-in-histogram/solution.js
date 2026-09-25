/**
 * @param {number[]} heights
 * @return {number}
 */
function largestRectangleArea(heights) {
  const stack = []; // [start index, height]; heights increase upward
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const h = i === heights.length ? 0 : heights[i]; // a final 0 flushes the stack
    let start = i;
    while (stack.length && stack[stack.length - 1][1] >= h) {
      const [j, hj] = stack.pop();
      best = Math.max(best, hj * (i - j)); // hj could stretch from j up to i
      start = j; // the new bar can reach back as far as the popped one did
    }
    stack.push([start, h]);
  }
  return best;
}
