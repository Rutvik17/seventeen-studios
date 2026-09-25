/**
 * @param {number[]} nums
 * @return {number[][]}
 */
function subsets(nums) {
  const out = [];
  const cur = [];
  // Decide about nums[i], then everything after it.
  const choose = (i) => {
    if (i === nums.length) return out.push([...cur]);
    cur.push(nums[i]); // with nums[i]
    choose(i + 1);
    cur.pop(); // undo, then without it
    choose(i + 1);
  };
  choose(0);
  return out;
}
