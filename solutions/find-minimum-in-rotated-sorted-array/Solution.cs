public class Solution {
    public int FindMin(int[] nums) {
        int lo = 0, hi = nums.Length - 1;
        while (lo < hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] > nums[hi]) lo = mid + 1; // the drop is to the right of mid
            else hi = mid; // mid..hi is sorted: the minimum is at mid or to its left
        }
        return nums[lo];
    }
}
