/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function permute(nums) {
  const out = [];
  // Positions before k are fixed; choose what goes at k.
  const place = (k) => {
    if (k === nums.length) return out.push([...nums]);
    for (let i = k; i < nums.length; i++) {
      [nums[k], nums[i]] = [nums[i], nums[k]]; // bring nums[i] to position k
      place(k + 1);
      [nums[k], nums[i]] = [nums[i], nums[k]]; // and put it back
    }
  };
  place(0);
  return out;
}
