const swap = (a, i, j) => ([a[i], a[j]] = [a[j], a[i]]);

/**
 * @param {number[]} nums
 * @param {number} k
 * @return {number}
 */
function findKthLargest(nums, k) {
  // Quickselect: the k-th largest is the one that would sit at index n - k if sorted.
  const target = nums.length - k;
  let lo = 0;
  let hi = nums.length - 1;
  for (;;) {
    const pivot = nums[lo + Math.floor(Math.random() * (hi - lo + 1))]; // a random pivot defeats adversarial inputs
    // Three-way partition of lo..hi: < pivot, then == pivot, then > pivot.
    let lt = lo;
    let i = lo;
    let gt = hi;
    while (i <= gt) {
      if (nums[i] < pivot) swap(nums, lt++, i++);
      else if (nums[i] > pivot) swap(nums, gt--, i);
      else i++;
    }
    if (target < lt) hi = lt - 1; // it is among the smaller ones
    else if (target > gt) lo = gt + 1; // among the larger ones
    else return pivot; // it lands in the block equal to the pivot
  }
}
