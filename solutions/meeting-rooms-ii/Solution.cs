public class Solution {
    public int MinMeetingRooms(int[][] intervals) {
        // Sweep through time. Each start needs a room; each end frees one. The most rooms
        // busy at once is the answer. An end at the same moment as a start frees its room first.
        var starts = intervals.Select(iv => iv[0]).OrderBy(x => x).ToArray();
        var ends = intervals.Select(iv => iv[1]).OrderBy(x => x).ToArray();
        int busy = 0, best = 0, j = 0;
        foreach (int s in starts) {
            while (ends[j] <= s) { // meetings finished by now
                busy--;
                j++;
            }
            best = Math.Max(best, ++busy);
        }
        return best;
    }
}
