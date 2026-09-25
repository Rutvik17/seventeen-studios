impl Solution {
    pub fn min_meeting_rooms(intervals: Vec<Vec<i32>>) -> i32 {
        // Sweep through time. Each start needs a room; each end frees one. The most rooms
        // busy at once is the answer. An end at the same moment as a start frees its room first.
        let mut starts: Vec<i32> = intervals.iter().map(|iv| iv[0]).collect();
        let mut ends: Vec<i32> = intervals.iter().map(|iv| iv[1]).collect();
        starts.sort_unstable();
        ends.sort_unstable();
        let (mut busy, mut best, mut j) = (0, 0, 0);
        for s in starts {
            while ends[j] <= s {
                // meetings finished by now
                busy -= 1;
                j += 1;
            }
            busy += 1;
            best = best.max(busy);
        }
        best
    }
}
