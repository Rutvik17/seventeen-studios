class Solution {
    public int findKthLargest(int[] nums, int k) {
        // Quickselect: the k-th largest is the one that would sit at index n - k if sorted.
        int target = nums.length - k, lo = 0, hi = nums.length - 1;
        Random rng = new Random();
        while (true) {
            int pivot = nums[lo + rng.nextInt(hi - lo + 1)]; // a random pivot defeats adversarial inputs
            // Three-way partition of lo..hi: < pivot, then == pivot, then > pivot.
            int lt = lo, i = lo, gt = hi;
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

    private static void swap(int[] a, int i, int j) {
        int t = a[i];
        a[i] = a[j];
        a[j] = t;
    }
}
