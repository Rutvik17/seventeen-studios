class Solution {
public:
    int findKthLargest(vector<int>& nums, int k) {
        // Quickselect: the k-th largest is the one that would sit at index n - k if sorted.
        int target = nums.size() - k, lo = 0, hi = nums.size() - 1;
        mt19937 rng(random_device{}());
        while (true) {
            int pivot = nums[lo + rng() % (hi - lo + 1)]; // a random pivot defeats adversarial inputs
            // Three-way partition of lo..hi: < pivot, then == pivot, then > pivot.
            int lt = lo, i = lo, gt = hi;
            while (i <= gt) {
                if (nums[i] < pivot) swap(nums[lt++], nums[i++]);
                else if (nums[i] > pivot) swap(nums[gt--], nums[i]);
                else i++;
            }
            if (target < lt) hi = lt - 1; // it is among the smaller ones
            else if (target > gt) lo = gt + 1; // among the larger ones
            else return pivot; // it lands in the block equal to the pivot
        }
    }
};
