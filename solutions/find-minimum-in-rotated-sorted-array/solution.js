/**
 * @param {number[]} nums
 * @return {number}
 */
function findMin(nums) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is to the right of mid
    else hi = mid; // mid..hi is sorted: the minimum is at mid or to its left
  }
  return nums[lo];
}
