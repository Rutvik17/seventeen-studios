public class Solution {
    public bool CanAttendMeetings(int[][] intervals) {
        Array.Sort(intervals, (a, b) => a[0].CompareTo(b[0])); // in order of start: a clash can only be between neighbours
        for (int i = 1; i < intervals.Length; i++) if (intervals[i][0] < intervals[i - 1][1]) return false;
        return true;
    }
}
