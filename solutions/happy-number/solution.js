/**
 * @param {number} n
 * @return {boolean}
 */
function isHappy(n) {
  // The sum of the squares of x's digits.
  const step = (x) => {
    let total = 0;
    for (; x > 0; x = Math.floor(x / 10)) total += (x % 10) ** 2;
    return total;
  };
  // The numbers either reach 1 or fall into a loop. Floyd's tortoise and hare finds out
  // without remembering them: fast moves two steps for each one of slow.
  let slow = n;
  let fast = step(n);
  while (fast !== 1 && slow !== fast) {
    slow = step(slow);
    fast = step(step(fast));
  }
  return fast === 1;
}
