/**
 * @param {number[]} nums
 * @return {number}
 */
function jump(nums) {
  // Breadth-first in disguise: indices reachable in `jumps` jumps form a window ending
  // at `end`; scanning it finds how far one more jump can reach (`far`).
  let jumps = 0;
  let end = 0;
  let far = 0;
  for (let i = 0; i < nums.length - 1; i++) {
    far = Math.max(far, i + nums[i]);
    if (i === end) {
      // the window is used up: jump once more
      jumps++;
      end = far;
    }
  }
  return jumps;
}
