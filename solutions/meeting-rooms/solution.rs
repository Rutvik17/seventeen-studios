impl Solution {
    pub fn can_attend_meetings(mut intervals: Vec<Vec<i32>>) -> bool {
        intervals.sort_unstable_by_key(|iv| iv[0]); // in order of start: a clash can only be between neighbours
        intervals.windows(2).all(|w| w[0][1] <= w[1][0])
    }
}
