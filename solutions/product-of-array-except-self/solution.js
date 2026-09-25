/**
 * @param {number[]} nums
 * @return {number[]}
 */
function productExceptSelf(nums) {
  const n = nums.length;
  const out = new Array(n).fill(1);
  let prefix = 1; // product of everything to the left of i
  for (let i = 0; i < n; i++) {
    out[i] = prefix;
    prefix *= nums[i];
  }
  let suffix = 1; // product of everything to the right of i
  for (let i = n - 1; i >= 0; i--) {
    out[i] *= suffix;
    suffix *= nums[i];
  }
  return out.map((x) => x + 0); // turn any -0 into 0
}
