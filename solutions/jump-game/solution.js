/**
 * @param {number[]} nums
 * @return {boolean}
 */
function canJump(nums) {
  let reach = 0; // the furthest index reachable so far
  for (let i = 0; i < nums.length; i++) {
    if (i > reach) return false; // a gap nothing can jump across
    reach = Math.max(reach, i + nums[i]);
  }
  return true;
}
