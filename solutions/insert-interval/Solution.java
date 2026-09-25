class Solution {
    public int[][] insert(int[][] intervals, int[] newInterval) {
        List<int[]> out = new ArrayList<>();
        int s = newInterval[0], e = newInterval[1], i = 0, n = intervals.length;
        while (i < n && intervals[i][1] < s) out.add(intervals[i++]); // wholly before the new one: keep as it is
        while (i < n && intervals[i][0] <= e) { // overlapping it: absorb into one interval
            s = Math.min(s, intervals[i][0]);
            e = Math.max(e, intervals[i][1]);
            i++;
        }
        out.add(new int[] {s, e});
        while (i < n) out.add(intervals[i++]); // wholly after: keep as they are
        return out.toArray(new int[0][]);
    }
}
