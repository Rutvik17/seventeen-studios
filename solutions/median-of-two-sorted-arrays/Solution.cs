public class Solution {
    public double FindMedianSortedArrays(int[] nums1, int[] nums2) {
        if (nums1.Length > nums2.Length) return FindMedianSortedArrays(nums2, nums1); // search the shorter
        int m = nums1.Length, n = nums2.Length, half = (m + n + 1) / 2; // elements on the left
        int lo = 0, hi = m;
        while (true) {
            int i = (lo + hi) / 2, j = half - i; // i from nums1 and j from nums2 on the left
            long aLeft = i > 0 ? nums1[i - 1] : long.MinValue;
            long aRight = i < m ? nums1[i] : long.MaxValue;
            long bLeft = j > 0 ? nums2[j - 1] : long.MinValue;
            long bRight = j < n ? nums2[j] : long.MaxValue;
            if (aLeft <= bRight && bLeft <= aRight) { // everything left <= everything right
                if ((m + n) % 2 == 1) return Math.Max(aLeft, bLeft);
                return (Math.Max(aLeft, bLeft) + Math.Min(aRight, bRight)) / 2.0;
            }
            if (aLeft > bRight) hi = i - 1; // took too many from nums1
            else lo = i + 1; // took too few from nums1
        }
    }
}
