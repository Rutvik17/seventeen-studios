use std::cmp::Reverse;
use std::collections::BinaryHeap;

impl Solution {
    pub fn min_interval(mut intervals: Vec<Vec<i32>>, queries: Vec<i32>) -> Vec<i32> {
        intervals.sort_unstable();
        let mut answer = vec![-1; queries.len()];
        let mut order: Vec<usize> = (0..queries.len()).collect();
        // Answer the queries from smallest to largest, so intervals only ever join and leave.
        order.sort_unstable_by_key(|&k| queries[k]);
        let mut heap = BinaryHeap::new(); // Reverse((size, right end)): the smallest on top
        let mut i = 0;
        for q in order {
            let x = queries[q];
            while i < intervals.len() && intervals[i][0] <= x {
                // every interval starting by x
                heap.push(Reverse((intervals[i][1] - intervals[i][0] + 1, intervals[i][1])));
                i += 1;
            }
            while let Some(&Reverse((_, r))) = heap.peek() {
                if r >= x {
                    break;
                }
                heap.pop(); // ended before x: useless now and for every later query
            }
            if let Some(&Reverse((size, _))) = heap.peek() {
                answer[q] = size; // the smallest interval holding x
            }
        }
        answer
    }
}
