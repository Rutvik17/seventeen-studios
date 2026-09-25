public class Solution {
    public int FindKthLargest(int[] nums, int k) {
        // Quickselect: the k-th largest is the one that would sit at index n - k if sorted.
        int target = nums.Length - k, lo = 0, hi = nums.Length - 1;
        while (true) {
            int pivot = nums[Random.Shared.Next(lo, hi + 1)]; // a random pivot defeats adversarial inputs
            // Three-way partition of lo..hi: < pivot, then == pivot, then > pivot.
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                if (nums[i] < pivot) Swap(nums, lt++, i++);
                else if (nums[i] > pivot) Swap(nums, gt--, i);
                else i++;
            }
            if (target < lt) hi = lt - 1; // it is among the smaller ones
            else if (target > gt) lo = gt + 1; // among the larger ones
            else return pivot; // it lands in the block equal to the pivot
        }
    }

    private static void Swap(int[] a, int i, int j) => (a[i], a[j]) = (a[j], a[i]);
}
