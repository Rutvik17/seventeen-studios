class Solution {
    public int minMeetingRooms(int[][] intervals) {
        // Sweep through time. Each start needs a room; each end frees one. The most rooms
        // busy at once is the answer. An end at the same moment as a start frees its room first.
        int n = intervals.length;
        int[] starts = new int[n], ends = new int[n];
        for (int i = 0; i < n; i++) {
            starts[i] = intervals[i][0];
            ends[i] = intervals[i][1];
        }
        Arrays.sort(starts);
        Arrays.sort(ends);
        int busy = 0, best = 0, j = 0;
        for (int s : starts) {
            while (ends[j] <= s) { // meetings finished by now
                busy--;
                j++;
            }
            best = Math.max(best, ++busy);
        }
        return best;
    }
}
