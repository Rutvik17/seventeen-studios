class Solution {
    public int lengthOfLIS(int[] nums) {
        // tails[k]: the smallest last value of any increasing run of length k + 1 seen so far.
        // tails is itself increasing, so each number finds its place by binary search.
        int[] tails = new int[nums.length];
        int size = 0;
        for (int x : nums) {
            int lo = 0, hi = size; // find the first tail >= x
            while (lo < hi) {
                int mid = (lo + hi) >>> 1;
                if (tails[mid] < x) lo = mid + 1;
                else hi = mid;
            }
            tails[lo] = x; // extends the longest run, or lets a run of length lo + 1 end lower
            if (lo == size) size++;
        }
        return size;
    }
}
