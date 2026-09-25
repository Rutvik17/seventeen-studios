use std::collections::BinaryHeap;

impl Solution {
    pub fn last_stone_weight(stones: Vec<i32>) -> i32 {
        let mut heap = BinaryHeap::from(stones); // the heaviest on top
        while heap.len() > 1 {
            let (y, x) = (heap.pop().unwrap(), heap.pop().unwrap()); // the two heaviest, y >= x
            if y > x {
                heap.push(y - x);
            }
        }
        heap.pop().unwrap_or(0)
    }
}
