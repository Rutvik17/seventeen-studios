/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function subsetsWithDup(nums) {
  nums.sort((a, b) => a - b); // equal values side by side
  const out = [];
  const cur = [];
  // cur is a subset; try adding each later value to it.
  const extend = (start) => {
    out.push([...cur]);
    for (let i = start; i < nums.length; i++) {
      if (i > start && nums[i] === nums[i - 1]) continue; // the same value in the same place would repeat a subset
      cur.push(nums[i]);
      extend(i + 1);
      cur.pop();
    }
  };
  extend(0);
  return out;
}
