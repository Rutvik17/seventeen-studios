class Solution {
    public int eraseOverlapIntervals(int[][] intervals) {
        // Keep as many as possible: always keep the one that ends first — it leaves the most room.
        Arrays.sort(intervals, (a, b) -> Integer.compare(a[1], b[1]));
        int kept = 0;
        long end = Long.MIN_VALUE;
        for (int[] iv : intervals) {
            if (iv[0] >= end) { // fits after the last one kept (touching is fine)
                kept++;
                end = iv[1];
            }
        }
        return intervals.length - kept;
    }
}
