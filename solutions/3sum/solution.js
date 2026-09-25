/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function threeSum(nums) {
  nums.sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < nums.length - 2; i++) {
    if (nums[i] > 0) break; // the smallest of the three is positive
    if (i > 0 && nums[i] === nums[i - 1]) continue; // same first number: same triplets
    let l = i + 1;
    let r = nums.length - 1;
    while (l < r) {
      const total = nums[i] + nums[l] + nums[r];
      if (total < 0) l++;
      else if (total > 0) r--;
      else {
        out.push([nums[i], nums[l], nums[r]]);
        l++;
        while (l < r && nums[l] === nums[l - 1]) l++; // skip repeats of the middle number
      }
    }
  }
  return out;
}
