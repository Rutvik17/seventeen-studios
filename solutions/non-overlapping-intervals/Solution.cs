public class Solution {
    public int EraseOverlapIntervals(int[][] intervals) {
        // Keep as many as possible: always keep the one that ends first — it leaves the most room.
        Array.Sort(intervals, (a, b) => a[1].CompareTo(b[1]));
        int kept = 0;
        long end = long.MinValue;
        foreach (var iv in intervals) {
            if (iv[0] >= end) { // fits after the last one kept (touching is fine)
                kept++;
                end = iv[1];
            }
        }
        return intervals.Length - kept;
    }
}
