use std::collections::BinaryHeap;

impl Solution {
    pub fn k_closest(points: Vec<Vec<i32>>, k: i32) -> Vec<Vec<i32>> {
        // A max-heap of the k closest so far, as (squared distance, index). Squared
        // distance x² + y² orders points the same as distance, without a square root.
        let mut heap = BinaryHeap::new();
        for (i, p) in points.iter().enumerate() {
            heap.push((p[0] * p[0] + p[1] * p[1], i));
            if heap.len() > k as usize {
                heap.pop(); // the farthest of k + 1 is not among the closest k
            }
        }
        heap.into_iter().map(|(_, i)| points[i].clone()).collect()
    }
}
