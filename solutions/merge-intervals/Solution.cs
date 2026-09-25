public class Solution {
    public int[][] Merge(int[][] intervals) {
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0])); // by start: overlapping intervals are now next to each other
        var out_ = new List<int[]>();
        foreach (var iv in intervals) {
            if (out_.Count > 0 && iv[0] <= out_[^1][1]) out_[^1][1] = Math.Max(out_[^1][1], iv[1]); // overlaps the last one: stretch it
            else out_.Add(new[] { iv[0], iv[1] });
        }
        return out_.ToArray();
    }
}
