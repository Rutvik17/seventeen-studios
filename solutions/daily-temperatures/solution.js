/**
 * @param {number[]} temperatures
 * @return {number[]}
 */
function dailyTemperatures(temperatures) {
  const out = new Array(temperatures.length).fill(0);
  const stack = []; // days still waiting for a warmer one; their temperatures decrease
  temperatures.forEach((t, i) => {
    while (stack.length && temperatures[stack[stack.length - 1]] < t) {
      const j = stack.pop();
      out[j] = i - j; // day i is the first warmer day after day j
    }
    stack.push(i);
  });
  return out;
}
