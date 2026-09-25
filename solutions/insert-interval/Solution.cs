public class Solution {
    public int[][] Insert(int[][] intervals, int[] newInterval) {
        var out_ = new List<int[]>();
        int s = newInterval[0], e = newInterval[1], i = 0, n = intervals.Length;
        while (i < n && intervals[i][1] < s) out_.Add(intervals[i++]); // wholly before the new one: keep as it is
        while (i < n && intervals[i][0] <= e) { // overlapping it: absorb into one interval
            s = Math.Min(s, intervals[i][0]);
            e = Math.Max(e, intervals[i][1]);
            i++;
        }
        out_.Add(new[] { s, e });
        while (i < n) out_.Add(intervals[i++]); // wholly after: keep as they are
        return out_.ToArray();
    }
}
