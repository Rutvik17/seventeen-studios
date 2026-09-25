public class Solution {
    public int LengthOfLIS(int[] nums) {
        // tails[k]: the smallest last value of any increasing run of length k + 1 seen so far.
        // tails is itself increasing, so each number finds its place by binary search.
        var tails = new List<int>();
        foreach (int x in nums) {
            int k = tails.BinarySearch(x);
            if (k < 0) k = ~k; // not present: ~k is where it would go, the first tail > x
            if (k == tails.Count) tails.Add(x); // x extends the longest run
            else tails[k] = x; // a run of length k + 1 can now end lower
        }
        return tails.Count;
    }
}
