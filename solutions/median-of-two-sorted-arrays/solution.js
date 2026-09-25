/**
 * @param {number[]} nums1
 * @param {number[]} nums2
 * @return {number}
 */
function findMedianSortedArrays(nums1, nums2) {
  const [a, b] = nums1.length <= nums2.length ? [nums1, nums2] : [nums2, nums1]; // search the shorter
  const m = a.length;
  const n = b.length;
  const half = Math.floor((m + n + 1) / 2); // how many elements belong on the left
  let lo = 0;
  let hi = m;
  for (;;) {
    const i = (lo + hi) >> 1; // take i from a and half - i from b for the left side
    const j = half - i;
    const aLeft = i > 0 ? a[i - 1] : -Infinity;
    const aRight = i < m ? a[i] : Infinity;
    const bLeft = j > 0 ? b[j - 1] : -Infinity;
    const bRight = j < n ? b[j] : Infinity;
    if (aLeft <= bRight && bLeft <= aRight) {
      // everything on the left is <= everything on the right
      if ((m + n) % 2) return Math.max(aLeft, bLeft);
      return (Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2;
    }
    if (aLeft > bRight) hi = i - 1; // took too many from a
    else lo = i + 1; // took too few from a
  }
}
