class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2; // written this way so lo + hi cannot overflow
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1; // the target can only be to the right
            else hi = mid - 1; // the target can only be to the left
        }
        return -1;
    }
}
