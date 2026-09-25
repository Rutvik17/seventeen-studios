/**
 * @param {number[]} nums
 * @return {number}
 */
function lengthOfLIS(nums) {
  // tails[k]: the smallest last value of any increasing run of length k + 1 seen so far.
  // tails is itself increasing, so each number finds its place by binary search.
  const tails = [];
  for (const x of nums) {
    let lo = 0;
    let hi = tails.length; // find the first tail >= x
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x; // extends the longest run, or lets a run of length lo + 1 end lower
  }
  return tails.length;
}
